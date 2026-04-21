export interface AnalyticsPayload {
  event: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export async function sendEvent(payload: AnalyticsPayload): Promise<void> {
  // In production this would POST to an analytics service.
  // Simulated with a small delay.
  await new Promise((resolve) => setTimeout(resolve, 50));
  console.log('[analytics]', payload.event, payload.timestamp);
}
