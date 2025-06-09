/**
 * Vinnova API Client (Scaffold)
 *
 * - Axios-based client with keep-alive, base URL, and API key auth
 * - Generic request method (GET/POST)
 * - Pagination helpers (single page and aggregate all pages)
 * - Retry logic with exponential backoff for 429/5xx/network errors
 * - Custom error classes (Auth, RateLimit, Server, Network)
 * - In-memory GET cache (per-URL, TTL)
 * - Logging for requests, errors, and response times
 * - TypeScript types for responses and errors
 *
 * Usage:
 *   import { vinnovaApiClient } from './vinnovaApiClient';
 *   const data = await vinnovaApiClient.get('/endpoint', { params: { ... } });
 *
 * TODO: Add endpoint-specific wrappers and response types as needed.
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import http from 'http';
import https from 'https';
import { getVinnovaAccessToken } from './vinnovaAuth';
import { retry } from '../lib/retry';
import { logInfo, logError } from '../lib/log';

// --- Types ---
export type VinnovaApiResponse<T = any> = T;
export type VinnovaApiErrorResponse = { status: number; message: string; data?: any };

// --- Custom Error Classes ---
export class VinnovaAuthError extends Error {
  constructor(message: string, public data?: any) {
    super(message);
    this.name = 'VinnovaAuthError';
  }
}
export class VinnovaRateLimitError extends Error {
  constructor(message: string, public retryAfter?: number, public data?: any) {
    super(message);
    this.name = 'VinnovaRateLimitError';
  }
}
export class VinnovaServerError extends Error {
  constructor(message: string, public status?: number, public data?: any) {
    super(message);
    this.name = 'VinnovaServerError';
  }
}
export class VinnovaNetworkError extends Error {
  constructor(message: string, public data?: any) {
    super(message);
    this.name = 'VinnovaNetworkError';
  }
}

// --- Config ---
const BASE_URL = process.env.VINNOVA_API_BASE_URL || 'https://data.vinnova.se/api'; // TODO: Update for GDP if needed
const API_KEY = process.env.VINNOVA_API_KEY || '';
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

// --- Axios Instance with Keep-Alive ---
const axiosInstance: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  httpAgent: new http.Agent({ keepAlive: true }),
  httpsAgent: new https.Agent({ keepAlive: true }),
  timeout: 15000,
});

// --- In-Memory GET Cache ---
const cache: Record<string, { data: any; expires: number }> = {};

// --- Logging Helper ---
function log(...args: any[]) {
  // eslint-disable-next-line no-console
  console.log('[VinnovaApiClient]', ...args);
}

/**
 * If process.env.USE_OAUTH2 is 'true', the client will use OAuth2 authentication:
 *   - Fetches an access token using getVinnovaAccessToken
 *   - Adds Authorization: Bearer <token> header to all requests
 * Otherwise, uses only the API key in Ocp-Apim-Subscription-Key header.
 */

// --- Generic Request Method ---
async function request<T = any>(
  method: 'GET' | 'POST',
  endpoint: string,
  options: AxiosRequestConfig = {},
  useCache = false
): Promise<VinnovaApiResponse<T>> {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
  const cacheKey = method + url + JSON.stringify(options.params || {});
  if (useCache && method === 'GET' && cache[cacheKey] && cache[cacheKey].expires > Date.now()) {
    log('Cache hit for', url);
    return cache[cacheKey].data;
  }

  let authHeader = {};
  if (process.env.USE_OAUTH2 === 'true') {
    const token = await getVinnovaAccessToken();
    authHeader = { Authorization: `Bearer ${token}` };
  }

  const headers = {
    ...(API_KEY ? { 'Ocp-Apim-Subscription-Key': API_KEY } : {}),
    ...authHeader,
    ...options.headers,
  };

  let attempt = 0;
  const maxAttempts = 4;
  let lastError: any = null;
  while (attempt < maxAttempts) {
    try {
      attempt++;
      const start = Date.now();
      log(`Request: [${method}] ${url} (attempt ${attempt})`, options.params || '');
      const response = await axiosInstance.request<T>({
        url,
        method,
        headers,
        params: options.params,
        data: options.data,
      });
      const duration = Date.now() - start;
      log(`Response: [${method}] ${url} (${response.status}) in ${duration}ms`);
      if (useCache && method === 'GET') {
        cache[cacheKey] = { data: response.data, expires: Date.now() + CACHE_TTL };
      }
      return response.data;
    } catch (error: any) {
      lastError = error;
      const axiosErr = error as AxiosError;
      const status = axiosErr.response ? axiosErr.response.status : undefined;
      const isRetryable =
        !status || status >= 500 || status === 429 || axiosErr.code === 'ECONNABORTED';
      if (status === 401 || status === 403) {
        throw new VinnovaAuthError('Unauthorized: Invalid API key or credentials', axiosErr.response?.data);
      }
      if (status === 429) {
        const retryAfter =
          parseInt(axiosErr.response?.headers?.['retry-after']) || Math.pow(2, attempt) * 1000;
        log(`Rate limited. Retrying after ${retryAfter}ms...`);
        await new Promise((r) => setTimeout(r, retryAfter));
        continue;
      }
      if (isRetryable && attempt < maxAttempts) {
        const backoff = Math.pow(2, attempt) * 1000;
        log(`Retrying after ${backoff}ms...`);
        await new Promise((r) => setTimeout(r, backoff));
        continue;
      }
      if (status && status >= 500) {
        throw new VinnovaServerError(`Server error: ${status}`, status, axiosErr.response?.data);
      }
      if (axiosErr.code === 'ECONNABORTED' || axiosErr.code === 'ENOTFOUND') {
        throw new VinnovaNetworkError('Network error', axiosErr);
      }
      // Guard: Only access status if defined, else use 'Unknown'. Also guard message.
      const errorMessage = typeof axiosErr.message === 'string' && axiosErr.message.length > 0 ? axiosErr.message : 'Unknown error';
      throw new Error(`Vinnova API error: ${status !== undefined ? status : 'Unknown'} - ${errorMessage}`);
    }
  }
  throw lastError;
}

