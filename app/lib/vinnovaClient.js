/**
 * Fetches raw grant data from the Vinnova API.
 * @returns {Promise<any[]>} Raw API response array
 */
async function fetchVinnovaRawData() {
  const VINNOVA_API_URL = process.env.VINNOVA_CALLS_ENDPOINT;
  if (!VINNOVA_API_URL) throw new Error('VINNOVA_CALLS_ENDPOINT is not set');
  const res = await fetch(VINNOVA_API_URL);
  if (!res.ok) throw new Error(`Vinnova API error: ${res.status} ${res.statusText}`);
  const data = await res.json();
  if (!data) return [];
  return Array.isArray(data) ? data : data.results || [];
}

/**
 * Normalizes a single Vinnova grant object to the internal model, strictly matching Supabase types.
 * Ensures all fields are string or null, and logs malformed data.
 * @param {any} grant Raw grant object from Vinnova
 * @returns {object|null} Normalized grant or null if invalid
 */
function normalizeGrant(grant) {
  if (!grant || (typeof grant !== 'object')) {
    console.warn('Malformed grant (not an object):', grant);
    return null;
  }
  // Acceptable id fields
  const id = grant.id || grant.diarienummer || grant.identifier;
  if (!id || typeof id !== 'string') {
    console.warn('Missing or invalid id in grant:', grant);
    return null;
  }
  // Helper to coerce to string or null
  const strOrNull = v => (typeof v === 'string' ? v : (v == null ? null : String(v)));
  // Acceptable date fields
  let deadline = grant.deadline || grant.slutdatum || null;
  if (deadline && typeof deadline !== 'string') deadline = String(deadline);
  // Try to parse/format as ISO date if possible
  if (deadline) {
    const d = new Date(deadline);
    deadline = isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  return {
    id,
    title: strOrNull(grant.title) || strOrNull(grant.titel) || null,
    description: strOrNull(grant.description) || strOrNull(grant.beskrivning) || null,
    deadline,
    sector: strOrNull(grant.sector) || strOrNull(grant.omrade) || null,
    stage: strOrNull(grant.stage) || null,
  };
}

/**
 * Fetches and normalizes all grants from the Vinnova API.
 * @returns {Promise<object[]>} Array of normalized grants
 */
export async function fetchVinnovaGrants() {
  const rawGrants = await fetchVinnovaRawData();
  return rawGrants.filter(Boolean).map(normalizeGrant).filter(g => g && g.id);
} 