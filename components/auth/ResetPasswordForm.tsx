'use client';

import React, { useState } from 'react';
import AuthForm from './AuthForm';
import { supabase } from '../../app/lib/supabase';

const ResetPasswordForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/login',
      });
      if (error) throw new Error(error.message);
      setSuccess('Password reset email sent! Please check your inbox.');
    } catch (err: any) {
      setError(err.message || 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthForm
      title="Reset Password"
      onSubmit={handleSubmit}
      submitText="Send Reset Email"
      loading={loading}
      error={error || undefined}
    >
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>
      {success && (
        <div className="mt-4 p-3 bg-green-100 text-green-700 rounded">
          {success}
        </div>
      )}
    </AuthForm>
  );
};

export default ResetPasswordForm; 