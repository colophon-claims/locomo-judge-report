import { closeSync, mkdirSync, openSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonical, sha256 } from './render-compact-process-audit-input-v1.mjs';
import { buildProductionPreDispatchPlanV6, buildTestPreDispatchPlanV6, loadPromptedScreeningV6Sources, validatePreDispatchPlanV6 } from './plan-prompted-screening-v6.mjs';
import { constructJudgmentPrefixV6, parseJudgmentPrefixV6, validateRawJudgmentOutputV6 } from './build-prompted-screening-runtime-v6.mjs';
import { buildPromptedScreeningAuditOutputEventV6, buildPromptedScreeningFinalTranscriptV6, preparePromptedScreeningAuditV6, validatePromptedScreeningFinalTranscriptV6 } from './gate-prompted-screening-runtime-v6.mjs';

const INIT = '00-init.json';
const PREFIX = '07-judgment-prefix.jsonl';
const AUDIT_PREPARATION = '08-audit-preparation.json';
const AUDIT_OUTPUT = '09-audit-output.json';
const FINALIZATION = '10-finalization.json';
const initKeys = ['executionMode', 'owner', 'plan', 'schema'];
const pairKeys = ['batchOrdinal', 'index', 'infrastructureFailureCount', 'modelAlias', 'outputBase64', 'outputByteLength', 'outputSha256', 'owner', 'reasoning', 'retryCount', 'schema', 'stage', 'taskId', 'toolCallCount', 'toolPolicy'];
const preparationKeys = ['auditDispatchBase64', 'compactInputBase64', 'dispatchEventBase64', 'invocation', 'owner', 'schema'];
const auditOutputKeys = ['eventBase64', 'outputBase64', 'owner', 'schema'];
const finalizationKeys = ['finalTranscriptBase64', 'owner', 'result', 'schema'];

function fail(path, detail) { throw new Error(`${path}: ${detail}`); }
function exactKeys(value, keys) { return value !== null && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join(',') === [...keys].sort().join(','); }
function exact(value, expected) { return canonical(value) === canonical(expected); }
function pairName(index) { return `${String(index + 1).padStart(2, '0')}-judgment-pair.json`; }
function validateOwner(owner) { if (typeof owner !== 'string' || !/^[a-z0-9][a-z0-9._/-]{2,127}$/u.test(owner)) fail('owner', 'must be an opaque lowercase recorder identity'); return owner; }
function writeExact(path, bytes) { try { writeFileSync(path, bytes, { flag: 'wx' }); } catch (error) { fail('appendOnly', `${path} already exists or cannot be created: ${error.message}`); } }
function writeCanonical(path, value) { writeExact(path, Buffer.from(`${canonical(value)}\n`)); }
function readCanonical(path, keys) { const bytes = readFileSync(path); const raw = bytes.toString('utf8'); let value; try { value = JSON.parse(raw); } catch { fail(path, 'must be JSON'); } if (!Buffer.from(raw).equals(bytes) || raw !== `${canonical(value)}\n` || !exactKeys(value, keys)) fail(path, 'must be exact closed canonical JSON'); return value; }
function decodeExact(value, path) { if (typeof value !== 'string') fail(path, 'must be base64'); const bytes = Buffer.from(value, 'base64'); if (bytes.toString('base64') !== value) fail(path, 'must be canonical base64'); return bytes; }
function withLock(stateDir, operation) {
  const root = resolve(stateDir); try { mkdirSync(root); } catch (error) { if (error.code !== 'EEXIST') throw error; }
  const lock = join(root, '.one-writer-lock'); let descriptor; try { descriptor = openSync(lock, 'wx'); } catch { fail('oneWriter', 'state is already locked by another writer'); }
  try { return operation(root); } finally { closeSync(descriptor); unlinkSync(lock); }
}
function parseArgs(args) {
  const out = { _: [] };
  for (let index = 0; index < args.length; index += 1) { const arg = args[index]; if (!arg.startsWith('--')) { out._.push(arg); continue; } if (index + 1 >= args.length) fail('usage', `${arg} requires a value`); out[arg.slice(2)] = args[index + 1]; index += 1; }
  return out;
}
function loadInit(root, owner, sources) {
  const value = readCanonical(join(root, INIT), initKeys); validateOwner(owner); if (value.owner !== owner) fail('owner', 'does not match the immutable state owner'); validatePreDispatchPlanV6(value.plan, { sources }); if (value.executionMode !== value.plan.executionMode) fail('state', 'execution mode does not match plan'); return value;
}
function loadPairs(root, init) {
  return init.plan.dispatches.map((dispatch, index) => {
    const value = readCanonical(join(root, pairName(index)), pairKeys); const outputBytes = decodeExact(value.outputBase64, `pair[${index}].outputBase64`);
    const expected = { schema: 'prompted-screening-recorder-judgment-pair/v1', owner: init.owner, index, stage: dispatch.stage, batchOrdinal: dispatch.batchOrdinal, taskId: value.taskId, modelAlias: dispatch.modelAlias, reasoning: dispatch.reasoning, toolPolicy: 'none', outputSha256: sha256(outputBytes), outputByteLength: outputBytes.length, outputBase64: value.outputBase64, infrastructureFailureCount: 0, retryCount: 0, toolCallCount: 0 };
    if (!exact(value, expected)) fail(`pair[${index}]`, 'does not match the exact append-only plan/output receipt'); return { ...value, outputBytes };
  });
}
function loadSealedJudgments(root, init, sources) {
  const pairs = loadPairs(root, init); const prefixBytes = readFileSync(join(root, PREFIX)); const replay = parseJudgmentPrefixV6({ plan: init.plan, prefixBytes, sources });
  const receipts = pairs.map((pair) => ({ taskId: pair.taskId, outputBytes: pair.outputBytes, infrastructureFailureCount: 0, retryCount: 0, toolCallCount: 0 }));
  const rebuilt = constructJudgmentPrefixV6({ plan: init.plan, runId: replay.runId, receipts, operatorAttestation: replay.operatorAttestation, sources }); if (!rebuilt.equals(prefixBytes)) fail('judgmentPrefix', 'does not replay the exact append-only judgment receipts');
  return prefixBytes;
}

