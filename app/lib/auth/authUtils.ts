// Authentication utility functions for GrantMaster

// Example: Validate email format
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Example: Format Supabase error messages
export function formatAuthError(error: any): string {
  if (!error) return '';
  if (typeof error === 'string') return error;
  if (error.message) return error.message;
  return 'An unknown authentication error occurred.';
}

// Add more helpers as needed 