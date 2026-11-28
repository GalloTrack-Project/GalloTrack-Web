import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import UserMenu from './UserMenu';

const mocks = vi.hoisted(() => ({
  auth: {
    adminName: 'Hazel Pagurayan Dato-on',
    email: 'hazel@example.com',
    username: 'hazel',
    avatarUrl: '',
    isAdmin: false,
    userActive: true,
  },
  ui: {
    setShowLogoutModal: vi.fn(),
  },
  unread: 3,
  resolvedTheme: 'light',
  setTheme: vi.fn(),
}));

vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: () => mocks.auth,
}));

vi.mock('@/lib/contexts/ui-context', () => ({
  useUI: () => mocks.ui,
}));

vi.mock('@/lib/contexts/notification-context', () => ({
  useNotificationUnreadCount: () => mocks.unread,
}));

vi.mock('next-themes', () => ({
  useTheme: () => ({
    resolvedTheme: mocks.resolvedTheme,
    setTheme: mocks.setTheme,
  }),
}));

describe('UserMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.isAdmin = false;
    mocks.auth.userActive = true;
    mocks.unread = 3;
    mocks.resolvedTheme = 'light';
  });

  it('opens the account menu with profile, notification, settings, and logout actions', async () => {
    render(<UserMenu />);

    const trigger = screen.getByRole('button', { name: /user menu/i });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByText('Hazel Pagurayan Dato-on')).toBeInTheDocument();
    expect(screen.getByText('hazel@example.com')).toBeInTheDocument();
    expect(screen.getByText('Portal')).toBeInTheDocument();
    expect(screen.getByText('Access Active')).toBeInTheDocument();

    const profile = screen.getByRole('menuitem', { name: /my profile/i });
    const notifications = screen.getByRole('menuitem', { name: /notifications/i });
    const settings = screen.getByRole('menuitem', { name: /settings/i });
    expect(profile).toHaveAttribute('href', '/profile');
    expect(notifications).toHaveAttribute('href', '/notifications');
    expect(settings).toHaveAttribute('href', '/settings');
    expect(within(notifications).getByText('3')).toBeInTheDocument();

    await waitFor(() => expect(profile).toHaveFocus());

    fireEvent.click(screen.getByRole('menuitem', { name: /log out/i }));
    expect(mocks.ui.setShowLogoutModal).toHaveBeenCalledWith(true);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('supports arrow navigation, Escape, and outside click dismissal', async () => {
    render(<UserMenu />);

    const trigger = screen.getByRole('button', { name: /user menu/i });
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });

    const profile = screen.getByRole('menuitem', { name: /my profile/i });
    const notifications = screen.getByRole('menuitem', { name: /notifications/i });
    await waitFor(() => expect(profile).toHaveFocus());

    fireEvent.keyDown(profile, { key: 'ArrowDown' });
    expect(notifications).toHaveFocus();

    fireEvent.keyDown(notifications, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    fireEvent.click(trigger);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('uses the admin role badge and admin settings route', () => {
    mocks.auth.isAdmin = true;
    mocks.auth.userActive = false;
    render(<UserMenu />);

    fireEvent.click(screen.getByRole('button', { name: /user menu/i }));

    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Access Restricted')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /settings/i })).toHaveAttribute(
      'href',
      '/admin/settings',
    );
  });
});
