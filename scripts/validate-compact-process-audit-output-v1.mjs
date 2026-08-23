import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { APPROVED_PROMPTED_SCREENING_V5_SHA256 } from './approved-prompted-screening-v5-identities.mjs';
import { canonical, sha256 } from './render-compact-process-audit-input-v1.mjs';
import {
  CAPABILITY_BOUNDARY,
  deriveCompactProcessAuditInputV2,
  loadApprovedSyntheticAuditEvidenceV2,
  renderCompactProcessAuditInputV2,
} from './render-compact-process-audit-input-v2.mjs';

const instructionPath = new URL('../CODEX-SCREENING-AUDIT-INSTRUCTION.v1.txt', import.meta.url);
const schemaPath = new URL('../schemas/compact-process-audit-output.v1.schema.json', import.meta.url);
const gatePath = new URL('./validate-compact-process-audit-output-v1.mjs', import.meta.url);

export const COMPACT_PROCESS_AUDIT_OUTPUT_SCHEMA_V1 = 'https://colophon-claims.github.io/locomo-judge-report/compact-process-audit-output/v1';
export const COMPACT_PROCESS_AUDIT_OUTPUT_PROTOCOL_V1 = 'prompted-codex-screening-compact-process-audit-output/v1';

const rootKeys = ['assessment', 'capabilityBoundary', 'materialFindingCount', 'materialFindings', 'nonMaterialObservationCount', 'nonMaterialObservations', 'processDefects', 'protocol', 'schema', 'suspiciousAgreement'];
const findingKeys = ['code', 'severity'];
const observationKeys = ['code'];
const defectKeys = ['requiredVerification', 'severity', 'status'];
const suspiciousKeys = ['code', 'material', 'status'];
const capabilityKeys = ['absenceOfBoundaryProofIsProcessDefect', 'invariantAliasWeights', 'modelRouting', 'processFreshness', 'promptCompliance', 'providerExecution'];
const materialCodes = ['MACHINE_VALIDATION_FAILURE', 'OUTPUT_CONTRACT_FAILURE', 'SEALED_EVIDENCE_CONTRADICTION', 'SOURCE_IDENTITY_FAILURE', 'UNRESOLVED_REQUIRED_VERIFICATION'];
const observationCodes = ['CONTENT_DIGEST_EQUALITY', 'INVARIANT_ALIAS_WEIGHTS_NOT_MACHINE_VERIFIED', 'MODEL_ROUTING_NOT_MACHINE_VERIFIED', 'PERFECT_SYNTHETIC_AGREEMENT', 'PROCESS_FRESHNESS_NOT_MACHINE_VERIFIED', 'PROMPT_COMPLIANCE_NOT_MACHINE_VERIFIED', 'PROVIDER_EXECUTION_NOT_MACHINE_VERIFIED'];
const requiredVerificationCodes = ['RECHECK_MACHINE_VALIDATION', 'RESOLVE_OUTPUT_CONTRACT', 'RESOLVE_SEALED_EVIDENCE', 'RESOLVE_SOURCE_IDENTITY', 'STOP_AND_ESCALATE_TO_RITSU'];
const exactCapability = Object.freeze({
  absenceOfBoundaryProofIsProcessDefect: false,
  invariantAliasWeights: CAPABILITY_BOUNDARY.invariantAliasWeights,
  modelRouting: CAPABILITY_BOUNDARY.modelRouting,
  processFreshness: CAPABILITY_BOUNDARY.providerProcessFreshness,
  promptCompliance: CAPABILITY_BOUNDARY.promptCompliance,
  providerExecution: CAPABILITY_BOUNDARY.providerExecution,
});

function fail(path, detail) { throw new Error(`${path}: ${detail}`); }
function exactKeys(value, keys) { return value !== null && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join(',') === [...keys].sort().join(','); }
function exact(value, expected) { return canonical(value) === canonical(expected); }
function uniqueSorted(rows, selector) { const values = rows.map(selector); return new Set(values).size === values.length && values.join(',') === [...values].sort().join(','); }
function approvedIdentity(key) {
  const value = APPROVED_PROMPTED_SCREENING_V5_SHA256[key];
  if (typeof value !== 'string' || !/^sha256:[0-9a-f]{64}$/u.test(value)) fail('approvedIdentities', `missing literal ${key}`);
  return value;
}

export function validateCompactProcessAuditOutputSourceBytesV1({
  instructionBytes = readFileSync(instructionPath),
  schemaBytes = readFileSync(schemaPath),
  gateBytes = readFileSync(gatePath),
} = {}) {
  for (const [path, bytes, identity] of [
    ['instructionBytes', instructionBytes, approvedIdentity('processAuditInstructionV1')],
    ['schemaBytes', schemaBytes, approvedIdentity('processAuditOutputSchemaV1')],
    ['gateBytes', gateBytes, approvedIdentity('processAuditOutputGateV1')],
  ]) if (!Buffer.isBuffer(bytes) || sha256(bytes) !== identity) fail(path, `must match literal approved ${identity}`);
  return true;
}

