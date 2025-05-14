'use client';

import React from 'react';
import { useAuth } from './useAuth';
import { useRouter } from 'next/navigation';

const LogoutButton: React.FC = () => {
  const { signOut, loading } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (err: any) {
      alert(err.message || 'Logout failed');
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
    >
      {loading ? 'Logging out...' : 'Logout'}
    </button>
  );
};

export default LogoutButton; 