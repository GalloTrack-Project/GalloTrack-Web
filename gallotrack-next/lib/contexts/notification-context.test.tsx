import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  NotificationProvider,
  useNotifications,
} from './notification-context';
import {
  loadNotificationStore,
  saveNotificationPreferences,
  saveNotificationState,
} from '@/lib/notifications/storage';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@/lib/notifications/types';

vi.mock('@/lib/contexts/fowl-context', () => ({
  useFowl: () => ({
    fowls: [
      {
        id: 7,
        name: 'Pearl Lemon',
        bird_code: '1A4',
        gender: 'Rooster',
        birthdate: '2026-10-12',
        status: 'Active',
        activity_status: 'active',
      },
    ],
  }),
}));

vi.mock('@/lib/notifications/storage', () => ({
  loadNotificationStore: vi.fn(),
  saveNotificationState: vi.fn(),
  saveNotificationPreferences: vi.fn(),
}));

const itemKey = '7::stag::2027-04-12::upcoming-7';
const today = new Date(2027, 3, 5);

function Harness() {
  const {
    notifications,
    unreadCount,
    error,
    usingLocalStorage,
    preferences,
    markRead,
    markAllRead,
    dismiss,
    updatePreferences,
  } = useNotifications();
  return (
    <div>
      <span data-testid="count">{unreadCount}</span>
      <span data-testid="error">{error}</span>
      <span data-testid="local">{String(usingLocalStorage)}</span>
      <span data-testid="audience">{preferences.audience}</span>
      <span data-testid="key">{notifications[0]?.key ?? ''}</span>
      <button type="button" onClick={() => void markRead(notifications[0].key)}>
        mark one
      </button>
      <button type="button" onClick={() => void markAllRead()}>
        mark all
      </button>
      <button type="button" onClick={() => void dismiss(notifications[0].key)}>
        dismiss one
      </button>
      <button
        type="button"
        onClick={() => void updatePreferences({ ...preferences, enabled: false })}
      >
        disable
      </button>
    </div>
  );
}

describe('NotificationProvider derived flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadNotificationStore).mockResolvedValue({
      preferences: DEFAULT_NOTIFICATION_PREFERENCES,
      state: {},
      mode: 'database',
    });
    vi.mocked(saveNotificationState).mockResolvedValue('database');
    vi.mocked(saveNotificationPreferences).mockResolvedValue('database');
  });

  it('derives the notification and persists a read action', async () => {
    render(
      <NotificationProvider userId="user-1" today={today}>
        <Harness />
      </NotificationProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('1'));
    expect(screen.getByTestId('key')).toHaveTextContent(itemKey);

    fireEvent.click(screen.getByRole('button', { name: 'mark one' }));
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('0'));
    expect(saveNotificationState).toHaveBeenCalledWith(
      'user-1',
      expect.arrayContaining([
        expect.objectContaining({ key: itemKey, read_at: expect.any(String) }),
      ]),
      'database',
    );
  });

  it('marks all read and dismisses items', async () => {
    render(
      <NotificationProvider userId="user-1" today={today}>
        <Harness />
      </NotificationProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('1'));
    fireEvent.click(screen.getByRole('button', { name: 'mark all' }));
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('0'));
    expect(saveNotificationState).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'dismiss one' }));
    await waitFor(() => expect(screen.getByTestId('key')).toHaveTextContent(''));
  });

  it('restores read state after reload', async () => {
    vi.mocked(loadNotificationStore).mockResolvedValue({
      preferences: DEFAULT_NOTIFICATION_PREFERENCES,
      state: {
        [itemKey]: { read_at: '2027-04-05T00:00:00.000Z', dismissed_at: null },
      },
      mode: 'database',
    });
    render(
      <NotificationProvider userId="user-1" today={today}>
        <Harness />
      </NotificationProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('0'));
    expect(screen.getByTestId('key')).toHaveTextContent(itemKey);
  });

  it('exposes the localStorage mode and saves preference changes', async () => {
    vi.mocked(loadNotificationStore).mockResolvedValue({
      preferences: DEFAULT_NOTIFICATION_PREFERENCES,
      state: {},
      mode: 'local',
    });
    render(
      <NotificationProvider userId="user-1" today={today}>
        <Harness />
      </NotificationProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('local')).toHaveTextContent('true'));
    fireEvent.click(screen.getByRole('button', { name: 'disable' }));
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('0'));
    expect(saveNotificationPreferences).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ enabled: false }),
      'local',
    );
  });
});
