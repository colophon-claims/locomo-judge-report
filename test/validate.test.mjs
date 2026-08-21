import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';

test('preparation scaffold validates', () => {
  const output = execFileSync(process.execPath, ['scripts/validate.mjs'], { encoding: 'utf8' });
  assert.match(output, /preparation-only boundaries/u);
});

test('sampling interface has no implicit commitment', () => {
  assert.throws(() => execFileSync(process.execPath, ['scripts/validate-sampling-commitment.mjs'], { encoding: 'utf8', stdio: 'pipe' }));
});

test('documentation has no em dash', () => {
  const output = execFileSync(process.execPath, ['scripts/check-no-em-dash.mjs'], { encoding: 'utf8' });
  assert.match(output, /no em dash/u);
});
