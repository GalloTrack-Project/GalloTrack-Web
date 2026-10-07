'use client';
import React, { useState, useMemo } from 'react';
import type { FowlRecord, MatchRecord, PageId, ProfilingSubTab } from '@/lib/types';
import { generateBreedCompliance } from '@/lib/breed-standards';
import { formatBirdCodeForDisplay, resolveBirdCodes } from '@/lib/bird-code';
import { genderLabel, parentBreedOf, parentBloodlineOf } from '@/lib/helpers';
import { getFowlBloodlineStats } from '@/lib/bloodline-composition';
import BloodlineBreakdown from '@/components/BloodlineBreakdown';
import { Modal } from '@/components/ui';
import { useDebounce } from '@/lib/use-debounce';
import { HighlightText } from '@/components/ui/HighlightText';
import { inspectFowlMatch, compareFowlSearchRelevance, type FowlMatchResult } from '@/lib/lineage';
import { Search, X } from 'lucide-react';
import { useUnitPrefs, weightFromStorage, heightFromStorage, weightUnitLabel, heightUnitLabel } from '@/lib/units';

type FilterTab = 'all' | 'active' | 'breeding' | 'archived' | 'deceased';
type SortKey = 'name' | 'age' | 'strain' | 'winrate' | 'weight';

type Props = {
  fowls: FowlRecord[];
  matchHistory: MatchRecord[];
  search?: string;
  setSearch?: (v: string) => void;
  debouncedSearch?: string;
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
  if (g === 'rooster' || g === 'male') return <span className="text-info text-sm">{'\u2642'}</span>;
  if (g === 'hen' || g === 'female') return <span className="text-pink text-sm">{'\u2640'}</span>;
  return <span className="text-muted-foreground text-sm">{'\u2014'}</span>;
}

