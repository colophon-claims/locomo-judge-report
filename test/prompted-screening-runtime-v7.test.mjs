import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { canonical, sha256 } from '../scripts/render-compact-process-audit-input-v1.mjs';
import { measureRealScreeningCapacityV2 } from '../scripts/render-compact-process-audit-input-v2.mjs';
import { buildProductionPreDispatchPlanV7, buildTestPreDispatchPlanV7, loadPromptedScreeningV7Sources, resolveProductionSourceRevisionV7, TEST_ONLY_SOURCE_REVISION_V7 } from '../scripts/plan-prompted-screening-v7.mjs';
import { constructJudgmentPrefixV7, renderRuntimeCompactInputV7 } from '../scripts/build-prompted-screening-runtime-v7.mjs';
import { buildPromptedScreeningAuditOutputEventV7, buildPromptedScreeningFinalTranscriptV7, finalizeProductionPromptedScreeningV7, preparePromptedScreeningAuditV7, validatePromptedScreeningFinalTranscriptV7 } from '../scripts/gate-prompted-screening-runtime-v7.mjs';
import { parsePromptedScreeningAuditFindingsV1, renderTestAuditFindingsV1 } from '../scripts/validate-prompted-screening-audit-findings-v1.mjs';
import { runNoModelSimulationV7 } from '../scripts/simulate-prompted-screening-runtime-v7.mjs';
import { validateSyntheticPilotV6StopEvidence } from '../scripts/validate-synthetic-pilot-v6-stop.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const outputs = JSON.parse(readFileSync(new URL('../fixtures/prompted-screening-runtime-v6-simulation-outputs.canonical.json', import.meta.url)));
const v6RawAudit = readFileSync(new URL('../records/synthetic-pilot-v6-2026-08-23/raw/07-process-audit.json', import.meta.url));

function receipts(plan, prefix = 'test-v7') {
  return plan.dispatches.map((dispatch, index) => ({ taskId: `${prefix}/${dispatch.stage.toLowerCase()}-${dispatch.batchOrdinal}`, outputBytes: Buffer.from(outputs.outputs[index].rawOutputBase64, 'base64'), infrastructureFailureCount: 0, retryCount: 0, toolCallCount: 0 }));
}
function testRun({ changeFirstVerdict = false } = {}) {
  const sources = loadPromptedScreeningV7Sources();
  const plan = buildTestPreDispatchPlanV7({ sources });
  const runReceipts = receipts(plan);
  if (changeFirstVerdict) { const rows = JSON.parse(runReceipts[0].outputBytes); rows[0].verdict = rows[0].verdict === 'CORRECT' ? 'WRONG' : 'CORRECT'; runReceipts[0].outputBytes = Buffer.from(`${canonical(rows)}\n`); }
  const prefixBytes = constructJudgmentPrefixV7({ plan, runId: 'test-v7-runtime-run', receipts: runReceipts, operatorAttestation: { kind: 'test-only-no-model', attestedBy: 'test-harness', modelRunOccurred: false, testOnly: true }, sources });
  return { sources, plan, prefixBytes };
}
function passPayload(preparation) {
  return renderTestAuditFindingsV1({ auditInvocationSha256: preparation.auditInvocationSha256, nonMaterialObservations: [{ code: 'EXPECTED_SYNTHETIC_AGREEMENT', evidenceReferences: ['/aggregates/agreements'] }] });
}
function mutation(bytes, mutate) { const value = JSON.parse(bytes); mutate(value); return Buffer.from(`${canonical(value)}\n`); }
function temporaryProductionCheckout() {
  const parent = mkdtempSync(join(tmpdir(), 'colophon-v7-production-'));
  const directory = join(parent, 'repo');
  cpSync(root, directory, { recursive: true, filter: (source) => !source.endsWith('/.git') && !source.includes('/.git/') });
  execFileSync('git', ['init', '-q'], { cwd: directory });
  execFileSync('git', ['config', 'user.name', 'Synthetic Test'], { cwd: directory });
  execFileSync('git', ['config', 'user.email', 'synthetic@example.invalid'], { cwd: directory });
  execFileSync('git', ['add', '.'], { cwd: directory });
  execFileSync('git', ['commit', '-q', '-m', 'synthetic exact source'], { cwd: directory });
  return { directory: realpathSync(directory), parent, revision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: directory, encoding: 'utf8' }).trim() };
}

