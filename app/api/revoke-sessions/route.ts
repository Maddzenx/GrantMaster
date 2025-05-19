//test
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Service role key, never expose to client!
);

export async function POST(request: NextRequest) {
  const { sessionToken } = await request.json();

  if (!sessionToken) {
    return NextResponse.json({ error: 'Missing sessionToken' }, { status: 400 });
  }

  const { error } = await supabaseAdmin.auth.admin.signOut(
    sessionToken,
    'global'
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: 'All sessions revoked for user.' });
} 