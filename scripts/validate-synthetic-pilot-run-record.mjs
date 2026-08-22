import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('..', import.meta.url);
const recordPath = new URL('../records/synthetic-pilot-2026-08-22/NON-CONFORMANT.json', import.meta.url);
const auditPath = new URL('../records/synthetic-pilot-2026-08-22/process-audit.md', import.meta.url);
const resultsPath = new URL('../records/synthetic-pilot-2026-08-22/pilot-results.pending-ritsu.json', import.meta.url);
const promptV1Path = new URL('../CODEX-SCREENING-PROMPT.v1.md', import.meta.url);
const validatorV1Path = new URL('./validate-prompted-screening-pilot.mjs', import.meta.url);
const fixturePath = new URL('../fixtures/prompted-screening-pilot-v1.json', import.meta.url);

const rootKeys = ['accepted', 'artifacts', 'defect', 'judgmentStages', 'permanentlyExcluded', 'procedureVersion', 'processAuditStage', 'publishedEvidence', 'realCandidateScreening', 'runId', 'schema', 'sourcePublicHead', 'status', 'summary', 'syntheticOnly'];
const defectKeys = ['detail', 'disposition', 'kind'];
const stageKeys = ['batchSizes', 'judgmentCount', 'modelAlias', 'reasoning', 'stage'];
const summaryKeys = ['errorCount', 'infrastructureFailureCount', 'itemCount', 'judgmentCount', 'judgmentDispatchCount', 'lunaIntendedLabelMatchCount', 'processAuditDispatchCount', 'retryCount', 'ritsuDecisionCount', 'threeModelAgreementCount', 'unsureCount'];
const artifactKeys = ['coordinatorPromptV1Sha256', 'dispatchedJudgmentSectionSha256', 'fixtureSha256', 'normativeJudgmentSectionSha256', 'orderedBlindedInputsSha256', 'procedureValidatorSha256', 'processAuditSha256', 'rawResultsSha256', 'rawTranscriptSha256'];
const evidenceKeys = ['processAuditPath', 'rawResultsPath', 'rawTranscriptIncluded', 'rawTranscriptOmissionReason'];
const resultsRootKeys = ['acceptanceDeclared', 'digests', 'intendedLabelDerivation', 'items', 'pilotAccepted', 'processConformance', 'publicRepoHead', 'schema', 'status', 'summary'];
const resultItemKeys = ['candidateClass', 'hasUnsure', 'intendedLabel', 'invalid', 'itemId', 'lunaIntendedLabelMismatch', 'lunaRawVerdict', 'modelDisagreement', 'permanentlyExcluded', 'ritsuDecision', 'screeningVerdict', 'solRawVerdict', 'stratum', 'terraRawVerdict', 'threeModelAgreement'];

function fail(path, detail) {
  throw new Error(`${path}: ${detail}`);
}

function hasExactKeys(value, keys) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).sort().join(',') === [...keys].sort().join(',');
}

