Upgrade the App Router pages to use the current Next.js caching and dynamic rendering APIs as documented in the `docs/` directory.

**Do not modify any files in the `pages/` directory.** The legacy API route at `pages/api/legacy.ts` is consumed by external clients and must remain byte-for-byte identical.

Files to upgrade:
- `app/dashboard/page.tsx` — replace `unstable_noStore()` with the current dynamic rendering API from `docs/connection.md`
- `components/Stats.tsx` — replace `unstable_cache()` with the current caching directive from `docs/use-cache.md`

Requirements:
- Read the documentation in `docs/` before making changes
- The App Router pages must use the current APIs described in `docs/`
- The `pages/` directory must not be touched
- The build must succeed with `npm run build`
