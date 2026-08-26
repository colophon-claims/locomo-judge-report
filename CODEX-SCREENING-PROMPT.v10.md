# Prompt-Driven Codex Screening Process-Audit Amendment, version 10

## Scope

Version 10 is an audit-only transport-framing correction. It does not rerun or
change any version 9 Luna, Terra, or Sol item judgment, routing decision,
operator decision, replacement, final-bank item, seed, or sample.

The version 9 process-audit input is retained exactly at SHA-256
`0c9aabdde110bf7facda82e345b44d3e31dfd9c71ffe610d58cbab764572894d`.
It contains only the sealed pre-human aggregate judgment state.

## Retained version 9 failure

The first version 9 attempt failed before model output because the provider
rejected a response-schema keyword. The one permitted identical-prompt retry
returned a canonical `PASS` object with zero material findings, but the pinned
Codex final-message transport omitted the terminal LF required by the frozen
version 9 parser. The parser therefore rejected it. That raw output is retained
and is not accepted, normalized, or reused.

## Version 10 audit gate

Run one fresh Sol `gpt-5.6-sol`, high-reasoning compact process audit over the
exact retained input. Use task ID `codexcli/v10-process-audit` and tool policy
`none`. Dispatch the exact bytes of
`CODEX-SCREENING-AUDIT-INSTRUCTION.v4.txt`, then the canonical invocation
binding line and the exact compact input.

The only method change is response framing: the final-message text must be one
canonical compact JSON object with no leading or trailing whitespace and no
terminal newline. The version 1 semantic schema remains unchanged. The version
2 transport parser adds one LF in memory only to reuse the frozen version 1
semantic validator; the recorded provider output bytes remain unchanged.

Only a parser-validated `PASS` with zero material findings passes. `FAIL`,
`REFUSE`, malformed bytes, any tool use, a stale invocation digest, or any
material finding stops admission. Permit one identical retry only for an
infrastructure failure with no model output. Never retry a semantic output.

This amendment does not authorize benchmark freeze or judge execution.
