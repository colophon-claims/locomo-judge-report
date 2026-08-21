# Sampling commitment interface

This repository publishes only the schema and validator interface for a future
sampling commitment. It contains no commitment values, seed, candidate pool,
sampling output, or freeze record.

When separately authorized, a commitment instance must validate against
`schemas/sampling-commitment.schema.json` and be added through the append-only
policy. Validation is available with:

```sh
node scripts/validate-sampling-commitment.mjs path/to/commitment.json
```

The command has no default input and does not create, publish, or authorize a
commitment.
