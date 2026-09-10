'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { useAuth } from '@/lib/contexts/auth-context';
import { useUI } from '@/lib/contexts/ui-context';
import { supabase } from '@/lib/registry';
import { isAdminProfile } from '@/lib/admin';

const ADMIN_NAV_ITEMS = [
  { href: '/dashboard', label: 'Farm Dashboard', icon: '📊' },
  { href: '/profiling', label: 'Fowl Registry', icon: '🧬' },
  { href: '/lineage', label: 'Family Lineage', icon: '🌳' },
  { href: '/admin', label: 'User Management', icon: '👥' },
  { href: '/admin/flocks', label: 'Flock Audit', icon: '🐓' },
  { href: '/admin/matches', label: 'Match Audit', icon: '⚔️' },
  { href: '/admin/settings', label: 'System Settings', icon: '⚙️' },
];

const ADMIN_MOBILE_NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/profiling', label: 'Registry', icon: '🧬' },
  { href: '/lineage', label: 'Lineage', icon: '🌳' },
  { href: '/admin', label: 'Users', icon: '👥' },
  { href: '/admin/flocks', label: 'Flocks', icon: '🐓' },
  { href: '/admin/matches', label: 'Matches', icon: '⚔️' },
  { href: '/admin/settings', label: 'Settings', icon: '⚙️' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const auth = useAuth();
  const ui = useUI();
  const [mounted, setMounted] = useState(false);
  const [adminProfile, setAdminProfile] = useState<{ full_name?: string; avatar_url?: string; email?: string } | null>(null);
  const [stats, setStats] = useState({ total_users: 0, total_fowls: 0, total_matches: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    async function loadAdminData() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        window.location.replace('/');
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();
      if (!isAdminProfile(profile)) {
        window.location.replace('/');
        return;
      }
      setAdminProfile(profile);

      const token = session.access_token;
      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
      setLoading(false);
    }
    loadAdminData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center gap-4 bg-background text-foreground">
        <div className="w-10 h-10 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[11px] font-mono tracking-widest uppercase text-muted-foreground">Loading admin panel...</p>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen font-sans antialiased text-foreground flex flex-col md:flex-row overflow-hidden h-[100dvh] w-full relative selection:bg-emerald-500 selection:text-white">
      {/* ADMIN SIDEBAR */}
      <aside className="hidden md:flex w-64 bg-card text-card-foreground flex-col md:fixed md:inset-y-0 md:left-0 z-50 border-r border-border shadow-2xl h-full justify-between">
        <div>
          <div className="p-6 border-b border-border bg-muted/40 flex items-center space-x-3">
            <div className="w-9 h-9 bg-amber-500/20 border border-amber-500/40 rounded-xl flex items-center justify-center text-lg shadow-inner">🛡️</div>
            <div>
              <h2 className="text-xl font-black tracking-tight text-card-foreground">GALLO<span className="text-amber-400">TRACK</span></h2>
              <span className="text-[9px] font-mono font-bold text-amber-400 tracking-widest uppercase block">ADMIN PANEL</span>
            </div>
          </div>
          <nav className="p-4 space-y-1.5 mt-2">
            {ADMIN_NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`w-full text-left flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all duration-200 ${
                  (item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href))
                    ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-md shadow-amber-700/30 font-black scale-[1.01]'
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
            {adminProfile?.avatar_url ? (
              <img src={adminProfile.avatar_url} alt="Admin Avatar" className="w-8 h-8 rounded-lg object-cover border border-slate-700/60" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-sm shadow-inner">👤</div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-extrabold text-card-foreground truncate">{adminProfile?.full_name || 'Administrator'}</p>
              <span className="inline-block text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border bg-amber-500/15 border-amber-500/30 text-amber-400">
                ADMIN
              </span>
            </div>
          </div>
          <div className="px-2 -mt-1 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">System</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <div className="bg-muted/50 rounded-lg p-1.5 text-center">
                <p className="text-[10px] font-black text-emerald-400">{stats.total_users}</p>
                <p className="text-[7px] font-bold text-muted-foreground uppercase">Users</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-1.5 text-center">
                <p className="text-[10px] font-black text-sky-400">{stats.total_fowls}</p>
                <p className="text-[7px] font-bold text-muted-foreground uppercase">Fowls</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-1.5 text-center">
                <p className="text-[10px] font-black text-purple-400">{stats.total_matches}</p>
                <p className="text-[7px] font-bold text-muted-foreground uppercase">Matches</p>
              </div>
            </div>
          </div>
          <Link
            href="/profile"
            className="w-full bg-muted hover:bg-amber-500/10 text-muted-foreground hover:text-amber-400 border border-border hover:border-amber-500/30 text-left flex items-center space-x-3 px-4 py-2.5 rounded-xl text-[11px] font-bold transition-all"
          >
            <span>👤 Profile</span>
          </Link>
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
              <span className="md:hidden font-black text-card-foreground text-lg tracking-tight bg-gradient-to-r from-foreground to-amber-400 bg-clip-text text-transparent">ADMIN PANEL</span>
              <div className="hidden md:flex items-center space-x-2 select-none">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-amber-500/40"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500/80"></span>
                </span>
                <span className="text-[10px] font-medium text-muted-foreground/70 tracking-wide">Admin Access</span>
              </div>
            </div>
            <div className="flex items-center space-x-2.5">
              {mounted && (
                <button
                  type="button"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="w-9 h-9 shrink-0 rounded-full bg-muted border border-border text-muted-foreground hover:text-amber-500 hover:border-amber-500/50 hover:bg-muted/60 flex items-center justify-center shadow-2xs transition-all cursor-pointer"
                  title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border shadow-2xl md:hidden pb-[env(safe-area-inset-bottom,0px)]">
        <div className="flex justify-around items-center h-16 px-1">
          {ADMIN_MOBILE_NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 transition-all duration-200 active:scale-95 ${
                (item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href)) ? 'text-amber-500 font-black scale-105' : 'text-muted-foreground hover:text-foreground font-medium'
              }`}
            >
              <span className="text-xl leading-none">{item.icon}</span>
              <span className="text-[10px] mt-1 tracking-tight">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
