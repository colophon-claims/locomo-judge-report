import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { canonical, sha256 } from './render-compact-process-audit-input-v1.mjs';
import {
  createSyntheticPilotV2StagePlan,
  renderStageDispatchesV3,
} from './render-prompted-screening-dispatch-v3.mjs';
import { APPROVED_PROMPTED_SCREENING_V3_SHA256 } from './approved-prompted-screening-v3-identities.mjs';
import { APPROVED_PROMPTED_SCREENING_V5_SHA256 } from './approved-prompted-screening-v5-identities.mjs';
import { APPROVED_PROMPTED_SCREENING_V6_SHA256 } from './approved-prompted-screening-v6-identities.mjs';

export const PRE_DISPATCH_SCHEMA_V1 = 'https://colophon-claims.github.io/locomo-judge-report/prompted-screening-pre-dispatch-plan/v1';
export const PRE_DISPATCH_PROTOCOL_V1 = 'prompted-codex-screening-pre-dispatch/v1';

const sourcePaths = Object.freeze({
  coordinatorPromptBytes: new URL('../CODEX-SCREENING-PROMPT.v6.md', import.meta.url),
  judgmentProcedureBytes: new URL('../CODEX-SCREENING-PROMPT.v3.md', import.meta.url),
  judgmentInstructionBytes: new URL('../CODEX-SCREENING-JUDGMENT-INSTRUCTION.v1.txt', import.meta.url),
  screeningPoolOrFixtureBytes: new URL('../fixtures/prompted-screening-pilot-v2.json', import.meta.url),
  opaqueIdentityMappingBytes: new URL('../fixtures/prompted-screening-pilot-v2-identity-map.canonical.json', import.meta.url),
  dispatchOrderBytes: new URL('../fixtures/prompted-screening-pilot-v2-dispatch-order.canonical.json', import.meta.url),
  compactInputSchemaBytes: new URL('../schemas/compact-process-audit-input.v2.schema.json', import.meta.url),
  auditInstructionBytes: new URL('../CODEX-SCREENING-AUDIT-INSTRUCTION.v1.txt', import.meta.url),
  auditOutputSchemaBytes: new URL('../schemas/compact-process-audit-output.v1.schema.json', import.meta.url),
  auditOutputGateBytes: new URL('./validate-compact-process-audit-output-v1.mjs', import.meta.url),
  judgmentRendererBytes: new URL('./render-prompted-screening-dispatch-v3.mjs', import.meta.url),
  preDispatchSchemaBytes: new URL('../schemas/prompted-screening-pre-dispatch-plan.v1.schema.json', import.meta.url),
  runtimePrefixSchemaBytes: new URL('../schemas/prompted-screening-judgment-prefix.v1.schema.json', import.meta.url),
  preDispatchPlannerBytes: new URL('./plan-prompted-screening-v6.mjs', import.meta.url),
  runtimeBuilderBytes: new URL('./build-prompted-screening-runtime-v6.mjs', import.meta.url),
  runtimeGateBytes: new URL('./gate-prompted-screening-runtime-v6.mjs', import.meta.url),
});

const profiles = Object.freeze([
  Object.freeze({ stage: 'Luna', modelAlias: 'gpt-5.6-luna', reasoning: 'medium', batchLimit: 32, batchCount: 1 }),
  Object.freeze({ stage: 'Terra', modelAlias: 'gpt-5.6-terra', reasoning: 'high', batchLimit: 16, batchCount: 2 }),
  Object.freeze({ stage: 'Sol', modelAlias: 'gpt-5.6-sol', reasoning: 'high', batchLimit: 8, batchCount: 3 }),
]);
const sourceKeys = Object.keys(sourcePaths);
const planKeys = ['audit', 'coordinator', 'dispatchCount', 'dispatches', 'exactPublicCommit', 'itemCount', 'judgmentAgentToolPolicy', 'judgmentStages', 'protocol', 'schema', 'sourceIdentities', 'sourceKind', 'status'];
const dispatchKeys = ['batchCount', 'batchOrdinal', 'blindedItemsSha256', 'dispatchByteLength', 'dispatchBytesBase64', 'dispatchSha256', 'itemCount', 'itemIds', 'modelAlias', 'reasoning', 'stage'];
const identityKeys = ['auditInstructionSha256', 'auditOutputGateSha256', 'auditOutputSchemaSha256', 'compactInputSchemaSha256', 'coordinatorPromptSha256', 'dispatchOrderSha256', 'judgmentInstructionSha256', 'judgmentProcedureSha256', 'judgmentRendererSha256', 'opaqueIdentityMappingSha256', 'preDispatchPlannerSha256', 'preDispatchSchemaSha256', 'runtimeBuilderSha256', 'runtimeGateSha256', 'runtimePrefixSchemaSha256', 'screeningPoolOrFixtureSha256'];

