export interface DashboardMetrics {
  activeUsers: number;
  requestsPerMinute: number;
  errorRate: number;
  updatedAt: string;
}

export interface StatsResult {
  totalRequests: number;
  avgResponseMs: number;
  p99ResponseMs: number;
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  return {
    activeUsers: Math.floor(Math.random() * 500),
    requestsPerMinute: Math.floor(Math.random() * 10000),
    errorRate: Math.random() * 0.05,
    updatedAt: new Date().toISOString(),
  };
}

export async function getStats(): Promise<StatsResult> {
  return {
    totalRequests: Math.floor(Math.random() * 1_000_000),
    avgResponseMs: Math.floor(Math.random() * 200),
    p99ResponseMs: Math.floor(Math.random() * 800),
  };
}
