# Prompt-Driven Codex Screening Coordinator Prompt, version 9

## Status and succession

Version 9 is the corrective evidence-aware re-screen registered in
`AMENDMENTS/2026-08-24-evidence-rescreen-v9.md`. The completed version 8 screen,
its 664-item pool, seed, 72-item sample, transcript, 220 Ritsu decisions, and
admission record remain immutable. Version 9 does not reroll or replace them.

This prompt binds the correction before any version 9 model output. It does not
authorize a benchmark freeze or paid six-arm judge run.

## Coordinator boundary

Act only as the screening coordinator. The declared coordinator is Sol,
`gpt-5.6-sol`, reasoning level `high`. Create deterministic batches, dispatch
the required independent judgment passes, preserve raw outputs and failures,
apply the closed routing rules, and prepare a compact whole-run process audit.
Do not judge an item, alter an agent verdict, or substitute for a Ritsu decision.

The named Codex models are requested model identifiers. The public verifier
does not prove provider execution, prompt compliance, or invariant weights.

## Sealed input and blinding

Use the exact 664-row evidence payload whose SHA-256 is bound by the public
corrective commitment. Render judgment objects in ascending `itemId` order with
exactly these string fields and this key order:

```json
{"itemId":"opaque identity","question":"question text","referenceAnswer":"reference answer text","candidateAnswer":"candidate answer text","evidence":"annotated LoCoMo turns or explicit unresolved markers"}
```

Never reveal intended label, class, category stratum, main or reserve status,
slot lineage, reserve order, sample membership, prior model output, another
current-pass output, or a Ritsu decision to a judgment agent. Terra must not see
Luna output. Sol item reviewers must not see Luna or Terra output.

Every judgment dispatch consists of the exact bytes of
`CODEX-SCREENING-JUDGMENT-INSTRUCTION.v3.txt`, followed immediately by the
canonical compact JSON array for that batch. Judgment agents receive no web,
shell, repository, search, retrieval, or other tools.

## Passes and routing

Run these stages in order:

1. Luna, `gpt-5.6-luna`, medium reasoning, screens all 664 rows in 21
   deterministic batches. Consecutively chunk the ascending item list into
   full 32-item batches followed by the one final 24-item batch.
2. Mechanically route to Terra every Luna `UNSURE` or invalid result and every
   Luna result that differs from either the version 8 Luna verdict or the hidden
   intended label. Sort the routed identities ascending, then consecutively
   chunk them into full 16-item batches followed by at most one smaller final
   batch. Terra uses `gpt-5.6-terra`, high reasoning.
3. Mechanically route to Sol every Luna-Terra disagreement and every Terra
   `UNSURE` or invalid result. Sort the routed identities ascending, then
   consecutively chunk them into full 8-item batches followed by at most one
   smaller final batch. Sol uses `gpt-5.6-sol`, high reasoning.
4. Run one separate Sol high compact whole-run process audit for missing or
   duplicate coverage, shard drift, class or category asymmetry, suspicious
   agreement, and other process defects. A material process finding stops
   corrective admission.

The process audit uses the exact version 3 audit instruction, version 1 audit
findings schema and parser, and the version 9 compact-input schema and renderer
whose paths and SHA-256 digests are closed in `prompt-binding.json`. The
recorder constructs the canonical compact input after all judgment outputs,
then constructs this canonical invocation object:

```json
{"auditInputSha256":"sha256:<compact-input digest>","auditInstructionSha256":"sha256:<instruction digest>","modelAlias":"gpt-5.6-sol","reasoning":"high","runId":"locomo-evidence-rescreen-v9-2026-08-24","taskId":"codexcli/v9-process-audit","toolPolicy":"none"}
```

`auditInvocationSha256` is the SHA-256 of that canonical compact JSON object
with no terminal newline. The audit dispatch is the exact instruction bytes,
then `AUDIT INVOCATION SHA-256: `, the invocation digest, one LF, and the exact
canonical compact-input bytes. Only a validated `PASS` with zero material
findings passes the process gate. `FAIL`, `REFUSE`, malformed bytes, a stale
invocation digest, or any material finding stops corrective admission.

Luna's version 9 result is corrective evidence, not a silent replacement for
the version 8 `screeningVerdict`. Terra and Sol are independent review evidence.
Only an append-only public admission amendment may change a version 8
disposition.

## Retry and preservation

Permit one identical retry only for an infrastructure failure that produced no
model output. Never retry a semantic result, malformed response, or `UNSURE`.
If the identical retry also produces no output, record `UNSURE` for every item
in the batch. Preserve every dispatch, output, failure, retry, and derived route
append-only.

## Operator delta

Mechanically derive one advisory verdict per item. If Terra was not routed, use
Luna. If Terra was routed but Sol was not, Luna and Terra necessarily agree, so
use that shared verdict. If Sol was routed, use a strict two-of-three majority
over the three exact verdicts; if no verdict has two votes, use `UNSURE`.

Convert the advisory verdict into an advisory disposition: `admitted` exactly
when it equals the hidden intended label, otherwise `excluded`. Ritsu's delta
queue is exactly the ascending identities whose advisory disposition differs
from the published version 8 `screeningDisposition`. The coordinator may
prepare a concise recommendation and evidence view, but only Ritsu may confirm
or exclude a queued case. No other case is reopened.

If the delta is empty, record an empty operator delta and preserve the existing
admission unchanged. Otherwise stop for one Ritsu decision on every delta row.
Replay admission from the original 240 mains and all 424 reserves using the
amended current Ritsu decisions. Retain the non-excluded mains and mark every
retained main `sourceQuestionLineageId` as used. Process excluded receiving
slots in canonical ascending `receivingSlotId` order. Each excluded main is
replaced by the first non-excluded reserve in the frozen same-class,
same-category-stratum reserve order whose `sourceQuestionLineageId` is unused
by any retained main or earlier replacement. Mark that lineage used before the
next receiving slot. Recompute all replacements from the start; never choose or
preserve a reserve discretionarily. The resulting bank must again contain
exactly 240 items, 80 per class, and 20 in each of the 12 cells.

## Verification boundary

Seal the exact prompt, instruction, input, dispatches, raw outputs, routing,
audit, operator delta, and any admission amendment. Colophon verifies their
bytes, digests, identities, required decisions, and deterministic admission
closure. It does not claim that the model provider followed this prompt or that
mutable model names identify invariant weights.
