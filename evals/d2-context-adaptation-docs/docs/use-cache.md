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

### Basic usage (function-level)

```typescript
async function getUser(id: string) {
  'use cache';
  return db.users.findUnique({ where: { id } });
}
```

The function's return value is cached after the first call. Subsequent calls with the same arguments return the cached result.

### Another example

```typescript
async function getSiteConfig() {
  'use cache';
  const res = await fetch('https://api.example.com/config');
  return res.json();
}
```

### Scope rules

The `"use cache"` directive applies to the entire function body. Code inside a `"use cache"` function must not:

- Call `cookies()`
- Call `headers()`
- Access `searchParams`

These APIs depend on the incoming request and are not available in a cached context. Calling them inside a `"use cache"` function will cause a build error.

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
async function getNewsArticle(id: string) {
  'use cache';
  cacheTag('news', 'articles');
  return db.articles.findUnique({ where: { id } });
}
```

### Invalidating a tag

To clear all cache entries with a given tag, call `revalidateTag` from a Server Action or Route Handler:

```typescript
import { revalidateTag } from 'next/cache';

export async function clearProductCache() {
  'use server';
  revalidateTag('products');
}
```

### Notes

- `cacheTag()` must be called inside a `"use cache"` function.
- Tags are strings. Use consistent naming conventions.
- A cache entry can have multiple tags; any matching `revalidateTag` call will invalidate it.

---

## Section 3 — Constraints

The following APIs **must not** be called inside a `"use cache"` function:

| Forbidden API | Reason |
|---|---|
| `cookies()` | Reads the incoming request's cookies — not available in cached context |
| `headers()` | Reads the incoming request's headers — not available in cached context |
| `searchParams` | Page-level search parameters tied to the specific request |

Calling any of these inside a `"use cache"` function will result in a **build error** or a **runtime error**.

If you need request-specific data, compute it **outside** the cached function and pass it as an argument:

```typescript
// ✗ Wrong — reads cookies inside cached function
async function getCart() {
  'use cache';
  const cookieStore = cookies(); // ERROR
  const userId = cookieStore.get('userId');
  return db.cart.findMany({ where: { userId } });
}

// ✓ Correct — pass user ID as argument
async function getCart(userId: string) {
  'use cache';
  cacheTag(`cart-${userId}`);
  return db.cart.findMany({ where: { userId } });
}

// In the component (outside cached scope):
const cookieStore = await cookies();
const userId = cookieStore.get('userId')?.value;
const cart = await getCart(userId);
```
