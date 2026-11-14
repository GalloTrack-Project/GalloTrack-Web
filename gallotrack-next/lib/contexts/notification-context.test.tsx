import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  NotificationProvider,
  useNotifications,
} from './notification-context';
import {
  fetchNotifications,
  fetchUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/notifications/service';

vi.mock('@/lib/notifications/service', () => ({
  fetchNotifications: vi.fn(),
  fetchUnreadNotificationCount: vi.fn(),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
}));

function Harness() {
  const { unreadCount, error, markRead, markAllRead } = useNotifications();
  return (
    <div>
      <span data-testid="count">{unreadCount}</span>
      <span data-testid="error">{error}</span>
      <button type="button" onClick={() => void markRead(1)}>
        mark one
      </button>
      <button type="button" onClick={() => void markAllRead()}>
        mark all
      </button>
    </div>
  );
}

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

describe('NotificationProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchNotifications).mockResolvedValue({ data: [item] });
    vi.mocked(fetchUnreadNotificationCount).mockResolvedValue({ count: 1 });
    vi.mocked(markNotificationRead).mockResolvedValue({});
    vi.mocked(markAllNotificationsRead).mockResolvedValue({ count: 1 });
  });

  it('loads the unread count and clears it after mark read', async () => {
    render(
      <NotificationProvider userId="u1">
        <Harness />
      </NotificationProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('1'));

    fireEvent.click(screen.getByRole('button', { name: 'mark one' }));
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('0'));
    expect(markNotificationRead).toHaveBeenCalledWith(1);
  });

  it('marks all notifications read', async () => {
    render(
      <NotificationProvider userId="u1">
        <Harness />
      </NotificationProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('1'));

    fireEvent.click(screen.getByRole('button', { name: 'mark all' }));
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('0'));
    expect(markAllNotificationsRead).toHaveBeenCalled();
  });

  it('surfaces service errors', async () => {
    vi.mocked(fetchNotifications).mockResolvedValue({ data: [], error: 'Notifications unavailable.' });
    vi.mocked(fetchUnreadNotificationCount).mockResolvedValue({
      count: 0,
      error: 'Notifications unavailable.',
    });
    render(
      <NotificationProvider userId="u1">
        <Harness />
      </NotificationProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('error')).toHaveTextContent('Notifications unavailable.'),
    );
  });
});
