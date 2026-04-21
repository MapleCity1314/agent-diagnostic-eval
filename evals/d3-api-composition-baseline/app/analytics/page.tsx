import { sendEvent } from '../../lib/analytics';

export default async function AnalyticsDashboardPage() {
  const data = {
    pageViews: 12483,
    uniqueVisitors: 4219,
    bounceRate: 0.34,
    updatedAt: new Date().toISOString(),
  };

  return (
    <main>
      <h1>Analytics Dashboard</h1>
      <ul>
        <li>Page views: {data.pageViews}</li>
        <li>Unique visitors: {data.uniqueVisitors}</li>
        <li>Bounce rate: {(data.bounceRate * 100).toFixed(1)}%</li>
        <li>Updated: {data.updatedAt}</li>
      </ul>
    </main>
  );
}
