import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  MAX_COMPACT_PROCESS_AUDIT_BYTES,
  buildSyntheticCapacityProbe,
  canonical,
  sha256,
  validateCompactProcessAuditInput,
} from './render-compact-process-audit-input-v1.mjs';
import {
  createSyntheticPilotV2StagePlan,
  renderStageDispatchesV3,
  validateSyntheticPilotV2Structure,
} from './render-prompted-screening-dispatch-v3.mjs';
import { APPROVED_PROMPTED_SCREENING_V3_SHA256 } from './approved-prompted-screening-v3-identities.mjs';
import { APPROVED_PROMPTED_SCREENING_V5_SHA256 } from './approved-prompted-screening-v5-identities.mjs';

const paths = Object.freeze({
  coordinatorPromptBytes: new URL('../CODEX-SCREENING-PROMPT.v5.md', import.meta.url),
  screeningProcedureBytes: new URL('../CODEX-SCREENING-PROMPT.v5.md', import.meta.url),
  compactSchemaBytes: new URL('../schemas/compact-process-audit-input.v2.schema.json', import.meta.url),
  compactRendererBytes: new URL('./render-compact-process-audit-input-v2.mjs', import.meta.url),
  processAuditInstructionBytes: new URL('../CODEX-SCREENING-AUDIT-INSTRUCTION.v1.txt', import.meta.url),
  processAuditOutputSchemaBytes: new URL('../schemas/compact-process-audit-output.v1.schema.json', import.meta.url),
  judgmentProcedureBytes: new URL('../CODEX-SCREENING-PROMPT.v3.md', import.meta.url),
  judgmentInstructionBytes: new URL('../CODEX-SCREENING-JUDGMENT-INSTRUCTION.v1.txt', import.meta.url),
  screeningPoolOrFixtureBytes: new URL('../fixtures/prompted-screening-pilot-v2.json', import.meta.url),
  opaqueIdentityMappingBytes: new URL('../fixtures/prompted-screening-pilot-v2-identity-map.canonical.json', import.meta.url),
  dispatchOrderBytes: new URL('../fixtures/prompted-screening-pilot-v2-dispatch-order.canonical.json', import.meta.url),
  judgmentRendererBytes: new URL('./render-prompted-screening-dispatch-v3.mjs', import.meta.url),
  transcriptPrefixBytes: new URL('../records/synthetic-pilot-v4-2026-08-23/judgment-prefix.transcript.jsonl', import.meta.url),
});

export const COMPACT_PROCESS_AUDIT_PROTOCOL_V2 = 'prompted-codex-screening-compact-process-audit/v2';
export const COMPACT_PROCESS_AUDIT_SCHEMA_V2 = 'https://colophon-claims.github.io/locomo-judge-report/compact-process-audit-input/v2';
export const CAPACITY_MEASUREMENT_KIND = 'measurement-only-not-an-audit-input';

export const SYNTHETIC_SELECTION_BASIS = Object.freeze({
  kind: 'entire-fixed-synthetic-fixture-no-sampling', populationScope: 'exact-fixed-24-item-synthetic-fixture',
  populationItemCount: 24, dispatchedItemCountPerStage: 24, deterministicFixtureOrder: true, samplingPerformed: false,
});
export const REAL_SELECTION_BASIS = Object.freeze({
  kind: 'sealed-real-screening-pool-and-public-sample', populationScope: 'exact-sealed-664-item-screening-pool',
  populationItemCount: 664, dispatchedItemCountPerStage: 664, deterministicFixtureOrder: false, samplingPerformed: true,
});
export const DIGEST_SEMANTICS = Object.freeze({
  blindedItemsSha256: 'canonical ordered stage-agnostic blinded subset content; equal bytes may repeat',
  dispatchSha256: 'exact instruction plus the same blinded subset content; equal bytes may repeat across stages',
  rawOutputSha256: 'exact ordered raw output content; equal verdict bytes may repeat',
  transcriptDispatchEventSha256: 'exact sealed JSONL dispatch event with final LF; unique within the prefix',
  transcriptOutputEventSha256: 'exact sealed JSONL output event with final LF; unique within the prefix',
  contentDigestEqualityRule: 'content digest equality alone is not evidence of reuse',
  eventIdentityRule: 'distinct transcript event identities prove only recorded event separation, not provider or process freshness',
});
export const CAPABILITY_BOUNDARY = Object.freeze({
  providerExecution: 'not-machine-verified', providerProcessFreshness: 'not-machine-verified',
  modelRouting: 'not-machine-verified', invariantAliasWeights: 'not-machine-verified',
  promptCompliance: 'not-machine-verified', absenceOfBoundaryProofIsProcessDefect: false,
  materialProcessDefectRule: 'requires a contradiction in supplied sealed and machine-validated evidence',
  perfectAgreementRule: 'auditable non-material observation allowed for a deliberately clear synthetic fixture',
});
export const AUDIT_ACCEPTANCE_POLICY = Object.freeze({
  requiredAssessment: 'PASS', materialProcessDefectFlagCount: 0, qualifiedPassAccepted: false, ritsuApprovalStillRequired: true,
});

