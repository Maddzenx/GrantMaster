import { fetchVinnovaGrants } from './vinnovaClient';
import { supabase } from './supabase';

/**
 * Syncs Vinnova grants to the Supabase database.
 * - Upserts each grant (insert if new, update if changed)
 * - Logs operation results
 * - Returns a sync report
 */
export async function syncVinnovaGrants() {
  const report = {
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
    const grants = await fetchVinnovaGrants();
    report.total = grants.length;
    for (const grant of grants) {
      // Skip malformed grants before DB ops
      if (!grant || typeof grant !== 'object' || !grant.id || typeof grant.id !== 'string') {
        report.failed++;
        report.errors.push({ id: grant && grant.id, error: 'Malformed or missing id in grant' });
        continue;
      }
      try {
        // Check if grant already exists and if data has changed
        const { data: existing, error: fetchError } = await supabase
          .from('grants')
          .select('*')
          .eq('id', grant.id)
          .single();
        if (fetchError && fetchError.code !== 'PGRST116') {
          // Not found is not an error, but other errors are
          throw fetchError;
        }
        if (existing) {
          // Compare all fields for changes
          const changed =
            existing.title !== grant.title ||
            existing.description !== grant.description ||
            existing.deadline !== grant.deadline ||
            existing.sector !== grant.sector ||
            existing.stage !== grant.stage;
          if (!changed) {
            report.unchanged++;
            continue;
          }
        }
        // Upsert (insert or update)
        const { error: upsertError } = await supabase
          .from('grants')
          .upsert(grant, { onConflict: 'id' });
        if (upsertError) {
          report.failed++;
          report.errors.push({ id: grant.id, error: upsertError.message });
        } else if (existing) {
          report.updated++;
        } else {
          report.inserted++;
        }
      } catch (err) {
        report.failed++;
        report.errors.push({ id: grant.id, error: err.message || String(err) });
      }
    }
  } catch (err) {
    report.failed = report.total;
    report.errors.push({ global: true, error: err.message || String(err) });
  }
  report.finishedAt = new Date().toISOString();
  report.durationMs = new Date(report.finishedAt) - new Date(report.startedAt);
  console.log('Vinnova grants sync report:', report);
  return report;
} 