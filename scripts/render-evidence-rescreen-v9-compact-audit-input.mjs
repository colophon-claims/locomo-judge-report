import { createHash } from 'node:crypto';

const digestPattern = /^sha256:[0-9a-f]{64}$/u;
const stages = [
  { name: 'Luna', limit: 32, model: 'gpt-5.6-luna', reasoning: 'medium' },
  { name: 'Terra', limit: 16, model: 'gpt-5.6-terra', reasoning: 'high' },
  { name: 'Sol', limit: 8, model: 'gpt-5.6-sol', reasoning: 'high' },
];
const classes = ['correct', 'specific-wrong', 'vague-topical-wrong'];
const strata = ['category-1', 'category-2', 'category-3', 'category-4'];
const verdictKeys = ['CORRECT', 'UNSURE', 'WRONG'];

export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

function fail(path, detail) { throw new Error(`${path}: ${detail}`); }
function exactKeys(value, keys) { return value !== null && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join(',') === [...keys].sort().join(','); }
function count(value, path, maximum = 664) { if (!Number.isInteger(value) || value < 0 || value > maximum) fail(path, `must be an integer from 0 through ${maximum}`); }
function digest(value, path) { if (!digestPattern.test(value)) fail(path, 'must be a SHA-256 digest'); }
function verdicts(value, path) {
  if (!exactKeys(value, verdictKeys)) fail(path, 'must contain the exact verdict keys');
  verdictKeys.forEach((key) => count(value[key], `${path}.${key}`));
  return verdictKeys.reduce((sum, key) => sum + value[key], 0);
}

