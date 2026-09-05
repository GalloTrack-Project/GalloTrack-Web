'use client';
import React, { useState } from 'react';
import type { FowlRecord, MatchRecord } from '@/lib/types';

type Props = {
  show: boolean;
  onClose: () => void;
  fowls: FowlRecord[];
  matchHistory: MatchRecord[];
};

type FowlStats = {
  fowl: FowlRecord;
  total: number;
  wins: number;
  losses: number;
  draws: number;
  decided: number;
  winRate: number;
};

function computeStats(fowls: FowlRecord[], matchHistory: MatchRecord[]): FowlStats[] {
  return fowls
    .map((f) => {
      const matches = matchHistory.filter((m) => m.entry_name?.trim().toLowerCase() === f.name.trim().toLowerCase());
      const total = matches.length;
      const wins = matches.filter((m) => m.outcome?.toLowerCase() === 'win').length;
      const losses = matches.filter((m) => m.outcome?.toLowerCase() === 'loss').length;
      const draws = matches.filter((m) => m.outcome?.toLowerCase() === 'draw').length;
      const decided = wins + losses;
      const winRate = decided > 0 ? Math.round((wins / decided) * 100) : 0;
      return { fowl: f, total, wins, losses, draws, decided, winRate };
    })
    .sort((a, b) => {
      if (a.decided > 0 && b.decided > 0) return b.winRate - a.winRate;
      if (a.decided > 0) return -1;
      if (b.decided > 0) return 1;
      return a.fowl.name.localeCompare(b.fowl.name);
    });
}

function getTierColor(winRate: number, decided: number): string {
  if (decided === 0) return 'bg-slate-100 text-slate-400 border-slate-200';
  if (winRate >= 70) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (winRate >= 50) return 'bg-sky-50 text-sky-700 border-sky-200';
  if (winRate >= 30) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-rose-50 text-rose-700 border-rose-200';
}

function getTierLabel(winRate: number, decided: number): string {
  if (decided === 0) return 'No Data';
  if (winRate >= 70) return 'Elite';
  if (winRate >= 50) return 'Strong';
  if (winRate >= 30) return 'Average';
  return 'Weak';
}

