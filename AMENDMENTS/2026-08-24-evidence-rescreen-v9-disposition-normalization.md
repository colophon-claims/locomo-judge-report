# Version 9 post-output disposition normalization

After all Luna, Terra, and Sol judgments completed, but before Ritsu reviewed any version 9
delta row and before the version 9 process audit ran, the first mechanical comparison exposed a
vocabulary mismatch. The version 9 prompt describes a positive advisory disposition as
`admitted`; the immutable version 8 screening table stores the equivalent positive disposition
as `admissible`.

The preliminary derivation compared those strings literally. It therefore reported 581 changed
rows, including 488 false changes where the meaning had not changed. That preliminary queue is
retained as invalid process evidence and must not be used for operator review, admission, or the
process audit.

This amendment records one content-independent normalization:

- version 9 `admitted` maps to version 8 `admissible`;
- version 9 `excluded` maps to version 8 `excluded`.

The model prompts, inputs, outputs, routes, and transcript remain unchanged. No judgment was
retried or rerun. Applying the normalization produces 93 substantive delta rows: 87 from
`admissible` to `excluded`, and 6 from `excluded` to `admissible`. The exact preliminary and
corrected hashes, counts, transcript prefix, and derivation-script digest are sealed in
[`post-output-normalization.json`](../commitments/locomo-evidence-rescreen-2026-08-24/post-output-normalization.json).

This is a transparent post-output derivation correction, not a precommitted rule. It is being
published before either human review or process-audit output can depend on the corrected queue.
