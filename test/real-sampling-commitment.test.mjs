import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { IDENTITY_PROJECTION_DOMAIN, projectIdentity, projectPool } from '../scripts/project-screening-identities-v1.mjs';
import { validateRealSamplingCommitment } from '../scripts/validate-real-sampling-commitment.mjs';

test('real 664-item commitment and 72-item sample validate', () => {
  const result = validateRealSamplingCommitment();
  assert.equal(result.candidateIdentityCount, 664);
  assert.equal(result.sampleSize, 72);
  assert.equal(result.poolDigest, 'sha256:34b8cbe099124eb6182e7e2d894381d75fba9fde1d8e54abd0c957b937c9aba6');
});

test('identity projection is domain separated and refuses malformed pools', () => {
  const raw = '0'.repeat(32);
  const projected = projectIdentity(raw);
  const undomained = `sha256:${createHash('sha256').update(raw, 'utf8').digest('hex')}`;
  assert.equal(IDENTITY_PROJECTION_DOMAIN, 'colophon-screening-identity/v1\0');
  assert.notEqual(projected, undomained);
  assert.notEqual(projected, `sha256:${raw}${raw}`);
  assert.throws(() => projectIdentity('0'.repeat(31)));
  assert.throws(() => projectIdentity('G'.repeat(32)));
  assert.throws(() => projectPool(Array(664).fill(raw)));
  assert.throws(() => projectPool(Array.from({ length: 663 }, (_, index) => index.toString(16).padStart(32, '0'))));
});

test('public commitment artifacts contain no raw IDs or private join metadata', () => {
  const paths = [
    'commitments/locomo-screening-2026-08-24/candidate-identity-digests.json',
    'commitments/locomo-screening-2026-08-24/sampling-commitment.json',
    'commitments/locomo-screening-2026-08-24/sampling-output.json',
  ];
  const text = paths.map((path) => readFileSync(path, 'utf8')).join('');
  assert.doesNotMatch(text, /"[0-9a-f]{32}"/u);
  assert.doesNotMatch(text, /(?:sourceItemSha256|productItemSha256|sourceQuestion|candidateClass|stratum|poolKind)/u);
});
