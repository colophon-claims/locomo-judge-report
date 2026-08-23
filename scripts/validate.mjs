import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import './render-prompted-screening-dispatch-v2.mjs';
import './render-prompted-screening-dispatch-v3.mjs';
import './render-compact-process-audit-input-v1.mjs';
import './render-compact-process-audit-input-v2.mjs';
import './validate-compact-process-audit-output-v1.mjs';
import './plan-prompted-screening-v6.mjs';
import './build-prompted-screening-runtime-v6.mjs';
import './gate-prompted-screening-runtime-v6.mjs';
import './simulate-prompted-screening-runtime-v6.mjs';
import './validate-synthetic-pilot-run-record.mjs';
import './validate-synthetic-pilot-v2-run-record.mjs';
import './validate-synthetic-pilot-v3-run-record.mjs';
import './validate-synthetic-pilot-v4-run-record.mjs';
import './validate-synthetic-pilot-v5-stop.mjs';
import './validate-prompted-screening-pilot.mjs';
import './validate-prompted-screening-v5-fixture.mjs';

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
  ['CODEX-SCREENING-JUDGMENT-INSTRUCTION.v1.txt', ['text/plain', 8192]],
  ['CODEX-SCREENING-AUDIT-INSTRUCTION.v1.txt', ['text/plain', 8192]],
  ['CODEX-SCREENING-PROMPT.v1.md', ['text/markdown', 16384]],
  ['CODEX-SCREENING-PROMPT.v2.md', ['text/markdown', 16384]],
  ['CODEX-SCREENING-PROMPT.v3.md', ['text/markdown', 16384]],
  ['CODEX-SCREENING-PROMPT.v4.md', ['text/markdown', 16384]],
  ['CODEX-SCREENING-PROMPT.v5.md', ['text/markdown', 16384]],
  ['CODEX-SCREENING-PROMPT.v6.md', ['text/markdown', 16384]],
  ['CONTRIBUTING.md', ['text/markdown', 8192]],
  ['LICENSE', ['text/plain', 32768]],
  ['LICENSES/THIRD-PARTY-NOTICES.md', ['text/markdown', 8192]],
  ['README.md', ['text/markdown', 16384]],
  ['docs/sampling-commitment.md', ['text/markdown', 8192]],
  ['docs/software-heritage.md', ['text/markdown', 8192]],
  ['fixtures/prompted-screening-pilot-v1.json', ['application/json', 32768]],
  ['fixtures/prompted-screening-pilot-v2.json', ['application/json', 32768]],
  ['fixtures/prompted-screening-pilot-v4-compact-audit.json', ['application/json', 32768]],
  ['fixtures/prompted-screening-pilot-v4-joint-compact-audit.json', ['application/json', 32768]],
  ['fixtures/prompted-screening-pilot-v5-compact-audit.json', ['application/json', 32768]],
  ['fixtures/prompted-screening-pilot-v2-dispatch-order.canonical.json', ['application/json', 4096]],
  ['fixtures/prompted-screening-pilot-v2-identity-map.canonical.json', ['application/json', 4096]],
  ['fixtures/prompted-screening-pilot-v5-no-run-audit-output.canonical.json', ['application/json', 4096]],
  ['fixtures/prompted-screening-runtime-v6-simulation-outputs.canonical.json', ['application/json', 16384]],
  ['fixtures/prompted-screening-runtime-v6-simulation-prefix.jsonl', ['application/x-ndjson', 65536]],
  ['records/synthetic-pilot-2026-08-22/NON-CONFORMANT.json', ['application/json', 16384]],
  ['records/synthetic-pilot-2026-08-22/pilot-results.pending-ritsu.json', ['application/json', 32768]],
  ['records/synthetic-pilot-2026-08-22/process-audit.md', ['text/markdown', 8192]],
  ['records/synthetic-pilot-v2-2026-08-23/NON-CONFORMANT.json', ['application/json', 16384]],
  ['records/synthetic-pilot-v2-2026-08-23/pilot-results.pending-ritsu.json', ['application/json', 32768]],
  ['records/synthetic-pilot-v2-2026-08-23/process-audit.md', ['text/markdown', 8192]],
  ['records/synthetic-pilot-v2-2026-08-23/transcript.jsonl', ['application/x-ndjson', 131072]],
  ['records/synthetic-pilot-v3-2026-08-23/NOT-APPROVED.json', ['application/json', 16384]],
  ['records/synthetic-pilot-v3-2026-08-23/derivative-corrections.md', ['text/markdown', 8192]],
  ['records/synthetic-pilot-v3-2026-08-23/pilot-results.pending-ritsu.json', ['application/json', 32768]],
  ['records/synthetic-pilot-v3-2026-08-23/process-audit.md', ['text/markdown', 8192]],
  ['records/synthetic-pilot-v3-2026-08-23/ritsu-review.md', ['text/markdown', 8192]],
  ['records/synthetic-pilot-v3-2026-08-23/transcript.jsonl', ['application/x-ndjson', 131072]],
  ['records/synthetic-pilot-v3-2026-08-23/usage.md', ['text/markdown', 4096]],
  ['records/synthetic-pilot-v4-2026-08-23/NON-CONFORMANT.json', ['application/json', 16384]],
  ['records/synthetic-pilot-v4-2026-08-23/compact-process-audit-input.json', ['application/json', 16384]],
  ['records/synthetic-pilot-v4-2026-08-23/judgment-prefix.transcript.jsonl', ['application/x-ndjson', 65536]],
  ['records/synthetic-pilot-v4-2026-08-23/mechanical-correction.md', ['text/markdown', 8192]],
  ['records/synthetic-pilot-v4-2026-08-23/pilot-results.pending-ritsu.json', ['application/json', 32768]],
  ['records/synthetic-pilot-v4-2026-08-23/process-audit.md', ['text/markdown', 8192]],
  ['records/synthetic-pilot-v4-2026-08-23/ritsu-review.md', ['text/markdown', 8192]],
  ['records/synthetic-pilot-v4-2026-08-23/transcript.jsonl', ['application/x-ndjson', 131072]],
  ['records/synthetic-pilot-v4-2026-08-23/usage.md', ['text/markdown', 4096]],
  ['records/synthetic-pilot-v5-2026-08-23/NON-CONFORMANT.json', ['application/json', 16384]],
  ['records/synthetic-pilot-v5-2026-08-23/append-only-correction.md', ['text/markdown', 4096]],
  ['records/synthetic-pilot-v5-2026-08-23/pilot-results.pending-ritsu.json', ['application/json', 16384]],
  ['records/synthetic-pilot-v5-2026-08-23/pre-dispatch-log.jsonl', ['application/x-ndjson', 4096]],
  ['records/synthetic-pilot-v5-2026-08-23/preflight.md', ['text/markdown', 4096]],
  ['records/synthetic-pilot-v5-2026-08-23/process-audit.md', ['text/markdown', 4096]],
  ['records/synthetic-pilot-v5-2026-08-23/ritsu-review.md', ['text/markdown', 4096]],
  ['records/synthetic-pilot-v5-2026-08-23/usage.md', ['text/markdown', 4096]],
  ['schemas/compact-process-audit-input.v1.schema.json', ['application/json', 16384]],
  ['schemas/compact-process-audit-input.v2.schema.json', ['application/json', 32768]],
  ['schemas/compact-process-audit-output.v1.schema.json', ['application/json', 16384]],
  ['schemas/prompted-screening-judgment-prefix.v1.schema.json', ['application/json', 16384]],
  ['schemas/prompted-screening-pre-dispatch-plan.v1.schema.json', ['application/json', 16384]],
  ['schemas/sampling-commitment.schema.json', ['application/json', 8192]],
  ['scripts/check-no-em-dash.mjs', ['application/javascript', 8192]],
  ['scripts/approved-prompted-screening-v3-identities.mjs', ['application/javascript', 16384]],
  ['scripts/approved-prompted-screening-v4-identities.mjs', ['application/javascript', 4096]],
  ['scripts/approved-prompted-screening-v5-identities.mjs', ['application/javascript', 8192]],
  ['scripts/approved-prompted-screening-v6-identities.mjs', ['application/javascript', 8192]],
  ['scripts/plan-prompted-screening-v6.mjs', ['application/javascript', 24576]],
  ['scripts/build-prompted-screening-runtime-v6.mjs', ['application/javascript', 32768]],
  ['scripts/gate-prompted-screening-runtime-v6.mjs', ['application/javascript', 8192]],
  ['scripts/simulate-prompted-screening-runtime-v6.mjs', ['application/javascript', 16384]],
  ['scripts/render-compact-process-audit-input-v1.mjs', ['application/javascript', 40960]],
  ['scripts/render-compact-process-audit-input-v2.mjs', ['application/javascript', 40960]],
  ['scripts/generate-prompted-screening-v5-fixture.mjs', ['application/javascript', 8192]],
  ['scripts/render-prompted-screening-dispatch-v2.mjs', ['application/javascript', 16384]],
  ['scripts/render-prompted-screening-dispatch-v3.mjs', ['application/javascript', 32768]],
  ['scripts/validate-prompted-screening-pilot.mjs', ['application/javascript', 16384]],
  ['scripts/validate-prompted-screening-v5-fixture.mjs', ['application/javascript', 16384]],
  ['scripts/validate-compact-process-audit-output-v1.mjs', ['application/javascript', 16384]],
  ['scripts/validate-sampling-commitment.mjs', ['application/javascript', 8192]],
  ['scripts/validate-synthetic-pilot-run-record.mjs', ['application/javascript', 24576]],
  ['scripts/validate-synthetic-pilot-v2-run-record.mjs', ['application/javascript', 32768]],
  ['scripts/validate-synthetic-pilot-v3-run-record.mjs', ['application/javascript', 24576]],
  ['scripts/validate-synthetic-pilot-v4-run-record.mjs', ['application/javascript', 32768]],
  ['scripts/validate-synthetic-pilot-v5-stop.mjs', ['application/javascript', 16384]],
  ['scripts/validate.mjs', ['application/javascript', 16384]],
  ['source-register.json', ['application/json', 8192]],
  ['test/validate.test.mjs', ['application/javascript', 16384]],
  ['test/prompted-screening-pilot.test.mjs', ['application/javascript', 16384]],
  ['test/prompted-screening-dispatch-v2.test.mjs', ['application/javascript', 16384]],
  ['test/prompted-screening-dispatch-v3.test.mjs', ['application/javascript', 24576]],
  ['test/compact-process-audit-v4.test.mjs', ['application/javascript', 16384]],
  ['test/compact-process-audit-v5.test.mjs', ['application/javascript', 16384]],
  ['test/prompted-screening-v5-fixture.test.mjs', ['application/javascript', 16384]],
  ['test/prompted-screening-runtime-v6.test.mjs', ['application/javascript', 24576]],
  ['test/synthetic-pilot-run-record.test.mjs', ['application/javascript', 16384]],
  ['test/synthetic-pilot-v2-run-record.test.mjs', ['application/javascript', 24576]],
  ['test/synthetic-pilot-v3-run-record.test.mjs', ['application/javascript', 16384]],
  ['test/synthetic-pilot-v4-run-record.test.mjs', ['application/javascript', 16384]],
  ['test/synthetic-pilot-v5-stop.test.mjs', ['application/javascript', 8192]],
]);
const registerKeys = ['schema', 'sources'];
const sourceKeys = ['id', 'includedLaterByOperatorDecision', 'license', 'licenseNote', 'promptBytesCopied', 'provenance', 'public', 'source', 'title', 'url'];
const locatorKeys = ['commit', 'path', 'repository'];
const provenanceKeys = ['role', 'url'];

