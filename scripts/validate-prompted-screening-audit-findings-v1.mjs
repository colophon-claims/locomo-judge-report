import { canonical } from './render-compact-process-audit-input-v1.mjs';

export const AUDIT_FINDINGS_SCHEMA_V1 = 'https://colophon-claims.github.io/locomo-judge-report/prompted-screening-audit-findings/v1';
export const AUDIT_FINDINGS_PROTOCOL_V1 = 'prompted-codex-screening-audit-findings/v1';

const rootKeys = ['assessment', 'auditInvocationSha256', 'materialFindings', 'nonMaterialObservations', 'protocol', 'schema'];
const entryKeys = ['code', 'evidenceReferences', 'summary'];
const materialCodes = new Set(['COVERAGE', 'DECLARATION_DRIFT', 'SHARD_DRIFT', 'CROSS_STAGE_ASYMMETRY', 'SUSPICIOUS_AGREEMENT', 'PROCESS_DEFECT', 'OTHER_MATERIAL']);
const observationCodes = new Set(['COVERAGE', 'DECLARATION_DRIFT', 'SHARD_DRIFT', 'CROSS_STAGE_ASYMMETRY', 'SUSPICIOUS_AGREEMENT', 'PROCESS_DEFECT', 'OTHER_OBSERVATION']);

function fail(path, detail) { throw new Error(`${path}: ${detail}`); }
function exactKeys(value, keys) { return value !== null && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join(',') === [...keys].sort().join(','); }
function validateEntry(entry, index, codes, kind) {
  const path = `auditFindings.${kind}[${index}]`;
  if (!exactKeys(entry, entryKeys) || !codes.has(entry.code)) fail(path, 'has an invalid closed shape or code');
  if (!Array.isArray(entry.evidenceReferences) || entry.evidenceReferences.length < 1 || entry.evidenceReferences.length > 5 || new Set(entry.evidenceReferences).size !== entry.evidenceReferences.length) fail(`${path}.evidenceReferences`, 'must contain one to five unique JSON Pointers');
  for (const reference of entry.evidenceReferences) if (typeof reference !== 'string' || reference.length > 160 || !/^(?:\/(?:[^~/]|~[01])*)+$/u.test(reference)) fail(`${path}.evidenceReferences`, 'contains an invalid bounded JSON Pointer');
  if (typeof entry.summary !== 'string' || entry.summary.length < 1 || entry.summary.length > 280 || !/^[\x20-\x7e]+$/u.test(entry.summary) || /\b(?:correct|wrong|unsure)\b/iu.test(entry.summary)) fail(`${path}.summary`, 'must be one bounded printable ASCII process summary without an item judgment');
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
  value.materialFindings.forEach((entry, index) => validateEntry(entry, index, materialCodes, 'materialFindings'));
  value.nonMaterialObservations.forEach((entry, index) => validateEntry(entry, index, observationCodes, 'nonMaterialObservations'));
  if (new Set(value.materialFindings.map(canonical)).size !== value.materialFindings.length || new Set(value.nonMaterialObservations.map(canonical)).size !== value.nonMaterialObservations.length) fail('auditFindings', 'contains duplicate entries');
  if (value.assessment === 'PASS' && value.materialFindings.length !== 0) fail('auditFindings.assessment', 'PASS requires zero material findings');
  if (value.assessment === 'FAIL' && value.materialFindings.length < 1) fail('auditFindings.assessment', 'FAIL requires at least one material finding');
  if (value.assessment === 'REFUSE' && (value.materialFindings.length !== 0 || value.nonMaterialObservations.length < 1)) fail('auditFindings.assessment', 'REFUSE requires zero material findings and at least one explanatory observation');
  return value;
}

export function renderTestAuditFindingsV1({ auditInvocationSha256, assessment = 'PASS', materialFindings = [], nonMaterialObservations = [] }) {
  const value = { assessment, auditInvocationSha256, materialFindings, nonMaterialObservations, protocol: AUDIT_FINDINGS_PROTOCOL_V1, schema: AUDIT_FINDINGS_SCHEMA_V1 };
  const bytes = Buffer.from(`${canonical(value)}\n`);
  parsePromptedScreeningAuditFindingsV1(bytes, { expectedAuditInvocationSha256: auditInvocationSha256 });
  return bytes;
}
