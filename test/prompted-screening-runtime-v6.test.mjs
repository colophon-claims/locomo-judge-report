import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { canonical, sha256 } from '../scripts/render-compact-process-audit-input-v1.mjs';
import {
  buildProductionPreDispatchPlanV6,
  buildTestPreDispatchPlanV6,
  loadPromptedScreeningV6Sources,
  promptedScreeningV6SourceRelativePaths,
  renderPreDispatchPlanV6,
  TEST_ONLY_SOURCE_REVISION_V6,
  validatePreDispatchPlanV6,
  verifyProductionSourceRevisionObjectsV6,
} from '../scripts/plan-prompted-screening-v6.mjs';
import {
  buildRuntimeCompactInputV6,
  constructJudgmentPrefixV6,
  parseJudgmentPrefixV6,
  renderRuntimeCompactInputV6,
} from '../scripts/build-prompted-screening-runtime-v6.mjs';
import {
  buildPromptedScreeningFinalTranscriptV6,
  evaluatePromptedScreeningAuditV6,
  finalizeProductionPromptedScreeningV6,
  preparePromptedScreeningAuditV6,
  validatePromptedScreeningFinalTranscriptV6,
} from '../scripts/gate-prompted-screening-runtime-v6.mjs';
import {
  finalizePromptedScreeningRecorderV6,
  initializePromptedScreeningRecorderV6,
  preparePromptedScreeningRecorderAuditV6,
  recordPromptedScreeningJudgmentV6,
  sealPromptedScreeningJudgmentsV6,
  validatePromptedScreeningRecorderFinalizationV6,
} from '../scripts/record-prompted-screening-v6.mjs';
import { runNoModelSimulationV6 } from '../scripts/simulate-prompted-screening-runtime-v6.mjs';
import {
  auditOutputBindingV2,
  parsePromptedScreeningAuditOutputV2,
  renderTestOnlyBoundAuditOutputV2,
} from '../scripts/validate-prompted-screening-audit-output-v2.mjs';
import { evaluateCompactProcessAuditAcceptanceV1 } from '../scripts/validate-compact-process-audit-output-v1.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const recorder = join(root, 'scripts/record-prompted-screening-v6.mjs');
const legacyFindingsBytes = readFileSync(join(root, 'fixtures/prompted-screening-pilot-v5-no-run-audit-output.canonical.json'));
const outputsFixture = JSON.parse(readFileSync(join(root, 'fixtures/prompted-screening-runtime-v6-simulation-outputs.canonical.json')));
const committedPrefixBytes = readFileSync(join(root, 'fixtures/prompted-screening-runtime-v6-simulation-prefix.jsonl'));
const historicalPrefixBytes = readFileSync(join(root, 'records/synthetic-pilot-v4-2026-08-23/judgment-prefix.transcript.jsonl'));

function cloneSources() {
  return Object.fromEntries(Object.entries(loadPromptedScreeningV6Sources()).map(([key, bytes]) => [key, Buffer.from(bytes)]));
}

function outputBytesForPlan(plan, verdictByStage) {
  if (!verdictByStage) return outputsFixture.outputs.map((row) => Buffer.from(row.rawOutputBase64, 'base64'));
  return plan.dispatches.map((dispatch) => Buffer.from(`${canonical(dispatch.itemIds.map((itemId) => ({ itemId, verdict: verdictByStage[dispatch.stage] })))}\n`));
}

function receiptsForPlan(plan, verdictByStage, prefix = 'test-only-v6-unit') {
  return outputBytesForPlan(plan, verdictByStage).map((outputBytes, index) => ({
    taskId: `${prefix}/${plan.dispatches[index].stage.toLowerCase()}-${plan.dispatches[index].batchOrdinal}`,
    outputBytes,
    infrastructureFailureCount: 0,
    retryCount: 0,
    toolCallCount: 0,
  }));
}

function testRun(verdictByStage) {
  const sources = cloneSources();
  const plan = buildTestPreDispatchPlanV6({ sources });
  const prefixBytes = constructJudgmentPrefixV6({
    plan,
    runId: verdictByStage ? 'test-only-v6-all-different' : 'test-only-v6-unit-run',
    receipts: receiptsForPlan(plan, verdictByStage),
    operatorAttestation: { kind: 'test-only-no-model', attestedBy: 'test-harness', modelRunOccurred: false, testOnly: true },
    sources,
  });
  return { sources, plan, prefixBytes };
}

