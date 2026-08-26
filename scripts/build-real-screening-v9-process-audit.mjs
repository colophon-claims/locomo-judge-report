#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  canonical,
  renderEvidenceRescreenV9AuditInvocation,
} from './render-evidence-rescreen-v9-compact-audit-input.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const fail = (message) => { throw new Error(`build real screening v9 process audit: ${message}`); };
const json = (path) => JSON.parse(readFileSync(path, 'utf8'));
const sha256 = (bytes) => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
const verdictKeys = ['CORRECT', 'UNSURE', 'WRONG'];
const stages = ['Luna', 'Terra', 'Sol'];
const classes = ['correct', 'specific-wrong', 'vague-topical-wrong'];
const strata = ['category-1', 'category-2', 'category-3', 'category-4'];

function verdicts(rows, key = 'verdict') {
  return Object.fromEntries(verdictKeys.map((verdict) => [verdict, rows.filter((row) => row[key] === verdict).length]));
}

function effectiveResults(sourceRoot, stage) {
  const prefix = stage.toLowerCase();
  const directory = join(sourceRoot, 'execution', 'effective-results');
  return readdirSync(directory)
    .filter((name) => name.startsWith(`${prefix}-`) && name.endsWith('.json'))
    .sort()
    .map((name) => json(join(directory, name)));
}

function duplicateCount(ids) {
  return ids.length - new Set(ids).size;
}

function missingCount(expected, actual) {
  const actualSet = new Set(actual);
  return expected.filter((id) => !actualSet.has(id)).length;
}

export function buildRealScreeningV9CompactAuditInput(sourceRoot) {
  const binding = json(join(root, 'commitments', 'locomo-evidence-rescreen-2026-08-24', 'prompt-binding.json'));
  const table = json(join(sourceRoot, 'derived-v9-normalized', 'advisory-table.json'));
  const rows = table.advisoryRows;
  if (!Array.isArray(rows) || rows.length !== 664) fail('advisory table does not contain 664 rows');
  const v8Rows = json(join(root, 'records', 'real-run-v8-2026-08-24', 'operator-screening-table.json')).rows;
  const v8ById = new Map(v8Rows.map((row) => [row.opaqueItemId, row]));
  if (v8ById.size !== 664 || rows.some((row) => !v8ById.has(row.opaqueItemId))) fail('version 8 table does not map every opaque identity');
  const v8LunaVerdict = (row) => v8ById.get(row.opaqueItemId).lunaVerdict;
  const results = Object.fromEntries(stages.map((stage) => [stage, effectiveResults(sourceRoot, stage)]));
  const actualIds = Object.fromEntries(stages.map((stage) => [stage, results[stage].flatMap((batch) => batch.effectiveVerdicts.map((row) => row.itemId))]));
  const expectedIds = {
    Luna: rows.map((row) => row.opaqueItemId),
    Terra: rows.filter((row) => row.lunaVerdict === 'UNSURE' || row.lunaInvalid || row.lunaVerdict !== v8LunaVerdict(row) || row.lunaVerdict !== row.intendedLabel).map((row) => row.opaqueItemId),
    Sol: rows.filter((row) => row.terraVerdict !== null && (row.terraVerdict === 'UNSURE' || row.terraVerdict !== row.lunaVerdict)).map((row) => row.opaqueItemId),
  };
  for (const stage of stages) {
    if (duplicateCount(actualIds[stage]) !== 0 || missingCount(expectedIds[stage], actualIds[stage]) !== 0 || missingCount(actualIds[stage], expectedIds[stage]) !== 0) {
      fail(`${stage} effective results do not match the closed routing rule`);
    }
  }

  const batches = stages.flatMap((stage) => results[stage].map((batch) => ({
    batchOrdinal: batch.batchOrdinal,
    invalidOutputCount: batch.invalid ? 1 : 0,
    itemCount: batch.effectiveVerdicts.length,
    stage,
    verdicts: verdicts(batch.effectiveVerdicts),
  })));
  const coverage = Object.fromEntries(stages.map((stage) => {
    const flat = results[stage].flatMap((batch) => batch.effectiveVerdicts);
    return [stage, {
      batchCount: results[stage].length,
      duplicateItemCount: duplicateCount(actualIds[stage]),
      invalidOutputCount: results[stage].filter((batch) => batch.invalid).length,
      itemCount: flat.length,
      missingItemCount: missingCount(expectedIds[stage], actualIds[stage]),
      verdicts: verdicts(flat),
    }];
  }));

  const cells = classes.flatMap((candidateClass) => strata.map((stratum) => {
    const cell = rows.filter((row) => row.candidateClass === candidateClass && row.stratum === stratum);
    const terra = cell.filter((row) => row.terraVerdict !== null);
    const sol = cell.filter((row) => row.solVerdict !== null);
    return {
      advisoryDispositionDeltaCount: cell.filter((row) => (row.advisoryDisposition === 'excluded') !== (row.v8ScreeningDisposition === 'excluded')).length,
      advisoryVerdicts: verdicts(cell, 'advisoryVerdict'),
      candidateClass,
      lunaTerraDisagreements: terra.filter((row) => row.lunaVerdict !== row.terraVerdict).length,
      lunaVerdicts: verdicts(cell, 'lunaVerdict'),
      lunaVsIntendedDisagreements: cell.filter((row) => row.lunaVerdict !== row.intendedLabel).length,
      lunaVsV8Disagreements: cell.filter((row) => row.lunaVerdict !== v8LunaVerdict(row)).length,
      poolCount: cell.length,
      solRouted: sol.length,
      solVerdicts: verdicts(sol, 'solVerdict'),
      stratum,
      terraRouted: terra.length,
      terraVerdicts: verdicts(terra, 'terraVerdict'),
    };
  }));

  const eventsBytes = readFileSync(join(sourceRoot, 'execution', 'events.jsonl'));
  const events = eventsBytes.toString('utf8').trim().split('\n').map((line) => JSON.parse(line));
  if (events.length !== 49 || events.some((event) => event.type !== 'judgment-output-recorded')) fail('execution transcript is not 49 closed judgment events');
  const terraUnsureOrInvalid = rows.filter((row) => row.terraVerdict === 'UNSURE').length + results.Terra.filter((batch) => batch.invalid).length;
  const terraVsLunaDisagreement = rows.filter((row) => row.terraVerdict !== null && row.terraVerdict !== row.lunaVerdict).length;
  const compactInput = {
    batches,
    capabilityBoundary: {
      invariantWeightsVerified: false,
      promptComplianceVerified: false,
      providerExecutionVerified: false,
      providerFreshnessVerified: false,
    },
    cells,
    coverage,
    declarations: {
      evidencePayloadSha256: binding.evidencePayloadSha256,
      judgmentInstructionSha256: binding.judgmentInstructionSha256,
      poolDigest: 'sha256:34b8cbe099124eb6182e7e2d894381d75fba9fde1d8e54abd0c957b937c9aba6',
      profiles: [
        { alias: 'Luna', maxBatchSize: 32, model: 'gpt-5.6-luna', reasoningEffort: 'medium' },
        { alias: 'Terra', maxBatchSize: 16, model: 'gpt-5.6-terra', reasoningEffort: 'high' },
        { alias: 'Sol', maxBatchSize: 8, model: 'gpt-5.6-sol', reasoningEffort: 'high' },
      ],
      promptSha256: binding.promptSha256,
      toolPolicy: 'judgment-agents-none',
    },
    execution: {
      infrastructureFailureCount: 0,
      judgmentOutputEventCount: events.length,
      retryCount: 0,
      terminalStopCount: 0,
      toolCallCount: events.reduce((count, event) => count + event.facts.toolCallCount, 0),
      transcriptPrefixSha256: sha256(eventsBytes),
    },
    routing: {
      advisoryDeltaCount: rows.filter((row) => (row.advisoryDisposition === 'excluded') !== (row.v8ScreeningDisposition === 'excluded')).length,
      solExpectedUnionCount: expectedIds.Sol.length,
      solPlanCount: actualIds.Sol.length,
      solPlanMatchesRule: true,
      terraExpectedUnionCount: expectedIds.Terra.length,
      terraPlanCount: actualIds.Terra.length,
      terraPlanMatchesRule: true,
      terraUnsureOrInvalidCount: terraUnsureOrInvalid,
      terraVsLunaDisagreementCount: terraVsLunaDisagreement,
    },
    run: {
      itemCount: 664,
      runId: 'locomo-evidence-rescreen-v9-2026-08-24',
      status: 'JUDGMENTS_COMPLETE_PENDING_PROCESS_AUDIT',
    },
  };
  return { compactInput, sourceDigests: {
    advisoryTableSha256: sha256(readFileSync(join(sourceRoot, 'derived-v9-normalized', 'advisory-table.json'))),
    executionEventsSha256: sha256(eventsBytes),
  } };
}

