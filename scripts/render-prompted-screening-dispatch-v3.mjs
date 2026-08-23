import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  APPROVED_PROMPTED_SCREENING_V3_SHA256,
  APPROVED_SYNTHETIC_PILOT_V2_DISPATCH_ORDER,
  APPROVED_SYNTHETIC_PILOT_V2_IDENTITY_MAP,
} from './approved-prompted-screening-v3-identities.mjs';

const promptPath = new URL('../CODEX-SCREENING-PROMPT.v3.md', import.meta.url);
const instructionPath = new URL('../CODEX-SCREENING-JUDGMENT-INSTRUCTION.v1.txt', import.meta.url);
const fixturePath = new URL('../fixtures/prompted-screening-pilot-v2.json', import.meta.url);
const legacyFixturePath = new URL('../fixtures/prompted-screening-pilot-v1.json', import.meta.url);
const rendererPath = new URL('./render-prompted-screening-dispatch-v3.mjs', import.meta.url);

export const PROMPTED_SCREENING_DISPATCH_PROTOCOL_V3 = 'prompted-codex-screening-dispatch/v3';

const profiles = Object.freeze({
  Luna: Object.freeze({ modelAlias: 'gpt-5.6-luna', reasoning: 'medium', batchLimit: 32 }),
  Terra: Object.freeze({ modelAlias: 'gpt-5.6-terra', reasoning: 'high', batchLimit: 16 }),
  Sol: Object.freeze({ modelAlias: 'gpt-5.6-sol', reasoning: 'high', batchLimit: 8 }),
});
const fixtureRootKeys = ['cases', 'dispatchOrder', 'identityPolicy', 'itemCount', 'schema', 'status'];
const fixtureCaseKeys = ['admissionEligible', 'blindedInput', 'candidateClass', 'judgmentItemId', 'permanentlyExcluded', 'pilotCaseId', 'stratum', 'syntheticOnly'];
const itemKeys = ['candidateAnswer', 'itemId', 'question', 'referenceAnswer'];
const planKeys = ['expectedItemIds', 'fixtureVersion', 'items', 'modelAlias', 'promptVersion', 'reasoning', 'stage'];
const dispatchKeys = ['batchCount', 'batchOrdinal', 'blindedItemsSha256', 'bytes', 'dispatchSha256', 'fixtureSha256', 'fixtureVersion', 'instructionSha256', 'instructionVersion', 'itemIds', 'modelAlias', 'promptSha256', 'promptVersion', 'protocol', 'reasoning', 'rendererSha256', 'stage'];
const prohibitedIdentityTerms = ['candidate', 'category', 'class', 'correct', 'intended', 'label', 'main', 'output', 'reserve', 'sample', 'screening', 'slot', 'source', 'stratum', 'unsure', 'verdict', 'wrong'];
const approvedPromptBytes = readFileSync(promptPath);
const approvedInstructionBytes = readFileSync(instructionPath);
const approvedFixtureBytes = readFileSync(fixturePath);
const approvedLegacyFixtureBytes = readFileSync(legacyFixturePath);
const approvedRendererBytes = readFileSync(rendererPath);

function fail(path, detail) {
  throw new Error(`${path}: ${detail}`);
}

