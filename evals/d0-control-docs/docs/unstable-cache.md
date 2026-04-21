# `unstable_cache` — Next.js Caching API

## Overview

`unstable_cache` allows you to cache the results of expensive operations (database queries, API calls) and reuse them across requests. Data can be revalidated on a time-based schedule or on demand via tags.

## Import

```typescript
import { unstable_cache } from 'next/cache';
```

## Basic Usage

```typescript
import { unstable_cache } from 'next/cache';

const getCachedUser = unstable_cache(
  async (id: string) => {
    return db.user.findUnique({ where: { id } });
  },
  ['user'],
  { revalidate: 3600 }
);

// Use it in a Server Component
export default async function Page({ params }: { params: { id: string } }) {
  const user = await getCachedUser(params.id);
  return <div>{user.name}</div>;
}
```

## Signature

```typescript
unstable_cache<T>(
  fn: (...args: any[]) => Promise<T>,
  keyParts: string[],
  options?: {
    revalidate?: number | false;
    tags?: string[];
  }
): (...args: any[]) => Promise<T>
```

- `fn` — The async function whose result you want to cache.
- `keyParts` — A string array that identifies this cache entry. Should be unique to this query.
- `options.revalidate` — Seconds before cache expires. Set to `false` to cache indefinitely.
- `options.tags` — String array of tags for on-demand revalidation via `revalidateTag`.

## Tag-Based Invalidation

Tags let you invalidate specific cache entries on demand:

```typescript
import { unstable_cache, revalidateTag } from 'next/cache';

// Wrap with a tag
const getCachedProducts = unstable_cache(
  async (category: string) => db.products.findMany({ where: { category } }),
  ['products'],
  { tags: ['products'] }
);

// Later, in a Server Action or Route Handler:
revalidateTag('products'); // invalidates all caches tagged 'products'
```

## Per-Parameter Caching

To cache different values for different inputs, include the input in the key:

```typescript
const getCachedProducts = unstable_cache(
  async (category: string) => db.products.findMany({ where: { category } }),
  ['products', category],   // ← include runtime value in key
  { tags: [`category-${category}`] }
);
```

> **Note:** The key array is evaluated when `unstable_cache` is called (wrapping time), not when the cached function is invoked. To include a runtime parameter in the key, call `unstable_cache` inside the component:
>
> ```typescript
> export async function ProductList({ category }: { category: string }) {
>   const fetchCached = unstable_cache(
>     () => getProducts(category),
>     ['products', category],
>     { tags: [`category-${category}`] }
>   );
>   const products = await fetchCached();
>   // ...
> }
> ```

## Notes

- This API is prefixed `unstable_` because its behavior may change. It is stable in practice for caching use cases.
- Does not work in Client Components.
- Cached data is stored in the Next.js Data Cache, separate from `fetch` cache.
