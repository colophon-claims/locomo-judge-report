import { canonical, sha256 } from './render-compact-process-audit-input-v1.mjs';
import { buildRuntimeCompactInputV7, parseJudgmentPrefixV7, renderRuntimeCompactInputV7 } from './build-prompted-screening-runtime-v7.mjs';
import { loadPromptedScreeningV7Sources, validatePreDispatchPlanV7 } from './plan-prompted-screening-v7.mjs';
import { parsePromptedScreeningAuditFindingsV1 } from './validate-prompted-screening-audit-findings-v1.mjs';

export const AUDIT_INVOCATION_SCHEMA_V2 = 'https://colophon-claims.github.io/locomo-judge-report/prompted-screening-audit-invocation/v2';
export const AUDIT_INVOCATION_PROTOCOL_V2 = 'prompted-codex-screening-audit-invocation/v2';
export const AUDIT_ENVELOPE_SCHEMA_V1 = 'https://colophon-claims.github.io/locomo-judge-report/prompted-screening-audit-envelope/v1';
export const AUDIT_ENVELOPE_PROTOCOL_V1 = 'prompted-codex-screening-audit-envelope/v1';
export const FINAL_TRANSCRIPT_PROTOCOL_V2 = 'prompted-codex-screening-final-transcript/v2';

const invocationKeys = ['auditInputByteLength', 'auditInputSha256', 'auditInstructionSha256', 'executionMode', 'judgmentPrefixSha256', 'modelAlias', 'modelRunOccurred', 'operatorAttestation', 'planSha256', 'protocol', 'reasoning', 'runId', 'schema', 'sourceRevision', 'taskId', 'testOnly', 'toolPolicy'];
const dispatchKeys = ['auditDispatchByteLength', 'auditDispatchBytesBase64', 'auditDispatchSha256', 'auditInputByteLength', 'auditInputSha256', 'auditInstructionSha256', 'auditInvocationSha256', 'event', 'executionMode', 'judgmentPrefixSha256', 'modelAlias', 'modelRunOccurred', 'operatorAttestation', 'planSha256', 'protocol', 'reasoning', 'runId', 'sourceRevision', 'taskId', 'testOnly', 'toolPolicy'];
const envelopeKeys = ['assessment', 'auditDispatchSha256', 'auditInputByteLength', 'auditInputSha256', 'auditInstructionSha256', 'auditInvocationSha256', 'capabilityBoundary', 'executionMode', 'judgmentPrefixSha256', 'materialFindings', 'modelAlias', 'modelRunOccurred', 'nonMaterialObservations', 'operatorAttestation', 'planSha256', 'protocol', 'rawAuditPayloadSha256', 'reasoning', 'runId', 'schema', 'sourceRevision', 'taskId', 'testOnly', 'toolPolicy'];
const outputKeys = ['assessment', 'auditDispatchSha256', 'auditEnvelopeBase64', 'auditEnvelopeByteLength', 'auditEnvelopeSha256', 'auditInputSha256', 'auditInstructionSha256', 'auditInvocationSha256', 'event', 'executionMode', 'infrastructureFailureCount', 'judgmentPrefixSha256', 'materialFindingCount', 'modelAlias', 'modelRunOccurred', 'operatorAttestation', 'planSha256', 'protocol', 'rawAuditPayloadBase64', 'rawAuditPayloadByteLength', 'rawAuditPayloadSha256', 'reasoning', 'retryCount', 'runId', 'sourceRevision', 'taskId', 'testOnly', 'toolCallCount', 'toolPolicy'];
const policyKeys = ['assessment', 'auditEnvelopeSha256', 'auditInvocationSha256', 'event', 'materialFindingCount', 'planSha256', 'policyPass', 'protocol', 'rawAuditPayloadSha256', 'runId', 'status'];
const terminalKeys = ['admissionEligible', 'auditEnvelopeSha256', 'auditInvocationSha256', 'event', 'modelRunOccurred', 'pendingRitsu', 'planSha256', 'policyPass', 'productionFinalizationEligible', 'protocol', 'rawAuditPayloadSha256', 'runId', 'sourceRevision', 'status', 'testOnly'];
const capabilityBoundary = Object.freeze({ providerExecution: 'not-machine-verified', processFreshness: 'not-machine-verified', independentGeneration: 'not-machine-verified', modelRouting: 'not-machine-verified', promptCompliance: 'not-machine-verified', invariantModelWeights: 'not-machine-verified', absenceOfBoundaryProofIsProcessDefect: false, clearSyntheticFixturePerfectAgreementIsMaterial: false });

