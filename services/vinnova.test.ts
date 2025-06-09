/// <reference types="jest" />
import { VinnovaService, normalizeGrant, NormalizedGrant } from './vinnova';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('VinnovaService', () => {
  let service: VinnovaService;
  let mockRequest: jest.Mock;
  let mockClient: any;
  let setTimeoutSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = jest.fn();
    // Ensure all rejected values by default have the correct error shape
    mockRequest.mockRejectedValue({ message: 'Network error', response: { data: {} } });
    mockClient = { request: mockRequest };
    mockedAxios.create.mockReturnValue(mockClient);
    // Mock axios.post for token requests
    mockedAxios.post = jest.fn().mockResolvedValue({ data: { access_token: 'test-token' } });
    // Instantly run setTimeout to avoid retry delays
    setTimeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation((cb: any) => { cb(); return {} as any; });
    service = new VinnovaService();
  });

  afterEach(() => {
    setTimeoutSpy.mockRestore();
  });

  describe('getUtlysningar', () => {
    it('returns calls on success', async () => {
      const mockData: any[] = [
        { id: '1', title: 'Call 1' },
        { id: '2', title: 'Call 2' },
      ];
      // Only one call expected
      mockRequest.mockResolvedValueOnce({ data: mockData });
      const result = await service.getUtlysningar();
      expect(result as jest.Matchers<any, any>).toEqual(mockData);
      expect(mockRequest).toHaveBeenCalledWith({ url: '/calls', method: 'GET' });
    });

    it('retries and succeeds after 2 failures', async () => {
      const mockData: any[] = [
        { id: '3', title: 'Call 3' },
      ];
      // Two failures, then a success (3 calls total)
      mockRequest
        .mockRejectedValueOnce({ message: 'Network error', response: { data: {} } })
        .mockRejectedValueOnce({ message: 'Network error', response: { data: {} } })
        .mockResolvedValueOnce({ data: mockData });
      const result = await service.getUtlysningar();
      expect(result as jest.Matchers<any, any>).toEqual(mockData);
      expect(mockRequest).toHaveBeenCalledTimes(3);
    });

    it('retries on failure and throws after max retries', async () => {
      // Four failures (maxAttempts=4)
      mockRequest
        .mockRejectedValueOnce({ message: 'Network error', response: { data: {} } })
        .mockRejectedValueOnce({ message: 'Network error', response: { data: {} } })
        .mockRejectedValueOnce({ message: 'Network error', response: { data: {} } })
        .mockRejectedValueOnce({ message: 'Network error', response: { data: {} } });
      await expect(service.getUtlysningar()).rejects.toThrow('Network error');
      expect(mockRequest).toHaveBeenCalledTimes(4);
    });
  });

  describe('getAnsokningar', () => {
    it('returns applications on success', async () => {
      const mockData: any[] = [
        { id: 'a', callId: '1', applicant: 'X', status: 'pending' },
      ];
      // Only one call expected
      mockRequest.mockResolvedValueOnce({ data: mockData });
      const result = await service.getAnsokningar();
      expect(result as jest.Matchers<any, any>).toEqual(mockData);
      expect(mockRequest).toHaveBeenCalledWith({ url: '/applications', method: 'GET' });
    });

    it('retries and succeeds after 1 failure', async () => {
      const mockData: any[] = [
        { id: 'b', callId: '2', applicant: 'Y', status: 'approved' },
      ];
      // One failure, then a success (2 calls total)
      mockRequest
        .mockRejectedValueOnce({ message: 'Network error', response: { data: {} } })
        .mockResolvedValueOnce({ data: mockData });
      const result = await service.getAnsokningar();
      expect(result as jest.Matchers<any, any>).toEqual(mockData);
      expect(mockRequest).toHaveBeenCalledTimes(2);
    });

    it('handles empty response', async () => {
      // Only one call expected
      mockRequest.mockResolvedValueOnce({ data: [] });
      const result = await service.getAnsokningar();
      expect(result as jest.Matchers<any, any>).toEqual([]);
    });
  });

  describe('getFinansieradeAktiviteter', () => {
    it('returns activities on success', async () => {
      const mockData: any[] = [
        { id: 'x', name: 'Activity X' },
      ];
      // Only one call expected
      mockRequest.mockResolvedValueOnce({ data: mockData });
      const result = await service.getFinansieradeAktiviteter();
      expect(result as jest.Matchers<any, any>).toEqual(mockData);
      expect(mockRequest).toHaveBeenCalledWith({ url: '/activities', method: 'GET' });
    });

    it('retries and succeeds after 3 failures', async () => {
      const mockData: any[] = [
        { id: 'y', name: 'Activity Y' },
      ];
      // Three failures, then a success (4 calls total)
      mockRequest
        .mockRejectedValueOnce({ message: 'Network error', response: { data: {} } })
        .mockRejectedValueOnce({ message: 'Network error', response: { data: {} } })
        .mockRejectedValueOnce({ message: 'Network error', response: { data: {} } })
        .mockResolvedValueOnce({ data: mockData });
      const result = await service.getFinansieradeAktiviteter();
      expect(result as jest.Matchers<any, any>).toEqual(mockData);
      expect(mockRequest).toHaveBeenCalledTimes(4);
    });
  });

  // No getMetadata method in VinnovaService; skipping these tests
  // describe('getMetadata', () => {
  //   it('returns metadata on success', async () => {
  //     const mockData: any = { version: '1.0', info: 'meta' };
  //     mockRequest.mockResolvedValueOnce({ data: mockData });
  //     const result = await service.getMetadata();
  //     expect(result as jest.Matchers<any, any>).toEqual(mockData);
  //     expect(mockRequest).toHaveBeenCalledWith({ url: '/metadata', method: 'GET' });
  //   });

  //   it('throws on repeated network errors', async () => {
  //     mockRequest.mockRejectedValue(new Error('Timeout'));
  //     await expect(service.getMetadata()).rejects.toThrow('Timeout');
  //     expect(mockRequest).toHaveBeenCalledTimes(3);
  //   });
  // });
});

