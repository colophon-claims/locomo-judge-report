import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  MAX_COMPACT_PROCESS_AUDIT_BYTES,
  buildSyntheticCapacityProbe as buildV1CapacityProbe,
  canonical,
  sha256,
  validateCompactProcessAuditInput as validateV1Input,
} from './render-compact-process-audit-input-v1.mjs';

const promptPath = new URL('../CODEX-SCREENING-PROMPT.v5.md', import.meta.url);
const schemaPath = new URL('../schemas/compact-process-audit-input.v2.schema.json', import.meta.url);

export const COMPACT_PROCESS_AUDIT_PROTOCOL_V2 = 'prompted-codex-screening-compact-process-audit/v2';
export const COMPACT_PROCESS_AUDIT_SCHEMA_V2 = 'https://colophon-claims.github.io/locomo-judge-report/compact-process-audit-input/v2';

export const SYNTHETIC_SELECTION_BASIS = Object.freeze({
  kind: 'entire-fixed-synthetic-fixture-no-sampling',
  populationScope: 'exact-fixed-24-item-synthetic-fixture',
  populationItemCount: 24,
  dispatchedItemCountPerStage: 24,
  deterministicFixtureOrder: true,
  samplingPerformed: false,
});

export const REAL_SELECTION_BASIS = Object.freeze({
  kind: 'sealed-real-screening-pool-and-public-sample',
  populationScope: 'exact-sealed-664-item-screening-pool',
  populationItemCount: 664,
  dispatchedItemCountPerStage: 664,
  deterministicFixtureOrder: false,
  samplingPerformed: true,
});

export const DIGEST_SEMANTICS = Object.freeze({
  blindedItemsSha256: 'canonical ordered stage-agnostic blinded subset content; equal bytes may repeat',
  dispatchSha256: 'exact instruction plus the same blinded subset content; equal bytes may repeat across stages',
  rawOutputSha256: 'exact ordered raw output content; equal verdict bytes may repeat',
  transcriptDispatchEventSha256: 'exact sealed JSONL dispatch event with final LF; unique within the prefix',
  transcriptOutputEventSha256: 'exact sealed JSONL output event with final LF; unique within the prefix',
  contentDigestEqualityRule: 'content digest equality alone is not evidence of reuse',
  eventIdentityRule: 'distinct transcript event identities prove only recorded event separation, not provider or process freshness',
});

export const CAPABILITY_BOUNDARY = Object.freeze({
  providerExecution: 'not-machine-verified',
  providerProcessFreshness: 'not-machine-verified',
  modelRouting: 'not-machine-verified',
  invariantAliasWeights: 'not-machine-verified',
  promptCompliance: 'not-machine-verified',
  absenceOfBoundaryProofIsProcessDefect: false,
  materialProcessDefectRule: 'requires a contradiction in supplied sealed and machine-validated evidence',
  perfectAgreementRule: 'auditable non-material observation allowed for a deliberately clear synthetic fixture',
});

export const AUDIT_ACCEPTANCE_POLICY = Object.freeze({
  requiredAssessment: 'PASS',
  materialProcessDefectFlagCount: 0,
  qualifiedPassAccepted: false,
  ritsuApprovalStillRequired: true,
});

const rootKeys = [
  'aggregateTiming', 'aggregates', 'auditAcceptancePolicy', 'auditScope', 'batches',
  'capabilityBoundary', 'cells', 'declarations', 'digestSemantics', 'itemCount',
  'judgmentTranscriptPrefixSha256', 'protocol', 'publicArtifacts', 'schema',
  'selectionBasis', 'sourceKind',
];
const batchKeys = [
  'batchCount', 'batchOrdinal', 'blindedItemsSha256', 'correctCount',
  'dispatchDigestVerified', 'dispatchSha256', 'duplicateCount', 'extraCount',
  'infrastructureFailureCount', 'invalidCount', 'itemCount', 'machineValidationErrors',
  'missingCount', 'outputDigestVerified', 'rawOutputRecordCount', 'rawOutputSha256',
  'retryCount', 'routedVerdictCount', 'stage', 'summaryCountsVerified', 'toolCallCount',
  'transcriptDispatchEventSha256', 'transcriptOutputEventSha256', 'unsureCount',
  'wrongCount',
];
const batchDigestKeys = [
  'blindedItemsSha256', 'dispatchSha256', 'rawOutputSha256',
  'transcriptDispatchEventSha256', 'transcriptOutputEventSha256',
];
const batchColumnKeys = [...batchKeys, 'alignment', 'rowCount', 'sha256ColumnEncoding'];
const BATCH_ALIGNMENT = 'named columns share zero-based batch index';
const BATCH_SHA256_COLUMN_ENCODING = 'base64url-no-pad SHA-256 digests concatenated as fixed 43-character chunks by batch index';
const digestPattern = /^sha256:[0-9a-f]{64}$/u;
const stageProfiles = Object.freeze([
  Object.freeze({ stage: 'Luna', modelAlias: 'gpt-5.6-luna', reasoning: 'medium', batchLimit: 32 }),
  Object.freeze({ stage: 'Terra', modelAlias: 'gpt-5.6-terra', reasoning: 'high', batchLimit: 16 }),
  Object.freeze({ stage: 'Sol', modelAlias: 'gpt-5.6-sol', reasoning: 'high', batchLimit: 8 }),
]);

