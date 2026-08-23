# Observable usage

Run status: **NON-CONFORMANT** because the compact process audit returned `qualified-pass` with a high-severity process-defect flag. No rerun or repair was attempted.

| Dispatch | Task name | Model | Reasoning | Batch size | Tool calls | Input tokens | Output tokens | Total tokens | Failure | Retry |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|
| Luna 1/1 | `/root/synthetic_pilot_v3_coordinator/v4_luna_batch_1` | `gpt-5.6-luna` | medium | 24 | 0 | not surfaced | not surfaced | not surfaced | 0 | 0 |
| Terra 1/2 | `/root/synthetic_pilot_v3_coordinator/v4_terra_batch_1` | `gpt-5.6-terra` | high | 16 | 0 | not surfaced | not surfaced | not surfaced | 0 | 0 |
| Terra 2/2 | `/root/synthetic_pilot_v3_coordinator/v4_terra_batch_2` | `gpt-5.6-terra` | high | 8 | 0 | not surfaced | not surfaced | not surfaced | 0 | 0 |
| Sol 1/3 | `/root/synthetic_pilot_v3_coordinator/v4_sol_batch_1` | `gpt-5.6-sol` | high | 8 | 0 | not surfaced | not surfaced | not surfaced | 0 | 0 |
| Sol 2/3 | `/root/synthetic_pilot_v3_coordinator/v4_sol_batch_2` | `gpt-5.6-sol` | high | 8 | 0 | not surfaced | not surfaced | not surfaced | 0 | 0 |
| Sol 3/3 | `/root/synthetic_pilot_v3_coordinator/v4_sol_batch_3` | `gpt-5.6-sol` | high | 8 | 0 | not surfaced | not surfaced | not surfaced | 0 | 0 |
| Process audit | `/root/synthetic_pilot_v3_coordinator/v4_process_audit` | `gpt-5.6-sol` | high | 9,159 bytes | 0 | not surfaced | not surfaced | not surfaced | 0 | 0 |

Totals: 7 dispatches, 6 judgment batches, 72 judgments, 0 visible tool calls, 0 failures, 0 retries. The compact audit input was exactly 9,159 bytes, below the 65,536-byte cap. Provider billing, cost, cached tokens, reasoning tokens, and immutable model weights were not surfaced and are not inferred.
