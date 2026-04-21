Update the analytics dashboard page to meet two requirements:

1. **Dynamic rendering** — The page must render fresh data on every request (not served from a static cache).
2. **Non-blocking analytics** — After each page render, send an analytics event via `sendEvent` from `lib/analytics.ts`. The event must not block the response — the user should receive the page immediately, and the analytics call happens after the response is sent.

The analytics event payload must include a `timestamp` field that captures when the request was received (not when the event fires).

Requirements:
- Do not use `setTimeout` or any manual delay to simulate non-blocking behavior
- The timestamp in the analytics payload must represent the request time, not the post-response time
- The build must succeed with `npm run build`
