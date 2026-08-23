import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { canonical, validateCompactProcessAuditInput } from './render-compact-process-audit-input-v1.mjs';
import {
  APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V4_RUN_SHA256,
  APPROVED_PROMPTED_SCREENING_V5_SHA256,
} from './approved-prompted-screening-v5-identities.mjs';

const recordDir = new URL('../records/synthetic-pilot-v4-2026-08-23/', import.meta.url);
const sourcePaths = Object.freeze({
  promptV4Bytes: new URL('../CODEX-SCREENING-PROMPT.v4.md', import.meta.url),
  instructionV1Bytes: new URL('../CODEX-SCREENING-JUDGMENT-INSTRUCTION.v1.txt', import.meta.url),
  fixtureV2Bytes: new URL('../fixtures/prompted-screening-pilot-v2.json', import.meta.url),
  judgmentRendererV3Bytes: new URL('./render-prompted-screening-dispatch-v3.mjs', import.meta.url),
  compactSchemaV1Bytes: new URL('../schemas/compact-process-audit-input.v1.schema.json', import.meta.url),
  compactRendererV1Bytes: new URL('./render-compact-process-audit-input-v1.mjs', import.meta.url),
  compactFixtureV4Bytes: new URL('../fixtures/prompted-screening-pilot-v4-joint-compact-audit.json', import.meta.url),
  compactAuditInputBytes: new URL('compact-process-audit-input.json', recordDir),
  judgmentPrefixBytes: new URL('judgment-prefix.transcript.jsonl', recordDir),
  resultsBytes: new URL('pilot-results.pending-ritsu.json', recordDir),
  processAuditDerivativeBytes: new URL('process-audit.md', recordDir),
  ritsuReviewBytes: new URL('ritsu-review.md', recordDir),
  transcriptBytes: new URL('transcript.jsonl', recordDir),
  usageBytes: new URL('usage.md', recordDir),
  mechanicalCorrectionBytes: new URL('mechanical-correction.md', recordDir),
  recordBytes: new URL('NON-CONFORMANT.json', recordDir),
});

const rootKeys = ['acceptanceCandidate', 'accepted', 'admissionEligible', 'approved', 'artifacts', 'classifications', 'independentReview', 'permanentlyExcluded', 'procedureVersion', 'processAudit', 'publishedEvidence', 'realCandidateScreening', 'reason', 'reusable', 'ritsuApproval', 'ritsuDecisionCount', 'runId', 'schema', 'sourcePublicHead', 'status', 'summary', 'supersededByProcedureVersion', 'syntheticOnly', 'transcriptStages', 'v5Amendment'];
const summaryKeys = ['duplicateOutputCount', 'extraOutputCount', 'infrastructureFailureCount', 'invalidOutputItemCount', 'itemCount', 'judgmentAgentToolCallCount', 'judgmentCount', 'judgmentDispatchCount', 'missingOutputCount', 'modelDisagreementCount', 'processAuditDispatchCount', 'processAuditToolCallCount', 'retryCount', 'ritsuDecisionCount', 'ritsuPendingCount', 'threeStageAgreementCount'];
const processAuditKeys = ['declaredToolPolicy', 'itemJudgmentCount', 'materialFlagCount', 'modelAlias', 'overallAssessment', 'processDefectsSeverity', 'processDefectsStatus', 'reasoning', 'ritsuDecisionCount', 'strictPassNoMaterialIssue', 'suspiciousAgreementSeverity', 'suspiciousAgreementStatus', 'verdictReplacementCount'];
const transcriptKeys = ['auditInputScope', 'finalRecordCount', 'finalTranscriptSha256', 'judgmentRecordCount', 'judgmentTranscriptPrefixSha256', 'postJudgmentEvents'];

function fail(path, detail) {
  throw new Error(`${path}: ${detail}`);
}

function digest(bytes) {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

function hasExactKeys(value, keys) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).sort().join(',') === [...keys].sort().join(',');
}

