# Software Heritage record and procedure

The pre-outcome sampling commitment was archived successfully before real
screening continued. Software Heritage request `2451193` captured Git revision
`0c7c2415621bde7854229d7548982daff9aa0af5` and returned the resolving snapshot
SWHID `swh:1:snp:f8e4759c7f3ad04400cab799378ea05413ea0cee`.

The version 9 evidence-rescreen commitment was also archived before the
corrective screen. Its resolving snapshot SWHID is
`swh:1:snp:e9cdf0d5ce0da62d2d4ac87bef24e6bf632d5af7`.

The version 8 public summary contains a transcription error in its snapshot
SWHID. Its published bytes remain unchanged. The append-only correction is
recorded in
[`AMENDMENTS/2026-08-26-v8-swhid-correction.json`](../AMENDMENTS/2026-08-26-v8-swhid-correction.json).

For a later, separately authorized freeze:

1. Verify `MANIFEST.sha256` and the validation suite on the exact commit.
2. Push the commit to the public default branch without rewriting history.
3. Submit the public Git origin URL to Software Heritage Save Code Now. An
   exact commit URL is not itself the Save Code Now origin.
4. Wait for the visit to succeed, then capture the returned snapshot SWHID and
   visit record.
5. Resolve the exact committed Git revision from that archive and record its
   revision SWHID, alongside the snapshot SWHID and visit record, in a new
   append-only amendment.
6. Do not treat a request, queue entry, or unavailable service as archival
   completion.

This document records prior commitment archives only. It does not authorize or
claim a freeze archive.
