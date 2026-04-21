# `connection()` — Dynamic Rendering API

## Overview

`connection()` is a Next.js 15 function that opts a page or component into **dynamic rendering**. When called, it signals to the Next.js runtime that the enclosing Server Component cannot be statically generated and must be rendered fresh on every incoming request.

## Why This Replaced `unstable_noStore()`

`unstable_noStore()` was the previous API for opting out of static caching. It has been deprecated and replaced by `connection()`.

| | `unstable_noStore()` | `connection()` |
|---|---|---|
| **Status** | Deprecated | Current (Next.js 15+) |
| **Import** | `next/cache` | `next/server` |
| **Return type** | `void` | `Promise<void>` |
| **Must be awaited** | No | Yes |

> **Migration:** Replace `unstable_noStore()` with `await connection()`. Update the import from `next/cache` to `next/server`.

## Import

```typescript
import { connection } from 'next/server';
```

## Basic Usage

```typescript
import { connection } from 'next/server';

export default async function Page() {
  await connection();

  const data = await fetch('https://api.example.com/live', { cache: 'no-store' });
  const json = await data.json();

  return <div>{json.value}</div>;
}
```

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

Changes:
1. Update the import: `next/cache` → `next/server`
2. Update the call: `unstable_noStore()` → `await connection()`
3. Ensure the function is `async`

## TypeScript

```typescript
function connection(): Promise<void>
```