export default function PerFowlBreakdownModal({ show, onClose, fowls, matchHistory }: Props) {
  const [filter, setFilter] = useState<'all' | 'fought' | 'nofight'>('all');
  const [sortBy, setSortBy] = useState<'winrate' | 'name' | 'fights'>('winrate');

  if (!show) return null;

  let stats = computeStats(fowls, matchHistory);

  if (filter === 'fought') stats = stats.filter((s) => s.decided > 0);
  if (filter === 'nofight') stats = stats.filter((s) => s.decided === 0);

  if (sortBy === 'name') stats = [...stats].sort((a, b) => a.fowl.name.localeCompare(b.fowl.name));
  if (sortBy === 'fights') stats = [...stats].sort((a, b) => b.total - a.total || b.winRate - a.winRate);

  const totalFights = fowls.reduce((sum, f) => {
    return sum + matchHistory.filter((m) => m.entry_name?.trim().toLowerCase() === f.name.trim().toLowerCase()).length;
  }, 0);
  const totalWins = matchHistory.filter((m) => m.outcome?.toLowerCase() === 'win').length;
  const totalLosses = matchHistory.filter((m) => m.outcome?.toLowerCase() === 'loss').length;
  const totalDecided = totalWins + totalLosses;
  const overallWinRate = totalDecided > 0 ? Math.round((totalWins / totalDecided) * 100) : 0;

  const foughtCount = stats.filter((s) => s.decided > 0).length;
  const noFightCount = stats.filter((s) => s.decided === 0).length;
  const eliteCount = stats.filter((s) => s.decided > 0 && s.winRate >= 70).length;
  const strongCount = stats.filter((s) => s.decided > 0 && s.winRate >= 50 && s.winRate < 70).length;
  const avgCount = stats.filter((s) => s.decided > 0 && s.winRate >= 30 && s.winRate < 50).length;
  const weakCount = stats.filter((s) => s.decided > 0 && s.winRate < 30).length;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col relative">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-100 shrink-0">
          <button onClick={onClose} className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all cursor-pointer">✕</button>
          <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <span>📊</span>
            <span>Per-Fowl Performance Breakdown</span>
          </h3>
          <p className="text-[10px] text-slate-400 font-semibold mt-1">Individual win rates and overall aggregate statistics</p>
        </div>

        {/* Overall Summary */}
        <div className="px-6 pt-4 pb-3 shrink-0">
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-4 text-white">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Overall Aggregate</span>
              <span className="text-[9px] font-bold text-slate-400 bg-slate-700 px-2 py-0.5 rounded-full">{totalFights} total fights</span>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center">
                <p className="text-2xl font-black text-white">{overallWinRate}%</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase">Overall Win Rate</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-emerald-400">{totalWins}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase">Total Wins</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-rose-400">{totalLosses}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase">Total Losses</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-sky-400">{fowls.length}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase">Total Fowls</p>
              </div>
            </div>
          </div>

          {/* Tier Summary */}
          <div className="grid grid-cols-5 gap-2 mt-3">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2 text-center">
              <p className="text-lg font-black text-emerald-700">{eliteCount}</p>
              <p className="text-[8px] font-bold text-emerald-600 uppercase">Elite 70%+</p>
            </div>
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-2 text-center">
              <p className="text-lg font-black text-sky-700">{strongCount}</p>
              <p className="text-[8px] font-bold text-sky-600 uppercase">Strong 50-69%</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-2 text-center">
              <p className="text-lg font-black text-amber-700">{avgCount}</p>
              <p className="text-[8px] font-bold text-amber-600 uppercase">Average 30-49%</p>
            </div>
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-2 text-center">
              <p className="text-lg font-black text-rose-700">{weakCount}</p>
              <p className="text-[8px] font-bold text-rose-600 uppercase">Weak &lt;30%</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 text-center">
              <p className="text-lg font-black text-slate-500">{noFightCount}</p>
              <p className="text-[8px] font-bold text-slate-500 uppercase">No Fights</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 pb-2 flex items-center gap-2 shrink-0">
          {(['all', 'fought', 'nofight'] as const).map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)} className={`text-[10px] font-bold px-3 py-1.5 rounded-full border transition-all cursor-pointer ${filter === f ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}>
              {f === 'all' ? `All (${fowls.length})` : f === 'fought' ? `Fought (${foughtCount})` : `No Fight (${noFightCount})`}
            </button>
          ))}
          <div className="flex-1"></div>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 rounded-lg px-2 py-1.5 cursor-pointer">
            <option value="winrate">Sort: Win Rate</option>
            <option value="name">Sort: Name</option>
            <option value="fights">Sort: Fights</option>
          </select>
        </div>

        {/* Individual Fowl List */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-2 font-bold text-slate-500 uppercase tracking-wider">#</th>
                <th className="text-left py-2 font-bold text-slate-500 uppercase tracking-wider">Fowl</th>
                <th className="text-center py-2 font-bold text-slate-500 uppercase tracking-wider">Tier</th>
                <th className="text-center py-2 font-bold text-slate-500 uppercase tracking-wider">Fights</th>
                <th className="text-center py-2 font-bold text-slate-500 uppercase tracking-wider">W-L</th>
                <th className="text-center py-2 font-bold text-slate-500 uppercase tracking-wider">Win Rate</th>
                <th className="text-center py-2 font-bold text-slate-500 uppercase tracking-wider">% of Overall</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s, i) => {
                const pctOfOverall = totalDecided > 0 ? Math.round((s.decided / totalDecided) * 100) : 0;
                return (
                  <tr key={s.fowl.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="py-2 font-bold text-slate-400">{i + 1}</td>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-[9px] shrink-0">
                          {s.fowl.gender === 'Male' ? '🐓' : s.fowl.gender === 'Female' ? '🐔' : '🐣'}
                        </span>
                        <div>
                          <p className="font-black text-slate-800">{s.fowl.name}</p>
                          <p className="text-[9px] text-slate-400 font-semibold">{s.fowl.breed} · {s.fowl.growth_stage || 'N/A'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-2 text-center">
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${getTierColor(s.winRate, s.decided)}`}>
                        {getTierLabel(s.winRate, s.decided)}
                      </span>
                    </td>
                    <td className="py-2 text-center font-bold text-slate-600">{s.total}</td>
                    <td className="py-2 text-center font-bold text-slate-600">{s.wins}W-{s.losses}L</td>
                    <td className="py-2 text-center">
                      {s.decided > 0 ? (
                        <span className={`font-black px-2 py-0.5 rounded-full border ${s.winRate >= 50 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                          {s.winRate}%
                        </span>
                      ) : (
                        <span className="text-slate-300 font-bold">—</span>
                      )}
                    </td>
                    <td className="py-2 text-center">
                      <div className="flex items-center gap-1.5 justify-center">
                        <div className="w-12 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${pctOfOverall}%` }}></div>
                        </div>
                        <span className="font-bold text-slate-500">{pctOfOverall}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {stats.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs font-semibold">No fowls match the current filter.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