test('audit instruction is self-contained, fence-free, and exact dispatch bytes contain one binding line and compact input', () => {
  const run = testRun();
  const preparation = preparePromptedScreeningAuditV7({ ...run, taskId: 'test-v7-runtime/audit' });
  const instruction = run.sources.auditInstructionBytes.toString('utf8');
  assert.equal(instruction.includes('```'), false);
  assert.match(instruction, /Use exactly these six root keys/u);
  assert.match(instruction, /Exact valid example/u);
  assert.match(instruction, /"assessment":"PASS"/u);
  assert.equal(preparation.auditDispatchBytes.equals(Buffer.concat([run.sources.auditInstructionBytes, Buffer.from(`AUDIT INVOCATION SHA-256: ${preparation.auditInvocationSha256}\n`), preparation.compactInputBytes])), true);
  assert.equal(sha256(preparation.invocationBytes), preparation.auditInvocationSha256);
  assert.deepEqual(preparation.compactInput.auditScope.mayInspect, ['coverage', 'declaration-drift', 'shard-drift', 'suspicious-agreement', 'cross-stage-asymmetry', 'process-defects']);
  assert.ok(preparation.compactInputBytes.length < 65_536);
  assert.ok(preparation.auditDispatchBytes.length < 65_536);
});

test('664-item compact audit plus the self-contained instruction retains hard-cap headroom', () => {
  const capacity = measureRealScreeningCapacityV2();
  const instructionLength = readFileSync(join(root, 'CODEX-SCREENING-AUDIT-INSTRUCTION.v3.txt')).length;
  const bindingLineLength = Buffer.byteLength(`AUDIT INVOCATION SHA-256: sha256:${'0'.repeat(64)}\n`);
  const v7ShardScopeByteLength = Buffer.byteLength(',"shard-drift"');
  const projectedCompactByteLength = capacity.byteLength + v7ShardScopeByteLength;
  const projectedDispatchByteLength = projectedCompactByteLength + instructionLength + bindingLineLength;
  assert.equal(capacity.itemCount, 664);
  assert.equal(capacity.batchCount, 146);
  assert.equal(capacity.byteLength, 42_754);
  assert.equal(projectedCompactByteLength, 42_768);
  assert.equal(projectedDispatchByteLength, 46_324);
  assert.equal(65_536 - projectedDispatchByteLength, 19_212);
  assert.ok(projectedDispatchByteLength < 65_536);
});

test('closed semantic payload accepts PASS, FAIL, and REFUSE only under exact consistency rules', () => {
  const preparation = preparePromptedScreeningAuditV7({ ...testRun(), taskId: 'test-v7-payload/audit' });
  const pass = passPayload(preparation);
  assert.equal(parsePromptedScreeningAuditFindingsV1(pass, { expectedAuditInvocationSha256: preparation.auditInvocationSha256 }).assessment, 'PASS');
  const finding = { code: 'SHARD_DRIFT', evidenceReferences: ['/batches/0', '/batches/1'], summary: 'One supplied shard differs materially from its peers.' };
  const fail = renderTestAuditFindingsV1({ auditInvocationSha256: preparation.auditInvocationSha256, assessment: 'FAIL', materialFindings: [finding] });
  assert.equal(parsePromptedScreeningAuditFindingsV1(fail, { expectedAuditInvocationSha256: preparation.auditInvocationSha256 }).assessment, 'FAIL');
  const refuse = renderTestAuditFindingsV1({ auditInvocationSha256: preparation.auditInvocationSha256, assessment: 'REFUSE', nonMaterialObservations: [{ code: 'KNOWN_AUDIT_INPUT_AMBIGUITY', evidenceReferences: ['/auditScope'] }] });
  assert.equal(parsePromptedScreeningAuditFindingsV1(refuse, { expectedAuditInvocationSha256: preparation.auditInvocationSha256 }).assessment, 'REFUSE');
  assert.throws(() => parsePromptedScreeningAuditFindingsV1(mutation(pass, (value) => { value.materialFindings = [finding]; }), { expectedAuditInvocationSha256: preparation.auditInvocationSha256 }), /PASS requires zero/u);
  assert.throws(() => parsePromptedScreeningAuditFindingsV1(mutation(pass, (value) => { value.assessment = 'FAIL'; }), { expectedAuditInvocationSha256: preparation.auditInvocationSha256 }), /FAIL requires/u);
  assert.throws(() => parsePromptedScreeningAuditFindingsV1(mutation(pass, (value) => { value.assessment = 'REFUSE'; value.nonMaterialObservations = []; }), { expectedAuditInvocationSha256: preparation.auditInvocationSha256 }), /REFUSE requires/u);
  assert.throws(() => renderTestAuditFindingsV1({ auditInvocationSha256: preparation.auditInvocationSha256, assessment: 'FAIL', materialFindings: [{ code: 'OTHER_MATERIAL', evidenceReferences: ['/auditScope'], summary: 'Too vague.' }] }), /meaningful summary/u);
});

