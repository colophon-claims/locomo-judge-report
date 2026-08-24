#!/usr/bin/env python3
"""Independent Python implementation of the frozen `screening-sample/1` procedure.

Input is one canonical JSON object on stdin with exactly `itemSha256s`,
`sampleSeed`, and `sampleSize`. Output is one canonical JSON object containing
`poolDigest`, the full HMAC order, and `sample`, followed by one LF byte.
This script never creates a seed.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import re
import sys
from typing import Any


DIGEST = re.compile(r"sha256:[0-9a-f]{64}")


def canonical(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def refuse(detail: str) -> None:
    raise ValueError(f"screening-sample/1 refused: {detail}")


def compute(item_sha256s: list[str], sample_seed: str, sample_size: int) -> dict[str, Any]:
    if not isinstance(item_sha256s, list) or not item_sha256s:
        refuse("itemSha256s must be a nonempty array")
    if any(not isinstance(value, str) or DIGEST.fullmatch(value) is None for value in item_sha256s):
        refuse("every itemSha256 must be sha256-prefixed lowercase hexadecimal")
    if len(set(item_sha256s)) != len(item_sha256s):
        refuse("itemSha256s must be unique")
    if not isinstance(sample_seed, str) or not sample_seed:
        refuse("sampleSeed must be nonempty")
    if not isinstance(sample_size, int) or isinstance(sample_size, bool) or sample_size < 1 or sample_size > len(item_sha256s):
        refuse("sampleSize must be a positive integer no larger than the pool")
    sorted_unique = sorted(set(item_sha256s))
    pool_digest = "sha256:" + hashlib.sha256(canonical(sorted_unique).encode("utf-8")).hexdigest()
    key = f"{sample_seed}{pool_digest}".encode("utf-8")
    order = sorted(item_sha256s, key=lambda value: (hmac.new(key, value.encode("utf-8"), hashlib.sha256).digest(), value))
    return {"poolDigest": pool_digest, "order": order, "sample": order[:sample_size]}


def main() -> int:
    raw = sys.stdin.buffer.read()
    try:
        value = json.loads(raw)
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        print(f"screening-sample/1 refused: input must be UTF-8 JSON: {error}", file=sys.stderr)
        return 1
    try:
        if raw != (canonical(value) + "\n").encode("utf-8") or not isinstance(value, dict) or set(value) != {"itemSha256s", "sampleSeed", "sampleSize"}:
            refuse("input must be one canonical closed JSON object followed by LF")
        result = compute(value["itemSha256s"], value["sampleSeed"], value["sampleSize"])
    except ValueError as error:
        print(str(error), file=sys.stderr)
        return 1
    sys.stdout.buffer.write((canonical(result) + "\n").encode("utf-8"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
