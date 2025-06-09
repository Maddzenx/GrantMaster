/**
 * @jest-environment node
 */
jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));
import { healthHandler } from '../../../pages/api/health';
import { testApiHandler } from '../../../lib/testUtils';

describe('/api/health', () => {
  let mockSupabase: any;
  let mockBreaker: any;

  beforeEach(() => {
    mockSupabase = {
      rpc: jest.fn().mockResolvedValue({ error: null }),
      storage: {
        listBuckets: jest.fn().mockResolvedValue({ error: null })
      }
    };
    mockBreaker = {
      getState: jest.fn().mockReturnValue('CLOSED')
    };
  });

  it('returns 200 and ok status when all services are healthy', async () => {
    const { res }: any = await testApiHandler((req, res) => healthHandler(req, res, mockSupabase, mockBreaker), {
      method: 'GET',
    });
    expect(Number(res._getStatusCode())).toBe(200);
    const data = res._getJSONData();
    expect(data.status).toBe('ok');
    expect(data.supabase).toBe('ok');
    expect(data.vinnova).toBe('ok');
    expect(data.storage).toBe('ok');
  });

  it('returns 503 and degraded if DB is down', async () => {
    mockSupabase.rpc.mockResolvedValue({ error: 'db error' });
    const { res }: any = await testApiHandler((req, res) => healthHandler(req, res, mockSupabase, mockBreaker), {
      method: 'GET',
    });
    expect(Number(res._getStatusCode())).toBe(503);
    const data = res._getJSONData();
    expect(data.status).toBe('degraded');
    expect(data.supabase).toBe('error');
  });

  it('returns 503 and degraded if storage is down', async () => {
    mockSupabase.storage.listBuckets.mockResolvedValue({ error: 'storage error' });
    const { res }: any = await testApiHandler((req, res) => healthHandler(req, res, mockSupabase, mockBreaker), {
      method: 'GET',
    });
    expect(Number(res._getStatusCode())).toBe(503);
    const data = res._getJSONData();
    expect(data.status).toBe('degraded');
    expect(data.storage).toBe('error');
  });

  it('returns 503 and degraded if circuit breaker is open', async () => {
    mockBreaker.getState.mockReturnValue('OPEN');
    const { res }: any = await testApiHandler((req, res) => healthHandler(req, res, mockSupabase, mockBreaker), {
      method: 'GET',
    });
    expect(Number(res._getStatusCode())).toBe(503);
    const data = res._getJSONData();
    expect(data.status).toBe('degraded');
    expect(data.vinnova).toBe('degraded');
  });

  it('returns 400 for wrong method', async () => {
    const { res }: any = await testApiHandler((req, res) => healthHandler(req, res, mockSupabase, mockBreaker), {
      method: 'POST',
    });
    expect(Number(res._getStatusCode())).toBe(400);
    expect(JSON.parse(res._getData() as string).error).toMatch(/method/i);
  });
}); 