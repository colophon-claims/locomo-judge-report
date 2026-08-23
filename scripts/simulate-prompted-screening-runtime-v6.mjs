import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { canonical, sha256 } from './render-compact-process-audit-input-v1.mjs';
import {
  buildPreDispatchPlanV6,
  loadPromptedScreeningV6Sources,
  sourceIdentitiesV6,
} from './plan-prompted-screening-v6.mjs';
import { evaluatePromptedScreeningRuntimeV6 } from './gate-prompted-screening-runtime-v6.mjs';
import { APPROVED_PROMPTED_SCREENING_V6_SHA256 } from './approved-prompted-screening-v6-identities.mjs';

export const SIMULATION_PUBLIC_COMMIT = '29b6b23fbc1db832bbe09b0f8b39fa346306a341';
const outputFixturePath = new URL('../fixtures/prompted-screening-runtime-v6-simulation-outputs.canonical.json', import.meta.url);
const prefixFixturePath = new URL('../fixtures/prompted-screening-runtime-v6-simulation-prefix.jsonl', import.meta.url);
const passOutputPath = new URL('../fixtures/prompted-screening-pilot-v5-no-run-audit-output.canonical.json', import.meta.url);
const outputFixtureKeys = ['modelRunOccurred', 'outputs', 'schema', 'status'];
const outputKeys = ['batchOrdinal', 'rawOutputBase64', 'rawOutputSha256', 'stage'];
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
function approvedIdentity(key) {
  const value = APPROVED_PROMPTED_SCREENING_V6_SHA256[key];
  if (typeof value !== 'string' || !/^sha256:[0-9a-f]{64}$/u.test(value) || /^sha256:0{64}$/u.test(value)) fail('approvedIdentities', `missing literal ${key}`);
  return value;
}
function loadSimulationOutputs() {
  const bytes = readFileSync(outputFixturePath);
  if (sha256(bytes) !== approvedIdentity('simulationOutputsV1')) fail('simulationOutputs', 'must match the literal test-only output fixture identity');
  const raw = bytes.toString('utf8');
  const value = JSON.parse(raw);
  if (raw !== `${canonical(value)}\n` || !exactKeys(value, outputFixtureKeys) || value.schema !== 'https://colophon-claims.github.io/locomo-judge-report/prompted-screening-runtime-simulation-outputs/v1' || value.status !== 'test-only-no-model-run' || value.modelRunOccurred !== false || !Array.isArray(value.outputs) || value.outputs.length !== 6 || value.outputs.some((row) => !exactKeys(row, outputKeys))) fail('simulationOutputs', 'must be the exact closed no-model output fixture');
  return value.outputs;
}