function expectedContentType(path) {
  if (path.endsWith('.md')) return 'text/markdown';
  if (path.endsWith('.json')) return 'application/json';
  if (path.endsWith('.jsonl')) return 'application/x-ndjson';
  if (path.endsWith('.mjs')) return 'application/javascript';
  if (path.endsWith('.yml') || path.endsWith('.cff')) return 'text/yaml';
  return 'text/plain';
}

function hasExactKeys(value, keys) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).sort().join(',') === [...keys].sort().join(',');
}

function httpsUrl(value) {
  try {
    return typeof value === 'string' && new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
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
const registerRaw = readFileSync(registerPath, 'utf8');

export function validateSourceRegister(value, raw) {
if (raw !== `${canonical(value)}\n`) throw new Error('source-register.json is not canonical JSON');
const register = value;
if (!hasExactKeys(register, registerKeys)) throw new Error('source register has unexpected root properties');
if (register.schema !== 'https://colophon-claims.github.io/locomo-judge-report/source-register/v1') throw new Error('unexpected source register schema');
if (!Array.isArray(register.sources) || register.sources.some((source, index) => !source || typeof source.id !== 'string' || source.id.length === 0 || (index > 0 && register.sources[index - 1].id >= source.id))) throw new Error('source register sources must be sorted and unique');
for (const source of register.sources) {
  if (!hasExactKeys(source, sourceKeys) || !hasExactKeys(source.source, locatorKeys)
    || ['id', 'title', 'license', 'licenseNote'].some((key) => typeof source[key] !== 'string' || source[key].trim().length === 0)
    || typeof source.public !== 'boolean' || typeof source.promptBytesCopied !== 'boolean' || typeof source.includedLaterByOperatorDecision !== 'boolean'
    || !httpsUrl(source.url) || !httpsUrl(source.source.repository)
    || !/^[a-f0-9]{40}$/u.test(source.source.commit) || typeof source.source.path !== 'string' || source.source.path.length === 0 || source.source.path.startsWith('/') || source.source.path.includes('..')) {
    throw new Error('source register contains a malformed source row');
  }
  if (!Array.isArray(source.provenance) || source.provenance.length === 0 || source.provenance.some((provenance, index) => !hasExactKeys(provenance, provenanceKeys) || typeof provenance.role !== 'string' || provenance.role.length === 0 || !httpsUrl(provenance.url) || (index > 0 && source.provenance[index - 1].role >= provenance.role))) {
    throw new Error('source register contains malformed provenance');
  }
}
const backboard = register.sources.find((source) => source.id === 'backboard');
if (!backboard || backboard.public !== true || backboard.license !== 'NOASSERTION'
  || backboard.licenseNote !== 'No license found in the public source metadata at registration time.'
  || backboard.promptBytesCopied !== false || backboard.includedLaterByOperatorDecision !== true
  || backboard.source?.repository !== 'https://github.com/Backboard-io/Backboard-Locomo-Benchmark'
  || backboard.source?.commit !== '164d45c06f860d832bbe598f0dde0ea66b05f384'
  || backboard.source?.path !== 'locomo_ingest_eval.py'
  || backboard.url !== 'https://github.com/Backboard-io/Backboard-Locomo-Benchmark/blob/164d45c06f860d832bbe598f0dde0ea66b05f384/locomo_ingest_eval.py'
  || canonical(backboard.provenance) !== canonical([{ role: 'public-quotation', url: 'https://github.com/snap-research/locomo/issues/23#issuecomment-3631413949' }, { role: 'repository-canonicality-and-license-context', url: 'https://github.com/snap-research/locomo/issues/23#issuecomment-5336303788' }])) {
  throw new Error('Backboard source facts are not the verified registration facts');
}
}

validateSourceRegister(register, registerRaw);

const expectedManifest = tracked.filter((path) => path !== 'MANIFEST.sha256').map((path) => {
  const digest = createHash('sha256').update(readFileSync(join(root, path))).digest('hex');
  return `${digest}  ${path}`;
}).join('\n') + '\n';
if (readFileSync(manifestPath, 'utf8') !== expectedManifest) throw new Error('MANIFEST.sha256 is not sorted or does not match tracked files');
console.log(`validated ${tracked.length - 1} manifest files and preparation-only boundaries`);
