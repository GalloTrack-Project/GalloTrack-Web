'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, BellOff, Menu, X } from 'lucide-react';
import { useT } from '@/lib/i18n';
import {
  notificationBucket,
  notificationBucketLabel,
  type NotificationBucket,
} from '@/lib/notifications/format';
import type { NotificationMember, NotificationView } from '@/lib/notifications/types';
import NotificationItem from '@/components/notifications/NotificationItem';
import NotificationActionsSheet from './NotificationActionsSheet';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const BUCKET_ORDER: NotificationBucket[] = ['today', 'thisWeek', 'later', 'earlier'];

type NotificationTab = 'all' | 'unread';

type NotificationPanelProps = {
  notifications: NotificationView[];
  unreadCount: number;
  loading: boolean;
  error: string;
  usingLocalStorage: boolean;
  onClose: () => void;
  onOpen: (notification: NotificationView) => void;
  onOpenMember: (member: NotificationMember) => void;
  onMarkRead: (key: string) => void;
  onDismiss: (key: string) => void;
  onMarkAllRead: () => void;
  onClearRead: () => void;
  onClearAll: () => void;
  onRefresh: () => void;
};

export default function NotificationPanel({
  notifications,
  unreadCount,
  loading,
  error,
  usingLocalStorage,
  onClose,
  onOpen,
  onOpenMember,
  onMarkRead,
  onDismiss,
  onMarkAllRead,
  onClearRead,
  onClearAll,
  onRefresh,
}: NotificationPanelProps) {
  const t = useT();
  const [tab, setTab] = useState<NotificationTab>('all');
  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsOpenRef = useRef(false);
  useEffect(() => {
    actionsOpenRef.current = actionsOpen;
  }, [actionsOpen]);
  const firstLoad = loading && notifications.length === 0;
  const hasRead = notifications.some((notification) => Boolean(notification.read_at));
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const filtered =
    tab === 'unread'
      ? notifications.filter((notification) => !notification.read_at)
      : notifications;
  const latest = filtered.slice(0, 10);

  useEffect(() => {
    if (typeof window === 'undefined' || window.innerWidth >= 640) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();
    const panel = panelRef.current;

    function onKeyDown(event: KeyboardEvent) {
      if (actionsOpenRef.current) return;
      if (document.querySelector('[data-notification-menu]')) return;
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (items.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey) {
        if (active === first || !panel.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || !panel.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      previous?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      ref={panelRef}
      id="notification-panel"
      role="dialog"
      aria-modal="true"
      aria-hidden={actionsOpen || undefined}
      aria-label={t('notifications.panelTitle')}
      tabIndex={-1}
      className="bg-card sm:border-border fixed inset-0 z-50 flex h-[100dvh] w-full flex-col overflow-hidden rounded-none border-0 shadow-2xl sm:absolute sm:inset-auto sm:top-full sm:right-0 sm:mt-2 sm:h-auto sm:max-h-[min(70vh,34rem)] sm:w-[24rem] sm:rounded-xl sm:border"
    >
      <div className="border-border flex items-center justify-between gap-3 border-b px-4 py-3">
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label={t('notifications.close')}
          className="text-muted-foreground hover:text-foreground hover:bg-muted order-1 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none sm:order-3"
        >
          <ArrowLeft className="h-5 w-5 sm:hidden" aria-hidden="true" />
          <X className="hidden h-4 w-4 sm:block" aria-hidden="true" />
        </button>
        <div className="order-2 min-w-0 flex-1 sm:order-1">
          <p className="text-card-foreground text-base font-black sm:text-sm">
            {t('notifications.panelTitle')}
          </p>
          <p className="text-muted-foreground text-xs font-semibold">
            {unreadCount > 0
              ? t('notifications.unreadCount', { count: unreadCount })
              : t('notifications.allCaughtUp')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setActionsOpen(true)}
          aria-label={t('notifications.moreActions')}
          aria-haspopup="dialog"
          aria-expanded={actionsOpen}
          className="text-muted-foreground hover:text-foreground hover:bg-muted order-3 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none sm:order-2"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div
        role="tablist"
        aria-label={t('notifications.filtersLabel')}
        className="border-border flex border-b px-2"
      >
        {(
          [
            ['all', t('notifications.filterAll'), notifications.length],
            ['unread', t('notifications.filterUnread'), unreadCount],
          ] as const
        ).map(([id, label, count]) => {
          const selected = tab === id;
          return (
            <button
              key={id}
              id={`notification-tab-${id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls="notification-feed"
              onClick={() => setTab(id)}
              onKeyDown={(event) => {
                if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
                event.preventDefault();
                const next = id === 'all' ? 'unread' : 'all';
                setTab(next);
                document.getElementById(`notification-tab-${next}`)?.focus();
              }}
              className={`relative flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 px-3 text-xs font-black transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none focus-visible:ring-inset ${
                selected
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
              <span className="bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[10px] leading-none">
                {count}
              </span>
              {selected && (
                <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
              )}
            </button>
          );
        })}
      </div>

      {usingLocalStorage && (
        <p className="border-border border-b bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
          {t('notifications.localStorageNotice')}
        </p>
      )}

      <div
        id="notification-feed"
        role="tabpanel"
        aria-labelledby={`notification-tab-${tab}`}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        {firstLoad ? (
          <div role="status" aria-label={t('notifications.loading')} className="space-y-2 p-4">
            {[0, 1, 2].map((row) => (
              <div key={row} className="bg-muted/60 h-16 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : error && notifications.length === 0 ? (
          <div className="space-y-3 p-5 text-center">
            <p className="text-card-foreground text-sm font-black">
              {t('notifications.loadError')}
            </p>
            <p className="text-muted-foreground text-xs font-semibold break-words">{error}</p>
          </div>
        ) : latest.length === 0 ? (
          <div className="space-y-2 p-6 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300">
              <BellOff className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="text-card-foreground text-sm font-black">
              {t('notifications.emptyTitle')}
            </p>
            <p className="text-muted-foreground text-xs font-semibold">
              {t('notifications.emptyDescription')}
            </p>
          </div>
        ) : (
          BUCKET_ORDER.map((bucket) => {
            const items = latest.filter(
              (notification) => notificationBucket(notification.targetDate) === bucket,
            );
            if (items.length === 0) return null;
            return (
              <section key={bucket} aria-label={notificationBucketLabel(bucket, t)}>
                <h3 className="bg-muted/40 text-muted-foreground border-border border-b px-4 py-1.5 text-xs font-black tracking-widest uppercase">
                  {notificationBucketLabel(bucket, t)}
                </h3>
                <ul>
                  {items.map((notification) => (
                    <NotificationItem
                      key={notification.key}
                      notification={notification}
                      onOpen={onOpen}
                      onOpenMember={onOpenMember}
                      onMarkRead={onMarkRead}
                      onDismiss={onDismiss}
                      compact
                    />
                  ))}
                </ul>
              </section>
            );
          })
        )}
      </div>

      {actionsOpen && (
        <NotificationActionsSheet
          open
          unreadCount={unreadCount}
          hasRead={hasRead}
          hasNotifications={notifications.length > 0}
          onClose={() => setActionsOpen(false)}
          onMarkAllRead={() => void onMarkAllRead()}
          onClearRead={() => void onClearRead()}
          onClearAll={() => void onClearAll()}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
}
