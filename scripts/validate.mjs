import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const manifestPath = join(root, 'MANIFEST.sha256');
const prohibitedPath = /(^|\/)(freeze|conversations|datasets|prompts|screening|seeds|candidate-pool|results|audit|artifacts)(\/|$)/u;
const prohibitedText = [/(?:sk|rk)-[A-Za-z0-9_-]{16,}/u, /BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/u];
const skipped = new Set(['.git', 'node_modules', '.DS_Store']);

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function files(path, out = []) {
  for (const entry of readdirSync(path)) {
    if (skipped.has(entry)) continue;
    const full = join(path, entry);
    if (statSync(full).isDirectory()) files(full, out);
    else out.push(relative(root, full));
  }
  return out.sort();
}

const tracked = files(root);
for (const path of tracked) {
  if (path === 'MANIFEST.sha256') continue;
  if (prohibitedPath.test(path)) throw new Error(`prohibited path: ${path}`);
  const text = readFileSync(join(root, path), 'utf8');
  if (prohibitedText.some((pattern) => pattern.test(text))) throw new Error(`possible secret in: ${path}`);
}

const registerPath = join(root, 'source-register.json');
const register = JSON.parse(readFileSync(registerPath, 'utf8'));
if (readFileSync(registerPath, 'utf8') !== `${canonical(register)}\n`) throw new Error('source-register.json is not canonical JSON');
if (register.schema !== 'https://colophon-claims.github.io/locomo-judge-report/source-register/v1') throw new Error('unexpected source register schema');
if (!Array.isArray(register.sources) || register.sources.some((source, index) => index > 0 && register.sources[index - 1].id > source.id)) throw new Error('source register is not sorted');
for (const source of register.sources) {
  if (source.id !== 'backboard' || source.public !== true || source.license !== 'NOASSERTION'
    || source.promptBytesCopied !== false || source.includedLaterByOperatorDecision !== true) {
    throw new Error('source register contains unsupported or unverified metadata');
  }
}

const expectedManifest = tracked.filter((path) => path !== 'MANIFEST.sha256').map((path) => {
  const digest = createHash('sha256').update(readFileSync(join(root, path))).digest('hex');
  return `${digest}  ${path}`;
}).join('\n') + '\n';
if (readFileSync(manifestPath, 'utf8') !== expectedManifest) throw new Error('MANIFEST.sha256 is not sorted or does not match tracked files');
console.log(`validated ${tracked.length - 1} manifest files and preparation-only boundaries`);