function fail(path, detail) {
  throw new Error(`${path}: ${detail}`);
}

function exact(value, expected) {
  return canonical(value) === canonical(expected);
}

function hasExactKeys(value, keys) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).sort().join(',') === [...keys].sort().join(',');
}

function digest(value) {
  return typeof value === 'string' && digestPattern.test(value);
}

function exactBytes(actual, expected) {
  return Buffer.from(actual).equals(Buffer.from(expected));
}

function encodeLegacyBatch(batch) {
  return [
    batch.stage, batch.batchOrdinal, batch.batchCount, batch.itemCount,
    batch.blindedItemsSha256, batch.dispatchSha256, batch.rawOutputSha256,
    batch.rawOutputRecordCount, batch.routedVerdictCount, batch.correctCount,
    batch.wrongCount, batch.unsureCount, batch.invalidCount, batch.missingCount,
    batch.extraCount, batch.duplicateCount, batch.infrastructureFailureCount,
    batch.retryCount, batch.toolCallCount, batch.dispatchDigestVerified,
    batch.outputDigestVerified, batch.summaryCountsVerified, batch.machineValidationErrors,
  ];
}

function decodeLegacyBatch(row, events) {
  if (!Array.isArray(row) || row.length !== 23) fail('legacyBatch', 'must contain the exact version 1 positional row');
  return {
    stage: row[0],
    batchOrdinal: row[1],
    batchCount: row[2],
    itemCount: row[3],
    blindedItemsSha256: row[4],
    dispatchSha256: row[5],
    rawOutputSha256: row[6],
    transcriptDispatchEventSha256: events.transcriptDispatchEventSha256,
    transcriptOutputEventSha256: events.transcriptOutputEventSha256,
    rawOutputRecordCount: row[7],
    routedVerdictCount: row[8],
    correctCount: row[9],
    wrongCount: row[10],
    unsureCount: row[11],
    invalidCount: row[12],
    missingCount: row[13],
    extraCount: row[14],
    duplicateCount: row[15],
    infrastructureFailureCount: row[16],
    retryCount: row[17],
    toolCallCount: row[18],
    dispatchDigestVerified: row[19],
    outputDigestVerified: row[20],
    summaryCountsVerified: row[21],
    machineValidationErrors: row[22],
  };
}

export function encodeBatchColumns(batches) {
  if (!Array.isArray(batches)) fail('batches', 'must be an array before keyed column encoding');
  const result = {
    alignment: BATCH_ALIGNMENT,
    rowCount: batches.length,
    sha256ColumnEncoding: BATCH_SHA256_COLUMN_ENCODING,
  };
  for (const key of batchKeys) {
    if (batchDigestKeys.includes(key)) {
      if (batches.some((batch) => !digest(batch[key]))) fail(`batches.${key}`, 'must contain exact SHA-256 identities before encoding');
      result[key] = batches.map((batch) => Buffer.from(batch[key].slice('sha256:'.length), 'hex').toString('base64url')).join('');
    } else {
      result[key] = batches.map((batch) => structuredClone(batch[key]));
    }
  }
  return result;
}