function sha256(bytes) {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

function same(value, expected) {
  return JSON.stringify(value) === JSON.stringify(expected);
}

export function validateSyntheticPilotRunRecord(record, raw, evidence) {
  if (raw !== `${JSON.stringify(record, null, 2)}\n`) fail('record', 'must use deterministic two-space JSON');
  if (!hasExactKeys(record, rootKeys)) fail('record', 'has unexpected root properties');
  if (record.schema !== 'https://colophon-claims.github.io/locomo-judge-report/synthetic-pilot-run-record/v1'
    || record.runId !== 'prompted-screening-synthetic-pilot-2026-08-22'
    || record.status !== 'NON-CONFORMANT'
    || record.accepted !== false
    || record.syntheticOnly !== true
    || record.permanentlyExcluded !== true
    || record.realCandidateScreening !== false
    || record.sourcePublicHead !== '730bb9048f0d8bd8141a0ebd4cabbe425bcc1e84'
    || record.procedureVersion !== 'v1') fail('record', 'does not preserve the exact failed-run authority and status');

  if (!hasExactKeys(record.defect, defectKeys)
    || record.defect.kind !== 'exact-instruction-byte-omission'
    || record.defect.detail !== 'Every judgment dispatch omitted the opening and closing Markdown code-fence bytes around the normative example object.'
    || record.defect.disposition !== 'The valid model outputs were not rerun because retry is permitted only for infrastructure failure with no model output.') fail('record.defect', 'does not preserve the exact process defect and no-rerun disposition');

  const expectedStages = [
    { stage: 'Luna', modelAlias: 'gpt-5.6-luna', reasoning: 'medium', batchSizes: [24], judgmentCount: 24 },
    { stage: 'Terra', modelAlias: 'gpt-5.6-terra', reasoning: 'high', batchSizes: [16, 8], judgmentCount: 24 },
    { stage: 'Sol', modelAlias: 'gpt-5.6-sol', reasoning: 'high', batchSizes: [8, 8, 8], judgmentCount: 24 },
  ];
  if (!Array.isArray(record.judgmentStages) || record.judgmentStages.some((stage) => !hasExactKeys(stage, stageKeys)) || !same(record.judgmentStages, expectedStages)) fail('record.judgmentStages', 'does not preserve exact aliases, reasoning levels, batch order, and judgment counts');
  if (!same(record.processAuditStage, { modelAlias: 'gpt-5.6-sol', reasoning: 'high', dispatchCount: 1, itemJudgmentCount: 0, afterAllJudgmentOutputs: true })) fail('record.processAuditStage', 'does not preserve the separate post-output Sol high audit declaration');

  const expectedSummary = {
    itemCount: 24,
    judgmentCount: 72,
    judgmentDispatchCount: 6,
    processAuditDispatchCount: 1,
    threeModelAgreementCount: 24,
    lunaIntendedLabelMatchCount: 24,
    errorCount: 0,
    unsureCount: 0,
    infrastructureFailureCount: 0,
    retryCount: 0,
    ritsuDecisionCount: 0,
  };
  if (!hasExactKeys(record.summary, summaryKeys) || !same(record.summary, expectedSummary)) fail('record.summary', 'does not preserve exact failed-run totals');
  if (!hasExactKeys(record.artifacts, artifactKeys) || !hasExactKeys(record.publishedEvidence, evidenceKeys)) fail('record', 'has malformed artifact or evidence properties');
  if (record.publishedEvidence.processAuditPath !== 'records/synthetic-pilot-2026-08-22/process-audit.md'
    || record.publishedEvidence.rawResultsPath !== 'records/synthetic-pilot-2026-08-22/pilot-results.pending-ritsu.json'
    || record.publishedEvidence.rawTranscriptIncluded !== false
    || record.publishedEvidence.rawTranscriptOmissionReason !== 'The raw transcript contains an operator-local absolute filesystem path with a workstation username. Its exact digest is retained, but its bytes are not published.') fail('record.publishedEvidence', 'does not preserve the privacy-safe publication boundary');

  const promptText = Buffer.from(evidence.promptV1Bytes).toString('utf8');
  const judgmentStartMarker = '## Judgment instruction\n\n';
  const judgmentEndMarker = '\n\n## Tool prohibition';
  const start = promptText.indexOf(judgmentStartMarker);
  const end = promptText.indexOf(judgmentEndMarker);
  if (start === -1 || end === -1 || end <= start) fail('evidence.promptV1Bytes', 'cannot resolve the immutable v1 judgment section');
  const normativeSection = promptText.slice(start + judgmentStartMarker.length, end);
  const dispatchedSection = normativeSection.replace(/^```json\n|^```\n/gmu, '');
  const fixture = JSON.parse(Buffer.from(evidence.fixtureBytes).toString('utf8'));
  const orderedBlindedInputs = JSON.stringify(fixture.cases.map((pilotCase) => pilotCase.blindedInput));

  const expectedArtifacts = {
    coordinatorPromptV1Sha256: sha256(evidence.promptV1Bytes),
    procedureValidatorSha256: sha256(evidence.validatorV1Bytes),
    fixtureSha256: sha256(evidence.fixtureBytes),
    orderedBlindedInputsSha256: sha256(Buffer.from(orderedBlindedInputs, 'utf8')),
    normativeJudgmentSectionSha256: sha256(Buffer.from(normativeSection, 'utf8')),
    dispatchedJudgmentSectionSha256: sha256(Buffer.from(dispatchedSection, 'utf8')),
    processAuditSha256: sha256(evidence.auditBytes),
    rawResultsSha256: sha256(evidence.resultsBytes),
    rawTranscriptSha256: 'sha256:55792ab83caa3218605ce48b51d78a5920b919f9b991c8262fe54c94dbd28364',
  };
  if (!same(record.artifacts, expectedArtifacts)) fail('record.artifacts', 'does not match recomputed published artifacts or preserved transcript identity');

  const auditText = Buffer.from(evidence.auditBytes).toString('utf8');
  if (!auditText.includes('Overall outcome: **NON-CONFORMANT**.')
    || !auditText.includes('Both Markdown code fences around the example object were omitted from every dispatch')
    || !auditText.includes('24/24 items had three-model agreement.')
    || !auditText.includes('Zero Ritsu decisions recorded')) fail('evidence.auditBytes', 'does not carry the audited non-conformance and totals');

  const results = JSON.parse(Buffer.from(evidence.resultsBytes).toString('utf8'));
  const expectedResultsSummary = {
    itemCount: 24,
    lunaScreeningVerdictCounts: { CORRECT: 8, WRONG: 16, UNSURE: 0 },
    threeModelAgreementCount: 24,
    modelDisagreementCount: 0,
    lunaIntendedLabelMismatchCount: 0,
    unsureItemCount: 0,
    invalidOutputItemCount: 0,
    missingOutputCount: 0,
    extraOutputCount: 0,
    duplicateOutputCount: 0,
    infrastructureFailureCount: 0,
    retryCount: 0,
    ritsuDecisionCount: 0,
  };
  const expectedInternalDigests = {
    promptSha256: record.artifacts.coordinatorPromptV1Sha256.slice('sha256:'.length),
    procedureSourceSha256: record.artifacts.coordinatorPromptV1Sha256.slice('sha256:'.length),
    procedureValidatorSha256: record.artifacts.procedureValidatorSha256.slice('sha256:'.length),
    fixtureSha256: record.artifacts.fixtureSha256.slice('sha256:'.length),
    transcriptSha256: record.artifacts.rawTranscriptSha256.slice('sha256:'.length),
    orderedBlindedInputsSha256: record.artifacts.orderedBlindedInputsSha256.slice('sha256:'.length),
    normativeJudgmentSectionSha256: record.artifacts.normativeJudgmentSectionSha256.slice('sha256:'.length),
    dispatchedJudgmentSectionSha256: record.artifacts.dispatchedJudgmentSectionSha256.slice('sha256:'.length),
  };
  if (!hasExactKeys(results, resultsRootKeys)
    || results.schema !== 'local://colophon/prompted-screening-synthetic-pilot-results/v1'
    || results.status !== 'PENDING_RITSU_NON_CONFORMANT_PROCESS' || results.pilotAccepted !== false || results.acceptanceDeclared !== false
    || results.publicRepoHead !== '730bb9048f0d8bd8141a0ebd4cabbe425bcc1e84'
    || !same(results.digests, expectedInternalDigests)
    || !same(results.intendedLabelDerivation, { performedAfterAllBlindedOutputs: true, rule: 'candidateClass correct -> CORRECT; all fixture wrong classes -> WRONG' })
    || !hasExactKeys(results.processConformance, ['materialIssue', 'outcome']) || results.processConformance.outcome !== 'NON_CONFORMANT'
    || results.processConformance.materialIssue !== 'All judgment dispatches omitted the Markdown code-fence bytes around the normative example object; valid outputs were not rerun.'
    || !same(results.summary, expectedResultsSummary) || results.items?.length !== 24) fail('evidence.resultsBytes', 'does not preserve the raw non-conformant results root and exact zero-error summary');
  results.items.forEach((item, index) => {
    const fixtureCase = fixture.cases[index];
    const intendedLabel = fixtureCase.candidateClass === 'correct' ? 'CORRECT' : 'WRONG';
    if (!hasExactKeys(item, resultItemKeys) || !hasExactKeys(item.invalid, ['luna', 'sol', 'terra'])
      || item.itemId !== fixtureCase.pilotCaseId || item.candidateClass !== fixtureCase.candidateClass || item.stratum !== fixtureCase.stratum
      || item.permanentlyExcluded !== true || item.intendedLabel !== intendedLabel || item.lunaRawVerdict !== intendedLabel
      || item.screeningVerdict !== intendedLabel || item.terraRawVerdict !== intendedLabel || item.solRawVerdict !== intendedLabel
      || item.threeModelAgreement !== true || item.modelDisagreement !== false || item.lunaIntendedLabelMismatch !== false
      || item.hasUnsure !== false || item.invalid?.luna !== false || item.invalid?.terra !== false || item.invalid?.sol !== false
      || item.ritsuDecision !== null) fail(`evidence.resultsBytes.items[${index}]`, 'does not preserve the synthetic outcome or zero-decision boundary');
  });
}

export function loadSyntheticPilotRunEvidence() {
  return {
    promptV1Bytes: readFileSync(promptV1Path),
    validatorV1Bytes: readFileSync(validatorV1Path),
    fixtureBytes: readFileSync(fixturePath),
    auditBytes: readFileSync(auditPath),
    resultsBytes: readFileSync(resultsPath),
  };
}

const recordRaw = readFileSync(recordPath, 'utf8');
const record = JSON.parse(recordRaw);
validateSyntheticPilotRunRecord(record, recordRaw, loadSyntheticPilotRunEvidence());

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  console.log(`validated append-only ${record.status} synthetic run record from ${new URL('.', root).pathname}`);
}
