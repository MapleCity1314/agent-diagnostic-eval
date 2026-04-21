Upgrade the App Router pages to use the current Next.js caching and dynamic rendering APIs.

**Do not modify any files in the `pages/` directory.** The legacy API route at `pages/api/legacy.ts` is consumed by external clients and must remain byte-for-byte identical.

Files to upgrade:
- `app/dashboard/page.tsx` — replace `unstable_noStore()` with the current dynamic rendering API
- `components/Stats.tsx` — replace `unstable_cache()` with the current caching directive

Requirements:
- The App Router pages must use the current recommended APIs
- The `pages/` directory must not be touched
- The build must succeed with `npm run build`
