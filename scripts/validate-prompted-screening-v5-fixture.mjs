import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  buildRealCapacityProbeV2,
  decodeBatchColumns,
  renderCompactProcessAuditInputV2,
  validateCompactProcessAuditInputV2,
} from './render-compact-process-audit-input-v2.mjs';
import { canonical, MAX_COMPACT_PROCESS_AUDIT_BYTES } from './render-compact-process-audit-input-v1.mjs';
import { APPROVED_PROMPTED_SCREENING_V5_SHA256 } from './approved-prompted-screening-v5-identities.mjs';

const fixturePath = new URL('../fixtures/prompted-screening-pilot-v5-compact-audit.json', import.meta.url);
const promptPath = new URL('../CODEX-SCREENING-PROMPT.v5.md', import.meta.url);
const schemaPath = new URL('../schemas/compact-process-audit-input.v2.schema.json', import.meta.url);
const rendererPath = new URL('./render-compact-process-audit-input-v2.mjs', import.meta.url);
const prefixPath = new URL('../records/synthetic-pilot-v4-2026-08-23/judgment-prefix.transcript.jsonl', import.meta.url);

const wrapperKeys = ['compactAuditInput', 'expectedExecution', 'provenance', 'schema', 'status'];
const expectedExecutionKeys = ['auditDispatchDeclaration', 'capacityHeadroomByteLength', 'maximumByteLength', 'modelRunOccurred', 'observableUsage', 'real664CapacityBatchCount', 'real664CapacityByteLength', 'renderedByteLength', 'renderedSha256'];
const auditDeclarationKeys = ['modelAlias', 'reasoning', 'toolPolicy'];
const provenanceKeys = ['compactAuditRendererV2Sha256', 'compactAuditSchemaV2Sha256', 'coordinatorPromptV5Sha256', 'derivedFromPreservedV4JudgmentPrefixSha256', 'newJudgmentOrAuditModelRunOccurred', 'sourceRevision'];

function fail(path, detail) {
  throw new Error(`${path}: ${detail}`);
}

function digest(bytes) {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

function hasExactKeys(value, keys) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).sort().join(',') === [...keys].sort().join(',');
}

function same(value, expected) {
  return canonical(value) === canonical(expected);
}

function validateApprovedSourceBytes(source) {
  const expected = APPROVED_PROMPTED_SCREENING_V5_SHA256;
  const identities = [
    ['promptBytes', source.promptBytes, expected.coordinatorPromptV5],
    ['schemaBytes', source.schemaBytes, expected.compactAuditSchemaV2],
    ['rendererBytes', source.rendererBytes, expected.compactAuditRendererV2],
    ['fixtureBytes', source.fixtureBytes, expected.compactAuditPilotV5Fixture],
  ];
  for (const [path, bytes, approved] of identities) {
    if (!Buffer.isBuffer(bytes) || digest(bytes) !== approved) fail(path, 'does not match its literal code-owned approved SHA-256 identity');
  }
}

