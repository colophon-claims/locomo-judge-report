# Neutral-verdict delivery correction amendment, 2026-08-27

This append-only amendment supersedes the 2026-08-27 superseding execution lock's execution commitment (run digest `sha256:6f50c521671c7c988476493ef844bc1ab555d87a89acfe42d0696a82bd200290`). It does not rewrite that lock, the 2026-08-26 official lock, the 2026-08-26 freeze, or any earlier registration; all remain visible under their tags. The scientific inputs are unchanged: the 240-item bank, its source manifest, the admission evidence, the human review decisions, the deterministic replacements, the six version-2 arm prompts and their cited sources, the dated subject model `gpt-4o-mini-2024-07-18`, three replicates, and the analysis plan are byte-identical to the superseded lock's materials. Bank continuity is provable: the itemBank, sourceManifest, admissionIndex, admissionManifest, and replacementLedger digests are identical, and all 240 task payloads including evidence are byte-identical. Every task document differs from its superseded counterpart in exactly one component, its evaluation specification, described below.

## Why this amendment exists

1. The superseded lock was launched once, at 2026-08-27T11:26Z. The run was deliberately stopped at 2026-08-27T13:17Z, after 550 of the 4,320 main cells' judge calls. 548 verdicts had been delivered; every response, verdict, and journal entry is preserved; no output from the attempt enters any result.
2. The stop was forced by a delivery defect found live. One judge response arrived as prose followed by a fenced JSON verdict. Under the sealed version-2 grammar that response correctly parses INVALID. But the sealed abstain evaluation specification never declared the recorded-inconclusive machinery the execution platform requires before it will accept a neutral verdict, so the platform refused the delivery and recorded that cell as permanently ungradable. That is a response-content-driven loss. The 0.995 completeness floor was registered on the explicit justification that lost cells can only be infrastructure-caused and content-blind; a run violating that justification is unpublishable, so it was stopped. Every other delivered response parsed valid; this was the first genuinely unparseable response the benchmark produced live, a case no prior canary elicited because all prior canary items were synthetic and the judge never produced explanatory prose.
3. The corrected execution stack is public and reviewable as pull request #3078 on Jinn-Network/mono, merged at commit `7e92c8aa4d9d379ed67932258d8b4a910968ec7e` after an independent review recorded on the pull request. The abstain evaluation specification now declares what its own sealed parser-semantics document has promised since sealing: an unparseable judge response is recorded as a counted, neutral, inconclusive verdict (an `unparseable-judge-response` class with disposition recorded-inconclusive) instead of being refused. The parser identity disclosed in every verdict's method descriptor is unchanged, the reject-policy specification is byte-identical, and both sealed parser-semantics documents are byte-identical; the scoring semantics did not change. In the re-locked workspace all 240 sealed evaluation specifications declare the class; in the superseded workspace none did.

## Verification already performed on the corrected stack

- The exact preserved bytes of the refusing response were driven through the production delivery path on the corrected stack and yielded a delivered, counted inconclusive verdict, alongside three other unparseable shapes.
- That real delivered verdict was consumed end to end: outcome classification counts the cell as judged, aggregate reduction derives the neutral verdict without refusal, a replicate group lacking a majority surfaces as a visible no-valid-majority exclusion, and the qualification projection validates.
- Two negative controls: the superseded workspace, replayed unchanged, still refuses exactly as it did live; and a tampered verdict contradicting its signed measurements is still rejected at the aggregate boundary.

## Pre-launch protocol

Before any paid relaunch, a canary on the exact locked revision must pass with zero lost cells: it includes wrong-answer items so the judge produces explanatory responses of the shape that surfaced the defect, a live replay of the preserved refusing response, an interrupt-and-resume cycle, cold verification of published bundles by the standalone verifier, and the adversarial tamper matrix. Counted INVALID verdicts must appear where elicited.

## The second superseding lock

- Benchmark digest: `sha256:9ae50617f9112b750518c04309b96648207f6d0e17ba044a077d0d5185b84c9e`
- Colophon run digest: `sha256:481c9680e005eb7814f7120a56ef2242ba8167802571416ec363f6a743a6730e`
- Expected judge calls: 5,256 (4,320 main; 216 consistency gate; 720 corrupt-key check)
- Close: 48 hours from lock (`2026-08-29T16:30:51.384Z`).
- Completeness floor: 0.995, unchanged, and its justification is now strictly stronger: an unparseable response yields a counted neutral verdict rather than a refused delivery, so a missing cell can only be infrastructure-caused. Every missing cell must be individually disclosed with its journal evidence and shown infrastructure-caused; achieved completeness is reported as-is.
- All other policy fields are unchanged from the superseded lock: replicates 3, cell window 3,600,000 ms, replacement disallowed, direct-check assurance with one infrastructure retry, self-run venue, OCI container isolation.
- The lock inputs differ from the superseded lock in exactly two ways: the completed abstain evaluation specifications, and a fresh snapshot-serving probe of the dated subject model taken 2026-08-27T16:29:58Z (the sealed 24-hour freshness bound required re-probing; outcome serving, resolved model equal to requested). The judge binding's runtime digests and all six arm instrument digests are byte-identical to the superseded lock's.
- The companion freezes registered with the superseded lock are unchanged by this amendment. Their execution as frozen remains an open design question; any resolution will be a further append-only disclosure.

## Disclosed operational provenance and limitations

- The aborted second attempt's full journal, its preserved responses, and the refusing cell's attempt evidence are retained read-only for audit.
- A neutral INVALID verdict is a counted verdict, not a lost cell. At analysis time, an item whose replicates form no majority is reported as a visible no-valid-majority exclusion and leaves the headline agreement rate's denominator; the report will state the observed INVALID rate and discuss the excluded subset if it is material.
- The operational limitations disclosed in the superseded lock (the sub-second kill window in evaluation execution, the provenance of the crash-recovery evidence, companion evidence-arm records) are retained unchanged.

## Registration mechanics

- OpenTimestamps: calendar promises over the exact new run digest are journaled (anchor `18a34061bb1d7dce5ef8eab9e69371e9db4318909d065a955154f5115190d54d` pending); later Bitcoin confirmation is appended, never substituted.
- This amendment's commit is tagged and submitted to Software Heritage; the SWHID is appended when it resolves.

Nothing in the sealed freeze moves once judging starts.
