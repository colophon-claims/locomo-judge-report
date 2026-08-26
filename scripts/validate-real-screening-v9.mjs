import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const recordRoot = join(root, 'records/real-run-v9-2026-08-25');
const sharedRoot = join(root, 'records/real-run-v8-2026-08-24');
const sha256 = (bytes) => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
const bytes = (name) => readFileSync(join(recordRoot, name));
const json = (name) => JSON.parse(bytes(name));
const invariant = (condition, message) => {
  if (!condition) throw new Error(`real screening v9: ${message}`);
};
const exactDigest = (name, expected) => {
  invariant(sha256(bytes(name)) === expected, `${name} digest drift`);
};

const expectedDigests = {
  'colophon-admission-manifest.json': 'sha256:b48364b8f3470e872dbc0e590be0142eb2017b6a48a2b4141b844e8f5e18f1c3',
  'colophon-replacement-ledger.json': 'sha256:17a15805727193243b00342b5a77c49b9f4905208125fded2ce80f5000fb8cdc',
  'colophon-screening-table.json': 'sha256:e44c5eade5bad987a8ff6828b96c73750202883fee972c43d1aaef113c581bdd',
  'final-bank.json': 'sha256:b081b8f43c33befa5290b8f37917cd3b76d9f93c32fea9b8ba2330881de66c7b',
  'materialization-summary.json': 'sha256:1b65efd795bf5d9e6a1def5a97d6ae0e7d269f34ae0d9c5c9968a3ed4aff428a',
  'module-confirmations.json': 'sha256:78ce7417ea25973edf9bb83176f14e9a5da627e2caa9eab8d8004d8fb08a9973',
  'operator-admission-summary.json': 'sha256:218ba552780a031d66142685aa2f1fa65727dd64dd0d1a7cf877b33585a89450',
  'operator-decisions.json': 'sha256:cc77aa4659497eb4df9aca0d90a44f0b511f1bfeb2b37f57077a102c166be9e4',
  'operator-replacement-ledger.json': 'sha256:90466c8271c3ec21c76046ba7320fe971f8f09e3e1140ef68f50a53fe2ac67e1',
  'operator-screening-rows.json': 'sha256:4e05ecad233201d0fa97a73c18a0e011901f0b4e1bf18df7c20f04a705e7f981',
  'registered-sampling-commitment.json': 'sha256:55e47494fd234321dbd47b147337ff1a51b9e364476f84363b9648a5a677fe35',
  'screening-pool.json': 'sha256:d72109cf77683231017f8d7259cafb40ad452538fd563f9155ec7d473e7ce0f7',
  'screening-procedure.json': 'sha256:c9fb10e28154df44f553752fd0be40e08d845bdfd61e58a9f4cb7e460928e085',
  'transcript.jsonl': 'sha256:43e5ea6d5fa37825ba08f3ad4edef820b9b83bee9881838102af799c1156e642',
};
for (const [name, expected] of Object.entries(expectedDigests)) exactDigest(name, expected);

const procedure = json('screening-procedure.json');
invariant(procedure.coordinator.model === 'gpt-5.6-sol' && procedure.coordinator.reasoningEffort === 'high', 'coordinator profile drift');
invariant(JSON.stringify(procedure.judgmentAgents.map(({ alias, model, reasoningEffort, maxBatchSize }) => ({ alias, model, reasoningEffort, maxBatchSize }))) === JSON.stringify([
  { alias: 'Luna', model: 'gpt-5.6-luna', reasoningEffort: 'medium', maxBatchSize: 32 },
  { alias: 'Terra', model: 'gpt-5.6-terra', reasoningEffort: 'high', maxBatchSize: 16 },
  { alias: 'Sol', model: 'gpt-5.6-sol', reasoningEffort: 'high', maxBatchSize: 8 },
]), 'judgment profiles drift');
invariant(procedure.transcriptSha256 === expectedDigests['transcript.jsonl'], 'procedure transcript binding drift');
invariant(Object.values(procedure.toolPolicy.judgmentAgents).every((allowed) => allowed === false), 'judgment tools enabled');

const pool = json('screening-pool.json');
invariant(pool.items.length === 664, 'pool is not 664 items');
invariant(new Set(pool.items.map((row) => row.itemSha256)).size === 664, 'pool item digests are not unique');
invariant(pool.items.filter((row) => row.poolKind === 'main').length === 240, 'main count is not 240');
invariant(pool.items.filter((row) => row.poolKind === 'reserve').length === 424, 'reserve count is not 424');
invariant(pool.identityCommitmentSha256 === 'sha256:34b8cbe099124eb6182e7e2d894381d75fba9fde1d8e54abd0c957b937c9aba6', 'pool commitment drift');