function fail(path, detail) { throw new Error(`${path}: ${detail}`); }
function exactKeys(value, keys) { return value !== null && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join(',') === [...keys].sort().join(','); }
function exact(value, expected) { return canonical(value) === canonical(expected); }
function exactBytes(a, b) { return Buffer.from(a).equals(Buffer.from(b)); }
function approvedIdentity(key) {
  const value = APPROVED_PROMPTED_SCREENING_V6_SHA256[key];
  if (typeof value !== 'string' || !/^sha256:[0-9a-f]{64}$/u.test(value) || /^sha256:0{64}$/u.test(value)) fail('approvedIdentities', `missing literal ${key}`);
  return value;
}

export function loadPromptedScreeningV6Sources() {
  return Object.fromEntries(sourceKeys.map((key) => [key, readFileSync(sourcePaths[key])]));
}

export function sourceIdentitiesV6(sources) {
  return {
    auditInstructionSha256: sha256(sources.auditInstructionBytes),
    auditOutputGateSha256: sha256(sources.auditOutputGateBytes),
    auditOutputSchemaSha256: sha256(sources.auditOutputSchemaBytes),
    compactInputSchemaSha256: sha256(sources.compactInputSchemaBytes),
    coordinatorPromptSha256: sha256(sources.coordinatorPromptBytes),
    dispatchOrderSha256: sha256(sources.dispatchOrderBytes),
    judgmentInstructionSha256: sha256(sources.judgmentInstructionBytes),
    judgmentProcedureSha256: sha256(sources.judgmentProcedureBytes),
    judgmentRendererSha256: sha256(sources.judgmentRendererBytes),
    opaqueIdentityMappingSha256: sha256(sources.opaqueIdentityMappingBytes),
    preDispatchPlannerSha256: sha256(sources.preDispatchPlannerBytes),
    preDispatchSchemaSha256: sha256(sources.preDispatchSchemaBytes),
    runtimeBuilderSha256: sha256(sources.runtimeBuilderBytes),
    runtimeGateSha256: sha256(sources.runtimeGateBytes),
    runtimePrefixSchemaSha256: sha256(sources.runtimePrefixSchemaBytes),
    screeningPoolOrFixtureSha256: sha256(sources.screeningPoolOrFixtureBytes),
  };
}

export function validatePromptedScreeningV6Sources(sources) {
  if (!exactKeys(sources, sourceKeys)) fail('sources', 'must supply every exact normative and runtime artifact');
  const expected = {
    coordinatorPromptBytes: approvedIdentity('coordinatorPromptV6'),
    judgmentProcedureBytes: APPROVED_PROMPTED_SCREENING_V3_SHA256.coordinatorPromptV3,
    judgmentInstructionBytes: APPROVED_PROMPTED_SCREENING_V3_SHA256.judgmentInstructionV1,
    screeningPoolOrFixtureBytes: APPROVED_PROMPTED_SCREENING_V3_SHA256.syntheticFixtureV2,
    opaqueIdentityMappingBytes: APPROVED_PROMPTED_SCREENING_V5_SHA256.syntheticIdentityMapping,
    dispatchOrderBytes: APPROVED_PROMPTED_SCREENING_V5_SHA256.syntheticDispatchOrder,
    compactInputSchemaBytes: APPROVED_PROMPTED_SCREENING_V5_SHA256.compactAuditSchemaV2,
    auditInstructionBytes: APPROVED_PROMPTED_SCREENING_V5_SHA256.processAuditInstructionV1,
    auditOutputSchemaBytes: APPROVED_PROMPTED_SCREENING_V5_SHA256.processAuditOutputSchemaV1,
    auditOutputGateBytes: APPROVED_PROMPTED_SCREENING_V5_SHA256.processAuditOutputGateV1,
    judgmentRendererBytes: APPROVED_PROMPTED_SCREENING_V3_SHA256.rendererV3,
    preDispatchSchemaBytes: approvedIdentity('preDispatchSchemaV1'),
    runtimePrefixSchemaBytes: approvedIdentity('runtimePrefixSchemaV1'),
    preDispatchPlannerBytes: approvedIdentity('preDispatchPlannerV1'),
    runtimeBuilderBytes: approvedIdentity('runtimeBuilderV1'),
    runtimeGateBytes: approvedIdentity('runtimeGateV1'),
  };
  for (const key of sourceKeys) if (!Buffer.isBuffer(sources[key]) || sha256(sources[key]) !== expected[key]) fail(`sources.${key}`, `must match literal approved ${expected[key]}`);
  const mapping = JSON.parse(sources.opaqueIdentityMappingBytes.toString('utf8'));
  const order = JSON.parse(sources.dispatchOrderBytes.toString('utf8'));
  if (sources.opaqueIdentityMappingBytes.toString('utf8') !== canonical(mapping) || sources.dispatchOrderBytes.toString('utf8') !== canonical(order)) fail('sources.mapping', 'mapping and order must be exact canonical JSON without suffix bytes');
  const fixture = JSON.parse(sources.screeningPoolOrFixtureBytes.toString('utf8'));
  if (!exact(mapping, fixture.cases.map((row) => [row.pilotCaseId, row.judgmentItemId])) || !exact(order, fixture.dispatchOrder)) fail('sources.mapping', 'mapping and order must join every exact fixture identity');
  return true;
}

