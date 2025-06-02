import { VinnovaService, VinnovaCall, VinnovaApplication, VinnovaActivity, VinnovaMetadata, normalizeGrant, NormalizedGrant } from './vinnova';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('VinnovaService', () => {
  let service: VinnovaService;
  let mockRequest: jest.Mock;
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = jest.fn();
    mockClient = { request: mockRequest };
    mockedAxios.create.mockReturnValue(mockClient);
    service = new VinnovaService('test-api-key', 'https://api.vinnova.se/gdp/v1');
  });

  describe('getCalls', () => {
    it('returns calls on success', async () => {
      const mockData: VinnovaCall[] = [
        { id: '1', title: 'Call 1' },
        { id: '2', title: 'Call 2' },
      ];
      mockRequest.mockResolvedValueOnce({ data: mockData });
      const result = await service.getCalls();
      expect(result).toEqual(mockData);
      expect(mockRequest).toHaveBeenCalledWith({ url: '/calls', method: 'GET' });
    });

    it('retries on failure and throws after max retries', async () => {
      mockRequest.mockRejectedValue(new Error('Network error'));
      await expect(service.getCalls()).rejects.toThrow('Network error');
      expect(mockRequest).toHaveBeenCalledTimes(3);
    });
  });

  describe('getApplications', () => {
    it('returns applications on success', async () => {
      const mockData: VinnovaApplication[] = [
        { id: 'a', callId: '1', applicant: 'X', status: 'pending' },
      ];
      mockRequest.mockResolvedValueOnce({ data: mockData });
      const result = await service.getApplications();
      expect(result).toEqual(mockData);
      expect(mockRequest).toHaveBeenCalledWith({ url: '/applications', method: 'GET' });
    });

    it('handles empty response', async () => {
      mockRequest.mockResolvedValueOnce({ data: [] });
      const result = await service.getApplications();
      expect(result).toEqual([]);
    });
  });

  describe('getActivities', () => {
    it('returns activities on success', async () => {
      const mockData: VinnovaActivity[] = [
        { id: 'x', name: 'Activity X' },
      ];
      mockRequest.mockResolvedValueOnce({ data: mockData });
      const result = await service.getActivities();
      expect(result).toEqual(mockData);
      expect(mockRequest).toHaveBeenCalledWith({ url: '/activities', method: 'GET' });
    });
  });

  describe('getMetadata', () => {
    it('returns metadata on success', async () => {
      const mockData: VinnovaMetadata = { version: '1.0', info: 'meta' };
      mockRequest.mockResolvedValueOnce({ data: mockData });
      const result = await service.getMetadata();
      expect(result).toEqual(mockData);
      expect(mockRequest).toHaveBeenCalledWith({ url: '/metadata', method: 'GET' });
    });

    it('throws on repeated network errors', async () => {
      mockRequest.mockRejectedValue(new Error('Timeout'));
      await expect(service.getMetadata()).rejects.toThrow('Timeout');
      expect(mockRequest).toHaveBeenCalledTimes(3);
    });
  });
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
    expect(normalizeGrant(input)).toEqual({
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
    expect(normalizeGrant(input)).toEqual({
      id: '456',
      title: 'Grant B',
      description: 'Beskrivning',
      deadline: '2025-11-30',
      sector: 'Health',
      stage: 'Closed',
    });
  });

  it('returns null for missing id', () => {
    expect(normalizeGrant({ title: 'No ID' })).toBeNull();
  });

  it('returns null for malformed input', () => {
    expect(normalizeGrant(null)).toBeNull();
    expect(normalizeGrant(undefined)).toBeNull();
    expect(normalizeGrant('string')).toBeNull();
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
    expect(normalizeGrant(input)).toBeNull();
    // But if id is string, others are coerced
    const input2 = { ...input, id: '789' };
    expect(normalizeGrant(input2)).toEqual({
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
    expect(normalizeGrant(input)).toEqual({
      id: '1',
      title: null,
      description: null,
      deadline: '2025-12-31',
      sector: null,
      stage: null,
    });
  });

  it('returns null for completely invalid grant', () => {
    expect(normalizeGrant({})).toBeNull();
  });
}); 