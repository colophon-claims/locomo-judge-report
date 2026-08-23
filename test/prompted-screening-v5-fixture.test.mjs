import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  decodeBatchColumns,
  encodeBatchColumns,
  renderCompactProcessAuditInputV2,
  validateCompactProcessAuditInputV2,
} from '../scripts/render-compact-process-audit-input-v2.mjs';
import { sha256 } from '../scripts/render-compact-process-audit-input-v1.mjs';
import {
  loadPromptedScreeningV5FixtureSource,
  validatePromptedScreeningV5Fixture,
} from '../scripts/validate-prompted-screening-v5-fixture.mjs';

const source = loadPromptedScreeningV5FixtureSource();
const fixture = validatePromptedScreeningV5Fixture(source);

function clone(value) {
  return structuredClone(value);
}

function changedPrefixWithDuplicateTask(input) {
  const lines = source.prefixBytes.toString('utf8').trimEnd().split('\n');
  const terraDispatch = JSON.parse(lines[6]);
  const terraOutput = JSON.parse(lines[7]);
  const solDispatch = JSON.parse(lines[12]);
  const solOutput = JSON.parse(lines[13]);
  solDispatch.taskName = terraDispatch.taskName;
  solOutput.taskName = terraOutput.taskName;
  lines[12] = JSON.stringify(solDispatch);
  lines[13] = JSON.stringify(solOutput);
  const prefixBytes = Buffer.from(`${lines.join('\n')}\n`, 'utf8');
  const changed = clone(input);
  changed.judgmentTranscriptPrefixSha256 = sha256(prefixBytes);
  const batches = decodeBatchColumns(changed.batches);
  batches[5].transcriptDispatchEventSha256 = sha256(Buffer.from(`${lines[12]}\n`, 'utf8'));
  batches[5].transcriptOutputEventSha256 = sha256(Buffer.from(`${lines[13]}\n`, 'utf8'));
  changed.batches = encodeBatchColumns(batches);
  return { changed, prefixBytes };
}

test('exact v5 fixture is no-run, compact, and derived from the preserved v4 prefix', () => {
  assert.equal(fixture.status, 'synthetic-validation-only-no-model-run');
  assert.equal(fixture.expectedExecution.modelRunOccurred, false);
  assert.equal(fixture.expectedExecution.observableUsage, null);
  assert.equal(fixture.expectedExecution.renderedByteLength, 11_465);
  assert.equal(fixture.expectedExecution.real664CapacityByteLength, 49_954);
  assert.equal(fixture.expectedExecution.real664CapacityBatchCount, 146);
  assert.equal(fixture.expectedExecution.capacityHeadroomByteLength, 15_582);
  assert.equal(fixture.provenance.newJudgmentOrAuditModelRunOccurred, false);
});

test('literal source identities refuse fixture and source recanonicalization before parsing', () => {
  const appended = { ...source, fixtureBytes: Buffer.concat([source.fixtureBytes, Buffer.from('\n')]) };
  assert.throws(() => validatePromptedScreeningV5Fixture(appended), /literal code-owned approved SHA-256 identity/u);

  const changed = clone(fixture);
  changed.compactAuditInput.capabilityBoundary.providerExecution = 'verified';
  const rendered = Buffer.from(`${JSON.stringify(changed.compactAuditInput)}\n`, 'utf8');
  changed.expectedExecution.renderedByteLength = rendered.length;
  changed.expectedExecution.renderedSha256 = sha256(rendered);
  const recanonicalized = { ...source, fixtureBytes: Buffer.from(`${JSON.stringify(changed, null, 2)}\n`, 'utf8') };
  assert.throws(() => validatePromptedScreeningV5Fixture(recanonicalized), /literal code-owned approved SHA-256 identity/u);
});

test('wrong digest-label semantics refuse against exact sealed bytes', () => {
  const changed = clone(fixture.compactAuditInput);
  const batches = decodeBatchColumns(changed.batches);
  [batches[0].blindedItemsSha256, batches[0].rawOutputSha256]
    = [batches[0].rawOutputSha256, batches[0].blindedItemsSha256];
  changed.batches = encodeBatchColumns(batches);
  assert.throws(
    () => validateCompactProcessAuditInputV2(changed, { transcriptPrefixBytes: source.prefixBytes }),
    /exact instruction, blinded, dispatch, output, and event identities/u,
  );
});

test('event reuse and duplicate task names refuse even after downstream digest updates', () => {
  const duplicatedIdentity = clone(fixture.compactAuditInput);
  const batches = decodeBatchColumns(duplicatedIdentity.batches);
  batches[5].transcriptOutputEventSha256 = batches[2].transcriptOutputEventSha256;
  duplicatedIdentity.batches = encodeBatchColumns(batches);
  assert.throws(() => validateCompactProcessAuditInputV2(duplicatedIdentity), /reused or duplicated/u);

  const { changed, prefixBytes } = changedPrefixWithDuplicateTask(fixture.compactAuditInput);
  assert.throws(
    () => validateCompactProcessAuditInputV2(changed, { transcriptPrefixBytes: prefixBytes }),
    /distinct declared task/u,
  );
});

test('synthetic and real selection semantics remain mutually exclusive and fail closed', () => {
  const synthetic = clone(fixture.compactAuditInput);
  synthetic.publicArtifacts.samplingCommitmentSha256 = `sha256:${'1'.repeat(64)}`;
  assert.throws(() => validateCompactProcessAuditInputV2(synthetic), /synthetic pilot/u);

  const real = clone(fixture.compactAuditInput);
  real.sourceKind = 'real-screening';
  real.itemCount = 664;
  real.selectionBasis = {
    kind: 'sealed-real-screening-pool-and-public-sample',
    populationScope: 'exact-sealed-664-item-screening-pool',
    populationItemCount: 664,
    dispatchedItemCountPerStage: 664,
    deterministicFixtureOrder: false,
    samplingPerformed: true,
  };
  assert.throws(() => validateCompactProcessAuditInputV2(real), /real screening/u);
});

test('capability and strict acceptance overclaims can never become green routing claims', () => {
  for (const mutate of [
    (value) => { value.capabilityBoundary.providerProcessFreshness = 'verified'; },
    (value) => { value.capabilityBoundary.absenceOfBoundaryProofIsProcessDefect = true; },
    (value) => { value.capabilityBoundary.perfectAgreementRule = 'automatically material'; },
    (value) => { value.auditAcceptancePolicy.requiredAssessment = 'qualified-pass'; },
    (value) => { value.auditAcceptancePolicy.materialProcessDefectFlagCount = 1; },
  ]) {
    const changed = clone(fixture.compactAuditInput);
    mutate(changed);
    assert.throws(() => renderCompactProcessAuditInputV2(changed), /capability|unqualified PASS/u);
  }
});
