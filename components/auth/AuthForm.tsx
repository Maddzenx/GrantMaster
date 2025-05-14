import React from 'react';
import type { ReactNode, FormEvent } from 'react';

interface AuthFormProps {
  title: string;
  children: ReactNode;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  submitText: string;
  loading?: boolean;
  error?: string;
}

const AuthForm = ({
  title,
  children,
  onSubmit,
  submitText,
  loading = false,
  error,
}: AuthFormProps) => {
  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-md mx-auto bg-white p-8 rounded shadow-md flex flex-col gap-4"
      aria-label={title}
    >
      <h2 className="text-2xl font-bold text-center mb-4">{title}</h2>
      {error && (
        <div className="bg-red-100 text-red-700 px-4 py-2 rounded text-sm" role="alert">
          {error}
        </div>
      )}
      <div className="flex flex-col gap-3">{children}</div>
      <button
        type="submit"
        className="mt-4 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
        disabled={loading}
        aria-busy={loading}
      >
        {loading ? 'Loading...' : submitText}
      </button>
    </form>
  );
};

export default AuthForm; 