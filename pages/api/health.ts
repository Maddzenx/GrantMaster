import { getRequestId } from '../../lib/requestId';
import type { NextApiRequest, NextApiResponse } from 'next';
import { handleApiError } from '../../lib/handleApiError';
import { ValidationError } from '../../lib/errors';
import { supabase as realSupabase } from '../../lib/supabaseClient';
import { utlysningarBreaker as realVinnovaBreaker } from './vinnova/utlysningar';

async function healthHandler(req: NextApiRequest, res: NextApiResponse, supabaseClient?: any, vinnovaBreaker?: any) {
  const requestId = getRequestId(req);
  try {
    if (req.method !== 'GET') {
      throw new ValidationError('Method not allowed');
    }

    // Check Supabase DB
    let supabaseStatus: 'ok' | 'error' = 'ok';
    const supabase = supabaseClient || realSupabase;
    try {
      const { error } = await supabase.rpc('version');
      if (error) supabaseStatus = 'error';
    } catch {
      supabaseStatus = 'error';
    }

    // Check Vinnova circuit breaker
    let vinnovaStatus: 'ok' | 'degraded' = 'ok';
    const breaker = vinnovaBreaker || realVinnovaBreaker;
    if (breaker && breaker.getState && breaker.getState() !== 'CLOSED') {
      vinnovaStatus = 'degraded';
    }

    // Check Supabase Storage
    let storageStatus: 'ok' | 'error' = 'ok';
    try {
      const { error } = await supabase.storage.listBuckets();
      if (error) storageStatus = 'error';
    } catch {
      storageStatus = 'error';
    }

    const allOk = supabaseStatus === 'ok' && vinnovaStatus === 'ok' && storageStatus === 'ok';
    res.status(allOk ? 200 : 503).json({
      status: allOk ? 'ok' : 'degraded',
      supabase: supabaseStatus,
      vinnova: vinnovaStatus,
      storage: storageStatus,
      requestId: requestId
    });
  } catch (error) {
    handleApiError(res, error);
  }
}

const handler = (req: NextApiRequest, res: NextApiResponse) => healthHandler(req, res);
export default handler;
export { healthHandler }; 