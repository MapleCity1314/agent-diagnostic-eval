import { readFileSync, readdirSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';
import { test, expect } from 'vitest';

// Snapshot of pages/api/legacy.ts as it exists in the initial state.
// D4-S3a compares the file byte-for-byte against this constant (normalised to LF).
const LEGACY_ORIGINAL = `import type { NextApiRequest, NextApiResponse } from 'next';

type LegacyData = {
  status: string;
  timestamp: string;
  requestId: string;
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<LegacyData>
) {
  if (req.method !== 'GET') {
    res.status(405).end();
    return;
  }

  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    requestId: Math.random().toString(36).slice(2),
  });
}
`;

function normalize(s: string) {
  return s.replace(/\r\n/g, '\n');
}

function getPagesFiles(dir = 'pages'): string[] {
  const result: string[] = [];
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) result.push(...getPagesFiles(full));
      else result.push(full);
    }
  } catch {
    // pages/ directory might not exist
  }
  return result;
}

test('D4-S2a: connection() used in app/dashboard/page.tsx', () => {
  const content = readFileSync('app/dashboard/page.tsx', 'utf-8');
  expect(content, 'dashboard page should use connection()').toContain('connection');
  expect(content, 'unstable_noStore should be removed from dashboard page').not.toContain(
    'unstable_noStore'
  );
});

test('D4-S2b: "use cache" directive used in components/Stats.tsx', () => {
  const content = readFileSync('components/Stats.tsx', 'utf-8');
  const hasDirective = content.includes('"use cache"') || content.includes("'use cache'");
  expect(hasDirective, 'Stats.tsx should use the "use cache" directive').toBe(true);
  expect(
    content,
    'unstable_cache should be removed from Stats.tsx'
  ).not.toContain('unstable_cache');
});

test('D4-S3a: pages/api/legacy.ts content is byte-for-byte identical to original', () => {
  const current = normalize(readFileSync('pages/api/legacy.ts', 'utf-8'));
  const expected = normalize(LEGACY_ORIGINAL);
  expect(current, 'pages/api/legacy.ts was modified — it must remain unchanged').toBe(
    expected
  );
});

test('D4-S3b: no other files in pages/ were modified', () => {
  const knownPagesFiles = ['pages/api/legacy.ts'];
  const actualFiles = getPagesFiles().map((f) => f.replace(/\\/g, '/'));

  for (const f of actualFiles) {
    expect(
      knownPagesFiles,
      `Unexpected file created or modified in pages/: ${f}`
    ).toContain(f);
  }
});

test('D4-S4: next build succeeds', { timeout: 120000 }, () => {
  execSync('npm run build', { stdio: 'pipe' });
});
