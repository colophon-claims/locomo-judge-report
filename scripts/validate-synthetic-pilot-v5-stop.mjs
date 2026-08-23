import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { canonical, sha256 } from './render-compact-process-audit-input-v1.mjs';
import { APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V5_STOP_SHA256 } from './approved-prompted-screening-v6-identities.mjs';

const directory = new URL('../records/synthetic-pilot-v5-2026-08-23/', import.meta.url);
const paths = Object.freeze({
  recordBytes: new URL('NON-CONFORMANT.json', directory),
  resultsBytes: new URL('pilot-results.pending-ritsu.json', directory),
  preDispatchLogBytes: new URL('pre-dispatch-log.jsonl', directory),
  preflightBytes: new URL('preflight.md', directory),
  processAuditBytes: new URL('process-audit.md', directory),
  ritsuReviewBytes: new URL('ritsu-review.md', directory),
  usageBytes: new URL('usage.md', directory),
  correctionBytes: new URL('append-only-correction.md', directory),
});

function fail(path, detail) { throw new Error(`${path}: ${detail}`); }
function exactKeys(value, keys) { return value !== null && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join(',') === [...keys].sort().join(','); }

export function loadSyntheticPilotV5StopEvidence() {
  return Object.fromEntries(Object.entries(paths).map(([key, path]) => [key, readFileSync(path)]));
}

export function validateSyntheticPilotV5StopEvidence(evidence) {
  const approved = APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V5_STOP_SHA256;
  const identities = {
    recordBytes: approved.record,
    resultsBytes: approved.results,
    preDispatchLogBytes: approved.preDispatchLog,
    preflightBytes: approved.preflight,
    processAuditBytes: approved.processAudit,
    ritsuReviewBytes: approved.ritsuReview,
    usageBytes: approved.usage,
    correctionBytes: approved.correction,
  };
  if (!exactKeys(evidence, Object.keys(paths))) fail('evidence', 'must contain every exact stopped-run artifact');
  for (const [key, identity] of Object.entries(identities)) if (!Buffer.isBuffer(evidence[key]) || sha256(evidence[key]) !== identity) fail(`evidence.${key}`, `must match literal approved ${identity}`);
  const recordRaw = evidence.recordBytes.toString('utf8');
  const resultsRaw = evidence.resultsBytes.toString('utf8');
  const record = JSON.parse(recordRaw);
  const results = JSON.parse(resultsRaw);
  if (recordRaw !== `${JSON.stringify(record, null, 2)}\n` || resultsRaw !== `${JSON.stringify(results, null, 2)}\n`) fail('evidence', 'record and results must retain exact two-space JSON bytes');
  if (record.status !== 'NON-CONFORMANT' || record.reason !== 'PUBLIC_V5_EXECUTABLE_BUILDER_REJECTS_FRESH_PREFIX' || record.source?.publicMain !== approved.publicMain || record.acceptanceCandidate !== false || record.approved !== false || record.accepted !== false || record.reusable !== false || record.admissionEligible !== false || record.realCandidateScreening !== false) fail('record', 'does not retain the exact nonconformant and non-acceptance status');
  const zeroExecution = record.execution;
  if (zeroExecution?.judgmentDispatchCount !== 0 || zeroExecution?.judgmentCount !== 0 || zeroExecution?.processAuditDispatchCount !== 0 || zeroExecution?.totalDispatchCount !== 0 || zeroExecution?.toolCallCount !== 0 || zeroExecution?.infrastructureFailureCount !== 0 || zeroExecution?.retryCount !== 0 || zeroExecution?.transcriptCreated !== false || zeroExecution?.judgmentPrefixCreated !== false || zeroExecution?.auditOutputCreated !== false || zeroExecution?.intendedComparisonPerformed !== false) fail('record.execution', 'must remain an exact zero-dispatch stop without transcript or audit');
  if (record.ritsu?.decisionCount !== 0 || record.ritsu?.pendingCount !== 24 || record.ritsu?.approval !== null || results.itemCount !== 24 || results.judgmentCount !== 0 || results.intendedComparisonPerformed !== false || results.ritsuDecisionCount !== 0 || results.ritsuPendingCount !== 24 || !Array.isArray(record.items) || !Array.isArray(results.items) || record.items.length !== 24 || canonical(record.items) !== canonical(results.items)) fail('record.items', 'must retain 24 identical pending rows and zero Ritsu decisions');
  for (const [index, row] of record.items.entries()) if (row.screeningVerdict !== null || row.terraEvidenceVerdict !== null || row.solEvidenceVerdict !== null || row.intendedComparisonPerformed !== false || row.ritsuDecision !== 'PENDING' || row.ritsuNotes !== null) fail(`record.items[${index}]`, 'must retain null judgments and a pending Ritsu decision');
  const lines = evidence.preDispatchLogBytes.toString('utf8').trimEnd().split('\n');
  if (!evidence.preDispatchLogBytes.toString('utf8').endsWith('\n') || lines.length !== 3 || lines.map((line) => JSON.parse(line).event).join(',') !== 'run-declaration,preflight,pre-dispatch-stop') fail('evidence.preDispatchLogBytes', 'must retain the exact closed three-event stop log');
  if (!evidence.correctionBytes.toString('utf8').includes(approved.independentReview.slice('sha256:'.length)) || !evidence.correctionBytes.toString('utf8').includes('stopped before the first dispatch')) fail('evidence.correctionBytes', 'must bind the independent review and truthful zero-dispatch correction');
  return record;
}

const record = validateSyntheticPilotV5StopEvidence(loadSyntheticPilotV5StopEvidence());
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) console.log(`validated immutable ${record.status} process-v5 zero-dispatch stop`);
