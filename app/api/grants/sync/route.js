import { supabase } from '@/app/lib/supabase';

export async function GET() {
  const res = await fetch(process.env.VINNOVA_CALLS_ENDPOINT);
  const data = await res.json();

  // Adjust this mapping to match the actual Vinnova API response
  const grants = (Array.isArray(data) ? data : data.results || []).map(grant => ({
    id: grant.id || grant.diarienummer || grant.identifier,
    title: grant.title || grant.titel || '',
    description: grant.description || grant.beskrivning || '',
    deadline: grant.deadline || grant.slutdatum || null,
    sector: grant.sector || grant.omrade || '',
    stage: grant.stage || '',
  }));

  // Upsert grants into Supabase
  for (const grant of grants) {
    if (grant.id) {
      await supabase.from('grants').upsert(grant, { onConflict: ['id'] });
    }
  }

  return new Response(JSON.stringify({ success: true, count: grants.length }), { status: 200 });
} 