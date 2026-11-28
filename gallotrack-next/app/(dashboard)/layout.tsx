'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { AlertTriangle, Menu, Moon, RefreshCw, Settings, Sun, X } from 'lucide-react';
import Logo from '@/components/brand/Logo';
import { useAuth } from '@/lib/contexts/auth-context';
import { useFowl } from '@/lib/contexts/fowl-context';
import { supabase } from '@/lib/registry';
import { SkipLink, cn } from '@/components/ui';
import {
  OWNER_NAV,
  ADMIN_NAV,
  isActiveNav,
  findActiveNav,
  groupNavItems,
  getPageTitle,
  getTranslatedNavItems,
  type NavItem,
} from '@/lib/nav-manifest';
import GlobalSearch from '@/components/nav/GlobalSearch';
import NotificationBell from '@/components/nav/NotificationBell';
import UserMenu from '@/components/nav/UserMenu';
import DashboardHeaderActions from '@/components/dashboard/DashboardHeaderActions';
import SystemConfigSidebarItem from '@/components/nav/SystemConfigSidebarItem';
import { SystemConfigNavProvider } from '@/lib/contexts/system-config-nav';
import {
  NotificationProvider,
  useNotificationUnreadCount,
} from '@/lib/contexts/notification-context';
import { ModalsWrapper } from './wrappers';
import ErrorBoundary from '@/components/ErrorBoundary';
import FooterBand from '@/components/layout/FooterBand';
import { useT } from '@/lib/i18n';
import { BRAND_TAGLINE_KEY } from '@/lib/brand-tagline';
import { CompactLanguageSwitcher } from '@/components/i18n/LanguageSwitcher';
import { unreadBadgeText } from '@/lib/notifications/format';
import { ACTIVE_THEME_PRESET, getThemeTokens, themeCssVariables } from '@/lib/theme/heritage';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SystemConfigNavProvider>
      <NotificationProvider>
        <DashboardShell>{children}</DashboardShell>
      </NotificationProvider>
    </SystemConfigNavProvider>
  );
}

type SidebarProps = {
  navItems: NavItem[];
  pathname: string;
  isAdmin: boolean;
  unreadCount: number;
  stats: { total_users: number; total_fowls: number; total_matches: number };
  online: boolean;
  onClose?: () => void;
};

