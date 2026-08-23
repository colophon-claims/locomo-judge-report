import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V2_RUN_SHA256 } from './approved-prompted-screening-v3-identities.mjs';

const recordPath = new URL('../records/synthetic-pilot-v2-2026-08-23/NON-CONFORMANT.json', import.meta.url);
const auditPath = new URL('../records/synthetic-pilot-v2-2026-08-23/process-audit.md', import.meta.url);
const resultsPath = new URL('../records/synthetic-pilot-v2-2026-08-23/pilot-results.pending-ritsu.json', import.meta.url);
const transcriptPath = new URL('../records/synthetic-pilot-v2-2026-08-23/transcript.jsonl', import.meta.url);
const promptV2Path = new URL('../CODEX-SCREENING-PROMPT.v2.md', import.meta.url);
const instructionV1Path = new URL('../CODEX-SCREENING-JUDGMENT-INSTRUCTION.v1.txt', import.meta.url);
const fixtureV1Path = new URL('../fixtures/prompted-screening-pilot-v1.json', import.meta.url);
const rendererV2Path = new URL('./render-prompted-screening-dispatch-v2.mjs', import.meta.url);

const rootKeys = ['accepted', 'artifacts', 'defects', 'judgmentStages', 'permanentlyExcluded', 'procedureVersion', 'processAuditStage', 'processOutcome', 'publishedEvidence', 'realCandidateScreening', 'runId', 'schema', 'sourcePublicHead', 'status', 'summary', 'supersededByProcedureVersion', 'syntheticOnly', 'transcriptStages'];
const artifactKeys = ['coordinatorPromptV2Sha256', 'finalTranscriptSha256', 'fixtureV1Sha256', 'intendedLabelComparisonEventSha256', 'judgmentInstructionV1Sha256', 'judgmentTranscriptSha256', 'processAuditEventSha256', 'processAuditSha256', 'rawResultsSha256', 'rendererV2Sha256'];
const transcriptStageKeys = ['auditInputScope', 'finalRecordCount', 'finalTranscriptSha256', 'judgmentRecordCount', 'judgmentTranscriptSha256', 'postJudgmentEvents'];
const summaryKeys = ['errorCount', 'infrastructureFailureCount', 'itemCount', 'judgmentAgentToolCallCount', 'judgmentCount', 'judgmentDispatchCount', 'lunaIntendedLabelMatchCount', 'processAuditDispatchCount', 'retryCount', 'ritsuDecisionCount', 'threeModelAgreementCount', 'unsureCount'];
const publishedEvidenceKeys = ['processAuditPath', 'rawResultsPath', 'rawTranscriptIncluded', 'rawTranscriptPath', 'rawTranscriptPrivacyBoundary'];
const digest = (hex) => `sha256:${hex}`;

function fail(path, detail) {
  throw new Error(`${path}: ${detail}`);
}

function hasExactKeys(value, keys) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).sort().join(',') === [...keys].sort().join(',');
}

function same(value, expected) {
  return JSON.stringify(value) === JSON.stringify(expected);
}

function sha256(bytes) {
  return digest(createHash('sha256').update(bytes).digest('hex'));
}

function rejectAmbiguousTranscriptKey(value, path = 'record') {
  if (Array.isArray(value)) return value.forEach((entry, index) => rejectAmbiguousTranscriptKey(entry, `${path}[${index}]`));
  if (value === null || typeof value !== 'object') return;
  for (const [key, entry] of Object.entries(value)) {
    if (key === 'transcriptSha256') fail(`${path}.${key}`, 'is an ambiguous single-scope transcript identity');
    rejectAmbiguousTranscriptKey(entry, `${path}.${key}`);
  }
}

