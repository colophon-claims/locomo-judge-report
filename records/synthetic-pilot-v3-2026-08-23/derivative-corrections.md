# Derivative formatting corrections

Timestamp: `2026-08-23T10:35:10+02:00`

Scope: formatting-only repair of local Markdown derivatives. No model dispatch, rerun, judgment, transcript mutation, results mutation, semantic text change, digest change inside the derivatives, Ritsu decision, commit, or push occurred.

Exact reason: the apply-patch assembly that originally created the three Markdown derivatives accidentally preserved patch-marker `+` characters at the start of selected content, blank, table, and footer lines. This correction removes those accidental markers so the existing prose and tables render as intended; terminal `+`-only marker lines are normalized to the files' ordinary single final LF.

| Derivative | Original SHA-256 | Corrected SHA-256 |
|---|---|---|
| `usage.md` | `0c19cf14977b791d5c543657fdce3bd1204807e4d4faa6cb43efc56234c70c9c` | `716cf15c52b1a598345e33be957c1096d0af2d9c84097c60d51232f66eb7bad1` |
| `process-audit.md` | `05c7b060ac1b6f5c16752e263a2ba53f3412113e656334d81b39641830f00c96` | `60d54d86a36f009e24d59aa19271cc610fb1e20cb28d9626dac28d14ef8a9533` |
| `ritsu-review.md` | `3235a4d3fea6c06489d6611c6914db5a870831ea7db3087dc4f00c444a64e6a6` | `cd3afdaaf78be96ed0323672386a68621baee0d9d21866a3ade716b2b178fefe` |

Sealed artifacts were verified byte-for-byte unchanged after the derivative repair:

- `transcript.jsonl`: `ab9ada61e1311127ffe6b607e23740fc807f14830b5cd7eaa17db8914dd81ad3`
- `pilot-results.pending-ritsu.json`: `52dabe5692b951911bde3da354a0e5859bdbbddcecaac1ab7cebeb5fc10ceb10`

The transcript remains 16 LF-terminated JSONL records with distinct judgment-prefix, audit-event, intended-label-comparison-event, and final-transcript identities. The results remain `PENDING_RITSU`, with 24 pending rows and zero Ritsu decisions.
