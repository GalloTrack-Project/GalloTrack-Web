'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/registry';
import { adminGuard } from '@/lib/admin';

type Match = {
  id: number;
  user_id: string;
  entry_name: string;
  breed: string;
  opponent: string;
  opponent_breed: string;
  location: string;
  type: string;
  outcome: string;
  status: string;
  post_fight_condition: string;
  video_url: string | null;
  date: string;
  created_at: string;
  owner_name: string;
  farm_name: string;
};

type Stats = { total: number; wins: number; losses: draws: number; deceased: number };

export default function AdminMatchAuditPage() {
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<Match[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, wins: 0, losses: 0, draws: 0, deceased: 0 });
  const [search, setSearch] = useState('');
  const [filterOutcome, setFilterOutcome] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterHealth, setFilterHealth] = useState('all');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadMatches = useCallback(async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) return;
      const res = await fetch('/api/admin/matches', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const { matches: data } = await res.json();
        setMatches(data);
        setStats({
          total: data.length,
          wins: data.filter((m: Match) => m.outcome?.toLowerCase() === 'win').length,
          losses: data.filter((m: Match) => m.outcome?.toLowerCase() === 'loss').length,
          draws: data.filter((m: Match) => m.outcome?.toLowerCase() === 'draw').length,
          deceased: data.filter((m: Match) => m.post_fight_condition === 'Deceased').length,
        });
      }
    } catch {
      setToast({ type: 'error', message: 'Failed to load matches' });
      window.setTimeout(() => setToast(null), 3500);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    adminGuard().then((p) => {
      if (!p) return;
      setAuthorized(true);
      loadMatches();
    });
  }, [loadMatches]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return matches.filter((m) => {
      if (q && !m.entry_name.toLowerCase().includes(q) && !m.opponent.toLowerCase().includes(q) && !m.owner_name.toLowerCase().includes(q) && !m.farm_name.toLowerCase().includes(q) && !m.location.toLowerCase().includes(q)) return false;
      if (filterOutcome !== 'all' && m.outcome?.toLowerCase() !== filterOutcome) return false;
      if (filterType !== 'all' && m.type !== filterType) return false;
      if (filterHealth !== 'all' && m.post_fight_condition !== filterHealth) return false;
      return true;
    });
  }, [matches, search, filterOutcome, filterType, filterHealth]);

  if (!authorized || loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center gap-4 bg-background text-foreground">
        <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[11px] font-mono tracking-widest uppercase text-muted-foreground">Loading match records...</p>
      </div>
    );
  }

  const statCard = (label: string, value: number, accent: string, icon: string) => (
    <div className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl p-4 sm:p-5 shadow-2xs">
      <div className="flex items-center justify-between">
        <p className={`text-2xl sm:text-3xl font-black ${accent}`}>{value}</p>
        <span className="text-xl opacity-60">{icon}</span>
      </div>
      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1">{label}</p>
    </div>
  );

  const outcomeColor = (o: string) => {
    switch (o?.toLowerCase()) {
      case 'win': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'loss': return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      case 'draw': return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const healthColor = (h: string) => {
    switch (h) {
      case 'Fit / Recovered': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'Minor Injury': return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'Severely Injured': case 'Critical Condition': return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      case 'Deceased': return 'bg-rose-600/20 text-rose-300 border-rose-600/40';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <div className="min-h-screen w-full bg-background relative overflow-hidden">
      <div className="absolute top-1/4 -left-20 w-72 h-72 bg-amber-400/5 dark:bg-amber-400/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-amber-400/5 dark:bg-amber-400/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 min-h-screen p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        {toast && (
          <div className={`mb-4 text-xs font-bold text-center p-3.5 rounded-xl border animate-fadeIn ${
            toast.type === 'success' ? 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30' : 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30'
          }`}>{toast.message}</div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-card-foreground tracking-tight leading-none">
              Match <span className="text-amber-400">Audit</span>
            </h1>
            <p className="text-[9px] font-mono text-muted-foreground font-bold tracking-widest uppercase mt-1">Review all match results, post-fight conditions, and video evidence</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4 mb-4">
          {statCard('Total Matches', stats.total, 'text-amber-400', '⚔️')}
          {statCard('Wins', stats.wins, 'text-emerald-400', '✅')}
          {statCard('Losses', stats.losses, 'text-rose-400', '❌')}
          {statCard('Draws', stats.draws, 'text-sky-400', '🤝')}
          {statCard('Deceased', stats.deceased, 'text-rose-300', '💀')}
        </div>

        <div className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xs p-4 mb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">🔍</span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by entry, opponent, owner, farm, or location..."
                className="w-full pl-9 pr-4 py-2.5 border border-border rounded-xl text-xs bg-muted/25 focus:bg-card focus:border-amber-500 transition-all font-semibold outline-none text-card-foreground placeholder:text-muted-foreground/60"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <select value={filterOutcome} onChange={(e) => setFilterOutcome(e.target.value)} className="px-3 py-2.5 border border-border rounded-xl text-[10px] font-bold bg-muted/25 focus:border-amber-500 transition-all outline-none text-card-foreground cursor-pointer">
                <option value="all">All Outcomes</option>
                <option value="win">Wins</option>
                <option value="loss">Losses</option>
                <option value="draw">Draws</option>
                <option value="no contest">No Contest</option>
              </select>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="px-3 py-2.5 border border-border rounded-xl text-[10px] font-bold bg-muted/25 focus:border-amber-500 transition-all outline-none text-card-foreground cursor-pointer">
                <option value="all">All Types</option>
                <option value="Derby Match">Derby Match</option>
                <option value="Sweepstakes">Sweepstakes</option>
                <option value="Main Stage">Main Stage</option>
                <option value="Uncategorized">Uncategorized</option>
              </select>
              <select value={filterHealth} onChange={(e) => setFilterHealth(e.target.value)} className="px-3 py-2.5 border border-border rounded-xl text-[10px] font-bold bg-muted/25 focus:border-amber-500 transition-all outline-none text-card-foreground cursor-pointer">
                <option value="all">All Health</option>
                <option value="Fit / Recovered">Fit / Recovered</option>
                <option value="Minor Injury">Minor Injury</option>
                <option value="Severely Injured">Severely Injured</option>
                <option value="Critical Condition">Critical Condition</option>
                <option value="Deceased">Deceased</option>
              </select>
            </div>
          </div>
        </div>

        <div className="md:hidden space-y-3 mb-6">
          {filtered.length === 0 && (
            <div className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl p-8 text-center">
              <p className="text-xs text-muted-foreground font-semibold">No matches found.</p>
            </div>
          )}
          {filtered.map((match) => (
            <div key={match.id} className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl p-4 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-extrabold text-card-foreground">{match.entry_name}</p>
                <div className="flex gap-1.5">
                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${outcomeColor(match.outcome)}`}>{match.outcome}</span>
                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${healthColor(match.post_fight_condition)}`}>{match.post_fight_condition}</span>
                </div>
              </div>
              <div className="text-[9px] text-muted-foreground font-medium space-y-0.5">
                <p>vs <span className="text-card-foreground font-bold">{match.opponent}</span> ({match.opponent_breed || 'Unknown'})</p>
                <p>Type: {match.type} · Location: {match.location}</p>
                <p>Owner: <span className="text-card-foreground font-bold">{match.owner_name}</span> · {match.farm_name}</p>
                {match.date && <p>Date: {new Date(match.date).toLocaleDateString()}</p>}
                {match.video_url && (
                  <p><a href={match.video_url} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300 underline">Video Evidence ↗</a></p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="hidden md:block bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xs overflow-hidden">
          <div className="px-4 sm:px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-card-foreground">All Match Records</h2>
            <span className="text-[9px] font-mono text-muted-foreground font-bold uppercase tracking-wider">{filtered.length} of {matches.length} records</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[1000px]">
              <thead>
                <tr className="text-[9px] font-black text-muted-foreground uppercase tracking-widest border-b border-border bg-muted/30">
                  <th className="px-4 sm:px-5 py-3">Entry</th>
                  <th className="px-4 py-3">Opponent</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Outcome</th>
                  <th className="px-4 py-3">Post-Fight</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Video</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="px-5 py-10 text-center text-xs text-muted-foreground font-semibold">No matches found.</td></tr>
                )}
                {filtered.map((match) => (
                  <tr key={match.id} className="border-b border-border/60 last:border-0 hover:bg-muted/25 transition-colors">
                    <td className="px-4 sm:px-5 py-3.5">
                      <p className="text-xs font-extrabold text-card-foreground">{match.entry_name}</p>
                      <p className="text-[10px] text-muted-foreground">{match.breed}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-[11px] font-bold text-card-foreground">{match.opponent}</p>
                      <p className="text-[10px] text-muted-foreground">{match.opponent_breed || '—'}</p>
                    </td>
                    <td className="px-4 py-3.5 text-[11px] font-bold text-card-foreground">{match.type}</td>
                    <td className="px-4 py-3.5"><span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${outcomeColor(match.outcome)}`}>{match.outcome}</span></td>
                    <td className="px-4 py-3.5"><span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${healthColor(match.post_fight_condition)}`}>{match.post_fight_condition}</span></td>
                    <td className="px-4 py-3.5">
                      <p className="text-[11px] font-bold text-card-foreground truncate">{match.owner_name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{match.farm_name}</p>
                    </td>
                    <td className="px-4 py-3.5 text-[10px] text-muted-foreground font-semibold whitespace-nowrap">{match.date ? new Date(match.date).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3.5">
                      {match.video_url ? (
                        <a href={match.video_url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-amber-400 hover:text-amber-300 underline">View ↗</a>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
