'use client';
import React, { useState, useMemo } from 'react';
import type { FowlRecord, MatchRecord, PageId, ProfilingSubTab } from '@/lib/types';
import { generateBreedCompliance } from '@/lib/breed-standards';

type FilterTab = 'all' | 'active' | 'breeding' | 'archived' | 'deceased';
type SortKey = 'name' | 'age' | 'strain' | 'winrate' | 'weight';

type Props = {
  fowls: FowlRecord[];
  matchHistory: MatchRecord[];
  search: string;
  setSearch: (v: string) => void;
  debouncedSearch: string;
  setCurrentPage: (v: PageId) => void;
  setProfilingSubTab: (v: ProfilingSubTab) => void;
};

function getWinRate(fowlName: string, matches: MatchRecord[]) {
  const m = matches.filter((x) => x.entry_name?.trim().toLowerCase() === fowlName.trim().toLowerCase());
  const wins = m.filter((x) => x.outcome?.toLowerCase() === 'win').length;
  const losses = m.filter((x) => x.outcome?.toLowerCase() === 'loss').length;
  const total = m.length;
  const decided = wins + losses;
  const winRate = decided > 0 ? Math.round((wins / decided) * 100) : 0;
  return { total, wins, losses, winRate };
}

function getAgeDisplay(birthdate: string) {
  if (!birthdate) return 'N/A';
  const b = new Date(birthdate);
  const now = new Date();
  const diffMs = now.getTime() - b.getTime();
  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (totalDays < 30) return `${totalDays}d`;
  const months = Math.floor(totalDays / 30);
  if (months < 12) return `${months}mo`;
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  return remMonths > 0 ? `${years}y ${remMonths}mo` : `${years}y`;
}