const profiles = Object.freeze([
  Object.freeze({ stage: 'Luna', modelAlias: 'gpt-5.6-luna', reasoning: 'medium', batchLimit: 32 }),
  Object.freeze({ stage: 'Terra', modelAlias: 'gpt-5.6-terra', reasoning: 'high', batchLimit: 16 }),
  Object.freeze({ stage: 'Sol', modelAlias: 'gpt-5.6-sol', reasoning: 'high', batchLimit: 8 }),
]);
const classes = ['correct', 'specific-wrong', 'vague-topical-wrong'];
const strata = ['category-1', 'category-2', 'category-3', 'category-4'];
const verdicts = ['CORRECT', 'WRONG', 'UNSURE'];
const rootKeys = ['aggregateTiming', 'aggregates', 'auditAcceptancePolicy', 'auditScope', 'batches', 'capabilityBoundary', 'cells', 'declarations', 'digestSemantics', 'executionKind', 'itemCount', 'judgmentTranscriptPrefixSha256', 'protocol', 'publicArtifacts', 'schema', 'selectionBasis', 'sourceKind'];
const batchKeys = ['stage', 'batchOrdinal', 'batchCount', 'itemCount', 'blindedItemsSha256', 'dispatchSha256', 'rawOutputSha256', 'transcriptDispatchEventSha256', 'transcriptOutputEventSha256', 'rawOutputRecordCount', 'routedVerdictCount', 'correctCount', 'wrongCount', 'unsureCount', 'invalidCount', 'missingCount', 'extraCount', 'duplicateCount', 'infrastructureFailureCount', 'retryCount', 'toolCallCount'];
const digestBatchKeys = ['blindedItemsSha256', 'dispatchSha256', 'rawOutputSha256', 'transcriptDispatchEventSha256', 'transcriptOutputEventSha256'];
const columnKeys = ['alignment', 'rowCount', 'sha256ColumnEncoding', ...batchKeys];
const mappingKeys = Object.keys(paths);
const digestPattern = /^sha256:[0-9a-f]{64}$/u;
const dispatchKeys = ['batchCount', 'batchOrdinal', 'blindedItemsSha256', 'dispatchByteLength', 'dispatchBytesBase64', 'dispatchSha256', 'event', 'exactBytesValidatedImmediatelyBeforeDispatch', 'fixtureSha256', 'instructionSha256', 'itemCount', 'modelAlias', 'promptSha256', 'reasoning', 'rendererSha256', 'stage', 'taskName'];
const outputKeys = ['batchOrdinal', 'duplicateCount', 'event', 'extraCount', 'infrastructureFailureCount', 'invalidCount', 'missingCount', 'modelAlias', 'observableUsage', 'rawOutputBase64', 'rawOutputByteLength', 'rawOutputRecordCount', 'rawOutputSha256', 'reasoning', 'retryCount', 'routedVerdictCount', 'stage', 'taskName', 'toolCallCount', 'validCompactOutput', 'verdictCounts'];
const runKeys = ['coordinator', 'event', 'exactPublicMain', 'judgmentProfiles', 'processAudit', 'protocol', 'publicRepository', 'realScreeningOccurred', 'reuseOccurred', 'sourceKind'];
const preflightKeys = ['cleanCheckoutVerified', 'compactByteLimit', 'compactCapacityByteLength', 'compactFixtureByteLength', 'documentedValidatorsPassed', 'event', 'manifestFilesValidated', 'sourceDigests', 'sourceRevisionVerified', 'testCount', 'testFailCount', 'testPassCount'];
const columnAlignment = 'named columns share zero-based batch index';
const digestEncoding = 'base64url-no-pad SHA-256 digests concatenated as fixed 43-character chunks by batch index';

function fail(path, detail) { throw new Error(`${path}: ${detail}`); }
function exactKeys(value, keys) { return value !== null && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join(',') === [...keys].sort().join(','); }
function exact(value, expected) { return canonical(value) === canonical(expected); }
function digest(value) { return typeof value === 'string' && digestPattern.test(value); }
function exactBytes(a, b) { return Buffer.from(a).equals(Buffer.from(b)); }
function sum(rows, key) { return rows.reduce((total, row) => total + row[key], 0); }
function requiredIdentity(key) {
  const value = APPROVED_PROMPTED_SCREENING_V5_SHA256[key];
  if (!digest(value)) fail('approvedIdentities', `missing literal ${key}`);
  return value;
}
function assertCanonicalJson(bytes, value, { lf = true } = {}) {
  const expected = `${canonical(value)}${lf ? '\n' : ''}`;
  if (Buffer.from(bytes).toString('utf8') !== expected) fail('sourceBytes', 'must use exact canonical JSON bytes');
}
function decodeBase64Exact(value, path) {
  if (typeof value !== 'string' || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(value)) fail(path, 'must be canonical padded base64');
  const bytes = Buffer.from(value, 'base64');
  if (bytes.toString('base64') !== value) fail(path, 'must decode and re-encode byte-identically');
  return bytes;
}
function decodeDigestChunk(value, path) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{43}$/u.test(value)) fail(path, 'must be a 43-character base64url digest');
  const bytes = Buffer.from(value, 'base64url');
  if (bytes.length !== 32 || bytes.toString('base64url') !== value) fail(path, 'must decode and re-encode byte-identically');
  return `sha256:${bytes.toString('hex')}`;
}

