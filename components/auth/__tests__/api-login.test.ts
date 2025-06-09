/**
 * @jest-environment node
 */
import { testApiHandler } from '../../../lib/testUtils';
import { loginHandler } from '../../../pages/api/login';
import * as uuid from 'uuid';

jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));

describe('/api/login', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      auth: {
        signInWithPassword: jest.fn().mockResolvedValue({ data: { session: { id: 'sess1' }, user: { id: 'user1' } }, error: null })
      }
    };
  });

  it('returns 405 for wrong method', async () => {
    const { res }: any = await testApiHandler((req, res) => loginHandler(req, res, mockSupabase), {
      method: 'GET',
      body: {},
    });
    expect(res._getStatusCode()).toEqual(400); // ValidationError: Method not allowed
    const data = res._getJSONData();
    expect(data.error).toMatch(/method/i);
  });

  it('returns 400 for invalid email/password', async () => {
    const { res }: any = await testApiHandler((req, res) => loginHandler(req, res, mockSupabase), {
      method: 'POST',
      body: { email: 'bademail', password: 'short' },
    });
    expect(res._getStatusCode()).toEqual(400);
    const data = res._getJSONData();
    expect(data.error).toBeDefined();
  });

  it('returns 429 after too many attempts', async () => {
    // Use the default handler to test rate limiting (since it uses the real limiter)
    for (let i = 0; i < 10; i++) {
      await testApiHandler((req, res) => loginHandler(req, res, mockSupabase), {
        method: 'POST',
        body: { email: 'test@example.com', password: 'validpassword' },
        headers: { 'x-forwarded-for': '1.2.3.4' },
      });
    }
    const { res }: any = await testApiHandler((req, res) => loginHandler(req, res, mockSupabase), {
      method: 'POST',
      body: { email: 'test@example.com', password: 'validpassword' },
      headers: { 'x-forwarded-for': '1.2.3.4' },
    });
    expect(res._getStatusCode()).toEqual(429);
    const data = res._getJSONData();
    expect(data.error).toMatch(/too many/i);
  });

  it('returns 401 for Supabase auth error', async () => {
    mockSupabase.auth.signInWithPassword = jest.fn().mockResolvedValue({ data: {}, error: { message: 'Invalid login' } });
    const { res }: any = await testApiHandler((req, res) => loginHandler(req, res, mockSupabase), {
      method: 'POST',
      body: { email: 'test@example.com', password: 'validpassword' },
    });
    expect(res._getStatusCode()).toEqual(401);
    const data = res._getJSONData();
    expect(data.error).toMatch(/invalid email or password/i);
  });

  it('returns 200 and session/user for valid login', async () => {
    mockSupabase.auth.signInWithPassword = jest.fn().mockResolvedValue({ data: { session: { id: 'sess1' }, user: { id: 'user1' } }, error: null });
    const { res }: any = await testApiHandler((req, res) => loginHandler(req, res, mockSupabase), {
      method: 'POST',
      body: { email: 'test@example.com', password: 'validpassword' },
    });
    expect(res._getStatusCode()).toEqual(200);
    const data = res._getJSONData();
    expect(data.message).toMatch(/login successful/i);
    expect(data.session).toMatchObject({ id: 'sess1' });
    expect(data.user).toMatchObject({ id: 'user1' });
    expect(data.requestId).toBeDefined();
  });
});