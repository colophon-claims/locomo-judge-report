import { canonical, sha256 } from './render-compact-process-audit-input-v1.mjs';
import { buildRuntimeCompactInputV6, parseJudgmentPrefixV6, renderRuntimeCompactInputV6 } from './build-prompted-screening-runtime-v6.mjs';
import { loadPromptedScreeningV6Sources, validatePreDispatchPlanV6 } from './plan-prompted-screening-v6.mjs';
import { auditOutputBindingV2, evaluatePromptedScreeningAuditPolicyV2, parsePromptedScreeningAuditOutputV2 } from './validate-prompted-screening-audit-output-v2.mjs';

export const AUDIT_INVOCATION_SCHEMA_V1 = 'https://colophon-claims.github.io/locomo-judge-report/prompted-screening-audit-invocation/v1';
export const AUDIT_INVOCATION_PROTOCOL_V1 = 'prompted-codex-screening-audit-invocation/v1';
export const FINAL_TRANSCRIPT_PROTOCOL_V1 = 'prompted-codex-screening-final-transcript/v1';

const invocationKeys = ['auditInputByteLength', 'auditInputSha256', 'auditInstructionSha256', 'executionMode', 'judgmentPrefixSha256', 'modelAlias', 'modelRunOccurred', 'operatorAttestation', 'planSha256', 'protocol', 'reasoning', 'runId', 'schema', 'sourceRevision', 'taskId', 'testOnly', 'toolPolicy'];
const auditDispatchKeys = ['auditDispatchByteLength', 'auditDispatchBytesBase64', 'auditDispatchSha256', 'auditInputByteLength', 'auditInputSha256', 'auditInstructionSha256', 'event', 'executionMode', 'judgmentPrefixSha256', 'modelAlias', 'modelRunOccurred', 'operatorAttestation', 'planSha256', 'protocol', 'reasoning', 'runId', 'sourceRevision', 'taskId', 'testOnly', 'toolPolicy'];
const auditOutputEventKeys = ['assessment', 'auditDispatchSha256', 'auditInputSha256', 'auditInstructionSha256', 'auditOutputBase64', 'auditOutputByteLength', 'auditOutputSha256', 'event', 'executionMode', 'infrastructureFailureCount', 'judgmentPrefixSha256', 'materialFindingCount', 'modelAlias', 'modelRunOccurred', 'operatorAttestation', 'planSha256', 'protocol', 'reasoning', 'retryCount', 'runId', 'sourceRevision', 'taskId', 'testOnly', 'toolCallCount', 'toolPolicy'];
const comparisonKeys = ['auditInputSha256', 'auditOutputSha256', 'derivedPerfectAgreement', 'event', 'judgmentPrefixSha256', 'planSha256', 'protocol', 'reportedPerfectAgreement', 'runId', 'status'];
const terminalKeys = ['admissionEligible', 'auditInputSha256', 'auditOutputSha256', 'event', 'modelRunOccurred', 'pendingRitsu', 'planSha256', 'policyPass', 'productionFinalizationEligible', 'protocol', 'runId', 'sourceRevision', 'status', 'testOnly'];

function fail(path, detail) { throw new Error(`${path}: ${detail}`); }
function exactKeys(value, keys) { return value !== null && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join(',') === [...keys].sort().join(','); }
function exact(value, expected) { return canonical(value) === canonical(expected); }
function parseCanonicalLines(bytes, count, path) {
  if (!Buffer.isBuffer(bytes)) fail(path, 'must be exact bytes'); const raw = bytes.toString('utf8');
  if (!Buffer.from(raw).equals(bytes) || !raw.endsWith('\n') || raw.includes('\r')) fail(path, 'must be LF-terminated canonical UTF-8 JSONL');
  const lines = raw.slice(0, -1).split('\n'); if (lines.length !== count) fail(path, `must contain exactly ${count} events`);
  return lines.map((line, index) => { let value; try { value = JSON.parse(line); } catch { fail(`${path}[${index}]`, 'must be JSON'); } if (line !== canonical(value)) fail(`${path}[${index}]`, 'must be canonical JSON'); return value; });
}

