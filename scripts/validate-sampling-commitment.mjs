import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const schema = 'https://colophon-claims.github.io/locomo-judge-report/sampling-commitment/v1';
const digest = /^sha256:[a-f0-9]{64}$/u;
const required = ['candidateItemDigests', 'committedAt', 'poolDigest', 'sampleSeed', 'sampleSize', 'samplingScriptSha256', 'schema'];

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

function fail(message) {
  throw new Error(`sampling commitment does not satisfy the v1 interface: ${message}`);
}

export function validate(document, raw) {
  if (raw !== `${canonical(document)}\n`) fail('not canonical JSON');
  if (document === null || typeof document !== 'object' || Array.isArray(document)) fail('not an object');
  if (Object.keys(document).sort().join(',') !== required.join(',')) fail('unexpected or missing property');
  if (document.schema !== schema) fail('unexpected schema');
  if (!Array.isArray(document.candidateItemDigests) || document.candidateItemDigests.length === 0) fail('candidate item digests');
  if (document.candidateItemDigests.some((item, index, values) => !digest.test(item) || (index > 0 && values[index - 1] >= item))) fail('candidate item digests must be sorted, unique SHA-256 digests');
  const expectedPoolDigest = `sha256:${createHash('sha256').update(canonical(document.candidateItemDigests)).digest('hex')}`;
  if (document.poolDigest !== expectedPoolDigest) fail('pool digest');
  if (typeof document.sampleSeed !== 'string' || document.sampleSeed.length === 0) fail('sample seed');
  if (!Number.isInteger(document.sampleSize) || document.sampleSize < 1 || document.sampleSize > document.candidateItemDigests.length) fail('sample size');
  if (!digest.test(document.samplingScriptSha256)) fail('sampling script digest');
  if (typeof document.committedAt !== 'string' || Number.isNaN(Date.parse(document.committedAt))) fail('commit time');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = process.argv[2];
  if (input === undefined) {
    console.error('usage: node scripts/validate-sampling-commitment.mjs <commitment.json>');
    process.exitCode = 2;
  } else {
    const raw = readFileSync(input, 'utf8');
    validate(JSON.parse(raw), raw);
    console.log('sampling commitment interface valid');
  }
}