test('material anomaly codes cannot hide in observations or reach the composed policy path', () => {
  const preparation = preparePromptedScreeningAuditV7({ ...testRun(), taskId: 'test-v7-materiality/audit' });
  const pass = passPayload(preparation);
  const hiddenMaterialPayloads = [
    { code: 'PROCESS_DEFECT', evidenceReferences: ['/auditScope'], summary: 'A material process defect blocks acceptance.' },
    { code: 'OTHER_OBSERVATION', evidenceReferences: ['/auditScope'], summary: 'A material concern remains unresolved and blocks acceptance.' },
    { code: 'SHARD_DRIFT', evidenceReferences: ['/batches/0'], summary: 'Shard drift is severe enough to invalidate this run.' },
  ].map((entry) => mutation(pass, (value) => { value.nonMaterialObservations = [entry]; }));
  for (const payload of hiddenMaterialPayloads) {
    assert.throws(() => parsePromptedScreeningAuditFindingsV1(payload, { expectedAuditInvocationSha256: preparation.auditInvocationSha256 }), /closed non-material-observation/u);
    assert.throws(() => buildPromptedScreeningAuditOutputEventV7({ preparation, rawPayloadBytes: payload }), /closed non-material-observation/u);
  }
  const extraObservationFields = [
    mutation(pass, (value) => { value.nonMaterialObservations[0].summary = 'No free-form observation summary is allowed.'; }),
    mutation(pass, (value) => { value.nonMaterialObservations[0].text = 'No free-form observation text is allowed.'; }),
    mutation(pass, (value) => { value.nonMaterialObservations[0].severity = 'non-material'; }),
  ];
  for (const payload of extraObservationFields) assert.throws(() => buildPromptedScreeningAuditOutputEventV7({ preparation, rawPayloadBytes: payload }), /closed non-material-observation/u);
  assert.throws(() => parsePromptedScreeningAuditFindingsV1(mutation(pass, (value) => { value.nonMaterialObservations[0].code = 'PROCESS_DEFECT'; }), { expectedAuditInvocationSha256: preparation.auditInvocationSha256 }), /closed non-material-observation/u);
  assert.throws(() => parsePromptedScreeningAuditFindingsV1(mutation(pass, (value) => { value.assessment = 'FAIL'; value.materialFindings = [{ code: 'EXPECTED_SYNTHETIC_AGREEMENT', evidenceReferences: ['/aggregates/agreements'], summary: 'This benign code cannot occupy the material array.' }]; }), { expectedAuditInvocationSha256: preparation.auditInvocationSha256 }), /closed material-finding/u);
});

