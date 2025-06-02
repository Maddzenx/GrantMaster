import type { NextApiRequest, NextApiResponse } from 'next';
import { syncVinnovaGrants } from '../../../services/vinnovaSync';

// Set your secret in .env as CRON_SECRET=your_secret_value
const CRON_SECRET = process.env.CRON_SECRET;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('CRON_SECRET from env:', CRON_SECRET);
  console.log('Provided secret:', req.headers['x-cron-secret']);
  // Require POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Authenticate using x-cron-secret header
  const providedSecret = req.headers['x-cron-secret'];
  if (!CRON_SECRET || !providedSecret || providedSecret !== CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const report = await syncVinnovaGrants();
    res.status(200).json({ success: true, report });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || String(error) });
  }
} 