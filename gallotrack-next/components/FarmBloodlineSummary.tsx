'use client';
import React, { useState } from 'react';
import { useGaloTrack } from '@/lib/context';

export default function FarmBloodlineSummary() {
  const { getFarmBloodlineSummary } = useGaloTrack();
  const [expanded, setExpanded] = useState(false);
  const summary = getFarmBloodlineSummary();

  return (
    <div className="bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-200 rounded-3xl p-5 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">🧬</span>
          <h3 className="text-sm font-black text-teal-800">Farm Bloodline Overview</h3>
        </div>
        <button onClick={() => setExpanded(!expanded)} className="text-[9px] font-bold text-teal-600 hover:text-teal-800 cursor-pointer">
          {expanded ? '▲ Less' : '▼ Details'}
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white/70 border border-teal-100 rounded-2xl p-3 text-center">
          <p className="text-2xl font-black text-teal-700">{summary.totalFowls}</p>
          <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Total Fowls</p>
        </div>
        <div className="bg-white/70 border border-teal-100 rounded-2xl p-3 text-center">
          <p className="text-2xl font-black text-sky-700">{summary.avgPurity}%</p>
          <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Avg Purity</p>
        </div>
        <div className="bg-white/70 border border-teal-100 rounded-2xl p-3 text-center">
          <p className="text-2xl font-black text-emerald-700">{summary.avgHybridVigor}</p>
          <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Avg Vigor</p>
        </div>
        <div className="bg-white/70 border border-teal-100 rounded-2xl p-3 text-center">
          <p className={`text-2xl font-black ${summary.inbreedingRisk > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{summary.inbreedingRisk}</p>
          <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Inbreeding Risk</p>
        </div>
      </div>

      {/* Top Crosses */}
      {summary.topCrosses && summary.topCrosses.length > 0 && (
        <div className="space-y-2">
          <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest">🏆 Top Performing Crosses</p>
          <div className="flex flex-wrap gap-2">
            {summary.topCrosses.map((c) => (
              <span key={c.pattern} className="text-[9px] font-bold bg-white border border-amber-200 px-2.5 py-1 rounded-full text-amber-700">
                <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${c.tier === 'S' ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
                {c.pattern} <span className="text-slate-400">({c.tier}-tier, {c.vigor} vigor)</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Strain Distribution */}
      {summary.strainRankings && summary.strainRankings.length > 0 && (
        <div className="space-y-2">
          <p className="text-[9px] font-black text-teal-700 uppercase tracking-widest">Strain Distribution</p>
          <div className="space-y-1.5">
            {summary.strainRankings.map((s) => (
              <div key={s.strain} className="bg-white/70 border border-teal-100 rounded-xl px-3 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-800">{s.strain}</span>
                  <span className="text-[8px] text-slate-400">({s.count} fowls)</span>
                </div>
                <span className="text-[9px] font-bold text-sky-600">{s.avgWinRate}% avg win rate</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cross Patterns */}
      {summary.crossPatterns.length > 0 && expanded && (
        <div className="space-y-2">
          <p className="text-[9px] font-black text-violet-700 uppercase tracking-widest">Cross Patterns</p>
          <div className="space-y-1.5">
            {summary.crossPatterns.map((cp) => (
              <div key={cp.pattern} className="bg-white/70 border border-violet-200 rounded-xl px-3 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`inline-block w-2 h-2 rounded-full ${cp.tier === 'S' ? 'bg-amber-400' : cp.tier === 'A' ? 'bg-emerald-400' : cp.tier === 'B' ? 'bg-sky-400' : 'bg-slate-300'}`}></span>
                  <span className="text-[10px] font-black text-violet-700">{cp.pattern}</span>
                  <span className="text-[8px] text-slate-400">({cp.count})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${cp.tier === 'S' ? 'bg-amber-100 text-amber-700' : cp.tier === 'A' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{cp.tier}</span>
                  <span className="text-[9px] font-bold text-emerald-600">{cp.avgVigor} vigor</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
