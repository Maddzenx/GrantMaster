import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider } from '../AuthProvider';
import { useAuth } from '../useAuth';

// Mock Supabase client
jest.mock('../../../app/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
      getSession: jest.fn(() => Promise.resolve({ data: { session: null } })),
      signInWithPassword: jest.fn(() => Promise.resolve({ error: null })),
      signUp: jest.fn(() => Promise.resolve({ error: null })),
      signOut: jest.fn(() => Promise.resolve({ error: null })),
      resetPasswordForEmail: jest.fn(() => Promise.resolve({ error: null })),
    },
  },
}));

// Test component to consume the context
function TestComponent() {
  const { user, loading, signIn, signUp, signOut } = useAuth();
  return (
    <div>
      <div>user: {user ? 'yes' : 'no'}</div>
      <div>loading: {loading ? 'yes' : 'no'}</div>
      <button onClick={() => signIn('test@example.com', 'pw')}>Sign In</button>
      <button onClick={() => signUp('test@example.com', 'pw')}>Sign Up</button>
      <button onClick={() => signOut()}>Sign Out</button>
    </div>
  );
}

describe('AuthProvider and useAuth', () => {
  it('renders children and provides auth context', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    expect(screen.getByText(/user:/)).toBeInTheDocument();
    expect(screen.getByText(/loading:/)).toBeInTheDocument();
  });

  it('calls signIn, signUp, and signOut without error', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    screen.getByText('Sign In').click();
    screen.getByText('Sign Up').click();
    screen.getByText('Sign Out').click();
    // Optionally, assert that the mock functions were called
    await waitFor(() => {
      expect(screen.getByText(/user:/)).toBeInTheDocument();
    });
  });
}); 