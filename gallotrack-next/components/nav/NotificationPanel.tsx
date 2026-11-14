'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { BellOff, CheckCircle2, X } from 'lucide-react';
import { useT } from '@/lib/i18n';
import {
  notificationBucket,
  notificationBucketLabel,
  type NotificationBucket,
} from '@/lib/notifications/format';
import type {
  NotificationMember,
  NotificationView,
} from '@/lib/notifications/types';
import NotificationItem from '@/components/notifications/NotificationItem';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const BUCKET_ORDER: NotificationBucket[] = ['today', 'thisWeek', 'later', 'earlier'];

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
}: NotificationPanelProps) {
  const t = useT();
  const firstLoad = loading && notifications.length === 0;
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const latest = notifications.slice(0, 10);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();
    const panel = panelRef.current;

    function onKeyDown(event: KeyboardEvent) {
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
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/30 sm:hidden"
      />
      <div
        ref={panelRef}
        id="notification-panel"
        role="dialog"
        aria-modal="true"
        aria-label={t('notifications.panelTitle')}
        tabIndex={-1}
        className="bg-card border-border fixed inset-x-0 bottom-0 z-50 flex max-h-[min(85vh,40rem)] flex-col overflow-hidden rounded-t-2xl border shadow-2xl sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:bottom-auto sm:mt-2 sm:max-h-[min(70vh,34rem)] sm:w-[min(25rem,calc(100vw-1.5rem))] sm:rounded-xl"
      >
        <div className="border-border flex items-center justify-between gap-3 border-b px-4 py-3">
          <div className="min-w-0">
            <p className="text-card-foreground text-sm font-black">{t('notifications.panelTitle')}</p>
            <p className="text-muted-foreground text-xs font-semibold">
              {unreadCount > 0
                ? t('notifications.unreadCount', { count: unreadCount })
                : t('notifications.allCaughtUp')}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label={t('notifications.close')}
            className="text-muted-foreground hover:text-foreground hover:bg-muted flex h-11 w-11 cursor-pointer items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {usingLocalStorage && (
          <p className="border-border bg-amber-500/10 text-amber-800 dark:text-amber-300 border-b px-4 py-2 text-xs font-semibold">
            {t('notifications.localStorageNotice')}
          </p>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto">
          {firstLoad ? (
            <div role="status" aria-label={t('notifications.loading')} className="space-y-2 p-4">
              {[0, 1, 2].map((row) => (
                <div key={row} className="bg-muted/60 h-16 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : error && notifications.length === 0 ? (
            <div className="space-y-3 p-5 text-center">
              <p className="text-card-foreground text-sm font-black">{t('notifications.loadError')}</p>
              <p className="text-muted-foreground text-xs font-semibold break-words">{error}</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="space-y-2 p-6 text-center">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300">
                <BellOff className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="text-card-foreground text-sm font-black">{t('notifications.emptyTitle')}</p>
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

        <div className="border-border flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3">
          <button
            type="button"
            onClick={onMarkAllRead}
            disabled={unreadCount === 0 || firstLoad}
            className="min-h-11 cursor-pointer rounded-md px-2 text-xs font-black text-emerald-700 transition-colors hover:bg-emerald-50 disabled:cursor-default disabled:opacity-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
          >
            {t('notifications.markAllRead')}
          </button>
          <Link
            href="/notifications"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center gap-1 px-2 text-xs font-black underline-offset-2 hover:underline"
          >
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            {t('notifications.viewAll')}
          </Link>
        </div>
      </div>
    </>
  );
}
