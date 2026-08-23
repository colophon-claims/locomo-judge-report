# Observable usage

This local record reports only values observable through the coordinator and production recorder. Provider token counts, billing, cost, immutable model weights, and provider-side execution logs were not surfaced and are not inferred.

## Dispatches

| Task ID | Canonical collaboration task | Profile | Items | Dispatch bytes | Dispatch SHA-256 | Output bytes | Output SHA-256 | Tools | Failures | Retries | Tokens |
| --- | --- | --- | ---: | ---: | --- | ---: | --- | ---: | ---: | ---: | --- |
| `v6_luna_batch_1` | `/root/synthetic_pilot_v3_coordinator/v6_luna_batch_1` | `gpt-5.6-luna`, medium | 24 | 6,502 | `8ce5cbdb40679791f2358138a11c1b620eb990725c608c6a8d1011cfbcac1dee` | 1,554 | `c9df3b5bab76437b2c4a923eb51ce2b49b07cf773ffe06ee83c9c056676b8203` | 0 | 0 | 0 | not surfaced |
| `v6_terra_batch_1` | `/root/synthetic_pilot_v3_coordinator/v6_terra_batch_1` | `gpt-5.6-terra`, high | 16 | 4,742 | `402bf0b2feb0e9b9b45669bb9afb043ed3695ee47f5716ee9c53a35f4d72b061` | 1,038 | `ecb613c64a161cf20dc5584e7c625b9ca5d54e49318e622b6ccb6fb22f00e2cc` | 0 | 0 | 0 | not surfaced |
| `v6_terra_batch_2` | `/root/synthetic_pilot_v3_coordinator/v6_terra_batch_2` | `gpt-5.6-terra`, high | 8 | 3,087 | `5a02eab0ce7fe6aa0630e710ecbeb8c5dee0eacf5a1237cd5edbc0fbbcad1ed5` | 518 | `bd53d056c18dc005f8a760af4351fcdfd79263e46b254d4b1463930fd8de9a20` | 0 | 0 | 0 | not surfaced |
| `v6_sol_batch_1` | `/root/synthetic_pilot_v3_coordinator/v6_sol_batch_1` | `gpt-5.6-sol`, high | 8 | 3,043 | `6fca0446d05038b30eb1bf2ebb1d0a54277a220f7c9bb9846440932ffe29cf00` | 518 | `8cf36c70dc8000d98bdecf5c9f417f38c08bebe6d48ccfb6d5b6d65e68a68897` | 0 | 0 | 0 | not surfaced |
| `v6_sol_batch_2` | `/root/synthetic_pilot_v3_coordinator/v6_sol_batch_2` | `gpt-5.6-sol`, high | 8 | 3,026 | `22dc0984d7ed0f3ee6f0eb945aa449560b8f83f7676d8eb8d04781406093dcd0` | 522 | `2ae7207e4d584416ccfc9630d3c6138584bed0d5e6a0c5d05ecafe94bbf3e2b6` | 0 | 0 | 0 | not surfaced |
| `v6_sol_batch_3` | `/root/synthetic_pilot_v3_coordinator/v6_sol_batch_3` | `gpt-5.6-sol`, high | 8 | 3,087 | `5a02eab0ce7fe6aa0630e710ecbeb8c5dee0eacf5a1237cd5edbc0fbbcad1ed5` | 518 | `bd53d056c18dc005f8a760af4351fcdfd79263e46b254d4b1463930fd8de9a20` | 0 | 0 | 0 | not surfaced |
| `v6_process_audit` | `/root/synthetic_pilot_v3_coordinator/v6_process_audit` | `gpt-5.6-sol`, high | process only | 14,519 | `f8bfd11d2d0c5b0aebfe05eccc48a0b8c602adac2d51615c3a19c0f464ba40f9` | 1,408 | `59dd7e04b5b4a307b72a2bd97390fe647ecb32c881b1cc628222f84f3a578898` | 0 | 0 | 0 | not surfaced |

## Totals

- Fresh judgment dispatches: 6
- Fresh process-audit dispatches: 1
- Judgment batches: 24 / 16 / 8 / 8 / 8 / 8
- Judgment records: 72
- Infrastructure failures: 0
- Retries: 0
- Judgment and audit agent tool calls: 0
- Input, output, and total token counts: not surfaced
- Provider billing or cost: not surfaced and not inferred
- Terminal result: `NON_CONFORMANT` because the exact audit output failed the closed v2 parser

## Preflight

The exact public source revision and clean Git object verification passed. All documented validators passed, and the full test suite passed 112/112. The documented v6 simulation was executed only as a preflight validator; its test-only output did not enter this production-recording state.
