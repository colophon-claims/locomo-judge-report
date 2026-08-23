import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { APPROVED_PROMPTED_SCREENING_V4_SHA256 } from '../scripts/approved-prompted-screening-v4-identities.mjs';
import {
  MAX_COMPACT_PROCESS_AUDIT_BYTES,
  buildSyntheticCapacityProbe,
  canonical,
  renderCompactProcessAuditInput,
  sha256,
  validateCompactPilotV4Fixture,
  validateCompactPilotV4FixtureBytes,
  validateCompactProcessAuditInput,
  validateRenderedCompactProcessAuditInput,
  validateV4SourceBytes,
} from '../scripts/render-compact-process-audit-input-v1.mjs';

const fixtureBytes = readFileSync('fixtures/prompted-screening-pilot-v4-compact-audit.json');
const fixtureRaw = fixtureBytes.toString('utf8');
const fixture = JSON.parse(fixtureRaw);
const input = fixture.compactAuditInput;
const rendered = renderCompactProcessAuditInput(input);
const clone = () => structuredClone(input);

test('approved v4 sources and deterministic no-run compact fixture validate exactly', () => {
  assert.doesNotThrow(() => validateV4SourceBytes());
  assert.equal(sha256(fixtureBytes), APPROVED_PROMPTED_SCREENING_V4_SHA256.compactAuditPilotV4Fixture);
  assert.doesNotThrow(() => validateCompactPilotV4FixtureBytes(fixtureBytes));
  assert.doesNotThrow(() => validateCompactPilotV4Fixture(fixture, fixtureRaw));
  assert.equal(rendered.length, 8235);
  assert.equal(sha256(rendered), 'sha256:db144bcbeb9a6e1fa2b60a07d5b3c6339f349648706e8208519bb71d9e222a4d');
  assert.equal(fixture.expectedExecution.modelRunOccurred, false);
  assert.equal(fixture.expectedExecution.usage.status, 'not-measured-no-model-run');
});

test('664-item capacity remains deterministically inside the hard byte cap', () => {
  const capacity = renderCompactProcessAuditInput(buildSyntheticCapacityProbe(664));
  assert.equal(capacity.length, 47830);
  assert.ok(capacity.length <= MAX_COMPACT_PROCESS_AUDIT_BYTES);
  assert.doesNotThrow(() => validateRenderedCompactProcessAuditInput(buildSyntheticCapacityProbe(664), capacity));
});

test('compact input excludes v3 raw audit material and all item-level material', () => {
  const v3Transcript = readFileSync('records/synthetic-pilot-v3-2026-08-23/transcript.jsonl', 'utf8');
  for (const [key, value] of [
    ['rawTranscriptBytes', v3Transcript],
    ['items', [{ itemId: 'a'.repeat(32) }]],
    ['previousRawJudgments', [{ verdict: 'CORRECT' }]],
    ['question', 'synthetic question'],
    ['localPath', '/Users/operator/private/run'],
  ]) {
    const changed = clone();
    changed[key] = value;
    assert.throws(() => validateCompactProcessAuditInput(changed), /closed root|raw material|item-level|local path/u);
  }
  assert.ok(!rendered.toString('utf8').includes('candidateAnswer'));
  assert.ok(!rendered.toString('utf8').includes('/Users/'));
});

test('oversized, suffixed, paraphrased, or noncanonical candidate bytes refuse', () => {
  assert.throws(() => validateRenderedCompactProcessAuditInput(input, Buffer.concat([rendered, Buffer.alloc(MAX_COMPACT_PROCESS_AUDIT_BYTES, 0x20)])), /exact canonical|exceed/u);
  assert.throws(() => validateRenderedCompactProcessAuditInput(input, Buffer.concat([rendered, Buffer.from('{"accepted":true}\n')])), /exact canonical/u);
  const pretty = Buffer.from(`${JSON.stringify(input, null, 2)}\n`);
  assert.throws(() => validateRenderedCompactProcessAuditInput(input, pretty), /exact canonical/u);
});

