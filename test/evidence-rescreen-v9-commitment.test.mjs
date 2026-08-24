import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { canonical } from '../scripts/render-evidence-rescreen-v9-compact-audit-input.mjs';
import { validateEvidenceRescreenV9Commitment } from '../scripts/validate-evidence-rescreen-v9-commitment.mjs';

const root = new URL('..', import.meta.url).pathname;
const bindingPath = new URL('../commitments/locomo-evidence-rescreen-2026-08-24/prompt-binding.json', import.meta.url);
const binding = JSON.parse(readFileSync(bindingPath, 'utf8'));
const bytes = (value) => Buffer.from(`${canonical(value)}\n`);

test('accepts the exact evidence re-screen v9 commitment', () => {
  assert.equal(validateEvidenceRescreenV9Commitment({ root }), true);
});

for (const [name, mutate] of [
  ['extra binding key', (value) => { value.extra = true; }],
  ['evidence payload drift', (value) => { value.evidencePayloadSha256 = `sha256:${'0'.repeat(64)}`; }],
  ['model drift', (value) => { value.models.luna.model = 'gpt-5.6-terra'; }],
  ['archive drift', (value) => { value.priorCommitmentArchive = `swh:1:snp:${'0'.repeat(40)}`; }],
  ['audit parser drift', (value) => { value.audit.outputParserSha256 = `sha256:${'0'.repeat(64)}`; }],
]) test(`refuses ${name}`, () => {
  const changed = structuredClone(binding);
  mutate(changed);
  assert.throws(() => validateEvidenceRescreenV9Commitment({ root, bindingBytes: bytes(changed) }));
});

test('refuses changed prompt bytes even with the old binding', () => {
  assert.throws(() => validateEvidenceRescreenV9Commitment({ root, artifactBytes: { [binding.promptPath]: Buffer.from('changed\n') } }));
});

test('refuses a coordinated replay rule that permits reused source lineage', () => {
  const prompt = readFileSync(new URL(`../${binding.promptPath}`, import.meta.url));
  const weakened = Buffer.from(prompt.toString('utf8').replace('whose `sourceQuestionLineageId` is unused', 'whose item identity is not already selected'));
  const changed = structuredClone(binding);
  changed.promptSha256 = `sha256:${createHash('sha256').update(weakened).digest('hex')}`;
  assert.throws(() => validateEvidenceRescreenV9Commitment({ root, bindingBytes: bytes(changed), artifactBytes: { [binding.promptPath]: weakened } }));
});