export function decodeBatchColumns(value) {
  if (!hasExactKeys(value, batchColumnKeys)
    || value.alignment !== BATCH_ALIGNMENT
    || value.sha256ColumnEncoding !== BATCH_SHA256_COLUMN_ENCODING
    || !Number.isInteger(value.rowCount) || value.rowCount < 3 || value.rowCount > 146) fail('input.batches', 'must be the exact closed self-describing keyed column structure');
  for (const key of batchKeys.filter((candidate) => !batchDigestKeys.includes(candidate))) {
    if (!Array.isArray(value[key]) || value[key].length !== value.rowCount) fail(`input.batches.${key}`, 'must align exactly with rowCount');
  }
  for (const key of batchDigestKeys) {
    if (typeof value[key] !== 'string'
      || value[key].length !== value.rowCount * 43
      || !/^[A-Za-z0-9_-]+$/u.test(value[key])) fail(`input.batches.${key}`, 'must concatenate one base64url-no-pad 32-byte SHA-256 digest per batch');
  }
  return Array.from({ length: value.rowCount }, (_, index) => Object.fromEntries(batchKeys.map((key) => [
    key,
    batchDigestKeys.includes(key)
      ? `sha256:${Buffer.from(value[key].slice(index * 43, (index + 1) * 43), 'base64url').toString('hex')}`
      : structuredClone(value[key][index]),
  ])));
}

function toV1Input(value) {
  return {
    schema: 'https://colophon-claims.github.io/locomo-judge-report/compact-process-audit-input/v1',
    protocol: 'prompted-codex-screening-compact-process-audit/v1',
    sourceKind: value.sourceKind,
    publicArtifacts: structuredClone(value.publicArtifacts),
    declarations: structuredClone(value.declarations),
    auditScope: structuredClone(value.auditScope),
    itemCount: value.itemCount,
    judgmentTranscriptPrefixSha256: value.judgmentTranscriptPrefixSha256,
    batches: decodeBatchColumns(value.batches).map(encodeLegacyBatch),
    aggregates: structuredClone(value.aggregates),
    cells: structuredClone(value.cells),
    aggregateTiming: value.aggregateTiming,
  };
}

function eventDigestsFromPrefix(prefixBytes) {
  const bytes = Buffer.from(prefixBytes);
  const text = bytes.toString('utf8');
  if (!text.endsWith('\n') || text.includes('\r')) fail('transcriptPrefixBytes', 'must be LF-terminated JSONL');
  const rawLines = text.slice(0, -1).split('\n');
  if (rawLines.length !== 14) fail('transcriptPrefixBytes', 'must contain exactly fourteen sealed judgment-prefix events');
  const records = rawLines.map((line, index) => {
    try {
      return JSON.parse(line);
    } catch {
      fail(`transcriptPrefixBytes[${index}]`, 'must be JSON');
    }
  });
  if (records[0]?.event !== 'run-declaration' || records[1]?.event !== 'preflight') fail('transcriptPrefixBytes', 'must start with the exact declaration and preflight event kinds');
  const pairs = [];
  for (let index = 0; index < 6; index += 1) {
    const dispatchIndex = 2 + (index * 2);
    const outputIndex = dispatchIndex + 1;
    pairs.push({
      dispatch: records[dispatchIndex],
      output: records[outputIndex],
      transcriptDispatchEventSha256: sha256(Buffer.from(`${rawLines[dispatchIndex]}\n`, 'utf8')),
      transcriptOutputEventSha256: sha256(Buffer.from(`${rawLines[outputIndex]}\n`, 'utf8')),
    });
  }
  return { records, pairs };
}

