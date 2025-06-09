type CacheEntry = { value: any; expires: number };
const cache: Record<string, CacheEntry> = {};

export function setCache(key: string, value: any, ttlMs: number) {
  cache[key] = { value, expires: Date.now() + ttlMs };
}

export function getCache<T = any>(key: string): T | undefined {
  const entry = cache[key];
  if (!entry) return undefined;
  if (Date.now() > entry.expires) {
    delete cache[key];
    return undefined;
  }
  return entry.value as T;
} 