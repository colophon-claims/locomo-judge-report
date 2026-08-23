import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V3_RUN_SHA256,
  APPROVED_PROMPTED_SCREENING_V4_SHA256,
} from './approved-prompted-screening-v4-identities.mjs';

const recordDir = new URL('../records/synthetic-pilot-v3-2026-08-23/', import.meta.url);
const recordPath = new URL('NOT-APPROVED.json', recordDir);
const promptV3Path = new URL('../CODEX-SCREENING-PROMPT.v3.md', import.meta.url);
const instructionV1Path = new URL('../CODEX-SCREENING-JUDGMENT-INSTRUCTION.v1.txt', import.meta.url);
const fixtureV2Path = new URL('../fixtures/prompted-screening-pilot-v2.json', import.meta.url);
const rendererV3Path = new URL('./render-prompted-screening-dispatch-v3.mjs', import.meta.url);
const compactFixturePath = new URL('../fixtures/prompted-screening-pilot-v4-compact-audit.json', import.meta.url);

const rootKeys = ['acceptanceCandidate', 'accepted', 'admissionEligible', 'approvalDisposition', 'approved', 'artifacts', 'costAmendmentArtifacts', 'derivativeHistory', 'judgmentStages', 'observableUsage', 'permanentlyExcluded', 'procedureVersion', 'processAuditStage', 'processConformance', 'publishedEvidence', 'realCandidateScreening', 'reusable', 'ritsuApproval', 'ritsuApprovalRequired', 'runId', 'schema', 'sourcePublicHead', 'status', 'summary', 'supersededByProcedureVersion', 'syntheticOnly', 'transcriptStages'];
const summaryKeys = ['duplicateOutputCount', 'errorCount', 'extraOutputCount', 'infrastructureFailureCount', 'invalidOutputItemCount', 'itemCount', 'judgmentAgentToolCallCount', 'judgmentCount', 'judgmentDispatchCount', 'lunaIntendedLabelMatchCount', 'missingOutputCount', 'modelDisagreementCount', 'processAuditDispatchCount', 'processAuditToolCallCount', 'retryCount', 'ritsuDecisionCount', 'threeModelAgreementCount', 'unsureCount'];
const artifactKeys = ['coordinatorPromptV3Sha256', 'derivativeCorrectionsSha256', 'finalTranscriptSha256', 'fixtureV2Sha256', 'intendedLabelComparisonEventSha256', 'judgmentInstructionV1Sha256', 'judgmentTranscriptPrefixSha256', 'processAuditDerivativeSha256', 'processAuditEventSha256', 'rawProcessAuditOutputSha256', 'rendererV3Sha256', 'resultsSha256', 'ritsuReviewSha256', 'usageSha256'];
const transcriptKeys = ['auditInputScope', 'finalRecordCount', 'finalTranscriptSha256', 'judgmentRecordCount', 'judgmentTranscriptPrefixSha256', 'postJudgmentEvents'];
const usageGroupKeys = ['cacheWriteInputTokens', 'cachedInputTokens', 'inputTokens', 'outputTokens', 'reasoningOutputTokens', 'totalTokens'];

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

