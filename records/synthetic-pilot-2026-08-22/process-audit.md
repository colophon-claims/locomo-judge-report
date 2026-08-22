# Prompted-screening synthetic pilot process audit

Overall outcome: **NON-CONFORMANT**.

The separate post-output audit was performed by `/root/synthetic_pilot_coordinator/sol_process_audit`, declared as `gpt-5.6-sol` with high reasoning, without item truth labels and without tools.

| Required stage | Observed execution | Result |
|---|---|---|
| Pin public repo HEAD | Exact `730bb9048f0d8bd8141a0ebd4cabbe425bcc1e84`; clean worktree | Pass |
| Verify normative prompt | Exact approved SHA-256 | Pass |
| Run validator before dispatch | Succeeded for 24 synthetic cases | Pass |
| Coordinator neutrality | Coordinator did not judge items or replace verdicts | Pass |
| Luna sequence | Luna medium; one 24-item batch; sequential | Pass |
| Terra sequence | Terra high; batches of 16 and 8; sequential | Pass |
| Sol sequence | Sol high; three 8-item batches; sequential | Pass |
| Preserve blinded inputs | All 24 traversed every sequence in global fixture order with stable object serialization | Pass |
| Isolate judgment agents | No surrounding context, truth labels, metadata, other outputs, or tools | Pass |
| Supply exact normative judgment instruction | Both Markdown code fences around the example object were omitted from every dispatch | **Fail** |
| Validate outputs | 24 unique ordered valid outputs per sequence; no missing, extra, duplicate, changed identifier, additional field, invalid verdict, commentary, or UNSURE | Pass |
| Retry policy | No infrastructure failures and no retries; valid outputs were not rerun | Pass |
| Preserve authority | Luna remained `screeningVerdict`; Terra and Sol remained review evidence | Pass |
| Avoid fabricated Ritsu decision | Zero Ritsu decisions recorded | Pass |
| Separate post-output audit | Completed after all judgment outputs | Pass |

## Material issue

The normative judgment section SHA-256 including the fenced example is `d9141739f7129cd660b9cce83e0e8e28a3ffe33fe30d4138031a25fc3b460509`. The dispatched judgment section, identical in prose and wrapping but lacking the opening and closing Markdown fence bytes, is `edb0ab1face5c288f375fe5f4222843409d3836e73681178e00c0a746977a43f`.

This is an exact-instruction process-integrity failure. It was not silently repaired, and the valid model outputs were not rerun because the procedure permits retry only for infrastructure failure with no model output. The Luna JSON-array container was not classified as invalid because the normative wording does not unambiguously prohibit an array containing exactly one output object per input item.

The pilot is not declared accepted. Proposed Ritsu decisions remain PENDING.

## Outcome counts

- 24/24 items had three-model agreement.
- Luna screening verdicts: 8 CORRECT, 16 WRONG, 0 UNSURE.
- Luna versus synthetic intended labels: 24 matches, 0 mismatches.
- Model disagreements: 0.
- Invalid-output items: 0.
- Missing, extra, or duplicate outputs: 0.
- Infrastructure failures and retries: 0.

## Artifact identity

- Prompt SHA-256: `d5977b2d5d4f66a11af145e958f6cdc56ee7ac8b38a1193cc3505adfdd2cf999`
- Normative procedure-source SHA-256 (`CODEX-SCREENING-PROMPT.v1.md`): `d5977b2d5d4f66a11af145e958f6cdc56ee7ac8b38a1193cc3505adfdd2cf999`
- Procedure validator SHA-256: `ce85a3faaf13941310b0d7e10e42c0e5f9ca55e980f5453a9b5515f6df0ab771`
- Fixture SHA-256: `6d372a2242b339991817f5660c9d53812c19978c51efb74f9036dd95d07d3813`
- Transcript SHA-256: `55792ab83caa3218605ce48b51d78a5920b919f9b991c8262fe54c94dbd28364`
