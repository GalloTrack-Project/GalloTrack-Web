'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { useUI } from '@/lib/contexts/ui-context';
import { useAuth } from '@/lib/contexts/auth-context';
import { supabase } from '@/lib/registry';
import { ModalsWrapper } from './wrappers';
import ErrorBoundary from '@/components/ErrorBoundary';

const OWNER_NAV = [
  { href: '/dashboard', label: 'Dashboard Analytics', icon: '📊' },
  { href: '/profiling', label: 'Fowl Registry', icon: '🧬' },
  { href: '/marketplace', label: 'Breeding Catalog', icon: '🥚' },
  { href: '/lineage', label: 'Family Lineage Directory', icon: '🌳' },
  { href: '/profile', label: 'Profile Management', icon: '👤' },
];

const OWNER_MOBILE = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/profiling', label: 'Registry', icon: '🧬' },
  { href: '/lineage', label: 'Family', icon: '🌳' },
  { href: '/profile', label: 'Profile', icon: '👤' },
];

const ADMIN_NAV = [
  { href: '/dashboard', label: 'Farm Dashboard', icon: '📊' },
  { href: '/admin', label: 'User Management', icon: '👥' },
  { href: '/admin/flocks', label: 'Flock Audit', icon: '🐓' },
  { href: '/admin/matches', label: 'Match Audit', icon: '⚔️' },
  { href: '/admin/settings', label: 'System Settings', icon: '⚙️' },
  { href: '/profile', label: 'Profile Management', icon: '👤' },
];

