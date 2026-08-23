import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonical, sha256 } from './render-compact-process-audit-input-v1.mjs';
import { APPROVED_PROMPTED_SCREENING_V7_SHA256 } from './approved-prompted-screening-v7-identities.mjs';
import { readPromptedScreeningAuditPreparationV7 } from './record-prompted-screening-v7.mjs';
import { renderTestAuditFindingsV1 } from './validate-prompted-screening-audit-findings-v1.mjs';

const recorderPath = fileURLToPath(new URL('./record-prompted-screening-v7.mjs', import.meta.url));
const outputsPath = new URL('../fixtures/prompted-screening-runtime-v6-simulation-outputs.canonical.json', import.meta.url);
const prefixPath = new URL('../fixtures/prompted-screening-runtime-v7-simulation-prefix.jsonl', import.meta.url);
const owner = 'test-harness-v7';

function fail(path, detail) { throw new Error(`${path}: ${detail}`); }
function run(args) { return execFileSync(process.execPath, [recorderPath, ...args], { encoding: 'utf8' }); }
function approvedIdentity(key) { const value = APPROVED_PROMPTED_SCREENING_V7_SHA256[key]; if (typeof value !== 'string' || !/^sha256:[0-9a-f]{64}$/u.test(value)) fail('approvedIdentities', `missing ${key}`); return value; }

export function runNoModelSimulationV7() {
  const root = mkdtempSync(join(tmpdir(), 'colophon-v7-test-only-')); const state = join(root, 'state');
  try {
    const outputFixtureBytes = readFileSync(outputsPath); if (sha256(outputFixtureBytes) !== approvedIdentity('simulationOutputsV1')) fail('simulationOutputs', 'identity mismatch');
    const outputFixture = JSON.parse(outputFixtureBytes); if (outputFixture.status !== 'test-only-no-model-run' || outputFixture.modelRunOccurred !== false || outputFixture.outputs?.length !== 6) fail('simulationOutputs', 'must remain exact no-model evidence');
    run(['init', '--state', state, '--owner', owner, '--mode', 'test-only']);
    const plan = JSON.parse(run(['export', '--state', state, '--owner', owner, '--artifact', 'plan']));
    outputFixture.outputs.forEach((row, index) => {
      const dispatch = plan.dispatches[index]; const outputPath = join(root, `output-${index}.json`); const outputBytes = Buffer.from(row.rawOutputBase64, 'base64');
      if (outputBytes.toString('base64') !== row.rawOutputBase64 || sha256(outputBytes) !== row.rawOutputSha256) fail(`simulationOutputs[${index}]`, 'has invalid exact bytes'); writeFileSync(outputPath, outputBytes);
      run(['record-judgment', '--state', state, '--owner', owner, '--stage', dispatch.stage, '--batch', String(dispatch.batchOrdinal), '--task', `test-only-v7-cli/${dispatch.stage.toLowerCase()}-${dispatch.batchOrdinal}`, '--model', dispatch.modelAlias, '--reasoning', dispatch.reasoning, '--tools', 'none', '--output', outputPath, '--failures', '0', '--retries', '0', '--tool-calls', '0']);
    });
    run(['seal-judgments', '--state', state, '--owner', owner, '--run-id', 'test-only-v7-simulation-2026-08-23']);
    run(['prepare-audit', '--state', state, '--owner', owner, '--task', 'test-only-v7-cli/process-audit']);
    const loaded = readPromptedScreeningAuditPreparationV7({ stateDir: state, owner });
    const auditOutputBytes = renderTestAuditFindingsV1({ auditInvocationSha256: loaded.prepared.auditInvocationSha256, nonMaterialObservations: [{ code: 'EXPECTED_SYNTHETIC_AGREEMENT', evidenceReferences: ['/aggregates/agreements'] }] }); const auditOutputPath = join(root, 'audit-output.json'); writeFileSync(auditOutputPath, auditOutputBytes);
    run(['record-audit', '--state', state, '--owner', owner, '--output', auditOutputPath, '--failures', '0', '--retries', '0', '--tool-calls', '0']);
    const finalized = spawnSync(process.execPath, [recorderPath, 'finalize', '--state', state, '--owner', owner], { encoding: 'utf8' });
    if (finalized.status !== 2) fail('simulationFinalizer', `must refuse production finalization with status 2, got ${finalized.status}: ${finalized.stderr}`);
    const result = JSON.parse(finalized.stdout); if (result.status !== 'TEST_ONLY_NON_ADMISSIBLE' || result.pendingRitsu !== false || result.admissionEligible !== false) fail('simulationFinalizer', 'must terminate test-only and non-admissible');
    const validated = JSON.parse(run(['validate-final', '--state', state, '--owner', owner])); if (canonical(validated) !== canonical(result)) fail('simulationFinalizer', 'validator result mismatch');
    const prefixBytes = Buffer.from(run(['export', '--state', state, '--owner', owner, '--artifact', 'prefix'])); const committedPrefix = readFileSync(prefixPath);
    if (sha256(committedPrefix) !== approvedIdentity('simulationPrefixV1') || !committedPrefix.equals(prefixBytes)) fail('simulationPrefix', 'must match the exact recorder-CLI-produced test-only prefix');
    return Object.freeze({ simulationStatus: result.status, policyPass: result.policyPass, productionFinalizationRefused: true, modelRunOccurred: false, testOnly: true, admissionRecordCreated: false, ritsuDecisionCount: 0, sourceRevision: plan.sourceRevision, prefixSha256: sha256(prefixBytes), compactInputSha256: loaded.prepared.invocation.auditInputSha256, compactInputByteLength: loaded.prepared.compactInputBytes.length, auditDispatchSha256: sha256(loaded.prepared.auditDispatchBytes), finalTranscriptSha256: result.finalTranscriptSha256 });
  } finally { rmSync(root, { recursive: true, force: true }); }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) process.stdout.write(`${canonical(runNoModelSimulationV7())}\n`);
