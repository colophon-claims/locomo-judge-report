# Observable usage

Run: `prompted-screening-synthetic-pilot-v3-2026-08-23`

These are observable Codex session counters for the six judgment tasks and the independent process-audit task. They are not billing claims and do not prove immutable provider weights.

| Task | Model | Reasoning | Input | Cached input | Cache write | Output | Reasoning output | Total |
|---|---|---|---:|---:|---:|---:|---:|---:|
| `/root/synthetic_pilot_v3_coordinator/v3_luna_batch_1` | `gpt-5.6-luna` | `medium` | 19823 | 9984 | 0 | 1009 | 309 | 20832 |
| `/root/synthetic_pilot_v3_coordinator/v3_terra_batch_1` | `gpt-5.6-terra` | `high` | 20359 | 11008 | 0 | 604 | 133 | 20963 |
| `/root/synthetic_pilot_v3_coordinator/v3_terra_batch_2` | `gpt-5.6-terra` | `high` | 19920 | 18176 | 0 | 324 | 86 | 20244 |
| `/root/synthetic_pilot_v3_coordinator/v3_sol_batch_1` | `gpt-5.6-sol` | `high` | 19912 | 18176 | 0 | 317 | 76 | 20229 |
| `/root/synthetic_pilot_v3_coordinator/v3_sol_batch_2` | `gpt-5.6-sol` | `high` | 19899 | 11008 | 0 | 313 | 74 | 20212 |
| `/root/synthetic_pilot_v3_coordinator/v3_sol_batch_3` | `gpt-5.6-sol` | `high` | 19918 | 18176 | 0 | 302 | 64 | 20220 |
| `/root/synthetic_pilot_v3_coordinator/v3_process_audit` | `gpt-5.6-sol` | `high` | 450974 | 401408 | 0 | 13173 | 3970 | 464147 |
| **Total** |  |  | **570805** | **487936** | **0** | **16042** | **4712** | **586847** |

Judgment-agent tool calls: **0**. Infrastructure failures: **0**. Retries: **0**.
