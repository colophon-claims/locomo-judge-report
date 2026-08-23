import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonical, sha256 } from './render-compact-process-audit-input-v1.mjs';
import { createSyntheticPilotV2StagePlan, renderStageDispatchesV3 } from './render-prompted-screening-dispatch-v3.mjs';
import { APPROVED_PROMPTED_SCREENING_V3_SHA256 } from './approved-prompted-screening-v3-identities.mjs';
import { APPROVED_PROMPTED_SCREENING_V5_SHA256 } from './approved-prompted-screening-v5-identities.mjs';
import { APPROVED_PROMPTED_SCREENING_V6_SHA256 } from './approved-prompted-screening-v6-identities.mjs';

export const PRE_DISPATCH_SCHEMA_V1 = 'https://colophon-claims.github.io/locomo-judge-report/prompted-screening-pre-dispatch-plan/v1';
export const PRE_DISPATCH_PROTOCOL_V1 = 'prompted-codex-screening-pre-dispatch/v1';
export const TEST_ONLY_SOURCE_REVISION_V6 = 'TEST_ONLY_UNCOMMITTED_V6_SOURCE';

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
const sourceRelativePaths = Object.freeze({
  coordinatorPromptBytes: 'CODEX-SCREENING-PROMPT.v6.md',
  judgmentProcedureBytes: 'CODEX-SCREENING-PROMPT.v3.md',
  judgmentInstructionBytes: 'CODEX-SCREENING-JUDGMENT-INSTRUCTION.v1.txt',
  screeningPoolOrFixtureBytes: 'fixtures/prompted-screening-pilot-v2.json',
  opaqueIdentityMappingBytes: 'fixtures/prompted-screening-pilot-v2-identity-map.canonical.json',
  dispatchOrderBytes: 'fixtures/prompted-screening-pilot-v2-dispatch-order.canonical.json',
  compactInputSchemaBytes: 'schemas/prompted-screening-runtime-compact-input.v1.schema.json',
  auditInstructionBytes: 'CODEX-SCREENING-AUDIT-INSTRUCTION.v2.txt',
  auditOutputSchemaBytes: 'schemas/prompted-screening-audit-output.v2.schema.json',
  auditOutputParserBytes: 'scripts/validate-prompted-screening-audit-output-v2.mjs',
  judgmentRendererBytes: 'scripts/render-prompted-screening-dispatch-v3.mjs',
  preDispatchSchemaBytes: 'schemas/prompted-screening-pre-dispatch-plan.v1.schema.json',
  runtimePrefixSchemaBytes: 'schemas/prompted-screening-judgment-prefix.v1.schema.json',
  finalTranscriptSchemaBytes: 'schemas/prompted-screening-final-transcript.v1.schema.json',
  preDispatchPlannerBytes: 'scripts/plan-prompted-screening-v6.mjs',
  runtimeBuilderBytes: 'scripts/build-prompted-screening-runtime-v6.mjs',
  runtimeGateBytes: 'scripts/gate-prompted-screening-runtime-v6.mjs',
  recorderBytes: 'scripts/record-prompted-screening-v6.mjs',
});
const sourceKeys = Object.keys(sourceRelativePaths);
const profiles = Object.freeze([
  Object.freeze({ stage: 'Luna', modelAlias: 'gpt-5.6-luna', reasoning: 'medium', batchLimit: 32, batchCount: 1 }),
  Object.freeze({ stage: 'Terra', modelAlias: 'gpt-5.6-terra', reasoning: 'high', batchLimit: 16, batchCount: 2 }),
  Object.freeze({ stage: 'Sol', modelAlias: 'gpt-5.6-sol', reasoning: 'high', batchLimit: 8, batchCount: 3 }),
]);
const planKeys = ['audit', 'coordinator', 'dispatchCount', 'dispatches', 'executionMode', 'itemCount', 'judgmentAgentToolPolicy', 'judgmentStages', 'protocol', 'schema', 'sourceIdentities', 'sourceKind', 'sourceRevision', 'sourceRevisionVerification', 'status'];
const dispatchKeys = ['batchCount', 'batchOrdinal', 'blindedItemsSha256', 'dispatchByteLength', 'dispatchBytesBase64', 'dispatchSha256', 'itemCount', 'itemIds', 'modelAlias', 'reasoning', 'stage'];
const identityKeys = ['auditInstructionSha256', 'auditOutputParserSha256', 'auditOutputSchemaSha256', 'compactInputSchemaSha256', 'coordinatorPromptSha256', 'dispatchOrderSha256', 'finalTranscriptSchemaSha256', 'judgmentInstructionSha256', 'judgmentProcedureSha256', 'judgmentRendererSha256', 'opaqueIdentityMappingSha256', 'preDispatchPlannerSha256', 'preDispatchSchemaSha256', 'recorderSha256', 'runtimeBuilderSha256', 'runtimeGateSha256', 'runtimePrefixSchemaSha256', 'screeningPoolOrFixtureSha256'];

