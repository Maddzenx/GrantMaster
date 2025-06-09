import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { getVinnovaAccessToken } from './vinnovaAuth';
import http from 'http';
import https from 'https';

const GDP_API_BASE_URL = 'https://api.vinnova.se/gdp/v1';
const subscriptionKey = process.env.VINNOVA_SUBSCRIPTION_KEY!;

/*
 * NOTE: Development on the GDP API client is currently ON HOLD.
 *
 * Issue: All requests to the GDP API return a 401 error:
 *   { "statusCode": 401, "message": "Access denied due to invalid subscription key. Make sure to provide a valid key for an active subscription." }
 *
 * - The correct subscription key is being sent in the 'Ocp-Apim-Subscription-Key' header.
 * - OAuth2 authentication is working and a valid access token is provided.
 * - The same error occurs in both code and the official Swagger UI.
 * - The subscription key is confirmed to be active in the Vinnova developer portal.
 *
 * Action: A support request has been sent to Vinnova describing the issue and requesting assistance.
 *
 * Until Vinnova responds and the issue is resolved, further development and testing of the GDP API integration is paused.
 */

// Axios instance with keep-alive
const axiosInstance: AxiosInstance = axios.create({
  httpAgent: new http.Agent({ keepAlive: true }),
  httpsAgent: new https.Agent({ keepAlive: true }),
  timeout: 15000,
});

// Simple in-memory cache for GET requests (per-URL, expires in 2 min)
const cache: Record<string, { data: any; expires: number }> = {};
const CACHE_TTL = 2 * 60 * 1000;

// Custom error types
export class VinnovaApiError extends Error {
  constructor(message: string, public status?: number, public data?: any) {
    super(message);
    this.name = 'VinnovaApiError';
  }
}

// Generic GDP API request with retry, logging, and error handling
async function gdpApiRequest<T = any>(
  endpoint: string,
  options: AxiosRequestConfig = {},
  useCache = false
): Promise<T> {
  const url = `${GDP_API_BASE_URL}${endpoint}`;
  const cacheKey = url + JSON.stringify(options.params || {});
  if (useCache && cache[cacheKey] && cache[cacheKey].expires > Date.now()) {
    console.log(`[Vinnova GDP] Cache hit for ${url}`);
    return cache[cacheKey].data;
  }

  const token = await getVinnovaAccessToken();
  const headers = {
    Authorization: `Bearer ${token}`,
    'Ocp-Apim-Subscription-Key': subscriptionKey,
    Accept: 'application/json',
    ...options.headers,
  };

  console.log('Token:', token);
  console.log('Subscription Key:', subscriptionKey ? '***set***' : '***missing***');
  console.log('Headers:', headers);

  let attempt = 0;
  const maxAttempts = 4;
  let lastError: any = null;
  while (attempt < maxAttempts) {
    try {
      attempt++;
      console.log(`[Vinnova GDP] Request: ${url} (attempt ${attempt})`, options.params || '');
      const response = await axiosInstance.request<T>({
        url,
        method: options.method || 'GET',
        headers,
        params: options.params,
        data: options.data,
      });
      if (useCache && options.method === 'GET') {
        cache[cacheKey] = { data: response.data, expires: Date.now() + CACHE_TTL };
      }
      return response.data;
    } catch (error: any) {
      lastError = error;
      const status = error.response?.status;
      const isRetryable =
        !status || status >= 500 || status === 429 || error.code === 'ECONNABORTED';
      console.error(`[Vinnova GDP] Error (attempt ${attempt}):`, status, error.message);
      if (status === 401) {
        throw new VinnovaApiError('Unauthorized: Invalid token or subscription key', 401, error.response?.data);
      }
      if (status === 429) {
        const retryAfter =
          parseInt(error.response?.headers['retry-after']) || Math.pow(2, attempt) * 1000;
        console.warn(`[Vinnova GDP] Rate limited. Retrying after ${retryAfter}ms...`);
        await new Promise((r) => setTimeout(r, retryAfter));
        continue;
      }
      if (isRetryable && attempt < maxAttempts) {
        const backoff = Math.pow(2, attempt) * 1000;
        await new Promise((r) => setTimeout(r, backoff));
        continue;
      }
      throw new VinnovaApiError(
        `Vinnova GDP API error: ${status || 'Network/Unknown'} - ${error.message}`,
        status,
        error.response?.data
      );
    }
  }
  throw lastError;
}