function hasExactKeys(value, keys) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).sort().join(',') === [...keys].sort().join(',');
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function sha256(bytes) {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

function md5(bytes) {
  return createHash('md5').update(bytes).digest('hex');
}

function exactBytes(actual, expected) {
  return Buffer.from(actual).equals(Buffer.from(expected));
}

function assertTextSource(path, bytes, { fenceFree = false } = {}) {
  const text = Buffer.from(bytes).toString('utf8');
  if (!text.endsWith('\n') || text.includes('\r') || text.includes(String.fromCodePoint(0x2014))) fail(path, 'must be LF-terminated UTF-8 without em dash');
  if (fenceFree && text.includes('```')) fail(path, 'must be fence-free');
}

export function validateV3SourceBytes({
  promptBytes = approvedPromptBytes,
  instructionBytes = approvedInstructionBytes,
  fixtureBytes = approvedFixtureBytes,
  rendererBytes = approvedRendererBytes,
} = {}) {
  assertTextSource('promptBytes', promptBytes);
  assertTextSource('instructionBytes', instructionBytes, { fenceFree: true });
  const sources = [
    ['promptBytes', promptBytes, APPROVED_PROMPTED_SCREENING_V3_SHA256.coordinatorPromptV3],
    ['instructionBytes', instructionBytes, APPROVED_PROMPTED_SCREENING_V3_SHA256.judgmentInstructionV1],
    ['fixtureBytes', fixtureBytes, APPROVED_PROMPTED_SCREENING_V3_SHA256.syntheticFixtureV2],
    ['rendererBytes', rendererBytes, APPROVED_PROMPTED_SCREENING_V3_SHA256.rendererV3],
  ];
  for (const [path, bytes, approved] of sources) {
    if (sha256(bytes) !== approved) fail(path, `must match approved ${approved}`);
  }
  return validateSyntheticPilotV2Structure(JSON.parse(Buffer.from(fixtureBytes).toString('utf8')), Buffer.from(fixtureBytes).toString('utf8'));
}

function derivedMetadataTokens(pilotCase, index) {
  const metadataValues = [
    pilotCase.pilotCaseId,
    pilotCase.candidateClass,
    pilotCase.stratum,
    `${pilotCase.pilotCaseId}|${pilotCase.candidateClass}|${pilotCase.stratum}`,
    canonical({ candidateClass: pilotCase.candidateClass, pilotCaseId: pilotCase.pilotCaseId, stratum: pilotCase.stratum }),
    String(index),
    String(index + 1),
  ];
  return new Set(metadataValues.flatMap((value) => {
    const bytes = Buffer.from(value, 'utf8');
    return [md5(bytes), createHash('sha256').update(bytes).digest('hex').slice(0, 32), bytes.toString('hex').slice(0, 32).padEnd(32, '0')];
  }));
}

function validateOpaqueIdentity(pilotCase, index, allOuterIds) {
  const itemId = pilotCase.judgmentItemId;
  if (typeof itemId !== 'string' || !/^[0-9a-f]{32}$/u.test(itemId)) fail(`fixture.cases[${index}].judgmentItemId`, 'must be a lowercase fixed 128-bit hexadecimal token');
  const normalized = itemId.toLowerCase();
  if (prohibitedIdentityTerms.some((term) => normalized.includes(term))) fail(`fixture.cases[${index}].judgmentItemId`, 'contains a prohibited metadata term');
  if (allOuterIds.some((outerId) => itemId === outerId || itemId.includes(outerId) || outerId.includes(itemId))) fail(`fixture.cases[${index}].judgmentItemId`, 'contains or equals an outer identity');
  if (derivedMetadataTokens(pilotCase, index).has(itemId)) fail(`fixture.cases[${index}].judgmentItemId`, 'is a deterministic metadata-derived encoding');
}

export function validateSyntheticPilotV2Structure(value, raw) {
  if (raw !== `${JSON.stringify(value, null, 2)}\n`) fail('fixture', 'must use deterministic two-space JSON');
  if (!hasExactKeys(value, fixtureRootKeys)
    || value.schema !== 'https://colophon-claims.github.io/locomo-judge-report/prompted-screening-synthetic-pilot/v2'
    || value.status !== 'synthetic-validation-only'
    || value.itemCount !== 24
    || value.identityPolicy !== 'opaque-random-fixed-128-bit-hex'
    || !Array.isArray(value.cases) || value.cases.length !== 24
    || !Array.isArray(value.dispatchOrder) || value.dispatchOrder.length !== 24) fail('fixture', 'has an invalid closed version 2 root');

  const legacy = JSON.parse(Buffer.from(approvedLegacyFixtureBytes).toString('utf8'));
  const expectedMap = new Map(APPROVED_SYNTHETIC_PILOT_V2_IDENTITY_MAP);
  const allOuterIds = legacy.cases.map((pilotCase) => pilotCase.pilotCaseId);
  const seenOpaque = new Set();
  value.cases.forEach((pilotCase, index) => {
    const legacyCase = legacy.cases[index];
    if (!hasExactKeys(pilotCase, fixtureCaseKeys) || !hasExactKeys(pilotCase.blindedInput, itemKeys)) fail(`fixture.cases[${index}]`, 'has unexpected properties');
    if (pilotCase.pilotCaseId !== legacyCase.pilotCaseId
      || pilotCase.candidateClass !== legacyCase.candidateClass
      || pilotCase.stratum !== legacyCase.stratum
      || pilotCase.syntheticOnly !== true
      || pilotCase.permanentlyExcluded !== true
      || pilotCase.admissionEligible !== false) fail(`fixture.cases[${index}]`, 'does not preserve the immutable outer fixture metadata');
    const expectedOpaque = expectedMap.get(pilotCase.pilotCaseId);
    if (pilotCase.judgmentItemId !== expectedOpaque || pilotCase.blindedInput.itemId !== expectedOpaque || seenOpaque.has(expectedOpaque)) fail(`fixture.cases[${index}].judgmentItemId`, 'does not match the exact immutable outer-to-opaque mapping');
    seenOpaque.add(expectedOpaque);
    validateOpaqueIdentity(pilotCase, index, allOuterIds);
    for (const key of itemKeys.filter((key) => key !== 'itemId')) {
      if (pilotCase.blindedInput[key] !== legacyCase.blindedInput[key]) fail(`fixture.cases[${index}].blindedInput.${key}`, 'must be byte-identical to synthetic fixture version 1');
    }
  });

  if (canonical(value.dispatchOrder) !== canonical(APPROVED_SYNTHETIC_PILOT_V2_DISPATCH_ORDER)) fail('fixture.dispatchOrder', 'does not match the immutable non-grouped order');
  if (new Set(value.dispatchOrder).size !== 24 || value.dispatchOrder.some((itemId) => !seenOpaque.has(itemId))) fail('fixture.dispatchOrder', 'must contain every opaque identity exactly once');
  if (canonical(value.dispatchOrder) === canonical(value.cases.map((pilotCase) => pilotCase.judgmentItemId))) fail('fixture.dispatchOrder', 'must not preserve grouped outer-fixture order');
  const byOpaque = new Map(value.cases.map((pilotCase) => [pilotCase.judgmentItemId, pilotCase]));
  value.dispatchOrder.forEach((itemId, index) => {
    if (index === 0) return;
    const previous = byOpaque.get(value.dispatchOrder[index - 1]);
    const current = byOpaque.get(itemId);
    if (previous.candidateClass === current.candidateClass || previous.stratum === current.stratum) fail('fixture.dispatchOrder', 'contains adjacent class or stratum grouping');
  });
  return value;
}

function expectedPlan(stage, fixture) {
  const profile = profiles[stage];
  if (!profile) fail('plan.stage', 'must be Luna, Terra, or Sol');
  const byOpaque = new Map(fixture.cases.map((pilotCase) => [pilotCase.judgmentItemId, pilotCase.blindedInput]));
  const items = fixture.dispatchOrder.map((itemId) => byOpaque.get(itemId));
  return {
    promptVersion: 'v3',
    fixtureVersion: 'v2',
    stage,
    modelAlias: profile.modelAlias,
    reasoning: profile.reasoning,
    expectedItemIds: fixture.dispatchOrder,
    items,
  };
}

export function createSyntheticPilotV2StagePlan(stage, sourceBytes = {}) {
  const fixture = validateV3SourceBytes(sourceBytes);
  return structuredClone(expectedPlan(stage, fixture));
}

function validatePlan(plan, fixture) {
  if (!hasExactKeys(plan, planKeys)) fail('plan', 'must have the exact closed version 3 shape');
  const expected = expectedPlan(plan.stage, fixture);
  if (canonical(plan) !== canonical(expected)) fail('plan', 'must match the immutable fixture mapping, opaque order, profile, and blinded bytes');
  for (const [index, item] of plan.items.entries()) {
    if (!hasExactKeys(item, itemKeys)) fail(`plan.items[${index}]`, 'must contain only itemId, question, referenceAnswer, and candidateAnswer');
    if (Object.values(item).some((entry) => typeof entry !== 'string' || entry.length === 0)) fail(`plan.items[${index}]`, 'must contain non-empty strings');
    const serialized = canonical(item);
    if (fixture.cases.some((pilotCase) => serialized.includes(pilotCase.pilotCaseId))) fail(`plan.items[${index}]`, 'leaks an outer fixture identity');
  }
  return profiles[plan.stage];
}

function canonicalBlindedItemsBytes(items) {
  return Buffer.from(`${canonical(items)}\n`, 'utf8');
}

export function renderStageDispatchesV3(plan, sourceBytes = {}) {
  const fixture = validateV3SourceBytes(sourceBytes);
  const profile = validatePlan(plan, fixture);
  const batchCount = Math.ceil(plan.items.length / profile.batchLimit);
  const instructionBytes = sourceBytes.instructionBytes ?? approvedInstructionBytes;
  const dispatches = [];
  for (let offset = 0; offset < plan.items.length; offset += profile.batchLimit) {
    const items = plan.items.slice(offset, offset + profile.batchLimit);
    const blindedItemsBytes = canonicalBlindedItemsBytes(items);
    const bytes = Buffer.concat([Buffer.from(instructionBytes), blindedItemsBytes]);
    dispatches.push(Object.freeze({
      protocol: PROMPTED_SCREENING_DISPATCH_PROTOCOL_V3,
      promptVersion: 'v3',
      fixtureVersion: 'v2',
      instructionVersion: 'v1',
      stage: plan.stage,
      modelAlias: profile.modelAlias,
      reasoning: profile.reasoning,
      batchOrdinal: dispatches.length + 1,
      batchCount,
      itemIds: Object.freeze(items.map((item) => item.itemId)),
      promptSha256: APPROVED_PROMPTED_SCREENING_V3_SHA256.coordinatorPromptV3,
      instructionSha256: APPROVED_PROMPTED_SCREENING_V3_SHA256.judgmentInstructionV1,
      fixtureSha256: APPROVED_PROMPTED_SCREENING_V3_SHA256.syntheticFixtureV2,
      rendererSha256: APPROVED_PROMPTED_SCREENING_V3_SHA256.rendererV3,
      blindedItemsSha256: sha256(blindedItemsBytes),
      dispatchSha256: sha256(bytes),
      bytes,
    }));
  }
  return Object.freeze(dispatches);
}

export function validateRenderedDispatchV3(plan, candidate, sourceBytes = {}) {
  if (!hasExactKeys(candidate, dispatchKeys)) fail('dispatch', 'must have the exact closed rendered shape');
  if (!Number.isInteger(candidate.batchOrdinal) || candidate.batchOrdinal < 1) fail('dispatch.batchOrdinal', 'must be a positive integer');
  const expected = renderStageDispatchesV3(plan, sourceBytes)[candidate.batchOrdinal - 1];
  if (!expected) fail('dispatch.batchOrdinal', 'is outside the deterministic stage plan');
  for (const key of dispatchKeys.filter((key) => key !== 'bytes')) {
    if (canonical(candidate[key]) !== canonical(expected[key])) fail(`dispatch.${key}`, 'does not match deterministic reconstruction');
  }
  if (!exactBytes(candidate.bytes, expected.bytes)) fail('dispatch.bytes', 'contain missing, extra, reordered, paraphrased, leaked, or contradictory bytes');
  if (sha256(candidate.bytes) !== candidate.dispatchSha256) fail('dispatch.dispatchSha256', 'does not match exact dispatch bytes');
  return true;
}

validateV3SourceBytes();

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const counts = Object.keys(profiles).map((stage) => {
    const plan = createSyntheticPilotV2StagePlan(stage);
    const dispatches = renderStageDispatchesV3(plan);
    dispatches.forEach((dispatch) => validateRenderedDispatchV3(plan, dispatch));
    return `${stage}:${dispatches.length}`;
  });
  console.log(`validated prompted-screening v3 opaque synthetic dispatch plan ${counts.join(',')}`);
}