function fail(path, detail) { throw new Error(`${path}: ${detail}`); }
function exactKeys(value, keys) { return value !== null && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join(',') === [...keys].sort().join(','); }
function exact(value, expected) { return canonical(value) === canonical(expected); }
function approvedIdentity(key) {
  const value = APPROVED_PROMPTED_SCREENING_V6_SHA256[key];
  if (typeof value !== 'string' || !/^sha256:[0-9a-f]{64}$/u.test(value) || /^sha256:0{64}$/u.test(value)) fail('approvedIdentities', `missing literal ${key}`);
  return value;
}
function git(repoRoot, args) {
  try { return execFileSync('git', ['-C', repoRoot, ...args], { encoding: args[0] === 'show' ? null : 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
  catch (error) { fail('git', `${args.join(' ')} failed: ${error.stderr?.toString('utf8').trim() || error.message}`); }
}
function parseArgs(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const key = args[index];
    if (!key.startsWith('--') || index + 1 >= args.length) fail('usage', 'expected --repo and optional --expected-public-commit values');
    parsed[key.slice(2)] = args[index + 1]; index += 1;
  }
  return parsed;
}

export function promptedScreeningV6SourceRelativePaths() { return { ...sourceRelativePaths }; }
export function loadPromptedScreeningV6Sources(root = repositoryRoot) { return Object.fromEntries(sourceKeys.map((key) => [key, readFileSync(resolve(root, sourceRelativePaths[key]))])); }

export function sourceIdentitiesV6(sources) {
  return {
    auditInstructionSha256: sha256(sources.auditInstructionBytes), auditOutputParserSha256: sha256(sources.auditOutputParserBytes), auditOutputSchemaSha256: sha256(sources.auditOutputSchemaBytes),
    compactInputSchemaSha256: sha256(sources.compactInputSchemaBytes), coordinatorPromptSha256: sha256(sources.coordinatorPromptBytes), dispatchOrderSha256: sha256(sources.dispatchOrderBytes),
    finalTranscriptSchemaSha256: sha256(sources.finalTranscriptSchemaBytes), judgmentInstructionSha256: sha256(sources.judgmentInstructionBytes), judgmentProcedureSha256: sha256(sources.judgmentProcedureBytes),
    judgmentRendererSha256: sha256(sources.judgmentRendererBytes), opaqueIdentityMappingSha256: sha256(sources.opaqueIdentityMappingBytes), preDispatchPlannerSha256: sha256(sources.preDispatchPlannerBytes),
    preDispatchSchemaSha256: sha256(sources.preDispatchSchemaBytes), recorderSha256: sha256(sources.recorderBytes), runtimeBuilderSha256: sha256(sources.runtimeBuilderBytes),
    runtimeGateSha256: sha256(sources.runtimeGateBytes), runtimePrefixSchemaSha256: sha256(sources.runtimePrefixSchemaBytes), screeningPoolOrFixtureSha256: sha256(sources.screeningPoolOrFixtureBytes),
  };
}

export function validatePromptedScreeningV6Sources(sources) {
  if (!exactKeys(sources, sourceKeys)) fail('sources', 'must supply every exact normative and runtime artifact');
  const expected = {
    coordinatorPromptBytes: approvedIdentity('coordinatorPromptV6'), judgmentProcedureBytes: APPROVED_PROMPTED_SCREENING_V3_SHA256.coordinatorPromptV3,
    judgmentInstructionBytes: APPROVED_PROMPTED_SCREENING_V3_SHA256.judgmentInstructionV1, screeningPoolOrFixtureBytes: APPROVED_PROMPTED_SCREENING_V3_SHA256.syntheticFixtureV2,
    opaqueIdentityMappingBytes: APPROVED_PROMPTED_SCREENING_V5_SHA256.syntheticIdentityMapping, dispatchOrderBytes: APPROVED_PROMPTED_SCREENING_V5_SHA256.syntheticDispatchOrder,
    compactInputSchemaBytes: approvedIdentity('runtimeCompactInputSchemaV1'), auditInstructionBytes: approvedIdentity('auditInstructionV2'), auditOutputSchemaBytes: approvedIdentity('auditOutputSchemaV2'),
    auditOutputParserBytes: approvedIdentity('auditOutputParserV2'), judgmentRendererBytes: APPROVED_PROMPTED_SCREENING_V3_SHA256.rendererV3,
    preDispatchSchemaBytes: approvedIdentity('preDispatchSchemaV1'), runtimePrefixSchemaBytes: approvedIdentity('runtimePrefixSchemaV1'), finalTranscriptSchemaBytes: approvedIdentity('finalTranscriptSchemaV1'),
    preDispatchPlannerBytes: approvedIdentity('preDispatchPlannerV1'), runtimeBuilderBytes: approvedIdentity('runtimeBuilderV1'), runtimeGateBytes: approvedIdentity('runtimeGateV1'), recorderBytes: approvedIdentity('recorderV1'),
  };
  for (const key of sourceKeys) if (!Buffer.isBuffer(sources[key]) || sha256(sources[key]) !== expected[key]) fail(`sources.${key}`, `must match literal approved ${expected[key]}`);
  const mapping = JSON.parse(sources.opaqueIdentityMappingBytes.toString('utf8'));
  const order = JSON.parse(sources.dispatchOrderBytes.toString('utf8'));
  const fixture = JSON.parse(sources.screeningPoolOrFixtureBytes.toString('utf8'));
  if (sources.opaqueIdentityMappingBytes.toString('utf8') !== canonical(mapping) || sources.dispatchOrderBytes.toString('utf8') !== canonical(order)
    || !exact(mapping, fixture.cases.map((row) => [row.pilotCaseId, row.judgmentItemId])) || !exact(order, fixture.dispatchOrder)) fail('sources.mapping', 'mapping and order must join every exact fixture identity');
  return true;
}

export function verifyProductionSourceRevisionObjectsV6({ repoRoot = repositoryRoot, revision, sources = loadPromptedScreeningV6Sources(repoRoot) }) {
  if (typeof revision !== 'string' || !/^[0-9a-f]{40}$/u.test(revision)) fail('sourceRevision', 'must be a lowercase 40-character commit');
  validatePromptedScreeningV6Sources(sources);
  for (const key of sourceKeys) {
    const objectBytes = git(repoRoot, ['show', `${revision}:${sourceRelativePaths[key]}`]);
    if (!Buffer.from(objectBytes).equals(sources[key])) fail(`sourceRevision.${sourceRelativePaths[key]}`, 'Git object bytes do not match the authenticated local source bytes');
  }
  return true;
}

export function resolveProductionSourceRevisionV6({ repoRoot = repositoryRoot, expectedPublicCommit, sources = loadPromptedScreeningV6Sources(repoRoot) } = {}) {
  const resolvedRoot = resolve(repoRoot);
  if (resolve(git(resolvedRoot, ['rev-parse', '--show-toplevel']).trim()) !== resolvedRoot) fail('checkout', 'repoRoot must be the exact Git checkout root');
  const revision = git(resolvedRoot, ['rev-parse', 'HEAD']).trim();
  if (!/^[0-9a-f]{40}$/u.test(revision)) fail('checkout', 'HEAD is not an exact commit');
  if (expectedPublicCommit !== undefined && revision !== expectedPublicCommit) fail('checkout', `HEAD ${revision} does not match --expected-public-commit ${expectedPublicCommit}`);
  if (git(resolvedRoot, ['status', '--porcelain=v1', '--untracked-files=all']).length !== 0) fail('checkout', 'production planning requires a tracked-clean exact checkout');
  verifyProductionSourceRevisionObjectsV6({ repoRoot: resolvedRoot, revision, sources });
  return revision;
}

function deriveDispatches(sources) {
  const judgmentSources = { promptBytes: sources.judgmentProcedureBytes, instructionBytes: sources.judgmentInstructionBytes, fixtureBytes: sources.screeningPoolOrFixtureBytes, rendererBytes: sources.judgmentRendererBytes };
  return profiles.flatMap(({ stage }) => renderStageDispatchesV3(createSyntheticPilotV2StagePlan(stage, judgmentSources), judgmentSources).map((dispatch) => ({
    stage: dispatch.stage, modelAlias: dispatch.modelAlias, reasoning: dispatch.reasoning, batchOrdinal: dispatch.batchOrdinal, batchCount: dispatch.batchCount,
    itemCount: dispatch.itemIds.length, itemIds: [...dispatch.itemIds], blindedItemsSha256: dispatch.blindedItemsSha256, dispatchSha256: dispatch.dispatchSha256,
    dispatchByteLength: dispatch.bytes.length, dispatchBytesBase64: dispatch.bytes.toString('base64'),
  })));
}

function derivePlan({ sourceRevision, executionMode, sources }) {
  const production = executionMode === 'production-recording';
  if (!production && executionMode !== 'test-only-simulation') fail('executionMode', 'must be production-recording or test-only-simulation');
  if ((production && !/^[0-9a-f]{40}$/u.test(sourceRevision)) || (!production && sourceRevision !== TEST_ONLY_SOURCE_REVISION_V6)) fail('sourceRevision', 'does not match the execution mode');
  validatePromptedScreeningV6Sources(sources);
  return {
    schema: PRE_DISPATCH_SCHEMA_V1, protocol: PRE_DISPATCH_PROTOCOL_V1, status: 'ready-no-transcript', sourceKind: 'synthetic-pilot', executionMode, sourceRevision,
    sourceRevisionVerification: production ? 'clean-git-object-verified' : 'test-only-sentinel', sourceIdentities: sourceIdentitiesV6(sources),
    coordinator: { modelAlias: 'gpt-5.6-sol', reasoning: 'high' }, judgmentAgentToolPolicy: 'none', judgmentStages: profiles.map((row) => ({ ...row })),
    audit: { modelAlias: 'gpt-5.6-sol', reasoning: 'high', toolPolicy: 'none', plannedDispatchCount: 1 }, itemCount: 24, dispatchCount: 6, dispatches: deriveDispatches(sources),
  };
}

export function buildTestPreDispatchPlanV6({ sources = loadPromptedScreeningV6Sources() } = {}) { return derivePlan({ sourceRevision: TEST_ONLY_SOURCE_REVISION_V6, executionMode: 'test-only-simulation', sources }); }
export function buildProductionPreDispatchPlanV6({ repoRoot = repositoryRoot, expectedPublicCommit, sources = loadPromptedScreeningV6Sources(repoRoot) } = {}) {
  return derivePlan({ sourceRevision: resolveProductionSourceRevisionV6({ repoRoot, expectedPublicCommit, sources }), executionMode: 'production-recording', sources });
}
export function validatePreDispatchPlanV6(plan, { sources = loadPromptedScreeningV6Sources() } = {}) {
  if (!exactKeys(plan, planKeys) || plan.schema !== PRE_DISPATCH_SCHEMA_V1 || plan.protocol !== PRE_DISPATCH_PROTOCOL_V1 || plan.status !== 'ready-no-transcript' || plan.sourceKind !== 'synthetic-pilot' || !exactKeys(plan.sourceIdentities, identityKeys) || !Array.isArray(plan.dispatches) || plan.dispatches.length !== 6 || plan.dispatches.some((row) => !exactKeys(row, dispatchKeys))) fail('plan', 'has an invalid closed pre-dispatch shape');
  if (!exact(plan, derivePlan({ sourceRevision: plan.sourceRevision, executionMode: plan.executionMode, sources }))) fail('plan', 'does not derive exactly from its authenticated sources and execution mode');
  for (const [index, dispatch] of plan.dispatches.entries()) {
    const bytes = Buffer.from(dispatch.dispatchBytesBase64, 'base64');
    if (bytes.toString('base64') !== dispatch.dispatchBytesBase64 || bytes.length !== dispatch.dispatchByteLength || sha256(bytes) !== dispatch.dispatchSha256 || dispatch.itemIds.length !== dispatch.itemCount) fail(`plan.dispatches[${index}]`, 'has noncanonical or inconsistent bytes, digest, or item count');
  }
  return true;
}
export function renderPreDispatchPlanV6({ plan, sources = loadPromptedScreeningV6Sources() }) { validatePreDispatchPlanV6(plan, { sources }); return Buffer.from(`${canonical(plan)}\n`, 'utf8'); }

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = args.repo ? resolve(args.repo) : repositoryRoot;
  const sources = loadPromptedScreeningV6Sources(repoRoot);
  const plan = buildProductionPreDispatchPlanV6({ repoRoot, expectedPublicCommit: args['expected-public-commit'], sources });
  process.stdout.write(renderPreDispatchPlanV6({ plan, sources }));
}
