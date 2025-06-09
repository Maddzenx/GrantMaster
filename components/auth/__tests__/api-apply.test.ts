/**
 * @jest-environment node
 */
jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));
import { applyHandler } from '../../../pages/api/apply';
import { testApiHandler } from '../../../lib/testUtils';

// Shared variable to control requireUser mock
let requireUserMockImpl: any;

jest.mock('../../../lib/requireUser', () => ({
  requireUser: (...args: any[]) => requireUserMockImpl(...args),
}));
import * as requireUserModule from '../../../lib/requireUser';

// Mock CSRF utilities
jest.mock('../../../lib/csrf', () => ({
  getCsrfSecret: () => 'test-secret',
  verifyCsrfToken: (secret: string, token: string) => secret === 'test-secret' && token === 'validtoken',
}));

const validInput = {
  userId: '123e4567-e89b-12d3-a456-426614174000',
  grantId: 'grant1',
  projectTitle: 'Project X',
  projectSummary: 'This is a valid project summary with more than ten characters.',
  requestedAmount: 1000,
  attachmentUrl: 'https://example.com/file.pdf',
};

describe('/api/apply', () => {
  const mockUser = {
    id: 'user1',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  };

  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    requireUserMockImpl = jest.fn().mockResolvedValue(mockUser);
    // Default mockSupabase for success
    mockSupabase = {
      from: jest.fn(() => ({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({ data: {}, error: null })
          }))
        }))
      }))
    };
  });

  it('returns 401 if unauthenticated', async () => {
    requireUserMockImpl = jest.fn().mockResolvedValue(null);
    const { res } = await testApiHandler((req, res) => applyHandler(req, res, mockSupabase), {
      method: 'POST',
      body: validInput,
      headers: { 'x-csrf-token': 'validtoken' },
    });
    expect(res._getStatusCode()).toEqual(401);
    const data = JSON.parse(res._getData() as string);
    expect(data.error).toMatch(/not authenticated/i);
    expect(data.requestId).toBeDefined();
  });

  it('returns 401 for missing CSRF token', async () => {
    const { res } = await testApiHandler((req, res) => applyHandler(req, res, mockSupabase), {
      method: 'POST',
      body: {},
    });
    expect(res._getStatusCode()).toEqual(401);
    expect(JSON.parse(res._getData()).error).toMatch(/csrf/i);
  });

  it('returns 400 for invalid input', async () => {
    const { res } = await testApiHandler((req, res) => applyHandler(req, res, mockSupabase), {
      method: 'POST',
      body: { userId: '', grantId: '', projectTitle: '', projectSummary: '', requestedAmount: 'not-a-number' },
      headers: { 'x-csrf-token': 'validtoken' },
    });
    expect(res._getStatusCode()).toEqual(400);
    expect(JSON.parse(res._getData()).error).toBeDefined();
  });

  it('returns 400 for wrong HTTP method', async () => {
    const { res } = await testApiHandler((req, res) => applyHandler(req, res, mockSupabase), {
      method: 'GET',
      body: {},
      headers: { 'x-csrf-token': 'validtoken' },
    });
    expect(res._getStatusCode()).toEqual(400);
    const data = JSON.parse(res._getData() as string);
    expect(data.error).toMatch(/method/i);
    expect(data.requestId).toBeDefined();
  });

  it('returns 401 for invalid CSRF token', async () => {
    const { res } = await testApiHandler((req, res) => applyHandler(req, res, mockSupabase), {
      method: 'POST',
      body: validInput,
      headers: { 'x-csrf-token': 'invalidtoken' },
    });
    expect(res._getStatusCode()).toEqual(401);
    const data = JSON.parse(res._getData() as string);
    expect(data.error).toMatch(/csrf/i);
    expect(data.requestId).toBeDefined();
  });

  it('returns 500 for Supabase failure', async () => {
    mockSupabase.from = jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Supabase error' } })
        }))
      }))
    }));
    const { res } = await testApiHandler((req, res) => applyHandler(req, res, mockSupabase), {
      method: 'POST',
      body: validInput,
      headers: { 'x-csrf-token': 'validtoken' },
    });
    expect(res._getStatusCode()).toEqual(500);
    const data = JSON.parse(res._getData() as string);
    expect(data.error).toMatch(/failed to submit/i);
    expect(data.requestId).toBeDefined();
    expect(data.context).toBeDefined();
    expect(data.context.supabaseError).toEqual('Supabase error');
  });

  it('returns 201 and application data for valid input', async () => {
    const fakeApp = {
      id: 1,
      user_id: validInput.userId,
      grant_id: validInput.grantId,
      project_title: validInput.projectTitle,
      project_summary: validInput.projectSummary,
      requested_amount: validInput.requestedAmount,
      attachment_url: validInput.attachmentUrl,
      created_at: '2024-01-01T00:00:00Z',
    };
    mockSupabase.from = jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: fakeApp, error: null })
        }))
      }))
    }));
    const { res } = await testApiHandler((req, res) => applyHandler(req, res, mockSupabase), {
      method: 'POST',
      body: validInput,
      headers: { 'x-csrf-token': 'validtoken' },
    });
    expect(res._getStatusCode()).toEqual(201);
    const data = JSON.parse(res._getData() as string);
    expect(data.message).toMatch(/success/i);
    expect(data.application).toMatchObject({
      id: 1,
      user_id: validInput.userId,
      grant_id: validInput.grantId,
      project_title: validInput.projectTitle,
      project_summary: validInput.projectSummary,
      requested_amount: validInput.requestedAmount,
      attachment_url: validInput.attachmentUrl,
      created_at: '2024-01-01T00:00:00Z',
    });
    expect(data.requestId).toBeDefined();
  });

  it('returns 500 for unexpected error', async () => {
    requireUserMockImpl = jest.fn(() => { throw new Error('Unexpected!'); });
    const { res } = await testApiHandler((req, res) => applyHandler(req, res, mockSupabase), {
      method: 'POST',
      body: validInput,
      headers: { 'x-csrf-token': 'validtoken' },
    });
    expect(res._getStatusCode()).toEqual(500);
    const data = JSON.parse(res._getData() as string);
    expect(data.error).toMatch(/unexpected error/i);
    expect(data.requestId).toBeDefined();
  });

  it('retries the Supabase insert up to 3 times on transient failure', async () => {
    let callCount = 0;
    const singleMock = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount < 3) return Promise.reject(new Error('Transient insert error'));
      return Promise.resolve({
        data: {
          id: 1,
          user_id: validInput.userId,
          grant_id: validInput.grantId,
          project_title: validInput.projectTitle,
          project_summary: validInput.projectSummary,
          requested_amount: validInput.requestedAmount,
          attachment_url: validInput.attachmentUrl,
          created_at: '2024-01-01T00:00:00Z',
        },
        error: null
      });
    });
    mockSupabase.from = jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: singleMock
        }))
      }))
    }));
    const { res } = await testApiHandler((req, res) => applyHandler(req, res, mockSupabase), {
      method: 'POST',
      body: validInput,
      headers: { 'x-csrf-token': 'validtoken' },
    });
    expect(singleMock).toHaveBeenCalledTimes(3);
    expect(res._getStatusCode()).toEqual(201);
    const data = JSON.parse(res._getData() as string);
    expect(data.message).toMatch(/success/i);
    expect(data.application).toMatchObject({
      id: 1,
      user_id: validInput.userId,
      grant_id: validInput.grantId,
      project_title: validInput.projectTitle,
      project_summary: validInput.projectSummary,
      requested_amount: validInput.requestedAmount,
      attachment_url: validInput.attachmentUrl,
      created_at: '2024-01-01T00:00:00Z',
    });
    expect(data.requestId).toBeDefined();
  });
}); 