export function initializePromptedScreeningRecorderV6({ stateDir, owner, testOnly = false, repoRoot, expectedPublicCommit } = {}) {
  validateOwner(owner); return withLock(stateDir, (root) => {
    const resolvedRepo = repoRoot ? resolve(repoRoot) : fileURLToPath(new URL('..', import.meta.url)); const sources = loadPromptedScreeningV6Sources(resolvedRepo);
    const plan = testOnly ? buildTestPreDispatchPlanV6({ sources }) : buildProductionPreDispatchPlanV6({ repoRoot: resolvedRepo, expectedPublicCommit, sources });
    const value = { schema: 'prompted-screening-recorder-init/v1', owner, executionMode: plan.executionMode, plan }; writeCanonical(join(root, INIT), value); return value;
  });
}

export function recordPromptedScreeningJudgmentV6({ stateDir, owner, stage, batchOrdinal, taskId, modelAlias, reasoning, toolPolicy, outputBytes, infrastructureFailureCount = 0, retryCount = 0, toolCallCount = 0, sources = loadPromptedScreeningV6Sources() }) {
  return withLock(stateDir, (root) => {
    const init = loadInit(root, owner, sources); let index = 0; while (index < 6) { try { readFileSync(join(root, pairName(index))); index += 1; } catch { break; } }
    if (index >= 6) fail('state', 'all six judgment pairs are already recorded'); const dispatch = init.plan.dispatches[index];
    const prior = Array.from({ length: index }, (_, priorIndex) => readCanonical(join(root, pairName(priorIndex)), pairKeys));
    if (stage !== dispatch.stage || Number(batchOrdinal) !== dispatch.batchOrdinal || modelAlias !== dispatch.modelAlias || reasoning !== dispatch.reasoning || toolPolicy !== 'none' || !Buffer.isBuffer(outputBytes) || typeof taskId !== 'string' || !/^[a-z0-9][a-z0-9/_-]{7,191}$/u.test(taskId) || prior.some((row) => row.taskId === taskId) || infrastructureFailureCount !== 0 || retryCount !== 0 || toolCallCount !== 0) fail('judgmentReceipt', 'does not match the exact next stage, batch, task, profile, tool, failure, or retry declaration');
    validateRawJudgmentOutputV6({ outputBytes, itemIds: dispatch.itemIds, path: 'judgmentReceipt.outputBytes' });
    const value = { schema: 'prompted-screening-recorder-judgment-pair/v1', owner, index, stage, batchOrdinal: dispatch.batchOrdinal, taskId, modelAlias, reasoning, toolPolicy, outputSha256: sha256(outputBytes), outputByteLength: outputBytes.length, outputBase64: outputBytes.toString('base64'), infrastructureFailureCount: 0, retryCount: 0, toolCallCount: 0 };
    writeCanonical(join(root, pairName(index)), value); return value;
  });
}

