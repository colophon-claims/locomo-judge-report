#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { canonical } from './render-evidence-rescreen-v9-compact-audit-input.mjs';
import { renderEvidenceRescreenV10AuditInvocation } from './render-evidence-rescreen-v10-audit-invocation.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const sha256 = (bytes) => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
const fail = (message) => { throw new Error(`build real screening v10 process audit: ${message}`); };

export function writeRealScreeningV10AuditPreparation(outputRoot) {
  const sourceInput = join(root, 'records', 'real-run-v9-2026-08-25', 'compact-process-audit-input.json');
  const names = ['compact-process-audit-input.json', 'process-audit-dispatch.txt', 'process-audit-preparation.json'];
  if (names.some((name) => existsSync(join(outputRoot, name)))) fail('refusing to overwrite an existing audit preparation');
  const compactInput = JSON.parse(readFileSync(sourceInput, 'utf8'));
  const prepared = renderEvidenceRescreenV10AuditInvocation({
    compactInput,
    auditInstruction: readFileSync(join(root, 'CODEX-SCREENING-AUDIT-INSTRUCTION.v4.txt')),
  });
  mkdirSync(outputRoot, { recursive: true });
  writeFileSync(join(outputRoot, names[0]), prepared.compactInputBytes);
  writeFileSync(join(outputRoot, names[1]), prepared.dispatchBytes);
  writeFileSync(join(outputRoot, names[2]), `${canonical({
    auditDispatchSha256: sha256(prepared.dispatchBytes),
    auditInvocationSha256: prepared.auditInvocationSha256,
    invocation: prepared.invocation,
    protocol: 'locomo-public-v10-process-audit-preparation/v1',
    sourceAuditInputSha256: sha256(readFileSync(sourceInput)),
    status: 'PREPARED_NOT_RUN',
  })}\n`);
  return prepared;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 3) fail('usage: node scripts/build-real-screening-v10-process-audit.mjs <output-root>');
  const prepared = writeRealScreeningV10AuditPreparation(resolve(process.argv[2]));
  console.log(`prepared ${prepared.auditInvocationSha256}`);
}
