# LoCoMo judge report registration

## SCREENING COMPLETE / NOT FROZEN

This public repository is the operator-owned registration record for a future
LoCoMo judge report. The 664-item prompted screen and the 220 required Ritsu
checks are complete, and Colophon has admitted the balanced 240-item bank. It
is not a benchmark freeze or benchmark result, and it authorizes no judge run.
The pre-outcome 664-identity commitment and deterministic 72-identity sample
remain under [`commitments/`](commitments/). The exact outcome evidence,
candidate item bytes, source rows, replacement lineage, final bank, and signed
Colophon admission records are under
[`records/real-run-v8-2026-08-24/`](records/real-run-v8-2026-08-24/).
No full conversation, credential, private note, or unrelated dataset byte is
published. Versioned Colophon-authored prompt and instruction bytes define the
procedure. Clearly named synthetic fixtures
and the preserved synthetic pilots are permanently ineligible for admission.
The first two pilots are non-conformant. The process-green third pilot is an
acceptance candidate but remains `NOT-APPROVED` because its raw-material audit
shape was rejected for excessive usage pending Ritsu. The fourth pilot remains
`NON-CONFORMANT / PROCESS_AUDIT_MATERIAL_FLAG`; the append-only amendment does
not change its returned audit. The fifth attempt is `NON-CONFORMANT /
PUBLIC_V5_EXECUTABLE_BUILDER_REJECTS_FRESH_PREFIX` and stopped before any
dispatch. The sixth pilot is `NON_CONFORMANT / AUDIT_OUTPUT_SCHEMA_REJECTED`:
its judgment dispatches were mechanically green, but its exact nested Sol
response did not match the underspecified version 2 audit-output shape. The
raw response remains rejected and no Ritsu decision was recorded. The clean
version 7 pilot is separately confirmed by Ritsu, but its synthetic cases are
permanently excluded and remain ineligible for admission. None of the synthetic
runs is a real-screening result or a freeze.

The sole repository operator is `ritsukai`. Published records follow the
append-only process in [CONTRIBUTING.md](CONTRIBUTING.md). The screening record
is complete and public; it is still not the benchmark freeze.

## Scope

- [source-register.json](source-register.json) is the canonical source register.
- [CODEX-SCREENING-PROMPT.v1.md](CODEX-SCREENING-PROMPT.v1.md) records the
  immutable procedure source used by the non-conformant pilot. Version 1 is
  superseded for future dispatches, not rewritten.
- [CODEX-SCREENING-PROMPT.v2.md](CODEX-SCREENING-PROMPT.v2.md) records the
  immutable procedure source used by the non-conformant 2026-08-23 synthetic
  pilot. Version 2 is superseded for future dispatches, not rewritten.
- [CODEX-SCREENING-PROMPT.v3.md](CODEX-SCREENING-PROMPT.v3.md) records the
  immutable procedure used by the process-green but not-approved third
  synthetic pilot. It introduced opaque judgment identities, non-grouped
  order, and mandatory byte-exact rendering.
- [CODEX-SCREENING-PROMPT.v4.md](CODEX-SCREENING-PROMPT.v4.md) records the
  immutable procedure used by the non-conformant fourth synthetic pilot. It
  retains the v3 judgment path and limits Sol process-audit input to a closed
  canonical summary no larger than 65,536 bytes.
- [CODEX-SCREENING-PROMPT.v5.md](CODEX-SCREENING-PROMPT.v5.md) records the
  normative future coordinator procedure. It names content and transcript
  event identities in-band, closes synthetic and real selection semantics, and
  retains the strict unqualified `PASS` with zero material flags gate. The
  audit cannot reperform item judgments or prove provider execution.
- [CODEX-SCREENING-JUDGMENT-INSTRUCTION.v1.txt](CODEX-SCREENING-JUDGMENT-INSTRUCTION.v1.txt)
  is the independent exact judgment-agent instruction used by coordinator
  prompt versions 2, 3, 4, 5, and 6.
