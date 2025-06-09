import { z } from 'zod';

export const ansokningarQuerySchema = z.object({
  search: z.string().max(100).optional(),
  // Add other expected query params here
}); 