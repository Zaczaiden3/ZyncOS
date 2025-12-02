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
    // ZYNC_OS is split into spans, so we check for the parts or use a custom matcher
    expect(screen.getByAltText('ZyncAI')).toBeDefined();
    expect(screen.getByPlaceholderText('USER@DOMAIN.EXT')).toBeDefined();
    expect(screen.getByPlaceholderText('••••••')).toBeDefined();
    expect(screen.getByText('INITIALIZE')).toBeDefined();
  });

  it('switches to signup mode', () => {
    render(<LoginPage onLogin={() => {}} onGlitch={() => {}} />);
    const switchButton = screen.getByText('[ CREATE_NEW_UPLINK ]');
    fireEvent.click(switchButton);
    
    expect(screen.getByPlaceholderText('ENTER_NAME')).toBeDefined();
    expect(screen.getByText('ESTABLISH LINK')).toBeDefined();
  });

  it('handles input changes', () => {
    render(<LoginPage onLogin={() => {}} onGlitch={() => {}} />);
    const emailInput = screen.getByPlaceholderText('USER@DOMAIN.EXT') as HTMLInputElement;
    const passwordInput = screen.getByPlaceholderText('••••••') as HTMLInputElement;

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
    
    const emailInput = screen.getByPlaceholderText('USER@DOMAIN.EXT');
    const passwordInput = screen.getByPlaceholderText('••••••');
    const submitButton = screen.getByText('INITIALIZE');

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(authService.loginUser).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(onLoginMock).toHaveBeenCalled();
    });
  });

  it('triggers glitch on login failure', async () => {
    const onGlitchMock = vi.fn();
    // Mock failed login
    (authService.loginUser as any).mockResolvedValue({ error: 'Invalid credentials' });

    render(<LoginPage onLogin={() => {}} onGlitch={onGlitchMock} />);
    
    const emailInput = screen.getByPlaceholderText('USER@DOMAIN.EXT');
    const passwordInput = screen.getByPlaceholderText('••••••');
    const submitButton = screen.getByText('INITIALIZE');

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(onGlitchMock).toHaveBeenCalledWith(true);
    });
  });
});
