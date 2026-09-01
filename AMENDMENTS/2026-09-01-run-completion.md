# Run completion amendment, 2026-09-01

This append-only amendment reports the execution and completion of the benchmark
committed by the 2026-08-27 superseding execution lock and its successor, and closes
the registration trail for the published report. Nothing sealed moved after judging
started. Earlier registrations remain visible under their tags.

## The second stopped attempt and the second superseding lock

The 2026-08-27 superseding lock (run digest
`sha256:6f50c521671c7c988476493ef844bc1ab555d87a89acfe42d0696a82bd200290`) was
launched once, at 2026-08-27T11:26Z, and deliberately stopped at 2026-08-27T13:17Z
after 550 of the 4,320 main cells' judge calls. One judge response arrived as prose
followed by a fenced JSON verdict. Under the sealed version-2 grammar that response
correctly parses as invalid, but the sealed abstain evaluation specification never
declared the recorded-inconclusive machinery the execution platform requires before it
will accept a neutral verdict, so the platform refused the delivery and recorded that
cell as permanently ungradable. That is a response-content-driven loss, which the
registered completeness-floor justification excludes, so the run was unpublishable and
was stopped. 548 verdicts had been delivered; every response and journal entry is
preserved; no output from the attempt enters any result.

The correction is public as Jinn-Network/mono pull request #3078, merged at commit
`7e92c8aa4d9d379ed67932258d8b4a910968ec7e` after independent review: the abstain
evaluation specification now declares what its own sealed parser-semantics document
has promised since sealing. The parser identity in every verdict's method descriptor
is unchanged and the scoring semantics did not change. The re-lock is the second
superseding lock, registered under tag
`locomo-judge-report-second-superseding-lock-2026-08-27`:

- Benchmark digest: `sha256:9ae50617f9112b750518c04309b96648207f6d0e17ba044a077d0d5185b84c9e`
- Colophon run digest: `sha256:481c9680e005eb7814f7120a56ef2242ba8167802571416ec363f6a743a6730e`
- All scientific inputs byte-identical to the superseded lock; the only lock-input
  deltas were the completed abstain evaluation specifications and a fresh
  snapshot-serving probe. The OpenTimestamps anchor over the lock
  (`18a34061bb1d7dce5ef8eab9e69371e9db4318909d065a955154f5115190d54d`) was journaled
  before launch; its Bitcoin confirmation is appended when the calendars mature.

## Pre-launch verification, and the defect it caught

The corrected stack passed a pre-launch canary that included wrong-answer items, a
deterministic replay of the preserved refusing response through production delivery
and aggregation, an interrupt-and-resume cycle, cold verification, and an adversarial
tamper matrix. The first canary round was deliberately failed and the relaunch blocked
on a real defect it found: a process kill landing in the sub-second window between a
cell's delivered event and its delivery journal record left that cell unrecoverable by
the public operations and deadlocked collection until the close boundary. The fix is
public as Jinn-Network/mono pull request #3083, merged at commit
`09560a713820e5e4799c2c2dee79760dcd1a411f` after independent review; recovery now
heals such a cell from its surviving sealed artifacts byte-exactly. The re-canary's
kill then landed inside that same window by chance, and the heal was proven live
before any paid relaunch call.

## The run

Launched 2026-08-27T20:58:41Z, completed 2026-08-28T12:53:43Z: 15 hours 55 minutes,
4,320 of 4,320 cells judged, zero lost cells, zero crashes, zero resumes.
Completeness 4,320/4,320 against the registered 0.995 floor; the floor's
infrastructure-only justification was never invoked. Result matrix
`sha256:04de526b99dfa7180c875108101eaacbdfabe9a50a90ef317eca4c879ce1eb35`, primary
report `sha256:7869bab3a30defb29f171d7f572e68020edca789cfa7695ebe0a4621a9be5edd`,
canonical bundle
`sha256:de169c04a24bbb4d9d5b52e398b8bfe92e939ba4d8a8c9e6e3e551cf10aa3774`
(public-bundle/7), with two companion analysis bundles
(`sha256:871f78c83aebbe4a96ab731415f4bceb70774f8688810a3c575cfb66f340e7be` pairwise
disagreement, `sha256:2e8beba8ff198233b6007acb3a8390b1c67f8b84cb50e5b8f64d97969c2afec4`
paired majority delta). All three verified from outside the producing workspace on
every check their format declares, with every tested tamper variant refused. Judge
cost, self-reported: 2,255,959 tokens across 4,320 calls, approximately $0.39.

