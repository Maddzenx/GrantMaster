import { getRequestId } from '../../lib/requestId';
import type { NextApiRequest, NextApiResponse } from 'next';
import formidable, { File } from 'formidable';
import fs from 'fs';
import { getCsrfSecret, verifyCsrfToken } from '../../lib/csrf';
import { simpleRateLimit } from '../../lib/simpleRateLimit';
import { ValidationError, AuthError, RateLimitError, InternalServerError, ExternalServiceError } from '../../lib/errors';
import { handleApiError } from '../../lib/handleApiError';
import { CircuitBreaker } from '../../lib/circuitBreaker';
import { retry } from '../../lib/retry';
import { logWarn } from '../../lib/log';

export const config = {
  api: {
    bodyParser: false,
  },
};

const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/gif'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

const uploadBreaker = new CircuitBreaker({
  failureThreshold: 3,
  cooldownMs: 15000,
  successThreshold: 1,
});

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

// @ts-ignore: dynamic import for Jest mocking
let realSupabasePromise: Promise<any> | null = null;
async function getRealSupabase() {
  if (!realSupabasePromise) {
    // @ts-expect-error: dynamic import for Jest mocking
    realSupabasePromise = import('lib/supabaseClient');
  }
  return realSupabasePromise;
}

async function uploadHandler(req: NextApiRequest, res: NextApiResponse, supabaseClient?: any) {
  const requestId = getRequestId(req);
  try {
    if (req.method !== 'POST') {
      throw new ValidationError('Method not allowed');
    }

    // Rate limiting: 10 requests per 10 minutes per IP
    const key = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    if (!simpleRateLimit(String(key), 10, 10 * 60 * 1000)) {
      throw new RateLimitError('Too many upload attempts. Please try again later.');
    }

    // CSRF check
    const secret = getCsrfSecret(req);
    const token = req.headers['x-csrf-token'];
    if (!secret || !token || Array.isArray(token) || !verifyCsrfToken(secret, token as string)) {
      throw new AuthError('Invalid CSRF token');
    }

    const form = new formidable.IncomingForm({
      maxFileSize: MAX_SIZE,
      multiples: false,
    });

    const supabase = supabaseClient || (await getRealSupabase()).supabase;

    await new Promise<void>((resolve) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          handleApiError(res, new ValidationError('File too large or invalid form data'), { requestId });
          resolve();
          return;
        }
        async function handleUpload() {
          let file = files.file as File | File[] | undefined;
          if (Array.isArray(file)) file = file[0];
          if (!file) {
            throw new ValidationError('No file uploaded');
          }
          const mimetype = typeof file.mimetype === 'string' ? file.mimetype : '';
          if (!ALLOWED_TYPES.includes(mimetype)) {
            throw new ValidationError('Only PDF and image files are allowed');
          }
          if (file.size > MAX_SIZE) {
            throw new ValidationError('File size must be less than 10MB');
          }
          const sanitizedFileName = sanitizeFileName(file.originalFilename || file.newFilename || 'upload');
          const filePath = `applications/${Date.now()}_${sanitizedFileName}`;
          const fileBuffer = fs.readFileSync(file.filepath);
          // --- Supabase file upload with retry and circuit breaker ---
          let uploadError;
          try {
            const fromResult = supabase.storage.from('attachments');
            // Wrap the upload in both retry and circuit breaker
            const uploadWithRetry = () => retry(
              () => fromResult.upload(filePath, fileBuffer, {
                contentType: mimetype,
                upsert: false,
              }),
              3, // maxAttempts
              200 // initial delayMs
            );
            const uploadResult = await uploadBreaker.exec(uploadWithRetry) as { error?: any };
            uploadError = uploadResult?.error;
          } catch (err) {
            if (err instanceof Error && err.message === 'Circuit breaker is open') {
              logWarn('Upload circuit breaker open', { endpoint: '/api/upload', requestId });
              throw new InternalServerError('File upload temporarily disabled due to repeated failures. Please try again later.');
            }
            throw err;
          }
          if (uploadError) {
            let uploadErrorMsg = typeof uploadError === 'string' ? uploadError : (uploadError?.message || JSON.stringify(uploadError));
            throw new ExternalServiceError('Failed to upload file to Supabase', { requestId, service: 'Supabase', uploadError: uploadErrorMsg });
          }
          const { data: publicUrlData } = supabase.storage.from('attachments').getPublicUrl(filePath);
          res.status(200).json({
            url: publicUrlData?.publicUrl,
            requestId: requestId
          });
        }
        handleUpload()
          .then(() => resolve())
          .catch((error) => {
            if (!(error instanceof ValidationError || error instanceof AuthError || error instanceof RateLimitError || error instanceof InternalServerError || error instanceof ExternalServiceError)) {
              handleApiError(res, new InternalServerError('Unexpected error occurred', {}, error), { requestId });
            } else {
              handleApiError(res, error, { requestId });
            }
            resolve();
          });
      });
    });
  } catch (error) {
    if (!(error instanceof ValidationError || error instanceof AuthError || error instanceof RateLimitError || error instanceof InternalServerError || error instanceof ExternalServiceError)) {
      handleApiError(res, new InternalServerError('Unexpected error occurred', {}, error), { requestId });
    } else {
      handleApiError(res, error, { requestId });
    }
  }
}

const handler = (req: NextApiRequest, res: NextApiResponse) => uploadHandler(req, res);
export default handler;
export { uploadHandler }; 