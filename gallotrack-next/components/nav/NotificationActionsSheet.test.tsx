import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import NotificationActionsSheet from './NotificationActionsSheet';

function renderSheet(
  overrides: Partial<React.ComponentProps<typeof NotificationActionsSheet>> = {},
) {
  const props: React.ComponentProps<typeof NotificationActionsSheet> = {
    open: true,
    unreadCount: 1,
    hasRead: true,
    hasNotifications: true,
    onClose: vi.fn(),
    onMarkAllRead: vi.fn(),
    onClearRead: vi.fn(),
    onClearAll: vi.fn(),
    onRefresh: vi.fn(),
    ...overrides,
  };
  return { props, ...render(<NotificationActionsSheet {...props} />) };
}

describe('NotificationActionsSheet', () => {
  it('renders the action menu and exposes settings and view-all links', () => {
    renderSheet();
    expect(screen.getByRole('dialog', { name: 'Notification actions' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    expect(screen.getByRole('link', { name: /View all notifications/ })).toHaveAttribute(
      'href',
      '/notifications',
    );
    expect(screen.getByRole('link', { name: 'Notification settings' })).toHaveAttribute(
      'href',
      '/settings?tab=notifications',
    );
  });

  it('runs mark-all, clear-read, refresh, and closes after each action', () => {
    const { props } = renderSheet();
    fireEvent.click(screen.getByRole('button', { name: 'Mark all as read' }));
    expect(props.onMarkAllRead).toHaveBeenCalled();
    expect(props.onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Clear read notifications' }));
    expect(props.onClearRead).toHaveBeenCalled();
    expect(props.onClose).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole('button', { name: 'Refresh notifications' }));
    expect(props.onRefresh).toHaveBeenCalled();
    expect(props.onClose).toHaveBeenCalledTimes(3);
  });

  it('requires confirmation before clearing everything', () => {
    const { props } = renderSheet();
    fireEvent.click(screen.getByRole('button', { name: 'Clear all notifications' }));
    expect(screen.getByRole('dialog', { name: 'Clear all notifications?' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(props.onClearAll).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Clear all notifications' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear all notifications' }));
    expect(props.onClearAll).toHaveBeenCalled();
    expect(props.onClose).toHaveBeenCalled();
  });

  it('closes with Escape', () => {
    const { props } = renderSheet();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(props.onClose).toHaveBeenCalled();
  });
});
