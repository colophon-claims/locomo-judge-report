# Prompt-Driven Codex Screening Coordinator Prompt, version 5

## Status, succession, and boundary

This is the normative coordinator prompt for future Prompt-Driven Codex
Screening dispatches. Versions 1 through 4 remain published and immutable.
Version 5 supersedes version 4 for future compact process audits because the
version 4 compact input was mechanically closed but its positional batch rows
did not state their digest semantics in-band.

The preserved version 4 synthetic pilot remains `NON-CONFORMANT` with
`PROCESS_AUDIT_MATERIAL_FLAG`. It is not repaired, rerun, accepted, reusable,
or eligible for admission. Version 5 changes no version 4 prompt, schema,
fixture, transcript, result, raw audit output, derivative, or run record.

This document authorizes no model call, screening run, sampling commitment,
candidate pool, transcript, operator decision, benchmark result, or freeze.
The public verifier checks sealed structured metadata and artifact integrity.
It does not prove prompt compliance, provider execution, process freshness,
transcript provenance, model routing, or invariant weights behind mutable
aliases.

## Judgment procedure

The complete judgment procedure, instruction bytes, blinding boundary, retry
rule, stage order, model declarations, batch ceilings, Luna authority, Terra
and Sol review-only roles, and Ritsu authority remain exactly those of version
4. Judgment agents still receive only the exact independent instruction plus
their canonical ordered blinded item subset. Do not add a stage, task, model,
reasoning, transcript, or execution marker to judgment bytes merely to make a
content digest different.

The exact declarations remain:

1. Coordinator: `gpt-5.6-sol`, high.
2. Luna: `gpt-5.6-luna`, medium, at most 32 items.
3. Terra: `gpt-5.6-terra`, high, at most 16 items.
4. Sol: `gpt-5.6-sol`, high, at most 8 items.
5. Compact process audit: `gpt-5.6-sol`, high, with no tools.

Before any real commitment or dispatch, seal the separately reviewed 664-row
opaque screening identity mapping and fixed non-grouped dispatch order. A
synthetic fixture mapping never substitutes for that real mapping.

## Version 2 compact process-audit input

After every judgment output is sealed and machine-validated, construct one
version 2 compact process-audit input with the deterministic version 5
renderer. Construction requires the exact canonical judgment-prefix bytes and
every exact source artifact named by the renderer: coordinator procedure,
judgment procedure, judgment instruction, fixture or real pool, opaque mapping,
dispatch order, judgment renderer, compact schema, compact renderer, process
audit instruction, and process audit output schema. Validate every artifact
against a literal approved identity before parsing it. Caller-supplied digest,
count, verdict, validation boolean, event identity, or aggregate is never a
substitute for deriving it from those exact bytes.

The renderer parses the closed fourteen-event prefix, strictly decodes and
re-encodes every base64 field, reconstructs each dispatch from the exact
instruction and blinded subset, parses each raw verdict array, and derives all
batch counts, routed UNSURE outcomes, stage totals, cells, agreement metrics,
and 27-way joint contingencies. Omitted, substituted, reordered, duplicate, or
noncanonical source and event bytes fail closed even if downstream digests or
summaries are updated consistently.

The exact process-audit message is the approved audit instruction bytes
followed by the canonical compact input bytes. It has no prose wrapper,
Markdown, repository access, raw artifact bytes, or suffix.

Every batch is a closed keyed object. It explicitly names:

- `blindedItemsSha256`: the content digest of the canonical ordered blinded
  subset bytes. The bytes are stage-agnostic, so equal subsets have equal
  digests.
- `dispatchSha256`: the content digest of the exact judgment instruction plus
  that same subset. The dispatch omits stage and execution metadata, so exact
  dispatch bytes may repeat across stages.
- `rawOutputSha256`: the content digest of the exact ordered raw output bytes.
  Equal ordered item IDs and verdict strings may produce equal output digests.
- `transcriptDispatchEventSha256`: the digest of the exact sealed JSONL
  dispatch event bytes, including final LF.
