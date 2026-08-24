# Corrective evidence re-screen, version 9

The completed version 8 screen is retained exactly as published. During judge-arm binding, we
found that its agent payload contained the question, reference answer, and candidate answer, but
not the LoCoMo evidence excerpt described in the public design. This was a workflow-input defect,
not an alteration of the committed pool, seed, sample, or Ritsu's 220 recorded decisions.

Before observing any version 9 model output, this commit binds the exact 664-item
evidence-carrying payload, the pinned dataset, extraction-script digest, extraction format, model,
and corrective routing in
[`commitments/locomo-evidence-rescreen-2026-08-24/commitment.json`](../commitments/locomo-evidence-rescreen-2026-08-24/commitment.json).
The extraction includes only annotated turns and their session times, never full conversations.

The pinned dataset contains eleven unresolved annotation occurrences across the 664 candidate
rows: missing annotations and malformed dialogue locators. They are preserved as explicit
unresolved markers; they are never silently repaired. Version 9 may amend admission only through
an append-only public record, and only before freeze.
