import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const manifestPath = join(root, 'MANIFEST.sha256');
const prohibitedPath = /(^|\/)(freeze|conversations|datasets|prompts|screening|seeds|candidate-pool|results|audit|artifacts)(\/|$)/u;
const prohibitedText = [/(?:sk|rk)-[A-Za-z0-9_-]{16,}/u, /BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/u];
const skipped = new Set(['.git', 'node_modules', '.DS_Store']);
const allowedFiles = new Map([
  ['.github/workflows/ci.yml', ['text/yaml', 4096]],
  ['.gitignore', ['text/plain', 4096]],
  ['ATTRIBUTION.md', ['text/markdown', 8192]],
  ['CITATION.cff', ['text/yaml', 4096]],
  ['CONTRIBUTING.md', ['text/markdown', 8192]],
  ['LICENSE', ['text/plain', 32768]],
  ['LICENSES/THIRD-PARTY-NOTICES.md', ['text/markdown', 8192]],
  ['README.md', ['text/markdown', 8192]],
  ['docs/sampling-commitment.md', ['text/markdown', 8192]],
  ['docs/software-heritage.md', ['text/markdown', 8192]],
  ['schemas/sampling-commitment.schema.json', ['application/json', 8192]],
  ['scripts/check-no-em-dash.mjs', ['application/javascript', 8192]],
  ['scripts/validate-sampling-commitment.mjs', ['application/javascript', 8192]],
  ['scripts/validate.mjs', ['application/javascript', 16384]],
  ['source-register.json', ['application/json', 8192]],
  ['test/validate.test.mjs', ['application/javascript', 16384]],
]);

function expectedContentType(path) {
  if (path.endsWith('.md')) return 'text/markdown';
  if (path.endsWith('.json')) return 'application/json';
  if (path.endsWith('.mjs')) return 'application/javascript';
  if (path.endsWith('.yml') || path.endsWith('.cff')) return 'text/yaml';
  return 'text/plain';
}

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
  const expected = allowedFiles.get(path);
  if (!expected) throw new Error(`unrecognized preparation-phase path: ${path}`);
  if (expected[0] !== expectedContentType(path)) throw new Error(`unexpected content type declaration: ${path}`);
  const bytes = readFileSync(join(root, path));
  if (bytes.length > expected[1] || bytes.includes(0)) throw new Error(`invalid preparation-phase content: ${path}`);
  if (prohibitedPath.test(path)) throw new Error(`prohibited path: ${path}`);
  const text = bytes.toString('utf8');
  if (prohibitedText.some((pattern) => pattern.test(text))) throw new Error(`possible secret in: ${path}`);
}

const registerPath = join(root, 'source-register.json');
const register = JSON.parse(readFileSync(registerPath, 'utf8'));
if (readFileSync(registerPath, 'utf8') !== `${canonical(register)}\n`) throw new Error('source-register.json is not canonical JSON');
if (register.schema !== 'https://colophon-claims.github.io/locomo-judge-report/source-register/v1') throw new Error('unexpected source register schema');
if (!Array.isArray(register.sources) || register.sources.some((source, index) => !source || typeof source.id !== 'string' || source.id.length === 0 || (index > 0 && register.sources[index - 1].id >= source.id))) throw new Error('source register sources must be sorted and unique');
const backboard = register.sources.find((source) => source.id === 'backboard');
if (!backboard || backboard.public !== true || backboard.license !== 'NOASSERTION'
  || backboard.licenseNote !== 'No license found in the public source metadata at registration time.'
  || backboard.promptBytesCopied !== false || backboard.includedLaterByOperatorDecision !== true
  || backboard.source?.repository !== 'https://github.com/Backboard-io/Backboard-Locomo-Benchmark'
  || backboard.source?.commit !== '164d45c06f860d832bbe598f0dde0ea66b05f384'
  || backboard.source?.path !== 'locomo_ingest_eval.py'
  || backboard.url !== 'https://github.com/Backboard-io/Backboard-Locomo-Benchmark/blob/164d45c06f860d832bbe598f0dde0ea66b05f384/locomo_ingest_eval.py') {
  throw new Error('Backboard source facts are not the verified registration facts');
}

const expectedManifest = tracked.filter((path) => path !== 'MANIFEST.sha256').map((path) => {
  const digest = createHash('sha256').update(readFileSync(join(root, path))).digest('hex');
  return `${digest}  ${path}`;
}).join('\n') + '\n';
if (readFileSync(manifestPath, 'utf8') !== expectedManifest) throw new Error('MANIFEST.sha256 is not sorted or does not match tracked files');
console.log(`validated ${tracked.length - 1} manifest files and preparation-only boundaries`);