export function validateEvidenceRescreenV9CompactAuditInput(value) {
  const rootKeys = ['batches', 'capabilityBoundary', 'cells', 'coverage', 'declarations', 'execution', 'routing', 'run'];
  if (!exactKeys(value, rootKeys)) fail('auditInput', 'has an unexpected root shape');
  if (!exactKeys(value.run, ['itemCount', 'runId', 'status']) || value.run.itemCount !== 664 || value.run.runId !== 'locomo-evidence-rescreen-v9-2026-08-24' || value.run.status !== 'JUDGMENTS_COMPLETE_PENDING_PROCESS_AUDIT') fail('auditInput.run', 'does not identify the exact pending-audit run');

  const declarations = value.declarations;
  if (!exactKeys(declarations, ['evidencePayloadSha256', 'judgmentInstructionSha256', 'poolDigest', 'profiles', 'promptSha256', 'toolPolicy']) || declarations.toolPolicy !== 'judgment-agents-none') fail('auditInput.declarations', 'has an unexpected shape or tool policy');
  ['evidencePayloadSha256', 'judgmentInstructionSha256', 'poolDigest', 'promptSha256'].forEach((key) => digest(declarations[key], `auditInput.declarations.${key}`));
  if (!Array.isArray(declarations.profiles) || declarations.profiles.length !== 3) fail('auditInput.declarations.profiles', 'must contain three profiles');
  stages.forEach((stage, index) => {
    const profile = declarations.profiles[index];
    if (!exactKeys(profile, ['alias', 'maxBatchSize', 'model', 'reasoningEffort']) || profile.alias !== stage.name || profile.maxBatchSize !== stage.limit || profile.model !== stage.model || profile.reasoningEffort !== stage.reasoning) fail(`auditInput.declarations.profiles[${index}]`, 'does not match the bound profile');
  });

  if (!Array.isArray(value.batches) || value.batches.length < 21) fail('auditInput.batches', 'must contain every judgment batch');
  const batchesByStage = new Map(stages.map((stage) => [stage.name, []]));
  for (const [index, batch] of value.batches.entries()) {
    if (!exactKeys(batch, ['batchOrdinal', 'invalidOutputCount', 'itemCount', 'stage', 'verdicts']) || !batchesByStage.has(batch.stage)) fail(`auditInput.batches[${index}]`, 'has an unexpected shape or stage');
    count(batch.invalidOutputCount, `auditInput.batches[${index}].invalidOutputCount`, batch.itemCount);
    if (!Number.isInteger(batch.itemCount) || batch.itemCount < 1 || batch.itemCount > stages.find((stage) => stage.name === batch.stage).limit) fail(`auditInput.batches[${index}].itemCount`, 'exceeds the stage limit');
    if (verdicts(batch.verdicts, `auditInput.batches[${index}].verdicts`) !== batch.itemCount) fail(`auditInput.batches[${index}].verdicts`, 'must sum to the batch item count');
    batchesByStage.get(batch.stage).push(batch);
  }

  if (!exactKeys(value.coverage, stages.map((stage) => stage.name))) fail('auditInput.coverage', 'must contain exact stage coverage');
  stages.forEach((stage) => {
    const batches = batchesByStage.get(stage.name);
    const coverage = value.coverage[stage.name];
    if (!exactKeys(coverage, ['batchCount', 'duplicateItemCount', 'invalidOutputCount', 'itemCount', 'missingItemCount', 'verdicts'])) fail(`auditInput.coverage.${stage.name}`, 'has an unexpected shape');
    ['batchCount', 'duplicateItemCount', 'invalidOutputCount', 'itemCount', 'missingItemCount'].forEach((key) => count(coverage[key], `auditInput.coverage.${stage.name}.${key}`));
    if (coverage.batchCount !== batches.length || coverage.itemCount !== batches.reduce((sum, row) => sum + row.itemCount, 0) || verdicts(coverage.verdicts, `auditInput.coverage.${stage.name}.verdicts`) !== coverage.itemCount) fail(`auditInput.coverage.${stage.name}`, 'does not match its batches');
    batches.forEach((batch, index) => {
      if (batch.batchOrdinal !== index + 1 || (index < batches.length - 1 && batch.itemCount !== stage.limit)) fail(`auditInput.batches.${stage.name}`, 'must be consecutive full chunks followed by at most one smaller final chunk');
    });
  });
  if (value.coverage.Luna.itemCount !== 664 || value.coverage.Luna.batchCount !== 21 || value.coverage.Luna.missingItemCount !== 0 || value.coverage.Luna.duplicateItemCount !== 0) fail('auditInput.coverage.Luna', 'must cover all 664 items exactly once in 21 batches');

  if (!Array.isArray(value.cells) || value.cells.length !== 12) fail('auditInput.cells', 'must contain twelve cells');
  const cellKeys = ['advisoryDispositionDeltaCount', 'advisoryVerdicts', 'candidateClass', 'lunaTerraDisagreements', 'lunaVerdicts', 'lunaVsIntendedDisagreements', 'lunaVsV8Disagreements', 'poolCount', 'solRouted', 'solVerdicts', 'stratum', 'terraRouted', 'terraVerdicts'];
  let poolTotal = 0;
  value.cells.forEach((cell, index) => {
    const candidateClass = classes[Math.floor(index / 4)];
    const stratum = strata[index % 4];
    if (!exactKeys(cell, cellKeys) || cell.candidateClass !== candidateClass || cell.stratum !== stratum) fail(`auditInput.cells[${index}]`, 'is not in the exact class and stratum order');
    ['advisoryDispositionDeltaCount', 'lunaTerraDisagreements', 'lunaVsIntendedDisagreements', 'lunaVsV8Disagreements', 'poolCount', 'solRouted', 'terraRouted'].forEach((key) => count(cell[key], `auditInput.cells[${index}].${key}`));
    if (verdicts(cell.lunaVerdicts, `auditInput.cells[${index}].lunaVerdicts`) !== cell.poolCount || verdicts(cell.terraVerdicts, `auditInput.cells[${index}].terraVerdicts`) !== cell.terraRouted || verdicts(cell.solVerdicts, `auditInput.cells[${index}].solVerdicts`) !== cell.solRouted || verdicts(cell.advisoryVerdicts, `auditInput.cells[${index}].advisoryVerdicts`) !== cell.poolCount) fail(`auditInput.cells[${index}]`, 'verdict counts do not match routed counts');
    poolTotal += cell.poolCount;
  });
  if (poolTotal !== 664) fail('auditInput.cells', 'pool counts must sum to 664');

  const routingKeys = ['advisoryDeltaCount', 'solExpectedUnionCount', 'solPlanCount', 'solPlanMatchesRule', 'terraExpectedUnionCount', 'terraPlanCount', 'terraPlanMatchesRule', 'terraUnsureOrInvalidCount', 'terraVsLunaDisagreementCount'];
  if (!exactKeys(value.routing, routingKeys)) fail('auditInput.routing', 'has an unexpected shape');
  routingKeys.filter((key) => !key.endsWith('MatchesRule')).forEach((key) => count(value.routing[key], `auditInput.routing.${key}`));
  if (typeof value.routing.solPlanMatchesRule !== 'boolean' || typeof value.routing.terraPlanMatchesRule !== 'boolean' || value.routing.solPlanCount !== value.coverage.Sol.itemCount || value.routing.terraPlanCount !== value.coverage.Terra.itemCount) fail('auditInput.routing', 'does not match stage coverage');

  if (!exactKeys(value.execution, ['infrastructureFailureCount', 'judgmentOutputEventCount', 'retryCount', 'terminalStopCount', 'toolCallCount', 'transcriptPrefixSha256'])) fail('auditInput.execution', 'has an unexpected shape');
  ['infrastructureFailureCount', 'judgmentOutputEventCount', 'retryCount', 'terminalStopCount', 'toolCallCount'].forEach((key) => count(value.execution[key], `auditInput.execution.${key}`));
  digest(value.execution.transcriptPrefixSha256, 'auditInput.execution.transcriptPrefixSha256');
  if (!exactKeys(value.capabilityBoundary, ['invariantWeightsVerified', 'promptComplianceVerified', 'providerExecutionVerified', 'providerFreshnessVerified']) || Object.values(value.capabilityBoundary).some((entry) => entry !== false)) fail('auditInput.capabilityBoundary', 'must preserve the declared capability boundary');
  return true;
}

export function renderEvidenceRescreenV9CompactAuditInput(value) {
  validateEvidenceRescreenV9CompactAuditInput(value);
  const bytes = Buffer.from(canonical(value));
  if (bytes.length > 65536) fail('auditInput', 'must not exceed 65,536 bytes');
  return bytes;
}

export function renderEvidenceRescreenV9AuditInvocation({ compactInput, auditInstruction }) {
  const compactInputBytes = renderEvidenceRescreenV9CompactAuditInput(compactInput);
  if (!Buffer.isBuffer(auditInstruction) || !auditInstruction.toString('utf8').endsWith('\n')) fail('auditInstruction', 'must be exact LF-terminated bytes');
  const sha256 = (bytes) => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
  const invocation = { auditInputSha256: sha256(compactInputBytes), auditInstructionSha256: sha256(auditInstruction), modelAlias: 'gpt-5.6-sol', reasoning: 'high', runId: 'locomo-evidence-rescreen-v9-2026-08-24', taskId: 'codexcli/v9-process-audit', toolPolicy: 'none' };
  const auditInvocationSha256 = sha256(Buffer.from(canonical(invocation)));
  const dispatchBytes = Buffer.concat([auditInstruction, Buffer.from(`AUDIT INVOCATION SHA-256: ${auditInvocationSha256}\n`), compactInputBytes]);
  return { auditInvocationSha256, compactInputBytes, dispatchBytes, invocation };
}
