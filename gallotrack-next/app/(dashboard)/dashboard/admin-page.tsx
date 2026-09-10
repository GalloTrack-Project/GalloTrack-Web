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
      <div className="min-h-screen w-full flex flex-col items-center justify-center gap-4 bg-background text-foreground">
        <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[11px] font-mono tracking-widest uppercase text-muted-foreground">Loading system dashboard...</p>
      </div>
    );
  }

  if (!stats) return null;

  const statCard = (label: string, value: number | string, accent: string, icon: string, sub?: string) => (
    <div className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl p-5 sm:p-6 shadow-2xs">
      <div className="flex items-center justify-between">
        <p className={`text-3xl sm:text-4xl font-black ${accent}`}>{value}</p>
        <span className="text-2xl opacity-60">{icon}</span>
      </div>
      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-2">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>}
    </div>
  );

  const outcomeData = {
    labels: ['Wins', 'Losses', 'Draws'],
    datasets: [{
      data: [stats.wins, stats.losses, stats.draws],
      backgroundColor: ['#10b981', '#f43f5e', '#f59e0b'],
      borderWidth: 0,
    }],
  };

  const genderData = {
    labels: ['Roosters', 'Hens'],
    datasets: [{
      data: [stats.gender_counts.male, stats.gender_counts.female],
      backgroundColor: ['#3b82f6', '#ec4899'],
      borderWidth: 0,
    }],
  };

  const topBreeds = Object.entries(stats.breed_counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const breedBarData = {
    labels: topBreeds.map(([b]) => b),
    datasets: [{
      data: topBreeds.map(([, c]) => c),
      backgroundColor: '#f59e0b',
      borderRadius: 8,
    }],
  };

  const topOwners = Object.entries(stats.owner_counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* HEADER */}
      <div className="rounded-3xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 to-amber-600/5 backdrop-blur-md p-6 sm:p-7">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xl shrink-0 shadow-inner">🛡️</div>
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-card-foreground tracking-tight">System Admin Dashboard</h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-semibold mt-1">Platform-wide overview of all registered users, fowls, and match activity</p>
          </div>
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {statCard('Total Users', stats.total_users, 'text-amber-400', '👥', `${stats.active_users} active`)}
        {statCard('Total Fowls', stats.total_fowls, 'text-emerald-400', '🐓', `${stats.active_fowls} active`)}
        {statCard('Total Matches', stats.total_matches, 'text-sky-400', '⚔️', `${stats.wins}W-${stats.losses}L-${stats.draws}D`)}
        {statCard('Win Rate', stats.total_matches > 0 ? `${Math.round((stats.wins / (stats.wins + stats.losses)) * 100)}%` : 'N/A', 'text-purple-400', '📈')}
        {statCard('Deceased', stats.deceased, 'text-rose-400', '💀', 'post-fight')}
      </div>

      {/* CHARTS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Outcome Distribution */}
        <div className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl p-5 shadow-2xs">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Match Outcomes</h3>
          {stats.total_matches > 0 ? (
            <div className="h-48 flex items-center justify-center">
              <Doughnut data={outcomeData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 10 } } } } }} />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-10">No match data</p>
          )}
        </div>

        {/* Gender Distribution */}
        <div className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl p-5 shadow-2xs">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Fowl Gender Split</h3>
          {stats.total_fowls > 0 ? (
            <div className="h-48 flex items-center justify-center">
              <Doughnut data={genderData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 10 } } } } }} />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-10">No fowl data</p>
          )}
        </div>

        {/* Top Breeds */}
        <div className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl p-5 shadow-2xs">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Top Breeds</h3>
          {topBreeds.length > 0 ? (
            <div className="h-48">
              <Bar data={breedBarData} options={{ responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { grid: { color: 'rgba(148,163,184,0.1)' }, ticks: { color: '#94a3b8', font: { size: 10 } } }, y: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 10 } } } } }} />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-10">No breed data</p>
          )}
        </div>
      </div>

      {/* BOTTOM ROW */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Farms */}
        <div className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl p-5 shadow-2xs">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Top Farms by Fowl Count</h3>
          {topOwners.length > 0 ? (
            <div className="space-y-3">
              {topOwners.map(([farm, count], i) => (
                <div key={farm} className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-muted-foreground w-4">#{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-card-foreground">{farm}</span>
                      <span className="text-[10px] font-bold text-amber-400">{count} fowls</span>
                    </div>
                    <div className="w-full h-1.5 bg-muted/50 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(count / stats.total_fowls) * 100}%` }}></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-6">No farm data</p>
          )}
        </div>

        {/* Quick Stats */}
        <div className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl p-5 shadow-2xs">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Platform Health</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/25 rounded-xl">
              <span className="text-xs font-bold text-card-foreground">User Registration</span>
              <span className="text-xs font-black text-emerald-400">{stats.active_users}/{stats.total_users} active</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/25 rounded-xl">
              <span className="text-xs font-bold text-card-foreground">Fowl Registry</span>
              <span className="text-xs font-black text-emerald-400">{stats.active_fowls}/{stats.total_fowls} active</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/25 rounded-xl">
              <span className="text-xs font-bold text-card-foreground">Match Activity</span>
              <span className="text-xs font-black text-sky-400">{stats.total_matches} logged</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/25 rounded-xl">
              <span className="text-xs font-bold text-card-foreground">Fowl Deceased Rate</span>
              <span className="text-xs font-black text-rose-400">{stats.total_fowls > 0 ? Math.round((stats.deceased / stats.total_fowls) * 100) : 0}%</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/25 rounded-xl">
              <span className="text-xs font-bold text-card-foreground">Active Farms</span>
              <span className="text-xs font-black text-amber-400">{Object.keys(stats.owner_counts).length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
