/// <reference types="jest" />
import axios from 'axios';
import { getVinnovaAccessToken } from './vinnovaAuth';
import {
  getUtlysningar,
  getAnsokningar,
  getFinansieradeAktiviteter,
  getAllPages,
  VinnovaAuthError,
  VinnovaRateLimitError,
  VinnovaServerError,
  Utlysning,
  Ansokning,
  FinansieradAktivitet,
} from './vinnovaApiClient';

jest.mock('axios');
jest.mock('./vinnovaAuth');
const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedGetToken = getVinnovaAccessToken as jest.Mock;

describe('Vinnova API Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.USE_OAUTH2 = 'false';
  });

  it('fetches utlysningar successfully', async () => {
    const mockData = { totalRecords: 2, results: [
      { Diarienummer: '1', Titel: 'A' },
      { Diarienummer: '2', Titel: 'B' },
    ] };
    mockedAxios.create.mockReturnThis();
    mockedAxios.request.mockResolvedValue({ data: mockData, status: 200 });
    const data = await getUtlysningar({ limit: 2 });
    expect(data.totalRecords).toBe(2);
    expect(data.results[0].Titel).toBe('A');
  });

  it('fetches ansokningar successfully', async () => {
    const mockData = { totalRecords: 1, results: [
      { Diarienummer: '3', Titel: 'App', Status: 'Beviljad' },
    ] };
    mockedAxios.create.mockReturnThis();
    mockedAxios.request.mockResolvedValue({ data: mockData, status: 200 });
    const data = await getAnsokningar({ limit: 1 });
    expect(data.results[0].Status).toBe('Beviljad');
  });

  it('fetches finansierade aktiviteter successfully', async () => {
    const mockData = { totalRecords: 1, results: [
      { AktivitetsID: 'X', Aktivitetsnamn: 'Test' },
    ] };
    mockedAxios.create.mockReturnThis();
    mockedAxios.request.mockResolvedValue({ data: mockData, status: 200 });
    const data = await getFinansieradeAktiviteter({ limit: 1 });
    expect(data.results[0].Aktivitetsnamn).toBe('Test');
  });

  it('handles 401 Unauthorized error', async () => {
    mockedAxios.create.mockReturnThis();
    mockedAxios.request.mockRejectedValue({
      response: { status: 401, data: { message: 'Unauthorized' } },
      message: 'Unauthorized',
    });
    try {
      await getUtlysningar({});
      throw new Error('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(VinnovaAuthError);
    }
  });

  it('handles 429 Rate Limit error', async () => {
    mockedAxios.create.mockReturnThis();
    // Simulate two rate limit errors, then a success
    mockedAxios.request
      .mockRejectedValueOnce({ response: { status: 429, headers: {}, data: {} }, message: 'Rate limit' })
      .mockRejectedValueOnce({ response: { status: 429, headers: {}, data: {} }, message: 'Rate limit' })
      .mockResolvedValueOnce({ data: { totalRecords: 0, results: [] }, status: 200 });
    const data = await getUtlysningar({});
    expect(data.results).toEqual([]);
  });

  it('handles 500 Server Error', async () => {
    mockedAxios.create.mockReturnThis();
    mockedAxios.request.mockRejectedValue({
      response: { status: 500, data: { message: 'Server error' } },
      message: 'Server error',
    });
    try {
      await getUtlysningar({});
      throw new Error('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(VinnovaServerError);
    }
  });

  it('aggregates results from multiple pages with getAllPages', async () => {
    // Three calls expected: two with results, one empty to end
    mockedAxios.request
      .mockResolvedValueOnce({ status: 200, data: { results: [
        { Diarienummer: '1', Titel: 'A' },
        { Diarienummer: '2', Titel: 'B' },
      ] } })
      .mockResolvedValueOnce({ status: 200, data: { results: [
        { Diarienummer: '3', Titel: 'C' },
      ] } })
      .mockResolvedValueOnce({ status: 200, data: { results: [] } }); // end
    const all = await getAllPages<any>('/utlysningar', {}, {}, 2, 3);
    expect(all.length).toBe(3);
    expect(all[2].Titel).toBe('C');
  });

  it('uses OAuth2 token if USE_OAUTH2 is true', async () => {
    process.env.USE_OAUTH2 = 'true';
    mockedGetToken.mockResolvedValue('mock-token');
    // Only one call expected
    mockedAxios.request.mockResolvedValueOnce({ status: 200, data: { totalRecords: 0, results: [] } });
    const data = await getUtlysningar({});
    expect(data.results).toEqual([]);
    expect(mockedGetToken.mock.calls.length).toBeGreaterThan(0);
  });

  /**
   * Test: GET requests are cached and do not trigger a new axios request within the cache TTL
   */
  it('returns cached data for repeated GET requests', async () => {
    // Only one call expected (second call should hit cache)
    const mockData = { totalRecords: 1, results: [{ Diarienummer: '1', Titel: 'Cached' }] };
    mockedAxios.request.mockResolvedValueOnce({ status: 200, data: mockData });
    const data1 = await getUtlysningar({ limit: 1 });
    const data2 = await getUtlysningar({ limit: 1 }); // Should hit cache
    expect(data2).toEqual(data1);
    expect(mockedAxios.request.mock.calls.length).toBe(1);
  });
}); 