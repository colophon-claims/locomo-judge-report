# Contribution and amendment policy

The sole repository operator is `ritsukai`. Contributions are proposed through
pull requests and must preserve the preparation-only boundary in README.md.

## Before a commitment

Metadata corrections may be made in normal commits. They must not add prompt
bytes, conversations, audit data, seeds, candidate pools, screening outputs,
results, or a sampling commitment instance.

## After a commitment

Once a sampling commitment is published, amendments are append-only. Do not
rewrite or delete a commitment, manifest line, source-register entry, or
notice that was part of that commitment. Add a dated superseding entry that
identifies the prior content and explains the correction. The original bytes
remain available for verification.

An amendment must not imply that a new freeze occurred. A real freeze requires
separate operator authorization and a documented commitment event.
