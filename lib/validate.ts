import { ZodSchema } from 'zod';
import type { NextApiResponse } from 'next';

export function validate<T>(schema: ZodSchema<T>, data: unknown, res: NextApiResponse): T | undefined {
  const result = schema.safeParse(data);
  if (!result.success) {
    res.status(400).json({ error: 'Invalid input' });
    return undefined;
  }
  return result.data;
} 