import { VinnovaService, normalizeGrant } from './vinnova';
import { normalizeApplication } from './normalization/normalizeApplication';
import { normalizeActivity } from './normalization/normalizeActivity';
import { validateGrant } from './normalization/validateGrant';
import { validateApplication } from './normalization/validateApplication';
import { validateActivity } from './normalization/validateActivity';
import { supabase } from '../app/lib/supabase.js';

export interface SyncReport {
  entity: string;
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

// Helpers for incremental sync state
type SyncState = { entity: string; last_synced_at: string };

async function getLastSyncTime(entity: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('sync_state')
    .select('last_synced_at')
    .eq('entity', entity)
    .single();
  return data?.last_synced_at || null;
}

async function setLastSyncTime(entity: string, timestamp: string) {
  await supabase
    .from('sync_state')
    .upsert({ entity, last_synced_at: timestamp }, { onConflict: 'entity' });
}

export async function resolveConflictAndUpsert(table: string, record: any) {
  // Assume 'id' is the unique key and 'updated_at' is the timestamp field
  const { data: existing, error: fetchError } = await supabase
    .from(table)
    .select('*')
    .eq('id', record.id)
    .single();
  if (fetchError && fetchError.code !== 'PGRST116') {
    console.error(`Error fetching existing record for conflict resolution in ${table}:`, fetchError);
  }
  let toUpsert = record;
  // Edge case handling for missing or invalid updated_at
  const existingHasTimestamp = existing && existing.updated_at && !isNaN(new Date(existing.updated_at).getTime());
  const incomingHasTimestamp = record.updated_at && !isNaN(new Date(record.updated_at).getTime());
  if (existingHasTimestamp && incomingHasTimestamp) {
    const existingTime = new Date(existing.updated_at).getTime();
    const incomingTime = new Date(record.updated_at).getTime();
    if (existingTime > incomingTime) {
      toUpsert = existing; // Last write wins: keep existing
      console.log(`Conflict in ${table} for id=${record.id}: keeping existing record (last write wins)`);
    } else if (incomingTime > existingTime) {
      toUpsert = record; // Last write wins: use incoming
      console.log(`Conflict in ${table} for id=${record.id}: using incoming record (last write wins)`);
    } else {
      // Timestamps equal, can log or choose a default
      toUpsert = record;
      console.log(`Conflict in ${table} for id=${record.id}: timestamps equal, using incoming record`);
    }
  } else if (existingHasTimestamp && !incomingHasTimestamp) {
    // Prefer existing if only it has a timestamp
    toUpsert = existing;
    console.warn(`Conflict in ${table} for id=${record.id}: incoming record missing updated_at, keeping existing.`);
  } else if (!existingHasTimestamp && incomingHasTimestamp) {
    // Prefer incoming if only it has a timestamp
    toUpsert = record;
    console.warn(`Conflict in ${table} for id=${record.id}: existing record missing updated_at, using incoming.`);
  } else {
    // Both missing or invalid: prefer incoming, but log
    toUpsert = record;
    console.warn(`Conflict in ${table} for id=${record.id}: both records missing or invalid updated_at, using incoming.`);
  }
  const { error: upsertError } = await supabase.from(table).upsert(toUpsert);
  if (upsertError) {
    console.error(`Error upserting record in ${table}:`, upsertError);
  }
}

/**
 * Send an alert to Slack via webhook for critical sync failures.
 * Requires SLACK_WEBHOOK_URL in environment variables.
 */
async function sendAlert(message: string) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error('SLACK_WEBHOOK_URL not set. Cannot send alert.');
    return;
  }
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message }),
    });
    console.log('Sent alert to Slack.');
  } catch (err) {
    console.error('Failed to send alert to Slack:', err);
  }
}

/**
 * Log a failed sync attempt to the sync_failures table for reconciliation.
 */
async function logSyncFailure(entity: string, recordId: string, error: string, record: any) {
  const { error: insertError } = await supabase.from('sync_failures').insert([
    {
      entity,
      record_id: recordId,
      error,
      record,
      failed_at: new Date().toISOString(),
      resolved: false,
    }
  ]);
  if (insertError) {
    console.error(`Error logging sync failure for ${entity} record ${recordId}:`, insertError);
  } else {
    console.log(`Logged sync failure for ${entity} record ${recordId}`);
  }
}

/**
 * Retry unresolved sync failures for a given entity.
 */
export async function retryFailedSyncs(entity: string) {
  const { data: failures, error } = await supabase
    .from('sync_failures')
    .select('*')
    .eq('entity', entity)
    .eq('resolved', false);
  if (error) {
    console.error(`Error fetching sync failures for retry (${entity}):`, error);
    return;
  }
  if (!failures || failures.length === 0) {
    console.log(`No unresolved sync failures found for ${entity}.`);
    return;
  }
  for (const failure of failures) {
    try {
      await resolveConflictAndUpsert(entity, failure.record);
      const { error: updateError } = await supabase
        .from('sync_failures')
        .update({ resolved: true })
        .eq('id', failure.id);
      if (updateError) {
        console.error(`Error marking sync failure as resolved (id=${failure.id}):`, updateError);
      } else {
        console.log(`Retried and resolved sync failure for record ${failure.record_id} (id=${failure.id})`);
      }
    } catch (err) {
      console.error(`Retry failed for record ${failure.record_id} (id=${failure.id}):`, err);
    }
  }
}