- [fixtures/prompted-screening-pilot-v1.json](fixtures/prompted-screening-pilot-v1.json)
  contains only 24 synthetic, permanently excluded validation cases and no
  model output or operator decision.
- [fixtures/prompted-screening-pilot-v2.json](fixtures/prompted-screening-pilot-v2.json)
  preserves the same 24 synthetic cases while assigning fixed opaque judgment
  identities and a sealed non-grouped dispatch order. Outer metadata remains
  outside blinded dispatch bytes.
- [fixtures/prompted-screening-pilot-v4-compact-audit.json](fixtures/prompted-screening-pilot-v4-compact-audit.json)
  preserves the initial 8,235-byte compact process-audit fixture bound by the
  append-only third-pilot record.
- [fixtures/prompted-screening-pilot-v4-joint-compact-audit.json](fixtures/prompted-screening-pilot-v4-joint-compact-audit.json)
  is the immutable version 4 no-run fixture. Each ordered cell carries an exact 27-count
  Luna/Terra/Sol verdict contingency from which every marginal, agreement,
  pairwise disagreement, asymmetry, and all-different count is derived. It
  renders to 9,159 bytes; the synthetic 664-item capacity probe renders to
  48,766 bytes. Usage remains explicitly unmeasured and no model was run.
- [fixtures/prompted-screening-pilot-v5-compact-audit.json](fixtures/prompted-screening-pilot-v5-compact-audit.json)
  is the current no-run fixture. Its compact input renders to 11,825 bytes. The
  deterministic 664-item, 146-batch capacity probe renders to 42,754 bytes,
  leaving 22,782 bytes below the unchanged 65,536-byte cap. It derives event
  identities from the preserved version 4 judgment prefix without running any
  model or creating new judgment output.
- [CODEX-SCREENING-PROMPT.v6.md](CODEX-SCREENING-PROMPT.v6.md) separates exact
  pre-dispatch planning from generic post-judgment replay. The planner records
  the clean checkout's exact `HEAD`, optionally requires an operator-supplied
  expected commit, and joins every normative artifact to its Git object bytes.
  The runtime builder accepts a new closed fourteen-event prefix, derives
  `recorded-model-run` only from all six exact distinct pairs, and retains the
  provider-execution and freshness capability boundary.
- [CODEX-SCREENING-AUDIT-INSTRUCTION.v2.txt](CODEX-SCREENING-AUDIT-INSTRUCTION.v2.txt)
  and its closed output schema require the Sol audit output to echo the exact
  run, plan, prefix, compact input, instruction, task, source revision, and
  model profile bindings. Audit-policy PASS is separate from production
  finalization.
- [CODEX-SCREENING-PROMPT.v7.md](CODEX-SCREENING-PROMPT.v7.md) and
  [CODEX-SCREENING-AUDIT-INSTRUCTION.v3.txt](CODEX-SCREENING-AUDIT-INSTRUCTION.v3.txt)
  define the current no-run audit interface. The recorder owns every mechanical
  binding and the full audit envelope. Sol returns only one invocation digest,
  `PASS`, `FAIL`, or `REFUSE`. Material anomalies have their own closed codes,
  evidence references, and bounded summaries. Non-material observations use a
  separate predefined code set with evidence references and no free-form text.
  The complete closed shape and exact example are supplied in-band.
- [fixtures/prompted-screening-runtime-v6-simulation-prefix.jsonl](fixtures/prompted-screening-runtime-v6-simulation-prefix.jsonl)
  and its exact output fixture provide a deterministic no-model, test-only
  reachability simulation. They are not a run, acceptance, admission record,
  Ritsu decision, reusable result, or authorization to screen.
- [records/synthetic-pilot-v5-2026-08-23/NON-CONFORMANT.json](records/synthetic-pilot-v5-2026-08-23/NON-CONFORMANT.json)
  preserves the exact process-v5 zero-dispatch stop. Its append-only correction
  explains that static refusal safety was validated while fresh-prefix runtime
  reachability was not.
