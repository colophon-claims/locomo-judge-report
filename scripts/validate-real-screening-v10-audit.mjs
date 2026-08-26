import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parsePromptedScreeningAuditFindingsV2 } from './validate-prompted-screening-audit-findings-v2.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const recordRoot = join(root, 'records', 'real-run-v10-audit-2026-08-26');
const sha256 = (bytes) => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
const invariant = (condition, message) => { if (!condition) throw new Error(`real screening v10 audit: ${message}`); };
const bytes = (name) => readFileSync(join(recordRoot, name));
const json = (name) => JSON.parse(bytes(name));
const exact = (name, expected) => invariant(sha256(bytes(name)) === expected, `${name} digest drift`);

exact('compact-process-audit-input.json', 'sha256:0c9aabdde110bf7facda82e345b44d3e31dfd9c71ffe610d58cbab764572894d');
exact('process-audit-dispatch.txt', 'sha256:a53e2618ccae1b074248fd55d5ded4137a5b5e16a3b334fa2a75ea66c2d4b11e');
exact('process-audit-preparation.json', 'sha256:dec9488d6a8d2e0b9e1571ac34a79845920a3fba2d9e4346078ea4713afc31cc');
invariant(bytes('compact-process-audit-input.json').equals(readFileSync(join(root, 'records', 'real-run-v9-2026-08-25', 'compact-process-audit-input.json'))), 'version 10 input is not byte-identical to version 9');

const binding = JSON.parse(readFileSync(join(root, 'commitments', 'locomo-evidence-rescreen-v10-audit-2026-08-26', 'prompt-binding.json')));
invariant(binding.status === 'COMMITTED_BEFORE_FRESH_V10_AUDIT_OUTPUT' && binding.taskId === 'codexcli/v10-process-audit' && binding.toolPolicy === 'none', 'public pre-output binding drift');
invariant(binding.auditInputSha256 === sha256(bytes('compact-process-audit-input.json')) && binding.dispatchSha256 === sha256(bytes('process-audit-dispatch.txt')), 'public pre-output binding does not name the prepared bytes');
invariant(binding.instructionSha256 === sha256(readFileSync(join(root, binding.instructionPath))) && binding.promptSha256 === sha256(readFileSync(join(root, binding.promptPath))) && binding.transportParserSha256 === sha256(readFileSync(join(root, binding.transportParserPath))), 'public pre-output source binding drift');
const preparation = json('process-audit-preparation.json');
invariant(preparation.status === 'PREPARED_NOT_RUN' && preparation.auditInvocationSha256 === 'sha256:478b8ea86ec1c29ef2143e3221f429a95e2ff20434d5149d582213d0febf73ed', 'version 10 preparation drift');

const outputPath = join(recordRoot, 'process-audit-output.json');
if (existsSync(outputPath)) {
  const output = bytes('process-audit-output.json');
  const parsed = parsePromptedScreeningAuditFindingsV2(output, { expectedAuditInvocationSha256: preparation.auditInvocationSha256 });
  invariant(parsed.assessment === 'PASS' && parsed.materialFindings.length === 0, 'fresh audit did not pass with zero material findings');
  const events = bytes('process-audit-events.jsonl').toString('utf8').trim().split('\n').map((line) => JSON.parse(line));
  const messages = events.filter((event) => event.type === 'item.completed' && event.item?.type === 'agent_message');
  invariant(messages.length === 1 && Buffer.from(messages[0].item.text).equals(output), 'fresh audit output is not bound to its exact event stream');
  invariant(events.every((event) => !['command_execution', 'mcp_tool_call', 'web_search'].includes(event.item?.type)), 'fresh audit used a tool');
  const terminal = json('process-audit-terminal.json');
  invariant(terminal.status === 'PASS_ZERO_MATERIAL_FINDINGS'
    && terminal.assessment === 'PASS'
    && terminal.materialFindingCount === 0
    && terminal.toolCallCount === 0
    && terminal.retryCount === 0
    && terminal.preOutputCommit === '91e2ad3bb1ef9694576d4bddff61bb467f538396'
    && terminal.outputSha256 === sha256(output)
    && terminal.eventsSha256 === sha256(bytes('process-audit-events.jsonl'))
    && terminal.stderrSha256 === sha256(bytes('process-audit-stderr.log'))
    && terminal.auditInputSha256 === sha256(bytes('compact-process-audit-input.json'))
    && terminal.auditDispatchSha256 === sha256(bytes('process-audit-dispatch.txt'))
    && terminal.auditInvocationSha256 === preparation.auditInvocationSha256, 'fresh audit terminal record drift');
  console.log('validated fresh version 10 process-audit PASS (not frozen)');
} else {
  console.log('validated public version 10 process-audit preparation (not run, not frozen)');
}
