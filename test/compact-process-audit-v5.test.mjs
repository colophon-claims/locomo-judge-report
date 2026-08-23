import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  MAX_COMPACT_PROCESS_AUDIT_BYTES,
} from '../scripts/render-compact-process-audit-input-v1.mjs';
import {
  buildRealCapacityProbeV2,
  decodeBatchColumns,
  encodeBatchColumns,
  renderCompactProcessAuditInputV2,
  upgradeV1CompactInput,
  validateCompactProcessAuditInputV2,
  validateRenderedCompactProcessAuditInputV2,
  validateV5SourceShape,
} from '../scripts/render-compact-process-audit-input-v2.mjs';

const v4Fixture = JSON.parse(readFileSync('fixtures/prompted-screening-pilot-v4-joint-compact-audit.json', 'utf8'));
const input = upgradeV1CompactInput(v4Fixture.compactAuditInput);

function clone(value = input) {
  return structuredClone(value);
}

test('version 5 sources and keyed synthetic input validate without a model run', () => {
  assert.doesNotThrow(() => validateV5SourceShape());
  assert.doesNotThrow(() => validateCompactProcessAuditInputV2(input));
  const rendered = renderCompactProcessAuditInputV2(input);
  assert.ok(rendered.length <= MAX_COMPACT_PROCESS_AUDIT_BYTES);
  assert.doesNotThrow(() => validateRenderedCompactProcessAuditInputV2(input, rendered));
  assert.throws(() => validateRenderedCompactProcessAuditInputV2(input, Buffer.concat([rendered, Buffer.from('suffix')])));
});

test('keyed digest labels are in-band and positional or mislabeled rows refuse', () => {
  const positional = clone();
  positional.batches[0] = v4Fixture.compactAuditInput.batches[0];
  assert.throws(() => validateCompactProcessAuditInputV2(positional), /self-describing keyed/u);

  const mislabeled = clone();
  [mislabeled.digestSemantics.blindedItemsSha256, mislabeled.digestSemantics.dispatchSha256]
    = [mislabeled.digestSemantics.dispatchSha256, mislabeled.digestSemantics.blindedItemsSha256];
  assert.throws(() => validateCompactProcessAuditInputV2(mislabeled), /five digest labels/u);

  const renamed = clone();
  renamed.batches.outputSha256 = renamed.batches.rawOutputSha256;
  delete renamed.batches.rawOutputSha256;
  assert.throws(() => validateCompactProcessAuditInputV2(renamed), /self-describing keyed/u);
});

test('content digest equality is permitted while transcript event identity reuse refuses', () => {
  const decoded = decodeBatchColumns(input.batches);
  const terra = decoded[2];
  const sol = decoded[5];
  assert.equal(terra.blindedItemsSha256, sol.blindedItemsSha256);
  assert.equal(terra.dispatchSha256, sol.dispatchSha256);
  assert.equal(terra.rawOutputSha256, sol.rawOutputSha256);
  assert.notEqual(terra.transcriptDispatchEventSha256, sol.transcriptDispatchEventSha256);
  assert.notEqual(terra.transcriptOutputEventSha256, sol.transcriptOutputEventSha256);
  assert.doesNotThrow(() => validateCompactProcessAuditInputV2(input));

  const reused = clone();
  const reusedRows = decodeBatchColumns(reused.batches);
  reusedRows[5].transcriptOutputEventSha256 = reusedRows[2].transcriptOutputEventSha256;
  reused.batches = encodeBatchColumns(reusedRows);
  assert.throws(() => validateCompactProcessAuditInputV2(reused), /reused or duplicated/u);
  const samePair = clone();
  const samePairRows = decodeBatchColumns(samePair.batches);
  samePairRows[0].transcriptOutputEventSha256 = samePairRows[0].transcriptDispatchEventSha256;
  samePair.batches = encodeBatchColumns(samePairRows);
  assert.throws(() => validateCompactProcessAuditInputV2(samePair), /distinct dispatch and output/u);
});

