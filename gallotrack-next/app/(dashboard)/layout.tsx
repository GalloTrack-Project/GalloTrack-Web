'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Sun, Moon, User, Settings, Shield, LogOut, AlertTriangle, RefreshCw } from 'lucide-react';
import ChickenIcon from '@/components/ChickenIcon';
import { useUI } from '@/lib/contexts/ui-context';
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
import MobileNav from '@/components/nav/MobileNav';
import { ModalsWrapper } from './wrappers';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useT } from '@/lib/i18n';
import { CompactLanguageSwitcher } from '@/components/i18n/LanguageSwitcher';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const ui = useUI();
  const auth = useAuth();
  const fowl = useFowl();
  const t = useT();
  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState({ total_users: 0, total_fowls: 0, total_matches: 0 });

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
  const rawNavItems: NavItem[] = isAdmin ? ADMIN_NAV : OWNER_NAV;
  const navItems: NavItem[] = getTranslatedNavItems(rawNavItems, t as (k: string) => string);

  const currentNav = findActiveNav(navItems, pathname);
  const activeTitle = currentNav?.label || getPageTitle(pathname);

  useEffect(() => {
    if (activeTitle) {
      document.title = `${activeTitle} | GalloTrack`;
    }
  }, [activeTitle]);

  const iconButtonClass =
    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground shadow-2xs transition-colors duration-150 hover:border-accent/50 hover:bg-muted/60 hover:text-accent cursor-pointer';

  return (
    <div
      data-role={isAdmin ? 'admin' : 'owner'}
      className="bg-background text-foreground selection:bg-accent selection:text-accent-foreground relative flex h-[100dvh] min-h-screen w-full flex-col overflow-hidden font-sans antialiased md:flex-row"
    >
      <SkipLink />

      {/* SIDEBAR */}
      <aside className="bg-card text-card-foreground border-border z-50 hidden h-full w-64 flex-col justify-between border-r shadow-2xl md:fixed md:inset-y-0 md:left-0 md:flex">
        <div>
          <div className="border-border bg-muted/40 flex h-16 shrink-0 items-center gap-3 border-b px-5">
            <div className="bg-accent/15 border-accent/40 flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border shadow-inner">
              {isAdmin ? (
                <Shield className="text-accent h-4 w-4" aria-hidden="true" />
              ) : (
                <ChickenIcon className="text-accent h-4 w-4" />
              )}
            </div>
            <div className="min-w-0 flex-1 leading-none">
              <p className="text-card-foreground text-base font-semibold tracking-tight">
                GALLO<span className="text-accent">TRACK</span>
              </p>
              <span className="text-accent mt-1.5 block font-mono text-sm font-medium tracking-widest uppercase">
                {isAdmin ? 'Admin Panel' : 'v1.0.0'}
              </span>
            </div>
          </div>
          <nav aria-label="Primary" className="mt-2 space-y-4 p-4">
            {groupNavItems(navItems).map(({ group, items }) => (
              <div key={group}>
                <p className="text-muted-foreground px-4 pb-1.5 text-xs font-black tracking-widest uppercase">
                  {group}
                </p>
                <div className="space-y-1.5">
                  {items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={isActiveNav(item, pathname) ? 'page' : undefined}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-sm px-4 py-2.5 text-left text-sm tracking-wide transition-colors duration-150',
                        isActiveNav(item, pathname)
                          ? 'bg-accent text-accent-foreground font-semibold shadow-sm'
                          : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground font-medium',
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </div>

        <div className="border-border bg-muted/40 space-y-3 border-t p-4">
          <div className="flex items-center gap-3 px-2 py-1 select-none">
            {auth.avatarUrl ? (
              <img
                src={auth.avatarUrl}
                alt=""
                className="border-border h-8 w-8 rounded-sm border object-cover"
              />
            ) : (
              <div className="bg-accent/15 border-accent/40 flex h-8 w-8 items-center justify-center rounded-sm border shadow-inner">
                <User className="text-muted-foreground h-4 w-4" aria-hidden="true" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-card-foreground truncate text-sm font-semibold">
                {auth.adminName}
              </p>
              <span className="bg-accent/15 border-accent/30 text-accent mt-0.5 inline-block rounded-full border px-2 py-0.5 text-sm font-medium tracking-wider uppercase">
                {isAdmin ? 'Admin' : 'Farm Owner'}
              </span>
            </div>
          </div>

          {isAdmin && (
            <div className="space-y-1.5 px-2">
              <p className="text-muted-foreground text-sm font-medium tracking-widest uppercase">
                System Overview
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                <div className="bg-muted/50 rounded-sm p-2 text-center">
                  <p className="text-accent text-sm font-semibold tabular-nums">
                    {stats.total_users}
                  </p>
                  <p className="text-muted-foreground text-sm font-medium">Users</p>
                </div>
                <div className="bg-muted/50 rounded-sm p-2 text-center">
                  <p className="text-success text-sm font-semibold tabular-nums">
                    {stats.total_fowls}
                  </p>
                  <p className="text-muted-foreground text-sm font-medium">Chickens</p>
                </div>
                <div className="bg-muted/50 rounded-sm p-2 text-center">
                  <p className="text-info text-sm font-semibold tabular-nums">
                    {stats.total_matches}
                  </p>
                  <p className="text-muted-foreground text-sm font-medium">Matches</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 px-2">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 text-sm font-medium tracking-widest uppercase',
                auth.userActive ? 'text-success' : 'text-danger',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  auth.userActive ? 'bg-success' : 'bg-danger animate-pulse',
                )}
              ></span>
              {auth.userActive ? t('header.accessActive') : t('header.accessRestricted')}
            </span>
            <span className="text-muted-foreground truncate text-sm font-medium tracking-wider uppercase">
              {auth.userHub}
            </span>
          </div>
          <button
            type="button"
            onClick={() => ui.setShowLogoutModal(true)}
            className="bg-muted hover:bg-danger/10 text-muted-foreground hover:text-danger border-border hover:border-danger/30 flex w-full cursor-pointer items-center gap-3 rounded-sm border px-4 py-2.5 text-left text-sm font-medium transition-colors duration-150"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span>{t('nav.logout')}</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden pb-[65px] md:pb-0 md:pl-64">
        <header className="bg-card/85 border-border sticky top-0 z-40 flex h-16 shrink-0 items-center border-b shadow-xs backdrop-blur-md">
          <div className="flex w-full items-center justify-between px-3 sm:px-6 md:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex min-w-0 flex-col justify-center md:hidden">
                <span className="text-card-foreground from-foreground to-accent truncate bg-gradient-to-r bg-clip-text text-sm leading-tight font-extrabold tracking-tight text-transparent">
                  {isAdmin ? 'ADMIN PANEL' : 'GALLOTRACK'}{' '}
                  <span className="text-muted-foreground font-mono text-xs font-normal">
                    v1.0.0
                  </span>
                </span>
                <span className="text-muted-foreground truncate text-xs leading-tight font-medium tracking-wide">
                  {isAdmin ? 'Administrator console' : 'Farm management console'}
                </span>
              </div>

              <div className="hidden items-center gap-2.5 md:flex">
                <span className="bg-accent/10 border-accent/30 text-accent rounded-sm border px-2 py-0.5 text-sm font-medium tracking-wider uppercase">
                  {isAdmin ? 'Admin' : 'Portal'}
                </span>
                <span aria-hidden="true" className="text-muted-foreground/40 text-sm">
                  /
                </span>
                <span className="text-foreground text-sm font-semibold tracking-tight">
                  {activeTitle}
                </span>
              </div>

              <div className="border-border/60 hidden items-center gap-2 border-l pl-3 select-none lg:flex">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="bg-accent/40 absolute inline-flex h-full w-full animate-pulse rounded-full"></span>
                  <span className="bg-accent/80 relative inline-flex h-1.5 w-1.5 rounded-full"></span>
                </span>
                <span className="text-muted-foreground text-sm font-medium tracking-wide">
                  {t('header.connected')}
                </span>
                <span className="text-muted-foreground border-border/60 border-l pl-2.5 text-xs">
                  GALLOTRACK v1.0.0 · {isAdmin ? t('nav.adminConsole') : t('nav.farmConsole')}
                </span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1 sm:gap-2.5">
              {auth.avatarUrl ? (
                <img
                  src={auth.avatarUrl}
                  alt=""
                  className="border-border h-8 w-8 rounded-full border object-cover md:hidden"
                />
              ) : (
                <div className="bg-accent/15 border-accent/40 flex h-8 w-8 items-center justify-center rounded-full border md:hidden">
                  <User className="text-muted-foreground h-4 w-4" aria-hidden="true" />
                </div>
              )}
              <GlobalSearch />
              <div className="hidden items-center sm:flex">
                <CompactLanguageSwitcher variant="button" />
              </div>
              {!isAdmin && (
                <Link
                  href="/settings"
                  aria-label={t('header.settings')}
                  title={t('header.settings')}
                  className={iconButtonClass}
                >
                  <Settings className="h-4 w-4" aria-hidden="true" />
                </Link>
              )}
              {mounted && (
                <button
                  type="button"
                  onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                  aria-label={
                    resolvedTheme === 'dark' ? t('header.switchToLight') : t('header.switchToDark')
                  }
                  title={
                    resolvedTheme === 'dark' ? t('header.switchToLight') : t('header.switchToDark')
                  }
                  className={iconButtonClass}
                >
                  {resolvedTheme === 'dark' ? (
                    <Sun className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Moon className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={() => ui.setShowLogoutModal(true)}
                aria-label={t('header.logoutAria')}
                title={t('header.logoutAria')}
                className="bg-danger/10 text-danger hover:bg-danger/20 border-danger/30 flex cursor-pointer items-center rounded-full border p-1.5 px-1.5 text-sm font-semibold shadow-2xs transition-colors duration-150 sm:px-3 md:hidden"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </header>

        {fowl.loadError && (
          <div
            role="alert"
            className="flex shrink-0 flex-col gap-2 border-b border-amber-300/70 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:px-6 md:px-8 dark:bg-amber-950/40"
          >
            <AlertTriangle
              className="hidden h-4 w-4 shrink-0 text-amber-600 sm:block dark:text-amber-400"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black tracking-widest text-amber-700 uppercase dark:text-amber-400">
                {t('errors.syncFailed')}
              </p>
              <p className="text-muted-foreground mt-0.5 text-sm font-semibold break-words">
                {fowl.loadError} {t('errors.syncFailedDesc')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => fowl.fetchDatabaseResources()}
              className="flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-sm border border-amber-300 px-3 py-1.5 text-xs font-black tracking-wider text-amber-700 uppercase transition-colors duration-150 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/40"
            >
              <RefreshCw className="h-3 w-3" aria-hidden="true" />
              {t('common.retry')}
            </button>
          </div>
        )}

        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6 md:p-8"
        >
          <ErrorBoundary label="Dashboard Section">{children}</ErrorBoundary>
        </main>

        <ModalsWrapper />

        {/* MOBILE BOTTOM NAV */}
        <MobileNav navItems={navItems} pathname={pathname} />
      </div>
    </div>
  );
}
