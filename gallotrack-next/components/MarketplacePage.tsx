'use client';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { FowlRecord, MatchRecord, PageId, ProfilingSubTab } from '@/lib/types';
import { generateBreedCompliance } from '@/lib/breed-standards';
import {
  formatBirdCodeForDisplay,
  resolveBirdCodes,
  compareBirdCodesNatural,
} from '@/lib/bird-code';
import {
  sexLabel,
  parentBreedOf,
  parentBloodlineOf,
  isMale,
  isFemale,
  formatColorDisplay,
  getAgeParts,
  autoComputeGrowthStage,
  isFoundationStock,
} from '@/lib/helpers';
import { getFowlBloodlineStats } from '@/lib/bloodline-composition';
import BloodlineBreakdown from '@/components/BloodlineBreakdown';
import { Modal, Skeleton } from '@/components/ui';
import ChickenPhoto from '@/components/ChickenPhoto';
import StatusBadge from '@/components/ui/StatusBadge';
import PageBanner from '@/components/layout/PageBanner';
import { useDebounce } from '@/lib/use-debounce';
import { HighlightText } from '@/components/ui/HighlightText';
import { cn } from '@/components/ui/utils';
import { inspectFowlMatch, compareFowlSearchRelevance, type FowlMatchResult } from '@/lib/lineage';
import {
  inventoryCounts,
  isBreedingReady,
  isActiveStatus,
  isArchivedStatus,
  isDeceasedStatus,
  roleOf,
  buildRegistryContext,
  ROLE_FILTER_OPTIONS,
  roleLabel,
  daysUntilBreedingReady,
  isBreedingReadySoon,
  isBreederStock,
  type RoleKey,
} from '@/lib/registry-roles';
import {
  Archive,
  Bird,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Copy,
  Dna,
  Egg,
  HeartCrack,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { CockIcon, HenIcon } from '@/components/icons/FowlSexIcons';
import {
  useUnitPrefs,
  weightFromStorage,
  heightFromStorage,
  weightUnitLabel,
  heightUnitLabel,
} from '@/lib/units';
import {
  getBreedingClassification,
  classifyFlock,
  isFoundationStockRecord,
  type BreedingClassification,
} from '@/lib/breeding-classification';
import { DASHBOARD_SUMMARY_GRID } from '@/lib/dashboard-kpi';
import { toast } from '@/lib/toast-bus';
import { useT, type TranslationKey } from '@/lib/i18n';
import {
  buildChickenMatchStatsMap,
  getChickenMatchStats,
  type ChickenMatchStats,
} from '@/lib/win-rate';

const INVENTORY_TABS = [
  { id: 'all', key: 'inventory.tabAll', icon: Bird },
  { id: 'active', key: 'inventory.tabActive', icon: CircleCheck },
  { id: 'breeders', key: 'inventory.tabBreeders', icon: Dna },
  { id: 'breeding', key: 'inventory.tabReady', icon: Egg },
  { id: 'archived', key: 'inventory.tabArchived', icon: Archive },
  { id: 'deceased', key: 'inventory.tabDeceased', icon: HeartCrack },
] as const;

type FilterTab = (typeof INVENTORY_TABS)[number]['id'];
const FILTER_TAB_VALUES = INVENTORY_TABS.map((tab) => tab.id) as readonly FilterTab[];

const BREEDING_TYPE_FILTERS = ['all', 'purebred', 'crossbred', 'foundation'] as const;
type BreedingTypeFilter = (typeof BREEDING_TYPE_FILTERS)[number];

const SORT_KEYS = [
  'name-asc',
  'name-desc',
  'newest',
  'oldest',
  'age',
  'weight',
  'identifier',
  'strain',
  'winrate',
] as const;
type SortKey = (typeof SORT_KEYS)[number];

const ROLE_FILTERS = ['all', 'breeding-male', 'breeding-female', 'non-breeding'] as const;
type RoleFilter = (typeof ROLE_FILTERS)[number];

const SEX_FILTERS = ['all', 'male', 'female'] as const;
type SexFilter = (typeof SEX_FILTERS)[number];

const PAGE_SIZE = 24;

type InventoryFilterState = {
  tab: FilterTab;
  role: RoleFilter;
  sex: SexFilter;
  type: BreedingTypeFilter;
  sort: SortKey;
  page: number;
};

const DEFAULT_FILTER_STATE: InventoryFilterState = {
  tab: 'all',
  role: 'all',
  sex: 'all',
  type: 'all',
  sort: 'name-asc',
  page: 1,
};

const ROLE_BY_FILTER: Record<Exclude<RoleFilter, 'all'>, RoleKey> = {
  'breeding-male': 'Breeding Male',
  'breeding-female': 'Breeding Female',
  'non-breeding': 'Non-Breeding',
};

const ROLE_TO_FILTER: Record<RoleKey, Exclude<RoleFilter, 'all'>> = {
  'Breeding Male': 'breeding-male',
  'Breeding Female': 'breeding-female',
  'Non-Breeding': 'non-breeding',
  'Sire Material': 'breeding-male',
};

const SORT_KEYS_I18N: Record<SortKey, TranslationKey> = {
  'name-asc': 'inventory.sortNameAsc',
  'name-desc': 'inventory.sortNameDesc',
  newest: 'inventory.sortNewest',
  oldest: 'inventory.sortOldest',
  age: 'inventory.sortAge',
  weight: 'inventory.sortWeight',
  identifier: 'inventory.sortIdentifier',
  strain: 'inventory.sortStrain',
  winrate: 'inventory.sortWinRate',
};

const TAB_LABEL_KEYS: Record<FilterTab, TranslationKey> = {
  all: 'inventory.tabAll',
  active: 'inventory.tabActive',
  breeders: 'inventory.tabBreeders',
  breeding: 'inventory.tabReady',
  archived: 'inventory.tabArchived',
  deceased: 'inventory.tabDeceased',
};

const SEX_LABEL_KEYS: Record<SexFilter, TranslationKey> = {
  all: 'inventory.allSexes',
  male: 'inventory.sexCock',
  female: 'inventory.sexHen',
};

const TYPE_LABEL_KEYS: Record<BreedingTypeFilter, TranslationKey> = {
  all: 'inventory.allTypes',
  purebred: 'inventory.typePurebred',
  crossbred: 'inventory.typeCrossbred',
  foundation: 'inventory.typeFoundation',
};

function parseFilterState(search: string): InventoryFilterState {
  const params = new URLSearchParams(search);
  const tabParam = params.get('tab');
  const legacyStatus = params.get('status');
  let tab: FilterTab = 'all';
  if (tabParam === 'active-breeders') tab = 'breeders';
  else if (tabParam && (FILTER_TAB_VALUES as readonly string[]).includes(tabParam)) {
    tab = tabParam as FilterTab;
  } else if (legacyStatus === 'active') {
    tab = 'breeders';
  } else if (legacyStatus && (FILTER_TAB_VALUES as readonly string[]).includes(legacyStatus)) {
    tab = legacyStatus as FilterTab;
  }

  const roleParam = params.get('role') ?? 'all';
  const role = (ROLE_FILTERS as readonly string[]).includes(roleParam)
    ? (roleParam as RoleFilter)
    : 'all';
  const sexParam = params.get('sex') ?? 'all';
  const sex = (SEX_FILTERS as readonly string[]).includes(sexParam) ? (sexParam as SexFilter) : 'all';
  const typeParam = params.get('type') ?? 'all';
  const type = (BREEDING_TYPE_FILTERS as readonly string[]).includes(typeParam)
    ? (typeParam as BreedingTypeFilter)
    : 'all';
  const sortParam = params.get('sort') ?? 'name-asc';
  const sort = (SORT_KEYS as readonly string[]).includes(sortParam)
    ? (sortParam as SortKey)
    : 'name-asc';
  const pageParam = Number(params.get('page'));
  const page = Number.isFinite(pageParam) && pageParam > 1 ? Math.floor(pageParam) : 1;

  return { tab, role, sex, type, sort, page };
}

function writeFilterState(router: ReturnType<typeof useRouter>, pathname: string, state: InventoryFilterState) {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  params.delete('status');
  const setOrDelete = (key: string, value: string, defaultValue: string) => {
    if (value === defaultValue) params.delete(key);
    else params.set(key, value);
  };
  setOrDelete('tab', state.tab, DEFAULT_FILTER_STATE.tab);
  setOrDelete('role', state.role, DEFAULT_FILTER_STATE.role);
  setOrDelete('sex', state.sex, DEFAULT_FILTER_STATE.sex);
  setOrDelete('type', state.type, DEFAULT_FILTER_STATE.type);
  setOrDelete('sort', state.sort, DEFAULT_FILTER_STATE.sort);
  setOrDelete('page', String(state.page), String(DEFAULT_FILTER_STATE.page));
  const qs = params.toString();
  router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
}

function useInventoryFilterUrl() {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<InventoryFilterState>(DEFAULT_FILTER_STATE);
  const stateRef = useRef<InventoryFilterState>(DEFAULT_FILTER_STATE);

  useEffect(() => {
    const read = () => {
      const next = parseFilterState(window.location.search);
      stateRef.current = next;
      setState(next);
    };
    read();
    window.addEventListener('popstate', read);
    return () => window.removeEventListener('popstate', read);
  }, []);

  const update = React.useCallback(
    (patch: Partial<InventoryFilterState>) => {
      const next = { ...stateRef.current, ...patch };
      stateRef.current = next;
      setState(next);
      writeFilterState(router, pathname, next);
    },
    [pathname, router],
  );

  return [state, update] as const;
}

function useInventorySearchUrl(
  search: string,
  setSearch: (value: string) => void,
) {
  const router = useRouter();
  const pathname = usePathname();
  const debouncedSearch = useDebounce(search, 250);
  const readyRef = useRef(false);

  useEffect(() => {
    const read = () => {
      const value = new URLSearchParams(window.location.search).get('q') ?? '';
      setSearch(value);
    };
    read();
    readyRef.current = true;
    window.addEventListener('popstate', read);
    return () => window.removeEventListener('popstate', read);
  }, [setSearch]);

  useEffect(() => {
    if (!readyRef.current || debouncedSearch !== search || typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const current = params.get('q') ?? '';
    if (current === debouncedSearch) return;
    if (debouncedSearch) params.set('q', debouncedSearch);
    else params.delete('q');
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [debouncedSearch, search, pathname, router]);

  return debouncedSearch;
}

function formatAge(birthdate: string | null | undefined, fallback: string): string {
  const parts = getAgeParts(birthdate);
  if (!parts) return fallback;
  if (parts.years > 0) return `${parts.years}y ${parts.months}mo`;
  if (parts.months > 0) return `${parts.months}mo`;
  return `${parts.days}d`;
}

function stageFromBirthdate(
  birthdate: string | null | undefined,
  gender: string,
  fallback: string,
): string {
  const parts = getAgeParts(birthdate);
  if (!parts) return fallback;
  return autoComputeGrowthStage(parts.totalMonths, gender) || fallback;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'GT';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function pageNumbers(current: number, total: number): (number | 'gap')[] {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  const start = Math.max(2, Math.min(current - 1, total - 4));
  const end = Math.min(total - 1, Math.max(current + 1, 5));
  const pages: (number | 'gap')[] = [1];
  if (start > 2) pages.push('gap');
  for (let page = start; page <= end; page += 1) pages.push(page);
  if (end < total - 1) pages.push('gap');
  pages.push(total);
  return pages;
}

type Props = {
  fowls: FowlRecord[];
  matchHistory: MatchRecord[];
  search?: string;
  setSearch?: (v: string) => void;
  debouncedSearch?: string;
  genderFilter?: SexFilter;
  setGenderFilter?: (v: SexFilter) => void;
  statusFilter?: FilterTab;
  setStatusFilter?: (v: FilterTab) => void;
  setCurrentPage: (v: PageId) => void;
  setProfilingSubTab: (v: ProfilingSubTab) => void;
  /** Restore an Archived (or, with canRestoreDeceased, Deceased) chicken back to Active. */
  onRestore?: (id: number) => Promise<void> | void;
  /** Deceased restore is owner-only. */
  canRestoreDeceased?: boolean;
  /** Open the full profile modal (Registry details) from a card. */
  setSelectedFowlForDetails?: (fowl: FowlRecord) => void;
  /** Show skeleton cards while the flock is still loading. */
  loading?: boolean;
};

function getWinRate(fowl: FowlRecord, statsMap: Map<string, ChickenMatchStats>) {
  return getChickenMatchStats(statsMap, fowl);
}

function getAgeDisplay(birthdate: string) {
  if (!birthdate) return 'Needs birth date';
  const b = new Date(birthdate);
  if (isNaN(b.getTime())) return 'Needs birth date';
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

function ComplianceBadge({ grade }: { grade: string }) {
  const cls = grade.startsWith('A')
    ? 'bg-emerald-500/15 text-success border-emerald-500/30'
    : grade.startsWith('B')
      ? 'bg-sky-500/15 text-info border-sky-500/30'
      : grade.startsWith('C')
        ? 'bg-amber-500/15 text-warning border-amber-500/30'
        : 'bg-muted border-border text-muted-foreground';
  return <span className={`rounded-sm border px-2 py-0.5 text-xs font-black ${cls}`}>{grade}</span>;
}

function FowlCard({
  fowl,
  fowls,
  onClick,
  code,
  query,
  parentHint,
  onOpenProfile,
  onRestore,
  classification,
}: {
  fowl: FowlRecord;
  fowls: FowlRecord[];
  onClick: () => void;
  code?: string;
  query?: string;
  parentHint?: string;
  onOpenProfile?: () => void;
  onRestore?: () => void;
  classification?: BreedingClassification;
}) {
  const { t } = useT();
  const unitPrefs = useUnitPrefs();
  const sex = sexLabel(fowl);
  const isCock = sex === 'Cock';
  const isHen = sex === 'Hen';
  const age = formatAge(fowl.birthdate, t('inventory.ageUnknown'));
  const stage = stageFromBirthdate(fowl.birthdate, fowl.gender, t('inventory.noValue'));
  const regWeight =
    fowl.structural_weight !== undefined &&
    fowl.structural_weight !== null &&
    fowl.structural_weight !== ''
      ? String(fowl.structural_weight)
      : fowl.weight || '';
  const weight = regWeight
    ? `${weightFromStorage(regWeight, unitPrefs.weightUnit)} ${weightUnitLabel(unitPrefs.weightUnit)}`
    : t('inventory.noValue');
  const strain = (fowl.breed || '').trim() || t('registry.notRegistered');
  const bloodline = classification ?? getBreedingClassification(fowl, fowls);
  const sourceMarker =
    bloodline.compositionSource === 'assumed' || bloodline.basedOnAssumed
      ? '~'
      : bloodline.compositionSource === 'declared'
        ? '✓'
        : bloodline.compositionSource === 'adjusted'
          ? '*'
          : '';
  const bloodlineTitle = `${bloodline.badgeLabel}${sourceMarker ? ` (${bloodline.sourceLabel})` : ''} — ${bloodline.tooltipText}`;
  const sireBreed = parentBreedOf(fowl.sire, fowls);
  const damBreed = parentBreedOf(fowl.dam, fowls);
  const parentDisplay = (name: string | null | undefined, breed: string) => {
    const value = (name || '').trim();
    if (!value) return t('inventory.noValue');
    if (isFoundationStock(value)) return t('inventory.foundationStock');
    return breed ? `${value} (${breed})` : value;
  };
  const lineageText = `${parentDisplay(fowl.sire, sireBreed)} × ${parentDisplay(fowl.dam, damBreed)}`;
  const inactive = isArchivedStatus(fowl) || isDeceasedStatus(fowl);
  const InactiveIcon = isDeceasedStatus(fowl) ? HeartCrack : Archive;
  const feather = fowl.feather_color || fowl.color
    ? formatColorDisplay(fowl.feather_color || fowl.color, fowl.color_category)
    : t('inventory.noValue');
  const trait = fowl.trait || fowl.behavior_trait || t('inventory.noValue');
  const nameId = `inventory-fowl-${fowl.id}-name`;

  const handleCopy = async () => {
    if (!code) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(code);
      toast({
        id: `inventory-copy-${fowl.id}`,
        title: t('inventory.codeCopied'),
        description: formatBirdCodeForDisplay(code),
        variant: 'success',
      });
    } catch {
      toast({
        id: `inventory-copy-error-${fowl.id}`,
        title: t('inventory.codeCopyFailed'),
        variant: 'danger',
      });
    }
  };

  return (
    <li className="min-w-0">
      <article
        aria-labelledby={nameId}
        className="@container border-border bg-card flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border p-4 shadow-sm transition-shadow hover:shadow-md focus-within:ring-2 focus-within:ring-focus-ring/60 sm:p-5 [overflow-wrap:anywhere]"
      >
        <div className="flex min-w-0 items-start justify-between gap-2">
          <StatusBadge status={fowl.status} />
          {code ? (
            <button
              type="button"
              aria-label={t('inventory.copyCodeOf', { name: fowl.name })}
              title={t('inventory.copyCode')}
              onClick={(event) => {
                event.stopPropagation();
                void handleCopy();
              }}
              className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-focus-ring focus-visible:ring-offset-background -m-2 inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <Copy className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>

        <div className="mt-3 flex min-w-0 items-start gap-3">
          <div className="relative shrink-0">
            <ChickenPhoto
              name={fowl.name}
              code={code}
              imageUrl={fowl.image_url}
              photoPath={fowl.photo_path}
              photoThumbPath={fowl.photo_thumb_path}
              size={96}
              shape="square"
              interactive={false}
              showLightbox={false}
              className={cn(
                'bg-muted border-border h-24 w-24 rounded-2xl border',
                inactive && 'opacity-60 grayscale',
              )}
              fallback={
                <span className="text-muted-foreground font-display text-lg font-black">
                  {initialsOf(fowl.name)}
                </span>
              }
            />
            {inactive ? (
              <span className="border-border bg-card text-muted-foreground absolute -right-1.5 -bottom-1.5 flex h-8 w-8 items-center justify-center rounded-full border shadow-sm">
                <InactiveIcon className="h-4 w-4" aria-hidden="true" />
              </span>
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-start gap-1.5">
              {isCock ? (
                <CockIcon className="text-info mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              ) : isHen ? (
                <HenIcon className="text-hen mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              ) : null}
              <h4
                id={nameId}
                className="text-card-foreground font-display min-w-0 text-[clamp(0.95rem,3.2cqi,1.125rem)] leading-snug font-black break-words"
              >
                <HighlightText text={fowl.name} query={query} />
              </h4>
            </div>
            <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-bold">
              <span>{sex === 'Unknown' ? t('inventory.noValue') : sex}</span>
              {code ? (
                <span className="border-brand/25 bg-accent-soft text-foreground rounded-full border px-2 py-0.5 font-mono text-[0.6875rem] font-black">
                  <HighlightText text={formatBirdCodeForDisplay(code)} query={query} />
                </span>
              ) : null}
              {isCock && fowl.wing_band ? (
                <span className="font-mono text-[0.6875rem] font-bold">
                  <HighlightText text={fowl.wing_band} query={query} />
                </span>
              ) : null}
            </div>
            {parentHint ? (
              <div className="border-accent-gold/25 bg-accent-gold-soft text-foreground mt-1.5 inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[0.6875rem] font-bold">
                <span className="font-semibold opacity-80">{t('inventory.matchedVia')}:</span>
                <span className="min-w-0 break-words">{parentHint}</span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-3 flex min-w-0 flex-wrap gap-1.5">
          <span
            title={strain}
            aria-label={`${t('inventory.typePurebred')}: ${strain}`}
            className="border-accent-gold/30 bg-accent-soft text-foreground max-w-full min-w-0 rounded-full border px-2.5 py-1 text-[0.6875rem] font-black break-words"
          >
            {strain}
          </span>
          <span
            title={bloodlineTitle}
            aria-label={bloodlineTitle}
            className="border-border bg-muted/60 text-foreground max-w-full min-w-0 rounded-full border px-2.5 py-1 text-[0.6875rem] font-bold break-words"
          >
            {bloodline.badgeLabel}
            {sourceMarker ? <span aria-hidden="true"> {sourceMarker}</span> : null}
          </span>
        </div>

        <p className="text-muted-foreground mt-2 min-w-0 text-xs leading-relaxed font-semibold break-words">
          <span className="text-card-foreground font-bold">{feather}</span>
          <span className="px-1.5" aria-hidden="true">·</span>
          <span className="text-card-foreground font-bold">{trait}</span>
        </p>

        <div className="mt-3 grid min-w-0 grid-cols-3 gap-1.5">
          {[
            [t('inventory.age'), age],
            [t('inventory.weight'), weight],
            [t('inventory.stage'), stage],
          ].map(([label, value]) => (
            <div key={label} className="bg-muted/55 border-border/60 min-w-0 rounded-xl border px-1.5 py-2 text-center">
              <p className="text-muted-foreground text-[clamp(0.58rem,1.8cqi,0.6875rem)] font-black tracking-wide uppercase">{label}</p>
              <p className="text-card-foreground mt-0.5 text-[clamp(0.65rem,2cqi,0.75rem)] leading-tight font-black break-words">{value}</p>
            </div>
          ))}
        </div>

        <div className="border-border/60 mt-3 min-w-0 border-t pt-2.5">
          <p className="text-muted-foreground text-[clamp(0.58rem,1.8cqi,0.6875rem)] font-black tracking-wide uppercase">
            {t('inventory.lineage')}
          </p>
          <p className="text-card-foreground mt-0.5 min-w-0 text-xs leading-relaxed font-semibold break-words" title={lineageText}>
            {lineageText}
          </p>
        </div>

        <div className="border-border/60 mt-auto flex min-w-0 flex-wrap items-center justify-between gap-2 border-t pt-3">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              if (onOpenProfile) onOpenProfile();
              else onClick();
            }}
            className="text-brand focus-visible:ring-focus-ring focus-visible:ring-offset-background inline-flex min-h-11 items-center gap-1 rounded-md text-xs font-black underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            {t('inventory.fullProfile')} <span aria-hidden="true">→</span>
          </button>
          {onRestore ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onRestore();
              }}
              className="border-border bg-muted/60 text-foreground hover:bg-muted focus-visible:ring-focus-ring focus-visible:ring-offset-background inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 text-[0.6875rem] font-black focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              {t('inventory.restoreToActive')}
            </button>
          ) : null}
        </div>
      </article>
    </li>
  );
}
function FowlDetailModal({
  fowl,
  statsMap,
  onClose,
  fowls,
  code,
}: {
  fowl: FowlRecord;
  statsMap: Map<string, ChickenMatchStats>;
  onClose: () => void;
  fowls: FowlRecord[];
  code?: string;
}) {
  const unitPrefs = useUnitPrefs();
  const stats = getWinRate(fowl, statsMap);
  const isDamRecord = isFemale(fowl.gender) || fowl.registry_role === 'Breeding Female';
  const modalWeight =
    fowl.structural_weight !== undefined &&
    fowl.structural_weight !== null &&
    fowl.structural_weight !== ''
      ? String(fowl.structural_weight)
      : fowl.weight || '';
  const modalHeight =
    fowl.structural_height !== undefined &&
    fowl.structural_height !== null &&
    fowl.structural_height !== ''
      ? String(fowl.structural_height)
      : fowl.height || '';
  const compliance = useMemo(
    () =>
      generateBreedCompliance(
        fowl.breed,
        modalWeight,
        modalHeight,
        fowl.leg_color,
        fowl.color_category,
        fowl.gender,
        fowl.registry_role,
      ),
    [
      fowl.breed,
      modalWeight,
      modalHeight,
      fowl.leg_color,
      fowl.color_category,
      fowl.gender,
      fowl.registry_role,
    ],
  );
  const readyInDays = isBreedingReadySoon(fowl) ? daysUntilBreedingReady(fowl) : null;

  return (
    <Modal open onClose={onClose} title={fowl.name} className="max-w-lg">
      {code ? (
        <span className="text-success self-start rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-mono text-xs font-semibold uppercase">
          {formatBirdCodeForDisplay(code)}
        </span>
      ) : null}

      <div className="space-y-5">
        {/* Identity */}
        <div className="flex items-center gap-4">
          <ChickenPhoto
            name={fowl.name}
            code={code}
            imageUrl={fowl.image_url}
            photoPath={fowl.photo_path}
            photoThumbPath={fowl.photo_thumb_path}
            size={80}
            className="h-20 w-20 rounded-lg border-border shadow-inner"
            fallback={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-muted-foreground/50"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            }
          />
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <StatusBadge status={fowl.status} />
              {readyInDays !== null && (
                <span className="rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-xs font-black tracking-wider text-amber-700 uppercase dark:text-amber-400">
                  Ready in {readyInDays} {readyInDays === 1 ? 'day' : 'days'}
                </span>
              )}
              {compliance.matchedStandard && <ComplianceBadge grade={compliance.complianceGrade} />}
            </div>
            <p className="text-muted-foreground text-sm font-semibold">
              {sexLabel(fowl)} {'\u00B7'} {getAgeDisplay(fowl.birthdate)} {'\u00B7'}{' '}
              {fowl.growth_stage}
            </p>
            <p className="text-success text-sm font-bold">{fowl.breed}</p>
          </div>
        </div>

        {/* Physical traits */}
        <div className="bg-muted/50 border-border space-y-3 rounded-lg border p-4">
          <h4 className="text-muted-foreground text-xs font-black tracking-widest uppercase">
            Physical Profile
          </h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground font-semibold">Feather Color: </span>
              <span className="text-card-foreground font-black">
                {formatColorDisplay(fowl.feather_color || fowl.color, fowl.color_category)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground font-semibold">Eye: </span>
              <span className="text-card-foreground font-black">
                {fowl.eye_variant || '\u2014'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground font-semibold">Leg: </span>
              <span className="text-card-foreground font-black">{fowl.leg_color || '\u2014'}</span>
            </div>
            <div>
              <span className="text-muted-foreground font-semibold">Trait: </span>
              <span className="text-success font-black">
                {fowl.trait || fowl.behavior_trait || '\u2014'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground font-semibold">Weight: </span>
              <span className="text-card-foreground font-black">
                {modalWeight
                  ? `${weightFromStorage(modalWeight, unitPrefs.weightUnit)} ${weightUnitLabel(unitPrefs.weightUnit)}`
                  : '\u2014'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground font-semibold">Height: </span>
              <span className="text-card-foreground font-black">
                {modalHeight
                  ? `${heightFromStorage(modalHeight, unitPrefs.heightUnit)} ${heightUnitLabel(unitPrefs.heightUnit)}`
                  : '\u2014'}
              </span>
            </div>
          </div>
        </div>

        {/* Lineage */}
        <div className="bg-muted/50 border-border space-y-3 rounded-lg border p-4">
          <h4 className="text-muted-foreground text-xs font-black tracking-widest uppercase">
            Lineage
          </h4>
          <BloodlineBreakdown
            stats={getFowlBloodlineStats(fowl, fowls)}
            title="Bloodline Percentage"
            subtitle="Blood split per breed — 50% Sire, 50% Dam"
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md border border-sky-500/30 bg-sky-500/10 p-3">
              <p className="text-info text-xs font-black uppercase">Sire</p>
              <p className="text-card-foreground mt-1 text-sm font-black">
                {fowl.sire || '\u2014'}
              </p>
              {parentBreedOf(fowl.sire, fowls) && (
                <p className="text-muted-foreground text-xs font-bold">
                  {parentBreedOf(fowl.sire, fowls)}
                </p>
              )}
              {(() => {
                const s = parentBloodlineOf(fowl.sire, fowls);
                return s ? (
                  <p className="text-info text-xs font-bold">
                    {s.specificPct}% {s.dominant.strain}
                  </p>
                ) : null;
              })()}
            </div>
            <div className="rounded-md border border-pink-500/30 bg-pink-500/10 p-3">
              <p className="text-pink text-xs font-black uppercase">Dam</p>
              <p className="text-card-foreground mt-1 text-sm font-black">{fowl.dam || '\u2014'}</p>
              {parentBreedOf(fowl.dam, fowls) && (
                <p className="text-muted-foreground text-xs font-bold">
                  {parentBreedOf(fowl.dam, fowls)}
                </p>
              )}
              {(() => {
                const s = parentBloodlineOf(fowl.dam, fowls);
                return s ? (
                  <p className="text-pink text-xs font-bold">
                    {s.specificPct}% {s.dominant.strain}
                  </p>
                ) : null;
              })()}
            </div>
          </div>
        </div>

        {/* Performance */}
        {stats.total > 0 && (
          <div className="bg-muted/50 border-border space-y-3 rounded-lg border p-4">
            <h4 className="text-muted-foreground text-xs font-black tracking-widest uppercase">
              Match Performance
            </h4>
            <div className={`${DASHBOARD_SUMMARY_GRID} text-center`}>
              <div className="min-w-0 rounded-md border border-border bg-card py-2.5">
                <p className="break-words text-xl font-black text-card-foreground">{isDamRecord ? '—' : stats.total}</p>
                <p className="break-words text-xs font-bold uppercase text-muted-foreground">Total</p>
              </div>
              <div className="min-w-0 rounded-md border border-emerald-500/30 bg-emerald-500/10 py-2.5">
                <p className="break-words text-xl font-black text-success">{isDamRecord ? '—' : stats.wins}</p>
                <p className="break-words text-xs font-bold uppercase text-success">Wins</p>
              </div>
              <div className="min-w-0 rounded-md border border-rose-500/30 bg-rose-500/10 py-2.5">
                <p className="break-words text-xl font-black text-danger">{isDamRecord ? '—' : stats.losses}</p>
                <p className="break-words text-xs font-bold uppercase text-danger">Losses</p>
              </div>
              <div
                className={`min-w-0 rounded-md border py-2.5 ${(stats.winRate ?? 0) >= 50 ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-rose-500/30 bg-rose-500/10'}`}
              >
                <p
                  className={`break-words text-xl font-black ${(stats.winRate ?? 0) >= 50 ? 'text-success' : 'text-danger'}`}
                >
                  {isDamRecord ? '—' : stats.winRate === null ? '—%' : `${stats.winRate}%`}
                </p>
                <p
                  className={`break-words text-xs font-bold uppercase ${(stats.winRate ?? 0) >= 50 ? 'text-success' : 'text-danger'}`}
                >
                  Win Rate
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Breed Compliance */}
        {compliance.matchedStandard && (
          <div className="space-y-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-success text-xs font-black tracking-widest uppercase">
                Breed Compliance
              </h4>
              <div className="flex items-center gap-2">
                <ComplianceBadge grade={compliance.complianceGrade} />
                <span className="text-success text-xs font-black">
                  {compliance.overallScore}/100
                </span>
              </div>
            </div>
            <p className="text-muted-foreground text-xs font-semibold">
              Standard: {compliance.matchedStandard.name} ({compliance.matchedStandard.origin})
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground font-semibold">Weight: </span>
                <span
                  className={
                    compliance.weightCompliance.status === 'within'
                      ? 'text-success font-black'
                      : 'text-warning font-black'
                  }
                >
                  {compliance.weightCompliance.actual}kg ({compliance.weightCompliance.status})
                </span>
              </div>
              <div>
                <span className="text-muted-foreground font-semibold">Height: </span>
                <span
                  className={
                    compliance.heightCompliance.status === 'within'
                      ? 'text-success font-black'
                      : 'text-warning font-black'
                  }
                >
                  {compliance.heightCompliance.actual}cm ({compliance.heightCompliance.status})
                </span>
              </div>
              <div>
                <span className="text-muted-foreground font-semibold">Legs: </span>
                <span
                  className={
                    compliance.legColorCompliance.status === 'matches'
                      ? 'text-success font-black'
                      : 'text-warning font-black'
                  }
                >
                  {compliance.legColorCompliance.actual}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground font-semibold">Plumage: </span>
                <span
                  className={
                    compliance.plumageCompliance.status === 'matches'
                      ? 'text-success font-black'
                      : 'text-warning font-black'
                  }
                >
                  {compliance.plumageCompliance.actual}
                </span>
              </div>
            </div>
            {!isDamRecord && compliance.matchedStandard.fightingStyle && (
              <p className="text-success/70 text-xs font-semibold">
                Fighting style: {compliance.matchedStandard.fightingStyle}
              </p>
            )}
            {compliance.recommendations.length > 0 && (
              <div className="space-y-1">
                {compliance.recommendations.map((r, i) => (
                  <p key={i} className="text-warning text-xs">
                    {'\uD83D\uDCA1'} {r}
                  </p>
                ))}
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
  onRestore,
  canRestoreDeceased = false,
  setSelectedFowlForDetails,
  setCurrentPage,
  setProfilingSubTab,
  loading = false,
}: Props) {
  const { t } = useT();
  const [internalSearch, setInternalSearch] = useState('');
  const search = propSearch !== undefined ? propSearch : internalSearch;
  const setSearch = propSetSearch ?? setInternalSearch;
  const [filterState, updateFilters] = useInventoryFilterUrl();
  const debouncedQuery = useInventorySearchUrl(search, setSearch);
  const [includeParents, setIncludeParents] = useState(false);
  const [selectedFowl, setSelectedFowl] = useState<FowlRecord | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<FowlRecord | null>(null);
  const [restoring, setRestoring] = useState(false);
  const tabRefs = useRef<Map<FilterTab, HTMLButtonElement>>(new Map());
  const tabStripRef = useRef<HTMLDivElement | null>(null);

  const registryCtx = useMemo(() => buildRegistryContext(fowls), [fowls]);
  const counts = useMemo(() => inventoryCounts(fowls, registryCtx), [fowls, registryCtx]);
  const classificationMap = useMemo(() => classifyFlock(fowls), [fowls]);
  const countsByTab = useMemo<Record<FilterTab, number>>(
    () => ({
      all: counts.all,
      active: counts.active,
      breeders: counts.breedersStock,
      breeding: counts.breedingReady,
      archived: counts.archived,
      deceased: counts.deceased,
    }),
    [counts],
  );
  const tabs = useMemo(
    () =>
      INVENTORY_TABS.map((tab) => ({
        ...tab,
        label: t(TAB_LABEL_KEYS[tab.id]),
        count: countsByTab[tab.id],
      })),
    [countsByTab, t],
  );

  useEffect(() => {
    const node = tabRefs.current.get(filterState.tab);
    if (!node || typeof node.scrollIntoView !== 'function') return;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    node.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [filterState.tab]);

  const selectTab = (tab: FilterTab) => updateFilters({ tab, page: 1 });
  const handleTabKeyDown = (event: React.KeyboardEvent, index: number) => {
    let targetIndex = -1;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      targetIndex = (index + 1) % tabs.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      targetIndex = (index - 1 + tabs.length) % tabs.length;
    } else if (event.key === 'Home') {
      event.preventDefault();
      targetIndex = 0;
    } else if (event.key === 'End') {
      event.preventDefault();
      targetIndex = tabs.length - 1;
    }
    if (targetIndex >= 0) {
      const nextTab = tabs[targetIndex];
      selectTab(nextTab.id);
      tabRefs.current.get(nextTab.id)?.focus();
    }
  };

  const birdCodes = useMemo(() => resolveBirdCodes(fowls), [fowls]);
  const matchStatsMap = useMemo(
    () => buildChickenMatchStatsMap(matchHistory, fowls),
    [matchHistory, fowls],
  );

  const { filteredFowls, matchMap } = useMemo(() => {
    let pool = fowls;
    if (filterState.tab === 'active') pool = pool.filter(isActiveStatus);
    else if (filterState.tab === 'breeders') pool = pool.filter((f) => isBreederStock(f, registryCtx));
    else if (filterState.tab === 'breeding') pool = pool.filter((f) => isBreedingReady(f, registryCtx));
    else if (filterState.tab === 'archived') pool = pool.filter(isArchivedStatus);
    else if (filterState.tab === 'deceased') pool = pool.filter(isDeceasedStatus);

    if (filterState.role !== 'all') {
      const role = ROLE_BY_FILTER[filterState.role];
      pool = pool.filter((f) => roleOf(f, registryCtx) === role);
    }
    if (filterState.sex === 'male') pool = pool.filter((f) => isMale(f.gender));
    else if (filterState.sex === 'female') pool = pool.filter((f) => isFemale(f.gender));

    if (filterState.type !== 'all') {
      pool = pool.filter((f) => {
        if (filterState.type === 'foundation') return isFoundationStockRecord(f);
        const classification = classificationMap.get(String(f.id)) ?? getBreedingClassification(f, fowls);
        if (filterState.type === 'purebred') {
          return classification.type === 'Purebred' && !isFoundationStockRecord(f);
        }
        if (filterState.type === 'crossbred') return classification.type === 'Crossbred';
        return false;
      });
    }

    const matches = new Map<number, FowlMatchResult>();
    let result: FowlRecord[] = [];
    if (debouncedQuery.trim()) {
      for (const fowl of pool) {
        const searchable = isMale(fowl.gender) ? fowl : { ...fowl, wing_band: '' };
        const code = birdCodes.get(String(fowl.id)) || null;
        const match = inspectFowlMatch(searchable, debouncedQuery, code, { includeParents });
        if (match.matched) {
          matches.set(fowl.id, match);
          result.push(fowl);
        }
      }
    } else {
      result = [...pool];
    }

    const createdTime = (fowl: FowlRecord) => {
      const value = Date.parse(fowl.created_at || '');
      return Number.isFinite(value) ? value : null;
    };

    result.sort((a, b) => {
      if (debouncedQuery.trim()) {
        const matchA = matches.get(a.id);
        const matchB = matches.get(b.id);
        if (matchA && matchB) {
          const relevance = compareFowlSearchRelevance(matchA, matchB);
          if (relevance !== 0) return relevance;
        }
      }
      if (filterState.sort === 'name-asc') return a.name.localeCompare(b.name);
      if (filterState.sort === 'name-desc') return b.name.localeCompare(a.name);
      if (filterState.sort === 'identifier') {
        const resultCode = compareBirdCodesNatural(
          birdCodes.get(String(a.id)) || '',
          birdCodes.get(String(b.id)) || '',
        );
        return resultCode !== 0 ? resultCode : a.id - b.id;
      }
      if (filterState.sort === 'age') return getAgeDays(a.birthdate) - getAgeDays(b.birthdate);
      if (filterState.sort === 'strain') return (a.breed || '').localeCompare(b.breed || '');
      if (filterState.sort === 'weight') {
        const weightOf = (fowl: FowlRecord) => Number(fowl.structural_weight ?? fowl.weight) || 0;
        return weightOf(a) - weightOf(b);
      }
      if (filterState.sort === 'winrate') {
        const rateA = getWinRate(a, matchStatsMap);
        const rateB = getWinRate(b, matchStatsMap);
        return (rateB.winRate ?? -1) - (rateA.winRate ?? -1);
      }
      if (filterState.sort === 'newest' || filterState.sort === 'oldest') {
        const timeA = createdTime(a);
        const timeB = createdTime(b);
        if (timeA !== null && timeB !== null && timeA !== timeB) {
          return filterState.sort === 'newest' ? timeB - timeA : timeA - timeB;
        }
        return filterState.sort === 'newest' ? b.id - a.id : a.id - b.id;
      }
      return 0;
    });

    return { filteredFowls: result, matchMap: matches };
  }, [
    fowls,
    debouncedQuery,
    includeParents,
    filterState.tab,
    filterState.role,
    filterState.sex,
    filterState.type,
    filterState.sort,
    classificationMap,
    registryCtx,
    matchStatsMap,
    birdCodes,
  ]);

  const pageCount = Math.max(1, Math.ceil(filteredFowls.length / PAGE_SIZE));
  const currentPage = Math.min(filterState.page, pageCount);
  const pagedFowls = filteredFowls.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const shownTotal = Math.min(currentPage * PAGE_SIZE, filteredFowls.length);

  useEffect(() => {
    if (!loading && fowls.length > 0 && filterState.page !== currentPage) {
      updateFilters({ page: currentPage });
    }
  }, [currentPage, filterState.page, fowls.length, loading, updateFilters]);

  const hasActiveFilters =
    Boolean(search.trim()) ||
    filterState.tab !== DEFAULT_FILTER_STATE.tab ||
    filterState.role !== DEFAULT_FILTER_STATE.role ||
    filterState.sex !== DEFAULT_FILTER_STATE.sex ||
    filterState.type !== DEFAULT_FILTER_STATE.type ||
    filterState.sort !== DEFAULT_FILTER_STATE.sort ||
    includeParents;

  const activeFilterLabels: string[] = [];
  if (search.trim()) activeFilterLabels.push(`"${search.trim()}"`);
  if (filterState.tab !== 'all') activeFilterLabels.push(t(TAB_LABEL_KEYS[filterState.tab]));
  if (filterState.role !== 'all') activeFilterLabels.push(roleLabel(ROLE_BY_FILTER[filterState.role]));
  if (filterState.sex !== 'all') activeFilterLabels.push(t(SEX_LABEL_KEYS[filterState.sex]));
  if (filterState.type !== 'all') activeFilterLabels.push(t(TYPE_LABEL_KEYS[filterState.type]));
  if (filterState.sort !== DEFAULT_FILTER_STATE.sort) {
    activeFilterLabels.push(t(SORT_KEYS_I18N[filterState.sort]));
  }
  if (includeParents) activeFilterLabels.push(t('inventory.includeParents'));

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (filterState.page !== 1) updateFilters({ page: 1 });
  };
  const clearFilters = () => {
    setSearch('');
    setIncludeParents(false);
    updateFilters({ ...DEFAULT_FILTER_STATE });
  };
  const confirmRestore = async () => {
    if (!restoreTarget || !onRestore) return;
    setRestoring(true);
    try {
      await onRestore(restoreTarget.id);
      setRestoreTarget(null);
    } finally {
      setRestoring(false);
    }
  };

  const selectClass =
    'border-border bg-card text-foreground focus-visible:border-brand focus-visible:ring-focus-ring/40 h-11 min-h-11 w-full max-w-full min-w-0 cursor-pointer rounded-xl border px-3 text-xs font-bold md:w-auto transition-colors focus-visible:ring-2 focus-visible:outline-none';

  return (
    <div className="animate-fadeIn min-w-0 space-y-5">
      <PageBanner
        icon={Bird}
        title={t('inventory.title')}
        subtitle={t('inventory.subtitle')}
        imageSrc="/images/hero-farm.jpg"
        iconTone="brand"
      >
        <div className="border-border bg-card mt-4 rounded-xl border p-3 shadow-sm">
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2">
                <Search className="h-4 w-4" aria-hidden="true" />
              </span>
              <input
                type="search"
                aria-label={t('inventory.searchLabel')}
                placeholder={t('inventory.searchPlaceholder')}
                value={search}
                onChange={(event) => handleSearchChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    event.preventDefault();
                    handleSearchChange('');
                  }
                }}
                className="border-border bg-card text-card-foreground placeholder:text-muted-foreground focus-visible:border-brand focus-visible:ring-focus-ring/40 h-11 w-full rounded-xl border py-2 pr-11 pl-10 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none [&::-webkit-search-cancel-button]:appearance-none"
              />
              {search.length > 0 ? (
                <button
                  type="button"
                  aria-label={t('inventory.clearSearch')}
                  onClick={() => handleSearchChange('')}
                  className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-focus-ring focus-visible:ring-offset-background absolute top-1/2 right-1.5 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : null}
            </div>
            <label className="text-foreground hover:bg-muted/50 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-2 text-xs font-bold select-none">
              <input
                type="checkbox"
                checked={includeParents}
                onChange={(event) => {
                  setIncludeParents(event.target.checked);
                  if (filterState.page !== 1) updateFilters({ page: 1 });
                }}
                className="border-border accent-brand h-4 w-4 cursor-pointer rounded"
              />
              <span>{t('inventory.includeParents')}</span>
            </label>
            <span
              role="status"
              aria-live="polite"
              className="text-muted-foreground shrink-0 px-1 text-xs font-bold"
            >
              {t('inventory.resultsCount', { count: filteredFowls.length })}
            </span>
          </div>
        </div>
      </PageBanner>

      <div className="relative min-w-0">
        <div
          ref={tabStripRef}
          role="tablist"
          aria-label={t('inventory.tabLabel')}
          data-testid="inventory-tabs-container"
          className="flex min-w-0 gap-2 overflow-x-auto px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {tabs.map((tab, index) => {
            const Icon = tab.icon;
            const selected = filterState.tab === tab.id;
            return (
              <button
                key={tab.id}
                ref={(element) => {
                  if (element) tabRefs.current.set(tab.id, element);
                  else tabRefs.current.delete(tab.id);
                }}
                type="button"
                role="tab"
                id={`inventory-tab-${tab.id}`}
                aria-selected={selected}
                aria-label={`${tab.label}, ${tab.count}`}
                aria-controls="inventory-tabpanel"
                tabIndex={selected ? 0 : -1}
                onClick={() => selectTab(tab.id)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
                className={cn(
                  'focus-visible:ring-focus-ring focus-visible:ring-offset-background inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-black whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
                  selected
                    ? 'border-brand bg-brand text-brand-foreground shadow-sm'
                    : 'border-border bg-card text-foreground hover:bg-muted',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{tab.label}</span>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[0.6875rem] font-black',
                    selected
                      ? 'bg-brand-foreground/20 text-brand-foreground'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
        <span aria-hidden="true" className="from-background pointer-events-none absolute inset-y-0 left-0 w-5 bg-gradient-to-r to-transparent" />
        <span aria-hidden="true" className="from-background pointer-events-none absolute inset-y-0 right-0 w-5 bg-gradient-to-l to-transparent" />
      </div>

      <div
        data-testid="inventory-filters-row"
        className="border-border bg-card flex min-w-0 flex-col gap-2.5 rounded-xl border p-3 shadow-sm md:flex-row md:flex-wrap md:items-end"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:min-w-40 sm:flex-row sm:items-center">
          <label htmlFor="inventory-role" className="text-muted-foreground shrink-0 text-xs font-bold">
            {t('inventory.filterRole')}
          </label>
          <select
            id="inventory-role"
            value={filterState.role}
            onChange={(event) => updateFilters({ role: event.target.value as RoleFilter, page: 1 })}
            className={selectClass}
          >
            <option value="all">{t('inventory.allRoles')}</option>
            {ROLE_FILTER_OPTIONS.map((role) => (
              <option key={role} value={ROLE_TO_FILTER[role]}>
                {roleLabel(role)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:min-w-36 sm:flex-row sm:items-center">
          <label htmlFor="inventory-sex" className="text-muted-foreground shrink-0 text-xs font-bold">
            {t('inventory.filterSex')}
          </label>
          <select
            id="inventory-sex"
            aria-label={t('inventory.filterSex')}
            value={filterState.sex}
            onChange={(event) => updateFilters({ sex: event.target.value as SexFilter, page: 1 })}
            className={selectClass}
          >
            <option value="all">{t('inventory.allSexes')}</option>
            <option value="male">{t('inventory.sexCock')}</option>
            <option value="female">{t('inventory.sexHen')}</option>
          </select>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:min-w-60 sm:flex-row sm:items-center">
          <label htmlFor="inventory-type" className="text-muted-foreground shrink-0 text-xs font-bold">
            {t('inventory.filterType')}
          </label>
          <select
            id="inventory-type"
            aria-label={t('inventory.filterType')}
            value={filterState.type}
            onChange={(event) => updateFilters({ type: event.target.value as BreedingTypeFilter, page: 1 })}
            className={selectClass}
          >
            <option value="all">{t('inventory.allTypes')}</option>
            <option value="purebred">{t('inventory.typePurebred')}</option>
            <option value="crossbred">{t('inventory.typeCrossbred')}</option>
            <option value="foundation">{t('inventory.typeFoundation')}</option>
          </select>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:min-w-60 sm:flex-row sm:items-center">
          <label htmlFor="inventory-sort" className="text-muted-foreground shrink-0 text-xs font-bold">
            {t('inventory.filterSort')}
          </label>
          <select
            id="inventory-sort"
            value={filterState.sort}
            onChange={(event) => updateFilters({ sort: event.target.value as SortKey, page: 1 })}
            className={selectClass}
          >
            {SORT_KEYS.map((sort) => (
              <option key={sort} value={sort}>
                {t(SORT_KEYS_I18N[sort])}
              </option>
            ))}
          </select>
        </div>


      </div>

      {hasActiveFilters ? (
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-xs font-black uppercase tracking-wide">
            {t('inventory.activeFilters')}:
          </span>
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            {activeFilterLabels.map((label, index) => (
              <span
                key={`${label}-${index}`}
                className="border-accent-gold/30 bg-accent-soft text-foreground max-w-full min-w-0 rounded-full border px-2.5 py-1 text-[0.6875rem] font-bold break-words"
              >
                {label}
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={clearFilters}
            className="border-border bg-card text-foreground hover:bg-muted focus-visible:ring-focus-ring focus-visible:ring-offset-background inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-black transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
            {t('inventory.clearFilters')}
          </button>
        </div>
      ) : null}

      <div
        id="inventory-tabpanel"
        role="tabpanel"
        aria-labelledby={`inventory-tab-${filterState.tab}`}
        aria-busy={loading}
      >
        {loading ? (
          <div>
            <p role="status" className="sr-only">{t('inventory.loading')}</p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="border-border bg-card h-full min-h-80 rounded-2xl border p-5 shadow-sm">
                  <Skeleton className="h-5 w-24 rounded-full" />
                  <div className="mt-4 flex gap-3">
                    <Skeleton className="h-24 w-24 shrink-0 rounded-2xl" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  </div>
                  <Skeleton className="mt-4 h-16 w-full rounded-xl" />
                  <Skeleton className="mt-3 h-4 w-2/3" />
                </div>
              ))}
            </div>
          </div>
        ) : pagedFowls.length === 0 ? (
          <div className="border-border bg-card mx-auto my-6 max-w-xl rounded-2xl border p-8 text-center shadow-sm sm:p-12">
            <div className="bg-accent-soft text-primary mx-auto flex h-14 w-14 items-center justify-center rounded-full">
              <Bird className="h-6 w-6" aria-hidden="true" />
            </div>
            <h2 className="text-foreground mt-4 text-lg font-black">
              {fowls.length === 0 && !hasActiveFilters
                ? t('inventory.emptyTitle')
                : t('inventory.noResultsTitle')}
            </h2>
            <p className="text-muted-foreground mx-auto mt-1.5 max-w-md text-sm font-semibold">
              {fowls.length === 0 && !hasActiveFilters
                ? t('inventory.emptyBody')
                : t('inventory.noResultsBody')}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {fowls.length === 0 && !hasActiveFilters ? (
                <button
                  type="button"
                  onClick={() => {
                    setCurrentPage('profiling');
                    setProfilingSubTab('form');
                  }}
                  className="bg-brand text-brand-foreground hover:bg-brand-strong focus-visible:ring-focus-ring focus-visible:ring-offset-background inline-flex min-h-11 items-center rounded-full px-4 text-xs font-black transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  {t('inventory.registerChicken')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="bg-brand text-brand-foreground hover:bg-brand-strong focus-visible:ring-focus-ring focus-visible:ring-offset-background inline-flex min-h-11 items-center rounded-full px-4 text-xs font-black transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  {t('inventory.clearFilters')}
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="text-muted-foreground mb-3 flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
              <span>{t('inventory.showing', { shown: shownTotal, total: filteredFowls.length })}</span>
              <span>{t('common.page')} {currentPage} {t('common.of')} {pageCount}</span>
            </div>
            <ul className="grid min-w-0 grid-cols-1 items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
              {pagedFowls.map((fowl) => {
                const match = matchMap.get(fowl.id);
                const parentHint =
                  match?.reason === 'sire' || match?.reason === 'dam' ? match.parentHint : undefined;
                const restorable =
                  Boolean(onRestore) &&
                  (isArchivedStatus(fowl) || (isDeceasedStatus(fowl) && canRestoreDeceased));
                return (
                  <FowlCard
                    key={fowl.id}
                    fowl={fowl}
                    fowls={fowls}
                    onClick={() => setSelectedFowl(fowl)}
                    code={birdCodes.get(String(fowl.id))}
                    query={debouncedQuery}
                    parentHint={parentHint}
                    onOpenProfile={
                      setSelectedFowlForDetails ? () => setSelectedFowlForDetails(fowl) : undefined
                    }
                    onRestore={restorable ? () => setRestoreTarget(fowl) : undefined}
                    classification={classificationMap.get(String(fowl.id))}
                  />
                );
              })}
            </ul>
            {pageCount > 1 ? (
              <nav aria-label={t('inventory.pagination')} className="mt-5 flex flex-wrap items-center justify-center gap-1.5">
                <button
                  type="button"
                  onClick={() => updateFilters({ page: Math.max(1, currentPage - 1) })}
                  disabled={currentPage <= 1}
                  aria-label={t('inventory.previousPage')}
                  className="border-border bg-card text-foreground hover:bg-muted focus-visible:ring-focus-ring focus-visible:ring-offset-background inline-flex h-11 min-w-11 items-center justify-center rounded-xl border px-2 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                {pageNumbers(currentPage, pageCount).map((page, index) =>
                  page === 'gap' ? (
                    <span key={`gap-${index}`} aria-hidden="true" className="text-muted-foreground px-1 text-sm">
                      …
                    </span>
                  ) : (
                    <button
                      key={page}
                      type="button"
                      onClick={() => updateFilters({ page })}
                      aria-label={t('inventory.pageNumber', { page })}
                      aria-current={page === currentPage ? 'page' : undefined}
                      className={cn(
                        'focus-visible:ring-focus-ring focus-visible:ring-offset-background inline-flex h-11 min-w-11 items-center justify-center rounded-xl border px-2 text-xs font-black transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
                        page === currentPage
                          ? 'border-brand bg-brand text-brand-foreground'
                          : 'border-border bg-card text-foreground hover:bg-muted',
                      )}
                    >
                      {page}
                    </button>
                  ),
                )}
                <button
                  type="button"
                  onClick={() => updateFilters({ page: Math.min(pageCount, currentPage + 1) })}
                  disabled={currentPage >= pageCount}
                  aria-label={t('inventory.nextPage')}
                  className="border-border bg-card text-foreground hover:bg-muted focus-visible:ring-focus-ring focus-visible:ring-offset-background inline-flex h-11 min-w-11 items-center justify-center rounded-xl border px-2 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </nav>
            ) : null}
          </>
        )}
      </div>

      {selectedFowl ? (
        <FowlDetailModal
          fowl={selectedFowl}
          statsMap={matchStatsMap}
          fowls={fowls}
          code={birdCodes.get(String(selectedFowl.id))}
          onClose={() => setSelectedFowl(null)}
        />
      ) : null}

      {restoreTarget ? (
        <Modal
          open
          onClose={() => {
            if (!restoring) setRestoreTarget(null);
          }}
          title={t('inventory.restoreTitle')}
          className="max-w-md"
        >
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">
              {t('inventory.restoreBody', { name: restoreTarget.name })}
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={restoring}
                onClick={() => setRestoreTarget(null)}
                className="bg-muted text-foreground hover:bg-muted/80 focus-visible:ring-focus-ring focus-visible:ring-offset-background inline-flex min-h-11 items-center rounded-md px-4 text-xs font-bold transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-60"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                disabled={restoring}
                onClick={() => {
                  void confirmRestore();
                }}
                className="bg-brand text-brand-foreground hover:bg-brand-strong focus-visible:ring-focus-ring focus-visible:ring-offset-background inline-flex min-h-11 items-center gap-1.5 rounded-md px-4 text-xs font-bold shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-60"
              >
                {restoring ? t('inventory.restoring') : t('inventory.restoreToActive')}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}