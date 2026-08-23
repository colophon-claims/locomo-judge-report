import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { canonical, MAX_COMPACT_PROCESS_AUDIT_BYTES, sha256, validateCompactProcessAuditInput } from './render-compact-process-audit-input-v1.mjs';
import {
  AUDIT_ACCEPTANCE_POLICY,
  CAPABILITY_BOUNDARY,
  COMPACT_PROCESS_AUDIT_PROTOCOL_V2,
  COMPACT_PROCESS_AUDIT_SCHEMA_V2,
  DIGEST_SEMANTICS,
  SYNTHETIC_SELECTION_BASIS,
  encodeBatchColumns,
} from './render-compact-process-audit-input-v2.mjs';
import {
  buildPreDispatchPlanV6,
  loadPromptedScreeningV6Sources,
  sourceIdentitiesV6,
  validatePreDispatchPlanV6,
} from './plan-prompted-screening-v6.mjs';

export const JUDGMENT_PREFIX_PROTOCOL_V1 = 'prompted-codex-screening-judgment-prefix/v1';

const profiles = Object.freeze([
  Object.freeze({ stage: 'Luna', modelAlias: 'gpt-5.6-luna', reasoning: 'medium', batchLimit: 32, batchCount: 1 }),
  Object.freeze({ stage: 'Terra', modelAlias: 'gpt-5.6-terra', reasoning: 'high', batchLimit: 16, batchCount: 2 }),
  Object.freeze({ stage: 'Sol', modelAlias: 'gpt-5.6-sol', reasoning: 'high', batchLimit: 8, batchCount: 3 }),
]);
const classes = ['correct', 'specific-wrong', 'vague-topical-wrong'];
const strata = ['category-1', 'category-2', 'category-3', 'category-4'];
const verdictAlphabet = ['CORRECT', 'WRONG', 'UNSURE'];
const runKeys = ['auditProfile', 'capabilityBoundary', 'coordinator', 'event', 'exactPublicCommit', 'expectedJudgmentDispatchCount', 'expectedProcessAuditDispatchCount', 'judgmentAgentToolPolicy', 'judgmentProfiles', 'planSha256', 'protocol', 'realScreeningOccurred', 'reuseAllowed', 'runId', 'sourceIdentities', 'sourceKind'];
const preflightKeys = ['dispatchCount', 'event', 'exactPublicCommit', 'itemCount', 'planByteLength', 'planSha256', 'sourceIdentitiesSha256'];
const dispatchKeys = ['batchCount', 'batchOrdinal', 'blindedItemsSha256', 'dispatchByteLength', 'dispatchBytesBase64', 'dispatchSha256', 'event', 'itemCount', 'modelAlias', 'reasoning', 'sourceIdentitiesSha256', 'stage', 'taskId'];
const outputKeys = ['batchOrdinal', 'event', 'infrastructureFailureCount', 'modelAlias', 'rawOutputBase64', 'rawOutputByteLength', 'rawOutputSha256', 'reasoning', 'retryCount', 'stage', 'taskId', 'toolCallCount'];
const capabilityBoundary = Object.freeze({
  recordedEventSeparation: 'machine-verified-from-canonical-prefix',
  providerExecution: 'not-machine-verified',
  providerProcessFreshness: 'not-machine-verified',
  modelRouting: 'not-machine-verified',
  promptCompliance: 'not-machine-verified',
  invariantAliasWeights: 'not-machine-verified',
});

function fail(path, detail) { throw new Error(`${path}: ${detail}`); }
function exactKeys(value, keys) { return value !== null && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join(',') === [...keys].sort().join(','); }
function exact(value, expected) { return canonical(value) === canonical(expected); }
function exactBytes(a, b) { return Buffer.from(a).equals(Buffer.from(b)); }
function sum(rows, key) { return rows.reduce((total, row) => total + row[key], 0); }
function decodeBase64Exact(value, path) {
  if (typeof value !== 'string' || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(value)) fail(path, 'must be canonical padded base64');
  const bytes = Buffer.from(value, 'base64');
  if (bytes.toString('base64') !== value) fail(path, 'must decode and re-encode byte-identically');
  return bytes;
}
function parseCanonicalJsonLine(line, path) {
  let value;
  try { value = JSON.parse(line); } catch { fail(path, 'must be JSON'); }
  if (line !== canonical(value)) fail(path, 'must be exact compact canonical JSON');
  return value;
}