export function validateTranscriptPrefixForCompactInput(value, prefixBytes) {
  const bytes = Buffer.from(prefixBytes);
  if (sha256(bytes) !== value.judgmentTranscriptPrefixSha256) fail('transcriptPrefixBytes', 'does not match judgmentTranscriptPrefixSha256');
  const { pairs } = eventDigestsFromPrefix(bytes);
  const batches = decodeBatchColumns(value.batches);
  if (pairs.length !== batches.length) fail('transcriptPrefixBytes', 'batch event-pair count does not match compact batches');
  const taskNames = new Set();
  pairs.forEach(({ dispatch, output, transcriptDispatchEventSha256, transcriptOutputEventSha256 }, index) => {
    const batch = batches[index];
    const profile = stageProfiles.find((candidate) => candidate.stage === batch.stage);
    if (dispatch?.event !== 'judgment-dispatch' || output?.event !== 'judgment-output'
      || dispatch.taskName !== output.taskName || typeof dispatch.taskName !== 'string'
      || taskNames.has(dispatch.taskName)
      || dispatch.stage !== batch.stage || output.stage !== batch.stage
      || dispatch.modelAlias !== profile?.modelAlias || output.modelAlias !== profile?.modelAlias
      || dispatch.reasoning !== profile?.reasoning || output.reasoning !== profile?.reasoning
      || dispatch.batchOrdinal !== batch.batchOrdinal || output.batchOrdinal !== batch.batchOrdinal
      || dispatch.batchCount !== batch.batchCount || dispatch.itemCount !== batch.itemCount
      || dispatch.blindedItemsSha256 !== batch.blindedItemsSha256
      || dispatch.dispatchSha256 !== batch.dispatchSha256
      || output.rawOutputSha256 !== batch.rawOutputSha256) fail(`transcriptPrefixBytes.batch[${index}]`, 'does not bind one distinct declared task and exact dispatch/output content identities');
    taskNames.add(dispatch.taskName);
    if (batch.transcriptDispatchEventSha256 !== transcriptDispatchEventSha256
      || batch.transcriptOutputEventSha256 !== transcriptOutputEventSha256) fail(`input.batches[${index}]`, 'transcript event identity does not derive from the exact sealed prefix event bytes');
  });
  return true;
}

export function validateV5SourceShape({
  promptBytes = readFileSync(promptPath),
  schemaBytes = readFileSync(schemaPath),
} = {}) {
  for (const [path, bytes] of [['promptBytes', promptBytes], ['schemaBytes', schemaBytes]]) {
    const text = Buffer.from(bytes).toString('utf8');
    if (!text.endsWith('\n') || text.includes('\r') || text.includes(String.fromCodePoint(0x2014))) fail(path, 'must be LF-terminated UTF-8 without em dash');
  }
  const schema = JSON.parse(Buffer.from(schemaBytes).toString('utf8'));
  if (schema.$id !== COMPACT_PROCESS_AUDIT_SCHEMA_V2
    || schema['x-canonicalByteLimit'] !== MAX_COMPACT_PROCESS_AUDIT_BYTES
    || schema.additionalProperties !== false) fail('schemaBytes', 'does not declare the exact closed version 2 schema and byte cap');
  if (!Buffer.from(promptBytes).toString('utf8').startsWith('# Prompt-Driven Codex Screening Coordinator Prompt, version 5\n')) fail('promptBytes', 'does not declare coordinator prompt version 5');
  return true;
}

export function validateCompactProcessAuditInputV2(value, { transcriptPrefixBytes } = {}) {
  if (!hasExactKeys(value, rootKeys)
    || value.schema !== COMPACT_PROCESS_AUDIT_SCHEMA_V2
    || value.protocol !== COMPACT_PROCESS_AUDIT_PROTOCOL_V2) fail('input', 'has an invalid closed version 2 root shape');
  if (!exact(value.digestSemantics, DIGEST_SEMANTICS)) fail('input.digestSemantics', 'does not state the exact five digest labels and equality rules in-band');
  if (!exact(value.capabilityBoundary, CAPABILITY_BOUNDARY)) fail('input.capabilityBoundary', 'overclaims capability or weakens material-defect and agreement rules');
  if (!exact(value.auditAcceptancePolicy, AUDIT_ACCEPTANCE_POLICY)) fail('input.auditAcceptancePolicy', 'must require unqualified PASS and zero material process-defect flags');
  if (value.sourceKind === 'synthetic-pilot') {
    if (value.itemCount !== 24 || !exact(value.selectionBasis, SYNTHETIC_SELECTION_BASIS)
      || value.publicArtifacts?.samplingCommitmentSha256 !== null
      || value.publicArtifacts?.samplingScriptSha256 !== null) fail('input.selectionBasis', 'synthetic pilot must cover the exact full 24-item fixture in deterministic order with no sampling identities');
  } else if (value.sourceKind === 'real-screening') {
    if (value.itemCount !== 664 || !exact(value.selectionBasis, REAL_SELECTION_BASIS)
      || !digest(value.publicArtifacts?.samplingCommitmentSha256)
      || !digest(value.publicArtifacts?.samplingScriptSha256)) fail('input.selectionBasis', 'real screening must cover the exact 664-item pool and carry commitment and script identities');
  } else {
    fail('input.sourceKind', 'must be synthetic-pilot or real-screening');
  }
  const batches = decodeBatchColumns(value.batches);
  const eventIdentities = [];
  batches.forEach((batch, index) => {
    if (!digest(batch.transcriptDispatchEventSha256) || !digest(batch.transcriptOutputEventSha256)
      || batch.transcriptDispatchEventSha256 === batch.transcriptOutputEventSha256) fail(`input.batches[${index}]`, 'must carry distinct dispatch and output transcript event identities');
    eventIdentities.push(batch.transcriptDispatchEventSha256, batch.transcriptOutputEventSha256);
  });
  if (new Set(eventIdentities).size !== eventIdentities.length) fail('input.batches', 'transcript event identity is reused or duplicated across batches');
  validateV1Input(toV1Input(value));
  if (transcriptPrefixBytes !== undefined) validateTranscriptPrefixForCompactInput(value, transcriptPrefixBytes);
  return true;
}

