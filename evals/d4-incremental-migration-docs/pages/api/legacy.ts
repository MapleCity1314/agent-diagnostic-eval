import type { NextApiRequest, NextApiResponse } from 'next';

type LegacyData = {
  status: string;
  timestamp: string;
  requestId: string;
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<LegacyData>
) {
  if (req.method !== 'GET') {
    res.status(405).end();
    return;
  }

  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    requestId: Math.random().toString(36).slice(2),
  });
}
