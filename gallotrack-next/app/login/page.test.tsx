import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
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

const handleLogin = vi.fn((event: React.FormEvent) => event.preventDefault());
const store = {
  currentUserId: null,
  handleLogin,
  loading: false,
  error: '',
  username: '',
  setUsername: vi.fn(),
  password: '',
  setPassword: vi.fn(),
  showPassword: false,
  setShowPassword: vi.fn(),
  rememberMe: false,
  setRememberMe: vi.fn(),
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

  it('renders the existing login form with the shared heritage header', () => {
    render(<LoginPage />);

    expect(screen.getByRole('link', { name: /GalloTrack home/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Sign In to GalloTrack/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Register your farm/i })).toHaveAttribute(
      'href',
      '/register',
    );
  });

  it('keeps the submit handler wired to the form', () => {
    render(<LoginPage />);

    const submit = screen.getByRole('button', { name: /^Sign In$/i });
    const form = submit.closest('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form!);
    expect(handleLogin).toHaveBeenCalledTimes(1);
  });
});
