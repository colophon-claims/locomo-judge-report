import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonical, MAX_COMPACT_PROCESS_AUDIT_BYTES, sha256, validateCompactProcessAuditInput } from './render-compact-process-audit-input-v1.mjs';
import { AUDIT_ACCEPTANCE_POLICY, CAPABILITY_BOUNDARY, DIGEST_SEMANTICS, SYNTHETIC_SELECTION_BASIS, encodeBatchColumns } from './render-compact-process-audit-input-v2.mjs';
import { buildProductionPreDispatchPlanV6, loadPromptedScreeningV6Sources, sourceIdentitiesV6, validatePreDispatchPlanV6 } from './plan-prompted-screening-v6.mjs';

export const JUDGMENT_PREFIX_PROTOCOL_V1 = 'prompted-codex-screening-judgment-prefix/v1';
export const RUNTIME_COMPACT_INPUT_SCHEMA_V1 = 'https://colophon-claims.github.io/locomo-judge-report/prompted-screening-runtime-compact-input/v1';
export const RUNTIME_COMPACT_INPUT_PROTOCOL_V1 = 'prompted-codex-screening-runtime-compact-input/v1';

const profiles = Object.freeze([
  Object.freeze({ stage: 'Luna', modelAlias: 'gpt-5.6-luna', reasoning: 'medium', batchLimit: 32, batchCount: 1 }),
  Object.freeze({ stage: 'Terra', modelAlias: 'gpt-5.6-terra', reasoning: 'high', batchLimit: 16, batchCount: 2 }),
  Object.freeze({ stage: 'Sol', modelAlias: 'gpt-5.6-sol', reasoning: 'high', batchLimit: 8, batchCount: 3 }),
]);
const classes = ['correct', 'specific-wrong', 'vague-topical-wrong'];
const strata = ['category-1', 'category-2', 'category-3', 'category-4'];
const verdictAlphabet = ['CORRECT', 'WRONG', 'UNSURE'];
const runKeys = ['auditProfile', 'capabilityBoundary', 'coordinator', 'event', 'executionMode', 'expectedJudgmentDispatchCount', 'expectedProcessAuditDispatchCount', 'judgmentAgentToolPolicy', 'judgmentProfiles', 'modelRunOccurred', 'operatorAttestation', 'planSha256', 'protocol', 'realScreeningOccurred', 'reuseAllowed', 'runId', 'sourceIdentities', 'sourceKind', 'sourceRevision', 'testOnly'];
const preflightKeys = ['dispatchCount', 'event', 'itemCount', 'planByteLength', 'planSha256', 'sourceIdentitiesSha256', 'sourceRevision'];
const dispatchKeys = ['batchCount', 'batchOrdinal', 'blindedItemsSha256', 'dispatchByteLength', 'dispatchBytesBase64', 'dispatchSha256', 'event', 'itemCount', 'modelAlias', 'reasoning', 'sourceIdentitiesSha256', 'stage', 'taskId'];
const outputKeys = ['batchOrdinal', 'event', 'infrastructureFailureCount', 'modelAlias', 'rawOutputBase64', 'rawOutputByteLength', 'rawOutputSha256', 'reasoning', 'retryCount', 'stage', 'taskId', 'toolCallCount'];
const attestationKeys = ['attestedBy', 'kind', 'modelRunOccurred', 'testOnly'];
const capabilityBoundary = Object.freeze({ recordedEventSeparation: 'machine-verified-from-canonical-prefix', providerExecution: 'not-machine-verified', providerProcessFreshness: 'not-machine-verified', modelRouting: 'not-machine-verified', promptCompliance: 'not-machine-verified', invariantAliasWeights: 'not-machine-verified' });
const compactKeys = ['aggregateTiming', 'aggregates', 'auditAcceptancePolicy', 'auditScope', 'batches', 'capabilityBoundary', 'cells', 'declarations', 'digestSemantics', 'executionKind', 'executionMode', 'itemCount', 'judgmentTranscriptPrefixSha256', 'modelRunOccurred', 'operatorAttestation', 'planSha256', 'protocol', 'publicArtifacts', 'runId', 'schema', 'selectionBasis', 'sourceKind', 'sourceRevision', 'testOnly'];