const ADMIN_MOBILE = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/admin', label: 'Users', icon: '👥' },
  { href: '/admin/flocks', label: 'Flocks', icon: '🐓' },
  { href: '/admin/matches', label: 'Matches', icon: '⚔️' },
  { href: '/admin/settings', label: 'Settings', icon: '⚙️' },
  { href: '/profile', label: 'Profile', icon: '👤' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
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
  const mobileItems = isAdmin ? ADMIN_MOBILE : OWNER_MOBILE;
  const accent = isAdmin ? 'amber' : 'emerald';

  function isActive(href: string) {
    if (href === '/admin') return pathname === '/admin';
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  }

  return (
    <div className="bg-background min-h-screen font-sans antialiased text-foreground flex flex-col md:flex-row overflow-hidden h-[100dvh] w-full relative selection:bg-emerald-500 selection:text-white">
      {ui.toast.show && (
        <div className="fixed top-5 right-5 z-[9999] flex items-center p-4 px-5 max-w-sm rounded-2xl shadow-2xl border backdrop-blur-xl animate-fadeIn bg-card/95 border-border space-x-3">
          <div className={`flex items-center justify-center w-8 h-8 rounded-xl shrink-0 font-black text-xs shadow-sm ${
            ui.toast.type === 'success' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : ui.toast.type === 'error' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
          }`}>
            {ui.toast.type === 'success' ? '✓' : ui.toast.type === 'error' ? '✕' : '‼'}
          </div>
          <div className="text-xs font-bold text-card-foreground leading-snug">{ui.toast.message}</div>
        </div>
      )}

      {/* SIDEBAR */}
      <aside className="hidden md:flex w-64 bg-card text-card-foreground flex-col md:fixed md:inset-y-0 md:left-0 z-50 border-r border-border shadow-2xl h-full justify-between">
        <div>
          <div className={`p-6 border-b border-border bg-muted/40 flex items-center space-x-3`}>
            <div className={`w-9 h-9 ${isAdmin ? 'bg-amber-500/20 border border-amber-500/40' : 'bg-emerald-500/20 border border-emerald-500/40'} rounded-xl flex items-center justify-center text-lg shadow-inner`}>
              {isAdmin ? '🛡️' : '🐓'}
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight text-card-foreground">GALLO<span className={isAdmin ? 'text-amber-400' : 'text-emerald-400'}>TRACK</span></h2>
              <span className={`text-[9px] font-mono font-bold ${isAdmin ? 'text-amber-400' : 'text-emerald-400'} tracking-widest uppercase block`}>
                {isAdmin ? 'ADMIN PANEL' : 'v1.0.0'}
              </span>
            </div>
          </div>
          <nav className="p-4 space-y-1.5 mt-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`w-full text-left flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all duration-200 ${
                  isActive(item.href)
                    ? isAdmin
                      ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-md shadow-amber-700/30 font-black scale-[1.01]'
                      : 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-md shadow-emerald-700/30 font-black scale-[1.01]'
                    : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t border-border bg-muted/40 space-y-3">
          <div className="flex items-center space-x-3 px-2 py-1 select-none">
            {auth.avatarUrl ? (
              <img src={auth.avatarUrl} alt="Avatar" className="w-8 h-8 rounded-lg object-cover border border-slate-700/60" />
            ) : (
              <div className={`w-8 h-8 rounded-lg ${isAdmin ? 'bg-amber-500/20 border border-amber-500/40' : 'bg-emerald-500/20 border border-emerald-500/40'} flex items-center justify-center text-sm shadow-inner`}>👤</div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-extrabold text-card-foreground truncate">{auth.adminName}</p>
              <span className={`inline-block text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                isAdmin
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                  : 'bg-sky-500/15 border-sky-500/30 text-sky-400'
              }`}>
                {isAdmin ? 'ADMIN' : 'FARM OWNER'}
              </span>
            </div>
          </div>

          {isAdmin && (
            <div className="px-2 -mt-1 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">System Overview</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <div className="bg-muted/50 rounded-lg p-1.5 text-center">
                  <p className="text-[10px] font-black text-amber-400">{stats.total_users}</p>
                  <p className="text-[7px] font-bold text-muted-foreground uppercase">Users</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-1.5 text-center">
                  <p className="text-[10px] font-black text-emerald-400">{stats.total_fowls}</p>
                  <p className="text-[7px] font-bold text-muted-foreground uppercase">Fowls</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-1.5 text-center">
                  <p className="text-[10px] font-black text-sky-400">{stats.total_matches}</p>
                  <p className="text-[7px] font-bold text-muted-foreground uppercase">Matches</p>
                </div>
              </div>
            </div>
          )}

          <div className="px-2 -mt-1 flex items-center justify-between gap-2">
            <span className={`inline-flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest ${auth.userActive ? 'text-emerald-400' : 'text-rose-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${auth.userActive ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`}></span>
              {auth.userActive ? 'Access Active' : 'Access Restricted'}
            </span>
            <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-wider truncate">{auth.userHub}</span>
          </div>
          <button type="button" onClick={() => ui.setShowLogoutModal(true)} className="w-full bg-muted hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400 border border-border hover:border-rose-500/30 text-left flex items-center space-x-3 px-4 py-2.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer">
            <span>🚪 Log Out</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 md:pl-64 flex flex-col h-full w-full min-h-0 overflow-hidden relative pb-16 md:pb-0">
        <header className="bg-card/85 backdrop-blur-md border-b border-border sticky top-0 z-40 shadow-xs shrink-0">
          <div className="py-3.5 px-4 sm:px-6 md:px-8 flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <span className={`md:hidden font-black text-card-foreground text-lg tracking-tight bg-gradient-to-r from-foreground ${isAdmin ? 'to-amber-400' : 'to-emerald-400'} bg-clip-text text-transparent`}>
                {isAdmin ? 'ADMIN PANEL' : 'GALLOTRACK'}
              </span>
              <div className="hidden md:flex items-center space-x-2 select-none">
                <span className={`relative flex h-1.5 w-1.5`}>
                  <span className={`animate-pulse absolute inline-flex h-full w-full rounded-full ${isAdmin ? 'bg-amber-500/40' : 'bg-emerald-500/40'}`}></span>
                  <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${isAdmin ? 'bg-amber-500/80' : 'bg-emerald-500/80'}`}></span>
                </span>
                <span className="text-[10px] font-medium text-muted-foreground/70 tracking-wide">PostgreSQL Connected</span>
              </div>
            </div>
            <div className="flex items-center space-x-2.5">
              {auth.avatarUrl ? (
                <img src={auth.avatarUrl} alt="Profile" className="md:hidden w-8 h-8 rounded-full object-cover border border-slate-700/60" />
              ) : (
                <div className={`md:hidden w-8 h-8 rounded-full ${isAdmin ? 'bg-amber-500/20 border border-amber-500/40' : 'bg-emerald-500/20 border border-emerald-500/40'} flex items-center justify-center text-sm`}>👤</div>
              )}
              {mounted && (
                <button
                  type="button"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className={`w-9 h-9 shrink-0 rounded-full bg-muted border border-border text-muted-foreground hover:${isAdmin ? 'text-amber-500 hover:border-amber-500/50' : 'text-emerald-500 hover:border-emerald-500/50'} hover:bg-muted/60 flex items-center justify-center shadow-2xs transition-all cursor-pointer`}
                  title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
              )}
              <button
                type="button"
                onClick={() => ui.setShowLogoutModal(true)}
                className="md:hidden bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border border-rose-500/30 p-1.5 px-3 rounded-full text-[10px] font-black cursor-pointer transition-all flex items-center space-x-1 shadow-2xs"
                title="Log Out"
              >
                <span>🚪</span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6">
          <ErrorBoundary label="Dashboard Section">
            {children}
          </ErrorBoundary>
        </main>

        <ModalsWrapper />

        {/* MOBILE BOTTOM NAV */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border shadow-2xl md:hidden pb-[env(safe-area-inset-bottom,0px)]">
          <div className="flex justify-around items-center h-16 px-1">
            {mobileItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center flex-1 h-full py-1 transition-all duration-200 active:scale-95 ${
                  isActive(item.href)
                    ? `${isAdmin ? 'text-amber-500' : 'text-emerald-500'} font-black scale-105`
                    : 'text-muted-foreground hover:text-foreground font-medium'
                }`}
              >
                <span className="text-xl leading-none">{item.icon}</span>
                <span className="text-[10px] mt-1 tracking-tight">{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
