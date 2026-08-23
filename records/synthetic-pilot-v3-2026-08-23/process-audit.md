## Process audit: PASS

Run: `prompted-screening-synthetic-pilot-v3-2026-08-23`

### Checked identities

- Repository: `https://github.com/colophon-claims/locomo-judge-report`
- Local `HEAD` and `origin/main`: `525664b724fe23c001199ba45910fd75ebb524f6`
- Checkout clean before and after audit.
- Source SHA-256 identities matched exactly:
  - Prompt: `4d409331adf7b98877dd0e377d99291ccd59b4fa78e01e97b574009de27f427b`
  - Instruction: `339c4f8286a476036ea3fce40fa5f517376908ee503ed2e21aeb03e47f920837`
  - Fixture: `09411e91bb467ecf9881998118c898766d77242556b45f49ae7238aa28d1283b`
  - Renderer: `31f21fd042a211939e2c40b3fe38c1fb60fc8016289409bba669702648afe5cd`
- Transcript: exactly 14 LF-terminated records, 59,310 bytes, SHA-256 `9c49c0aa7c69b42243a1bb5f411b19b4b8d70a02abf42022c779272888e80bbd`.

| Batch | Task/session | Items | Blinded / dispatch / raw-output SHA-256 |
|---|---|---:|---|
| Luna 1 | `/root/synthetic_pilot_v3_coordinator/v3_luna_batch_1` · `01a02daf-7d17-7312-9bf4-d3eb752b2572` | 24 | `617cbe958935dbde12d5856c565a1229f002fba8c04c25086fb22e1b3f2f3e84` / `8ce5cbdb40679791f2358138a11c1b620eb990725c608c6a8d1011cfbcac1dee` / `c9df3b5bab76437b2c4a923eb51ce2b49b07cf773ffe06ee83c9c056676b8203` |
| Terra 1 | `/root/synthetic_pilot_v3_coordinator/v3_terra_batch_1` · `01a02db0-67ca-76f0-8d6b-82ad3c2dcc71` | 16 | `12b974a6df0b6b7050535d6a76812148562fcc1b61db344e19872c6285135af1` / `402bf0b2feb0e9b9b45669bb9afb043ed3695ee47f5716ee9c53a35f4d72b061` / `ecb613c64a161cf20dc5584e7c625b9ca5d54e49318e622b6ccb6fb22f00e2cc` |
| Terra 2 | `/root/synthetic_pilot_v3_coordinator/v3_terra_batch_2` · `01a02db0-f83b-7391-bcb3-08a2bac14be3` | 8 | `6a5a0a45a4e31374b616b077205eafd6ccca12a1ef7bfe69118847eed98fc55c` / `5a02eab0ce7fe6aa0630e710ecbeb8c5dee0eacf5a1237cd5edbc0fbbcad1ed5` / `bd53d056c18dc005f8a760af4351fcdfd79263e46b254d4b1463930fd8de9a20` |
| Sol 1 | `/root/synthetic_pilot_v3_coordinator/v3_sol_batch_1` · `01a02db1-7963-75c2-8609-8f596a200e97` | 8 | `439bae1e466b99165a931609aa2f4f481e1f5d06e20f1d680dac572d7afe5d53` / `6fca0446d05038b30eb1bf2ebb1d0a54277a220f7c9bb9846440932ffe29cf00` / `8cf36c70dc8000d98bdecf5c9f417f38c08bebe6d48ccfb6d5b6d65e68a68897` |
| Sol 2 | `/root/synthetic_pilot_v3_coordinator/v3_sol_batch_2` · `01a02db2-0224-7d23-8a37-a0599ecbe598` | 8 | `531ba914b90aefe528b7728e4bf28dcc322146e10831d8c2e570c4e534e06421` / `22dc0984d7ed0f3ee6f0eb945aa449560b8f83f7676d8eb8d04781406093dcd0` / `2ae7207e4d584416ccfc9630d3c6138584bed0d5e6a0c5d05ecafe94bbf3e2b6` |
| Sol 3 | `/root/synthetic_pilot_v3_coordinator/v3_sol_batch_3` · `01a02db2-84c9-7073-adb0-094eada831aa` | 8 | `6a5a0a45a4e31374b616b077205eafd6ccca12a1ef7bfe69118847eed98fc55c` / `5a02eab0ce7fe6aa0630e710ecbeb8c5dee0eacf5a1237cd5edbc0fbbcad1ed5` / `bd53d056c18dc005f8a760af4351fcdfd79263e46b254d4b1463930fd8de9a20` |

### Findings

- Public v3 renderer validation, its nine focused tests, and the complete public validator passed under declared Node `v20.10.0`.
- All decoded dispatches exactly matched independent public-renderer reconstruction: exact instruction prefix, canonical blinded JSON, and final LF.
- Each blinded object had only canonical keys `candidateAnswer,itemId,question,referenceAnswer`. No instance-level outer identity, label/class/stratum, routing/order metadata, prior output, or Ritsu decision was present. Generic prohibitions appear only in the fixed instruction text.
- Luna, Terra, and Sol each traversed all 24 lowercase opaque 128-bit IDs exactly once and in the supplied fixed order.
- All 72 raw outputs matched their hashes and parsed records exactly. Key order, IDs, verdict alphabet, compact encoding, and final LF were valid.
- Zero missing, extra, duplicate, reordered, malformed, annotated, or invalid outputs; zero `UNSURE`; zero infrastructure failures; zero retries; zero judgment-agent tool calls.
- Observable usage was present and internally consistent: 119,831 input, 86,528 cached input, 0 cache-write input, 2,869 output, 742 reasoning-output, and 122,700 total tokens.
- The procedure assigns Luna as load-bearing and Terra/Sol as review-only evidence. No post-judgment comparison occurred in this audited prefix.
- The declaration confirms synthetic-only, permanently excluded operation with no real candidates or LoCoMo bytes, seed, commitment, SWH/freeze, payment, push, PR, site mutation, prior-output reuse, or Ritsu decisions.

I made **zero item judgments**, performed **zero intended-label comparisons**, replaced **zero outputs or verdicts**, and made **zero Ritsu decisions**. I did not append to or edit the transcript.

---

Audit task: `/root/synthetic_pilot_v3_coordinator/v3_process_audit`  
Model declaration: `gpt-5.6-sol`, reasoning `high`  
Audit input judgment-prefix digest: `sha256:9c49c0aa7c69b42243a1bb5f411b19b4b8d70a02abf42022c779272888e80bbd`  
Raw audit output digest: `sha256:b37c1f73556e7edf5c786e10ccf0a1f117aee456a84ce32210e8d3970dbf05cf`  
Bound audit-event digest: `sha256:61246be9c37164c4bd774963d89b0cdec06d1856f8d8a3882a890844013edbb2`  
Intended-label comparison occurred only after this audit. The final transcript digest is `sha256:ab9ada61e1311127ffe6b607e23740fc807f14830b5cd7eaa17db8914dd81ad3`.
