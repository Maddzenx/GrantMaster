import { getRequestId } from '../../lib/requestId';
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase as realSupabase } from '../../lib/supabaseClient';
import { handleApiError } from '../../lib/handleApiError';
import { simpleRateLimit } from '../../lib/simpleRateLimit';
import { z } from 'zod';
import { ValidationError, AuthError, RateLimitError } from '../../lib/errors';
import { logInfo, logError, logWarn } from '../../lib/log';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

async function loginHandler(req: NextApiRequest, res: NextApiResponse, supabaseClient?: any) {
  const requestId = getRequestId(req);
  let email: string | undefined = undefined;
  try {
    if (req.method !== 'POST') {
      throw new ValidationError('Method not allowed');
    }

    // Rate limiting: 5 requests per 10 minutes per IP (stricter for login)
    const key = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    if (!simpleRateLimit(String(key), 5, 10 * 60 * 1000)) {
      logError('Login rate limit exceeded', {
        endpoint: '/api/login',
        userEmail: req.body?.email,
        ip: key,
        requestId,
      });
      res.setHeader('Retry-After', '600'); // 600 seconds = 10 minutes
      throw new RateLimitError('Too many login attempts. Please try again later.');
    }

    // Validate input
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      throw new ValidationError('Invalid email or password.');
    }
    email = result.data.email;
    const { password } = result.data;

    // Proxy login to Supabase
    const supabase = supabaseClient || realSupabase;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // Always return a generic error to prevent user enumeration
      logWarn('Failed login attempt', {
        event: 'auth.login_failed',
        email,
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        requestId,
        timestamp: new Date().toISOString(),
      });
      throw new AuthError('Invalid email or password.');
    }

    logInfo('User login', {
      event: 'auth.login',
      userId: data.user?.id,
      email,
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      requestId,
      timestamp: new Date().toISOString(),
    });

    // Return session and user info (if needed)
    res.status(200).json({
      message: 'Login successful',
      session: data.session,
      user: data.user,
      requestId: requestId
    });

    console.log('Login page, user:', data.user, 'session:', data.session);
  } catch (error) {
    logError('Login failed', {
      endpoint: '/api/login',
      userEmail: email,
      error,
      requestId: req.headers['x-request-id'] || undefined,
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    });
    handleApiError(res, error);
  }
}

const handler = (req: NextApiRequest, res: NextApiResponse) => loginHandler(req, res);
export default handler;
export { loginHandler }; 