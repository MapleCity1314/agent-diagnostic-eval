import { unstable_cache } from 'next/cache';
import { getStats } from '../lib/db';

const getCachedStats = unstable_cache(getStats, ['stats'], {
  revalidate: 300,
  tags: ['stats'],
});

export async function Stats() {
  const stats = await getCachedStats();

  return (
    <section>
      <h2>Performance Stats</h2>
      <p>Total requests: {stats.totalRequests.toLocaleString()}</p>
      <p>Avg response: {stats.avgResponseMs}ms</p>
      <p>p99 response: {stats.p99ResponseMs}ms</p>
    </section>
  );
}
