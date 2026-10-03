'use client';
import { useEffect, useState, type ComponentType } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Sun, Moon, LayoutDashboard, Dna, TreePine, User, Users, Settings, Shield, LogOut } from 'lucide-react';
import ChickenIcon from '@/components/ChickenIcon';
import { useUI } from '@/lib/contexts/ui-context';
import { useAuth } from '@/lib/contexts/auth-context';
import { supabase } from '@/lib/registry';
import { SkipLink, cn } from '@/components/ui';
import { ModalsWrapper } from './wrappers';
import ErrorBoundary from '@/components/ErrorBoundary';

type NavItem = {
  href: string;
  label: string;
  shortLabel: string;
  icon: ComponentType<{ className?: string }>;
};

const OWNER_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', shortLabel: 'Dashboard', icon: LayoutDashboard },
  { href: '/profiling', label: 'Chicken Registry', shortLabel: 'Registry', icon: Dna },
  { href: '/catalog', label: 'Chicken Inventory', shortLabel: 'Inventory', icon: ChickenIcon },
  { href: '/lineage', label: 'Lineage Directory', shortLabel: 'Lineage', icon: TreePine },
  { href: '/profile', label: 'My Profile', shortLabel: 'Profile', icon: User },
];

const ADMIN_NAV: NavItem[] = [
  { href: '/dashboard', label: 'System Overview', shortLabel: 'Overview', icon: LayoutDashboard },
  { href: '/admin', label: 'User Registry', shortLabel: 'Users', icon: Users },
  { href: '/admin/settings', label: 'System Config', shortLabel: 'Config', icon: Settings },
  { href: '/profile', label: 'My Profile', shortLabel: 'Profile', icon: User },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const ui = useUI();
  const auth = useAuth();
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
  const navItems = isAdmin ? ADMIN_NAV : OWNER_NAV;

  function isActive(href: string) {
    if (href === '/admin') return pathname === '/admin';
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  }

  const currentNav = navItems.find((item) => isActive(item.href));
  const activeTitle = currentNav?.label || (
    pathname === '/settings' ? 'Settings' :
    pathname.startsWith('/admin/audit') ? 'Audit Logs' :
    pathname.startsWith('/admin/flocks') ? 'Flocks' :
    pathname.startsWith('/admin/matches') ? 'Match History' :
    pathname.startsWith('/admin/marketplace') ? 'Marketplace' :
    pathname.split('/').filter(Boolean).pop()?.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Dashboard'
  );

  const iconButtonClass =
    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground shadow-2xs transition-colors duration-150 hover:border-accent/50 hover:bg-muted/60 hover:text-accent cursor-pointer';

  return (
    <div
      data-role={isAdmin ? 'admin' : 'owner'}
      className="bg-background min-h-screen font-sans antialiased text-foreground flex flex-col md:flex-row overflow-hidden h-[100dvh] w-full relative selection:bg-accent selection:text-accent-foreground"
    >
      <SkipLink />

      {ui.toast.show && (
        <div
          role={ui.toast.type === 'error' ? 'alert' : 'status'}
          className="fixed top-5 right-5 z-[9999] flex items-center gap-3 p-4 px-5 max-w-sm rounded-sm shadow-lg border backdrop-blur-xl animate-fadeIn bg-card/95 border-border"
        >
          <div className={cn(
            'flex items-center justify-center w-8 h-8 rounded-sm shrink-0 font-semibold text-sm shadow-sm border',
            ui.toast.type === 'success' && 'bg-success/15 text-success border-success/40',
            ui.toast.type === 'error' && 'bg-danger/15 text-danger border-danger/40',
            ui.toast.type === 'warning' && 'bg-warning/15 text-warning border-warning/40',
          )}>
            <span aria-hidden="true">{ui.toast.type === 'success' ? '✓' : ui.toast.type === 'error' ? '✕' : '!'}</span>
          </div>
          <p className="text-sm font-medium text-card-foreground leading-snug">{ui.toast.message}</p>
        </div>
      )}

      {/* SIDEBAR */}
      <aside className="hidden md:flex w-64 bg-card text-card-foreground flex-col md:fixed md:inset-y-0 md:left-0 z-50 border-r border-border shadow-2xl h-full justify-between">
        <div>
          <div className="h-16 px-5 border-b border-border bg-muted/40 flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-sm bg-accent/15 border border-accent/40 flex items-center justify-center shadow-inner shrink-0">
              {isAdmin ? <Shield className="w-4 h-4 text-accent" aria-hidden="true" /> : <ChickenIcon className="w-4 h-4 text-accent" />}
            </div>
            <div className="min-w-0 flex-1 leading-none">
              <p className="text-base font-semibold tracking-tight text-card-foreground">GALLO<span className="text-accent">TRACK</span></p>
              <span className="text-xs font-mono font-medium text-accent tracking-widest uppercase block mt-1.5">
                {isAdmin ? 'Admin Panel' : 'v1.0.0'}
              </span>
            </div>
          </div>
          <nav aria-label="Primary" className="p-4 space-y-1.5 mt-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? 'page' : undefined}
                className={cn(
                  'w-full text-left flex items-center gap-3 px-4 py-2.5 rounded-sm text-sm tracking-wide transition-colors duration-150',
                  isActive(item.href)
                    ? 'bg-accent text-accent-foreground font-semibold shadow-sm'
                    : 'text-muted-foreground font-medium hover:bg-muted/70 hover:text-foreground',
                )}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
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
              <span className="inline-block text-xs font-medium uppercase tracking-wider px-2 py-0.5 mt-0.5 rounded-full border bg-accent/15 border-accent/30 text-accent">
                {isAdmin ? 'Admin' : 'Farm Owner'}
              </span>
            </div>
          </div>

          {isAdmin && (
            <div className="px-2 space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">System Overview</p>
              <div className="grid grid-cols-3 gap-1.5">
                <div className="bg-muted/50 rounded-sm p-2 text-center">
                  <p className="text-sm font-semibold text-accent tabular-nums">{stats.total_users}</p>
                  <p className="text-xs font-medium text-muted-foreground">Users</p>
                </div>
                <div className="bg-muted/50 rounded-sm p-2 text-center">
                  <p className="text-sm font-semibold text-success tabular-nums">{stats.total_fowls}</p>
                  <p className="text-xs font-medium text-muted-foreground">Chickens</p>
                </div>
                <div className="bg-muted/50 rounded-sm p-2 text-center">
                  <p className="text-sm font-semibold text-info tabular-nums">{stats.total_matches}</p>
                  <p className="text-xs font-medium text-muted-foreground">Matches</p>
                </div>
              </div>
            </div>
          )}

          <div className="px-2 flex items-center justify-between gap-2">
            <span className={cn(
              'inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest',
              auth.userActive ? 'text-success' : 'text-danger',
            )}>
              <span aria-hidden="true" className={cn('w-1.5 h-1.5 rounded-full', auth.userActive ? 'bg-success' : 'bg-danger animate-pulse')}></span>
              {auth.userActive ? 'Access Active' : 'Access Restricted'}
            </span>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">{auth.userHub}</span>
          </div>
          <button type="button" onClick={() => ui.setShowLogoutModal(true)} className="w-full bg-muted hover:bg-danger/10 text-muted-foreground hover:text-danger border border-border hover:border-danger/30 text-left flex items-center gap-3 px-4 py-2.5 rounded-sm text-sm font-medium transition-colors duration-150 cursor-pointer">
            <LogOut className="w-4 h-4" aria-hidden="true" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 md:pl-64 flex flex-col h-full w-full min-h-0 overflow-hidden relative pb-16 md:pb-0">
        <header className="h-16 bg-card/85 backdrop-blur-md border-b border-border sticky top-0 z-40 shadow-xs shrink-0 flex items-center">
          <div className="w-full px-4 sm:px-6 md:px-8 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <span className="md:hidden font-semibold text-card-foreground text-lg tracking-tight bg-gradient-to-r from-foreground to-accent bg-clip-text text-transparent">
                {isAdmin ? 'ADMIN PANEL' : 'GALLOTRACK'}
              </span>

              <div className="hidden md:flex items-center gap-2.5">
                <span className="text-xs font-medium uppercase tracking-wider px-2 py-0.5 rounded-sm border bg-accent/10 border-accent/30 text-accent">
                  {isAdmin ? 'Admin' : 'Portal'}
                </span>
                <span aria-hidden="true" className="text-muted-foreground/40 text-xs">/</span>
                <span className="text-sm font-semibold text-foreground tracking-tight">{activeTitle}</span>
              </div>

              <div className="hidden lg:flex items-center gap-2 select-none pl-3 border-l border-border/60">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-accent/40"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent/80"></span>
                </span>
                <span className="text-xs font-medium text-muted-foreground tracking-wide">PostgreSQL Connected</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              {auth.avatarUrl ? (
                <img src={auth.avatarUrl} alt="" className="md:hidden w-8 h-8 rounded-full object-cover border border-border" />
              ) : (
                <div className="md:hidden w-8 h-8 rounded-full bg-accent/15 border border-accent/40 flex items-center justify-center"><User className="w-4 h-4 text-muted-foreground" aria-hidden="true" /></div>
              )}
              {!isAdmin && (
                <Link href="/settings" aria-label="Settings" className={iconButtonClass}>
                  <Settings className="w-4 h-4" aria-hidden="true" />
                </Link>
              )}
              {mounted && (
                <button
                  type="button"
                  onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                  aria-label={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                  className={iconButtonClass}
                >
                  {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" aria-hidden="true" /> : <Moon className="w-4 h-4" aria-hidden="true" />}
                </button>
              )}
              <button
                type="button"
                onClick={() => ui.setShowLogoutModal(true)}
                aria-label="Log out"
                className="md:hidden bg-danger/10 text-danger hover:bg-danger/20 border border-danger/30 p-1.5 px-3 rounded-full text-xs font-semibold cursor-pointer transition-colors duration-150 flex items-center shadow-2xs"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </header>

        <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6">
          <ErrorBoundary label="Dashboard Section">
            {children}
          </ErrorBoundary>
        </main>

        <footer className="shrink-0 border-t border-border bg-card/60 px-4 sm:px-6 md:px-8 py-2">
          <p className="text-xs text-muted-foreground">
            GALLOTRACK v1.0.0 · {isAdmin ? 'Administrator console' : 'Farm management console'}
          </p>
        </footer>

        <ModalsWrapper />

        {/* MOBILE BOTTOM NAV */}
        <nav aria-label="Mobile" className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border shadow-2xl md:hidden pb-[env(safe-area-inset-bottom,0px)]">
          <div className="flex justify-around items-center h-16 px-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center justify-center flex-1 h-full py-1 gap-1 transition-colors duration-150 active:scale-95',
                  isActive(item.href)
                    ? 'text-accent font-semibold'
                    : 'text-muted-foreground font-medium hover:text-foreground',
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-xs tracking-tight">{item.shortLabel}</span>
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
