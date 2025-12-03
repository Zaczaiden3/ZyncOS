import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from './LoginPage';
import * as authService from '../services/auth';

// Mock the auth service
vi.mock('../services/auth', () => ({
  loginUser: vi.fn(),
  registerUser: vi.fn(),
}));

describe('LoginPage Component', () => {
  it('renders the login form by default', () => {
    render(<LoginPage onLogin={() => {}} onGlitch={() => {}} />);
    expect(screen.getByText('ZYNC')).toBeDefined();
    expect(screen.getByPlaceholderText('name@example.com')).toBeDefined();
    expect(screen.getByPlaceholderText('••••••••')).toBeDefined();
    expect(screen.getByText('Sign In')).toBeDefined();
  });

  it('switches to signup mode', () => {
    render(<LoginPage onLogin={() => {}} onGlitch={() => {}} />);
    const switchButton = screen.getByText("Don't have an account? Sign up");
    fireEvent.click(switchButton);
    
    expect(screen.getByPlaceholderText('Enter your name')).toBeDefined();
    expect(screen.getByText('Create Account')).toBeDefined();
  });

  it('handles input changes', () => {
    render(<LoginPage onLogin={() => {}} onGlitch={() => {}} />);
    const emailInput = screen.getByPlaceholderText('name@example.com') as HTMLInputElement;
    const passwordInput = screen.getByPlaceholderText('••••••••') as HTMLInputElement;

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    expect(emailInput.value).toBe('test@example.com');
    expect(passwordInput.value).toBe('password123');
  });

  it('calls onLogin on successful login', async () => {
    const onLoginMock = vi.fn();
    // Mock successful login
    (authService.loginUser as any).mockResolvedValue({ user: { uid: '123' } });

    render(<LoginPage onLogin={onLoginMock} onGlitch={() => {}} />);
    
    const emailInput = screen.getByPlaceholderText('name@example.com');
    const passwordInput = screen.getByPlaceholderText('••••••••');
    const submitButton = screen.getByText('Sign In');

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(authService.loginUser).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(onLoginMock).toHaveBeenCalled();
    });
  });

  it('displays error on login failure', async () => {
    // Mock failed login
    (authService.loginUser as any).mockResolvedValue({ error: 'Invalid credentials' });

    render(<LoginPage onLogin={() => {}} onGlitch={() => {}} />);
    
    const emailInput = screen.getByPlaceholderText('name@example.com');
    const passwordInput = screen.getByPlaceholderText('••••••••');
    const submitButton = screen.getByText('Sign In');

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeDefined();
    });
  });
});