function boundPass(preparation, legacyFindings = legacyFindingsBytes) {
  return renderTestOnlyBoundAuditOutputV2({ binding: preparation.invocation, legacyFindings });
}

function withoutPerfectAgreement() {
  const value = JSON.parse(legacyFindingsBytes);
  value.nonMaterialObservations = value.nonMaterialObservations.filter((row) => row.code !== 'PERFECT_SYNTHETIC_AGREEMENT');
  value.nonMaterialObservationCount = value.nonMaterialObservations.length;
  value.suspiciousAgreement = { code: null, material: false, status: 'none' };
  return Buffer.from(`${canonical(value)}\n`);
}

function mutateJsonl(bytes, mutate) {
  const rows = bytes.toString('utf8').trimEnd().split('\n').map((line) => JSON.parse(line));
  mutate(rows);
  return Buffer.from(`${rows.map(canonical).join('\n')}\n`);
}

function strictBase64Alias(value) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0;
  const position = value.length - padding - 1;
  const candidate = `${value.slice(0, position)}${alphabet[alphabet.indexOf(value[position]) ^ 1]}${value.slice(position + 1)}`;
  assert.deepEqual(Buffer.from(candidate, 'base64'), Buffer.from(value, 'base64'));
  return candidate;
}

function runGit(repo, args) {
  return execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function temporaryProductionCheckout() {
  const repo = realpathSync(mkdtempSync(join(tmpdir(), 'colophon-v6-production-checkout-')));
  const paths = promptedScreeningV6SourceRelativePaths();
  for (const path of Object.values(paths)) {
    const destination = join(repo, path);
    mkdirSync(dirname(destination), { recursive: true });
    cpSync(join(root, path), destination);
  }
  runGit(repo, ['init', '-q']);
  runGit(repo, ['config', 'user.email', 'test@example.invalid']);
  runGit(repo, ['config', 'user.name', 'v6-test']);
  runGit(repo, ['add', '.']);
  runGit(repo, ['commit', '-qm', 'synthetic v6 production source tree']);
  return { repo, revision: runGit(repo, ['rev-parse', 'HEAD']) };
}

test('pre-dispatch planning separates test sentinel from clean Git production identity', () => {
  const sources = cloneSources();
  const testPlan = buildTestPreDispatchPlanV6({ sources });
  assert.equal(testPlan.sourceRevision, TEST_ONLY_SOURCE_REVISION_V6);
  assert.equal(testPlan.executionMode, 'test-only-simulation');
  assert.equal(testPlan.sourceRevisionVerification, 'test-only-sentinel');
  assert.equal(testPlan.status, 'ready-no-transcript');
  assert.equal(testPlan.dispatchCount, 6);
  assert.equal(Object.hasOwn(testPlan, 'transcript'), false);
  assert.doesNotThrow(() => validatePreDispatchPlanV6(testPlan, { sources }));
  assert.deepEqual(JSON.parse(renderPreDispatchPlanV6({ plan: testPlan, sources })), testPlan);

  const checkout = temporaryProductionCheckout();
  try {
    const productionSources = loadPromptedScreeningV6Sources(checkout.repo);
    const productionPlan = buildProductionPreDispatchPlanV6({ repoRoot: checkout.repo, expectedPublicCommit: checkout.revision, sources: productionSources });
    assert.equal(productionPlan.sourceRevision, checkout.revision);
    assert.equal(productionPlan.executionMode, 'production-recording');
    assert.equal(productionPlan.sourceRevisionVerification, 'clean-git-object-verified');
    writeFileSync(join(checkout.repo, 'dirty.txt'), 'dirty\n');
    assert.throws(() => buildProductionPreDispatchPlanV6({ repoRoot: checkout.repo, sources: productionSources }), /tracked-clean/u);
    rmSync(join(checkout.repo, 'dirty.txt'));
    assert.throws(() => buildProductionPreDispatchPlanV6({ repoRoot: checkout.repo, expectedPublicCommit: '1'.repeat(40), sources: productionSources }), /does not match/u);
  } finally {
    rmSync(checkout.repo, { recursive: true, force: true });
  }
});

test('historical public base cannot masquerade as the v6 normative source revision', () => {
  const sources = cloneSources();
  assert.throws(() => verifyProductionSourceRevisionObjectsV6({ repoRoot: root, revision: '29b6b23fbc1db832bbe09b0f8b39fa346306a341', sources }), /Git object|failed/u);
});

test('real recorder CLI simulation reaches policy pass but terminates test-only non-admissible', () => {
  const result = runNoModelSimulationV6();
  assert.equal(result.simulationStatus, 'TEST_ONLY_NON_ADMISSIBLE');
  assert.equal(result.policyPass, true);
  assert.equal(result.productionFinalizationRefused, true);
  assert.equal(result.modelRunOccurred, false);
  assert.equal(result.testOnly, true);
  assert.equal(result.admissionRecordCreated, false);
  assert.equal(result.ritsuDecisionCount, 0);
  assert.equal(result.sourceRevision, TEST_ONLY_SOURCE_REVISION_V6);
  assert.ok(result.compactInputByteLength < 65_536);
});

test('runtime replay derives exact six pairs and bound audit output before a non-admissible terminal', () => {
  const { sources, plan, prefixBytes } = testRun();
  const replay = parseJudgmentPrefixV6({ plan, prefixBytes, sources });
  const compactInput = buildRuntimeCompactInputV6({ plan, prefixBytes, sources });
  const compactBytes = renderRuntimeCompactInputV6({ plan, prefixBytes, sources });
  assert.equal(replay.batches.length, 6);
  assert.equal(new Set(replay.taskIds).size, 6);
  assert.equal(new Set(replay.batches.flatMap((row) => [row.transcriptDispatchEventSha256, row.transcriptOutputEventSha256])).size, 12);
  assert.equal(compactInput.executionKind, 'test-only-recorded-events');
  assert.equal(compactInput.modelRunOccurred, false);
  assert.equal(compactInput.aggregates.judgmentCount, 72);
  assert.ok(compactBytes.length < 65_536);
  const preparation = preparePromptedScreeningAuditV6({ plan, prefixBytes, taskId: 'test-only-v6-unit/process-audit', sources });
  const outputBytes = boundPass(preparation);
  const policy = evaluatePromptedScreeningAuditV6({ preparation, outputBytes });
  assert.equal(policy.status, 'AUDIT_POLICY_PASS');
  assert.equal(policy.productionStatus, null);
  const transcript = buildPromptedScreeningFinalTranscriptV6({ plan, prefixBytes, auditTaskId: preparation.invocation.taskId, outputBytes, sources });
  assert.equal(transcript.result.status, 'TEST_ONLY_NON_ADMISSIBLE');
  assert.equal(transcript.result.pendingRitsu, false);
  assert.deepEqual(validatePromptedScreeningFinalTranscriptV6({ plan, finalTranscriptBytes: transcript.finalTranscriptBytes, sources }), transcript.result);
  assert.throws(() => finalizeProductionPromptedScreeningV6({ plan, prefixBytes, auditTaskId: preparation.invocation.taskId, outputBytes, sources }), /requires non-test/u);
});

test('old unbound output and every stale or mutated bound invocation refuse', () => {
  const { sources, plan, prefixBytes } = testRun();
  const preparation = preparePromptedScreeningAuditV6({ plan, prefixBytes, taskId: 'test-only-v6-binding/process-audit', sources });
  const outputBytes = boundPass(preparation);
  assert.throws(() => parsePromptedScreeningAuditOutputV2(legacyFindingsBytes, { expectedBinding: auditOutputBindingV2(preparation.invocation) }), /bound version 2/u);
  for (const key of ['auditInputSha256', 'auditInstructionSha256', 'judgmentPrefixSha256', 'planSha256']) {
    const changed = JSON.parse(outputBytes); changed[key] = `sha256:${'1'.repeat(64)}`;
    assert.throws(() => evaluatePromptedScreeningAuditV6({ preparation, outputBytes: Buffer.from(`${canonical(changed)}\n`) }), /does not match/u);
  }
  for (const [key, value] of [['runId', 'test-only-v6-other'], ['sourceRevision', '2'.repeat(40)], ['taskId', 'test-only-v6-other/audit']]) {
    const changed = JSON.parse(outputBytes); changed[key] = value;
    assert.throws(() => evaluatePromptedScreeningAuditV6({ preparation, outputBytes: Buffer.from(`${canonical(changed)}\n`) }), /does not match/u);
  }
});

test('all-different evidence rejects stale and freshly rebound PERFECT_SYNTHETIC_AGREEMENT findings', () => {
  const base = testRun();
  const basePreparation = preparePromptedScreeningAuditV6({ ...base, taskId: 'test-only-v6-all-different/audit' });
  const stalePerfect = boundPass(basePreparation);
  const changed = testRun({ Luna: 'CORRECT', Terra: 'WRONG', Sol: 'UNSURE' });
  const changedPreparation = preparePromptedScreeningAuditV6({ ...changed, taskId: 'test-only-v6-all-different/audit' });
  assert.equal(changedPreparation.compactInput.aggregates.agreements.threeStageAgreementCount, 0);
  assert.equal(changedPreparation.compactInput.aggregates.agreements.allDifferentCount, 24);
  assert.throws(() => evaluatePromptedScreeningAuditV6({ preparation: changedPreparation, outputBytes: stalePerfect }), /does not match/u);
  const reboundButStaleFinding = boundPass(changedPreparation);
  assert.throws(() => evaluatePromptedScreeningAuditV6({ preparation: changedPreparation, outputBytes: reboundButStaleFinding }), /PERFECT_SYNTHETIC_AGREEMENT/u);
  const correctOutput = boundPass(changedPreparation, withoutPerfectAgreement());
  assert.equal(evaluatePromptedScreeningAuditV6({ preparation: changedPreparation, outputBytes: correctOutput }).policyPass, true);
});

test('production branch is reachable only from a clean Git plan and explicit synthetic unit attestation', () => {
  const checkout = temporaryProductionCheckout();
  try {
    const sources = loadPromptedScreeningV6Sources(checkout.repo);
    const plan = buildProductionPreDispatchPlanV6({ repoRoot: checkout.repo, expectedPublicCommit: checkout.revision, sources });
    const prefixBytes = constructJudgmentPrefixV6({
      plan,
      runId: 'unit-only-v6-production-branch',
      receipts: receiptsForPlan(plan, undefined, 'unit-only-v6-production'),
      operatorAttestation: { kind: 'operator-recorded-model-run', attestedBy: 'unit.synthetic-attester', modelRunOccurred: true, testOnly: false },
      sources,
    });
    const preparation = preparePromptedScreeningAuditV6({ plan, prefixBytes, taskId: 'unit-only-v6-production/process-audit', sources });
    const outputBytes = boundPass(preparation);
    const finalized = finalizeProductionPromptedScreeningV6({ plan, prefixBytes, auditTaskId: preparation.invocation.taskId, outputBytes, sources });
    assert.equal(finalized.result.status, 'PENDING_RITSU');
    assert.equal(finalized.result.pendingRitsu, true);
    assert.equal(finalized.result.admissionEligible, false);
  } finally {
    rmSync(checkout.repo, { recursive: true, force: true });
  }
});

test('prefix substitutions, event reuse, profile drift, dropped execution evidence, and encoding aliases refuse', () => {
  const { sources, plan, prefixBytes } = testRun();
  const attacks = [
    (rows) => { rows.splice(12, 2); },
    (rows) => { [rows[2], rows[4]] = [rows[4], rows[2]]; },
    (rows) => { rows[4].taskId = rows[2].taskId; rows[5].taskId = rows[2].taskId; },
    (rows) => { rows[2].modelAlias = 'gpt-5.6-sol'; },
    (rows) => { rows[2].reasoning = 'high'; },
    (rows) => { delete rows[0].modelRunOccurred; },
    (rows) => { rows[0].testOnly = false; rows[0].modelRunOccurred = true; rows[0].executionMode = 'production-recording'; rows[0].operatorAttestation = { kind: 'operator-recorded-model-run', attestedBy: 'fake.operator', modelRunOccurred: true, testOnly: false }; },
    (rows) => { rows[2].dispatchBytesBase64 = strictBase64Alias(rows[2].dispatchBytesBase64); },
    (rows) => {
      rows[5].rawOutputBase64 = rows[3].rawOutputBase64;
      rows[5].rawOutputByteLength = rows[3].rawOutputByteLength;
      rows[5].rawOutputSha256 = rows[3].rawOutputSha256;
    },
  ];
  for (const mutate of attacks) assert.throws(() => parseJudgmentPrefixV6({ plan, prefixBytes: mutateJsonl(prefixBytes, mutate), sources }), /exact|pair|attestation|profile|canonical|ordered verdict|immutable|re-encode/u);
  assert.throws(() => parseJudgmentPrefixV6({ plan, prefixBytes: historicalPrefixBytes, sources }), /exact|declaration|canonical/u);
});

test('source substitution and coordinated plan recanonicalization refuse', () => {
  const { sources, plan, prefixBytes } = testRun();
  for (const key of ['coordinatorPromptBytes', 'judgmentInstructionBytes', 'screeningPoolOrFixtureBytes', 'runtimeBuilderBytes', 'auditInstructionBytes']) {
    const changedSources = cloneSources();
    changedSources[key] = Buffer.concat([changedSources[key], Buffer.from('contradiction\n')]);
    assert.throws(() => parseJudgmentPrefixV6({ plan, prefixBytes, sources: changedSources }), /literal approved/u);
  }
  const changedPlan = structuredClone(plan);
  changedPlan.sourceRevision = '1'.repeat(40);
  assert.throws(() => parseJudgmentPrefixV6({ plan: changedPlan, prefixBytes, sources }), /sourceRevision|derive exactly/u);
});

test('recorder refuses reordered state, duplicate task, wrong-batch output, tampered prefix, and missing finalization', () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'colophon-v6-recorder-hostile-'));
  const owner = 'test-hostile-recorder';
  try {
    const init = initializePromptedScreeningRecorderV6({ stateDir: stateRoot, owner, testOnly: true });
    assert.throws(() => preparePromptedScreeningRecorderAuditV6({ stateDir: stateRoot, owner, taskId: 'test-hostile-recorder/audit' }), /judgment-pair|ENOENT/u);
    assert.throws(() => validatePromptedScreeningRecorderFinalizationV6({ stateDir: stateRoot, owner }), /finalization|ENOENT/u);
    const outputs = outputBytesForPlan(init.plan);
    const first = init.plan.dispatches[0];
    recordPromptedScreeningJudgmentV6({ stateDir: stateRoot, owner, stage: first.stage, batchOrdinal: first.batchOrdinal, taskId: 'test-hostile-recorder/reused', modelAlias: first.modelAlias, reasoning: first.reasoning, toolPolicy: 'none', outputBytes: outputs[0] });
    const second = init.plan.dispatches[1];
    assert.throws(() => recordPromptedScreeningJudgmentV6({ stateDir: stateRoot, owner, stage: second.stage, batchOrdinal: second.batchOrdinal, taskId: 'test-hostile-recorder/reused', modelAlias: second.modelAlias, reasoning: second.reasoning, toolPolicy: 'none', outputBytes: outputs[1] }), /judgmentReceipt/u);
    assert.throws(() => recordPromptedScreeningJudgmentV6({ stateDir: stateRoot, owner, stage: second.stage, batchOrdinal: second.batchOrdinal, taskId: 'test-hostile-recorder/wrong-output', modelAlias: second.modelAlias, reasoning: second.reasoning, toolPolicy: 'none', outputBytes: outputs[0] }), /ordered verdict/u);
    for (let index = 1; index < 6; index += 1) {
      const dispatch = init.plan.dispatches[index];
      recordPromptedScreeningJudgmentV6({ stateDir: stateRoot, owner, stage: dispatch.stage, batchOrdinal: dispatch.batchOrdinal, taskId: `test-hostile-recorder/task-${index}`, modelAlias: dispatch.modelAlias, reasoning: dispatch.reasoning, toolPolicy: 'none', outputBytes: outputs[index] });
    }
    sealPromptedScreeningJudgmentsV6({ stateDir: stateRoot, owner, runId: 'test-hostile-recorder-run' });
    const pairPath = join(stateRoot, '01-judgment-pair.json'); const originalPair = readFileSync(pairPath); const changedPair = JSON.parse(originalPair); const changedOutput = JSON.parse(outputs[0]); changedOutput[0].verdict = changedOutput[0].verdict === 'CORRECT' ? 'WRONG' : 'CORRECT'; const changedOutputBytes = Buffer.from(`${canonical(changedOutput)}\n`); changedPair.outputBase64 = changedOutputBytes.toString('base64'); changedPair.outputByteLength = changedOutputBytes.length; changedPair.outputSha256 = sha256(changedOutputBytes); writeFileSync(pairPath, `${canonical(changedPair)}\n`);
    assert.throws(() => preparePromptedScreeningRecorderAuditV6({ stateDir: stateRoot, owner, taskId: 'test-hostile-recorder/audit' }), /judgmentPrefix/u);
    writeFileSync(pairPath, originalPair);
    const prefixPath = join(stateRoot, '07-judgment-prefix.jsonl');
    writeFileSync(prefixPath, Buffer.concat([readFileSync(prefixPath), Buffer.from('{}\n')]));
    assert.throws(() => preparePromptedScreeningRecorderAuditV6({ stateDir: stateRoot, owner, taskId: 'test-hostile-recorder/audit' }), /exactly one declaration|14 events/u);
  } finally {
    rmSync(stateRoot, { recursive: true, force: true });
  }
});

