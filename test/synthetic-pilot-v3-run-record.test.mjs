import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V3_RUN_SHA256 } from '../scripts/approved-prompted-screening-v4-identities.mjs';
import {
  loadSyntheticPilotV3RunEvidence,
  validateSyntheticPilotV3RunRecord,
} from '../scripts/validate-synthetic-pilot-v3-run-record.mjs';

const recordBytes = readFileSync('records/synthetic-pilot-v3-2026-08-23/NOT-APPROVED.json');
const record = JSON.parse(recordBytes);
const evidence = loadSyntheticPilotV3RunEvidence();
const digest = (bytes) => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
const pretty = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);

test('v3 pilot is process-green but not approved, accepted, reusable, or admissible', () => {
  assert.equal(digest(recordBytes), APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V3_RUN_SHA256.terminalRecord);
  assert.doesNotThrow(() => validateSyntheticPilotV3RunRecord(recordBytes, evidence));
  assert.equal(record.processConformance, 'PASS');
  assert.equal(record.acceptanceCandidate, true);
  assert.equal(record.status, 'NOT-APPROVED');
  assert.equal(record.approved, false);
  assert.equal(record.accepted, false);
  assert.equal(record.reusable, false);
  assert.equal(record.admissionEligible, false);
  assert.equal(record.ritsuApproval, null);
});

test('v3 pilot binds all judgments, agreement, error, retry, tool, and decision counts', () => {
  assert.equal(record.summary.judgmentCount, 72);
  assert.equal(record.summary.threeModelAgreementCount, 24);
  assert.equal(record.summary.modelDisagreementCount, 0);
  assert.equal(record.summary.errorCount, 0);
  assert.equal(record.summary.retryCount, 0);
  assert.equal(record.summary.judgmentAgentToolCallCount, 0);
  assert.equal(record.summary.processAuditToolCallCount, 11);
  assert.equal(record.summary.ritsuDecisionCount, 0);
});

test('v3 pilot preserves exact observable cost and rejects the raw-material audit shape', () => {
  assert.deepEqual(record.observableUsage.judgmentTasks, { inputTokens: 119831, cachedInputTokens: 86528, cacheWriteInputTokens: 0, outputTokens: 2869, reasoningOutputTokens: 742, totalTokens: 122700 });
  assert.deepEqual(record.observableUsage.processAudit, { inputTokens: 450974, cachedInputTokens: 401408, cacheWriteInputTokens: 0, outputTokens: 13173, reasoningOutputTokens: 3970, totalTokens: 464147 });
  assert.equal(record.observableUsage.total.totalTokens, 586847);
  assert.equal(record.approvalDisposition.auditShapeStatus, 'REJECTED-EXCESSIVE-USAGE');
  assert.equal(record.approvalDisposition.noRerun, true);
});

test('immutable identities are checked before parsing record or evidence', () => {
  assert.throws(() => validateSyntheticPilotV3RunRecord(Buffer.from('not-json\n'), evidence), /recordBytes.*immutable approved identity/u);
  for (const key of ['transcriptBytes', 'resultsBytes', 'usageBytes', 'processAuditBytes', 'ritsuReviewBytes', 'derivativeCorrectionsBytes', 'compactFixtureBytes']) {
    assert.throws(() => validateSyntheticPilotV3RunRecord(recordBytes, { ...evidence, [key]: Buffer.from('not-valid\n') }), new RegExp(`${key}.*immutable approved identity`, 'u'));
  }
});

test('immutable record identity defeats approval and usage recanonicalization', () => {
  const mutations = [
    (value) => { value.status = 'ACCEPTED'; value.accepted = true; },
    (value) => { value.approved = true; value.ritsuApproval = 'approve'; },
    (value) => { value.reusable = true; value.admissionEligible = true; },
    (value) => { value.observableUsage.processAudit.totalTokens = 1; },
    (value) => { value.summary.ritsuDecisionCount = 24; },
  ];
  for (const mutate of mutations) {
    const changed = structuredClone(record);
    mutate(changed);
    assert.throws(() => validateSyntheticPilotV3RunRecord(pretty(changed), evidence), /recordBytes.*immutable approved identity/u);
  }
});

test('immutable evidence defeats downstream hash and record recanonicalization', () => {
  const cases = [
    {
      key: 'processAuditBytes',
      artifact: 'processAuditDerivativeSha256',
      bytes: Buffer.from(evidence.processAuditBytes.toString('utf8').replace('Process audit: PASS', 'Process audit: ACCEPTED AND ADMISSIBLE')),
    },
    {
      key: 'resultsBytes',
      artifact: 'resultsSha256',
      bytes: Buffer.from(`${JSON.stringify(JSON.parse(evidence.resultsBytes))}\n`),
    },
    {
      key: 'transcriptBytes',
      artifact: 'finalTranscriptSha256',
      bytes: Buffer.concat([evidence.transcriptBytes, Buffer.from('{"recordType":"unbound-suffix"}\n')]),
    },
  ];
  for (const change of cases) {
    const changed = structuredClone(record);
    changed.artifacts[change.artifact] = digest(change.bytes);
    if (change.key === 'transcriptBytes') changed.transcriptStages.finalTranscriptSha256 = digest(change.bytes);
    const changedRecord = pretty(changed);
    const manifestEquivalent = { evidence: digest(change.bytes), record: digest(changedRecord) };
    assert.equal(manifestEquivalent.evidence, changed.artifacts[change.artifact]);
    assert.throws(() => validateSyntheticPilotV3RunRecord(changedRecord, { ...evidence, [change.key]: change.bytes }), new RegExp(`${change.key}.*immutable approved identity`, 'u'));
  }
});

test('derivative correction history retains original and corrected identities', () => {
  assert.equal(record.derivativeHistory.originalUsageSha256, 'sha256:0c19cf14977b791d5c543657fdce3bd1204807e4d4faa6cb43efc56234c70c9c');
  assert.equal(record.derivativeHistory.correctedUsageSha256, APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V3_RUN_SHA256.usage);
  assert.equal(record.derivativeHistory.originalProcessAuditSha256, 'sha256:05c7b060ac1b6f5c16752e263a2ba53f3412113e656334d81b39641830f00c96');
  assert.equal(record.derivativeHistory.correctedProcessAuditSha256, APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V3_RUN_SHA256.processAudit);
  assert.equal(record.derivativeHistory.originalRitsuReviewSha256, 'sha256:3235a4d3fea6c06489d6611c6914db5a870831ea7db3087dc4f00c444a64e6a6');
  assert.equal(record.derivativeHistory.correctedRitsuReviewSha256, APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V3_RUN_SHA256.ritsuReview);
  assert.equal(record.derivativeHistory.sealedTranscriptUnchanged, true);
  assert.equal(record.derivativeHistory.sealedResultsUnchanged, true);
});
