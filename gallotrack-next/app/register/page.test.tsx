import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import RegisterPage from './page';

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

const { signUp } = vi.hoisted(() => ({
  signUp: vi.fn().mockResolvedValue({ error: null }),
}));
vi.mock('@/lib/registry', () => ({
  supabase: { auth: { signUp } },
  fullNameFromMetadata: () => 'Juan dela Cruz',
}));

describe('Registration page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue({
          allow_registrations: true,
          system_status: 'Online',
        }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps the three-step registration flow and submit behavior intact', async () => {
    render(<RegisterPage />);

    expect(screen.getByRole('link', { name: /GalloTrack home/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Create Owner Account/i })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'Juan' } });
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'dela Cruz' } });
    fireEvent.click(screen.getByRole('button', { name: /NEXT/i }));

    fireEvent.change(screen.getByLabelText(/Farm \/ Yard Name/i), {
      target: { value: 'San Pedro Farm' },
    });
    fireEvent.click(screen.getByRole('button', { name: /NEXT/i }));

    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'juan@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^Password/i), {
      target: { value: 'secret123' },
    });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), {
      target: { value: 'secret123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));

    await waitFor(() => expect(signUp).toHaveBeenCalledTimes(1));
    expect(push).toHaveBeenCalledWith('/auth/verify-otp?email=juan%40example.com');
  });
});
