# Process audit

Status: **NON-CONFORMANT / PROCESS_AUDIT_MATERIAL_FLAG**. The separate fresh Sol-high audit returned `qualified-pass`, not an unqualified PASS, and included a high-severity process-defect flag. The strict acceptance criterion “compact audit PASS with no material issue” therefore failed. No rerun or semantic repair was attempted.

Audit input: 9,159 bytes; `sha256:ff9736b1444d5c70561fbbd15ff9e7066621b88821f2da5ba3f08055bd9da597`. Sealed judgment prefix: 48,646 bytes; `sha256:db454100bc6bee6a740624583d6ea07c634c8711c8e49c840c23717d94e2478f`.

## Raw process-audit output

```json
{
  "protocol": "prompted-codex-screening-compact-process-audit/v1",
  "overallAssessment": "qualified-pass",
  "coverage": {
    "status": "pass",
    "findings": [
      "All 24 items received exactly one judgment from each of Luna, Terra, and Sol: 72 judgments total.",
      "Batch counts, limits, and totals match the declarations: Luna 1x24, Terra 16+8, Sol 8+8+8.",
      "The 12 class-by-stratum cells contain 2 items each and sum to 24.",
      "No missing, extra, duplicate, invalid, retried, or infrastructure-failed judgments are reported.",
      "Stage and batch verdict totals reconcile exactly with the aggregate and cell totals."
    ]
  },
  "declarationDrift": {
    "status": "pass",
    "findings": [
      "Declared model aliases, reasoning levels, batch counts, and batch limits are internally consistent with the recorded execution summary.",
      "The reported zero judgment-agent tool calls is consistent with an evaluation workflow requiring no tools.",
      "All batch-level machine-validation flags are true and all batch error lists are empty."
    ]
  },
  "suspiciousAgreement": {
    "status": "flag",
    "severity": "medium",
    "findings": [
      "All 24 items have three-stage agreement, with zero disagreements and zero unsure verdicts.",
      "Each stage has the identical 8-correct/16-wrong distribution.",
      "Agreement is perfectly class-conditioned in the summary: every item labeled candidateClass=correct received three correct verdicts, while every item in either wrong candidate class received three wrong verdicts.",
      "This may be expected for a deliberately clear synthetic fixture, but the canonical summary alone cannot establish independent judgment behavior."
    ]
  },
  "crossStageAsymmetry": {
    "status": "pass-with-observation",
    "findings": [
      "No verdict asymmetry appears across stages or strata.",
      "Context exposure differs by declared batching scheme (24-item, 16/8-item, and 8-item batches), so absence of any resulting disagreement is notable but not itself a protocol violation."
    ]
  },
  "processDefects": {
    "status": "flag",
    "severity": "high",
    "findings": [
      "Terra batch 2 and Sol batch 3 carry the same complete digest triple despite being distinct stage executions. Shared input-content hashes may be expected for the same eight-item subset, but identical output/transcript-related hashes would indicate artifact reuse or non-independent execution. The positional summary does not name the three digest fields, so this must be resolved by the later verifier against the published schema and artifacts.",
      "samplingCommitmentSha256 and samplingScriptSha256 are null. The fixed synthetic fixture digest preserves pool identity, but public reconstruction of how the 24 items were selected is not demonstrated unless the published procedure itself fully specifies deterministic selection."
    ],
    "requiredVerification": [
      "Resolve the three batch digest fields and determine whether the Terra-2/Sol-3 equality is limited to stage-agnostic canonical content or includes independently generated outputs/transcripts.",
      "Verify that each stage artifact was independently produced under its declared model and reasoning configuration.",
      "Confirm that the published screening procedure deterministically defines selection from the fixture; otherwise disclose the missing sampling commitment/script as a reproducibility limitation."
    ]
  },
  "auditBoundary": "No item-level judgment was reperformed; conclusions use only the supplied canonical summary, validation flags, counts, declarations, and digests."
}
```

## Mechanical verifier notes

The Terra-2/Sol-3 digest equality resolves mechanically to identical stage-agnostic blinded item bytes, identical deterministic dispatch bytes, and independently returned but byte-identical verdict arrays. The task names and fresh dispatches were distinct; no prior output was reused. The synthetic contract also requires null sampling commitment and sampling script identities, so those nulls are not a protocol breach. These resolutions do not rewrite the auditor’s returned assessment or erase its high-severity flag; the run remains nonconformant under the strict acceptance criterion.

No item judgment, replacement verdict, or Ritsu decision was made by the audit.
