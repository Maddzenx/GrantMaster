import { syncVinnovaGrants } from '@/app/lib/vinnovaSync';

export async function GET(req) {
  // Simple token-based authentication
  const expected = process.env.SYNC_CRON_SECRET;
  const auth = req?.headers?.get('authorization') || '';
  if (!expected || !auth.startsWith('Bearer ') || auth.slice(7) !== expected) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 });
  }
  try {
    const report = await syncVinnovaGrants();
    return new Response(JSON.stringify({ success: true, report }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
  }
} 