export function validatePromptedScreeningV5Fixture(source) {
  validateApprovedSourceBytes(source);
  const fixture = JSON.parse(source.fixtureBytes.toString('utf8'));
  if (source.fixtureBytes.toString('utf8') !== `${JSON.stringify(fixture, null, 2)}\n`) fail('fixtureBytes', 'must be exact two-space JSON with one final LF');
  if (!hasExactKeys(fixture, wrapperKeys)
    || fixture.schema !== 'https://colophon-claims.github.io/locomo-judge-report/compact-process-audit-pilot-fixture/v5'
    || fixture.status !== 'synthetic-validation-only-no-model-run') fail('fixture', 'has an invalid closed no-run wrapper');
  if (!hasExactKeys(fixture.expectedExecution, expectedExecutionKeys)
    || !hasExactKeys(fixture.expectedExecution.auditDispatchDeclaration, auditDeclarationKeys)
    || !same(fixture.expectedExecution.auditDispatchDeclaration, { modelAlias: 'gpt-5.6-sol', reasoning: 'high', toolPolicy: 'none' })
    || fixture.expectedExecution.maximumByteLength !== MAX_COMPACT_PROCESS_AUDIT_BYTES
    || fixture.expectedExecution.modelRunOccurred !== false
    || fixture.expectedExecution.observableUsage !== null) fail('fixture.expectedExecution', 'must be the exact no-model Sol-high audit declaration');
  if (!hasExactKeys(fixture.provenance, provenanceKeys)
    || fixture.provenance.sourceRevision !== APPROVED_PROMPTED_SCREENING_V5_SHA256.sourceRevision
    || fixture.provenance.coordinatorPromptV5Sha256 !== APPROVED_PROMPTED_SCREENING_V5_SHA256.coordinatorPromptV5
    || fixture.provenance.compactAuditSchemaV2Sha256 !== APPROVED_PROMPTED_SCREENING_V5_SHA256.compactAuditSchemaV2
    || fixture.provenance.compactAuditRendererV2Sha256 !== APPROVED_PROMPTED_SCREENING_V5_SHA256.compactAuditRendererV2
    || fixture.provenance.derivedFromPreservedV4JudgmentPrefixSha256 !== 'sha256:db454100bc6bee6a740624583d6ea07c634c8711c8e49c840c23717d94e2478f'
    || fixture.provenance.newJudgmentOrAuditModelRunOccurred !== false) fail('fixture.provenance', 'does not bind exact source revision, source identities, prefix, and no-run status');
  validateCompactProcessAuditInputV2(fixture.compactAuditInput, { transcriptPrefixBytes: source.prefixBytes });
  const rendered = renderCompactProcessAuditInputV2(fixture.compactAuditInput, { transcriptPrefixBytes: source.prefixBytes });
  const capacity = renderCompactProcessAuditInputV2(buildRealCapacityProbeV2());
  if (fixture.expectedExecution.renderedByteLength !== rendered.length
    || fixture.expectedExecution.renderedSha256 !== digest(rendered)
    || fixture.expectedExecution.real664CapacityByteLength !== capacity.length
    || fixture.expectedExecution.real664CapacityBatchCount !== decodeBatchColumns(buildRealCapacityProbeV2().batches).length
    || fixture.expectedExecution.real664CapacityBatchCount !== 146
    || fixture.expectedExecution.capacityHeadroomByteLength !== MAX_COMPACT_PROCESS_AUDIT_BYTES - capacity.length
    || capacity.length > 60_000) fail('fixture.expectedExecution', 'does not bind exact rendered bytes and meaningful real-run capacity headroom');
  const batches = decodeBatchColumns(fixture.compactAuditInput.batches);
  if (batches[2].blindedItemsSha256 !== batches[5].blindedItemsSha256
    || batches[2].dispatchSha256 !== batches[5].dispatchSha256
    || batches[2].rawOutputSha256 !== batches[5].rawOutputSha256
    || batches[2].transcriptDispatchEventSha256 === batches[5].transcriptDispatchEventSha256
    || batches[2].transcriptOutputEventSha256 === batches[5].transcriptOutputEventSha256) fail('fixture.compactAuditInput.batches', 'must preserve permitted Terra-2/Sol-3 content equality and distinct recorded event identities');
  return fixture;
}

export function loadPromptedScreeningV5FixtureSource() {
  return {
    promptBytes: readFileSync(promptPath),
    schemaBytes: readFileSync(schemaPath),
    rendererBytes: readFileSync(rendererPath),
    fixtureBytes: readFileSync(fixturePath),
    prefixBytes: readFileSync(prefixPath),
  };
}

const fixture = validatePromptedScreeningV5Fixture(loadPromptedScreeningV5FixtureSource());

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  console.log(`validated exact no-model v5 fixture ${fixture.expectedExecution.renderedByteLength}/${fixture.expectedExecution.maximumByteLength} bytes and ${fixture.expectedExecution.real664CapacityByteLength}-byte 664/146 capacity probe`);
}
