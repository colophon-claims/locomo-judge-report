import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  APPROVED_CODEX_SCREENING_JUDGMENT_INSTRUCTION_V1_SHA256,
  APPROVED_CODEX_SCREENING_PROMPT_V2_SHA256,
  renderStageDispatches,
  sha256,
  validateRenderedDispatch,
  validateV2SourceBytes,
} from '../scripts/render-prompted-screening-dispatch-v2.mjs';

const promptV1 = readFileSync('CODEX-SCREENING-PROMPT.v1.md', 'utf8');
const promptV2Bytes = readFileSync('CODEX-SCREENING-PROMPT.v2.md');
const instructionBytes = readFileSync('CODEX-SCREENING-JUDGMENT-INSTRUCTION.v1.txt');
const fixture = JSON.parse(readFileSync('fixtures/prompted-screening-pilot-v1.json', 'utf8'));
const items = fixture.cases.map((pilotCase) => structuredClone(pilotCase.blindedInput));
const expectedItemIds = items.map((item) => item.itemId);
const profiles = {
  Luna: { modelAlias: 'gpt-5.6-luna', reasoning: 'medium', expectedBatchSizes: [24] },
  Terra: { modelAlias: 'gpt-5.6-terra', reasoning: 'high', expectedBatchSizes: [16, 8] },
  Sol: { modelAlias: 'gpt-5.6-sol', reasoning: 'high', expectedBatchSizes: [8, 8, 8] },
};

