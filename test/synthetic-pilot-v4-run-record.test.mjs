import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import {
  loadSyntheticPilotV4RunEvidence,
  validateSyntheticPilotV4RunRecord,
} from '../scripts/validate-synthetic-pilot-v4-run-record.mjs';
import { APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V4_RUN_SHA256 } from '../scripts/approved-prompted-screening-v5-identities.mjs';

const evidence = loadSyntheticPilotV4RunEvidence();
const record = validateSyntheticPilotV4RunRecord(evidence);

function digest(bytes) {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

function cloneEvidence() {
  return Object.fromEntries(Object.entries(evidence).map(([key, bytes]) => [key, Buffer.from(bytes)]));
}

test('v4 run is exactly nonconformant with one material flag and zero Ritsu decisions', () => {
  assert.equal(record.status, 'NON-CONFORMANT');
  assert.equal(record.reason, 'PROCESS_AUDIT_MATERIAL_FLAG');
  assert.equal(record.acceptanceCandidate, false);
  assert.equal(record.accepted, false);
  assert.equal(record.reusable, false);
  assert.equal(record.processAudit.overallAssessment, 'qualified-pass');
  assert.equal(record.processAudit.materialFlagCount, 1);
  assert.equal(record.processAudit.strictPassNoMaterialIssue, false);
  assert.equal(record.ritsuDecisionCount, 0);
  assert.equal(record.summary.ritsuPendingCount, 24);
});

test('all protected evidence identities are literal and checked before parsing', () => {
  const names = {
    compactAuditInputBytes: 'compactAuditInput',
    judgmentPrefixBytes: 'judgmentTranscriptPrefix',
    resultsBytes: 'results',
    processAuditDerivativeBytes: 'processAuditDerivative',
    ritsuReviewBytes: 'ritsuReview',
    transcriptBytes: 'finalTranscript',
    usageBytes: 'usage',
    mechanicalCorrectionBytes: 'mechanicalCorrection',
    recordBytes: 'terminalRecord',
  };
  for (const [byteName, identityName] of Object.entries(names)) {
    assert.equal(digest(evidence[byteName]), APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V4_RUN_SHA256[identityName]);
    const changed = cloneEvidence();
    changed[byteName] = Buffer.concat([changed[byteName], Buffer.from(' ')]);
    assert.throws(() => validateSyntheticPilotV4RunRecord(changed), /literal code-owned approved SHA-256 identity before parsing/u);
  }
});

test('accepted terminal recanonicalization refuses even with downstream fields updated', () => {
  const changed = cloneEvidence();
  const value = JSON.parse(changed.recordBytes.toString('utf8'));
  value.status = 'ACCEPTED';
  value.reason = 'PASS';
  value.acceptanceCandidate = true;
  value.approved = true;
  value.accepted = true;
  value.reusable = true;
  value.ritsuDecisionCount = 24;
  value.ritsuApproval = { decision: 'APPROVE' };
  changed.recordBytes = Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
  assert.throws(() => validateSyntheticPilotV4RunRecord(changed), /literal code-owned approved SHA-256 identity before parsing/u);
});

test('returned audit rewrite and downstream terminal hash update refuse', () => {
  const changed = cloneEvidence();
  changed.processAuditDerivativeBytes = Buffer.from(
    changed.processAuditDerivativeBytes.toString('utf8')
      .replace('qualified-pass', 'PASS')
      .replace('high-severity process-defect flag', 'no process-defect flag'),
    'utf8',
  );
  const value = JSON.parse(changed.recordBytes.toString('utf8'));
  value.artifacts.processAuditDerivativeSha256 = digest(changed.processAuditDerivativeBytes);
  changed.recordBytes = Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
  assert.throws(() => validateSyntheticPilotV4RunRecord(changed), /processAuditDerivativeBytes.*literal code-owned/u);
});

test('transcript event reuse and claimed independent freshness refuse after recanonicalization', () => {
  const changed = cloneEvidence();
  const lines = changed.transcriptBytes.toString('utf8').trimEnd().split('\n');
  const event = JSON.parse(lines[12]);
  event.taskName = JSON.parse(lines[6]).taskName;
  event.providerFreshnessVerified = true;
  lines[12] = JSON.stringify(event);
  changed.transcriptBytes = Buffer.from(`${lines.join('\n')}\n`, 'utf8');
  const value = JSON.parse(changed.recordBytes.toString('utf8'));
  value.artifacts.finalTranscriptSha256 = digest(changed.transcriptBytes);
  value.transcriptStages.finalTranscriptSha256 = digest(changed.transcriptBytes);
  value.classifications.providerProcessFreshness = 'MACHINE_VERIFIED';
  changed.recordBytes = Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
  assert.throws(() => validateSyntheticPilotV4RunRecord(changed), /transcriptBytes.*literal code-owned/u);
});

test('mechanical correction cannot be rewritten to claim freshness or independence', () => {
  const changed = cloneEvidence();
  changed.mechanicalCorrectionBytes = Buffer.from(
    changed.mechanicalCorrectionBytes.toString('utf8')
      .replace('does not prove\nprovider execution, process freshness, independent generation', 'proves\nprovider execution, process freshness, and independent generation'),
    'utf8',
  );
  const value = JSON.parse(changed.recordBytes.toString('utf8'));
  value.artifacts.mechanicalCorrectionSha256 = digest(changed.mechanicalCorrectionBytes);
  changed.recordBytes = Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
  assert.throws(() => validateSyntheticPilotV4RunRecord(changed), /mechanicalCorrectionBytes.*literal code-owned/u);
});
