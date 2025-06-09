jest.resetModules();
jest.mock('@supabase/supabase-js');
jest.mock('lib/supabaseClient');
/**
 * @jest-environment node
 */
import { expect } from '@jest/globals';
const { uploadMock, getPublicUrlMock } = require('lib/supabaseClient');
const { uploadMock: uploadMockSupabase } = require('@supabase/supabase-js');

// Use var to avoid hoisting issues with jest.mock
var parseMock = jest.fn();
var IncomingFormMock = jest.fn(() => ({ parse: parseMock }));
jest.mock('formidable', () => {
  const actual = jest.requireActual('formidable');
  function IncomingFormMockCtor() {
    return { parse: parseMock };
  }
  return {
    ...actual,
    IncomingForm: IncomingFormMockCtor,
    default: { IncomingForm: IncomingFormMockCtor },
  };
});

// Supabase mocks (use var for hoisting)
var fromMock = jest.fn(() => ({
  upload: uploadMock,
  getPublicUrl: getPublicUrlMock,
}));
var storageMock = { from: fromMock };

jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));
import handler, { uploadHandler } from '../../../pages/api/upload';
import { testApiHandler } from '../../../lib/testUtils';

// Mocks for CSRF and rate limit
jest.mock('../../../lib/simpleRateLimit', () => ({
  simpleRateLimit: jest.fn(() => true),
}));
jest.mock('../../../lib/csrf', () => ({
  getCsrfSecret: jest.fn(() => 'test-secret'),
  verifyCsrfToken: jest.fn(() => true),
}));
import { simpleRateLimit } from '../../../lib/simpleRateLimit';
import { getCsrfSecret, verifyCsrfToken } from '../../../lib/csrf';

const mockFile = {
  originalFilename: 'test.pdf',
  newFilename: 'test.pdf',
  mimetype: 'application/pdf',
  size: 1024,
  filepath: '/tmp/test.pdf',
};

jest.mock('fs', () => ({
  readFileSync: jest.fn(() => Buffer.from('filedata')),
}));

