# Judging the LoCoMo judges

## A controlled benchmark of the grading prompts behind published LoCoMo scores

LoCoMo is a benchmark for long-term conversational memory. Its published scores are
often produced with an LLM judge: a model reads a question, a reference answer, and a
candidate answer, then decides whether the candidate should count as correct.

The problem is that there is no single LoCoMo LLM judge. Different published results
use different judge prompts, models, and inputs, then place the resulting scores next
to one another as though the grading instrument had stayed fixed.

This benchmark measures how much that choice matters. Six grading configurations
judged the same 240 answers on the same model snapshot. The configurations varied the
judge prompt; one paired configuration also varied whether the judge received source
evidence. Two companion tests examined consistency and behavior when the official
answer key is wrong.

**The central finding is simple: changing only the grader moved agreement with the
same correctness labels from 60.8% to 87.9%.** Every grader was much more likely to
accept a vague, on-topic wrong answer than a specific wrong answer. Three of five
graders were internally inconsistent on list-answer cases involving subsets and
supersets. When the answer key was wrong, graders followed the broken key against a
true answer between 10% and 70% of the time.

The spread caused by changing the grader was 27.1 percentage points on the same
answers. That is larger than many of the differences used to compare memory systems.
Two scores produced by different graders are measurements from different instruments.
Their numerical difference cannot be attributed to the memory systems alone.

This is a benchmark of graders, not memory systems. It does not rank or re-score any
memory product, and it cannot establish which published system is better.

## The five questions and their answers