function parseRawOutput(bytes, expectedIds, path) {
  let rows;
  try { rows = JSON.parse(bytes.toString('utf8')); } catch { fail(path, 'must be JSON'); }
  if (!Array.isArray(rows) || rows.length !== expectedIds.length || bytes.toString('utf8') !== `${canonical(rows)}\n`) fail(path, 'must be the exact canonical ordered verdict array plus one LF');
  const seen = new Set();
  rows.forEach((row, index) => {
    if (!exactKeys(row, ['itemId', 'verdict']) || row.itemId !== expectedIds[index] || seen.has(row.itemId) || !verdictAlphabet.includes(row.verdict)) fail(`${path}[${index}]`, 'has a missing, extra, duplicate, reordered, changed-ID, or invalid-alphabet verdict');
    seen.add(row.itemId);
  });
  return rows;
}

function deriveCells(fixture, verdictByStage) {
  const byId = new Map(fixture.cases.map((row) => [row.judgmentItemId, row]));
  return classes.flatMap((candidateClass) => strata.map((stratum) => {
    const ids = fixture.dispatchOrder.filter((id) => byId.get(id).candidateClass === candidateClass && byId.get(id).stratum === stratum);
    const jointVerdictCounts = Array(27).fill(0);
    const marginals = Object.fromEntries(profiles.map(({ stage }) => [stage, [0, 0, 0]]));
    let threeStageAgreementCount = 0;
    for (const id of ids) {
      const axes = profiles.map(({ stage }) => verdictAlphabet.indexOf(verdictByStage.get(stage).get(id)));
      jointVerdictCounts[(axes[0] * 9) + (axes[1] * 3) + axes[2]] += 1;
      profiles.forEach(({ stage }, index) => { marginals[stage][axes[index]] += 1; });
      if (axes[0] === axes[1] && axes[1] === axes[2]) threeStageAgreementCount += 1;
    }
    const counts = ([correctCount, wrongCount, unsureCount]) => ({ correctCount, wrongCount, unsureCount });
    return { candidateClass, stratum, itemCount: ids.length, jointVerdictCounts, luna: counts(marginals.Luna), terra: counts(marginals.Terra), sol: counts(marginals.Sol), threeStageAgreementCount, anyDisagreementCount: ids.length - threeStageAgreementCount, invalidCount: 0 };
  }));
}

function deriveAgreements(cells) {
  const result = { threeStageAgreementCount: 0, anyDisagreementCount: 0, lunaTerraDisagreementCount: 0, lunaSolDisagreementCount: 0, terraSolDisagreementCount: 0, lunaOnlyDisagreesCount: 0, terraOnlyDisagreesCount: 0, solOnlyDisagreesCount: 0, allDifferentCount: 0 };
  for (const cell of cells) for (let luna = 0; luna < 3; luna += 1) for (let terra = 0; terra < 3; terra += 1) for (let sol = 0; sol < 3; sol += 1) {
    const count = cell.jointVerdictCounts[(luna * 9) + (terra * 3) + sol];
    if (luna === terra && terra === sol) result.threeStageAgreementCount += count;
    else {
      result.anyDisagreementCount += count;
      if (terra === sol) result.lunaOnlyDisagreesCount += count;
      else if (luna === sol) result.terraOnlyDisagreesCount += count;
      else if (luna === terra) result.solOnlyDisagreesCount += count;
      else result.allDifferentCount += count;
    }
    if (luna !== terra) result.lunaTerraDisagreementCount += count;
    if (luna !== sol) result.lunaSolDisagreementCount += count;
    if (terra !== sol) result.terraSolDisagreementCount += count;
  }
  return result;
}