describe('/api/upload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (simpleRateLimit as jest.Mock).mockImplementation(() => true);
    (getCsrfSecret as jest.Mock).mockReturnValue('test-secret');
    (verifyCsrfToken as jest.Mock).mockReturnValue(true);
    uploadMock.mockReset();
    getPublicUrlMock.mockReset();
    uploadMock.mockResolvedValue({ error: null });
    getPublicUrlMock.mockReturnValue({ data: { publicUrl: 'https://public.url/test.pdf' } });
  });

  it('returns 400 for wrong method', async () => {
    const { res } = await testApiHandler(handler, {
      method: 'GET',
    });
    expect(res._getStatusCode()).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.error).toMatch(/method/i);
    expect(data.requestId).toBeDefined();
  });

  it('returns 429 if rate limit exceeded', async () => {
    (simpleRateLimit as jest.Mock).mockImplementation(() => false);
    const { res } = await testApiHandler(handler, {
      method: 'POST',
    });
    expect(res._getStatusCode()).toBe(429);
    const data = JSON.parse(res._getData());
    expect(data.error).toMatch(/too many/i);
    expect(data.requestId).toBeDefined();
  });

  it('returns 401 for invalid CSRF token', async () => {
    (verifyCsrfToken as jest.Mock).mockReturnValue(false);
    const { res } = await testApiHandler(handler, {
      method: 'POST',
    });
    expect(res._getStatusCode()).toBe(401);
    const data = JSON.parse(res._getData());
    expect(data.error).toMatch(/csrf/i);
    expect(data.requestId).toBeDefined();
  });

  it('returns 400 for invalid file type', async () => {
    (verifyCsrfToken as jest.Mock).mockReturnValue(true);
    parseMock.mockImplementationOnce((req, cb) => {
      cb(null, {}, { file: { ...mockFile, mimetype: 'text/plain' } });
    });
    const { res } = await testApiHandler(handler, {
      method: 'POST',
      headers: { 'x-csrf-token': 'test-token' },
    });
    expect(res._getStatusCode()).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.error).toMatch(/allowed/i);
    expect(data.requestId).toBeDefined();
  });

  it('returns 400 for formidable error (file too large or invalid form data)', async () => {
    parseMock.mockImplementationOnce((req, cb) => {
      cb(new Error('Formidable error'), {}, {});
    });
    const { res } = await testApiHandler(handler, {
      method: 'POST',
      headers: { 'x-csrf-token': 'test-token' },
    });
    expect(res._getStatusCode()).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.error).toMatch(/file too large|invalid form data/i);
    expect(data.requestId).toBeDefined();
  });

  it('returns 400 for no file uploaded', async () => {
    parseMock.mockImplementationOnce((req, cb) => {
      cb(null, {}, {});
    });
    const { res } = await testApiHandler(handler, {
      method: 'POST',
      headers: { 'x-csrf-token': 'test-token' },
    });
    expect(res._getStatusCode()).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.error).toMatch(/no file uploaded/i);
    expect(data.requestId).toBeDefined();
  });

  it('returns 500 for unexpected/internal error', async () => {
    parseMock.mockImplementationOnce(() => { throw new Error('Unexpected!'); });
    const { res } = await testApiHandler(handler, {
      method: 'POST',
      headers: { 'x-csrf-token': 'test-token' },
    });
    expect(res._getStatusCode()).toBe(500);
    const data = JSON.parse(res._getData());
    expect(data.error).toMatch(/unexpected error/i);
    expect(data.requestId).toBeDefined();
  });

  it('returns 500 for circuit breaker open', async () => {
    parseMock.mockImplementationOnce((req, cb) => {
      cb(null, {}, { file: mockFile });
    });
    uploadMock.mockImplementationOnce(() => { 
      console.log('DEBUG: uploadMock called (circuit breaker test)');
      throw new Error('Circuit breaker is open'); 
    });
    // Create a mock supabase client to inject
    const supabaseMock = {
      storage: {
        from: () => ({
          upload: uploadMock,
          getPublicUrl: getPublicUrlMock,
        }),
      },
    };
    const { res } = await testApiHandler((req, res) => uploadHandler(req, res, supabaseMock), {
      method: 'POST',
      headers: { 'x-csrf-token': 'test-token' },
    });
    await new Promise(r => setTimeout(r, 0)); // Ensure async callback completes
    expect(res._getStatusCode()).toBe(500);
    const data = JSON.parse(res._getData());
    expect(data.error).toMatch(/temporarily disabled/i);
    expect(data.requestId).toBeDefined();
  });

  it('returns 200 and public url for valid upload', async () => {
    uploadMock.mockImplementationOnce((...args) => {
      return Promise.resolve({ error: null });
    });
    fromMock.mockReturnValue((() => {
      const ret = { upload: uploadMock, getPublicUrl: getPublicUrlMock };
      return ret;
    })());
    (verifyCsrfToken as jest.Mock).mockReturnValue(true);
    parseMock.mockImplementationOnce((req, cb) => {
      cb(null, {}, { file: mockFile });
    });
    const { res } = await testApiHandler(handler, {
      method: 'POST',
      headers: { 'x-csrf-token': 'test-token' },
    });
    expect(res._getStatusCode()).toBe(200);
    const data = res._getJSONData();
    expect(data.url).toBe('https://public.url/test.pdf');
  });

  it('returns 502 and enhanced error structure for Supabase upload failure', async () => {
    // Simulate formidable parsing a valid file
    parseMock.mockImplementationOnce((req, cb) => {
      process.nextTick(() => cb(null, {}, { file: mockFile }));
    });
    // Simulate Supabase upload returning an error (set this after beforeEach resets)
    uploadMockSupabase.mockResolvedValueOnce({ error: 'Supabase upload failed' });
    const { res } = await testApiHandler(handler, {
      method: 'POST',
      headers: { 'x-csrf-token': 'test-token' },
    });
    await new Promise(r => setTimeout(r, 0)); // Ensure async callback completes
    expect(res._getStatusCode()).toBe(502);
    const data = res._getJSONData();
    expect(data.error).toMatch(/supabase/i);
    expect(data.code).toBe('EXTERNAL_SERVICE');
    expect(data.requestId).toBeDefined();
    expect(data.context).toBeDefined();
    expect(data.context.service).toBe('Supabase');
    expect(data.context.uploadError).toBe('Supabase upload failed');
  });

  it('retries the Supabase upload up to 3 times on transient failure', async () => {
    let callCount = 0;
    uploadMock.mockImplementation((...args) => {
      callCount++;
      if (callCount < 3) return Promise.reject(new Error('Transient upload error'));
      return Promise.resolve({ error: null });
    });
    fromMock.mockReturnValue({ upload: uploadMock, getPublicUrl: getPublicUrlMock });
    (verifyCsrfToken as jest.Mock).mockReturnValue(true);
    parseMock.mockImplementationOnce((req, cb) => {
      cb(null, {}, { file: mockFile });
    });
    const { res } = await testApiHandler(handler, {
      method: 'POST',
      headers: { 'x-csrf-token': 'test-token' },
    });
    expect(uploadMock).toHaveBeenCalledTimes(3);
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.url).toMatch(/public.url/);
  });
}); 