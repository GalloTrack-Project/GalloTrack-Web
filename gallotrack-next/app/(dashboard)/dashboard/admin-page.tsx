'use client';

import { useCallback, useEffect, useState, ReactNode } from 'react';
import { Shield, Users, Home, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { supabase } from '@/lib/registry';

type SystemStats = {
  total_users: number;
  active_users: number;
  total_farms: number;
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) return;

      const [usersRes, farmsRes] = await Promise.all([
        fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const usersData = usersRes.ok ? await usersRes.json() : { total_users: 0, active_users: 0 };
      const usersDataFull = farmsRes.ok ? await farmsRes.json() : { users: [] };

      const profiles = (usersDataFull.users || []).map((u: { profile?: { farm_name?: string } | null }) => u.profile).filter(Boolean);
      const uniqueFarms = new Set(profiles.map((p: { farm_name?: string }) => p.farm_name).filter(Boolean));

      setStats({
        total_users: usersData.total_users || 0,
        active_users: usersData.active_users || 0,
        total_farms: uniqueFarms.size,
      });
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  if (loading) {
    return (
      <div className="min-h-[60vh] w-full flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
          </div>
        </div>
        <p className="text-[10px] font-mono tracking-[0.2em] uppercase text-muted-foreground">Initializing dashboard</p>
      </div>
    );
  }

  if (!stats) return null;

  const userActiveRate = stats.total_users > 0 ? Math.round((stats.active_users / stats.total_users) * 100) : 0;

  return (
    <div className="space-y-6 animate-fadeIn">

      {/* HERO HEADER */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-amber-600/5 to-transparent">
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-amber-400/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/10">
                <Shield className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-card-foreground tracking-tight">
                  System <span className="text-amber-400">Overview</span>
                </h1>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">
                  Manage farm owner accounts and system configuration
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400/60"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-mono font-semibold text-emerald-400 uppercase tracking-wider">All Systems Operational</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <StatCard
          label="Total Users"
          value={stats.total_users}
          icon={<Users className="w-4 h-4" />}
          accent="amber"
          subtitle={`${stats.active_users} active · ${userActiveRate}%`}
          trend={stats.active_users > 0 ? 'up' : undefined}
        />
        <StatCard
          label="Active Users"
          value={stats.active_users}
          icon={<Users className="w-4 h-4" />}
          accent="emerald"
          subtitle={`of ${stats.total_users} total`}
          trend={stats.active_users > 0 ? 'up' : undefined}
        />
        <StatCard
          label="Registered Farms"
          value={stats.total_farms}
          icon={<Home className="w-4 h-4" />}
          accent="sky"
          subtitle="farm owners"
          trend={stats.total_farms > 0 ? 'up' : undefined}
        />
      </div>

      {/* ADMIN ROLE INFO */}
      <div className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Admin Responsibilities</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <RoleCard title="User Management" description="Activate, deactivate, or delete farm owner accounts" />
          <RoleCard title="Password Reset" description="Send password reset links to farm owners" />
          <RoleCard title="System Settings" description="Configure global system defaults and behavior" />
          <RoleCard title="Security Monitoring" description="Monitor account activity and access control" />
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, accent, subtitle, trend }: {
  label: string;
  value: number | string;
  icon: ReactNode;
  accent: string;
  subtitle?: string;
  trend?: 'up' | 'down';
}) {
  const accentMap: Record<string, { text: string; bg: string; border: string; glow: string }> = {
    amber: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', glow: 'shadow-amber-500/5' },
    emerald: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', glow: 'shadow-emerald-500/5' },
    sky: { text: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20', glow: 'shadow-sky-500/5' },
  };
  const a = accentMap[accent] || accentMap.amber;

  return (
    <div className={`bg-card/95 backdrop-blur-xl border ${a.border} rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow duration-300`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${a.bg} border ${a.border} flex items-center justify-center text-lg`}>
          {icon}
        </div>
        {trend && (
          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${trend === 'up' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
            {trend === 'up' ? <><ArrowUpRight className="w-3 h-3" /> Active</> : <><ArrowDownRight className="w-3 h-3" /> Low</>}
          </span>
        )}
      </div>
      <p className={`text-2xl sm:text-3xl font-black ${a.text} tracking-tight`}>{value}</p>
      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1.5">{label}</p>
      {subtitle && <p className="text-[10px] text-muted-foreground/70 mt-1 font-medium">{subtitle}</p>}
    </div>
  );
}

function RoleCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-3 bg-muted/20 rounded-xl hover:bg-muted/30 transition-colors">
      <p className="text-xs font-bold text-card-foreground mb-1">{title}</p>
      <p className="text-[10px] text-muted-foreground font-medium">{description}</p>
    </div>
  );
}
