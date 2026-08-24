import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { canonical } from './render-evidence-rescreen-v9-compact-audit-input.mjs';

const defaultRoot = new URL('..', import.meta.url).pathname;
const bindingPath = 'commitments/locomo-evidence-rescreen-2026-08-24/prompt-binding.json';
const commitmentPath = 'commitments/locomo-evidence-rescreen-2026-08-24/commitment.json';
const digestPattern = /^sha256:[0-9a-f]{64}$/u;

function fail(path, detail) { throw new Error(`${path}: ${detail}`); }
function exactKeys(value, keys) { return value !== null && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join(',') === [...keys].sort().join(','); }
function digest(bytes) { return `sha256:${createHash('sha256').update(bytes).digest('hex')}`; }
function loadCanonical(root, path, override) {
  const bytes = override ?? readFileSync(join(root, path));
  let value;
  try { value = JSON.parse(bytes); } catch { fail(path, 'must be UTF-8 JSON'); }
  if (bytes.toString('utf8') !== `${canonical(value)}\n`) fail(path, 'must be canonical JSON plus LF');
  return { bytes, value };
}

const rootKeys = ['audit', 'commitmentSha256', 'coordinator', 'dispatchObjectKeyOrder', 'evidencePayloadSha256', 'judgmentInstructionPath', 'judgmentInstructionSha256', 'models', 'priorCommitmentArchive', 'priorCommitmentTag', 'promptPath', 'promptSha256', 'protocol', 'publishedAt', 'status', 'toolPolicy'];
const auditKeys = ['compactInputRendererPath', 'compactInputRendererSha256', 'compactInputSchemaPath', 'compactInputSchemaSha256', 'instructionPath', 'instructionSha256', 'invocationConstruction', 'outputParserPath', 'outputParserSha256', 'outputSchemaPath', 'outputSchemaSha256'];
const artifactPairs = [['promptPath', 'promptSha256'], ['judgmentInstructionPath', 'judgmentInstructionSha256']];
const auditArtifactPairs = [['compactInputRendererPath', 'compactInputRendererSha256'], ['compactInputSchemaPath', 'compactInputSchemaSha256'], ['instructionPath', 'instructionSha256'], ['outputParserPath', 'outputParserSha256'], ['outputSchemaPath', 'outputSchemaSha256']];

export function validateEvidenceRescreenV9Commitment({ root = defaultRoot, bindingBytes, commitmentBytes, artifactBytes = {} } = {}) {
  const bindingRecord = loadCanonical(root, bindingPath, bindingBytes);
  const commitmentRecord = loadCanonical(root, commitmentPath, commitmentBytes);
  const binding = bindingRecord.value;
  const commitment = commitmentRecord.value;
  if (!exactKeys(binding, rootKeys) || !exactKeys(binding.audit, auditKeys)) fail(bindingPath, 'has an unexpected closed shape');
  if (binding.protocol !== 'locomo-corrective-evidence-rescreen-prompt-binding/v1' || binding.status !== 'committed-before-corrective-screen' || binding.publishedAt !== '2026-08-24T20:42:44Z') fail(bindingPath, 'has an unexpected protocol, status, or timestamp');
  if (binding.commitmentSha256 !== digest(commitmentRecord.bytes) || commitment.protocol !== 'locomo-corrective-evidence-rescreen-commitment/v1' || commitment.status !== 'committed-before-corrective-screen') fail(bindingPath, 'does not bind the exact corrective commitment');
  if (binding.evidencePayloadSha256 !== commitment.evidencePayloadSha256 || binding.evidencePayloadSha256 !== 'sha256:f11e98e80ebaa6d23fbba21c138add42fd4fe5e9bd5f0023b26cba0881ce82ab') fail(bindingPath, 'does not join the exact evidence payload');
  if (binding.priorCommitmentArchive !== 'swh:1:snp:e9cdf0d5ce0da62d2d4ac87bef24e6bf632d5af7' || binding.priorCommitmentTag !== 'locomo-evidence-rescreen-v9-commitment-2026-08-24') fail(bindingPath, 'does not name the resolved prior commitment archive and tag');
  if (canonical(binding.coordinator) !== canonical({ model: 'gpt-5.6-sol', reasoningEffort: 'high' }) || canonical(binding.models) !== canonical({ luna: { model: 'gpt-5.6-luna', reasoningEffort: 'medium' }, sol: { model: 'gpt-5.6-sol', reasoningEffort: 'high' }, terra: { model: 'gpt-5.6-terra', reasoningEffort: 'high' } })) fail(bindingPath, 'has unexpected model declarations');
  if (canonical(binding.dispatchObjectKeyOrder) !== canonical(['itemId', 'question', 'referenceAnswer', 'candidateAnswer', 'evidence']) || binding.toolPolicy !== 'judgment-agents-none') fail(bindingPath, 'has unexpected dispatch keys or tool policy');
  if (binding.audit.invocationConstruction !== 'sha256(canonical-invocation-json-without-lf); dispatch=instruction||binding-line-lf||compact-input') fail(bindingPath, 'has an unexpected audit invocation construction');

  for (const [pathKey, digestKey] of artifactPairs) {
    const path = binding[pathKey];
    const bytes = artifactBytes[path] ?? readFileSync(join(root, path));
    if (!digestPattern.test(binding[digestKey]) || digest(bytes) !== binding[digestKey]) fail(`${bindingPath}.${digestKey}`, 'does not match the exact artifact bytes');
  }
  for (const [pathKey, digestKey] of auditArtifactPairs) {
    const path = binding.audit[pathKey];
    const bytes = artifactBytes[path] ?? readFileSync(join(root, path));
    if (!digestPattern.test(binding.audit[digestKey]) || digest(bytes) !== binding.audit[digestKey]) fail(`${bindingPath}.audit.${digestKey}`, 'does not match the exact audit artifact bytes');
  }

  const prompt = (artifactBytes[binding.promptPath] ?? readFileSync(join(root, binding.promptPath))).toString('utf8').replace(/\s+/gu, ' ');
  for (const required of ['full 32-item batches followed by the one final 24-item batch', 'full 16-item batches followed by at most one smaller final', 'full 8-item batches followed by at most one', 'strict two-of-three majority', 'advisory disposition differs', 'first non-excluded, not-already-selected reserve']) if (!prompt.includes(required)) fail(binding.promptPath, `is missing the bound deterministic rule: ${required}`);
  return true;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  validateEvidenceRescreenV9Commitment();
  console.log('validated evidence re-screen v9 commitment and prompt/audit bindings');
}