function fail(path, detail) { throw new Error(`${path}: ${detail}`); }
function exactKeys(value, keys) { return value !== null && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join(',') === [...keys].sort().join(','); }
function exact(value, expected) { return canonical(value) === canonical(expected); }
function resolveJsonPointer(root, pointer) {
  let value = root;
  for (const token of pointer.slice(1).split('/').map((part) => part.replaceAll('~1', '/').replaceAll('~0', '~'))) {
    if (value === null || typeof value !== 'object' || !Object.hasOwn(value, token)) fail('auditFindings.evidenceReferences', `does not resolve in the exact compact input: ${pointer}`);
    value = value[token];
  }
  return value;
}
function parseCanonicalLines(bytes, count, path) {
  if (!Buffer.isBuffer(bytes)) fail(path, 'must be exact bytes');
  const raw = bytes.toString('utf8');
  if (!Buffer.from(raw).equals(bytes) || !raw.endsWith('\n') || raw.includes('\r')) fail(path, 'must be LF-terminated canonical UTF-8 JSONL');
  const lines = raw.slice(0, -1).split('\n');
  if (lines.length !== count) fail(path, `must contain exactly ${count} events`);
  return lines.map((line, index) => { let value; try { value = JSON.parse(line); } catch { fail(`${path}[${index}]`, 'must be JSON'); } if (line !== canonical(value)) fail(`${path}[${index}]`, 'must be canonical JSON'); return value; });
}

export function preparePromptedScreeningAuditV7({ plan, prefixBytes, taskId, sources = loadPromptedScreeningV7Sources() }) {
  validatePreDispatchPlanV7(plan, { sources });
  const replay = parseJudgmentPrefixV7({ plan, prefixBytes, sources });
  if (typeof taskId !== 'string' || !/^[a-z0-9][a-z0-9/_-]{7,191}$/u.test(taskId) || replay.taskIds.includes(taskId)) fail('auditTaskId', 'must be a new valid task identity distinct from every judgment task');
  const compactInput = buildRuntimeCompactInputV7({ plan, prefixBytes, sources });
  const compactInputBytes = renderRuntimeCompactInputV7({ plan, prefixBytes, sources });
  const invocation = { schema: AUDIT_INVOCATION_SCHEMA_V2, protocol: AUDIT_INVOCATION_PROTOCOL_V2, runId: replay.runId, planSha256: replay.planSha256, judgmentPrefixSha256: replay.judgmentTranscriptPrefixSha256, sourceRevision: plan.sourceRevision, auditInstructionSha256: sha256(sources.auditInstructionBytes), auditInputSha256: sha256(compactInputBytes), auditInputByteLength: compactInputBytes.length, taskId, modelAlias: 'gpt-5.6-sol', reasoning: 'high', toolPolicy: 'none', executionMode: replay.executionMode, testOnly: replay.testOnly, modelRunOccurred: replay.modelRunOccurred, operatorAttestation: replay.operatorAttestation };
  if (!exactKeys(invocation, invocationKeys)) fail('auditInvocation', 'has an invalid closed shape');
  const invocationBytes = Buffer.from(`${canonical(invocation)}\n`);
  const auditInvocationSha256 = sha256(invocationBytes);
  const bindingLineBytes = Buffer.from(`AUDIT INVOCATION SHA-256: ${auditInvocationSha256}\n`);
  const auditDispatchBytes = Buffer.concat([sources.auditInstructionBytes, bindingLineBytes, compactInputBytes]);
  const dispatchEvent = { event: 'process-audit-dispatch', protocol: FINAL_TRANSCRIPT_PROTOCOL_V2, runId: replay.runId, planSha256: replay.planSha256, judgmentPrefixSha256: replay.judgmentTranscriptPrefixSha256, sourceRevision: plan.sourceRevision, auditInstructionSha256: invocation.auditInstructionSha256, auditInputSha256: invocation.auditInputSha256, auditInputByteLength: compactInputBytes.length, auditInvocationSha256, auditDispatchSha256: sha256(auditDispatchBytes), auditDispatchByteLength: auditDispatchBytes.length, auditDispatchBytesBase64: auditDispatchBytes.toString('base64'), taskId, modelAlias: 'gpt-5.6-sol', reasoning: 'high', toolPolicy: 'none', executionMode: replay.executionMode, testOnly: replay.testOnly, modelRunOccurred: replay.modelRunOccurred, operatorAttestation: replay.operatorAttestation };
  if (!exactKeys(dispatchEvent, dispatchKeys)) fail('auditDispatchEvent', 'has an invalid closed shape');
  return Object.freeze({ replay, compactInput, compactInputBytes, invocation, invocationBytes, auditInvocationSha256, bindingLineBytes, auditDispatchBytes, dispatchEvent, dispatchEventBytes: Buffer.from(`${canonical(dispatchEvent)}\n`) });
}