export function parseCompactProcessAuditOutputV1(bytes) {
  if (!Buffer.isBuffer(bytes)) fail('outputBytes', 'must be exact bytes');
  const raw = bytes.toString('utf8');
  if (!raw.endsWith('\n') || raw.includes('\r') || raw.includes(String.fromCodePoint(0x2014))) fail('outputBytes', 'must be LF-terminated UTF-8 without em dash');
  let value;
  try { value = JSON.parse(raw); } catch { fail('outputBytes', 'must be JSON'); }
  if (raw !== `${canonical(value)}\n`) fail('outputBytes', 'must be exact canonical JSON plus one LF and no prose or suffix');
  if (!exactKeys(value, rootKeys) || value.schema !== COMPACT_PROCESS_AUDIT_OUTPUT_SCHEMA_V1 || value.protocol !== COMPACT_PROCESS_AUDIT_OUTPUT_PROTOCOL_V1 || !['PASS', 'REFUSE'].includes(value.assessment)) fail('output', 'has an invalid closed root');
  if (!Number.isInteger(value.materialFindingCount) || value.materialFindingCount !== value.materialFindings?.length || value.materialFindingCount > 5 || !Array.isArray(value.materialFindings) || !uniqueSorted(value.materialFindings, (row) => row.code)) fail('output.materialFindings', 'must have exact count, uniqueness, and sorted order');
  for (const row of value.materialFindings) if (!exactKeys(row, findingKeys) || !materialCodes.includes(row.code) || row.severity !== 'material') fail('output.materialFindings', 'contains an invalid material finding');
  if (!Number.isInteger(value.nonMaterialObservationCount) || value.nonMaterialObservationCount !== value.nonMaterialObservations?.length || value.nonMaterialObservationCount > 7 || !Array.isArray(value.nonMaterialObservations) || !uniqueSorted(value.nonMaterialObservations, (row) => row.code)) fail('output.nonMaterialObservations', 'must have exact count, uniqueness, and sorted order');
  for (const row of value.nonMaterialObservations) if (!exactKeys(row, observationKeys) || !observationCodes.includes(row.code)) fail('output.nonMaterialObservations', 'contains an invalid observation');
  if (!exactKeys(value.processDefects, defectKeys) || !['material', 'none'].includes(value.processDefects.status) || !['high', 'none'].includes(value.processDefects.severity) || !Array.isArray(value.processDefects.requiredVerification) || !uniqueSorted(value.processDefects.requiredVerification, (row) => row) || value.processDefects.requiredVerification.some((code) => !requiredVerificationCodes.includes(code))) fail('output.processDefects', 'has an invalid closed process-defect result');
  if (!exactKeys(value.suspiciousAgreement, suspiciousKeys) || value.suspiciousAgreement.material !== false || !['none', 'observed'].includes(value.suspiciousAgreement.status) || (value.suspiciousAgreement.status === 'none' ? value.suspiciousAgreement.code !== null : value.suspiciousAgreement.code !== 'PERFECT_SYNTHETIC_AGREEMENT')) fail('output.suspiciousAgreement', 'has an invalid non-material suspicious-agreement result');
  if (!exactKeys(value.capabilityBoundary, capabilityKeys) || !exact(value.capabilityBoundary, exactCapability)) fail('output.capabilityBoundary', 'overclaims a non-machine-verified capability');
  const clean = value.materialFindingCount === 0;
  if (clean !== (value.assessment === 'PASS') || clean !== (value.processDefects.status === 'none') || clean !== (value.processDefects.severity === 'none') || (clean ? value.processDefects.requiredVerification.length !== 0 : value.processDefects.requiredVerification.length === 0)) fail('output', 'PASS, material findings, defect status, severity, and required verification do not reconcile');
  if (value.suspiciousAgreement.status === 'observed' && !value.nonMaterialObservations.some((row) => row.code === 'PERFECT_SYNTHETIC_AGREEMENT')) fail('output.suspiciousAgreement', 'must reconcile to the corresponding observation');
  return value;
}

export function evaluateAuditOutputPolicyV1(bytes) {
  const value = parseCompactProcessAuditOutputV1(bytes);
  return Object.freeze({ policyPass: value.assessment === 'PASS' && value.materialFindingCount === 0, assessment: value.assessment, materialFindingCount: value.materialFindingCount, ritsuApprovalStillRequired: true });
}

export function buildCompactProcessAuditEventV1(inputBytes, outputBytes) {
  const output = parseCompactProcessAuditOutputV1(outputBytes);
  const event = {
    event: 'compact-process-audit-output', protocol: COMPACT_PROCESS_AUDIT_OUTPUT_PROTOCOL_V1,
    modelAlias: 'gpt-5.6-sol', reasoning: 'high', toolPolicy: 'none',
    auditInstructionSha256: approvedIdentity('processAuditInstructionV1'),
    auditInputSha256: sha256(inputBytes), auditInputByteLength: inputBytes.length,
    auditOutputSchemaSha256: approvedIdentity('processAuditOutputSchemaV1'),
    auditOutputSha256: sha256(outputBytes), auditOutputByteLength: outputBytes.length,
    assessment: output.assessment, materialFindingCount: output.materialFindingCount,
  };
  return Buffer.from(`${canonical(event)}\n`);
}

export function evaluateCompactProcessAuditAcceptanceV1({ evidence = loadApprovedSyntheticAuditEvidenceV2(), outputBytes }) {
  validateCompactProcessAuditOutputSourceBytesV1();
  const input = deriveCompactProcessAuditInputV2(evidence);
  const inputBytes = renderCompactProcessAuditInputV2(evidence);
  const policy = evaluateAuditOutputPolicyV1(outputBytes);
  if (input.executionKind !== 'recorded-model-run') fail('acceptance', 'validation-only no-model input cannot satisfy process acceptance');
  if (!policy.policyPass) fail('acceptance', 'requires unqualified PASS with zero material findings');
  return Object.freeze({ status: 'PROCESS-AUDIT-PASS-PENDING-RITSU', ritsuApprovalStillRequired: true, auditEventBytes: buildCompactProcessAuditEventV1(inputBytes, outputBytes) });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  validateCompactProcessAuditOutputSourceBytesV1();
  console.log('validated exact compact process-audit output contract and executable gate');
}
