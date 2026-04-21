# `after()` — Post-Response Execution API

## Overview

`after()` schedules a callback to run **after the response has been sent** to the client. Use it for work that should not block the response: logging, analytics, cache warming, cleanup tasks.

The callback runs after the response is fully flushed. The user receives the page response immediately; your callback executes independently.

## Import

```typescript
import { after } from 'next/server';
```

## Basic Usage

```typescript
import { after } from 'next/server';

export default async function Page() {
  after(async () => {
    console.log('Page rendered at', new Date().toISOString());
  });

  return <main>Hello</main>;
}
```

## Sending Analytics After a Response

```typescript
import { after } from 'next/server';

export default async function Page() {
  after(async () => {
    await fetch('https://analytics.example.com/events', {
      method: 'POST',
      body: JSON.stringify({ event: 'page_view' }),
    });
  });

  return <main>Content</main>;
}
```

## Capturing Request Data for Use in the Callback

The `after()` callback runs after the response is sent. If you need data from the active request (such as the request timestamp), capture it **before** calling `after()` and pass it into the callback via closure:

```typescript
import { after } from 'next/server';

export default async function Page() {
  // Capture request-time data before scheduling the callback
  const requestTimestamp = new Date().toISOString();

  after(async () => {
    // Use the captured value — the original request is no longer active here
    await sendAnalytics({ timestamp: requestTimestamp });
  });

  return <main>Content</main>;
}
```

## Important Constraint: Do Not Call `connection()` Inside `after()`

**Do not call `connection()` inside an `after()` callback.**

`connection()` signals that the code needs an active HTTP request context. However, `after()` runs *after* the response has been sent and the request is no longer active. Calling `connection()` inside `after()` will throw a runtime error because no request context is available.

```typescript
// ✗ Wrong — connection() inside after() will throw
after(async () => {
  await connection(); // ERROR: no active request
  const data = await getData();
  await logData(data);
});

// ✓ Correct — call connection() at the component level, before after()
await connection();
after(async () => {
  const data = await getData();
  await logData(data);
});
```

If your page needs dynamic rendering (`connection()`) AND post-response work (`after()`), call them in this order:

1. `await connection()` — at the top of the component body
2. Render your page content
3. `after(...)` — schedule post-response work using captured request data

## TypeScript

```typescript
function after(callback: () => void | Promise<void>): void
```

The callback can be synchronous or async. `after()` itself is synchronous — it registers the callback but does not await it.

## Notes

- Works in Server Components, Server Actions, and Route Handlers.
- Does not work in Client Components.
- The callback is not guaranteed to run if the server process exits before the response is flushed (e.g., serverless function timeout).
