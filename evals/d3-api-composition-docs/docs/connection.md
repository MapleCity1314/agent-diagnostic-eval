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

Call `connection()` at the top of your Server Component function body, before any data fetching that requires fresh data.

## What It Does

Calling `await connection()` marks the page as dynamic. Next.js skips static generation for any page that calls `connection()` in its render tree.

## Error Cases

**Calling `connection()` in a Client Component** will throw. `connection()` is a Server-only API.

**Calling `connection()` inside `after()`** will throw. See `docs/after.md` for details on this constraint.

## TypeScript

```typescript
function connection(): Promise<void>
```

It accepts no arguments and returns a Promise that must be awaited.
