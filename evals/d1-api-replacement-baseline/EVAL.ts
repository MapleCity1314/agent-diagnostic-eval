import { readFileSync, readdirSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';
import { test, expect } from 'vitest';

function getSourceFiles(dir = '.'): string[] {
  const skip = new Set(['node_modules', '.next', 'docs', 'dist', '.git']);
  const result: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) result.push(...getSourceFiles(full));
    else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) result.push(full);
  }
  return result;
}

test('D1-S2a: connection() is imported from next/server', () => {
  const files = getSourceFiles();
  const hasConnection = files.some((f) => {
    const c = readFileSync(f, 'utf-8');
    return c.includes('connection') && c.includes('next/server');
  });
  expect(hasConnection, 'No file imports connection from next/server').toBe(true);
});

test('D1-S2b: unstable_noStore is absent from all source files', () => {
  const files = getSourceFiles();
  const violators = files.filter((f) =>
    readFileSync(f, 'utf-8').includes('unstable_noStore')
  );
  expect(
    violators,
    `unstable_noStore still present in: ${violators.join(', ')}`
  ).toHaveLength(0);
});

test('D1-S4: next build succeeds', { timeout: 120000 }, () => {
  execSync('npm run build', { stdio: 'pipe' });
});