function same(value, expected) {
  return canonical(value) === canonical(expected);
}

function assertApprovedBytes(evidence) {
  const approved = APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V4_RUN_SHA256;
  const identities = [
    ['promptV4Bytes', approved.coordinatorPromptV4],
    ['instructionV1Bytes', approved.judgmentInstructionV1],
    ['fixtureV2Bytes', approved.syntheticFixtureV2],
    ['judgmentRendererV3Bytes', approved.judgmentRendererV3],
    ['compactSchemaV1Bytes', approved.compactSchemaV1],
    ['compactRendererV1Bytes', approved.compactRendererV1],
    ['compactFixtureV4Bytes', approved.compactFixtureV4],
    ['compactAuditInputBytes', approved.compactAuditInput],
    ['judgmentPrefixBytes', approved.judgmentTranscriptPrefix],
    ['resultsBytes', approved.results],
    ['processAuditDerivativeBytes', approved.processAuditDerivative],
    ['ritsuReviewBytes', approved.ritsuReview],
    ['transcriptBytes', approved.finalTranscript],
    ['usageBytes', approved.usage],
    ['mechanicalCorrectionBytes', approved.mechanicalCorrection],
    ['recordBytes', approved.terminalRecord],
  ];
  for (const [name, expected] of identities) {
    if (!Buffer.isBuffer(evidence[name]) || digest(evidence[name]) !== expected) fail(`evidence.${name}`, 'does not match its literal code-owned approved SHA-256 identity before parsing');
  }
}

function validateResults(results) {
  if (results.schema !== 'https://colophon-claims.github.io/locomo-judge-report/prompted-screening-synthetic-pilot-run/v4-local'
    || results.status !== 'NON-CONFORMANT' || results.reason !== 'PROCESS_AUDIT_MATERIAL_FLAG'
    || results.acceptanceCandidate !== false || results.approved !== false
    || results.ritsuReviewStatus !== 'PENDING_ALL_24' || results.sourceRevision !== APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V4_RUN_SHA256.sourcePublicHead
    || results.itemCount !== 24 || results.judgmentCount !== 72 || results.judgmentDispatchCount !== 6
    || results.processAuditDispatchCount !== 1 || results.totalDispatchCount !== 7
    || !same(results.batchSizes, [24, 16, 8, 8, 8, 8])
    || !Array.isArray(results.items) || results.items.length !== 24) fail('evidence.resultsBytes', 'does not preserve the exact nonconformant 24-item run summary');
  const zeroCounts = ['missing', 'extra', 'duplicate', 'invalid', 'infrastructureFailures', 'retries', 'judgmentAgentToolCalls', 'processAuditToolCalls', 'incorrectDeterminateLuna'];
  if (zeroCounts.some((key) => results.counts?.[key] !== 0)
    || results.counts?.threeStageAgreements !== 24 || results.counts?.ritsuPending !== 24
    || results.processAudit?.overallAssessment !== 'qualified-pass'
    || results.processAudit?.processDefectsSeverity !== 'high'
    || results.processAudit?.strictPassNoMaterialIssue !== false) fail('evidence.resultsBytes', 'does not preserve exact counts and failed strict audit gate');
  results.items.forEach((item, index) => {
    if (item.ritsuDecision !== 'PENDING' || item.ritsuNotes !== null
      || item.screeningVerdict !== item.terraEvidenceVerdict
      || item.screeningVerdict !== item.solEvidenceVerdict
      || item.lunaMatchesIntended !== true || item.terraMatchesIntended !== true || item.solMatchesIntended !== true) fail(`evidence.resultsBytes.items[${index}]`, 'fabricates a decision or drifts from exact three-stage agreement');
  });
}