const screeningRows = json('operator-screening-rows.json');
const screeningByItem = new Map(screeningRows.map((row) => [row.itemSha256, row]));
invariant(screeningRows.length === 664 && screeningByItem.size === 664, 'screening rows do not cover 664 unique items');
invariant(pool.items.every((row) => screeningByItem.has(row.itemSha256)), 'screening rows do not cover the pool');
const lunaFlags = screeningRows.filter((row) => row.screeningVerdict === 'UNSURE' || row.screeningVerdict !== row.intendedLabel);
invariant(lunaFlags.length === 201 && lunaFlags.every((row) => row.ritsuDecision.checked === true), 'Luna flag hand checks are incomplete');

const samplingOutput = JSON.parse(readFileSync(join(root, 'commitments/locomo-screening-2026-08-24/sampling-output.json')));
const poolByIdentity = new Map(pool.items.map((row) => [row.screeningIdentitySha256, row]));
invariant(samplingOutput.sample.length === 72 && new Set(samplingOutput.sample).size === 72, 'public sample is not 72 unique identities');
const sampledRows = samplingOutput.sample.map((identity) => {
  const poolRow = poolByIdentity.get(identity);
  invariant(poolRow !== undefined, `sample identity ${identity} is outside the pool`);
  return screeningByItem.get(poolRow.itemSha256);
});
invariant(sampledRows.every((row) => row?.ritsuDecision.checked === true), 'public sample hand checks are incomplete');
const baseRequiredItems = new Set([...lunaFlags, ...sampledRows].map((row) => row.itemSha256));
invariant(baseRequiredItems.size === 246, 'base human-review union is not 246 items');
const checkedRows = screeningRows.filter((row) => row.ritsuDecision.checked === true);
invariant(checkedRows.length === 255, 'complete human-review scope is not 255 items');
invariant(screeningRows.filter((row) => Object.hasOwn(row, 'terraReviewVerdict')).length === 231, 'Terra coverage drift');
invariant(screeningRows.filter((row) => Object.hasOwn(row, 'solReviewVerdict')).length === 98, 'Sol coverage drift');

const decisions = json('operator-decisions.json');
invariant(decisions.status === 'complete' && decisions.operator === 'ritsukai', 'operator decision record is incomplete');
invariant(decisions.baseRequiredHumanCount === 246 && decisions.auditEscalationCount === 9, 'operator review scope drift');
invariant(decisions.rowCount === 255 && decisions.decisionResolvedCount === 255, 'operator decisions do not close 255 rows');
invariant(decisions.decisionCounts.CONFIRM === 118 && decisions.decisionCounts.EXCLUDE === 137, 'operator decision counts drift');

const finalBank = json('final-bank.json');
invariant(finalBank.status === 'admitted-not-frozen' && finalBank.admissionClosure === 'complete', 'final bank is not admitted and closed');
invariant(finalBank.itemCount === 240 && finalBank.items.length === 240, 'final bank is not 240 items');
invariant(JSON.stringify(finalBank.classCounts) === JSON.stringify({ correct: 80, 'specific-wrong': 80, 'vague-topical-wrong': 80 }), 'final class balance drift');
invariant(Object.keys(finalBank.cellCounts).length === 12 && Object.values(finalBank.cellCounts).every((count) => count === 20), 'final cell balance drift');
invariant(finalBank.replacementCount === 52, 'final replacement count drift');

const replacementLedger = json('operator-replacement-ledger.json');
invariant(replacementLedger.status === 'complete-not-frozen' && replacementLedger.rows.length === 52, 'operator replacement ledger is incomplete');
invariant(replacementLedger.excludedMainCount === 52 && replacementLedger.excludedReserveCount === 85, 'exclusion counts drift');
invariant(replacementLedger.rows.every((row) => row.candidateClass && row.stratum && Number.isSafeInteger(row.reserveOrder)), 'replacement lineage is malformed');