export function composePromptedScreeningAuditEnvelopeV7({ preparation, rawPayloadBytes }) {
  const payload = parsePromptedScreeningAuditFindingsV1(rawPayloadBytes, { expectedAuditInvocationSha256: preparation.auditInvocationSha256 });
  for (const entry of [...payload.materialFindings, ...payload.nonMaterialObservations]) for (const pointer of entry.evidenceReferences) resolveJsonPointer(preparation.compactInput, pointer);
  const envelope = { schema: AUDIT_ENVELOPE_SCHEMA_V1, protocol: AUDIT_ENVELOPE_PROTOCOL_V1, runId: preparation.replay.runId, planSha256: preparation.replay.planSha256, judgmentPrefixSha256: preparation.replay.judgmentTranscriptPrefixSha256, sourceRevision: preparation.invocation.sourceRevision, auditInstructionSha256: preparation.invocation.auditInstructionSha256, auditInputSha256: preparation.invocation.auditInputSha256, auditInputByteLength: preparation.invocation.auditInputByteLength, auditInvocationSha256: preparation.auditInvocationSha256, auditDispatchSha256: sha256(preparation.auditDispatchBytes), rawAuditPayloadSha256: sha256(rawPayloadBytes), taskId: preparation.invocation.taskId, modelAlias: preparation.invocation.modelAlias, reasoning: preparation.invocation.reasoning, toolPolicy: preparation.invocation.toolPolicy, executionMode: preparation.invocation.executionMode, testOnly: preparation.invocation.testOnly, modelRunOccurred: preparation.invocation.modelRunOccurred, operatorAttestation: preparation.invocation.operatorAttestation, assessment: payload.assessment, materialFindings: payload.materialFindings, nonMaterialObservations: payload.nonMaterialObservations, capabilityBoundary: { ...capabilityBoundary } };
  if (!exactKeys(envelope, envelopeKeys)) fail('auditEnvelope', 'has an invalid recorder-owned closed shape');
  const envelopeBytes = Buffer.from(`${canonical(envelope)}\n`);
  return Object.freeze({ payload, envelope, envelopeBytes, envelopeSha256: sha256(envelopeBytes) });
}

