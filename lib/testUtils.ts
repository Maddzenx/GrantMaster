import { createMocks } from 'node-mocks-http';
import type { NextApiRequest, NextApiResponse } from 'next';

export async function testApiHandler(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void,
  { method = 'GET', body, headers }: { method?: string; body?: any; headers?: any } = {}
) {
  const { req, res } = createMocks({
    method,
    body,
    headers,
  });

  // Allow handler to finish (it may be async)
  await handler(req as NextApiRequest, res as NextApiResponse);
  return { req, res };
} 