- `transcriptOutputEventSha256`: the digest of the exact sealed JSONL output
  event bytes, including final LF.

The last two identities must be distinct for every event and reconstruct from
the immutable sealed judgment-transcript prefix. A dispatch and output pair
must use one batch task identity, and no task identity may be reused by another
batch. The compact input carries event digests, not task names or raw events.

Content digest equality alone is not evidence of reuse. Distinct transcript
event and task identities prove only that distinct records were preserved in
the sealed transcript. They do not prove provider execution, process
freshness, independent generation, declared model routing, prompt compliance,
or invariant model weights.

## Selection basis

Selection semantics are closed and branch-specific in-band:

- `synthetic-pilot` means the exact fixed 24-item synthetic fixture is the
  entire population and every item is dispatched in deterministic fixture
  order to all three stages. No sampling occurs. Both
  `samplingCommitmentSha256` and `samplingScriptSha256` must be null.
- `real-screening` means the exact sealed 664-item screening pool is the
  population and requires a non-null public sampling commitment identity and
  non-null sampling script identity. The compact input carries no sample
  membership or item identity.

Manufacturing synthetic sampling artifacts, omitting either required real
identity, changing population counts, or using an open branch shape is a
machine-validation failure.

## Audit authority, defects, and capability boundary

Sol may inspect coverage, declaration drift, suspicious agreement,
cross-stage asymmetry, and process defects represented in the summary. It must
make zero item judgments, change zero verdicts, and make zero Ritsu decisions.

A material process-defect flag must cite a contradiction in supplied sealed and
machine-validated evidence. Content digest equality, null synthetic sampling
identities, or absence of provider-freshness proof is not such a contradiction.
The declared capability boundary is not a process defect.

Perfect agreement remains auditable. It may be reported as a non-material
suspicious-agreement observation for a deliberately clear, permanently
excluded synthetic fixture. The observation must not be suppressed, converted
to item judgment, or treated as acceptance. It becomes material only when Sol
cites a represented contradiction rather than agreement alone.

A recorded synthetic process pilot can satisfy the audit gate only with an
exact canonical process-audit output and an unqualified `PASS` with zero
material process-defect flags. The output contract is closed: prose, extra
keys, an unknown status or severity, hidden material findings, nonempty
required verification, or bytes outside the canonical JSON object and final
LF fail. `qualified-pass`, any material
flag, any machine-validation failure, or an attempt to overclaim provider or
process freshness fails the pilot. Agreement and a green machine validator do
not approve a pilot. Only Ritsu may approve it or record `confirm` or `exclude`.

An input marked `validation-only-no-model-run` may test parsing and output
policy, but it cannot pass the executable process-acceptance gate. A separate
664-item capacity measurement is labeled
`measurement-only-not-an-audit-input`; it returns size and headroom only and
cannot validate or masquerade as process-audit evidence. Real replay remains
blocked until the exact reviewed real pool, mapping, order, sampling, and
transcript source bytes are registered.

## Privacy, size, and transcript stages

The compact input retains the version 4 raw-material and item-identity
prohibitions. It must not contain prompt, instruction, dispatch, output, or
transcript bytes; item arrays or IDs; questions, references, candidates,
per-item intended labels or verdicts; task or session names; source or slot
identities; sample membership; prior raw judgments; local paths; or secrets.

All batch, stage, cell, joint-contingency, agreement, failure, retry, tool, and
machine-validation invariants from version 4 remain load-bearing. The canonical
input, including final LF, must remain at or below 65,536 bytes. Abort before
audit dispatch on any source, shape, order, digest, event, selection, aggregate,
privacy, canonical-byte, or capacity failure.

Seal the fourteen-event judgment transcript prefix before the audit. Resolve
every batch event identity against that exact prefix and bind its digest in the
compact input. Append the process-audit event and any separately declared
post-audit comparison event, then seal the distinct final transcript. A reused
or duplicated transcript event, cross-batch task reuse, swapped digest label,
unbound suffix, or circular transcript identity is invalid.