export function loadApprovedSyntheticAuditEvidenceV2() {
  return Object.fromEntries(mappingKeys.map((key) => [key, readFileSync(paths[key])]));
}

export function validateSyntheticAuditEvidenceSourcesV2(evidence) {
  if (!exactKeys(evidence, mappingKeys)) fail('evidence', 'must supply every exact source artifact and the sealed prefix');
  const identities = {
    coordinatorPromptBytes: requiredIdentity('coordinatorPromptV5'),
    screeningProcedureBytes: requiredIdentity('coordinatorPromptV5'),
    compactSchemaBytes: requiredIdentity('compactAuditSchemaV2'),
    compactRendererBytes: requiredIdentity('compactAuditRendererV2'),
    processAuditInstructionBytes: requiredIdentity('processAuditInstructionV1'),
    processAuditOutputSchemaBytes: requiredIdentity('processAuditOutputSchemaV1'),
    judgmentProcedureBytes: APPROVED_PROMPTED_SCREENING_V3_SHA256.coordinatorPromptV3,
    judgmentInstructionBytes: APPROVED_PROMPTED_SCREENING_V3_SHA256.judgmentInstructionV1,
    screeningPoolOrFixtureBytes: APPROVED_PROMPTED_SCREENING_V3_SHA256.syntheticFixtureV2,
    opaqueIdentityMappingBytes: requiredIdentity('syntheticIdentityMapping'),
    dispatchOrderBytes: requiredIdentity('syntheticDispatchOrder'),
    judgmentRendererBytes: APPROVED_PROMPTED_SCREENING_V3_SHA256.rendererV3,
    transcriptPrefixBytes: requiredIdentity('syntheticJudgmentPrefixV5Source'),
  };
  for (const key of mappingKeys) {
    if (!Buffer.isBuffer(evidence[key]) || sha256(evidence[key]) !== identities[key]) fail(`evidence.${key}`, `must match literal approved ${identities[key]}`);
  }
  const fixtureText = evidence.screeningPoolOrFixtureBytes.toString('utf8');
  const fixture = validateSyntheticPilotV2Structure(JSON.parse(fixtureText), fixtureText);
  const identityMap = JSON.parse(evidence.opaqueIdentityMappingBytes.toString('utf8'));
  const order = JSON.parse(evidence.dispatchOrderBytes.toString('utf8'));
  assertCanonicalJson(evidence.opaqueIdentityMappingBytes, identityMap, { lf: false });
  assertCanonicalJson(evidence.dispatchOrderBytes, order, { lf: false });
  const expectedMap = fixture.cases.map((row) => [row.pilotCaseId, row.judgmentItemId]);
  if (!exact(identityMap, expectedMap) || !exact(order, fixture.dispatchOrder)) fail('evidence.mapping', 'must exactly join the fixture outer identities and dispatch order');
  return fixture;
}

export function encodeBatchColumns(rows) {
  const result = { alignment: columnAlignment, rowCount: rows.length, sha256ColumnEncoding: digestEncoding };
  for (const key of batchKeys) {
    result[key] = digestBatchKeys.includes(key)
      ? rows.map((row) => Buffer.from(row[key].slice(7), 'hex').toString('base64url')).join('')
      : rows.map((row) => structuredClone(row[key]));
  }
  return result;
}

export function decodeBatchColumns(value) {
  if (!exactKeys(value, columnKeys) || value.alignment !== columnAlignment || value.sha256ColumnEncoding !== digestEncoding || !Number.isInteger(value.rowCount) || value.rowCount < 3 || value.rowCount > 146) fail('input.batches', 'must be the exact closed self-describing keyed columns');
  for (const key of batchKeys.filter((key) => !digestBatchKeys.includes(key))) if (!Array.isArray(value[key]) || value[key].length !== value.rowCount) fail(`input.batches.${key}`, 'must align exactly with rowCount');
  for (const key of digestBatchKeys) if (typeof value[key] !== 'string' || value[key].length !== value.rowCount * 43) fail(`input.batches.${key}`, 'must contain exactly one canonical digest chunk per row');
  return Array.from({ length: value.rowCount }, (_, index) => Object.fromEntries(batchKeys.map((key) => [key, digestBatchKeys.includes(key) ? decodeDigestChunk(value[key].slice(index * 43, (index + 1) * 43), `input.batches.${key}[${index}]`) : structuredClone(value[key][index])])));
}

