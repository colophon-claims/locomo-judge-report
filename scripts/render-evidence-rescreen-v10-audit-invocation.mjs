import { createHash } from 'node:crypto';

import {
  canonical,
  renderEvidenceRescreenV9CompactAuditInput,
} from './render-evidence-rescreen-v9-compact-audit-input.mjs';

const sha256 = (bytes) => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;

export function renderEvidenceRescreenV10AuditInvocation({ compactInput, auditInstruction }) {
  const compactInputBytes = renderEvidenceRescreenV9CompactAuditInput(compactInput);
  if (!Buffer.isBuffer(auditInstruction) || !auditInstruction.toString('utf8').endsWith('\n')) throw new Error('auditInstruction must be exact LF-terminated bytes');
  const invocation = {
    auditInputSha256: sha256(compactInputBytes),
    auditInstructionSha256: sha256(auditInstruction),
    modelAlias: 'gpt-5.6-sol',
    reasoning: 'high',
    runId: 'locomo-evidence-rescreen-v9-2026-08-24',
    taskId: 'codexcli/v10-process-audit',
    toolPolicy: 'none',
  };
  const auditInvocationSha256 = sha256(Buffer.from(canonical(invocation)));
  const dispatchBytes = Buffer.concat([auditInstruction, Buffer.from(`AUDIT INVOCATION SHA-256: ${auditInvocationSha256}\n`), compactInputBytes]);
  return { auditInvocationSha256, compactInputBytes, dispatchBytes, invocation };
}
