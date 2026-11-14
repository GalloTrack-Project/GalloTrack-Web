import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import NotificationsPage from './page';
import { useNotifications } from '@/lib/contexts/notification-context';
import type { NotificationMember, NotificationView } from '@/lib/notifications/types';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/lib/contexts/fowl-context', () => ({
  useFowl: () => ({ fowls: [] }),
}));

vi.mock('@/lib/contexts/ui-context', () => ({
  useUI: () => ({ setSelectedFowlForDetails: vi.fn() }),
}));

vi.mock('@/lib/contexts/notification-context', () => ({
  useNotifications: vi.fn(),
}));

const markRead = vi.fn();
const dismiss = vi.fn();
const markAllRead = vi.fn();

function dateKey(offset: number): string {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

function item(index: number, type: NotificationMember['type'] = 'today'): NotificationView {
  const targetDate = dateKey(index - 3);
  const member: NotificationMember = {
    key: `${index}::stag::${targetDate}::${type}`,
    fowlId: index,
    fowlName: `Chicken ${index}`,
    fowlCode: `1A${index}`,
    fowlInitials: 'C',
    gender: 'Rooster',
    currentStage: 'Chick',
    stageKey: 'stag',
    stageLabel: 'Stag',
    targetDate,
    type,
    daysUntil: 0,
    leadType: type,
    fullyMature: false,
    message: `Chicken ${index} (1A${index}) is now a Stag.`,
  };
  return {
    key: member.key,
    type,
    stageKey: 'stag',
    stageLabel: 'Stag',
    fullyMature: false,
    targetDate,
    daysUntil: 0,
    fowlId: index,
    fowlName: member.fowlName,
    fowlCode: member.fowlCode,
    fowlInitials: 'C',
    message: member.message,
    isGroup: false,
    groupCount: 1,
    groupLabel: 'Stag',
    members: [member],
    memberKeys: [member.key],
    read_at: null,
    dismissed_at: null,
  };
}

const notifications = Array.from({ length: 12 }, (_, index) =>
  item(index + 1, index === 11 ? 'reached' : 'today'),
);

function mockContext() {
  vi.mocked(useNotifications).mockReturnValue({
    notifications,
    unreadCount: 12,
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

describe('NotificationsPage', () => {
  it('filters by type, searches, and paginates', () => {
    mockContext();
    render(<NotificationsPage />);
    expect(screen.getByRole('heading', { name: /Notifications/ })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(10);

    fireEvent.click(screen.getByRole('button', { name: 'Reached (1)' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText('Chicken 12')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'All (12)' }));
    fireEvent.change(screen.getByPlaceholderText('Search notifications...'), {
      target: { value: 'Chicken 3' },
    });
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText('Chicken 3')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Search notifications...'), {
      target: { value: '' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('marks an item read when opened', () => {
    mockContext();
    render(<NotificationsPage />);
    fireEvent.click(screen.getByRole('button', { name: /^Chicken 1,/ }));
    expect(markRead).toHaveBeenCalled();
  });

  it('shows the localStorage fallback notice', () => {
    mockContext();
    vi.mocked(useNotifications).mockReturnValue({
      ...vi.mocked(useNotifications).mock.results[0].value,
      usingLocalStorage: true,
    });
    render(<NotificationsPage />);
    expect(
      screen.getByText('Notification settings are saved on this device only'),
    ).toBeInTheDocument();
  });
});
