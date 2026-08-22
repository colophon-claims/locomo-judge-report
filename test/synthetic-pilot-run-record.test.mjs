import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V1_SHA256, loadSyntheticPilotRunEvidence, validateSyntheticPilotRunRecord } from '../scripts/validate-synthetic-pilot-run-record.mjs';

const recordRaw = readFileSync('records/synthetic-pilot-2026-08-22/NON-CONFORMANT.json', 'utf8');
const record = JSON.parse(recordRaw);
const evidence = loadSyntheticPilotRunEvidence();
const raw = (value) => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = (bytes) => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;

test('append-only record preserves the exact NON-CONFORMANT status and published evidence', () => {
  assert.equal(sha256(Buffer.from(recordRaw, 'utf8')), APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V1_SHA256.runRecord);
  assert.equal(sha256(evidence.fixtureBytes), APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V1_SHA256.fixture);
  assert.equal(sha256(evidence.resultsBytes), APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V1_SHA256.rawResults);
  assert.equal(sha256(evidence.auditBytes), APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V1_SHA256.processAudit);
  assert.equal(sha256(evidence.validatorV1Bytes), APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V1_SHA256.procedureValidator);
  assert.doesNotThrow(() => validateSyntheticPilotRunRecord(recordRaw, evidence));
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

test('immutable identities are checked before record, fixture, or result parsing', () => {
  assert.throws(() => validateSyntheticPilotRunRecord('not-json\n', evidence), /recordBytes.*immutable approved identity/u);
  assert.throws(() => validateSyntheticPilotRunRecord(recordRaw, { ...evidence, fixtureBytes: Buffer.from('not-json\n') }), /fixtureBytes.*immutable approved identity/u);
  assert.throws(() => validateSyntheticPilotRunRecord(recordRaw, { ...evidence, resultsBytes: Buffer.from('not-json\n') }), /resultsBytes.*immutable approved identity/u);
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
    assert.throws(() => validateSyntheticPilotRunRecord(raw(changed), evidence), /recordBytes.*immutable approved identity/u);
  }
});

test('append-only record refuses artifact substitution even with a recanonicalized record', () => {
  const changed = structuredClone(record);
  changed.artifacts.rawTranscriptSha256 = `sha256:${'0'.repeat(64)}`;
  assert.throws(() => validateSyntheticPilotRunRecord(raw(changed), evidence), /recordBytes.*immutable approved identity/u);
  const changedEvidence = { ...evidence, promptV1Bytes: Buffer.concat([evidence.promptV1Bytes, Buffer.from('suffix\n')]) };
  assert.throws(() => validateSyntheticPilotRunRecord(recordRaw, changedEvidence), /promptV1Bytes.*immutable approved identity/u);
  const changedValidator = { ...evidence, validatorV1Bytes: Buffer.concat([evidence.validatorV1Bytes, Buffer.from('suffix\n')]) };
  assert.throws(() => validateSyntheticPilotRunRecord(recordRaw, changedValidator), /validatorV1Bytes.*immutable approved identity/u);
});

test('append-only record refuses fabricated Ritsu decisions after matching a substituted result digest', () => {
  const results = JSON.parse(Buffer.from(evidence.resultsBytes).toString('utf8'));
  results.items[0].ritsuDecision = { verdict: 'confirm' };
  const resultsBytes = Buffer.from(`${JSON.stringify(results)}\n`, 'utf8');
  const changedEvidence = { ...evidence, resultsBytes };
  const changedRecord = structuredClone(record);
  changedRecord.artifacts.rawResultsSha256 = sha256(resultsBytes);
  assert.throws(() => validateSyntheticPilotRunRecord(raw(changedRecord), changedEvidence), /resultsBytes.*immutable approved identity/u);
});

test('append-only record refuses a concealed result error after matching a substituted result digest', () => {
  const results = JSON.parse(Buffer.from(evidence.resultsBytes).toString('utf8'));
  results.summary.missingOutputCount = 1;
  const resultsBytes = Buffer.from(`${JSON.stringify(results)}\n`, 'utf8');
  const changedEvidence = { ...evidence, resultsBytes };
  const changedRecord = structuredClone(record);
  changedRecord.artifacts.rawResultsSha256 = sha256(resultsBytes);
  assert.throws(() => validateSyntheticPilotRunRecord(raw(changedRecord), changedEvidence), /resultsBytes.*immutable approved identity/u);
});

test('append-only record refuses an accepted and admissible audit rewrite after all downstream hashes change', () => {
  const auditBytes = Buffer.from(Buffer.from(evidence.auditBytes).toString('utf8').replace('Overall outcome: **NON-CONFORMANT**.', 'Overall outcome: accepted and admissible.'), 'utf8');
  const changedEvidence = { ...evidence, auditBytes };
  const changedRecord = structuredClone(record);
  changedRecord.artifacts.processAuditSha256 = sha256(auditBytes);
  const changedRecordBytes = Buffer.from(raw(changedRecord), 'utf8');
  const updatedManifestEquivalent = { processAudit: sha256(auditBytes), runRecord: sha256(changedRecordBytes) };
  assert.equal(updatedManifestEquivalent.processAudit, changedRecord.artifacts.processAuditSha256);
  assert.throws(() => validateSyntheticPilotRunRecord(changedRecordBytes, changedEvidence), /auditBytes.*immutable approved identity/u);
});

test('append-only record refuses raw-result reserialization after all downstream hashes change', () => {
  const results = JSON.parse(Buffer.from(evidence.resultsBytes).toString('utf8'));
  const resultsBytes = Buffer.from(`${JSON.stringify(results, null, 2)}\n`, 'utf8');
  assert.notEqual(sha256(resultsBytes), APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V1_SHA256.rawResults);
  const changedEvidence = { ...evidence, resultsBytes };
  const changedRecord = structuredClone(record);
  changedRecord.artifacts.rawResultsSha256 = sha256(resultsBytes);
  const changedRecordBytes = Buffer.from(raw(changedRecord), 'utf8');
  const updatedManifestEquivalent = { rawResults: sha256(resultsBytes), runRecord: sha256(changedRecordBytes) };
  assert.equal(updatedManifestEquivalent.rawResults, changedRecord.artifacts.rawResultsSha256);
  assert.throws(() => validateSyntheticPilotRunRecord(changedRecordBytes, changedEvidence), /resultsBytes.*immutable approved identity/u);
});

test('append-only record refuses coordinated fixture, input, result, record, and manifest-equivalent rewrites', () => {
  const fixture = JSON.parse(Buffer.from(evidence.fixtureBytes).toString('utf8'));
  fixture.cases[0].blindedInput.question = 'What revised synthetic color token is stored in drawer A?';
  const fixtureBytes = Buffer.from(`${JSON.stringify(fixture, null, 2)}\n`, 'utf8');
  const orderedBlindedInputsSha256 = sha256(Buffer.from(JSON.stringify(fixture.cases.map((pilotCase) => pilotCase.blindedInput)), 'utf8'));

  const results = JSON.parse(Buffer.from(evidence.resultsBytes).toString('utf8'));
  results.digests.fixtureSha256 = sha256(fixtureBytes).slice('sha256:'.length);
  results.digests.orderedBlindedInputsSha256 = orderedBlindedInputsSha256.slice('sha256:'.length);
  const resultsBytes = Buffer.from(`${JSON.stringify(results)}\n`, 'utf8');

  const changedRecord = structuredClone(record);
  changedRecord.artifacts.fixtureSha256 = sha256(fixtureBytes);
  changedRecord.artifacts.orderedBlindedInputsSha256 = orderedBlindedInputsSha256;
  changedRecord.artifacts.rawResultsSha256 = sha256(resultsBytes);
  const changedEvidence = { ...evidence, fixtureBytes, resultsBytes };
  const changedRecordBytes = Buffer.from(raw(changedRecord), 'utf8');
  const updatedManifestEquivalent = { fixture: sha256(fixtureBytes), rawResults: sha256(resultsBytes), runRecord: sha256(changedRecordBytes) };
  assert.equal(updatedManifestEquivalent.fixture, changedRecord.artifacts.fixtureSha256);
  assert.equal(updatedManifestEquivalent.rawResults, changedRecord.artifacts.rawResultsSha256);
  assert.throws(() => validateSyntheticPilotRunRecord(changedRecordBytes, changedEvidence), /fixtureBytes.*immutable approved identity/u);
});
