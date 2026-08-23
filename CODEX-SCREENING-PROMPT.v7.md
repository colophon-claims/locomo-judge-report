# Prompt-Driven Codex Screening Coordinator Prompt, version 7

## Status and succession

Version 7 is an append-only audit-interface amendment. Versions 1 through 6 and every recorded byte from their attempts remain immutable. The process-v6 pilot remains `NON_CONFORMANT / AUDIT_OUTPUT_SCHEMA_REJECTED`. Its six judgment dispatches are preserved as mechanically valid evidence, but its nested audit response was rejected and is not accepted, translated, repaired, or reusable. No Ritsu decision was recorded.

This document authorizes no model call, real screening, sampling commitment, seed, Ritsu decision, benchmark result, admission, reuse, or freeze. It specifies and exercises a recorder-owned audit envelope without models.

## Unchanged judgment path

The version 6 clean-Git planner, exact six judgment dispatches, closed fourteen-event judgment prefix, source-revision verification, operator attestation, model profiles, zero-tool policy, and exact mode rules remain load-bearing. Version 7 authenticates its own prompt, audit instruction, schemas, parser, planner, runtime builder, gate, recorder, and simulation by literal SHA-256 identities before parsing any run evidence.

The coordinator is `gpt-5.6-sol` high. Luna is `gpt-5.6-luna` medium with batches of at most 32. Terra is `gpt-5.6-terra` high with batches of at most 16. Sol is `gpt-5.6-sol` high with batches of at most 8. All judgment agents and the process auditor receive no tools. Luna remains load-bearing; Terra and Sol remain review evidence; only Ritsu may confirm or exclude.

## Recorder-owned audit invocation and envelope

The recorder, not Sol, constructs every run, plan, judgment-prefix, compact-input, instruction, source-revision, task, model, reasoning, tool-policy, execution-mode, and operator-attestation binding. It canonicalizes the closed invocation and computes one `auditInvocationSha256` over those exact invocation bytes.

Sol receives only the exact version 3 audit instruction, the one exact invocation digest line, and the exact compact input. The instruction is fully self-contained. It contains the complete closed semantic payload shape, all allowed values and consistency rules, and one exact fence-free valid example.

Sol returns only a canonical semantic payload containing:

- the version 1 payload schema and protocol;
- the exact `auditInvocationSha256`;
- `assessment`, exactly `PASS`, `FAIL`, or `REFUSE`;
- a closed `materialFindings` array;
- a closed `nonMaterialObservations` array.

Material findings alone use the closed anomaly vocabulary: `COVERAGE_GAP`, `DECLARATION_DRIFT`, `SHARD_DRIFT`, `CROSS_STAGE_ASYMMETRY`, `UNEXPLAINED_SUSPICIOUS_AGREEMENT`, `PROCESS_DEFECT`, and `OTHER_MATERIAL`. Each material finding contains one to five bounded JSON Pointer evidence references into the supplied compact input and one bounded single-line summary. `OTHER_MATERIAL` requires a meaningful summary.

Non-material observations use a separate closed vocabulary: `EXPECTED_SYNTHETIC_AGREEMENT`, `KNOWN_CAPABILITY_BOUNDARY`, `KNOWN_AUDIT_INPUT_AMBIGUITY`, and `KNOWN_AUDITOR_INABILITY`. Each observation contains only its code and one to five bounded evidence references. It has no summary, text, severity, escape code, or other free-form field. Neither array contains an item judgment or required-verification field.

`PASS` requires zero material findings and permits only expected-synthetic-agreement or known-capability-boundary observations. `FAIL` requires at least one material finding and permits the same two benign observations. `REFUSE` records inability or ambiguity, requires zero material findings, and requires one or more closed input-ambiguity or auditor-inability observations. Unknown codes, a code in the wrong array, duplicate entries, free-form observation text, extra keys, prose outside the object, Markdown, stale invocation digests, malformed bytes, or inconsistent assessment and arrays refuse.

The recorder preserves the exact raw payload bytes. It does not translate, repair, normalize, or fill a malformed response. After validation, it deterministically composes the full audit envelope from the recorder-owned invocation, fixed capability boundary, raw payload digest, and exact semantic arrays. It records both the raw payload and composed envelope bytes and digests in the append-only audit-output event. Finalization replays and recomputes every byte and gates only on the composed envelope.

## Authority and capability boundary

Deterministic code remains the authority for bindings, hashes, counts, routing, transcript integrity, coverage, and closed-shape validation. Sol is only a narrow semantic anomaly gate over the compact whole-run table. It may flag coverage patterns, declaration drift, shard drift, cross-stage asymmetry, suspicious agreement, or another concrete supplied-evidence process defect. It must not reperform item judgments.

The recorder does not claim to prove provider execution, provider freshness, independent generation, model routing, prompt compliance, or invariant weights behind mutable model identifiers. Absence of those proofs is not a process defect. Perfect agreement on the deliberately clear fixed synthetic fixture is non-material.

Malformed or missing audit bytes stop operationally. `PASS` with zero material findings permits a production-shaped transcript to reach `PENDING_RITSU`, never admission. `FAIL` or `REFUSE` produces `PROCESS_REFUSED`. Test-only execution always ends `TEST_ONLY_NON_ADMISSIBLE`, even with a valid `PASS`.

## Simulation and real-screening boundary

The no-model simulation drives the same version 7 production recorder path through plan initialization, six exact judgment receipts, prefix sealing, audit preparation, raw payload recording, deterministic envelope composition, finalization, and full replay. Test-only state remains non-admissible. A production-shaped test can reach `PENDING_RITSU` only with an exact bound semantic payload and a clean exact Git source revision.

Real 664-item screening remains blocked until its exact reviewed opaque identity map, non-grouped order, pool, sampling commitment, sampling script, and public source identities are registered. Nothing in this amendment is a real run, seed commitment, Software Heritage request, Ritsu decision, admission record, or freeze.
