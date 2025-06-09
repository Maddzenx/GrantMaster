'use client';

import React, { useState } from 'react';
import AuthForm from './AuthForm';
import { supabase } from '../../app/lib/supabase';
import toast from 'react-hot-toast';
import { userRegistrationSchema } from '../../lib/validation/user';
import { useFieldValidation } from '../../lib/validation/useFieldValidation';

const ResetPasswordForm: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { values, errors, onChange, onBlur, reset } = useFieldValidation(userRegistrationSchema);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      // Call the custom /api/reset-password endpoint
      const response = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: values.email }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Password reset failed');
      }
      setSuccess(data.message || 'If your email is registered, you will receive a password reset email.');
      reset();
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
          name="email"
          type="email"
          value={values.email}
          onChange={onChange('email')}
          onBlur={onBlur('email')}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
        {errors.email && <div style={{ color: 'red' }}>{errors.email}</div>}
      </div>
      {success && (
        <div className="bg-green-100 text-green-700 px-4 py-2 rounded text-sm mt-2" role="alert">
          {success}
        </div>
      )}
    </AuthForm>
  );
};

export default ResetPasswordForm; 