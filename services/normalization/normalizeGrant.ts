// Grant type definition (inline for now; replace with import if available)
export interface Grant {
  id: string;
  title: string | null;
  description: string | null;
  deadline: string | null; // ISO date string
  sector: string | null;
  stage: string | null;
  // Add more fields as needed
}

function isValidGrant(grant: any): grant is Grant {
  // Basic validation: id must be string, title can be null or string, etc.
  return (
    grant &&
    typeof grant.id === 'string' &&
    (typeof grant.title === 'string' || grant.title === null) &&
    (typeof grant.description === 'string' || grant.description === null) &&
    (typeof grant.deadline === 'string' || grant.deadline === null) &&
    (typeof grant.sector === 'string' || grant.sector === null) &&
    (typeof grant.stage === 'string' || grant.stage === null)
  );
}

/**
 * Normalize a Vinnova API grant object to the canonical Grant model.
 * Handles alternate field names, missing fields, and type coercion.
 * Returns null if required fields are missing or invalid.
 * Logs errors for missing/invalid fields.
 * TODO: Replace with JSON schema validation for stricter checks.
 */
export function normalizeGrant(input: any): Grant | null {
  if (!input || typeof input !== 'object') {
    console.warn('normalizeGrant: input is not an object', input);
    return null;
  }
  const id = input.Diarienummer || input.diarienummer || input.id || null;
  if (!id || typeof id !== 'string') {
    console.warn('normalizeGrant: missing or invalid id', input);
    return null;
  }
  const grant: Grant = {
    id,
    title: input.Titel || input.titel || input.title || null,
    description: input.Beskrivning || input.beskrivning || input.description || null,
    deadline: input.Beslutsdatum || input.beslutsdatum || input.Publiceringsdatum || input.publiceringsdatum || null,
    sector: input.Sektor || input.sector || null,
    stage: input.Stage || input.stage || null,
    // Add more fields as needed
  };
  if (!isValidGrant(grant)) {
    console.warn('normalizeGrant: failed validation', grant, input);
    return null;
  }
  return grant;
} 