# `connection()` — Dynamic Rendering API

## Overview

`connection()` is a Next.js 15 function that opts a page or component into **dynamic rendering**. When called, it signals to the Next.js runtime that the enclosing Server Component cannot be statically generated and must be rendered fresh on every incoming request.

Use `connection()` when your page needs access to per-request information (headers, cookies, search params, real-time data) and must not be cached at the page level.

## Why This Replaced `unstable_noStore()`

`unstable_noStore()` was the previous API for opting out of static caching. It has been deprecated and replaced by `connection()`.

| | `unstable_noStore()` | `connection()` |
|---|---|---|
| **Status** | Deprecated | Current (Next.js 15+) |
| **Import** | `next/cache` | `next/server` |
| **Return type** | `void` | `Promise<void>` |
| **Must be awaited** | No | Yes |
| **Semantics** | Disables caching | Signals need for active connection |

> **Migration:** Replace `unstable_noStore()` with `await connection()`. Update the import path from `next/cache` to `next/server`.

## Import

```typescript
import { connection } from 'next/server';
```

## Basic Usage

```typescript
import { connection } from 'next/server';

export default async function Page() {
  await connection();

  // Everything below this line renders dynamically on every request
  const data = await fetch('https://api.example.com/live', {
    cache: 'no-store',
  });
  const json = await data.json();

  return (
    <main>
      <h1>Live Data</h1>
      <p>{json.value}</p>
    </main>
  );
}
```

## Call Position

Call `connection()` at the top of your Server Component function body, before any data fetching that requires fresh data:

```typescript
export default async function Page() {
  await connection(); // ← call at the top

  const freshData = await db.query(...);
  return <div>{freshData}</div>;
}
```

You can also call it inside a data-fetching helper:

```typescript
import { connection } from 'next/server';

async function getLiveMetrics() {
  await connection(); // opts the calling page into dynamic rendering
  return fetchMetricsFromAPI();
}

export default async function DashboardPage() {
  const metrics = await getLiveMetrics();
  return <Dashboard data={metrics} />;
}
```

## What It Does

Calling `await connection()` does two things:

1. **Marks the page as dynamic.** Next.js skips static generation for any page that calls `connection()` in its render tree.
2. **Awaits the incoming request.** The returned Promise resolves when the active HTTP request context is available. This ensures any subsequent code has access to request-scoped data.

## When to Use It

Use `connection()` when your page must:

- Read real-time or user-specific data that changes per request
- Access request headers or cookies without using the `cookies()` / `headers()` functions
- Ensure the page is never served from a static cache

Do **not** use `connection()` if:

- Your page can use Incremental Static Regeneration (`revalidate`)
- You only need to disable the `fetch` cache for a specific request (use `fetch(url, { cache: 'no-store' })` instead)
- You are inside an `after()` callback — `connection()` requires an active request and will throw if called after the response has been sent

## Migration from `unstable_noStore`

**Before:**

```typescript
import { unstable_noStore } from 'next/cache';

export default async function Page() {
  unstable_noStore();
  const data = await fetchData();
  return <div>{data}</div>;
}
```

**After:**

```typescript
import { connection } from 'next/server';

export default async function Page() {
  await connection();
  const data = await fetchData();
  return <div>{data}</div>;
}
```

Key differences in the migration:
- Change the import from `'next/cache'` to `'next/server'`
- Change `unstable_noStore()` to `await connection()`
- Add `async` to the function if it is not already async

## Using with Data Fetching Functions

If you call `connection()` inside a shared data-fetching utility, any Server Component that calls that utility will automatically be opted into dynamic rendering:

```typescript
// lib/live-data.ts
import { connection } from 'next/server';

export async function getLiveStockPrice(symbol: string) {
  await connection(); // the calling page becomes dynamic
  const res = await fetch(`https://api.example.com/stocks/${symbol}`, {
    cache: 'no-store',
  });
  return res.json();
}
```

## Error Cases

**Calling `connection()` in a Client Component** will throw. `connection()` is a Server-only API.

**Calling `connection()` inside `after()`** will throw, because `after()` runs after the response has been sent and there is no active request context.

## TypeScript

`connection` is typed as:

```typescript
function connection(): Promise<void>
```

It accepts no arguments and returns a Promise that must be awaited.
