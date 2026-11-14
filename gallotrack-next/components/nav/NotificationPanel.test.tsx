import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import NotificationPanel from './NotificationPanel';
import type { NotificationWithFowl } from '@/lib/notifications/types';

const dueInFiveDays = (() => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 5);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
})();

const notification = (
  overrides: Partial<NotificationWithFowl> = {},
): NotificationWithFowl => ({
  id: 1,
  user_id: 'u1',
  type: 'stage_upcoming',
  fowl_id: 7,
  stage: 'Stag',
  title: 'Stag coming up',
  body: 'Pearl Lemon (1A4) is expected to reach Stag.',
  due_date: dueInFiveDays,
  read_at: null,
  created_at: '2026-11-13T00:00:00Z',
  fowl: { id: 7, name: 'Pearl Lemon', bird_code: '1A4' },
  ...overrides,
});

function renderPanel(overrides: Partial<React.ComponentProps<typeof NotificationPanel>> = {}) {
  return render(
    <NotificationPanel
      notifications={[notification()]}
      unreadCount={1}
      loading={false}
      error=""
      onClose={vi.fn()}
      onRetry={vi.fn()}
      onOpenFowl={vi.fn()}
      onMarkAllRead={vi.fn()}
      {...overrides}
    />,
  );
}

describe('NotificationPanel', () => {
  it('shows the chicken, identifier, stage and relative date', () => {
    renderPanel();
    expect(screen.getByText('Pearl Lemon')).toBeInTheDocument();
    expect(screen.getByText('1A4')).toBeInTheDocument();
    expect(screen.getByText('Stag coming up')).toBeInTheDocument();
    expect(screen.getByText('Unread')).toBeInTheDocument();
    expect(screen.getByText('In 5 days')).toBeInTheDocument();
  });

  it('opens the chicken when an item is clicked', () => {
    const onOpenFowl = vi.fn();
    renderPanel({ onOpenFowl });
    fireEvent.click(screen.getByRole('button', { name: /Pearl Lemon/ }));
    expect(onOpenFowl).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  });

  it('shows the empty state', () => {
    renderPanel({ notifications: [], unreadCount: 0 });
    expect(screen.getByText("You're all caught up")).toBeInTheDocument();
    expect(screen.getByText(/Stage changes and upcoming milestones/)).toBeInTheDocument();
  });

  it('shows loading and error states', () => {
    const { rerender } = renderPanel({ notifications: [], loading: true });
    expect(screen.getByRole('status', { name: 'Loading notifications' })).toBeInTheDocument();

    rerender(
      <NotificationPanel
        notifications={[]}
        unreadCount={0}
        loading={false}
        error="Notifications are unavailable."
        onClose={vi.fn()}
        onRetry={vi.fn()}
        onOpenFowl={vi.fn()}
        onMarkAllRead={vi.fn()}
      />,
    );
    expect(screen.getByText('Could not load notifications')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('marks all as read and disables the action when there are no unread items', () => {
    const onMarkAllRead = vi.fn();
    const { rerender } = renderPanel({ onMarkAllRead });
    fireEvent.click(screen.getByRole('button', { name: 'Mark all as read' }));
    expect(onMarkAllRead).toHaveBeenCalled();

    rerender(
      <NotificationPanel
        notifications={[notification({ read_at: '2026-11-13T00:00:00Z' })]}
        unreadCount={0}
        loading={false}
        error=""
        onClose={vi.fn()}
        onRetry={vi.fn()}
        onOpenFowl={vi.fn()}
        onMarkAllRead={onMarkAllRead}
      />,
    );
    expect(screen.getByRole('button', { name: 'Mark all as read' })).toBeDisabled();
  });
});
