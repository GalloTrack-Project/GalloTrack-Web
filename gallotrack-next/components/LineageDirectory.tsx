'use client';
import React, { useState, useMemo, useRef } from 'react';
import type { FowlRecord, MatchRecord, PairingStats } from '@/lib/types';
import {
  Dna,
  Users,
  Link2,
  Trophy,
  CheckCircle,
  AlertTriangle,
  GitBranch,
  Network,
  Swords,
  Search,
  X,
} from 'lucide-react';
import ChickenIcon from '@/components/ChickenIcon';
import PedigreeTree from '@/components/PedigreeTree';
import FamilyTree from '@/components/FamilyTree';
import { buildBreedingPairs, nameKey, isKnownParent } from '@/lib/family-tree';
import { familyCounts } from '@/lib/family-stats';
import { genderLabel, parentBreedOf } from '@/lib/helpers';
import { fowlMatchesQuery } from '@/lib/lineage';
import { resolveBirdCodes, formatBirdCodeForDisplay } from '@/lib/bird-code';
import { rankFowls, bestFowl, bestYearFor, type RankingMetric } from '@/lib/ranking';
import { RANKING_METRIC_LABELS } from '@/lib/settings';
import { useUserSettings } from '@/lib/hooks/use-user-settings';
import { useUI } from '@/lib/contexts/ui-context';
import { useDebounce } from '@/lib/use-debounce';

const isMaleChild = (c: FowlRecord) =>
  c.gender?.toLowerCase() === 'rooster' || c.gender?.toLowerCase() === 'male';

function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="bg-card p-10 text-center rounded-lg border border-border shadow-xs space-y-2">
      <div className="w-12 h-12 bg-muted text-muted-foreground rounded-full flex items-center justify-center mx-auto">
        <Dna className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-extrabold text-card-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground font-medium max-w-sm mx-auto">{hint}</p>
    </div>
  );
}

function SearchEmptyState({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <div className="bg-card p-12 text-center rounded-lg border border-border shadow-xs space-y-3.5 max-w-md mx-auto my-6 animate-fadeIn">
      <div className="w-14 h-14 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center text-2xl mx-auto border border-emerald-500/20">
        🔍
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-extrabold text-card-foreground">
          No results found for &ldquo;{query}&rdquo;
        </h3>
        <p className="text-xs sm:text-sm text-muted-foreground font-medium max-w-sm mx-auto">
          No chickens, families, or lineage groups match your search in this tab. Try searching by name, ID, or wing band.
        </p>
      </div>
      <button
        type="button"
        onClick={onClear}
        className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all cursor-pointer"
      >
        Clear search
      </button>
    </div>
  );
}

interface LineageDirectoryProps {
  fowls: FowlRecord[];
  matchHistory: MatchRecord[];
  pairingAnalytics: { all: Map<string, PairingStats>; ranked: PairingStats[] };
  search?: string;
  setSearch?: (v: string) => void;
  debouncedSearch?: string;
  setSelectedFowlForDetails: (f: FowlRecord) => void;
}

type LineageTab = 'tree' | 'families' | 'sire' | 'dam' | 'pedigree';
type SortOption = 'most' | 'name' | 'newest';

