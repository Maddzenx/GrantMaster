/// <reference types="@testing-library/jest-dom" />
/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginForm from '../LoginForm';
import { AuthProvider } from 'app/lib/auth/AuthContext';

// Mock next/navigation useRouter before other imports
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

const supabaseMock = {
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: jest.fn().mockImplementation((cb) => {
        setTimeout(() => cb('INITIAL_SESSION', null), 0);
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      }),
      signInWithPassword: jest.fn().mockResolvedValue({ error: null }),
      signUp: jest.fn().mockResolvedValue({ error: null }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
      resetPasswordForEmail: jest.fn().mockResolvedValue({ error: null }),
    },
  },
};

jest.mock('app/lib/supabase', () => supabaseMock);
jest.mock('app/lib/supabase.js', () => supabaseMock);

// Mock fetch for login API
beforeAll(() => {
  global.fetch = jest.fn();
});
afterEach(() => {
  jest.resetAllMocks();
});

describe('LoginForm', () => {
  it('renders email and password fields and submit button', async () => {
    render(
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());
    // @ts-expect-error
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    // @ts-expect-error
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    // @ts-expect-error
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows error message if login fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Invalid credentials' }),
    });
    render(
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'fail@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    // @ts-expect-error
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials');
  });

  it('shows success message if login succeeds', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });
    render(
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'success@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    // @ts-expect-error
    expect(await screen.findByText(/login successful/i)).toBeInTheDocument();
  });

  it('disables submit button and shows loading when submitting', async () => {
    let resolve: (value: any) => void;
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(r => { resolve = r; }));
    render(
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    // @ts-expect-error
    expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();
    // Finish the promise
    resolve!({ ok: true, json: async () => ({}) });
    // @ts-expect-error
    await waitFor(() => expect(screen.getByRole('button', { name: /sign in/i })).not.toBeDisabled());
  });
}); 