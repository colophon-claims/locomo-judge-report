import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { validatePrompt, validateSyntheticPilot } from '../scripts/validate-prompted-screening-pilot.mjs';

const prompt = readFileSync('CODEX-SCREENING-PROMPT.v1.md', 'utf8');
const fixtureRaw = readFileSync('fixtures/prompted-screening-pilot-v1.json', 'utf8');
const fixture = JSON.parse(fixtureRaw);
const raw = (value) => `${JSON.stringify(value, null, 2)}\n`;

function changedPrompt(from, to) {
  assert.ok(prompt.includes(from));
  return prompt.replace(from, to);
}

test('normative prompt accepts the exact locked coordinator and judgment declarations', () => {
  assert.doesNotThrow(() => validatePrompt(prompt));
});

test('normative prompt rejects drift in every locked reasoning level', () => {
  assert.throws(() => validatePrompt(changedPrompt('The coordinator declaration is Sol,\n`gpt-5.6-sol`, reasoning level `high`.', 'The coordinator declaration is Sol,\n`gpt-5.6-sol`, reasoning level `medium`.')));
  assert.throws(() => validatePrompt(changedPrompt('1. Luna: `gpt-5.6-luna`, reasoning level `medium`, at most 32 items per batch.', '1. Luna: `gpt-5.6-luna`, reasoning level `high`, at most 32 items per batch.')));
  assert.throws(() => validatePrompt(changedPrompt('2. Terra: `gpt-5.6-terra`, reasoning level `high`, at most 16 items per batch.', '2. Terra: `gpt-5.6-terra`, reasoning level `medium`, at most 16 items per batch.')));
  assert.throws(() => validatePrompt(changedPrompt('3. Sol: `gpt-5.6-sol`, reasoning level `high`, at most 8 items per batch.', '3. Sol: `gpt-5.6-sol`, reasoning level `medium`, at most 8 items per batch.')));
});

test('normative prompt rejects alias, order, and batch-limit drift', () => {
  assert.throws(() => validatePrompt(changedPrompt('`gpt-5.6-luna`', '`gpt-5.6-terra`')));
  assert.throws(() => validatePrompt(changedPrompt('at most 32 items per batch', 'at most 31 items per batch')));
  const lunaLine = '1. Luna: `gpt-5.6-luna`, reasoning level `medium`, at most 32 items per batch.';
  const terraLine = '2. Terra: `gpt-5.6-terra`, reasoning level `high`, at most 16 items per batch.';
  assert.throws(() => validatePrompt(prompt.replace(lunaLine, '__LUNA_PASS__').replace(terraLine, lunaLine).replace('__LUNA_PASS__', terraLine)));
});

test('normative prompt rejects removal of blinding, tool, retry, routing, or transcript boundaries', () => {
  const facts = [
    'Terra must not see Luna output.',
    'Sol must not see Luna or Terra output.',
    'The verdict alphabet is exactly `CORRECT`, `WRONG`, or `UNSURE`.',
    'Route an invalid output to `UNSURE`.',
    'Judgment agents receive no web, shell, repository, search, retrieval, or other',
    'Permit at most one retry for an infrastructure failure that produced no model',
    'Luna\'s verdict is the load-bearing `screeningVerdict`.',
    'Ritsu must hand-check every flagged item and every sampled item.',
    'The transcript is opaque\nartifact bytes.',
  ];
  for (const fact of facts) assert.throws(() => validatePrompt(changedPrompt(fact, 'removed-boundary')));
});

test('synthetic pilot accepts exactly two permanently excluded cases per class and stratum', () => {
  assert.doesNotThrow(() => validateSyntheticPilot(fixture, fixtureRaw));
  const counts = new Map();
  for (const pilotCase of fixture.cases) {
    const cell = `${pilotCase.candidateClass}/${pilotCase.stratum}`;
    counts.set(cell, (counts.get(cell) ?? 0) + 1);
  }
  assert.equal(counts.size, 12);
  assert.deepEqual([...counts.values()], Array(12).fill(2));
  assert.ok(fixture.cases.every((pilotCase) => pilotCase.syntheticOnly && pilotCase.permanentlyExcluded && !pilotCase.admissionEligible));
});

test('synthetic pilot rejects omissions, additions, duplicates, and order drift', () => {
  const omitted = structuredClone(fixture);
  omitted.cases.pop();
  assert.throws(() => validateSyntheticPilot(omitted, raw(omitted)));
  const added = structuredClone(fixture);
  added.cases.push(structuredClone(added.cases.at(-1)));
  assert.throws(() => validateSyntheticPilot(added, raw(added)));
  const duplicate = structuredClone(fixture);
  duplicate.cases[1] = structuredClone(duplicate.cases[0]);
  assert.throws(() => validateSyntheticPilot(duplicate, raw(duplicate)));
  const reordered = structuredClone(fixture);
  [reordered.cases[0], reordered.cases[1]] = [reordered.cases[1], reordered.cases[0]];
  assert.throws(() => validateSyntheticPilot(reordered, raw(reordered)));
});

test('synthetic pilot rejects admission, identity, class, and closed-shape drift', () => {
  for (const [key, value] of [['syntheticOnly', false], ['permanentlyExcluded', false], ['admissionEligible', true]]) {
    const changed = structuredClone(fixture);
    changed.cases[0][key] = value;
    assert.throws(() => validateSyntheticPilot(changed, raw(changed)));
  }
  const identity = structuredClone(fixture);
  identity.cases[0].blindedInput.itemId = 'synthetic-different-id';
  assert.throws(() => validateSyntheticPilot(identity, raw(identity)));
  const candidateClass = structuredClone(fixture);
  candidateClass.cases[0].candidateClass = 'specific-wrong';
  assert.throws(() => validateSyntheticPilot(candidateClass, raw(candidateClass)));
  const extra = structuredClone(fixture);
  extra.cases[0].intendedLabel = 'correct';
  assert.throws(() => validateSyntheticPilot(extra, raw(extra)));
});

test('synthetic pilot rejects outcomes, commitments, source locators, and secret-like text', () => {
  for (const candidateAnswer of [
    'CORRECT',
    'https://example.invalid/source',
    'person@example.invalid',
    `sha256:${'a'.repeat(64)}`,
    `${'s'}${'k'}-${'examplecredentialmaterial123456'}`,
  ]) {
    const changed = structuredClone(fixture);
    changed.cases[0].blindedInput.candidateAnswer = candidateAnswer;
    assert.throws(() => validateSyntheticPilot(changed, raw(changed)));
  }
  const commitment = structuredClone(fixture);
  commitment.cases[0].sampleSeed = 'not-allowed';
  assert.throws(() => validateSyntheticPilot(commitment, raw(commitment)));
  const output = structuredClone(fixture);
  output.cases[0].blindedInput.modelOutput = 'UNSURE';
  assert.throws(() => validateSyntheticPilot(output, raw(output)));
});

test('synthetic pilot requires deterministic two-space JSON bytes', () => {
  assert.throws(() => validateSyntheticPilot(fixture, `${JSON.stringify(fixture)}\n`));
  assert.throws(() => validateSyntheticPilot(fixture, fixtureRaw.trimEnd()));
});
