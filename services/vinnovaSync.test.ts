/// <reference types="jest" />
// @jest-environment node
import { syncVinnovaGrants, SyncReport } from './vinnovaSync';
import { VinnovaService, NormalizedGrant } from './vinnova';
import * as vinnovaSyncModule from './vinnovaSync';

// Only mock VinnovaService, not the whole module
jest.mock('./vinnova', () => {
  const actual = jest.requireActual('./vinnova');
  return {
    ...actual,
    VinnovaService: jest.fn(),
  };
});
const MockedVinnovaService = VinnovaService as jest.MockedClass<typeof VinnovaService>;

// Mock resolveConflictAndUpsert at the module level
jest.mock('./vinnovaSync', () => {
  const actual = jest.requireActual('./vinnovaSync');
  return {
    ...actual,
    resolveConflictAndUpsert: jest.fn().mockResolvedValue(undefined),
  };
});

// Helper to create a fresh supabase mock for each test
function createSupabaseMock() {
  const single = jest.fn();
  const upsert = jest.fn();
  return {
    single,
    upsert,
  };
}

let supabase: any;

jest.mock('../app/lib/supabase.js', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  const mock = createSupabaseMock();
  supabase = require('../app/lib/supabase.js').supabase;
  supabase._mock = mock; // for access in tests
  // Reset VinnovaService mock
  MockedVinnovaService.mockClear();
  // Reset the mock implementation for resolveConflictAndUpsert
  (vinnovaSyncModule.resolveConflictAndUpsert as jest.Mock).mockImplementation(async (table, record) => {
    // Default: do nothing (simulate success)
    return;
  });
});

describe('syncVinnovaGrants', () => {
  it('inserts new grants', async () => {
    MockedVinnovaService.prototype.getUtlysningar = jest.fn().mockResolvedValue([
      { id: '1', title: 'A' },
      { id: '2', title: 'B' },
    ]);
    supabase._mock.single
      .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
      .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });
    supabase._mock.upsert
      .mockResolvedValueOnce({ data: {}, error: null })
      .mockResolvedValueOnce({ data: {}, error: null });
    const report: SyncReport = await syncVinnovaGrants();
    expect(report.inserted).toBe(2);
    expect(report.updated).toBe(0);
    expect(report.unchanged).toBe(0);
    expect(report.failed).toBe(0);
  });

  it('updates changed grants and leaves unchanged grants', async () => {
    MockedVinnovaService.prototype.getUtlysningar = jest.fn().mockResolvedValue([
      { id: '1', title: 'A' },
      { id: '2', title: 'B' },
    ]);
    supabase._mock.single
      .mockResolvedValueOnce({ data: { id: '1', title: 'Old', description: null, deadline: null, sector: null, stage: null }, error: null })
      .mockResolvedValueOnce({ data: { id: '2', title: 'B', description: null, deadline: null, sector: null, stage: null }, error: null });
    supabase._mock.upsert
      .mockResolvedValueOnce({ data: {}, error: null });
    const report: SyncReport = await syncVinnovaGrants();
    expect(report.inserted).toBe(0);
    expect(report.updated).toBe(1);
    expect(report.unchanged).toBe(1);
    expect(report.failed).toBe(0);
  });

  it('handles upsert errors', async () => {
    MockedVinnovaService.prototype.getUtlysningar = jest.fn().mockResolvedValue([{ id: '1', title: 'A' }]);
    supabase._mock.single.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });
    supabase._mock.upsert.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } });
    const report: SyncReport = await syncVinnovaGrants();
    expect(report.failed).toBe(1);
    expect(report.errors[0].error).toMatch(/DB error/);
  });

  it('handles fetch errors', async () => {
    MockedVinnovaService.prototype.getUtlysningar = jest.fn().mockRejectedValue(new Error('API fail'));
    const report: SyncReport = await syncVinnovaGrants();
    expect(report.failed).toBe(report.total);
    expect(report.errors[0].error).toMatch(/API fail/);
  });

  it('is idempotent (unchanged grants are not updated)', async () => {
    MockedVinnovaService.prototype.getUtlysningar = jest.fn().mockResolvedValue([{ id: '1', title: 'A' }]);
    supabase._mock.single.mockResolvedValueOnce({ data: { id: '1', title: 'A', description: null, deadline: null, sector: null, stage: null }, error: null });
    const report: SyncReport = await syncVinnovaGrants();
    expect(report.unchanged).toBe(1);
    expect(report.updated).toBe(0);
    expect(report.inserted).toBe(0);
  });

  it('handles malformed grants and missing fields', async () => {
    MockedVinnovaService.prototype.getUtlysningar = jest.fn().mockResolvedValue([{ foo: 'bar' }, null, { id: '2' }]);
    supabase._mock.single.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });
    supabase._mock.upsert.mockResolvedValueOnce({ data: {}, error: null });
    const report: SyncReport = await syncVinnovaGrants();
    expect(report.inserted).toBe(1);
    expect(report.failed).toBe(0);
    expect(report.errors.length).toBe(0);
  });
}); 