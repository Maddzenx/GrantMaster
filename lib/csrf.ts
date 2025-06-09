import Tokens from 'csrf';
import { NextApiRequest, NextApiResponse } from 'next';

const tokens = new Tokens();
const CSRF_SECRET_COOKIE = 'csrfSecret';

export function getCsrfSecret(req: NextApiRequest) {
  return req.cookies?.[CSRF_SECRET_COOKIE];
}

export function setCsrfSecret(res: NextApiResponse, secret: string) {
  res.setHeader('Set-Cookie', `${CSRF_SECRET_COOKIE}=${secret}; Path=/; HttpOnly; SameSite=Lax`);
}

export function generateCsrfToken(secret: string) {
  return tokens.create(secret);
}

export function verifyCsrfToken(secret: string, token: string) {
  return tokens.verify(secret, token);
} 