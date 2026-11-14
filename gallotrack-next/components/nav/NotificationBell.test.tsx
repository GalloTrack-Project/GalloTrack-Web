import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import NotificationBell from './NotificationBell';
import { useNotifications } from '@/lib/contexts/notification-context';
import type { NotificationView } from '@/lib/notifications/types';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

vi.mock('@/lib/contexts/fowl-context', () => ({
  useFowl: () => ({ fowls: [{ id: 7, name: 'Pearl Lemon', bird_code: '1A4' }] }),
}));

vi.mock('@/lib/contexts/ui-context', () => ({
  useUI: () => ({ setSelectedFowlForDetails: vi.fn() }),
}));

vi.mock('@/lib/contexts/notification-context', () => ({
  useNotifications: vi.fn(),
}));

const today = new Date();
const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
  today.getDate(),
).padStart(2, '0')}`;

const member = {
  key: '7::stag::2027-04-12::upcoming-7',
  fowlId: 7,
  fowlName: 'Pearl Lemon',
  fowlCode: '1A4',
  fowlInitials: 'PL',
  gender: 'Rooster',
  currentStage: 'Chick',
  stageKey: 'stag' as const,
  stageLabel: 'Stag',
  targetDate: todayKey,
  type: 'today' as const,
  daysUntil: 0,
  leadType: 'today',
  fullyMature: false,
  message: 'Pearl Lemon (1A4) is now a Stag.',
};

const notification: NotificationView = {
  key: member.key,
  type: member.type,
  stageKey: member.stageKey,
  stageLabel: member.stageLabel,
  fullyMature: false,
  targetDate: todayKey,
  daysUntil: 0,
  fowlId: 7,
  fowlName: 'Pearl Lemon',
  fowlCode: '1A4',
  fowlInitials: 'PL',
  message: member.message,
  isGroup: false,
  groupCount: 1,
  groupLabel: 'Stag',
  members: [member],
  memberKeys: [member.key],
  read_at: null,
  dismissed_at: null,
};

const markRead = vi.fn();
const markAllRead = vi.fn();
const dismiss = vi.fn();

function mockContext(unreadCount = 100) {
  vi.mocked(useNotifications).mockReturnValue({
    notifications: [notification],
    unreadCount,
    loading: false,
    error: '',
    usingLocalStorage: false,
    preferences: {
      enabled: true,
      stages: { stag: true, 'bull-stag': true, cock: true },
      leadDays: [7, 0],
      audience: 'both',
    },
    refresh: vi.fn(),
    markRead,
    markAllRead,
    dismiss,
    updatePreferences: vi.fn(),
    resetPreferences: vi.fn(),
  });
}

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    markRead.mockResolvedValue(undefined);
    markAllRead.mockResolvedValue(undefined);
    dismiss.mockResolvedValue(undefined);
    mockContext();
  });

  it('exposes an expanded 99+ badge and a 44px target', () => {
    render(<NotificationBell />);
    const bell = screen.getByRole('button', { name: 'Notifications, 100 unread' });
    expect(bell).toHaveClass('h-11', 'w-11');
    expect(bell).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByTestId('notification-badge')).toHaveTextContent('99+');
  });

  it('opens the panel, marks read, dismisses, and closes on Escape with focus restored', async () => {
    render(<NotificationBell />);
    const bell = screen.getByRole('button', { name: 'Notifications, 100 unread' });
    fireEvent.click(bell);
    expect(await screen.findByRole('dialog', { name: 'Notifications' })).toBeInTheDocument();
    expect(bell).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByText('Pearl Lemon (1A4) is now a Stag.')[0]).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Mark as read' }));
    expect(markRead).toHaveBeenCalledWith(notification.key);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(dismiss).toHaveBeenCalledWith(notification.key);

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Notifications' })).not.toBeInTheDocument(),
    );
    expect(bell).toHaveFocus();
  });

  it('links View all to /notifications and marks all read', async () => {
    render(<NotificationBell />);
    fireEvent.click(screen.getByRole('button', { name: 'Notifications, 100 unread' }));
    expect(await screen.findByRole('link', { name: /View all notifications/ })).toHaveAttribute(
      'href',
      '/notifications',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Mark all as read' }));
    expect(markAllRead).toHaveBeenCalled();
  });
});