export function parseJudgmentPrefixV6({ plan, prefixBytes, sources = loadPromptedScreeningV6Sources() }) {
  validatePreDispatchPlanV6(plan, { exactPublicCommit: plan?.exactPublicCommit, sources });
  if (!Buffer.isBuffer(prefixBytes)) fail('prefixBytes', 'must be exact bytes');
  const text = prefixBytes.toString('utf8');
  if (!text.endsWith('\n') || text.includes('\r') || text.includes(String.fromCodePoint(0x2014))) fail('prefixBytes', 'must be LF-terminated canonical JSONL without em dash');
  const lines = text.slice(0, -1).split('\n');
  if (lines.length !== 14) fail('prefixBytes', 'must contain exactly one declaration, one preflight, and six dispatch/output pairs');
  const events = lines.map((line, index) => parseCanonicalJsonLine(line, `prefixBytes[${index}]`));
  const planBytes = Buffer.from(`${canonical(plan)}\n`);
  const planSha256 = sha256(planBytes);
  const sourceIdentities = sourceIdentitiesV6(sources);
  const sourceIdentitiesSha256 = sha256(Buffer.from(`${canonical(sourceIdentities)}\n`));
  const expectedRun = {
    event: 'run-declaration', protocol: JUDGMENT_PREFIX_PROTOCOL_V1, runId: events[0]?.runId,
    sourceKind: 'synthetic-pilot', exactPublicCommit: plan.exactPublicCommit, planSha256,
    sourceIdentities, coordinator: { modelAlias: 'gpt-5.6-sol', reasoning: 'high' },
    judgmentAgentToolPolicy: 'none',
    judgmentProfiles: profiles.map((row) => ({ ...row })),
    auditProfile: { modelAlias: 'gpt-5.6-sol', reasoning: 'high', toolPolicy: 'none' },
    expectedJudgmentDispatchCount: 6, expectedProcessAuditDispatchCount: 1,
    reuseAllowed: false, realScreeningOccurred: false, capabilityBoundary: { ...capabilityBoundary },
  };
  if (!exactKeys(events[0], runKeys) || typeof events[0].runId !== 'string' || !/^[a-z0-9][a-z0-9-]{7,127}$/u.test(events[0].runId) || !exact(events[0], expectedRun)) fail('prefixBytes[0]', 'does not match the exact closed run declaration, public commit, profiles, sources, or capability boundary');
  const expectedPreflight = { event: 'preflight-plan', exactPublicCommit: plan.exactPublicCommit, planSha256, planByteLength: planBytes.length, sourceIdentitiesSha256, itemCount: 24, dispatchCount: 6 };
  if (!exactKeys(events[1], preflightKeys) || !exact(events[1], expectedPreflight)) fail('prefixBytes[1]', 'does not bind the exact pre-dispatch plan and source identities');

  const taskIds = new Set();
  const eventDigests = new Set();
  const verdictByStage = new Map(profiles.map(({ stage }) => [stage, new Map()]));
  const batches = [];
  plan.dispatches.forEach((expectedDispatch, index) => {
    const dispatchEventIndex = 2 + (index * 2);
    const outputEventIndex = dispatchEventIndex + 1;
    const dispatch = events[dispatchEventIndex];
    const output = events[outputEventIndex];
    if (!exactKeys(dispatch, dispatchKeys) || !exactKeys(output, outputKeys) || dispatch.event !== 'judgment-dispatch' || output.event !== 'judgment-output') fail(`prefixBytes.pair[${index}]`, 'must be one exact closed dispatch/output pair');
    const dispatchBytes = decodeBase64Exact(dispatch.dispatchBytesBase64, `prefixBytes[${dispatchEventIndex}].dispatchBytesBase64`);
    const outputBytes = decodeBase64Exact(output.rawOutputBase64, `prefixBytes[${outputEventIndex}].rawOutputBase64`);
    const expectedDispatchBytes = Buffer.from(expectedDispatch.dispatchBytesBase64, 'base64');
    const taskValid = typeof dispatch.taskId === 'string' && /^[a-z0-9][a-z0-9/_-]{7,191}$/u.test(dispatch.taskId) && dispatch.taskId === output.taskId && !taskIds.has(dispatch.taskId);
    if (!taskValid || dispatch.stage !== expectedDispatch.stage || output.stage !== expectedDispatch.stage || dispatch.modelAlias !== expectedDispatch.modelAlias || output.modelAlias !== expectedDispatch.modelAlias || dispatch.reasoning !== expectedDispatch.reasoning || output.reasoning !== expectedDispatch.reasoning || dispatch.batchOrdinal !== expectedDispatch.batchOrdinal || output.batchOrdinal !== expectedDispatch.batchOrdinal || dispatch.batchCount !== expectedDispatch.batchCount || dispatch.itemCount !== expectedDispatch.itemCount || dispatch.sourceIdentitiesSha256 !== sourceIdentitiesSha256 || dispatch.blindedItemsSha256 !== expectedDispatch.blindedItemsSha256 || dispatch.dispatchSha256 !== expectedDispatch.dispatchSha256 || dispatch.dispatchByteLength !== expectedDispatch.dispatchByteLength || !exactBytes(dispatchBytes, expectedDispatchBytes) || output.rawOutputSha256 !== sha256(outputBytes) || output.rawOutputByteLength !== outputBytes.length || output.infrastructureFailureCount !== 0 || output.retryCount !== 0 || output.toolCallCount !== 0) fail(`prefixBytes.pair[${index}]`, 'does not join the exact task, profile, batch, source, dispatch, output, retry, failure, and tool evidence');
    const outputRows = parseRawOutput(outputBytes, expectedDispatch.itemIds, `prefixBytes[${outputEventIndex}].rawOutputBase64`);
    taskIds.add(dispatch.taskId);
    const dispatchEventSha256 = sha256(Buffer.from(`${lines[dispatchEventIndex]}\n`));
    const outputEventSha256 = sha256(Buffer.from(`${lines[outputEventIndex]}\n`));
    for (const eventSha256 of [dispatchEventSha256, outputEventSha256]) {
      if (eventDigests.has(eventSha256)) fail(`prefixBytes.pair[${index}]`, 'reuses or duplicates a transcript event identity');
      eventDigests.add(eventSha256);
    }
    outputRows.forEach((row) => verdictByStage.get(expectedDispatch.stage).set(row.itemId, row.verdict));
    batches.push({ stage: expectedDispatch.stage, batchOrdinal: expectedDispatch.batchOrdinal, batchCount: expectedDispatch.batchCount, itemCount: expectedDispatch.itemCount, blindedItemsSha256: expectedDispatch.blindedItemsSha256, dispatchSha256: expectedDispatch.dispatchSha256, rawOutputSha256: sha256(outputBytes), transcriptDispatchEventSha256: dispatchEventSha256, transcriptOutputEventSha256: outputEventSha256, rawOutputRecordCount: outputRows.length, routedVerdictCount: outputRows.length, correctCount: outputRows.filter((row) => row.verdict === 'CORRECT').length, wrongCount: outputRows.filter((row) => row.verdict === 'WRONG').length, unsureCount: outputRows.filter((row) => row.verdict === 'UNSURE').length, invalidCount: 0, missingCount: 0, extraCount: 0, duplicateCount: 0, infrastructureFailureCount: output.infrastructureFailureCount, retryCount: output.retryCount, toolCallCount: output.toolCallCount });
  });
  return { runId: events[0].runId, planSha256, sourceIdentitiesSha256, judgmentTranscriptPrefixSha256: sha256(prefixBytes), batches, verdictByStage };
}

