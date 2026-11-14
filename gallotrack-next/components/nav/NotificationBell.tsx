'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import { useFowl } from '@/lib/contexts/fowl-context';
import { useNotifications } from '@/lib/contexts/notification-context';
import { useUI } from '@/lib/contexts/ui-context';
import { useT } from '@/lib/i18n';
import {
  notificationsAriaLabel,
  unreadBadgeText,
} from '@/lib/notifications/format';
import type {
  NotificationMember,
  NotificationView,
} from '@/lib/notifications/types';
import NotificationPanel from './NotificationPanel';

export default function NotificationBell() {
  const {
    notifications,
    unreadCount,
    loading,
    error,
    usingLocalStorage,
    markRead,
    markAllRead,
    dismiss,
  } = useNotifications();
  const fowl = useFowl();
  const ui = useUI();
  const router = useRouter();
  const t = useT();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const badge = unreadBadgeText(unreadCount);
  const ariaLabel = notificationsAriaLabel(unreadCount, t);

  const close = useCallback(() => {
    setOpen(false);
    bellRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) close();
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open, close]);

  function openFowl(fowlId: number | null, code: string) {
    if (fowlId !== null) {
      const target = fowl.fowls.find((item) => item.id === fowlId);
      if (target) {
        ui.setSelectedFowlForDetails(target);
        return;
      }
    }
    if (code) {
      router.push(`/lineage?tab=pedigree&chicken=${encodeURIComponent(code)}`);
    }
  }

  async function openNotification(notification: NotificationView) {
    await markRead(notification.key);
    openFowl(notification.fowlId, notification.fowlCode);
    close();
  }

  async function openMember(member: NotificationMember) {
    await markRead(member.key);
    openFowl(member.fowlId, member.fowlCode);
    close();
  }

  function toggle() {
    if (open) {
      close();
      return;
    }
    setOpen(true);
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        ref={bellRef}
        type="button"
        data-testid="notification-bell"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="notification-panel"
        title={ariaLabel}
        onClick={toggle}
        className="border-border bg-muted text-muted-foreground hover:border-accent/50 hover:bg-muted/60 hover:text-accent focus-visible:ring-accent relative flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border shadow-2xs transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {badge && (
          <span
            data-testid="notification-badge"
            aria-hidden="true"
            className="absolute -top-1 -right-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] leading-none font-black text-white"
          >
            {badge}
          </span>
        )}
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {ariaLabel}
      </span>

      {open && (
        <NotificationPanel
          notifications={notifications}
          unreadCount={unreadCount}
          loading={loading}
          error={error}
          usingLocalStorage={usingLocalStorage}
          onClose={close}
          onOpen={(notification) => void openNotification(notification)}
          onOpenMember={(member) => void openMember(member)}
          onMarkRead={(key) => void markRead(key)}
          onDismiss={(key) => void dismiss(key)}
          onMarkAllRead={() => void markAllRead()}
        />
      )}
    </div>
  );
}
