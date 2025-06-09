/**
 * Standardized API error handler for Next.js API routes.
 * Logs error details and returns a consistent error response.
 *
 * Usage:
 *   try { ... } catch (err) { handleApiError(res, err, { requestId }); }
 */
import type { NextApiResponse } from 'next';
import { logError } from './log';

export function handleApiError(res: NextApiResponse, error: any, context: any = {}) {
  // Always log the error with full details
  logError('API Error', {
    message: error?.message,
    name: error?.name,
    status: error?.status,
    code: error?.code,
    context: error?.context,
    stack: error?.stack,
    cause: error?.cause,
    error,
    ...context,
  });
  const status = error.status || 500;
  const message = error.message || 'Internal server error';
  const code = error.code || undefined;
  const response: Record<string, any> = { error: message };
  if (code) response.code = code;
  if (context.requestId) response.requestId = context.requestId;
  // Optionally include non-sensitive context fields
  if (error.context && typeof error.context === 'object') {
    // Exclude sensitive fields if needed
    response.context = { ...error.context };
  }
  res.status(status).json(response);
} 