function toLegacy(value) {
  const publicArtifacts = Object.fromEntries(Object.entries(value.publicArtifacts).filter(([key]) => !['compactRendererSha256', 'compactSchemaSha256', 'judgmentProcedureSha256', 'processAuditInstructionSha256', 'processAuditOutputSchemaSha256'].includes(key)));
  return { schema: 'https://colophon-claims.github.io/locomo-judge-report/compact-process-audit-input/v1', protocol: 'prompted-codex-screening-compact-process-audit/v1', sourceKind: value.sourceKind, publicArtifacts, declarations: value.declarations, auditScope: { ...value.auditScope, rawIntegrityBasis: 'machine-validation-flags-and-digests' }, itemCount: value.itemCount, judgmentTranscriptPrefixSha256: value.judgmentTranscriptPrefixSha256, batches: value._decodedBatches.map((row) => [row.stage, row.batchOrdinal, row.batchCount, row.itemCount, row.blindedItemsSha256, row.dispatchSha256, row.rawOutputSha256, row.rawOutputRecordCount, row.routedVerdictCount, row.correctCount, row.wrongCount, row.unsureCount, row.invalidCount, row.missingCount, row.extraCount, row.duplicateCount, row.infrastructureFailureCount, row.retryCount, row.toolCallCount, true, true, true, []]), aggregates: value.aggregates, cells: value.cells, aggregateTiming: value.aggregateTiming };
}

