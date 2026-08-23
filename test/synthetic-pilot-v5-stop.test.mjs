import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  loadSyntheticPilotV5StopEvidence,
  validateSyntheticPilotV5StopEvidence,
} from '../scripts/validate-synthetic-pilot-v5-stop.mjs';

function cloneEvidence() {
  return Object.fromEntries(Object.entries(loadSyntheticPilotV5StopEvidence()).map(([key, value]) => [key, Buffer.from(value)]));
}

test('process-v5 stop is exact, nonconformant, and zero-dispatch', () => {
  const record = validateSyntheticPilotV5StopEvidence(cloneEvidence());
  assert.equal(record.status, 'NON-CONFORMANT');
  assert.equal(record.reason, 'PUBLIC_V5_EXECUTABLE_BUILDER_REJECTS_FRESH_PREFIX');
  assert.equal(record.execution.totalDispatchCount, 0);
  assert.equal(record.ritsu.decisionCount, 0);
});

test('literal identities refuse coordinated stop-evidence recanonicalization', () => {
  const evidence = cloneEvidence();
  const record = JSON.parse(evidence.recordBytes);
  record.status = 'ACCEPTED';
  record.accepted = true;
  evidence.recordBytes = Buffer.from(`${JSON.stringify(record, null, 2)}\n`);
  assert.throws(() => validateSyntheticPilotV5StopEvidence(evidence), /literal approved/u);
});

test('correction cannot invent transcript, audit, or Ritsu outcomes', () => {
  for (const text of ['A transcript existed.\n', 'The audit passed.\n', 'Ritsu approved.\n']) {
    const evidence = cloneEvidence();
    evidence.correctionBytes = Buffer.concat([evidence.correctionBytes, Buffer.from(text)]);
    assert.throws(() => validateSyntheticPilotV5StopEvidence(evidence), /literal approved/u);
  }
});
