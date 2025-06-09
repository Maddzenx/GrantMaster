'use client';

import React, { useState } from 'react';
import { useAuth } from '../../app/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import LogOutEverywhereButton from '@/components/auth/LogOutEverywhereButton';
import { supabase } from '../../lib/supabaseClient';

let logoutTimeout: NodeJS.Timeout | null = null;

const setAutoLogout = (expiresAt: number | undefined, signOut: () => void) => {
  if (logoutTimeout) clearTimeout(logoutTimeout);
  if (!expiresAt) return;
  const msUntilExpiry = expiresAt * 1000 - Date.now();

  if (msUntilExpiry > 60 * 1000) {
    setTimeout(() => {
      // Show a warning modal here
      // e.g., setShowSessionWarning(true);
    }, msUntilExpiry - 60 * 1000);
  }

  if (msUntilExpiry > 0) {
    logoutTimeout = setTimeout(() => {
      signOut();
    }, msUntilExpiry);
  }
};

export default function RegisterForm() {
  const { signUp } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await signUp(email, password);
      setSuccess('Registration successful! Redirecting...');
      setTimeout(() => {
        router.push('/login'); // Redirect to login or dashboard
      }, 1500);
    } catch (err: any) {
      const msg = err.message?.toLowerCase() || '';
      if (msg.includes('user already registered') || msg.includes('email already in use') || msg.includes('duplicate key')) {
        setError('This email is already registered. Please log in or use a different email.');
      } else {
      setError(err.message || 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Register</h2>
        <input
          type="email"
        placeholder="Email"
          value={email}
        onChange={e => setEmail(e.target.value)}
          required
        disabled={loading}
        />
        <input
          type="password"
        placeholder="Password"
          value={password}
        onChange={e => setPassword(e.target.value)}
          required
        disabled={loading}
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Registering...' : 'Register'}
      </button>
      {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
      {success && <div style={{ color: 'green', marginTop: 8 }}>{success}</div>}
      <LogOutEverywhereButton />
    </form>
  );
} 