function StatusDot({ status }: { status: string }) {
  const s = status?.toLowerCase();
  const color = s === 'active' ? 'bg-emerald-500' : s === 'archived' ? 'bg-amber-400' : s === 'deceased' ? 'bg-rose-400' : 'bg-muted-foreground/50';
  return <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${color}`}></span>;
}

function ComplianceBadge({ grade }: { grade: string }) {
  const cls = grade.startsWith('A') ? 'bg-emerald-500/15 text-success border-emerald-500/30'
    : grade.startsWith('B') ? 'bg-sky-500/15 text-info border-sky-500/30'
    : grade.startsWith('C') ? 'bg-amber-500/15 text-warning border-amber-500/30'
    : 'bg-muted border-border text-muted-foreground';
  return <span className={`text-xs font-black px-2 py-0.5 rounded-sm border ${cls}`}>{grade}</span>;
}

function FowlCard({
  fowl,
  fowls,
  matches,
  onClick,
  code,
  query,
  parentHint,
}: {
  fowl: FowlRecord;
  fowls: FowlRecord[];
  matches: MatchRecord[];
  onClick: () => void;
  code?: string;
  query?: string;
  parentHint?: string;
}) {
  const unitPrefs = useUnitPrefs();
  const stats = useMemo(() => getWinRate(fowl.name, matches), [fowl.name, matches]);
  const sireBreed = parentBreedOf(fowl.sire, fowls);
  const damBreed = parentBreedOf(fowl.dam, fowls);
  const compliance = useMemo(
    () => generateBreedCompliance(fowl.breed, fowl.weight, fowl.height, fowl.leg_color, fowl.color_category),
    [fowl.breed, fowl.weight, fowl.height, fowl.leg_color, fowl.color_category]
  );

  return (
    <button
      type="button"
      onClick={onClick}
      className="group bg-card p-5 rounded-lg border border-border shadow-sm hover:shadow-md hover:border-emerald-500/40 transition-all duration-200 text-left w-full relative overflow-hidden"
    >
      {/* Top accent */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${fowl.status === 'Active' ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : fowl.status === 'Archived' ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-gradient-to-r from-rose-400 to-rose-500'}`}></div>

      {/* Status + Compliance */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <StatusDot status={fowl.status} />
          <span className="text-xs font-bold text-muted-foreground uppercase">{fowl.status}</span>
        </div>
        {compliance.complianceGrade && compliance.matchedStandard && (
          <ComplianceBadge grade={compliance.complianceGrade} />
        )}
      </div>

      {/* Photo + Name + Breed */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-16 h-16 rounded-md bg-muted border border-border overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
          {fowl.image_url ? (
            <img src={fowl.image_url} alt={fowl.name} className="w-full h-full object-cover" />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground/50"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <h4 className="text-sm font-black text-card-foreground truncate group-hover:text-success transition-colors">
              <HighlightText text={fowl.name} query={query} />
            </h4>
            {code && (
              <span className="text-xs font-mono font-black px-1.5 py-0.5 rounded bg-emerald-500/10 text-success border border-emerald-500/20 uppercase shrink-0">
                <HighlightText text={formatBirdCodeForDisplay(code)} query={query} />
              </span>
            )}
          </div>
          {parentHint && (
            <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25">
              <span className="opacity-80 font-normal">Matched via:</span>
              <span className="font-extrabold">{parentHint}</span>
            </div>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-black text-success bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">{fowl.breed}</span>
            {fowl.wing_band ? (
              <span className="text-xs font-mono font-bold text-muted-foreground">
                🏷 <HighlightText text={fowl.wing_band} query={query} />
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <GenderIcon gender={fowl.gender} />
              <span className="text-xs font-semibold text-muted-foreground">{genderLabel(fowl.gender)}</span>
            <span className="text-muted-foreground/40">{'\u00B7'}</span>
            <span className="text-xs font-semibold text-muted-foreground">{getAgeDisplay(fowl.birthdate)}</span>
          </div>
        </div>
      </div>

      {/* Data grid */}
      <div className="grid grid-cols-3 gap-2 text-center mb-3">
        <div className="bg-muted/50 rounded-md py-2 px-1">
          <p className="text-xs font-bold text-muted-foreground uppercase">Age</p>
          <p className="text-sm font-black text-card-foreground">{getAgeDisplay(fowl.birthdate)}</p>
        </div>
        <div className="bg-muted/50 rounded-md py-2 px-1">
          <p className="text-xs font-bold text-muted-foreground uppercase">Weight</p>
          <p className="text-sm font-black text-card-foreground">{fowl.weight ? `${weightFromStorage(fowl.weight, unitPrefs.weightUnit)} ${weightUnitLabel(unitPrefs.weightUnit)}` : '\u2014'}</p>
        </div>
        <div className="bg-muted/50 rounded-md py-2 px-1">
          <p className="text-xs font-bold text-muted-foreground uppercase">Stage</p>
          <p className="text-sm font-black text-card-foreground truncate">{fowl.growth_stage || '\u2014'}</p>
        </div>
      </div>

      {/* Win rate */}
      {stats.total > 0 && (
        <div className="pt-3 border-t border-border">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-muted-foreground uppercase">Performance</span>
            <span className={`text-sm font-black ${stats.winRate >= 50 ? 'text-success' : 'text-danger'}`}>{stats.winRate}%</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${stats.winRate >= 50 ? 'bg-emerald-500' : 'bg-rose-400'}`} style={{ width: `${stats.winRate}%` }}></div>
          </div>
          <p className="text-xs text-muted-foreground font-semibold mt-1.5">{stats.wins}W {'\u00B7'} {stats.losses}L {'\u00B7'} {stats.total} total</p>
        </div>
      )}

      {/* Lineage */}
      {(fowl.sire || fowl.dam) && (
        <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground uppercase">Lineage:</span>
          <span className="text-xs text-muted-foreground font-semibold truncate">
            {fowl.sire || '\u2014'}{sireBreed ? ` (${sireBreed})` : ''} {'\u00D7'} {fowl.dam || '\u2014'}{damBreed ? ` (${damBreed})` : ''}
          </span>
        </div>
      )}
    </button>
  );
}

function FowlDetailModal({ fowl, matches, onClose, fowls, code }: { fowl: FowlRecord; matches: MatchRecord[]; onClose: () => void; fowls: FowlRecord[]; code?: string }) {
  const unitPrefs = useUnitPrefs();
  const stats = getWinRate(fowl.name, matches);
  const compliance = useMemo(
    () => generateBreedCompliance(fowl.breed, fowl.weight, fowl.height, fowl.leg_color, fowl.color_category),
    [fowl.breed, fowl.weight, fowl.height, fowl.leg_color, fowl.color_category]
  );

  return (
    <Modal
      open
      onClose={onClose}
      title={fowl.name}
      className="max-w-lg"
    >
      {code ? (
        <span className="self-start rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-mono text-xs font-semibold uppercase text-success">
          {formatBirdCodeForDisplay(code)}
        </span>
      ) : null}

        <div className="space-y-5">
          {/* Identity */}
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-lg bg-muted border border-border overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
              {fowl.image_url ? <img src={fowl.image_url} alt={fowl.name} className="w-full h-full object-cover" /> : <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground/50"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <StatusDot status={fowl.status} />
                <span className="text-sm font-bold text-muted-foreground">{fowl.status}</span>
                {compliance.matchedStandard && <ComplianceBadge grade={compliance.complianceGrade} />}
              </div>
              <p className="text-sm text-muted-foreground font-semibold">{genderLabel(fowl.gender)} {'\u00B7'} {getAgeDisplay(fowl.birthdate)} {'\u00B7'} {fowl.growth_stage}</p>
              <p className="text-sm font-bold text-success">{fowl.breed}</p>
            </div>
          </div>

          {/* Physical traits */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3 border border-border">
            <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest">Physical Profile</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground font-semibold">Color: </span><span className="font-black text-card-foreground">{fowl.color || '\u2014'}</span></div>
              <div><span className="text-muted-foreground font-semibold">Eye: </span><span className="font-black text-card-foreground">{fowl.eye_variant || '\u2014'}</span></div>
              <div><span className="text-muted-foreground font-semibold">Leg: </span><span className="font-black text-card-foreground">{fowl.leg_color || '\u2014'}</span></div>
              <div><span className="text-muted-foreground font-semibold">Trait: </span><span className="font-black text-success">{fowl.behavior_trait || '\u2014'}</span></div>
              <div><span className="text-muted-foreground font-semibold">Weight: </span><span className="font-black text-card-foreground">{fowl.weight ? `${weightFromStorage(fowl.weight, unitPrefs.weightUnit)} ${weightUnitLabel(unitPrefs.weightUnit)}` : '\u2014'}</span></div>
              <div><span className="text-muted-foreground font-semibold">Height: </span><span className="font-black text-card-foreground">{fowl.height ? `${heightFromStorage(fowl.height, unitPrefs.heightUnit)} ${heightUnitLabel(unitPrefs.heightUnit)}` : '\u2014'}</span></div>
            </div>
          </div>

          {/* Lineage */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3 border border-border">
            <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest">Lineage</h4>
            <BloodlineBreakdown
              stats={getFowlBloodlineStats(fowl, fowls)}
              title="Bloodline Percentage"
              subtitle="Blood split per breed — 50% Sire, 50% Dam"
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-sky-500/10 border border-sky-500/30 rounded-md p-3">
                <p className="text-xs font-black text-info uppercase">Sire</p>
                <p className="text-sm font-black text-card-foreground mt-1">{fowl.sire || '\u2014'}</p>
                {parentBreedOf(fowl.sire, fowls) && <p className="text-xs font-bold text-muted-foreground">{parentBreedOf(fowl.sire, fowls)}</p>}
                {(() => { const s = parentBloodlineOf(fowl.sire, fowls); return s ? <p className="text-xs text-info font-bold">{s.specificPct}% {s.dominant.strain}</p> : null; })()}
              </div>
              <div className="bg-pink-500/10 border border-pink-500/30 rounded-md p-3">
                <p className="text-xs font-black text-pink uppercase">Dam</p>
                <p className="text-sm font-black text-card-foreground mt-1">{fowl.dam || '\u2014'}</p>
                {parentBreedOf(fowl.dam, fowls) && <p className="text-xs font-bold text-muted-foreground">{parentBreedOf(fowl.dam, fowls)}</p>}
                {(() => { const s = parentBloodlineOf(fowl.dam, fowls); return s ? <p className="text-xs text-pink font-bold">{s.specificPct}% {s.dominant.strain}</p> : null; })()}
              </div>
            </div>
          </div>

          {/* Performance */}
          {stats.total > 0 && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-3 border border-border">
              <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest">Match Performance</h4>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-card rounded-md py-2.5 border border-border">
                  <p className="text-xl font-black text-card-foreground">{stats.total}</p>
                  <p className="text-xs font-bold text-muted-foreground uppercase">Total</p>
                </div>
                <div className="bg-emerald-500/10 rounded-md py-2.5 border border-emerald-500/30">
                  <p className="text-xl font-black text-success">{stats.wins}</p>
                  <p className="text-xs font-bold text-success uppercase">Wins</p>
                </div>
                <div className="bg-rose-500/10 rounded-md py-2.5 border border-rose-500/30">
                  <p className="text-xl font-black text-danger">{stats.losses}</p>
                  <p className="text-xs font-bold text-danger uppercase">Losses</p>
                </div>
                <div className={`rounded-md py-2.5 border ${stats.winRate >= 50 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30'}`}>
                  <p className={`text-xl font-black ${stats.winRate >= 50 ? 'text-success' : 'text-danger'}`}>{stats.winRate}%</p>
                  <p className={`text-xs font-bold uppercase ${stats.winRate >= 50 ? 'text-success' : 'text-danger'}`}>Win Rate</p>
                </div>
              </div>
            </div>
          )}

          {/* Breed Compliance */}
          {compliance.matchedStandard && (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-success uppercase tracking-widest">Breed Compliance</h4>
                <div className="flex items-center gap-2">
                  <ComplianceBadge grade={compliance.complianceGrade} />
                  <span className="text-xs font-black text-success">{compliance.overallScore}/100</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground font-semibold">Standard: {compliance.matchedStandard.name} ({compliance.matchedStandard.origin})</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground font-semibold">Weight: </span>
                  <span className={compliance.weightCompliance.status === 'within' ? 'text-success font-black' : 'text-warning font-black'}>
                    {compliance.weightCompliance.actual}kg ({compliance.weightCompliance.status})
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground font-semibold">Height: </span>
                  <span className={compliance.heightCompliance.status === 'within' ? 'text-success font-black' : 'text-warning font-black'}>
                    {compliance.heightCompliance.actual}cm ({compliance.heightCompliance.status})
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground font-semibold">Legs: </span>
                  <span className={compliance.legColorCompliance.status === 'matches' ? 'text-success font-black' : 'text-warning font-black'}>
                    {compliance.legColorCompliance.actual}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground font-semibold">Plumage: </span>
                  <span className={compliance.plumageCompliance.status === 'matches' ? 'text-success font-black' : 'text-warning font-black'}>
                    {compliance.plumageCompliance.actual}
                  </span>
                </div>
              </div>
              {compliance.matchedStandard.fightingStyle && (
                <p className="text-xs text-success/70 font-semibold">Fighting style: {compliance.matchedStandard.fightingStyle}</p>
              )}
              {compliance.recommendations.length > 0 && (
                <div className="space-y-1">
                  {compliance.recommendations.map((r, i) => <p key={i} className="text-xs text-warning">{'\uD83D\uDCA1'} {r}</p>)}
                </div>
              )}
            </div>
          )}
        </div>
    </Modal>
  );
}

export default function MarketplacePage({
  fowls,
  matchHistory,
  search: propSearch,
  setSearch: propSetSearch,
  debouncedSearch: propDebouncedSearch,
  setCurrentPage,
  setProfilingSubTab,
}: Props) {
  const [internalSearch, setInternalSearch] = useState('');
  const search = propSearch !== undefined ? propSearch : internalSearch;
  const setSearch = propSetSearch !== undefined ? propSetSearch : setInternalSearch;

  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [selectedFowl, setSelectedFowl] = useState<FowlRecord | null>(null);
  const [includeParents, setIncludeParents] = useState(false);
  const internalDebouncedQuery = useDebounce(search || '', 250);
  const debouncedQuery = (propDebouncedSearch !== undefined ? propDebouncedSearch : internalDebouncedQuery) || '';

  const tabs: { id: FilterTab; label: string; count: number }[] = useMemo(() => [
    { id: 'all', label: 'All Chickens', count: fowls.length },
    { id: 'active', label: 'Active', count: fowls.filter((f) => f.status === 'Active').length },
    { id: 'breeding', label: 'Breeding Ready', count: fowls.filter((f) => f.status === 'Active' && (f.growth_stage === 'Mature' || f.growth_stage === 'Broodcock' || f.growth_stage === 'Broodhen')).length },
    { id: 'archived', label: 'Archived', count: fowls.filter((f) => f.status === 'Archived').length },
    { id: 'deceased', label: 'Deceased', count: fowls.filter((f) => f.status === 'Deceased').length },
  ], [fowls]);

  const birdCodes = useMemo(() => resolveBirdCodes(fowls), [fowls]);

  const { filteredFowls, matchMap } = useMemo(() => {
    let pool = fowls;
    if (activeTab === 'active') pool = pool.filter((f) => f.status === 'Active');
    else if (activeTab === 'breeding') pool = pool.filter((f) => f.status === 'Active' && (f.growth_stage === 'Mature' || f.growth_stage === 'Broodcock' || f.growth_stage === 'Broodhen'));
    else if (activeTab === 'archived') pool = pool.filter((f) => f.status === 'Archived');
    else if (activeTab === 'deceased') pool = pool.filter((f) => f.status === 'Deceased');

    const matches = new Map<number, FowlMatchResult>();
    let result: FowlRecord[] = [];

    if (debouncedQuery.trim()) {
      for (const f of pool) {
        const code = birdCodes.get(String(f.id)) || null;
        const res = inspectFowlMatch(f, debouncedQuery, code, { includeParents });
        if (res.matched) {
          matches.set(f.id, res);
          result.push(f);
        }
      }
    } else {
      result = [...pool];
    }

    result.sort((a, b) => {
      if (debouncedQuery.trim()) {
        const mA = matches.get(a.id);
        const mB = matches.get(b.id);
        if (mA && mB) {
          const rel = compareFowlSearchRelevance(mA, mB);
          if (rel !== 0) return rel;
        }
      }

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

    return { filteredFowls: result, matchMap: matches };
  }, [fowls, debouncedQuery, includeParents, activeTab, sortKey, matchHistory, birdCodes]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="rounded-lg border border-border bg-card/70 p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-md bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-xl shrink-0 shadow-inner">{'\uD83E\uDDEC'}</div>
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-card-foreground tracking-tight">Chicken Inventory</h1>
            <p className="text-sm text-muted-foreground font-semibold mt-1">All your chickens in one list — status, age, weight, stage, and lineage</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <div className="flex flex-col gap-1.5 flex-1 md:flex-none">
            <div className="relative flex-1 md:w-72">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="search"
                aria-label="Search Inventory"
                placeholder="Search name, ID, or wing band…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    setSearch('');
                  }
                }}
                className="w-full pl-10 pr-9 py-2.5 sm:py-3 border border-border rounded-lg bg-card text-card-foreground placeholder:text-muted-foreground text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-semibold [&::-webkit-search-cancel-button]:appearance-none"
              />
              {search.length > 0 && (
                <button
                  type="button"
                  aria-label="Clear search input"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded-md transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer select-none pl-1">
              <input
                type="checkbox"
                checked={includeParents}
                onChange={(e) => setIncludeParents(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-border text-emerald-600 focus:ring-emerald-500/20 cursor-pointer accent-emerald-600"
              />
              <span>Include parents</span>
            </label>
          </div>
          <button type="button" onClick={() => { setCurrentPage('profiling'); setProfilingSubTab('form'); }} className="self-start sm:self-auto shrink-0 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs font-black px-4 py-3 rounded-lg shadow-sm transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            <span className="hidden sm:inline">Add Chicken</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs + Sort */}
      <div className="flex items-center gap-2 bg-muted rounded-md border border-border p-1 shadow-sm">
        <div className="flex items-center gap-1 overflow-x-auto flex-1 min-w-0">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-3.5 py-2 rounded-sm text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${activeTab === tab.id ? 'bg-emerald-600 text-white shadow-sm' : 'text-muted-foreground hover:bg-muted/60 hover:text-card-foreground'}`}>
              {tab.label}
              <span className={`text-xs font-black px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-border text-muted-foreground'}`}>{tab.count}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 shrink-0 pl-2 border-l border-border">
          <label htmlFor="inventory-sort" className="text-xs font-bold text-muted-foreground whitespace-nowrap hidden sm:inline">Sort</label>
          <select
            id="inventory-sort"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="px-2.5 py-2 rounded-sm text-xs font-bold bg-card text-card-foreground border border-border cursor-pointer focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
          >
            <option value="name">Name (A–Z)</option>
            <option value="age">Age (youngest first)</option>
            <option value="strain">Strain (A–Z)</option>
            <option value="winrate">Win rate (highest)</option>
            <option value="weight">Weight (lightest first)</option>
          </select>
        </div>
      </div>

      {/* Search Result Count Banner */}
      {debouncedQuery.trim() && (
        <div
          data-testid="search-results-banner"
          className="flex items-center justify-between bg-muted/60 px-3.5 py-2 rounded-lg border border-border text-xs font-medium animate-fadeIn"
        >
          <span className="text-muted-foreground">
            Showing <strong className="text-foreground font-black">{filteredFowls.length}</strong> {filteredFowls.length === 1 ? 'result' : 'results'} for &ldquo;<span className="text-emerald-700 dark:text-emerald-400 font-bold">{debouncedQuery}</span>&rdquo;
            {includeParents && <span className="ml-1 opacity-75">(including parents)</span>}
          </span>
          <button
            type="button"
            onClick={() => setSearch('')}
            className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
          >
            Clear search
          </button>
        </div>
      )}

      {/* Grid */}
      {filteredFowls.length === 0 ? (
        <div className="bg-card p-12 text-center rounded-lg border border-border shadow-sm space-y-3.5 max-w-md mx-auto my-6">
          <div className="w-14 h-14 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center text-2xl mx-auto border border-emerald-500/20">
            🔍
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-extrabold text-card-foreground">
              {debouncedQuery.trim() ? `No chickens found for "${debouncedQuery}"` : 'No Chickens Found'}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium max-w-sm mx-auto">
              {debouncedQuery.trim()
                ? 'No chickens match your search in this tab. Check the spelling or enable "Include parents" to search lineage.'
                : 'No chickens match your current filters. Try adjusting your search or add new chickens.'}
            </p>
          </div>
          {debouncedQuery.trim() && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all cursor-pointer"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredFowls.map((fowl) => {
            const m = matchMap.get(fowl.id);
            const parentHint = m?.reason === 'sire' || m?.reason === 'dam' ? m.parentHint : undefined;
            return (
              <FowlCard
                key={fowl.id}
                fowl={fowl}
                fowls={fowls}
                matches={matchHistory}
                code={birdCodes.get(String(fowl.id))}
                onClick={() => setSelectedFowl(fowl)}
                query={debouncedQuery}
                parentHint={parentHint}
              />
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selectedFowl && (
        <FowlDetailModal
          fowl={selectedFowl}
          matches={matchHistory}
          fowls={fowls}
          code={birdCodes.get(String(selectedFowl.id))}
          onClose={() => setSelectedFowl(null)}
        />
      )}
    </div>
  );
}
