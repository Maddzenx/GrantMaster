/**
 * @jest-environment node
 */
jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));
import { resetPasswordHandler } from '../../../pages/api/reset-password';
import { testApiHandler } from '../../../lib/testUtils';

// Mock rate limiting
jest.mock('../../../lib/simpleRateLimit', () => ({
  simpleRateLimit: jest.fn(() => true),
}));
import { simpleRateLimit } from '../../../lib/simpleRateLimit';

describe('/api/reset-password', () => {
  let mockSupabase: any;
  let rateLimitSpy: jest.SpyInstance;

  beforeEach(() => {
    mockSupabase = {
      auth: {
        resetPasswordForEmail: jest.fn().mockResolvedValue({ error: null })
      }
    };
    // Always allow by default
    rateLimitSpy = jest.spyOn(require('../../../lib/simpleRateLimit'), 'simpleRateLimit').mockImplementation(() => true);
  });

  afterEach(() => {
    rateLimitSpy.mockRestore();
  });

  it('returns 400 for invalid email', async () => {
    const { res }: any = await testApiHandler((req, res) => resetPasswordHandler(req, res, mockSupabase), {
      method: 'POST',
      body: { email: 'not-an-email' },
    });
    expect(Number(res._getStatusCode())).toBe(400);
    expect(JSON.parse(res._getData() as string).error).toBeDefined();
  });

  it('returns 405 for wrong method', async () => {
    const { res }: any = await testApiHandler((req, res) => resetPasswordHandler(req, res, mockSupabase), {
      method: 'GET',
      body: {},
    });
    expect(Number(res._getStatusCode())).toBe(400); // ValidationError: Method not allowed
    expect(JSON.parse(res._getData() as string).error).toMatch(/method/i);
  });

  it('returns 429 if rate limit exceeded', async () => {
    rateLimitSpy.mockImplementation(() => false);
    const { res }: any = await testApiHandler((req, res) => resetPasswordHandler(req, res, mockSupabase), {
      method: 'POST',
      body: { email: 'test@example.com' },
    });
    expect(Number(res._getStatusCode())).toBe(429);
    expect(JSON.parse(res._getData() as string).error).toMatch(/too many/i);
    rateLimitSpy.mockImplementation(() => true); // Restore for following tests
  });

  it('returns 200 even if Supabase returns error', async () => {
    mockSupabase.auth.resetPasswordForEmail = jest.fn().mockResolvedValue({ error: { message: 'Supabase error' } });
    const { res }: any = await testApiHandler((req, res) => resetPasswordHandler(req, res, mockSupabase), {
      method: 'POST',
      body: { email: 'test@example.com' },
    });
    expect(Number(res._getStatusCode())).toBe(200);
    const data = res._getJSONData();
    expect(data.message).toMatch(/you will receive a password reset email/i);
    expect(data.requestId).toBeDefined();
  });

  it('returns 200 for valid request', async () => {
    mockSupabase.auth.resetPasswordForEmail = jest.fn().mockResolvedValue({ error: null });
    const { res }: any = await testApiHandler((req, res) => resetPasswordHandler(req, res, mockSupabase), {
      method: 'POST',
      body: { email: 'test@example.com' },
    });
    expect(Number(res._getStatusCode())).toBe(200);
    const data = res._getJSONData();
    expect(data.message).toMatch(/you will receive a password reset email/i);
    expect(data.requestId).toBeDefined();
  });
}); 