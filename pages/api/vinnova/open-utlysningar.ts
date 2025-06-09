import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { date = '2017-07-01' } = req.query;
  const vinnovaUrl = `https://data.vinnova.se/api/utlysningar/${date}`;
  try {
    const response = await fetch(vinnovaUrl);
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch from Vinnova Open API' });
    }
    const data = await response.json();
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate');
    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
} 