test('OTHER_MATERIAL schema and parser require three actual alphanumeric tokens at the 24-character boundary', () => {
  const schema = JSON.parse(readFileSync(join(root, 'schemas/prompted-screening-audit-findings.v1.schema.json')));
  const summaryRule = schema.$defs.materialFinding.allOf[0].then.properties.summary;
  const schemaAccepts = (summary) => summary.length >= summaryRule.minLength && new RegExp(summaryRule.pattern, 'u').test(summary);
  const oneLongToken = 'abcdefghijklmnopqrstuvwx';
  const twoLongTokens = 'abcdefghijkl abcdefghijk';
  const exactPositiveBoundary = 'abcdefgh ijklmnop qrstuv';
  const punctuatedPositiveBoundary = 'abcdefgh-ijklmnop/qrstuv';
  assert.equal(oneLongToken.length, 24);
  assert.equal(twoLongTokens.length, 24);
  assert.equal(exactPositiveBoundary.length, 24);
  assert.equal(punctuatedPositiveBoundary.length, 24);
  assert.equal(schemaAccepts(oneLongToken), false);
  assert.equal(schemaAccepts(twoLongTokens), false);
  assert.equal(schemaAccepts(exactPositiveBoundary), true);
  assert.equal(schemaAccepts(punctuatedPositiveBoundary), true);
  const preparation = preparePromptedScreeningAuditV7({ ...testRun(), taskId: 'test-v7-other-material/audit' });
  const finding = (summary) => ({ code: 'OTHER_MATERIAL', evidenceReferences: ['/auditScope'], summary });
  assert.throws(() => renderTestAuditFindingsV1({ auditInvocationSha256: preparation.auditInvocationSha256, assessment: 'FAIL', materialFindings: [finding(oneLongToken)] }), /meaningful summary/u);
  assert.throws(() => renderTestAuditFindingsV1({ auditInvocationSha256: preparation.auditInvocationSha256, assessment: 'FAIL', materialFindings: [finding(twoLongTokens)] }), /meaningful summary/u);
  assert.equal(parsePromptedScreeningAuditFindingsV1(renderTestAuditFindingsV1({ auditInvocationSha256: preparation.auditInvocationSha256, assessment: 'FAIL', materialFindings: [finding(exactPositiveBoundary)] }), { expectedAuditInvocationSha256: preparation.auditInvocationSha256 }).assessment, 'FAIL');
  assert.equal(parsePromptedScreeningAuditFindingsV1(renderTestAuditFindingsV1({ auditInvocationSha256: preparation.auditInvocationSha256, assessment: 'FAIL', materialFindings: [finding(punctuatedPositiveBoundary)] }), { expectedAuditInvocationSha256: preparation.auditInvocationSha256 }).assessment, 'FAIL');
});

test('wrong or missing invocation, extra keys, prose, nesting, invalid code, and stale payload all refuse without repair', () => {
  const first = preparePromptedScreeningAuditV7({ ...testRun(), taskId: 'test-v7-hostile/audit-one' });
  const valid = passPayload(first);
  const hostile = [
    mutation(valid, (value) => { value.auditInvocationSha256 = `sha256:${'1'.repeat(64)}`; }),
    mutation(valid, (value) => { delete value.auditInvocationSha256; }),
    mutation(valid, (value) => { value.extra = true; }),
    Buffer.concat([valid, Buffer.from('prose\n')]),
    Buffer.from(`${canonical({ invocation: { auditInvocationSha256: first.auditInvocationSha256 }, assessment: 'PASS' })}\n`),
    mutation(valid, (value) => { value.nonMaterialObservations[0].code = 'UNKNOWN'; }),
    mutation(valid, (value) => { value.nonMaterialObservations[0].summary = 'Extra free-form text is forbidden.'; }),
  ];
  hostile.forEach((bytes) => assert.throws(() => parsePromptedScreeningAuditFindingsV1(bytes, { expectedAuditInvocationSha256: first.auditInvocationSha256 }), /JSON|canonical|closed|invalid|does not match|item judgment/u));
  const missingEvidence = mutation(valid, (value) => { value.nonMaterialObservations[0].evidenceReferences = ['/does-not-exist']; });
  assert.throws(() => buildPromptedScreeningAuditOutputEventV7({ preparation: first, rawPayloadBytes: missingEvidence }), /does not resolve/u);
  const changedRun = testRun();
  const changed = preparePromptedScreeningAuditV7({ ...changedRun, taskId: 'test-v7-hostile/audit-two' });
  assert.notEqual(first.auditInvocationSha256, changed.auditInvocationSha256);
  assert.throws(() => buildPromptedScreeningAuditOutputEventV7({ preparation: changed, rawPayloadBytes: valid }), /does not match/u);
  assert.throws(() => parsePromptedScreeningAuditFindingsV1(v6RawAudit, { expectedAuditInvocationSha256: first.auditInvocationSha256 }), /closed canonical/u);
});

