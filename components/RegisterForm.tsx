'use client';

import React, { useState } from 'react';
import AuthForm from './auth/AuthForm';
import { useAuth } from '../app/lib/auth/AuthContext';
import { userRegistrationSchema } from '../lib/validation/user';
import { useFieldValidation } from '../lib/validation/useFieldValidation';

const RegisterForm: React.FC = () => {
  const { signUp } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { values, errors, onChange, onBlur, reset } = useFieldValidation(userRegistrationSchema);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signUp(values.email, values.password);
      reset();
      // Optionally, show a success message or redirect
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthForm
      title="Register"
      onSubmit={handleSubmit}
      submitText="Sign Up"
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
    </AuthForm>
  );
};

export default RegisterForm;