function expectedDispatches(evidence) {
  const source = { promptBytes: evidence.judgmentProcedureBytes, instructionBytes: evidence.judgmentInstructionBytes, fixtureBytes: evidence.screeningPoolOrFixtureBytes, rendererBytes: evidence.judgmentRendererBytes };
  return profiles.flatMap(({ stage }) => {
    const plan = createSyntheticPilotV2StagePlan(stage, source);
    return renderStageDispatchesV3(plan, source).map((dispatch) => ({ plan, dispatch }));
  });
}

function parseRawOutput(bytes, expectedIds) {
  let rows;
  try { rows = JSON.parse(bytes.toString('utf8')); } catch { rows = null; }
  const canonicalOutput = Array.isArray(rows) && bytes.toString('utf8') === `${canonical(rows)}\n`;
  const safeRows = Array.isArray(rows) ? rows : [];
  const ids = safeRows.map((row) => row?.itemId).filter((id) => typeof id === 'string');
  const duplicateCount = ids.length - new Set(ids).size;
  const extraCount = safeRows.filter((row) => !expectedIds.includes(row?.itemId)).length + Math.max(0, safeRows.length - expectedIds.length);
  const missingCount = expectedIds.filter((id) => !ids.includes(id)).length;
  const exactRows = canonicalOutput && safeRows.length === expectedIds.length && safeRows.every((row, index) => exactKeys(row, ['itemId', 'verdict']) && row.itemId === expectedIds[index] && verdicts.includes(row.verdict));
  const invalidCount = exactRows ? 0 : Math.max(1, safeRows.filter((row, index) => !exactKeys(row, ['itemId', 'verdict']) || row.itemId !== expectedIds[index] || !verdicts.includes(row.verdict)).length);
  const routed = expectedIds.map((id, index) => exactRows && safeRows[index].itemId === id ? safeRows[index].verdict : 'UNSURE');
  return { rawOutputRecordCount: safeRows.length, routed, correctCount: routed.filter((v) => v === 'CORRECT').length, wrongCount: routed.filter((v) => v === 'WRONG').length, unsureCount: routed.filter((v) => v === 'UNSURE').length, invalidCount, missingCount, extraCount, duplicateCount };
}