export function sealPromptedScreeningJudgmentsV6({ stateDir, owner, runId, attestedBy, sources = loadPromptedScreeningV6Sources() }) {
  return withLock(stateDir, (root) => {
    const init = loadInit(root, owner, sources); const pairs = loadPairs(root, init); const operatorAttestation = init.executionMode === 'test-only-simulation' ? { kind: 'test-only-no-model', attestedBy: 'test-harness', modelRunOccurred: false, testOnly: true } : { kind: 'operator-recorded-model-run', attestedBy: validateOwner(attestedBy), modelRunOccurred: true, testOnly: false };
    const receipts = pairs.map((pair) => ({ taskId: pair.taskId, outputBytes: pair.outputBytes, infrastructureFailureCount: 0, retryCount: 0, toolCallCount: 0 })); const prefixBytes = constructJudgmentPrefixV6({ plan: init.plan, runId, receipts, operatorAttestation, sources }); writeExact(join(root, PREFIX), prefixBytes); return prefixBytes;
  });
}

export function preparePromptedScreeningRecorderAuditV6({ stateDir, owner, taskId, sources = loadPromptedScreeningV6Sources() }) {
  return withLock(stateDir, (root) => {
    const init = loadInit(root, owner, sources); const prefixBytes = loadSealedJudgments(root, init, sources); const prepared = preparePromptedScreeningAuditV6({ plan: init.plan, prefixBytes, taskId, sources });
    const value = { schema: 'prompted-screening-recorder-audit-preparation/v1', owner, invocation: prepared.invocation, compactInputBase64: prepared.compactInputBytes.toString('base64'), auditDispatchBase64: prepared.auditDispatchBytes.toString('base64'), dispatchEventBase64: prepared.dispatchEventBytes.toString('base64') }; writeCanonical(join(root, AUDIT_PREPARATION), value); return prepared;
  });
}

export function readPromptedScreeningAuditPreparationV6({ stateDir, owner, sources = loadPromptedScreeningV6Sources() }) {
  const root = resolve(stateDir); const init = loadInit(root, owner, sources); const prefixBytes = loadSealedJudgments(root, init, sources); const value = readCanonical(join(root, AUDIT_PREPARATION), preparationKeys); if (value.owner !== owner) fail('owner', 'does not match audit preparation'); const prepared = preparePromptedScreeningAuditV6({ plan: init.plan, prefixBytes, taskId: value.invocation.taskId, sources });
  if (!exact(value, { schema: 'prompted-screening-recorder-audit-preparation/v1', owner, invocation: prepared.invocation, compactInputBase64: prepared.compactInputBytes.toString('base64'), auditDispatchBase64: prepared.auditDispatchBytes.toString('base64'), dispatchEventBase64: prepared.dispatchEventBytes.toString('base64') })) fail('auditPreparation', 'does not replay exactly'); return { init, prefixBytes, prepared };
}

export function recordPromptedScreeningAuditOutputV6({ stateDir, owner, outputBytes, infrastructureFailureCount = 0, retryCount = 0, toolCallCount = 0, sources = loadPromptedScreeningV6Sources() }) {
  return withLock(stateDir, (root) => {
    const loaded = readPromptedScreeningAuditPreparationV6({ stateDir: root, owner, sources }); const built = buildPromptedScreeningAuditOutputEventV6({ preparation: loaded.prepared, outputBytes, infrastructureFailureCount, retryCount, toolCallCount }); const value = { schema: 'prompted-screening-recorder-audit-output/v1', owner, outputBase64: outputBytes.toString('base64'), eventBase64: built.eventBytes.toString('base64') }; writeCanonical(join(root, AUDIT_OUTPUT), value); return built;
  });
}

export function finalizePromptedScreeningRecorderV6({ stateDir, owner, sources = loadPromptedScreeningV6Sources() }) {
  return withLock(stateDir, (root) => {
    const loaded = readPromptedScreeningAuditPreparationV6({ stateDir: root, owner, sources }); const audit = readCanonical(join(root, AUDIT_OUTPUT), auditOutputKeys); if (audit.owner !== owner) fail('owner', 'does not match audit output'); const outputBytes = decodeExact(audit.outputBase64, 'auditOutput.outputBase64'); const built = buildPromptedScreeningFinalTranscriptV6({ plan: loaded.init.plan, prefixBytes: loaded.prefixBytes, auditTaskId: loaded.prepared.invocation.taskId, outputBytes, sources });
    const expectedEvent = buildPromptedScreeningAuditOutputEventV6({ preparation: loaded.prepared, outputBytes }).eventBytes.toString('base64'); if (audit.eventBase64 !== expectedEvent) fail('auditOutput', 'stored event does not replay exactly');
    const replayedResult = validatePromptedScreeningFinalTranscriptV6({ plan: loaded.init.plan, finalTranscriptBytes: built.finalTranscriptBytes, sources }); if (!exact(replayedResult, built.result)) fail('finalTranscript', 'constructed result does not match whole-transcript replay');
    const value = { schema: 'prompted-screening-recorder-finalization/v1', owner, result: replayedResult, finalTranscriptBase64: built.finalTranscriptBytes.toString('base64') }; writeCanonical(join(root, FINALIZATION), value); return built;
  });
}

