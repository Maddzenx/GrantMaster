import { logError } from './log';

export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  delayMs = 200
): Promise<T> {
  let attempt = 0;
  let lastError: any;
  while (attempt < maxAttempts) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      attempt++;
      logError(`Attempt ${attempt} failed`, { error: err });
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * 2 ** (attempt - 1)));
      }
    }
  }
  logError('All retry attempts failed', { error: lastError });
  throw lastError;
} 