test('input mutation changes invocation and stale payload cannot bind', () => {
  const run = testRun();
  const original = preparePromptedScreeningAuditV7({ ...run, taskId: 'test-v7-input/audit' });
  const changedRun = testRun({ changeFirstVerdict: true });
  const changed = preparePromptedScreeningAuditV7({ ...changedRun, taskId: 'test-v7-input/audit' });
  assert.notEqual(original.invocation.auditInputSha256, changed.invocation.auditInputSha256);
  assert.notEqual(original.auditInvocationSha256, changed.auditInvocationSha256);
  assert.throws(() => parsePromptedScreeningAuditFindingsV1(passPayload(original), { expectedAuditInvocationSha256: changed.auditInvocationSha256 }), /does not match/u);
});

test('raw and composed envelope bytes replay exactly and every substitution or digest drift refuses', () => {
  const run = testRun();
  const preparation = preparePromptedScreeningAuditV7({ ...run, taskId: 'test-v7-envelope/audit' });
  const rawPayloadBytes = passPayload(preparation);
  const built = buildPromptedScreeningFinalTranscriptV7({ plan: run.plan, prefixBytes: run.prefixBytes, auditTaskId: preparation.invocation.taskId, rawPayloadBytes, sources: run.sources });
  assert.equal(built.output.envelope.rawAuditPayloadSha256, sha256(rawPayloadBytes));
  assert.deepEqual(validatePromptedScreeningFinalTranscriptV7({ plan: run.plan, finalTranscriptBytes: built.finalTranscriptBytes, sources: run.sources }), built.result);
  const mutateTranscript = (change) => { const rows = built.finalTranscriptBytes.toString('utf8').trimEnd().split('\n').map(JSON.parse); change(rows); return Buffer.from(`${rows.map(canonical).join('\n')}\n`); };
  const attacks = [
    (rows) => { rows[15].rawAuditPayloadSha256 = `sha256:${'3'.repeat(64)}`; },
    (rows) => { rows[15].auditEnvelopeSha256 = `sha256:${'4'.repeat(64)}`; },
    (rows) => { rows[15].auditEnvelopeBase64 = Buffer.from('{}\n').toString('base64'); rows[15].auditEnvelopeByteLength = 3; rows[15].auditEnvelopeSha256 = sha256(Buffer.from('{}\n')); },
    (rows) => { rows[16].policyPass = false; rows[16].status = 'REFUSE'; },
    (rows) => { rows[17].status = 'PENDING_RITSU'; rows[17].pendingRitsu = true; },
  ];
  attacks.forEach((attack) => assert.throws(() => validatePromptedScreeningFinalTranscriptV7({ plan: run.plan, finalTranscriptBytes: mutateTranscript(attack), sources: run.sources }), /replay|exactly/u));
});

test('no-model simulation uses the production recorder path and remains non-admissible', () => {
  const result = runNoModelSimulationV7();
  assert.equal(result.simulationStatus, 'TEST_ONLY_NON_ADMISSIBLE');
  assert.equal(result.policyPass, true);
  assert.equal(result.productionFinalizationRefused, true);
  assert.equal(result.modelRunOccurred, false);
  assert.equal(result.sourceRevision, TEST_ONLY_SOURCE_REVISION_V7);
  assert.equal(result.ritsuDecisionCount, 0);
});

