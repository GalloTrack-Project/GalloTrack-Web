'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { useUI } from '@/lib/contexts/ui-context';
import { useAuth } from '@/lib/contexts/auth-context';
import { ModalsWrapper } from './wrappers';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard Analytics', icon: '📊' },
  { href: '/profiling', label: 'Profiling & Lineage', icon: '🧬' },
  { href: '/marketplace', label: 'Breeding Catalog', icon: '🛒' },
  { href: '/lineage', label: 'Family Lineage Directory', icon: '🌳' },
  { href: '/profile', label: 'Profile Management', icon: '👤' },
  { href: '/settings', label: 'System Settings', icon: '⚙️' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const ui = useUI();
  const auth = useAuth();

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

      <aside className="hidden md:flex w-64 bg-card text-card-foreground flex-col md:fixed md:inset-y-0 md:left-0 z-50 border-r border-border shadow-2xl h-full justify-between">
        <div>
          <div className="p-6 border-b border-border bg-muted/40 flex items-center space-x-3">
            <div className="w-9 h-9 bg-emerald-500/20 border border-emerald-500/40 rounded-xl flex items-center justify-center text-lg shadow-inner">🐓</div>
            <div>
              <h2 className="text-xl font-black tracking-tight text-card-foreground">GALLO<span className="text-emerald-400">TRACK</span></h2>
              <span className="text-[9px] font-mono font-bold text-emerald-400 tracking-widest uppercase block">v1.0.0</span>
            </div>
          </div>
          <nav className="p-4 space-y-1.5 mt-2">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`w-full text-left flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all duration-200 ${
                  pathname === item.href
                    ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-md shadow-emerald-700/30 font-black scale-[1.01]'
                    : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
            {auth.isAdmin && (
              <Link
                href="/admin"
                className="w-full text-left flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all duration-200 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              >
                <span className="text-base">🛡️</span>
                <span>Admin Panel</span>
              </Link>
            )}
          </nav>
        </div>

        <div className="p-4 border-t border-border bg-muted/40 space-y-3">
          <div className="flex items-center space-x-3 px-2 py-1 select-none">
            {auth.avatarUrl ? (
              <img src={auth.avatarUrl} alt="Admin Avatar" className="w-8 h-8 rounded-lg object-cover border border-slate-700/60" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-sm shadow-inner">👤</div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-extrabold text-card-foreground truncate">{auth.adminName}</p>
              <span className={`inline-block text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                auth.isAdmin
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                  : 'bg-sky-500/15 border-sky-500/30 text-sky-400'
              }`}>
                {auth.isAdmin ? 'ADMIN' : 'FARM OWNER'}
              </span>
            </div>
          </div>
          <div className="px-2 -mt-1 flex items-center justify-between gap-2">
            <span className={`inline-flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest ${auth.userActive ? 'text-emerald-400' : 'text-rose-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${auth.userActive ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`}></span>
              {auth.userActive ? 'Access Active' : 'Access Restricted'}
            </span>
            <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-wider truncate">📍 {auth.userHub}</span>
          </div>
          <button type="button" onClick={() => ui.setShowLogoutModal(true)} className="w-full bg-muted hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400 border border-border hover:border-rose-500/30 text-left flex items-center space-x-3 px-4 py-2.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer">
            <span>🚪 Log Out</span>
          </button>
          <div className="text-center text-[9px] text-muted-foreground font-mono tracking-widest uppercase">{auth.userHub}</div>
        </div>
      </aside>

      <div className="flex-1 md:pl-64 flex flex-col h-full w-full min-h-0 overflow-hidden relative pb-16 md:pb-0">
        <header className="bg-card/85 backdrop-blur-md border-b border-border sticky top-0 z-40 shadow-xs shrink-0">
          <div className="py-3.5 px-4 sm:px-6 md:px-8 flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <span className="md:hidden font-black text-card-foreground text-lg tracking-tight bg-gradient-to-r from-foreground to-emerald-400 bg-clip-text text-transparent">GALLOTRACK</span>
              <div className="flex items-center space-x-2 select-none" title="Supabase PostgreSQL link: Online">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-emerald-500/40"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500/80"></span>
                </span>
                <span className="hidden sm:inline text-[10px] font-medium text-muted-foreground/70 tracking-wide">PostgreSQL Connected</span>
                <span className="sm:hidden text-[9px] font-semibold text-muted-foreground/70 tracking-wide">DB</span>
              </div>
            </div>
            <div className="flex items-center space-x-2.5">
              <div className="antigravity-badge bg-muted border border-border text-muted-foreground px-3.5 py-1.5 rounded-full text-[10px] sm:text-xs font-mono font-bold flex items-center space-x-1.5 shadow-2xs" style={{ animationDelay: '1.2s' }}>
                <span className="text-muted-foreground">📍</span>
                <span>{auth.userHub || 'Dingle Campus Cluster'}</span>
              </div>
              <button
                type="button"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="w-9 h-9 shrink-0 rounded-full bg-muted border border-border text-muted-foreground hover:text-emerald-500 hover:border-emerald-500/50 hover:bg-muted/60 flex items-center justify-center shadow-2xs transition-all cursor-pointer"
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() => ui.setShowLogoutModal(true)}
                className="md:hidden bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border border-rose-500/30 p-1.5 px-3 rounded-full text-[10px] font-black cursor-pointer transition-all flex items-center space-x-1 shadow-2xs"
                title="Log Out"
              >
                <span>🚪 Exit</span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6">
          {children}
        </main>

        <ModalsWrapper />

        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-2xl md:hidden pb-[env(safe-area-inset-bottom,0px)]">
          <div className="flex justify-around items-center h-16 px-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center flex-1 h-full py-1 transition-all duration-200 active:scale-95 ${
                  pathname === item.href ? 'text-emerald-600 font-black scale-105' : 'text-slate-400 hover:text-slate-600 font-medium'
                }`}
              >
                <span className="text-xl leading-none">{item.icon}</span>
                <span className="text-[10px] mt-1 tracking-tight">{item.label.split(' ')[0]}</span>
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
