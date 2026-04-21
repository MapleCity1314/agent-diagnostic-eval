import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { test, expect } from 'vitest';

test('D2-S2a: "use cache" directive is present in ProductList', () => {
  const content = readFileSync('components/ProductList.tsx', 'utf-8');
  const hasDirective = content.includes('"use cache"') || content.includes("'use cache'");
  expect(hasDirective, 'ProductList should contain the "use cache" directive').toBe(true);
});

test('D2-S2b: cacheTag() is called with a category-derived argument', () => {
  const content = readFileSync('components/ProductList.tsx', 'utf-8');
  expect(content, 'cacheTag should be called').toMatch(/cacheTag\s*\(/);
  expect(
    content,
    'cacheTag argument should reference the category prop'
  ).toMatch(/cacheTag\s*\([^)]*category/);
});

test('D2-S2c: no forbidden APIs (cookies/headers/searchParams) in ProductList', () => {
  const content = readFileSync('components/ProductList.tsx', 'utf-8');
  expect(content, 'cookies() must not be called inside cached scope').not.toMatch(
    /\bcookies\s*\(\)/
  );
  expect(content, 'headers() must not be called inside cached scope').not.toMatch(
    /\bheaders\s*\(\)/
  );
  expect(
    content,
    'searchParams must not be accessed inside cached scope'
  ).not.toMatch(/\bsearchParams\b/);
});

test('D2-S3: unstable_cache is not used as a fallback in ProductList', () => {
  const content = readFileSync('components/ProductList.tsx', 'utf-8');
  expect(
    content,
    'unstable_cache should not appear — agent should not fall back to the old API'
  ).not.toContain('unstable_cache');
});

test('D2-S4: next build succeeds', { timeout: 120000 }, () => {
  execSync('npm run build', { stdio: 'pipe' });
});
