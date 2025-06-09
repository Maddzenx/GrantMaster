import { getRequestId } from '../../../lib/requestId';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getUtlysningar as realGetUtlysningar } from '../../../services/vinnovaApiClient';
import { requireUser as realRequireUser } from '../../../lib/requireUser';
import setCorsHeaders from '../../../lib/cors';
const realSetCorsHeaders = setCorsHeaders;
import { simpleRateLimit as realSimpleRateLimit } from '../../../lib/simpleRateLimit';
import { utlysningarQuerySchema as realUtlysningarQuerySchema } from '../../../lib/validation/utlysningarQuery';
import { validate as realValidate } from '../../../lib/validate';
import { handleApiError as realHandleApiError } from '../../../lib/handleApiError';
import { CircuitBreaker as RealCircuitBreaker } from '../../../lib/circuitBreaker';
import { setCache as realSetCache, getCache as realGetCache } from '../../../lib/simpleCache';
import { retry } from '../../../lib/retry';
import { logWarn } from '../../../lib/log';
import { fetchUtlysningar } from '../../../services/vinnova';

console.log('VINNOVA_TENANT_ID:', process.env.VINNOVA_TENANT_ID);
console.log('VINNOVA_CLIENT_ID:', process.env.VINNOVA_CLIENT_ID);
console.log('VINNOVA_CLIENT_SECRET:', process.env.VINNOVA_CLIENT_SECRET ? '***set***' : '***missing***');
console.log('VINNOVA_SCOPE:', process.env.VINNOVA_SCOPE);
console.log('VINNOVA_SUBSCRIPTION_KEY:', process.env.VINNOVA_SUBSCRIPTION_KEY ? '***set***' : '***missing***');

// Dependency-injectable handler
export async function utlysningarHandler(
  req: NextApiRequest,
  res: NextApiResponse,
  deps?: {
    getUtlysningar?: typeof realGetUtlysningar,
    requireUser?: typeof realRequireUser,
    setCorsHeaders?: typeof realSetCorsHeaders,
    simpleRateLimit?: typeof realSimpleRateLimit,
    utlysningarQuerySchema?: typeof realUtlysningarQuerySchema,
    validate?: typeof realValidate,
    handleApiError?: typeof realHandleApiError,
    CircuitBreaker?: typeof RealCircuitBreaker,
    setCache?: typeof realSetCache,
    getCache?: typeof realGetCache,
  }
) {
  const getUtlysningar = deps?.getUtlysningar || realGetUtlysningar;
  const requireUser = deps?.requireUser || realRequireUser;
  const setCorsHeaders = deps?.setCorsHeaders || realSetCorsHeaders;
  const simpleRateLimit = deps?.simpleRateLimit || realSimpleRateLimit;
  const utlysningarQuerySchema = deps?.utlysningarQuerySchema || realUtlysningarQuerySchema;
  const validate = deps?.validate || realValidate;
  const handleApiError = deps?.handleApiError || realHandleApiError;
  const CircuitBreaker = deps?.CircuitBreaker || RealCircuitBreaker;
  const setCache = deps?.setCache || realSetCache;
  const getCache = deps?.getCache || realGetCache;

  const requestId = getRequestId(req);
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  // Use IP address or user ID as the key
  const key = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  if (!simpleRateLimit(String(key), 10, 60 * 1000)) {
    res.status(429).json({
      error: 'Rate limit exceeded',
      requestId: requestId
    });
    return;
  }
  const user = await requireUser(req, res);
  if (!user) {
    res.end();
    return;
  }
  // Validate query parameters
  const validatedQuery = validate(utlysningarQuerySchema, req.query, res);
  if (!validatedQuery) {
    res.end();
    return;
  }
  const utlysningarBreaker = new CircuitBreaker({
    failureThreshold: 3,
    cooldownMs: 15000,
    successThreshold: 1,
  });
  try {
    // Wrap the Vinnova API call in retry and circuit breaker
    const getWithRetry = () => retry(
      () => getUtlysningar(validatedQuery),
      3, // maxAttempts
      200 // initial delayMs
    );
    const data = await utlysningarBreaker.exec(getWithRetry);
    // Whitelist fields for each utlysning
    const sanitizedResults = Array.isArray(data.results)
      ? data.results.map(u => ({
          Diarienummer: u.Diarienummer,
          Titel: u.Titel,
          Beskrivning: u.Beskrivning,
          Publiceringsdatum: u.Publiceringsdatum,
          // Add more safe fields as needed
        }))
      : [];
    const response = { ...data, results: sanitizedResults };
    // Cache the response for 5 minutes
    setCache('utlysningar:' + JSON.stringify(validatedQuery), response, 5 * 60 * 1000);
    res.status(200).json(response);
  } catch (error: any) {
    if (error instanceof Error && error.message === 'Circuit breaker is open') {
      logWarn('Vinnova API circuit breaker open', { endpoint: '/api/vinnova/utlysningar', requestId });
      // Try to serve cached data if available
      const cached = getCache('utlysningar:' + JSON.stringify(validatedQuery));
      if (cached) {
        res.status(200).json({
          ...cached,
          stale: true,
          warning: 'Data may be outdated due to upstream issues.',
          requestId: requestId
        });
        return;
      }
      res.status(503).json({
        error: 'Vinnova API temporarily unavailable due to repeated failures. Please try again later.',
        requestId: requestId
      });
      return;
    }
    // On other errors, also try to serve cache
    const cached = getCache('utlysningar:' + JSON.stringify(validatedQuery));
    if (cached) {
      res.status(200).json({
        ...cached,
        stale: true,
        warning: 'Data may be outdated due to upstream issues.',
        requestId: requestId
      });
      return;
    }
    handleApiError(res, error);
  }
}

// Default export uses real dependencies
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const data = await fetchUtlysningar();
    res.status(200).json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch grants' });
  }
} 