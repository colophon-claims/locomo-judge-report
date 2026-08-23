import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V2_RUN_SHA256 } from '../scripts/approved-prompted-screening-v3-identities.mjs';
import {
  loadSyntheticPilotV2RunEvidence,
  validateSyntheticPilotV2RunRecord,
  validateTranscriptScopeSemantics,
} from '../scripts/validate-synthetic-pilot-v2-run-record.mjs';

const recordRaw = readFileSync('records/synthetic-pilot-v2-2026-08-23/NON-CONFORMANT.json', 'utf8');
const record = JSON.parse(recordRaw);
const evidence = loadSyntheticPilotV2RunEvidence();
const raw = (value) => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = (bytes) => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;

test('v2 evidence is exactly NON-CONFORMANT/PROCESS_DEFECT with zero Ritsu decisions', () => {
  assert.equal(sha256(Buffer.from(recordRaw)), APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V2_RUN_SHA256.runRecord);
  assert.equal(sha256(evidence.resultsBytes), APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V2_RUN_SHA256.rawResults);
  assert.equal(sha256(evidence.auditBytes), APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V2_RUN_SHA256.processAudit);
  assert.equal(sha256(evidence.transcriptBytes), APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V2_RUN_SHA256.finalTranscript);
  assert.doesNotThrow(() => validateSyntheticPilotV2RunRecord(recordRaw, evidence));
  assert.equal(record.status, 'NON-CONFORMANT');
  assert.equal(record.processOutcome, 'PROCESS_DEFECT');
  assert.equal(record.accepted, false);
  assert.equal(record.summary.judgmentCount, 72);
  assert.equal(record.summary.threeModelAgreementCount, 24);
  assert.equal(record.summary.errorCount, 0);
  assert.equal(record.summary.ritsuDecisionCount, 0);
});

test('judgment and final transcript hashes have exact non-circular scopes', () => {
  const lines = evidence.transcriptBytes.toString('utf8').trimEnd().split('\n');
  const judgmentBytes = Buffer.from(`${lines.slice(0, 14).join('\n')}\n`, 'utf8');
  assert.equal(sha256(judgmentBytes), record.transcriptStages.judgmentTranscriptSha256);
  assert.equal(record.transcriptStages.judgmentTranscriptSha256, 'sha256:c2c2157ba7eef0f342a0e7e5ee88674e9565da9d9425c5d0e708a64f3449ab63');
  assert.equal(sha256(evidence.transcriptBytes), record.transcriptStages.finalTranscriptSha256);
  assert.equal(record.transcriptStages.finalTranscriptSha256, 'sha256:cf7fd69cd298bb0e9a7fbb370b840680e960e2c0771e2466d94280c00c9ff3bb');
  assert.notEqual(record.transcriptStages.judgmentTranscriptSha256, record.transcriptStages.finalTranscriptSha256);
  assert.doesNotThrow(() => validateTranscriptScopeSemantics(record, evidence.transcriptBytes, evidence.auditBytes));
});

test('immutable identities are checked before record or evidence parsing', () => {
  assert.throws(() => validateSyntheticPilotV2RunRecord('not-json\n', evidence), /recordBytes.*immutable approved identity/u);
  assert.throws(() => validateSyntheticPilotV2RunRecord(recordRaw, { ...evidence, resultsBytes: Buffer.from('not-json\n') }), /resultsBytes.*immutable approved identity/u);
  assert.throws(() => validateSyntheticPilotV2RunRecord(recordRaw, { ...evidence, transcriptBytes: Buffer.from('not-json\n') }), /transcriptBytes.*immutable approved identity/u);
  assert.throws(() => validateSyntheticPilotV2RunRecord(recordRaw, { ...evidence, auditBytes: Buffer.from('not-audit\n') }), /auditBytes.*immutable approved identity/u);
});

test('record refuses acceptance, revised status, model drift, or fabricated Ritsu decisions', () => {
  const mutations = [
    (value) => { value.accepted = true; },
    (value) => { value.status = 'ACCEPTED'; },
    (value) => { value.processOutcome = 'CONFORMANT'; },
    (value) => { value.judgmentStages[0].reasoning = 'high'; },
    (value) => { value.summary.ritsuDecisionCount = 24; },
  ];
  for (const mutate of mutations) {
    const changed = structuredClone(record);
    mutate(changed);
    assert.throws(() => validateSyntheticPilotV2RunRecord(raw(changed), evidence), /recordBytes.*immutable approved identity/u);
  }
});

test('scope validator refuses an ambiguous single transcript identity', () => {
  const changed = structuredClone(record);
  changed.transcriptStages.transcriptSha256 = changed.transcriptStages.finalTranscriptSha256;
  assert.throws(() => validateTranscriptScopeSemantics(changed, evidence.transcriptBytes, evidence.auditBytes), /ambiguous single-scope/u);
});

test('scope validator refuses swapped judgment and final transcript identities', () => {
  const changed = structuredClone(record);
  [changed.transcriptStages.judgmentTranscriptSha256, changed.transcriptStages.finalTranscriptSha256] = [changed.transcriptStages.finalTranscriptSha256, changed.transcriptStages.judgmentTranscriptSha256];
  changed.artifacts.judgmentTranscriptSha256 = changed.transcriptStages.judgmentTranscriptSha256;
  changed.artifacts.finalTranscriptSha256 = changed.transcriptStages.finalTranscriptSha256;
  assert.throws(() => validateTranscriptScopeSemantics(changed, evidence.transcriptBytes, evidence.auditBytes), /swapped|transcript stages/u);
});

