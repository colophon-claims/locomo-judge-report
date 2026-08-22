import { readFileSync } from 'node:fs';

const root = new URL('..', import.meta.url).pathname;
const promptPath = new URL('../CODEX-SCREENING-PROMPT.v1.md', import.meta.url);
const fixturePath = new URL('../fixtures/prompted-screening-pilot-v1.json', import.meta.url);

const schema = 'https://colophon-claims.github.io/locomo-judge-report/prompted-screening-synthetic-pilot/v1';
const classes = ['correct', 'specific-wrong', 'vague-topical-wrong'];
const strata = ['category-1', 'category-2', 'category-3', 'category-4'];
const rootKeys = ['cases', 'itemCount', 'schema', 'status'];
const caseKeys = ['admissionEligible', 'blindedInput', 'candidateClass', 'permanentlyExcluded', 'pilotCaseId', 'stratum', 'syntheticOnly'];
const blindedInputKeys = ['candidateAnswer', 'itemId', 'question', 'referenceAnswer'];
const prohibitedFixtureKeys = /(?:commitment|decision|digest|intendedlabel|model|output|prompt|reserve|sample|seed|sha256|slot|transcript|verdict)/iu;
const prohibitedFixtureText = [
  /\b(?:CORRECT|WRONG|UNSURE)\b/u,
  /https?:\/\//iu,
  /(?:^|\s)[^\s@]+@[^\s@]+\.[^\s@]+(?:\s|$)/u,
  /(?:sk|rk)-[A-Za-z0-9_-]{16,}/u,
  /BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/u,
  /\b(?:[0-9a-f]{64}|sha256:)\b/iu,
];

function hasExactKeys(value, keys) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).sort().join(',') === [...keys].sort().join(',');
}

function requireOnce(text, fragment, label) {
  const first = text.indexOf(fragment);
  if (first === -1 || text.indexOf(fragment, first + fragment.length) !== -1) {
    throw new Error(`prompt must contain exactly one ${label}`);
  }
  return first;
}

export function validatePrompt(text) {
  if (typeof text !== 'string' || !text.endsWith('\n') || text.includes('\r') || text.includes(String.fromCodePoint(0x2014))) {
    throw new Error('prompt must be LF-terminated UTF-8 text without em dash');
  }

  const coordinator = requireOnce(text, 'The coordinator declaration is Sol,\n`gpt-5.6-sol`, reasoning level `high`.', 'Sol high coordinator declaration');
  const luna = requireOnce(text, '1. Luna: `gpt-5.6-luna`, reasoning level `medium`, at most 32 items per batch.', 'Luna medium pass');
  const terra = requireOnce(text, '2. Terra: `gpt-5.6-terra`, reasoning level `high`, at most 16 items per batch.', 'Terra high pass');
  const sol = requireOnce(text, '3. Sol: `gpt-5.6-sol`, reasoning level `high`, at most 8 items per batch.', 'Sol high pass');
  if (!(coordinator < luna && luna < terra && terra < sol)) throw new Error('prompt role declarations are out of order');

  const requiredFacts = [
    'The coordinator may orchestrate the fixed\njudgment passes, but must not judge an item, change an agent verdict, or replace\nan operator decision.',
    'Never reveal an intended label, candidate class, category stratum, main or',
    'Terra must not see Luna output.',
    'Sol must not see Luna or Terra output.',
    'The verdict alphabet is exactly `CORRECT`, `WRONG`, or `UNSURE`.',
    'Route an invalid output to `UNSURE`.',
    'Judgment agents receive no web, shell, repository, search, retrieval, or other',
    'Permit at most one retry for an infrastructure failure that produced no model',
    'The retry must use the identical agent declaration, reasoning level,',
    'Luna\'s verdict is the load-bearing `screeningVerdict`.',
    'Neither Terra, Sol, nor the coordinator may replace a\nLuna verdict or make a final admission decision.',
    'Ritsu must hand-check every flagged item and every sampled item.',
    'Only Ritsu may\nrecord `confirm` or `exclude`.',
    'The transcript is opaque\nartifact bytes.',
    'does not parse the transcript or assert that routing, prompt compliance, or',
  ];
  for (const fact of requiredFacts) requireOnce(text, fact, JSON.stringify(fact));

  const aliases = [...text.matchAll(/`(gpt-[0-9a-z.-]+)`/gu)].map((match) => match[1]);
  if (JSON.stringify(aliases) !== JSON.stringify(['gpt-5.6-sol', 'gpt-5.6-luna', 'gpt-5.6-terra', 'gpt-5.6-sol'])) throw new Error('prompt contains a missing, repeated, reordered, or unauthorized model alias');
  if (!text.includes('mutable aliases, not immutable provider snapshots')) throw new Error('prompt omits the mutable-alias limitation');
}

