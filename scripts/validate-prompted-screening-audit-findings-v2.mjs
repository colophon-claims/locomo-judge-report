import { parsePromptedScreeningAuditFindingsV1 } from './validate-prompted-screening-audit-findings-v1.mjs';

function fail(path, detail) { throw new Error(`${path}: ${detail}`); }

export function parsePromptedScreeningAuditFindingsV2(bytes, options = {}) {
  if (!Buffer.isBuffer(bytes)) fail('auditFindingsBytes', 'must be exact bytes');
  const raw = bytes.toString('utf8');
  if (!Buffer.from(raw).equals(bytes) || raw.length === 0 || raw.endsWith('\n') || raw.includes('\r') || raw.includes(String.fromCodePoint(0x2014)) || raw.trim() !== raw) {
    fail('auditFindingsBytes', 'must be canonical UTF-8 final-message text without surrounding whitespace, terminal newline, or em dash');
  }
  return parsePromptedScreeningAuditFindingsV1(Buffer.concat([bytes, Buffer.from('\n')]), options);
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  console.log('validated no-terminal-LF audit findings transport parser');
}