function getAgeDays(birthdate: string) {
  if (!birthdate) return 9999;
  const b = new Date(birthdate);
  const now = new Date();
  return Math.floor((now.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

function GenderIcon({ gender }: { gender: string }) {
  const g = gender?.toLowerCase();
  if (g === 'rooster' || g === 'male') return <span className="text-sky-500">♂</span>;
  if (g === 'hen' || g === 'female') return <span className="text-pink-500">♀</span>;
  return <span className="text-slate-400">—</span>;
}

function StatusDot({ status }: { status: string }) {
  const s = status?.toLowerCase();
  const color = s === 'active' ? 'bg-emerald-500' : s === 'archived' ? 'bg-amber-400' : s === 'deceased' ? 'bg-rose-400' : 'bg-slate-400';
  return <span className={`w-2 h-2 rounded-full shrink-0 ${color}`}></span>;
}

function ComplianceBadge({ grade }: { grade: string }) {
  const cls = grade.startsWith('A') ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : grade.startsWith('B') ? 'bg-sky-50 text-sky-700 border-sky-200'
    : grade.startsWith('C') ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-slate-50 text-slate-500 border-slate-200';
  return <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${cls}`}>{grade}</span>;
}

function FowlCard({ fowl, matches, onClick }: { fowl: FowlRecord; matches: MatchRecord[]; onClick: () => void }) {
  const stats = getWinRate(fowl.name, matches);
  const compliance = generateBreedCompliance(fowl.breed, fowl.weight, fowl.height, fowl.leg_color, fowl.color_category);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-emerald-300/60 transition-all duration-200 text-left w-full relative overflow-hidden"
    >
      {/* Top accent line */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${fowl.status === 'Active' ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : fowl.status === 'Archived' ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-gradient-to-r from-rose-400 to-rose-500'}`}></div>

      {/* Status + Compliance badges */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <StatusDot status={fowl.status} />
          <span className="text-[9px] font-bold text-slate-400 uppercase">{fowl.status}</span>
        </div>
        {compliance.complianceGrade && compliance.matchedStandard && (
          <ComplianceBadge grade={compliance.complianceGrade} />
        )}
      </div>

      {/* Photo + Name */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-200/80 overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
          {fowl.image_url ? (
            <img src={fowl.image_url} alt={fowl.name} className="w-full h-full object-cover" />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-300"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-black text-slate-900 truncate group-hover:text-emerald-700 transition-colors">{fowl.name}</h4>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">{fowl.breed}</span>
            <GenderIcon gender={fowl.gender} />
            <span className="text-[9px] font-bold text-slate-400">{fowl.gender}</span>
          </div>
        </div>
      </div>

      {/* Data grid */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-slate-50/80 rounded-lg py-1.5 px-1">
          <p className="text-[7px] font-bold text-slate-400 uppercase">Age</p>
          <p className="text-[10px] font-black text-slate-700">{getAgeDisplay(fowl.birthdate)}</p>
        </div>
        <div className="bg-slate-50/80 rounded-lg py-1.5 px-1">
          <p className="text-[7px] font-bold text-slate-400 uppercase">Weight</p>
          <p className="text-[10px] font-black text-slate-700">{fowl.weight || '—'}kg</p>
        </div>
        <div className="bg-slate-50/80 rounded-lg py-1.5 px-1">
          <p className="text-[7px] font-bold text-slate-400 uppercase">Stage</p>
          <p className="text-[10px] font-black text-slate-700">{fowl.growth_stage || '—'}</p>
        </div>
      </div>

      {/* Win rate bar */}
      {stats.total > 0 && (
        <div className="mt-3 pt-2.5 border-t border-slate-100">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[8px] font-bold text-slate-400 uppercase">Performance</span>
            <span className={`text-[9px] font-black ${stats.winRate >= 50 ? 'text-emerald-600' : 'text-rose-600'}`}>{stats.winRate}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${stats.winRate >= 50 ? 'bg-emerald-500' : 'bg-rose-400'}`} style={{ width: `${stats.winRate}%` }}></div>
          </div>
          <p className="text-[8px] text-slate-400 font-semibold mt-1">{stats.wins}W · {stats.losses}L · {stats.total} total</p>
        </div>
      )}

      {/* Lineage hint */}
      {(fowl.sire || fowl.dam) && (
        <div className="mt-2.5 pt-2 border-t border-slate-50 flex items-center gap-1.5">
          <span className="text-[7px] font-bold text-slate-400 uppercase">Lineage:</span>
          <span className="text-[8px] text-slate-500 font-semibold truncate">
            {fowl.sire || '—'} × {fowl.dam || '—'}
          </span>
        </div>
      )}
    </button>
  );
}

function FowlDetailModal({ fowl, matches, onClose }: { fowl: FowlRecord; matches: MatchRecord[]; onClose: () => void }) {
  const stats = getWinRate(fowl.name, matches);
  const compliance = generateBreedCompliance(fowl.breed, fowl.weight, fowl.height, fowl.leg_color, fowl.color_category);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
      <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[85vh] overflow-y-auto animate-fadeIn" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-3xl z-10">
          <h3 className="text-base font-black text-slate-900">{fowl.name}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-all cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Photo + Identity */}
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
              {fowl.image_url ? <img src={fowl.image_url} alt={fowl.name} className="w-full h-full object-cover" /> : <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-300"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <StatusDot status={fowl.status} />
                <span className="text-xs font-bold text-slate-500">{fowl.status}</span>
                {compliance.matchedStandard && <ComplianceBadge grade={compliance.complianceGrade} />}
              </div>
              <p className="text-xs text-slate-400 font-semibold">{fowl.gender} · {getAgeDisplay(fowl.birthdate)} · {fowl.growth_stage}</p>
              <p className="text-xs font-bold text-emerald-700">{fowl.breed}</p>
            </div>
          </div>

          {/* Physical traits */}
          <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
            <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Physical Profile</h4>
            <div className="grid grid-cols-2 gap-3 text-[11px]">
              <div><span className="text-slate-400 font-semibold">Color: </span><span className="font-black text-slate-800">{fowl.color || '—'}</span></div>
              <div><span className="text-slate-400 font-semibold">Eye: </span><span className="font-black text-slate-800">{fowl.eye_variant || '—'}</span></div>
              <div><span className="text-slate-400 font-semibold">Leg: </span><span className="font-black text-slate-800">{fowl.leg_color || '—'}</span></div>
              <div><span className="text-slate-400 font-semibold">Trait: </span><span className="font-black text-emerald-700">{fowl.behavior_trait || '—'}</span></div>
              <div><span className="text-slate-400 font-semibold">Weight: </span><span className="font-black text-slate-800">{fowl.weight || '—'}kg</span></div>
              <div><span className="text-slate-400 font-semibold">Height: </span><span className="font-black text-slate-800">{fowl.height || '—'}cm</span></div>
            </div>
          </div>

          {/* Lineage */}
          <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
            <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Lineage</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-sky-50 border border-sky-200 rounded-xl p-2.5">
                <p className="text-[8px] font-black text-sky-600 uppercase">🐓 Sire</p>
                <p className="text-[11px] font-black text-slate-800 mt-0.5">{fowl.sire || '—'}</p>
                {fowl.sire_pct ? <p className="text-[8px] text-sky-500 font-bold">{fowl.sire_pct}%</p> : null}
              </div>
              <div className="bg-pink-50 border border-pink-200 rounded-xl p-2.5">
                <p className="text-[8px] font-black text-pink-600 uppercase">🐔 Dam</p>
                <p className="text-[11px] font-black text-slate-800 mt-0.5">{fowl.dam || '—'}</p>
                {fowl.dam_pct ? <p className="text-[8px] text-pink-500 font-bold">{fowl.dam_pct}%</p> : null}
              </div>
            </div>
          </div>

          {/* Performance */}
          {stats.total > 0 && (
            <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
              <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Match Performance</h4>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-white rounded-xl py-2 border border-slate-100">
                  <p className="text-lg font-black text-slate-900">{stats.total}</p>
                  <p className="text-[8px] font-bold text-slate-400 uppercase">Total</p>
                </div>
                <div className="bg-emerald-50 rounded-xl py-2 border border-emerald-200">
                  <p className="text-lg font-black text-emerald-700">{stats.wins}</p>
                  <p className="text-[8px] font-bold text-emerald-600 uppercase">Wins</p>
                </div>
                <div className="bg-rose-50 rounded-xl py-2 border border-rose-200">
                  <p className="text-lg font-black text-rose-700">{stats.losses}</p>
                  <p className="text-[8px] font-bold text-rose-600 uppercase">Losses</p>
                </div>
                <div className={`rounded-xl py-2 border ${stats.winRate >= 50 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                  <p className={`text-lg font-black ${stats.winRate >= 50 ? 'text-emerald-700' : 'text-rose-700'}`}>{stats.winRate}%</p>
                  <p className={`text-[8px] font-bold uppercase ${stats.winRate >= 50 ? 'text-emerald-600' : 'text-rose-600'}`}>Win Rate</p>
                </div>
              </div>
            </div>
          )}

          {/* Breed Compliance */}
          {compliance.matchedStandard && (
            <div className="bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-[9px] font-black text-sky-700 uppercase tracking-widest">📏 Breed Compliance</h4>
                <div className="flex items-center gap-2">
                  <ComplianceBadge grade={compliance.complianceGrade} />
                  <span className="text-[9px] font-black text-sky-700">{compliance.overallScore}/100</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 font-semibold">Standard: {compliance.matchedStandard.name} ({compliance.matchedStandard.origin})</p>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div>
                  <span className="text-slate-400 font-semibold">Weight: </span>
                  <span className={compliance.weightCompliance.status === 'within' ? 'text-emerald-600 font-black' : 'text-amber-600 font-black'}>
                    {compliance.weightCompliance.actual}kg ({compliance.weightCompliance.status})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold">Height: </span>
                  <span className={compliance.heightCompliance.status === 'within' ? 'text-emerald-600 font-black' : 'text-amber-600 font-black'}>
                    {compliance.heightCompliance.actual}cm ({compliance.heightCompliance.status})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold">Legs: </span>
                  <span className={compliance.legColorCompliance.status === 'matches' ? 'text-emerald-600 font-black' : 'text-amber-600 font-black'}>
                    {compliance.legColorCompliance.actual}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold">Plumage: </span>
                  <span className={compliance.plumageCompliance.status === 'matches' ? 'text-emerald-600 font-black' : 'text-amber-600 font-black'}>
                    {compliance.plumageCompliance.actual}
                  </span>
                </div>
              </div>
              {compliance.matchedStandard.fightingStyle && (
                <p className="text-[9px] text-sky-600 font-semibold">Fighting style: {compliance.matchedStandard.fightingStyle}</p>
              )}
              {compliance.recommendations.length > 0 && (
                <div className="space-y-1">
                  {compliance.recommendations.map((r, i) => <p key={i} className="text-[9px] text-amber-600">💡 {r}</p>)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MarketplacePage({ fowls, matchHistory, search, setSearch, debouncedSearch, setCurrentPage, setProfilingSubTab }: Props) {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [selectedFowl, setSelectedFowl] = useState<FowlRecord | null>(null);

  const tabs: { id: FilterTab; label: string }[] = [
    { id: 'all', label: 'All Birds' },
    { id: 'active', label: 'Active' },
    { id: 'breeding', label: 'Breeding Ready' },
    { id: 'archived', label: 'Archived' },
    { id: 'deceased', label: 'Deceased' },
  ];

  const filteredFowls = useMemo(() => {
    let result = fowls;

    // Search
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter((f) =>
        f.name.toLowerCase().includes(q) ||
        f.breed.toLowerCase().includes(q) ||
        f.gender.toLowerCase().includes(q) ||
        f.color?.toLowerCase().includes(q) ||
        f.sire?.toLowerCase().includes(q) ||
        f.dam?.toLowerCase().includes(q)
      );
    }

    // Tab filter
    if (activeTab === 'active') result = result.filter((f) => f.status === 'Active');
    else if (activeTab === 'breeding') result = result.filter((f) => f.status === 'Active' && (f.growth_stage === 'Mature' || f.growth_stage === 'Broodcock' || f.growth_stage === 'Broodhen'));
    else if (activeTab === 'archived') result = result.filter((f) => f.status === 'Archived');
    else if (activeTab === 'deceased') result = result.filter((f) => f.status === 'Deceased');

    // Sort
    result = [...result].sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name);
      if (sortKey === 'age') return getAgeDays(a.birthdate) - getAgeDays(b.birthdate);
      if (sortKey === 'strain') return a.breed.localeCompare(b.breed);
      if (sortKey === 'weight') return (Number(a.weight) || 0) - (Number(b.weight) || 0);
      if (sortKey === 'winrate') {
        const ra = getWinRate(a.name, matchHistory);
        const rb = getWinRate(b.name, matchHistory);
        return rb.winRate - ra.winRate;
      }
      return 0;
    });

    return result;
  }, [fowls, debouncedSearch, activeTab, sortKey, matchHistory]);

  // Stats
  const totalActive = fowls.filter((f) => f.status === 'Active').length;
  const breedingReady = fowls.filter((f) => f.status === 'Active' && (f.growth_stage === 'Mature' || f.growth_stage === 'Broodcock' || f.growth_stage === 'Broodhen')).length;
  const avgWinRate = useMemo(() => {
    const active = fowls.filter((f) => f.status === 'Active');
    if (active.length === 0) return 0;
    const rates = active.map((f) => getWinRate(f.name, matchHistory).winRate);
    return Math.round(rates.reduce((a, b) => a + b, 0) / rates.length);
  }, [fowls, matchHistory]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Breeding Catalog</h1>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Manage and monitor your gamefowl breeding inventory</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none sm:w-72">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </span>
            <input type="text" placeholder="Search name, strain, sire, dam..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-3.5 py-3 border border-slate-300 rounded-2xl bg-white text-neutral-900 placeholder:text-neutral-400 text-xs outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all font-semibold" />
          </div>
          <button type="button" onClick={() => { setCurrentPage('profiling'); setProfilingSubTab('form'); }} className="shrink-0 bg-slate-900 hover:bg-emerald-700 active:scale-[0.98] text-white text-[11px] font-black px-4 py-3 rounded-2xl shadow-sm transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            <span className="hidden sm:inline">Add Fowl</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center text-lg shrink-0">🐓</div>
          <div>
            <p className="text-xl font-black text-slate-900 leading-none">{totalActive}</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Active</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-violet-50 border border-violet-100 rounded-xl flex items-center justify-center text-lg shrink-0">🧬</div>
          <div>
            <p className="text-xl font-black text-slate-900 leading-none">{breedingReady}</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Breeding Ready</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-sky-50 border border-sky-100 rounded-xl flex items-center justify-center text-lg shrink-0">📊</div>
          <div>
            <p className="text-xl font-black text-slate-900 leading-none">{avgWinRate}%</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Avg Win Rate</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center text-lg shrink-0">🧬</div>
          <div>
            <p className="text-xl font-black text-slate-900 leading-none">{fowls.length}</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Total Birds</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs + Sort */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-white rounded-xl border border-slate-200/80 p-1 shadow-sm overflow-x-auto">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-3.5 py-2 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}>
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold text-slate-400 uppercase">Sort:</span>
          <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} className="p-2 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 bg-white outline-none focus:border-emerald-500 cursor-pointer shadow-sm">
            <option value="name">Name</option>
            <option value="age">Age</option>
            <option value="strain">Strain</option>
            <option value="weight">Weight</option>
            <option value="winrate">Win Rate</option>
          </select>
          <span className="text-[10px] font-bold text-slate-400">{filteredFowls.length} bird{filteredFowls.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Grid */}
      {filteredFowls.length === 0 ? (
        <div className="bg-white p-14 text-center rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center text-3xl mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </div>
          <h3 className="text-base font-extrabold text-slate-800">No Birds Found</h3>
          <p className="text-xs text-slate-400 font-medium max-w-sm mx-auto">No gamefowl match your current filters. Try adjusting your search or add new birds.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFowls.map((fowl) => (
            <FowlCard key={fowl.id} fowl={fowl} matches={matchHistory} onClick={() => setSelectedFowl(fowl)} />
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedFowl && <FowlDetailModal fowl={selectedFowl} matches={matchHistory} onClose={() => setSelectedFowl(null)} />}
    </div>
  );
}