function fail(path, detail) { throw new Error(`${path}: ${detail}`); }
function exactKeys(value, keys) { return value !== null && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join(',') === [...keys].sort().join(','); }
function exact(value, expected) { return canonical(value) === canonical(expected); }
function exactBytes(a, b) { return Buffer.from(a).equals(Buffer.from(b)); }
function sum(rows, key) { return rows.reduce((total, row) => total + row[key], 0); }
function decodeBase64Exact(value, path) {
  if (typeof value !== 'string' || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(value)) fail(path, 'must be canonical padded base64');
  const bytes = Buffer.from(value, 'base64'); if (bytes.toString('base64') !== value) fail(path, 'must decode and re-encode byte-identically'); return bytes;
}
function parseCanonicalJsonLine(line, path) { let value; try { value = JSON.parse(line); } catch { fail(path, 'must be JSON'); } if (line !== canonical(value)) fail(path, 'must be exact compact canonical JSON'); return value; }
function parseArgs(args) { const out = {}; for (let i = 0; i < args.length; i += 2) { if (!args[i]?.startsWith('--') || args[i + 1] === undefined) fail('usage', 'expected --repo, --expected-public-commit, and --prefix values'); out[args[i].slice(2)] = args[i + 1]; } return out; }

function validateAttestation(plan, value) {
  if (!exactKeys(value, attestationKeys) || typeof value.attestedBy !== 'string' || !/^[a-z0-9][a-z0-9._/-]{2,127}$/u.test(value.attestedBy)) fail('operatorAttestation', 'has an invalid closed shape or attester');
  const expected = plan.executionMode === 'test-only-simulation'
    ? { kind: 'test-only-no-model', attestedBy: 'test-harness', modelRunOccurred: false, testOnly: true }
    : { kind: 'operator-recorded-model-run', attestedBy: value.attestedBy, modelRunOccurred: true, testOnly: false };
  if (!exact(value, expected)) fail('operatorAttestation', 'does not match the immutable execution mode');
  return expected;
}

function parseRawOutput(bytes, expectedIds, path) {
  let rows; try { rows = JSON.parse(bytes.toString('utf8')); } catch { fail(path, 'must be JSON'); }
  if (!Array.isArray(rows) || rows.length !== expectedIds.length || bytes.toString('utf8') !== `${canonical(rows)}\n`) fail(path, 'must be the exact canonical ordered verdict array plus one LF');
  const seen = new Set(); rows.forEach((row, index) => { if (!exactKeys(row, ['itemId', 'verdict']) || row.itemId !== expectedIds[index] || seen.has(row.itemId) || !verdictAlphabet.includes(row.verdict)) fail(`${path}[${index}]`, 'has a missing, extra, duplicate, reordered, changed-ID, or invalid-alphabet verdict'); seen.add(row.itemId); });
  return rows;
}

export function validateRawJudgmentOutputV6({ outputBytes, itemIds, path = 'outputBytes' }) {
  parseRawOutput(outputBytes, itemIds, path);
  return true;
}

