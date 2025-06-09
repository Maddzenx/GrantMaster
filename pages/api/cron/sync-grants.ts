import { getRequestId } from '../../../lib/requestId';
import type { NextApiRequest, NextApiResponse } from 'next';
import { syncVinnovaGrants as realSyncVinnovaGrants } from '../../../services/vinnovaSync';
import crypto from 'crypto';
import { z } from 'zod';
import { ValidationError, AuthError, RateLimitError, InternalServerError } from '../../../lib/errors';
import { handleApiError } from '../../../lib/handleApiError';
import { logInfo, logWarn } from '../../../lib/log';

// Set your secret in .env as CRON_SECRET=your_secret_value
const CRON_SECRET = process.env.CRON_SECRET;

// Simple in-memory lock (for single instance; use Redis for distributed)
let isSyncRunning = false;

function safeCompare(a: string, b: string) {
  // Constant-time comparison to prevent timing attacks
  return (
    a.length === b.length &&
    crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
  );
}

// Zod schema for header validation
const headerSchema = z.object({
  'x-cron-secret': z.string().min(32),
});

async function syncGrantsHandler(
  req: NextApiRequest,
  res: NextApiResponse,
  syncVinnovaGrantsFn?: typeof realSyncVinnovaGrants,
  cronSecret?: string
) {
  const requestId = getRequestId(req);
  try {
    // Require POST
    if (req.method !== 'POST') {
      logWarn('Sync grants: method not allowed', {
        event: 'admin.sync_grants_failed',
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        requestId,
        timestamp: new Date().toISOString(),
      });
      throw new ValidationError('Method not allowed');
    }

    // Validate x-cron-secret header
    const headerValidation = headerSchema.safeParse(req.headers);
    if (!headerValidation.success) {
      logWarn('Sync grants: missing or invalid x-cron-secret', {
        event: 'admin.sync_grants_unauthorized',
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        requestId,
        timestamp: new Date().toISOString(),
      });
      throw new ValidationError('Missing or invalid x-cron-secret header');
    }
    const providedSecret = req.headers['x-cron-secret'];
    const secret = cronSecret || CRON_SECRET;
    if (
      !secret ||
      typeof providedSecret !== 'string' ||
      !safeCompare(secret, providedSecret)
    ) {
      logWarn('Sync grants: unauthorized attempt', {
        event: 'admin.sync_grants_unauthorized',
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        requestId,
        timestamp: new Date().toISOString(),
      });
      throw new AuthError('Unauthorized');
    }

    // Prevent overlapping syncs
    if (isSyncRunning) {
      logWarn('Sync grants: already in progress', {
        event: 'admin.sync_grants_failed',
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        requestId,
        timestamp: new Date().toISOString(),
      });
      throw new RateLimitError('Sync already in progress');
    }

    isSyncRunning = true;
    const start = Date.now();
    try {
      logInfo('Sync grants started', {
        event: 'admin.sync_grants',
        action: 'start',
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        requestId,
        timestamp: new Date().toISOString(),
      });
      const report = await (syncVinnovaGrantsFn || realSyncVinnovaGrants)();
      const duration = Date.now() - start;
      logInfo('Sync grants finished', {
        event: 'admin.sync_grants',
        action: 'finish',
        durationMs: duration,
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        requestId,
        timestamp: new Date().toISOString(),
      });
      res.status(200).json({
        success: true,
        report,
        durationMs: duration,
        requestId: requestId
      });
    } catch (error: any) {
      logWarn('Sync grants failed', {
        event: 'admin.sync_grants_failed',
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        requestId,
        timestamp: new Date().toISOString(),
        error: error?.message,
      });
      throw new InternalServerError('Sync failed');
    } finally {
      isSyncRunning = false;
    }
  } catch (error) {
    handleApiError(res, error);
  }
}

const handler = (req: NextApiRequest, res: NextApiResponse) => syncGrantsHandler(req, res);
export default handler;
export { syncGrantsHandler };

// For testing only
export function __setIsSyncRunning(val: boolean) {
  isSyncRunning = val;
} 