export function buildRuntimeCompactInputV6({ plan, prefixBytes, sources = loadPromptedScreeningV6Sources() }) {
  validatePreDispatchPlanV6(plan, { exactPublicCommit: plan?.exactPublicCommit, sources });
  const replay = parseJudgmentPrefixV6({ plan, prefixBytes, sources });
  const fixture = JSON.parse(sources.screeningPoolOrFixtureBytes.toString('utf8'));
  const cells = deriveCells(fixture, replay.verdictByStage);
  const sourceIdentities = sourceIdentitiesV6(sources);
  const publicArtifacts = { repository: 'https://github.com/colophon-claims/locomo-judge-report', sourceRevision: plan.exactPublicCommit, coordinatorPromptSha256: sourceIdentities.coordinatorPromptSha256, judgmentInstructionSha256: sourceIdentities.judgmentInstructionSha256, screeningProcedureSha256: sourceIdentities.coordinatorPromptSha256, screeningPoolOrFixtureSha256: sourceIdentities.screeningPoolOrFixtureSha256, opaqueIdentityMappingSha256: sourceIdentities.opaqueIdentityMappingSha256, dispatchOrderSha256: sourceIdentities.dispatchOrderSha256, samplingCommitmentSha256: null, samplingScriptSha256: null, rendererSha256: sourceIdentities.judgmentRendererSha256, judgmentProcedureSha256: sourceIdentities.judgmentProcedureSha256, compactSchemaSha256: sourceIdentities.compactInputSchemaSha256, compactRendererSha256: sourceIdentities.runtimeBuilderSha256, processAuditInstructionSha256: sourceIdentities.auditInstructionSha256, processAuditOutputSchemaSha256: sourceIdentities.auditOutputSchemaSha256 };
  const value = { schema: COMPACT_PROCESS_AUDIT_SCHEMA_V2, protocol: COMPACT_PROCESS_AUDIT_PROTOCOL_V2, sourceKind: 'synthetic-pilot', executionKind: 'recorded-model-run', publicArtifacts, declarations: { coordinator: { modelAlias: 'gpt-5.6-sol', reasoning: 'high' }, judgmentStages: profiles.map((row) => ({ ...row })), processAudit: { modelAlias: 'gpt-5.6-sol', reasoning: 'high', toolPolicy: 'none' } }, auditScope: { inputBoundary: 'canonical-summary-only', mayInspect: ['coverage', 'declaration-drift', 'suspicious-agreement', 'cross-stage-asymmetry', 'process-defects'], mustNot: 'reperform-item-judgments', publicVerificationBoundary: 'later-verifier-resolves-and-hashes-published-artifacts', rawIntegrityBasis: 'derived-from-exact-authenticated-source-and-prefix-bytes' }, itemCount: 24, judgmentTranscriptPrefixSha256: replay.judgmentTranscriptPrefixSha256, batches: encodeBatchColumns(replay.batches), aggregates: { judgmentCount: 72, verdicts: profiles.map(({ stage }) => { const rows = replay.batches.filter((row) => row.stage === stage); return { stage, correctCount: sum(rows, 'correctCount'), wrongCount: sum(rows, 'wrongCount'), unsureCount: sum(rows, 'unsureCount') }; }), invalidCount: sum(replay.batches, 'invalidCount'), missingCount: sum(replay.batches, 'missingCount'), extraCount: sum(replay.batches, 'extraCount'), duplicateCount: sum(replay.batches, 'duplicateCount'), infrastructureFailureCount: sum(replay.batches, 'infrastructureFailureCount'), retryCount: sum(replay.batches, 'retryCount'), judgmentAgentToolCallCount: sum(replay.batches, 'toolCallCount'), agreements: deriveAgreements(cells) }, cells, aggregateTiming: 'after-all-judgment-outputs-before-process-audit', selectionBasis: structuredClone(SYNTHETIC_SELECTION_BASIS), digestSemantics: structuredClone(DIGEST_SEMANTICS), capabilityBoundary: structuredClone(CAPABILITY_BOUNDARY), auditAcceptancePolicy: structuredClone(AUDIT_ACCEPTANCE_POLICY) };
  const legacyValue = { ...value, _decodedBatches: replay.batches };
  validateCompactProcessAuditInput(toLegacy(legacyValue));
  return value;
}

export function renderRuntimeCompactInputV6(options) {
  const value = buildRuntimeCompactInputV6(options);
  const bytes = Buffer.from(`${canonical(value)}\n`);
  if (bytes.length > MAX_COMPACT_PROCESS_AUDIT_BYTES) fail('runtimeInput', `exceeds ${MAX_COMPACT_PROCESS_AUDIT_BYTES} bytes`);
  return bytes;
}

export function buildRuntimeFromFilesV6({ exactPublicCommit, prefixBytes, sources = loadPromptedScreeningV6Sources() }) {
  const plan = buildPreDispatchPlanV6({ exactPublicCommit, sources });
  return { plan, compactInput: buildRuntimeCompactInputV6({ plan, prefixBytes, sources }), compactInputBytes: renderRuntimeCompactInputV6({ plan, prefixBytes, sources }) };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [, , exactPublicCommit, prefixFile] = process.argv;
  if (!exactPublicCommit || !prefixFile) fail('usage', 'node scripts/build-prompted-screening-runtime-v6.mjs <externally-pinned-public-commit> <fresh-prefix-path>');
  process.stdout.write(buildRuntimeFromFilesV6({ exactPublicCommit, prefixBytes: readFileSync(prefixFile) }).compactInputBytes);
}
