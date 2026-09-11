'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/registry';
import { Doughnut, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

type SystemStats = {
  total_users: number;
  active_users: number;
  total_fowls: number;
  active_fowls: number;
  total_matches: number;
  wins: number;
  losses: number;
  draws: number;
  deceased: number;
  breed_counts: Record<string, number>;
  gender_counts: { male: number; female: number };
  owner_counts: Record<string, number>;
  recent_activity: { type: string; description: string; date: string }[];
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) return;

      const [usersRes, fowlsRes, matchesRes] = await Promise.all([
        fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/fowls', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/matches', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const usersData = usersRes.ok ? await usersRes.json() : { total_users: 0, active_users: 0 };
      const fowlsData = fowlsRes.ok ? await fowlsRes.json() : { fowls: [] };
      const matchesData = matchesRes.ok ? await matchesRes.json() : { matches: [] };

      const fowls = fowlsData.fowls || [];
      const matches = matchesData.matches || [];

      const breedCounts: Record<string, number> = {};
      const genderCounts = { male: 0, female: 0 };
      const ownerCounts: Record<string, number> = {};

      fowls.forEach((f: { breed: string; gender: string; owner_name: string; farm_name: string }) => {
        breedCounts[f.breed] = (breedCounts[f.breed] || 0) + 1;
        if (f.gender === 'Male' || f.gender === 'Rooster') genderCounts.male++;
        else genderCounts.female++;
        const ownerKey = f.farm_name || f.owner_name;
        ownerCounts[ownerKey] = (ownerCounts[ownerKey] || 0) + 1;
      });

      const wins = matches.filter((m: { outcome: string }) => m.outcome?.toLowerCase() === 'win').length;
      const losses = matches.filter((m: { outcome: string }) => m.outcome?.toLowerCase() === 'loss').length;
      const draws = matches.filter((m: { outcome: string }) => m.outcome?.toLowerCase() === 'draw').length;
      const deceased = matches.filter((m: { post_fight_condition: string }) => m.post_fight_condition === 'Deceased').length;

      setStats({
        total_users: usersData.total_users || 0,
        active_users: usersData.active_users || 0,
        total_fowls: fowls.length,
        active_fowls: fowls.filter((f: { status: string }) => f.status === 'Active').length,
        total_matches: matches.length,
        wins, losses, draws, deceased,
        breed_counts: breedCounts,
        gender_counts: genderCounts,
        owner_counts: ownerCounts,
        recent_activity: [],
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

  const winRate = stats.wins + stats.losses > 0 ? Math.round((stats.wins / (stats.wins + stats.losses)) * 100) : 0;
  const fowlActiveRate = stats.total_fowls > 0 ? Math.round((stats.active_fowls / stats.total_fowls) * 100) : 0;
  const userActiveRate = stats.total_users > 0 ? Math.round((stats.active_users / stats.total_users) * 100) : 0;
  const deceasedRate = stats.total_fowls > 0 ? Math.round((stats.deceased / stats.total_fowls) * 100) : 0;

  const outcomeData = {
    labels: ['Wins', 'Losses', 'Draws'],
    datasets: [{
      data: [stats.wins, stats.losses, stats.draws],
      backgroundColor: ['#10b981', '#f43f5e', '#f59e0b'],
      borderWidth: 0,
      hoverOffset: 6,
    }],
  };

  const genderData = {
    labels: ['Roosters', 'Hens'],
    datasets: [{
      data: [stats.gender_counts.male, stats.gender_counts.female],
      backgroundColor: ['#3b82f6', '#ec4899'],
      borderWidth: 0,
      hoverOffset: 6,
    }],
  };

  const topBreeds = Object.entries(stats.breed_counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const breedBarData = {
    labels: topBreeds.map(([b]) => b),
    datasets: [{
      data: topBreeds.map(([, c]) => c),
      backgroundColor: 'rgba(245, 158, 11, 0.8)',
      hoverBackgroundColor: 'rgba(245, 158, 11, 1)',
      borderRadius: 6,
      borderSkipped: false,
    }],
  };

  const topOwners = Object.entries(stats.owner_counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const maxOwnerCount = topOwners.length > 0 ? topOwners[0][1] : 1;

  const chartLegendOpts = {
    position: 'bottom' as const,
    labels: { color: '#94a3b8', font: { size: 10 }, padding: 12, usePointStyle: true, pointStyleWidth: 8 },
  };

  return (
    <div className="space-y-6 animate-fadeIn">

      {/* HERO HEADER */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-amber-600/5 to-transparent">
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-amber-400/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-2xl shadow-lg shadow-amber-500/10">
                🛡️
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-card-foreground tracking-tight">
                  System <span className="text-amber-400">Overview</span>
                </h1>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">
                  Platform-wide analytics across all registered users, fowls, and matches
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Total Users"
          value={stats.total_users}
          icon="👥"
          accent="amber"
          subtitle={`${stats.active_users} active · ${userActiveRate}%`}
          trend={stats.active_users > 0 ? 'up' : undefined}
        />
        <StatCard
          label="Registered Fowls"
          value={stats.total_fowls}
          icon="🐓"
          accent="emerald"
          subtitle={`${stats.active_fowls} alive · ${fowlActiveRate}%`}
          trend={stats.active_fowls > 0 ? 'up' : undefined}
        />
        <StatCard
          label="Total Matches"
          value={stats.total_matches}
          icon="⚔️"
          accent="sky"
          subtitle={`${stats.wins}W · ${stats.losses}L · ${stats.draws}D`}
          trend={stats.total_matches > 0 ? 'up' : undefined}
        />
        <StatCard
          label="Win Rate"
          value={stats.wins + stats.losses > 0 ? `${winRate}%` : 'N/A'}
          icon="📈"
          accent="purple"
          subtitle={`${stats.wins} wins out of ${stats.wins + stats.losses}`}
          trend={winRate >= 50 ? 'up' : winRate > 0 ? 'down' : undefined}
        />
      </div>

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Match Outcomes */}
        <div className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Match Outcomes</h3>
            <span className="text-[9px] font-mono text-muted-foreground/60">{stats.total_matches} total</span>
          </div>
          <p className="text-[10px] text-muted-foreground mb-4">Win / Loss / Draw distribution</p>
          {stats.total_matches > 0 ? (
            <div className="h-52 flex items-center justify-center">
              <Doughnut
                data={outcomeData}
                options={{ responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: chartLegendOpts } }}
              />
            </div>
          ) : (
            <div className="h-52 flex flex-col items-center justify-center text-muted-foreground">
              <span className="text-3xl mb-2 opacity-40">⚔️</span>
              <p className="text-xs font-semibold">No match data yet</p>
            </div>
          )}
        </div>

        {/* Gender Distribution */}
        <div className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Gender Split</h3>
            <span className="text-[9px] font-mono text-muted-foreground/60">{stats.total_fowls} fowls</span>
          </div>
          <p className="text-[10px] text-muted-foreground mb-4">Rooster vs Hen population</p>
          {stats.total_fowls > 0 ? (
            <div className="h-52 flex items-center justify-center">
              <Doughnut
                data={genderData}
                options={{ responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: chartLegendOpts } }}
              />
            </div>
          ) : (
            <div className="h-52 flex flex-col items-center justify-center text-muted-foreground">
              <span className="text-3xl mb-2 opacity-40">🐓</span>
              <p className="text-xs font-semibold">No fowl data yet</p>
            </div>
          )}
        </div>

        {/* Top Breeds */}
        <div className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Top Breeds</h3>
            <span className="text-[9px] font-mono text-muted-foreground/60">{Object.keys(stats.breed_counts).length} breeds</span>
          </div>
          <p className="text-[10px] text-muted-foreground mb-4">Most registered breed strains</p>
          {topBreeds.length > 0 ? (
            <div className="h-52">
              <Bar
                data={breedBarData}
                options={{
                  responsive: true, maintainAspectRatio: false, indexAxis: 'y',
                  plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1e293b', titleFont: { size: 11 }, bodyFont: { size: 10 }, padding: 10, cornerRadius: 8 } },
                  scales: {
                    x: { grid: { color: 'rgba(148,163,184,0.08)' }, ticks: { color: '#94a3b8', font: { size: 10 } } },
                    y: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 10 } } },
                  },
                }}
              />
            </div>
          ) : (
            <div className="h-52 flex flex-col items-center justify-center text-muted-foreground">
              <span className="text-3xl mb-2 opacity-40">🧬</span>
              <p className="text-xs font-semibold">No breed data yet</p>
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM ROW */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Farms */}
        <div className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Top Farms</h3>
            <span className="text-[9px] font-mono text-muted-foreground/60">{Object.keys(stats.owner_counts).length} total</span>
          </div>
          <p className="text-[10px] text-muted-foreground mb-4">Ranked by registered fowl count</p>
          {topOwners.length > 0 ? (
            <div className="space-y-3">
              {topOwners.map(([farm, count], i) => {
                const rankIcons = ['🥇', '🥈', '🥉'];
                const rankColors = ['text-amber-400', 'text-slate-300', 'text-amber-600'];
                return (
                  <div key={farm} className="group">
                    <div className="flex items-center gap-3">
                      <span className={`text-sm w-6 text-center shrink-0 ${i < 3 ? '' : 'text-muted-foreground'}`}>
                        {i < 3 ? rankIcons[i] : <span className="text-[10px] font-black">#{i + 1}</span>}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-card-foreground truncate">{farm}</span>
                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            <span className="text-xs font-black text-amber-400">{count}</span>
                            <span className="text-[9px] text-muted-foreground">fowls</span>
                          </div>
                        </div>
                        <div className="w-full h-1.5 bg-muted/50 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700 ease-out"
                            style={{
                              width: `${(count / maxOwnerCount) * 100}%`,
                              background: i === 0 ? 'linear-gradient(90deg, #f59e0b, #d97706)' : i === 1 ? 'linear-gradient(90deg, #94a3b8, #64748b)' : i === 2 ? 'linear-gradient(90deg, #d97706, #92400e)' : 'linear-gradient(90deg, rgba(148,163,184,0.4), rgba(148,163,184,0.2))',
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <span className="text-3xl mb-2 opacity-40">🏟️</span>
              <p className="text-xs font-semibold">No farm data yet</p>
            </div>
          )}
        </div>

        {/* Platform Health */}
        <div className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Platform Health</h3>
            <span className="text-[9px] font-mono text-emerald-400 font-bold uppercase">Healthy</span>
          </div>
          <p className="text-[10px] text-muted-foreground mb-4">System status and key performance indicators</p>
          <div className="space-y-3">
            <HealthRow label="User Registration" value={`${stats.active_users} / ${stats.total_users}`} rate={userActiveRate} color="emerald" />
            <HealthRow label="Fowl Registry" value={`${stats.active_fowls} / ${stats.total_fowls}`} rate={fowlActiveRate} color="emerald" />
            <HealthRow label="Match Activity" value={`${stats.total_matches} logged`} rate={stats.total_matches > 0 ? 100 : 0} color="sky" />
            <HealthRow label="Fowl Mortality" value={`${stats.deceased} deceased`} rate={deceasedRate} color="rose" />
            <HealthRow label="Active Farms" value={`${Object.keys(stats.owner_counts).length} registered`} rate={Object.keys(stats.owner_counts).length > 0 ? 100 : 0} color="amber" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, accent, subtitle, trend }: {
  label: string;
  value: number | string;
  icon: string;
  accent: string;
  subtitle?: string;
  trend?: 'up' | 'down';
}) {
  const accentMap: Record<string, { text: string; bg: string; border: string; glow: string }> = {
    amber: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', glow: 'shadow-amber-500/5' },
    emerald: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', glow: 'shadow-emerald-500/5' },
    sky: { text: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20', glow: 'shadow-sky-500/5' },
    purple: { text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', glow: 'shadow-purple-500/5' },
    rose: { text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', glow: 'shadow-rose-500/5' },
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
            {trend === 'up' ? '↗ Active' : '↘ Low'}
          </span>
        )}
      </div>
      <p className={`text-2xl sm:text-3xl font-black ${a.text} tracking-tight`}>{value}</p>
      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1.5">{label}</p>
      {subtitle && <p className="text-[10px] text-muted-foreground/70 mt-1 font-medium">{subtitle}</p>}
    </div>
  );
}

function HealthRow({ label, value, rate, color }: {
  label: string;
  value: string;
  rate: number;
  color: string;
}) {
  const colorMap: Record<string, { bar: string; text: string }> = {
    emerald: { bar: 'bg-emerald-500', text: 'text-emerald-400' },
    sky: { bar: 'bg-sky-500', text: 'text-sky-400' },
    rose: { bar: 'bg-rose-500', text: 'text-rose-400' },
    amber: { bar: 'bg-amber-500', text: 'text-amber-400' },
  };
  const c = colorMap[color] || colorMap.emerald;

  return (
    <div className="p-3 bg-muted/20 rounded-xl hover:bg-muted/30 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-card-foreground">{label}</span>
        <span className={`text-[10px] font-black ${c.text}`}>{value}</span>
      </div>
      <div className="w-full h-1.5 bg-muted/50 rounded-full overflow-hidden">
        <div
          className={`h-full ${c.bar} rounded-full transition-all duration-700 ease-out`}
          style={{ width: `${Math.min(rate, 100)}%` }}
        ></div>
      </div>
    </div>
  );
}
