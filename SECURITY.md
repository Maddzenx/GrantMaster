# Security Policy

## HTTPS
- All production traffic is served over HTTPS (handled by Vercel or reverse proxy).

## Content Security Policy (CSP)
- Strict CSP headers are set in `next.config.js` to prevent XSS and other attacks.

## CORS
- API routes restrict origins to `*` in development and to your production domain in production.
- See `lib/cors.ts` for implementation.

## Authentication
- All sensitive API routes require a valid Supabase session/JWT.
- See `lib/requireUser.ts` for implementation.

## Rate Limiting
- Rate limiting is enforced on public API endpoints using a simple in-memory limiter.
- See `lib/simpleRateLimit.ts` for implementation.

## XSS & CSRF
- User input is sanitized using `lib/sanitizeHtml.ts` before storing or rendering.
- CSRF protection is enforced via authentication (Supabase JWT) for all state-changing endpoints.

## Error Handling
- Centralized error handling is implemented in API routes.
- React error boundaries are used in the frontend.

## Reporting Vulnerabilities
If you discover a security vulnerability, please report it by emailing [xiamadeleine@gmail.com]. We will respond as quickly as possible.

---

**For more details, see the relevant files in the codebase.** 