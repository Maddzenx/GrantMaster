'use client';
import { useUser } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useUser();
  const router = useRouter();

  useEffect(() => {
    if (user === undefined) return; // still loading
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  if (user === undefined) return <div>Loading...</div>;
  if (!user) return null;
  return <>{children}</>;
} 