function deriveCells(fixture, verdictByStage) {
  const byId = new Map(fixture.cases.map((row) => [row.judgmentItemId, row]));
  return classes.flatMap((candidateClass) => strata.map((stratum) => {
    const ids = fixture.dispatchOrder.filter((id) => byId.get(id).candidateClass === candidateClass && byId.get(id).stratum === stratum);
    const jointVerdictCounts = Array(27).fill(0); const marginals = Object.fromEntries(profiles.map(({ stage }) => [stage, [0, 0, 0]])); let threeStageAgreementCount = 0;
    for (const id of ids) { const axes = profiles.map(({ stage }) => verdictAlphabet.indexOf(verdictByStage.get(stage).get(id))); jointVerdictCounts[(axes[0] * 9) + (axes[1] * 3) + axes[2]] += 1; profiles.forEach(({ stage }, index) => { marginals[stage][axes[index]] += 1; }); if (axes[0] === axes[1] && axes[1] === axes[2]) threeStageAgreementCount += 1; }
    const counts = ([correctCount, wrongCount, unsureCount]) => ({ correctCount, wrongCount, unsureCount });
    return { candidateClass, stratum, itemCount: ids.length, jointVerdictCounts, luna: counts(marginals.Luna), terra: counts(marginals.Terra), sol: counts(marginals.Sol), threeStageAgreementCount, anyDisagreementCount: ids.length - threeStageAgreementCount, invalidCount: 0 };
  }));
}
function deriveAgreements(cells) {
  const result = { threeStageAgreementCount: 0, anyDisagreementCount: 0, lunaTerraDisagreementCount: 0, lunaSolDisagreementCount: 0, terraSolDisagreementCount: 0, lunaOnlyDisagreesCount: 0, terraOnlyDisagreesCount: 0, solOnlyDisagreesCount: 0, allDifferentCount: 0 };
  for (const cell of cells) for (let luna = 0; luna < 3; luna += 1) for (let terra = 0; terra < 3; terra += 1) for (let sol = 0; sol < 3; sol += 1) {
    const count = cell.jointVerdictCounts[(luna * 9) + (terra * 3) + sol];
    if (luna === terra && terra === sol) result.threeStageAgreementCount += count; else { result.anyDisagreementCount += count; if (terra === sol) result.lunaOnlyDisagreesCount += count; else if (luna === sol) result.terraOnlyDisagreesCount += count; else if (luna === terra) result.solOnlyDisagreesCount += count; else result.allDifferentCount += count; }
    if (luna !== terra) result.lunaTerraDisagreementCount += count; if (luna !== sol) result.lunaSolDisagreementCount += count; if (terra !== sol) result.terraSolDisagreementCount += count;
  }
  return result;
}

export function constructJudgmentPrefixV6({ plan, runId, receipts, operatorAttestation, sources = loadPromptedScreeningV6Sources() }) {
  validatePreDispatchPlanV6(plan, { sources });
  if (typeof runId !== 'string' || !/^[a-z0-9][a-z0-9-]{7,127}$/u.test(runId) || !Array.isArray(receipts) || receipts.length !== 6) fail('prefix', 'requires a valid runId and exactly six receipts');
  const attestation = validateAttestation(plan, operatorAttestation);
  const planBytes = Buffer.from(`${canonical(plan)}\n`); const sourceIdentities = sourceIdentitiesV6(sources); const sourceIdentitiesSha256 = sha256(Buffer.from(`${canonical(sourceIdentities)}\n`));
  const events = [{ event: 'run-declaration', protocol: JUDGMENT_PREFIX_PROTOCOL_V1, runId, sourceKind: 'synthetic-pilot', sourceRevision: plan.sourceRevision, planSha256: sha256(planBytes), sourceIdentities, executionMode: plan.executionMode, testOnly: attestation.testOnly, modelRunOccurred: attestation.modelRunOccurred, operatorAttestation: attestation, coordinator: { modelAlias: 'gpt-5.6-sol', reasoning: 'high' }, judgmentAgentToolPolicy: 'none', judgmentProfiles: profiles.map((row) => ({ ...row })), auditProfile: { modelAlias: 'gpt-5.6-sol', reasoning: 'high', toolPolicy: 'none' }, expectedJudgmentDispatchCount: 6, expectedProcessAuditDispatchCount: 1, reuseAllowed: false, realScreeningOccurred: false, capabilityBoundary: { ...capabilityBoundary } }, { event: 'preflight-plan', sourceRevision: plan.sourceRevision, planSha256: sha256(planBytes), planByteLength: planBytes.length, sourceIdentitiesSha256, itemCount: 24, dispatchCount: 6 }];
  const tasks = new Set();
  receipts.forEach((receipt, index) => {
    const dispatch = plan.dispatches[index];
    if (!exactKeys(receipt, ['infrastructureFailureCount', 'outputBytes', 'retryCount', 'taskId', 'toolCallCount']) || !Buffer.isBuffer(receipt.outputBytes) || typeof receipt.taskId !== 'string' || !/^[a-z0-9][a-z0-9/_-]{7,191}$/u.test(receipt.taskId) || tasks.has(receipt.taskId) || receipt.infrastructureFailureCount !== 0 || receipt.retryCount !== 0 || receipt.toolCallCount !== 0) fail(`receipts[${index}]`, 'must be one unique exact zero-failure, zero-retry, zero-tool receipt');
    parseRawOutput(receipt.outputBytes, dispatch.itemIds, `receipts[${index}].outputBytes`); tasks.add(receipt.taskId);
    events.push({ event: 'judgment-dispatch', taskId: receipt.taskId, stage: dispatch.stage, modelAlias: dispatch.modelAlias, reasoning: dispatch.reasoning, batchOrdinal: dispatch.batchOrdinal, batchCount: dispatch.batchCount, itemCount: dispatch.itemCount, sourceIdentitiesSha256, blindedItemsSha256: dispatch.blindedItemsSha256, dispatchSha256: dispatch.dispatchSha256, dispatchByteLength: dispatch.dispatchByteLength, dispatchBytesBase64: dispatch.dispatchBytesBase64 });
    events.push({ event: 'judgment-output', taskId: receipt.taskId, stage: dispatch.stage, modelAlias: dispatch.modelAlias, reasoning: dispatch.reasoning, batchOrdinal: dispatch.batchOrdinal, rawOutputSha256: sha256(receipt.outputBytes), rawOutputByteLength: receipt.outputBytes.length, rawOutputBase64: receipt.outputBytes.toString('base64'), infrastructureFailureCount: 0, retryCount: 0, toolCallCount: 0 });
  });
  const prefixBytes = Buffer.from(`${events.map(canonical).join('\n')}\n`); parseJudgmentPrefixV6({ plan, prefixBytes, sources }); return prefixBytes;
}

