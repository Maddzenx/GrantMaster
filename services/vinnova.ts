import axios from 'axios';

// Use the Vinnova Open Data API base URL
const VINNOVA_OPEN_DATA_BASE_URL = 'https://data.vinnova.se/api';

// Fetch calls (utlysningar) from Vinnova Open Data API
// Pass a date string (e.g., '2019-09-01') to get all calls changed since that date
export async function fetchVinnovaGrants(sinceDate: string = '2019-09-01') {
  try {
    const url = `${VINNOVA_OPEN_DATA_BASE_URL}/utlysningar/${sinceDate}`;
    console.log('Fetching Vinnova open calls from:', url);
    const response = await axios.get(url);
    console.log('Vinnova Open Data API response:', response.status, response.data);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError && axios.isAxiosError(error) && error.response) {
      console.error('Vinnova Open Data API error:', error.response.status, error.response.data);
    } else {
      console.error('Vinnova Open Data API error:', error);
    }
    throw error;
  }
}

// NormalizedGrant type
export type NormalizedGrant = {
  id: string;
  title: string | null;
  description: string | null;
  deadline: string | null;
  sector: string | null;
  stage: string | null;
};

// normalizeGrant function
export function normalizeGrant(input: any): NormalizedGrant | null {
  if (!input || typeof input !== 'object') return null;
  // Use Vinnova Open Data field names (case-sensitive)
  const id =
    typeof input.Diarienummer === 'string'
      ? input.Diarienummer
      : typeof input.diarienummer === 'string'
      ? input.diarienummer
      : null;
  if (!id) return null;

  const title = input.Titel ?? input.titel ?? null;
  const description = input.Beskrivning ?? input.beskrivning ?? null;
  // No explicit deadline field; use Publiceringsdatum as a fallback
  let deadline = input.Publiceringsdatum ?? input.publiceringsdatum ?? null;
  if (deadline && typeof deadline === 'string') {
    // Format as YYYY-MM-DD if possible
    const match = deadline.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (match) deadline = `${match[1]}-${match[2]}-${match[3]}`;
  }
  // No sector or stage in this API
  const sector = null;
  const stage = null;

  return {
    id: String(id),
    title: title != null ? String(title) : null,
    description: description != null ? String(description) : null,
    deadline: deadline != null ? String(deadline) : null,
    sector,
    stage,
  };
}

// VinnovaService class for compatibility with existing code/tests
export class VinnovaService {
  async getCalls(sinceDate: string = '2019-09-01') {
    return await fetchVinnovaGrants(sinceDate);
  }
}