function validateTranscript(compactInput, evidence) {
  const text = evidence.transcriptBytes.toString('utf8');
  if (!text.endsWith('\n') || text.includes('\r')) fail('evidence.transcriptBytes', 'must be exact LF-terminated JSONL');
  const lines = text.slice(0, -1).split('\n');
  if (lines.length !== 16) fail('evidence.transcriptBytes', 'must contain exactly sixteen events');
  const prefixBytes = Buffer.from(`${lines.slice(0, 14).join('\n')}\n`, 'utf8');
  if (!prefixBytes.equals(evidence.judgmentPrefixBytes) || digest(prefixBytes) !== APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V4_RUN_SHA256.judgmentTranscriptPrefix) fail('evidence.transcriptBytes', 'does not preserve the exact fourteen-event judgment prefix');
  const events = lines.map((line) => JSON.parse(line));
  if (events[0]?.event !== 'run-declaration' || events[1]?.event !== 'preflight') fail('evidence.transcriptBytes', 'must begin with declaration and preflight');
  const taskNames = new Set();
  const stageProfiles = [
    ['Luna', 'gpt-5.6-luna', 'medium'], ['Terra', 'gpt-5.6-terra', 'high'], ['Terra', 'gpt-5.6-terra', 'high'],
    ['Sol', 'gpt-5.6-sol', 'high'], ['Sol', 'gpt-5.6-sol', 'high'], ['Sol', 'gpt-5.6-sol', 'high'],
  ];
  compactInput.batches.forEach((batch, index) => {
    const dispatchIndex = 2 + (index * 2);
    const outputIndex = dispatchIndex + 1;
    const dispatch = events[dispatchIndex];
    const output = events[outputIndex];
    const [stage, modelAlias, reasoning] = stageProfiles[index];
    if (dispatch?.event !== 'judgment-dispatch' || output?.event !== 'judgment-output'
      || dispatch.taskName !== output.taskName || typeof dispatch.taskName !== 'string' || taskNames.has(dispatch.taskName)
      || dispatch.stage !== stage || output.stage !== stage || dispatch.modelAlias !== modelAlias || output.modelAlias !== modelAlias
      || dispatch.reasoning !== reasoning || output.reasoning !== reasoning
      || dispatch.batchOrdinal !== batch[1] || output.batchOrdinal !== batch[1]
      || dispatch.batchCount !== batch[2] || dispatch.itemCount !== batch[3]
      || dispatch.blindedItemsSha256 !== batch[4] || dispatch.dispatchSha256 !== batch[5]
      || output.rawOutputSha256 !== batch[6] || digest(Buffer.from(output.rawOutputBase64, 'base64')) !== batch[6]) fail(`evidence.transcriptBytes.batch[${index}]`, 'does not preserve one exact declared batch and recorded task pair');
    taskNames.add(dispatch.taskName);
  });
  const processAuditEvent = events[14];
  const comparisonEvent = events[15];
  const processAuditEventBytes = Buffer.from(`${lines[14]}\n`, 'utf8');
  const comparisonEventBytes = Buffer.from(`${lines[15]}\n`, 'utf8');
  const rawAuditBytes = Buffer.from(processAuditEvent.rawOutputBase64, 'base64');
  const rawAudit = JSON.parse(rawAuditBytes.toString('utf8'));
  if (digest(processAuditEventBytes) !== APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V4_RUN_SHA256.processAuditEvent
    || digest(comparisonEventBytes) !== APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V4_RUN_SHA256.comparisonEvent
    || processAuditEvent.event !== 'process-audit'
    || processAuditEvent.judgmentTranscriptPrefixSha256 !== APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V4_RUN_SHA256.judgmentTranscriptPrefix
    || processAuditEvent.compactAuditInputSha256 !== APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V4_RUN_SHA256.compactAuditInput
    || digest(rawAuditBytes) !== APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V4_RUN_SHA256.rawProcessAuditOutput
    || processAuditEvent.overallAssessment !== 'qualified-pass' || processAuditEvent.materialFlagCount !== 1
    || processAuditEvent.strictPassNoMaterialIssue !== false
    || rawAudit.overallAssessment !== 'qualified-pass' || rawAudit.processDefects?.status !== 'flag'
    || rawAudit.processDefects?.severity !== 'high') fail('evidence.transcriptBytes[15]', 'does not preserve exact raw audit and material flag');
  if (comparisonEvent.event !== 'mechanical-intended-label-comparison'
    || comparisonEvent.occurredAfterProcessAudit !== true || comparisonEvent.summary?.itemCount !== 24
    || comparisonEvent.summary?.threeStageAgreementCount !== 24 || comparisonEvent.summary?.ritsuPendingCount !== 24) fail('evidence.transcriptBytes[16]', 'does not preserve the post-audit comparison scope');
  return { rawAuditBytes, processAuditEvent, comparisonEvent };
}

