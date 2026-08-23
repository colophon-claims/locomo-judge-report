import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { canonical, sha256 } from './render-compact-process-audit-input-v1.mjs';
import { APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V6_SHA256 } from './approved-prompted-screening-v7-identities.mjs';
import { parsePromptedScreeningAuditFindingsV1 } from './validate-prompted-screening-audit-findings-v1.mjs';

const directory = new URL('../records/synthetic-pilot-v6-2026-08-23/', import.meta.url);
const paths = Object.freeze({
  record: new URL('NON-CONFORMANT.json', directory),
  results: new URL('pilot-results.pending-ritsu.json', directory),
  processAudit: new URL('process-audit.md', directory),
  rawAudit: new URL('raw/07-process-audit.json', directory),
  auditPreparation: new URL('recorder-state/08-audit-preparation.json', directory),
  prefix: new URL('recorder-state/07-judgment-prefix.jsonl', directory),
  transcript: new URL('transcript.jsonl', directory),
  ritsuReview: new URL('ritsu-review.md', directory),
  usage: new URL('usage.md', directory),
});

function fail(path, detail) { throw new Error(`${path}: ${detail}`); }
export function loadSyntheticPilotV6StopEvidence() { return Object.fromEntries(Object.entries(paths).map(([key, path]) => [key, readFileSync(path)])); }

export function validateSyntheticPilotV6StopEvidence(evidence = loadSyntheticPilotV6StopEvidence()) {
  const approved = APPROVED_IMMUTABLE_SYNTHETIC_PILOT_V6_SHA256;
  const identities = { record: approved.record, results: approved.results, processAudit: approved.processAudit, rawAudit: approved.rawAudit, auditPreparation: approved.auditPreparation, prefix: approved.prefix, transcript: approved.prefix, ritsuReview: approved.ritsuReview, usage: approved.usage };
  if (Object.keys(evidence).sort().join(',') !== Object.keys(paths).sort().join(',')) fail('evidence', 'must contain the exact closed v6 evidence set');
  for (const [key, digest] of Object.entries(identities)) if (!Buffer.isBuffer(evidence[key]) || sha256(evidence[key]) !== digest) fail(`evidence.${key}`, `must match literal approved ${digest}`);
  const record = JSON.parse(evidence.record);
  const results = JSON.parse(evidence.results);
  const preparation = JSON.parse(evidence.auditPreparation);
  const rawAudit = JSON.parse(evidence.rawAudit);
  if (evidence.record.toString('utf8') !== `${JSON.stringify(record, null, 2)}\n`) fail('record', 'must retain exact two-space JSON bytes');
  if (record.status !== 'NON_CONFORMANT' || record.reason !== 'AUDIT_OUTPUT_SCHEMA_REJECTED' || record.sourceRevision !== approved.publicMain || record.auditOutputRecorded !== false || record.finalTranscriptCreated !== false || record.ritsuDecisionCount !== 0 || record.accepted !== false || record.reusable !== false || record.admissionEligible !== false || record.realCandidateScreening !== false) fail('record', 'must remain nonconformant, unaccepted, and decision-free');
  if (results.status !== 'NON_CONFORMANT' || results.terminalReason !== 'AUDIT_OUTPUT_SCHEMA_REJECTED' || results.auditOutputRecorded !== false || results.finalTranscriptCreated !== false || results.ritsuDecisionCount !== 0 || results.admissionEligible !== false || results.counts?.judgmentCount !== 72 || results.counts?.auditDispatchCount !== 1 || results.items?.length !== 24 || results.items.some((row) => row.ritsuDecision !== 'PENDING')) fail('results', 'must retain exact stopped-run status, counts, and 24 pending decisions');
  if (preparation.invocation?.sourceRevision !== approved.publicMain || preparation.invocation?.taskId !== 'v6_process_audit' || preparation.invocation?.modelAlias !== 'gpt-5.6-sol' || preparation.invocation?.reasoning !== 'high' || preparation.invocation?.toolPolicy !== 'none') fail('auditPreparation', 'must retain the exact v6 recorder-owned invocation');
  if (rawAudit.assessment !== 'PASS' || rawAudit.invocation?.auditInputSha256 !== preparation.invocation.auditInputSha256 || rawAudit.materialProcessDefectFlags?.length !== 0) fail('rawAudit', 'must retain the exact rejected nested claimed PASS');
  try { parsePromptedScreeningAuditFindingsV1(evidence.rawAudit, { expectedAuditInvocationSha256: `sha256:${'0'.repeat(64)}` }); } catch { return record; }
  fail('rawAudit', 'the old nested v6 PASS must remain rejected by the v7 semantic payload parser');
}

const record = validateSyntheticPilotV6StopEvidence();
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) console.log(`validated immutable ${record.status} process-v6 audit-output stop`);
