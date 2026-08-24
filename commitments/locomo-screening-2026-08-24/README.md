# LoCoMo screening sampling commitment

Status: prepared for publication, not frozen, and no real screening outcomes
observed.

The canonical files are:

- `sampling-commitment.json`: the v1 commitment containing the exact 664
  public identity digests, one seed, sample size 72, and frozen sampling-script
  digest.
- `candidate-identity-digests.json`: the same sorted, unique 664-digest pool.
- `sampling-output.json`: the complete deterministic HMAC order and first 72
  selected digests.
- `commitment-event.json`: generation facts, process-v7 identities, artifact
  bindings, and the zero-outcome boundary.

The pool digest is
`sha256:34b8cbe099124eb6182e7e2d894381d75fba9fde1d8e54abd0c957b937c9aba6`.
The canonical 72-item sample digest is
`sha256:618ad7d857a5783e5c0b0ffaede0fa1fdaf34eda4a50be9eddc869d7e6786e51`.

No question, reference answer, candidate answer, source identity, class,
stratum, main/reserve status, private path, source item digest, product item
digest, or raw opaque ID appears here. The private runner alone holds the
one-to-one projection join required to route the selected identities.

This commitment does not freeze or launch the benchmark. Publication and
Software Heritage archival remain separate gates.