test('test-only promotion and stale final transcript mutations never produce pending Ritsu', () => {
  const { sources, plan, prefixBytes } = testRun();
  const preparation = preparePromptedScreeningAuditV6({ plan, prefixBytes, taskId: 'test-only-v6-final/audit', sources });
  const outputBytes = boundPass(preparation);
  const built = buildPromptedScreeningFinalTranscriptV6({ plan, prefixBytes, auditTaskId: preparation.invocation.taskId, outputBytes, sources });
  assert.equal(built.terminal.status, 'TEST_ONLY_NON_ADMISSIBLE');
  assert.equal(built.terminal.pendingRitsu, false);
  for (const mutate of [
    (rows) => { rows[15].auditInputSha256 = `sha256:${'3'.repeat(64)}`; },
    (rows) => { rows[17].status = 'PENDING_RITSU'; rows[17].pendingRitsu = true; rows[17].productionFinalizationEligible = true; },
    (rows) => { rows.splice(16, 1); },
  ]) assert.throws(() => validatePromptedScreeningFinalTranscriptV6({ plan, finalTranscriptBytes: mutateJsonl(built.finalTranscriptBytes, mutate), sources }), /18 events|replay|match/u);
});

test('legacy validation-only gate remains unreachable and audit flags remain process refusals', () => {
  assert.throws(() => evaluateCompactProcessAuditAcceptanceV1({ outputBytes: legacyFindingsBytes }), /validation-only no-model/u);
  const run = testRun();
  const preparation = preparePromptedScreeningAuditV6({ ...run, taskId: 'test-only-v6-refusal/audit' });
  const refusal = JSON.parse(boundPass(preparation));
  refusal.assessment = 'REFUSE';
  refusal.materialFindingCount = 1;
  refusal.materialFindings = [{ code: 'SEALED_EVIDENCE_CONTRADICTION', severity: 'material' }];
  refusal.processDefects = { status: 'material', severity: 'high', requiredVerification: ['RESOLVE_SEALED_EVIDENCE'] };
  const outputBytes = Buffer.from(`${canonical(refusal)}\n`);
  const policy = evaluatePromptedScreeningAuditV6({ preparation, outputBytes });
  assert.equal(policy.policyPass, false);
  const built = buildPromptedScreeningFinalTranscriptV6({ plan: run.plan, prefixBytes: run.prefixBytes, auditTaskId: preparation.invocation.taskId, outputBytes, sources: run.sources });
  assert.equal(built.result.status, 'TEST_ONLY_NON_ADMISSIBLE');
  assert.equal(built.result.pendingRitsu, false);
});

