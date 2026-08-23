# Contribution and amendment policy

The sole repository operator is `ritsukai`. Contributions are proposed through
pull requests and must preserve the preparation-only boundary in README.md.

## Before a commitment

Metadata corrections, Colophon-authored normative procedure text, and clearly
named synthetic validation fixtures may be added in normal commits. Synthetic
fixtures must be permanently ineligible for admission and must not carry model
outputs or operator decisions except under the append-only synthetic evidence
policy below. Commits before a commitment must not add real candidate or source
bytes, conversations, audit data, seeds, candidate pools, real screening
outputs, real transcripts, real results, or a sampling commitment instance.

## Append-only synthetic execution evidence

After explicit operator authorization, a strictly synthetic run over fixtures
that are permanently ineligible for admission may be recorded under `records/`.
The record must state its exact conformance status, bind every included artifact
by SHA-256, preserve zero operator decisions unless Ritsu actually made one, and
must never turn model agreement into acceptance. Raw evidence may be included
only when it contains no real candidate, private source, credential, secret, or
operator-local identifying path. Omitted raw evidence retains its exact digest
and a specific omission reason.

Synthetic run evidence is append-only from its first commit. Do not rewrite or
delete a prior prompt, instruction, fixture, result, audit, or run record. A
process repair uses a new versioned prompt or instruction and a dated
superseding record. It does not repair, rerun, or accept the prior execution.

Judgment identities must not carry intended label, class, stratum, pool status,
source, slot, sample, replacement, or prior-output metadata. A process version
that repairs identity blinding uses a new immutable outer-to-opaque mapping and
a separately sealed non-grouped dispatch order. Neither mapping nor outer
metadata enters judgment-agent bytes. A synthetic mapping does not authorize a
real mapping or real screening.

A transcript with a post-judgment process audit has two explicit stages. Seal
the immutable judgment transcript before audit, require the audit to name that
input digest, append every declared audit or comparison event, and then seal a
distinct final transcript. The terminal record binds both scopes and every
suffix event. A single transcript digest does not satisfy this policy.

## Compact process-audit amendment

Coordinator prompt v4 keeps the v3 judgment procedure but replaces raw-material
Sol audit input with the exact canonical
`compact-process-audit-input/v1` summary. The renderer must validate its own
approved prompt, schema, and source bytes before dispatch. It must then enforce
closed shapes, fixed declaration and aggregate order, all batch and cell counts,
true machine-validation flags, exact digests, and a 65,536-byte maximum.
Each ordered class/stratum cell must carry the closed 27-count joint verdict
contingency in lexicographic Luna, Terra, Sol order with each axis ordered
`CORRECT`, `WRONG`, `UNSURE`. The renderer derives all three stage marginals,
three-stage agreement, pairwise disagreements, one-stage asymmetries, and
all-different counts from that one contingency. Independently feasible
pairwise totals are not sufficient.

The compact process audit receives public references and digests, per-batch
digests and counts, aggregate verdict and agreement metrics, twelve ordered
class/stratum cells, and the staged judgment-transcript prefix digest. It must
not receive instruction, prompt, dispatch, output, or transcript bytes; item
arrays or identities; questions, references, candidates, per-item intended
labels or judgments; operator-local paths; or other raw material. The Sol audit
may inspect process drift, coverage, suspicious agreement, asymmetry, and
defects. It cannot reperform or replace judgments. Public verification later
resolves and hashes the sealed artifacts.

The process-green third synthetic pilot remains append-only and not approved.
Its recorded agreement is not acceptance. Its measured raw-material audit usage
is the reason for this process amendment, not permission to rerun it. Any real
664-row execution still requires a separately sealed opaque identity mapping and
non-grouped dispatch order before commitment or screening.

## Self-describing compact process-audit amendment

Coordinator prompt v5 keeps the version 4 judgment path and supersedes only
the compact process-audit interface. It does not repair or accept the preserved
version 4 pilot. The version 5 input uses a closed keyed-column batch structure
whose named columns align by zero-based batch index. The five SHA-256 columns
name stage-agnostic blinded content, exact dispatch content, exact raw-output
content, exact sealed dispatch events, and exact sealed output events. Compact
encoding may avoid repeating labels per batch, but the labels and alignment
rule must remain in-band and closed.

The transcript event identities are recomputed from the exact LF-terminated
sealed prefix events. They must be distinct and must join exact task, stage,
model alias, reasoning, batch, dispatch, and output declarations. Distinct
recorded event identities prove only transcript separation. They do not prove
provider execution, process freshness, model routing, prompt compliance,
independent generation, or invariant alias weights. Content digest equality
alone is not evidence of reuse. Absence of provider-bound proof is not a
process defect. A material process-defect flag must cite a contradiction in
supplied sealed and machine-validated evidence.

For `synthetic-pilot`, the fixed 24-item fixture is the entire population in
deterministic fixture order. No sample is drawn and both sampling identities
must be null. For `real-screening`, the exact 664-item pool is the population
and both the public sampling commitment and sampling-script identities are
required and non-null. The branches are mutually exclusive.

Suspicious perfect agreement remains auditable and may be recorded as a
non-material observation for a deliberately clear synthetic fixture. It is not
suppressed and does not establish independent generation or acceptance. The
strict acceptance gate remains unqualified `PASS` with zero material
process-defect flags, followed by separate Ritsu authority. A qualified pass or
any material flag fails the gate.

The preserved version 4 run remains
`NON-CONFORMANT / PROCESS_AUDIT_MATERIAL_FLAG`. Its raw audit and prior
derivatives are immutable. The new mechanical correction states only that
distinct task names, model declarations, and dispatch/output events were
recorded; provider and process freshness are unproved. The version 5 fixture is
validation-only, derives identities from preserved synthetic event bytes, and
records no new model run, result, or Ritsu decision.

## After a commitment

Once a sampling commitment is published, amendments are append-only. Do not
rewrite or delete a commitment, manifest line, source-register entry, or
notice that was part of that commitment. Add a dated superseding entry that
identifies the prior content and explains the correction. The original bytes
remain available for verification.

An amendment must not imply that a new freeze occurred. A real freeze requires
separate operator authorization and a documented commitment event.