export function parseJudgmentPrefixV6({ plan, prefixBytes, sources = loadPromptedScreeningV6Sources() }) {
  validatePreDispatchPlanV6(plan, { sources }); if (!Buffer.isBuffer(prefixBytes)) fail('prefixBytes', 'must be exact bytes');
  const text = prefixBytes.toString('utf8'); if (!Buffer.from(text).equals(prefixBytes) || !text.endsWith('\n') || text.includes('\r') || text.includes(String.fromCodePoint(0x2014))) fail('prefixBytes', 'must be LF-terminated canonical UTF-8 JSONL without em dash');
  const lines = text.slice(0, -1).split('\n'); if (lines.length !== 14) fail('prefixBytes', 'must contain exactly one declaration, one preflight, and six dispatch/output pairs');
  const events = lines.map((line, index) => parseCanonicalJsonLine(line, `prefixBytes[${index}]`)); const planBytes = Buffer.from(`${canonical(plan)}\n`); const planSha256 = sha256(planBytes); const sourceIdentities = sourceIdentitiesV6(sources); const sourceIdentitiesSha256 = sha256(Buffer.from(`${canonical(sourceIdentities)}\n`));
  const attestation = validateAttestation(plan, events[0]?.operatorAttestation);
  const expectedRun = { event: 'run-declaration', protocol: JUDGMENT_PREFIX_PROTOCOL_V1, runId: events[0]?.runId, sourceKind: 'synthetic-pilot', sourceRevision: plan.sourceRevision, planSha256, sourceIdentities, executionMode: plan.executionMode, testOnly: attestation.testOnly, modelRunOccurred: attestation.modelRunOccurred, operatorAttestation: attestation, coordinator: { modelAlias: 'gpt-5.6-sol', reasoning: 'high' }, judgmentAgentToolPolicy: 'none', judgmentProfiles: profiles.map((row) => ({ ...row })), auditProfile: { modelAlias: 'gpt-5.6-sol', reasoning: 'high', toolPolicy: 'none' }, expectedJudgmentDispatchCount: 6, expectedProcessAuditDispatchCount: 1, reuseAllowed: false, realScreeningOccurred: false, capabilityBoundary: { ...capabilityBoundary } };
  if (!exactKeys(events[0], runKeys) || typeof events[0].runId !== 'string' || !/^[a-z0-9][a-z0-9-]{7,127}$/u.test(events[0].runId) || !exact(events[0], expectedRun)) fail('prefixBytes[0]', 'does not match the exact closed run declaration, revision, mode, attestation, profiles, sources, or boundary');
  const expectedPreflight = { event: 'preflight-plan', sourceRevision: plan.sourceRevision, planSha256, planByteLength: planBytes.length, sourceIdentitiesSha256, itemCount: 24, dispatchCount: 6 };
  if (!exactKeys(events[1], preflightKeys) || !exact(events[1], expectedPreflight)) fail('prefixBytes[1]', 'does not bind the exact pre-dispatch plan and source identities');
  const taskIds = new Set(); const eventDigests = new Set(); const verdictByStage = new Map(profiles.map(({ stage }) => [stage, new Map()])); const batches = [];
  plan.dispatches.forEach((expectedDispatch, index) => {
    const dispatchIndex = 2 + (index * 2); const outputIndex = dispatchIndex + 1; const dispatch = events[dispatchIndex]; const output = events[outputIndex];
    if (!exactKeys(dispatch, dispatchKeys) || !exactKeys(output, outputKeys) || dispatch.event !== 'judgment-dispatch' || output.event !== 'judgment-output') fail(`prefixBytes.pair[${index}]`, 'must be one exact closed dispatch/output pair');
    const dispatchBytes = decodeBase64Exact(dispatch.dispatchBytesBase64, `prefixBytes[${dispatchIndex}].dispatchBytesBase64`); const outputBytes = decodeBase64Exact(output.rawOutputBase64, `prefixBytes[${outputIndex}].rawOutputBase64`); const expectedDispatchBytes = Buffer.from(expectedDispatch.dispatchBytesBase64, 'base64');
    const taskValid = typeof dispatch.taskId === 'string' && /^[a-z0-9][a-z0-9/_-]{7,191}$/u.test(dispatch.taskId) && dispatch.taskId === output.taskId && !taskIds.has(dispatch.taskId);
    if (!taskValid || dispatch.stage !== expectedDispatch.stage || output.stage !== expectedDispatch.stage || dispatch.modelAlias !== expectedDispatch.modelAlias || output.modelAlias !== expectedDispatch.modelAlias || dispatch.reasoning !== expectedDispatch.reasoning || output.reasoning !== expectedDispatch.reasoning || dispatch.batchOrdinal !== expectedDispatch.batchOrdinal || output.batchOrdinal !== expectedDispatch.batchOrdinal || dispatch.batchCount !== expectedDispatch.batchCount || dispatch.itemCount !== expectedDispatch.itemCount || dispatch.sourceIdentitiesSha256 !== sourceIdentitiesSha256 || dispatch.blindedItemsSha256 !== expectedDispatch.blindedItemsSha256 || dispatch.dispatchSha256 !== expectedDispatch.dispatchSha256 || dispatch.dispatchByteLength !== expectedDispatch.dispatchByteLength || !exactBytes(dispatchBytes, expectedDispatchBytes) || output.rawOutputSha256 !== sha256(outputBytes) || output.rawOutputByteLength !== outputBytes.length || output.infrastructureFailureCount !== 0 || output.retryCount !== 0 || output.toolCallCount !== 0) fail(`prefixBytes.pair[${index}]`, 'does not join exact task, profile, batch, source, dispatch, output, retry, failure, and tool evidence');
    const rows = parseRawOutput(outputBytes, expectedDispatch.itemIds, `prefixBytes[${outputIndex}].rawOutputBase64`); taskIds.add(dispatch.taskId); const dispatchEventSha256 = sha256(Buffer.from(`${lines[dispatchIndex]}\n`)); const outputEventSha256 = sha256(Buffer.from(`${lines[outputIndex]}\n`));
    for (const digest of [dispatchEventSha256, outputEventSha256]) { if (eventDigests.has(digest)) fail(`prefixBytes.pair[${index}]`, 'reuses or duplicates a transcript event identity'); eventDigests.add(digest); }
    rows.forEach((row) => verdictByStage.get(expectedDispatch.stage).set(row.itemId, row.verdict)); batches.push({ stage: expectedDispatch.stage, batchOrdinal: expectedDispatch.batchOrdinal, batchCount: expectedDispatch.batchCount, itemCount: expectedDispatch.itemCount, blindedItemsSha256: expectedDispatch.blindedItemsSha256, dispatchSha256: expectedDispatch.dispatchSha256, rawOutputSha256: sha256(outputBytes), transcriptDispatchEventSha256: dispatchEventSha256, transcriptOutputEventSha256: outputEventSha256, rawOutputRecordCount: rows.length, routedVerdictCount: rows.length, correctCount: rows.filter((row) => row.verdict === 'CORRECT').length, wrongCount: rows.filter((row) => row.verdict === 'WRONG').length, unsureCount: rows.filter((row) => row.verdict === 'UNSURE').length, invalidCount: 0, missingCount: 0, extraCount: 0, duplicateCount: 0, infrastructureFailureCount: 0, retryCount: 0, toolCallCount: 0 });
  });
  return { runId: events[0].runId, planSha256, sourceIdentitiesSha256, judgmentTranscriptPrefixSha256: sha256(prefixBytes), batches, verdictByStage, executionMode: plan.executionMode, testOnly: attestation.testOnly, modelRunOccurred: attestation.modelRunOccurred, operatorAttestation: attestation, taskIds: [...taskIds] };
}

