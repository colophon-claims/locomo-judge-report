import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const promptPath = new URL('../CODEX-SCREENING-PROMPT.v2.md', import.meta.url);
const instructionPath = new URL('../CODEX-SCREENING-JUDGMENT-INSTRUCTION.v1.txt', import.meta.url);
const fixturePath = new URL('../fixtures/prompted-screening-pilot-v1.json', import.meta.url);

export const APPROVED_CODEX_SCREENING_PROMPT_V2_SHA256 = 'sha256:a724aed3aef285e961f9bb1ee0933c0c25e0669b944ce177b7951f88ac913704';
export const APPROVED_CODEX_SCREENING_JUDGMENT_INSTRUCTION_V1_SHA256 = 'sha256:339c4f8286a476036ea3fce40fa5f517376908ee503ed2e21aeb03e47f920837';
export const PROMPTED_SCREENING_DISPATCH_PROTOCOL = 'prompted-codex-screening-dispatch/v2';

const profiles = Object.freeze({
  Luna: Object.freeze({ modelAlias: 'gpt-5.6-luna', reasoning: 'medium', batchLimit: 32 }),
  Terra: Object.freeze({ modelAlias: 'gpt-5.6-terra', reasoning: 'high', batchLimit: 16 }),
  Sol: Object.freeze({ modelAlias: 'gpt-5.6-sol', reasoning: 'high', batchLimit: 8 }),
});
const planKeys = ['expectedItemIds', 'items', 'modelAlias', 'promptVersion', 'reasoning', 'stage'];
const itemKeys = ['candidateAnswer', 'itemId', 'question', 'referenceAnswer'];
const dispatchKeys = ['batchCount', 'batchOrdinal', 'blindedItemsSha256', 'bytes', 'dispatchSha256', 'instructionSha256', 'instructionVersion', 'itemIds', 'modelAlias', 'promptVersion', 'protocol', 'reasoning', 'stage'];
const approvedPromptBytes = readFileSync(promptPath);
const approvedInstructionBytes = readFileSync(instructionPath);

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

function exactBytes(actual, expected) {
  return Buffer.from(actual).equals(Buffer.from(expected));
}

export function validateV2SourceBytes(promptBytes = approvedPromptBytes, instructionBytes = approvedInstructionBytes) {
  const promptText = Buffer.from(promptBytes).toString('utf8');
  if (!promptText.endsWith('\n') || promptText.includes('\r') || promptText.includes(String.fromCodePoint(0x2014))) fail('promptBytes', 'must be LF-terminated UTF-8 without em dash');
  if (sha256(promptBytes) !== APPROVED_CODEX_SCREENING_PROMPT_V2_SHA256) fail('promptBytes', `must match approved ${APPROVED_CODEX_SCREENING_PROMPT_V2_SHA256}`);

  const instructionText = Buffer.from(instructionBytes).toString('utf8');
  if (!instructionText.endsWith('\n') || instructionText.includes('\r') || instructionText.includes('```') || instructionText.includes(String.fromCodePoint(0x2014))) fail('instructionBytes', 'must be LF-terminated fence-free UTF-8 without em dash');
  if (sha256(instructionBytes) !== APPROVED_CODEX_SCREENING_JUDGMENT_INSTRUCTION_V1_SHA256) fail('instructionBytes', `must match approved ${APPROVED_CODEX_SCREENING_JUDGMENT_INSTRUCTION_V1_SHA256}`);
}

function validatePlan(plan) {
  if (!hasExactKeys(plan, planKeys)) fail('plan', 'must have the exact closed version 2 shape');
  if (plan.promptVersion !== 'v2') fail('plan.promptVersion', 'must be v2');
  const profile = profiles[plan.stage];
  if (!profile) fail('plan.stage', 'must be Luna, Terra, or Sol');
  if (plan.modelAlias !== profile.modelAlias) fail('plan.modelAlias', `must be ${profile.modelAlias} for ${plan.stage}`);
  if (plan.reasoning !== profile.reasoning) fail('plan.reasoning', `must be ${profile.reasoning} for ${plan.stage}`);
  if (!Array.isArray(plan.items) || plan.items.length === 0 || !Array.isArray(plan.expectedItemIds) || plan.expectedItemIds.length !== plan.items.length) fail('plan.items', 'must have a non-empty item array and one separately supplied expected identity per item');

  const seen = new Set();
  plan.items.forEach((item, index) => {
    if (!hasExactKeys(item, itemKeys)) fail(`plan.items[${index}]`, 'must contain only itemId, question, referenceAnswer, and candidateAnswer');
    for (const key of itemKeys) if (typeof item[key] !== 'string' || item[key].length === 0) fail(`plan.items[${index}].${key}`, 'must be a non-empty string');
    if (seen.has(item.itemId)) fail(`plan.items[${index}].itemId`, 'must be unique');
    seen.add(item.itemId);
    if (typeof plan.expectedItemIds[index] !== 'string' || plan.expectedItemIds[index] !== item.itemId) fail(`plan.items[${index}].itemId`, 'does not match the separately supplied sealed order');
  });
  if (new Set(plan.expectedItemIds).size !== plan.expectedItemIds.length) fail('plan.expectedItemIds', 'must be unique');
  return profile;
}

