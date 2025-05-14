// Polyfill Response for Jest (Node environment)
if (typeof Response === 'undefined') {
  global.Response = require('node-fetch').Response;
}

import { GET } from './route';

// Mock fetch and Supabase
const mockUpsert = jest.fn();
jest.mock('@/app/lib/supabase', () => ({
  supabase: { from: () => ({ upsert: mockUpsert }) }
}));

global.fetch = jest.fn();

describe('GET /api/grants/sync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch grants from Vinnova, upsert them, and return success', async () => {
    // Mock Vinnova API response
    const vinnovaData = [
      { id: '1', title: 'Grant 1', description: 'Desc 1', deadline: '2024-12-31', sector: 'Tech', stage: 'Seed' },
      { diarienummer: '2', titel: 'Grant 2', beskrivning: 'Desc 2', slutdatum: '2025-01-15', omrade: 'Health', stage: 'Growth' }
    ];
    fetch.mockResolvedValueOnce({
      json: () => Promise.resolve(vinnovaData)
    });
    mockUpsert.mockResolvedValue({});

    const response = await GET();
    expect(fetch).toHaveBeenCalled();
    expect(mockUpsert).toHaveBeenCalledTimes(2);
    expect(response.status).toBe(200);
    const body = JSON.parse(await response.text());
    expect(body.success).toBe(true);
    expect(body.count).toBe(2);
  });

  it('should handle empty results gracefully', async () => {
    fetch.mockResolvedValueOnce({ json: () => Promise.resolve([]) });
    mockUpsert.mockResolvedValue({});
    const response = await GET();
    expect(mockUpsert).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    const body = JSON.parse(await response.text());
    expect(body.success).toBe(true);
    expect(body.count).toBe(0);
  });

  it('should skip grants without id', async () => {
    const vinnovaData = [{ title: 'No ID' }];
    fetch.mockResolvedValueOnce({ json: () => Promise.resolve(vinnovaData) });
    mockUpsert.mockResolvedValue({});
    const response = await GET();
    expect(mockUpsert).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    const body = JSON.parse(await response.text());
    expect(body.success).toBe(true);
    expect(body.count).toBe(1); // Still counted, but not upserted
  });
}); 