export function preparePromptedScreeningAuditV6({ plan, prefixBytes, taskId, sources = loadPromptedScreeningV6Sources() }) {
  validatePreDispatchPlanV6(plan, { sources }); const replay = parseJudgmentPrefixV6({ plan, prefixBytes, sources });
  if (typeof taskId !== 'string' || !/^[a-z0-9][a-z0-9/_-]{7,191}$/u.test(taskId) || replay.taskIds.includes(taskId)) fail('auditTaskId', 'must be a new valid task identity distinct from every judgment task');
  const compactInput = buildRuntimeCompactInputV6({ plan, prefixBytes, sources }); const compactInputBytes = renderRuntimeCompactInputV6({ plan, prefixBytes, sources }); const planSha256 = replay.planSha256;
  const invocation = { schema: AUDIT_INVOCATION_SCHEMA_V1, protocol: AUDIT_INVOCATION_PROTOCOL_V1, runId: replay.runId, planSha256, judgmentPrefixSha256: replay.judgmentTranscriptPrefixSha256, sourceRevision: plan.sourceRevision, auditInstructionSha256: sha256(sources.auditInstructionBytes), auditInputSha256: sha256(compactInputBytes), auditInputByteLength: compactInputBytes.length, taskId, modelAlias: 'gpt-5.6-sol', reasoning: 'high', toolPolicy: 'none', executionMode: replay.executionMode, testOnly: replay.testOnly, modelRunOccurred: replay.modelRunOccurred, operatorAttestation: replay.operatorAttestation };
  if (!exactKeys(invocation, invocationKeys)) fail('auditInvocation', 'has an invalid closed shape');
  const invocationBytes = Buffer.from(`${canonical(invocation)}\n`); const auditDispatchBytes = Buffer.concat([sources.auditInstructionBytes, invocationBytes, compactInputBytes]);
  const dispatchEvent = { event: 'process-audit-dispatch', protocol: FINAL_TRANSCRIPT_PROTOCOL_V1, runId: replay.runId, planSha256, judgmentPrefixSha256: replay.judgmentTranscriptPrefixSha256, sourceRevision: plan.sourceRevision, auditInstructionSha256: invocation.auditInstructionSha256, auditInputSha256: invocation.auditInputSha256, auditInputByteLength: compactInputBytes.length, auditDispatchSha256: sha256(auditDispatchBytes), auditDispatchByteLength: auditDispatchBytes.length, auditDispatchBytesBase64: auditDispatchBytes.toString('base64'), taskId, modelAlias: 'gpt-5.6-sol', reasoning: 'high', toolPolicy: 'none', executionMode: replay.executionMode, testOnly: replay.testOnly, modelRunOccurred: replay.modelRunOccurred, operatorAttestation: replay.operatorAttestation };
  if (!exactKeys(dispatchEvent, auditDispatchKeys)) fail('auditDispatchEvent', 'has an invalid closed shape');
  return Object.freeze({ replay, compactInput, compactInputBytes, invocation, invocationBytes, auditDispatchBytes, dispatchEvent, dispatchEventBytes: Buffer.from(`${canonical(dispatchEvent)}\n`) });
}

export function evaluatePromptedScreeningAuditV6({ preparation, outputBytes }) {
  const binding = auditOutputBindingV2(preparation.invocation); const policy = evaluatePromptedScreeningAuditPolicyV2({ compactInput: preparation.compactInput, outputBytes, expectedBinding: binding });
  return Object.freeze({ status: policy.policyPass ? 'AUDIT_POLICY_PASS' : 'AUDIT_POLICY_REFUSE', policyPass: policy.policyPass, productionStatus: null, output: policy.output });
}

export function buildPromptedScreeningAuditOutputEventV6({ preparation, outputBytes, infrastructureFailureCount = 0, retryCount = 0, toolCallCount = 0 }) {
  if (infrastructureFailureCount !== 0 || retryCount !== 0 || toolCallCount !== 0) fail('auditOutputReceipt', 'this closed protocol accepts zero failure, retry, and tool counts only');
  const output = parsePromptedScreeningAuditOutputV2(outputBytes, { expectedBinding: auditOutputBindingV2(preparation.invocation) });
  const event = { event: 'process-audit-output', protocol: FINAL_TRANSCRIPT_PROTOCOL_V1, runId: preparation.replay.runId, planSha256: preparation.replay.planSha256, judgmentPrefixSha256: preparation.replay.judgmentTranscriptPrefixSha256, sourceRevision: preparation.invocation.sourceRevision, auditInstructionSha256: preparation.invocation.auditInstructionSha256, auditInputSha256: preparation.invocation.auditInputSha256, auditDispatchSha256: sha256(preparation.auditDispatchBytes), auditOutputSha256: sha256(outputBytes), auditOutputByteLength: outputBytes.length, auditOutputBase64: outputBytes.toString('base64'), taskId: preparation.invocation.taskId, modelAlias: 'gpt-5.6-sol', reasoning: 'high', toolPolicy: 'none', executionMode: preparation.replay.executionMode, testOnly: preparation.replay.testOnly, modelRunOccurred: preparation.replay.modelRunOccurred, operatorAttestation: preparation.replay.operatorAttestation, infrastructureFailureCount: 0, retryCount: 0, toolCallCount: 0, assessment: output.assessment, materialFindingCount: output.materialFindingCount };
  if (!exactKeys(event, auditOutputEventKeys)) fail('auditOutputEvent', 'has an invalid closed shape'); return Object.freeze({ event, eventBytes: Buffer.from(`${canonical(event)}\n`), output });
}

