import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import NotificationBell from './NotificationBell';
import { NotificationProvider } from '@/lib/contexts/notification-context';
import {
  fetchNotifications,
  fetchUnreadNotificationCount,
  markNotificationRead,
} from '@/lib/notifications/service';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

vi.mock('@/lib/contexts/fowl-context', () => ({
  useFowl: () => ({ fowls: [{ id: 7, name: 'Pearl Lemon', bird_code: '1A4' }] }),
}));

vi.mock('@/lib/contexts/ui-context', () => ({
  useUI: () => ({ setSelectedFowlForDetails: vi.fn() }),
}));

vi.mock('@/lib/notifications/service', () => ({
  fetchNotifications: vi.fn(),
  fetchUnreadNotificationCount: vi.fn(),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
}));

const item = {
  id: 1,
  user_id: 'u1',
  type: 'stage_upcoming' as const,
  fowl_id: 7,
  stage: 'Stag',
  title: 'Stag coming up',
  body: 'body',
  due_date: '2026-11-18',
  read_at: null,
  created_at: '2026-11-13T00:00:00Z',
  fowl: { id: 7, name: 'Pearl Lemon', bird_code: '1A4' },
};

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchNotifications).mockResolvedValue({ data: [item] });
    vi.mocked(fetchUnreadNotificationCount).mockResolvedValue({ count: 10 });
    vi.mocked(markNotificationRead).mockResolvedValue({});
  });

  it('exposes the unread count, uses a 44px target, and caps the badge at 9+', async () => {
    render(
      <NotificationProvider userId="u1">
        <NotificationBell />
      </NotificationProvider>,
    );
    const bell = await screen.findByRole('button', { name: 'Notifications, 10 unread' });
    expect(bell).toHaveClass('h-11', 'w-11');
    expect(screen.getByTestId('notification-badge')).toHaveTextContent('9+');
  });

  it('opens the panel, marks an item read, and closes on Escape', async () => {
    render(
      <NotificationProvider userId="u1">
        <NotificationBell />
      </NotificationProvider>,
    );
    const bell = await screen.findByRole('button', { name: 'Notifications, 10 unread' });
    fireEvent.click(bell);
    expect(await screen.findByRole('dialog', { name: 'Notifications' })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Notifications' })).not.toBeInTheDocument(),
    );

    fireEvent.click(bell);
    expect(await screen.findByText('Stag coming up')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Pearl Lemon/ }));
    await waitFor(() => expect(markNotificationRead).toHaveBeenCalledWith(1));
  });
});
