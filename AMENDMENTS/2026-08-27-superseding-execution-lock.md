# Superseding execution lock amendment, 2026-08-27

This append-only amendment supersedes the 2026-08-26 official lock's execution commitment. It does not rewrite the reviewed and archived registration, the 2026-08-26 freeze, or the original lock record; all remain visible under their tags. The scientific inputs are unchanged: the 240-item bank, its source manifest, the admission evidence, the human review decisions, the deterministic replacements, the six arm prompts and their cited sources, the dated subject model `gpt-4o-mini-2024-07-18`, three replicates, and the analysis plan are byte-identical to the frozen materials. Bank continuity is provable: the itemBank, sourceManifest, admissionIndex, admissionManifest, and replacementLedger digests are all identical to the 2026-08-26 bank, and all 240 task payloads including evidence are byte-identical. Every task document differs from its frozen counterpart in exactly one field, the EvaluationSpec parser version.

## Why this amendment exists

1. The 2026-08-26 lock (run digest `sha256:1631869279d1822e4b45bb30062cdf7a7cf99243f104fe643572f45d2c96a845`) was launched once. The attempt was aborted after 13 paid calls: a stale compiled parser dependency rejected every delivered response, and stopping the run exposed a restart-recovery defect. None of the 13 calls' outputs enter any result.
2. An 18-call synthetic canary then returned 9 of 18 judgments parser-invalid. The dated model wraps its verdict JSON in Markdown code fences; three frozen arms parsed the entire response as bare JSON, and the frozen policy converted invalid output to REJECT. Running unchanged would have produced false rejections of correct answers while making wrong answers look correctly rejected.
3. The corrected execution stack is public and reviewable as pull requests #3009, #3029, #3047, #3059, #3068, and #3073 on Jinn-Network/mono, merged at commit `50ec0aa28cf81efed68d27e91cb9f4e3b5f35cad`:
   - Version 2.0.0 response parsers accept one exact optional Markdown fence around otherwise-exact JSON. Genuinely unparseable output records a neutral INVALID instead of REJECT (parser-invalid policy `abstain`). Two matching valid votes still form a majority; a one-one split plus an invalid is unresolved and visibly reported as a no-valid-majority exclusion. Version 1 parsers and all previously published bundles are byte-preserved.
   - Bounded parallel execution (launch concurrency 8) with crash recovery on both execution legs: interrupted work resumes with byte-exact submission replay, and a run that suffered a live process kill with three evaluation legs in flight recovered and published artifacts byte-identical to an uninterrupted derivation.
   - Verdicts disclose the policy-matched evaluation-method digest, and recovered runs publish correctly.

## Canary evidence

Two paid synthetic canaries (18 calls each) plus zero-cost replay experiments on the exact revision, all preserved:

- 18 of 18 cells accounted, 18 of 18 parser-valid, with 9 of 18 live responses genuinely Markdown-fenced: the exact form the frozen parsers rejected.
- Zero infrastructure failures, zero duplicate provider responses; sustained 8-wide judge-call concurrency.
- Three result bundles cold-verified 6 of 6 checks each by the standalone verifier after the originating workspace was deleted; 11 of 11 adversarial tamper variants rejected.
- A live SIGKILL with three evaluation legs open, followed by resume: 18 of 18 verdicts, zero lost, zero duplicated, published artifacts byte-identical to the uninterrupted derivation.
- Measured rate 8.05 s/cell single-task and 7.95 s/cell across three distinct tasks; task count does not change throughput.

The canary revision and the locked revision have byte-identical `packages/benchmark-product`, `packages/task-execution`, and `packages/benchmarking` source trees.

## The superseding lock

- Benchmark digest: `sha256:88cec5abe4511b4a558881dadf274b78f255f0277fddd06bd90143a5ae7c2e82`
- Colophon run digest: `sha256:6f50c521671c7c988476493ef844bc1ab555d87a89acfe42d0696a82bd200290`
- Expected judge calls: 5,256 (4,320 main; 216 consistency gate; 720 corrupt-key check)
- Close: 48 hours from lock (`2026-08-29T10:28:37.672Z`). The original 4-hour window was impossible against the measured rate; 48 hours carries roughly four times the measured full-run duration including a crash-recovery cycle.
- Completeness floor: 0.995, changed from 1. Since the neutral-INVALID policy, response-content failures produce counted INVALID verdicts rather than missing cells; a cell can now be lost only to an infrastructure fault, which cannot depend on what a response said. The floor change is therefore tolerance for a content-blind mechanism, bounded at 21 of 4,320 cells. Every missing cell must be individually disclosed with its journal evidence and shown infrastructure-caused; achieved completeness is reported as-is.
- All other policy fields are unchanged from the frozen draft: replicates 3, cell window 3,600,000 ms, replacement disallowed, direct-check assurance with one infrastructure retry, self-run venue, OCI container isolation. The two remaining digest changes (evaluation selection manifest, benchmark digest) are the mechanical consequences of the version-2 arms and the abstain EvaluationSpec.
- Companion freezes rebuilt against the version-2 arms, changing only arm instrument digests: consistency gate `sha256:57bde7abd217361a8e9e909ac8a7379e513c7d1d24f3643476e3016f582dcba0` (12 items, 216 calls), corrupt-key check `sha256:7ef34b1794ef7744e58b1d839b640439b93ae9fe0e6e34db0bfbd0258253e4a7` (20 items, 720 calls). Under the neutral policy a companion call can abstain rather than being coerced to REJECT; whether abstentions remain in a rate's denominator is an analysis-time reporting choice that will be stated in the report.

## Disclosed operational provenance and limitations

- Execution is launched with concurrency 8 (a launch argument, not a lock field). The engine serializes the local verdict-sealing step, so effective throughput is about 8 s/cell regardless of task count; the judge calls themselves run concurrently. This affects duration only, never content.
- A process kill landing inside the sub-second evaluation-execution window (Jinn-Network/mono issue #3069) may still lose that cell's verdict. The run is supervised under a no-deliberate-interruption rule; any unplanned interruption is disclosed with its journal evidence.
- The crash-recovery evidence was obtained by a live kill during a resume driving replayed evaluation legs, and separately by the aborted first attempt's recovered deliveries; a kill during original paid execution traverses the same code paths but was not separately staged.
- The companion evidence-arm limitation from the original freeze is retained: companion records lacking evidence fail visibly and are not amended.
- The first execution attempt (13 calls) and both failed canaries are preserved and disclosed; no output from any of them enters any result.

## Registration mechanics

- OpenTimestamps: calendar promises over the exact superseding run digest; later Bitcoin confirmation is appended, never substituted.
- This amendment's commit is tagged and submitted to Software Heritage; the SWHID is appended when it resolves.

Nothing in the sealed freeze moves once judging starts.
