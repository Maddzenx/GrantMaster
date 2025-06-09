import { supabase } from '../app/lib/supabase.js';

/**
 * Get the last synced timestamp for an entity from the sync_state table.
 * Returns a Date object or null if not found.
 */
export async function getLastSyncedAt(entity: string): Promise<Date | null> {
  const { data, error } = await supabase
    .from('sync_state')
    .select('last_synced_at')
    .eq('entity', entity)
    .single();
  if (error) {
    if (error.code !== 'PGRST116') { // Not found is not an error
      console.error(`Error fetching last synced at for ${entity}:`, error);
    }
    return null;
  }
  if (!data || !data.last_synced_at) return null;
  return new Date(data.last_synced_at);
}

/**
 * Set the last synced timestamp for an entity in the sync_state table.
 * Upserts the value (inserts or updates as needed).
 */
export async function setLastSyncedAt(entity: string, date: Date): Promise<void> {
  const { error } = await supabase
    .from('sync_state')
    .upsert([{ entity, last_synced_at: date.toISOString() }], { onConflict: 'entity' });
  if (error) {
    console.error(`Error setting last synced at for ${entity}:`, error);
  }
} 