These questions were published in the
[experiment design](https://github.com/snap-research/locomo/issues/23#issuecomment-5334425775)
before the benchmark ran.

| Question | Answer |
| --- | --- |
| 1. How often does each judge accept a known-wrong answer, and does the type of wrong answer matter? | A great deal. Acceptance ranged from 2.5% to 28.8% for specific wrong answers and from 32.5% to 88.8% for vague, on-topic wrong answers. Every judge was substantially more forgiving of vagueness. |
| 2. What does a stricter judge cost in rejected right answers? | Very little when the reference answer is correct. Across 479 scored right answers, there was one rejection. The tradeoff appears when the reference answer itself is wrong. |
| 3. Does changing the grader change the LoCoMo score? | Yes. On identical answers, agreement with the labels ranged from 60.8% to 87.9% depending only on the grader. |
| 4. Does showing the judge the source evidence matter? | Yes. In this setup, evidence made the judge more permissive, not more accurate. The evidence-fed configuration accepted 7.7 percentage points more answers overall, with nearly all of the increase coming from vague wrong answers. Its overall agreement was lower, not higher. |
| 5. When the answer key is wrong, does the judge follow the key or the truth? | It depends on the grader. Against a true answer, broken-key following ranged from 10% to 70%. Every grader accepted all 20 true answers once the key was corrected. |

A separate consistency test found that three of five applicable graders did not treat
equivalent list-answer cases consistently.

## Results

### 1. Acceptance of known-wrong answers

The main bank contained 80 specific wrong answers and 80 vague, on-topic wrong
answers. Each percentage below is based on the majority of three grading calls.
Intervals are 95% Wilson intervals.

| Judge configuration | Specific wrong accepted | Vague wrong accepted | Correct rejected |
| --- | --- | --- | --- |
| strict-dial | 2/80, 2.5% (0.7 to 8.7) | 26/80, 32.5% (23.2 to 43.4) | 1/80, 1.3% (0.2 to 6.8) |
| audited | 9/80, 11.3% (6.0 to 20.0) | 34/80, 42.5% (32.3 to 53.4) | 0/80, 0% (0 to 4.6) |
| mem0 | 10/80, 12.5% (6.9 to 21.5) | 42/80, 52.5% (41.7 to 63.1) | 0/80, 0% (0 to 4.6) |
| mem0-evidence | 11/76, 14.5% (8.3 to 24.1) | 59/78, 75.6% (65.1 to 83.8) | 0/79, 0% (0 to 4.6) |
| backboard | 14/80, 17.5% (10.7 to 27.3) | 62/80, 77.5% (67.2 to 85.3) | 0/80, 0% (0 to 4.6) |
| revised | 23/80, 28.8% (20.0 to 39.5) | 71/80, 88.8% (80.0 to 94.0) | 0/80, 0% (0 to 4.6) |

The pattern previously reported by the community audit reproduced on this bank. The
audited configuration accepted 11.3% of specific wrong answers and 42.5% of vague
wrong answers. The audit had reported 10.61% and 62.81% on its own material. The
direction reproduced, while the magnitude for vague answers was lower on this sample.

This result applies to the bank and configurations tested here. It does not establish
that every published LoCoMo score contains the same bias.

### 2. Rejection of right answers and repeat stability

Five configurations accepted every scored right answer. The strict-dial configuration
rejected one of 80. Across the panel, that is one rejection among 479 scored right
answers.

The three repeated calls were unanimous on 1,410 of 1,433 scored item-configuration
pairs. Twenty-three pairs, 1.6%, had at least one call disagree with the others. The
largest per-configuration repeat-disagreement rate was 7/240, or 2.9%.

Within one configuration, repeated grading at temperature zero was comparatively
stable. The larger source of variation was the choice of grader.

### 3. Agreement varies by grader

The table below summarizes agreement with the correctness labels across right, specific
wrong, and vague wrong answers. It is useful for showing the size of the grader effect,
not for ranking vendors or memory systems.

| Judge configuration | Agreement | 95% interval |
| --- | --- | --- |
| strict-dial | 211/240 (87.9%) | 83.2 to 91.5 |
| audited | 197/240 (82.1%) | 76.7 to 86.4 |
| mem0 | 188/240 (78.3%) | 72.7 to 83.1 |
| mem0-evidence | 163/233 (70.0%) | 63.8 to 75.5 |
| backboard | 164/240 (68.3%) | 62.2 to 73.9 |
| revised | 146/240 (60.8%) | 54.5 to 66.8 |

Across all 15 pairs of graders, the most divergent pair disagreed on 67 of 240
answers. The closest pair disagreed on 11. No pair produced a formally conflicted
comparison.

The ordering of neighboring configurations is not established where intervals
overlap. The important result is the overall spread on identical inputs.

### 4. Effect of adding evidence

This comparison holds the Mem0 prompt fixed and changes only whether the judge sees
the dataset's source evidence. Seven evidence-fed items had no valid majority, leaving
233 paired items.

| Slice | Change in acceptance with evidence | 95% interval |
| --- | --- | --- |
| All paired items | +7.7 points | +4.3 to +11.2 |
| Vague wrong answers | +21.8 points | +12.8 to +30.8 |
| Specific wrong answers | +1.3 points | 0.0 to +4.0 |
| Right answers | 0.0 points | 0.0 to 0.0 |

The positive sign means the evidence-fed configuration accepted more answers. Because
the increase is concentrated in answers labeled wrong, it is not an improvement in
agreement.

### 5. Behavior when the answer key is wrong

The corrupt-key test used 20 questions whose official LoCoMo answers had been
identified as wrong by the community audit. For each question, a true candidate answer
was graded twice: once against the broken official key and once against the corrected
key. Each rate is the majority of three calls.

| Judge configuration | Follows broken key against true answer | 95% interval | Accepts with corrected key |
| --- | --- | --- | --- |
| revised | 2/20 (10%) | 3 to 30 | 20/20 |
| backboard | 8/20 (40%) | 22 to 61 | 20/20 |
| mem0-evidence | 11/20 (55%) | 34 to 74 | 20/20 |
| audited | 12/20 (60%) | 39 to 78 | 20/20 |
| mem0 | 12/20 (60%) | 39 to 78 | 20/20 |
| strict-dial | 14/20 (70%) | 48 to 85 | 20/20 |

The key was the only changed input. With the corrected key, all six configurations
accepted all 20 true answers. Showing source evidence barely changed broken-key
following: 12/20 for Mem0 without evidence and 11/20 with evidence.

### Consistency test

The test used 12 list-answer probes: six subset cases and six superset cases. It
included the four examples that opened the public LoCoMo discussion. The evidence-fed
configuration was not applicable because these constructed probes have no dataset
evidence to provide.

| Judge configuration | Subset probes | Superset probes | Result |
| --- | --- | --- | --- |
| mem0 | 6 accept | 6 accept | Uniform |
| revised | 6 accept | 6 accept | Uniform |
| audited | 5 accept, 1 reject | 6 accept | Inconsistent |
| backboard | 5 accept, 1 reject | 6 accept | Inconsistent |
| strict-dial | 3 accept, 3 reject | 5 accept, 1 reject | Inconsistent on both operations |

The two configurations that passed did so by accepting every probe. The configuration
with the highest agreement on the main bank failed on both operations. Consistency and
agreement measure different properties.

## Recommendations

### What these results imply for future LoCoMo judging

1. **Fix the answer keys first, then be strict.** Strictness was nearly free when the
   key was right: across the whole panel, there was one false rejection in 479 scored
   right answers. The material downside appeared under broken keys, where the
   strictest grader followed the key against a true answer 70% of the time. A stricter
   judge only helps when the answer key is reliable. A future benchmark should adopt
   the audit's corrected keys, after checking them, so that a strict judge loses almost
   all of its observed downside.

2. **Treat vague-answer acceptance as an underspecified task, not a model limit.**
   Every grader was nearly perfect on right answers and much weaker on vague, on-topic
   answers. Even the strictest configuration accepted 32.5% of them. The prompts do
   not define what answering requires precisely enough. The structural fix to test is
   to make the judge first identify the exact value the answer gives for the requested
   fact, then compare that value with the reference. An answer that gives no value
   would fail by rule, not by judgment. The strictest prompt's lead is consistent with
   this account because it forces the answer to make a commitment.

3. **Give the judge a third verdict when the reference appears wrong.** Every grader
   accepted all 20 true answers once the key was corrected. On these items, the graders
   could recognize the true answer but rejected it under a broken key because the
   instructions told them to compare against that key. A candidate that contradicts
   the reference but appears well-grounded should become a separately counted,
   reviewable outcome rather than a rejection.

4. **Include cases that should be rejected in the consistency test.** The two graders
   that passed this run's test did so by accepting every probe, while the grader with
   the highest agreement on the main bank failed both tested operations. As designed,
   the test cannot separate consistency from indiscriminate leniency. A replacement
   set must include probes where rejection is the consistent answer.

5. **Spend the next evaluation resources on items and key auditing, not more repeated
   calls.** Repeat disagreement was 1.6% overall and 2.9% at worst, against a 27.1-point
   grader effect. On this bank and model snapshot, more items and better keys are likely
   to buy more measurement quality than more calls per item.

6. **Force evidence through the grading task instead of offering it as context.**
   Adding evidence to a prompt that did not require comparison made the judge accept
   7.7 percentage points more answers, with nearly all of the increase coming from
   wrong answers, and lowered agreement from 78.3% to 70.0%. Simply adding evidence
   changed the score even though the grading instructions stayed the same. A reference
   judge should specify how evidence must be used rather than merely placing it in the
   prompt.

Together, these results support one versioned reference judge for LoCoMo, run over
audited answer keys. It should first identify the exact fact an answer commits to and
then compare that fact with the reference. It should also allow a third, reviewable
verdict when the reference appears wrong. Before adoption, it should be tested for
false acceptance by wrong-answer class, false rejection, repeat stability,
consistency on both accept and reject cases, and behavior under broken keys. Results
produced by another judge should use the disclosure standard below.

These proposed changes require a follow-up experiment. This run did not test the new
comparison task or the third verdict. It used one model snapshot and one diagnostic
bank.

### Until then: comparing and publishing scores today

For people comparing benchmark results:

- Do not compare LoCoMo scores unless the grading configuration is the same or the
  difference is explicitly modeled.
- Ask for the judge model, judge prompt, parser, aggregation rule, and whether the
  judge received source evidence.
- Look for separate false-accept rates for specific wrong and vague wrong answers.
  A pooled rate conceals a major behavior difference.
- Treat small score gaps cautiously when the grader effect can be much larger than the
  reported gap.

For people publishing LoCoMo results, mark an unknown choice as not reported rather
than omitting or inferring it. Publish the parser behavior, repeated-call aggregation
rule, and treatment of invalid or missing outputs as well as the judge model, prompt,
and input shape.

The disclosure standard below makes that comparison discipline explicit.

## The disclosure standard this benchmark supports

A LoCoMo score is not fully specified by the memory system's name and final
percentage. It is the product of an answer pipeline and a grading pipeline. A
comparable result must disclose the six choices that define those pipelines.

### The six variables

| Variable | What it describes |
| --- | --- |
| Ingestion model | What reads the source conversation and builds the memory or index |
| Retrieval configuration | How information is selected, including search strategy, depth, and limits |
| Answer model | What produces the candidate answer |
| Answer prompt | The instructions under which the candidate answer is produced |
| Judge model | What grades the candidate against the reference answer |
| Judge prompt | The grading instructions and the complete input shown to the judge |

Whether the judge receives source evidence belongs in the judge-prompt entry because
it changes the judge's input. Parser behavior and repeated-call aggregation should be
reported alongside the judge configuration.

### Three ways to report each variable

Each of the six variables must have one of three states:

| State shown in a report | Meaning |
| --- | --- |
| Measured in this benchmark | The experiment fixed and recorded the variable itself |
| Reported by the publisher | The publisher stated the choice, but this experiment did not measure or independently establish it |
| Not reported | The choice is unknown, not stated, or not applicable |

Unknown information must be reported as not reported, not omitted or inferred from a
repository name, model family, or surrounding context. Evidence belongs only with a
choice measured in the benchmark. A publisher statement may be cited, but it should
not be presented as an independent measurement.

### Why the benchmark supports this standard

This benchmark directly measures the importance of the grading variables. Holding the
answer bank and judge model fixed while changing the judge prompt moved agreement from
60.8% to 87.9%. Holding the Mem0 prompt family fixed while adding source evidence
changed acceptance by 7.7 percentage points. The judge prompt and the judge's input
therefore change the meaning of the resulting score.

The experiment did not vary the first four variables. They still need disclosure
because they determine which candidate answers reach the grader. Without them, a
reader cannot distinguish a memory-system effect from a retrieval, generation, or
answer-style effect. The benchmark establishes the grader side of the problem; the
complete reporting standard covers the whole measurement pipeline.

**A LoCoMo score without all six entries is an incompletely described measurement.
Scores produced under different disclosed configurations should not be treated as
directly comparable.**

### This report's disclosure

| Variable | State | Declaration |
| --- | --- | --- |
| Ingestion model | Not reported | The published source materials do not identify what produced the upstream memories or indexes |
| Retrieval configuration | Not reported | The published source materials do not identify the retrieval settings used upstream |
| Answer model | Not reported | The candidate-answer files do not identify the model that wrote every answer |
| Answer prompt | Not reported | The candidate-answer files do not identify the complete answering instructions |
| Judge model | Measured in this benchmark | All grading calls used `gpt-4o-mini-2024-07-18` at temperature zero |
| Judge prompt | Measured in this benchmark | The six grading configurations and their input shapes were fixed and recorded by this benchmark |

Four entries are marked not reported. That is the honest description of a grader
benchmark that used candidate answers produced elsewhere. This report makes no claim
about upstream choices that its source materials cannot establish.

Colophon defines these same six fields in a machine-readable disclosure format. This
report's evidence package predates that format, so the declaration above is published
with the report rather than inside the verified package.

## How the benchmark was run

### Benchmark bank

The main benchmark used 240 candidate answers from published LoCoMo audit materials,
balanced across three classes and four LoCoMo question categories:

| Candidate class | Definition | Count |
| --- | --- | --- |
| Correct | A factually correct answer | 80 |
| Specific wrong | A plausible answer that commits to a specific incorrect fact | 80 |
| Vague wrong | An answer that stays on topic but avoids or fudges the requested fact | 80 |

The two wrong classes were analyzed separately throughout. Category 5, adversarial
unanswerable questions, was outside scope.

The candidate pool contained 664 items. It was screened against the question,
reference answer, and dataset evidence. The operator hand-reviewed 255 items selected
from flagged cases and a preselected sample. The process excluded 137 candidates,
including 52 from the initial main-bank selection, and replaced them while preserving
the final 80/80/80 class balance and equal category balance. Labels are therefore
screened and sampled, not equivalent to independent annotation by two human raters.

### Grading configurations

The panel used judge prompts already present in the LoCoMo ecosystem or community
discussion:

| Configuration | Description |
| --- | --- |
| audited | The EverMemOS-derived prompt reconstructed in the community audit |
| backboard | Backboard's posted prompt |
| mem0 | Mem0's posted prompt |
| strict-dial | The stricter community variant posted by @dial481 |
| revised | The successor rubric from mem0ai/memory-benchmarks |
| mem0-evidence | The Mem0 prompt with the dataset's source evidence added |

All six used `gpt-4o-mini-2024-07-18` at temperature zero. Each answer was graded
three times under each configuration. The final verdict was the majority of those
three calls. The main run contained 240 items x 6 configurations x 3 calls, or 4,320
grading calls.

Responses that could not be parsed were treated as neither correct nor incorrect.
Twenty-two of 4,320 calls were unparseable, all in the evidence-fed configuration.
Seven evidence-fed items consequently had no valid majority and appear as explicit
exclusions. A sensitivity check found that accepting the well-formed verdict behind
the explanatory preamble would move that configuration's agreement from 70.0% to
70.4%, within its interval. The sensitivity check is not reported as a benchmark
result.

### Companion tests

The consistency test used 12 probes, five applicable configurations, and three calls
per probe, for 180 calls. The corrupt-key test used 20 questions, two key conditions,
six configurations, and three calls, for 720 calls. Both completed without lost cells.

The companion fixtures in the original experiment package could not execute because
one configuration required an evidence field those fixtures did not contain. They
were not silently repaired. The results in this report come from successor companion
tests with documented designs and source data. This distinction affects provenance,
not the main 4,320-call comparison.

### Analysis

The item was the unit of analysis. False-accept rates were calculated separately for
the two wrong-answer classes. False-reject rates used the correct-answer class. Rates
use 95% Wilson intervals. The evidence contrast used a paired bootstrap over the 233
items with valid majorities in both configurations. Pairwise disagreement was computed
on identical items.

### Run completeness

All 4,320 planned judge calls completed. Twenty-two responses could not be parsed,
which excluded seven evidence-fed items from that comparison. Across repeated calls,
23 of 1,433 scored item-configuration pairs had at least one call disagree with the
others. The main run and both companion tests completed without lost calls.

## What this benchmark does not establish

- It does not evaluate or rank memory systems.
- It tests one dated judge-model snapshot on a balanced 240-answer diagnostic bank.
  Rates may differ on another model, snapshot, or answer distribution.
- The correctness labels were model-screened and selectively reviewed by the authors,
  not independently labelled by multiple human annotators.
- The 20 broken-key items and 12 consistency probes demonstrate mechanisms; they do
  not estimate how common those problems are in ordinary benchmark runs.
- The authors operated the experiment themselves. Colophon verifies the published
  files and their internal consistency, but not the provider's internal execution or
  the authors' organizational independence.

## Data and verification

Download the full result data, grading outputs, prompts, and analysis files from the
published evidence package. Colophon packages these materials and checks that the
files used by this report have not changed since publication.

File verification confirms the integrity of the published materials. It does not
prove that the correctness labels are right or independently verify the model
provider's internal execution. Independent timestamping is pending.

### Technical verification details

The SHA-256 identifiers below allow an exact file-level comparison with the published
package.

Main benchmark:

- Run: `481c9680e005eb7814f7120a56ef2242ba8167802571416ec363f6a743a6730e`
- Benchmark: `9ae50617f9112b750518c04309b96648207f6d0e17ba044a077d0d5185b84c9e`
- Result matrix: `04de526b99dfa7180c875108101eaacbdfabe9a50a90ef317eca4c879ce1eb35`
- Machine report: `7869bab3a30defb29f171d7f572e68020edca789cfa7695ebe0a4621a9be5edd`
- Current bundle: `de169c04a24bbb4d9d5b52e398b8bfe92e939ba4d8a8c9e6e3e551cf10aa3774`

Consistency test:

- Run: `06ae9e458b12562015296228297828e22f291ec0c73ec6833eec4288f0511be6`
- Result matrix: `aaeddc612a8625d598ccce4ffa03318ed546cce3854912244baa4cce91a79d60`
- Current bundle: `d1535f32bfa850f2e5ecedcae4be97e17e6dedff37aebe412f2ef6d36fc6a404`

Corrupt-key test:

- Run: `bdc3b0e2ac4c22e9a859b5879118af7df3939ad4501ea3afd4c8ede0770e509d`
- Result matrix: `2a788dc9cdcaa53260dac8b0f7728d3bfd62aac24ccfcbaddc213fa0729ea2d7`
- Current bundle: `271f87db4e616992dea75483ec69e92624ab7fc84aeb32e6a0bc82674dc506ed`

Each bundle was verified from outside the workspace that produced it, and every tested
tamper variant was rejected.

## Materials, credit, and license

This benchmark builds on the published materials in
[dial481/locomo-audit](https://github.com/dial481/locomo-audit), with the author's
stated permission, and on judge prompts posted by Backboard, Mem0, and community
contributors in the
[LoCoMo discussion](https://github.com/snap-research/locomo/issues/23). The audited
judge prompt derives from [EverMemOS](https://github.com/EverMind-AI/EverMemOS), and
the revised rubric from
[mem0ai/memory-benchmarks](https://github.com/mem0ai/memory-benchmarks), both under
Apache-2.0. The consistency examples originated with @AnitaLeungxx, and the strict
variant and audit materials with @dial481.

The underlying dataset is [LoCoMo](https://github.com/snap-research/locomo). LoCoMo
and the audit annotations are CC BY-NC 4.0. This report and the selected derived
materials are released under the same non-commercial license, with source pointers
rather than full conversation data.
