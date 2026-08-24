#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const IDENTITY_PROJECTION_DOMAIN = 'colophon-screening-identity/v1\0';
const opaqueIdentity = /^[0-9a-f]{32}$/u;

function fail(message) {
  throw new Error(`screening identity projection refused: ${message}`);
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

export function projectIdentity(itemId) {
  if (typeof itemId !== 'string' || !opaqueIdentity.test(itemId)) fail('identity must be exactly 32 lowercase hexadecimal characters');
  return `sha256:${createHash('sha256').update(IDENTITY_PROJECTION_DOMAIN, 'utf8').update(itemId, 'utf8').digest('hex')}`;
}

export function projectPool(itemIds) {
  if (!Array.isArray(itemIds) || itemIds.length !== 664) fail('pool must contain exactly 664 identities');
  if (itemIds.some((itemId, index, values) => !opaqueIdentity.test(itemId) || (index > 0 && values[index - 1] >= itemId))) {
    fail('pool identities must be sorted, unique, and lowercase hexadecimal');
  }
  const candidateItemDigests = itemIds.map(projectIdentity).sort();
  if (new Set(candidateItemDigests).size !== 664) fail('projected identities must remain unique');
  return candidateItemDigests;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = process.argv[2];
  if (input === undefined) {
    console.error('usage: node scripts/project-screening-identities-v1.mjs <sorted-opaque-identities.json>');
    process.exitCode = 2;
  } else {
    const raw = readFileSync(input, 'utf8');
    const itemIds = JSON.parse(raw);
    if (raw !== `${canonical(itemIds)}\n`) fail('input must be canonical JSON followed by LF');
    process.stdout.write(`${canonical(projectPool(itemIds))}\n`);
  }
}