test('scope validator refuses an audit that names the circular final transcript', () => {
  const auditText = evidence.auditBytes.toString('utf8');
  const changedAudit = Buffer.from(auditText.replace('c2c2157ba7eef0f342a0e7e5ee88674e9565da9d9425c5d0e708a64f3449ab63', 'cf7fd69cd298bb0e9a7fbb370b840680e960e2c0771e2466d94280c00c9ff3bb'), 'utf8');
  assert.throws(() => validateTranscriptScopeSemantics(record, evidence.transcriptBytes, changedAudit), /pre-audit judgment transcript|exact process audit/u);
});

test('scope validator refuses an unbound suffix event', () => {
  const changedTranscript = Buffer.concat([evidence.transcriptBytes, Buffer.from('{"recordType":"unbound-suffix"}\n')]);
  const changed = structuredClone(record);
  changed.transcriptStages.finalRecordCount = 17;
  changed.transcriptStages.finalTranscriptSha256 = sha256(changedTranscript);
  changed.artifacts.finalTranscriptSha256 = sha256(changedTranscript);
  assert.throws(() => validateTranscriptScopeSemantics(changed, changedTranscript, evidence.auditBytes), /unbound transcript stages|14 judgment records/u);
});

test('scope validator refuses operator-local path or secret leakage', () => {
  const changedTranscript = Buffer.from(evidence.transcriptBytes.toString('utf8').replace('prompted-screening-synthetic-pilot-v2-2026-08-23', '/Users/operator/private/run'), 'utf8');
  assert.throws(() => validateTranscriptScopeSemantics(record, changedTranscript, evidence.auditBytes), /privacy or secret boundary/u);
});

test('immutable constants defeat accepted audit and downstream hash recanonicalization', () => {
  const auditBytes = Buffer.from(evidence.auditBytes.toString('utf8').replace('Process audit: **DEFECT**', 'Process audit: accepted and admissible'), 'utf8');
  const transcriptText = evidence.transcriptBytes.toString('utf8').replace(evidence.auditBytes.toString('base64'), auditBytes.toString('base64'));
  const transcriptBytes = Buffer.from(transcriptText, 'utf8');
  const changed = structuredClone(record);
  changed.artifacts.processAuditSha256 = sha256(auditBytes);
  changed.artifacts.finalTranscriptSha256 = sha256(transcriptBytes);
  changed.transcriptStages.finalTranscriptSha256 = sha256(transcriptBytes);
  const recordBytes = Buffer.from(raw(changed), 'utf8');
  const manifestEquivalent = { audit: sha256(auditBytes), transcript: sha256(transcriptBytes), record: sha256(recordBytes) };
  assert.equal(manifestEquivalent.audit, changed.artifacts.processAuditSha256);
  assert.throws(() => validateSyntheticPilotV2RunRecord(recordBytes, { ...evidence, auditBytes, transcriptBytes }), /auditBytes.*immutable approved identity/u);
});

test('immutable constants defeat raw-result reserialization and downstream hash recanonicalization', () => {
  const parsedResults = JSON.parse(evidence.resultsBytes.toString('utf8'));
  const resultsBytes = Buffer.from(`${JSON.stringify(parsedResults)}\n`, 'utf8');
  const changed = structuredClone(record);
  changed.artifacts.rawResultsSha256 = sha256(resultsBytes);
  const recordBytes = Buffer.from(raw(changed), 'utf8');
  const manifestEquivalent = { results: sha256(resultsBytes), record: sha256(recordBytes) };
  assert.equal(manifestEquivalent.results, changed.artifacts.rawResultsSha256);
  assert.throws(() => validateSyntheticPilotV2RunRecord(recordBytes, { ...evidence, resultsBytes }), /resultsBytes.*immutable approved identity/u);
});

test('immutable constants defeat transcript rewrite and all downstream identity updates', () => {
  const lines = evidence.transcriptBytes.toString('utf8').trimEnd().split('\n');
  const declaration = JSON.parse(lines[0]);
  declaration.publicPush = true;
  lines[0] = JSON.stringify(declaration);
  const transcriptBytes = Buffer.from(`${lines.join('\n')}\n`, 'utf8');
  const changed = structuredClone(record);
  changed.artifacts.judgmentTranscriptSha256 = sha256(Buffer.from(`${lines.slice(0, 14).join('\n')}\n`, 'utf8'));
  changed.artifacts.finalTranscriptSha256 = sha256(transcriptBytes);
  changed.transcriptStages.judgmentTranscriptSha256 = changed.artifacts.judgmentTranscriptSha256;
  changed.transcriptStages.finalTranscriptSha256 = changed.artifacts.finalTranscriptSha256;
  const recordBytes = Buffer.from(raw(changed), 'utf8');
  const manifestEquivalent = { transcript: sha256(transcriptBytes), record: sha256(recordBytes) };
  assert.equal(manifestEquivalent.transcript, changed.artifacts.finalTranscriptSha256);
  assert.throws(() => validateSyntheticPilotV2RunRecord(recordBytes, { ...evidence, transcriptBytes }), /transcriptBytes.*immutable approved identity/u);
});
