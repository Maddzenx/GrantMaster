'use client';
import React from 'react';
import LoginForm from '../../components/auth/LoginForm';
import { supabase } from '../lib/supabase'; // adjust path as needed

async function handleLogin(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <LoginForm onLogin={handleLogin} />
    </div>
  );
} 