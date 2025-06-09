/**
 * @jest-environment node
 */
import { syncGrantsHandler, __setIsSyncRunning } from '../../../pages/api/cron/sync-grants';
import { testApiHandler } from '../../../lib/testUtils';
import { expect } from '@jest/globals';

const TEST_SECRET = 'x'.repeat(32);

// Helper to get default headers
const getHeaders = (secret = TEST_SECRET) => ({ 'x-cron-secret': secret });

describe('/api/cron/sync-grants', () => {
  let mockSync: jest.Mock;

  beforeEach(() => {
    mockSync = jest.fn().mockResolvedValue({ grantsSynced: 5 });
  });

  it('returns 400 for wrong method', async () => {
    const { res }: any = await testApiHandler((req, res) => syncGrantsHandler(req, res, mockSync, TEST_SECRET), {
      method: 'GET',
      headers: getHeaders(),
    });
    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData()).error).toMatch(/method/i);
  });

  it('returns 400 for missing secret', async () => {
    const { res }: any = await testApiHandler((req, res) => syncGrantsHandler(req, res, mockSync, TEST_SECRET), {
      method: 'POST',
      headers: {},
    });
    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData()).error).toMatch(/secret/i);
  });

  it('returns 401 for invalid secret', async () => {
    const { res }: any = await testApiHandler((req, res) => syncGrantsHandler(req, res, mockSync, TEST_SECRET), {
      method: 'POST',
      headers: getHeaders('y'.repeat(32)),
    });
    expect(res._getStatusCode()).toBe(401);
    expect(JSON.parse(res._getData()).error).toMatch(/unauthorized/i);
  });

  it('returns 429 if sync already in progress', async () => {
    __setIsSyncRunning(true);
    const { res }: any = await testApiHandler((req, res) => syncGrantsHandler(req, res, mockSync, TEST_SECRET), {
      method: 'POST',
      headers: getHeaders(),
    });
    expect(res._getStatusCode()).toBe(429);
    expect(JSON.parse(res._getData()).error).toMatch(/in progress/i);
    __setIsSyncRunning(false); // Reset for other tests
  });

  it('returns 500 if sync throws', async () => {
    mockSync.mockRejectedValueOnce(new Error('sync failed'));
    const { res }: any = await testApiHandler((req, res) => syncGrantsHandler(req, res, mockSync, TEST_SECRET), {
      method: 'POST',
      headers: getHeaders(),
    });
    expect(res._getStatusCode()).toBe(500);
    expect(JSON.parse(res._getData()).error).toMatch(/sync failed/i);
  });

  it('returns 200 and report for success', async () => {
    mockSync.mockResolvedValueOnce({ grantsSynced: 7 });
    const { res }: any = await testApiHandler((req, res) => syncGrantsHandler(req, res, mockSync, TEST_SECRET), {
      method: 'POST',
      headers: getHeaders(),
    });
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.report).toMatchObject({ grantsSynced: 7 });
    expect(data.durationMs).toBeGreaterThanOrEqual(0);
    expect(data.requestId).toBeDefined();
  });
}); 