# Judging the LoCoMo judges

This repository contains the report, frozen inputs, evidence records, and public
verification trail for a controlled benchmark of the LLM graders used with LoCoMo.

Six grading configurations judged the same 240 candidate answers. Changing only the
grader moved agreement with the same correctness labels from **60.8% to 87.9%**.
Every grader was also much more likely to accept a vague, on-topic wrong answer than a
specific wrong answer.

**[Read the report](REPORT.md)**
· **[Download the evidence bundles](https://github.com/colophon-claims/locomo-judge-report/releases/tag/locomo-judge-report-run-completion-2026-09-01)**

This is a benchmark of graders, not memory systems. It does not rank or re-score any
memory product, and it cannot establish which published system is better.

## What the benchmark found

- **Grader choice materially changes the score.** Agreement on identical answers
  ranged from 60.8% to 87.9%, a spread of 27.1 percentage points.
- **Vague wrong answers are the main weakness.** Specific wrong answers were accepted
  2.5% to 28.8% of the time; vague, on-topic wrong answers were accepted 32.5% to
  88.8% of the time.
- **Adding evidence did not improve agreement in the tested setup.** It increased
  acceptance by 7.7 percentage points, almost entirely by accepting more wrong
  answers.
- **A bad answer key can defeat a strict grader.** Against a true answer, graders
  followed a broken key between 10% and 70% of the time. All accepted the same answers
  once the keys were corrected.
- **Consistency and accuracy are separate properties.** Three of five applicable
  graders treated equivalent list-answer cases inconsistently.

The report gives the complete results, uncertainty intervals, limitations, disclosure
standard, and recommendations.

## Start here

| If you want to… | Open… |
| --- | --- |
| Understand the findings | [REPORT.md](REPORT.md) |
| Download the exact result data | The [run-completion release](https://github.com/colophon-claims/locomo-judge-report/releases/tag/locomo-judge-report-run-completion-2026-09-01) |
| See what was fixed before and during execution | [The run-completion record](AMENDMENTS/2026-09-01-run-completion.md) |
| Inspect the 240-answer bank and its selection trail | [The evidence-aware screening record](records/real-run-v9-2026-08-25/README.md) |
| Inspect the frozen experiment design | [The official lock](records/official-lock-2026-08-26/) |
| Trace source provenance and licensing | [source-register.json](source-register.json), [ATTRIBUTION.md](ATTRIBUTION.md), and [LICENSES](LICENSES/) |
| Re-run the repository checks | [Verify this repository](#verify-this-repository) |

## Experiment at a glance

| Module | What it tested | Size | Status |
| --- | --- | ---: | --- |
| Main benchmark | Six grading configurations on the same balanced answer bank | 240 answers, 4,320 judge calls | 4,320/4,320 complete |
| Consistency test | Equivalent subset and superset list answers | 12 probes, 180 judge calls | 180/180 complete |
| Corrupt-key test | True answers graded against broken and corrected references | 20 questions, 720 judge calls | 720/720 complete |

Each cell in these counts was graded three times and reduced by majority verdict. The
main run used one dated judge-model snapshot and fixed settings. See the
[method section](REPORT.md#how-the-benchmark-was-run) for the complete design and the
[limitations in the report](REPORT.md) for what the design
cannot establish.

## How the repository is organized

The repository keeps reader-facing conclusions separate from the records that make
those conclusions auditable.

| Path | Purpose | Reader status |
| --- | --- | --- |
| [`REPORT.md`](REPORT.md) | Published benchmark report | Start here |
| [`records/official-lock-2026-08-26/`](records/official-lock-2026-08-26/) | Frozen benchmark design, instruments, selection, and run specification | Scientific input |
| [`records/real-run-v8-2026-08-24/`](records/real-run-v8-2026-08-24/) | Original candidate-screening record and exact source rows | Input-construction evidence |
| [`records/real-run-v9-2026-08-25/`](records/real-run-v9-2026-08-25/) | Evidence-aware corrective screening, final bank, operator decisions, and signed admission records | Canonical input-construction record |
| [`records/real-run-v10-audit-2026-08-26/`](records/real-run-v10-audit-2026-08-26/) | Audit-only transport correction; no screening or human decision changed | Process evidence |
| [`commitments/`](commitments/) | Pre-outcome commitments and deterministic sampling records | Registration evidence |
| [`AMENDMENTS/`](AMENDMENTS/) | Append-only corrections, superseding locks, and completion record | Chronology and disclosure |
| [`CODEX-SCREENING-PROMPT.v*.md`](CODEX-SCREENING-PROMPT.v10.md) | Preserved versions of the screening procedure | Historical process source |
| [`fixtures/`](fixtures/) and [`records/synthetic-*`](records/) | Test-only pilots used to harden the procedure | Not benchmark results |
| [`scripts/`](scripts/) and [`test/`](test/) | Validators, renderers, and automated checks | Verification tooling |

The many versioned prompts and stopped synthetic pilots are deliberately retained.
They show how the procedure changed and which failures were rejected; they are not
additional benchmark results and should not be combined with the published run.

## The evidence bundles

The Git repository records the design, input construction, and append-only history.
The exact result bundles are attached to the
[run-completion release](https://github.com/colophon-claims/locomo-judge-report/releases/tag/locomo-judge-report-run-completion-2026-09-01).

The primary canonical bundle has this identity:

```text
sha256:de169c04a24bbb4d9d5b52e398b8bfe92e939ba4d8a8c9e6e3e551cf10aa3774
```

The release also contains the pairwise-disagreement and paired-majority analyses, plus
the canonical bundles and additional analyses for both companion tests. Each archive
unpacks to a directory named by the identity of the bundle it contains.

`ARCHIVE-DIGESTS.sha256` verifies the downloaded archives. The identity above verifies
the canonical bundle itself; the archive checksum only verifies the transport file.

## How integrity is preserved

The benchmark evidence is protected at several levels:

1. **The bundle is content-addressed.** Changing a byte changes its SHA-256 identity.
2. **The completed repository state is tagged.** The tag
   [`locomo-judge-report-run-completion-2026-09-01`](https://github.com/colophon-claims/locomo-judge-report/tree/locomo-judge-report-run-completion-2026-09-01)
   preserves the report, registration trail, and repository manifest at publication.
3. **Every tracked file is listed in [`MANIFEST.sha256`](MANIFEST.sha256).** The local
   validator recomputes the manifest and rejects additions, removals, or changed bytes
   that have not been explicitly registered.
4. **Corrections are append-only.** A correction adds a dated record and, where
   necessary, a superseding lock. Earlier records and tags remain available.
5. **External anchors are recorded.** The registration trail includes Software
   Heritage identifiers and OpenTimestamps records where available.

Reader-facing documentation may be clarified after publication. That does not rewrite
the tagged completion state or change a result bundle's content identity. The current
manifest is updated whenever current documentation changes; the manifest stored at
each historical tag remains unchanged.

## Verify this repository

Clone the repository and check out the publication tag:

```sh
git clone https://github.com/colophon-claims/locomo-judge-report.git
cd locomo-judge-report
git checkout locomo-judge-report-run-completion-2026-09-01
node scripts/validate.mjs
node --test test/*.test.mjs
```

The first command checks the registered paths, file boundaries, source commitments,
real-screening records, and complete SHA-256 manifest. The test suite exercises the
validators, renderers, recorder behavior, sampling logic, and preserved pilot states.

To verify downloaded release archives, place the archives and
`ARCHIVE-DIGESTS.sha256` in the same directory, then run:

```sh
shasum -a 256 -c ARCHIVE-DIGESTS.sha256
```

## What Colophon verification does and does not establish

The records verify the supplied bytes, commitments, deterministic selection and
replacement rules, signatures, run completeness, and internal relationships declared
by the published formats.

They do not prove provider-side model execution, immutable weights behind a mutable
model name, organizational independence, or that a model followed instructions except
through the observable outputs. The report's [limitations](REPORT.md)
state the full boundary.

## Citation, attribution, and contributions

- Citation metadata: [CITATION.cff](CITATION.cff)
- Source and license boundary: [ATTRIBUTION.md](ATTRIBUTION.md)
- Third-party notices: [LICENSES/THIRD-PARTY-NOTICES.md](LICENSES/THIRD-PARTY-NOTICES.md)
- Contribution and append-only amendment policy: [CONTRIBUTING.md](CONTRIBUTING.md)

Colophon-authored material is licensed under CC BY-NC 4.0. Third-party material
retains its recorded terms.
