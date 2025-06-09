import { getRequestId } from '../../../lib/requestId';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getFinansieradeAktiviteter as realGetFinansieradeAktiviteter } from '../../../services/vinnovaApiClient';
import { requireUser as realRequireUser } from '../../../lib/requireUser';
import setCorsHeaders from '../../../lib/cors';
const realSetCorsHeaders = setCorsHeaders;
import { simpleRateLimit as realSimpleRateLimit } from '../../../lib/simpleRateLimit';
import { finansieradeaktiviteterQuerySchema as realFinansieradeaktiviteterQuerySchema } from '../../../lib/validation/finansieradeaktiviteterQuery';
import { validate as realValidate } from '../../../lib/validate';
import { handleApiError as realHandleApiError } from '../../../lib/handleApiError';
import { CircuitBreaker as RealCircuitBreaker } from '../../../lib/circuitBreaker';
import { retry } from '../../../lib/retry';
import { logWarn } from '../../../lib/log';
import { setCache as realSetCache, getCache as realGetCache } from '../../../lib/simpleCache';

// Dependency-injectable handler
export async function finansieradeaktiviteterHandler(
  req: NextApiRequest,
  res: NextApiResponse,
  deps?: {
    getFinansieradeAktiviteter?: typeof realGetFinansieradeAktiviteter,
    requireUser?: typeof realRequireUser,
    setCorsHeaders?: typeof realSetCorsHeaders,
    simpleRateLimit?: typeof realSimpleRateLimit,
    finansieradeaktiviteterQuerySchema?: typeof realFinansieradeaktiviteterQuerySchema,
    validate?: typeof realValidate,
    handleApiError?: typeof realHandleApiError,
    CircuitBreaker?: typeof RealCircuitBreaker,
    setCache?: typeof realSetCache,
    getCache?: typeof realGetCache,
  }
) {
  const getFinansieradeAktiviteter = deps?.getFinansieradeAktiviteter || realGetFinansieradeAktiviteter;
  const requireUser = deps?.requireUser || realRequireUser;
  const setCorsHeaders = deps?.setCorsHeaders || realSetCorsHeaders;
  const simpleRateLimit = deps?.simpleRateLimit || realSimpleRateLimit;
  const finansieradeaktiviteterQuerySchema = deps?.finansieradeaktiviteterQuerySchema || realFinansieradeaktiviteterQuerySchema;
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
  const validatedQuery = validate(finansieradeaktiviteterQuerySchema, req.query, res);
  if (!validatedQuery) {
    res.end();
    return;
  }
  const finansieradeBreaker = new CircuitBreaker({
    failureThreshold: 3,
    cooldownMs: 15000,
    successThreshold: 1,
  });
  try {
    // Wrap the Vinnova API call in retry and circuit breaker
    const getWithRetry = () => retry(
      () => getFinansieradeAktiviteter(validatedQuery),
      3, // maxAttempts
      200 // initial delayMs
    );
    const data = await finansieradeBreaker.exec(getWithRetry);
    // Whitelist fields for each activity
    const sanitizedResults = Array.isArray(data.results)
      ? data.results.map(a => ({
          AktivitetsID: a.AktivitetsID,
          Aktivitetsnamn: a.Aktivitetsnamn,
          Beskrivning: a.Beskrivning,
          Startdatum: a.Startdatum,
          Slutdatum: a.Slutdatum,
          // Add more safe fields as needed
        }))
      : [];
    const response = { ...data, results: sanitizedResults };
    // Cache the response for 5 minutes
    setCache('finansieradeaktiviteter:' + JSON.stringify(validatedQuery), response, 5 * 60 * 1000);
    res.status(200).json(response);
    return;
  } catch (error: any) {
    if (error instanceof Error && error.message === 'Circuit breaker is open') {
      // Try to serve cached data if available
      const cached = getCache('finansieradeaktiviteter:' + JSON.stringify(validatedQuery));
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
    const cached = getCache('finansieradeaktiviteter:' + JSON.stringify(validatedQuery));
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
    return;
  }
}

// Default export uses real dependencies
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return finansieradeaktiviteterHandler(req, res);
} 