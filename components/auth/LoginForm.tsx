'use client';

import React, { useState } from 'react';
import AuthForm from './AuthForm';
import { useAuth } from '../../app/lib/auth/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { userRegistrationSchema } from '../../lib/validation/user';
import { useFieldValidation } from '../../lib/validation/useFieldValidation';
import { supabase } from '../../lib/supabaseClient';

const LoginForm: React.FC = () => {
  console.log('LoginForm rendered');
  const { signIn, user, session } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams?.get('redirectedFrom') || '/dashboard';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { values, errors, onChange, onBlur, reset } = useFieldValidation(userRegistrationSchema);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('handleSubmit called');
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      console.log('Attempting login with:', values.email, values.password);
      console.log('Supabase:', supabase);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });
      console.log('Supabase response:', { data, error });
      if (error) {
        throw new Error(error.message || 'Login failed');
      }
      setSuccess('Login successful! Redirecting...');
      reset();
      console.log('Login successful, about to redirect to:', redirectTo);
      router.push(redirectTo);
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthForm
      title="Sign In"
      onSubmit={handleSubmit}
      submitText={loading ? 'Signing In...' : 'Sign In'}
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
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          value={values.password}
          onChange={onChange('password')}
          onBlur={onBlur('password')}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
        {errors.password && <div style={{ color: 'red' }}>{errors.password}</div>}
      </div>
      {success && <div style={{ color: 'green', marginTop: 8 }}>{success}</div>}
    </AuthForm>
  );
};

export default LoginForm; 