- [records/synthetic-pilot-v6-2026-08-23/NON-CONFORMANT.json](records/synthetic-pilot-v6-2026-08-23/NON-CONFORMANT.json)
  preserves the exact sixth-pilot stop, raw outputs, recorder states, judgment
  prefix, rejected nested claimed PASS, handoff, and usage.
  It records 72 mechanically valid judgments, no audit-output event, no final
  transcript, and zero Ritsu decisions.
- [records/synthetic-pilot-2026-08-22/NON-CONFORMANT.json](records/synthetic-pilot-2026-08-22/NON-CONFORMANT.json)
  preserves the failed synthetic pilot, its privacy-safe raw evidence, exact
  artifact identities, zero Ritsu decisions, and non-acceptance.
- [records/synthetic-pilot-v2-2026-08-23/NON-CONFORMANT.json](records/synthetic-pilot-v2-2026-08-23/NON-CONFORMANT.json)
  preserves the second failed synthetic pilot and its privacy-safe raw results,
  audit, and transcript. The record is `NON-CONFORMANT` with
  `PROCESS_DEFECT`, records zero Ritsu decisions, and separates the pre-audit
  judgment transcript identity from the final append-only transcript identity.
- [records/synthetic-pilot-v3-2026-08-23/NOT-APPROVED.json](records/synthetic-pilot-v3-2026-08-23/NOT-APPROVED.json)
  preserves the exact corrected third-pilot evidence and derivative history.
  It records 72 valid judgments, 24 of 24 three-model agreement, zero judgment
  errors, retries, tools, or Ritsu decisions, and the exact 586,847 observable
  token total. The separate Sol process audit made 11 tool calls and consumed
  464,147 observable tokens, so that audit shape is rejected. The record is not
  accepted or reusable.
- [records/synthetic-pilot-v4-2026-08-23/NON-CONFORMANT.json](records/synthetic-pilot-v4-2026-08-23/NON-CONFORMANT.json)
  preserves the exact fourth-pilot evidence, 72 valid judgments, 24 of 24
  agreement, zero errors, retries, tools, or Ritsu decisions, and the raw
  `qualified-pass` audit with one material flag. Its append-only mechanical
  correction narrows an overclaim about process freshness without rewriting
  the returned audit or accepting the run.
- [schemas/compact-process-audit-input.v1.schema.json](schemas/compact-process-audit-input.v1.schema.json)
  and its renderer define the closed process-only summary used by prompt v4.
  The current reviewed source revision requires the joint cell contingencies.
  Sol relies on machine validation flags and digests for raw-byte integrity; the
  later public artifact verifier must resolve and hash published artifacts.
- [schemas/compact-process-audit-input.v2.schema.json](schemas/compact-process-audit-input.v2.schema.json)
  and its renderer define the version 5 closed, self-describing keyed-column
  summary. The schema distinguishes content digests from exact dispatch/output
  transcript event identities and states the provider capability boundary
  in-band.
- [schemas/sampling-commitment.schema.json](schemas/sampling-commitment.schema.json)
  defines a validation interface, not a commitment instance.
- [docs/software-heritage.md](docs/software-heritage.md) records the successful
  Software Heritage archive of the pre-outcome sampling commitment.
- [records/real-run-v8-2026-08-24/](records/real-run-v8-2026-08-24/) preserves
  the exact completed screening evidence and Colophon admission receipt. The
  verifier checks artifact integrity and admission closure; it does not prove
  provider execution, prompt compliance, or immutable weights behind the
  declared model names.

Run the local checks with:

