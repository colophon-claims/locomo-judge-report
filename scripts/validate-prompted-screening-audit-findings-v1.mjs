import { canonical } from './render-compact-process-audit-input-v1.mjs';

export const AUDIT_FINDINGS_SCHEMA_V1 = 'https://colophon-claims.github.io/locomo-judge-report/prompted-screening-audit-findings/v1';
export const AUDIT_FINDINGS_PROTOCOL_V1 = 'prompted-codex-screening-audit-findings/v1';

const rootKeys = ['assessment', 'auditInvocationSha256', 'materialFindings', 'nonMaterialObservations', 'protocol', 'schema'];
const materialEntryKeys = ['code', 'evidenceReferences', 'summary'];
const observationEntryKeys = ['code', 'evidenceReferences'];
const materialCodes = new Set(['COVERAGE_GAP', 'DECLARATION_DRIFT', 'SHARD_DRIFT', 'CROSS_STAGE_ASYMMETRY', 'UNEXPLAINED_SUSPICIOUS_AGREEMENT', 'PROCESS_DEFECT', 'OTHER_MATERIAL']);
const benignObservationCodes = new Set(['EXPECTED_SYNTHETIC_AGREEMENT', 'KNOWN_CAPABILITY_BOUNDARY']);
const refusalObservationCodes = new Set(['KNOWN_AUDIT_INPUT_AMBIGUITY', 'KNOWN_AUDITOR_INABILITY']);
const observationCodes = new Set([...benignObservationCodes, ...refusalObservationCodes]);

function fail(path, detail) { throw new Error(`${path}: ${detail}`); }
function exactKeys(value, keys) { return value !== null && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join(',') === [...keys].sort().join(','); }
function validateEvidenceReferences(entry, path) {
  if (!Array.isArray(entry.evidenceReferences) || entry.evidenceReferences.length < 1 || entry.evidenceReferences.length > 5 || new Set(entry.evidenceReferences).size !== entry.evidenceReferences.length) fail(`${path}.evidenceReferences`, 'must contain one to five unique JSON Pointers');
  for (const reference of entry.evidenceReferences) if (typeof reference !== 'string' || reference.length > 160 || !/^(?:\/(?:[^~/]|~[01])*)+$/u.test(reference)) fail(`${path}.evidenceReferences`, 'contains an invalid bounded JSON Pointer');
}
function validateMaterialFinding(entry, index) {
  const path = `auditFindings.materialFindings[${index}]`;
  if (!exactKeys(entry, materialEntryKeys) || !materialCodes.has(entry.code)) fail(path, 'has an invalid closed material-finding shape or code');
  validateEvidenceReferences(entry, path);
  if (typeof entry.summary !== 'string' || entry.summary.length < 1 || entry.summary.length > 280 || !/^[\x20-\x7e]+$/u.test(entry.summary) || /\b(?:correct|wrong|unsure)\b/iu.test(entry.summary)) fail(`${path}.summary`, 'must be one bounded printable ASCII process summary without an item judgment');
  if (entry.code === 'OTHER_MATERIAL' && (entry.summary.length < 24 || (entry.summary.match(/[A-Za-z0-9]+/gu) ?? []).length < 3)) fail(`${path}.summary`, 'OTHER_MATERIAL requires a meaningful summary of at least 24 characters and three words');
}
function validateNonMaterialObservation(entry, index) {
  const path = `auditFindings.nonMaterialObservations[${index}]`;
  if (!exactKeys(entry, observationEntryKeys) || !observationCodes.has(entry.code)) fail(path, 'has an invalid closed non-material-observation shape or code');
  validateEvidenceReferences(entry, path);
}

export function parsePromptedScreeningAuditFindingsV1(bytes, { expectedAuditInvocationSha256 } = {}) {
  if (!Buffer.isBuffer(bytes)) fail('auditFindingsBytes', 'must be exact bytes');
  const raw = bytes.toString('utf8');
  if (!Buffer.from(raw).equals(bytes) || !raw.endsWith('\n') || raw.includes('\r') || raw.includes(String.fromCodePoint(0x2014))) fail('auditFindingsBytes', 'must be canonical LF-terminated UTF-8 without em dash');
  let value;
  try { value = JSON.parse(raw); } catch { fail('auditFindingsBytes', 'must be JSON'); }
  if (raw !== `${canonical(value)}\n` || !exactKeys(value, rootKeys) || value.schema !== AUDIT_FINDINGS_SCHEMA_V1 || value.protocol !== AUDIT_FINDINGS_PROTOCOL_V1) fail('auditFindings', 'must be the exact closed canonical version 1 payload');
  if (!/^sha256:[0-9a-f]{64}$/u.test(value.auditInvocationSha256)) fail('auditFindings.auditInvocationSha256', 'must be a SHA-256 digest');
  if (expectedAuditInvocationSha256 !== undefined && value.auditInvocationSha256 !== expectedAuditInvocationSha256) fail('auditFindings.auditInvocationSha256', 'does not match the exact recorder-owned invocation');
  if (!['PASS', 'FAIL', 'REFUSE'].includes(value.assessment) || !Array.isArray(value.materialFindings) || value.materialFindings.length > 7 || !Array.isArray(value.nonMaterialObservations) || value.nonMaterialObservations.length > 8) fail('auditFindings', 'has invalid assessment or array bounds');
  value.materialFindings.forEach(validateMaterialFinding);
  value.nonMaterialObservations.forEach(validateNonMaterialObservation);
  if (new Set(value.materialFindings.map(canonical)).size !== value.materialFindings.length || new Set(value.nonMaterialObservations.map(canonical)).size !== value.nonMaterialObservations.length) fail('auditFindings', 'contains duplicate entries');
  if (value.assessment === 'PASS' && value.materialFindings.length !== 0) fail('auditFindings.assessment', 'PASS requires zero material findings');
  if (value.assessment === 'FAIL' && value.materialFindings.length < 1) fail('auditFindings.assessment', 'FAIL requires at least one material finding');
  if ((value.assessment === 'PASS' || value.assessment === 'FAIL') && value.nonMaterialObservations.some((entry) => !benignObservationCodes.has(entry.code))) fail('auditFindings.assessment', 'PASS and FAIL accept only predefined benign non-material observations');
  if (value.assessment === 'REFUSE' && (value.materialFindings.length !== 0 || value.nonMaterialObservations.length < 1 || value.nonMaterialObservations.some((entry) => !refusalObservationCodes.has(entry.code)))) fail('auditFindings.assessment', 'REFUSE requires zero material findings and one or more closed inability or ambiguity observations');
  return value;
}

export function renderTestAuditFindingsV1({ auditInvocationSha256, assessment = 'PASS', materialFindings = [], nonMaterialObservations = [] }) {
  const value = { assessment, auditInvocationSha256, materialFindings, nonMaterialObservations, protocol: AUDIT_FINDINGS_PROTOCOL_V1, schema: AUDIT_FINDINGS_SCHEMA_V1 };
  const bytes = Buffer.from(`${canonical(value)}\n`);
  parsePromptedScreeningAuditFindingsV1(bytes, { expectedAuditInvocationSha256: auditInvocationSha256 });
  return bytes;
}
