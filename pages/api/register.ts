import { getRequestId } from '../../lib/requestId';
import type { NextApiRequest, NextApiResponse } from 'next';
import { userRegistrationSchema } from '../../lib/validation/user';
import { supabase as realSupabase } from '../../lib/supabaseClient';
import { validate } from '../../lib/validate';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import { handleApiError } from '../../lib/handleApiError';
import { ValidationError, AuthError, RateLimitError, InternalServerError } from '../../lib/errors';
import { getCsrfSecret, verifyCsrfToken } from '../../lib/csrf';
import { simpleRateLimit } from '../../lib/simpleRateLimit';
import { logInfo, logError } from '../../lib/log';

// Simple sanitizer
function sanitizeString(str: string) {
  return str.trim().replace(/[<>"'`]/g, '');
}

async function registerHandler(req: NextApiRequest, res: NextApiResponse, supabaseClient?: any) {
  const requestId = getRequestId(req);
  try {
    if (req.method !== 'POST') {
      throw new ValidationError('Method not allowed');
    }

    // Rate limiting: 5 requests per 10 minutes per IP
    const key = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    if (!simpleRateLimit(String(key), 5, 10 * 60 * 1000)) {
      throw new RateLimitError('Too many registration attempts. Please try again later.');
    }

    // CSRF check
    const secret = getCsrfSecret(req);
    const token = req.headers['x-csrf-token'];
    if (!secret || !token || Array.isArray(token) || !verifyCsrfToken(secret, token as string)) {
      throw new AuthError('Invalid CSRF token');
    }

    // Validate input using centralized utility
    const validated = validate(userRegistrationSchema, req.body, res);
    if (!validated) return;

    // Sanitize input
    const { email, password, name } = validated;
    const sanitizedData = {
      email: sanitizeString(email),
      password: sanitizeString(password),
      name: sanitizeHtml(name),
    };

    // Register user with Supabase Auth
    const supabase = supabaseClient || realSupabase;
    const { data, error } = await supabase.auth.signUp({
      email: sanitizedData.email,
      password: sanitizedData.password,
      options: {
        data: { name: sanitizedData.name },
      },
    });

    if (error) {
      logError('Supabase registration error', {
        endpoint: '/api/register',
        userEmail: sanitizedData.email,
        supabaseError: error,
        requestId,
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      });
      throw new InternalServerError('Registration failed. Please check your details and try again.');
    }

    // Whitelist only safe user fields
    const safeUser = data.user
      ? {
          id: data.user.id,
          email: data.user.email,
          created_at: data.user.created_at,
          name: data.user.user_metadata?.name,
        }
      : null;
    logInfo('User registered', {
      endpoint: '/api/register',
      userEmail: sanitizedData.email,
      requestId,
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    });
    res.status(200).json({
      message: 'Registration successful',
      user: safeUser,
      requestId: requestId
    });
  } catch (error) {
    handleApiError(res, error);
  }
}

const handler = (req: NextApiRequest, res: NextApiResponse) => registerHandler(req, res);
export default handler;
export { registerHandler };