function parsePrefix(evidence, fixture) {
  const bytes = evidence.transcriptPrefixBytes;
  const text = bytes.toString('utf8');
  if (!text.endsWith('\n') || text.includes('\r')) fail('evidence.transcriptPrefixBytes', 'must be LF-terminated JSONL');
  const lines = text.slice(0, -1).split('\n');
  if (lines.length !== 14) fail('evidence.transcriptPrefixBytes', 'must contain the exact closed fourteen-event prefix');
  const records = lines.map((line, index) => {
    let record;
    try { record = JSON.parse(line); } catch { fail(`evidence.transcriptPrefixBytes[${index}]`, 'must be JSON'); }
    if (JSON.stringify(record) !== line) fail(`evidence.transcriptPrefixBytes[${index}]`, 'must preserve exact compact JSON serialization');
    return record;
  });
  const run = records[0];
  const preflight = records[1];
  if (!exactKeys(run, runKeys) || run.event !== 'run-declaration' || run.sourceKind !== 'synthetic-pilot' || run.publicRepository !== 'https://github.com/colophon-claims/locomo-judge-report' || run.realScreeningOccurred !== false || run.reuseOccurred !== false) fail('evidence.transcriptPrefixBytes[0]', 'has an invalid closed run declaration');
  if (!exactKeys(preflight, preflightKeys) || preflight.event !== 'preflight' || !exactKeys(preflight.sourceDigests, ['compactJointFixture', 'compactRendererJoint', 'compactSchemaJoint', 'coordinatorPromptV4', 'judgmentInstructionV1', 'judgmentRendererV3', 'syntheticFixtureV2'])) fail('evidence.transcriptPrefixBytes[1]', 'has an invalid closed preflight event');
  const expected = expectedDispatches(evidence);
  const taskNames = new Set();
  return expected.map(({ dispatch: expectedDispatch }, index) => {
    const dispatch = records[2 + index * 2];
    const output = records[3 + index * 2];
    if (!exactKeys(dispatch, dispatchKeys) || !exactKeys(output, outputKeys) || dispatch.event !== 'judgment-dispatch' || output.event !== 'judgment-output') fail(`evidence.transcriptPrefixBytes.batch[${index}]`, 'has an invalid closed dispatch/output event pair');
    const dispatchBytes = decodeBase64Exact(dispatch.dispatchBytesBase64, `batch[${index}].dispatchBytesBase64`);
    const outputBytes = decodeBase64Exact(output.rawOutputBase64, `batch[${index}].rawOutputBase64`);
    const profile = profiles.find((candidate) => candidate.stage === expectedDispatch.stage);
    if (taskNames.has(dispatch.taskName) || dispatch.taskName !== output.taskName || dispatch.stage !== expectedDispatch.stage || output.stage !== expectedDispatch.stage || dispatch.modelAlias !== profile.modelAlias || output.modelAlias !== profile.modelAlias || dispatch.reasoning !== profile.reasoning || output.reasoning !== profile.reasoning || dispatch.batchOrdinal !== expectedDispatch.batchOrdinal || output.batchOrdinal !== expectedDispatch.batchOrdinal || dispatch.batchCount !== expectedDispatch.batchCount || dispatch.itemCount !== expectedDispatch.itemIds.length || dispatch.promptSha256 !== APPROVED_PROMPTED_SCREENING_V3_SHA256.coordinatorPromptV3 || dispatch.instructionSha256 !== APPROVED_PROMPTED_SCREENING_V3_SHA256.judgmentInstructionV1 || dispatch.fixtureSha256 !== APPROVED_PROMPTED_SCREENING_V3_SHA256.syntheticFixtureV2 || dispatch.rendererSha256 !== APPROVED_PROMPTED_SCREENING_V3_SHA256.rendererV3 || !exactBytes(dispatchBytes, expectedDispatch.bytes) || dispatch.dispatchByteLength !== dispatchBytes.length || dispatch.dispatchSha256 !== sha256(dispatchBytes) || dispatch.blindedItemsSha256 !== expectedDispatch.blindedItemsSha256 || output.rawOutputByteLength !== outputBytes.length || output.rawOutputSha256 !== sha256(outputBytes)) fail(`evidence.transcriptPrefixBytes.batch[${index}]`, 'does not derive from the exact source artifacts, task declaration, or bytes');
    taskNames.add(dispatch.taskName);
    const parsed = parseRawOutput(outputBytes, expectedDispatch.itemIds);
    return { stage: expectedDispatch.stage, batchOrdinal: expectedDispatch.batchOrdinal, batchCount: expectedDispatch.batchCount, itemCount: expectedDispatch.itemIds.length, itemIds: expectedDispatch.itemIds, blindedItemsSha256: expectedDispatch.blindedItemsSha256, dispatchSha256: expectedDispatch.dispatchSha256, rawOutputSha256: sha256(outputBytes), transcriptDispatchEventSha256: sha256(Buffer.from(`${lines[2 + index * 2]}\n`)), transcriptOutputEventSha256: sha256(Buffer.from(`${lines[3 + index * 2]}\n`)), ...parsed, routedVerdictCount: expectedDispatch.itemIds.length, infrastructureFailureCount: output.infrastructureFailureCount, retryCount: output.retryCount, toolCallCount: output.toolCallCount };
  });
}

function deriveCells(fixture, batches) {
  const byStage = new Map(profiles.map(({ stage }) => [stage, new Map()]));
  for (const batch of batches) batch.itemIds.forEach((id, index) => byStage.get(batch.stage).set(id, batch.routed[index]));
  const byId = new Map(fixture.cases.map((row) => [row.judgmentItemId, row]));
  return classes.flatMap((candidateClass) => strata.map((stratum) => {
    const ids = fixture.dispatchOrder.filter((id) => { const row = byId.get(id); return row.candidateClass === candidateClass && row.stratum === stratum; });
    const jointVerdictCounts = Array(27).fill(0);
    const counts = { Luna: [0, 0, 0], Terra: [0, 0, 0], Sol: [0, 0, 0] };
    let threeStageAgreementCount = 0;
    for (const id of ids) {
      const indices = profiles.map(({ stage }) => verdicts.indexOf(byStage.get(stage).get(id)));
      jointVerdictCounts[(indices[0] * 9) + (indices[1] * 3) + indices[2]] += 1;
      profiles.forEach(({ stage }, index) => { counts[stage][indices[index]] += 1; });
      if (indices[0] === indices[1] && indices[1] === indices[2]) threeStageAgreementCount += 1;
    }
    const shape = ([correctCount, wrongCount, unsureCount]) => ({ correctCount, wrongCount, unsureCount });
    return { candidateClass, stratum, itemCount: ids.length, jointVerdictCounts, luna: shape(counts.Luna), terra: shape(counts.Terra), sol: shape(counts.Sol), threeStageAgreementCount, anyDisagreementCount: ids.length - threeStageAgreementCount, invalidCount: 0 };
  }));
}