```sh
node scripts/validate.mjs
node scripts/validate-prompted-screening-pilot.mjs
node scripts/render-prompted-screening-dispatch-v2.mjs
node scripts/render-prompted-screening-dispatch-v3.mjs
node scripts/render-compact-process-audit-input-v1.mjs
node scripts/render-compact-process-audit-input-v2.mjs
node scripts/validate-synthetic-pilot-run-record.mjs
node scripts/validate-synthetic-pilot-v2-run-record.mjs
node scripts/validate-synthetic-pilot-v3-run-record.mjs
node scripts/validate-synthetic-pilot-v4-run-record.mjs
node scripts/validate-synthetic-pilot-v5-stop.mjs
node scripts/validate-prompted-screening-v5-fixture.mjs
node scripts/plan-prompted-screening-v6.mjs --repo . --expected-public-commit <exact-public-commit>
node scripts/build-prompted-screening-runtime-v6.mjs --repo . --expected-public-commit <exact-public-commit> --prefix <fresh-prefix-path>
node scripts/simulate-prompted-screening-runtime-v6.mjs
node scripts/validate-synthetic-pilot-v6-stop.mjs
node scripts/simulate-prompted-screening-runtime-v7.mjs
node --test test/*.test.mjs
```

The callable production recorder owns append-only local state but never
dispatches an agent. Run it only from a tracked-clean exact public checkout.
Its `init` command requires exactly one `--mode`, whose value is either
`production-recording` or `test-only`; omission, duplication, or any other
value refuses before the state directory is created.
The operator separately obtains each returned output byte file and records it
with the matching planned stage, batch, task, model, reasoning, and zero-tool
declarations:

```sh
node scripts/record-prompted-screening-v6.mjs init --state <state-dir> --owner <owner> --mode production --repo . --expected-public-commit <exact-public-commit>
node scripts/record-prompted-screening-v6.mjs export --state <state-dir> --owner <owner> --artifact plan
node scripts/record-prompted-screening-v6.mjs record-judgment --state <state-dir> --owner <owner> --stage <Luna-or-Terra-or-Sol> --batch <ordinal> --task <unique-task-id> --model <exact-alias> --reasoning <exact-level> --tools none --output <raw-output-file> --failures 0 --retries 0 --tool-calls 0
node scripts/record-prompted-screening-v6.mjs seal-judgments --state <state-dir> --owner <owner> --run-id <run-id> --attested-by <operator-id>
node scripts/record-prompted-screening-v6.mjs prepare-audit --state <state-dir> --owner <owner> --task <unique-audit-task-id>
node scripts/record-prompted-screening-v6.mjs export --state <state-dir> --owner <owner> --artifact audit-dispatch
node scripts/record-prompted-screening-v6.mjs record-audit --state <state-dir> --owner <owner> --output <raw-bound-audit-output-file> --failures 0 --retries 0 --tool-calls 0
node scripts/record-prompted-screening-v6.mjs finalize --state <state-dir> --owner <owner>
node scripts/record-prompted-screening-v6.mjs validate-final --state <state-dir> --owner <owner>
node scripts/record-prompted-screening-v6.mjs export --state <state-dir> --owner <owner> --artifact final-transcript
```

`record-judgment` is invoked exactly six times in the exported plan order.
Every state artifact is create-once under one owner. Test-only or no-model
state can pass the pure audit policy but `finalize` returns a nonzero status and
the terminal `TEST_ONLY_NON_ADMISSIBLE`; it can never emit `PENDING_RITSU`.

Version 7 uses the same command sequence through
`scripts/record-prompted-screening-v7.mjs`. The `prepare-audit` output includes
the recorder-owned `auditInvocationSha256`. The audit dispatch contains only
the self-contained version 3 instruction, that digest binding line, and the
exact compact input. `record-audit` preserves the raw semantic payload bytes
and deterministically composes the full audit envelope. It never repairs a
malformed output.

Before any real 664-row commitment or screening, the operator must create and
seal a distinct opaque screening identity mapping and a non-grouped dispatch
order. Current private slot and source identifiers leak hidden metadata and are
not valid judgment identities.

## License boundary

Colophon-authored material in this repository is licensed under CC BY-NC 4.0.
The authorized LoCoMo-derived screening material is recorded under
`records/real-run-v8-2026-08-24` and retains the upstream CC BY-NC 4.0 terms.
Colophon-authored additions are also licensed under CC BY-NC 4.0. Third-party
material retains its recorded terms.
Third-party material retains its own terms; see [LICENSES](LICENSES) and
[ATTRIBUTION.md](ATTRIBUTION.md).
