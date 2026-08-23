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

## After a commitment

Once a sampling commitment is published, amendments are append-only. Do not
rewrite or delete a commitment, manifest line, source-register entry, or
notice that was part of that commitment. Add a dated superseding entry that
identifies the prior content and explains the correction. The original bytes
remain available for verification.

An amendment must not imply that a new freeze occurred. A real freeze requires
separate operator authorization and a documented commitment event.
