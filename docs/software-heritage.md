# Software Heritage procedure

This is a procedure only. This repository has not been archived or registered
with Software Heritage, and no archival identifier is claimed.

After a separately authorized public commitment:

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

No tag, archive action, or Software Heritage request is part of this scaffold.
