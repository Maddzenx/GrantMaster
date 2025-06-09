// Activity type definition (inline for now; replace with import if available)
export interface Activity {
  id: string;
  name: string | null;
  description: string | null;
  startDate: string | null; // ISO date string
  endDate: string | null;   // ISO date string
  // Add more fields as needed
}

function isValidActivity(activity: any): activity is Activity {
  // Basic validation: id must be string, name/description/startDate/endDate can be null or string
  return (
    activity &&
    typeof activity.id === 'string' &&
    (typeof activity.name === 'string' || activity.name === null) &&
    (typeof activity.description === 'string' || activity.description === null) &&
    (typeof activity.startDate === 'string' || activity.startDate === null) &&
    (typeof activity.endDate === 'string' || activity.endDate === null)
  );
}

/**
 * Normalize a Vinnova API funded activity object to the canonical Activity model.
 * Handles alternate field names, missing fields, and type coercion.
 * Returns null if required fields are missing or invalid.
 * Logs errors for missing/invalid fields.
 * TODO: Replace with JSON schema validation for stricter checks.
 */
export function normalizeActivity(input: any): Activity | null {
  if (!input || typeof input !== 'object') {
    console.warn('normalizeActivity: input is not an object', input);
    return null;
  }
  const id = input.AktivitetsID || input.aktivitetsid || input.id || null;
  if (!id || typeof id !== 'string') {
    console.warn('normalizeActivity: missing or invalid id', input);
    return null;
  }
  const activity: Activity = {
    id,
    name:
      input.Aktivitetsnamn ||
      input.aktivitetsnamn ||
      input.Namn ||
      input.namn ||
      input.name ||
      null,
    description: input.Beskrivning || input.beskrivning || input.description || null,
    startDate: input.Startdatum || input.startdatum || null,
    endDate: input.Slutdatum || input.slutdatum || null,
    // Add more fields as needed
  };
  if (!isValidActivity(activity)) {
    console.warn('normalizeActivity: failed validation', activity, input);
    return null;
  }
  return activity;
} 