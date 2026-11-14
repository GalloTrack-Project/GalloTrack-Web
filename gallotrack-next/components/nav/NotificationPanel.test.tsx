import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import NotificationPanel from './NotificationPanel';
import type { NotificationMember, NotificationView } from '@/lib/notifications/types';

function keyForDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

function offsetDate(days: number): string {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return keyForDate(date);
}

const member = (index = 1, targetDate = offsetDate(0)): NotificationMember => ({
  key: `7::stag::${targetDate}::today`,
  fowlId: 7 + index,
  fowlName: `Pearl Lemon ${index}`,
  fowlCode: `1A${index}`,
  fowlInitials: 'PL',
  gender: 'Rooster',
  currentStage: 'Chick',
  stageKey: 'stag',
  stageLabel: 'Stag',
  targetDate,
  type: 'today',
  daysUntil: 0,
  leadType: 'today',
  fullyMature: false,
  message: `Pearl Lemon ${index} (1A${index}) is now a Stag.`,
});

function notification(overrides: Partial<NotificationView> = {}): NotificationView {
  const item = member(1, overrides.targetDate ?? offsetDate(0));
  return {
    key: item.key,
    type: item.type,
    stageKey: item.stageKey,
    stageLabel: item.stageLabel,
    fullyMature: false,
    targetDate: item.targetDate,
    daysUntil: 0,
    fowlId: item.fowlId,
    fowlName: item.fowlName,
    fowlCode: item.fowlCode,
    fowlInitials: item.fowlInitials,
    message: item.message,
    isGroup: false,
    groupCount: 1,
    groupLabel: 'Stag',
    members: [item],
    memberKeys: [item.key],
    read_at: null,
    dismissed_at: null,
    ...overrides,
  };
}

function groupNotification(): NotificationView {
  const members = [1, 2, 3, 4, 5].map((index) => member(index, offsetDate(-index)));
  return {
    ...notification(),
    key: 'group::stag::week::reached',
    type: 'reached',
    stageLabel: 'Stag / Pullet',
    groupLabel: 'Stag / Pullet',
    targetDate: members[0].targetDate,
    isGroup: true,
    groupCount: 5,
    members,
    memberKeys: members.map((item) => item.key),
    fowlId: null,
    fowlName: '5 chickens',
    message: '5 chickens reached Stag / Pullet this week.',
  };
}

function renderPanel(overrides: Partial<React.ComponentProps<typeof NotificationPanel>> = {}) {
  return render(
    <NotificationPanel
      notifications={[notification()]}
      unreadCount={1}
      loading={false}
      error=""
      usingLocalStorage={false}
      onClose={vi.fn()}
      onOpen={vi.fn()}
      onOpenMember={vi.fn()}
      onMarkRead={vi.fn()}
      onDismiss={vi.fn()}
      onMarkAllRead={vi.fn()}
      {...overrides}
    />,
  );
}

describe('NotificationPanel', () => {
  it('uses a bottom sheet on mobile and exposes a focus trap', () => {
    const onClose = vi.fn();
    renderPanel({ onClose });
    const panel = screen.getByRole('dialog', { name: 'Notifications' });
    expect(panel.className).toContain('bottom-0');
    expect(panel.className).toContain('rounded-t-2xl');
    expect(panel).toHaveAttribute('aria-modal', 'true');
    const close = screen.getByRole('button', { name: 'Close notifications' });
    expect(close).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(screen.getByRole('link', { name: /View all notifications/ })).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(close).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('shows only the latest 10 items and groups them into Today, This week and Earlier', () => {
    const items = Array.from({ length: 12 }, (_, index) =>
      notification({
        key: `item-${index}`,
        fowlName: `Chicken ${index}`,
        targetDate: offsetDate(index === 0 ? 0 : index === 1 ? -10 : 0),
        members: [member(index + 1, offsetDate(index === 0 ? 0 : index === 1 ? -10 : 0))],
      }),
    );
    renderPanel({ notifications: items, unreadCount: 12 });
    expect(screen.getAllByRole('listitem')).toHaveLength(10);
    expect(screen.getByRole('region', { name: 'Today' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Earlier' })).toBeInTheDocument();
  });

  it('expands a grouped item and calls item actions', () => {
    const onMarkRead = vi.fn();
    const onDismiss = vi.fn();
    const onMarkAllRead = vi.fn();
    renderPanel({
      notifications: [groupNotification()],
      unreadCount: 1,
      onMarkRead,
      onDismiss,
      onMarkAllRead,
    });
    fireEvent.click(screen.getByRole('button', { name: /Show 5 chickens/ }));
    expect(screen.getByText('Pearl Lemon 1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mark as read' }));
    expect(onMarkRead).toHaveBeenCalledWith('group::stag::week::reached');
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onDismiss).toHaveBeenCalledWith('group::stag::week::reached');
    fireEvent.click(screen.getByRole('button', { name: 'Mark all as read' }));
    expect(onMarkAllRead).toHaveBeenCalled();
  });

  it('shows the empty state, error state and localStorage notice', () => {
    const { rerender } = renderPanel({ notifications: [], unreadCount: 0 });
    expect(screen.getByText("You're all caught up")).toBeInTheDocument();

    rerender(
      <NotificationPanel
        notifications={[]}
        unreadCount={0}
        loading={false}
        error="Notification data could not be loaded."
        usingLocalStorage
        onClose={vi.fn()}
        onOpen={vi.fn()}
        onOpenMember={vi.fn()}
        onMarkRead={vi.fn()}
        onDismiss={vi.fn()}
        onMarkAllRead={vi.fn()}
      />,
    );
    expect(screen.getByText('Could not load notifications')).toBeInTheDocument();
    expect(
      screen.getByText('Notification settings are saved on this device only'),
    ).toBeInTheDocument();
  });
});
