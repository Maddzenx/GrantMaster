import { syncVinnovaGrants } from './vinnovaSync';

jest.mock('./vinnovaClient', () => ({
  fetchVinnovaGrants: jest.fn(),
}));

// Helper to create a fresh supabase mock for each test
function createSupabaseMock() {
  const single = jest.fn();
  const upsert = jest.fn();
  const chain = {
    select: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    single,
    upsert,
  };
  return { chain, single, upsert };
}

const { fetchVinnovaGrants } = require('./vinnovaClient');
let supabase;

jest.mock('./supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  const mock = createSupabaseMock();
  supabase = require('./supabase').supabase;
  supabase.from.mockImplementation(() => mock.chain);
  supabase._mock = mock; // for access in tests
});

describe('syncVinnovaGrants', () => {
  it('inserts new grants', async () => {
    fetchVinnovaGrants.mockResolvedValue([
      { id: '1', title: 'A' },
      { id: '2', title: 'B' },
    ]);
    supabase._mock.single
      .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
      .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });
    supabase._mock.upsert
      .mockResolvedValueOnce({ data: {}, error: null })
      .mockResolvedValueOnce({ data: {}, error: null });
    const report = await syncVinnovaGrants();
    expect(report.inserted).toBe(2);
    expect(report.updated).toBe(0);
    expect(report.unchanged).toBe(0);
    expect(report.failed).toBe(0);
  });

  it('updates changed grants and leaves unchanged grants', async () => {
    fetchVinnovaGrants.mockResolvedValue([
      { id: '1', title: 'A' },
      { id: '2', title: 'B' },
    ]);
    supabase._mock.single
      .mockResolvedValueOnce({ data: { id: '1', title: 'Old' }, error: null })
      .mockResolvedValueOnce({ data: { id: '2', title: 'B' }, error: null });
    supabase._mock.upsert
      .mockResolvedValueOnce({ data: {}, error: null });
    const report = await syncVinnovaGrants();
    expect(report.inserted).toBe(0);
    expect(report.updated).toBe(1);
    expect(report.unchanged).toBe(1);
    expect(report.failed).toBe(0);
  });

  it('handles upsert errors', async () => {
    fetchVinnovaGrants.mockResolvedValue([{ id: '1', title: 'A' }]);
    supabase._mock.single.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });
    supabase._mock.upsert.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } });
    const report = await syncVinnovaGrants();
    expect(report.failed).toBe(1);
    expect(report.errors[0].error).toMatch(/DB error/);
  });

  it('handles fetch errors', async () => {
    fetchVinnovaGrants.mockRejectedValue(new Error('API fail'));
    const report = await syncVinnovaGrants();
    expect(report.failed).toBe(report.total);
    expect(report.errors[0].error).toMatch(/API fail/);
  });

  it('is idempotent (unchanged grants are not updated)', async () => {
    fetchVinnovaGrants.mockResolvedValue([{ id: '1', title: 'A' }]);
    supabase._mock.single.mockResolvedValueOnce({ data: { id: '1', title: 'A' }, error: null });
    const report = await syncVinnovaGrants();
    expect(report.unchanged).toBe(1);
    expect(report.updated).toBe(0);
    expect(report.inserted).toBe(0);
  });

  it('handles malformed grants and missing fields', async () => {
    fetchVinnovaGrants.mockResolvedValue([{ foo: 'bar' }, null, { id: '2' }]);
    supabase._mock.single.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });
    supabase._mock.upsert.mockResolvedValueOnce({ data: {}, error: null });
    const report = await syncVinnovaGrants();
    expect(report.inserted).toBe(1);
    expect(report.failed).toBe(2);
    expect(report.errors.length).toBe(2);
  });
}); 