test('synthetic branch is the entire fixed fixture with null sampling identities', () => {
  assert.equal(input.itemCount, 24);
  assert.equal(input.selectionBasis.populationItemCount, 24);
  assert.equal(input.selectionBasis.dispatchedItemCountPerStage, 24);
  assert.equal(input.selectionBasis.samplingPerformed, false);
  assert.equal(input.publicArtifacts.samplingCommitmentSha256, null);
  assert.equal(input.publicArtifacts.samplingScriptSha256, null);

  for (const mutate of [
    (value) => { value.publicArtifacts.samplingCommitmentSha256 = `sha256:${'1'.repeat(64)}`; },
    (value) => { value.publicArtifacts.samplingScriptSha256 = `sha256:${'2'.repeat(64)}`; },
    (value) => { value.selectionBasis.samplingPerformed = true; },
    (value) => { value.selectionBasis.populationItemCount = 25; },
    (value) => { value.selectionBasis.populationScope = 'sampled-subset'; },
  ]) {
    const changed = clone();
    mutate(changed);
    assert.throws(() => validateCompactProcessAuditInputV2(changed), /synthetic pilot/u);
  }
});

test('real branch requires exact non-null commitment and sampling-script identities', () => {
  const real = buildRealCapacityProbeV2();
  assert.doesNotThrow(() => validateCompactProcessAuditInputV2(real));
  for (const field of ['samplingCommitmentSha256', 'samplingScriptSha256']) {
    const changed = clone(real);
    changed.publicArtifacts[field] = null;
    assert.throws(() => validateCompactProcessAuditInputV2(changed), /real screening/u);
  }
  const wrongCount = clone(real);
  wrongCount.itemCount = 663;
  assert.throws(() => validateCompactProcessAuditInputV2(wrongCount), /real screening/u);
});

test('capability and audit acceptance overclaims refuse', () => {
  const mutations = [
    (value) => { value.capabilityBoundary.providerExecution = 'verified'; },
    (value) => { value.capabilityBoundary.providerProcessFreshness = 'verified'; },
    (value) => { value.capabilityBoundary.absenceOfBoundaryProofIsProcessDefect = true; },
    (value) => { value.capabilityBoundary.materialProcessDefectRule = 'may infer from missing freshness proof'; },
    (value) => { value.capabilityBoundary.perfectAgreementRule = 'must be suppressed'; },
    (value) => { value.auditAcceptancePolicy.requiredAssessment = 'qualified-pass'; },
    (value) => { value.auditAcceptancePolicy.materialProcessDefectFlagCount = 1; },
    (value) => { value.auditAcceptancePolicy.qualifiedPassAccepted = true; },
  ];
  for (const mutate of mutations) {
    const changed = clone();
    mutate(changed);
    assert.throws(() => validateCompactProcessAuditInputV2(changed), /capability|unqualified PASS/u);
  }
});

test('664-item keyed capacity remains below the unchanged hard cap', () => {
  const capacity = renderCompactProcessAuditInputV2(buildRealCapacityProbeV2());
  assert.equal(capacity.length, 49_954);
  assert.ok(capacity.length <= 60_000);
  assert.ok(capacity.length < MAX_COMPACT_PROCESS_AUDIT_BYTES);
  assert.ok(capacity.length > 48_766);
});

test('schema closes the new keyed and branch-specific structures', () => {
  const schema = JSON.parse(readFileSync('schemas/compact-process-audit-input.v2.schema.json', 'utf8'));
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.$defs.batches.type, 'object');
  assert.equal(schema.$defs.batches.additionalProperties, false);
  assert.deepEqual(schema.$defs.batches.required.sort(), Object.keys(schema.$defs.batches.properties).sort());
  assert.equal(schema.$defs.selectionBasis.additionalProperties, false);
  assert.equal(schema.allOf.length, 2);
});