export function renderCompactProcessAuditInputV2(value, options = {}) {
  validateV5SourceShape();
  validateCompactProcessAuditInputV2(value, options);
  const bytes = Buffer.from(`${canonical(value)}\n`, 'utf8');
  if (bytes.length > MAX_COMPACT_PROCESS_AUDIT_BYTES) fail('input', `canonical bytes exceed ${MAX_COMPACT_PROCESS_AUDIT_BYTES}`);
  return bytes;
}

export function validateRenderedCompactProcessAuditInputV2(value, candidateBytes, options = {}) {
  const expected = renderCompactProcessAuditInputV2(value, options);
  if (!exactBytes(candidateBytes, expected)) fail('candidateBytes', 'must be the exact canonical version 2 compact summary with one final LF and no prefix or suffix');
  return true;
}

function syntheticDigest(label) {
  return sha256(Buffer.from(`permanently-excluded-compact-v5:${label}`, 'utf8'));
}

export function upgradeV1CompactInput(value, { transcriptPrefixBytes, eventIdentities } = {}) {
  const derived = transcriptPrefixBytes === undefined ? undefined : eventDigestsFromPrefix(transcriptPrefixBytes).pairs;
  const events = eventIdentities ?? derived ?? value.batches.map((_, index) => ({
    transcriptDispatchEventSha256: syntheticDigest(`capacity:${index}:dispatch-event`),
    transcriptOutputEventSha256: syntheticDigest(`capacity:${index}:output-event`),
  }));
  if (!Array.isArray(events) || events.length !== value.batches.length) fail('eventIdentities', 'must carry one dispatch/output identity pair per batch');
  const result = {
    ...structuredClone(value),
    schema: COMPACT_PROCESS_AUDIT_SCHEMA_V2,
    protocol: COMPACT_PROCESS_AUDIT_PROTOCOL_V2,
    selectionBasis: value.sourceKind === 'synthetic-pilot' ? structuredClone(SYNTHETIC_SELECTION_BASIS) : structuredClone(REAL_SELECTION_BASIS),
    digestSemantics: structuredClone(DIGEST_SEMANTICS),
    capabilityBoundary: structuredClone(CAPABILITY_BOUNDARY),
    auditAcceptancePolicy: structuredClone(AUDIT_ACCEPTANCE_POLICY),
    batches: encodeBatchColumns(value.batches.map((batch, index) => decodeLegacyBatch(batch, events[index]))),
  };
  return result;
}

export function buildRealCapacityProbeV2() {
  const legacy = buildV1CapacityProbe(664);
  legacy.sourceKind = 'real-screening';
  legacy.publicArtifacts.samplingCommitmentSha256 = syntheticDigest('capacity:sampling-commitment');
  legacy.publicArtifacts.samplingScriptSha256 = syntheticDigest('capacity:sampling-script');
  return upgradeV1CompactInput(legacy);
}

validateV5SourceShape();

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const capacity = renderCompactProcessAuditInputV2(buildRealCapacityProbeV2());
  console.log(`validated compact process-audit v2 664-item capacity ${capacity.length}/${MAX_COMPACT_PROCESS_AUDIT_BYTES} bytes without a model run`);
}