function deriveAgreements(cells) {
  const result = { threeStageAgreementCount: 0, anyDisagreementCount: 0, lunaTerraDisagreementCount: 0, lunaSolDisagreementCount: 0, terraSolDisagreementCount: 0, lunaOnlyDisagreesCount: 0, terraOnlyDisagreesCount: 0, solOnlyDisagreesCount: 0, allDifferentCount: 0 };
  for (const cell of cells) for (let l = 0; l < 3; l += 1) for (let t = 0; t < 3; t += 1) for (let s = 0; s < 3; s += 1) {
    const count = cell.jointVerdictCounts[l * 9 + t * 3 + s];
    if (l === t && t === s) result.threeStageAgreementCount += count;
    else { result.anyDisagreementCount += count; if (t === s) result.lunaOnlyDisagreesCount += count; else if (l === s) result.terraOnlyDisagreesCount += count; else if (l === t) result.solOnlyDisagreesCount += count; else result.allDifferentCount += count; }
    if (l !== t) result.lunaTerraDisagreementCount += count;
    if (l !== s) result.lunaSolDisagreementCount += count;
    if (t !== s) result.terraSolDisagreementCount += count;
  }
  return result;
}

function toLegacy(value) {
  return {
    schema: 'https://colophon-claims.github.io/locomo-judge-report/compact-process-audit-input/v1', protocol: 'prompted-codex-screening-compact-process-audit/v1', sourceKind: value.sourceKind,
    publicArtifacts: Object.fromEntries(Object.entries(value.publicArtifacts).filter(([key]) => !['compactSchemaSha256', 'compactRendererSha256', 'judgmentProcedureSha256', 'processAuditInstructionSha256', 'processAuditOutputSchemaSha256'].includes(key))),
    declarations: value.declarations,
    auditScope: { ...value.auditScope, rawIntegrityBasis: 'machine-validation-flags-and-digests' }, itemCount: value.itemCount,
    judgmentTranscriptPrefixSha256: value.judgmentTranscriptPrefixSha256,
    batches: decodeBatchColumns(value.batches).map((b) => [b.stage, b.batchOrdinal, b.batchCount, b.itemCount, b.blindedItemsSha256, b.dispatchSha256, b.rawOutputSha256, b.rawOutputRecordCount, b.routedVerdictCount, b.correctCount, b.wrongCount, b.unsureCount, b.invalidCount, b.missingCount, b.extraCount, b.duplicateCount, b.infrastructureFailureCount, b.retryCount, b.toolCallCount, true, true, true, []]),
    aggregates: value.aggregates, cells: value.cells, aggregateTiming: value.aggregateTiming,
  };
}

export function deriveCompactProcessAuditInputV2(evidence = loadApprovedSyntheticAuditEvidenceV2()) {
  const fixture = validateSyntheticAuditEvidenceSourcesV2(evidence);
  const rows = parsePrefix(evidence, fixture);
  const cells = deriveCells(fixture, rows);
  const publicArtifacts = {
    repository: 'https://github.com/colophon-claims/locomo-judge-report', sourceRevision: APPROVED_PROMPTED_SCREENING_V5_SHA256.sourceRevision,
    coordinatorPromptSha256: sha256(evidence.coordinatorPromptBytes), judgmentInstructionSha256: sha256(evidence.judgmentInstructionBytes), screeningProcedureSha256: sha256(evidence.screeningProcedureBytes), screeningPoolOrFixtureSha256: sha256(evidence.screeningPoolOrFixtureBytes), opaqueIdentityMappingSha256: sha256(evidence.opaqueIdentityMappingBytes), dispatchOrderSha256: sha256(evidence.dispatchOrderBytes), samplingCommitmentSha256: null, samplingScriptSha256: null, rendererSha256: sha256(evidence.judgmentRendererBytes), judgmentProcedureSha256: sha256(evidence.judgmentProcedureBytes), compactSchemaSha256: sha256(evidence.compactSchemaBytes), compactRendererSha256: sha256(evidence.compactRendererBytes), processAuditInstructionSha256: sha256(evidence.processAuditInstructionBytes), processAuditOutputSchemaSha256: sha256(evidence.processAuditOutputSchemaBytes),
  };
  const value = {
    schema: COMPACT_PROCESS_AUDIT_SCHEMA_V2, protocol: COMPACT_PROCESS_AUDIT_PROTOCOL_V2, sourceKind: 'synthetic-pilot', executionKind: 'validation-only-no-model-run', publicArtifacts,
    declarations: { coordinator: { modelAlias: 'gpt-5.6-sol', reasoning: 'high' }, judgmentStages: profiles.map((p) => ({ ...p, batchCount: Math.ceil(24 / p.batchLimit) })), processAudit: { modelAlias: 'gpt-5.6-sol', reasoning: 'high', toolPolicy: 'none' } },
    auditScope: { inputBoundary: 'canonical-summary-only', mayInspect: ['coverage', 'declaration-drift', 'suspicious-agreement', 'cross-stage-asymmetry', 'process-defects'], mustNot: 'reperform-item-judgments', publicVerificationBoundary: 'later-verifier-resolves-and-hashes-published-artifacts', rawIntegrityBasis: 'derived-from-exact-authenticated-source-and-prefix-bytes' },
    itemCount: 24, judgmentTranscriptPrefixSha256: sha256(evidence.transcriptPrefixBytes), batches: encodeBatchColumns(rows.map(({ itemIds, routed, ...row }) => row)),
    aggregates: { judgmentCount: 72, verdicts: profiles.map(({ stage }) => { const stageRows = rows.filter((row) => row.stage === stage); return { stage, correctCount: sum(stageRows, 'correctCount'), wrongCount: sum(stageRows, 'wrongCount'), unsureCount: sum(stageRows, 'unsureCount') }; }), invalidCount: sum(rows, 'invalidCount'), missingCount: sum(rows, 'missingCount'), extraCount: sum(rows, 'extraCount'), duplicateCount: sum(rows, 'duplicateCount'), infrastructureFailureCount: sum(rows, 'infrastructureFailureCount'), retryCount: sum(rows, 'retryCount'), judgmentAgentToolCallCount: sum(rows, 'toolCallCount'), agreements: deriveAgreements(cells) },
    cells, aggregateTiming: 'after-all-judgment-outputs-before-process-audit', selectionBasis: structuredClone(SYNTHETIC_SELECTION_BASIS), digestSemantics: structuredClone(DIGEST_SEMANTICS), capabilityBoundary: structuredClone(CAPABILITY_BOUNDARY), auditAcceptancePolicy: structuredClone(AUDIT_ACCEPTANCE_POLICY),
  };
  validateCompactProcessAuditInputV2(value, evidence);
  return value;
}

