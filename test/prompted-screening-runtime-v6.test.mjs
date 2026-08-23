import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { canonical, sha256 } from '../scripts/render-compact-process-audit-input-v1.mjs';
import {
  buildPreDispatchPlanV6,
  loadPromptedScreeningV6Sources,
  renderPreDispatchPlanV6,
  validatePreDispatchPlanV6,
} from '../scripts/plan-prompted-screening-v6.mjs';
import {
  buildRuntimeCompactInputV6,
  parseJudgmentPrefixV6,
  renderRuntimeCompactInputV6,
} from '../scripts/build-prompted-screening-runtime-v6.mjs';
import { evaluatePromptedScreeningRuntimeV6 } from '../scripts/gate-prompted-screening-runtime-v6.mjs';
import {
  constructNoModelSimulationPrefixV6,
  runNoModelSimulationV6,
  SIMULATION_PUBLIC_COMMIT,
} from '../scripts/simulate-prompted-screening-runtime-v6.mjs';
import { evaluateCompactProcessAuditAcceptanceV1 } from '../scripts/validate-compact-process-audit-output-v1.mjs';

const passOutputBytes = readFileSync('fixtures/prompted-screening-pilot-v5-no-run-audit-output.canonical.json');
const v5PrefixBytes = readFileSync('records/synthetic-pilot-v4-2026-08-23/judgment-prefix.transcript.jsonl');

function cloneSources() {
  return Object.fromEntries(Object.entries(loadPromptedScreeningV6Sources()).map(([key, value]) => [key, Buffer.from(value)]));
}
function fresh() {
  const sources = cloneSources();
  const plan = buildPreDispatchPlanV6({ exactPublicCommit: SIMULATION_PUBLIC_COMMIT, sources });
  const prefixBytes = constructNoModelSimulationPrefixV6({ exactPublicCommit: SIMULATION_PUBLIC_COMMIT, sources }).prefixBytes;
  return { sources, plan, prefixBytes };
}
function mutatePrefix(prefixBytes, mutate) {
  const rows = prefixBytes.toString('utf8').trimEnd().split('\n').map((line) => JSON.parse(line));
  mutate(rows);
  return Buffer.from(`${rows.map(canonical).join('\n')}\n`);
}
function sameDecodedBase64Alias(value) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0;
  const position = value.length - padding - 1;
  const index = alphabet.indexOf(value[position]);
  const replacement = alphabet[index ^ 1];
  const candidate = `${value.slice(0, position)}${replacement}${value.slice(position + 1)}`;
  assert.deepEqual(Buffer.from(candidate, 'base64'), Buffer.from(value, 'base64'));
  return candidate;
}

test('planner authenticates exact sources and emits six transcript-free dispatches', () => {
  const sources = cloneSources();
  const plan = buildPreDispatchPlanV6({ exactPublicCommit: SIMULATION_PUBLIC_COMMIT, sources });
  assert.equal(plan.status, 'ready-no-transcript');
  assert.equal(plan.dispatchCount, 6);
  assert.equal(plan.judgmentAgentToolPolicy, 'none');
  assert.deepEqual(plan.dispatches.map((row) => `${row.stage}-${row.batchOrdinal}`), ['Luna-1', 'Terra-1', 'Terra-2', 'Sol-1', 'Sol-2', 'Sol-3']);
  assert.equal(Object.hasOwn(plan, 'transcript'), false);
  assert.equal(Object.hasOwn(plan, 'executionKind'), false);
  assert.doesNotThrow(() => validatePreDispatchPlanV6(plan, { exactPublicCommit: SIMULATION_PUBLIC_COMMIT, sources }));
  assert.deepEqual(JSON.parse(renderPreDispatchPlanV6({ exactPublicCommit: SIMULATION_PUBLIC_COMMIT, sources })), plan);
  assert.throws(() => buildPreDispatchPlanV6({ exactPublicCommit: 'not-a-commit', sources }), /externally pinned/u);
});

test('exact no-model simulation reaches the runtime gate without approval or admission', () => {
  const result = runNoModelSimulationV6();
  assert.equal(result.simulationStatus, 'test-only-no-model-end-to-end-green');
  assert.equal(result.modelRunOccurred, false);
  assert.equal(result.gateStatus, 'PROCESS-AUDIT-PASS-PENDING-RITSU');
  assert.equal(result.ritsuApprovalStillRequired, true);
  assert.equal(result.ritsuDecisionCount, 0);
  assert.equal(result.admissionRecordCreated, false);
  assert.equal(result.compactInputByteLength, 11_815);
});

