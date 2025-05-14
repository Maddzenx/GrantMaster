import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginForm from '../LoginForm';

describe('LoginForm', () => {
  it('renders email and password fields and submit button', () => {
    render(<LoginForm onLogin={jest.fn()} />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('calls onLogin with email and password when submitted', async () => {
    const onLogin = jest.fn().mockResolvedValue(undefined);
    render(<LoginForm onLogin={onLogin} />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(onLogin).toHaveBeenCalledWith('test@example.com', 'secret'));
  });

  it('shows error message if onLogin throws', async () => {
    const onLogin = jest.fn().mockRejectedValue(new Error('Invalid credentials'));
    render(<LoginForm onLogin={onLogin} />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'fail@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials');
  });

  it('disables submit button and shows loading when submitting', async () => {
    let resolve: () => void;
    const onLogin = jest.fn(() => new Promise(r => { resolve = r; }));
    render(<LoginForm onLogin={onLogin} />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(screen.getByRole('button', { name: /loading/i })).toBeDisabled();
    // Finish the promise
    resolve!();
    await waitFor(() => expect(onLogin).toHaveBeenCalled());
  });
}); 