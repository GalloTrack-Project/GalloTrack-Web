'use client';
import React, { useState } from 'react';
import type { FowlRecord, MatchRecord, PairingStats } from '@/lib/types';
import { Dna, Users, Link2, Trophy, CheckCircle, AlertTriangle, GitBranch, Network, Swords } from 'lucide-react';
import ChickenIcon from '@/components/ChickenIcon';
import PedigreeTree from '@/components/PedigreeTree';
import FamilyTree from '@/components/FamilyTree';
import { buildBreedingPairs } from '@/lib/family-tree';
import { familyCounts } from '@/lib/family-stats';
import { genderLabel } from '@/lib/helpers';
import { fowlMatchesQuery } from '@/lib/lineage';
import { resolveBirdCodes } from '@/lib/bird-code';
import { rankFowls, bestFowl, bestYearFor, type RankingMetric } from '@/lib/ranking';
import { RANKING_METRIC_LABELS } from '@/lib/settings';
import { useUserSettings } from '@/lib/hooks/use-user-settings';
import { useUI } from '@/lib/contexts/ui-context';

const isMaleChild = (c: FowlRecord) => c.gender?.toLowerCase() === 'rooster' || c.gender?.toLowerCase() === 'male';

function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="bg-card p-10 text-center rounded-lg border border-border shadow-sm space-y-2">
      <div className="w-12 h-12 bg-muted text-muted-foreground rounded-full flex items-center justify-center mx-auto"><Dna className="w-6 h-6" /></div>
      <h3 className="text-sm font-extrabold text-card-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground font-medium max-w-sm mx-auto">{hint}</p>
    </div>
  );
}

interface LineageDirectoryProps {
  fowls: FowlRecord[];
  matchHistory: MatchRecord[];
  pairingAnalytics: { all: Map<string, PairingStats>; ranked: PairingStats[] };
  search: string;
  setSearch: (v: string) => void;
  debouncedSearch: string;
  setSelectedFowlForDetails: (f: FowlRecord) => void;
}

