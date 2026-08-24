import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { validate } from '../scripts/validate-sampling-commitment.mjs';
import { validateSourceRegister } from '../scripts/validate.mjs';

const schema = 'https://colophon-claims.github.io/locomo-judge-report/sampling-commitment/v1';
const firstDigest = `sha256:${'1'.repeat(64)}`;
const secondDigest = `sha256:${'2'.repeat(64)}`;

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

function commitment(overrides = {}) {
  const candidateItemDigests = overrides.candidateItemDigests ?? [firstDigest, secondDigest];
  const document = {
    schema,
    candidateItemDigests,
    poolDigest: `sha256:${createHash('sha256').update(canonical(candidateItemDigests)).digest('hex')}`,
    sampleSeed: 'synthetic-test-seed',
    sampleSize: 1,
    samplingScriptSha256: `sha256:${'3'.repeat(64)}`,
    committedAt: '2026-08-21T00:00:00Z',
    ...overrides,
  };
  return [document, `${canonical(document)}\n`];
}

test('preparation scaffold validates', () => {
  const output = execFileSync(process.execPath, ['scripts/validate.mjs'], { encoding: 'utf8' });
  assert.match(output, /registration boundaries/u);
});

test('sampling interface has no implicit commitment', () => {
  assert.throws(() => execFileSync(process.execPath, ['scripts/validate-sampling-commitment.mjs'], { encoding: 'utf8', stdio: 'pipe' }));
});

test('sampling commitment validator accepts only canonical frozen-procedure inputs', () => {
  const [valid, raw] = commitment();
  assert.doesNotThrow(() => validate(valid, raw));
  assert.throws(() => validate({}, '{}\n'));
  assert.throws(() => validate(...commitment({ candidateItemDigests: [secondDigest, firstDigest] })));
  assert.throws(() => validate(...commitment({ candidateItemDigests: [firstDigest, firstDigest] })));
  assert.throws(() => validate(...commitment({ candidateItemDigests: ['not-a-digest'] })));
  assert.throws(() => validate(...commitment({ poolDigest: firstDigest })));
  assert.throws(() => validate(...commitment({ sampleSize: 3 })));
  assert.throws(() => validate(...commitment({ extra: true })));
  assert.throws(() => validate(valid, `${JSON.stringify(valid, null, 2)}\n`));
  assert.throws(() => validate(...commitment({ committedAt: '2026-08-21' })));
  assert.throws(() => validate(...commitment({ committedAt: '2026-08-21T00:00:00' })));
  assert.throws(() => validate(...commitment({ committedAt: '2026-02-30T00:00:00Z' })));
});

test('source register rejects malformed future rows', () => {
  const sourceRegister = JSON.parse(readFileSync('source-register.json', 'utf8'));
  const raw = (value) => `${canonical(value)}\n`;
  assert.doesNotThrow(() => validateSourceRegister(sourceRegister, raw(sourceRegister)));
  const withExtra = structuredClone(sourceRegister);
  withExtra.sources[0].extra = true;
  assert.throws(() => validateSourceRegister(withExtra, raw(withExtra)));
  const emptyId = structuredClone(sourceRegister);
  emptyId.sources[0].id = '';
  assert.throws(() => validateSourceRegister(emptyId, raw(emptyId)));
  const duplicate = structuredClone(sourceRegister);
  duplicate.sources.push(structuredClone(duplicate.sources[0]));
  assert.throws(() => validateSourceRegister(duplicate, raw(duplicate)));
});

test('documentation has no em dash', () => {
  const output = execFileSync(process.execPath, ['scripts/check-no-em-dash.mjs'], { encoding: 'utf8' });
  assert.match(output, /no em dash/u);
});