// Batch size for parallel upserts during sync
const BATCH_SIZE = 10;

/**
 * Update sync progress for an entity in the sync_progress table.
 * Table must have: entity (text, PK), processed (int), total (int), percent (int), updated_at (timestamp)
 */
async function updateProgress(entity: string, processed: number, total: number, percent: number) {
  const { error } = await supabase.from('sync_progress').upsert([
    { entity, processed, total, percent, updated_at: new Date().toISOString() }
  ], { onConflict: 'entity' });
  if (error) {
    console.error(`Error updating progress for ${entity}:`, error);
  }
}

/**
 * Syncs an entity with incremental, parallel, and progress tracking support.
 * @param progressCallback Optional callback to report progress (processed, total, percent)
 */
async function syncEntity<T>(
  entityName: string,
  fetchFn: (since?: string) => Promise<any[]>,
  normalizeFn: (input: any) => T | null,
  validateFn: (input: T) => boolean,
  tableName: string,
  uniqueId: keyof T,
  progressCallback?: (processed: number, total: number, percent: number) => void
): Promise<SyncReport> {
  const report: SyncReport = {
    entity: entityName,
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
    const lastSync = await getLastSyncTime(entityName);
    const rawData = await fetchFn(lastSync || undefined);
    const normalized = rawData.map(normalizeFn).filter((x): x is T => !!x && !!x[uniqueId]);
    report.total = normalized.length;
    for (let i = 0; i < normalized.length; i += BATCH_SIZE) {
      const batch = normalized.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (record, idx) => {
        if (!validateFn(record)) {
          report.failed++;
          report.errors.push({ id: String(record[uniqueId]), error: 'Validation failed' });
          await logSyncFailure(entityName, String(record[uniqueId]), 'Validation failed', record);
          return;
        }
        try {
          await resolveConflictAndUpsert(tableName, record);
        } catch (err: any) {
          report.failed++;
          report.errors.push({ id: String(record[uniqueId]), error: err.message || String(err) });
          await logSyncFailure(entityName, String(record[uniqueId]), err.message || String(err), record);
        }
      }));
      const processed = Math.min(i + BATCH_SIZE, normalized.length);
      const percent = normalized.length > 0 ? Math.round((processed / normalized.length) * 100) : 100;
      console.log(`Progress for ${entityName}: ${processed}/${normalized.length} (${percent}%)`);
      if (progressCallback) progressCallback(processed, normalized.length, percent);
    }
    // After successful sync, update last sync time
    await setLastSyncTime(entityName, new Date().toISOString());
  } catch (err: any) {
    report.failed = report.total;
    report.errors.push({ error: err.message || String(err) });
    // Alert on critical failure
    await sendAlert(`Critical failure in ${entityName} sync: ${err.message || String(err)}`);
  }
  // Alert if all records failed
  if (report.failed === report.total && report.total > 0) {
    await sendAlert(`All records failed to sync for ${entityName}. See errors: ${JSON.stringify(report.errors)}`);
  }
  report.finishedAt = new Date().toISOString();
  report.durationMs = new Date(report.finishedAt).getTime() - new Date(report.startedAt).getTime();
  console.log(`${entityName} sync report:`, report);
  return report;
}

// Example usage for each entity with incremental sync:
export async function syncVinnovaGrants() {
  const vinnova = new VinnovaService();
  return syncEntity(
    'grants',
    (since) => vinnova.getUtlysningar(since ? { updated_after: since } : {}),
    normalizeGrant,
    validateGrant,
    'grants',
    'id',
    (processed, total, percent) => updateProgress('grants', processed, total, percent)
  );
}

export async function syncVinnovaApplications() {
  const vinnova = new VinnovaService();
  return syncEntity(
    'applications',
    (since) => vinnova.getAnsokningar(since ? { updated_after: since } : {}),
    normalizeApplication,
    validateApplication,
    'applications',
    'id',
    (processed, total, percent) => updateProgress('applications', processed, total, percent)
  );
}

export async function syncVinnovaActivities() {
  const vinnova = new VinnovaService();
  return syncEntity(
    'activities',
    (since) => vinnova.getFinansieradeAktiviteter(since ? { updated_after: since } : {}),
    normalizeActivity,
    validateActivity,
    'activities',
    'id',
    (processed, total, percent) => updateProgress('activities', processed, total, percent)
  );
}

// Optionally, a master sync function:
export async function syncAllVinnovaEntities() {
  const results = await Promise.all([
    syncVinnovaGrants(),
    syncVinnovaApplications(),
    syncVinnovaActivities(),
  ]);
  return results;
} 