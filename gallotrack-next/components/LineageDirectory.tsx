'use client';
import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  MoreHorizontal,
  User,
  Plus,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  ChevronRight,
} from 'lucide-react';
import ChickenIcon from '@/components/ChickenIcon';
import PedigreeTree from '@/components/PedigreeTree';
import FamilyTree from '@/components/FamilyTree';
import { buildBreedingPairs, nameKey, isKnownParent, normalizeParentName } from '@/lib/family-tree';
import { familyCounts } from '@/lib/family-stats';
import { genderLabel, parentBreedOf } from '@/lib/helpers';
import { fowlMatchesQuery } from '@/lib/lineage';
import {
  resolveBirdCodes,
  formatBirdCodeForDisplay,
  UNKNOWN_SIRE_CODE,
  UNKNOWN_DAM_CODE,
  offspringBase,
  sirePart,
  damPart,
  isValidBirdCode,
  normalizeBirdCode,
  isOffspringIdentifier,
  compareBirdCodesNatural,
} from '@/lib/bird-code';
import { rankFowls, bestFowl, bestYearFor, type RankingMetric } from '@/lib/ranking';
import { RANKING_METRIC_LABELS } from '@/lib/settings';
import { useUserSettings } from '@/lib/hooks/use-user-settings';
import { useUI } from '@/lib/contexts/ui-context';
import { useDebounce } from '@/lib/use-debounce';
import WinRatePill from '@/components/match/WinRatePill';
import {
  computeWinRate,
  combineWinRates,
  buildChickenMatchStatsMap,
  getWinRatePillClasses,
  type WinRateStats,
} from '@/lib/win-rate';

export type PairSortOption = 'males-first' | 'code' | 'age' | 'wins' | 'winrate';

const isMaleChild = (c: FowlRecord) =>
  c.gender?.toLowerCase() === 'rooster' || c.gender?.toLowerCase() === 'male';

function parseAgeMonths(ageStr?: string | null): number {
  if (!ageStr) return 0;
  let total = 0;
  const yrMatch = ageStr.match(/(\d+)\s*(?:yrs?|years?)/i);
  if (yrMatch) total += parseInt(yrMatch[1], 10) * 12;
  const moMatch = ageStr.match(/(\d+)\s*(?:mos?|months?)/i);
  if (moMatch) total += parseInt(moMatch[1], 10);
  if (total === 0) {
    const rawNum = parseInt(ageStr, 10);
    if (!isNaN(rawNum)) total = rawNum;
  }
  return total;
}

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatCompactAge(ageStr?: string | null, birthdate?: string | null): string {
  if (birthdate) {
    const birth = new Date(birthdate);
    if (!isNaN(birth.getTime())) {
      const now = new Date();
      let years = now.getFullYear() - birth.getFullYear();
      let months = now.getMonth() - birth.getMonth();
      if (months < 0) {
        years--;
        months += 12;
      }
      if (years > 0 && months > 0) return `${years}y ${months}m`;
      if (years > 0) return `${years}y`;
      if (months > 0) return `${months}m`;
      const days = Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
      if (days > 0) return `${days}d`;
    }
  }
  const totalMonths = parseAgeMonths(ageStr);
  if (totalMonths > 0) {
    const yrs = Math.floor(totalMonths / 12);
    const mos = totalMonths % 12;
    if (yrs > 0 && mos > 0) return `${yrs}y ${mos}m`;
    if (yrs > 0) return `${yrs}y`;
    return `${mos}m`;
  }
  return ageStr ? ageStr.trim() : '—';
}

function formatAge(birthdate?: string | null, ageStr?: string | null): string {
  return formatCompactAge(ageStr, birthdate);
}

function compareBirthCodes(aCode: string, bCode: string): number {
  return compareBirdCodesNatural(aCode, bCode);
}

