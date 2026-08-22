import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { loadSyntheticPilotRunEvidence, validateSyntheticPilotRunRecord } from '../scripts/validate-synthetic-pilot-run-record.mjs';

const recordRaw = readFileSync('records/synthetic-pilot-2026-08-22/NON-CONFORMANT.json', 'utf8');
const record = JSON.parse(recordRaw);
const evidence = loadSyntheticPilotRunEvidence();
const raw = (value) => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = (bytes) => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;

test('append-only record preserves the exact NON-CONFORMANT status and published evidence', () => {
  assert.doesNotThrow(() => validateSyntheticPilotRunRecord(record, recordRaw, evidence));
  assert.equal(record.status, 'NON-CONFORMANT');
  assert.equal(record.accepted, false);
  assert.equal(record.summary.judgmentCount, 72);
  assert.equal(record.summary.judgmentDispatchCount, 6);
  assert.equal(record.summary.processAuditDispatchCount, 1);
  assert.equal(record.summary.threeModelAgreementCount, 24);
  assert.equal(record.summary.errorCount, 0);
  assert.equal(record.summary.ritsuDecisionCount, 0);
  assert.equal(record.artifacts.rawTranscriptSha256, 'sha256:55792ab83caa3218605ce48b51d78a5920b919f9b991c8262fe54c94dbd28364');
});

test('append-only record refuses acceptance, status, summary, profile, and transcript-boundary drift', () => {
  const mutations = [
    (value) => { value.accepted = true; },
    (value) => { value.status = 'ACCEPTED'; },
    (value) => { value.summary.errorCount = 1; },
    (value) => { value.summary.ritsuDecisionCount = 24; },
    (value) => { value.judgmentStages[0].reasoning = 'high'; },
    (value) => { value.judgmentStages[1].batchSizes = [17, 7]; },
    (value) => { value.publishedEvidence.rawTranscriptIncluded = true; },
  ];
  for (const mutate of mutations) {
    const changed = structuredClone(record);
    mutate(changed);
    assert.throws(() => validateSyntheticPilotRunRecord(changed, raw(changed), evidence));
  }
});

test('append-only record refuses artifact substitution even with a recanonicalized record', () => {
  const changed = structuredClone(record);
  changed.artifacts.rawTranscriptSha256 = `sha256:${'0'.repeat(64)}`;
  assert.throws(() => validateSyntheticPilotRunRecord(changed, raw(changed), evidence), /record.artifacts/u);
  const changedEvidence = { ...evidence, promptV1Bytes: Buffer.concat([evidence.promptV1Bytes, Buffer.from('suffix\n')]) };
  assert.throws(() => validateSyntheticPilotRunRecord(record, recordRaw, changedEvidence));
});

test('append-only record refuses fabricated Ritsu decisions after matching a substituted result digest', () => {
  const results = JSON.parse(Buffer.from(evidence.resultsBytes).toString('utf8'));
  results.items[0].ritsuDecision = { verdict: 'confirm' };
  const resultsBytes = Buffer.from(`${JSON.stringify(results)}\n`, 'utf8');
  const changedEvidence = { ...evidence, resultsBytes };
  const changedRecord = structuredClone(record);
  changedRecord.artifacts.rawResultsSha256 = sha256(resultsBytes);
  assert.throws(() => validateSyntheticPilotRunRecord(changedRecord, raw(changedRecord), changedEvidence), /zero-decision boundary/u);
});

test('append-only record refuses a concealed result error after matching a substituted result digest', () => {
  const results = JSON.parse(Buffer.from(evidence.resultsBytes).toString('utf8'));
  results.summary.missingOutputCount = 1;
  const resultsBytes = Buffer.from(`${JSON.stringify(results)}\n`, 'utf8');
  const changedEvidence = { ...evidence, resultsBytes };
  const changedRecord = structuredClone(record);
  changedRecord.artifacts.rawResultsSha256 = sha256(resultsBytes);
  assert.throws(() => validateSyntheticPilotRunRecord(changedRecord, raw(changedRecord), changedEvidence), /zero-error summary/u);
});

test('append-only record refuses a rewritten audit even when its digest is updated', () => {
  const auditBytes = Buffer.from(Buffer.from(evidence.auditBytes).toString('utf8').replace('Overall outcome: **NON-CONFORMANT**.', 'Overall outcome: accepted.'), 'utf8');
  const changedEvidence = { ...evidence, auditBytes };
  const changedRecord = structuredClone(record);
  changedRecord.artifacts.processAuditSha256 = sha256(auditBytes);
  assert.throws(() => validateSyntheticPilotRunRecord(changedRecord, raw(changedRecord), changedEvidence), /auditBytes/u);
});
