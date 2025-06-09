/**
 * @jest-environment node
 */
import { finansieradeaktiviteterHandler } from '../../../pages/api/vinnova/finansieradeaktiviteter';
import { testApiHandler } from '../../../lib/testUtils';
import { expect } from '@jest/globals';

describe('/api/vinnova/finansieradeaktiviteter', () => {
  let mockGetFinansieradeAktiviteter: jest.Mock;
  let mockRequireUser: jest.Mock;
  let mockSetCorsHeaders: jest.Mock;
  let mockSimpleRateLimit: jest.Mock;
  let mockValidate: jest.Mock;
  let mockHandleApiError: jest.Mock;
  let mockSetCache: jest.Mock;
  let mockGetCache: jest.Mock;
  let CircuitBreaker: any;
  const fakeUser = { id: 'user1' };
  const fakeQuery = { q: 'test' };
  const fakeResults = [{ AktivitetsID: '1', Aktivitetsnamn: 'A', Beskrivning: 'B', Startdatum: '2020-01-01', Slutdatum: '2020-12-31', foo: 'bar' }];
  const fakeData = { results: fakeResults, meta: { total: 1 } };
  const sanitizedResults = [{ AktivitetsID: '1', Aktivitetsnamn: 'A', Beskrivning: 'B', Startdatum: '2020-01-01', Slutdatum: '2020-12-31' }];
  const fakeCacheKey = 'finansieradeaktiviteter:' + JSON.stringify(fakeQuery);

  beforeEach(() => {
    mockGetFinansieradeAktiviteter = jest.fn().mockResolvedValue(fakeData);
    mockRequireUser = jest.fn().mockResolvedValue(fakeUser);
    mockSetCorsHeaders = jest.fn();
    mockSimpleRateLimit = jest.fn().mockReturnValue(true);
    mockValidate = jest.fn().mockReturnValue(fakeQuery);
    mockHandleApiError = jest.fn((res, err) => res.status(500).json({ error: 'handled', detail: err.message }));
    mockSetCache = jest.fn();
    mockGetCache = jest.fn();
    // Fake CircuitBreaker that just calls exec fn
    CircuitBreaker = class {
      constructor() {}
      async exec(fn: any) { return fn(); }
    };
  });

  it('handles OPTIONS method', async () => {
    const { res }: any = await testApiHandler((req, res) => finansieradeaktiviteterHandler(req, res, {
      setCorsHeaders: mockSetCorsHeaders,
    }), {
      method: 'OPTIONS',
    });
    expect(res._getStatusCode()).toBe(200);
    expect(res._isEndCalled()).toBe(true);
    expect(mockSetCorsHeaders).toHaveBeenCalled();
  });

  it('returns 429 if rate limit exceeded', async () => {
    mockSimpleRateLimit.mockReturnValue(false);
    const { res }: any = await testApiHandler((req, res) => finansieradeaktiviteterHandler(req, res, {
      setCorsHeaders: mockSetCorsHeaders,
      simpleRateLimit: mockSimpleRateLimit,
    }), {
      method: 'GET',
      headers: { 'x-forwarded-for': 'ip' },
    });
    expect(res._getStatusCode()).toBe(429);
    expect(JSON.parse(res._getData()).error).toMatch(/rate limit/i);
  });

  it('returns early if unauthenticated', async () => {
    mockRequireUser.mockResolvedValue(null);
    const { res }: any = await testApiHandler((req, res) => finansieradeaktiviteterHandler(req, res, {
      setCorsHeaders: mockSetCorsHeaders,
      simpleRateLimit: mockSimpleRateLimit,
      requireUser: mockRequireUser,
    }), {
      method: 'GET',
    });
    expect(res._getStatusCode()).toBe(200); // No response sent, so default is 200
    expect(res._isEndCalled()).toBe(true);
  });

  it('returns early if query invalid', async () => {
    mockValidate.mockReturnValue(null);
    const { res }: any = await testApiHandler((req, res) => finansieradeaktiviteterHandler(req, res, {
      setCorsHeaders: mockSetCorsHeaders,
      simpleRateLimit: mockSimpleRateLimit,
      requireUser: mockRequireUser,
      validate: mockValidate,
    }), {
      method: 'GET',
    });
    expect(res._getStatusCode()).toBe(200); // No response sent, so default is 200
    expect(res._isEndCalled()).toBe(true);
  });

  it('serves cache if circuit breaker open', async () => {
    CircuitBreaker = class {
      constructor() {}
      async exec() { throw new Error('Circuit breaker is open'); }
    };
    mockGetCache.mockReturnValue({ results: sanitizedResults, meta: { total: 1 } });
    const { res }: any = await testApiHandler(async (req, res) => {
      await finansieradeaktiviteterHandler(req, res, {
        setCorsHeaders: mockSetCorsHeaders,
        simpleRateLimit: mockSimpleRateLimit,
        requireUser: mockRequireUser,
        validate: mockValidate,
        CircuitBreaker,
        getCache: mockGetCache,
      });
    }, {
      method: 'GET',
    });
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.stale).toBe(true);
    expect(data.warning).toMatch(/outdated/i);
  });

  it('returns 503 if circuit breaker open and no cache', async () => {
    CircuitBreaker = class {
      constructor() {}
      async exec() { throw new Error('Circuit breaker is open'); }
    };
    mockGetCache.mockReturnValue(undefined);
    const { res }: any = await testApiHandler(async (req, res) => {
      await finansieradeaktiviteterHandler(req, res, {
        setCorsHeaders: mockSetCorsHeaders,
        simpleRateLimit: mockSimpleRateLimit,
        requireUser: mockRequireUser,
        validate: mockValidate,
        CircuitBreaker,
        getCache: mockGetCache,
      });
    }, {
      method: 'GET',
    });
    expect(res._getStatusCode()).toBe(503);
    expect(JSON.parse(res._getData()).error).toMatch(/temporarily unavailable/i);
  });

  it('serves cache if upstream error and cache exists', async () => {
    CircuitBreaker = class {
      constructor() {}
      async exec() { throw new Error('upstream error'); }
    };
    mockGetCache.mockReturnValue({ results: sanitizedResults, meta: { total: 1 } });
    const { res }: any = await testApiHandler(async (req, res) => {
      await finansieradeaktiviteterHandler(req, res, {
        setCorsHeaders: mockSetCorsHeaders,
        simpleRateLimit: mockSimpleRateLimit,
        requireUser: mockRequireUser,
        validate: mockValidate,
        CircuitBreaker,
        getCache: mockGetCache,
        handleApiError: mockHandleApiError,
      });
    }, {
      method: 'GET',
    });
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.stale).toBe(true);
    expect(data.warning).toMatch(/outdated/i);
  });

  it('calls handleApiError if upstream error and no cache', async () => {
    CircuitBreaker = class {
      constructor() {}
      async exec() { throw new Error('upstream error'); }
    };
    mockGetCache.mockReturnValue(undefined);
    const { res }: any = await testApiHandler((req, res) => finansieradeaktiviteterHandler(req, res, {
      setCorsHeaders: mockSetCorsHeaders,
      simpleRateLimit: mockSimpleRateLimit,
      requireUser: mockRequireUser,
      validate: mockValidate,
      CircuitBreaker,
      getCache: mockGetCache,
      handleApiError: mockHandleApiError,
    }), {
      method: 'GET',
    });
    expect(res._getStatusCode()).toBe(500);
    expect(JSON.parse(res._getData()).error).toBe('handled');
  });

  it('returns 200 and sanitized data on success', async () => {
    const { res }: any = await testApiHandler((req, res) => finansieradeaktiviteterHandler(req, res, {
      setCorsHeaders: mockSetCorsHeaders,
      simpleRateLimit: mockSimpleRateLimit,
      requireUser: mockRequireUser,
      validate: mockValidate,
      getFinansieradeAktiviteter: mockGetFinansieradeAktiviteter,
      setCache: mockSetCache,
      CircuitBreaker,
    }), {
      method: 'GET',
    });
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.results).toEqual(sanitizedResults);
    expect(mockSetCache).toHaveBeenCalledWith(fakeCacheKey, expect.anything(), expect.any(Number));
  });

  it('retries the Vinnova API call up to 3 times on transient failure', async () => {
    let callCount = 0;
    mockGetFinansieradeAktiviteter = jest.fn()
      .mockImplementation(() => {
        callCount++;
        if (callCount < 3) throw new Error('Transient error');
        return Promise.resolve(fakeData);
      });
    const { res }: any = await testApiHandler((req, res) => finansieradeaktiviteterHandler(req, res, {
      setCorsHeaders: mockSetCorsHeaders,
      simpleRateLimit: mockSimpleRateLimit,
      requireUser: mockRequireUser,
      validate: mockValidate,
      getFinansieradeAktiviteter: mockGetFinansieradeAktiviteter,
      setCache: mockSetCache,
      CircuitBreaker,
    }), {
      method: 'GET',
    });
    expect(mockGetFinansieradeAktiviteter).toHaveBeenCalledTimes(3);
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.results).toEqual(sanitizedResults);
  });
}); 