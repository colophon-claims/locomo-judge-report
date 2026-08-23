import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { canonical, MAX_COMPACT_PROCESS_AUDIT_BYTES, sha256 } from '../scripts/render-compact-process-audit-input-v1.mjs';
import {
  CAPACITY_MEASUREMENT_KIND,
  decodeBatchColumns,
  deriveCompactProcessAuditInputV2,
  loadApprovedSyntheticAuditEvidenceV2,
  measureRealScreeningCapacityV2,
  renderCompactProcessAuditInputV2,
  validateCompactProcessAuditInputV2,
  validateRenderedCompactProcessAuditInputV2,
} from '../scripts/render-compact-process-audit-input-v2.mjs';

function cloneEvidence() {
  return Object.fromEntries(Object.entries(loadApprovedSyntheticAuditEvidenceV2()).map(([key, value]) => [key, Buffer.from(value)]));
}
function clone(value) { return structuredClone(value); }

test('exact evidence replay derives all six batches, 72 verdicts, and joint closure', () => {
  const evidence = cloneEvidence();
  const input = deriveCompactProcessAuditInputV2(evidence);
  const bytes = renderCompactProcessAuditInputV2(evidence);
  assert.equal(input.executionKind, 'validation-only-no-model-run');
  assert.equal(decodeBatchColumns(input.batches).length, 6);
  assert.equal(input.aggregates.judgmentCount, 72);
  assert.equal(input.cells.length, 12);
  assert.equal(input.cells.flatMap((cell) => cell.jointVerdictCounts).reduce((a, b) => a + b), 24);
  assert.equal(input.aggregates.agreements.threeStageAgreementCount, 24);
  assert.equal(bytes.length, 11_825);
  assert.doesNotThrow(() => validateCompactProcessAuditInputV2(input, evidence));
  assert.doesNotThrow(() => validateRenderedCompactProcessAuditInputV2(bytes, evidence));
  assert.throws(() => validateCompactProcessAuditInputV2(input), /exact authenticated sources/u);
  assert.throws(() => validateRenderedCompactProcessAuditInputV2(Buffer.concat([bytes, Buffer.from('suffix')]), evidence), /exact evidence-derived/u);
});

test('caller summaries and green booleans cannot substitute for derivation', () => {
  const evidence = cloneEvidence();
  const input = deriveCompactProcessAuditInputV2(evidence);
  for (const mutate of [
    (value) => { value.aggregates.invalidCount = 0; value.aggregates.verdicts[0].correctCount += 1; value.aggregates.verdicts[0].wrongCount -= 1; },
    (value) => { value.cells[0].jointVerdictCounts[0] = 1; value.cells[0].jointVerdictCounts[1] = 1; },
    (value) => { value.batches.correctCount[0] += 1; value.batches.wrongCount[0] -= 1; },
    (value) => { value.publicArtifacts.rendererSha256 = sha256(Buffer.from('invented')); },
  ]) {
    const changed = clone(input);
    mutate(changed);
    assert.throws(() => validateCompactProcessAuditInputV2(changed, evidence), /does not derive byte-for-byte/u);
  }
  const withGreenMirror = clone(input);
  withGreenMirror.batches.machineValidationPassed = Array(6).fill(true);
  assert.throws(() => validateCompactProcessAuditInputV2(withGreenMirror, evidence), /invalid closed|does not derive byte-for-byte/u);
});

test('omitted, substituted, swapped, and recanonicalized source artifacts refuse before summaries', () => {
  const input = deriveCompactProcessAuditInputV2(cloneEvidence());
  const attacks = [
    (evidence) => { evidence.transcriptPrefixBytes = Buffer.alloc(0); },
    (evidence) => { evidence.coordinatorPromptBytes = Buffer.concat([evidence.coordinatorPromptBytes, Buffer.from('contradiction\n')]); },
    (evidence) => { [evidence.coordinatorPromptBytes, evidence.judgmentProcedureBytes] = [evidence.judgmentProcedureBytes, evidence.coordinatorPromptBytes]; },
    (evidence) => { evidence.judgmentRendererBytes = Buffer.from('export default false;\n'); },
    (evidence) => {
      const fixture = JSON.parse(evidence.screeningPoolOrFixtureBytes);
      fixture.cases[0].blindedInput.question = 'Substituted synthetic question?';
      evidence.screeningPoolOrFixtureBytes = Buffer.from(`${JSON.stringify(fixture, null, 2)}\n`);
      const mapping = fixture.cases.map((row) => [row.pilotCaseId, row.judgmentItemId]);
      evidence.opaqueIdentityMappingBytes = Buffer.from(canonical(mapping));
      evidence.dispatchOrderBytes = Buffer.from(canonical(fixture.dispatchOrder));
    },
  ];
  for (const mutate of attacks) {
    const evidence = cloneEvidence();
    mutate(evidence);
    assert.throws(() => validateCompactProcessAuditInputV2(input, evidence), /literal approved|must match literal|source artifact|prefix/u);
  }
});

