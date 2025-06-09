import type { NextApiRequest } from 'next';
const { v4: uuidv4 } = require('uuid');

export function getRequestId(req: NextApiRequest): string {
  const header = req.headers['x-request-id'];
  if (typeof header === 'string' && header.length > 0) {
    return header;
  }
  if (Array.isArray(header) && header.length > 0) {
    return header[0];
  }
  return uuidv4();
} 