function assertNoProhibitedFixtureProperties(value, path = 'fixture') {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoProhibitedFixtureProperties(entry, `${path}[${index}]`));
    return;
  }
  if (value === null || typeof value !== 'object') return;
  for (const [key, entry] of Object.entries(value)) {
    if (prohibitedFixtureKeys.test(key)) throw new Error(`${path}.${key} is prohibited in a no-outcome synthetic fixture`);
    assertNoProhibitedFixtureProperties(entry, `${path}.${key}`);
  }
}

export function validateSyntheticPilot(value, raw) {
  if (raw !== `${JSON.stringify(value, null, 2)}\n`) throw new Error('synthetic pilot fixture must use deterministic two-space JSON');
  if (!hasExactKeys(value, rootKeys) || value.schema !== schema || value.status !== 'synthetic-validation-only' || value.itemCount !== 24 || !Array.isArray(value.cases) || value.cases.length !== 24) {
    throw new Error('synthetic pilot fixture has an invalid root');
  }

  const expectedIds = classes.flatMap((candidateClass) => strata.flatMap((stratum) => [1, 2].map((ordinal) => `synthetic-${candidateClass}-${stratum}-${String(ordinal).padStart(2, '0')}`)));
  const seen = new Set();
  value.cases.forEach((pilotCase, index) => {
    if (!hasExactKeys(pilotCase, caseKeys) || !hasExactKeys(pilotCase.blindedInput, blindedInputKeys)) throw new Error(`synthetic pilot case ${index} has unexpected properties`);
    if (pilotCase.pilotCaseId !== expectedIds[index] || seen.has(pilotCase.pilotCaseId)) throw new Error(`synthetic pilot case ${index} has unstable or duplicate identity`);
    seen.add(pilotCase.pilotCaseId);
    if (!classes.includes(pilotCase.candidateClass) || !strata.includes(pilotCase.stratum)
      || !pilotCase.pilotCaseId.includes(`-${pilotCase.candidateClass}-${pilotCase.stratum}-`)) throw new Error(`synthetic pilot case ${index} is in the wrong class or stratum`);
    if (pilotCase.syntheticOnly !== true || pilotCase.permanentlyExcluded !== true || pilotCase.admissionEligible !== false) throw new Error(`synthetic pilot case ${index} is not permanently ineligible`);
    if (pilotCase.blindedInput.itemId !== pilotCase.pilotCaseId) throw new Error(`synthetic pilot case ${index} changes identity at the blinded boundary`);
    for (const [key, text] of Object.entries(pilotCase.blindedInput)) {
      if (typeof text !== 'string' || text.trim() !== text || text.length < 3 || text.length > 300 || /[^\x20-\x7e]/u.test(text)) throw new Error(`synthetic pilot case ${index} has invalid ${key}`);
      if (prohibitedFixtureText.some((pattern) => pattern.test(text))) throw new Error(`synthetic pilot case ${index} ${key} crosses the no-real-data or no-outcome boundary`);
    }
  });

  assertNoProhibitedFixtureProperties(value.cases);
}

const prompt = readFileSync(promptPath, 'utf8');
const fixtureRaw = readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureRaw);
validatePrompt(prompt);
validateSyntheticPilot(fixture, fixtureRaw);

if (process.argv[1] && new URL(`file://${process.argv[1]}`).pathname === new URL(import.meta.url).pathname) {
  console.log(`validated normative prompted-screening procedure and ${fixture.cases.length} permanently excluded synthetic cases from ${root}`);
}
