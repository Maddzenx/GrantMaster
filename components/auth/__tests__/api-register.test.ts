/**
 * @jest-environment node
 */
jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));
import { registerHandler } from '../../../pages/api/register';
import { testApiHandler } from '../../../lib/testUtils';

// Mock CSRF utilities to allow valid CSRF check in tests
jest.mock('../../../lib/csrf', () => ({
  getCsrfSecret: () => 'test-secret',
  verifyCsrfToken: (secret: string, token: string) => secret === 'test-secret' && token === 'validtoken',
}));

describe('/api/register', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      auth: {
        signUp: jest.fn().mockResolvedValue({ data: { user: { id: 'user1', email: 'test@example.com', created_at: '2024-01-01T00:00:00Z', user_metadata: { name: 'Test' } } }, error: null })
      }
    };
  });

  it('returns 400 for wrong method', async () => {
    const { res }: any = await testApiHandler((req, res) => registerHandler(req, res, mockSupabase), {
      method: 'GET',
      body: {},
      headers: { 'x-csrf-token': 'validtoken' }
    });
    expect(Number(res._getStatusCode())).toBe(400);
    expect(JSON.parse(res._getData() as string).error).toMatch(/method/i);
  });

  it('returns 400 for invalid input', async () => {
    const { res }: any = await testApiHandler((req, res) => registerHandler(req, res, mockSupabase), {
      method: 'POST',
      body: { email: 'bademail', password: 'short', name: '' },
      headers: { 'x-csrf-token': 'validtoken' }
    });
    expect(Number(res._getStatusCode())).toBe(400);
    expect(JSON.parse(res._getData() as string).error).toBeDefined();
  });

  it('returns 401 for missing CSRF token', async () => {
    const { res }: any = await testApiHandler((req, res) => registerHandler(req, res, mockSupabase), {
      method: 'POST',
      body: { email: 'test@example.com', password: 'password123', name: 'Test' }
    });
    expect(Number(res._getStatusCode())).toBe(401);
    expect(JSON.parse(res._getData() as string).error).toMatch(/csrf/i);
  });

  it('returns 429 after too many attempts', async () => {
    for (let i = 0; i < 5; i++) {
      await testApiHandler((req, res) => registerHandler(req, res, mockSupabase), {
        method: 'POST',
        body: { email: 'test@example.com', password: 'password123', name: 'Test' },
        headers: { 'x-csrf-token': 'validtoken', 'x-forwarded-for': '1.2.3.4' }
      });
    }
    const { res }: any = await testApiHandler((req, res) => registerHandler(req, res, mockSupabase), {
      method: 'POST',
      body: { email: 'test@example.com', password: 'password123', name: 'Test' },
      headers: { 'x-csrf-token': 'validtoken', 'x-forwarded-for': '1.2.3.4' }
    });
    expect(Number(res._getStatusCode())).toBe(429);
    expect(JSON.parse(res._getData() as string).error).toMatch(/too many/i);
  });

  it('returns 500 for Supabase registration error', async () => {
    mockSupabase.auth.signUp = jest.fn().mockResolvedValue({ data: {}, error: { message: 'Supabase error' } });
    const { res }: any = await testApiHandler((req, res) => registerHandler(req, res, mockSupabase), {
      method: 'POST',
      body: { email: 'test@example.com', password: 'password123', name: 'Test' },
      headers: { 'x-csrf-token': 'validtoken' }
    });
    expect(Number(res._getStatusCode())).toBe(500);
    expect(JSON.parse(res._getData() as string).error).toMatch(/registration failed/i);
  });

  it('returns 200 and user info for valid registration', async () => {
    mockSupabase.auth.signUp = jest.fn().mockResolvedValue({ data: { user: { id: 'user1', email: 'test@example.com', created_at: '2024-01-01T00:00:00Z', user_metadata: { name: 'Test' } } }, error: null });
    const { res }: any = await testApiHandler((req, res) => registerHandler(req, res, mockSupabase), {
      method: 'POST',
      body: { email: 'test@example.com', password: 'password123', name: 'Test' },
      headers: { 'x-csrf-token': 'validtoken' }
    });
    expect(Number(res._getStatusCode())).toBe(200);
    const data = res._getJSONData();
    expect(data.message).toMatch(/registration successful/i);
    expect(data.user).toMatchObject({
      id: 'user1',
      email: 'test@example.com',
      created_at: '2024-01-01T00:00:00Z',
      name: 'Test',
    });
    expect(data.requestId).toBeDefined();
  });
}); 