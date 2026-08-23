import { canonical, sha256 } from './render-compact-process-audit-input-v1.mjs';
import { buildRuntimeCompactInputV6, renderRuntimeCompactInputV6 } from './build-prompted-screening-runtime-v6.mjs';
import { loadPromptedScreeningV6Sources } from './plan-prompted-screening-v6.mjs';
import {
  buildCompactProcessAuditEventV1,
  evaluateAuditOutputPolicyV1,
  parseCompactProcessAuditOutputV1,
  validateCompactProcessAuditOutputSourceBytesV1,
} from './validate-compact-process-audit-output-v1.mjs';

function fail(path, detail) { throw new Error(`${path}: ${detail}`); }

export function evaluatePromptedScreeningRuntimeV6({
  plan,
  prefixBytes,
  outputBytes,
  sources = loadPromptedScreeningV6Sources(),
}) {
  validateCompactProcessAuditOutputSourceBytesV1({
    instructionBytes: sources.auditInstructionBytes,
    schemaBytes: sources.auditOutputSchemaBytes,
    gateBytes: sources.auditOutputGateBytes,
  });
  const compactInput = buildRuntimeCompactInputV6({ plan, prefixBytes, sources });
  const compactInputBytes = renderRuntimeCompactInputV6({ plan, prefixBytes, sources });
  if (compactInput.executionKind !== 'recorded-model-run') fail('acceptance', 'requires an evidence-derived recorded-model-run');
  const output = parseCompactProcessAuditOutputV1(outputBytes);
  const policy = evaluateAuditOutputPolicyV1(outputBytes);
  if (!policy.policyPass || output.assessment !== 'PASS' || output.materialFindingCount !== 0) fail('acceptance', 'requires exact unqualified PASS with zero material findings');
  const auditDispatchBytes = Buffer.concat([sources.auditInstructionBytes, compactInputBytes]);
  const auditEvent = {
    event: 'compact-process-audit-output',
    protocol: 'prompted-codex-screening-runtime-gate/v1',
    executionKind: compactInput.executionKind,
    judgmentTranscriptPrefixSha256: compactInput.judgmentTranscriptPrefixSha256,
    auditInstructionSha256: sha256(sources.auditInstructionBytes),
    auditInputSha256: sha256(compactInputBytes),
    auditInputByteLength: compactInputBytes.length,
    auditDispatchSha256: sha256(auditDispatchBytes),
    auditDispatchByteLength: auditDispatchBytes.length,
    auditOutputSha256: sha256(outputBytes),
    auditOutputByteLength: outputBytes.length,
    assessment: output.assessment,
    materialFindingCount: output.materialFindingCount,
    status: 'PROCESS-AUDIT-PASS-PENDING-RITSU',
  };
  return Object.freeze({
    status: auditEvent.status,
    acceptedByProcessGate: true,
    ritsuApprovalStillRequired: true,
    admissionEligible: false,
    compactInput,
    compactInputBytes,
    auditDispatchBytes,
    auditEventBytes: Buffer.from(`${canonical(auditEvent)}\n`),
    legacyAuditEventBytes: buildCompactProcessAuditEventV1(compactInputBytes, outputBytes),
  });
}