export function validateTranscriptScopeSemantics(record, transcriptBytes, auditBytes) {
  rejectAmbiguousTranscriptKey(record);
  if (!hasExactKeys(record.artifacts, artifactKeys) || !hasExactKeys(record.transcriptStages, transcriptStageKeys)) fail('record.transcriptStages', 'must use exact explicit judgment and final transcript scopes');
  const expectedStages = {
    judgmentRecordCount: 14,
    judgmentTranscriptSha256: digest('c2c2157ba7eef0f342a0e7e5ee88674e9565da9d9425c5d0e708a64f3449ab63'),
    auditInputScope: 'records 1-14 inclusive: run declaration, preflight, and six judgment dispatch-output pairs',
    postJudgmentEvents: [
      { recordNumber: 15, recordType: 'process-audit-output', eventSha256: digest('bd9e7f30b794a67e085970779bddb43090ee0c5f04f976a5663f7072d4a4bf0b') },
      { recordNumber: 16, recordType: 'intended-label-comparison', eventSha256: digest('2d85c9c27cf1d012ddd7397ef9191c4faec675c39f59cbd71cf52497da3b6df0') },
    ],
    finalRecordCount: 16,
    finalTranscriptSha256: digest('cf7fd69cd298bb0e9a7fbb370b840680e960e2c0771e2466d94280c00c9ff3bb'),
  };
  if (!same(record.transcriptStages, expectedStages)) fail('record.transcriptStages', 'has ambiguous, swapped, circular, or unbound transcript stages');
  if (record.artifacts.judgmentTranscriptSha256 !== expectedStages.judgmentTranscriptSha256
    || record.artifacts.finalTranscriptSha256 !== expectedStages.finalTranscriptSha256
    || record.artifacts.processAuditEventSha256 !== expectedStages.postJudgmentEvents[0].eventSha256
    || record.artifacts.intendedLabelComparisonEventSha256 !== expectedStages.postJudgmentEvents[1].eventSha256) fail('record.artifacts', 'does not mirror every scoped transcript identity');

  const transcriptText = Buffer.from(transcriptBytes).toString('utf8');
  if (!transcriptText.endsWith('\n') || transcriptText.includes('\r')) fail('evidence.transcriptBytes', 'must be LF-terminated JSONL');
  const privatePatterns = [
    /\/Users\/[A-Za-z0-9._-]+\//u,
    /[A-Za-z]:\\Users\\[A-Za-z0-9._-]+\\/u,
    /(?:sk|rk)-[A-Za-z0-9_-]{16,}/u,
    /BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/u,
    /(?:authorization|password|secret)\s*[:=]\s*["'][^"']+["']/iu,
  ];
  if (privatePatterns.some((pattern) => pattern.test(transcriptText))) fail('evidence.transcriptBytes', 'crosses the privacy or secret boundary');
  const rawLines = transcriptText.slice(0, -1).split('\n');
  if (rawLines.length !== 16) fail('evidence.transcriptBytes', 'must contain exactly 14 judgment records and two bound suffix events');
  const records = rawLines.map((line, index) => {
    try {
      return JSON.parse(line);
    } catch {
      fail(`evidence.transcriptBytes[${index + 1}]`, 'is not JSON');
    }
  });
  const judgmentBytes = Buffer.from(`${rawLines.slice(0, 14).join('\n')}\n`, 'utf8');
  if (sha256(judgmentBytes) !== expectedStages.judgmentTranscriptSha256) fail('evidence.transcriptBytes', 'judgment prefix does not match judgmentTranscriptSha256');
  if (sha256(transcriptBytes) !== expectedStages.finalTranscriptSha256) fail('evidence.transcriptBytes', 'full bytes do not match finalTranscriptSha256');
  expectedStages.postJudgmentEvents.forEach((event, index) => {
    const record = records[event.recordNumber - 1];
    const bytes = Buffer.from(`${rawLines[event.recordNumber - 1]}\n`, 'utf8');
    if (record.recordType !== event.recordType || sha256(bytes) !== event.eventSha256) fail(`evidence.transcriptBytes[${event.recordNumber}]`, 'is an unbound or substituted suffix event');
  });
  const expectedJudgmentTypes = ['run-declaration', 'preflight', 'judgment-dispatch', 'judgment-output', 'judgment-dispatch', 'judgment-output', 'judgment-dispatch', 'judgment-output', 'judgment-dispatch', 'judgment-output', 'judgment-dispatch', 'judgment-output', 'judgment-dispatch', 'judgment-output'];
  if (!same(records.slice(0, 14).map((entry) => entry.recordType), expectedJudgmentTypes)) fail('evidence.transcriptBytes', 'judgment-stage record order drifted');

  const auditText = Buffer.from(auditBytes).toString('utf8');
  const judgmentBare = expectedStages.judgmentTranscriptSha256.slice('sha256:'.length);
  const finalBare = expectedStages.finalTranscriptSha256.slice('sha256:'.length);
  if (!auditText.includes(`- Transcript: \`${judgmentBare}\``) || auditText.includes(`- Transcript: \`${finalBare}\``)) fail('evidence.auditBytes', 'must name the pre-audit judgment transcript, never the circular final transcript');
  const auditEvent = records[14];
  if (auditEvent.modelAlias !== 'gpt-5.6-sol' || auditEvent.reasoning !== 'high' || auditEvent.afterAllJudgmentOutputs !== true
    || auditEvent.outcome !== 'DEFECT' || auditEvent.ritsuDecisionsMade !== 0 || auditEvent.verdictsReplaced !== false || auditEvent.retry !== false
    || auditEvent.rawOutputSha256 !== sha256(auditBytes) || auditEvent.rawOutputByteLength !== Buffer.byteLength(auditBytes)
    || auditEvent.rawOutputEncoding !== 'base64' || !Buffer.from(auditEvent.rawOutputBase64, 'base64').equals(Buffer.from(auditBytes))) fail('evidence.transcriptBytes[15]', 'does not bind the exact process audit output');
  const comparison = records[15];
  if (comparison.performedAfterAllBlindedOutputs !== true || comparison.matchCount !== 24 || comparison.mismatchCount !== 0 || comparison.unsureCount !== 0
    || !Array.isArray(comparison.items) || comparison.items.length !== 24) fail('evidence.transcriptBytes[16]', 'does not bind the declared post-audit comparison event');
  return records;
}

