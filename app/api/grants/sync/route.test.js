// Polyfill Response for Jest (Node environment)
if (typeof Response === 'undefined') {
  global.Response = require('node-fetch').Response;
}

import { GET } from './route';

// Mock fetch and Supabase
const mockUpsert = jest.fn();
jest.mock('@/app/lib/supabase', () => ({
  supabase: { from: () => ({ upsert: mockUpsert }) }
}));

global.fetch = jest.fn();

jest.mock('@/app/lib/vinnovaSync', () => ({
  syncVinnovaGrants: jest.fn(),
}));

const { syncVinnovaGrants } = require('@/app/lib/vinnovaSync');

describe('GET /api/grants/sync', () => {
  const secret = 'test-secret';
  beforeAll(() => {
    process.env.SYNC_CRON_SECRET = secret;
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function makeReq(token) {
    return {
      headers: {
        get: (name) => name === 'authorization' ? (token ? `Bearer ${token}` : undefined) : undefined,
      },
    };
  }

  it('returns 401 if no Authorization header', async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
    const body = JSON.parse(await res.text());
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/Unauthorized/);
  });

  it('returns 401 if token is invalid', async () => {
    const res = await GET(makeReq('wrong-token'));
    expect(res.status).toBe(401);
    const body = JSON.parse(await res.text());
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/Unauthorized/);
  });

  it('returns a sync report on success', async () => {
    const mockReport = {
      inserted: 2,
      updated: 1,
      unchanged: 3,
      failed: 0,
      errors: [],
      total: 6,
      startedAt: '2025-05-19T18:00:00.000Z',
      finishedAt: '2025-05-19T18:00:01.000Z',
      durationMs: 1000,
    };
    syncVinnovaGrants.mockResolvedValue(mockReport);
    const res = await GET(makeReq(secret));
    expect(res.status).toBe(200);
    const body = JSON.parse(await res.text());
    expect(body.success).toBe(true);
    expect(body.report).toEqual(mockReport);
  });

  it('returns 500 on error', async () => {
    syncVinnovaGrants.mockRejectedValue(new Error('Sync failed'));
    const res = await GET(makeReq(secret));
    expect(res.status).toBe(500);
    const body = JSON.parse(await res.text());
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/Sync failed/);
  });
}); 