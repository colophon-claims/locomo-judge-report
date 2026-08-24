# Prompt-Driven Codex Screening Coordinator Prompt, version 8

## Status and succession

Version 8 is an append-only transport-framing amendment for the LoCoMo real-screening workflow. Versions 1 through 7, the accepted synthetic pilot, the public identity pool, seed, 72-item sample, and every recorded byte from the first real-screening attempt remain immutable.

The first real-screening attempt, `locomo-screening-2026-08-24`, is retained and abandoned. It reached 21 Luna outputs and four Terra outputs before the coordinator paused Terra batch 5. It produced no Ritsu screening decision, admission result, freeze, or benchmark judgment run.

## Observed process defect

Version 7 required every judgment response to end with one LF byte. The pinned Codex non-interactive final-message export captured the assistant message text without a terminal LF. All 20 CLI-produced Luna files covered their exact 632 items and were canonical compact JSON without an LF, but the version 7 parser correctly treated each entire file as invalid under the registered rule. This expanded Terra routing to 40 batches.

The defect is transport framing, not a change to the semantic judgment task. No observed version 7 judgment is reused in version 8.

## Version 8 amendment

Version 8 uses `CODEX-SCREENING-JUDGMENT-INSTRUCTION.v2.txt`. A valid output is exactly one canonical compact JSON array as final-message text, with no leading whitespace, trailing whitespace, or terminal newline. All item coverage, order, identity, key order, verdict alphabet, invalid-to-`UNSURE` behavior, blinding, model, reasoning, batch limits, zero-tool policy, routing, retry, and Ritsu authority rules remain unchanged.

The coordinator starts a fresh append-only run using the same already-public 664-item identity pool, seed, deterministic 72-item sample, and sampling script. The seed and sample are not rerolled. The abandoned version 7 attempt remains available as private process evidence and is bound publicly by its transcript digest only.

This amendment authorizes no benchmark freeze, paid six-arm judging run, admission decision, or outcome publication.
