import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AuthProvider } from './AuthContext';
import { useAuth } from './useAuth';

// Mock supabase
jest.mock('../supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
      getSession: jest.fn(() => Promise.resolve({ data: { session: null } })),
      signInWithPassword: jest.fn(() => Promise.resolve({ error: null })),
      signUp: jest.fn(() => Promise.resolve({ error: null })),
      signOut: jest.fn(() => Promise.resolve({ error: null })),
      resetPasswordForEmail: jest.fn(() => Promise.resolve({ error: null })),
    }
  }
}));

function TestComponent() {
  const { user, loading, signIn } = useAuth();
  return (
    <div>
      <span>user:{user ? user.email : 'none'}</span>
      <span>loading:{loading ? 'yes' : 'no'}</span>
      <button onClick={() => signIn('test@example.com', 'pw')}>Sign In</button>
    </div>
  );
}

describe('AuthContext', () => {
  it('renders and provides default values', async () => {
    await act(async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );
    });
    expect(screen.getByText(/user:none/)).toBeInTheDocument();
    expect(screen.getByText(/loading:no/)).toBeInTheDocument();
  });
}); 