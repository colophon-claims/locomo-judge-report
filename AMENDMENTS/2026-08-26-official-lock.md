# Official lock amendment, 2026-08-26

This append-only amendment records the exact Colophon lock and companion-module bytes for the LoCoMo judge report. It does not rewrite the reviewed and archived registration at `718f1d9da71717c4103113e381b870a9ba0d98ff`.

The final evidence-aware materialization adds the same authorized evidence excerpt used during review to every item byte. The candidate pool, committed seed, 72-item sample, screening outputs, Ritsu decisions, and deterministic replacements did not change.

- Umbrella lock digest: `sha256:c49041c6440857d32f1037ef427d24f9b280fb49741dacb14164bdb865e4e2d0`
- Colophon run digest: `sha256:1631869279d1822e4b45bb30062cdf7a7cf99243f104fe643572f45d2c96a845`
- Expected judge calls: 5,256 (4,320 main; 216 consistency gate; 720 corrupt-key check)
- State: locked and publicly registered; judging not launched
- OpenTimestamps: pending calendar promises over the exact Colophon run digest; later Bitcoin confirmation must be appended, never substituted

Nothing in the sealed freeze moves once judging starts.