function validateResults(resultsBytes, record) {
  const results = JSON.parse(Buffer.from(resultsBytes).toString('utf8'));
  if (results.schema !== 'local://colophon/prompted-screening-synthetic-pilot-results/v2'
    || results.runId !== record.runId
    || results.status !== 'PENDING_RITSU_PROCESS_DEFECT'
    || results.pilotAccepted !== false
    || results.acceptanceDeclared !== false
    || results.acceptanceCandidate !== false
    || results.syntheticOnly !== true
    || results.permanentlyExcluded !== true
    || results.realCandidateScreening !== false
    || results.publicRepoHead !== record.sourcePublicHead) fail('evidence.resultsBytes', 'does not preserve exact synthetic non-acceptance authority');
  if (results.processConformance?.outcome !== 'DEFECT'
    || results.processConformance?.materialIssue !== 'Every dispatched itemId embeds fixture candidateClass and stratum literals; the independent process auditor classified this as a material blinding failure affecting all 24 items across all three stages.') fail('evidence.resultsBytes.processConformance', 'does not preserve the identifier-leak defect');
  const expectedSummary = {
    itemCount: 24,
    judgmentCount: 72,
    judgmentDispatchCount: 6,
    processAuditDispatchCount: 1,
    lunaScreeningVerdictCounts: { CORRECT: 8, WRONG: 16, UNSURE: 0 },
    threeModelAgreementCount: 24,
    modelDisagreementCount: 0,
    lunaIntendedLabelMismatchCount: 0,
    incorrectFinalDeterminateLunaDecisionCount: 0,
    unsureItemCount: 0,
    invalidOutputItemCount: 0,
    missingOutputCount: 0,
    extraOutputCount: 0,
    duplicateOutputCount: 0,
    infrastructureFailureCount: 0,
    retryCount: 0,
    judgmentAgentToolCallCount: 0,
    requiredReviewStagesExercised: true,
    ritsuReviewRequiredCount: 24,
    ritsuDecisionCount: 0,
  };
  if (!same(results.summary, expectedSummary) || !Array.isArray(results.items) || results.items.length !== 24 || !Array.isArray(results.dispatches) || results.dispatches.length !== 6) fail('evidence.resultsBytes', 'does not preserve exact 72-judgment zero-error totals');
  for (const [index, item] of results.items.entries()) {
    if (item.ritsuDecision !== null || item.proposedOperatorDecision !== 'PENDING' || item.permanentlyExcluded !== true) fail(`evidence.resultsBytes.items[${index}]`, 'fabricates a Ritsu decision or admission eligibility');
    if (!item.itemId.includes(item.candidateClass) || !item.itemId.includes(item.stratum)) fail(`evidence.resultsBytes.items[${index}].itemId`, 'does not preserve the exact metadata-bearing identity defect');
  }
  const expectedDigests = {
    coordinatorPromptV2Sha256: APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V2_RUN_SHA256.coordinatorPromptV2,
    judgmentInstructionV1Sha256: APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V2_RUN_SHA256.judgmentInstructionV1,
    fixtureSha256: APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V2_RUN_SHA256.fixtureV1,
    rendererPreDispatchValidatorSha256: APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V2_RUN_SHA256.rendererV2,
    transcriptSha256: APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V2_RUN_SHA256.finalTranscript,
    processAuditSha256: APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V2_RUN_SHA256.processAudit,
  };
  for (const [key, expected] of Object.entries(expectedDigests)) if (results.digests?.[key] !== expected) fail(`evidence.resultsBytes.digests.${key}`, 'does not preserve the exact historical artifact identity');
  return results;
}