// --- Pagination Helpers ---
export async function getPage<T = any>(endpoint: string, params: Record<string, any> = {}, options: AxiosRequestConfig = {}) {
  return retry(() => request<T>('GET', endpoint, { ...options, params }, true), 3, 200);
}

export async function getAllPages<T = any>(endpoint: string, params: Record<string, any> = {}, options: AxiosRequestConfig = {}, pageSize = 100, maxPages = 100) {
  let allResults: T[] = [];
  let offset = 0;
  let page = 0;
  while (page < maxPages) {
    const pageParams = { ...params, limit: pageSize, offset };
    const data = await getPage<T>(endpoint, pageParams, options);
    if (Array.isArray(data) && data.length > 0) {
      allResults = allResults.concat(data);
      if (data.length < pageSize) break; // last page
      offset += pageSize;
      page++;
    } else {
      break;
    }
  }
  return allResults;
}

/**
 * Utlysning (Call for proposals) type
 */
export interface Utlysning {
  Diarienummer: string;
  Titel: string;
  Beskrivning?: string;
  Publiceringsdatum?: string;
  [key: string]: any;
}

/**
 * Ansokning (Application) type
 */
export interface Ansokning {
  Diarienummer: string;
  Titel: string;
  Status?: string;
  Beslutsdatum?: string;
  [key: string]: any;
}

/**
 * Finansierad Aktivitet (Funded Activity) type
 */
export interface FinansieradAktivitet {
  AktivitetsID: string;
  Aktivitetsnamn: string;
  Beskrivning?: string;
  Startdatum?: string;
  Slutdatum?: string;
  [key: string]: any;
}

/**
 * Response structure for paginated endpoints
 */
export interface PaginatedResponse<T> {
  totalRecords: number;
  results: T[];
  [key: string]: any;
}

/**
 * Fetch utlysningar (calls for proposals)
 * @param params Query parameters (e.g., { limit, offset })
 */
export async function getUtlysningar(params: Record<string, any> = {}): Promise<PaginatedResponse<Utlysning>> {
  return vinnovaApiClient.get<PaginatedResponse<Utlysning>>('/utlysningar', { params });
}

/**
 * Fetch ansokningar (applications)
 * @param params Query parameters (e.g., { limit, offset, status })
 */
export async function getAnsokningar(params: Record<string, any> = {}): Promise<PaginatedResponse<Ansokning>> {
  return vinnovaApiClient.get<PaginatedResponse<Ansokning>>('/ansokningar', { params });
}

/**
 * Fetch finansierade aktiviteter (funded activities)
 * @param params Query parameters (e.g., { limit, offset })
 */
export async function getFinansieradeAktiviteter(params: Record<string, any> = {}): Promise<PaginatedResponse<FinansieradAktivitet>> {
  return vinnovaApiClient.get<PaginatedResponse<FinansieradAktivitet>>('/finansieradeaktiviteter', { params });
}

/**
 * --- Usage Example: Pagination Helpers ---
 *
 * // Fetch a single page of utlysningar (calls for proposals)
 * getPage<PaginatedResponse<Utlysning>>('/utlysningar', { limit: 10, offset: 0 })
 *   .then(page => {
 *     console.log('First page of utlysningar:', page.results);
 *   })
 *   .catch(err => {
 *     console.error('Error fetching page:', err);
 *   });
 *
 * // Fetch all utlysningar across all pages (aggregated into a single array)
 * getAllPages<Utlysning>('/utlysningar', {}, {}, 100)
 *   .then(allUtlysningar => {
 *     console.log('All utlysningar:', allUtlysningar);
 *   })
 *   .catch(err => {
 *     console.error('Error fetching all pages:', err);
 *   });
 *
 * // Error handling: You can catch and distinguish error types
 * try {
 *   const all = await getAllPages<Utlysning>('/utlysningar');
 * } catch (err) {
 *   if (err instanceof VinnovaRateLimitError) {
 *     // Handle rate limiting
 *   } else if (err instanceof VinnovaAuthError) {
 *     // Handle auth error
 *   } else {
 *     // Handle other errors
 *   }
 * }
 *
 * --- End Usage Example ---
 */

// --- Exported Client Object ---
export const vinnovaApiClient = {
  get: <T = any>(endpoint: string, options: AxiosRequestConfig = {}, useCache = true) => request<T>('GET', endpoint, options, useCache),
  post: <T = any>(endpoint: string, data: any, options: AxiosRequestConfig = {}) => request<T>('POST', endpoint, { ...options, data }),
  getPage,
  getAllPages,
  // TODO: Add endpoint-specific wrappers as needed
}; 