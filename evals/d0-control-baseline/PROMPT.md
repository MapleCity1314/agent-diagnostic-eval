Use `unstable_cache` from `next/cache` to add per-category caching to the `ProductList` component.

Requirements:
- Wrap the `getProducts` call in `unstable_cache`
- Configure tag-based cache invalidation so each category has its own tag
- The cache key must include the `category` value so different categories get separate cache entries
- The existing component props and return shape must not change
