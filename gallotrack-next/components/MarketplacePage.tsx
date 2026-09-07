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
  if (g === 'rooster' || g === 'male') return <span className="text-sky-500 text-sm">{'\u2642'}</span>;
  if (g === 'hen' || g === 'female') return <span className="text-pink-500 text-sm">{'\u2640'}</span>;
  return <span className="text-muted-foreground text-sm">{'\u2014'}</span>;
}

function StatusDot({ status }: { status: string }) {
  const s = status?.toLowerCase();
  const color = s === 'active' ? 'bg-emerald-500' : s === 'archived' ? 'bg-amber-400' : s === 'deceased' ? 'bg-rose-400' : 'bg-muted-foreground/50';
  return <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${color}`}></span>;
}

function ComplianceBadge({ grade }: { grade: string }) {
  const cls = grade.startsWith('A') ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
    : grade.startsWith('B') ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
    : grade.startsWith('C') ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
    : 'bg-muted border-border text-muted-foreground';
  return <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${cls}`}>{grade}</span>;
}

function FowlCard({ fowl, matches, onClick }: { fowl: FowlRecord; matches: MatchRecord[]; onClick: () => void }) {
  const stats = useMemo(() => getWinRate(fowl.name, matches), [fowl.name, matches]);
  const compliance = useMemo(
    () => generateBreedCompliance(fowl.breed, fowl.weight, fowl.height, fowl.leg_color, fowl.color_category),
    [fowl.breed, fowl.weight, fowl.height, fowl.leg_color, fowl.color_category]
  );

  return (
    <button
      type="button"
      onClick={onClick}
      className="group bg-card p-5 rounded-2xl border border-border shadow-sm hover:shadow-md hover:border-emerald-500/40 transition-all duration-200 text-left w-full relative overflow-hidden"
    >
      {/* Top accent */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${fowl.status === 'Active' ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : fowl.status === 'Archived' ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-gradient-to-r from-rose-400 to-rose-500'}`}></div>

      {/* Status + Compliance */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <StatusDot status={fowl.status} />
          <span className="text-[10px] font-bold text-muted-foreground uppercase">{fowl.status}</span>
        </div>
        {compliance.complianceGrade && compliance.matchedStandard && (
          <ComplianceBadge grade={compliance.complianceGrade} />
        )}
      </div>

      {/* Photo + Name + Breed */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-16 h-16 rounded-xl bg-muted border border-border overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
          {fowl.image_url ? (
            <img src={fowl.image_url} alt={fowl.name} className="w-full h-full object-cover" />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground/50"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-black text-card-foreground truncate group-hover:text-emerald-400 transition-colors">{fowl.name}</h4>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">{fowl.breed}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <GenderIcon gender={fowl.gender} />
            <span className="text-[11px] font-semibold text-muted-foreground">{fowl.gender}</span>
            <span className="text-muted-foreground/40">{'\u00B7'}</span>
            <span className="text-[11px] font-semibold text-muted-foreground">{getAgeDisplay(fowl.birthdate)}</span>
          </div>
        </div>
      </div>

      {/* Data grid */}
      <div className="grid grid-cols-3 gap-2 text-center mb-3">
        <div className="bg-muted/50 rounded-xl py-2 px-1">
          <p className="text-[9px] font-bold text-muted-foreground uppercase">Age</p>
          <p className="text-xs font-black text-card-foreground">{getAgeDisplay(fowl.birthdate)}</p>
        </div>
        <div className="bg-muted/50 rounded-xl py-2 px-1">
          <p className="text-[9px] font-bold text-muted-foreground uppercase">Weight</p>
          <p className="text-xs font-black text-card-foreground">{fowl.weight || '\u2014'}kg</p>
        </div>
        <div className="bg-muted/50 rounded-xl py-2 px-1">
          <p className="text-[9px] font-bold text-muted-foreground uppercase">Stage</p>
          <p className="text-xs font-black text-card-foreground truncate">{fowl.growth_stage || '\u2014'}</p>
        </div>
      </div>

      {/* Win rate */}
      {stats.total > 0 && (
        <div className="pt-3 border-t border-border">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Performance</span>
            <span className={`text-xs font-black ${stats.winRate >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>{stats.winRate}%</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${stats.winRate >= 50 ? 'bg-emerald-500' : 'bg-rose-400'}`} style={{ width: `${stats.winRate}%` }}></div>
          </div>
          <p className="text-[10px] text-muted-foreground font-semibold mt-1.5">{stats.wins}W {'\u00B7'} {stats.losses}L {'\u00B7'} {stats.total} total</p>
        </div>
      )}

      {/* Lineage */}
      {(fowl.sire || fowl.dam) && (
        <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center gap-2">
          <span className="text-[9px] font-bold text-muted-foreground uppercase">Lineage:</span>
          <span className="text-[10px] text-muted-foreground font-semibold truncate">
            {fowl.sire || '\u2014'} {'\u00D7'} {fowl.dam || '\u2014'}
          </span>
        </div>
      )}
    </button>
  );
}

function FowlDetailModal({ fowl, matches, onClose }: { fowl: FowlRecord; matches: MatchRecord[]; onClose: () => void }) {
  const stats = getWinRate(fowl.name, matches);
  const compliance = useMemo(
    () => generateBreedCompliance(fowl.breed, fowl.weight, fowl.height, fowl.leg_color, fowl.color_category),
    [fowl.breed, fowl.weight, fowl.height, fowl.leg_color, fowl.color_category]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
      <div className="relative bg-card rounded-3xl shadow-2xl border border-border max-w-lg w-full max-h-[85vh] overflow-y-auto animate-fadeIn" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-card/95 backdrop-blur-md border-b border-border px-6 py-4 flex items-center justify-between z-10 rounded-t-3xl">
          <h3 className="text-base font-black text-card-foreground">{fowl.name}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted hover:bg-muted/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Identity */}
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-muted border border-border overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
              {fowl.image_url ? <img src={fowl.image_url} alt={fowl.name} className="w-full h-full object-cover" /> : <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground/50"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <StatusDot status={fowl.status} />
                <span className="text-xs font-bold text-muted-foreground">{fowl.status}</span>
                {compliance.matchedStandard && <ComplianceBadge grade={compliance.complianceGrade} />}
              </div>
              <p className="text-xs text-muted-foreground font-semibold">{fowl.gender} {'\u00B7'} {getAgeDisplay(fowl.birthdate)} {'\u00B7'} {fowl.growth_stage}</p>
              <p className="text-sm font-bold text-emerald-400">{fowl.breed}</p>
            </div>
          </div>

          {/* Physical traits */}
          <div className="bg-muted/50 rounded-2xl p-4 space-y-3 border border-border">
            <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Physical Profile</h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><span className="text-muted-foreground font-semibold">Color: </span><span className="font-black text-card-foreground">{fowl.color || '\u2014'}</span></div>
              <div><span className="text-muted-foreground font-semibold">Eye: </span><span className="font-black text-card-foreground">{fowl.eye_variant || '\u2014'}</span></div>
              <div><span className="text-muted-foreground font-semibold">Leg: </span><span className="font-black text-card-foreground">{fowl.leg_color || '\u2014'}</span></div>
              <div><span className="text-muted-foreground font-semibold">Trait: </span><span className="font-black text-emerald-400">{fowl.behavior_trait || '\u2014'}</span></div>
              <div><span className="text-muted-foreground font-semibold">Weight: </span><span className="font-black text-card-foreground">{fowl.weight || '\u2014'}kg</span></div>
              <div><span className="text-muted-foreground font-semibold">Height: </span><span className="font-black text-card-foreground">{fowl.height || '\u2014'}cm</span></div>
            </div>
          </div>

          {/* Lineage */}
          <div className="bg-muted/50 rounded-2xl p-4 space-y-3 border border-border">
            <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Lineage</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-sky-500/10 border border-sky-500/30 rounded-xl p-3">
                <p className="text-[10px] font-black text-sky-400 uppercase">Sire</p>
                <p className="text-xs font-black text-card-foreground mt-1">{fowl.sire || '\u2014'}</p>
                {fowl.sire_pct ? <p className="text-[10px] text-sky-400 font-bold">{fowl.sire_pct}%</p> : null}
              </div>
              <div className="bg-pink-500/10 border border-pink-500/30 rounded-xl p-3">
                <p className="text-[10px] font-black text-pink-400 uppercase">Dam</p>
                <p className="text-xs font-black text-card-foreground mt-1">{fowl.dam || '\u2014'}</p>
                {fowl.dam_pct ? <p className="text-[10px] text-pink-400 font-bold">{fowl.dam_pct}%</p> : null}
              </div>
            </div>
          </div>

          {/* Performance */}
          {stats.total > 0 && (
            <div className="bg-muted/50 rounded-2xl p-4 space-y-3 border border-border">
              <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Match Performance</h4>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-card rounded-xl py-2.5 border border-border">
                  <p className="text-xl font-black text-card-foreground">{stats.total}</p>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase">Total</p>
                </div>
                <div className="bg-emerald-500/10 rounded-xl py-2.5 border border-emerald-500/30">
                  <p className="text-xl font-black text-emerald-400">{stats.wins}</p>
                  <p className="text-[9px] font-bold text-emerald-400 uppercase">Wins</p>
                </div>
                <div className="bg-rose-500/10 rounded-xl py-2.5 border border-rose-500/30">
                  <p className="text-xl font-black text-rose-400">{stats.losses}</p>
                  <p className="text-[9px] font-bold text-rose-400 uppercase">Losses</p>
                </div>
                <div className={`rounded-xl py-2.5 border ${stats.winRate >= 50 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30'}`}>
                  <p className={`text-xl font-black ${stats.winRate >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>{stats.winRate}%</p>
                  <p className={`text-[9px] font-bold uppercase ${stats.winRate >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>Win Rate</p>
                </div>
              </div>
            </div>
          )}

          {/* Breed Compliance */}
          {compliance.matchedStandard && (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Breed Compliance</h4>
                <div className="flex items-center gap-2">
                  <ComplianceBadge grade={compliance.complianceGrade} />
                  <span className="text-[10px] font-black text-emerald-400">{compliance.overallScore}/100</span>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground font-semibold">Standard: {compliance.matchedStandard.name} ({compliance.matchedStandard.origin})</p>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-muted-foreground font-semibold">Weight: </span>
                  <span className={compliance.weightCompliance.status === 'within' ? 'text-emerald-400 font-black' : 'text-amber-400 font-black'}>
                    {compliance.weightCompliance.actual}kg ({compliance.weightCompliance.status})
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground font-semibold">Height: </span>
                  <span className={compliance.heightCompliance.status === 'within' ? 'text-emerald-400 font-black' : 'text-amber-400 font-black'}>
                    {compliance.heightCompliance.actual}cm ({compliance.heightCompliance.status})
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground font-semibold">Legs: </span>
                  <span className={compliance.legColorCompliance.status === 'matches' ? 'text-emerald-400 font-black' : 'text-amber-400 font-black'}>
                    {compliance.legColorCompliance.actual}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground font-semibold">Plumage: </span>
                  <span className={compliance.plumageCompliance.status === 'matches' ? 'text-emerald-400 font-black' : 'text-amber-400 font-black'}>
                    {compliance.plumageCompliance.actual}
                  </span>
                </div>
              </div>
              {compliance.matchedStandard.fightingStyle && (
                <p className="text-[10px] text-emerald-400/70 font-semibold">Fighting style: {compliance.matchedStandard.fightingStyle}</p>
              )}
              {compliance.recommendations.length > 0 && (
                <div className="space-y-1">
                  {compliance.recommendations.map((r, i) => <p key={i} className="text-[10px] text-amber-400">{'\uD83D\uDCA1'} {r}</p>)}
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

  const tabs: { id: FilterTab; label: string; count: number }[] = useMemo(() => [
    { id: 'all', label: 'All Birds', count: fowls.length },
    { id: 'active', label: 'Active', count: fowls.filter((f) => f.status === 'Active').length },
    { id: 'breeding', label: 'Breeding Ready', count: fowls.filter((f) => f.status === 'Active' && (f.growth_stage === 'Mature' || f.growth_stage === 'Broodcock' || f.growth_stage === 'Broodhen')).length },
    { id: 'archived', label: 'Archived', count: fowls.filter((f) => f.status === 'Archived').length },
    { id: 'deceased', label: 'Deceased', count: fowls.filter((f) => f.status === 'Deceased').length },
  ], [fowls]);

  const filteredFowls = useMemo(() => {
    let result = fowls;

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

    if (activeTab === 'active') result = result.filter((f) => f.status === 'Active');
    else if (activeTab === 'breeding') result = result.filter((f) => f.status === 'Active' && (f.growth_stage === 'Mature' || f.growth_stage === 'Broodcock' || f.growth_stage === 'Broodhen'));
    else if (activeTab === 'archived') result = result.filter((f) => f.status === 'Archived');
    else if (activeTab === 'deceased') result = result.filter((f) => f.status === 'Deceased');

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

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="rounded-3xl border border-border bg-card/70 backdrop-blur-md p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-xl shrink-0 shadow-inner">{'\uD83E\uDDEC'}</div>
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-card-foreground tracking-tight">Breeding Catalog</h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-semibold mt-1">Manage and monitor your gamefowl breeding inventory</p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none md:w-72">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </span>
            <input type="text" placeholder="Search name, strain, sire, dam..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-3.5 py-3 border border-border rounded-2xl bg-card text-card-foreground placeholder:text-muted-foreground text-xs outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-semibold" />
          </div>
          <button type="button" onClick={() => { setCurrentPage('profiling'); setProfilingSubTab('form'); }} className="shrink-0 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-[11px] font-black px-4 py-3 rounded-2xl shadow-sm transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            <span className="hidden sm:inline">Add Fowl</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 bg-muted rounded-xl border border-border p-1 shadow-sm overflow-x-auto">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-3.5 py-2 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${activeTab === tab.id ? 'bg-emerald-600 text-white shadow-sm' : 'text-muted-foreground hover:bg-muted/60 hover:text-card-foreground'}`}>
            {tab.label}
            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-border text-muted-foreground'}`}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Grid */}
      {filteredFowls.length === 0 ? (
        <div className="bg-card p-14 text-center rounded-3xl border border-border shadow-sm space-y-3">
          <div className="w-16 h-16 bg-muted text-muted-foreground rounded-full flex items-center justify-center text-3xl mx-auto">
            {'\uD83E\uDDEC'}
          </div>
          <h3 className="text-base font-extrabold text-card-foreground">No Birds Found</h3>
          <p className="text-xs text-muted-foreground font-medium max-w-sm mx-auto">No gamefowl match your current filters. Try adjusting your search or add new birds.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
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
