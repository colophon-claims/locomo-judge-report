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

const fixtureBytes = readFileSync('fixtures/prompted-screening-pilot-v4-joint-compact-audit.json');
const fixtureRaw = fixtureBytes.toString('utf8');
const fixture = JSON.parse(fixtureRaw);
const input = fixture.compactAuditInput;
const rendered = renderCompactProcessAuditInput(input);
const clone = () => structuredClone(input);

function routedInvalidInput() {
  const changed = clone();
  const lunaBatch = changed.batches[0];
  lunaBatch[10] -= 1;
  lunaBatch[11] += 1;
  lunaBatch[12] = 1;
  changed.aggregates.invalidCount = 1;
  changed.aggregates.verdicts[0].wrongCount -= 1;
  changed.aggregates.verdicts[0].unsureCount += 1;
  const cell = changed.cells[4];
  cell.luna.wrongCount -= 1;
  cell.luna.unsureCount += 1;
  cell.jointVerdictCounts[13] -= 1;
  cell.jointVerdictCounts[22] += 1;
  cell.invalidCount = 1;
  cell.threeStageAgreementCount = 1;
  cell.anyDisagreementCount = 1;
  Object.assign(changed.aggregates.agreements, {
    threeStageAgreementCount: 23,
    anyDisagreementCount: 1,
    lunaTerraDisagreementCount: 1,
    lunaSolDisagreementCount: 1,
    terraSolDisagreementCount: 0,
    lunaOnlyDisagreesCount: 1,
    terraOnlyDisagreesCount: 0,
    solOnlyDisagreesCount: 0,
    allDifferentCount: 0,
  });
  return changed;
}

function jointCounterexampleInput() {
  const changed = clone();
  const cell = changed.cells[0];
  Object.assign(cell.luna, { correctCount: 0, wrongCount: 1, unsureCount: 1 });
  Object.assign(cell.terra, { correctCount: 0, wrongCount: 1, unsureCount: 1 });
  Object.assign(cell.sol, { correctCount: 1, wrongCount: 0, unsureCount: 1 });
  cell.jointVerdictCounts = Array(27).fill(0);
  cell.jointVerdictCounts[17] = 1;
  cell.jointVerdictCounts[21] = 1;
  cell.threeStageAgreementCount = 0;
  cell.anyDisagreementCount = 2;
  Object.assign(changed.aggregates.verdicts[0], { correctCount: 6, wrongCount: 17, unsureCount: 1 });
  Object.assign(changed.aggregates.verdicts[1], { correctCount: 6, wrongCount: 17, unsureCount: 1 });
  Object.assign(changed.aggregates.verdicts[2], { correctCount: 7, wrongCount: 16, unsureCount: 1 });
  Object.assign(changed.batches[0], { 9: 6, 10: 17, 11: 1 });
  Object.assign(changed.batches[1], { 9: 4, 10: 11, 11: 1 });
  Object.assign(changed.batches[3], { 9: 1, 10: 6, 11: 1 });
  Object.assign(changed.aggregates.agreements, {
    threeStageAgreementCount: 22,
    anyDisagreementCount: 2,
    lunaTerraDisagreementCount: 2,
    lunaSolDisagreementCount: 1,
    terraSolDisagreementCount: 1,
    lunaOnlyDisagreesCount: 1,
    terraOnlyDisagreesCount: 1,
    solOnlyDisagreesCount: 0,
    allDifferentCount: 0,
  });
  return changed;
}

test('approved v4 sources and deterministic no-run compact fixture validate exactly', () => {
  assert.doesNotThrow(() => validateV4SourceBytes());
  assert.equal(sha256(fixtureBytes), APPROVED_PROMPTED_SCREENING_V4_SHA256.compactAuditPilotV4JointFixture);
  assert.doesNotThrow(() => validateCompactPilotV4FixtureBytes(fixtureBytes));
  assert.doesNotThrow(() => validateCompactPilotV4Fixture(fixture, fixtureRaw));
  assert.equal(rendered.length, 9159);
  assert.equal(sha256(rendered), 'sha256:5983f2b68aa6cb98bd42d33c1246aba5fce589a5769dd47b38c153c0805a0bfc');
  assert.equal(fixture.expectedExecution.modelRunOccurred, false);
  assert.equal(fixture.expectedExecution.usage.status, 'not-measured-no-model-run');
});

