# Process-v6 synthetic pilot audit record

Status: **NON-CONFORMANT**

The fresh Sol-high process auditor returned a claimed `PASS`, but the production recorder rejected the exact raw output before creating an audit event. The closed v2 parser error was:

`auditOutput: must be the exact closed bound version 2 output`

The returned object nested the invocation under `invocation` and omitted required closed-root v2 fields, including the flattened binding fields, material and non-material counts, `processDefects`, `suspiciousAgreement`, and `capabilityBoundary`. This is an output-contract failure. The claimed assessment is therefore not a policy PASS and cannot be used to finalize the run.

No retry or repair was attempted. No `09-audit-output.json`, `10-finalization.json`, 18-event final transcript, mechanical intended-label comparison event, or terminal event exists. No Ritsu decision was made.

## Bound audit evidence

| Field | Exact value |
| --- | --- |
| Audit task | `v6_process_audit` |
| Model | `gpt-5.6-sol` |
| Reasoning | `high` |
| Tool policy / observed calls | `none` / `0` |
| Compact input bytes | `12,252` |
| Compact input SHA-256 | `16a00ab2eb6408ab888280e6d0dd95676441bed75b53ac0e7d42e11aec943f1c` |
| Exact audit dispatch bytes | `14,519` |
| Exact audit dispatch SHA-256 | `f8bfd11d2d0c5b0aebfe05eccc48a0b8c602adac2d51615c3a19c0f464ba40f9` |
| Rejected raw output bytes | `1,408` |
| Rejected raw output SHA-256 | `59dd7e04b5b4a307b72a2bd97390fe647ecb32c881b1cc628222f84f3a578898` |
| Infrastructure failures / retries | `0` / `0` |

## Preserved judgment evidence

The production recorder sealed exactly 14 judgment-prefix events before the audit. The prefix is 46,185 bytes with SHA-256 `d9c54b48aeb7504c75d6f76be8bbd7f95e6aa482780e364a1ba79ef3353567d9`.

Runtime replay derived 72 judgments over 24 fixed synthetic items: each stage recorded 8 `CORRECT`, 16 `WRONG`, and 0 `UNSURE`; all 24 items had three-stage agreement. Missing, extra, duplicate, invalid, infrastructure-failure, retry, and judgment-tool counts were all zero.

These green judgment facts do not cure the audit-output contract failure. The run is not an acceptance candidate and is not admission eligible.