export function buildPromptedScreeningAuditOutputEventV7({ preparation, rawPayloadBytes, infrastructureFailureCount = 0, retryCount = 0, toolCallCount = 0 }) {
  if (infrastructureFailureCount !== 0 || retryCount !== 0 || toolCallCount !== 0) fail('auditOutputReceipt', 'this closed protocol accepts zero failure, retry, and tool counts only');
  const composed = composePromptedScreeningAuditEnvelopeV7({ preparation, rawPayloadBytes });
  const event = { event: 'process-audit-output', protocol: FINAL_TRANSCRIPT_PROTOCOL_V2, runId: preparation.replay.runId, planSha256: preparation.replay.planSha256, judgmentPrefixSha256: preparation.replay.judgmentTranscriptPrefixSha256, sourceRevision: preparation.invocation.sourceRevision, auditInstructionSha256: preparation.invocation.auditInstructionSha256, auditInputSha256: preparation.invocation.auditInputSha256, auditInvocationSha256: preparation.auditInvocationSha256, auditDispatchSha256: sha256(preparation.auditDispatchBytes), rawAuditPayloadSha256: sha256(rawPayloadBytes), rawAuditPayloadByteLength: rawPayloadBytes.length, rawAuditPayloadBase64: rawPayloadBytes.toString('base64'), auditEnvelopeSha256: composed.envelopeSha256, auditEnvelopeByteLength: composed.envelopeBytes.length, auditEnvelopeBase64: composed.envelopeBytes.toString('base64'), taskId: preparation.invocation.taskId, modelAlias: preparation.invocation.modelAlias, reasoning: preparation.invocation.reasoning, toolPolicy: preparation.invocation.toolPolicy, executionMode: preparation.replay.executionMode, testOnly: preparation.replay.testOnly, modelRunOccurred: preparation.replay.modelRunOccurred, operatorAttestation: preparation.replay.operatorAttestation, infrastructureFailureCount: 0, retryCount: 0, toolCallCount: 0, assessment: composed.payload.assessment, materialFindingCount: composed.payload.materialFindings.length };
  if (!exactKeys(event, outputKeys)) fail('auditOutputEvent', 'has an invalid closed shape');
  return Object.freeze({ ...composed, event, eventBytes: Buffer.from(`${canonical(event)}\n`) });
}

function policyEvent(preparation, composed) {
  const policyPass = composed.envelope.assessment === 'PASS' && composed.envelope.materialFindings.length === 0;
  const event = { event: 'audit-policy', protocol: FINAL_TRANSCRIPT_PROTOCOL_V2, runId: preparation.replay.runId, planSha256: preparation.replay.planSha256, auditInvocationSha256: preparation.auditInvocationSha256, rawAuditPayloadSha256: composed.envelope.rawAuditPayloadSha256, auditEnvelopeSha256: composed.envelopeSha256, assessment: composed.envelope.assessment, materialFindingCount: composed.envelope.materialFindings.length, policyPass, status: policyPass ? 'PASS' : 'REFUSE' };
  if (!exactKeys(event, policyKeys)) fail('auditPolicy', 'has an invalid closed shape');
  return event;
}

function terminalEvent(preparation, composed, policy) {
  const production = preparation.replay.executionMode === 'production-recording' && preparation.replay.testOnly === false && preparation.replay.modelRunOccurred === true && preparation.replay.operatorAttestation.kind === 'operator-recorded-model-run';
  const status = !production ? 'TEST_ONLY_NON_ADMISSIBLE' : policy.policyPass ? 'PENDING_RITSU' : 'PROCESS_REFUSED';
  const event = { event: 'terminal', protocol: FINAL_TRANSCRIPT_PROTOCOL_V2, runId: preparation.replay.runId, planSha256: preparation.replay.planSha256, sourceRevision: preparation.invocation.sourceRevision, auditInvocationSha256: preparation.auditInvocationSha256, rawAuditPayloadSha256: composed.envelope.rawAuditPayloadSha256, auditEnvelopeSha256: composed.envelopeSha256, testOnly: preparation.replay.testOnly, modelRunOccurred: preparation.replay.modelRunOccurred, policyPass: policy.policyPass, productionFinalizationEligible: production && policy.policyPass, pendingRitsu: status === 'PENDING_RITSU', admissionEligible: false, status };
  if (!exactKeys(event, terminalKeys)) fail('terminal', 'has an invalid closed shape');
  return event;
}