function toLegacy(value) {
  const publicArtifacts = Object.fromEntries(Object.entries(value.publicArtifacts).filter(([key]) => !['compactRendererSha256', 'compactSchemaSha256', 'judgmentProcedureSha256', 'processAuditInstructionSha256', 'processAuditOutputSchemaSha256'].includes(key)));
  return { schema: 'https://colophon-claims.github.io/locomo-judge-report/compact-process-audit-input/v1', protocol: 'prompted-codex-screening-compact-process-audit/v1', sourceKind: value.sourceKind, publicArtifacts, declarations: value.declarations, auditScope: { ...value.auditScope, rawIntegrityBasis: 'machine-validation-flags-and-digests' }, itemCount: value.itemCount, judgmentTranscriptPrefixSha256: value.judgmentTranscriptPrefixSha256, batches: value._decodedBatches.map((row) => [row.stage, row.batchOrdinal, row.batchCount, row.itemCount, row.blindedItemsSha256, row.dispatchSha256, row.rawOutputSha256, row.rawOutputRecordCount, row.routedVerdictCount, row.correctCount, row.wrongCount, row.unsureCount, row.invalidCount, row.missingCount, row.extraCount, row.duplicateCount, row.infrastructureFailureCount, row.retryCount, row.toolCallCount, true, true, true, []]), aggregates: value.aggregates, cells: value.cells, aggregateTiming: value.aggregateTiming };
}

