/// <reference types="@testing-library/jest-dom" />
/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ResetPasswordForm from '../ResetPasswordForm';
import { expect } from '@jest/globals';

beforeAll(() => {
  global.fetch = jest.fn();
});
afterEach(() => {
  jest.resetAllMocks();
});

describe('ResetPasswordForm', () => {
  it('renders email field and submit button', () => {
    render(<ResetPasswordForm />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send reset email/i })).toBeInTheDocument();
  });

  it('calls fetch with email when submitted', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'If your email is registered, you will receive a password reset email.' }),
    });
    render(<ResetPasswordForm />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send reset email/i }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
      '/api/reset-password',
      expect.objectContaining({
        method: 'POST',
        headers: expect.any(Object),
        body: JSON.stringify({ email: 'test@example.com' }),
      })
    ));
  });

  it('shows error message if fetch returns error', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Reset failed' }),
    });
    render(<ResetPasswordForm />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'fail@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send reset email/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Reset failed');
  });

  it('shows success message if fetch succeeds', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'If your email is registered, you will receive a password reset email.' }),
    });
    render(<ResetPasswordForm />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'success@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send reset email/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('If your email is registered, you will receive a password reset email.');
  });

  it('disables submit button and shows loading when submitting', async () => {
    let resolve: (value: any) => void;
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(r => { resolve = r; }));
    render(<ResetPasswordForm />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send reset email/i }));
    expect(screen.getByRole('button', { name: /loading/i })).toBeDisabled();
    // Finish the promise
    resolve!({ ok: true, json: async () => ({ message: 'If your email is registered, you will receive a password reset email.' }) });
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
  });
}); 