# Append-only mechanical correction

This note does not alter `process-audit.md`, the raw Sol audit output embedded
in the transcript, or any other preserved version 4 pilot byte. The pilot
remains `NON-CONFORMANT / PROCESS_AUDIT_MATERIAL_FLAG`, is not an acceptance
candidate, is not approved or reusable, and records zero Ritsu decisions.

The mechanical note in `process-audit.md` says the matching Terra batch 2 and
Sol batch 3 verdict arrays were "independently returned" and the dispatches
were "fresh." The preserved evidence supports only this narrower statement:
the two outputs are recorded under distinct task names, declared model and
reasoning profiles, dispatch events, and output events, and their ordered raw
output content bytes are identical. The preserved evidence does not prove
provider execution, process freshness, independent generation, model routing,
prompt compliance, or invariant model weights.

The three equal content identities are mechanically resolvable. The batches
contain the same ordered blinded subset bytes, the same exact judgment
instruction plus that subset, and the same ordered verdict bytes. Content
digest equality alone is not evidence of artifact reuse. The distinct sealed
transcript event identities prove only that separate dispatch and output events
were recorded.

For this synthetic pilot, the fixed 24-item fixture is the entire population
and all 24 items were dispatched in deterministic fixture order to each stage.
No sampling occurred. Null `samplingCommitmentSha256` and
`samplingScriptSha256` values are required for this source kind and do not show
that an artifact is missing. A real-screening source kind requires both exact
identities.

Perfect three-stage agreement remains an auditable observation. It may be
non-material for a deliberately clear, permanently excluded synthetic fixture,
but no agreement count proves independent generation or makes the pilot
accepted. A material process-defect flag must cite a contradiction in supplied
sealed and machine-validated evidence. Absence of proof at the declared
provider capability boundary is not itself such a contradiction.

The raw version 4 audit returned `qualified-pass` and one material flag. The
strict gate requires unqualified `PASS` and zero material process-defect flags.
This append-only clarification cannot change that returned result, so the
version 4 run remains nonconformant.
