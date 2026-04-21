Add caching to the `ProductList` component so it does not re-fetch data on every request. The cache should be invalidated per category — clearing the cache for "electronics" should not affect the cache for "clothing".

Requirements:
- Add caching to `components/ProductList.tsx`
- The cache must be per-category: different categories get separate cache entries
- Implement tag-based invalidation so the cache for a specific category can be cleared
- The existing component interface (props, return type) must not change
- The build must succeed with `npm run build`
