# LoCoMo judge report registration

## PREPARATION / NOT FROZEN

This public repository is an operator-owned registration scaffold for a future
LoCoMo judge report. It is not a freeze, benchmark result, real-screening audit
release, or authorization to run one. No real or operator commitment instance,
seed, LoCoMo conversation, audit dataset, real screening output, candidate pool,
or benchmark result is present now. Versioned Colophon-authored prompt and
instruction bytes define a future procedure. Clearly named synthetic fixtures
and the two preserved non-conformant synthetic pilots are permanently
ineligible for admission. None is a commitment or freeze, and neither pilot is
accepted.

The sole repository operator is `ritsukai`. A future commitment may be added
only through the append-only process in [CONTRIBUTING.md](CONTRIBUTING.md).
After separate authorization, a sampling commitment and selected, authorized
snippets may be appended. Until then, this repository contains preparation
metadata, validation interfaces, and the explicitly identified append-only
synthetic execution evidence below.

## Scope

- [source-register.json](source-register.json) is the canonical source register.
- [CODEX-SCREENING-PROMPT.v1.md](CODEX-SCREENING-PROMPT.v1.md) records the
  immutable procedure source used by the non-conformant pilot. Version 1 is
  superseded for future dispatches, not rewritten.
- [CODEX-SCREENING-PROMPT.v2.md](CODEX-SCREENING-PROMPT.v2.md) records the
  immutable procedure source used by the non-conformant 2026-08-23 synthetic
  pilot. Version 2 is superseded for future dispatches, not rewritten.
- [CODEX-SCREENING-PROMPT.v3.md](CODEX-SCREENING-PROMPT.v3.md) records the
  normative future coordinator procedure with opaque judgment identities,
  non-grouped order, and mandatory byte-exact rendering.
- [CODEX-SCREENING-JUDGMENT-INSTRUCTION.v1.txt](CODEX-SCREENING-JUDGMENT-INSTRUCTION.v1.txt)
  is the independent exact judgment-agent instruction used by coordinator
  prompt versions 2 and 3.
- [fixtures/prompted-screening-pilot-v1.json](fixtures/prompted-screening-pilot-v1.json)
  contains only 24 synthetic, permanently excluded validation cases and no
  model output or operator decision.
- [fixtures/prompted-screening-pilot-v2.json](fixtures/prompted-screening-pilot-v2.json)
  preserves the same 24 synthetic cases while assigning fixed opaque judgment
  identities and a sealed non-grouped dispatch order. Outer metadata remains
  outside blinded dispatch bytes.
- [records/synthetic-pilot-2026-08-22/NON-CONFORMANT.json](records/synthetic-pilot-2026-08-22/NON-CONFORMANT.json)
  preserves the failed synthetic pilot, its privacy-safe raw evidence, exact
  artifact identities, zero Ritsu decisions, and non-acceptance.
- [records/synthetic-pilot-v2-2026-08-23/NON-CONFORMANT.json](records/synthetic-pilot-v2-2026-08-23/NON-CONFORMANT.json)
  preserves the second failed synthetic pilot and its privacy-safe raw results,
  audit, and transcript. The record is `NON-CONFORMANT` with
  `PROCESS_DEFECT`, records zero Ritsu decisions, and separates the pre-audit
  judgment transcript identity from the final append-only transcript identity.
- [schemas/sampling-commitment.schema.json](schemas/sampling-commitment.schema.json)
  defines a validation interface, not a commitment instance.
- [docs/software-heritage.md](docs/software-heritage.md) describes a future
  archival procedure. Nothing has been archived through Software Heritage by
  this repository.

Run the local checks with:

```sh
node scripts/validate.mjs
node scripts/validate-prompted-screening-pilot.mjs
node scripts/render-prompted-screening-dispatch-v2.mjs
node scripts/render-prompted-screening-dispatch-v3.mjs
node scripts/validate-synthetic-pilot-run-record.mjs
node scripts/validate-synthetic-pilot-v2-run-record.mjs
node --test test/*.test.mjs
```

## License boundary

Colophon-authored material in this repository is licensed under CC BY-NC 4.0.
Any future LoCoMo-derived material is outside this repository until it is
authorized for inclusion and is then subject to the same stated boundary.
Third-party material retains its own terms; see [LICENSES](LICENSES) and
[ATTRIBUTION.md](ATTRIBUTION.md).
