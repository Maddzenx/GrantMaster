import { getRequestId } from '../../../lib/requestId';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getAnsokningar as realGetAnsokningar } from '../../../services/vinnovaApiClient';
import { requireUser as realRequireUser } from '../../../lib/requireUser';
import setCorsHeaders from '../../../lib/cors';
const realSetCorsHeaders = setCorsHeaders;
import { simpleRateLimit as realSimpleRateLimit } from '../../../lib/simpleRateLimit';
import { ansokningarQuerySchema as realAnsokningarQuerySchema } from '../../../lib/validation/ansokningarQuery';
import { validate as realValidate } from '../../../lib/validate';
import { handleApiError as realHandleApiError } from '../../../lib/handleApiError';
import { CircuitBreaker as RealCircuitBreaker } from '../../../lib/circuitBreaker';
import { setCache as realSetCache, getCache as realGetCache } from '../../../lib/simpleCache';

// Dependency-injectable handler
export async function ansokningarHandler(
  req: NextApiRequest,
  res: NextApiResponse,
  deps?: {
    getAnsokningar?: typeof realGetAnsokningar,
    requireUser?: typeof realRequireUser,
    setCorsHeaders?: typeof realSetCorsHeaders,
    simpleRateLimit?: typeof realSimpleRateLimit,
    ansokningarQuerySchema?: typeof realAnsokningarQuerySchema,
    validate?: typeof realValidate,
    handleApiError?: typeof realHandleApiError,
    CircuitBreaker?: typeof RealCircuitBreaker,
    setCache?: typeof realSetCache,
    getCache?: typeof realGetCache,
  }
) {
  const getAnsokningar = deps?.getAnsokningar || realGetAnsokningar;
  const requireUser = deps?.requireUser || realRequireUser;
  const setCorsHeaders = deps?.setCorsHeaders || realSetCorsHeaders;
  const simpleRateLimit = deps?.simpleRateLimit || realSimpleRateLimit;
  const ansokningarQuerySchema = deps?.ansokningarQuerySchema || realAnsokningarQuerySchema;
  const validate = deps?.validate || realValidate;
  const handleApiError = deps?.handleApiError || realHandleApiError;
  const CircuitBreaker = deps?.CircuitBreaker || RealCircuitBreaker;
  const setCache = deps?.setCache || realSetCache;
  const getCache = deps?.getCache || realGetCache;

  const requestId = getRequestId(req);
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  // Use IP address or user ID as the key
  const key = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  if (!simpleRateLimit(String(key), 10, 60 * 1000)) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      requestId: requestId
    });
  }
  const user = await requireUser(req, res);
  if (!user) {
    return res.end();
  }
  // Validate query parameters
  const validatedQuery = validate(ansokningarQuerySchema, req.query, res);
  if (!validatedQuery) {
    return res.end();
  }
  const ansokningarBreaker = new CircuitBreaker({
    failureThreshold: 3,
    cooldownMs: 15000,
    successThreshold: 1,
  });
  try {
    const data = await ansokningarBreaker.exec(() => getAnsokningar(validatedQuery));
    // Whitelist fields for each application
    const sanitizedResults = Array.isArray(data.results)
      ? data.results.map(app => ({
          Diarienummer: app.Diarienummer,
          Titel: app.Titel,
          Status: app.Status,
          Beslutsdatum: app.Beslutsdatum,
          // Add more safe fields as needed
        }))
      : [];
    const response = { ...data, results: sanitizedResults };
    // Cache the response for 5 minutes
    setCache('ansokningar:' + JSON.stringify(validatedQuery), response, 5 * 60 * 1000);
    res.status(200).json(response);
  } catch (error: any) {
    if (error instanceof Error && error.message === 'Circuit breaker is open') {
      // Try to serve cached data if available
      const cached = getCache('ansokningar:' + JSON.stringify(validatedQuery));
      if (cached) {
        return res.status(200).json({
          ...cached,
          stale: true,
          warning: 'Data may be outdated due to upstream issues.',
          requestId: requestId
        });
      }
      return res.status(503).json({
        error: 'Vinnova API temporarily unavailable due to repeated failures. Please try again later.',
        requestId: requestId
      });
    }
    // On other errors, also try to serve cache
    const cached = getCache('ansokningar:' + JSON.stringify(validatedQuery));
    if (cached) {
      return res.status(200).json({
        ...cached,
        stale: true,
        warning: 'Data may be outdated due to upstream issues.',
        requestId: requestId
      });
    }
    handleApiError(res, error);
  }
}

// Default export uses real dependencies
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return ansokningarHandler(req, res);
} 