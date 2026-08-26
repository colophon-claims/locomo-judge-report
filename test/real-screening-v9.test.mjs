import test from 'node:test';

test('completed evidence-aware real screening v9 remains closed and not frozen', async () => {
  await import('../scripts/validate-real-screening-v9.mjs');
});
