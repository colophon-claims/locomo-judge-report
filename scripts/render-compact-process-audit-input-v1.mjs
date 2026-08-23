import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { APPROVED_PROMPTED_SCREENING_V4_SHA256 } from './approved-prompted-screening-v4-identities.mjs';

const promptPath = new URL('../CODEX-SCREENING-PROMPT.v4.md', import.meta.url);
const schemaPath = new URL('../schemas/compact-process-audit-input.v1.schema.json', import.meta.url);
const rendererPath = new URL('./render-compact-process-audit-input-v1.mjs', import.meta.url);
const fixturePath = new URL('../fixtures/prompted-screening-pilot-v4-joint-compact-audit.json', import.meta.url);

export const COMPACT_PROCESS_AUDIT_PROTOCOL = 'prompted-codex-screening-compact-process-audit/v1';
export const MAX_COMPACT_PROCESS_AUDIT_BYTES = 65_536;

const schemaId = 'https://colophon-claims.github.io/locomo-judge-report/compact-process-audit-input/v1';
const stageProfiles = Object.freeze([
  Object.freeze({ stage: 'Luna', modelAlias: 'gpt-5.6-luna', reasoning: 'medium', batchLimit: 32 }),
  Object.freeze({ stage: 'Terra', modelAlias: 'gpt-5.6-terra', reasoning: 'high', batchLimit: 16 }),
  Object.freeze({ stage: 'Sol', modelAlias: 'gpt-5.6-sol', reasoning: 'high', batchLimit: 8 }),
]);
const classes = ['correct', 'specific-wrong', 'vague-topical-wrong'];
const strata = ['category-1', 'category-2', 'category-3', 'category-4'];
const rootKeys = ['aggregateTiming', 'aggregates', 'auditScope', 'batches', 'cells', 'declarations', 'itemCount', 'judgmentTranscriptPrefixSha256', 'protocol', 'publicArtifacts', 'schema', 'sourceKind'];
const publicArtifactKeys = ['coordinatorPromptSha256', 'dispatchOrderSha256', 'judgmentInstructionSha256', 'opaqueIdentityMappingSha256', 'rendererSha256', 'repository', 'samplingCommitmentSha256', 'samplingScriptSha256', 'screeningPoolOrFixtureSha256', 'screeningProcedureSha256', 'sourceRevision'];
const declarationKeys = ['coordinator', 'judgmentStages', 'processAudit'];
const agentKeys = ['modelAlias', 'reasoning'];
const auditAgentKeys = ['modelAlias', 'reasoning', 'toolPolicy'];
const stageKeys = ['batchCount', 'batchLimit', 'modelAlias', 'reasoning', 'stage'];
const auditScopeKeys = ['inputBoundary', 'mayInspect', 'mustNot', 'publicVerificationBoundary', 'rawIntegrityBasis'];
const aggregateKeys = ['agreements', 'duplicateCount', 'extraCount', 'infrastructureFailureCount', 'invalidCount', 'judgmentAgentToolCallCount', 'judgmentCount', 'missingCount', 'retryCount', 'verdicts'];
const stageVerdictKeys = ['correctCount', 'stage', 'unsureCount', 'wrongCount'];
const agreementKeys = ['allDifferentCount', 'anyDisagreementCount', 'lunaOnlyDisagreesCount', 'lunaSolDisagreementCount', 'lunaTerraDisagreementCount', 'solOnlyDisagreesCount', 'terraOnlyDisagreesCount', 'terraSolDisagreementCount', 'threeStageAgreementCount'];
const cellKeys = ['anyDisagreementCount', 'candidateClass', 'invalidCount', 'itemCount', 'jointVerdictCounts', 'luna', 'sol', 'stratum', 'terra', 'threeStageAgreementCount'];
const verdictKeys = ['correctCount', 'unsureCount', 'wrongCount'];
const jointVerdictKeys = ['correctCount', 'wrongCount', 'unsureCount'];
const fixtureRootKeys = ['compactAuditInput', 'expectedExecution', 'schema', 'status'];
const expectedExecutionKeys = ['auditDeclaration', 'inputByteLimit', 'measuredV3Baseline', 'modelRunOccurred', 'renderedInputByteLength', 'renderedInputSha256', 'usage'];
const usageKeys = ['cachedInputTokens', 'inputTokens', 'outputTokens', 'reasoningOutputTokens', 'status', 'totalTokens'];
const v3BaselineKeys = ['auditObservableInputTokens', 'auditObservableTotalTokens', 'judgmentPrefixByteLength'];
const digestPattern = /^sha256:[0-9a-f]{64}$/u;
const localPathPatterns = [/\/Users\/[A-Za-z0-9._-]+\//u, /\/root\/[A-Za-z0-9._/-]+/u, /[A-Za-z]:\\Users\\/u];

const approvedPromptBytes = readFileSync(promptPath);
const approvedSchemaBytes = readFileSync(schemaPath);
const approvedRendererBytes = readFileSync(rendererPath);

function fail(path, detail) {
  throw new Error(`${path}: ${detail}`);
}

function hasExactKeys(value, keys) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).sort().join(',') === [...keys].sort().join(',');
}