export function buildRuntimeCompactInputV6({ plan, prefixBytes, sources = loadPromptedScreeningV6Sources() }) {
  validatePreDispatchPlanV6(plan, { sources }); const replay = parseJudgmentPrefixV6({ plan, prefixBytes, sources }); const fixture = JSON.parse(sources.screeningPoolOrFixtureBytes.toString('utf8')); const cells = deriveCells(fixture, replay.verdictByStage); const sourceIdentities = sourceIdentitiesV6(sources);
  const publicArtifacts = { repository: 'https://github.com/colophon-claims/locomo-judge-report', sourceRevision: plan.sourceRevision, coordinatorPromptSha256: sourceIdentities.coordinatorPromptSha256, judgmentInstructionSha256: sourceIdentities.judgmentInstructionSha256, screeningProcedureSha256: sourceIdentities.coordinatorPromptSha256, screeningPoolOrFixtureSha256: sourceIdentities.screeningPoolOrFixtureSha256, opaqueIdentityMappingSha256: sourceIdentities.opaqueIdentityMappingSha256, dispatchOrderSha256: sourceIdentities.dispatchOrderSha256, samplingCommitmentSha256: null, samplingScriptSha256: null, rendererSha256: sourceIdentities.judgmentRendererSha256, judgmentProcedureSha256: sourceIdentities.judgmentProcedureSha256, compactSchemaSha256: sourceIdentities.compactInputSchemaSha256, compactRendererSha256: sourceIdentities.runtimeBuilderSha256, processAuditInstructionSha256: sourceIdentities.auditInstructionSha256, processAuditOutputSchemaSha256: sourceIdentities.auditOutputSchemaSha256 };
  const value = { schema: RUNTIME_COMPACT_INPUT_SCHEMA_V1, protocol: RUNTIME_COMPACT_INPUT_PROTOCOL_V1, runId: replay.runId, planSha256: replay.planSha256, sourceRevision: plan.sourceRevision, executionMode: replay.executionMode, executionKind: replay.testOnly ? 'test-only-recorded-events' : 'recorded-model-run', testOnly: replay.testOnly, modelRunOccurred: replay.modelRunOccurred, operatorAttestation: replay.operatorAttestation, sourceKind: 'synthetic-pilot', publicArtifacts, declarations: { coordinator: { modelAlias: 'gpt-5.6-sol', reasoning: 'high' }, judgmentStages: profiles.map((row) => ({ ...row })), processAudit: { modelAlias: 'gpt-5.6-sol', reasoning: 'high', toolPolicy: 'none' } }, auditScope: { inputBoundary: 'canonical-summary-only', mayInspect: ['coverage', 'declaration-drift', 'suspicious-agreement', 'cross-stage-asymmetry', 'process-defects'], mustNot: 'reperform-item-judgments', publicVerificationBoundary: 'later-verifier-resolves-and-hashes-published-artifacts', rawIntegrityBasis: 'derived-from-exact-authenticated-source-and-prefix-bytes' }, itemCount: 24, judgmentTranscriptPrefixSha256: replay.judgmentTranscriptPrefixSha256, batches: encodeBatchColumns(replay.batches), aggregates: { judgmentCount: 72, verdicts: profiles.map(({ stage }) => { const rows = replay.batches.filter((row) => row.stage === stage); return { stage, correctCount: sum(rows, 'correctCount'), wrongCount: sum(rows, 'wrongCount'), unsureCount: sum(rows, 'unsureCount') }; }), invalidCount: 0, missingCount: 0, extraCount: 0, duplicateCount: 0, infrastructureFailureCount: 0, retryCount: 0, judgmentAgentToolCallCount: 0, agreements: deriveAgreements(cells) }, cells, aggregateTiming: 'after-all-judgment-outputs-before-process-audit', selectionBasis: structuredClone(SYNTHETIC_SELECTION_BASIS), digestSemantics: structuredClone(DIGEST_SEMANTICS), capabilityBoundary: structuredClone(CAPABILITY_BOUNDARY), auditAcceptancePolicy: structuredClone(AUDIT_ACCEPTANCE_POLICY) };
  if (!exactKeys(value, compactKeys) || (value.testOnly !== (value.executionMode === 'test-only-simulation')) || (value.modelRunOccurred === value.testOnly) || (value.executionKind === 'recorded-model-run') !== !value.testOnly) fail('runtimeInput', 'has inconsistent closed execution evidence');
  if (!value.testOnly) validateCompactProcessAuditInput(toLegacy({ ...value, _decodedBatches: replay.batches }));
  return value;
}
export function renderRuntimeCompactInputV6(options) { const value = buildRuntimeCompactInputV6(options); const bytes = Buffer.from(`${canonical(value)}\n`); if (bytes.length > MAX_COMPACT_PROCESS_AUDIT_BYTES) fail('runtimeInput', `exceeds ${MAX_COMPACT_PROCESS_AUDIT_BYTES} bytes`); return bytes; }

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = parseArgs(process.argv.slice(2)); if (!args.prefix) fail('usage', 'node scripts/build-prompted-screening-runtime-v6.mjs --prefix <path> [--repo <path>] [--expected-public-commit <sha>]');
  const repoRoot = args.repo ? resolve(args.repo) : fileURLToPath(new URL('..', import.meta.url)); const sources = loadPromptedScreeningV6Sources(repoRoot); const plan = buildProductionPreDispatchPlanV6({ repoRoot, expectedPublicCommit: args['expected-public-commit'], sources }); process.stdout.write(renderRuntimeCompactInputV6({ plan, prefixBytes: readFileSync(args.prefix), sources }));
}