export function buildPromptedScreeningFinalTranscriptV7({ plan, prefixBytes, auditTaskId, rawPayloadBytes, sources = loadPromptedScreeningV7Sources() }) {
  const preparation = preparePromptedScreeningAuditV7({ plan, prefixBytes, taskId: auditTaskId, sources });
  const output = buildPromptedScreeningAuditOutputEventV7({ preparation, rawPayloadBytes });
  const policy = policyEvent(preparation, output);
  const terminal = terminalEvent(preparation, output, policy);
  const finalTranscriptBytes = Buffer.concat([prefixBytes, preparation.dispatchEventBytes, output.eventBytes, Buffer.from(`${canonical(policy)}\n`), Buffer.from(`${canonical(terminal)}\n`)]);
  const result = Object.freeze({ status: terminal.status, policyPass: policy.policyPass, assessment: output.envelope.assessment, pendingRitsu: terminal.pendingRitsu, admissionEligible: false, auditInvocationSha256: preparation.auditInvocationSha256, rawAuditPayloadSha256: output.envelope.rawAuditPayloadSha256, auditEnvelopeSha256: output.envelopeSha256, finalTranscriptSha256: sha256(finalTranscriptBytes) });
  return Object.freeze({ preparation, output, policy, terminal, finalTranscriptBytes, result });
}

export function finalizeProductionPromptedScreeningV7(options) {
  const built = buildPromptedScreeningFinalTranscriptV7(options);
  if (built.terminal.testOnly || !built.terminal.modelRunOccurred || !built.terminal.productionFinalizationEligible || built.terminal.status !== 'PENDING_RITSU') fail('productionFinalizer', 'requires non-test operator-attested recorded execution and an exact bound PASS payload');
  return built;
}

export function validatePromptedScreeningFinalTranscriptV7({ plan, finalTranscriptBytes, sources = loadPromptedScreeningV7Sources() }) {
  const events = parseCanonicalLines(finalTranscriptBytes, 18, 'finalTranscriptBytes');
  const lines = finalTranscriptBytes.toString('utf8').slice(0, -1).split('\n');
  const prefixBytes = Buffer.from(`${lines.slice(0, 14).join('\n')}\n`);
  if (!exactKeys(events[14], dispatchKeys) || !exactKeys(events[15], outputKeys) || !exactKeys(events[16], policyKeys) || !exactKeys(events[17], terminalKeys)) fail('finalTranscript', 'contains an invalid closed appended event shape');
  const rawPayloadBytes = Buffer.from(events[15].rawAuditPayloadBase64, 'base64');
  const envelopeBytes = Buffer.from(events[15].auditEnvelopeBase64, 'base64');
  if (rawPayloadBytes.toString('base64') !== events[15].rawAuditPayloadBase64 || envelopeBytes.toString('base64') !== events[15].auditEnvelopeBase64) fail('finalTranscript', 'contains noncanonical base64');
  const rebuilt = buildPromptedScreeningFinalTranscriptV7({ plan, prefixBytes, auditTaskId: events[15].taskId, rawPayloadBytes, sources });
  if (!rebuilt.finalTranscriptBytes.equals(finalTranscriptBytes) || !rebuilt.output.envelopeBytes.equals(envelopeBytes)) fail('finalTranscript', 'does not exactly replay recorder-owned invocation, raw payload, composed envelope, policy, and terminal bytes');
  return rebuilt.result;
}
