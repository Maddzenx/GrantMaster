import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';

export async function requireUser(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createServerSupabaseClient({ req, res });
  const { data, error } = await supabase.auth.getUser();
  console.log('getUser result:', data, error);
  if (!data?.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  return data.user;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireUser(req, res);
  if (!user) return;
  res.status(200).json({ message: 'requireUser works!' });
} 