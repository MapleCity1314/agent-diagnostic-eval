import { unstable_cache, unstable_noStore } from 'next/cache';
import { getDashboardMetrics } from '../../lib/db';
import { Stats } from '../../components/Stats';

const getCachedMetrics = unstable_cache(
  getDashboardMetrics,
  ['dashboard-metrics'],
  { revalidate: 60 }
);

export default async function DashboardPage() {
  unstable_noStore();
  const metrics = await getCachedMetrics();

  return (
    <main>
      <h1>Dashboard</h1>
      <section>
        <h2>Live Metrics</h2>
        <p>Active users: {metrics.activeUsers}</p>
        <p>Requests/min: {metrics.requestsPerMinute}</p>
        <p>Error rate: {(metrics.errorRate * 100).toFixed(2)}%</p>
        <p>Updated: {metrics.updatedAt}</p>
      </section>
      <Stats />
    </main>
  );
}