export function validateCompactProcessAuditInputV2(value, evidence) {
  if (evidence === undefined) fail('evidence', 'exact authenticated sources and sealed transcript prefix are required');
  if (!exactKeys(value, rootKeys) || value.schema !== COMPACT_PROCESS_AUDIT_SCHEMA_V2 || value.protocol !== COMPACT_PROCESS_AUDIT_PROTOCOL_V2 || value.sourceKind !== 'synthetic-pilot' || value.executionKind !== 'validation-only-no-model-run') fail('input', 'has an invalid closed version 2 root or execution kind');
  if (!exact(value.selectionBasis, SYNTHETIC_SELECTION_BASIS) || !exact(value.digestSemantics, DIGEST_SEMANTICS) || !exact(value.capabilityBoundary, CAPABILITY_BOUNDARY) || !exact(value.auditAcceptancePolicy, AUDIT_ACCEPTANCE_POLICY)) fail('input', 'drifts from exact selection, digest, capability, or acceptance semantics');
  const expected = deriveWithoutRecursion(evidence);
  if (!exact(value, expected)) fail('input', 'does not derive byte-for-byte from exact authenticated source artifacts and sealed transcript events');
  validateCompactProcessAuditInput(toLegacy(value));
  return true;
}

function deriveWithoutRecursion(evidence) {
  const fixture = validateSyntheticAuditEvidenceSourcesV2(evidence);
  const rows = parsePrefix(evidence, fixture);
  const cells = deriveCells(fixture, rows);
  const agreements = deriveAgreements(cells);
  const publicArtifacts = { repository: 'https://github.com/colophon-claims/locomo-judge-report', sourceRevision: APPROVED_PROMPTED_SCREENING_V5_SHA256.sourceRevision, coordinatorPromptSha256: sha256(evidence.coordinatorPromptBytes), judgmentInstructionSha256: sha256(evidence.judgmentInstructionBytes), screeningProcedureSha256: sha256(evidence.screeningProcedureBytes), screeningPoolOrFixtureSha256: sha256(evidence.screeningPoolOrFixtureBytes), opaqueIdentityMappingSha256: sha256(evidence.opaqueIdentityMappingBytes), dispatchOrderSha256: sha256(evidence.dispatchOrderBytes), samplingCommitmentSha256: null, samplingScriptSha256: null, rendererSha256: sha256(evidence.judgmentRendererBytes), judgmentProcedureSha256: sha256(evidence.judgmentProcedureBytes), compactSchemaSha256: sha256(evidence.compactSchemaBytes), compactRendererSha256: sha256(evidence.compactRendererBytes), processAuditInstructionSha256: sha256(evidence.processAuditInstructionBytes), processAuditOutputSchemaSha256: sha256(evidence.processAuditOutputSchemaBytes) };
  return { schema: COMPACT_PROCESS_AUDIT_SCHEMA_V2, protocol: COMPACT_PROCESS_AUDIT_PROTOCOL_V2, sourceKind: 'synthetic-pilot', executionKind: 'validation-only-no-model-run', publicArtifacts, declarations: { coordinator: { modelAlias: 'gpt-5.6-sol', reasoning: 'high' }, judgmentStages: profiles.map((p) => ({ ...p, batchCount: Math.ceil(24 / p.batchLimit) })), processAudit: { modelAlias: 'gpt-5.6-sol', reasoning: 'high', toolPolicy: 'none' } }, auditScope: { inputBoundary: 'canonical-summary-only', mayInspect: ['coverage', 'declaration-drift', 'suspicious-agreement', 'cross-stage-asymmetry', 'process-defects'], mustNot: 'reperform-item-judgments', publicVerificationBoundary: 'later-verifier-resolves-and-hashes-published-artifacts', rawIntegrityBasis: 'derived-from-exact-authenticated-source-and-prefix-bytes' }, itemCount: 24, judgmentTranscriptPrefixSha256: sha256(evidence.transcriptPrefixBytes), batches: encodeBatchColumns(rows.map(({ itemIds, routed, ...row }) => row)), aggregates: { judgmentCount: 72, verdicts: profiles.map(({ stage }) => { const stageRows = rows.filter((row) => row.stage === stage); return { stage, correctCount: sum(stageRows, 'correctCount'), wrongCount: sum(stageRows, 'wrongCount'), unsureCount: sum(stageRows, 'unsureCount') }; }), invalidCount: sum(rows, 'invalidCount'), missingCount: sum(rows, 'missingCount'), extraCount: sum(rows, 'extraCount'), duplicateCount: sum(rows, 'duplicateCount'), infrastructureFailureCount: sum(rows, 'infrastructureFailureCount'), retryCount: sum(rows, 'retryCount'), judgmentAgentToolCallCount: sum(rows, 'toolCallCount'), agreements }, cells, aggregateTiming: 'after-all-judgment-outputs-before-process-audit', selectionBasis: structuredClone(SYNTHETIC_SELECTION_BASIS), digestSemantics: structuredClone(DIGEST_SEMANTICS), capabilityBoundary: structuredClone(CAPABILITY_BOUNDARY), auditAcceptancePolicy: structuredClone(AUDIT_ACCEPTANCE_POLICY) };
}