test('generic runtime derives recorded-model-run only from all six exact fresh pairs', () => {
  const { sources, plan, prefixBytes } = fresh();
  const replay = parseJudgmentPrefixV6({ plan, prefixBytes, sources });
  const input = buildRuntimeCompactInputV6({ plan, prefixBytes, sources });
  const bytes = renderRuntimeCompactInputV6({ plan, prefixBytes, sources });
  assert.equal(replay.batches.length, 6);
  assert.equal(new Set(replay.batches.flatMap((row) => [row.transcriptDispatchEventSha256, row.transcriptOutputEventSha256])).size, 12);
  assert.equal(input.executionKind, 'recorded-model-run');
  assert.equal(input.judgmentTranscriptPrefixSha256, sha256(prefixBytes));
  assert.equal(input.aggregates.judgmentCount, 72);
  assert.equal(input.cells.length, 12);
  assert.equal(bytes.length, 11_815);
  const gated = evaluatePromptedScreeningRuntimeV6({ plan, prefixBytes, outputBytes: passOutputBytes, sources });
  assert.equal(gated.acceptedByProcessGate, true);
  assert.equal(gated.admissionEligible, false);
});

test('historical pinned prefix and incomplete or reordered pairs refuse runtime', () => {
  const { sources, plan, prefixBytes } = fresh();
  assert.throws(() => parseJudgmentPrefixV6({ plan, prefixBytes: v5PrefixBytes, sources }), /canonical|run declaration|exact closed/u);
  const attacks = [
    (rows) => { rows.splice(12, 2); },
    (rows) => { rows.splice(4, 2); },
    (rows) => { [rows[2], rows[4]] = [rows[4], rows[2]]; },
    (rows) => { rows[4] = structuredClone(rows[2]); rows[5] = structuredClone(rows[3]); },
  ];
  for (const mutate of attacks) assert.throws(() => parseJudgmentPrefixV6({ plan, prefixBytes: mutatePrefix(prefixBytes, mutate), sources }), /exactly one declaration|pair|exact task|reuses|profile|batch/u);
});

test('task, profile, tool, public commit, source, and green-mirror drift refuse', () => {
  const { sources, plan, prefixBytes } = fresh();
  const attacks = [
    (rows) => { rows[4].taskId = rows[2].taskId; rows[5].taskId = rows[2].taskId; },
    (rows) => { rows[2].modelAlias = 'gpt-5.6-sol'; },
    (rows) => { rows[2].reasoning = 'high'; },
    (rows) => { rows[0].judgmentAgentToolPolicy = 'web'; },
    (rows) => { rows[3].toolCallCount = 1; },
    (rows) => { rows[3].infrastructureFailureCount = 1; rows[3].retryCount = 1; },
    (rows) => { rows[0].exactPublicCommit = '1'.repeat(40); rows[1].exactPublicCommit = '1'.repeat(40); },
    (rows) => { rows[0].reuseAllowed = true; },
    (rows) => { rows[0].sourceIdentities.coordinatorPromptSha256 = `sha256:${'1'.repeat(64)}`; },
    (rows) => { rows[2].sourceIdentitiesSha256 = `sha256:${'2'.repeat(64)}`; },
    (rows) => { rows[2].machineValidationPassed = true; },
    (rows) => { rows[0].executionKind = 'recorded-model-run'; },
  ];
  for (const mutate of attacks) assert.throws(() => parseJudgmentPrefixV6({ plan, prefixBytes: mutatePrefix(prefixBytes, mutate), sources }), /closed|declaration|pre-dispatch|exact task|profile|tool|source|public commit|capability/u);
});

test('dispatch, raw output, ID, order, alphabet, and canonical encoding drift refuse', () => {
  const { sources, plan, prefixBytes } = fresh();
  const attacks = [
    (rows) => {
      const bytes = Buffer.concat([Buffer.from(rows[2].dispatchBytesBase64, 'base64'), Buffer.from('suffix')]);
      rows[2].dispatchBytesBase64 = bytes.toString('base64'); rows[2].dispatchByteLength = bytes.length; rows[2].dispatchSha256 = sha256(bytes);
    },
    (rows) => { rows[2].dispatchBytesBase64 = sameDecodedBase64Alias(rows[2].dispatchBytesBase64); },
    (rows) => {
      const output = JSON.parse(Buffer.from(rows[3].rawOutputBase64, 'base64'));
      [output[0], output[1]] = [output[1], output[0]];
      const bytes = Buffer.from(`${canonical(output)}\n`); rows[3].rawOutputBase64 = bytes.toString('base64'); rows[3].rawOutputByteLength = bytes.length; rows[3].rawOutputSha256 = sha256(bytes);
    },
    (rows) => {
      const output = JSON.parse(Buffer.from(rows[3].rawOutputBase64, 'base64'));
      output[0].itemId = '0'.repeat(32);
      const bytes = Buffer.from(`${canonical(output)}\n`); rows[3].rawOutputBase64 = bytes.toString('base64'); rows[3].rawOutputByteLength = bytes.length; rows[3].rawOutputSha256 = sha256(bytes);
    },
    (rows) => {
      const output = JSON.parse(Buffer.from(rows[3].rawOutputBase64, 'base64'));
      output[0].verdict = 'PASS';
      const bytes = Buffer.from(`${canonical(output)}\n`); rows[3].rawOutputBase64 = bytes.toString('base64'); rows[3].rawOutputByteLength = bytes.length; rows[3].rawOutputSha256 = sha256(bytes);
    },
  ];
  for (const mutate of attacks) assert.throws(() => parseJudgmentPrefixV6({ plan, prefixBytes: mutatePrefix(prefixBytes, mutate), sources }), /canonical padded base64|re-encode|exact task|ordered verdict|changed-ID|invalid-alphabet/u);
});

