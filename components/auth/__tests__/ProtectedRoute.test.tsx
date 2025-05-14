import React from 'react';
import { render, screen } from '@testing-library/react';
import ProtectedRoute from '../ProtectedRoute';
import { useAuth } from '../useAuth';
import { useRouter } from 'next/navigation';

jest.mock('../useAuth');
jest.mock('next/navigation', () => ({ useRouter: jest.fn() }));

describe('ProtectedRoute', () => {
  const push = jest.fn();
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({ push });
    push.mockReset();
  });

  it('shows loading when loading is true', () => {
    (useAuth as jest.Mock).mockReturnValue({ user: null, loading: true });
    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('redirects to /login when not authenticated', () => {
    (useAuth as jest.Mock).mockReturnValue({ user: null, loading: false });
    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );
    expect(push).toHaveBeenCalledWith('/login');
  });

  it('renders children when authenticated', () => {
    (useAuth as jest.Mock).mockReturnValue({ user: { id: '123' }, loading: false });
    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
}); 