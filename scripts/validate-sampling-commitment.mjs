import { readFileSync } from 'node:fs';

const input = process.argv[2];
if (input === undefined) {
  console.error('usage: node scripts/validate-sampling-commitment.mjs <commitment.json>');
  process.exitCode = 2;
} else {
  const document = JSON.parse(readFileSync(input, 'utf8'));
  const sha256 = /^sha256:[a-f0-9]{64}$/u;
  if (document.schema !== 'https://colophon-claims.github.io/locomo-judge-report/sampling-commitment/v1'
    || !sha256.test(document.commitmentSha256)
    || !sha256.test(document.manifestSha256)
    || typeof document.committedAt !== 'string'
    || Number.isNaN(Date.parse(document.committedAt))) {
    throw new Error('sampling commitment does not satisfy the v1 interface');
  }
  console.log('sampling commitment interface valid');
}
