import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { test, expect } from 'vitest';

test('D0-S2a: unstable_cache wraps data fetching in ProductList', () => {
  const content = readFileSync('components/ProductList.tsx', 'utf-8');
  expect(content, 'ProductList should use unstable_cache').toContain('unstable_cache');
});

test('D0-S2b: cache is configured with category-based tags', () => {
  const content = readFileSync('components/ProductList.tsx', 'utf-8');
  expect(content, 'unstable_cache should be present').toContain('unstable_cache');
  const hasCategoryTag =
    (content.includes('tags') && content.includes('category')) ||
    content.includes('revalidateTag');
  expect(
    hasCategoryTag,
    'Cache should reference category for per-category tag invalidation'
  ).toBe(true);
});

test('D0-S4: next build succeeds', { timeout: 120000 }, () => {
  execSync('npm run build', { stdio: 'pipe' });
});