export function renderCompactProcessAuditInputV2(evidence = loadApprovedSyntheticAuditEvidenceV2()) {
  const value = deriveCompactProcessAuditInputV2(evidence);
  const bytes = Buffer.from(`${canonical(value)}\n`);
  if (bytes.length > MAX_COMPACT_PROCESS_AUDIT_BYTES) fail('input', `canonical bytes exceed ${MAX_COMPACT_PROCESS_AUDIT_BYTES}`);
  return bytes;
}

export function validateRenderedCompactProcessAuditInputV2(candidateBytes, evidence = loadApprovedSyntheticAuditEvidenceV2()) {
  const expected = renderCompactProcessAuditInputV2(evidence);
  if (!exactBytes(candidateBytes, expected)) fail('candidateBytes', 'must equal the exact evidence-derived canonical bytes without prefix or suffix');
  return true;
}

export function measureRealScreeningCapacityV2(itemCount = 664) {
  const legacy = buildSyntheticCapacityProbe(itemCount);
  legacy.sourceKind = 'real-screening';
  legacy.publicArtifacts.samplingCommitmentSha256 = sha256(Buffer.from('measurement-only:commitment'));
  legacy.publicArtifacts.samplingScriptSha256 = sha256(Buffer.from('measurement-only:script'));
  const rows = legacy.batches.map((row, index) => ({ stage: row[0], batchOrdinal: row[1], batchCount: row[2], itemCount: row[3], blindedItemsSha256: row[4], dispatchSha256: row[5], rawOutputSha256: row[6], transcriptDispatchEventSha256: sha256(Buffer.from(`measurement-only:${index}:dispatch-event`)), transcriptOutputEventSha256: sha256(Buffer.from(`measurement-only:${index}:output-event`)), rawOutputRecordCount: row[7], routedVerdictCount: row[8], correctCount: row[9], wrongCount: row[10], unsureCount: row[11], invalidCount: row[12], missingCount: row[13], extraCount: row[14], duplicateCount: row[15], infrastructureFailureCount: row[16], retryCount: row[17], toolCallCount: row[18] }));
  const shape = { measurementKind: CAPACITY_MEASUREMENT_KIND, itemCount, batchCount: rows.length, batchColumns: encodeBatchColumns(rows), cells: legacy.cells };
  const byteLength = Buffer.byteLength(`${canonical(shape)}\n`);
  return Object.freeze({ measurementKind: CAPACITY_MEASUREMENT_KIND, itemCount, batchCount: rows.length, byteLength, maximumByteLength: MAX_COMPACT_PROCESS_AUDIT_BYTES, headroomByteLength: MAX_COMPACT_PROCESS_AUDIT_BYTES - byteLength, canValidateAsAuditInput: false });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const bytes = renderCompactProcessAuditInputV2();
  const capacity = measureRealScreeningCapacityV2();
  console.log(`validated exact evidence-derived compact audit input ${bytes.length}/${MAX_COMPACT_PROCESS_AUDIT_BYTES}; measurement-only 664/${capacity.batchCount} ${capacity.byteLength} bytes`);
}