function comparisonEvent(preparation, outputBytes, output) {
  const derivedPerfectAgreement = preparation.compactInput.aggregates.agreements.threeStageAgreementCount === preparation.compactInput.itemCount && preparation.compactInput.aggregates.agreements.anyDisagreementCount === 0;
  const reportedPerfectAgreement = output.suspiciousAgreement.status === 'observed';
  const event = { event: 'mechanical-comparison', protocol: FINAL_TRANSCRIPT_PROTOCOL_V1, runId: preparation.replay.runId, planSha256: preparation.replay.planSha256, judgmentPrefixSha256: preparation.replay.judgmentTranscriptPrefixSha256, auditInputSha256: preparation.invocation.auditInputSha256, auditOutputSha256: sha256(outputBytes), derivedPerfectAgreement, reportedPerfectAgreement, status: derivedPerfectAgreement === reportedPerfectAgreement ? 'MATCH' : 'REFUSE' };
  if (!exactKeys(event, comparisonKeys) || event.status !== 'MATCH') fail('mechanicalComparison', 'audit findings do not match derived evidence'); return event;
}
function terminalEvent(preparation, outputBytes, policyPass) {
  const production = preparation.replay.executionMode === 'production-recording' && preparation.replay.testOnly === false && preparation.replay.modelRunOccurred === true && preparation.replay.operatorAttestation.kind === 'operator-recorded-model-run';
  const status = !production ? 'TEST_ONLY_NON_ADMISSIBLE' : policyPass ? 'PENDING_RITSU' : 'PROCESS_REFUSED';
  const event = { event: 'terminal', protocol: FINAL_TRANSCRIPT_PROTOCOL_V1, runId: preparation.replay.runId, planSha256: preparation.replay.planSha256, sourceRevision: preparation.invocation.sourceRevision, auditInputSha256: preparation.invocation.auditInputSha256, auditOutputSha256: sha256(outputBytes), testOnly: preparation.replay.testOnly, modelRunOccurred: preparation.replay.modelRunOccurred, policyPass, productionFinalizationEligible: production && policyPass, pendingRitsu: status === 'PENDING_RITSU', admissionEligible: false, status };
  if (!exactKeys(event, terminalKeys)) fail('terminal', 'has an invalid closed shape'); return event;
}

export function buildPromptedScreeningFinalTranscriptV6({ plan, prefixBytes, auditTaskId, outputBytes, sources = loadPromptedScreeningV6Sources() }) {
  const preparation = preparePromptedScreeningAuditV6({ plan, prefixBytes, taskId: auditTaskId, sources }); const policy = evaluatePromptedScreeningAuditV6({ preparation, outputBytes }); const outputEvent = buildPromptedScreeningAuditOutputEventV6({ preparation, outputBytes }); const comparison = comparisonEvent(preparation, outputBytes, policy.output); const terminal = terminalEvent(preparation, outputBytes, policy.policyPass);
  const finalTranscriptBytes = Buffer.concat([prefixBytes, preparation.dispatchEventBytes, outputEvent.eventBytes, Buffer.from(`${canonical(comparison)}\n`), Buffer.from(`${canonical(terminal)}\n`)]);
  return Object.freeze({ preparation, policy, outputEvent, comparison, terminal, finalTranscriptBytes, result: Object.freeze({ status: terminal.status, policyPass: policy.policyPass, pendingRitsu: terminal.pendingRitsu, admissionEligible: false, finalTranscriptSha256: sha256(finalTranscriptBytes) }) });
}

export function finalizeProductionPromptedScreeningV6(options) {
  const built = buildPromptedScreeningFinalTranscriptV6(options);
  if (built.terminal.testOnly || !built.terminal.modelRunOccurred || !built.terminal.productionFinalizationEligible || built.terminal.status !== 'PENDING_RITSU') fail('productionFinalizer', 'requires non-test operator-attested recorded execution and a bound policy PASS');
  return built;
}

export function validatePromptedScreeningFinalTranscriptV6({ plan, finalTranscriptBytes, sources = loadPromptedScreeningV6Sources() }) {
  const events = parseCanonicalLines(finalTranscriptBytes, 18, 'finalTranscriptBytes'); const lines = finalTranscriptBytes.toString('utf8').slice(0, -1).split('\n'); const prefixBytes = Buffer.from(`${lines.slice(0, 14).join('\n')}\n`); const outputEvent = events[15];
  if (!exactKeys(events[14], auditDispatchKeys) || !exactKeys(outputEvent, auditOutputEventKeys) || !exactKeys(events[16], comparisonKeys) || !exactKeys(events[17], terminalKeys)) fail('finalTranscript', 'contains an invalid closed appended event shape');
  const outputBytes = Buffer.from(outputEvent.auditOutputBase64, 'base64'); if (outputBytes.toString('base64') !== outputEvent.auditOutputBase64) fail('finalTranscript.auditOutput', 'must be strict canonical base64');
  const rebuilt = buildPromptedScreeningFinalTranscriptV6({ plan, prefixBytes, auditTaskId: outputEvent.taskId, outputBytes, sources }); if (!rebuilt.finalTranscriptBytes.equals(finalTranscriptBytes)) fail('finalTranscript', 'does not exactly replay plan, prefix, audit dispatch, output, comparison, and terminal bytes');
  return rebuilt.result;
}