test('missing, extra, reordered, or duplicate batch and cell summaries refuse', () => {
  const mutations = [
    (value) => { delete value.judgmentTranscriptPrefixSha256; },
    (value) => { value.batches.pop(); },
    (value) => { value.batches[0][5] = null; },
    (value) => { value.batches[0].pop(); },
    (value) => { value.cells.pop(); },
    (value) => { [value.cells[0], value.cells[1]] = [value.cells[1], value.cells[0]]; },
    (value) => { value.cells[1] = structuredClone(value.cells[0]); },
  ];
  for (const mutate of mutations) {
    const changed = clone();
    mutate(changed);
    assert.throws(() => validateCompactProcessAuditInput(changed));
  }
});

test('machine validation flags and aggregate counts fail closed', () => {
  const mutations = [
    (value) => { value.batches[0][19] = false; },
    (value) => { value.batches[0][20] = false; },
    (value) => { value.batches[0][21] = false; },
    (value) => { value.batches[0][22] = ['digest mismatch']; },
    (value) => { value.aggregates.invalidCount = 1; },
    (value) => { value.aggregates.agreements.threeStageAgreementCount = 23; },
    (value) => { value.cells[0].invalidCount = 1; },
    (value) => { value.cells[0].luna.correctCount += 1; },
    (value) => { value.cells[0].candidateClass = 'specific-wrong'; },
    (value) => { value.cells[0].stratum = 'category-2'; },
  ];
  for (const mutate of mutations) {
    const changed = clone();
    mutate(changed);
    assert.throws(() => validateCompactProcessAuditInput(changed));
  }
});

test('model, reasoning, batch, tool, source, and timing drift refuse', () => {
  const mutations = [
    (value) => { value.declarations.coordinator.modelAlias = 'gpt-5.6-terra'; },
    (value) => { value.declarations.processAudit.reasoning = 'medium'; },
    (value) => { value.declarations.processAudit.toolPolicy = 'orchestrate'; },
    (value) => { value.declarations.judgmentStages[0].reasoning = 'high'; },
    (value) => { value.declarations.judgmentStages[1].batchLimit = 32; },
    (value) => { value.declarations.judgmentStages[2].batchCount = 2; },
    (value) => { value.sourceKind = 'real-screening'; },
    (value) => { value.aggregateTiming = 'after-audit'; },
  ];
  for (const mutate of mutations) {
    const changed = clone();
    mutate(changed);
    assert.throws(() => validateCompactProcessAuditInput(changed));
  }
});

test('literal source identities reject prompt, schema, and renderer substitutions', () => {
  for (const [key, bytes] of [
    ['promptBytes', Buffer.from(readFileSync('CODEX-SCREENING-PROMPT.v4.md', 'utf8').replace('does not', 'does now'))],
    ['schemaBytes', Buffer.from(readFileSync('schemas/compact-process-audit-input.v1.schema.json', 'utf8').replace('65536', '65535'))],
    ['rendererBytes', Buffer.from(readFileSync('scripts/render-compact-process-audit-input-v1.mjs', 'utf8').replace('65_536', '65_535'))],
  ]) assert.throws(() => validateV4SourceBytes({ [key]: bytes }), /must match approved/u);
});

test('fixture identity defeats full downstream recanonicalization', () => {
  const changed = structuredClone(fixture);
  changed.compactAuditInput.publicArtifacts.coordinatorPromptSha256 = `sha256:${'1'.repeat(64)}`;
  const changedRendered = Buffer.from(`${canonical(changed.compactAuditInput)}\n`);
  changed.expectedExecution.renderedInputByteLength = changedRendered.length;
  changed.expectedExecution.renderedInputSha256 = sha256(changedRendered);
  const changedBytes = Buffer.from(`${JSON.stringify(changed, null, 2)}\n`);
  const manifestEquivalent = sha256(changedBytes);
  assert.notEqual(manifestEquivalent, APPROVED_PROMPTED_SCREENING_V4_SHA256.compactAuditPilotV4Fixture);
  assert.throws(() => validateCompactPilotV4FixtureBytes(changedBytes), /must match approved/u);
});
