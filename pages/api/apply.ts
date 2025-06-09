import { getRequestId } from '../../lib/requestId';
import type { NextApiRequest, NextApiResponse } from 'next';
import { grantApplicationSchema } from '../../lib/validation/grantApplication';
// @ts-ignore: dynamic import for Jest mocking
let realSupabasePromise: Promise<any> | null = null;
async function getRealSupabase() {
  if (!realSupabasePromise) {
    // @ts-expect-error: dynamic import for Jest mocking
    realSupabasePromise = import('../../lib/supabaseClient');
  }
  return realSupabasePromise;
}
import { validate } from '../../lib/validate';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import { handleApiError } from '../../lib/handleApiError';
import { ValidationError, AuthError, InternalServerError } from '../../lib/errors';
import { requireUser } from '../../lib/requireUser';
import { getCsrfSecret, verifyCsrfToken } from '../../lib/csrf';
import { CircuitBreaker } from '../../lib/circuitBreaker';
import { retry } from '../../lib/retry';
import { logWarn } from '../../lib/log';

// Simple sanitizer
function sanitizeString(str: string) {
  return str.trim().replace(/[<>"'`]/g, '');
}

// Add a circuit breaker for grant application submissions
const applyBreaker = new CircuitBreaker({
  failureThreshold: 3,
  cooldownMs: 15000,
  successThreshold: 1,
});

async function applyHandler(req: any, res: any, supabaseClient?: any) {
  const requestId = getRequestId(req);
  try {
    if (req.method !== 'POST') {
      throw new ValidationError('Method not allowed');
    }
    // CSRF check
    const secret = getCsrfSecret(req);
    const token = req.headers['x-csrf-token'];
    if (!secret || !token || Array.isArray(token) || !verifyCsrfToken(secret, token as string)) {
      throw new AuthError('Invalid CSRF token');
    }

    // Validate input using centralized utility
    const validated = validate(grantApplicationSchema, req.body, res);
    if (!validated) return;

    // Sanitize input
    const { userId, grantId, projectTitle, projectSummary, requestedAmount, attachmentUrl } = req.body;

    // Move requireUser inside try/catch
    const user = await requireUser(req, res);
    if (!user) throw new AuthError('Not authenticated');

    // Insert into Supabase
    const sanitizedData = {
      user_id: sanitizeString(userId),
      grant_id: sanitizeString(grantId),
      project_title: sanitizeString(projectTitle),
      project_summary: sanitizeHtml(projectSummary),
      requested_amount: requestedAmount, // Already a number
      attachment_url: attachmentUrl ? sanitizeString(attachmentUrl) : null,
    };

    const supabase = supabaseClient || (await getRealSupabase()).supabase;
    // --- Supabase insert with retry and circuit breaker ---
    let insertError;
    let data;
    try {
      const insertWithRetry = () => retry(
        () => supabase
          .from('grant_applications')
          .insert([sanitizedData])
          .select()
          .single(),
        3, // maxAttempts
        200 // initial delayMs
      );
      const insertResult = await applyBreaker.exec(insertWithRetry) as { data?: any, error?: any };
      data = insertResult?.data;
      insertError = insertResult?.error;
    } catch (err) {
      if (err instanceof Error && err.message === 'Circuit breaker is open') {
        logWarn('Grant application circuit breaker open', { endpoint: '/api/apply', requestId });
        throw new InternalServerError('Application submission temporarily disabled due to repeated failures. Please try again later.');
      }
      throw err;
    }
    if (insertError) {
      throw new InternalServerError('Failed to submit application. Please try again.', { supabaseError: insertError.message });
    }

    // Whitelist only safe application fields
    const safeApplication = data
      ? {
          id: data.id,
          user_id: data.user_id,
          grant_id: data.grant_id,
          project_title: data.project_title,
          project_summary: data.project_summary,
          requested_amount: data.requested_amount,
          attachment_url: data.attachment_url,
          created_at: data.created_at,
        }
      : null;
    res.status(201).json({
      message: 'Application submitted successfully',
      application: safeApplication,
      requestId: requestId
    });
  } catch (error) {
    if (!(error instanceof ValidationError || error instanceof AuthError || error instanceof InternalServerError)) {
      handleApiError(res, new InternalServerError('Unexpected error occurred', {}, error), { requestId });
    } else {
      handleApiError(res, error, { requestId });
    }
  }
}

const handler = (req: any, res: any) => applyHandler(req, res);
export default handler;
export { applyHandler };
