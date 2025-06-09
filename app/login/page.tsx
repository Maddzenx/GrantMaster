'use client';

import React, { useEffect } from 'react';
import LoginForm from '@/components/auth/LoginForm';
import { useAuth } from '../lib/auth/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams?.get('redirectedFrom') || '/dashboard';

  useEffect(() => {
    console.log('LoginPage useEffect: user =', user, 'redirectTo =', redirectTo);
    if (user) {
      window.location.href = redirectTo;
    }
  }, [user, redirectTo]);

  return <LoginForm />;
}