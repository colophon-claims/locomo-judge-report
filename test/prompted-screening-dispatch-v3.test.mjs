import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  APPROVED_PROMPTED_SCREENING_V3_SHA256,
  APPROVED_SYNTHETIC_PILOT_V2_DISPATCH_ORDER,
  APPROVED_SYNTHETIC_PILOT_V2_IDENTITY_MAP,
} from '../scripts/approved-prompted-screening-v3-identities.mjs';
import {
  createSyntheticPilotV2StagePlan,
  renderStageDispatchesV3,
  sha256,
  validateRenderedDispatchV3,
  validateSyntheticPilotV2Structure,
  validateV3SourceBytes,
} from '../scripts/render-prompted-screening-dispatch-v3.mjs';

const promptBytes = readFileSync('CODEX-SCREENING-PROMPT.v3.md');
const instructionBytes = readFileSync('CODEX-SCREENING-JUDGMENT-INSTRUCTION.v1.txt');
const fixtureBytes = readFileSync('fixtures/prompted-screening-pilot-v2.json');
const rendererBytes = readFileSync('scripts/render-prompted-screening-dispatch-v3.mjs');
const fixture = JSON.parse(fixtureBytes);
const raw = (value) => `${JSON.stringify(value, null, 2)}\n`;

test('v3 binds exact prompt, instruction, fixture, renderer, mapping, and order identities', () => {
  assert.equal(sha256(promptBytes), APPROVED_PROMPTED_SCREENING_V3_SHA256.coordinatorPromptV3);
  assert.equal(sha256(instructionBytes), APPROVED_PROMPTED_SCREENING_V3_SHA256.judgmentInstructionV1);
  assert.equal(sha256(fixtureBytes), APPROVED_PROMPTED_SCREENING_V3_SHA256.syntheticFixtureV2);
  assert.equal(sha256(rendererBytes), APPROVED_PROMPTED_SCREENING_V3_SHA256.rendererV3);
  assert.doesNotThrow(() => validateV3SourceBytes());
  assert.deepEqual(fixture.cases.map((entry) => [entry.pilotCaseId, entry.judgmentItemId]), APPROVED_SYNTHETIC_PILOT_V2_IDENTITY_MAP);
  assert.deepEqual(fixture.dispatchOrder, APPROVED_SYNTHETIC_PILOT_V2_DISPATCH_ORDER);
});

test('opaque identities use fixed 128-bit syntax and dispatch order is not grouped', () => {
  const byId = new Map(fixture.cases.map((entry) => [entry.judgmentItemId, entry]));
  assert.equal(new Set(fixture.dispatchOrder).size, 24);
  assert.notDeepEqual(fixture.dispatchOrder, fixture.cases.map((entry) => entry.judgmentItemId));
  fixture.dispatchOrder.forEach((itemId, index) => {
    assert.match(itemId, /^[0-9a-f]{32}$/u);
    const row = byId.get(itemId);
    assert.ok(row);
    assert.notEqual(itemId, row.pilotCaseId);
    if (index > 0) {
      const prior = byId.get(fixture.dispatchOrder[index - 1]);
      assert.notEqual(prior.candidateClass, row.candidateClass);
      assert.notEqual(prior.stratum, row.stratum);
    }
  });
});

test('v3 renders exact Luna, Terra, and Sol profiles and batch ceilings', () => {
  const expected = {
    Luna: { alias: 'gpt-5.6-luna', reasoning: 'medium', batches: [24] },
    Terra: { alias: 'gpt-5.6-terra', reasoning: 'high', batches: [16, 8] },
    Sol: { alias: 'gpt-5.6-sol', reasoning: 'high', batches: [8, 8, 8] },
  };
  for (const [stage, profile] of Object.entries(expected)) {
    const plan = createSyntheticPilotV2StagePlan(stage);
    const dispatches = renderStageDispatchesV3(plan);
    assert.deepEqual(dispatches.map((entry) => entry.itemIds.length), profile.batches);
    assert.deepEqual(dispatches.flatMap((entry) => entry.itemIds), fixture.dispatchOrder);
    for (const dispatch of dispatches) {
      assert.equal(dispatch.modelAlias, profile.alias);
      assert.equal(dispatch.reasoning, profile.reasoning);
      assert.ok(dispatch.bytes.subarray(0, instructionBytes.length).equals(instructionBytes));
      assert.equal(dispatch.dispatchSha256, sha256(dispatch.bytes));
      assert.doesNotThrow(() => validateRenderedDispatchV3(plan, dispatch));
      const blinded = dispatch.bytes.subarray(instructionBytes.length).toString('utf8');
      for (const row of fixture.cases) assert.equal(blinded.includes(row.pilotCaseId), false);
    }
  }
});

test('v3 reproduces and refuses the exact v2 class and stratum identifier leak', () => {
  const leaked = structuredClone(fixture);
  leaked.cases.forEach((entry) => {
    entry.judgmentItemId = entry.pilotCaseId;
    entry.blindedInput.itemId = entry.pilotCaseId;
  });
  leaked.dispatchOrder = leaked.cases.map((entry) => entry.pilotCaseId);
  assert.throws(() => validateSyntheticPilotV2Structure(leaked, raw(leaked)), /outer-to-opaque mapping|128-bit/u);
  const leakedBytes = Buffer.from(raw(leaked), 'utf8');
  assert.throws(() => validateV3SourceBytes({ fixtureBytes: leakedBytes }), /fixtureBytes/u);
});