export function validatePromptedScreeningRecorderFinalizationV6({ stateDir, owner, sources = loadPromptedScreeningV6Sources() }) {
  const root = resolve(stateDir); const init = loadInit(root, owner, sources); const value = readCanonical(join(root, FINALIZATION), finalizationKeys); if (value.owner !== owner) fail('owner', 'does not match finalization'); const bytes = decodeExact(value.finalTranscriptBase64, 'finalization.finalTranscriptBase64'); const result = validatePromptedScreeningFinalTranscriptV6({ plan: init.plan, finalTranscriptBytes: bytes, sources }); if (!exact(value.result, result)) fail('finalization', 'stored result does not match full transcript replay'); return result;
}

function cli() {
  const [command, ...rest] = process.argv.slice(2); const args = parseArgs(rest); if (!command || !args.state || !args.owner) fail('usage', 'command requires --state and --owner'); let value;
  if (command === 'init') value = initializePromptedScreeningRecorderV6({ stateDir: args.state, owner: args.owner, testOnly: args.mode === 'test-only', repoRoot: args.repo, expectedPublicCommit: args['expected-public-commit'] });
  else if (command === 'record-judgment') value = recordPromptedScreeningJudgmentV6({ stateDir: args.state, owner: args.owner, stage: args.stage, batchOrdinal: args.batch, taskId: args.task, modelAlias: args.model, reasoning: args.reasoning, toolPolicy: args.tools, outputBytes: readFileSync(args.output), infrastructureFailureCount: Number(args.failures), retryCount: Number(args.retries), toolCallCount: Number(args['tool-calls']) });
  else if (command === 'seal-judgments') value = { prefixSha256: sha256(sealPromptedScreeningJudgmentsV6({ stateDir: args.state, owner: args.owner, runId: args['run-id'], attestedBy: args['attested-by'] })) };
  else if (command === 'prepare-audit') { const prepared = preparePromptedScreeningRecorderAuditV6({ stateDir: args.state, owner: args.owner, taskId: args.task }); value = { auditDispatchSha256: sha256(prepared.auditDispatchBytes), auditInputSha256: sha256(prepared.compactInputBytes), invocation: prepared.invocation }; }
  else if (command === 'record-audit') value = recordPromptedScreeningAuditOutputV6({ stateDir: args.state, owner: args.owner, outputBytes: readFileSync(args.output), infrastructureFailureCount: Number(args.failures), retryCount: Number(args.retries), toolCallCount: Number(args['tool-calls']) }).event;
  else if (command === 'finalize') { const built = finalizePromptedScreeningRecorderV6({ stateDir: args.state, owner: args.owner }); value = built.result; process.stdout.write(`${canonical(value)}\n`); if (built.result.status !== 'PENDING_RITSU') process.exitCode = 2; return; }
  else if (command === 'validate-final') value = validatePromptedScreeningRecorderFinalizationV6({ stateDir: args.state, owner: args.owner });
  else if (command === 'export') {
    const root = resolve(args.state); const init = loadInit(root, args.owner, loadPromptedScreeningV6Sources());
    if (args.artifact === 'plan') process.stdout.write(Buffer.from(`${canonical(init.plan)}\n`));
    else if (args.artifact === 'prefix') process.stdout.write(readFileSync(join(root, PREFIX)));
    else if (args.artifact === 'audit-dispatch') process.stdout.write(decodeExact(readCanonical(join(root, AUDIT_PREPARATION), preparationKeys).auditDispatchBase64, 'auditPreparation.auditDispatchBase64'));
    else if (args.artifact === 'final-transcript') process.stdout.write(decodeExact(readCanonical(join(root, FINALIZATION), finalizationKeys).finalTranscriptBase64, 'finalization.finalTranscriptBase64'));
    else fail('usage', 'unknown export artifact'); return;
  }
  else fail('usage', 'unknown recorder command'); process.stdout.write(`${canonical(value)}\n`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) cli();
