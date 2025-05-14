import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RegisterForm from '../RegisterForm';
import { useAuth } from '../useAuth';

jest.mock('../useAuth');

describe('RegisterForm', () => {
  const signUp = jest.fn();
  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue({ signUp });
    signUp.mockReset();
  });

  it('renders email and password fields and submit button', () => {
    render(<RegisterForm />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
  });

  it('calls signUp with email and password when submitted', async () => {
    signUp.mockResolvedValue(undefined);
    render(<RegisterForm />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));
    await waitFor(() => expect(signUp).toHaveBeenCalledWith('test@example.com', 'secret'));
  });

  it('shows error message if signUp throws', async () => {
    signUp.mockRejectedValue(new Error('Registration failed'));
    render(<RegisterForm />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'fail@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Registration failed');
  });

  it('disables submit button and shows loading when submitting', async () => {
    let resolve: () => void;
    signUp.mockImplementation(() => new Promise(r => { resolve = r; }));
    render(<RegisterForm />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));
    expect(screen.getByRole('button', { name: /loading/i })).toBeDisabled();
    // Finish the promise
    resolve!();
    await waitFor(() => expect(signUp).toHaveBeenCalled());
  });
}); 