export function writeRealScreeningV9AuditPreparation(sourceRoot, outputRoot) {
  const names = ['compact-process-audit-input.json', 'process-audit-dispatch.txt', 'process-audit-preparation.json'];
  if (names.some((name) => existsSync(join(outputRoot, name)))) fail('refusing to overwrite an existing audit preparation');
  const { compactInput, sourceDigests } = buildRealScreeningV9CompactAuditInput(sourceRoot);
  const prepared = renderEvidenceRescreenV9AuditInvocation({
    compactInput,
    auditInstruction: readFileSync(join(root, 'CODEX-SCREENING-AUDIT-INSTRUCTION.v3.txt')),
  });
  mkdirSync(outputRoot, { recursive: true });
  writeFileSync(join(outputRoot, names[0]), prepared.compactInputBytes);
  writeFileSync(join(outputRoot, names[1]), prepared.dispatchBytes);
  writeFileSync(join(outputRoot, names[2]), `${canonical({
    auditDispatchSha256: sha256(prepared.dispatchBytes),
    auditInvocationSha256: prepared.auditInvocationSha256,
    invocation: prepared.invocation,
    protocol: 'locomo-public-late-v9-process-audit-preparation/v1',
    sourceDigests,
    timingDisclosure: 'Prepared after Ritsu review because the registered process-audit gate was omitted from the original execution. The compact input is derived only from the sealed pre-human judgment state.',
  })}\n`);
  return prepared;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 4) fail('usage: node scripts/build-real-screening-v9-process-audit.mjs <source-v9-root> <output-root>');
  const prepared = writeRealScreeningV9AuditPreparation(resolve(process.argv[2]), resolve(process.argv[3]));
  console.log(`prepared ${prepared.auditInvocationSha256}`);
}