function FamilyCard({ g, index, pairingAnalytics, getChildMatchStats, setSelectedFowlForDetails, onShowFights, rankingMetric, rankingMinMatches, matchHistory }: { g: FowlRecord[]; index: number; pairingAnalytics: { all: Map<string, PairingStats> }; getChildMatchStats: (name: string) => { total: number; wins: number; losses: number; decided: number; winRate: number }; setSelectedFowlForDetails: (f: FowlRecord) => void; onShowFights: (f: FowlRecord) => void; rankingMetric: RankingMetric; rankingMinMatches: number; matchHistory: MatchRecord[] }) {
  const [expanded, setExpanded] = useState(false);
  const ps = pairingAnalytics.all.get(`${(g[0].sire || '').trim().toLowerCase()}|||${(g[0].dam || '').trim().toLowerCase()}`);

  let total = 0, wins = 0, losses = 0;
  g.forEach((c) => { const s = getChildMatchStats(c.name); total += s.total; wins += s.wins; losses += s.losses; });
  const decided = wins + losses;
  const groupWinRate = decided > 0 ? Math.round((wins / decided) * 100) : 0;

  const ranked = rankFowls(g, getChildMatchStats, rankingMetric, rankingMinMatches);
  const bestChild = bestFowl(g, getChildMatchStats, rankingMetric, rankingMinMatches);
  const bestId = bestChild?.id ?? null;
  const bestTitle = bestChild
    ? `Best by ${RANKING_METRIC_LABELS[rankingMetric] || rankingMetric}${bestYearFor(bestChild.name, matchHistory) ? ` · best year ${bestYearFor(bestChild.name, matchHistory)}` : ''}`
    : undefined;

  const males = g.filter(isMaleChild).length;
  const females = g.length - males;
  const roosterOffspring = ranked.filter(isMaleChild);
  const henOffspring = ranked.filter((c) => !isMaleChild(c));
  const visibleRoosters = expanded ? roosterOffspring : roosterOffspring.slice(0, 3);
  const visibleHens = expanded ? henOffspring : henOffspring.slice(0, 3);
  const hasMore = ranked.length > 6;

  const renderOffspringRow = (child: FowlRecord, i: number) => {
    const cs = getChildMatchStats(child.name);
    const isBest = child.id === bestId;
    return (
      <div
        key={child.id}
        className="group w-full flex items-stretch gap-1.5 bg-muted/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border border-border hover:border-emerald-300 dark:hover:border-emerald-700 rounded-md pl-3.5 pr-2 py-2 transition-all"
      >
        <button
          type="button"
          onClick={() => setSelectedFowlForDetails(child)}
          className="flex-1 flex items-center justify-between gap-3 text-left min-w-0 cursor-pointer"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xs font-black text-muted-foreground/40 w-4 shrink-0">{i + 1}</span>
            <span className={`w-2 h-2 rounded-full shrink-0 ${child.status === 'Active' ? 'bg-emerald-500' : child.status === 'Archived' ? 'bg-amber-400' : child.status === 'Deceased' ? 'bg-rose-400' : 'bg-muted-foreground'}`}></span>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <p className="text-xs font-black text-card-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-400 truncate">{child.name}</p>
                {isBest && cs.decided > 0 && (
                  <span className="text-xs font-black bg-amber-400 text-amber-900 px-1 py-0.5 rounded uppercase tracking-wider shrink-0" title={bestTitle}>Best</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground font-semibold truncate">{genderLabel(child.gender)} · {child.age || 'N/A'}</p>
            </div>
          </div>
          <div className="shrink-0">
            {cs.total > 0 ? (
              <span className={`text-xs font-black px-2 py-0.5 rounded-full border ${cs.winRate >= 50 ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'}`}>
              {cs.winRate}% · {cs.wins}W-{cs.losses}L
            </span>
            ) : (
              <span className="text-xs font-bold text-muted-foreground/50">No fights</span>
            )}
          </div>
        </button>
        <button
          type="button"
          onClick={() => onShowFights(child)}
          aria-label={`View all fights for ${child.name}`}
          title="View all fights"
          className="shrink-0 self-center flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-muted-foreground hover:text-emerald-700 dark:hover:text-emerald-400 border border-border hover:border-emerald-400 rounded-md px-2 py-1.5 transition-colors cursor-pointer"
        >
          <Swords className="w-3 h-3" />
          Fights
        </button>
      </div>
    );
  };

  return (
    <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
      <div className="px-5 pt-5 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-md flex items-center justify-center shrink-0"><Users className="w-5 h-5 text-emerald-700 dark:text-emerald-400" /></div>
          <div>
            <h4 className="text-sm font-black text-card-foreground">Family {index + 1}</h4>
            <p className="text-xs text-muted-foreground font-semibold">{g.length} chickens · {males} male · {females} female</p>
          </div>
        </div>
        <span className="text-xs font-black bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-full uppercase tracking-wider">Full Siblings</span>
      </div>
      <div className="px-5 pb-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 rounded-lg p-3.5 text-center">
            <p className="text-xs font-black text-info dark:text-sky-400 uppercase tracking-widest mb-1"><ChickenIcon className="w-3 h-3 inline" /> Sire</p>
            <p className="text-sm font-black text-card-foreground truncate">{g[0].sire}</p>
          </div>
          <div className="bg-pink-50 dark:bg-pink-950/30 border border-pink-200 dark:border-pink-800 rounded-lg p-3.5 text-center">
            <p className="text-xs font-black text-pink uppercase tracking-widest mb-1"><ChickenIcon className="w-3 h-3 inline" /> Dam</p>
            <p className="text-sm font-black text-card-foreground truncate">{g[0].dam}</p>
          </div>
        </div>
      </div>
      <div className="px-5 pb-4">
        <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-2">Offspring</p>
        {roosterOffspring.length > 0 && (
          <div className="mb-3">
              <p className="text-xs font-black text-info dark:text-sky-400 uppercase tracking-widest mb-1.5">🐓 Sire · {roosterOffspring.length}</p>
            <div className="space-y-1.5">
              {visibleRoosters.map((child, i) => renderOffspringRow(child, i))}
            </div>
          </div>
        )}
        {henOffspring.length > 0 && (
          <div className="mb-3">
              <p className="text-xs font-black text-pink uppercase tracking-widest mb-1.5">🐔 Dam · {henOffspring.length}</p>
            <div className="space-y-1.5">
              {visibleHens.map((child, i) => renderOffspringRow(child, i))}
            </div>
          </div>
        )}
        {hasMore && (
          <button type="button" onClick={() => setExpanded(!expanded)} className="w-full mt-2 text-xs font-black text-success dark:text-emerald-400 hover:underline py-1 cursor-pointer">
            {expanded ? 'Show less' : `View all ${ranked.length} offspring`}
          </button>
        )}
      </div>
      <div className="px-5 py-3 bg-muted/30 border-t border-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-muted-foreground"><Link2 className="w-3 h-3 inline" /> Pairing Win Rate</span>
          {decided > 0 && (
            <span className={`text-xs font-black px-2 py-0.5 rounded-full border ${groupWinRate >= 50 ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'}`}>
              {wins}W-{losses}L
            </span>
          )}
        </div>
        {ps && ps.totalFights > 0 ? (
          <span className={`text-xs font-black px-2.5 py-1 rounded-full border ${ps.winRate >= 50 ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'}`}>
            {ps.winRate}%
          </span>
        ) : (
          <span className="text-xs font-bold text-muted-foreground/50">No match data yet</span>
        )}
      </div>
    </div>
  );
}

type LineageTab = 'tree' | 'families' | 'sire' | 'dam' | 'pedigree';

export default function LineageDirectory({
  fowls,
  matchHistory,
  pairingAnalytics,
  search,
  setSearch,
  debouncedSearch,
  setSelectedFowlForDetails,
}: LineageDirectoryProps) {
  const [activeTab, setActiveTab] = useState<LineageTab>('families');
  const ui = useUI();
  const settings = useUserSettings();
  const openFights = (f: FowlRecord) => ui.setFightHistoryFowl(f);
  const [expandedSires, setExpandedSires] = useState<Set<string>>(new Set());
  const [expandedDams, setExpandedDams] = useState<Set<string>>(new Set());
  const [expandedSubgroups, setExpandedSubgroups] = useState<Set<string>>(new Set());
  const birdCodes = React.useMemo(() => resolveBirdCodes(fowls), [fowls]);
  const breedingPairs = React.useMemo(() => buildBreedingPairs(fowls), [fowls]);

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

  // Ranking compares each chicken many times — memoize per render.
  const statsCache = new Map<string, ReturnType<typeof getChildMatchStats>>();
  const cachedStats = (name: string) => {
    let s = statsCache.get(name);
    if (!s) {
      s = getChildMatchStats(name);
      statsCache.set(name, s);
    }
    return s;
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

  const rankOffspring = (children: FowlRecord[]) =>
    rankFowls(children, cachedStats, settings.ranking_metric, settings.ranking_min_matches);
  const bestOf = (children: FowlRecord[]) =>
    bestFowl(children, cachedStats, settings.ranking_metric, settings.ranking_min_matches);
  const metricLabel = RANKING_METRIC_LABELS[settings.ranking_metric] || settings.ranking_metric;
  const bestTitleFor = (f: FowlRecord | null) =>
    f
      ? `Best by ${metricLabel}${bestYearFor(f.name, matchHistory) ? ` · best year ${bestYearFor(f.name, matchHistory)}` : ''}`
      : undefined;

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
    return g.some((f) => fowlMatchesQuery(f, q));
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

  const renderChildRow = (child: FowlRecord, bestId: number | null) => {
    const stats = getChildMatchStats(child.name);
    const isBest = child.id === bestId;
    return (
      <div
        key={child.id}
        className="group w-full flex items-stretch gap-1.5 bg-card hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border border-border hover:border-emerald-300 dark:hover:border-emerald-700 rounded-md pl-4 pr-2.5 py-2 transition-all"
      >
        <button
          type="button"
          onClick={() => setSelectedFowlForDetails(child)}
          className="flex-1 flex items-center justify-between gap-3 text-left min-w-0 cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${child.status === 'Active' ? 'bg-emerald-500' : child.status === 'Archived' ? 'bg-amber-400' : child.status === 'Deceased' ? 'bg-rose-400' : 'bg-muted-foreground'}`}></span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-black text-card-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-400 truncate">{child.name}</p>
                {isBest && stats.decided > 0 && (
                  <span className="text-xs font-black bg-amber-400 text-amber-900 px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0" title={bestTitleFor(child)}>Best</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground font-semibold truncate">
                {child.breed} · {genderLabel(child.gender)} · {child.age || 'N/A'}
              </p>
            </div>
          </div>
          <div className="shrink-0">
            {stats.total > 0 ? (
              <span className={`text-xs font-black px-2 py-0.5 rounded-full border ${stats.winRate >= 50 ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'}`}>
                {stats.winRate}% · {stats.wins}W-{stats.losses}L
              </span>
            ) : (
              <span className="text-xs font-bold text-muted-foreground/50">No fights</span>
            )}
          </div>
        </button>
        <button
          type="button"
          onClick={() => openFights(child)}
          aria-label={`View all fights for ${child.name}`}
          title="View all fights"
          className="shrink-0 self-center flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-muted-foreground hover:text-emerald-700 dark:hover:text-emerald-400 border border-border hover:border-emerald-400 rounded-md px-2 py-1.5 transition-colors cursor-pointer"
        >
          <Swords className="w-3 h-3" />
          Fights
        </button>
      </div>
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
      <div className="mt-3 pt-3 border-t border-border space-y-2">
        <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">
          {parentKind === 'sire' ? <><ChickenIcon className="w-3 h-3 inline" /> Sibling Subgroups by Dam</> : <><ChickenIcon className="w-3 h-3 inline" /> Sibling Subgroups by Sire</>}
        </p>
        {subgroups.map(([otherParent, members]) => {
          const sgKey = `${prefix}|||${parentName}|||${otherParent}`;
          const sgExpanded = expandedSubgroups.has(sgKey);
          const sgStats = groupStats(members);
          const ranked = rankOffspring(members);
          const bestId = bestOf(members)?.id ?? null;
          return (
            <div key={sgKey} className="bg-muted/50 border border-border rounded-md overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSubgroup(sgKey)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-muted/80 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm">{parentKind === 'sire' ? <ChickenIcon className="w-4 h-4" /> : <ChickenIcon className="w-4 h-4" />}</span>
                  <span className="text-xs font-black text-card-foreground truncate">{otherParent}</span>
                  <span className="text-xs font-mono text-muted-foreground bg-card border border-border px-1.5 py-0.5 rounded-full shrink-0">
                    {members.length} chicken{members.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {sgStats.decided > 0 && (
                    <span className={`text-xs font-black px-1.5 py-0.5 rounded-full border ${sgStats.winRate >= 50 ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'}`}>
                      {sgStats.winRate}%
                    </span>
                  )}
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`text-muted-foreground transition-transform duration-200 ${sgExpanded ? 'rotate-180' : ''}`}>
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </div>
              </button>
              {sgExpanded && (
                <div className="border-t border-border bg-card p-3 space-y-1.5 animate-fadeIn">
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
      sky: { bg: 'bg-sky-100 dark:bg-sky-950/50', border: 'border-sky-200 dark:border-sky-800', hoverBg: 'hover:bg-sky-50/50 dark:hover:bg-sky-950/20', icon: 'sire', text: 'text-sky-700 dark:text-sky-400' },
      pink: { bg: 'bg-pink-100 dark:bg-pink-950/50', border: 'border-pink-200 dark:border-pink-800', hoverBg: 'hover:bg-pink-50/50 dark:hover:bg-pink-950/20', icon: 'dam', text: 'text-pink' },
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
          const ranked = rankOffspring(children);
          const roosters = ranked.filter(isMaleChild);
          const hens = ranked.filter((c) => !isMaleChild(c));
          const bestChild = bestOf(children);
          const bestId = bestChild?.id ?? null;
          return (
            <div key={parentName} className="bg-card rounded-lg border border-border shadow-sm overflow-hidden transition-all">
              <button
                type="button"
                onClick={() => toggleFn(parentName)}
                className={`w-full flex items-center justify-between gap-3 p-4 sm:p-5 text-left ${c.hoverBg} transition-colors cursor-pointer`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-md ${c.bg} ${c.border} flex items-center justify-center shrink-0`}>{c.icon === 'sire' ? <ChickenIcon className="w-5 h-5" /> : <ChickenIcon className="w-5 h-5" />}</div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-card-foreground truncate">{parentName}</p>
                    <p className="text-xs text-muted-foreground font-semibold">
                      {children.length} offspring · {males} male{males !== 1 ? 's' : ''} · {females} female{females !== 1 ? 's' : ''}
                      {multiPartner && <span className={`ml-1 ${c.text}`}>· {subgroups.length} {otherLabel}s</span>}
                      {gs.decided > 0 && <span className={`ml-1.5 ${c.text}`}>· {gs.winRate}% group win rate</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {gs.decided > 0 && (
                    <span className={`text-xs font-black px-2 py-0.5 rounded-full border ${gs.winRate >= 50 ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'}`}>
                      {gs.wins}W-{gs.losses}L
                    </span>
                  )}
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </div>
              </button>
              {isExpanded && (
                <div className="border-t border-border bg-muted/30 p-4 sm:p-5 space-y-2 animate-fadeIn">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">All Offspring — Ranked by {metricLabel}</p>
                    {bestChild && getChildMatchStats(bestChild.name).decided > 0 && (
                      <span className="text-xs font-black bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full" title={bestTitleFor(bestChild)}>
                        <Trophy className="w-3 h-3 inline" /> Top: {bestChild.name}
                      </span>
                    )}
                  </div>
                  {roosters.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-black text-info dark:text-sky-400 uppercase tracking-widest">🐓 Sire · {roosters.length}</p>
                      {roosters.map((child) => renderChildRow(child, bestId))}
                    </div>
                  )}
                  {hens.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-black text-pink uppercase tracking-widest">🐔 Dam · {hens.length}</p>
                      {hens.map((child) => renderChildRow(child, bestId))}
                    </div>
                  )}
                  {renderSubgroupExpandable(parentName, kind, subgroups)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-card p-6 sm:p-7 rounded-lg border border-border shadow-sm flex flex-col gap-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <div className="w-11 h-11 rounded-md bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-inner">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-success"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-black text-card-foreground tracking-tight">Family Lineage Directory</h1>
              <p className="text-sm text-muted-foreground font-semibold mt-0.5">Track sibling groups, sire & dam offspring trees to compare performance per bloodline</p>
            </div>
          </div>
          <div className="relative w-full sm:w-72 sm:shrink-0">
            <span aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </span>
            <input type="text" aria-label="Search family, sire, dam or chicken name" placeholder="Search family, sire, dam or chicken name..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-3.5 py-3 border border-input-border rounded-lg bg-card text-card-foreground placeholder:text-muted-foreground text-sm focus:border-emerald-500 transition-colors font-semibold" />
          </div>
        </div>

        <div className="flex items-center gap-2 bg-muted/60 p-1.5 rounded-lg border border-border overflow-x-auto shrink-0">
          <button type="button" onClick={() => setActiveTab('tree')} className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-xs sm:text-sm font-bold transition-all duration-200 whitespace-nowrap cursor-pointer ${activeTab === 'tree' ? 'bg-emerald-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'}`}>
            <span className="text-sm"><Network className="w-4 h-4" /></span>
            <span>Family Tree</span>
            <span className={`text-xs font-black px-1.5 py-0.5 rounded-full ${activeTab === 'tree' ? 'bg-white/20' : 'bg-border text-muted-foreground'}`}>{breedingPairs.length}</span>
          </button>
          <button type="button" onClick={() => setActiveTab('families')} className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-xs sm:text-sm font-bold transition-all duration-200 whitespace-nowrap cursor-pointer ${activeTab === 'families' ? 'bg-emerald-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'}`}>
            <span className="text-sm"><Users className="w-4 h-4" /></span>
            <span>Full Siblings &amp; Families</span>
            <span className={`text-xs font-black px-1.5 py-0.5 rounded-full ${activeTab === 'families' ? 'bg-white/20' : 'bg-border text-muted-foreground'}`}>{fullFiltered.length}</span>
          </button>
          <button type="button" onClick={() => setActiveTab('sire')} className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-xs sm:text-sm font-bold transition-all duration-200 whitespace-nowrap cursor-pointer ${activeTab === 'sire' ? 'bg-emerald-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'}`}>
            <span className="text-sm"><ChickenIcon className="w-4 h-4" /></span>
            <span>Sire Offspring Tree</span>
            <span className={`text-xs font-black px-1.5 py-0.5 rounded-full ${activeTab === 'sire' ? 'bg-white/20' : 'bg-border text-muted-foreground'}`}>{sireEntries.length}</span>
          </button>
          <button type="button" onClick={() => setActiveTab('dam')} className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-xs sm:text-sm font-bold transition-all duration-200 whitespace-nowrap cursor-pointer ${activeTab === 'dam' ? 'bg-emerald-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'}`}>
            <span className="text-sm"><ChickenIcon className="w-4 h-4" /></span>
            <span>Dam Offspring Tree</span>
            <span className={`text-xs font-black px-1.5 py-0.5 rounded-full ${activeTab === 'dam' ? 'bg-white/20' : 'bg-border text-muted-foreground'}`}>{damEntries.length}</span>
          </button>
          <button type="button" onClick={() => setActiveTab('pedigree')} className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-xs sm:text-sm font-bold transition-all duration-200 whitespace-nowrap cursor-pointer ${activeTab === 'pedigree' ? 'bg-emerald-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'}`}>
            <span className="text-sm"><GitBranch className="w-4 h-4" /></span>
            <span>Pedigree / Ancestors</span>
            <span className={`text-xs font-black px-1.5 py-0.5 rounded-full ${activeTab === 'pedigree' ? 'bg-white/20' : 'bg-border text-muted-foreground'}`}>{fowls.length}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'Offspring (Registered Children)', value: familyCounts(fowls).offspring, icon: <ChickenIcon className="w-5 h-5 text-success dark:text-emerald-400" /> },
          { label: 'Breeding Pairs', value: breedingPairs.length, icon: <Link2 className="w-5 h-5 text-info dark:text-sky-400" /> },
          { label: 'Full-Sibling Families', value: fullFiltered.length, icon: <Users className="w-5 h-5 text-success dark:text-emerald-400" /> },
          { label: 'Sire Offspring Groups', value: sireEntries.length, icon: <ChickenIcon className="w-5 h-5 text-info dark:text-sky-400" /> },
          { label: 'Dam Offspring Groups', value: damEntries.length, icon: <ChickenIcon className="w-5 h-5 text-pink" /> },
          { label: 'Total Chickens Tracked', value: fowls.length, icon: <Dna className="w-5 h-5 text-teal" /> },
        ].map((s) => (
          <div key={s.label} className="bg-card rounded-lg border border-border shadow-sm p-5 flex items-center gap-4">
            <div className="w-11 h-11 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-800 rounded-lg flex items-center justify-center shrink-0">{s.icon}</div>
            <div className="min-w-0">
              <p className="text-2xl font-black text-card-foreground leading-none">{s.value}</p>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mt-1">{s.label}</p>
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
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200/60 dark:border-emerald-800/60 rounded-lg p-5 sm:p-6 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-9 h-9 bg-emerald-600 text-white rounded-md flex items-center justify-center"><Trophy className="w-5 h-5" /></span>
              <div>
                <h2 className="text-sm font-black text-card-foreground">Breeding Recommendation</h2>
                <p className="text-xs text-muted-foreground font-semibold">Based on sibling and pairing performance data</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-card/80 border border-emerald-200/50 dark:border-emerald-800/50 rounded-lg p-3">
                <p className="text-xs font-black text-success dark:text-emerald-400 uppercase tracking-widest"><Trophy className="w-3 h-3 inline" /> Best Cross</p>
                <p className="text-sm font-black text-card-foreground mt-1">{best.sire} × {best.dam}</p>
                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">{best.winRate}% win rate · {best.wins}W-{best.losses}L</p>
              </div>
              {eliteCount > 0 && (
                <div className="bg-card/80 border border-emerald-200/50 dark:border-emerald-800/50 rounded-lg p-3">
                  <p className="text-xs font-black text-success dark:text-emerald-400 uppercase tracking-widest"><CheckCircle className="w-3 h-3 inline" /> Elite Crosses</p>
                  <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">{eliteCount}</p>
                  <p className="text-xs font-bold text-muted-foreground">crosses with 70%+ win rate</p>
                </div>
              )}
              {weakCount > 0 && (
                <div className="bg-card/80 border border-rose-200/50 dark:border-rose-800/50 rounded-lg p-3">
                  <p className="text-xs font-black text-danger dark:text-rose-400 uppercase tracking-widest"><AlertTriangle className="w-3 h-3 inline" /> Avoid</p>
                  <p className="text-sm font-black text-card-foreground mt-1">{worst.sire} × {worst.dam}</p>
                  <p className="text-xs font-bold text-danger dark:text-rose-400">{worst.winRate}% win rate · Consider different pairing</p>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {activeTab === 'tree' && (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 rounded-md flex items-center justify-center"><Network className="w-5 h-5" /></div>
            <div>
              <h2 className="text-base font-black text-card-foreground tracking-tight">Family Tree</h2>
              <p className="text-xs text-muted-foreground font-bold">Breeding pair (Sire + Dam) on top, offspring below — see the sire, dam, and their children at a glance.</p>
            </div>
          </div>
          <FamilyTree
            fowls={fowls}
            codes={birdCodes}
            query={debouncedSearch}
            onPick={setSelectedFowlForDetails}
            onShowFights={openFights}
          />
        </section>
      )}

      {activeTab === 'families' && (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 rounded-md flex items-center justify-center"><Users className="w-5 h-5" /></div>
            <div>
              <h2 className="text-base font-black text-card-foreground tracking-tight">Full-Sibling Families</h2>
              <p className="text-xs text-muted-foreground font-bold">Same Sire and same Dam — one father and one mother. Ranked by {metricLabel.toLowerCase()}.</p>
            </div>
          </div>
          {linked.length === 0 ? (
            <EmptyState title="No Lineage Data Yet" hint="Encode chickens with Sire and Dam to start grouping families automatically." />
          ) : fullFiltered.length === 0 ? (
            <EmptyState title="No Full-Sibling Families Found" hint="Chickens need at least one sibling with the same Sire and Dam to form a family." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {fullFiltered.map((g, i) => <FamilyCard key={`full-${i}`} g={g} index={i} pairingAnalytics={pairingAnalytics} getChildMatchStats={getChildMatchStats} setSelectedFowlForDetails={setSelectedFowlForDetails} onShowFights={openFights} rankingMetric={settings.ranking_metric} rankingMinMatches={settings.ranking_min_matches} matchHistory={matchHistory} />)}
            </div>
          )}
        </section>
      )}

      {activeTab === 'sire' && (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-sky-100 dark:bg-sky-950/50 text-sky-700 dark:text-sky-400 rounded-md flex items-center justify-center"><ChickenIcon className="w-5 h-5" /></div>
            <div>
              <h2 className="text-base font-black text-card-foreground tracking-tight">Sire Offspring Tree</h2>
              <p className="text-xs text-muted-foreground font-bold">Same father, different mothers — expand a sire to compare its offspring.</p>
            </div>
          </div>
          {sireEntries.length === 0 ? (
            <EmptyState title="No Sire Offspring Yet" hint="Encode chickens with a Sire name to build the parent-to-offspring tree." />
          ) : (
            renderParentTree(sireEntries, expandedSires, toggleSire, 'sire', 'sky')
          )}
        </section>
      )}

      {activeTab === 'pedigree' && (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-teal-100 dark:bg-teal-950/50 text-teal rounded-md flex items-center justify-center"><GitBranch className="w-5 h-5" /></div>
            <div>
              <h2 className="text-base font-black text-card-foreground tracking-tight">Pedigree / Ancestor Lineage</h2>
              <p className="text-xs text-muted-foreground font-bold">Three ancestor generations with bloodline percentages — useful when a parent has passed away and you are choosing the next broodstock from the registered offspring.</p>
            </div>
          </div>
          <PedigreeTree fowls={fowls} codes={birdCodes} onSelect={setSelectedFowlForDetails} />
        </section>
      )}

      {activeTab === 'dam' && (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-pink-100 dark:bg-pink-950/50 text-pink rounded-md flex items-center justify-center"><ChickenIcon className="w-5 h-5" /></div>
            <div>
              <h2 className="text-base font-black text-card-foreground tracking-tight">Dam Offspring Tree</h2>
              <p className="text-xs text-muted-foreground font-bold">Same mother, different sires — expand a dam to compare its offspring.</p>
            </div>
          </div>
          {damEntries.length === 0 ? (
            <EmptyState title="No Dam Offspring Yet" hint="Encode chickens with a Dam name to build the parent-to-offspring tree." />
          ) : (
            renderParentTree(damEntries, expandedDams, toggleDam, 'dam', 'pink')
          )}
        </section>
      )}
    </div>
  );
}
