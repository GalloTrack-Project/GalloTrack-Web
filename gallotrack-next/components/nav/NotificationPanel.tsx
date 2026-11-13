'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { BellOff, CheckCircle2, X } from 'lucide-react';
import type { NotificationWithFowl } from '@/lib/notifications/types';
import {
  notificationStageLabel,
  relativeDateLabel,
} from '@/lib/notifications/format';

type NotificationPanelProps = {
  notifications: NotificationWithFowl[];
  unreadCount: number;
  loading: boolean;
  error: string;
  onClose: () => void;
  onRetry: () => void;
  onOpenFowl: (notification: NotificationWithFowl) => void;
  onMarkAllRead: () => void;
};

function fowlIdentity(notification: NotificationWithFowl): string {
  const name = notification.fowl?.name || 'Chicken';
  const code = notification.fowl?.bird_code;
  return code ? `${name} ${code}` : name;
}

export default function NotificationPanel({
  notifications,
  unreadCount,
  loading,
  error,
  onClose,
  onRetry,
  onOpenFowl,
  onMarkAllRead,
}: NotificationPanelProps) {
  const firstLoad = loading && notifications.length === 0;
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  return (
    <div
      id="notification-panel"
      role="dialog"
      aria-label="Notifications"
      className="bg-card border-border fixed inset-x-3 top-16 z-50 flex max-h-[min(70vh,34rem)] flex-col overflow-hidden rounded-xl border shadow-xl sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:mt-2 sm:w-[min(24rem,calc(100vw-1.5rem))]"
    >
      <div className="border-border flex items-center justify-between gap-3 border-b px-4 py-3">
        <div>
          <p className="text-card-foreground text-sm font-black">Notifications</p>
          <p className="text-muted-foreground text-xs font-semibold">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Close notifications"
          className="text-muted-foreground hover:text-foreground hover:bg-muted flex h-11 w-11 cursor-pointer items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {firstLoad ? (
          <div role="status" aria-label="Loading notifications" className="space-y-2 p-4">
            {[0, 1, 2].map((row) => (
              <div key={row} className="bg-muted/60 h-16 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : error && notifications.length === 0 ? (
          <div className="space-y-3 p-5 text-center">
            <p className="text-card-foreground text-sm font-black">Could not load notifications</p>
            <p className="text-muted-foreground text-xs font-semibold break-words">{error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="min-h-11 cursor-pointer rounded-md border border-emerald-200 bg-emerald-50 px-4 text-xs font-black text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
            >
              Try again
            </button>
          </div>
        ) : notifications.length === 0 ? (
          <div className="space-y-2 p-6 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300">
              <BellOff className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="text-card-foreground text-sm font-black">You&apos;re all caught up</p>
            <p className="text-muted-foreground text-xs font-semibold">
              Stage changes and upcoming milestones will appear here.
            </p>
          </div>
        ) : (
          <>
            {error && (
              <div className="border-b border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
                {error}{' '}
                <button type="button" onClick={onRetry} className="underline underline-offset-2">
                  Retry
                </button>
              </div>
            )}
            <ul className="divide-border divide-y">
              {notifications.map((notification) => {
                const unread = !notification.read_at;
                return (
                  <li key={notification.id}>
                    <button
                      type="button"
                      onClick={() => onOpenFowl(notification)}
                      className="hover:bg-muted/50 flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none focus-visible:ring-inset"
                      aria-label={`${fowlIdentity(notification)}, ${notificationStageLabel(notification)}, ${relativeDateLabel(notification.due_date)}${unread ? ', unread' : ''}`}
                    >
                      <span
                        aria-hidden="true"
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${unread ? 'bg-emerald-500' : 'bg-transparent'}`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
                          <span className="text-card-foreground text-xs font-black">
                            {notification.fowl?.name || 'Chicken'}{' '}
                            <span className="text-muted-foreground font-mono font-bold">
                              {notification.fowl?.bird_code || ''}
                            </span>
                          </span>
                          <span className="text-muted-foreground shrink-0 text-xs font-semibold">
                            {relativeDateLabel(notification.due_date)}
                          </span>
                        </span>
                        <span className="mt-0.5 block text-xs font-bold text-emerald-700 dark:text-emerald-300">
                          {notificationStageLabel(notification)}
                        </span>
                        {unread && (
                          <span className="mt-1 inline-flex items-center gap-1 text-xs font-black tracking-wide text-emerald-700 uppercase dark:text-emerald-300">
                            <span
                              aria-hidden="true"
                              className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                            />
                            Unread
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      <div className="border-border flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3">
        <button
          type="button"
          onClick={onMarkAllRead}
          disabled={unreadCount === 0 || firstLoad}
          className="min-h-11 cursor-pointer rounded-md px-2 text-xs font-black text-emerald-700 transition-colors hover:bg-emerald-50 disabled:cursor-default disabled:opacity-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
        >
          Mark all as read
        </button>
        <Link
          href="/milestones"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center gap-1 px-2 text-xs font-black underline-offset-2 hover:underline"
        >
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          View all milestones
        </Link>
      </div>
    </div>
  );
}