test('source substitution and coordinated plan recanonicalization refuse', () => {
  const { sources, plan, prefixBytes } = fresh();
  for (const mutate of [
    (value) => { value.coordinatorPromptBytes = Buffer.concat([value.coordinatorPromptBytes, Buffer.from('contradiction\n')]); },
    (value) => { value.judgmentInstructionBytes = Buffer.concat([value.judgmentInstructionBytes, Buffer.from('suffix\n')]); },
    (value) => { value.screeningPoolOrFixtureBytes = Buffer.from('{}\n'); },
    (value) => { value.dispatchOrderBytes = Buffer.from('[]'); },
    (value) => { value.runtimeBuilderBytes = Buffer.from('export default false;\n'); },
  ]) {
    const changedSources = cloneSources(); mutate(changedSources);
    assert.throws(() => parseJudgmentPrefixV6({ plan, prefixBytes, sources: changedSources }), /literal approved/u);
  }
  const changedPlan = structuredClone(plan);
  changedPlan.exactPublicCommit = '2'.repeat(40);
  assert.throws(() => parseJudgmentPrefixV6({ plan: changedPlan, prefixBytes, sources }), /does not derive exactly|run declaration/u);
});

test('audit flags refuse and unchanged validation-only fixture remains unreachable', () => {
  const { sources, plan, prefixBytes } = fresh();
  const refusal = JSON.parse(passOutputBytes);
  refusal.assessment = 'REFUSE';
  refusal.materialFindingCount = 1;
  refusal.materialFindings = [{ code: 'SEALED_EVIDENCE_CONTRADICTION', severity: 'material' }];
  refusal.processDefects = { status: 'material', severity: 'high', requiredVerification: ['RESOLVE_SEALED_EVIDENCE'] };
  assert.throws(() => evaluatePromptedScreeningRuntimeV6({ plan, prefixBytes, outputBytes: Buffer.from(`${canonical(refusal)}\n`), sources }), /unqualified PASS/u);
  assert.throws(() => evaluatePromptedScreeningRuntimeV6({ plan, prefixBytes, outputBytes: Buffer.concat([passOutputBytes, Buffer.from('qualified')]), sources }), /canonical JSON|LF-terminated/u);
  assert.throws(() => evaluateCompactProcessAuditAcceptanceV1({ outputBytes: passOutputBytes }), /validation-only no-model/u);
});

test('planner and runtime prefix schemas close every load-bearing object shape', () => {
  const planSchema = JSON.parse(readFileSync('schemas/prompted-screening-pre-dispatch-plan.v1.schema.json'));
  const prefixSchema = JSON.parse(readFileSync('schemas/prompted-screening-judgment-prefix.v1.schema.json'));
  assert.equal(planSchema.additionalProperties, false);
  assert.equal(planSchema.$defs.sourceIdentities.additionalProperties, false);
  assert.equal(planSchema.$defs.dispatch.additionalProperties, false);
  for (const key of ['runDeclaration', 'preflightPlan', 'dispatch', 'output', 'sourceIdentities']) assert.equal(prefixSchema.$defs[key].additionalProperties, false);
  assert.equal(prefixSchema.$defs.runDeclaration.properties.judgmentProfiles.const.length, 3);
  assert.equal(prefixSchema.$defs.runDeclaration.properties.judgmentAgentToolPolicy.const, 'none');
  assert.equal(prefixSchema.$defs.output.properties.infrastructureFailureCount.const, 0);
  assert.equal(prefixSchema.$defs.output.properties.retryCount.const, 0);
  assert.equal(prefixSchema.$defs.runDeclaration.properties.capabilityBoundary.const.providerExecution, 'not-machine-verified');
});