test('all v6 schemas close their load-bearing root and event shapes', () => {
  const planSchema = JSON.parse(readFileSync(join(root, 'schemas/prompted-screening-pre-dispatch-plan.v1.schema.json')));
  const prefixSchema = JSON.parse(readFileSync(join(root, 'schemas/prompted-screening-judgment-prefix.v1.schema.json')));
  const inputSchema = JSON.parse(readFileSync(join(root, 'schemas/prompted-screening-runtime-compact-input.v1.schema.json')));
  const outputSchema = JSON.parse(readFileSync(join(root, 'schemas/prompted-screening-audit-output.v2.schema.json')));
  const finalSchema = JSON.parse(readFileSync(join(root, 'schemas/prompted-screening-final-transcript.v1.schema.json')));
  assert.equal(planSchema.additionalProperties, false);
  assert.equal(planSchema.$defs.sourceIdentities.additionalProperties, false);
  assert.equal(planSchema.$defs.dispatch.additionalProperties, false);
  for (const key of ['runDeclaration', 'preflightPlan', 'dispatch', 'output', 'sourceIdentities', 'operatorAttestation']) assert.equal(prefixSchema.$defs[key].additionalProperties, false);
  assert.equal(inputSchema.additionalProperties, false);
  assert.equal(inputSchema.$defs.publicArtifacts.additionalProperties, false);
  assert.equal(outputSchema.additionalProperties, false);
  for (const key of ['auditDispatch', 'auditOutput', 'mechanicalComparison', 'terminal']) assert.equal(finalSchema.$defs[key].additionalProperties, false);
  assert.equal(finalSchema.minItems, 18);
  assert.equal(finalSchema.maxItems, 18);
  assert.equal(finalSchema.items, false);
});

