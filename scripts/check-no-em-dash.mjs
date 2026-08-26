import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const skipped = new Set(['.git', 'node_modules']);
const files = [];

function walk(path) {
  for (const entry of readdirSync(path)) {
    if (skipped.has(entry)) continue;
    const full = join(path, entry);
    if (statSync(full).isDirectory()) walk(full);
    else if (/\.(?:md|cff|json|txt|yml|yaml|mjs|js)$/u.test(entry) || entry === 'README' || entry === 'LICENSE') files.push(full);
  }
}

walk(root);
const prohibitedCharacter = String.fromCodePoint(0x2014);
// These two files are byte-exact, digest-addressed third-party judge instruments. Their quoted
// prompt bytes cannot be normalized without changing the public instrument identities.
const byteExactExceptions = new Set([
  join(root, 'records/official-lock-2026-08-26/instruments/backboard.json'),
  join(root, 'records/official-lock-2026-08-26/instruments/revised.json'),
]);
const offenders = files.filter((path) => !byteExactExceptions.has(path) && readFileSync(path, 'utf8').includes(prohibitedCharacter));
if (offenders.length > 0) throw new Error(`em dash is prohibited: ${offenders.join(', ')}`);
console.log(`no em dash in ${files.length} documentation files`);
