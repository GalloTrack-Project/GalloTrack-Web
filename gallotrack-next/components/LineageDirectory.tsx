'use client';
import React, { useState } from 'react';
import type { FowlRecord, MatchRecord, PairingStats } from '@/lib/types';

interface LineageDirectoryProps {
  fowls: FowlRecord[];
  matchHistory: MatchRecord[];
  pairingAnalytics: { all: Map<string, PairingStats>; ranked: PairingStats[] };
  search: string;
  setSearch: (v: string) => void;
  debouncedSearch: string;
  setSelectedFowlForDetails: (f: FowlRecord) => void;
}

export default function LineageDirectory({
  fowls,
  matchHistory,
  pairingAnalytics,
  search,
  setSearch,
  debouncedSearch,
  setSelectedFowlForDetails,
}: LineageDirectoryProps) {
  const [expandedSires, setExpandedSires] = useState<Set<string>>(new Set());
  const [expandedDams, setExpandedDams] = useState<Set<string>>(new Set());
  const [expandedSubgroups, setExpandedSubgroups] = useState<Set<string>>(new Set());

  const toggleSire = (name: string) => {
    setExpandedSires((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };
  const toggleDam = (name: string) => {
    setExpandedDams((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };
  const toggleSubgroup = (key: string) => {
    setExpandedSubgroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const linked = fowls.filter((f) => {
    const s = (f.sire || '').trim().toLowerCase();
    const d = (f.dam || '').trim().toLowerCase();
    return s && d && s !== 'foundation stock' && d !== 'foundation stock';
  });

  const getChildMatchStats = (childName: string) => {
    const fMatches = matchHistory.filter((x) => x.entry_name?.trim().toLowerCase() === childName.trim().toLowerCase());
    const total = fMatches.length;
    const wins = fMatches.filter((x) => x.outcome?.toLowerCase() === 'win').length;
    const losses = fMatches.filter((x) => x.outcome?.toLowerCase() === 'loss').length;
    const decided = wins + losses;
    const winRate = decided > 0 ? Math.round((wins / decided) * 100) : 0;
    return { total, wins, losses, decided, winRate };
  };

  const groupStats = (children: FowlRecord[]) => {
    let total = 0, wins = 0, losses = 0;
    children.forEach((c) => {
      const s = getChildMatchStats(c.name);
      total += s.total; wins += s.wins; losses += s.losses;
    });
    const decided = wins + losses;
    const winRate = decided > 0 ? Math.round((wins / decided) * 100) : 0;
    return { total, wins, losses, decided, winRate };
  };

  const rankByWinRate = (children: FowlRecord[]) => {
    return [...children].sort((a, b) => {
      const sa = getChildMatchStats(a.name);
      const sb = getChildMatchStats(b.name);
      if (sb.decided !== sa.decided) return sb.decided - sa.decided;
      return sb.winRate - sa.winRate;
    });
  };

  const sireMap = new Map<string, FowlRecord[]>();
  fowls.forEach((f) => {
    const sire = (f.sire || '').trim();
    if (!sire || sire.toLowerCase() === 'foundation stock') return;
    const arr = sireMap.get(sire) || [];
    arr.push(f);
    sireMap.set(sire, arr);
  });
  const sireEntries = Array.from(sireMap.entries())
    .filter(([, c]) => c.length >= 1)
    .sort((a, b) => b[1].length - a[1].length);

  const damMap = new Map<string, FowlRecord[]>();
  fowls.forEach((f) => {
    const dam = (f.dam || '').trim();
    if (!dam || dam.toLowerCase() === 'foundation stock') return;
    const arr = damMap.get(dam) || [];
    arr.push(f);
    damMap.set(dam, arr);
  });
  const damEntries = Array.from(damMap.entries())
    .filter(([, c]) => c.length >= 1)
    .sort((a, b) => b[1].length - a[1].length);

  const familyMap = new Map<string, FowlRecord[]>();
  linked.forEach((f) => {
    const key = `${(f.sire || '').trim().toLowerCase()}|||${(f.dam || '').trim().toLowerCase()}`;
    const arr = familyMap.get(key) || [];
    arr.push(f);
    familyMap.set(key, arr);
  });
  const fullFamilies = Array.from(familyMap.values())
    .filter((g) => g.length >= 2)
    .sort((a, b) => b.length - a.length);

  const q = debouncedSearch.trim().toLowerCase();
  const matchSearch = (g: FowlRecord[]) => {
    if (!q) return true;
    const first = g[0];
    return `${first.sire} ${first.dam}`.toLowerCase().includes(q) || g.some((f) => f.name.toLowerCase().includes(q));
  };
  const fullFiltered = fullFamilies.filter(matchSearch);

  const buildSubgroups = (children: FowlRecord[], groupBy: 'dam' | 'sire') => {
    const map = new Map<string, FowlRecord[]>();
    children.forEach((c) => {
      const key = groupBy === 'dam' ? (c.dam || 'Unknown').trim() : (c.sire || 'Unknown').trim();
      const arr = map.get(key) || [];
      arr.push(c);
      map.set(key, arr);
    });
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  };

  const EmptyState = ({ title, hint }: { title: string; hint: string }) => (
    <div className="bg-white p-10 text-center rounded-3xl border border-slate-200/80 shadow-sm space-y-2">
      <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center text-2xl mx-auto">🧬</div>
      <h3 className="text-sm font-extrabold text-slate-800">{title}</h3>
      <p className="text-xs text-slate-400 font-medium max-w-sm mx-auto">{hint}</p>
    </div>
  );

  const renderChildRow = (child: FowlRecord, bestId: number | null) => {
    const stats = getChildMatchStats(child.name);
    const isBest = child.id === bestId;
    return (
      <button
        key={child.id}
        type="button"
        onClick={() => setSelectedFowlForDetails(child)}
        className="group w-full flex items-center justify-between gap-3 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl px-4 py-3 transition-all cursor-pointer"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${child.status === 'Active' ? 'bg-emerald-500' : child.status === 'Archived' ? 'bg-amber-400' : child.status === 'Deceased' ? 'bg-rose-400' : 'bg-slate-400'}`}></span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-[11px] font-black text-slate-800 group-hover:text-emerald-700 truncate">{child.name}</p>
              {isBest && stats.decided > 0 && (
                <span className="text-[7px] font-black bg-amber-400 text-amber-900 px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">Best</span>
              )}
            </div>
            <p className="text-[9px] text-slate-400 font-semibold truncate">
              {child.breed} · {child.gender} · {child.age || 'N/A'}
            </p>
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {stats.total > 0 ? (
            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${stats.winRate >= 50 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
              {stats.winRate}% · {stats.wins}W-{stats.losses}L
            </span>
          ) : (
            <span className="text-[9px] font-bold text-slate-300">No fights</span>
          )}
        </div>
      </button>
    );
  };

  const renderSubgroupExpandable = (
    parentName: string,
    parentKind: 'sire' | 'dam',
    subgroups: [string, FowlRecord[]][],
  ) => {
    if (subgroups.length <= 1) return null;
    const prefix = parentKind === 'sire' ? 'sire' : 'dam';
    return (
      <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
          {parentKind === 'sire' ? '🐔 Sibling Subgroups by Dam' : '🐓 Sibling Subgroups by Sire'}
        </p>
        {subgroups.map(([otherParent, members]) => {
          const sgKey = `${prefix}|||${parentName}|||${otherParent}`;
          const sgExpanded = expandedSubgroups.has(sgKey);
          const sgStats = groupStats(members);
          const ranked = rankByWinRate(members);
          const bestId = ranked.length > 0 && ranked[0].id ? ranked[0].id : null;
          return (
            <div key={sgKey} className="bg-slate-50/80 border border-slate-200/60 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSubgroup(sgKey)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-slate-100/80 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs">{parentKind === 'sire' ? '🐔' : '🐓'}</span>
                  <span className="text-[10px] font-black text-slate-700 truncate">{otherParent}</span>
                  <span className="text-[8px] font-mono text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded-full shrink-0">
                    {members.length} bird{members.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {sgStats.decided > 0 && (
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full border ${sgStats.winRate >= 50 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                      {sgStats.winRate}%
                    </span>
                  )}
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`text-slate-400 transition-transform duration-200 ${sgExpanded ? 'rotate-180' : ''}`}>
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </div>
              </button>
              {sgExpanded && (
                <div className="border-t border-slate-200/60 bg-white p-3 space-y-1.5 animate-fadeIn">
                  {ranked.map((child) => renderChildRow(child, bestId))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderParentTree = (
    entries: [string, FowlRecord[]][],
    expandedSet: Set<string>,
    toggleFn: (name: string) => void,
    kind: 'sire' | 'dam',
    color: 'sky' | 'pink',
  ) => {
    const colorMap = {
      sky: { bg: 'bg-sky-100', border: 'border-sky-200', hoverBg: 'hover:bg-sky-50/50', icon: '🐓' },
      pink: { bg: 'bg-pink-100', border: 'border-pink-200', hoverBg: 'hover:bg-pink-50/50', icon: '🐔' },
    };
    const c = colorMap[color];
    const otherLabel = kind === 'sire' ? 'dam' : 'sire';
    return (
      <div className="space-y-3">
        {entries.map(([parentName, children]) => {
          const isExpanded = expandedSet.has(parentName);
          const gs = groupStats(children);
          const males = children.filter((ch) => ch.gender?.toLowerCase() === 'rooster' || ch.gender?.toLowerCase() === 'male').length;
          const females = children.length - males;
          const subgroups = buildSubgroups(children, kind === 'sire' ? 'dam' : 'sire');
          const multiPartner = subgroups.length > 1;
          const ranked = rankByWinRate(children);
          const bestId = ranked.length > 0 ? ranked[0].id : null;
          return (
            <div key={parentName} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden transition-all">
              <button
                type="button"
                onClick={() => toggleFn(parentName)}
                className={`w-full flex items-center justify-between gap-3 p-4 sm:p-5 text-left ${c.hoverBg} transition-colors cursor-pointer`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-xl ${c.bg} ${c.border} flex items-center justify-center text-lg shrink-0`}>{c.icon}</div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-slate-900 truncate">{parentName}</p>
                    <p className="text-[10px] text-slate-400 font-semibold">
                      {children.length} offspring · {males} male{males !== 1 ? 's' : ''} · {females} female{females !== 1 ? 's' : ''}
                      {multiPartner && <span className="ml-1 text-violet-600">· {subgroups.length} {otherLabel}s</span>}
                      {gs.decided > 0 && <span className={`ml-1.5 ${color === 'sky' ? 'text-sky-600' : 'text-pink-600'}`}>· {gs.winRate}% group win rate</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {gs.decided > 0 && (
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${gs.winRate >= 50 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                      {gs.wins}W-{gs.losses}L
                    </span>
                  )}
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </div>
              </button>
              {isExpanded && (
                <div className="border-t border-slate-100 bg-slate-50/50 p-4 sm:p-5 space-y-2 animate-fadeIn">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">All Offspring — Ranked by Performance</p>
                    {bestId && ranked[0] && getChildMatchStats(ranked[0].name).decided > 0 && (
                      <span className="text-[8px] font-black bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                        🏆 Top: {ranked[0].name}
                      </span>
                    )}
                  </div>
                  {ranked.map((child) => renderChildRow(child, bestId))}
                  {renderSubgroupExpandable(parentName, kind, subgroups)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderFullFamilyCard = (g: FowlRecord[], index: number) => {
    const ps = pairingAnalytics.all.get(`${(g[0].sire || '').trim().toLowerCase()}|||${(g[0].dam || '').trim().toLowerCase()}`);
    const ranked = rankByWinRate(g);
    const bestId = ranked.length > 0 ? ranked[0].id : null;
    return (
      <div key={`full-${index}`} className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm relative overflow-hidden flex flex-col">
        <span className="absolute top-0 right-0 bg-emerald-50 border-l border-b border-emerald-200 text-emerald-700 text-[8px] font-black px-3 py-1 rounded-bl-2xl uppercase tracking-wider flex items-center gap-1 shadow-2xs">
          <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
          Full Sibling Family
        </span>
        <div className="flex items-center justify-between pr-24">
          <h4 className="font-black text-slate-900 text-base">Family {index + 1}</h4>
          <span className="text-[9px] font-mono font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">{g.length} birds</span>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3">
            <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">🐓 Sire</p>
            <p className="text-[11px] font-black text-slate-800 mt-0.5 truncate">{g[0].sire}</p>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3">
            <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest">🐔 Dam</p>
            <p className="text-[11px] font-black text-slate-800 mt-0.5 truncate">{g[0].dam}</p>
          </div>
        </div>
        <div className="space-y-1.5 mt-3">
          {ranked.map((m) => renderChildRow(m, bestId))}
        </div>
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">🔗 Pairing Win Rate</span>
          {ps && ps.totalFights > 0 ? (
            <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${ps.winRate >= 50 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
              {ps.winRate}% · {ps.wins}W-{ps.losses}L
            </span>
          ) : (
            <span className="text-[10px] font-bold text-slate-400">No match data yet</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Sibling &amp; Family Lineage Directory</h1>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Tap any parent to expand their offspring tree — compare siblings, find the best performers per bloodline</p>
        </div>
        <div className="relative w-full sm:w-72">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </span>
          <input type="text" placeholder="Search family, sire, dam or bird name..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-3.5 py-3 border border-slate-300 rounded-2xl bg-white text-neutral-900 placeholder:text-neutral-400 text-xs outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all font-semibold" />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Full-Sibling Families', value: fullFiltered.length, icon: '👥' },
          { label: 'Sire Offspring Groups', value: sireEntries.length, icon: '🐓' },
          { label: 'Dam Offspring Groups', value: damEntries.length, icon: '🐔' },
          { label: 'Total Birds Tracked', value: fowls.length, icon: '🧬' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 flex items-center gap-4">
            <div className="w-11 h-11 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center text-xl shrink-0">{s.icon}</div>
            <div className="min-w-0">
              <p className="text-2xl font-black text-slate-900 leading-none">{s.value}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-1">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {(() => {
        const rankedPairings = pairingAnalytics.ranked;
        if (rankedPairings.length === 0) return null;
        const best = rankedPairings[0];
        const worst = rankedPairings[rankedPairings.length - 1];
        const eliteCount = rankedPairings.filter((p) => p.decided >= 3 && p.winRate >= 70).length;
        const weakCount = rankedPairings.filter((p) => p.decided >= 3 && p.winRate < 50).length;
        return (
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/60 rounded-3xl p-5 sm:p-6 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-9 h-9 bg-emerald-600 text-white rounded-xl flex items-center justify-center text-base">🏆</span>
              <div>
                <h3 className="text-sm font-black text-slate-900">Breeding Recommendation</h3>
                <p className="text-[10px] text-slate-500 font-semibold">Based on sibling and pairing performance data</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white/80 border border-emerald-200/50 rounded-2xl p-3">
                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">🏆 Best Cross</p>
                <p className="text-xs font-black text-slate-800 mt-1">{best.sire} × {best.dam}</p>
                <p className="text-[10px] font-bold text-emerald-700">{best.winRate}% win rate · {best.wins}W-{best.losses}L</p>
              </div>
              {eliteCount > 0 && (
                <div className="bg-white/80 border border-emerald-200/50 rounded-2xl p-3">
                  <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">✅ Elite Crosses</p>
                  <p className="text-2xl font-black text-emerald-700 mt-1">{eliteCount}</p>
                  <p className="text-[10px] font-bold text-slate-500">crosses with 70%+ win rate</p>
                </div>
              )}
              {weakCount > 0 && (
                <div className="bg-white/80 border border-rose-200/50 rounded-2xl p-3">
                  <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest">⚠️ Avoid</p>
                  <p className="text-xs font-black text-slate-800 mt-1">{worst.sire} × {worst.dam}</p>
                  <p className="text-[10px] font-bold text-rose-600">{worst.winRate}% win rate · Consider different pairing</p>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center text-base">👥</div>
          <div>
            <h2 className="text-base font-black text-slate-900 tracking-tight">Full-Sibling Families</h2>
            <p className="text-[11px] text-slate-400 font-bold">Same Sire and same Dam — iisang tatay at iisang nanay. Ranked by win rate.</p>
          </div>
        </div>
        {linked.length === 0 ? (
          <EmptyState title="No Lineage Data Yet" hint="Encode gamefowl with Sire and Dam to start grouping families automatically." />
        ) : fullFiltered.length === 0 ? (
          <EmptyState title="No Full-Sibling Families Found" hint="Birds need at least one sibling with the same Sire and Dam to form a family." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {fullFiltered.map((g, i) => renderFullFamilyCard(g, i))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-sky-100 text-sky-700 rounded-xl flex items-center justify-center text-base">🐓</div>
          <div>
            <h2 className="text-base font-black text-slate-900 tracking-tight">Sire Offspring Tree</h2>
            <p className="text-[11px] text-slate-400 font-bold">Same Father, different Mothers — iisang tatay, magkakaibang nanay. Tap to expand and compare.</p>
          </div>
        </div>
        {sireEntries.length === 0 ? (
          <EmptyState title="No Sire Offspring Yet" hint="Encode gamefowl with a Sire name to build the parent-to-offspring tree." />
        ) : (
          renderParentTree(sireEntries, expandedSires, toggleSire, 'sire', 'sky')
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-pink-100 text-pink-700 rounded-xl flex items-center justify-center text-base">🐔</div>
          <div>
            <h2 className="text-base font-black text-slate-900 tracking-tight">Dam Offspring Tree</h2>
            <p className="text-[11px] text-slate-400 font-bold">Same Mother, different Sires — iisang nanay, magkakaibang tatay. Tap to expand and compare.</p>
          </div>
        </div>
        {damEntries.length === 0 ? (
          <EmptyState title="No Dam Offspring Yet" hint="Encode gamefowl with a Dam name to build the parent-to-offspring tree." />
        ) : (
          renderParentTree(damEntries, expandedDams, toggleDam, 'dam', 'pink')
        )}
      </section>
    </div>
  );
}