function digest(bytes) {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

function validateTranscript(record, transcriptBytes) {
  const expectedStages = {
    judgmentRecordCount: 14,
    judgmentTranscriptPrefixSha256: 'sha256:9c49c0aa7c69b42243a1bb5f411b19b4b8d70a02abf42022c779272888e80bbd',
    auditInputScope: 'records 1-14 inclusive',
    postJudgmentEvents: [
      { recordNumber: 15, recordType: 'process-audit-output', eventSha256: 'sha256:61246be9c37164c4bd774963d89b0cdec06d1856f8d8a3882a890844013edbb2' },
      { recordNumber: 16, recordType: 'intended-label-comparison', eventSha256: 'sha256:d3d86f6265a223780d602f80b9b23d3614bc632e9c81e965b3b8659fc869a604' },
    ],
    finalRecordCount: 16,
    finalTranscriptSha256: APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V3_RUN_SHA256.transcript,
  };
  if (!hasExactKeys(record.transcriptStages, transcriptKeys) || !same(record.transcriptStages, expectedStages)) fail('record.transcriptStages', 'does not preserve exact prefix, suffix-event, and final scopes');
  const text = Buffer.from(transcriptBytes).toString('utf8');
  if (!text.endsWith('\n') || text.includes('\r')) fail('evidence.transcriptBytes', 'must be LF-terminated JSONL');
  const lines = text.slice(0, -1).split('\n');
  if (lines.length !== 16) fail('evidence.transcriptBytes', 'must contain exactly 16 records');
  const rows = lines.map((line) => JSON.parse(line));
  const prefixBytes = Buffer.from(`${lines.slice(0, 14).join('\n')}\n`, 'utf8');
  if (digest(prefixBytes) !== expectedStages.judgmentTranscriptPrefixSha256 || prefixBytes.length !== 59_310 || digest(transcriptBytes) !== expectedStages.finalTranscriptSha256) fail('evidence.transcriptBytes', 'does not match exact staged transcript identities and prefix size');
  expectedStages.postJudgmentEvents.forEach((event) => {
    const bytes = Buffer.from(`${lines[event.recordNumber - 1]}\n`, 'utf8');
    if (rows[event.recordNumber - 1].recordType !== event.recordType || digest(bytes) !== event.eventSha256) fail(`evidence.transcriptBytes[${event.recordNumber}]`, 'is an unbound or substituted suffix event');
  });
  const audit = rows[14];
  const expectedAuditUsage = { input_tokens: 450974, cached_input_tokens: 401408, cache_write_input_tokens: 0, output_tokens: 13173, reasoning_output_tokens: 3970, total_tokens: 464147 };
  if (audit.auditInputJudgmentTranscriptSha256 !== expectedStages.judgmentTranscriptPrefixSha256
    || audit.auditInputScope !== 'records 1-14 inclusive: run declaration, preflight, and six judgment dispatch-output pairs'
    || audit.modelAlias !== 'gpt-5.6-sol' || audit.reasoning !== 'high' || audit.outcome !== 'PASS' || audit.materialIssue !== false
    || audit.itemJudgmentsMade !== 0 || audit.intendedLabelComparisonsMade !== 0 || audit.verdictsReplaced !== false
    || audit.ritsuDecisionsMade !== 0 || audit.retry !== false || audit.toolCallCount !== 11
    || audit.rawOutputSha256 !== 'sha256:b37c1f73556e7edf5c786e10ccf0a1f117aee456a84ce32210e8d3970dbf05cf'
    || !same(audit.observableUsage, expectedAuditUsage)) fail('evidence.transcriptBytes[15]', 'does not preserve the exact PASS audit scope, authority, tools, and usage');
  const comparison = rows[15];
  if (comparison.performedAfterProcessAudit !== true || comparison.matchCount !== 24 || comparison.mismatchCount !== 0 || comparison.unsureCount !== 0
    || !Array.isArray(comparison.items) || comparison.items.length !== 24) fail('evidence.transcriptBytes[16]', 'does not preserve the post-audit 24-item comparison');
  return rows;
}

function validateUsage(record, usageBytes) {
  const expected = {
    status: 'OBSERVABLE-NOT-BILLING',
    judgmentTasks: { inputTokens: 119831, cachedInputTokens: 86528, cacheWriteInputTokens: 0, outputTokens: 2869, reasoningOutputTokens: 742, totalTokens: 122700 },
    processAudit: { inputTokens: 450974, cachedInputTokens: 401408, cacheWriteInputTokens: 0, outputTokens: 13173, reasoningOutputTokens: 3970, totalTokens: 464147 },
    total: { inputTokens: 570805, cachedInputTokens: 487936, cacheWriteInputTokens: 0, outputTokens: 16042, reasoningOutputTokens: 4712, totalTokens: 586847 },
  };
  if (!same(record.observableUsage, expected)
    || !hasExactKeys(record.observableUsage.judgmentTasks, usageGroupKeys)
    || !hasExactKeys(record.observableUsage.processAudit, usageGroupKeys)
    || !hasExactKeys(record.observableUsage.total, usageGroupKeys)) fail('record.observableUsage', 'does not preserve exact observable usage totals');
  const text = Buffer.from(usageBytes).toString('utf8');
  for (const fragment of ['| 464147 |', '**586847**', 'not billing claims', 'Judgment-agent tool calls: **0**']) if (!text.includes(fragment)) fail('evidence.usageBytes', `does not contain ${fragment}`);
}

function validateResults(record, resultsBytes) {
  const results = JSON.parse(Buffer.from(resultsBytes).toString('utf8'));
  if (results.schema !== 'local://colophon/prompted-screening-synthetic-pilot-results/v3'
    || results.runId !== record.runId || results.status !== 'PENDING_RITSU'
    || results.pilotAcceptanceCandidate !== true || results.pilotApproved !== false
    || results.ritsuApprovalRequired !== true || results.ritsuApproval !== null
    || results.syntheticOnly !== true || results.permanentlyExcluded !== true || results.realCandidateScreening !== false
    || results.summary?.itemCount !== 24 || results.summary?.judgmentCount !== 72
    || results.summary?.threeModelAgreementCount !== 24 || results.summary?.modelDisagreementCount !== 0
    || results.summary?.invalidOutputItemCount !== 0 || results.summary?.infrastructureFailureCount !== 0
    || results.summary?.retryCount !== 0 || results.summary?.judgmentAgentToolCallCount !== 0
    || results.summary?.ritsuDecisionCount !== 0 || !Array.isArray(results.items) || results.items.length !== 24) fail('evidence.resultsBytes', 'does not preserve the exact process-green pending-Ritsu result');
  results.items.forEach((item, index) => {
    if (item.ritsuReviewStatus !== 'PENDING' || item.proposedOperatorDecision !== 'PENDING' || item.ritsuDecision !== null
      || item.syntheticOnly !== true || item.permanentlyExcluded !== true || item.admissionEligible !== false) fail(`evidence.resultsBytes.items[${index}]`, 'fabricates approval, admission, or a Ritsu decision');
  });
}

function validateDerivatives(evidence) {
  const auditText = Buffer.from(evidence.processAuditBytes).toString('utf8');
  if (!auditText.includes('## Process audit: PASS') || !auditText.includes('122,700 total tokens')
    || !auditText.includes('zero item judgments') || !auditText.includes('zero Ritsu decisions')) fail('evidence.processAuditBytes', 'does not preserve the process PASS, usage, and authority limits');
  const reviewText = Buffer.from(evidence.ritsuReviewBytes).toString('utf8');
  if (!reviewText.includes('Status: **PENDING RITSU**') || !reviewText.includes('does not approve the pilot') || !reviewText.includes('records no `confirm` or `exclude` decision')) fail('evidence.ritsuReviewBytes', 'does not preserve pending Ritsu and non-approval');
  const correctionText = Buffer.from(evidence.derivativeCorrectionsBytes).toString('utf8');
  for (const digestValue of ['0c19cf14977b791d5c543657fdce3bd1204807e4d4faa6cb43efc56234c70c9c', '716cf15c52b1a598345e33be957c1096d0af2d9c84097c60d51232f66eb7bad1', '05c7b060ac1b6f5c16752e263a2ba53f3412113e656334d81b39641830f00c96', '60d54d86a36f009e24d59aa19271cc610fb1e20cb28d9626dac28d14ef8a9533', '3235a4d3fea6c06489d6611c6914db5a870831ea7db3087dc4f00c444a64e6a6', 'cd3afdaaf78be96ed0323672386a68621baee0d9d21866a3ade716b2b178fefe']) if (!correctionText.includes(digestValue)) fail('evidence.derivativeCorrectionsBytes', 'does not preserve complete derivative identity history');
}

export function validateSyntheticPilotV3RunRecord(rawBytes, evidence) {
  const recordBytes = Buffer.from(rawBytes);
  const immutable = [
    ['evidence.promptV3Bytes', evidence.promptV3Bytes, APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V3_RUN_SHA256.coordinatorPromptV3],
    ['evidence.instructionV1Bytes', evidence.instructionV1Bytes, APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V3_RUN_SHA256.judgmentInstructionV1],
    ['evidence.fixtureV2Bytes', evidence.fixtureV2Bytes, APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V3_RUN_SHA256.fixtureV2],
    ['evidence.rendererV3Bytes', evidence.rendererV3Bytes, APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V3_RUN_SHA256.rendererV3],
    ['evidence.transcriptBytes', evidence.transcriptBytes, APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V3_RUN_SHA256.transcript],
    ['evidence.resultsBytes', evidence.resultsBytes, APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V3_RUN_SHA256.results],
    ['evidence.usageBytes', evidence.usageBytes, APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V3_RUN_SHA256.usage],
    ['evidence.processAuditBytes', evidence.processAuditBytes, APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V3_RUN_SHA256.processAudit],
    ['evidence.ritsuReviewBytes', evidence.ritsuReviewBytes, APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V3_RUN_SHA256.ritsuReview],
    ['evidence.derivativeCorrectionsBytes', evidence.derivativeCorrectionsBytes, APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V3_RUN_SHA256.derivativeCorrections],
    ['evidence.compactFixtureBytes', evidence.compactFixtureBytes, APPROVED_PROMPTED_SCREENING_V4_SHA256.compactAuditPilotV4Fixture],
    ['recordBytes', recordBytes, APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V3_RUN_SHA256.terminalRecord],
  ];
  for (const [path, bytes, approved] of immutable) if (digest(bytes) !== approved) fail(path, `does not match immutable approved identity ${approved}`);
  const raw = recordBytes.toString('utf8');
  const record = JSON.parse(raw);
  if (raw !== `${JSON.stringify(record, null, 2)}\n` || !hasExactKeys(record, rootKeys)) fail('record', 'must use exact deterministic closed bytes');
  if (record.schema !== 'https://colophon-claims.github.io/locomo-judge-report/synthetic-pilot-run-record/v3'
    || record.runId !== 'prompted-screening-synthetic-pilot-v3-2026-08-23' || record.status !== 'NOT-APPROVED'
    || record.processConformance !== 'PASS' || record.acceptanceCandidate !== true || record.approved !== false || record.accepted !== false
    || record.reusable !== false || record.syntheticOnly !== true || record.permanentlyExcluded !== true || record.admissionEligible !== false
    || record.realCandidateScreening !== false || record.ritsuApprovalRequired !== true || record.ritsuApproval !== null
    || record.sourcePublicHead !== '525664b724fe23c001199ba45910fd75ebb524f6' || record.procedureVersion !== 'v3' || record.supersededByProcedureVersion !== 'v4') fail('record', 'does not preserve exact non-approval, acceptance-candidate, and succession authority');
  if (!same(record.approvalDisposition, { auditShapeStatus: 'REJECTED-EXCESSIVE-USAGE', pilotStatus: 'PENDING-RITSU', reason: 'The judgment process is conformant and an acceptance candidate, but the raw-material Sol audit consumed 464147 observable tokens and is rejected as the future audit shape. Ritsu has recorded no approval or item decision.', noRerun: true })) fail('record.approvalDisposition', 'does not preserve the no-rerun cost rejection and pending-Ritsu boundary');
  const expectedStages = [
    { stage: 'Luna', modelAlias: 'gpt-5.6-luna', reasoning: 'medium', batchSizes: [24], judgmentCount: 24 },
    { stage: 'Terra', modelAlias: 'gpt-5.6-terra', reasoning: 'high', batchSizes: [16, 8], judgmentCount: 24 },
    { stage: 'Sol', modelAlias: 'gpt-5.6-sol', reasoning: 'high', batchSizes: [8, 8, 8], judgmentCount: 24 },
  ];
  if (!same(record.judgmentStages, expectedStages)
    || !same(record.processAuditStage, { modelAlias: 'gpt-5.6-sol', reasoning: 'high', outcome: 'PASS', materialIssueCount: 0, itemJudgmentCount: 0, intendedLabelComparisonCount: 0, verdictReplacementCount: 0, ritsuDecisionCount: 0, toolCallCount: 11, afterAllJudgmentOutputs: true })) fail('record.judgmentStages', 'does not preserve exact judgments and audit activity');
  const expectedSummary = { itemCount: 24, judgmentCount: 72, judgmentDispatchCount: 6, processAuditDispatchCount: 1, threeModelAgreementCount: 24, modelDisagreementCount: 0, lunaIntendedLabelMatchCount: 24, errorCount: 0, unsureCount: 0, invalidOutputItemCount: 0, missingOutputCount: 0, extraOutputCount: 0, duplicateOutputCount: 0, infrastructureFailureCount: 0, retryCount: 0, judgmentAgentToolCallCount: 0, processAuditToolCallCount: 11, ritsuDecisionCount: 0 };
  if (!hasExactKeys(record.summary, summaryKeys) || !same(record.summary, expectedSummary)) fail('record.summary', 'does not preserve exact judgments, outputs, tools, and decisions');
  const expectedArtifacts = {
    coordinatorPromptV3Sha256: APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V3_RUN_SHA256.coordinatorPromptV3,
    judgmentInstructionV1Sha256: APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V3_RUN_SHA256.judgmentInstructionV1,
    fixtureV2Sha256: APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V3_RUN_SHA256.fixtureV2,
    rendererV3Sha256: APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V3_RUN_SHA256.rendererV3,
    judgmentTranscriptPrefixSha256: 'sha256:9c49c0aa7c69b42243a1bb5f411b19b4b8d70a02abf42022c779272888e80bbd',
    rawProcessAuditOutputSha256: 'sha256:b37c1f73556e7edf5c786e10ccf0a1f117aee456a84ce32210e8d3970dbf05cf',
    processAuditEventSha256: 'sha256:61246be9c37164c4bd774963d89b0cdec06d1856f8d8a3882a890844013edbb2',
    intendedLabelComparisonEventSha256: 'sha256:d3d86f6265a223780d602f80b9b23d3614bc632e9c81e965b3b8659fc869a604',
    finalTranscriptSha256: APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V3_RUN_SHA256.transcript,
    resultsSha256: APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V3_RUN_SHA256.results,
    usageSha256: APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V3_RUN_SHA256.usage,
    processAuditDerivativeSha256: APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V3_RUN_SHA256.processAudit,
    ritsuReviewSha256: APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V3_RUN_SHA256.ritsuReview,
    derivativeCorrectionsSha256: APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V3_RUN_SHA256.derivativeCorrections,
  };
  if (!hasExactKeys(record.artifacts, artifactKeys) || !same(record.artifacts, expectedArtifacts)) fail('record.artifacts', 'does not preserve exact immutable evidence identities');
  validateTranscript(record, evidence.transcriptBytes);
  validateUsage(record, evidence.usageBytes);
  validateResults(record, evidence.resultsBytes);
  validateDerivatives(evidence);
  const compactFixtureRaw = Buffer.from(evidence.compactFixtureBytes).toString('utf8');
  const compactFixture = JSON.parse(compactFixtureRaw);
  if (compactFixtureRaw !== `${JSON.stringify(compactFixture, null, 2)}\n`
    || compactFixture.schema !== 'https://colophon-claims.github.io/locomo-judge-report/compact-process-audit-pilot-fixture/v4'
    || compactFixture.status !== 'synthetic-validation-only-no-model-run'
    || compactFixture.expectedExecution?.renderedInputSha256 !== 'sha256:db144bcbeb9a6e1fa2b60a07d5b3c6339f349648706e8208519bb71d9e222a4d'
    || compactFixture.expectedExecution?.renderedInputByteLength !== 8235
    || compactFixture.expectedExecution?.modelRunOccurred !== false) fail('evidence.compactFixtureBytes', 'does not preserve the exact historical no-run compact amendment wrapper');
  const expectedAmendment = { coordinatorPromptV4Sha256: APPROVED_PROMPTED_SCREENING_V4_SHA256.coordinatorPromptV4, compactAuditSchemaV1Sha256: APPROVED_PROMPTED_SCREENING_V4_SHA256.compactAuditSchemaV1, compactAuditRendererV1Sha256: APPROVED_PROMPTED_SCREENING_V4_SHA256.compactAuditRendererV1, compactAuditPilotV4FixtureSha256: APPROVED_PROMPTED_SCREENING_V4_SHA256.compactAuditPilotV4Fixture, compactAuditPilotRenderedInputSha256: 'sha256:db144bcbeb9a6e1fa2b60a07d5b3c6339f349648706e8208519bb71d9e222a4d', compactAuditPilotRenderedInputByteLength: 8235, compactAuditMaximumByteLength: 65536, compactAuditSynthetic664CapacityByteLength: 47830, modelRunOccurred: false };
  if (!same(record.costAmendmentArtifacts, expectedAmendment)) fail('record.costAmendmentArtifacts', 'does not bind exact no-run compact amendment evidence and capacity');
  return record;
}

export function loadSyntheticPilotV3RunEvidence() {
  return {
    promptV3Bytes: readFileSync(promptV3Path), instructionV1Bytes: readFileSync(instructionV1Path),
    fixtureV2Bytes: readFileSync(fixtureV2Path), rendererV3Bytes: readFileSync(rendererV3Path),
    transcriptBytes: readFileSync(new URL('transcript.jsonl', recordDir)),
    resultsBytes: readFileSync(new URL('pilot-results.pending-ritsu.json', recordDir)),
    usageBytes: readFileSync(new URL('usage.md', recordDir)),
    processAuditBytes: readFileSync(new URL('process-audit.md', recordDir)),
    ritsuReviewBytes: readFileSync(new URL('ritsu-review.md', recordDir)),
    derivativeCorrectionsBytes: readFileSync(new URL('derivative-corrections.md', recordDir)),
    compactFixtureBytes: readFileSync(compactFixturePath),
  };
}

const record = validateSyntheticPilotV3RunRecord(readFileSync(recordPath), loadSyntheticPilotV3RunEvidence());

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  console.log(`validated ${record.status} process-green synthetic v3 run, exact usage, correction history, and compact v4 amendment`);
}
