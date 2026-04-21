# Next.js Caching APIs

---

## Section 1 — `"use cache"` Directive

The `"use cache"` directive marks a function as cacheable. Add it as the first statement inside any `async` function to cache its return value.

**This is an experimental feature.** Your `next.config.ts` must include:

```typescript
experimental: {
  useCache: true,
}
```

Without this flag, using the `"use cache"` directive will cause a build error.

### Basic usage (function-level)

```typescript
async function getUser(id: string) {
  'use cache';
  return db.users.findUnique({ where: { id } });
}
```

### Component-level usage

The directive can also be placed at the top of an async Server Component function:

```typescript
export async function MyComponent() {
  'use cache';
  const data = await fetchData();
  return <div>{data.value}</div>;
}
```

### Migration from `unstable_cache`

**Before:**

```typescript
import { unstable_cache } from 'next/cache';

const getCachedData = unstable_cache(
  async () => db.data.findMany(),
  ['data'],
  { revalidate: 300, tags: ['data'] }
);

export async function MyComponent() {
  const data = await getCachedData();
  return <ul>{data.map(d => <li key={d.id}>{d.name}</li>)}</ul>;
}
```

**After:**

```typescript
export async function MyComponent() {
  'use cache';
  cacheTag('data');
  cacheLife('minutes');
  const data = await db.data.findMany();
  return <ul>{data.map(d => <li key={d.id}>{d.name}</li>)}</ul>;
}
```

---

## Section 2 — `cacheTag()`

`cacheTag()` associates the current cache entry with one or more string tags. Tags let you invalidate specific cache entries on demand using `revalidateTag()`.

### Import

```typescript
import { cacheTag } from 'next/cache';
```

### Basic usage

```typescript
async function getProducts() {
  'use cache';
  cacheTag('products');
  return db.products.findMany();
}
```

### Multiple tags

```typescript
async function getArticle(id: string) {
  'use cache';
  cacheTag('articles', `article-${id}`);
  return db.articles.findUnique({ where: { id } });
}
```

### Invalidating a tag

```typescript
import { revalidateTag } from 'next/cache';

export async function clearCache() {
  'use server';
  revalidateTag('products');
}
```

---

## Section 3 — Constraints

The following APIs must not be called inside a `"use cache"` function:

| Forbidden API | Reason |
|---|---|
| `cookies()` | Tied to the incoming request |
| `headers()` | Tied to the incoming request |
| `searchParams` | Tied to the specific request |

Calling any of these inside a `"use cache"` function will result in a build or runtime error.

---

## Section 4 — `cacheLife()`

`cacheLife()` sets the cache duration for the current entry.

```typescript
import { cacheLife } from 'next/cache';

async function getData() {
  'use cache';
  cacheLife('minutes'); // expires after a few minutes
  return fetchData();
}
```

Predefined profiles: `'seconds'`, `'minutes'`, `'hours'`, `'days'`, `'weeks'`, `'max'`.