function FamilyCard({
  g,
  index,
  pairingAnalytics,
  getChildMatchStats,
  setSelectedFowlForDetails,
  onShowFights,
  rankingMetric,
  rankingMinMatches,
  matchHistory,
  fowls,
  isExpanded: controlledExpanded,
  onToggleExpand,
}: {
  g: FowlRecord[];
  index: number;
  pairingAnalytics: { all: Map<string, PairingStats> };
  getChildMatchStats: (name: string) => { total: number; wins: number; losses: number; decided: number; winRate: number };
  setSelectedFowlForDetails: (f: FowlRecord) => void;
  onShowFights: (f: FowlRecord) => void;
  rankingMetric: RankingMetric;
  rankingMinMatches: number;
  matchHistory: MatchRecord[];
  fowls: FowlRecord[];
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}) {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const expanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;
  const toggleExpanded = onToggleExpand !== undefined ? onToggleExpand : () => setInternalExpanded(!internalExpanded);

  const ps = pairingAnalytics.all.get(`${(g[0].sire || '').trim().toLowerCase()}|||${(g[0].dam || '').trim().toLowerCase()}`);
  const sireBreed = parentBreedOf(g[0].sire, fowls);
  const damBreed = parentBreedOf(g[0].dam, fowls);

  let total = 0, wins = 0, losses = 0;
  g.forEach((c) => {
    const s = getChildMatchStats(c.name);
    total += s.total;
    wins += s.wins;
    losses += s.losses;
  });
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
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                child.status === 'Active'
                  ? 'bg-emerald-500'
                  : child.status === 'Archived'
                  ? 'bg-amber-400'
                  : child.status === 'Deceased'
                  ? 'bg-rose-400'
                  : 'bg-muted-foreground'
              }`}
            ></span>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                {child.bird_code && (
                  <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted text-foreground border border-border font-bold uppercase shrink-0">
                    [{formatBirdCodeForDisplay(child.bird_code)}]
                  </span>
                )}
                <p className="text-xs font-black text-card-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-400 truncate">
                  {child.name}
                </p>
                {isBest && cs.decided > 0 && (
                  <span className="text-xs font-black bg-amber-400 text-amber-900 px-1 py-0.5 rounded uppercase tracking-wider shrink-0" title={bestTitle}>
                    Best
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground font-semibold truncate">
                {genderLabel(child.gender)} · {child.age || 'N/A'}
              </p>
            </div>
          </div>
          <div className="shrink-0">
            {cs.total > 0 ? (
              <span
                className={`text-xs font-black px-2 py-0.5 rounded-full border ${
                  cs.winRate >= 50
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                }`}
              >
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
          className="shrink-0 self-center flex items-center gap-1 text-xs font-black uppercase tracking-wider text-muted-foreground hover:text-emerald-700 dark:hover:text-emerald-400 border border-border hover:border-emerald-400 rounded-md px-2 py-1.5 transition-colors cursor-pointer"
        >
          <Swords className="w-3 h-3" />
          Fights
        </button>
      </div>
    );
  };

  return (
    <div className="bg-card rounded-lg border border-border shadow-xs overflow-hidden">
      <div className="px-5 pt-5 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-md flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div>
            <h4 className="text-sm font-black text-card-foreground">Family {index + 1}</h4>
            <p className="text-xs text-muted-foreground font-semibold">
              {g.length} chickens · {males} male · {females} female
            </p>
          </div>
        </div>
        <span className="text-xs font-black bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-full uppercase tracking-wider">
          Full Siblings
        </span>
      </div>
      <div className="px-5 pb-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 rounded-lg p-3.5 text-center">
            <p className="text-xs font-black text-info dark:text-sky-400 uppercase tracking-widest mb-1">
              <ChickenIcon className="w-3 h-3 inline" /> Sire
            </p>
            <p className="text-sm font-black text-card-foreground truncate">{g[0].sire}</p>
            {sireBreed && <p className="text-xs font-bold text-muted-foreground truncate">{sireBreed}</p>}
          </div>
          <div className="bg-pink-50 dark:bg-pink-950/30 border border-pink-200 dark:border-pink-800 rounded-lg p-3.5 text-center">
            <p className="text-xs font-black text-pink uppercase tracking-widest mb-1">
              <ChickenIcon className="w-3 h-3 inline" /> Dam
            </p>
            <p className="text-sm font-black text-card-foreground truncate">{g[0].dam}</p>
            {damBreed && <p className="text-xs font-bold text-muted-foreground truncate">{damBreed}</p>}
          </div>
        </div>
      </div>
      <div className="px-5 pb-4">
        <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-2">Offspring</p>
        {roosterOffspring.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-black text-info dark:text-sky-400 uppercase tracking-widest mb-1.5">
              🐓 Sire · {roosterOffspring.length}
            </p>
            <div className="space-y-1.5">
              {visibleRoosters.map((child, i) => renderOffspringRow(child, i))}
            </div>
          </div>
        )}
        {henOffspring.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-black text-pink uppercase tracking-widest mb-1.5">
              🐔 Dam · {henOffspring.length}
            </p>
            <div className="space-y-1.5">
              {visibleHens.map((child, i) => renderOffspringRow(child, i))}
            </div>
          </div>
        )}
        {hasMore && (
          <button
            type="button"
            onClick={toggleExpanded}
            className="w-full mt-2 text-xs font-black text-success dark:text-emerald-400 hover:underline py-1 cursor-pointer"
          >
            {expanded ? 'Show less' : `View all ${ranked.length} offspring`}
          </button>
        )}
      </div>
      <div className="px-5 py-3 bg-muted/30 border-t border-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
            <Link2 className="w-3 h-3 inline" /> Pairing Win Rate
          </span>
          {decided > 0 && (
            <span
              className={`text-xs font-black px-2 py-0.5 rounded-full border ${
                groupWinRate >= 50
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'
              }`}
            >
              {wins}W-{losses}L
            </span>
          )}
        </div>
        {ps && ps.totalFights > 0 ? (
          <span
            className={`text-xs font-black px-2.5 py-1 rounded-full border ${
              ps.winRate >= 50
                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'
            }`}
          >
            {ps.winRate}%
          </span>
        ) : (
          <span className="text-xs font-bold text-muted-foreground/50">No match data yet</span>
        )}
      </div>
    </div>
  );
}

export default function LineageDirectory({
  fowls,
  matchHistory,
  pairingAnalytics,
  search: propSearch,
  setSearch: propSetSearch,
  debouncedSearch: propDebouncedSearch,
  setSelectedFowlForDetails,
}: LineageDirectoryProps) {
  const [internalSearch, setInternalSearch] = useState('');
  const search = propSearch !== undefined ? propSearch : internalSearch;
  const setSearch = propSetSearch !== undefined ? propSetSearch : setInternalSearch;
  const internalDebouncedSearch = useDebounce(search || '', 250);
  const debouncedSearch = (propDebouncedSearch !== undefined ? propDebouncedSearch : internalDebouncedSearch) || '';

  const [activeTab, setActiveTab] = useState<LineageTab>('families');
  const [sortBy, setSortBy] = useState<SortOption>('most');

  const ui = useUI();
  const settings = useUserSettings();
  const openFights = (f: FowlRecord) => ui.setFightHistoryFowl(f);

  const [expandedSires, setExpandedSires] = useState<Set<string>>(new Set());
  const [expandedDams, setExpandedDams] = useState<Set<string>>(new Set());
  const [expandedSubgroups, setExpandedSubgroups] = useState<Set<string>>(new Set());
  const [expandedFamilies, setExpandedFamilies] = useState<Set<number>>(new Set());
  const [treeCollapsed, setTreeCollapsed] = useState<Set<string>>(new Set());

  const birdCodes = useMemo(() => resolveBirdCodes(fowls), [fowls]);
  const breedingPairs = useMemo(() => buildBreedingPairs(fowls), [fowls]);

  const toggleSire = (name: string) => {
    setExpandedSires((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleDam = (name: string) => {
    setExpandedDams((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleSubgroup = (key: string) => {
    setExpandedSubgroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleFamily = (index: number) => {
    setExpandedFamilies((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const linked = useMemo(() => {
    return fowls.filter((f) => isKnownParent(f.sire) && isKnownParent(f.dam));
  }, [fowls]);

  const getChildMatchStats = (childName: string) => {
    const fMatches = matchHistory.filter((x) => x.entry_name?.trim().toLowerCase() === childName.trim().toLowerCase());
    const total = fMatches.length;
    const wins = fMatches.filter((x) => x.outcome?.toLowerCase() === 'win').length;
    const losses = fMatches.filter((x) => x.outcome?.toLowerCase() === 'loss').length;
    const decided = wins + losses;
    const winRate = decided > 0 ? Math.round((wins / decided) * 100) : 0;
    return { total, wins, losses, decided, winRate };
  };

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
      total += s.total;
      wins += s.wins;
      losses += s.losses;
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
    f ? `Best by ${metricLabel}${bestYearFor(f.name, matchHistory) ? ` · best year ${bestYearFor(f.name, matchHistory)}` : ''}` : undefined;

  // Sires grouping
  const sireMap = useMemo(() => {
    const map = new Map<string, FowlRecord[]>();
    fowls.forEach((f) => {
      const sire = (f.sire || '').trim();
      if (!isKnownParent(sire)) return;
      const arr = map.get(sire) || [];
      arr.push(f);
      map.set(sire, arr);
    });
    return map;
  }, [fowls]);

  const sireEntries = useMemo(() => {
    return Array.from(sireMap.entries()).filter(([, c]) => c.length >= 1);
  }, [sireMap]);

  // Dams grouping
  const damMap = useMemo(() => {
    const map = new Map<string, FowlRecord[]>();
    fowls.forEach((f) => {
      const dam = (f.dam || '').trim();
      if (!isKnownParent(dam)) return;
      const arr = map.get(dam) || [];
      arr.push(f);
      map.set(dam, arr);
    });
    return map;
  }, [fowls]);

  const damEntries = useMemo(() => {
    return Array.from(damMap.entries()).filter(([, c]) => c.length >= 1);
  }, [damMap]);

  // Full-sibling families grouping (>= 2 siblings)
  const familyMap = useMemo(() => {
    const map = new Map<string, FowlRecord[]>();
    linked.forEach((f) => {
      const key = `${nameKey(f.sire)}|||${nameKey(f.dam)}`;
      const arr = map.get(key) || [];
      arr.push(f);
      map.set(key, arr);
    });
    return map;
  }, [linked]);

  const fullFamilies = useMemo(() => {
    return Array.from(familyMap.values()).filter((g) => g.length >= 2);
  }, [familyMap]);

  // Search query
  const q = debouncedSearch.trim().toLowerCase();

  // Filtered & sorted collections
  const filteredFullFamilies = useMemo(() => {
    let list = fullFamilies;
    if (q) {
      list = list.filter((g) => {
        const sire = (g[0].sire || '').toLowerCase();
        const dam = (g[0].dam || '').toLowerCase();
        if (sire.includes(q) || dam.includes(q)) return true;
        return g.some((f) => {
          const code = f.bird_code || birdCodes.get(String(f.id)) || '';
          return (
            f.name.toLowerCase().includes(q) ||
            code.toLowerCase().includes(q) ||
            (f.wing_band && f.wing_band.toLowerCase().includes(q))
          );
        });
      });
    }
    if (sortBy === 'name') {
      return [...list].sort((a, b) => {
        const nameA = `${a[0].sire || ''} ${a[0].dam || ''}`;
        const nameB = `${b[0].sire || ''} ${b[0].dam || ''}`;
        return nameA.localeCompare(nameB);
      });
    }
    if (sortBy === 'newest') {
      return [...list].sort((a, b) => {
        const maxA = Math.max(...a.map((m) => m.id));
        const maxB = Math.max(...b.map((m) => m.id));
        return maxB - maxA;
      });
    }
    return [...list].sort((a, b) => b.length - a.length);
  }, [fullFamilies, q, sortBy, birdCodes]);

  const filteredSireEntries = useMemo(() => {
    let list = sireEntries;
    if (q) {
      list = list.filter(([sire, children]) => {
        if (sire.toLowerCase().includes(q)) return true;
        return children.some((c) => {
          const code = c.bird_code || birdCodes.get(String(c.id)) || '';
          return (
            c.name.toLowerCase().includes(q) ||
            code.toLowerCase().includes(q) ||
            (c.wing_band && c.wing_band.toLowerCase().includes(q))
          );
        });
      });
    }
    if (sortBy === 'name') {
      return [...list].sort((a, b) => a[0].localeCompare(b[0]));
    }
    if (sortBy === 'newest') {
      return [...list].sort((a, b) => {
        const maxA = Math.max(...a[1].map((m) => m.id));
        const maxB = Math.max(...b[1].map((m) => m.id));
        return maxB - maxA;
      });
    }
    return [...list].sort((a, b) => b[1].length - a[1].length);
  }, [sireEntries, q, sortBy, birdCodes]);

  const filteredDamEntries = useMemo(() => {
    let list = damEntries;
    if (q) {
      list = list.filter(([dam, children]) => {
        if (dam.toLowerCase().includes(q)) return true;
        return children.some((c) => {
          const code = c.bird_code || birdCodes.get(String(c.id)) || '';
          return (
            c.name.toLowerCase().includes(q) ||
            code.toLowerCase().includes(q) ||
            (c.wing_band && c.wing_band.toLowerCase().includes(q))
          );
        });
      });
    }
    if (sortBy === 'name') {
      return [...list].sort((a, b) => a[0].localeCompare(b[0]));
    }
    if (sortBy === 'newest') {
      return [...list].sort((a, b) => {
        const maxA = Math.max(...a[1].map((m) => m.id));
        const maxB = Math.max(...b[1].map((m) => m.id));
        return maxB - maxA;
      });
    }
    return [...list].sort((a, b) => b[1].length - a[1].length);
  }, [damEntries, q, sortBy, birdCodes]);

  const filteredBreedingPairs = useMemo(() => {
    let list = breedingPairs;
    if (q) {
      list = list.filter((pair) => {
        if (pair.sire.toLowerCase().includes(q) || pair.dam.toLowerCase().includes(q)) return true;
        return pair.members.some((m) => {
          const code = m.bird_code || birdCodes.get(String(m.id)) || '';
          return (
            m.name.toLowerCase().includes(q) ||
            code.toLowerCase().includes(q) ||
            (m.wing_band && m.wing_band.toLowerCase().includes(q))
          );
        });
      });
    }
    if (sortBy === 'name') {
      return [...list].sort((a, b) => `${a.sire} ${a.dam}`.localeCompare(`${b.sire} ${b.dam}`));
    }
    if (sortBy === 'newest') {
      return [...list].sort((a, b) => {
        const maxA = Math.max(...a.members.map((m) => m.id));
        const maxB = Math.max(...b.members.map((m) => m.id));
        return maxB - maxA;
      });
    }
    return [...list].sort((a, b) => b.members.length - a.members.length);
  }, [breedingPairs, q, sortBy, birdCodes]);

  const filteredPedigreeFowls = useMemo(() => {
    if (!q) return fowls;
    return fowls.filter((f) => fowlMatchesQuery(f, q, birdCodes.get(String(f.id))));
  }, [fowls, q, birdCodes]);

  // Tab tools handlers
  const handleExpandAll = () => {
    if (activeTab === 'sire') {
      setExpandedSires(new Set(filteredSireEntries.map(([sire]) => sire)));
    } else if (activeTab === 'dam') {
      setExpandedDams(new Set(filteredDamEntries.map(([dam]) => dam)));
    } else if (activeTab === 'families') {
      setExpandedFamilies(new Set(filteredFullFamilies.map((_, i) => i)));
    } else if (activeTab === 'tree') {
      setTreeCollapsed(new Set());
    }
  };

  const handleCollapseAll = () => {
    if (activeTab === 'sire') {
      setExpandedSires(new Set());
    } else if (activeTab === 'dam') {
      setExpandedDams(new Set());
    } else if (activeTab === 'families') {
      setExpandedFamilies(new Set());
    } else if (activeTab === 'tree') {
      setTreeCollapsed(new Set(filteredBreedingPairs.map((p) => p.key)));
    }
  };

  // Keyboard navigation for accessible tabs
  const tabIds: LineageTab[] = ['tree', 'families', 'sire', 'dam', 'pedigree'];
  const tabButtonRefs = useRef<Map<LineageTab, HTMLButtonElement>>(new Map());

  const handleTabKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex = index;
    if (e.key === 'ArrowRight') nextIndex = (index + 1) % tabIds.length;
    else if (e.key === 'ArrowLeft') nextIndex = (index - 1 + tabIds.length) % tabIds.length;
    else if (e.key === 'Home') nextIndex = 0;
    else if (e.key === 'End') nextIndex = tabIds.length - 1;
    else return;

    e.preventDefault();
    const nextTab = tabIds[nextIndex];
    setActiveTab(nextTab);
    tabButtonRefs.current.get(nextTab)?.focus();
  };

  const tabs: { id: LineageTab; label: string; icon: React.ReactNode; count: number }[] = [
    { id: 'tree', label: 'Family Tree', icon: <Network className="w-4 h-4" />, count: breedingPairs.length },
    { id: 'families', label: 'Full Siblings & Families', icon: <Users className="w-4 h-4" />, count: fullFamilies.length },
    { id: 'sire', label: 'Sire Offspring Tree', icon: <ChickenIcon className="w-4 h-4" />, count: sireEntries.length },
    { id: 'dam', label: 'Dam Offspring Tree', icon: <ChickenIcon className="w-4 h-4" />, count: damEntries.length },
    { id: 'pedigree', label: 'Pedigree / Ancestors', icon: <GitBranch className="w-4 h-4" />, count: fowls.length },
  ];

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
    const code = child.bird_code || birdCodes.get(String(child.id));
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
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                child.status === 'Active'
                  ? 'bg-emerald-500'
                  : child.status === 'Archived'
                  ? 'bg-amber-400'
                  : child.status === 'Deceased'
                  ? 'bg-rose-400'
                  : 'bg-muted-foreground'
              }`}
            ></span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                {code && (
                  <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted text-foreground border border-border font-bold uppercase shrink-0">
                    [{formatBirdCodeForDisplay(code)}]
                  </span>
                )}
                <p className="text-xs font-black text-card-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-400 truncate">
                  {child.name}
                </p>
                {isBest && stats.decided > 0 && (
                  <span className="text-xs font-black bg-amber-400 text-amber-900 px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0" title={bestTitleFor(child)}>
                    Best
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground font-semibold truncate">
                {child.breed} · {genderLabel(child.gender)} · {child.age || 'N/A'}
              </p>
            </div>
          </div>
          <div className="shrink-0">
            {stats.total > 0 ? (
              <span
                className={`text-xs font-black px-2 py-0.5 rounded-full border ${
                  stats.winRate >= 50
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                }`}
              >
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
          className="shrink-0 self-center flex items-center gap-1 text-xs font-black uppercase tracking-wider text-muted-foreground hover:text-emerald-700 dark:hover:text-emerald-400 border border-border hover:border-emerald-400 rounded-md px-2 py-1.5 transition-colors cursor-pointer"
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
          {parentKind === 'sire' ? (
            <><ChickenIcon className="w-3 h-3 inline" /> Sibling Subgroups by Dam</>
          ) : (
            <><ChickenIcon className="w-3 h-3 inline" /> Sibling Subgroups by Sire</>
          )}
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
                  <span className="text-sm">
                    <ChickenIcon className="w-4 h-4" />
                  </span>
                  <span className="text-xs font-black text-card-foreground truncate">{otherParent}</span>
                  <span className="text-xs font-mono text-muted-foreground bg-card border border-border px-1.5 py-0.5 rounded-full shrink-0">
                    {members.length} chicken{members.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {sgStats.decided > 0 && (
                    <span
                      className={`text-xs font-black px-1.5 py-0.5 rounded-full border ${
                        sgStats.winRate >= 50
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                          : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                      }`}
                    >
                      {sgStats.winRate}%
                    </span>
                  )}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`text-muted-foreground transition-transform duration-200 ${sgExpanded ? 'rotate-180' : ''}`}
                  >
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
          const hens = ranked.filter((child) => !isMaleChild(child));
          const bestChild = bestOf(children);
          const bestId = bestChild?.id ?? null;
          return (
            <div key={parentName} className="bg-card rounded-lg border border-border shadow-xs overflow-hidden transition-all">
              <button
                type="button"
                onClick={() => toggleFn(parentName)}
                className={`w-full flex items-center justify-between gap-3 p-4 sm:p-5 text-left ${c.hoverBg} transition-colors cursor-pointer`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-md ${c.bg} ${c.border} flex items-center justify-center shrink-0`}>
                    <ChickenIcon className="w-5 h-5" />
                  </div>
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
                    <span
                      className={`text-xs font-black px-2 py-0.5 rounded-full border ${
                        gs.winRate >= 50
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                          : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                      }`}
                    >
                      {gs.wins}W-{gs.losses}L
                    </span>
                  )}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </div>
              </button>
              {isExpanded && (
                <div className="border-t border-border bg-muted/30 p-4 sm:p-5 space-y-2 animate-fadeIn">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">
                      All Offspring — Ranked by {metricLabel}
                    </p>
                    {bestChild && getChildMatchStats(bestChild.name).decided > 0 && (
                      <span
                        className="text-xs font-black bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full"
                        title={bestTitleFor(bestChild)}
                      >
                        <Trophy className="w-3 h-3 inline" /> Top: {bestChild.name}
                      </span>
                    )}
                  </div>
                  {roosters.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-black text-info dark:text-sky-400 uppercase tracking-widest">
                        🐓 Sire · {roosters.length}
                      </p>
                      {roosters.map((child) => renderChildRow(child, bestId))}
                    </div>
                  )}
                  {hens.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-black text-pink uppercase tracking-widest">
                        🐔 Dam · {hens.length}
                      </p>
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

  // Render context bar summary text
  const renderSummaryText = () => {
    switch (activeTab) {
      case 'tree': {
        const pairTotal = breedingPairs.length;
        const pairFiltered = filteredBreedingPairs.length;
        const totalOff = breedingPairs.reduce((s, p) => s + p.members.length, 0);
        const filteredOff = filteredBreedingPairs.reduce((s, p) => s + p.members.length, 0);
        const totalTracked = fowls.length;

        return (
          <>
            <span>
              <strong className="font-extrabold text-foreground">{q ? `${pairFiltered} of ${pairTotal}` : pairTotal}</strong>{' '}
              {pairTotal === 1 ? 'breeding pair' : 'breeding pairs'}
            </span>
            <span className="opacity-40 select-none">·</span>
            <span>
              <strong className="font-extrabold text-foreground">{q ? `${filteredOff} of ${totalOff}` : totalOff}</strong> offspring
            </span>
            <span className="opacity-40 select-none">·</span>
            <span>
              <strong className="font-extrabold text-foreground">{totalTracked}</strong>{' '}
              {totalTracked === 1 ? 'chicken tracked' : 'chickens tracked'}
            </span>
          </>
        );
      }
      case 'families': {
        const famTotal = fullFamilies.length;
        const famFiltered = filteredFullFamilies.length;
        const totalOff = fullFamilies.reduce((s, g) => s + g.length, 0);
        const filteredOff = filteredFullFamilies.reduce((s, g) => s + g.length, 0);

        return (
          <>
            <span>
              <strong className="font-extrabold text-foreground">{q ? `${famFiltered} of ${famTotal}` : famTotal}</strong>{' '}
              {famTotal === 1 ? 'family' : 'families'}
            </span>
            <span className="opacity-40 select-none">·</span>
            <span>
              <strong className="font-extrabold text-foreground">{q ? `${filteredOff} of ${totalOff}` : totalOff}</strong> offspring
            </span>
          </>
        );
      }
      case 'sire': {
        const sireTotal = sireEntries.length;
        const sireFiltered = filteredSireEntries.length;
        const totalOff = sireEntries.reduce((s, [, c]) => s + c.length, 0);
        const filteredOff = filteredSireEntries.reduce((s, [, c]) => s + c.length, 0);

        return (
          <>
            <span>
              <strong className="font-extrabold text-foreground">{q ? `${sireFiltered} of ${sireTotal}` : sireTotal}</strong>{' '}
              {sireTotal === 1 ? 'sire' : 'sires'}
            </span>
            <span className="opacity-40 select-none">·</span>
            <span>
              <strong className="font-extrabold text-foreground">{q ? `${filteredOff} of ${totalOff}` : totalOff}</strong> offspring sired
            </span>
          </>
        );
      }
      case 'dam': {
        const damTotal = damEntries.length;
        const damFiltered = filteredDamEntries.length;
        const totalOff = damEntries.reduce((s, [, c]) => s + c.length, 0);
        const filteredOff = filteredDamEntries.reduce((s, [, c]) => s + c.length, 0);

        return (
          <>
            <span>
              <strong className="font-extrabold text-foreground">{q ? `${damFiltered} of ${damTotal}` : damTotal}</strong>{' '}
              {damTotal === 1 ? 'dam' : 'dams'}
            </span>
            <span className="opacity-40 select-none">·</span>
            <span>
              <strong className="font-extrabold text-foreground">{q ? `${filteredOff} of ${totalOff}` : totalOff}</strong> offspring produced
            </span>
          </>
        );
      }
      case 'pedigree': {
        const totalTracked = fowls.length;
        const filteredTracked = filteredPedigreeFowls.length;

        return (
          <span>
            <strong className="font-extrabold text-foreground">{q ? `${filteredTracked} of ${totalTracked}` : totalTracked}</strong>{' '}
            {totalTracked === 1 ? 'chicken tracked' : 'chickens tracked'}
          </span>
        );
      }
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* STICKY TOP CONTAINER: Compact Header + Underline Tabs + Context Bar */}
      <div className="sticky -top-4 sm:-top-6 md:-top-8 z-20 bg-background/95 backdrop-blur-md pt-1 pb-2.5 space-y-2 border-b border-border shadow-2xs">
        {/* A. Compact Header Row (~56px tall) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-h-[48px] sm:min-h-[56px] px-1">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-2xs">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-emerald-600 dark:text-emerald-400"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-black text-foreground tracking-tight leading-none truncate">
                Family Lineage Directory
              </h1>
              <p className="text-xs text-muted-foreground font-semibold truncate mt-1">
                Track sibling groups, sire &amp; dam offspring trees to compare performance per bloodline
              </p>
            </div>
          </div>
          <div className="relative w-full sm:w-64 md:w-72 shrink-0">
            <span
              aria-hidden="true"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            >
              <Search className="w-3.5 h-3.5" />
            </span>
            <input
              type="search"
              aria-label="Search family, sire, dam or chicken name"
              placeholder="Search name, ID, or wing band…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault();
                  setSearch('');
                }
              }}
              className="w-full pl-8.5 pr-8 py-2 border border-input-border rounded-md bg-card text-card-foreground placeholder:text-muted-foreground text-xs sm:text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-semibold [&::-webkit-search-cancel-button]:appearance-none"
            />
            {search.length > 0 && (
              <button
                type="button"
                aria-label="Clear search input"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* B. Underline-Style Tabs Row */}
        <div className="border-b border-border/80 -mb-px">
          <nav
            role="tablist"
            aria-label="Family Lineage Directory Tabs"
            className="flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-none"
          >
            {tabs.map((tab, idx) => {
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  ref={(el) => {
                    if (el) tabButtonRefs.current.set(tab.id, el);
                    else tabButtonRefs.current.delete(tab.id);
                  }}
                  type="button"
                  role="tab"
                  id={`lineage-tab-${tab.id}`}
                  aria-selected={isSelected}
                  aria-controls={`lineage-tabpanel-${tab.id}`}
                  tabIndex={isSelected ? 0 : -1}
                  onClick={() => setActiveTab(tab.id)}
                  onKeyDown={(e) => handleTabKeyDown(e, idx)}
                  className={`group relative inline-flex items-center gap-2 px-3 py-2.5 sm:py-3 text-xs sm:text-sm font-bold border-b-2 transition-all duration-150 cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 rounded-t-sm whitespace-nowrap min-h-[44px] ${
                    isSelected
                      ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 font-extrabold'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border/80'
                  }`}
                >
                  <span
                    className={`transition-colors ${
                      isSelected ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground group-hover:text-foreground'
                    }`}
                  >
                    {tab.icon}
                  </span>
                  <span>{tab.label}</span>
                  <span
                    className={`text-xs font-black px-2 py-0.5 rounded-full transition-colors ${
                      isSelected
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-muted text-muted-foreground group-hover:bg-muted/80 group-hover:text-foreground'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* C. Context Bar Row (~38px tall) */}
        <div
          data-testid="lineage-context-bar"
          className="min-h-[38px] py-1.5 px-3 sm:px-4 bg-muted/40 rounded-md border border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
        >
          {/* Left: Tab-specific summary text */}
          <div className="flex items-center gap-1.5 flex-wrap text-muted-foreground font-medium">
            {renderSummaryText()}
          </div>

          {/* Right: Tab tools */}
          {activeTab !== 'pedigree' && (
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <div className="flex items-center gap-1.5">
                <label htmlFor="lineage-sort" className="text-[11px] font-bold text-muted-foreground whitespace-nowrap">
                  Sort:
                </label>
                <select
                  id="lineage-sort"
                  aria-label="Sort options"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="h-7 px-2 text-xs font-bold rounded border border-border bg-card text-foreground cursor-pointer focus:border-emerald-500 focus:outline-none transition-colors"
                >
                  <option value="most">Most offspring</option>
                  <option value="name">Name (A–Z)</option>
                  <option value="newest">Newest</option>
                </select>
              </div>

              <div className="flex items-center gap-1 pl-1 border-l border-border/80">
                <button
                  type="button"
                  onClick={handleExpandAll}
                  className="h-7 px-2 text-[11px] font-bold rounded border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer whitespace-nowrap"
                  title="Expand all groups"
                >
                  Expand all
                </button>
                <button
                  type="button"
                  onClick={handleCollapseAll}
                  className="h-7 px-2 text-[11px] font-bold rounded border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer whitespace-nowrap"
                  title="Collapse all groups"
                >
                  Collapse all
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* D. Main Content Area */}
      <div
        role="tabpanel"
        id={`lineage-tabpanel-${activeTab}`}
        aria-labelledby={`lineage-tab-${activeTab}`}
        className="space-y-4 pt-1"
      >
        {/* TAB 1: Family Tree */}
        {activeTab === 'tree' && (
          <section className="space-y-4">
            {filteredBreedingPairs.length === 0 && q ? (
              <SearchEmptyState query={search} onClear={() => setSearch('')} />
            ) : (
              <FamilyTree
                fowls={fowls}
                codes={birdCodes}
                query={debouncedSearch}
                onPick={setSelectedFowlForDetails}
                onShowFights={openFights}
                sortBy={sortBy}
                collapsedKeys={treeCollapsed}
                onToggleCollapse={(k) =>
                  setTreeCollapsed((prev) => {
                    const next = new Set(prev);
                    if (next.has(k)) next.delete(k);
                    else next.add(k);
                    return next;
                  })
                }
              />
            )}
          </section>
        )}

        {/* TAB 2: Full Siblings & Families */}
        {activeTab === 'families' && (
          <section className="space-y-4">
            {linked.length === 0 ? (
              <EmptyState
                title="No Lineage Data Yet"
                hint="Encode chickens with Sire and Dam to start grouping families automatically."
              />
            ) : filteredFullFamilies.length === 0 && q ? (
              <SearchEmptyState query={search} onClear={() => setSearch('')} />
            ) : filteredFullFamilies.length === 0 ? (
              <EmptyState
                title="No Full-Sibling Families Found"
                hint="Chickens need at least one sibling with the same Sire and Dam to form a family."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredFullFamilies.map((g, i) => (
                  <FamilyCard
                    key={`full-${i}`}
                    g={g}
                    index={i}
                    pairingAnalytics={pairingAnalytics}
                    getChildMatchStats={getChildMatchStats}
                    setSelectedFowlForDetails={setSelectedFowlForDetails}
                    onShowFights={openFights}
                    rankingMetric={settings.ranking_metric}
                    rankingMinMatches={settings.ranking_min_matches}
                    matchHistory={matchHistory}
                    fowls={fowls}
                    isExpanded={expandedFamilies.has(i)}
                    onToggleExpand={() => toggleFamily(i)}
                  />
                ))}
              </div>
            )}

            {/* Optional pairing recommendation card at bottom of families */}
            {(() => {
              const rankedPairings = pairingAnalytics.ranked;
              if (rankedPairings.length === 0) return null;
              const best = rankedPairings[0];
              const worst = rankedPairings[rankedPairings.length - 1];
              const eliteCount = rankedPairings.filter((p) => p.decided >= 3 && p.winRate >= 70).length;
              const weakCount = rankedPairings.filter((p) => p.decided >= 3 && p.winRate < 50).length;
              return (
                <div className="mt-6 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200/60 dark:border-emerald-800/60 rounded-lg p-5 sm:p-6 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 bg-emerald-600 text-white rounded-md flex items-center justify-center">
                      <Trophy className="w-4 h-4" />
                    </span>
                    <div>
                      <h2 className="text-sm font-black text-card-foreground">Breeding Recommendation</h2>
                      <p className="text-xs text-muted-foreground font-semibold">Based on sibling and pairing performance data</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-card/80 border border-emerald-200/50 dark:border-emerald-800/50 rounded-lg p-3">
                      <p className="text-xs font-black text-success dark:text-emerald-400 uppercase tracking-widest">
                        <Trophy className="w-3 h-3 inline" /> Best Cross
                      </p>
                      <p className="text-sm font-black text-card-foreground mt-1">
                        {best.sire} × {best.dam}
                      </p>
                      <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        {best.winRate}% win rate · {best.wins}W-{best.losses}L
                      </p>
                    </div>
                    {eliteCount > 0 && (
                      <div className="bg-card/80 border border-emerald-200/50 dark:border-emerald-800/50 rounded-lg p-3">
                        <p className="text-xs font-black text-success dark:text-emerald-400 uppercase tracking-widest">
                          <CheckCircle className="w-3 h-3 inline" /> Elite Crosses
                        </p>
                        <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">{eliteCount}</p>
                        <p className="text-xs font-bold text-muted-foreground">crosses with 70%+ win rate</p>
                      </div>
                    )}
                    {weakCount > 0 && (
                      <div className="bg-card/80 border border-rose-200/50 dark:border-rose-800/50 rounded-lg p-3">
                        <p className="text-xs font-black text-danger dark:text-rose-400 uppercase tracking-widest">
                          <AlertTriangle className="w-3 h-3 inline" /> Avoid
                        </p>
                        <p className="text-sm font-black text-card-foreground mt-1">
                          {worst.sire} × {worst.dam}
                        </p>
                        <p className="text-xs font-bold text-danger dark:text-rose-400">
                          {worst.winRate}% win rate · Consider different pairing
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </section>
        )}

        {/* TAB 3: Sire Offspring Tree */}
        {activeTab === 'sire' && (
          <section className="space-y-4">
            {sireEntries.length === 0 ? (
              <EmptyState
                title="No Sire Offspring Yet"
                hint="Encode chickens with a Sire name to build the parent-to-offspring tree."
              />
            ) : filteredSireEntries.length === 0 && q ? (
              <SearchEmptyState query={search} onClear={() => setSearch('')} />
            ) : (
              renderParentTree(filteredSireEntries, expandedSires, toggleSire, 'sire', 'sky')
            )}
          </section>
        )}

        {/* TAB 4: Dam Offspring Tree */}
        {activeTab === 'dam' && (
          <section className="space-y-4">
            {damEntries.length === 0 ? (
              <EmptyState
                title="No Dam Offspring Yet"
                hint="Encode chickens with a Dam name to build the parent-to-offspring tree."
              />
            ) : filteredDamEntries.length === 0 && q ? (
              <SearchEmptyState query={search} onClear={() => setSearch('')} />
            ) : (
              renderParentTree(filteredDamEntries, expandedDams, toggleDam, 'dam', 'pink')
            )}
          </section>
        )}

        {/* TAB 5: Pedigree / Ancestors */}
        {activeTab === 'pedigree' && (
          <section className="space-y-4">
            {filteredPedigreeFowls.length === 0 && q ? (
              <SearchEmptyState query={search} onClear={() => setSearch('')} />
            ) : (
              <PedigreeTree fowls={filteredPedigreeFowls} codes={birdCodes} onSelect={setSelectedFowlForDetails} />
            )}
          </section>
        )}
      </div>
    </div>
  );
}