test('production-shaped exact Git path reaches pending Ritsu only with exact bound PASS payload', () => {
  const checkout = temporaryProductionCheckout();
  try {
    const sources = loadPromptedScreeningV7Sources(checkout.directory);
    assert.equal(resolveProductionSourceRevisionV7({ repoRoot: checkout.directory, expectedPublicCommit: checkout.revision, sources }), checkout.revision);
    const plan = buildProductionPreDispatchPlanV7({ repoRoot: checkout.directory, expectedPublicCommit: checkout.revision, sources });
    const prefixBytes = constructJudgmentPrefixV7({ plan, runId: 'unit-v7-production-shaped', receipts: receipts(plan, 'unit-v7-production'), operatorAttestation: { kind: 'operator-recorded-model-run', attestedBy: 'unit.synthetic-attester', modelRunOccurred: true, testOnly: false }, sources });
    const preparation = preparePromptedScreeningAuditV7({ plan, prefixBytes, taskId: 'unit-v7-production/process-audit', sources });
    const rawPayloadBytes = passPayload(preparation);
    const finalized = finalizeProductionPromptedScreeningV7({ plan, prefixBytes, auditTaskId: preparation.invocation.taskId, rawPayloadBytes, sources });
    assert.equal(finalized.result.status, 'PENDING_RITSU');
    assert.equal(finalized.result.pendingRitsu, true);
    assert.equal(finalized.result.admissionEligible, false);
    rmSync(join(checkout.directory, 'CODEX-SCREENING-PROMPT.v7.md'));
    assert.throws(() => resolveProductionSourceRevisionV7({ repoRoot: checkout.directory, expectedPublicCommit: checkout.revision, sources }), /tracked-clean/u);
  } finally { rmSync(checkout.parent, { recursive: true, force: true }); }
});

test('v6 evidence remains exact, nonconformant, decision-free, and rejected by v7', () => {
  const record = validateSyntheticPilotV6StopEvidence();
  assert.equal(record.status, 'NON_CONFORMANT');
  assert.equal(record.reason, 'AUDIT_OUTPUT_SCHEMA_REJECTED');
  assert.equal(record.ritsuDecisionCount, 0);
});

test('v7 schemas close every load-bearing root and event shape', () => {
  for (const path of ['schemas/prompted-screening-audit-findings.v1.schema.json', 'schemas/prompted-screening-audit-envelope.v1.schema.json']) assert.equal(JSON.parse(readFileSync(join(root, path))).additionalProperties, false);
  const findingsSchema = JSON.parse(readFileSync(join(root, 'schemas/prompted-screening-audit-findings.v1.schema.json')));
  assert.deepEqual(findingsSchema.$defs.materialFinding.properties.code.enum, ['COVERAGE_GAP', 'DECLARATION_DRIFT', 'SHARD_DRIFT', 'CROSS_STAGE_ASYMMETRY', 'UNEXPLAINED_SUSPICIOUS_AGREEMENT', 'PROCESS_DEFECT', 'OTHER_MATERIAL']);
  assert.deepEqual(findingsSchema.$defs.nonMaterialObservation.required, ['code', 'evidenceReferences']);
  assert.deepEqual(findingsSchema.$defs.nonMaterialObservation.properties.code.enum, ['EXPECTED_SYNTHETIC_AGREEMENT', 'KNOWN_CAPABILITY_BOUNDARY', 'KNOWN_AUDIT_INPUT_AMBIGUITY', 'KNOWN_AUDITOR_INABILITY']);
  assert.equal(findingsSchema.$defs.nonMaterialObservation.properties.summary, undefined);
  assert.deepEqual(findingsSchema.allOf.map((rule) => rule.if.properties.assessment.const), ['PASS', 'FAIL', 'REFUSE']);
  const finalSchema = JSON.parse(readFileSync(join(root, 'schemas/prompted-screening-final-transcript.v2.schema.json')));
  for (const key of ['auditDispatch', 'auditOutput', 'auditPolicy', 'terminal']) assert.equal(finalSchema.$defs[key].additionalProperties, false);
  assert.equal(finalSchema.minItems, 18);
  assert.equal(finalSchema.maxItems, 18);
  assert.equal(finalSchema.items, false);
});
