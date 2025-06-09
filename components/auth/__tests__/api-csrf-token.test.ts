/**
 * @jest-environment node
 */
jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));
import handler from '../../../pages/api/csrf-token';
import { testApiHandler } from '../../../lib/testUtils';
import { csrfTokenHandler } from '../../../pages/api/csrf-token';

// Mock setCsrfSecret and generateCsrfToken
const setCsrfSecretMock = jest.fn();
const generateCsrfTokenMock = jest.fn(() => 'mocked-csrf-token');
jest.mock('../../../lib/csrf', () => ({
  setCsrfSecret: (...args: any[]) => setCsrfSecretMock(...args),
  generateCsrfToken: (...args: any[]) => generateCsrfTokenMock(...args),
}));

// Remove jest.mock('csrf', ...) and instead define a MockTokens class
class MockTokens {
  secretSync() {
    return 'mocked-secret';
  }
}

describe('/api/csrf-token', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setCsrfSecretMock.mockClear();
    generateCsrfTokenMock.mockClear();
  });

  it('returns 200 and csrf token for GET', async () => {
    const { res }: any = await testApiHandler((req, res) => csrfTokenHandler(req, res, MockTokens), {
      method: 'GET',
    });
    expect(Number(res._getStatusCode())).toBe(200);
    const data = res._getJSONData();
    expect(data.csrfToken).toBe('mocked-csrf-token');
    expect(setCsrfSecretMock).toHaveBeenCalledWith(res, 'mocked-secret');
    expect(generateCsrfTokenMock).toHaveBeenCalledWith('mocked-secret');
  });

  it('returns 400 for wrong method', async () => {
    const { res }: any = await testApiHandler((req, res) => csrfTokenHandler(req, res, MockTokens), {
      method: 'POST',
    });
    expect(Number(res._getStatusCode())).toBe(400);
    expect(JSON.parse(res._getData() as string).error).toMatch(/method/i);
  });
}); 