import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import LoginPage from './page';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'light', setTheme: vi.fn() }),
}));

vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: () => ({ currentUserId: null }),
}));

const handleLogin = vi.fn();
const store = {
  currentUserId: null,
  handleLogin,
  loading: false,
  error: '',
  showPassword: false,
  setShowPassword: vi.fn(),
  rememberMe: false,
  successMessage: '',
  showForgotPasswordModal: false,
  setShowForgotPasswordModal: vi.fn(),
  forgotEmail: '',
  setForgotEmail: vi.fn(),
  forgotSent: false,
  setForgotSent: vi.fn(),
  forgotError: '',
  setForgotError: vi.fn(),
  forgotLoading: false,
  handleSendResetLink: vi.fn(),
};

vi.mock('@/lib/context', () => ({
  useGaloTrack: () => store,
}));

describe('Login page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store.error = '';
    store.loading = false;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue({ system_status: 'Online' }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the split-screen branding and login form', () => {
    render(<LoginPage />);

    expect(screen.getByRole('link', { name: /GalloTrack home/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Back to Home/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('heading', { name: /Sign In to GalloTrack/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Register your farm/i })).toHaveAttribute(
      'href',
      '/register',
    );
    expect(screen.getByRole('img', { name: /Colorful gamefowl rooster/i })).toBeInTheDocument();
    expect(screen.getByText('Lineage Tracking')).toBeInTheDocument();
    expect(screen.getByText('Farm Registry')).toBeInTheDocument();
  });

  it('shows inline validation errors for invalid email and short password', async () => {
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'not-an-email' },
    });
    fireEvent.change(screen.getByLabelText(/^Password$/i), {
      target: { value: 'short' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Sign In$/i }));

    expect(await screen.findByText(/Enter a valid email address/i)).toBeInTheDocument();
    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(/Email Address/i)).toHaveAttribute(
      'aria-describedby',
      'login-email-error',
    );
    expect(screen.getByLabelText(/^Password$/i)).toHaveAttribute('aria-invalid', 'true');
    expect(handleLogin).not.toHaveBeenCalled();
  });

  it('maps invalid credentials to a clear alert', () => {
    store.error = 'The email address or password you entered is incorrect. Please try again.';
    render(<LoginPage />);

    expect(screen.getByRole('alert')).toHaveTextContent('Invalid email or password.');
  });

  it('submits valid credentials and calls the auth handler', async () => {
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'breeder@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^Password$/i), {
      target: { value: 'secret123' },
    });
    fireEvent.click(screen.getByLabelText(/Remember Me/i));
    fireEvent.click(screen.getByRole('button', { name: /^Sign In$/i }));

    await waitFor(() =>
      expect(handleLogin).toHaveBeenCalledWith(undefined, {
        email: 'breeder@example.com',
        password: 'secret123',
        rememberMe: true,
      }),
    );
  });

  it('toggles password visibility and opens the reset password flow', () => {
    render(<LoginPage />);

    fireEvent.click(screen.getByRole('button', { name: /Show password/i }));
    expect(store.setShowPassword).toHaveBeenCalledWith(true);

    fireEvent.click(screen.getByRole('button', { name: /Forgot password/i }));
    expect(store.setShowForgotPasswordModal).toHaveBeenCalledWith(true);
  });
});