export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function sha256(bytes) {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

function exactBytes(actual, expected) {
  return Buffer.from(actual).equals(Buffer.from(expected));
}

function integer(value, maximum = 1992) {
  return Number.isInteger(value) && value >= 0 && value <= maximum;
}

function digest(value) {
  return typeof value === 'string' && digestPattern.test(value);
}

function expectedBatchSizes(itemCount, limit) {
  const sizes = [];
  for (let remaining = itemCount; remaining > 0; remaining -= limit) sizes.push(Math.min(limit, remaining));
  return sizes;
}

function sum(rows, key) {
  return rows.reduce((total, row) => total + row[key], 0);
}

function assertNoForbiddenMaterial(value) {
  const text = canonical(value);
  const forbiddenFragments = [
    '"candidateAnswer"', '"dispatchBytes"', '"instructionBytes"', '"intendedLabel"',
    '"itemId"', '"itemIds"', '"items"', '"outerId"', '"outputBytes"',
    '"pilotCaseId"', '"priorJudgment"', '"promptBytes"', '"question"',
    '"rawOutputBase64"', '"referenceAnswer"', '"sessionId"', '"slotId"',
    '"sourceQuestionId"', '"taskId"', '"transcriptBytes"', '```',
  ];
  if (forbiddenFragments.some((fragment) => text.includes(fragment))) fail('input', 'contains raw material, an item-level field, or execution-local identity');
  if (localPathPatterns.some((pattern) => pattern.test(text))) fail('input', 'contains a local path');
  if (/(?:^|[^0-9a-f])[0-9a-f]{32}(?:[^0-9a-f]|$)/u.test(text)) fail('input', 'contains a possible opaque item identity');
}

export function validateV4SourceBytes({
  promptBytes = approvedPromptBytes,
  schemaBytes = approvedSchemaBytes,
  rendererBytes = approvedRendererBytes,
} = {}) {
  for (const [path, bytes, approved] of [
    ['promptBytes', promptBytes, APPROVED_PROMPTED_SCREENING_V4_SHA256.coordinatorPromptV4],
    ['schemaBytes', schemaBytes, APPROVED_PROMPTED_SCREENING_V4_SHA256.compactAuditSchemaV1JointRevision],
    ['rendererBytes', rendererBytes, APPROVED_PROMPTED_SCREENING_V4_SHA256.compactAuditRendererV1JointRevision],
  ]) {
    const text = Buffer.from(bytes).toString('utf8');
    if (!text.endsWith('\n') || text.includes('\r') || text.includes(String.fromCodePoint(0x2014))) fail(path, 'must be LF-terminated UTF-8 without em dash');
    if (sha256(bytes) !== approved) fail(path, `must match approved ${approved}`);
  }
  const schema = JSON.parse(Buffer.from(schemaBytes).toString('utf8'));
  if (schema.$id !== schemaId || schema['x-canonicalByteLimit'] !== MAX_COMPACT_PROCESS_AUDIT_BYTES || schema.additionalProperties !== false) fail('schemaBytes', 'does not declare the exact closed compact-audit contract and byte cap');
  return true;
}

function validatePublicArtifacts(value, sourceKind) {
  if (!hasExactKeys(value, publicArtifactKeys)
    || value.repository !== 'https://github.com/colophon-claims/locomo-judge-report'
    || !/^[0-9a-f]{40}$/u.test(value.sourceRevision)) fail('input.publicArtifacts', 'has an invalid closed public-reference shape');
  for (const key of publicArtifactKeys.filter((key) => key.endsWith('Sha256') && !key.startsWith('sampling'))) {
    if (!digest(value[key])) fail(`input.publicArtifacts.${key}`, 'must be an exact SHA-256 identity');
  }
  if (sourceKind === 'real-screening') {
    if (!digest(value.samplingCommitmentSha256) || !digest(value.samplingScriptSha256)) fail('input.publicArtifacts', 'real screening requires exact commitment and sampling-script identities');
  } else if (value.samplingCommitmentSha256 !== null || value.samplingScriptSha256 !== null) {
    fail('input.publicArtifacts', 'synthetic pilot must not manufacture commitment or sampling-script identities');
  }
}

function validateDeclarations(value, itemCount) {
  if (!hasExactKeys(value, declarationKeys)
    || !hasExactKeys(value.coordinator, agentKeys)
    || value.coordinator.modelAlias !== 'gpt-5.6-sol'
    || value.coordinator.reasoning !== 'high'
    || !hasExactKeys(value.processAudit, auditAgentKeys)
    || value.processAudit.modelAlias !== 'gpt-5.6-sol'
    || value.processAudit.reasoning !== 'high'
    || value.processAudit.toolPolicy !== 'none'
    || !Array.isArray(value.judgmentStages) || value.judgmentStages.length !== 3) fail('input.declarations', 'does not declare exact coordinator, tool-free audit, and judgment profiles');
  value.judgmentStages.forEach((stage, index) => {
    const expected = stageProfiles[index];
    if (!hasExactKeys(stage, stageKeys)
      || stage.stage !== expected.stage
      || stage.modelAlias !== expected.modelAlias
      || stage.reasoning !== expected.reasoning
      || stage.batchLimit !== expected.batchLimit
      || stage.batchCount !== Math.ceil(itemCount / expected.batchLimit)) fail(`input.declarations.judgmentStages[${index}]`, 'has a wrong stage, model, reasoning, limit, order, or batch count');
  });
}

function validateAuditScope(value) {
  const expected = {
    inputBoundary: 'canonical-summary-only',
    mayInspect: ['coverage', 'declaration-drift', 'suspicious-agreement', 'cross-stage-asymmetry', 'process-defects'],
    mustNot: 'reperform-item-judgments',
    rawIntegrityBasis: 'machine-validation-flags-and-digests',
    publicVerificationBoundary: 'later-verifier-resolves-and-hashes-published-artifacts',
  };
  if (!hasExactKeys(value, auditScopeKeys) || canonical(value) !== canonical(expected)) fail('input.auditScope', 'does not preserve the compact-audit authority and capability boundary');
}

function decodeBatch(row) {
  return {
    stage: row[0], batchOrdinal: row[1], batchCount: row[2], itemCount: row[3],
    blindedItemsSha256: row[4], dispatchSha256: row[5], rawOutputSha256: row[6],
    rawOutputRecordCount: row[7], routedVerdictCount: row[8], correctCount: row[9],
    wrongCount: row[10], unsureCount: row[11], invalidCount: row[12], missingCount: row[13],
    extraCount: row[14], duplicateCount: row[15], infrastructureFailureCount: row[16],
    retryCount: row[17], toolCallCount: row[18], dispatchDigestVerified: row[19],
    outputDigestVerified: row[20], summaryCountsVerified: row[21], machineValidationErrors: row[22],
  };
}

function encodeBatch(batch) {
  return [
    batch.stage, batch.batchOrdinal, batch.batchCount, batch.itemCount,
    batch.blindedItemsSha256, batch.dispatchSha256, batch.rawOutputSha256,
    batch.rawOutputRecordCount, batch.routedVerdictCount, batch.correctCount,
    batch.wrongCount, batch.unsureCount, batch.invalidCount, batch.missingCount,
    batch.extraCount, batch.duplicateCount, batch.infrastructureFailureCount,
    batch.retryCount, batch.toolCallCount, batch.dispatchDigestVerified,
    batch.outputDigestVerified, batch.summaryCountsVerified, batch.machineValidationErrors,
  ];
}

function validateBatch(row, expected, path) {
  if (!Array.isArray(row) || row.length !== 23) fail(path, 'must be the exact closed 23-field positional row');
  const batch = decodeBatch(row);
  if (batch.stage !== expected.stage
    || batch.batchOrdinal !== expected.batchOrdinal
    || batch.batchCount !== expected.batchCount
    || batch.itemCount !== expected.itemCount) fail(path, 'has a wrong stage, ordinal, count, or batch size');
  for (const key of ['blindedItemsSha256', 'dispatchSha256', 'rawOutputSha256']) if (!digest(batch[key])) fail(`${path}.${key}`, 'must be a SHA-256 identity');
  for (const key of ['batchCount', 'batchOrdinal', 'itemCount', 'rawOutputRecordCount', 'routedVerdictCount', 'correctCount', 'wrongCount', 'unsureCount', 'invalidCount', 'missingCount', 'extraCount', 'duplicateCount', 'infrastructureFailureCount', 'retryCount', 'toolCallCount']) if (!integer(batch[key], 664)) fail(`${path}.${key}`, 'must be a bounded nonnegative integer');
  if (batch.routedVerdictCount !== batch.itemCount
    || batch.correctCount + batch.wrongCount + batch.unsureCount !== batch.itemCount
    || batch.rawOutputRecordCount !== batch.itemCount - batch.missingCount + batch.extraCount
    || batch.duplicateCount > batch.extraCount
    || batch.invalidCount > batch.itemCount
    || batch.invalidCount > batch.itemCount - batch.missingCount
    || batch.infrastructureFailureCount > 1
    || batch.retryCount > 1
    || batch.retryCount > batch.infrastructureFailureCount) fail(path, 'has inconsistent output, verdict, invalid, failure, retry, or duplicate counts');
  const requiredUnsureCount = Math.max(
    batch.invalidCount + batch.missingCount,
    batch.extraCount > 0 || batch.duplicateCount > 0 ? 1 : 0,
  );
  if (batch.unsureCount < requiredUnsureCount) fail(path, 'does not route invalid, missing, extra, or duplicate output conditions to compatible UNSURE totals');
  if (batch.dispatchDigestVerified !== true
    || batch.outputDigestVerified !== true
    || batch.summaryCountsVerified !== true
    || !Array.isArray(batch.machineValidationErrors)
    || batch.machineValidationErrors.length !== 0) fail(`${path}.validation`, 'machine validation must be fully true with no errors');
  return batch;
}

function deriveJointCell(cell, path) {
  if (!Array.isArray(cell.jointVerdictCounts) || cell.jointVerdictCounts.length !== 27
    || cell.jointVerdictCounts.some((count) => !integer(count, cell.itemCount))) fail(`${path}.jointVerdictCounts`, 'must be the exact closed 27-count nonnegative contingency');
  const stages = Array.from({ length: 3 }, () => Array(3).fill(0));
  const agreements = {
    threeStageAgreementCount: 0,
    anyDisagreementCount: 0,
    lunaTerraDisagreementCount: 0,
    lunaSolDisagreementCount: 0,
    terraSolDisagreementCount: 0,
    lunaOnlyDisagreesCount: 0,
    terraOnlyDisagreesCount: 0,
    solOnlyDisagreesCount: 0,
    allDifferentCount: 0,
  };
  let total = 0;
  for (let luna = 0; luna < 3; luna += 1) {
    for (let terra = 0; terra < 3; terra += 1) {
      for (let sol = 0; sol < 3; sol += 1) {
        const count = cell.jointVerdictCounts[(luna * 9) + (terra * 3) + sol];
        total += count;
        stages[0][luna] += count;
        stages[1][terra] += count;
        stages[2][sol] += count;
        if (luna === terra && terra === sol) agreements.threeStageAgreementCount += count;
        else {
          agreements.anyDisagreementCount += count;
          if (terra === sol) agreements.lunaOnlyDisagreesCount += count;
          else if (luna === sol) agreements.terraOnlyDisagreesCount += count;
          else if (luna === terra) agreements.solOnlyDisagreesCount += count;
          else agreements.allDifferentCount += count;
        }
        if (luna !== terra) agreements.lunaTerraDisagreementCount += count;
        if (luna !== sol) agreements.lunaSolDisagreementCount += count;
        if (terra !== sol) agreements.terraSolDisagreementCount += count;
      }
    }
  }
  if (total !== cell.itemCount) fail(`${path}.jointVerdictCounts`, 'does not sum to the cell item count');
  return { stages, agreements };
}

function validateAgreements(value, itemCount, path) {
  if (!hasExactKeys(value, agreementKeys) || Object.values(value).some((count) => !integer(count, itemCount))) fail(path, 'has an invalid closed agreement shape');
  if (value.threeStageAgreementCount + value.anyDisagreementCount !== itemCount
    || value.lunaOnlyDisagreesCount + value.terraOnlyDisagreesCount + value.solOnlyDisagreesCount + value.allDifferentCount !== value.anyDisagreementCount
    || value.lunaTerraDisagreementCount !== value.lunaOnlyDisagreesCount + value.terraOnlyDisagreesCount + value.allDifferentCount
    || value.lunaSolDisagreementCount !== value.lunaOnlyDisagreesCount + value.solOnlyDisagreesCount + value.allDifferentCount
    || value.terraSolDisagreementCount !== value.terraOnlyDisagreesCount + value.solOnlyDisagreesCount + value.allDifferentCount) fail(path, 'has inconsistent agreement, pairwise, or asymmetry metrics');
}

function validateAggregates(value, batches, itemCount) {
  if (!hasExactKeys(value, aggregateKeys) || value.judgmentCount !== itemCount * 3 || !Array.isArray(value.verdicts) || value.verdicts.length !== 3) fail('input.aggregates', 'has an invalid closed aggregate root');
  const aggregateBatchKeys = ['invalidCount', 'missingCount', 'extraCount', 'duplicateCount', 'infrastructureFailureCount', 'retryCount'];
  for (const key of aggregateBatchKeys) if (!integer(value[key], itemCount * 3) || value[key] !== sum(batches, key)) fail(`input.aggregates.${key}`, 'does not equal the batch sum');
  if (!integer(value.judgmentAgentToolCallCount, itemCount * 3) || value.judgmentAgentToolCallCount !== sum(batches, 'toolCallCount')) fail('input.aggregates.judgmentAgentToolCallCount', 'does not equal the batch sum');
  value.verdicts.forEach((row, index) => {
    const profile = stageProfiles[index];
    const stageBatches = batches.filter((batch) => batch.stage === profile.stage);
    if (!hasExactKeys(row, stageVerdictKeys) || row.stage !== profile.stage
      || row.correctCount !== sum(stageBatches, 'correctCount')
      || row.wrongCount !== sum(stageBatches, 'wrongCount')
      || row.unsureCount !== sum(stageBatches, 'unsureCount')
      || row.correctCount + row.wrongCount + row.unsureCount !== itemCount) fail(`input.aggregates.verdicts[${index}]`, 'does not reconcile to ordered stage batch verdicts');
  });
  validateAgreements(value.agreements, itemCount, 'input.aggregates.agreements');
}

function validateCells(cells, aggregates, itemCount) {
  if (!Array.isArray(cells) || cells.length !== 12) fail('input.cells', 'must contain exactly twelve aggregate class/stratum rows');
  const expectedCells = classes.flatMap((candidateClass) => strata.map((stratum) => [candidateClass, stratum]));
  const derivedRootAgreements = Object.fromEntries(agreementKeys.map((key) => [key, 0]));
  cells.forEach((cell, index) => {
    const [candidateClass, stratum] = expectedCells[index];
    if (!hasExactKeys(cell, cellKeys) || cell.candidateClass !== candidateClass || cell.stratum !== stratum || !integer(cell.itemCount, itemCount)
      || !integer(cell.threeStageAgreementCount, cell.itemCount) || !integer(cell.anyDisagreementCount, cell.itemCount)
      || !integer(cell.invalidCount, cell.itemCount * 3)
      || cell.threeStageAgreementCount + cell.anyDisagreementCount !== cell.itemCount) fail(`input.cells[${index}]`, 'has a wrong, reordered, or inconsistent class/stratum aggregate row');
    for (const stage of ['luna', 'terra', 'sol']) {
      const verdicts = cell[stage];
      if (!hasExactKeys(verdicts, verdictKeys) || Object.values(verdicts).some((count) => !integer(count, cell.itemCount))
        || verdicts.correctCount + verdicts.wrongCount + verdicts.unsureCount !== cell.itemCount) fail(`input.cells[${index}].${stage}`, 'has inconsistent verdict aggregates');
    }
    const derived = deriveJointCell(cell, `input.cells[${index}]`);
    for (const [stageIndex, stage] of ['luna', 'terra', 'sol'].entries()) {
      for (const [verdictIndex, key] of jointVerdictKeys.entries()) {
        if (cell[stage][key] !== derived.stages[stageIndex][verdictIndex]) fail(`input.cells[${index}].${stage}.${key}`, 'does not derive from the joint verdict contingency');
      }
    }
    if (cell.threeStageAgreementCount !== derived.agreements.threeStageAgreementCount
      || cell.anyDisagreementCount !== derived.agreements.anyDisagreementCount) fail(`input.cells[${index}]`, 'agreement counts do not derive from the joint verdict contingency');
    for (const key of agreementKeys) derivedRootAgreements[key] += derived.agreements[key];
    const cellUnsureCount = cell.luna.unsureCount + cell.terra.unsureCount + cell.sol.unsureCount;
    if (cell.invalidCount > cellUnsureCount) fail(`input.cells[${index}].invalidCount`, 'cannot exceed routed stage UNSURE totals');
  });
  if (sum(cells, 'itemCount') !== itemCount || sum(cells, 'invalidCount') !== aggregates.invalidCount
    || sum(cells, 'threeStageAgreementCount') !== aggregates.agreements.threeStageAgreementCount
    || sum(cells, 'anyDisagreementCount') !== aggregates.agreements.anyDisagreementCount) fail('input.cells', 'does not reconcile to root item, invalid, or agreement totals');
  for (const [index, stage] of ['luna', 'terra', 'sol'].entries()) {
    const aggregate = aggregates.verdicts[index];
    for (const key of verdictKeys) if (cells.reduce((total, cell) => total + cell[stage][key], 0) !== aggregate[key]) fail('input.cells', `does not reconcile ${stage}.${key}`);
  }
  for (const key of agreementKeys) if (aggregates.agreements[key] !== derivedRootAgreements[key]) fail(`input.aggregates.agreements.${key}`, 'does not equal the sum derived from the ordered joint cell contingencies');
}

export function validateCompactProcessAuditInput(value) {
  if (!hasExactKeys(value, rootKeys)
    || value.schema !== schemaId
    || value.protocol !== COMPACT_PROCESS_AUDIT_PROTOCOL
    || !['real-screening', 'synthetic-pilot'].includes(value.sourceKind)
    || !integer(value.itemCount, 664) || value.itemCount < 1
    || !digest(value.judgmentTranscriptPrefixSha256)
    || value.aggregateTiming !== 'after-all-judgment-outputs-before-process-audit') fail('input', 'has an invalid closed root, protocol, timing, item count, or transcript identity');
  validatePublicArtifacts(value.publicArtifacts, value.sourceKind);
  validateDeclarations(value.declarations, value.itemCount);
  validateAuditScope(value.auditScope);
  const expectedBatches = stageProfiles.flatMap((profile) => {
    const sizes = expectedBatchSizes(value.itemCount, profile.batchLimit);
    return sizes.map((itemCount, index) => ({ stage: profile.stage, batchOrdinal: index + 1, batchCount: sizes.length, itemCount }));
  });
  if (!Array.isArray(value.batches) || value.batches.length !== expectedBatches.length) fail('input.batches', 'has a missing or extra stage batch');
  const decodedBatches = value.batches.map((batch, index) => validateBatch(batch, expectedBatches[index], `input.batches[${index}]`));
  validateAggregates(value.aggregates, decodedBatches, value.itemCount);
  validateCells(value.cells, value.aggregates, value.itemCount);
  assertNoForbiddenMaterial(value);
  return true;
}

export function renderCompactProcessAuditInput(value) {
  validateV4SourceBytes();
  validateCompactProcessAuditInput(value);
  const bytes = Buffer.from(`${canonical(value)}\n`, 'utf8');
  if (bytes.length > MAX_COMPACT_PROCESS_AUDIT_BYTES) fail('input', `canonical bytes exceed ${MAX_COMPACT_PROCESS_AUDIT_BYTES}`);
  return bytes;
}

export function validateRenderedCompactProcessAuditInput(value, candidateBytes) {
  const expected = renderCompactProcessAuditInput(value);
  if (!exactBytes(candidateBytes, expected)) fail('candidateBytes', 'must be the exact canonical compact summary with one final LF and no prefix or suffix');
  if (Buffer.byteLength(candidateBytes) > MAX_COMPACT_PROCESS_AUDIT_BYTES) fail('candidateBytes', `exceed ${MAX_COMPACT_PROCESS_AUDIT_BYTES}`);
  return true;
}

function syntheticDigest(label) {
  return sha256(Buffer.from(`permanently-excluded-compact-capacity-probe:${label}`, 'utf8'));
}

export function buildSyntheticCapacityProbe(itemCount = 664) {
  if (!Number.isInteger(itemCount) || itemCount < 1 || itemCount > 664) fail('itemCount', 'must be between 1 and 664');
  const batches = stageProfiles.flatMap((profile) => {
    const sizes = expectedBatchSizes(itemCount, profile.batchLimit);
    return sizes.map((size, index) => encodeBatch({
      stage: profile.stage,
      batchOrdinal: index + 1,
      batchCount: sizes.length,
      itemCount: size,
      blindedItemsSha256: syntheticDigest(`${profile.stage}:${index + 1}:blinded`),
      dispatchSha256: syntheticDigest(`${profile.stage}:${index + 1}:dispatch`),
      rawOutputSha256: syntheticDigest(`${profile.stage}:${index + 1}:output`),
      rawOutputRecordCount: size,
      routedVerdictCount: size,
      correctCount: size,
      wrongCount: 0,
      unsureCount: 0,
      invalidCount: 0,
      missingCount: 0,
      extraCount: 0,
      duplicateCount: 0,
      infrastructureFailureCount: 0,
      retryCount: 0,
      toolCallCount: 0,
      dispatchDigestVerified: true,
      outputDigestVerified: true,
      summaryCountsVerified: true,
      machineValidationErrors: [],
    }));
  });
  const base = Math.floor(itemCount / 12);
  const remainder = itemCount % 12;
  const cells = classes.flatMap((candidateClass) => strata.map((stratum) => ({ candidateClass, stratum }))).map((identity, index) => {
    const count = base + (index < remainder ? 1 : 0);
    const verdicts = { correctCount: count, wrongCount: 0, unsureCount: 0 };
    const jointVerdictCounts = Array(27).fill(0);
    jointVerdictCounts[0] = count;
    return { ...identity, itemCount: count, jointVerdictCounts, luna: verdicts, terra: verdicts, sol: verdicts, threeStageAgreementCount: count, anyDisagreementCount: 0, invalidCount: 0 };
  });
  return {
    schema: schemaId,
    protocol: COMPACT_PROCESS_AUDIT_PROTOCOL,
    sourceKind: 'synthetic-pilot',
    publicArtifacts: {
      repository: 'https://github.com/colophon-claims/locomo-judge-report',
      sourceRevision: '525664b724fe23c001199ba45910fd75ebb524f6',
      coordinatorPromptSha256: syntheticDigest('prompt'),
      judgmentInstructionSha256: syntheticDigest('instruction'),
      screeningProcedureSha256: syntheticDigest('procedure'),
      screeningPoolOrFixtureSha256: syntheticDigest('fixture'),
      opaqueIdentityMappingSha256: syntheticDigest('mapping'),
      dispatchOrderSha256: syntheticDigest('order'),
      samplingCommitmentSha256: null,
      samplingScriptSha256: null,
      rendererSha256: syntheticDigest('renderer'),
    },
    declarations: {
      coordinator: { modelAlias: 'gpt-5.6-sol', reasoning: 'high' },
      processAudit: { modelAlias: 'gpt-5.6-sol', reasoning: 'high', toolPolicy: 'none' },
      judgmentStages: stageProfiles.map((profile) => ({ ...profile, batchCount: Math.ceil(itemCount / profile.batchLimit) })),
    },
    auditScope: {
      inputBoundary: 'canonical-summary-only',
      mayInspect: ['coverage', 'declaration-drift', 'suspicious-agreement', 'cross-stage-asymmetry', 'process-defects'],
      mustNot: 'reperform-item-judgments',
      rawIntegrityBasis: 'machine-validation-flags-and-digests',
      publicVerificationBoundary: 'later-verifier-resolves-and-hashes-published-artifacts',
    },
    itemCount,
    judgmentTranscriptPrefixSha256: syntheticDigest('judgment-transcript-prefix'),
    batches,
    aggregates: {
      judgmentCount: itemCount * 3,
      verdicts: stageProfiles.map(({ stage }) => ({ stage, correctCount: itemCount, wrongCount: 0, unsureCount: 0 })),
      invalidCount: 0,
      missingCount: 0,
      extraCount: 0,
      duplicateCount: 0,
      infrastructureFailureCount: 0,
      retryCount: 0,
      judgmentAgentToolCallCount: 0,
      agreements: { threeStageAgreementCount: itemCount, anyDisagreementCount: 0, lunaTerraDisagreementCount: 0, lunaSolDisagreementCount: 0, terraSolDisagreementCount: 0, lunaOnlyDisagreesCount: 0, terraOnlyDisagreesCount: 0, solOnlyDisagreesCount: 0, allDifferentCount: 0 },
    },
    cells,
    aggregateTiming: 'after-all-judgment-outputs-before-process-audit',
  };
}

export function validateCompactPilotV4Fixture(value, raw) {
  if (raw !== `${JSON.stringify(value, null, 2)}\n` || !hasExactKeys(value, fixtureRootKeys)
    || value.schema !== 'https://colophon-claims.github.io/locomo-judge-report/compact-process-audit-pilot-fixture/v4'
    || value.status !== 'synthetic-validation-only-no-model-run'
    || !hasExactKeys(value.expectedExecution, expectedExecutionKeys)) fail('fixture', 'has an invalid deterministic no-run wrapper');
  const rendered = renderCompactProcessAuditInput(value.compactAuditInput);
  const expected = value.expectedExecution;
  if (!hasExactKeys(expected.auditDeclaration, auditAgentKeys)
    || expected.auditDeclaration.modelAlias !== 'gpt-5.6-sol'
    || expected.auditDeclaration.reasoning !== 'high'
    || expected.auditDeclaration.toolPolicy !== 'none'
    || expected.inputByteLimit !== MAX_COMPACT_PROCESS_AUDIT_BYTES
    || expected.modelRunOccurred !== false
    || expected.renderedInputByteLength !== rendered.length
    || expected.renderedInputSha256 !== sha256(rendered)
    || !hasExactKeys(expected.usage, usageKeys)
    || expected.usage.status !== 'not-measured-no-model-run'
    || ['inputTokens', 'cachedInputTokens', 'outputTokens', 'reasoningOutputTokens', 'totalTokens'].some((key) => expected.usage[key] !== null)
    || !hasExactKeys(expected.measuredV3Baseline, v3BaselineKeys)
    || expected.measuredV3Baseline.judgmentPrefixByteLength !== 59_310
    || expected.measuredV3Baseline.auditObservableInputTokens !== 450_974
    || expected.measuredV3Baseline.auditObservableTotalTokens !== 464_147
    || rendered.length * 4 >= expected.measuredV3Baseline.judgmentPrefixByteLength) fail('fixture.expectedExecution', 'does not prove the bounded no-run usage shape and substantial byte reduction');
  return true;
}

export function validateCompactPilotV4FixtureBytes(bytes = readFileSync(fixturePath)) {
  if (sha256(bytes) !== APPROVED_PROMPTED_SCREENING_V4_SHA256.compactAuditPilotV4JointFixture) fail('fixtureBytes', `must match approved ${APPROVED_PROMPTED_SCREENING_V4_SHA256.compactAuditPilotV4JointFixture}`);
  const raw = Buffer.from(bytes).toString('utf8');
  return validateCompactPilotV4Fixture(JSON.parse(raw), raw);
}

validateV4SourceBytes();

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
  validateCompactPilotV4Fixture(fixture, readFileSync(fixturePath, 'utf8'));
  const rendered = renderCompactProcessAuditInput(fixture.compactAuditInput);
  const capacityBytes = renderCompactProcessAuditInput(buildSyntheticCapacityProbe());
  console.log(`validated compact process-audit input ${rendered.length}/${MAX_COMPACT_PROCESS_AUDIT_BYTES} bytes and 664-item capacity ${capacityBytes.length}/${MAX_COMPACT_PROCESS_AUDIT_BYTES} bytes`);
}