function deriveDispatches(sources) {
  const judgmentSources = { promptBytes: sources.judgmentProcedureBytes, instructionBytes: sources.judgmentInstructionBytes, fixtureBytes: sources.screeningPoolOrFixtureBytes, rendererBytes: sources.judgmentRendererBytes };
  return profiles.flatMap(({ stage }) => {
    const stagePlan = createSyntheticPilotV2StagePlan(stage, judgmentSources);
    return renderStageDispatchesV3(stagePlan, judgmentSources).map((dispatch) => ({
      stage: dispatch.stage,
      modelAlias: dispatch.modelAlias,
      reasoning: dispatch.reasoning,
      batchOrdinal: dispatch.batchOrdinal,
      batchCount: dispatch.batchCount,
      itemCount: dispatch.itemIds.length,
      itemIds: [...dispatch.itemIds],
      blindedItemsSha256: dispatch.blindedItemsSha256,
      dispatchSha256: dispatch.dispatchSha256,
      dispatchByteLength: dispatch.bytes.length,
      dispatchBytesBase64: dispatch.bytes.toString('base64'),
    }));
  });
}

function derivePlan(exactPublicCommit, sources) {
  if (typeof exactPublicCommit !== 'string' || !/^[0-9a-f]{40}$/u.test(exactPublicCommit)) fail('exactPublicCommit', 'must be an externally pinned lowercase 40-character hexadecimal commit');
  validatePromptedScreeningV6Sources(sources);
  return {
    schema: PRE_DISPATCH_SCHEMA_V1,
    protocol: PRE_DISPATCH_PROTOCOL_V1,
    status: 'ready-no-transcript',
    sourceKind: 'synthetic-pilot',
    exactPublicCommit,
    sourceIdentities: sourceIdentitiesV6(sources),
    coordinator: { modelAlias: 'gpt-5.6-sol', reasoning: 'high' },
    judgmentAgentToolPolicy: 'none',
    judgmentStages: profiles.map((row) => ({ ...row })),
    audit: { modelAlias: 'gpt-5.6-sol', reasoning: 'high', toolPolicy: 'none', plannedDispatchCount: 1 },
    itemCount: 24,
    dispatchCount: 6,
    dispatches: deriveDispatches(sources),
  };
}

export function buildPreDispatchPlanV6({ exactPublicCommit, sources = loadPromptedScreeningV6Sources() }) {
  const plan = derivePlan(exactPublicCommit, sources);
  validatePreDispatchPlanV6(plan, { exactPublicCommit, sources });
  return plan;
}

export function validatePreDispatchPlanV6(plan, { exactPublicCommit, sources = loadPromptedScreeningV6Sources() }) {
  if (!exactKeys(plan, planKeys) || plan.schema !== PRE_DISPATCH_SCHEMA_V1 || plan.protocol !== PRE_DISPATCH_PROTOCOL_V1 || plan.status !== 'ready-no-transcript' || plan.sourceKind !== 'synthetic-pilot' || !exactKeys(plan.sourceIdentities, identityKeys) || !Array.isArray(plan.dispatches) || plan.dispatches.length !== 6 || plan.dispatches.some((row) => !exactKeys(row, dispatchKeys))) fail('plan', 'has an invalid closed pre-dispatch shape');
  const expected = derivePlan(exactPublicCommit, sources);
  if (!exact(plan, expected)) fail('plan', 'does not derive exactly from the externally pinned commit and authenticated source bytes');
  for (const [index, dispatch] of plan.dispatches.entries()) {
    const bytes = Buffer.from(dispatch.dispatchBytesBase64, 'base64');
    if (bytes.toString('base64') !== dispatch.dispatchBytesBase64 || bytes.length !== dispatch.dispatchByteLength || sha256(bytes) !== dispatch.dispatchSha256 || dispatch.itemIds.length !== dispatch.itemCount) fail(`plan.dispatches[${index}]`, 'has noncanonical or inconsistent bytes, digest, or item count');
  }
  return true;
}

export function renderPreDispatchPlanV6(options) {
  const plan = buildPreDispatchPlanV6(options);
  return Buffer.from(`${canonical(plan)}\n`, 'utf8');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const exactPublicCommit = process.argv[2];
  if (!exactPublicCommit) fail('usage', 'node scripts/plan-prompted-screening-v6.mjs <externally-pinned-public-commit>');
  process.stdout.write(renderPreDispatchPlanV6({ exactPublicCommit }));
}
