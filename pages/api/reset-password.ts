import { getRequestId } from '../../lib/requestId';
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase as realSupabase } from '../../lib/supabaseClient';
import { handleApiError } from '../../lib/handleApiError';
import { simpleRateLimit } from '../../lib/simpleRateLimit';
import { z } from 'zod';
import { ValidationError, RateLimitError } from '../../lib/errors';
import { logInfo, logWarn } from '../../lib/log';

const resetSchema = z.object({
  email: z.string().email(),
});

async function resetPasswordHandler(req: NextApiRequest, res: NextApiResponse, supabaseClient?: any) {
  const requestId = getRequestId(req);
  try {
    if (req.method !== 'POST') {
      throw new ValidationError('Method not allowed');
    }

    // Rate limiting: 5 requests per 10 minutes per IP
    const key = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    if (!simpleRateLimit(String(key), 5, 10 * 60 * 1000)) {
      logWarn('Password reset rate limit exceeded', {
        event: 'auth.password_reset_rate_limited',
        email: req.body?.email,
        ip: key,
        requestId,
        timestamp: new Date().toISOString(),
      });
      throw new RateLimitError('Too many password reset attempts. Please try again later.');
    }

    // Validate input
    const result = resetSchema.safeParse(req.body);
    if (!result.success) {
      logWarn('Invalid password reset request', {
        event: 'auth.password_reset_failed',
        email: req.body?.email,
        ip: key,
        requestId,
        timestamp: new Date().toISOString(),
      });
      throw new ValidationError('Invalid email.');
    }
    const { email } = result.data;

    // Proxy password reset to Supabase
    const supabase = supabaseClient || realSupabase;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: process.env.NEXT_PUBLIC_BASE_URL + '/login',
    });
    if (error) {
      // Log the real error, but always return a generic message
      logWarn('Password reset error', {
        event: 'auth.password_reset_failed',
        email,
        ip: key,
        requestId,
        timestamp: new Date().toISOString(),
        supabaseError: error.message,
      });
    } else {
      logInfo('Password reset requested', {
        event: 'auth.password_reset_request',
        email,
        ip: key,
        requestId,
        timestamp: new Date().toISOString(),
      });
    }
    // Always return a generic success message
    res.status(200).json({
      message: 'If your email is registered, you will receive a password reset email.',
      requestId: requestId
    });
  } catch (error) {
    handleApiError(res, error);
  }
}

const handler = (req: NextApiRequest, res: NextApiResponse) => resetPasswordHandler(req, res);
export default handler;
export { resetPasswordHandler }; 