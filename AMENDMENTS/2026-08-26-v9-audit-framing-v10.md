# Version 10 process-audit framing correction

The registered version 9 process audit ended non-conformant because its semantic
`PASS` final-message text had no terminal LF. This is the same pinned Codex
final-message transport behavior previously encountered for judgment outputs.

Before any version 10 model output, this amendment registers a fresh audit-only
pass over the exact retained version 9 compact input. Version 10 changes only
the audit response framing contract from canonical JSON plus LF to canonical
final-message text without LF. The semantic schema, Sol model, high reasoning,
zero-tool policy, process checks, and strict PASS-with-zero-findings gate are
unchanged.

The version 9 attempts remain public. Their observed output is not reused.
Version 10 does not reopen screening or human review and does not authorize a
benchmark freeze or paid judge run.