const signedTable = json('colophon-screening-table.json');
invariant(signedTable.payloadType === 'application/vnd.jinn.binary-judgment.screening-table.v2+json', 'signed screening payload type drift');
invariant(Array.isArray(signedTable.signatures) && signedTable.signatures.length === 1, 'signed screening table does not carry one signature');
const signedPayload = JSON.parse(Buffer.from(signedTable.payload, 'base64'));
invariant(signedPayload.rows.length === 664, 'signed table does not cover 664 rows');
invariant(signedPayload.poolSha256 === expectedDigests['screening-pool.json'], 'signed pool binding drift');
invariant(signedPayload.procedureSha256 === expectedDigests['screening-procedure.json'], 'signed procedure binding drift');
invariant(signedPayload.transcriptSha256 === expectedDigests['transcript.jsonl'], 'signed transcript binding drift');
invariant(signedPayload.sampleCommitmentSha256 === expectedDigests['registered-sampling-commitment.json'], 'signed sample binding drift');

const admissionManifest = json('colophon-admission-manifest.json');
invariant(admissionManifest.analysisContextSha256s.length === 240, 'Colophon admission context count drift');
invariant(admissionManifest.excludedItemSha256s.length === 52, 'Colophon excluded-item count drift');
invariant(admissionManifest.labelResolutionSha256s.length === 240, 'Colophon label-resolution count drift');
invariant(admissionManifest.screeningTableSha256 === expectedDigests['colophon-screening-table.json'], 'Colophon screening table binding drift');
invariant(admissionManifest.replacementLedgerSha256 === expectedDigests['colophon-replacement-ledger.json'], 'Colophon replacement binding drift');
const colophonReplacement = json('colophon-replacement-ledger.json');
invariant(colophonReplacement.entries.length === 52, 'Colophon replacement ledger does not contain 52 entries');

const modules = json('module-confirmations.json');
invariant(modules.status === 'complete-not-frozen', 'module confirmations are incomplete');
invariant(modules.consistencyProbes.count === 12 && modules.consistencyProbes.decisions.every((row) => row.decision === 'CONFIRM'), 'consistency probes are not all confirmed');
invariant(modules.corruptKeyModule.count === 20 && modules.corruptKeyModule.decisions.every((row) => row.decision === 'CONFIRM'), 'corrupt-key records are not all confirmed');

const sharedItems = new Set(readdirSync(join(sharedRoot, 'items')).filter((name) => name.endsWith('.json')));
const sharedSources = readdirSync(join(sharedRoot, 'source-records')).filter((name) => name.endsWith('.json'));
invariant(sharedItems.size === 664 && sharedSources.length === 664, 'shared candidate records do not contain 664 item/source pairs');
for (const row of pool.items) {
  const name = `${row.itemSha256.slice(7)}.json`;
  invariant(sharedItems.has(name), `shared item record missing for ${row.itemSha256}`);
  invariant(sha256(readFileSync(join(sharedRoot, 'items', name))) === row.itemSha256, `shared item bytes drift for ${row.itemSha256}`);
}
for (const name of sharedSources) {
  invariant(sha256(readFileSync(join(sharedRoot, 'source-records', name))) === `sha256:${name.slice(0, -5)}`, `shared source bytes drift for ${name}`);
}

const summary = json('summary.json');
invariant(summary.status === 'screening-complete-admitted-not-frozen', 'public status drift');
invariant(summary.counts.handCheckedCount === 255 && summary.counts.replacementCount === 52, 'public counts drift');
invariant(summary.finalBankSha256 === expectedDigests['final-bank.json'], 'public final-bank digest drift');
invariant(Object.values(summary.capabilityBoundary).every((claim) => claim === false), 'capability boundary overclaims verification');

const correction = JSON.parse(readFileSync(join(root, 'AMENDMENTS/2026-08-26-v8-swhid-correction.json')));
const ledger = readFileSync(join(root, 'commitments/LEDGER.jsonl'), 'utf8').trim().split('\n').map((line) => JSON.parse(line));
const archiveEvent = ledger.find((event) => event.ordinal === 2);
invariant(correction.incorrectPublishedSnapshotSwhid === 'swh:1:snp:f8e4759c2bab71f189306c050174a87b3f7a9a40', 'archive correction no longer names the published error');
invariant(correction.correctedSnapshotSwhid === archiveEvent?.snapshotSwhid, 'archive correction does not match the append-only ledger');

const publishedText = readdirSync(recordRoot).map((name) => readFileSync(join(recordRoot, name), 'utf8')).join('\n');
invariant(!publishedText.includes('/Users/') && !publishedText.includes('OPENAI_API_KEY'), 'public v9 record contains a private local reference');

console.log('validated completed evidence-aware real screening v9 (not frozen)');