describe('normalizeGrant', () => {
  it('normalizes standard grant fields', () => {
    const input = {
      id: '123',
      title: 'Grant A',
      description: 'Desc',
      deadline: '2025-12-31',
      sector: 'Tech',
      stage: 'Open',
    };
    expect(normalizeGrant(input) as jest.Matchers<any, any>).toEqual({
      id: '123',
      title: 'Grant A',
      description: 'Desc',
      deadline: '2025-12-31',
      sector: 'Tech',
      stage: 'Open',
    });
  });

  it('normalizes alternate field names', () => {
    const input = {
      diarienummer: '456',
      titel: 'Grant B',
      beskrivning: 'Beskrivning',
      slutdatum: '2025-11-30',
      omrade: 'Health',
      stage: 'Closed',
    };
    expect(normalizeGrant(input) as jest.Matchers<any, any>).toEqual({
      id: '456',
      title: 'Grant B',
      description: 'Beskrivning',
      deadline: '2025-11-30',
      sector: 'Health',
      stage: 'Closed',
    });
  });

  it('returns null for missing id', () => {
    expect(normalizeGrant({ title: 'No ID' }) as jest.Matchers<any, any>).toBeNull();
  });

  it('returns null for malformed input', () => {
    expect(normalizeGrant(null) as jest.Matchers<any, any>).toBeNull();
    expect(normalizeGrant(undefined) as jest.Matchers<any, any>).toBeNull();
    expect(normalizeGrant('string') as jest.Matchers<any, any>).toBeNull();
  });

  it('coerces non-string fields to string', () => {
    const input = {
      id: 789,
      title: 123,
      description: 456,
      deadline: 20251231,
      sector: 789,
      stage: 0,
    };
    // id must be string, so this should be null
    expect(normalizeGrant(input) as jest.Matchers<any, any>).toBeNull();
    // But if id is string, others are coerced
    const input2 = { ...input, id: '789' };
    expect(normalizeGrant(input2) as jest.Matchers<any, any>).toEqual({
      id: '789',
      title: '123',
      description: '456',
      deadline: '2025-12-31',
      sector: '789',
      stage: '0',
    });
  });

  it('parses and formats deadline as ISO date', () => {
    const input = {
      id: '1',
      deadline: '2025/12/31',
    };
    expect(normalizeGrant(input) as jest.Matchers<any, any>).toEqual({
      id: '1',
      title: null,
      description: null,
      deadline: '2025-12-31',
      sector: null,
      stage: null,
    });
  });

  it('returns null for completely invalid grant', () => {
    expect(normalizeGrant({}) as jest.Matchers<any, any>).toBeNull();
  });
}); 