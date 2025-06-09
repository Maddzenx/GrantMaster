import 'dotenv/config';

import { syncAllVinnovaEntities } from './vinnovaSync';
import { supabase } from '../app/lib/supabase.js';

describe('Vinnova Sync Service Integration', function () {
  this.timeout(60000); // Allow up to 60s for real API/database

  before(async () => {
    // Cleanup before test
    for (const table of ['grants', 'applications', 'activities']) {
      const { error } = await supabase.from(table).delete().not('id', 'is', null);
      if (error) {
        console.error(`Error cleaning up table ${table} before test:`, error);
      } else {
        console.log(`Cleaned up table ${table} before test.`);
      }
    }
  });

  after(async () => {
    // Cleanup after test
    for (const table of ['grants', 'applications', 'activities']) {
      const { error } = await supabase.from(table).delete().not('id', 'is', null);
      if (error) {
        console.error(`Error cleaning up table ${table} after test:`, error);
      } else {
        console.log(`Cleaned up table ${table} after test.`);
      }
    }
  });

  it('should sync all Vinnova entities and return valid reports', async () => {

    const results = await syncAllVinnovaEntities();
    console.log('Sync results:', results);
    expect(results).to.be.an('array').with.length(3);
    for (const report of results) {
      expect(report).to.have.all.keys(
        'entity',
        'inserted',
        'updated',
        'unchanged',
        'failed',
        'errors',
        'total',
        'startedAt',
        'finishedAt',
        'durationMs'
      );
      expect(report.entity).to.be.a('string');
      expect(report.inserted).to.be.a('number');
      expect(report.updated).to.be.a('number');
      expect(report.unchanged).to.be.a('number');
      expect(report.failed).to.be.a('number');
      expect(report.errors).to.be.an('array');
      expect(report.total).to.be.a('number');
      expect(report.startedAt).to.be.a('string');
      expect(report.finishedAt).to.be.a('string');
      expect(report.durationMs).to.be.a('number');
    }
  });
}); 