test('recorder init requires one exact mode before creating state', () => {
  const directory = mkdtempSync(join(tmpdir(), 'colophon-v6-cli-mode-'));
  const cli = (args) => spawnSync(process.execPath, [recorder, ...args], { encoding: 'utf8' });
  try {
    const hostile = [
      [],
      ['--mode', 'production'],
      ['--mode', 'test-only', '--mode', 'test-only'],
      ['--mode', 'test-only', '--mode', 'production-recording'],
      ['--mode', 'production-recording', 'ambiguous-positional-value'],
    ];
    hostile.forEach((modeArgs, index) => {
      const state = join(directory, `invalid-${index}`); const result = cli(['init', '--state', state, '--owner', 'test-cli-mode', ...modeArgs]);
      assert.notEqual(result.status, 0); assert.match(result.stderr, /mode|occur exactly once/u); assert.equal(existsSync(state), false);
    });
    const testState = join(directory, 'valid-test-only');
    assert.equal(cli(['init', '--state', testState, '--owner', 'test-cli-mode', '--mode', 'test-only']).status, 0);
    assert.equal(existsSync(join(testState, '00-init.json')), true);

    const checkout = temporaryProductionCheckout();
    try {
      const productionState = join(directory, 'valid-production');
      assert.equal(cli(['init', '--state', productionState, '--owner', 'test-cli-mode', '--mode', 'production-recording', '--repo', checkout.repo, '--expected-public-commit', checkout.revision]).status, 0);
      const init = JSON.parse(readFileSync(join(productionState, '00-init.json'))); assert.equal(init.executionMode, 'production-recording'); assert.equal(init.plan.sourceRevision, checkout.revision);
    } finally {
      rmSync(checkout.repo, { recursive: true, force: true });
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('recorder CLI has a callable plan-to-seal workflow and refuses state reuse', () => {
  const directory = mkdtempSync(join(tmpdir(), 'colophon-v6-cli-unit-'));
  const state = join(directory, 'state');
  const owner = 'test-cli-recorder';
  const cli = (args, options = {}) => spawnSync(process.execPath, [recorder, ...args], { encoding: 'utf8', ...options });
  try {
    assert.equal(cli(['init', '--state', state, '--owner', owner, '--mode', 'test-only']).status, 0);
    const plan = JSON.parse(cli(['export', '--state', state, '--owner', owner, '--artifact', 'plan']).stdout);
    outputBytesForPlan(plan).forEach((bytes, index) => {
      const path = join(directory, `output-${index}.json`); writeFileSync(path, bytes); const dispatch = plan.dispatches[index];
      assert.equal(cli(['record-judgment', '--state', state, '--owner', owner, '--stage', dispatch.stage, '--batch', String(dispatch.batchOrdinal), '--task', `test-cli-recorder/task-${index}`, '--model', dispatch.modelAlias, '--reasoning', dispatch.reasoning, '--tools', 'none', '--output', path, '--failures', '0', '--retries', '0', '--tool-calls', '0']).status, 0);
    });
    assert.equal(cli(['seal-judgments', '--state', state, '--owner', owner, '--run-id', 'test-cli-recorder-run']).status, 0);
    assert.notEqual(cli(['seal-judgments', '--state', state, '--owner', owner, '--run-id', 'test-cli-recorder-run']).status, 0);
    assert.notEqual(cli(['finalize', '--state', state, '--owner', owner]).status, 0);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
