import { VinnovaService, normalizeGrant, NormalizedGrant } from './vinnova';
// Using the JS supabase client for now; consider migrating to a TS client for full type safety
import { supabase } from '../app/lib/supabase.js';

export interface SyncReport {
  inserted: number;
  updated: number;
  unchanged: number;
  failed: number;
  errors: Array<{ id?: string; error: string }>;
  total: number;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
}

export async function syncVinnovaGrants() : Promise<SyncReport> {
  const report: SyncReport = {
    inserted: 0,
    updated: 0,
    unchanged: 0,
    failed: 0,
    errors: [],
    total: 0,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    durationMs: null,
  };
  try {
    const vinnova = new VinnovaService();
    const rawGrants = await vinnova.getCalls();
    // Debug: print raw grants before normalization
    // eslint-disable-next-line no-console
    console.log('Raw grants:', rawGrants);
    const grants: NormalizedGrant[] = rawGrants.map(normalizeGrant).filter((g): g is NormalizedGrant => !!g && !!g.id);
    // Debug: print normalized grants after filtering
    // eslint-disable-next-line no-console
    console.log('Normalized grants:', grants);
    report.total = grants.length;
    for (const grant of grants) {
      try {
        // Debug: print the grant being processed
        // eslint-disable-next-line no-console
        console.log('Processing grant:', grant);
        // Check if grant already exists and if data has changed
        const { data: existing, error: fetchError } = await supabase
          .from('grants')
          .select('*')
          .eq('id', grant.id)
          .single();
        // Debug: print fetch result
        // eslint-disable-next-line no-console
        console.log('Fetch result for id', grant.id, ':', { existing, fetchError });
        if (fetchError && fetchError.code !== 'PGRST116') {
          throw fetchError;
        }
        if (existing) {
          const changed =
            existing.title !== grant.title ||
            existing.description !== grant.description ||
            existing.deadline !== grant.deadline ||
            existing.sector !== grant.sector ||
            existing.stage !== grant.stage;
          if (!changed) {
            // Debug: log when a grant is unchanged
            // eslint-disable-next-line no-console
            console.log('Grant unchanged:', grant.id);
            report.unchanged++;
            continue;
          }
        }
        // Only upsert if new or changed
        const upsertResult = await supabase
          .from('grants')
          .upsert(grant, { onConflict: 'id' });
        // Debug: print upsert result
        // eslint-disable-next-line no-console
        console.log('Upsert result for id', grant.id, ':', upsertResult);
        const { error: upsertError } = upsertResult;
        if (upsertError) {
          report.failed++;
          report.errors.push({ id: grant.id, error: upsertError.message });
        } else if (existing) {
          report.updated++;
        } else {
          report.inserted++;
        }
      } catch (err: any) {
        report.failed++;
        report.errors.push({ id: grant.id, error: err.message || String(err) });
      }
    }
  } catch (err: any) {
    report.failed = report.total;
    report.errors.push({ error: err.message || String(err) });
  }
  report.finishedAt = new Date().toISOString();
  report.durationMs = new Date(report.finishedAt).getTime() - new Date(report.startedAt).getTime();
  // eslint-disable-next-line no-console
  console.log('Vinnova grants sync report:', report);
  return report;
} 