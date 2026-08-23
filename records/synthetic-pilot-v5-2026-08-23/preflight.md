# Process-v5 preflight

Status: **NON-CONFORMANT pre-dispatch stop**. Exact public main `29b6b23fbc1db832bbe09b0f8b39fa346306a341` was fetched live and the dedicated checkout was clean.

All documented validation succeeded before the stop:

- 82 manifest files validated.
- All documented specialized validators passed.
- The exact evidence-derived no-run fixture rendered to 11,825 of 65,536 bytes.
- The separate measurement-only 664-item capacity probe measured 42,754 bytes and was not used as audit evidence.
- The compact output schema, parser, policy, and executable gate validated.
- The complete test suite passed 94 of 94 tests.
- Documentation and Git diff checks passed; the public checkout remained clean.

## Fail-closed execution blocker

The public v5 renderer requires exactly 13 authenticated artifacts. Its thirteenth artifact is literally bound to the preserved v4 judgment prefix `sha256:db454100bc6bee6a740624583d6ea07c634c8711c8e49c840c23717d94e2478f`. From those exact artifacts it derives only `executionKind: validation-only-no-model-run`; the executable gate returns:

> acceptance: validation-only no-model input cannot satisfy process acceptance

Changing the prefix to fresh bytes returns:

> evidence.transcriptPrefixBytes: must match literal approved sha256:db454100bc6bee6a740624583d6ea07c634c8711c8e49c840c23717d94e2478f

Therefore a fresh recorded-model-run prefix cannot enter the public evidence-derived builder at this source revision. Reusing the approved prefix would reuse v4 output, explicitly forbidden by this authorization. No judgment or audit dispatch was made, no transcript was fabricated, and no source was changed.
