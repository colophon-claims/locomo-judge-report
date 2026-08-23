import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { canonical } from '../scripts/render-compact-process-audit-input-v1.mjs';
import {
  evaluateAuditOutputPolicyV1,
  evaluateCompactProcessAuditAcceptanceV1,
  parseCompactProcessAuditOutputV1,
} from '../scripts/validate-compact-process-audit-output-v1.mjs';
import {
  loadPromptedScreeningV5FixtureSource,
  validatePromptedScreeningV5Fixture,
} from '../scripts/validate-prompted-screening-v5-fixture.mjs';

const validOutput = JSON.parse(readFileSync('fixtures/prompted-screening-pilot-v5-no-run-audit-output.canonical.json'));
function bytes(value) { return Buffer.from(`${canonical(value)}\n`); }
function clone(value = validOutput) { return structuredClone(value); }

test('exact no-run fixture validates while executable acceptance remains impossible', () => {
  const source = loadPromptedScreeningV5FixtureSource();
  const fixture = validatePromptedScreeningV5Fixture(source);
  assert.equal(fixture.status, 'synthetic-validation-only-no-model-run');
  assert.equal(fixture.compactAuditInput.executionKind, 'validation-only-no-model-run');
  assert.equal(parseCompactProcessAuditOutputV1(source.outputBytes).assessment, 'PASS');
  assert.equal(evaluateAuditOutputPolicyV1(source.outputBytes).policyPass, true);
  assert.throws(() => evaluateCompactProcessAuditAcceptanceV1({ evidence: source.evidence, outputBytes: source.outputBytes }), /cannot satisfy process acceptance/u);
});

test('audit output rejects prose, extra keys, status drift, and malformed bytes', () => {
  const cases = [
    Buffer.concat([bytes(validOutput), Buffer.from('qualified pass')]),
    Buffer.from(`prose\n${canonical(validOutput)}\n`),
    bytes({ ...validOutput, extra: true }),
    bytes({ ...validOutput, assessment: 'QUALIFIED_PASS' }),
    Buffer.from('{}\n'),
    Buffer.from(`${JSON.stringify(validOutput, null, 2)}\n`),
  ];
  for (const candidate of cases) assert.throws(() => parseCompactProcessAuditOutputV1(candidate));
});

test('audit output rejects coordinated hidden material and required-verification attacks', () => {
  const attacks = [
    (value) => { value.materialFindings = [{ code: 'SEALED_EVIDENCE_CONTRADICTION', severity: 'material' }]; value.materialFindingCount = 1; },
    (value) => { value.processDefects = { status: 'material', severity: 'high', requiredVerification: ['RESOLVE_SEALED_EVIDENCE'] }; },
    (value) => { value.processDefects.requiredVerification = ['STOP_AND_ESCALATE_TO_RITSU']; },
    (value) => { value.capabilityBoundary.providerExecution = 'verified'; },
    (value) => { value.suspiciousAgreement = { status: 'observed', material: false, code: null }; },
    (value) => { value.nonMaterialObservations = value.nonMaterialObservations.filter((row) => row.code !== 'PERFECT_SYNTHETIC_AGREEMENT'); value.nonMaterialObservationCount -= 1; },
  ];
  for (const mutate of attacks) {
    const changed = clone();
    mutate(changed);
    assert.throws(() => parseCompactProcessAuditOutputV1(bytes(changed)), /PASS|reconcile|capability|suspicious|corresponding|invalid/u);
  }
});

test('closed REFUSE is valid policy output but never passes the gate', () => {
  const refusal = clone();
  refusal.assessment = 'REFUSE';
  refusal.materialFindingCount = 1;
  refusal.materialFindings = [{ code: 'SEALED_EVIDENCE_CONTRADICTION', severity: 'material' }];
  refusal.processDefects = { status: 'material', severity: 'high', requiredVerification: ['RESOLVE_SEALED_EVIDENCE'] };
  const refusalBytes = bytes(refusal);
  assert.equal(parseCompactProcessAuditOutputV1(refusalBytes).assessment, 'REFUSE');
  assert.equal(evaluateAuditOutputPolicyV1(refusalBytes).policyPass, false);
  assert.throws(() => evaluateCompactProcessAuditAcceptanceV1({ outputBytes: refusalBytes }), /validation-only|unqualified PASS/u);
});

test('fixture and output recanonicalization cannot update through wrapper hashes', () => {
  const source = loadPromptedScreeningV5FixtureSource();
  const changedFixture = JSON.parse(source.fixtureBytes);
  changedFixture.compactAuditInput.aggregates.verdicts[0].correctCount += 1;
  source.fixtureBytes = Buffer.from(`${JSON.stringify(changedFixture, null, 2)}\n`);
  assert.throws(() => validatePromptedScreeningV5Fixture(source), /literal approved fixture identity/u);

  const source2 = loadPromptedScreeningV5FixtureSource();
  const changedOutput = clone();
  changedOutput.nonMaterialObservations = changedOutput.nonMaterialObservations.slice(1);
  changedOutput.nonMaterialObservationCount -= 1;
  source2.outputBytes = bytes(changedOutput);
  assert.throws(() => validatePromptedScreeningV5Fixture(source2), /literal approved output fixture identity/u);
});
