# LoCoMo judge report registration

## PREPARATION / NOT FROZEN

This public repository is an operator-owned registration scaffold for a future
LoCoMo judge report. It is not a freeze, publication, benchmark result, audit
release, or authorization to run one. No real or operator commitment instance,
seed, LoCoMo conversation, audit dataset, screening output, candidate pool, or
result is present now. The only prompt bytes are the Colophon-authored normative
procedure in [CODEX-SCREENING-PROMPT.v1.md](CODEX-SCREENING-PROMPT.v1.md).
Clearly named synthetic test fixtures may exercise validation only and are
permanently ineligible for admission. Neither is a commitment or freeze.

The sole repository operator is `ritsukai`. A future commitment may be added
only through the append-only process in [CONTRIBUTING.md](CONTRIBUTING.md).
After separate authorization, a sampling commitment and selected, authorized
snippets may be appended. Until then, this repository contains metadata and
validation interfaces only.

## Scope

- [source-register.json](source-register.json) is the canonical source register.
- [CODEX-SCREENING-PROMPT.v1.md](CODEX-SCREENING-PROMPT.v1.md) records the
  normative natural-language procedure source. It does not prove execution or
  compliance.
- [fixtures/prompted-screening-pilot-v1.json](fixtures/prompted-screening-pilot-v1.json)
  contains only 24 synthetic, permanently excluded validation cases and no
  model output or operator decision.
- [schemas/sampling-commitment.schema.json](schemas/sampling-commitment.schema.json)
  defines a validation interface, not a commitment instance.
- [docs/software-heritage.md](docs/software-heritage.md) describes a future
  archival procedure. Nothing has been archived through Software Heritage by
  this repository.

Run the local checks with:

```sh
node scripts/validate.mjs
node scripts/validate-prompted-screening-pilot.mjs
node --test test/*.test.mjs
```

## License boundary

Colophon-authored material in this repository is licensed under CC BY-NC 4.0.
Any future LoCoMo-derived material is outside this repository until it is
authorized for inclusion and is then subject to the same stated boundary.
Third-party material retains its own terms; see [LICENSES](LICENSES) and
[ATTRIBUTION.md](ATTRIBUTION.md).