function SidebarBody({
  navItems,
  pathname,
  isAdmin,
  unreadCount,
  stats,
  online,
  onClose,
}: SidebarProps) {
  const t = useT();
  const badge = unreadBadgeText(unreadCount);
  const groups = groupNavItems(navItems);

  return (
    <div className="from-sidebar to-sidebar-end text-sidebar-foreground relative flex h-full min-h-0 flex-col overflow-hidden bg-gradient-to-b">
      <div className="border-sidebar-foreground/15 flex h-24 shrink-0 items-center gap-3 border-b px-5">
        <span className="bg-background flex h-14 w-14 shrink-0 items-center justify-center rounded-xl shadow-lg">
          <Logo variant="mark" size="lg" />
        </span>
        <div className="min-w-0">
          <p className="text-sidebar-foreground text-2xl leading-none font-black tracking-tight">
            GalloTrack
          </p>
          <p className="text-sidebar-muted mt-1.5 text-xs font-semibold tracking-wide">
            {t('heritage.brandTagline')}
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={t('heritage.closeMenu')}
            className="text-sidebar-foreground hover:bg-sidebar-foreground/10 focus-visible:ring-sidebar-foreground ml-auto flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg focus-visible:ring-2 focus-visible:outline-none"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
      </div>

      <nav aria-label="Primary" className="min-h-0 flex-1 space-y-5 overflow-y-auto px-3 py-5">
        {groups.map(({ group, items }) => (
          <div key={group}>
            <p className="text-sidebar-muted/80 px-4 pb-2 text-xs font-black tracking-widest uppercase">
              {group}
            </p>
            <div className="space-y-1.5">
              {items.map((item) =>
                item.submenu ? (
                  <div key={item.href} className="text-sidebar-foreground">
                    <SystemConfigSidebarItem item={item} />
                  </div>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    aria-current={isActiveNav(item, pathname) ? 'page' : undefined}
                    className={cn(
                      'focus-visible:ring-sidebar-foreground group relative flex min-h-11 w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold tracking-wide transition-colors focus-visible:ring-2 focus-visible:outline-none',
                      isActiveNav(item, pathname)
                        ? 'bg-sidebar-active text-sidebar-active-foreground shadow-md'
                        : 'text-sidebar-foreground/90 hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'absolute top-1/2 left-1 h-5 w-1 -translate-y-1/2 rounded-full bg-white',
                        isActiveNav(item, pathname) ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    <item.icon className="h-5 w-5 shrink-0" />
                    <span className="min-w-0 flex-1 break-words">{item.label}</span>
                    {item.key === 'notifications' && badge && (
                      <span className="text-sidebar-active ml-auto flex min-h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-white px-1.5 text-xs font-black">
                        {badge}
                      </span>
                    )}
                  </Link>
                ),
              )}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-sidebar-foreground/15 mt-auto shrink-0 space-y-3 border-t p-4">
        {isAdmin && (
          <div className="text-sidebar-muted space-y-1.5 px-1">
            <p className="text-xs font-black tracking-widest uppercase">{t('nav.consoleGroup')}</p>
            <div className="grid grid-cols-3 gap-1.5 text-center">
              <div className="bg-sidebar-foreground/10 rounded-lg p-2">
                <p className="text-sidebar-foreground text-sm font-semibold tabular-nums">
                  {stats.total_users}
                </p>
                <p className="text-xs font-medium">{t('nav.users')}</p>
              </div>
              <div className="bg-sidebar-foreground/10 rounded-lg p-2">
                <p className="text-sidebar-foreground text-sm font-semibold tabular-nums">
                  {stats.total_fowls}
                </p>
                <p className="text-xs font-medium">{t('nav.inventory')}</p>
              </div>
              <div className="bg-sidebar-foreground/10 rounded-lg p-2">
                <p className="text-sidebar-foreground text-sm font-semibold tabular-nums">
                  {stats.total_matches}
                </p>
                <p className="text-xs font-medium">{t('heritage.result')}</p>
              </div>
            </div>
          </div>
        )}

        <p className="border-sidebar-foreground/20 text-sidebar-foreground/90 rounded-xl border px-3 py-2 text-center text-[10px] font-black tracking-wider uppercase">
          {t('heritage.capstoneBadge')}
        </p>

        <div className="text-sidebar-muted flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[10px] font-bold tracking-widest uppercase">
          <span>{t('nav.version')}</span>
          <span
            className="inline-flex items-center gap-1.5"
            title={online ? t('header.connected') : t('heritage.offlineTooltip')}
          >
            <span
              aria-hidden="true"
              className={cn('h-1.5 w-1.5 rounded-full', online ? 'bg-success' : 'bg-warning')}
            />
            {online ? t('heritage.onlineStatus') : t('heritage.offlineStatus')}
          </span>
        </div>

        <p className="text-sidebar-muted text-center text-xs font-bold tracking-[0.2em] uppercase">
          {t(BRAND_TAGLINE_KEY)}
        </p>
      </div>

      <img
        src="/brand/logo-mark.svg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute right-0 bottom-24 h-48 w-48 opacity-10 [@media(max-height:48rem)]:hidden"
      />
    </div>
  );
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const auth = useAuth();
  const fowl = useFowl();
  const t = useT();
  const unreadCount = useNotificationUnreadCount();
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [stats, setStats] = useState({ total_users: 0, total_fowls: 0, total_matches: 0 });
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!auth.isAdmin) return;
    async function loadStats() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) setStats(await res.json());
    }
    loadStats();
  }, [auth.isAdmin]);

  const isAdmin = auth.isAdmin;
  const settingsHref = isAdmin ? '/admin/settings' : '/settings';
  const rawNavItems: NavItem[] = isAdmin ? ADMIN_NAV : OWNER_NAV;
  const navItems: NavItem[] = getTranslatedNavItems(rawNavItems, t as (k: string) => string);
  const currentNav = findActiveNav(navItems, pathname);
  const activeTitle = currentNav?.label || getPageTitle(pathname);
  const isDashboard = pathname === '/dashboard';
  const mode = mounted && resolvedTheme === 'dark' ? 'dark' : 'light';
  const themeVars = useMemo(
    () => themeCssVariables(getThemeTokens(ACTIVE_THEME_PRESET, mode)),
    [mode],
  );

  useEffect(() => {
    if (activeTitle) document.title = `${activeTitle} | GalloTrack`;
  }, [activeTitle]);

  useEffect(() => {
    const root = document.documentElement;
    const keys = Object.keys(themeVars) as Array<keyof typeof themeVars>;
    keys.forEach((key) => root.style.setProperty(key, themeVars[key]));
    root.dataset.themePreset = ACTIVE_THEME_PRESET;
    return () => {
      keys.forEach((key) => root.style.removeProperty(key));
      delete root.dataset.themePreset;
    };
  }, [themeVars]);

  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const panel = drawerRef.current;
    panel?.querySelector<HTMLElement>('a,button')?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMobileOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !panel) return;
      const items = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])',
        ),
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      previous?.focus?.();
    };
  }, [mobileOpen]);

  return (
    <div
      data-role={isAdmin ? 'admin' : 'owner'}
      data-theme-preset={ACTIVE_THEME_PRESET}
      style={themeVars as React.CSSProperties}
      className="bg-background text-foreground selection:bg-accent selection:text-accent-foreground relative flex h-[100dvh] min-h-screen w-full flex-col overflow-hidden font-sans antialiased md:flex-row"
    >
      <SkipLink />

      <aside className="border-sidebar-foreground/15 relative z-50 hidden h-full w-64 shrink-0 border-r shadow-2xl md:flex md:flex-col">
        <SidebarBody
          navItems={navItems}
          pathname={pathname}
          isAdmin={isAdmin}
          unreadCount={unreadCount}
          stats={stats}
          online={!fowl.loadError}
        />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            aria-hidden="true"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-black/50"
          />
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label={t('heritage.accountMenu')}
            className="relative h-full w-[min(20rem,88vw)] shadow-2xl"
          >
            <SidebarBody
              navItems={navItems}
              pathname={pathname}
              isAdmin={isAdmin}
              unreadCount={unreadCount}
              stats={stats}
              online={!fowl.loadError}
              onClose={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}

      <div className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden md:pl-0">
        <header className="border-border bg-background/95 sticky top-0 z-40 flex min-h-16 shrink-0 items-center border-b shadow-xs backdrop-blur-md">
          <div className="flex w-full min-w-0 items-center justify-between gap-2 px-3 py-2 sm:px-6 md:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                aria-label={t('heritage.openMenu')}
                className="border-border bg-card text-foreground hover:bg-muted focus-visible:ring-ring flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border focus-visible:ring-2 focus-visible:outline-none md:hidden"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </button>
              <span aria-hidden="true" className="bg-brand-orange h-10 w-1 shrink-0 rounded-full" />
              <div className="min-w-0">
                <div className="border-primary/15 bg-accent-soft text-brand-red mb-1 inline-flex max-w-full min-w-0 items-center gap-1.5 overflow-hidden rounded-full border px-2.5 py-0.5 text-[10px] font-black tracking-widest uppercase">
                  <span className="shrink-0">
                    {isAdmin ? t('header.adminPortal') : t('header.portal')}
                  </span>
                  <span aria-hidden="true" className="text-muted-foreground shrink-0">
                    /
                  </span>
                  <span className="text-foreground min-w-0 truncate tracking-wide normal-case">
                    {isDashboard ? t('heritage.dashboardTitle') : activeTitle}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
              {isDashboard && !isAdmin && <DashboardHeaderActions />}
              <GlobalSearch />
              <div className="hidden items-center gap-1.5 md:flex">
                <CompactLanguageSwitcher />
                <Link
                  href={settingsHref}
                  aria-label={t('header.settings')}
                  title={t('header.settings')}
                  className="border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring flex h-11 w-11 items-center justify-center rounded-full border transition-colors focus-visible:ring-2 focus-visible:outline-none"
                >
                  <Settings className="h-4 w-4" aria-hidden="true" />
                </Link>
                {mounted && (
                  <button
                    type="button"
                    onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                    aria-label={t('header.toggleTheme')}
                    title={t('header.toggleTheme')}
                    className="border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring flex h-11 w-11 items-center justify-center rounded-full border transition-colors focus-visible:ring-2 focus-visible:outline-none"
                  >
                    {resolvedTheme === 'dark' ? (
                      <Sun className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Moon className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                )}
              </div>
              <NotificationBell />
              <UserMenu />
            </div>
          </div>
        </header>

        {fowl.loadError && (
          <div
            role="alert"
            className="border-warning/40 bg-low-sample-bg flex shrink-0 flex-col gap-2 border-b px-4 py-3 sm:flex-row sm:items-center sm:px-6 md:px-8"
          >
            <AlertTriangle
              className="text-low-sample hidden h-4 w-4 shrink-0 sm:block"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="text-low-sample text-xs font-black tracking-widest uppercase">
                {t('errors.syncFailed')}
              </p>
              <p className="text-foreground mt-0.5 text-sm font-semibold break-words">
                {fowl.loadError} {t('errors.syncFailedDesc')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => fowl.fetchDatabaseResources()}
              className="border-low-sample/40 text-low-sample hover:bg-low-sample-bg flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-black tracking-wider uppercase"
            >
              <RefreshCw className="h-3 w-3" aria-hidden="true" />
              {t('common.retry')}
            </button>
          </div>
        )}

        <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 overflow-y-auto">
          <div className="flex min-h-full min-w-0 flex-col p-4 sm:p-6 md:p-8">
            <div className="min-w-0 flex-1">
              <ErrorBoundary label="Dashboard Section">{children}</ErrorBoundary>
            </div>
            <FooterBand />
            <div
              aria-hidden="true"
              className="shrink-0"
              style={{ height: 'var(--form-action-bar-height, 0px)' }}
            />
          </div>
        </main>

        <ModalsWrapper />
      </div>
    </div>
  );
}
