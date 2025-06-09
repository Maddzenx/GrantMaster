// Application type definition (inline for now; replace with import if available)
export interface Application {
  id: string;
  title: string | null;
  status: string | null;
  decisionDate: string | null; // ISO date string
  // Add more fields as needed
}

function isValidApplication(app: any): app is Application {
  // Basic validation: id must be string, title/status/decisionDate can be null or string
  return (
    app &&
    typeof app.id === 'string' &&
    (typeof app.title === 'string' || app.title === null) &&
    (typeof app.status === 'string' || app.status === null) &&
    (typeof app.decisionDate === 'string' || app.decisionDate === null)
  );
}

/**
 * Normalize a Vinnova API application object to the canonical Application model.
 * Handles alternate field names, missing fields, and type coercion.
 * Returns null if required fields are missing or invalid.
 * Logs errors for missing/invalid fields.
 * TODO: Replace with JSON schema validation for stricter checks.
 */
export function normalizeApplication(input: any): Application | null {
  if (!input || typeof input !== 'object') {
    console.warn('normalizeApplication: input is not an object', input);
    return null;
  }
  const id = input.Diarienummer || input.diarienummer || input.id || null;
  if (!id || typeof id !== 'string') {
    console.warn('normalizeApplication: missing or invalid id', input);
    return null;
  }
  const app: Application = {
    id,
    title: input.Titel || input.titel || input.title || null,
    status: input.Status || input.status || null,
    decisionDate: input.Beslutsdatum || input.beslutsdatum || null,
    // Add more fields as needed
  };
  if (!isValidApplication(app)) {
    console.warn('normalizeApplication: failed validation', app, input);
    return null;
  }
  return app;
} 