test('sealed event bytes are closed, paired, and strict-canonical base64', () => {
  const input = deriveCompactProcessAuditInputV2(cloneEvidence());
  for (const mutate of [
    (rows) => { [rows[2], rows[4]] = [rows[4], rows[2]]; },
    (rows) => { const output = JSON.parse(rows[3]); output.rawOutputBase64 = 'W10K'; output.rawOutputByteLength = 3; output.rawOutputSha256 = sha256(Buffer.from('[]\n')); output.rawOutputRecordCount = 0; output.routedVerdictCount = 24; output.validCompactOutput = true; rows[3] = JSON.stringify(output); },
    (rows) => { const dispatch = JSON.parse(rows[2]); dispatch.taskName = JSON.parse(rows[4]).taskName; rows[2] = JSON.stringify(dispatch); },
    (rows) => { const dispatch = JSON.parse(rows[2]); dispatch.extra = true; rows[2] = JSON.stringify(dispatch); },
    (rows) => { const output = JSON.parse(rows[3]); output.rawOutputBase64 = `${output.rawOutputBase64.slice(0, -2)}A=`; rows[3] = JSON.stringify(output); },
  ]) {
    const evidence = cloneEvidence();
    const rows = evidence.transcriptPrefixBytes.toString('utf8').trimEnd().split('\n');
    mutate(rows);
    evidence.transcriptPrefixBytes = Buffer.from(`${rows.join('\n')}\n`);
    assert.throws(() => validateCompactProcessAuditInputV2(input, evidence), /literal approved|canonical|closed|base64/u);
  }
});

test('digest column decoding refuses noncanonical base64url aliases', () => {
  const input = deriveCompactProcessAuditInputV2(cloneEvidence());
  const changed = clone(input);
  const column = changed.batches.blindedItemsSha256;
  const final = column[42];
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const index = alphabet.indexOf(final);
  changed.batches.blindedItemsSha256 = `${column.slice(0, 42)}${alphabet[(index ^ 1) % 64]}${column.slice(43)}`;
  assert.throws(() => decodeBatchColumns(changed.batches), /re-encode byte-identically/u);
});

test('capacity measurement is separate, bounded, and cannot masquerade as audit input', () => {
  const capacity = measureRealScreeningCapacityV2();
  assert.equal(capacity.measurementKind, CAPACITY_MEASUREMENT_KIND);
  assert.equal(capacity.itemCount, 664);
  assert.equal(capacity.batchCount, 146);
  assert.equal(capacity.byteLength, 42_754);
  assert.equal(capacity.headroomByteLength, 22_782);
  assert.equal(capacity.canValidateAsAuditInput, false);
  assert.ok(capacity.byteLength <= 60_000);
  assert.ok(capacity.byteLength < MAX_COMPACT_PROCESS_AUDIT_BYTES);
  assert.throws(() => validateCompactProcessAuditInputV2(capacity, cloneEvidence()), /invalid closed/u);
});

test('schema closes exact derived fields and removes caller validation mirrors', () => {
  const schema = JSON.parse(readFileSync('schemas/compact-process-audit-input.v2.schema.json'));
  assert.equal(schema.additionalProperties, false);
  assert.ok(schema.required.includes('executionKind'));
  assert.equal(schema.$defs.batches.additionalProperties, false);
  for (const key of ['dispatchDigestVerified', 'outputDigestVerified', 'summaryCountsVerified', 'machineValidationErrors']) {
    assert.equal(schema.$defs.batches.required.includes(key), false);
    assert.equal(Object.hasOwn(schema.$defs.batches.properties, key), false);
  }
  assert.equal(schema.$defs.auditScope.properties.rawIntegrityBasis.const, 'derived-from-exact-authenticated-source-and-prefix-bytes');
});