One further defect was found and fixed after completion, in publication packaging
rather than in any result: the anchored claim closure predated the qualification
projection the primary method emits, so report production refused. The fix is public
as Jinn-Network/mono pull request #3212, merged at commit
`82ed51d33d53b56b61636c8cb87b7ce34366a1f3` after independent review. The re-run
primary report was byte-identical to the record the refusal had orphaned, which is
itself evidence the repair never touched a result. During the same period a
third-party dependency published a new minor version mid-day and briefly broke an
unrelated merge gate; it is noted here only because two public merge-queue ejections
trace to it.

## Companion modules

The consistency gate and corrupt-key check registered with the original freeze were
never executable: one of the six graders is defined by reading an evidence field the
frozen companion items do not carry, and the refusing enforcement predates the freeze
itself. They are disclosed as never executable rather than amended.

Successors were designed in the open and run after the main result, with the ordering
disclosed: decisions written down and sealed before each lock, each lock
OpenTimestamps-anchored before launch, evidence extracted mechanically from
digest-pinned source files. Consistency gate: run digest
`sha256:06ae9e458b12562015296228297828e22f291ec0c73ec6833eec4288f0511be6`, matrix
`sha256:aaeddc612a8625d598ccce4ffa03318ed546cce3854912244baa4cce91a79d60`, bundle
`sha256:d1535f32bfa850f2e5ecedcae4be97e17e6dedff37aebe412f2ef6d36fc6a404`, anchor
`752d9b9218488530823095e47857942be65f04e7edd92e63c6aa994c5d68bb49`, 180 of 180 cells.
Corrupt-key check: run digest
`sha256:bdc3b0e2ac4c22e9a859b5879118af7df3939ad4501ea3afd4c8ede0770e509d`, matrix
`sha256:2a788dc9cdcaa53260dac8b0f7728d3bfd62aac24ccfcbaddc213fa0729ea2d7`, bundle
`sha256:271f87db4e616992dea75483ec69e92624ab7fc84aeb32e6a0bc82674dc506ed`, anchor
`c9a3e7f1bed16d92300451fc6eee3195deccba5770dbb1303a305f5a89860074`, 720 of 720 cells.
Both bundles cold-verified with every tamper variant refused. Results are sections 8
and 9 of the published report.

## A drafting error, disclosed

During report drafting, the paired majority delta between the mem0 and mem0-evidence
configurations was misread as an agreement improvement. It is an acceptance delta:
evidence made the judge more permissive, not more accurate. The sealed numbers were
always correct; the error existed only in draft prose, was caught by the operator's
review before publication, and the published report states the corrected reading
everywhere. It is disclosed here because this benchmark argues for exactly that
discipline.

## Publication

The report is published in this repository as `REPORT.md` and rendered at
https://colophon-claims-site.vercel.app/reports/locomo-judge-report/ beside a
byte-exact copy of the canonical bundle. The rendered page's narrative was supplied at
publication rather than sealed in the bundle, and the page says so; the bundle is the
artifact the run produced, with nothing added. The evidence bundles publish as release
assets under the delivery tag alongside this amendment. The standalone verifier that
reads these bundle formats publishes to npm as `@colophon-claims/verify` 0.2.1; until
that version is live, the reader resolvable from npm refuses these formats with a
version-mismatch error that the repository documentation explains.

## Registration mechanics

This amendment's commit is tagged and submitted to Software Heritage; the SWHID is
appended when it resolves. The three pending OpenTimestamps anchors receive their
Bitcoin confirmations by append, never substitution.
