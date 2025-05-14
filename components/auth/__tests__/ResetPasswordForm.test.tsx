import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ResetPasswordForm from '../ResetPasswordForm';

jest.mock('@/app/lib/supabase', () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: jest.fn(),
    },
  },
}));

const { supabase } = require('@/app/lib/supabase');

describe('ResetPasswordForm', () => {
  beforeEach(() => {
    supabase.auth.resetPasswordForEmail.mockReset();
  });

  it('renders email field and submit button', () => {
    render(<ResetPasswordForm />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send reset email/i })).toBeInTheDocument();
  });

  it('calls supabase.auth.resetPasswordForEmail with email when submitted', async () => {
    supabase.auth.resetPasswordForEmail.mockResolvedValue({ error: null });
    render(<ResetPasswordForm />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send reset email/i }));
    await waitFor(() => expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('test@example.com', expect.any(Object)));
  });

  it('shows error message if resetPasswordForEmail returns error', async () => {
    supabase.auth.resetPasswordForEmail.mockResolvedValue({ error: { message: 'Reset failed' } });
    render(<ResetPasswordForm />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'fail@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send reset email/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Reset failed');
  });

  it('shows success message if resetPasswordForEmail succeeds', async () => {
    supabase.auth.resetPasswordForEmail.mockResolvedValue({ error: null });
    render(<ResetPasswordForm />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'success@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send reset email/i }));
    expect(await screen.findByText(/password reset email sent/i)).toBeInTheDocument();
  });

  it('disables submit button and shows loading when submitting', async () => {
    let resolve: () => void;
    supabase.auth.resetPasswordForEmail.mockImplementation(() => new Promise(r => { resolve = r; }));
    render(<ResetPasswordForm />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send reset email/i }));
    expect(screen.getByRole('button', { name: /loading/i })).toBeDisabled();
    // Finish the promise
    resolve!();
    await waitFor(() => expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalled());
  });
}); 