function canonicalBlindedItemsBytes(items) {
  return Buffer.from(`${canonical(items)}\n`, 'utf8');
}

export function renderStageDispatches(plan, instructionBytes = approvedInstructionBytes) {
  validateV2SourceBytes(approvedPromptBytes, instructionBytes);
  const profile = validatePlan(plan);
  const batchCount = Math.ceil(plan.items.length / profile.batchLimit);
  const dispatches = [];
  for (let offset = 0; offset < plan.items.length; offset += profile.batchLimit) {
    const items = plan.items.slice(offset, offset + profile.batchLimit);
    const blindedItemsBytes = canonicalBlindedItemsBytes(items);
    const bytes = Buffer.concat([Buffer.from(instructionBytes), blindedItemsBytes]);
    dispatches.push(Object.freeze({
      protocol: PROMPTED_SCREENING_DISPATCH_PROTOCOL,
      promptVersion: 'v2',
      instructionVersion: 'v1',
      stage: plan.stage,
      modelAlias: profile.modelAlias,
      reasoning: profile.reasoning,
      batchOrdinal: dispatches.length + 1,
      batchCount,
      itemIds: Object.freeze(items.map((item) => item.itemId)),
      instructionSha256: APPROVED_CODEX_SCREENING_JUDGMENT_INSTRUCTION_V1_SHA256,
      blindedItemsSha256: sha256(blindedItemsBytes),
      dispatchSha256: sha256(bytes),
      bytes,
    }));
  }
  return Object.freeze(dispatches);
}

export function validateRenderedDispatch(plan, candidate, instructionBytes = approvedInstructionBytes) {
  if (!hasExactKeys(candidate, dispatchKeys)) fail('dispatch', 'must have the exact closed rendered shape');
  if (!Number.isInteger(candidate.batchOrdinal) || candidate.batchOrdinal < 1) fail('dispatch.batchOrdinal', 'must be a positive integer');
  const expected = renderStageDispatches(plan, instructionBytes)[candidate.batchOrdinal - 1];
  if (!expected) fail('dispatch.batchOrdinal', 'is outside the deterministic stage plan');
  for (const key of dispatchKeys.filter((key) => key !== 'bytes')) {
    if (canonical(candidate[key]) !== canonical(expected[key])) fail(`dispatch.${key}`, 'does not match deterministic reconstruction');
  }
  if (!exactBytes(candidate.bytes, expected.bytes)) fail('dispatch.bytes', 'contain missing, extra, reordered, paraphrased, or contradictory bytes');
  if (sha256(candidate.bytes) !== candidate.dispatchSha256) fail('dispatch.dispatchSha256', 'does not match exact dispatch bytes');
  return true;
}

validateV2SourceBytes();

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
  const items = fixture.cases.map((pilotCase) => pilotCase.blindedInput);
  const expectedItemIds = items.map((item) => item.itemId);
  const stageCounts = Object.entries(profiles).map(([stage, profile]) => {
    const dispatches = renderStageDispatches({ promptVersion: 'v2', stage, modelAlias: profile.modelAlias, reasoning: profile.reasoning, expectedItemIds, items });
    dispatches.forEach((dispatch) => validateRenderedDispatch({ promptVersion: 'v2', stage, modelAlias: profile.modelAlias, reasoning: profile.reasoning, expectedItemIds, items }, dispatch));
    return `${stage}:${dispatches.length}`;
  });
  console.log(`validated prompted-screening v2 sources and deterministic synthetic dispatch plan ${stageCounts.join(',')}`);
}
