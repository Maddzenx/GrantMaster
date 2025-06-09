import { getRequestId } from '../../lib/requestId';
import type { NextApiRequest, NextApiResponse } from 'next';
import { generateCsrfToken, setCsrfSecret } from '../../lib/csrf';
import Tokens from 'csrf';
import { ValidationError } from '../../lib/errors';
import { handleApiError } from '../../lib/handleApiError';

function csrfTokenHandler(req: NextApiRequest, res: NextApiResponse, tokensLib?: typeof Tokens) {
  const requestId = getRequestId(req);
  try {
    if (req.method !== 'GET') {
      throw new ValidationError('Method not allowed');
    }
    // Generate a new secret and token if not present
    const TokensClass = tokensLib || Tokens;
    const tokens = new TokensClass();
    const secret = tokens.secretSync();
    setCsrfSecret(res, secret);
    const token = generateCsrfToken(secret);
    res.status(200).json({
      csrfToken: token,
      requestId: requestId
    });
  } catch (error) {
    handleApiError(res, error);
  }
}

const handler = (req: NextApiRequest, res: NextApiResponse) => csrfTokenHandler(req, res);
export default handler;
export { csrfTokenHandler }; 