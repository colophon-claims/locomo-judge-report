import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { APPROVED_PROMPTED_SCREENING_V5_SHA256 } from './approved-prompted-screening-v5-identities.mjs';
import { canonical, MAX_COMPACT_PROCESS_AUDIT_BYTES, sha256 } from './render-compact-process-audit-input-v1.mjs';
import {
  deriveCompactProcessAuditInputV2,
  loadApprovedSyntheticAuditEvidenceV2,
  measureRealScreeningCapacityV2,
  renderCompactProcessAuditInputV2,
  validateCompactProcessAuditInputV2,
} from './render-compact-process-audit-input-v2.mjs';
import {
  evaluateAuditOutputPolicyV1,
  evaluateCompactProcessAuditAcceptanceV1,
  parseCompactProcessAuditOutputV1,
} from './validate-compact-process-audit-output-v1.mjs';

const fixturePath = new URL('../fixtures/prompted-screening-pilot-v5-compact-audit.json', import.meta.url);
const outputPath = new URL('../fixtures/prompted-screening-pilot-v5-no-run-audit-output.canonical.json', import.meta.url);
const wrapperKeys = ['compactAuditInput', 'expectedExecution', 'provenance', 'schema', 'status'];
const expectedKeys = ['auditDispatchDeclaration', 'capacityMeasurement', 'executableAcceptanceGate', 'maximumByteLength', 'modelRunOccurred', 'noRunAuditOutputSha256', 'noRunOutputPolicyPass', 'observableUsage', 'renderedByteLength', 'renderedSha256'];
const provenanceKeys = ['compactAuditRendererV2Sha256', 'compactAuditSchemaV2Sha256', 'coordinatorPromptV5Sha256', 'derivedFromPreservedV4JudgmentPrefixSha256', 'newJudgmentOrAuditModelRunOccurred', 'processAuditInstructionV1Sha256', 'processAuditOutputSchemaV1Sha256', 'sourceRevision'];

function fail(path, detail) { throw new Error(`${path}: ${detail}`); }
function exactKeys(value, keys) { return value !== null && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join(',') === [...keys].sort().join(','); }
function exact(value, expected) { return canonical(value) === canonical(expected); }

export function loadPromptedScreeningV5FixtureSource() {
  return { evidence: loadApprovedSyntheticAuditEvidenceV2(), fixtureBytes: readFileSync(fixturePath), outputBytes: readFileSync(outputPath) };
}

export function validatePromptedScreeningV5Fixture({ evidence, fixtureBytes, outputBytes }) {
  if (sha256(fixtureBytes) !== APPROVED_PROMPTED_SCREENING_V5_SHA256.compactAuditPilotV5Fixture) fail('fixtureBytes', 'does not match the literal approved fixture identity');
  if (sha256(outputBytes) !== APPROVED_PROMPTED_SCREENING_V5_SHA256.processAuditNoRunOutputFixtureV1) fail('outputBytes', 'does not match the literal approved output fixture identity');
  const raw = fixtureBytes.toString('utf8');
  const fixture = JSON.parse(raw);
  if (raw !== `${JSON.stringify(fixture, null, 2)}\n` || !exactKeys(fixture, wrapperKeys) || fixture.schema !== 'https://colophon-claims.github.io/locomo-judge-report/compact-process-audit-pilot-fixture/v5' || fixture.status !== 'synthetic-validation-only-no-model-run') fail('fixture', 'must be the exact closed deterministic no-run wrapper');
  const expectedInput = deriveCompactProcessAuditInputV2(evidence);
  validateCompactProcessAuditInputV2(fixture.compactAuditInput, evidence);
  if (!exact(fixture.compactAuditInput, expectedInput)) fail('fixture.compactAuditInput', 'does not derive exactly from authenticated evidence');
  const rendered = renderCompactProcessAuditInputV2(evidence);
  const capacity = measureRealScreeningCapacityV2();
  const expectedExecution = fixture.expectedExecution;
  if (!exactKeys(expectedExecution, expectedKeys) || !exact(expectedExecution.auditDispatchDeclaration, { modelAlias: 'gpt-5.6-sol', reasoning: 'high', toolPolicy: 'none' }) || expectedExecution.maximumByteLength !== MAX_COMPACT_PROCESS_AUDIT_BYTES || expectedExecution.modelRunOccurred !== false || expectedExecution.observableUsage !== null || expectedExecution.renderedByteLength !== rendered.length || expectedExecution.renderedSha256 !== sha256(rendered) || !exact(expectedExecution.capacityMeasurement, capacity) || capacity.measurementKind !== 'measurement-only-not-an-audit-input' || capacity.canValidateAsAuditInput !== false || capacity.byteLength > 60_000 || expectedExecution.noRunAuditOutputSha256 !== sha256(outputBytes) || expectedExecution.noRunOutputPolicyPass !== true || expectedExecution.executableAcceptanceGate !== 'refuses-validation-only-no-model-run') fail('fixture.expectedExecution', 'does not bind exact rendering, separate capacity measurement, or no-run gate behavior');
  if (!exactKeys(fixture.provenance, provenanceKeys) || fixture.provenance.sourceRevision !== APPROVED_PROMPTED_SCREENING_V5_SHA256.sourceRevision || fixture.provenance.coordinatorPromptV5Sha256 !== sha256(evidence.coordinatorPromptBytes) || fixture.provenance.compactAuditSchemaV2Sha256 !== sha256(evidence.compactSchemaBytes) || fixture.provenance.compactAuditRendererV2Sha256 !== sha256(evidence.compactRendererBytes) || fixture.provenance.processAuditInstructionV1Sha256 !== sha256(evidence.processAuditInstructionBytes) || fixture.provenance.processAuditOutputSchemaV1Sha256 !== sha256(evidence.processAuditOutputSchemaBytes) || fixture.provenance.derivedFromPreservedV4JudgmentPrefixSha256 !== sha256(evidence.transcriptPrefixBytes) || fixture.provenance.newJudgmentOrAuditModelRunOccurred !== false) fail('fixture.provenance', 'does not bind every exact source identity and no-run status');
  parseCompactProcessAuditOutputV1(outputBytes);
  if (!evaluateAuditOutputPolicyV1(outputBytes).policyPass) fail('outputBytes', 'must satisfy output policy');
  let refused = false;
  try { evaluateCompactProcessAuditAcceptanceV1({ evidence, outputBytes }); } catch (error) { refused = /validation-only no-model input/u.test(error.message); }
  if (!refused) fail('fixture.expectedExecution', 'executable gate must refuse validation-only no-model evidence');
  return fixture;
}

const fixture = validatePromptedScreeningV5Fixture(loadPromptedScreeningV5FixtureSource());
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  console.log(`validated exact v5 fixture ${fixture.expectedExecution.renderedByteLength} bytes and measurement-only ${fixture.expectedExecution.capacityMeasurement.byteLength}/${fixture.expectedExecution.maximumByteLength}`);
}
