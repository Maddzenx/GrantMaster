import { z } from 'zod';

export const grantApplicationSchema = z.object({
  userId: z.string().uuid(),
  grantId: z.string(),
  projectTitle: z.string().min(3).max(200),
  projectSummary: z.string().min(10).max(2000),
  requestedAmount: z.number().min(1),
  attachmentUrl: z.string().url().optional(), // For file uploads
});