test('v3 refuses renamed metadata leaks, outer IDs, and deterministic metadata encodings', () => {
  const variants = [
    'opaque-correct-category-1-main-slot-01',
    'screening-specific-wrong-stratum-2',
    fixture.cases[0].pilotCaseId,
    createHash('sha256').update(fixture.cases[0].pilotCaseId).digest('hex').slice(0, 32),
  ];
  for (const itemId of variants) {
    const changed = structuredClone(fixture);
    changed.cases[0].judgmentItemId = itemId;
    changed.cases[0].blindedInput.itemId = itemId;
    changed.dispatchOrder[changed.dispatchOrder.indexOf(fixture.cases[0].judgmentItemId)] = itemId;
    assert.throws(() => validateSyntheticPilotV2Structure(changed, raw(changed)), /outer-to-opaque mapping|128-bit|metadata/u);
  }
});

test('v3 refuses grouped, reordered, duplicated, mismatched, and leaked fixture plans', () => {
  const mutations = [
    (value) => { value.dispatchOrder = value.cases.map((entry) => entry.judgmentItemId); },
    (value) => { [value.dispatchOrder[0], value.dispatchOrder[1]] = [value.dispatchOrder[1], value.dispatchOrder[0]]; },
    (value) => { value.dispatchOrder[1] = value.dispatchOrder[0]; },
    (value) => { value.cases[0].blindedInput.itemId = value.cases[1].judgmentItemId; },
    (value) => { value.cases[0].blindedInput.candidateClass = 'correct'; },
  ];
  for (const mutate of mutations) {
    const changed = structuredClone(fixture);
    mutate(changed);
    assert.throws(() => validateSyntheticPilotV2Structure(changed, raw(changed)), /order|mapping|unexpected/u);
  }
});

test('v3 refuses wrong prompt, fixture, renderer, instruction, model, and reasoning bytes', () => {
  const sourceMutations = [
    { promptBytes: Buffer.concat([promptBytes, Buffer.from('suffix\n')]) },
    { fixtureBytes: Buffer.concat([fixtureBytes, Buffer.from(' ')]) },
    { rendererBytes: Buffer.concat([rendererBytes, Buffer.from('// suffix\n')]) },
    { instructionBytes: Buffer.concat([instructionBytes, Buffer.from('suffix\n')]) },
  ];
  for (const mutation of sourceMutations) assert.throws(() => validateV3SourceBytes(mutation), /Bytes/u);
  const luna = createSyntheticPilotV2StagePlan('Luna');
  assert.throws(() => renderStageDispatchesV3({ ...luna, promptVersion: 'v2' }), /plan/u);
  assert.throws(() => renderStageDispatchesV3({ ...luna, modelAlias: 'gpt-5.6-sol' }), /plan/u);
  assert.throws(() => renderStageDispatchesV3({ ...luna, reasoning: 'high' }), /plan/u);
});

test('v3 pre-dispatch validation refuses paraphrase, suffix, reorder, and batch mutation', () => {
  const plan = createSyntheticPilotV2StagePlan('Luna');
  const dispatch = renderStageDispatchesV3(plan)[0];
  const variants = [
    dispatch.bytes.subarray(1),
    Buffer.concat([dispatch.bytes, Buffer.from('contradictory suffix\n')]),
    Buffer.from(dispatch.bytes.toString('utf8').replace('Judge only the blinded items', 'Evaluate only the blinded items'), 'utf8'),
  ];
  for (const bytes of variants) assert.throws(() => validateRenderedDispatchV3(plan, { ...dispatch, bytes, dispatchSha256: sha256(bytes) }), /dispatch/u);
  assert.throws(() => validateRenderedDispatchV3(plan, { ...dispatch, batchCount: 2 }), /dispatch/u);
  const reordered = structuredClone(plan);
  [reordered.items[0], reordered.items[1]] = [reordered.items[1], reordered.items[0]];
  [reordered.expectedItemIds[0], reordered.expectedItemIds[1]] = [reordered.expectedItemIds[1], reordered.expectedItemIds[0]];
  assert.throws(() => renderStageDispatchesV3(reordered), /plan/u);
});

test('source constants defeat full fixture and downstream recanonicalization', () => {
  const changed = structuredClone(fixture);
  changed.cases[0].blindedInput.question = 'What changed synthetic token is stored in drawer A?';
  const changedBytes = Buffer.from(raw(changed), 'utf8');
  const forgedRecordEquivalent = { fixtureSha256: sha256(changedBytes) };
  const forgedManifestEquivalent = `${forgedRecordEquivalent.fixtureSha256}  fixtures/prompted-screening-pilot-v2.json`;
  assert.match(forgedManifestEquivalent, /fixtures\/prompted-screening-pilot-v2\.json/u);
  assert.notEqual(forgedRecordEquivalent.fixtureSha256, APPROVED_PROMPTED_SCREENING_V3_SHA256.syntheticFixtureV2);
  assert.throws(() => validateV3SourceBytes({ fixtureBytes: changedBytes }), /fixtureBytes.*approved/u);
});
