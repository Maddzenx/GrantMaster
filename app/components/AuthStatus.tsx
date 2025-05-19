'use client';

import React, { useState } from 'react';
import { useAuth } from '../lib/auth/AuthContext';

export default function AuthStatus() {
  const { user, signIn, signOut, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await signIn(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
  };

  if (loading) return <p>Loading auth state...</p>;

  if (user) {
    return (
      <div>
        <p>Signed in as <strong>{user.email}</strong></p>
        <button
          className="px-4 py-2 bg-red-600 text-white rounded"
          onClick={signOut}
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div>
        <input
          type="email"
          placeholder="Email"
          className="border p-2 rounded w-full"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <input
          type="password"
          placeholder="Password"
          className="border p-2 rounded w-full"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
      </div>
      {error && <p className="text-red-600">{error}</p>}
      <button
        type="submit"
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        Sign In
      </button>
    </form>
  );
} 