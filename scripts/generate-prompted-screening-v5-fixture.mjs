import { readFileSync, writeFileSync } from 'node:fs';
import { canonical, sha256, MAX_COMPACT_PROCESS_AUDIT_BYTES } from './render-compact-process-audit-input-v1.mjs';
import {
  deriveCompactProcessAuditInputV2,
  loadApprovedSyntheticAuditEvidenceV2,
  measureRealScreeningCapacityV2,
  renderCompactProcessAuditInputV2,
} from './render-compact-process-audit-input-v2.mjs';
import { evaluateAuditOutputPolicyV1 } from './validate-compact-process-audit-output-v1.mjs';
import { APPROVED_PROMPTED_SCREENING_V5_SHA256 } from './approved-prompted-screening-v5-identities.mjs';

const fixturePath = new URL('../fixtures/prompted-screening-pilot-v5-compact-audit.json', import.meta.url);
const auditOutputPath = new URL('../fixtures/prompted-screening-pilot-v5-no-run-audit-output.canonical.json', import.meta.url);

const evidence = loadApprovedSyntheticAuditEvidenceV2();
const compactAuditInput = deriveCompactProcessAuditInputV2(evidence);
const rendered = renderCompactProcessAuditInputV2(evidence);
const capacity = measureRealScreeningCapacityV2();
const outputBytes = readFileSync(auditOutputPath);
const policy = evaluateAuditOutputPolicyV1(outputBytes);
const fixture = {
  schema: 'https://colophon-claims.github.io/locomo-judge-report/compact-process-audit-pilot-fixture/v5',
  status: 'synthetic-validation-only-no-model-run',
  compactAuditInput,
  expectedExecution: {
    auditDispatchDeclaration: { modelAlias: 'gpt-5.6-sol', reasoning: 'high', toolPolicy: 'none' },
    maximumByteLength: MAX_COMPACT_PROCESS_AUDIT_BYTES,
    modelRunOccurred: false,
    observableUsage: null,
    renderedByteLength: rendered.length,
    renderedSha256: sha256(rendered),
    capacityMeasurement: capacity,
    noRunAuditOutputSha256: sha256(outputBytes),
    noRunOutputPolicyPass: policy.policyPass,
    executableAcceptanceGate: 'refuses-validation-only-no-model-run',
  },
  provenance: {
    sourceRevision: APPROVED_PROMPTED_SCREENING_V5_SHA256.sourceRevision,
    coordinatorPromptV5Sha256: sha256(evidence.coordinatorPromptBytes),
    compactAuditSchemaV2Sha256: sha256(evidence.compactSchemaBytes),
    compactAuditRendererV2Sha256: sha256(evidence.compactRendererBytes),
    processAuditInstructionV1Sha256: sha256(evidence.processAuditInstructionBytes),
    processAuditOutputSchemaV1Sha256: sha256(evidence.processAuditOutputSchemaBytes),
    derivedFromPreservedV4JudgmentPrefixSha256: sha256(evidence.transcriptPrefixBytes),
    newJudgmentOrAuditModelRunOccurred: false,
  },
};

const bytes = Buffer.from(`${JSON.stringify(fixture, null, 2)}\n`);
writeFileSync(fixturePath, bytes);
console.log(`generated ${bytes.length}-byte v5 no-run fixture from exact evidence; compact ${rendered.length}; capacity ${capacity.byteLength}/${capacity.maximumByteLength}`);
