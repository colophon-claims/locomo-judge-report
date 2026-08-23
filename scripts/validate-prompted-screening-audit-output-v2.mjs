import { canonical } from './render-compact-process-audit-input-v1.mjs';
import { parseCompactProcessAuditOutputV1 } from './validate-compact-process-audit-output-v1.mjs';

export const PROMPTED_SCREENING_AUDIT_OUTPUT_SCHEMA_V2 = 'https://colophon-claims.github.io/locomo-judge-report/prompted-screening-audit-output/v2';
export const PROMPTED_SCREENING_AUDIT_OUTPUT_PROTOCOL_V2 = 'prompted-codex-screening-audit-output/v2';

const bindingKeys = ['auditInputSha256', 'auditInstructionSha256', 'judgmentPrefixSha256', 'modelAlias', 'planSha256', 'reasoning', 'runId', 'sourceRevision', 'taskId', 'toolPolicy'];
const findingsKeys = ['assessment', 'capabilityBoundary', 'materialFindingCount', 'materialFindings', 'nonMaterialObservationCount', 'nonMaterialObservations', 'processDefects', 'suspiciousAgreement'];
const rootKeys = [...bindingKeys, ...findingsKeys, 'protocol', 'schema'];

function fail(path, detail) { throw new Error(`${path}: ${detail}`); }
function exactKeys(value, keys) { return value !== null && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join(',') === [...keys].sort().join(','); }
function exact(value, expected) { return canonical(value) === canonical(expected); }

function legacyOutput(value) {
  return {
    schema: 'https://colophon-claims.github.io/locomo-judge-report/compact-process-audit-output/v1',
    protocol: 'prompted-codex-screening-compact-process-audit-output/v1',
    ...Object.fromEntries(findingsKeys.map((key) => [key, value[key]])),
  };
}

export function auditOutputBindingV2(invocation) {
  return Object.fromEntries(bindingKeys.map((key) => [key, invocation[key]]));
}

export function parsePromptedScreeningAuditOutputV2(bytes, { expectedBinding } = {}) {
  if (!Buffer.isBuffer(bytes)) fail('auditOutputBytes', 'must be exact bytes');
  const raw = bytes.toString('utf8');
  if (!raw.endsWith('\n') || raw.includes('\r') || raw.includes(String.fromCodePoint(0x2014)) || !Buffer.from(raw).equals(bytes)) fail('auditOutputBytes', 'must be canonical LF-terminated UTF-8 without em dash');
  let value;
  try { value = JSON.parse(raw); } catch { fail('auditOutputBytes', 'must be JSON'); }
  if (raw !== `${canonical(value)}\n` || !exactKeys(value, rootKeys) || value.schema !== PROMPTED_SCREENING_AUDIT_OUTPUT_SCHEMA_V2 || value.protocol !== PROMPTED_SCREENING_AUDIT_OUTPUT_PROTOCOL_V2) fail('auditOutput', 'must be the exact closed bound version 2 output');
  const binding = Object.fromEntries(bindingKeys.map((key) => [key, value[key]]));
  if (!exactKeys(binding, bindingKeys)
    || typeof binding.runId !== 'string' || !/^[a-z0-9][a-z0-9-]{7,127}$/u.test(binding.runId)
    || typeof binding.taskId !== 'string' || !/^[a-z0-9][a-z0-9/_-]{7,191}$/u.test(binding.taskId)
    || !['auditInputSha256', 'auditInstructionSha256', 'judgmentPrefixSha256', 'planSha256'].every((key) => /^sha256:[0-9a-f]{64}$/u.test(binding[key]))
    || !(/^[0-9a-f]{40}$/u.test(binding.sourceRevision) || binding.sourceRevision === 'TEST_ONLY_UNCOMMITTED_V6_SOURCE')
    || binding.modelAlias !== 'gpt-5.6-sol' || binding.reasoning !== 'high' || binding.toolPolicy !== 'none') fail('auditOutput.binding', 'has an invalid closed invocation binding');
  if (expectedBinding && (!exactKeys(expectedBinding, bindingKeys) || !exact(binding, expectedBinding))) fail('auditOutput.binding', 'does not match the exact recomputed audit invocation');
  parseCompactProcessAuditOutputV1(Buffer.from(`${canonical(legacyOutput(value))}\n`));
  return value;
}

export function validatePromptedScreeningAuditFindingsV2(compactInput, output) {
  const agreement = compactInput?.aggregates?.agreements;
  if (!agreement || !Number.isInteger(agreement.threeStageAgreementCount) || compactInput.itemCount !== 24) fail('auditOutput.findings', 'requires exact derived agreement aggregates');
  const perfect = agreement.threeStageAgreementCount === compactInput.itemCount && agreement.anyDisagreementCount === 0;
  const claimsPerfect = output.suspiciousAgreement.status === 'observed'
    && output.suspiciousAgreement.code === 'PERFECT_SYNTHETIC_AGREEMENT'
    && output.nonMaterialObservations.some((row) => row.code === 'PERFECT_SYNTHETIC_AGREEMENT');
  const mentionsPerfect = output.suspiciousAgreement.status !== 'none'
    || output.suspiciousAgreement.code !== null
    || output.nonMaterialObservations.some((row) => row.code === 'PERFECT_SYNTHETIC_AGREEMENT');
  if ((perfect && !claimsPerfect) || (!perfect && mentionsPerfect)) fail('auditOutput.findings', 'PERFECT_SYNTHETIC_AGREEMENT does not match the exact audited input');
  return true;
}

export function evaluatePromptedScreeningAuditPolicyV2({ compactInput, outputBytes, expectedBinding }) {
  const output = parsePromptedScreeningAuditOutputV2(outputBytes, { expectedBinding });
  validatePromptedScreeningAuditFindingsV2(compactInput, output);
  return Object.freeze({
    policyPass: output.assessment === 'PASS' && output.materialFindingCount === 0,
    assessment: output.assessment,
    materialFindingCount: output.materialFindingCount,
    ritsuApprovalStillRequired: true,
    output,
  });
}

export function renderTestOnlyBoundAuditOutputV2({ binding, legacyFindings }) {
  const legacy = parseCompactProcessAuditOutputV1(legacyFindings);
  const value = {
    schema: PROMPTED_SCREENING_AUDIT_OUTPUT_SCHEMA_V2,
    protocol: PROMPTED_SCREENING_AUDIT_OUTPUT_PROTOCOL_V2,
    ...auditOutputBindingV2(binding),
    ...Object.fromEntries(findingsKeys.map((key) => [key, legacy[key]])),
  };
  return Buffer.from(`${canonical(value)}\n`);
}
