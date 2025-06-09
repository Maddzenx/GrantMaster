# Error Handling Guide

## Overview
This document describes the error handling system for the GrantMaster project, covering both backend (API) and frontend (React) error management. The goal is to provide robust, consistent, and user-friendly error handling across the application.

---

## Custom Error Classes (`lib/errors.ts`)
- All API and application errors should use custom error classes for clarity and consistency.
- **Available classes:**
  - `ApiError` (base class)
  - `ValidationError` (400)
  - `AuthError` (401)
  - `NotFoundError` (404)
  - `RateLimitError` (429)
  - `InternalServerError` (500)
  - `ExternalServiceError` (502)
- **Usage Example:**
  ```typescript
  throw new ValidationError('Invalid input', { field: 'email' });
  throw new ExternalServiceError('Failed to fetch', { service: 'Stripe' }, err);
  ```
- All error classes support a `context` object for extra details and an optional `cause`.

---

## API Error Handler (`lib/handleApiError.ts`)
- Use `handleApiError(res, error, context)` in all API route catch blocks.
- Logs the error and returns a standardized JSON response.
- **Response format:**
  ```json
  {
    "error": "Error message",
    "code": "ERROR_CODE",
    "requestId": "...", // if provided
    "context": { ... } // optional, non-sensitive
  }
  ```
- **Example usage in API route:**
  ```typescript
  try {
    // ...
  } catch (err) {
    handleApiError(res, err, { requestId });
  }
  ```

---

## React Error Boundaries (`components/ErrorBoundary.tsx`)
- Use the `ErrorBoundary` component to catch and display errors in React components/pages.
- Provides a fallback UI and a reset mechanism.
- **Usage Example:**
  ```tsx
  <ErrorBoundary>
    <MyComponent />
  </ErrorBoundary>
  ```
- You can provide a custom fallback UI via the `fallback` prop.

---

## Logging (`lib/log.ts`)
- Use `logInfo`, `logWarn`, and `logError` for structured logging.
- All logs are output as JSON for easy parsing and analysis.
- API errors are always logged via `handleApiError`.
- **Example:**
  ```typescript
  logError('API Error', { message, code, context });
  ```

---

## Testing Error Handling
- Write tests to simulate and verify error scenarios (invalid input, auth failure, rate limit, server error, etc.).
- Use Jest and supertest (or similar) for API endpoint tests.
- Ensure correct status codes and error messages are returned.
- Test React error boundaries by simulating component errors.

---

## Best Practices & Conventions
- Always use custom error classes for thrown errors in API routes.
- Never expose stack traces or sensitive details in API responses.
- Use clear, actionable error messages for users.
- Ensure all API routes use `handleApiError` in their catch blocks.
- Use error boundaries at the top level of React apps/pages.
- Prefer context objects for passing extra error details (avoid leaking secrets).
- Use circuit breakers and fallback logic for external service failures.

---

## Extending Error Handling
- To add a new error type, extend `ApiError` in `lib/errors.ts`.
- To add new error handling logic, update `lib/handleApiError.ts` and ensure all routes use it.
- For new frontend error boundaries, extend or wrap `ErrorBoundary` as needed.

---

## Graceful Degradation
- Use circuit breaker patterns and fallback data in API routes when external services fail.
- Communicate degraded state to the client with clear warnings.
- Example: If a third-party API is down, serve cached data and include a warning in the response.

---

## Retry Logic and Circuit Breaker Patterns
- For all external API/service calls (e.g., Supabase, Vinnova, email providers), wrap the call in both a retry utility and a circuit breaker.
- **Retry logic**: Use the `retry` utility to attempt the call up to 3 times with exponential backoff for transient failures.
- **Circuit breaker**: Use the `CircuitBreaker` class to prevent cascading failures and provide fallback/cached data if the upstream service is down.
- **Example:**
  ```typescript
  import { CircuitBreaker } from '../../lib/circuitBreaker';
  import { retry } from '../../lib/retry';
  import { logWarn } from '../../lib/log';

  const breaker = new CircuitBreaker({ failureThreshold: 3, cooldownMs: 15000, successThreshold: 1 });
  const getWithRetry = () => retry(
    () => externalApiCall(params),
    3, // maxAttempts
    200 // initial delayMs (ms)
  );
  const data = await breaker.exec(getWithRetry);
  ```
- Log all retry attempts and circuit breaker state changes for observability.
- In tests, mock the external call to fail/succeed as needed to verify retry and breaker behavior.

---

## Dependency Injection for Testability
- API route handlers are written to accept dependencies (e.g., Supabase client, circuit breaker, etc.) as optional parameters.
- This allows for easy mocking and robust testing of error scenarios.
- **Example:**
  ```typescript
  export async function myHandler(req, res, supabaseClient = realSupabase) {
    // ...
  }
  ```
- In tests, inject mocks to simulate errors and edge cases.

---

## Wrapping Unknown Errors
- Always wrap unknown/unexpected errors in `InternalServerError` before passing to `handleApiError`.
- This prevents leaking stack traces or sensitive details to clients.
- **Example:**
  ```typescript
  try {
    // ...
  } catch (error) {
    if (!(error instanceof ApiError)) {
      handleApiError(res, new InternalServerError('Unexpected error occurred', {}, error), { requestId });
    } else {
      handleApiError(res, error, { requestId });
    }
  }
  ```

---

## 404 Not Found Handling
- Use `NotFoundError` for missing resources or invalid endpoints.
- Ensure tests cover 404 scenarios where applicable.
- **Example:**
  ```typescript
  if (!resource) throw new NotFoundError('Resource not found');
  ```

---

## Request ID Propagation
- Always include a `requestId` in error responses for traceability.
- Use `getRequestId(req)` at the start of each handler and pass it to `handleApiError`.
- **Example:**
  ```typescript
  const requestId = getRequestId(req);
  // ...
  handleApiError(res, error, { requestId });
  ```

---

## Frontend Error Boundary Placement
- Place `ErrorBoundary` at the top level in `app/layout.tsx` to catch all uncaught errors.
- For critical subtrees (e.g., dashboard, forms), consider additional granular boundaries.
- Provide custom fallback UIs for a better user experience.

---

## Contributor Checklist
- [ ] Use custom error classes for all thrown errors in API routes.
- [ ] Wrap unknown errors in `InternalServerError` before passing to `handleApiError`.
- [ ] Always include `requestId` in error responses.
- [ ] Use dependency injection for handler testability.
- [ ] Cover all error scenarios in tests (400, 401, 404, 429, 500, 502, etc.).
- [ ] Use `ErrorBoundary` at the top level and in critical frontend subtrees.
- [ ] Never expose stack traces or secrets in error responses.
- [ ] Document any new error patterns or conventions in this file.
- [ ] Use retry and circuit breaker for external API calls.

---

## References
- `lib/errors.ts` — Custom error classes
- `lib/handleApiError.ts` — API error handler
- `components/ErrorBoundary.tsx` — React error boundary
- `lib/log.ts` — Logging utilities
- `components/auth/__tests__/api-upload.test.ts` — Example API error tests
- `lib/retry.ts` — Retry utility
- `lib/circuitBreaker.ts` — Circuit breaker utility

---

For questions or improvements, update this document and notify the team. 