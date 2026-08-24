# Sampling commitment interface

The authorized LoCoMo screening commitment instance is under
[`commitments/locomo-screening-2026-08-24`](../commitments/locomo-screening-2026-08-24).
It contains 664 projected candidate identity digests, one seed, and the
deterministic 72-identity result. It is not a freeze or screening outcome.

The commitment instance uses the exact v1 schema
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

The candidate values are preparation-layer identity commitments, not source or
product item digests. For each private opaque identity, the public digest is
SHA-256 over the exact UTF-8 bytes `colophon-screening-identity/v1`, one null
byte, and the exact 32-character lowercase opaque ID. The projection script is
frozen and the private runner verifies a one-to-one join. Only projected
digests are public.

The sample procedure orders the 664 digests by HMAC-SHA-256 using the UTF-8
concatenation of `sampleSeed` and `poolDigest` as the key, with digest text as a
tie-breaker, and selects the first 72. Validate the complete record with:

```sh
node scripts/validate-real-sampling-commitment.mjs
```

The seed was drawn once with Python `secrets.token_hex(32)` at the recorded
time. No draw was discarded and no seed was rerolled. Publication proves the
committed seed, not that the operator did not test other seeds privately before
the recorded draw. This accepted benchmark limitation is disclosed here.