test('664-item capacity remains deterministically inside the hard byte cap', () => {
  const capacity = renderCompactProcessAuditInput(buildSyntheticCapacityProbe(664));
  assert.equal(capacity.length, 48766);
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

test('retry requires an infrastructure failure and remains at most one per affected batch', () => {
  const valid = clone();
  valid.batches[0][16] = 1;
  valid.batches[0][17] = 1;
  valid.aggregates.infrastructureFailureCount = 1;
  valid.aggregates.retryCount = 1;
  assert.doesNotThrow(() => validateCompactProcessAuditInput(valid));

  const noFailure = clone();
  noFailure.batches[0][17] = 1;
  noFailure.aggregates.retryCount = 1;
  assert.throws(() => validateCompactProcessAuditInput(noFailure), /failure, retry/u);

  const repeated = clone();
  repeated.batches[0][16] = 1;
  repeated.batches[0][17] = 2;
  repeated.aggregates.infrastructureFailureCount = 1;
  repeated.aggregates.retryCount = 2;
  assert.throws(() => validateCompactProcessAuditInput(repeated), /failure, retry/u);
});

test('output defects cannot remain machine-green with zero routed UNSURE verdicts', () => {
  const coordinatedMutations = [
    (value) => { value.batches[0][12] = 1; value.aggregates.invalidCount = 1; value.cells[0].invalidCount = 1; },
    (value) => { value.batches[0][13] = 1; value.batches[0][7] = 23; value.aggregates.missingCount = 1; },
    (value) => { value.batches[0][14] = 1; value.batches[0][7] = 25; value.aggregates.extraCount = 1; },
    (value) => { value.batches[0][14] = 1; value.batches[0][15] = 1; value.batches[0][7] = 25; value.aggregates.extraCount = 1; value.aggregates.duplicateCount = 1; },
  ];
  for (const mutate of coordinatedMutations) {
    const changed = clone();
    mutate(changed);
    assert.equal(changed.batches[0][19], true);
    assert.equal(changed.batches[0][20], true);
    assert.equal(changed.batches[0][21], true);
    assert.throws(() => validateCompactProcessAuditInput(changed), /UNSURE|invalidCount/u);
  }
});

test('properly routed invalid output reconciles batch, stage, cell, and agreement summaries', () => {
  const changed = routedInvalidInput();
  assert.doesNotThrow(() => validateCompactProcessAuditInput(changed));
  assert.doesNotThrow(() => renderCompactProcessAuditInput(changed));
});

test('joint contingency derives every marginal, pairwise, asymmetry, and all-different count', () => {
  const changed = jointCounterexampleInput();
  Object.assign(changed.aggregates.agreements, {
    threeStageAgreementCount: 22,
    anyDisagreementCount: 2,
    lunaTerraDisagreementCount: 2,
    lunaSolDisagreementCount: 2,
    terraSolDisagreementCount: 1,
    lunaOnlyDisagreesCount: 1,
    terraOnlyDisagreesCount: 0,
    solOnlyDisagreesCount: 0,
    allDifferentCount: 1,
  });
  assert.doesNotThrow(() => validateCompactProcessAuditInput(changed));
});

test('joint contingency refuses missing, wrong-length, negative, total, and positional drift', () => {
  const mutations = [
    (value) => { delete value.cells[0].jointVerdictCounts; },
    (value) => { value.cells[0].jointVerdictCounts.pop(); },
    (value) => { value.cells[0].jointVerdictCounts[0] = -1; },
    (value) => { value.cells[0].jointVerdictCounts[0] += 1; },
    (value) => { value.cells[0].jointVerdictCounts[1] = value.cells[0].jointVerdictCounts[0]; value.cells[0].jointVerdictCounts[0] = 0; },
  ];
  for (const mutate of mutations) {
    const changed = clone();
    mutate(changed);
    assert.throws(() => validateCompactProcessAuditInput(changed));
  }
});

test('multiple extra or duplicate records may route one affected item to UNSURE', () => {
  const changed = routedInvalidInput();
  changed.batches[0][12] = 0;
  changed.batches[0][14] = 2;
  changed.batches[0][15] = 2;
  changed.batches[0][7] = 26;
  changed.aggregates.invalidCount = 0;
  changed.aggregates.extraCount = 2;
  changed.aggregates.duplicateCount = 2;
  changed.cells[4].invalidCount = 0;
  assert.doesNotThrow(() => validateCompactProcessAuditInput(changed));
});

test('coordinated unanimous-marginal disagreement attack refuses', () => {
  const changed = clone();
  changed.cells[0].threeStageAgreementCount = 0;
  changed.cells[0].anyDisagreementCount = 2;
  Object.assign(changed.aggregates.agreements, {
    threeStageAgreementCount: 22,
    anyDisagreementCount: 2,
    lunaTerraDisagreementCount: 2,
    lunaSolDisagreementCount: 2,
    terraSolDisagreementCount: 0,
    lunaOnlyDisagreesCount: 2,
    terraOnlyDisagreesCount: 0,
    solOnlyDisagreesCount: 0,
    allDifferentCount: 0,
  });
  assert.throws(() => validateCompactProcessAuditInput(changed), /joint verdict contingency/u);
});

test('exact independently-feasible pairwise counterexample refuses as one joint tuple', () => {
  const changed = jointCounterexampleInput();
  assert.throws(() => validateCompactProcessAuditInput(changed), /joint cell contingencies|joint verdict contingency/u);
});

test('coordinated alternative pairwise and asymmetry tuples cannot replace the joint table', () => {
  const variants = [
    { lunaTerraDisagreementCount: 2, lunaSolDisagreementCount: 1, terraSolDisagreementCount: 2, lunaOnlyDisagreesCount: 0, terraOnlyDisagreesCount: 1, solOnlyDisagreesCount: 0, allDifferentCount: 1 },
    { lunaTerraDisagreementCount: 0, lunaSolDisagreementCount: 2, terraSolDisagreementCount: 2, lunaOnlyDisagreesCount: 0, terraOnlyDisagreesCount: 0, solOnlyDisagreesCount: 2, allDifferentCount: 0 },
  ];
  for (const variant of variants) {
    const changed = jointCounterexampleInput();
    Object.assign(changed.aggregates.agreements, variant);
    assert.throws(() => validateCompactProcessAuditInput(changed), /joint cell contingencies/u);
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
  assert.notEqual(manifestEquivalent, APPROVED_PROMPTED_SCREENING_V4_SHA256.compactAuditPilotV4JointFixture);
  assert.throws(() => validateCompactPilotV4FixtureBytes(changedBytes), /must match approved/u);
});
