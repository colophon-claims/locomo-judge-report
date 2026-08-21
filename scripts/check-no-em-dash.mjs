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
    else if (/\.(?:md|cff|json|txt|yml|yaml)$/u.test(entry) || entry === 'README') files.push(full);
  }
}

walk(root);
const offenders = files.filter((path) => readFileSync(path, 'utf8').includes('—'));
if (offenders.length > 0) throw new Error(`em dash is prohibited: ${offenders.join(', ')}`);
console.log(`no em dash in ${files.length} documentation files`);
