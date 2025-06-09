import cron from 'node-cron';
import { syncAllVinnovaEntities } from '../services/vinnovaSync';
import { supabase } from '../app/lib/supabase.js';

const schedule = process.env.SYNC_CRON_SCHEDULE || '0 * * * *'; // Default: hourly

// Locking helpers
async function acquireLock(job: string, ttlMinutes = 30): Promise<boolean> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMinutes * 60000).toISOString();
  const { data, error } = await supabase
    .from('sync_locks')
    .upsert([{ job, expires_at: expiresAt }], { onConflict: 'job' })
    .select();
  if (error) {
    console.error('Error acquiring lock:', error);
    return false;
  }
  // Check if lock is expired or just acquired
  if (!data || !data[0] || new Date(data[0].expires_at) < now) {
    return true;
  }
  return false;
}

async function releaseLock(job: string) {
  await supabase.from('sync_locks').delete().eq('job', job);
}

async function runSyncJob() {
  const jobName = 'vinnova-sync';
  const lockAcquired = await acquireLock(jobName);
  if (!lockAcquired) {
    console.log('Sync job already running or lock not acquired.');
    return;
  }
  console.log(`[${new Date().toISOString()}] Starting scheduled sync job...`);
  const start = Date.now();
  try {
    await syncAllVinnovaEntities();
    console.log(`[${new Date().toISOString()}] Sync job completed successfully.`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Sync job failed:`, err);
    // Optionally, call your sendAlert function here
  } finally {
    await releaseLock(jobName);
    const duration = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`[${new Date().toISOString()}] Sync job finished. Duration: ${duration}s`);
  }
}

// Schedule the job
cron.schedule(schedule, runSyncJob);

console.log(`Scheduled Vinnova sync job with cron: "${schedule}"`);