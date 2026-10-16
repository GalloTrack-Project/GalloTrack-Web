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
import { OWNER_NAV, ADMIN_NAV, isActiveNav, findActiveNav, groupNavItems, getPageTitle, type NavItem } from '@/lib/nav-manifest';
import GlobalSearch from '@/components/nav/GlobalSearch';
import MobileNav from '@/components/nav/MobileNav';
import { ModalsWrapper } from './wrappers';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const ui = useUI();
  const auth = useAuth();
  const fowl = useFowl();
  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState({ total_users: 0, total_fowls: 0, total_matches: 0 });

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!auth.isAdmin) return;
    async function loadStats() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) setStats(await res.json());
    }
    loadStats();
  }, [auth.isAdmin]);

  const isAdmin = auth.isAdmin;
  const navItems: NavItem[] = isAdmin ? ADMIN_NAV : OWNER_NAV;

  const currentNav = findActiveNav(navItems, pathname);
  const activeTitle = currentNav?.label || getPageTitle(pathname);

  const iconButtonClass =
    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground shadow-2xs transition-colors duration-150 hover:border-accent/50 hover:bg-muted/60 hover:text-accent cursor-pointer';

  return (
    <div
      data-role={isAdmin ? 'admin' : 'owner'}
      className="bg-background min-h-screen font-sans antialiased text-foreground flex flex-col md:flex-row overflow-hidden h-[100dvh] w-full relative selection:bg-accent selection:text-accent-foreground"
    >
      <SkipLink />

      {/* SIDEBAR */}
      <aside className="hidden md:flex w-64 bg-card text-card-foreground flex-col md:fixed md:inset-y-0 md:left-0 z-50 border-r border-border shadow-2xl h-full justify-between">
        <div>
          <div className="h-16 px-5 border-b border-border bg-muted/40 flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-sm bg-accent/15 border border-accent/40 flex items-center justify-center shadow-inner shrink-0">
              {isAdmin ? <Shield className="w-4 h-4 text-accent" aria-hidden="true" /> : <ChickenIcon className="w-4 h-4 text-accent" />}
            </div>
            <div className="min-w-0 flex-1 leading-none">
              <p className="text-base font-semibold tracking-tight text-card-foreground">GALLO<span className="text-accent">TRACK</span></p>
              <span className="text-sm font-mono font-medium text-accent tracking-widest uppercase block mt-1.5">
                {isAdmin ? 'Admin Panel' : 'v1.0.0'}
              </span>
            </div>
          </div>
          <nav aria-label="Primary" className="p-4 space-y-4 mt-2">
            {groupNavItems(navItems).map(({ group, items }) => (
              <div key={group}>
                <p className="px-4 pb-1.5 text-[11px] font-black uppercase tracking-widest text-muted-foreground">{group}</p>
                <div className="space-y-1.5">
                  {items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={isActiveNav(item, pathname) ? 'page' : undefined}
                      className={cn(
                        'w-full text-left flex items-center gap-3 px-4 py-2.5 rounded-sm text-sm tracking-wide transition-colors duration-150',
                        isActiveNav(item, pathname)
                          ? 'bg-accent text-accent-foreground font-semibold shadow-sm'
                          : 'text-muted-foreground font-medium hover:bg-muted/70 hover:text-foreground',
                      )}
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t border-border bg-muted/40 space-y-3">
          <div className="flex items-center gap-3 px-2 py-1 select-none">
            {auth.avatarUrl ? (
              <img src={auth.avatarUrl} alt="" className="w-8 h-8 rounded-sm object-cover border border-border" />
            ) : (
              <div className="w-8 h-8 rounded-sm bg-accent/15 border border-accent/40 flex items-center justify-center shadow-inner"><User className="w-4 h-4 text-muted-foreground" aria-hidden="true" /></div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-card-foreground truncate">{auth.adminName}</p>
              <span className="inline-block text-sm font-medium uppercase tracking-wider px-2 py-0.5 mt-0.5 rounded-full border bg-accent/15 border-accent/30 text-accent">
                {isAdmin ? 'Admin' : 'Farm Owner'}
              </span>
            </div>
          </div>

          {isAdmin && (
            <div className="px-2 space-y-1.5">
              <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">System Overview</p>
              <div className="grid grid-cols-3 gap-1.5">
                <div className="bg-muted/50 rounded-sm p-2 text-center">
                  <p className="text-sm font-semibold text-accent tabular-nums">{stats.total_users}</p>
                  <p className="text-sm font-medium text-muted-foreground">Users</p>
                </div>
                <div className="bg-muted/50 rounded-sm p-2 text-center">
                  <p className="text-sm font-semibold text-success tabular-nums">{stats.total_fowls}</p>
                  <p className="text-sm font-medium text-muted-foreground">Chickens</p>
                </div>
                <div className="bg-muted/50 rounded-sm p-2 text-center">
                  <p className="text-sm font-semibold text-info tabular-nums">{stats.total_matches}</p>
                  <p className="text-sm font-medium text-muted-foreground">Matches</p>
                </div>
              </div>
            </div>
          )}

          <div className="px-2 flex items-center justify-between gap-2">
            <span className={cn(
              'inline-flex items-center gap-1.5 text-sm font-medium uppercase tracking-widest',
              auth.userActive ? 'text-success' : 'text-danger',
            )}>
              <span aria-hidden="true" className={cn('w-1.5 h-1.5 rounded-full', auth.userActive ? 'bg-success' : 'bg-danger animate-pulse')}></span>
              {auth.userActive ? 'Access Active' : 'Access Restricted'}
            </span>
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider truncate">{auth.userHub}</span>
          </div>
          <button type="button" onClick={() => ui.setShowLogoutModal(true)} className="w-full bg-muted hover:bg-danger/10 text-muted-foreground hover:text-danger border border-border hover:border-danger/30 text-left flex items-center gap-3 px-4 py-2.5 rounded-sm text-sm font-medium transition-colors duration-150 cursor-pointer">
            <LogOut className="w-4 h-4" aria-hidden="true" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 md:pl-64 flex flex-col h-full w-full min-h-0 overflow-hidden relative pb-[65px] md:pb-0">
        <header className="h-16 bg-card/85 backdrop-blur-md border-b border-border sticky top-0 z-40 shadow-xs shrink-0 flex items-center">
          <div className="w-full px-4 sm:px-6 md:px-8 flex justify-between items-center">
            <div className="flex items-center gap-3 min-w-0">
              <div className="md:hidden flex flex-col justify-center min-w-0">
                <span className="font-extrabold text-card-foreground text-sm tracking-tight leading-tight truncate bg-gradient-to-r from-foreground to-accent bg-clip-text text-transparent">
                  {isAdmin ? 'ADMIN PANEL' : 'GALLOTRACK'} <span className="font-mono text-[10px] text-muted-foreground font-normal">v1.0.0</span>
                </span>
                <span className="text-[10px] font-medium text-muted-foreground tracking-wide leading-tight truncate">
                  {isAdmin ? 'Administrator console' : 'Farm management console'}
                </span>
              </div>

              <div className="hidden md:flex items-center gap-2.5">
                <span className="text-sm font-medium uppercase tracking-wider px-2 py-0.5 rounded-sm border bg-accent/10 border-accent/30 text-accent">
                  {isAdmin ? 'Admin' : 'Portal'}
                </span>
                <span aria-hidden="true" className="text-muted-foreground/40 text-sm">/</span>
                <span className="text-sm font-semibold text-foreground tracking-tight">{activeTitle}</span>
              </div>

              <div className="hidden lg:flex items-center gap-2 select-none pl-3 border-l border-border/60">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-accent/40"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent/80"></span>
                </span>
                <span className="text-sm font-medium text-muted-foreground tracking-wide">PostgreSQL Connected</span>
                <span className="text-xs text-muted-foreground pl-2.5 border-l border-border/60">
                  GALLOTRACK v1.0.0 · {isAdmin ? 'Administrator console' : 'Farm management console'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              {auth.avatarUrl ? (
                <img src={auth.avatarUrl} alt="" className="md:hidden w-8 h-8 rounded-full object-cover border border-border" />
              ) : (
                <div className="md:hidden w-8 h-8 rounded-full bg-accent/15 border border-accent/40 flex items-center justify-center"><User className="w-4 h-4 text-muted-foreground" aria-hidden="true" /></div>
              )}
              <GlobalSearch />
              {!isAdmin && (
                <Link href="/settings" aria-label="Settings" title="Settings" className={iconButtonClass}>
                  <Settings className="w-4 h-4" aria-hidden="true" />
                </Link>
              )}
              {mounted && (
                <button
                  type="button"
                  onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                  aria-label={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                  title={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                  className={iconButtonClass}
                >
                  {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" aria-hidden="true" /> : <Moon className="w-4 h-4" aria-hidden="true" />}
                </button>
              )}
              <button
                type="button"
                onClick={() => ui.setShowLogoutModal(true)}
                aria-label="Log out"
                title="Log out"
                className="md:hidden bg-danger/10 text-danger hover:bg-danger/20 border border-danger/30 p-1.5 px-3 rounded-full text-sm font-semibold cursor-pointer transition-colors duration-150 flex items-center shadow-2xs"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </header>

        {fowl.loadError && (
          <div
            role="alert"
            className="shrink-0 border-b border-amber-300/70 bg-amber-50 dark:bg-amber-950/40 px-4 sm:px-6 md:px-8 py-3 flex flex-col sm:flex-row sm:items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 hidden sm:block" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">
                Registry sync failed
              </p>
              <p className="text-sm font-semibold text-muted-foreground mt-0.5 break-words">
                {fowl.loadError} Figures on screen may be out of date.
              </p>
            </div>
            <button
              type="button"
              onClick={() => fowl.fetchDatabaseResources()}
              className="flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700 rounded-sm px-3 py-1.5 hover:bg-amber-100 dark:hover:bg-amber-900/40 cursor-pointer transition-colors duration-150 shrink-0"
            >
              <RefreshCw className="w-3 h-3" aria-hidden="true" />
              Retry
            </button>
          </div>
        )}

        <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6">
          <ErrorBoundary label="Dashboard Section">
            {children}
          </ErrorBoundary>
        </main>



        <ModalsWrapper />

        {/* MOBILE BOTTOM NAV */}
        <MobileNav navItems={navItems} pathname={pathname} />
      </div>
    </div>
  );
}