export function constructNoModelSimulationPrefixV6({
  exactPublicCommit = SIMULATION_PUBLIC_COMMIT,
  sources = loadPromptedScreeningV6Sources(),
} = {}) {
  const plan = buildPreDispatchPlanV6({ exactPublicCommit, sources });
  const planBytes = Buffer.from(`${canonical(plan)}\n`);
  const sourceIdentities = sourceIdentitiesV6(sources);
  const sourceIdentitiesSha256 = sha256(Buffer.from(`${canonical(sourceIdentities)}\n`));
  const outputs = loadSimulationOutputs();
  const events = [{
    event: 'run-declaration',
    protocol: 'prompted-codex-screening-judgment-prefix/v1',
    runId: 'test-only-v6-simulation-2026-08-23',
    sourceKind: 'synthetic-pilot',
    exactPublicCommit,
    planSha256: sha256(planBytes),
    sourceIdentities,
    coordinator: { modelAlias: 'gpt-5.6-sol', reasoning: 'high' },
    judgmentAgentToolPolicy: 'none',
    judgmentProfiles: plan.judgmentStages,
    auditProfile: { modelAlias: 'gpt-5.6-sol', reasoning: 'high', toolPolicy: 'none' },
    expectedJudgmentDispatchCount: 6,
    expectedProcessAuditDispatchCount: 1,
    reuseAllowed: false,
    realScreeningOccurred: false,
    capabilityBoundary: { ...capabilityBoundary },
  }, {
    event: 'preflight-plan',
    exactPublicCommit,
    planSha256: sha256(planBytes),
    planByteLength: planBytes.length,
    sourceIdentitiesSha256,
    itemCount: plan.itemCount,
    dispatchCount: plan.dispatchCount,
  }];
  plan.dispatches.forEach((dispatch, index) => {
    const output = outputs[index];
    if (output.stage !== dispatch.stage || output.batchOrdinal !== dispatch.batchOrdinal) fail(`simulationOutputs[${index}]`, 'does not align with the exact stage and batch plan');
    const taskId = `test-only-v6-simulation/${dispatch.stage.toLowerCase()}-${dispatch.batchOrdinal}`;
    events.push({ event: 'judgment-dispatch', taskId, stage: dispatch.stage, modelAlias: dispatch.modelAlias, reasoning: dispatch.reasoning, batchOrdinal: dispatch.batchOrdinal, batchCount: dispatch.batchCount, itemCount: dispatch.itemCount, sourceIdentitiesSha256, blindedItemsSha256: dispatch.blindedItemsSha256, dispatchSha256: dispatch.dispatchSha256, dispatchByteLength: dispatch.dispatchByteLength, dispatchBytesBase64: dispatch.dispatchBytesBase64 });
    const outputBytes = Buffer.from(output.rawOutputBase64, 'base64');
    if (outputBytes.toString('base64') !== output.rawOutputBase64 || sha256(outputBytes) !== output.rawOutputSha256) fail(`simulationOutputs[${index}]`, 'has noncanonical or incorrectly digested bytes');
    events.push({ event: 'judgment-output', taskId, stage: dispatch.stage, modelAlias: dispatch.modelAlias, reasoning: dispatch.reasoning, batchOrdinal: dispatch.batchOrdinal, rawOutputSha256: output.rawOutputSha256, rawOutputByteLength: outputBytes.length, rawOutputBase64: output.rawOutputBase64, infrastructureFailureCount: 0, retryCount: 0, toolCallCount: 0 });
  });
  return { plan, prefixBytes: Buffer.from(`${events.map(canonical).join('\n')}\n`) };
}

export function runNoModelSimulationV6() {
  const sources = loadPromptedScreeningV6Sources();
  const constructed = constructNoModelSimulationPrefixV6({ sources });
  const committedPrefixBytes = readFileSync(prefixFixturePath);
  if (sha256(committedPrefixBytes) !== approvedIdentity('simulationPrefixV1') || !committedPrefixBytes.equals(constructed.prefixBytes)) fail('simulationPrefix', 'must match the exact deterministic test-only prefix identity and reconstruction');
  const outputBytes = readFileSync(passOutputPath);
  const gated = evaluatePromptedScreeningRuntimeV6({ plan: constructed.plan, prefixBytes: committedPrefixBytes, outputBytes, sources });
  return Object.freeze({
    simulationStatus: 'test-only-no-model-end-to-end-green',
    modelRunOccurred: false,
    admissionRecordCreated: false,
    ritsuDecisionCount: 0,
    planSha256: sha256(Buffer.from(`${canonical(constructed.plan)}\n`)),
    prefixSha256: sha256(committedPrefixBytes),
    compactInputSha256: sha256(gated.compactInputBytes),
    compactInputByteLength: gated.compactInputBytes.length,
    auditDispatchSha256: sha256(gated.auditDispatchBytes),
    auditEventSha256: sha256(gated.auditEventBytes),
    gateStatus: gated.status,
    ritsuApprovalStillRequired: gated.ritsuApprovalStillRequired,
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  console.log(canonical(runNoModelSimulationV6()));
}