function StatusPill({
  status,
  archiveReason,
  deathReason,
}: {
  status: string;
  archiveReason?: string;
  deathReason?: string;
}) {
  if (status === 'Archived') {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 shrink-0"
        title={archiveReason ? `Archived: ${archiveReason}` : 'Archived'}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
        Archived
      </span>
    );
  }
  if (status === 'Deceased') {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold text-rose-700 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 shrink-0"
        title={deathReason ? `Deceased: ${deathReason}` : 'Deceased'}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
        Deceased
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 shrink-0"
      title="Active in flock"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
      Active
    </span>
  );
}

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
  getChildMatchStats: (name: string) => WinRateStats;
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

  const [familySortBy, setFamilySortBy] = useState<'ranked' | 'winrate' | 'name'>('ranked');
  const [isTotalExpanded, setIsTotalExpanded] = useState(false);

  const ps = pairingAnalytics.all.get(`${(g[0].sire || '').trim().toLowerCase()}|||${(g[0].dam || '').trim().toLowerCase()}`);
  const sireBreed = parentBreedOf(g[0].sire, fowls);
  const damBreed = parentBreedOf(g[0].dam, fowls);

  const foughtCount = g.filter((c) => getChildMatchStats(c.name).total > 0).length;
  const familyTotal = combineWinRates(g.map((c) => getChildMatchStats(c.name)));

  const rankingStatsOf = (name: string) => {
    const s = getChildMatchStats(name);
    return { ...s, winRate: s.winRate ?? 0 };
  };
  const ranked = useMemo(() => rankFowls(g, rankingStatsOf, 'win_rate', 1), [g, rankingStatsOf]);
  const bestChild = bestFowl(g, rankingStatsOf, 'win_rate', 3);
  const bestId = bestChild?.id ?? null;
  const bestTitle = bestChild
    ? `Best by win rate${bestYearFor(bestChild.name, matchHistory) ? ` · best year ${bestYearFor(bestChild.name, matchHistory)}` : ''}`
    : undefined;

  const sortedOffspring = useMemo(() => {
    if (familySortBy === 'winrate') {
      return [...g].sort((a, b) => {
        const sa = getChildMatchStats(a.name);
        const sb = getChildMatchStats(b.name);
        const rateA = sa.decided > 0 ? (sa.winRate ?? -1) : -1;
        const rateB = sb.decided > 0 ? (sb.winRate ?? -1) : -1;
        if (rateB !== rateA) return rateB - rateA;
        if (sb.decided !== sa.decided) return sb.decided - sa.decided;
        if (sb.wins !== sa.wins) return sb.wins - sa.wins;
        const codeA = a.bird_code || a.chicken_code || a.birth_code || '';
        const codeB = b.bird_code || b.chicken_code || b.birth_code || '';
        if (codeA && codeB) return compareBirdCodesNatural(codeA, codeB);
        if (codeA) return -1;
        if (codeB) return 1;
        return a.name.localeCompare(b.name);
      });
    }
    if (familySortBy === 'name') {
      return [...g].sort((a, b) => a.name.localeCompare(b.name));
    }
    return ranked;
  }, [g, familySortBy, ranked, getChildMatchStats]);

  const males = g.filter(isMaleChild).length;
  const females = g.length - males;
  const roosterOffspring = sortedOffspring.filter(isMaleChild);
  const henOffspring = sortedOffspring.filter((c) => !isMaleChild(c));
  const visibleRoosters = expanded ? roosterOffspring : roosterOffspring.slice(0, 3);
  const visibleHens = expanded ? henOffspring : henOffspring.slice(0, 3);
  const hasMore = sortedOffspring.length > 6;

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
                {isBest && cs.decided >= 3 && (
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
          <div className="shrink-0 flex items-center">
            <WinRatePill stats={cs} />
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
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-black text-card-foreground">Family {index + 1}</h4>
              {foughtCount > 0 ? (
                <WinRatePill stats={familyTotal} />
              ) : (
                <span className="text-xs font-bold text-muted-foreground/60">No fights</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground font-semibold">
              {g.length} chickens · {males} male · {females} female
              {foughtCount > 0
                ? ` · Family total: ${foughtCount} of ${g.length} fought · ${familyTotal.wins}W-${familyTotal.losses}L · ${familyTotal.winRate}%`
                : ' · No fights recorded yet'}
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
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Offspring</p>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground font-semibold">Sort:</span>
            <select
              value={familySortBy}
              onChange={(e) => setFamilySortBy(e.target.value as 'ranked' | 'winrate' | 'name')}
              aria-label={`Sort offspring for family ${index + 1}`}
              className="text-xs bg-muted border border-input-border rounded px-2 py-0.5 font-bold text-foreground cursor-pointer focus:ring-1 focus:ring-emerald-500"
            >
              <option value="ranked">Ranked</option>
              <option value="winrate">Win rate</option>
              <option value="name">Name</option>
            </select>
          </div>
        </div>
        {roosterOffspring.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-black text-sky-700 dark:text-sky-400 uppercase tracking-widest mb-1.5">
              ♂ Males ({roosterOffspring.length})
            </p>
            <div className="space-y-1.5">
              {visibleRoosters.map((child, i) => renderOffspringRow(child, i))}
            </div>
          </div>
        )}
        {henOffspring.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-black text-pink-700 dark:text-pink-400 uppercase tracking-widest mb-1.5">
              ♀ Females ({henOffspring.length})
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

      {/* Bottom Family Total Row (expandable to show contributors) */}
      <div
        role={foughtCount > 0 ? 'button' : undefined}
        tabIndex={foughtCount > 0 ? 0 : undefined}
        aria-expanded={foughtCount > 0 ? isTotalExpanded : undefined}
        onClick={foughtCount > 0 ? () => setIsTotalExpanded(!isTotalExpanded) : undefined}
        onKeyDown={
          foughtCount > 0
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setIsTotalExpanded(!isTotalExpanded);
                }
              }
            : undefined
        }
        title="Total wins ÷ total decided matches. Draws excluded."
        className={`px-5 py-3 bg-muted/30 border-t border-border flex items-center justify-between gap-2 text-xs font-bold transition-colors select-none ${
          foughtCount > 0 ? 'cursor-pointer hover:bg-muted/50 focus:outline-none focus:ring-1 focus:ring-emerald-500' : ''
        }`}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="uppercase tracking-wider text-muted-foreground">Family total</span>
          {foughtCount > 0 ? (
            <>
              <span className="text-muted-foreground/60 select-none">·</span>
              <span className="text-foreground">
                {foughtCount} of {g.length} offspring have fought · {familyTotal.wins}W-{familyTotal.losses}L · {familyTotal.winRate}%
              </span>
            </>
          ) : (
            <>
              <span className="text-muted-foreground/60 select-none">·</span>
              <span className="text-muted-foreground font-semibold">No fights recorded yet</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {foughtCount > 0 ? (
            <>
              <WinRatePill stats={familyTotal} />
              <ChevronDown
                className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${
                  isTotalExpanded ? 'rotate-180' : ''
                }`}
              />
            </>
          ) : (
            <span className="text-muted-foreground/60 font-semibold">No fights recorded yet</span>
          )}
        </div>
      </div>

      {/* Expandable Breakdown of Contributor Chickens */}
      {isTotalExpanded && foughtCount > 0 && (
        <div className="px-5 py-2.5 bg-muted/50 border-t border-border/60 space-y-1.5 text-xs animate-fadeIn">
          <p className="text-muted-foreground font-semibold text-xs mb-1">
            Contributors ({foughtCount} of {g.length}):
          </p>
          <div className="flex flex-wrap gap-2">
            {g
              .filter((c) => getChildMatchStats(c.name).total > 0)
              .sort((a, b) => {
                const sa = getChildMatchStats(a.name);
                const sb = getChildMatchStats(b.name);
                if ((sb.winRate ?? 0) !== (sa.winRate ?? 0)) return (sb.winRate ?? 0) - (sa.winRate ?? 0);
                if (sb.decided !== sa.decided) return sb.decided - sa.decided;
                const codeA = a.bird_code || a.chicken_code || a.birth_code || '';
                const codeB = b.bird_code || b.chicken_code || b.birth_code || '';
                if (codeA && codeB) return compareBirdCodesNatural(codeA, codeB);
                return a.name.localeCompare(b.name);
              })
              .map((c) => {
                const cs = getChildMatchStats(c.name);
                const code = c.bird_code || c.chicken_code || c.birth_code || '';
                return (
                  <div
                    key={c.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-card border border-border font-bold text-card-foreground shadow-2xs"
                  >
                    {code && <span className="font-mono text-xs text-muted-foreground">[{formatBirdCodeForDisplay(code)}]</span>}
                    <span>{c.name}</span>
                    <span className="text-muted-foreground select-none">·</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-black">
                      {cs.wins}W-{cs.losses}L{cs.draws > 0 ? `-${cs.draws}D` : ''}
                    </span>
                    <span className="text-muted-foreground/60 select-none">·</span>
                    <span className="text-muted-foreground">{cs.winRate}%</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}
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
  const [treeSexFilter, setTreeSexFilter] = useState<'all' | 'males' | 'females'>('all');
  const [expandedPairs, setExpandedPairs] = useState<Map<string, boolean>>(new Map());

  const [expandedFamilies, setExpandedFamilies] = useState<Set<number>>(new Set());
  const [treeCollapsed, setTreeCollapsed] = useState<Set<string>>(new Set());
  const [pairSortBy, setPairSortBy] = useState<PairSortOption>('males-first');
  const [activeMenuChildId, setActiveMenuChildId] = useState<number | null>(null);

  // Master-Detail selection state
  const [selectedSireName, setSelectedSireName] = useState<string | null>(null);
  const [selectedDamName, setSelectedDamName] = useState<string | null>(null);
  const [selectedPedigreeId, setSelectedPedigreeId] = useState<number | null>(null);

  // Left pane filter & sort
  const [sirePaneFilter, setSirePaneFilter] = useState('');
  const [damPaneFilter, setDamPaneFilter] = useState('');
  const [sirePaneSort, setSirePaneSort] = useState<'most' | 'code' | 'name'>('most');
  const [damPaneSort, setDamPaneSort] = useState<'most' | 'code' | 'name'>('most');

  // Mobile master-detail view mode: 'list' (shows left pane) | 'detail' (shows right pane)
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');

  // Highlighted chicken ID (for smooth scroll & flash)
  const [highlightedFowlId, setHighlightedFowlId] = useState<number | null>(null);

  // Global search dropdown state
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);

  useEffect(() => {
    if (activeMenuChildId === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveMenuChildId(null);
    };
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && !target.closest(`[data-actions-menu="${activeMenuChildId}"]`)) {
        setActiveMenuChildId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeMenuChildId]);

  const handleAddMatch = (child: FowlRecord) => {
    setActiveMenuChildId(null);
    ui.setEditingMatch({
      id: 0,
      date: new Date().toISOString().slice(0, 10),
      entry_name: child.name,
      breed: child.breed || '',
      opponent: '',
      location: '',
      type: 'Hack Fight',
      outcome: 'Win',
      status: 'Completed',
    } as MatchRecord);
  };

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

  const togglePair = (key: string, currentOpen: boolean) => {
    setExpandedPairs((prev) => {
      const next = new Map(prev);
      next.set(key, !currentOpen);
      return next;
    });
  };

  const expandAllPairsForParent = (keys: string[]) => {
    setExpandedPairs((prev) => {
      const next = new Map(prev);
      keys.forEach((k) => next.set(k, true));
      return next;
    });
  };

  const collapseAllPairsForParent = (keys: string[]) => {
    setExpandedPairs((prev) => {
      const next = new Map(prev);
      keys.forEach((k) => next.set(k, false));
      return next;
    });
  };

  const getParentCode = (parentName: string, role: 'sire' | 'dam', sampleChild?: FowlRecord): string => {
    const norm = (parentName || '').trim().toLowerCase();
    if (!isKnownParent(norm)) {
      return role === 'sire' ? UNKNOWN_SIRE_CODE : UNKNOWN_DAM_CODE;
    }
    const fowl = fowls.find((f) => (f.name || '').trim().toLowerCase() === norm);
    if (fowl) {
      const raw = fowl.chicken_code || fowl.bird_code || birdCodes.get(String(fowl.id));
      if (raw) return formatBirdCodeForDisplay(raw);
    }
    if (sampleChild) {
      const childCode = sampleChild.chicken_code || sampleChild.bird_code || birdCodes.get(String(sampleChild.id));
      if (childCode) {
        return role === 'sire' ? sirePart(childCode) : damPart(childCode);
      }
    }
    return '';
  };

  const getPairCode = (sireCode: string, damCode: string, sampleChild?: FowlRecord): string => {
    if (sampleChild) {
      const raw = sampleChild.chicken_code || sampleChild.bird_code || birdCodes.get(String(sampleChild.id));
      if (raw) {
        const match = raw.match(/^(\d+[A-Za-z]+)/);
        if (match) return match[1];
      }
    }
    const base = offspringBase(sireCode, damCode);
    if (base) return base;
    return `${sireCode || UNKNOWN_SIRE_CODE}${damCode || UNKNOWN_DAM_CODE}`;
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

  const matchStatsLookup = useMemo(() => buildChickenMatchStatsMap(matchHistory), [matchHistory]);

  const getChildMatchStats = (childName: string) => {
    return matchStatsLookup.get(childName.trim().toLowerCase()) || computeWinRate(0, 0);
  };

  const cachedStats = (name: string) => {
    return getChildMatchStats(name);
  };

  const groupStats = (children: FowlRecord[]) => {
    return combineWinRates(children.map((c) => getChildMatchStats(c.name)));
  };

  const rankingStatsOf = (name: string) => {
    const s = cachedStats(name);
    return { ...s, winRate: s.winRate ?? 0 };
  };
  const rankOffspring = (children: FowlRecord[]) =>
    rankFowls(children, rankingStatsOf, settings.ranking_metric, settings.ranking_min_matches);
  const bestOf = (children: FowlRecord[]) =>
    bestFowl(children, rankingStatsOf, settings.ranking_metric, settings.ranking_min_matches);
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

  // URL sync & popstate listener for ?sire=... and ?dam=...
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'sire' || tabParam === 'dam' || tabParam === 'families' || tabParam === 'tree' || tabParam === 'pedigree') {
        setActiveTab(tabParam as LineageTab);
      }
      const sireParam = params.get('sire');
      if (sireParam && sireEntries.length > 0) {
        const norm = sireParam.trim().toLowerCase();
        const found = sireEntries.find(([name, kids]) => {
          if (name.toLowerCase() === norm) return true;
          const code = getParentCode(name, 'sire', kids[0]);
          return code.toLowerCase() === norm;
        });
        if (found) {
          setSelectedSireName(found[0]);
          setActiveTab('sire');
          setMobileView('detail');
        }
      }
      const damParam = params.get('dam');
      if (damParam && damEntries.length > 0) {
        const norm = damParam.trim().toLowerCase();
        const found = damEntries.find(([name, kids]) => {
          if (name.toLowerCase() === norm) return true;
          const code = getParentCode(name, 'dam', kids[0]);
          return code.toLowerCase() === norm;
        });
        if (found) {
          setSelectedDamName(found[0]);
          setActiveTab('dam');
          setMobileView('detail');
        }
      }
      const childParam = params.get('child');
      if (childParam) {
        const cid = parseInt(childParam, 10);
        if (!isNaN(cid)) {
          setHighlightedFowlId(cid);
          setTimeout(() => {
            const el = document.getElementById(`fowl-row-${cid}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 400);
          setTimeout(() => setHighlightedFowlId(null), 3000);
        }
      }
      const chickenParam = params.get('chicken');
      if (chickenParam) {
        const norm = chickenParam.trim().toLowerCase();
        const match = fowls.find((f) => {
          const code = f.bird_code || f.chicken_code || birdCodes.get(String(f.id));
          if (code && code.toLowerCase() === norm) return true;
          if (f.bird_code && f.bird_code.toLowerCase() === norm) return true;
          if (f.chicken_code && f.chicken_code.toLowerCase() === norm) return true;
          if (f.birth_code && f.birth_code.toLowerCase() === norm) return true;
          if (f.wing_band && f.wing_band.toLowerCase() === norm) return true;
          if (String(f.id) === norm) return true;
          return false;
        });
        if (match) {
          setSelectedPedigreeId(match.id);
          if (!tabParam) {
            setActiveTab('pedigree');
          }
        }
      }
    };

    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, [sireEntries, damEntries, fowls, birdCodes]);

  // Default selection for sire
  useEffect(() => {
    if (sireEntries.length > 0) {
      if (!selectedSireName || !sireEntries.some(([name]) => name === selectedSireName)) {
        const saved = typeof window !== 'undefined' ? localStorage.getItem('gt_last_selected_sire') : null;
        const found = saved && sireEntries.find(([name]) => name === saved);
        setSelectedSireName(found ? found[0] : sireEntries[0][0]);
      }
    }
  }, [sireEntries, selectedSireName]);

  // Default selection for dam
  useEffect(() => {
    if (damEntries.length > 0) {
      if (!selectedDamName || !damEntries.some(([name]) => name === selectedDamName)) {
        const saved = typeof window !== 'undefined' ? localStorage.getItem('gt_last_selected_dam') : null;
        const found = saved && damEntries.find(([name]) => name === saved);
        setSelectedDamName(found ? found[0] : damEntries[0][0]);
      }
    }
  }, [damEntries, selectedDamName]);

  const handleSelectParent = (name: string, kind: 'sire' | 'dam', code: string) => {
    if (kind === 'sire') {
      setSelectedSireName(name);
    } else {
      setSelectedDamName(name);
    }
    setMobileView('detail');
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`gt_last_selected_${kind}`, name);
        const url = new URL(window.location.href);
        url.searchParams.set('tab', kind);
        url.searchParams.set(kind, code || name);
        window.history.pushState({}, '', url.toString());
      } catch (err) {
        // ignore
      }
    }
  };

  const handleListKeyDown = (
    e: React.KeyboardEvent,
    list: [string, FowlRecord[]][],
    kind: 'sire' | 'dam'
  ) => {
    if (list.length === 0) return;
    const currentName = kind === 'sire' ? (selectedSireName || list[0][0]) : (selectedDamName || list[0][0]);
    const currentIndex = list.findIndex(([name]) => name === currentName);

    let nextIndex = currentIndex;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      nextIndex = currentIndex < list.length - 1 ? currentIndex + 1 : 0;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      nextIndex = currentIndex > 0 ? currentIndex - 1 : list.length - 1;
    } else if (e.key === 'Home') {
      e.preventDefault();
      nextIndex = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      nextIndex = list.length - 1;
    } else {
      return;
    }

    const [nextName, nextChildren] = list[nextIndex];
    const code = getParentCode(nextName, kind, nextChildren[0]);
    handleSelectParent(nextName, kind, code);
  };

  const handleSelectSearchedChicken = (child: FowlRecord) => {
    setSearch('');
    setIsSearchDropdownOpen(false);
    const hasSire = Boolean(child.sire && isKnownParent(child.sire));
    const hasDam = Boolean(child.dam && isKnownParent(child.dam));

    if (hasSire) {
      setActiveTab('sire');
      setSelectedSireName(child.sire);
      setMobileView('detail');
      const mate = isKnownParent(child.dam) ? normalizeParentName(child.dam) : 'Unknown dam';
      setExpandedPairs((prev) => new Map(prev).set(`sire|||${child.sire}|||${mate}`, true));
    } else if (hasDam) {
      setActiveTab('dam');
      setSelectedDamName(child.dam);
      setMobileView('detail');
      const mate = isKnownParent(child.sire) ? normalizeParentName(child.sire) : 'Unknown sire';
      setExpandedPairs((prev) => new Map(prev).set(`dam|||${child.dam}|||${mate}`, true));
    }

    setHighlightedFowlId(child.id);
    setTimeout(() => {
      const el = document.getElementById(`fowl-row-${child.id}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 350);
    setTimeout(() => setHighlightedFowlId(null), 3000);
  };

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

  const matchingChickens = useMemo(() => {
    const qStr = search.trim().toLowerCase();
    if (!qStr) return [];
    return fowls
      .filter((f) => {
        const code = f.bird_code || birdCodes.get(String(f.id)) || '';
        return (
          f.name.toLowerCase().includes(qStr) ||
          code.toLowerCase().includes(qStr) ||
          (f.wing_band && f.wing_band.toLowerCase().includes(qStr)) ||
          (f.breed && f.breed.toLowerCase().includes(qStr)) ||
          String(f.id) === qStr
        );
      })
      .slice(0, 8);
  }, [fowls, search, birdCodes]);

  // Tab tools handlers
  const handleExpandAll = () => {
    if (activeTab === 'sire') {
      setExpandedSires(new Set(filteredSireEntries.map(([sire]) => sire)));
      setExpandedPairs((prev) => {
        const next = new Map(prev);
        filteredSireEntries.forEach(([sire, children]) => {
          children.forEach((c) => {
            const mate = isKnownParent(c.dam) ? normalizeParentName(c.dam) : 'Unknown dam';
            next.set(`sire|||${sire}|||${mate}`, true);
          });
        });
        return next;
      });
    } else if (activeTab === 'dam') {
      setExpandedDams(new Set(filteredDamEntries.map(([dam]) => dam)));
      setExpandedPairs((prev) => {
        const next = new Map(prev);
        filteredDamEntries.forEach(([dam, children]) => {
          children.forEach((c) => {
            const mate = isKnownParent(c.sire) ? normalizeParentName(c.sire) : 'Unknown sire';
            next.set(`dam|||${dam}|||${mate}`, true);
          });
        });
        return next;
      });
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

  const sortPairChildren = (list: FowlRecord[], sortByMode: PairSortOption) => {
    return [...list].sort((a, b) => {
      if (sortByMode === 'age') {
        const ageA = parseAgeMonths(a.age);
        const ageB = parseAgeMonths(b.age);
        if (ageB !== ageA) return ageB - ageA;
        return a.name.localeCompare(b.name);
      }
      if (sortByMode === 'wins') {
        const sa = cachedStats(a.name);
        const sb = cachedStats(b.name);
        if (sb.wins !== sa.wins) return sb.wins - sa.wins;
        const ageA = parseAgeMonths(a.age);
        const ageB = parseAgeMonths(b.age);
        if (ageB !== ageA) return ageB - ageA;
        return a.name.localeCompare(b.name);
      }
      if (sortByMode === 'winrate') {
        const sa = cachedStats(a.name);
        const sb = cachedStats(b.name);
        const foughtA = sa.decided > 0;
        const foughtB = sb.decided > 0;
        if (foughtA !== foughtB) return foughtA ? -1 : 1;
        if (foughtA && foughtB) {
          const rateA = sa.winRate ?? 0;
          const rateB = sb.winRate ?? 0;
          if (rateB !== rateA) return rateB - rateA;
          if (sb.decided !== sa.decided) return sb.decided - sa.decided;
          if (sb.wins !== sa.wins) return sb.wins - sa.wins;
        }
        const codeA = a.birth_code || a.chicken_code || a.bird_code || birdCodes.get(String(a.id)) || '';
        const codeB = b.birth_code || b.chicken_code || b.bird_code || birdCodes.get(String(b.id)) || '';
        if (codeA && codeB) {
          const cmp = compareBirdCodesNatural(codeA, codeB);
          if (cmp !== 0) return cmp;
        } else if (codeA) {
          return -1;
        } else if (codeB) {
          return 1;
        }
        return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }) || a.id - b.id;
      }
      if (sortByMode === 'males-first') {
        const maleA = isMaleChild(a);
        const maleB = isMaleChild(b);
        if (maleA !== maleB) {
          return maleA ? -1 : 1;
        }
        // Within each sex: chickens that have fought come first, then chickens without fights in birth-code order
        const sa = cachedStats(a.name);
        const sb = cachedStats(b.name);
        const foughtA = sa.decided > 0;
        const foughtB = sb.decided > 0;
        if (foughtA !== foughtB) return foughtA ? -1 : 1;
        if (foughtA && foughtB) {
          const rateA = sa.winRate ?? 0;
          const rateB = sb.winRate ?? 0;
          if (rateB !== rateA) return rateB - rateA;
          if (sb.decided !== sa.decided) return sb.decided - sa.decided;
        }
        const codeA = a.birth_code || a.chicken_code || a.bird_code || birdCodes.get(String(a.id)) || '';
        const codeB = b.birth_code || b.chicken_code || b.bird_code || birdCodes.get(String(b.id)) || '';
        if (codeA && codeB) {
          const cmp = compareBirdCodesNatural(codeA, codeB);
          if (cmp !== 0) return cmp;
        } else if (codeA) {
          return -1;
        } else if (codeB) {
          return 1;
        }
        return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }) || a.id - b.id;
      }
      // 'code': birth code (1A1, 1A2, 1A3...) ascending regardless of sex
      const codeA = a.birth_code || a.chicken_code || a.bird_code || birdCodes.get(String(a.id)) || '';
      const codeB = b.birth_code || b.chicken_code || b.bird_code || birdCodes.get(String(b.id)) || '';
      if (codeA && codeB) {
        const cmp = compareBirdCodesNatural(codeA, codeB);
        if (cmp !== 0) return cmp;
      } else if (codeA) {
        return -1;
      } else if (codeB) {
        return 1;
      }
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }) || a.id - b.id;
    });
  };

  const renderParentTree = (
    entries: [string, FowlRecord[]][],
    expandedSet: Set<string>,
    toggleFn: (name: string) => void,
    kind: 'sire' | 'dam',
    color: 'sky' | 'pink',
  ) => {
    const colorMap = {
      sky: {
        bg: 'bg-sky-100 dark:bg-sky-950/50',
        border: 'border-sky-200 dark:border-sky-800',
        hoverBg: 'hover:bg-sky-50/50 dark:hover:bg-sky-950/20',
        icon: 'sire',
        text: 'text-sky-700 dark:text-sky-400',
        activeRing: 'ring-2 ring-sky-500 bg-sky-50 dark:bg-sky-950/40 border-sky-400 dark:border-sky-700',
      },
      pink: {
        bg: 'pink-100 dark:bg-pink-950/50',
        border: 'border-pink-200 dark:border-pink-800',
        hoverBg: 'hover:bg-pink-50/50 dark:hover:bg-pink-950/20',
        icon: 'dam',
        text: 'text-pink-700 dark:text-pink-400',
        activeRing: 'ring-2 ring-pink-500 bg-pink-50 dark:bg-pink-950/40 border-pink-400 dark:border-pink-700',
      },
    };
    const c = colorMap[color];
    const otherRole = kind === 'sire' ? 'dam' : 'sire';
    const otherLabel = kind === 'sire' ? 'dam' : 'sire';

    const paneFilter = kind === 'sire' ? sirePaneFilter : damPaneFilter;
    const setPaneFilter = kind === 'sire' ? setSirePaneFilter : setDamPaneFilter;
    const paneSort = kind === 'sire' ? sirePaneSort : damPaneSort;
    const setPaneSort = kind === 'sire' ? setSirePaneSort : setDamPaneSort;
    const selectedName = kind === 'sire' ? selectedSireName : selectedDamName;

    // Filter left pane
    const filterQ = paneFilter.trim().toLowerCase();
    const filteredPaneEntries = entries.filter(([name, children]) => {
      if (!filterQ) return true;
      const code = getParentCode(name, kind, children[0]);
      return name.toLowerCase().includes(filterQ) || code.toLowerCase().includes(filterQ);
    });

    // Sort left pane
    const sortedPaneEntries = [...filteredPaneEntries].sort((a, b) => {
      if (paneSort === 'name') {
        return a[0].localeCompare(b[0]);
      }
      if (paneSort === 'code') {
        const codeA = getParentCode(a[0], kind, a[1][0]);
        const codeB = getParentCode(b[0], kind, b[1][0]);
        return compareBirdCodesNatural(codeA, codeB);
      }
      // 'most' offspring desc, then wins
      if (b[1].length !== a[1].length) {
        return b[1].length - a[1].length;
      }
      const winsA = a[1].reduce((sum, ch) => sum + cachedStats(ch.name).wins, 0);
      const winsB = b[1].reduce((sum, ch) => sum + cachedStats(ch.name).wins, 0);
      return winsB - winsA;
    });

    // Active selected parent
    const activeEntry =
      entries.find(([name]) => name === selectedName) ||
      sortedPaneEntries[0] ||
      entries[0];

    const activeParentName = activeEntry ? activeEntry[0] : null;
    const activeChildren = activeEntry ? activeEntry[1] : [];
    const activeParentCode = activeParentName
      ? getParentCode(activeParentName, kind, activeChildren[0])
      : '';
    const activeParentFowl = activeParentName
      ? fowls.find((f) => f.name.toLowerCase() === activeParentName.toLowerCase())
      : null;
    const activeParentStats = groupStats(activeChildren);
    const activeMales = activeChildren.filter(isMaleChild).length;
    const activeFemales = activeChildren.length - activeMales;

    // Build pair groups for active parent
    const pairMap = new Map<string, FowlRecord[]>();
    activeChildren.forEach((child) => {
      const rawMate = otherRole === 'dam' ? child.dam : child.sire;
      const isKnown = isKnownParent(rawMate);
      const key = isKnown
        ? normalizeParentName(rawMate)
        : otherRole === 'dam'
        ? 'Unknown dam'
        : 'Unknown sire';
      const arr = pairMap.get(key) || [];
      arr.push(child);
      pairMap.set(key, arr);
    });

    const pairGroups = Array.from(pairMap.entries()).map(([otherName, pairChildren]) => {
      const isUnknownOther = otherName === 'Unknown dam' || otherName === 'Unknown sire';
      const otherCode = isUnknownOther
        ? otherRole === 'dam'
          ? UNKNOWN_DAM_CODE
          : UNKNOWN_SIRE_CODE
        : getParentCode(otherName, otherRole, pairChildren[0]);

      const sireCode = kind === 'sire' ? activeParentCode : otherCode;
      const damCode = kind === 'dam' ? activeParentCode : otherCode;
      const pairCode = getPairCode(sireCode, damCode, pairChildren[0]);

      const pairKey = `${kind}|||${activeParentName}|||${otherName}`;
      const maleCount = pairChildren.filter(isMaleChild).length;
      const femaleCount = pairChildren.length - maleCount;
      const archivedCount = pairChildren.filter((c) => c.status === 'Archived').length;
      const deceasedCount = pairChildren.filter((c) => c.status === 'Deceased').length;
      const pairStats = groupStats(pairChildren);

      return {
        key: pairKey,
        otherName,
        otherCode,
        isUnknownOther,
        pairCode,
        offspring: pairChildren,
        maleCount,
        femaleCount,
        archivedCount,
        deceasedCount,
        stats: pairStats,
      };
    });

    pairGroups.sort((a, b) => {
      if (a.isUnknownOther !== b.isUnknownOther) {
        return a.isUnknownOther ? 1 : -1;
      }
      if (b.offspring.length !== a.offspring.length) {
        return b.offspring.length - a.offspring.length;
      }
      if (b.stats.wins !== a.stats.wins) {
        return b.stats.wins - a.stats.wins;
      }
      return a.otherName.localeCompare(b.otherName);
    });

    const hasMoreThan12 = activeChildren.length > 12;
    const allPairsExpanded = pairGroups.every((pg) => expandedPairs.get(pg.key) ?? true);

    const toggleAllPairs = () => {
      setExpandedPairs((prev) => {
        const next = new Map(prev);
        const targetState = !allPairsExpanded;
        pairGroups.forEach((pg) => next.set(pg.key, targetState));
        return next;
      });
    };

    const renderLeftPane = () => (
      <aside
        aria-label={`${kind === 'sire' ? 'Sires' : 'Dams'} selection`}
        className="w-full lg:w-72 xl:w-80 shrink-0 bg-card rounded-lg border border-border p-3.5 space-y-3 lg:max-h-[calc(100vh-210px)] lg:overflow-y-auto"
      >
        {/* Pane Controls: Search & Sort */}
        <div className="space-y-2">
          <div className="relative">
            <span
              aria-hidden="true"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            >
              <Search className="w-3.5 h-3.5" />
            </span>
            <input
              type="text"
              aria-label={`Filter ${kind === 'sire' ? 'sires' : 'dams'}`}
              placeholder={`Filter ${kind === 'sire' ? 'sires' : 'dams'}…`}
              value={paneFilter}
              onChange={(e) => setPaneFilter(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-muted/60 border border-input-border rounded-md text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-semibold"
            />
            {paneFilter.length > 0 && (
              <button
                type="button"
                aria-label={`Clear ${kind === 'sire' ? 'sires' : 'dams'} filter`}
                onClick={() => setPaneFilter('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground px-0.5">
            <span className="font-bold">
              {filteredPaneEntries.length} {kind === 'sire' ? (filteredPaneEntries.length === 1 ? 'sire' : 'sires') : (filteredPaneEntries.length === 1 ? 'dam' : 'dams')}
            </span>
            <div className="flex items-center gap-1">
              <span className="text-xs font-semibold">Sort:</span>
              <select
                value={paneSort}
                onChange={(e) => setPaneSort(e.target.value as 'most' | 'code' | 'name')}
                aria-label={`Sort ${kind === 'sire' ? 'sires' : 'dams'}`}
                className="text-xs bg-transparent border-0 font-bold text-foreground focus:ring-0 p-0 cursor-pointer"
              >
                <option value="most" className="bg-card text-card-foreground">Most offspring</option>
                <option value="code" className="bg-card text-card-foreground">Code</option>
                <option value="name" className="bg-card text-card-foreground">Name</option>
              </select>
            </div>
          </div>
        </div>

        {/* List of Sires/Dams */}
        {sortedPaneEntries.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground space-y-1">
            <p>No {kind === 'sire' ? 'sires' : 'dams'} match filter</p>
            {paneFilter && (
              <button
                type="button"
                onClick={() => setPaneFilter('')}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                Clear filter
              </button>
            )}
          </div>
        ) : (
          <div
            role="listbox"
            tabIndex={0}
            aria-label={`${kind === 'sire' ? 'Sires' : 'Dams'} list`}
            onKeyDown={(e) => handleListKeyDown(e, sortedPaneEntries, kind)}
            className="space-y-1.5 focus:outline-none"
          >
            {sortedPaneEntries.map(([name, kids]) => {
              const code = getParentCode(name, kind, kids[0]);
              const isSelected = name === activeParentName;
              const stats = combineWinRates(kids.map((k) => cachedStats(k.name)));

              return (
                <button
                  key={name}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelectParent(name, kind, code)}
                  className={`w-full min-h-[44px] text-left px-3 py-2.5 rounded-md flex items-center justify-between gap-2.5 transition-all cursor-pointer border ${
                    isSelected
                      ? `${c.activeRing} font-black shadow-2xs`
                      : 'border-transparent hover:bg-muted/60 text-card-foreground font-semibold'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`font-mono text-xs px-1.5 py-0.5 rounded font-black border uppercase shrink-0 ${
                        isSelected
                          ? `${c.bg} ${c.text} ${c.border}`
                          : 'bg-muted text-muted-foreground border-border'
                      }`}
                    >
                      [{formatBirdCodeForDisplay(code)}]
                    </span>
                    <span className="text-xs truncate">{name}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {stats.decided > 0 && (
                      <span
                        className={`text-xs font-bold px-1.5 py-0.5 rounded-full border ${getWinRatePillClasses(
                          stats,
                        )}`}
                      >
                        {stats.winRate}% · {stats.wins}W-{stats.losses}L
                      </span>
                    )}
                    <span className="text-xs font-bold text-muted-foreground">
                      {kids.length}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </aside>
    );

    const renderRightPane = () => {
      if (!activeEntry) {
        return (
          <div className="flex-1 bg-card rounded-lg border border-border p-12 text-center text-muted-foreground">
            No {kind === 'sire' ? 'sire' : 'dam'} selected
          </div>
        );
      }

      return (
        <main
          role="region"
          aria-label={`${activeParentName} details`}
          className="flex-1 min-w-0 space-y-4 lg:max-h-[calc(100vh-210px)] lg:overflow-y-auto pr-1"
        >
          {/* Mobile Back Button (< 1024px) */}
          <div className="lg:hidden">
            <button
              type="button"
              onClick={() => setMobileView('list')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground bg-muted hover:bg-muted/80 px-3 py-2 rounded-md transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to all {kind === 'sire' ? 'sires' : 'dams'}
            </button>
          </div>

          {/* Right Pane Header Card */}
          <div className="bg-card rounded-lg border border-border p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3.5 min-w-0">
                {activeParentFowl?.image_url ? (
                  <img
                    src={activeParentFowl.image_url}
                    alt={activeParentName || ''}
                    className="w-12 h-12 rounded-full object-cover shrink-0 border-2 border-border shadow-xs"
                  />
                ) : (
                  <div
                    className={`w-12 h-12 rounded-full ${c.bg} ${c.border} border-2 flex items-center justify-center font-black text-sm ${c.text} shrink-0 select-none shadow-xs`}
                  >
                    {getInitials(activeParentName || '')}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {activeParentCode && (
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-muted text-foreground border border-border font-black uppercase shrink-0">
                        [{formatBirdCodeForDisplay(activeParentCode)}]
                      </span>
                    )}
                    <h2 className="text-base sm:text-lg font-black text-card-foreground truncate">
                      {activeParentName}
                    </h2>
                    {(activeParentFowl?.breed || activeChildren[0]?.breed) && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                        {activeParentFowl?.breed || activeChildren[0]?.breed}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5 flex-wrap mt-0.5">
                    <span>{activeChildren.length} offspring</span>
                    <span className="text-muted-foreground/50 select-none">·</span>
                    <span>{activeMales}♂ {activeFemales}♀</span>
                    <span className="text-muted-foreground/50 select-none">·</span>
                    <span className={c.text}>
                      {pairGroups.length} {otherLabel}{pairGroups.length !== 1 ? 's' : ''}
                    </span>
                    <span className="text-muted-foreground/50 select-none">·</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-muted-foreground font-semibold">
                        {kind === 'sire' ? 'Sire' : 'Dam'} total · {activeChildren.filter((ch) => cachedStats(ch.name).total > 0).length} of {activeChildren.length} offspring have fought
                        {activeParentStats.decided > 0 ? ` · ${activeParentStats.wins}W-${activeParentStats.losses}L · ${activeParentStats.winRate}%` : ''}
                      </span>
                      <WinRatePill stats={activeParentStats} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                {hasMoreThan12 && (
                  <button
                    type="button"
                    onClick={toggleAllPairs}
                    className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline px-2.5 py-1.5 rounded-md hover:bg-emerald-500/10 transition-colors cursor-pointer"
                  >
                    {allPairsExpanded ? 'Collapse all pairs' : 'Expand all pairs'}
                  </button>
                )}
                {activeParentFowl && (
                  <button
                    type="button"
                    onClick={() => setSelectedFowlForDetails(activeParentFowl)}
                    className="text-xs font-bold bg-muted hover:bg-muted/80 text-foreground px-3 py-1.5 rounded-md border border-border transition-colors cursor-pointer"
                  >
                    View profile
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Pair Groups (One after another, expanded by default) */}
          <div className="space-y-3.5">
            {pairGroups.map((pg, pairIndex) => {
              const isPairExplicit = expandedPairs.has(pg.key);
              const isPairOpen = isPairExplicit
                ? Boolean(expandedPairs.get(pg.key))
                : hasMoreThan12
                ? pairIndex < 2
                : true;

              // Filter offspring inside pair
              const pairVisibleOffspring =
                treeSexFilter === 'males'
                  ? pg.offspring.filter(isMaleChild)
                  : treeSexFilter === 'females'
                  ? pg.offspring.filter((ch) => !isMaleChild(ch))
                  : pg.offspring;

              const rankedPairOffspring = sortPairChildren(pairVisibleOffspring, pairSortBy);

              const sireDisplayName = kind === 'sire' ? activeParentName : pg.otherName;
              const sireDisplayCode = kind === 'sire' ? activeParentCode : pg.otherCode;
              const damDisplayName = kind === 'dam' ? activeParentName : pg.otherName;
              const damDisplayCode = kind === 'dam' ? activeParentCode : pg.otherCode;

              return (
                <div
                  key={pg.key}
                  className="bg-card rounded-lg border border-border shadow-xs overflow-hidden"
                >
                  {/* Sticky Slim Pair Header */}
                  <button
                    type="button"
                    onClick={() => togglePair(pg.key, isPairOpen)}
                    className="w-full sticky top-0 z-10 flex items-center justify-between gap-3 px-3.5 py-2.5 text-left bg-muted/50 hover:bg-muted/80 backdrop-blur-xs border-b border-border transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                      <span className="text-xs font-black text-card-foreground truncate">
                        {sireDisplayName}{sireDisplayCode ? ` (${sireDisplayCode})` : ''}
                      </span>
                      <span className="text-sm font-black text-muted-foreground select-none">×</span>
                      <span className="text-xs font-black text-card-foreground truncate">
                        {damDisplayName}{damDisplayCode ? ` (${damDisplayCode})` : ''}
                      </span>
                      <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-card text-foreground border border-border shrink-0">
                        {pg.pairCode}
                      </span>
                      <span className="text-muted-foreground/60 select-none">·</span>
                      <span className="text-xs text-muted-foreground font-semibold shrink-0">
                        {pg.offspring.length} offspring
                      </span>
                      <span className="text-muted-foreground/60 select-none">·</span>
                      <span className="text-xs text-muted-foreground font-semibold shrink-0">
                        {pg.maleCount}♂ {pg.femaleCount}♀
                      </span>
                      {pg.archivedCount > 0 && (
                        <>
                          <span className="text-muted-foreground/60 select-none">·</span>
                          <span className="text-xs font-bold text-amber-600 dark:text-amber-400 shrink-0">
                            {pg.archivedCount} archived
                          </span>
                        </>
                      )}
                      {pg.deceasedCount > 0 && (
                        <>
                          <span className="text-muted-foreground/60 select-none">·</span>
                          <span className="text-xs font-bold text-rose-600 dark:text-rose-400 shrink-0">
                            {pg.deceasedCount} deceased
                          </span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <WinRatePill stats={pg.stats} />
                      {isPairOpen ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {/* Pair Offspring Content */}
                  {isPairOpen && (
                    <div className="p-3 sm:p-4 space-y-3">
                      {/* Filter Chips & Sort Controls */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setTreeSexFilter('all')}
                            className={`px-2.5 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
                              treeSexFilter === 'all'
                                ? 'bg-primary text-primary-foreground shadow-2xs'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            }`}
                          >
                            All ({pg.offspring.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setTreeSexFilter('males')}
                            className={`px-2.5 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
                              treeSexFilter === 'males'
                                ? 'bg-sky-600 text-white shadow-2xs'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            }`}
                          >
                            ♂ Males ({pg.maleCount})
                          </button>
                          <button
                            type="button"
                            onClick={() => setTreeSexFilter('females')}
                            className={`px-2.5 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
                              treeSexFilter === 'females'
                                ? 'bg-pink-600 text-white shadow-2xs'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            }`}
                          >
                            ♀ Females ({pg.femaleCount})
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground font-semibold">Sort:</span>
                          <select
                            value={pairSortBy}
                            onChange={(e) => setPairSortBy(e.target.value as PairSortOption)}
                            aria-label="Sort pair offspring"
                            className="text-xs bg-muted border border-input-border rounded px-2 py-1 font-bold text-foreground cursor-pointer focus:ring-1 focus:ring-emerald-500"
                          >
                            <option value="males-first">Males first, then code</option>
                            <option value="winrate">Win rate</option>
                            <option value="code">Code only</option>
                            <option value="age">Age</option>
                            <option value="wins">Wins</option>
                          </select>
                        </div>
                      </div>

                      {/* Desktop Table Layout (>= md) */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-border/60 text-muted-foreground font-bold">
                              <th className="py-2 px-2.5">Code</th>
                              <th className="py-2 px-2.5">Chicken</th>
                              <th className="py-2 px-2.5">Sex</th>
                              <th className="py-2 px-2.5">Age</th>
                              <th className="py-2 px-2.5">Status</th>
                              <th className="py-2 px-2.5">Record</th>
                              <th className="py-2 px-2.5 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/40">
                            {(() => {
                              const renderRow = (child: FowlRecord) => {
                                const stats = cachedStats(child.name);
                                const code =
                                  child.birth_code ||
                                  child.chicken_code ||
                                  child.bird_code ||
                                  birdCodes.get(String(child.id));
                                const isMale = isMaleChild(child);
                                const isDimmed =
                                  child.status === 'Archived' || child.status === 'Deceased';
                                const sireBreed = (
                                  parentBreedOf(sireDisplayName, fowls) || ''
                                )
                                  .trim()
                                  .toLowerCase();
                                const childBreed = (child.breed || '').trim();
                                const isDifferentBreed = Boolean(
                                  childBreed &&
                                    (!sireBreed || childBreed.toLowerCase() !== sireBreed)
                                );
                                const isHighlighted = child.id === highlightedFowlId;

                                return (
                                  <tr
                                    id={`fowl-row-${child.id}`}
                                    key={child.id}
                                    className={`hover:bg-muted/40 transition-all ${
                                      isDimmed ? 'opacity-65' : ''
                                    } ${
                                      isHighlighted
                                        ? 'ring-2 ring-emerald-500 bg-emerald-500/15 animate-pulse'
                                        : ''
                                    }`}
                                  >
                                    <td className="py-2.5 px-2.5 whitespace-nowrap">
                                      <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted text-foreground border border-border font-bold uppercase">
                                        [{code ? formatBirdCodeForDisplay(code) : '—'}]
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-2.5">
                                      <div className="flex items-center gap-2">
                                        {child.image_url ? (
                                          <img
                                            src={child.image_url}
                                            alt={child.name}
                                            className="w-8 h-8 rounded-full object-cover shrink-0 border border-border"
                                          />
                                        ) : (
                                          <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center text-xs font-black text-muted-foreground shrink-0 select-none">
                                            {getInitials(child.name)}
                                          </div>
                                        )}
                                        <div className="min-w-0">
                                          <button
                                            type="button"
                                            onClick={() => setSelectedFowlForDetails(child)}
                                            className="font-bold text-card-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors truncate block text-left cursor-pointer"
                                          >
                                            {child.name}
                                          </button>
                                          {isDifferentBreed && (
                                            <span className="text-xs text-muted-foreground block truncate">
                                              {child.breed}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                    <td className="py-2.5 px-2.5 whitespace-nowrap">
                                      <span
                                        className={`inline-flex items-center gap-1 font-bold ${
                                          isMale
                                            ? 'text-sky-600 dark:text-sky-400'
                                            : 'text-pink-600 dark:text-pink-400'
                                        }`}
                                      >
                                        {isMale ? '♂ Cock' : '♀ Hen'}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-2.5 whitespace-nowrap text-muted-foreground font-semibold">
                                      {formatAge(child.birthdate, child.age)}
                                    </td>
                                    <td className="py-2.5 px-2.5 whitespace-nowrap">
                                      <StatusPill status={child.status} />
                                    </td>
                                    <td className="py-2.5 px-2.5 whitespace-nowrap">
                                      <div className="flex items-center gap-2">
                                        <WinRatePill
                                          wins={stats.wins}
                                          losses={stats.losses}
                                          draws={stats.draws}
                                          stats={stats}
                                        />
                                        <button
                                          type="button"
                                          onClick={() => openFights(child)}
                                          className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-muted px-2 py-1 rounded transition-colors cursor-pointer"
                                          title={`View ${child.name} fight history`}
                                        >
                                          <Swords className="w-3.5 h-3.5" />
                                          <span>Fights</span>
                                        </button>
                                      </div>
                                    </td>
                                    <td className="py-2.5 px-2.5 text-right whitespace-nowrap">
                                      <div
                                        className="relative inline-block text-left"
                                        data-actions-menu={child.id}
                                      >
                                        <button
                                          type="button"
                                          aria-label={`Actions for ${child.name}`}
                                          onClick={() =>
                                            setActiveMenuChildId((prev) =>
                                              prev === child.id ? null : child.id
                                            )
                                          }
                                          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                          title="Actions"
                                        >
                                          ⋯
                                        </button>
                                        {activeMenuChildId === child.id && (
                                          <div className="absolute right-0 mt-1 w-36 bg-card border border-border rounded-md shadow-lg z-20 py-1 text-xs">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setActiveMenuChildId(null);
                                                setSelectedFowlForDetails(child);
                                              }}
                                              className="w-full text-left px-3 py-1.5 hover:bg-muted transition-colors cursor-pointer font-semibold"
                                            >
                                              View details
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleAddMatch(child)}
                                              className="w-full text-left px-3 py-1.5 hover:bg-muted transition-colors cursor-pointer font-semibold"
                                            >
                                              Record fight
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setActiveMenuChildId(null);
                                                ui.setEditingFowl(child);
                                              }}
                                              className="w-full text-left px-3 py-1.5 hover:bg-muted transition-colors cursor-pointer font-semibold"
                                            >
                                              Edit chicken
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              };

                              if (pairSortBy === 'males-first') {
                                const males = rankedPairOffspring.filter(isMaleChild);
                                const females = rankedPairOffspring.filter((ch) => !isMaleChild(ch));
                                return (
                                  <>
                                    {males.length > 0 && (
                                      <tr className="bg-sky-500/5 border-y border-sky-500/10">
                                        <td
                                          colSpan={7}
                                          className="py-1 px-2.5 text-xs font-bold text-sky-700 dark:text-sky-400 tracking-wide"
                                        >
                                          ♂ Males ({males.length})
                                        </td>
                                      </tr>
                                    )}
                                    {males.map(renderRow)}
                                    {females.length > 0 && (
                                      <tr className="bg-pink-500/5 border-y border-pink-500/10">
                                        <td
                                          colSpan={7}
                                          className="py-1 px-2.5 text-xs font-bold text-pink-700 dark:text-pink-400 tracking-wide"
                                        >
                                          ♀ Females ({females.length})
                                        </td>
                                      </tr>
                                    )}
                                    {females.map(renderRow)}
                                  </>
                                );
                              }

                              return rankedPairOffspring.map(renderRow);
                            })()}
                          </tbody>
                          <tfoot>
                            <tr
                              title="Total wins ÷ total decided matches. Draws excluded."
                              className="bg-muted/40 font-bold border-t-2 border-border text-xs"
                            >
                              <td colSpan={5} className="py-2.5 px-2.5 text-card-foreground">
                                Pair total · {pg.offspring.filter((ch) => cachedStats(ch.name).total > 0).length} of {pg.offspring.length} offspring have fought
                                {pg.stats.decided > 0 ? ` · ${pg.stats.wins}W-${pg.stats.losses}L · ${pg.stats.winRate}%` : ''}
                              </td>
                              <td colSpan={2} className="py-2.5 px-2.5 text-right whitespace-nowrap">
                                <WinRatePill stats={pg.stats} />
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>

                      {/* Mobile Compact 2-Line Cards (< md) */}
                      <div className="md:hidden space-y-2">
                        {(() => {
                          const renderCard = (child: FowlRecord) => {
                            const stats = cachedStats(child.name);
                            const code =
                              child.birth_code ||
                              child.chicken_code ||
                              child.bird_code ||
                              birdCodes.get(String(child.id));
                            const isMale = isMaleChild(child);
                            const isDimmed =
                              child.status === 'Archived' || child.status === 'Deceased';
                            const sireBreed = (
                              parentBreedOf(sireDisplayName, fowls) || ''
                            )
                              .trim()
                              .toLowerCase();
                            const childBreed = (child.breed || '').trim();
                            const isDifferentBreed = Boolean(
                              childBreed &&
                                (!sireBreed || childBreed.toLowerCase() !== sireBreed)
                            );
                            const isHighlighted = child.id === highlightedFowlId;

                            return (
                              <div
                                id={`fowl-row-${child.id}`}
                                key={child.id}
                                className={`bg-card rounded-md border border-border p-2.5 space-y-2 ${
                                  isDimmed ? 'opacity-65' : ''
                                } ${
                                  isHighlighted
                                    ? 'ring-2 ring-emerald-500 bg-emerald-500/15 animate-pulse'
                                    : ''
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2 min-w-0">
                                  <div className="flex items-center gap-2 min-w-0">
                                    {child.image_url ? (
                                      <img
                                        src={child.image_url}
                                        alt={child.name}
                                        className="w-7 h-7 rounded-full object-cover shrink-0 border border-border"
                                      />
                                    ) : (
                                      <div className="w-7 h-7 rounded-full bg-muted border border-border flex items-center justify-center text-xs font-black text-muted-foreground shrink-0 select-none">
                                        {getInitials(child.name)}
                                      </div>
                                    )}
                                    <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted text-foreground border border-border font-bold uppercase shrink-0">
                                      [{code ? formatBirdCodeForDisplay(code) : '—'}]
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setSelectedFowlForDetails(child)}
                                      className="text-xs font-black text-card-foreground hover:text-emerald-600 dark:hover:text-emerald-400 truncate text-left cursor-pointer"
                                    >
                                      {child.name}
                                    </button>
                                  </div>

                                  <div
                                    className="relative shrink-0"
                                    data-actions-menu={child.id}
                                  >
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setActiveMenuChildId((prev) =>
                                          prev === child.id ? null : child.id
                                        )
                                      }
                                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                      title="Actions"
                                    >
                                      ⋯
                                    </button>
                                    {activeMenuChildId === child.id && (
                                      <div className="absolute right-0 mt-1 w-36 bg-card border border-border rounded-md shadow-lg z-20 py-1 text-xs">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setActiveMenuChildId(null);
                                            setSelectedFowlForDetails(child);
                                          }}
                                          className="w-full text-left px-3 py-1.5 hover:bg-muted transition-colors cursor-pointer font-semibold"
                                        >
                                          View details
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleAddMatch(child)}
                                          className="w-full text-left px-3 py-1.5 hover:bg-muted transition-colors cursor-pointer font-semibold"
                                        >
                                          Record fight
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setActiveMenuChildId(null);
                                            ui.setEditingFowl(child);
                                          }}
                                          className="w-full text-left px-3 py-1.5 hover:bg-muted transition-colors cursor-pointer font-semibold"
                                        >
                                          Edit chicken
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold pt-1 border-t border-border/40 gap-2 flex-wrap">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span
                                      className={
                                        isMale
                                          ? 'text-sky-600 dark:text-sky-400 font-bold'
                                          : 'text-pink-600 dark:text-pink-400 font-bold'
                                      }
                                    >
                                      {isMale ? '♂' : '♀'}
                                    </span>
                                    <span>{formatAge(child.birthdate, child.age)}</span>
                                    {isDifferentBreed && <span>· {child.breed}</span>}
                                    <WinRatePill stats={stats} />
                                    <button
                                      type="button"
                                      onClick={() => openFights(child)}
                                      className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-muted px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                                      title={`View ${child.name} fight history`}
                                    >
                                      <Swords className="w-3 h-3" />
                                      <span>Fights</span>
                                    </button>
                                  </div>
                                  <StatusPill status={child.status} />
                                </div>
                              </div>
                            );
                          };

                          return (
                            <>
                              {(() => {
                                if (pairSortBy === 'males-first') {
                                  const males = rankedPairOffspring.filter(isMaleChild);
                                  const females = rankedPairOffspring.filter((ch) => !isMaleChild(ch));
                                  return (
                                    <>
                                      {males.length > 0 && (
                                        <div className="px-2 py-1 bg-sky-500/5 border-l-2 border-sky-500 text-xs font-bold text-sky-700 dark:text-sky-400">
                                          ♂ Males ({males.length})
                                        </div>
                                      )}
                                      {males.map(renderCard)}
                                      {females.length > 0 && (
                                        <div className="px-2 py-1 bg-pink-500/5 border-l-2 border-pink-500 text-xs font-bold text-pink-700 dark:text-pink-400 mt-2">
                                          ♀ Females ({females.length})
                                        </div>
                                      )}
                                      {females.map(renderCard)}
                                    </>
                                  );
                                }
                                return rankedPairOffspring.map(renderCard);
                              })()}

                              {/* Mobile Pair Total Footer */}
                              <div
                                title="Total wins ÷ total decided matches. Draws excluded."
                                className="p-2.5 bg-muted/40 rounded-md border border-border flex items-center justify-between text-xs font-semibold gap-2"
                              >
                                <span className="text-card-foreground">
                                  Pair total · {pg.offspring.filter((ch) => cachedStats(ch.name).total > 0).length} of {pg.offspring.length} offspring have fought
                                  {pg.stats.decided > 0 ? ` · ${pg.stats.wins}W-${pg.stats.losses}L · ${pg.stats.winRate}%` : ''}
                                </span>
                                <WinRatePill stats={pg.stats} />
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Overall Parent Total Card at bottom of all pairs */}
            <div
              title="Total wins ÷ total decided matches. Draws excluded."
              className="p-3 bg-muted/50 rounded-lg border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-bold"
            >
              <span className="text-card-foreground">
                {kind === 'sire' ? 'Sire' : 'Dam'} overall total · {activeChildren.filter((ch) => cachedStats(ch.name).total > 0).length} of {activeChildren.length} offspring have fought
                {activeParentStats.decided > 0 ? ` · ${activeParentStats.wins}W-${activeParentStats.losses}L · ${activeParentStats.winRate}%` : ''}
              </span>
              <WinRatePill stats={activeParentStats} />
            </div>
          </div>
        </main>
      );
    };

    return (
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* Left Pane: on mobile hidden if mobileView === 'detail', on lg always visible */}
        <div className={`w-full lg:w-72 xl:w-80 shrink-0 ${mobileView === 'detail' ? 'hidden lg:block' : 'block'}`}>
          {renderLeftPane()}
        </div>

        {/* Right Pane: on mobile hidden if mobileView === 'list', on lg always visible */}
        <div className={`flex-1 min-w-0 w-full ${mobileView === 'list' ? 'hidden lg:block' : 'block'}`}>
          {renderRightPane()}
        </div>
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
              onChange={(e) => {
                setSearch(e.target.value);
                setIsSearchDropdownOpen(e.target.value.trim().length > 0);
              }}
              onFocus={() => {
                if (search.trim().length > 0) setIsSearchDropdownOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault();
                  setSearch('');
                  setIsSearchDropdownOpen(false);
                }
              }}
              className="w-full pl-8.5 pr-8 py-2 border border-input-border rounded-md bg-card text-card-foreground placeholder:text-muted-foreground text-xs sm:text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-semibold [&::-webkit-search-cancel-button]:appearance-none"
            />
            {search.length > 0 && (
              <button
                type="button"
                aria-label="Clear search input"
                onClick={() => {
                  setSearch('');
                  setIsSearchDropdownOpen(false);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Global Search Dropdown */}
            {isSearchDropdownOpen && matchingChickens.length > 0 && (
              <div
                role="listbox"
                aria-label="Matching chickens"
                className="absolute left-0 right-0 top-full mt-1.5 bg-card border border-border rounded-lg shadow-xl z-50 overflow-hidden divide-y divide-border/50 max-h-80 overflow-y-auto"
              >
                <div className="px-3 py-1.5 bg-muted/50 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Matching Chickens ({matchingChickens.length})
                </div>
                {matchingChickens.map((mc) => {
                  const code = mc.bird_code || birdCodes.get(String(mc.id)) || '';
                  const hasParent = Boolean(
                    (mc.sire && isKnownParent(mc.sire)) || (mc.dam && isKnownParent(mc.dam))
                  );
                  return (
                    <button
                      key={mc.id}
                      type="button"
                      onClick={() => handleSelectSearchedChicken(mc)}
                      className="w-full text-left px-3 py-2 hover:bg-emerald-500/10 dark:hover:bg-emerald-950/30 flex items-center justify-between gap-2 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {mc.image_url ? (
                          <img
                            src={mc.image_url}
                            alt=""
                            className="w-7 h-7 rounded-full object-cover shrink-0 border border-border"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-500/20">
                            {getInitials(mc.name)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            {code && (
                              <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-muted text-foreground">
                                [{formatBirdCodeForDisplay(code)}]
                              </span>
                            )}
                            <span className="font-bold text-xs text-foreground truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                              {mc.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {mc.gender === 'Female' ? '♀' : '♂'}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {mc.sire ? `Sire: ${mc.sire}` : ''}{' '}
                            {mc.dam ? `· Dam: ${mc.dam}` : ''}
                          </div>
                        </div>
                      </div>
                      {hasParent ? (
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 shrink-0 flex items-center gap-1">
                          View family <ChevronRight className="w-3 h-3" />
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground shrink-0">
                          No parents
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
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
                <label htmlFor="lineage-sort" className="text-xs font-bold text-muted-foreground whitespace-nowrap">
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
                  className="h-7 px-2 text-xs font-bold rounded border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer whitespace-nowrap"
                  title="Expand all groups"
                >
                  Expand all
                </button>
                <button
                  type="button"
                  onClick={handleCollapseAll}
                  className="h-7 px-2 text-xs font-bold rounded border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer whitespace-nowrap"
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
                matchHistory={matchHistory}
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
              <PedigreeTree
                fowls={filteredPedigreeFowls}
                codes={birdCodes}
                selectedId={selectedPedigreeId}
                onSelect={(f) => setSelectedPedigreeId(f.id)}
                onViewProfile={setSelectedFowlForDetails}
                canRegisterAncestor={true}
              />
            )}
          </section>
        )}
      </div>
    </div>
  );
}
