import 'dotenv/config';

import { supabase } from '../app/lib/supabase.js';
import { resolveConflictAndUpsert } from './vinnovaSync';

describe('resolveConflictAndUpsert edge cases', function () {
  let selectStub, upsertStub;

  beforeEach(() => {
      select: () => ({
        eq: (field, value) => ({ single: selectStub })
      }) as any,
      upsert: upsertStub,
      url: '' as any,
      headers: {} as any,
      insert: () => ({} as any),
      update: () => ({} as any),
      delete: () => ({} as any)
    }));
  });

  afterEach(() => {
  });

  it('should upsert remote when remote is newer', async () => {
    selectStub.resolves({ data: { id: '1', updated_at: '2024-06-01T12:00:00Z' }, error: null });
    const remote = { id: '1', updated_at: '2024-07-01T12:00:00Z' };
    await resolveConflictAndUpsert('grants', remote);
    expect(upsertStub.calledWith(remote)).to.be.true;
  });

  it('should upsert local when local is newer', async () => {
    selectStub.resolves({ data: { id: '2', updated_at: '2024-08-01T12:00:00Z' }, error: null });
    const remote = { id: '2', updated_at: '2024-07-01T12:00:00Z' };
    await resolveConflictAndUpsert('grants', remote);
  });

  it('should upsert remote when timestamps are equal', async () => {
    selectStub.resolves({ data: { id: '3', updated_at: '2024-07-01T12:00:00Z' }, error: null });
    const remote = { id: '3', updated_at: '2024-07-01T12:00:00Z' };
    await resolveConflictAndUpsert('grants', remote);
    expect(upsertStub.calledWith(remote)).to.be.true;
  });

  it('should upsert local when only local has valid updated_at', async () => {
    selectStub.resolves({ data: { id: '4', updated_at: '2024-07-01T12:00:00Z' }, error: null });
    const remote = { id: '4', updated_at: null };
    await resolveConflictAndUpsert('grants', remote);
  });

  it('should upsert remote when only remote has valid updated_at', async () => {
    selectStub.resolves({ data: { id: '5', updated_at: null }, error: null });
    const remote = { id: '5', updated_at: '2024-07-01T12:00:00Z' };
    await resolveConflictAndUpsert('grants', remote);
    expect(upsertStub.calledWith(remote)).to.be.true;
  });

  it('should upsert remote when both missing/invalid updated_at', async () => {
    selectStub.resolves({ data: { id: '6', updated_at: null }, error: null });
    const remote = { id: '6', updated_at: null };
    await resolveConflictAndUpsert('grants', remote);
    expect(upsertStub.calledWith(remote)).to.be.true;
  });
}); 