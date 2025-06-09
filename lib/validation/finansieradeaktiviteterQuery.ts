import { z } from 'zod';

export const finansieradeaktiviteterQuerySchema = z.object({
  limit: z.string().regex(/^\d+$/).max(3).optional(), // e.g., '100'
  offset: z.string().regex(/^\d+$/).max(5).optional(), // e.g., '0'
  search: z.string().max(100).optional(),
  // Add other expected query params here as needed
}); 