const rateLimitStore = new Map<string, { count: number; lastRequest: number }>();

export function simpleRateLimit(key: string, limit: number, interval: number): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now - entry.lastRequest > interval) {
    rateLimitStore.set(key, { count: 1, lastRequest: now });
    return true;
  }

  if (entry.count < limit) {
    entry.count += 1;
    entry.lastRequest = now;
    rateLimitStore.set(key, entry);
    return true;
  }

  return false;
} 