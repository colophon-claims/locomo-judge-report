import { createHash, createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validate as validateCommitment } from './validate-sampling-commitment.mjs';

const root = new URL('..', import.meta.url).pathname;
const directory = `${root}commitments/locomo-screening-2026-08-24`;
const digest = /^sha256:[0-9a-f]{64}$/u;
const rawOpaqueIdentity = /"[0-9a-f]{32}"/u;
const prohibitedPrivateTerms = /(?:sourceItemSha256|productItemSha256|sourceQuestion|candidateClass|stratum|poolKind)/u;

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

function sha256(value) {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function readCanonical(path) {
  const raw = readFileSync(path, 'utf8');
  const value = JSON.parse(raw);
  if (raw !== `${canonical(value)}\n`) throw new Error(`${path} is not canonical JSON followed by LF`);
  return { raw, value };
}

function assert(condition, message) {
  if (!condition) throw new Error(`real sampling commitment invalid: ${message}`);
}

function file(name) {
  return `${directory}/${name}`;
}

export function validateRealSamplingCommitment() {
  const identities = readCanonical(file('candidate-identity-digests.json'));
  const commitment = readCanonical(file('sampling-commitment.json'));
  const output = readCanonical(file('sampling-output.json'));
  const event = readCanonical(file('commitment-event.json'));
  const decision = readCanonical(`${root}records/synthetic-pilot-v7-clean-2026-08-24/ritsu-decision.json`);
  const summary = readCanonical(`${root}records/synthetic-pilot-v7-clean-2026-08-24/accepted-pilot-summary.json`);
  validateCommitment(commitment.value, commitment.raw);

  assert(Array.isArray(identities.value) && identities.value.length === 664, 'identity pool must contain 664 entries');
  assert(identities.value.every((value, index, values) => digest.test(value) && (index === 0 || values[index - 1] < value)), 'identity pool must be sorted, unique SHA-256 values');
  assert(commitment.value.candidateItemDigests.length === 664 && canonical(commitment.value.candidateItemDigests) === canonical(identities.value), 'commitment pool differs from the exact identity list');
  assert(commitment.value.poolDigest === sha256(canonical(identities.value)), 'pool digest drifted');
  assert(commitment.value.sampleSize === 72, 'sample size must be 72');

  const key = Buffer.from(`${commitment.value.sampleSeed}${commitment.value.poolDigest}`, 'utf8');
  const expectedOrder = [...identities.value].sort((left, right) => {
    const leftScore = createHmac('sha256', key).update(left, 'utf8').digest();
    const rightScore = createHmac('sha256', key).update(right, 'utf8').digest();
    return Buffer.compare(leftScore, rightScore) || left.localeCompare(right);
  });
  assert(output.value.poolDigest === commitment.value.poolDigest, 'sampling output pool digest drifted');
  assert(canonical(output.value.order) === canonical(expectedOrder), 'HMAC order drifted');
  assert(canonical(output.value.sample) === canonical(expectedOrder.slice(0, 72)), '72-item sample drifted');
  assert(new Set(output.value.sample).size === 72, 'sample contains a duplicate');

  const publicSamplingBytes = `${identities.raw}${commitment.raw}${output.raw}`;
  assert(!rawOpaqueIdentity.test(publicSamplingBytes), 'raw opaque identity leaked into public sampling artifacts');
  assert(!prohibitedPrivateTerms.test(publicSamplingBytes), 'private source, product, class, or stratum metadata leaked');

  const expectedArtifactHashes = {
    candidateIdentityDigestsFileSha256: sha256(identities.raw),
    identityProjectionScriptSha256: sha256(readFileSync(`${root}scripts/project-screening-identities-v1.mjs`)),
    samplingCommitmentFileSha256: sha256(commitment.raw),
    samplingOutputFileSha256: sha256(output.raw),
    samplingScriptSha256: sha256(readFileSync(`${root}scripts/screening-sample-v1.py`)),
  };
  assert(canonical(event.value.artifacts) === canonical(expectedArtifactHashes), 'commitment event artifact binding drifted');
  assert(event.value.poolDigest === commitment.value.poolDigest && event.value.sampleSize === 72, 'event pool or sample declaration drifted');
  assert(event.value.identityProjection.domain === 'colophon-screening-identity/v1\0', 'projection domain drifted');
  assert(event.value.seedGeneration.drawCount === 1 && event.value.seedGeneration.discardedDrawCount === 0 && event.value.seedGeneration.rerollCount === 0 && event.value.seedGeneration.entropyBytes === 32, 'one-shot seed declaration drifted');
  assert(event.value.preOutcomeClaims.modelCalls === 0 && event.value.preOutcomeClaims.screeningOutcomeCount === 0 && event.value.preOutcomeClaims.realScreeningOutcomesObserved === false, 'pre-outcome boundary drifted');

  assert(decision.value.decisionCount === 24 && decision.value.decisions.length === 24 && new Set(decision.value.decisions.map((row) => row.itemId)).size === 24, 'Ritsu decision coverage must be 24 unique cases');
  assert(decision.value.decisions.every((row) => row.decision === 'confirm') && decision.value.authorization.text === 'Confirm all', 'Ritsu confirmation text or decisions drifted');
  assert(decision.value.signatureRecorded === false && decision.value.synthetic === true && decision.value.permanentlyExcluded === true && decision.value.admissionEligible === false, 'synthetic decision boundary drifted');
  assert(summary.value.status === 'PILOT_GATE_CONFIRMED' && summary.value.admissionEligible === false && summary.value.permanentlyExcluded === true, 'accepted pilot summary overclaims admission');
  assert(summary.value.decisionRecordSha256 === sha256(decision.raw), 'accepted pilot summary decision binding drifted');

  const ledgerRaw = readFileSync(`${root}commitments/LEDGER.jsonl`, 'utf8');
  const ledgerLines = ledgerRaw.trimEnd().split('\n');
  assert(ledgerRaw.endsWith('\n') && ledgerLines.length === 3, 'commitment ledger must contain three LF-terminated append-only events');
  const ledger = ledgerLines.map((line) => JSON.parse(line));
  assert(ledgerLines.every((line, index) => line === canonical(ledger[index])), 'commitment ledger event is not canonical');
  assert(ledger[0].ordinal === 1 && ledger[0].commitmentEventSha256 === sha256(event.raw) && ledger[0].pilotDecisionSha256 === sha256(decision.raw), 'prepared ledger bindings drifted');
  assert(ledger[1].ordinal === 2 && ledger[1].event === 'software-heritage-archive-resolved' && ledger[1].status === 'ARCHIVED_AND_RESOLVED', 'archive ledger status drifted');
  assert(ledger[1].previousLedgerSha256 === 'sha256:3a545a40cb4444cb600ad8604071f835879bb28c8b6f39f9e0b6e67b10be1deb', 'archive event does not bind the published one-event ledger');
  assert(ledger[1].archivedRevision === '0c7c2415621bde7854229d7548982daff9aa0af5' && ledger[1].commitmentEventSha256 === sha256(event.raw), 'archived revision or commitment binding drifted');
  assert(ledger[1].snapshotSwhid === 'swh:1:snp:f8e4759c7f3ad04400cab799378ea05413ea0cee' && ledger[1].revisionSwhid === 'swh:1:rev:0c7c2415621bde7854229d7548982daff9aa0af5', 'Software Heritage identifiers drifted');
  assert(ledger[1].requestId === 2451193 && ledger[1].visitStatus === 'full' && ledger[1].visitDate === '2026-08-24T08:55:32.934000+00:00', 'Software Heritage visit record drifted');
  assert(ledger[2].ordinal === 3 && ledger[2].event === 'screening-transport-framing-amended' && ledger[2].status === 'V8_PREPARED_SAME_POOL_SEED_AND_SAMPLE', 'transport amendment status drifted');
  assert(ledger[2].previousLedgerSha256 === 'sha256:7a6598ecb00681433ae0cf4defb64f4b7ee9c66e693646854c0421ac9fc1793f' && ledger[2].rerollCount === 0, 'transport amendment does not bind the archived ledger or preserve the seed');
  assert(ledger[2].abandonedRunTranscriptSha256 === 'sha256:5b67309f6662064446d5b1394052ffffef3d7bc9f1c78e954b1435a41094622a', 'abandoned run transcript binding drifted');
  assert(ledger[2].coordinatorPromptV8Sha256 === sha256(readFileSync(`${root}CODEX-SCREENING-PROMPT.v8.md`)) && ledger[2].judgmentInstructionV2Sha256 === sha256(readFileSync(`${root}CODEX-SCREENING-JUDGMENT-INSTRUCTION.v2.txt`)), 'version 8 source binding drifted');
  return { candidateIdentityCount: 664, sampleSize: 72, poolDigest: commitment.value.poolDigest, commitmentSha256: sha256(commitment.raw), sampleSha256: sha256(canonical(output.value.sample)) };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(validateRealSamplingCommitment()));
}
