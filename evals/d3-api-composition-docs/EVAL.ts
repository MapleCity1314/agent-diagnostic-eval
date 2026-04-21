import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { test, expect } from 'vitest';

const PAGE = 'app/analytics/page.tsx';

test('D3-S2a: connection() is called at component body level (not inside after)', () => {
  const content = readFileSync(PAGE, 'utf-8');
  expect(content, 'connection() must be present').toMatch(/\bconnection\s*\(\)/);

  const connectionIdx = content.search(/\bconnection\s*\(\)/);
  const afterIdx = content.search(/\bafter\s*\(/);

  if (afterIdx !== -1) {
    expect(
      connectionIdx,
      'connection() must appear before after() in the file — it should be at component body level, not inside the after callback'
    ).toBeLessThan(afterIdx);
  }
});

test('D3-S2b: after() is used and its callback calls sendEvent', () => {
  const content = readFileSync(PAGE, 'utf-8');
  expect(content, 'after() should be used for non-blocking post-response work').toMatch(
    /\bafter\s*\(/
  );
  expect(content, 'sendEvent should be called inside the after() callback').toContain(
    'sendEvent'
  );
});

test('D3-S2c: connection() is not called inside the after() callback', () => {
  const content = readFileSync(PAGE, 'utf-8');

  // Locate after( … ) call and check its interior doesn't contain connection()
  // Using a heuristic: connection() index must be less than after() index.
  // This catches the common case where the agent places connection() inside after.
  const connectionIdx = content.search(/\bconnection\s*\(\)/);
  const afterIdx = content.search(/\bafter\s*\(/);

  if (connectionIdx === -1 || afterIdx === -1) return; // other tests cover absence

  expect(
    connectionIdx,
    'connection() appears after after() — likely placed inside the after() callback, which is forbidden'
  ).toBeLessThan(afterIdx);
});

test('D3-S2d: request timestamp is captured before the after() call', () => {
  const content = readFileSync(PAGE, 'utf-8');
  const timestampIdx = content.search(/Date\.now\s*\(\)|new Date\s*\(\)/);
  const afterIdx = content.search(/\bafter\s*\(/);

  expect(
    timestampIdx,
    'Timestamp (Date.now() or new Date()) should be created to capture request time'
  ).toBeGreaterThan(-1);

  if (afterIdx !== -1) {
    expect(
      timestampIdx,
      'Timestamp must be captured before the after() call — not inside its callback'
    ).toBeLessThan(afterIdx);
  }
});

test('D3-S4: next build succeeds', { timeout: 120000 }, () => {
  execSync('npm run build', { stdio: 'pipe' });
});