// Example endpoint wrappers
export async function fetchUtlysningar(params: any = {}) {
  return gdpApiRequest('/utlysningar', { params }, true);
}
export async function fetchAnsokningar(params: any = {}) {
  return gdpApiRequest('/ansokningar', { params }, true);
}
export async function fetchFinansieradeAktiviteter(params: any = {}) {
  return gdpApiRequest('/finansieradeaktiviteter', { params }, true);
}

// NormalizedGrant type
export type NormalizedGrant = {
  id: string;
  title: string | null;
  description: string | null;
  deadline: string | null;
  sector: string | null;
  stage: string | null;
};

// normalizeGrant function
export function normalizeGrant(input: any): NormalizedGrant | null {
  if (!input || typeof input !== 'object') return null;
  const id = input.Diarienummer || input.diarienummer || input.id || null;
  if (!id) return null;
  const title = input.Titel || input.titel || input.title || null;
  const description = input.Beskrivning || input.beskrivning || input.description || null;
  let deadline = input.Beslutsdatum || input.beslutsdatum || input.Publiceringsdatum || input.publiceringsdatum || input.slutdatum || null;
  if (deadline && typeof deadline === 'string') {
    // Accept YYYY-MM-DD or YYYY/MM/DD or similar
    const match = deadline.match(/(\d{4})[-/](\d{2})[-/](\d{2})/);
    if (match) deadline = `${match[1]}-${match[2]}-${match[3]}`;
  }
  const sector = input.Sektor || input.sector || input.omrade || null;
  const stage = input.Stage || input.stage || null;
  return {
    id: String(id),
    title: title != null ? String(title) : null,
    description: description != null ? String(description) : null,
    deadline: deadline != null ? String(deadline) : null,
    sector,
    stage,
  };
}

// VinnovaService class using GDP API
type GDPParams = Record<string, any>;
export class VinnovaService {
  async getUtlysningar(params: GDPParams = {}) {
    return fetchUtlysningar(params);
  }
  async getAnsokningar(params: GDPParams = {}) {
    return fetchAnsokningar(params);
  }
  async getFinansieradeAktiviteter(params: GDPParams = {}) {
    return fetchFinansieradeAktiviteter(params);
  }
  // Generic method for any endpoint
  async request(endpoint: string, options: AxiosRequestConfig = {}, useCache = false) {
    return gdpApiRequest(endpoint, options, useCache);
  }
}

/**
 * Fetch grants from Vinnova API, optionally filtering by updatedAfter (ISO8601 string)
 */
export async function fetchVinnovaGrants({ updatedAfter }: { updatedAfter?: Date } = {}): Promise<any[]> {
  const params = new URLSearchParams();
  if (updatedAfter) {
    params.append('updatedAfter', updatedAfter.toISOString());
  }
  const url = `https://api.vinnova.se/grants?${params.toString()}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Vinnova API error: ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('Error fetching Vinnova grants:', err);
    return [];
  }
}

/**
 * Fetch applications from Vinnova API, optionally filtering by updatedAfter
 */
export async function fetchVinnovaApplications({ updatedAfter }: { updatedAfter?: Date } = {}): Promise<any[]> {
  const params = new URLSearchParams();
  if (updatedAfter) {
    params.append('updatedAfter', updatedAfter.toISOString());
  }
  const url = `https://api.vinnova.se/applications?${params.toString()}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Vinnova API error: ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('Error fetching Vinnova applications:', err);
    return [];
  }
}

/**
 * Fetch activities from Vinnova API, optionally filtering by updatedAfter
 */
export async function fetchVinnovaActivities({ updatedAfter }: { updatedAfter?: Date } = {}): Promise<any[]> {
  const params = new URLSearchParams();
  if (updatedAfter) {
    params.append('updatedAfter', updatedAfter.toISOString());
  }
  const url = `https://api.vinnova.se/activities?${params.toString()}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Vinnova API error: ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('Error fetching Vinnova activities:', err);
    return [];
  }
}