function validateDerivatives(evidence, rawAuditBytes) {
  const audit = evidence.processAuditDerivativeBytes.toString('utf8');
  const match = audit.match(/## Raw process-audit output\n\n```json\n([\s\S]*?)\n```/u);
  if (!match || !Buffer.from(match[1], 'utf8').equals(rawAuditBytes)
    || !audit.includes('NON-CONFORMANT / PROCESS_AUDIT_MATERIAL_FLAG')
    || !audit.includes('The separate fresh Sol-high audit returned `qualified-pass`')) fail('evidence.processAuditDerivativeBytes', 'does not preserve the exact returned raw audit and nonconformant classification');
  const review = evidence.ritsuReviewBytes.toString('utf8');
  if (!review.includes('not approved') || !review.includes('not an acceptance candidate')
    || (review.match(/\| PENDING \|/gu) ?? []).length !== 24) fail('evidence.ritsuReviewBytes', 'does not preserve all 24 pending decisions and non-approval');
  const correction = evidence.mechanicalCorrectionBytes.toString('utf8');
  const required = [
    'distinct task names, declared model and',
    'does not prove\nprovider execution, process freshness, independent generation, model routing',
    'Content\ndigest equality alone is not evidence of artifact reuse.',
    'distinct sealed\ntranscript event identities prove only that separate dispatch and output events\nwere recorded',
    'strict gate requires unqualified `PASS` and zero material process-defect flags',
  ];
  if (required.some((fragment) => !correction.includes(fragment))) fail('evidence.mechanicalCorrectionBytes', 'does not contain the exact capability correction and strict-gate preservation');
}

export function validateSyntheticPilotV4RunRecord(evidence) {
  assertApprovedBytes(evidence);
  const record = JSON.parse(evidence.recordBytes.toString('utf8'));
  const results = JSON.parse(evidence.resultsBytes.toString('utf8'));
  const compactInput = JSON.parse(evidence.compactAuditInputBytes.toString('utf8'));
  if (evidence.recordBytes.toString('utf8') !== `${JSON.stringify(record, null, 2)}\n`) fail('evidence.recordBytes', 'must be exact two-space JSON with one final LF');
  if (!hasExactKeys(record, rootKeys)
    || record.schema !== 'https://colophon-claims.github.io/locomo-judge-report/synthetic-pilot-run-record/v4'
    || record.runId !== 'prompted-screening-synthetic-pilot-v4-2026-08-23'
    || record.status !== 'NON-CONFORMANT' || record.reason !== 'PROCESS_AUDIT_MATERIAL_FLAG'
    || record.acceptanceCandidate !== false || record.approved !== false || record.accepted !== false
    || record.reusable !== false || record.admissionEligible !== false || record.syntheticOnly !== true
    || record.permanentlyExcluded !== true || record.realCandidateScreening !== false
    || record.ritsuDecisionCount !== 0 || record.ritsuApproval !== null
    || record.sourcePublicHead !== APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V4_RUN_SHA256.sourcePublicHead
    || record.procedureVersion !== 'v4' || record.supersededByProcedureVersion !== 'v5') fail('record', 'does not preserve exact append-only nonconformant status and authority');
  if (!hasExactKeys(record.summary, summaryKeys) || !hasExactKeys(record.processAudit, processAuditKeys)
    || record.summary.itemCount !== 24 || record.summary.judgmentCount !== 72
    || record.summary.threeStageAgreementCount !== 24 || record.summary.ritsuDecisionCount !== 0
    || record.processAudit.overallAssessment !== 'qualified-pass' || record.processAudit.materialFlagCount !== 1
    || record.processAudit.strictPassNoMaterialIssue !== false || record.processAudit.ritsuDecisionCount !== 0) fail('record', 'does not bind exact run counts and failed strict audit gate');
  if (!hasExactKeys(record.transcriptStages, transcriptKeys)
    || record.transcriptStages.judgmentRecordCount !== 14 || record.transcriptStages.finalRecordCount !== 16
    || record.transcriptStages.judgmentTranscriptPrefixSha256 !== APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V4_RUN_SHA256.judgmentTranscriptPrefix
    || record.transcriptStages.finalTranscriptSha256 !== APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V4_RUN_SHA256.finalTranscript) fail('record.transcriptStages', 'does not bind exact non-circular transcript stages');
  if (record.independentReview?.status !== 'WITH-FIXES'
    || record.independentReview?.sha256 !== APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V4_RUN_SHA256.independentReview
    || record.independentReview?.publishedCopy !== false
    || !record.independentReview?.omissionReason.includes('operator-local absolute preservation path')) fail('record.independentReview', 'does not preserve exact independent review classification and omission reason');
  if (record.v5Amendment?.sourceRevision !== APPROVED_PROMPTED_SCREENING_V5_SHA256.sourceRevision
    || record.v5Amendment?.coordinatorPromptV5Sha256 !== APPROVED_PROMPTED_SCREENING_V5_SHA256.coordinatorPromptV5
    || record.v5Amendment?.compactAuditSchemaV2Sha256 !== APPROVED_PROMPTED_SCREENING_V5_SHA256.compactAuditSchemaV2
    || record.v5Amendment?.compactAuditRendererV2Sha256 !== APPROVED_PROMPTED_SCREENING_V5_SHA256.compactAuditRendererV2
    || record.v5Amendment?.compactAuditReal664CapacityByteLength !== 49_954
    || record.v5Amendment?.compactAuditReal664CapacityBatchCount !== 146
    || record.v5Amendment?.modelRunOccurred !== false) fail('record.v5Amendment', 'does not bind exact no-run amendment sources and capacity');
  validateCompactProcessAuditInput(compactInput);
  validateResults(results);
  const transcript = validateTranscript(compactInput, evidence);
  validateDerivatives(evidence, transcript.rawAuditBytes);
  if (record.classifications.terra2Sol3ContentDigestEquality !== 'PERMITTED_CONTENT_EQUALITY_NOT_REUSE_PROOF'
    || record.classifications.transcriptEventSeparation !== 'RECORDED_DISTINCT_EVENTS_ONLY'
    || record.classifications.providerExecution !== 'NOT_MACHINE_VERIFIED'
    || record.classifications.providerProcessFreshness !== 'NOT_MACHINE_VERIFIED'
    || record.classifications.syntheticSampling !== 'NOT_APPLICABLE_FULL_FIXED_FIXTURE'
    || record.classifications.materialDefectStandard !== 'CONTRADICTION_IN_SUPPLIED_SEALED_MACHINE_VALIDATED_EVIDENCE_REQUIRED') fail('record.classifications', 'overclaims provider capability or drifts from corrected process semantics');
  return record;
}

export function loadSyntheticPilotV4RunEvidence() {
  return Object.fromEntries(Object.entries(sourcePaths).map(([key, path]) => [key, readFileSync(path)]));
}

const record = validateSyntheticPilotV4RunRecord(loadSyntheticPilotV4RunEvidence());

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  console.log(`validated exact ${record.status}/${record.reason} synthetic v4 evidence, correction, zero Ritsu decisions, and no-run v5 amendment`);
}