function plan(stage, overrides = {}) {
  return {
    promptVersion: 'v2',
    stage,
    modelAlias: profiles[stage].modelAlias,
    reasoning: profiles[stage].reasoning,
    expectedItemIds,
    items,
    ...overrides,
  };
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

test('v2 source bytes are exact, independent, fence-free identities', () => {
  assert.equal(sha256(promptV2Bytes), APPROVED_CODEX_SCREENING_PROMPT_V2_SHA256);
  assert.equal(sha256(instructionBytes), APPROVED_CODEX_SCREENING_JUDGMENT_INSTRUCTION_V1_SHA256);
  assert.equal(instructionBytes.includes(Buffer.from('```')), false);
  assert.doesNotThrow(() => validateV2SourceBytes(promptV2Bytes, instructionBytes));
});

test('renderer creates exact deterministic Luna, Terra, and Sol batch plans', () => {
  for (const [stage, profile] of Object.entries(profiles)) {
    const dispatches = renderStageDispatches(plan(stage));
    assert.deepEqual(dispatches.map((dispatch) => dispatch.itemIds.length), profile.expectedBatchSizes);
    for (const dispatch of dispatches) {
      assert.equal(dispatch.modelAlias, profile.modelAlias);
      assert.equal(dispatch.reasoning, profile.reasoning);
      assert.equal(dispatch.instructionSha256, APPROVED_CODEX_SCREENING_JUDGMENT_INSTRUCTION_V1_SHA256);
      assert.ok(dispatch.bytes.subarray(0, instructionBytes.length).equals(instructionBytes));
      assert.equal(dispatch.dispatchSha256, sha256(dispatch.bytes));
      assert.doesNotThrow(() => validateRenderedDispatch(plan(stage), dispatch));
    }
  }
});

test('v1 fence omission is reproduced exactly and both v1 variants are refused by v2', () => {
  const startMarker = '## Judgment instruction\n\n';
  const endMarker = '\n\n## Tool prohibition';
  const normative = promptV1.slice(promptV1.indexOf(startMarker) + startMarker.length, promptV1.indexOf(endMarker));
  const fenceOmitted = normative.replace(/^```json\n|^```\n/gmu, '');
  assert.equal(sha256(Buffer.from(normative, 'utf8')), 'sha256:d9141739f7129cd660b9cce83e0e8e28a3ffe33fe30d4138031a25fc3b460509');
  assert.equal(sha256(Buffer.from(fenceOmitted, 'utf8')), 'sha256:edb0ab1face5c288f375fe5f4222843409d3836e73681178e00c0a746977a43f');
  assert.throws(() => renderStageDispatches(plan('Luna'), Buffer.from(normative, 'utf8')), /instructionBytes/u);
  assert.throws(() => renderStageDispatches(plan('Luna'), Buffer.from(fenceOmitted, 'utf8')), /instructionBytes/u);
});

test('renderer refuses missing, extra, paraphrased, and contradictory instruction bytes', () => {
  const mutations = [
    instructionBytes.subarray(1),
    Buffer.concat([instructionBytes, Buffer.from('extra\n')]),
    Buffer.from(instructionBytes.toString('utf8').replace('Judge only the blinded items', 'Evaluate only the blinded items')),
    Buffer.concat([instructionBytes, Buffer.from('Judgment agents may use repository tools.\n')]),
  ];
  for (const mutation of mutations) assert.throws(() => renderStageDispatches(plan('Luna'), mutation), /instructionBytes/u);
  assert.throws(() => validateV2SourceBytes(Buffer.concat([promptV2Bytes, Buffer.from('contradiction\n')]), instructionBytes), /promptBytes/u);
});

test('renderer refuses prompt version, alias, reasoning, order, duplicate, and leakage mutations', () => {
  assert.throws(() => renderStageDispatches(plan('Luna', { promptVersion: 'v1' })), /promptVersion/u);
  assert.throws(() => renderStageDispatches(plan('Luna', { modelAlias: 'gpt-5.6-sol' })), /modelAlias/u);
  assert.throws(() => renderStageDispatches(plan('Luna', { reasoning: 'high' })), /reasoning/u);

  const reorderedItems = structuredClone(items);
  [reorderedItems[0], reorderedItems[1]] = [reorderedItems[1], reorderedItems[0]];
  assert.throws(() => renderStageDispatches(plan('Luna', { items: reorderedItems })), /sealed order/u);
  const duplicateItems = structuredClone(items);
  duplicateItems[1] = structuredClone(duplicateItems[0]);
  assert.throws(() => renderStageDispatches(plan('Luna', { items: duplicateItems })), /unique|sealed order/u);

  for (const key of ['intendedLabel', 'candidateClass', 'stratum', 'sampleMembership', 'screeningVerdict']) {
    const leakedItems = structuredClone(items);
    leakedItems[0][key] = 'leaked';
    assert.throws(() => renderStageDispatches(plan('Luna', { items: leakedItems })), /must contain only/u);
  }
});

test('pre-dispatch validation refuses missing, suffix, reordered, and oversized batch bytes', () => {
  const lunaPlan = plan('Luna');
  const dispatch = renderStageDispatches(lunaPlan)[0];
  for (const bytes of [
    dispatch.bytes.subarray(1),
    Buffer.concat([dispatch.bytes, Buffer.from('contradictory suffix\n')]),
    Buffer.concat([instructionBytes, Buffer.from(`${canonical([...items].reverse())}\n`, 'utf8')]),
  ]) {
    assert.throws(() => validateRenderedDispatch(lunaPlan, { ...dispatch, bytes, dispatchSha256: sha256(bytes) }), /dispatch/u);
  }

  const fortyItems = Array.from({ length: 40 }, (_, index) => ({
    itemId: `synthetic-render-${String(index + 1).padStart(3, '0')}`,
    question: 'Synthetic question?',
    referenceAnswer: 'Synthetic reference.',
    candidateAnswer: 'Synthetic candidate.',
  }));
  const fortyPlan = plan('Luna', { items: fortyItems, expectedItemIds: fortyItems.map((item) => item.itemId) });
  const batches = renderStageDispatches(fortyPlan);
  assert.deepEqual(batches.map((batch) => batch.itemIds.length), [32, 8]);
  const oversizedItems = fortyItems.slice(0, 33);
  const oversizedItemBytes = Buffer.from(`${canonical(oversizedItems)}\n`, 'utf8');
  const oversizedBytes = Buffer.concat([instructionBytes, oversizedItemBytes]);
  const forged = {
    ...batches[0],
    itemIds: oversizedItems.map((item) => item.itemId),
    blindedItemsSha256: sha256(oversizedItemBytes),
    dispatchSha256: sha256(oversizedBytes),
    bytes: oversizedBytes,
  };
  assert.throws(() => validateRenderedDispatch(fortyPlan, forged), /dispatch/u);
});
