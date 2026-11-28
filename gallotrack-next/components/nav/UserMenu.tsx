'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Bell, ChevronDown, LogOut, Moon, Settings, Sun, User } from 'lucide-react';
import { CompactLanguageSwitcher } from '@/components/i18n/LanguageSwitcher';
import { cn } from '@/components/ui';
import { useAuth } from '@/lib/contexts/auth-context';
import { useNotificationUnreadCount } from '@/lib/contexts/notification-context';
import { useUI } from '@/lib/contexts/ui-context';
import { useT } from '@/lib/i18n';
import { unreadBadgeText } from '@/lib/notifications/format';

export default function UserMenu() {
  const auth = useAuth();
  const ui = useUI();
  const t = useT();
  const { resolvedTheme, setTheme } = useTheme();
  const unreadCount = useNotificationUnreadCount();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const initialFocus = useRef<'first' | 'last'>('first');
  const menuId = useId();
  const badge = unreadBadgeText(unreadCount);
  const settingsHref = auth.isAdmin ? '/admin/settings' : '/settings';

  useEffect(() => {
    if (!open) return;

    const items = () =>
      Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const target = initialFocus.current === 'last' ? items().at(-1) : items()[0];
    target?.focus();

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const closeMenu = (restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  };

  const openMenu = (focus: 'first' | 'last' = 'first') => {
    initialFocus.current = focus;
    setOpen(true);
  };

  const onTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openMenu('first');
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      openMenu('last');
    } else if (event.key === 'Escape') {
      closeMenu();
    }
  };

  const onMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Tab') {
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu(true);
      return;
    }

    const target = event.target as HTMLElement;
    if (!target.closest('[role="menuitem"]')) return;

    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
    );
    if (items.length === 0) return;

    const current = items.indexOf(target.closest('[role="menuitem"]') as HTMLElement);
    let next = current;

    if (event.key === 'ArrowDown') next = (current + 1) % items.length;
    else if (event.key === 'ArrowUp') next = (current - 1 + items.length) % items.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = items.length - 1;
    else return;

    event.preventDefault();
    items[next]?.focus();
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={onTriggerKeyDown}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={t('header.userMenu')}
        className="border-border bg-card hover:bg-muted focus-visible:ring-ring flex h-11 cursor-pointer items-center gap-2 rounded-full border p-1 pr-2 focus-visible:ring-2 focus-visible:outline-none"
      >
        {auth.avatarUrl ? (
          <img src={auth.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
        ) : (
          <span className="bg-accent-soft text-accent flex h-9 w-9 items-center justify-center rounded-full">
            <User className="h-4 w-4" aria-hidden="true" />
          </span>
        )}
        <ChevronDown
          className={cn(
            'text-muted-foreground h-4 w-4 transition-transform',
            open && 'rotate-180',
          )}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          id={menuId}
          ref={menuRef}
          role="menu"
          tabIndex={-1}
          aria-label={t('header.userMenu')}
          onKeyDown={onMenuKeyDown}
          className="border-border bg-popover text-popover-foreground animate-fadeIn absolute top-full right-0 z-50 mt-2 max-h-[min(80dvh,36rem)] w-[calc(100vw-1.5rem)] max-w-sm overflow-y-auto rounded-2xl border p-2 shadow-[0_18px_50px_-18px_rgba(0,0,0,0.35)] sm:w-[280px] sm:min-w-[260px]"
        >
          <div className="flex items-center gap-3 px-2 pb-3">
            {auth.avatarUrl ? (
              <img
                src={auth.avatarUrl}
                alt=""
                className="border-border h-11 w-11 shrink-0 rounded-full border object-cover"
              />
            ) : (
              <span className="bg-accent-soft text-accent border-border flex h-11 w-11 shrink-0 items-center justify-center rounded-full border">
                <User className="h-5 w-5" aria-hidden="true" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-foreground truncate text-sm font-black">{auth.adminName}</p>
              <p className="text-muted-foreground truncate text-xs font-semibold">
                {auth.email || auth.username}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span className="bg-accent-soft text-accent border-primary/15 rounded-full border px-2 py-0.5 text-[10px] font-black tracking-wider uppercase">
                  {auth.isAdmin ? t('header.adminPortal') : t('header.portal')}
                </span>
                <span className="text-muted-foreground inline-flex items-center gap-1 text-[10px] font-bold uppercase">
                  <span
                    aria-hidden="true"
                    className={cn(
                      'h-1.5 w-1.5 rounded-full',
                      auth.userActive ? 'bg-emerald-500' : 'bg-rose-500',
                    )}
                  />
                  {auth.userActive ? t('header.accessActive') : t('header.accessRestricted')}
                </span>
              </div>
            </div>
          </div>

          <div className="border-border border-t py-1">
            <Link
              href="/profile"
              role="menuitem"
              onClick={() => closeMenu()}
              className="text-foreground hover:bg-muted focus-visible:ring-ring flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              <User className="text-muted-foreground h-4 w-4" aria-hidden="true" />
              {t('nav.profile')}
            </Link>
            <Link
              href="/notifications"
              role="menuitem"
              onClick={() => closeMenu()}
              className="text-foreground hover:bg-muted focus-visible:ring-ring flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              <Bell className="text-muted-foreground h-4 w-4" aria-hidden="true" />
              <span className="min-w-0 flex-1">{t('nav.notifications')}</span>
              {badge ? (
                <span className="bg-brand-red flex min-h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-black text-white">
                  {badge}
                </span>
              ) : null}
            </Link>
            <Link
              href={settingsHref}
              role="menuitem"
              onClick={() => closeMenu()}
              className="text-foreground hover:bg-muted focus-visible:ring-ring flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              <Settings className="text-muted-foreground h-4 w-4" aria-hidden="true" />
              {t('header.settings')}
            </Link>
          </div>

          <div className="border-border space-y-1 border-t py-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              className="text-foreground hover:bg-muted focus-visible:ring-ring flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 text-left text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="text-muted-foreground h-4 w-4" aria-hidden="true" />
              ) : (
                <Moon className="text-muted-foreground h-4 w-4" aria-hidden="true" />
              )}
              {resolvedTheme === 'dark' ? t('header.switchToLight') : t('header.switchToDark')}
            </button>
            <div className="flex min-h-11 items-center justify-between gap-2 rounded-lg px-3">
              <span className="text-muted-foreground text-xs font-semibold">
                {t('header.languageSwitcher')}
              </span>
              <CompactLanguageSwitcher />
            </div>
          </div>

          <div className="border-border border-t pt-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                closeMenu();
                ui.setShowLogoutModal(true);
              }}
              className="text-danger focus-visible:ring-ring flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 text-left text-sm font-semibold transition-colors hover:bg-[#FEE2E2] focus-visible:ring-2 focus-visible:outline-none dark:hover:bg-red-950/40"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              {t('nav.logout')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