export function validateSyntheticPilotV2RunRecord(rawBytes, evidence) {
  const recordBytes = Buffer.from(rawBytes);
  const immutableSources = [
    ['evidence.promptV2Bytes', evidence.promptV2Bytes, APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V2_RUN_SHA256.coordinatorPromptV2],
    ['evidence.instructionV1Bytes', evidence.instructionV1Bytes, APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V2_RUN_SHA256.judgmentInstructionV1],
    ['evidence.fixtureV1Bytes', evidence.fixtureV1Bytes, APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V2_RUN_SHA256.fixtureV1],
    ['evidence.rendererV2Bytes', evidence.rendererV2Bytes, APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V2_RUN_SHA256.rendererV2],
    ['evidence.auditBytes', evidence.auditBytes, APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V2_RUN_SHA256.processAudit],
    ['evidence.resultsBytes', evidence.resultsBytes, APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V2_RUN_SHA256.rawResults],
    ['evidence.transcriptBytes', evidence.transcriptBytes, APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V2_RUN_SHA256.finalTranscript],
    ['recordBytes', recordBytes, APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V2_RUN_SHA256.runRecord],
  ];
  for (const [path, bytes, approved] of immutableSources) if (sha256(bytes) !== approved) fail(path, `does not match immutable approved identity ${approved}`);

  const raw = recordBytes.toString('utf8');
  const record = JSON.parse(raw);
  if (raw !== `${JSON.stringify(record, null, 2)}\n` || !hasExactKeys(record, rootKeys)) fail('record', 'must use deterministic two-space JSON and the exact closed root');
  if (record.schema !== 'https://colophon-claims.github.io/locomo-judge-report/synthetic-pilot-run-record/v2'
    || record.runId !== 'prompted-screening-synthetic-pilot-v2-2026-08-23'
    || record.status !== 'NON-CONFORMANT'
    || record.processOutcome !== 'PROCESS_DEFECT'
    || record.accepted !== false
    || record.syntheticOnly !== true
    || record.permanentlyExcluded !== true
    || record.realCandidateScreening !== false
    || record.sourcePublicHead !== 'e0a0e8a47de543b1bbf5ed4972195f33fd1ed456'
    || record.procedureVersion !== 'v2'
    || record.supersededByProcedureVersion !== 'v3') fail('record', 'does not preserve exact failed-run authority, status, or succession');
  if (!Array.isArray(record.defects) || record.defects.length !== 2
    || record.defects[0]?.kind !== 'metadata-bearing-judgment-identities'
    || record.defects[1]?.kind !== 'unscoped-transcript-identity-names') fail('record.defects', 'must preserve both process defects');
  const expectedStages = [
    { stage: 'Luna', modelAlias: 'gpt-5.6-luna', reasoning: 'medium', batchSizes: [24], judgmentCount: 24 },
    { stage: 'Terra', modelAlias: 'gpt-5.6-terra', reasoning: 'high', batchSizes: [16, 8], judgmentCount: 24 },
    { stage: 'Sol', modelAlias: 'gpt-5.6-sol', reasoning: 'high', batchSizes: [8, 8, 8], judgmentCount: 24 },
  ];
  if (!same(record.judgmentStages, expectedStages)
    || !same(record.processAuditStage, { modelAlias: 'gpt-5.6-sol', reasoning: 'high', dispatchCount: 1, itemJudgmentCount: 0, afterAllJudgmentOutputs: true })) fail('record.judgmentStages', 'does not preserve exact aliases, reasoning, batch traversal, and audit order');
  const expectedSummary = { itemCount: 24, judgmentCount: 72, judgmentDispatchCount: 6, processAuditDispatchCount: 1, threeModelAgreementCount: 24, lunaIntendedLabelMatchCount: 24, errorCount: 0, unsureCount: 0, infrastructureFailureCount: 0, retryCount: 0, judgmentAgentToolCallCount: 0, ritsuDecisionCount: 0 };
  if (!hasExactKeys(record.summary, summaryKeys) || !same(record.summary, expectedSummary)) fail('record.summary', 'does not preserve exact totals and zero Ritsu decisions');
  if (!hasExactKeys(record.publishedEvidence, publishedEvidenceKeys)
    || record.publishedEvidence.processAuditPath !== 'records/synthetic-pilot-v2-2026-08-23/process-audit.md'
    || record.publishedEvidence.rawResultsPath !== 'records/synthetic-pilot-v2-2026-08-23/pilot-results.pending-ritsu.json'
    || record.publishedEvidence.rawTranscriptPath !== 'records/synthetic-pilot-v2-2026-08-23/transcript.jsonl'
    || record.publishedEvidence.rawTranscriptIncluded !== true) fail('record.publishedEvidence', 'does not preserve the privacy-safe raw evidence boundary');

  const expectedArtifacts = {
    coordinatorPromptV2Sha256: APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V2_RUN_SHA256.coordinatorPromptV2,
    judgmentInstructionV1Sha256: APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V2_RUN_SHA256.judgmentInstructionV1,
    fixtureV1Sha256: APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V2_RUN_SHA256.fixtureV1,
    rendererV2Sha256: APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V2_RUN_SHA256.rendererV2,
    processAuditSha256: APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V2_RUN_SHA256.processAudit,
    rawResultsSha256: APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V2_RUN_SHA256.rawResults,
    judgmentTranscriptSha256: digest('c2c2157ba7eef0f342a0e7e5ee88674e9565da9d9425c5d0e708a64f3449ab63'),
    processAuditEventSha256: digest('bd9e7f30b794a67e085970779bddb43090ee0c5f04f976a5663f7072d4a4bf0b'),
    intendedLabelComparisonEventSha256: digest('2d85c9c27cf1d012ddd7397ef9191c4faec675c39f59cbd71cf52497da3b6df0'),
    finalTranscriptSha256: APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V2_RUN_SHA256.finalTranscript,
  };
  if (!same(record.artifacts, expectedArtifacts)) fail('record.artifacts', 'does not preserve all exact evidence identities');
  validateTranscriptScopeSemantics(record, evidence.transcriptBytes, evidence.auditBytes);
  validateResults(evidence.resultsBytes, record);
  return record;
}

export function loadSyntheticPilotV2RunEvidence() {
  return {
    promptV2Bytes: readFileSync(promptV2Path),
    instructionV1Bytes: readFileSync(instructionV1Path),
    fixtureV1Bytes: readFileSync(fixtureV1Path),
    rendererV2Bytes: readFileSync(rendererV2Path),
    auditBytes: readFileSync(auditPath),
    resultsBytes: readFileSync(resultsPath),
    transcriptBytes: readFileSync(transcriptPath),
  };
}

const record = validateSyntheticPilotV2RunRecord(readFileSync(recordPath), loadSyntheticPilotV2RunEvidence());

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  console.log(`validated append-only ${record.status}/${record.processOutcome} synthetic v2 run with distinct judgment and final transcript scopes`);
}
