# Sampling commitment interface

This repository publishes only the schema and validator interface for a future
sampling commitment. It contains no real or operator commitment values, seed,
candidate pool, sampling output, or freeze record. Clearly named synthetic
test fixtures may exercise the validator and are not a commitment or freeze.

When separately authorized, a commitment instance must use the exact v1 schema
identifier and provide a sorted, unique list of candidate item digests, the
product-defined pool digest, a nonempty sample seed, a sample size no larger
than that list, a sampling-script digest, and a commit time. The validator
recomputes the pool digest as `sha256:` plus the SHA-256 of the canonical JSON
bytes of the digest list. The instance must be canonical JSON with no extra
properties and must be added through the append-only policy. Validation is
available with:

```sh
node scripts/validate-sampling-commitment.mjs path/to/commitment.json
```

The command has no default input and does not create, publish, or authorize a
commitment.
