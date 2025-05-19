import { fetchVinnovaGrants } from './vinnovaClient';

// Mock global fetch
beforeEach(() => {
  global.fetch = jest.fn();
});
afterEach(() => {
  jest.resetAllMocks();
});

describe('fetchVinnovaGrants', () => {
  it('normalizes Vinnova API data correctly', async () => {
    const mockData = [
      {
        id: '123',
        title: 'Grant A',
        description: 'Desc',
        deadline: '2025-12-31',
        sector: 'Tech',
        stage: 'Open',
      },
      {
        diarienummer: '456',
        titel: 'Grant B',
        beskrivning: 'Beskrivning',
        slutdatum: '2025-11-30',
        omrade: 'Health',
        stage: 'Closed',
      },
    ];
    global.fetch.mockResolvedValue({ ok: true, json: async () => mockData });
    process.env.VINNOVA_CALLS_ENDPOINT = 'https://api.vinnova.se/grants';
    const grants = await fetchVinnovaGrants();
    expect(grants).toEqual([
      {
        id: '123',
        title: 'Grant A',
        description: 'Desc',
        deadline: '2025-12-31',
        sector: 'Tech',
        stage: 'Open',
      },
      {
        id: '456',
        title: 'Grant B',
        description: 'Beskrivning',
        deadline: '2025-11-30',
        sector: 'Health',
        stage: 'Closed',
      },
    ]);
  });

  it('handles empty API response', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => [] });
    process.env.VINNOVA_CALLS_ENDPOINT = 'https://api.vinnova.se/grants';
    const grants = await fetchVinnovaGrants();
    expect(grants).toEqual([]);
  });

  it('throws on API error', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 500, statusText: 'Internal Server Error' });
    process.env.VINNOVA_CALLS_ENDPOINT = 'https://api.vinnova.se/grants';
    await expect(fetchVinnovaGrants()).rejects.toThrow('Vinnova API error: 500 Internal Server Error');
  });

  it('throws if endpoint is not set', async () => {
    delete process.env.VINNOVA_CALLS_ENDPOINT;
    await expect(fetchVinnovaGrants()).rejects.toThrow('VINNOVA_CALLS_ENDPOINT is not set');
  });

  it('handles API response with a results array', async () => {
    const mockData = { results: [ { id: '789', title: 'Grant C' } ] };
    global.fetch.mockResolvedValue({ ok: true, json: async () => mockData });
    process.env.VINNOVA_CALLS_ENDPOINT = 'https://api.vinnova.se/grants';
    const grants = await fetchVinnovaGrants();
    expect(grants).toEqual([
      expect.objectContaining({ id: '789', title: 'Grant C' })
    ]);
  });

  it('handles grants with missing fields', async () => {
    const mockData = [ { id: '1' }, { titel: 'No ID' } ];
    global.fetch.mockResolvedValue({ ok: true, json: async () => mockData });
    process.env.VINNOVA_CALLS_ENDPOINT = 'https://api.vinnova.se/grants';
    const grants = await fetchVinnovaGrants();
    expect(grants).toEqual([
      expect.objectContaining({ id: '1' })
    ]);
  });

  it('filters out grants without id', async () => {
    const mockData = [ { titel: 'No ID' }, { id: '2', title: 'With ID' } ];
    global.fetch.mockResolvedValue({ ok: true, json: async () => mockData });
    process.env.VINNOVA_CALLS_ENDPOINT = 'https://api.vinnova.se/grants';
    const grants = await fetchVinnovaGrants();
    expect(grants).toEqual([
      expect.objectContaining({ id: '2', title: 'With ID' })
    ]);
  });

  it('handles API returning null or undefined', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => null });
    process.env.VINNOVA_CALLS_ENDPOINT = 'https://api.vinnova.se/grants';
    const grants = await fetchVinnovaGrants();
    expect(grants).toEqual([]);
  });

  it('handles a mix of valid and invalid grants', async () => {
    const mockData = [ { id: '3', title: 'Valid' }, { foo: 'bar' }, null ];
    global.fetch.mockResolvedValue({ ok: true, json: async () => mockData });
    process.env.VINNOVA_CALLS_ENDPOINT = 'https://api.vinnova.se/grants';
    const grants = await fetchVinnovaGrants();
    expect(grants).toEqual([
      expect.objectContaining({ id: '3', title: 'Valid' })
    ]);
  });
}); 