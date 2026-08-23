# Process audit: **DEFECT**

All byte-integrity, execution-order, output-format, and authority-preservation checks passed. However, the blinding invariant fails materially: every dispatched `itemId` contains the corresponding fixture `candidateClass` and `stratum` literals.

For example, `synthetic-correct-category-1-01` contains fixture metadata values `correct` and `category-1` verbatim. This is a syntactic comparison only; no item was judged and no intended label was derived. The leak affected all 24 items at all three stages: 72 dispatched item exposures.

| Invariant | Result | Evidence |
|---|---:|---|
| Exact clean public source and pinned artifacts | PASS | HEAD and local `origin/main` are `e0a0e8…ed456`; worktree remained clean |
| Six dispatches equal fresh renderer output and pass `validateRenderedDispatch` | PASS | Exact byte equality and all six expected hashes |
| Exact instruction prefix; closed canonical item JSON only | PASS | Exact LF-terminated instruction plus canonical compact arrays |
| No labels/classes/strata or metadata leaked | **FAIL** | All dispatched IDs embed their fixture `candidateClass` and `stratum` values |
| Model declarations, order, batches, full traversal | PASS | Luna medium `24`; Terra high `16+8`; Sol high `8+8+8` |
| Six decoded raw outputs valid at exact-byte level | PASS | Compact ordered JSON, final LF, exact keys/IDs/alphabet; `0/0/0/0` validation totals |
| No failures, retries, semantic retries, or judgment-agent tools | PASS | Six unique dispatch/output pairs; all flags false; tool calls `0` |
| Authority preserved; zero Ritsu decisions | PASS | Parsed outputs preserved unchanged; no replacement or Ritsu record |
| No v1 reuse or forbidden real-run/external mutations recorded | PASS | Run declaration flags all false |

Exact identities checked:

- Transcript: `c2c2157ba7eef0f342a0e7e5ee88674e9565da9d9425c5d0e708a64f3449ab63`
- Prompt v2: `a724aed3aef285e961f9bb1ee0933c0c25e0669b944ce177b7951f88ac913704`
- Judgment instruction v1: `339c4f8286a476036ea3fce40fa5f517376908ee503ed2e21aeb03e47f920837`
- Fixture: `6d372a2242b339991817f5660c9d53812c19978c51efb74f9036dd95d07d3813`
- Renderer/validator: `eaed6d48189d438e76d29338a4fb7eb6296f24a7acffbb69a418372168a7030e`
- Dispatches: `7eeba50e…cebc9`, `a72a76a1…80dd9`, `2bfb3823…7623b`, `c0310217…fcfc0`, `4d0cdc81…b458`, `2bfb3823…7623b`
- Raw outputs: `3fb90982…1044`, `eaa55a32…4b27`, `23767733…85f`, `fa38ab2a…472e`, `6c750aab…3bc5`, `23767733…85f`

Limitation: absence of public pushes, PRs, paid runs, site changes, and other external actions is supported by the append-only transcript declaration, not independently proven against every external system. The local `origin/main` check used the existing remote-tracking ref without fetching. No files were edited.
