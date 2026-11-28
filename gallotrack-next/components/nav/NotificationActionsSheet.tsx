'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { CheckCheck, Eraser, ListChecks, RefreshCw, Settings, Trash2, X } from 'lucide-react';
import { useT } from '@/lib/i18n';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

type NotificationActionsSheetProps = {
  open: boolean;
  unreadCount: number;
  hasRead: boolean;
  hasNotifications: boolean;
  onClose: () => void;
  onMarkAllRead: () => void;
  onClearRead: () => void;
  onClearAll: () => void;
  onRefresh: () => void;
};

export default function NotificationActionsSheet({
  open,
  unreadCount,
  hasRead,
  hasNotifications,
  onClose,
  onMarkAllRead,
  onClearRead,
  onClearAll,
  onRefresh,
}: NotificationActionsSheetProps) {
  const t = useT();
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [confirmingClearAll, setConfirmingClearAll] = useState(false);

  useEffect(() => {
    if (!open) return;

    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !sheetRef.current) return;
      const items = Array.from(sheetRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !sheetRef.current.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !sheetRef.current.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, [onClose, open]);

  if (!open || typeof document === 'undefined') return null;

  const run = (action: () => void) => {
    action();
    onClose();
  };

  return createPortal(
    <div data-notification-actions className="fixed inset-0 z-[70] flex items-end justify-center">
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/50"
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={
          confirmingClearAll
            ? t('notifications.clearAllConfirmTitle')
            : t('notifications.actionsTitle')
        }
        className="bg-card border-border animate-fadeIn relative z-10 max-h-[min(85dvh,38rem)] w-full max-w-lg overflow-y-auto rounded-t-2xl border p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-2xl sm:mb-5 sm:rounded-2xl"
      >
        <div
          aria-hidden="true"
          className="bg-border mx-auto my-2 h-1 w-10 rounded-full sm:hidden"
        />
        <div className="flex items-center justify-between gap-3 px-2 py-2">
          <p className="text-card-foreground text-sm font-black">
            {confirmingClearAll
              ? t('notifications.clearAllConfirmTitle')
              : t('notifications.actionsTitle')}
          </p>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="text-muted-foreground hover:text-foreground hover:bg-muted flex h-10 w-10 cursor-pointer items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {confirmingClearAll ? (
          <div className="space-y-4 px-2 pb-2">
            <p className="text-muted-foreground text-sm font-semibold">
              {t('notifications.clearAllConfirmBody')}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setConfirmingClearAll(false)}
                className="border-border bg-card text-foreground hover:bg-muted min-h-11 cursor-pointer rounded-xl border text-xs font-black transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => run(onClearAll)}
                className="min-h-11 cursor-pointer rounded-xl bg-rose-600 text-xs font-black text-white transition-colors hover:bg-rose-700"
              >
                {t('notifications.clearAll')}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <Link
              href="/notifications"
              onClick={onClose}
              className="text-foreground hover:bg-muted flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-bold transition-colors"
            >
              <ListChecks className="text-muted-foreground h-5 w-5" aria-hidden="true" />
              {t('notifications.viewAll')}
            </Link>
            <button
              type="button"
              onClick={() => run(onMarkAllRead)}
              disabled={unreadCount === 0}
              className="text-foreground hover:bg-muted flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-left text-sm font-bold transition-colors disabled:cursor-default disabled:opacity-40"
            >
              <CheckCheck
                className="h-5 w-5 text-emerald-600 dark:text-emerald-400"
                aria-hidden="true"
              />
              {t('notifications.markAllRead')}
            </button>
            <Link
              href="/settings?tab=notifications"
              onClick={onClose}
              className="text-foreground hover:bg-muted flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-bold transition-colors"
            >
              <Settings className="text-muted-foreground h-5 w-5" aria-hidden="true" />
              {t('notifications.notificationSettings')}
            </Link>
            <button
              type="button"
              onClick={() => run(onClearRead)}
              disabled={!hasRead}
              className="text-foreground hover:bg-muted flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-left text-sm font-bold transition-colors disabled:cursor-default disabled:opacity-40"
            >
              <Eraser className="text-muted-foreground h-5 w-5" aria-hidden="true" />
              {t('notifications.clearRead')}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingClearAll(true)}
              disabled={!hasNotifications}
              className="text-danger flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-left text-sm font-bold transition-colors hover:bg-rose-500/10 disabled:cursor-default disabled:opacity-40"
            >
              <Trash2 className="h-5 w-5" aria-hidden="true" />
              {t('notifications.clearAll')}
            </button>
            <button
              type="button"
              onClick={() => run(onRefresh)}
              className="text-foreground hover:bg-muted flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-left text-sm font-bold transition-colors"
            >
              <RefreshCw className="text-muted-foreground h-5 w-5" aria-hidden="true" />
              {t('notifications.refresh')}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
