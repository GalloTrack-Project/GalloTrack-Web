'use client';
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import type { FowlRecord, MatchRecord, SiblingRelation, ProfilingSubTab } from '@/lib/types';
import {
  getAgeParts,
  getAgeLabel,
  generationOf,
  generationInfo,
  getSiblingRelations,
  formatColorDisplay,
  GROWTH_STAGE_VALUES,
} from '@/lib/helpers';
import Pagination from '@/components/Pagination';
import { birdCodeOf, formatBirdCodeForDisplay, resolveBirdCodes, normalizeBirdCode } from '@/lib/bird-code';
import { inspectFowlMatch, compareFowlSearchRelevance } from '@/lib/lineage';
import { useDebounce } from '@/lib/use-debounce';
import { HighlightText } from '@/components/ui/HighlightText';
import RegistryFilterBar, { type ParentOption } from './RegistryFilterBar';
import {
  getBreedingClassification,
  classifyFlock,
  matchesBreedingTypeFilter,
  matchesBreedFilter,
  type BreedingClassification as GeneticClassification,
} from '@/lib/breeding-classification';
import BreedingTypeBadge from '@/components/BreedingTypeBadge';
import { getOffspringParentageRelatedness } from '@/lib/relatedness-classification';
import RelatednessBadge from '@/components/RelatednessBadge';
import {
  registryTabLists,
  makeRegistryComparator,
  roleOf,
  ROLE_LABEL,
  type RegistryLists,
  type RegistrySortKey,
  type BreedingClassification,
  BREEDING_CLASSIFICATIONS,
  filterOffspringByClassification,
  getOffspringClassificationCounts,
  extractFoughtLookups,
  hasFightRecord,
  isRetiredFighter,
  buildRegistryContext,
} from '@/lib/registry-roles';
import RetiredFighterBadge from '@/components/profiling/RetiredFighterBadge';
import { useUrlTab } from '@/lib/hooks/use-url-tab';
import { cn } from '@/components/ui/utils';
import { useT } from '@/lib/i18n';

type ListTab = 'males' | 'females' | 'archived' | 'deceased' | 'offspring';

type Props = {
  tab: ListTab;
  category?: BreedingClassification;
  onCategoryChange?: (category: BreedingClassification) => void;
  fowls: FowlRecord[];
  matchHistory: MatchRecord[];
  loading?: boolean;
  sortKey?: RegistrySortKey;
  onSortChange?: (key: RegistrySortKey) => void;
  setProfilingSubTab: (tab: ProfilingSubTab) => void;
  onGoToInventory?: () => void;
  handleOpenEditModal: (fowl: FowlRecord) => void;
  handleSetActiveStatus: (fowl: FowlRecord) => Promise<void>;
  setSelectedFowlForDetails: (fowl: FowlRecord) => void;
  setSelectedFowlForArchive: (fowl: FowlRecord) => void;
  setSelectedFowlForDeceased: (fowl: FowlRecord) => void;
};

function FowlCard({
  fowl,
  index,
  gender,
  onEdit,
  onArchive,
  onDeceased,
  onSetActive,
  onOpenDetails,
  allFowls,
  highlightQuery,
  classificationMap,
  isRetired,
}: {
  fowl: FowlRecord;
  index: number;
  gender: 'Male' | 'Female';
  onEdit: (f: FowlRecord) => void;
  onArchive: (f: FowlRecord) => void;
  onDeceased: (f: FowlRecord) => void;
  onSetActive?: (f: FowlRecord) => void;
  onOpenDetails?: (f: FowlRecord) => void;
  allFowls: FowlRecord[];
  highlightQuery?: string;
  classificationMap?: Map<string, GeneticClassification>;
  isRetired?: boolean;
}) {
  const { t } = useT();
  const siblings = getSiblingRelations(fowl, allFowls).map((s: SiblingRelation) => s.name);
  const cardGen = generationOf(fowl, allFowls);
  const cardGenInfo = generationInfo(cardGen);
  const cardNameKey = fowl.name.trim().toLowerCase();
  const cardRole = roleOf(fowl);
  const isBreeder = cardRole === 'Breeding Male' || cardRole === 'Breeding Female';
  const isNonBreeding = cardRole === 'Non-Breeding';
  const classification = classificationMap?.get(String(fowl.id)) ?? getBreedingClassification(fowl, allFowls);
  const parentage = getOffspringParentageRelatedness(fowl, allFowls);
  const displayBreed = classification.type === 'Crossbred' ? classification.derivedBreed : fowl.breed;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => { if ((e.target as HTMLElement).closest('button')) return; onOpenDetails?.(fowl); }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenDetails?.(fowl); } }}
      className="antigravity-card bg-white dark:bg-card p-5 rounded-lg border border-slate-200/80 dark:border-border shadow-sm relative overflow-hidden flex flex-col sm:flex-row gap-5 items-center cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md transition-all focus:ring-2 focus:ring-emerald-400/60"
      style={{ animationDelay: `${(index % 5) * 0.8}s` }}
    >
      <span className="antigravity-badge absolute top-0 right-0 text-xs font-black uppercase px-3.5 py-1 bg-slate-900 text-white rounded-bl-md tracking-widest shadow-2xs">{fowl.growth_stage || 'Stag'}</span>
      <div className="antigravity-avatar w-24 h-24 bg-slate-50 dark:bg-muted/50 border border-slate-200/80 dark:border-border rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center text-muted-foreground text-xs font-mono shadow-inner relative">
        {fowl.image_url ? <img src={fowl.image_url} alt={fowl.name} className="w-full h-full object-cover" /> : t('registry.cardNoPhoto')}
      </div>
      <div className="flex-1 w-full space-y-3">
        <div className="flex items-center flex-wrap gap-2">
          <h4 className="text-base font-black text-slate-900 dark:text-card-foreground flex items-center gap-2">
            <span className="font-mono text-xs font-black px-2 py-0.5 rounded border uppercase text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 shadow-2xs tracking-tight">
              [<HighlightText text={formatBirdCodeForDisplay(birdCodeOf(fowl, allFowls)) || '—'} query={highlightQuery} />]
            </span>
            <HighlightText text={fowl.name} query={highlightQuery} />
          </h4>
          {fowl.wing_band && fowl.wing_band.trim().toLowerCase() !== normalizeBirdCode(fowl.bird_code).toLowerCase() ? (
            <span className="antigravity-badge text-xs font-mono font-black border px-2.5 py-0.5 rounded-full uppercase text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-800" title={t('registry.wingBandTooltip')}>🏷 <HighlightText text={fowl.wing_band} query={highlightQuery} /></span>
          ) : null}
          <span className="antigravity-badge text-xs font-black border px-2.5 py-0.5 rounded-full uppercase text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-800">{displayBreed}</span>
          <BreedingTypeBadge classification={classification} />
          {(parentage.type === 'close' || parentage.type === 'line') && (
            <RelatednessBadge classification={parentage} compact />
          )}
          {isRetired && <RetiredFighterBadge />}
          <span className={`antigravity-badge text-xs font-black border px-2.5 py-0.5 rounded-full uppercase ${gender === 'Male' ? 'text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-800' : 'text-pink bg-pink-50 dark:bg-pink-500/10 border-pink-200 dark:border-pink-800'}`}>
            {gender === 'Male' ? t('registry.badgeMale') : t('registry.badgeFemale')}
          </span>
          {isBreeder && (
            <span className="antigravity-badge text-xs font-black border px-2.5 py-0.5 rounded-full uppercase text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-800" title={t('registry.registeredBreederTooltip')}>
              {cardRole === 'Breeding Male' ? `Sire ${formatBirdCodeForDisplay(birdCodeOf(fowl, allFowls))}` : `Dam ${formatBirdCodeForDisplay(birdCodeOf(fowl, allFowls))}`}
              {fowl.birth_code ? (
                <span className="ml-1 opacity-90 normal-case font-bold">{t('registry.cardBornAs', { code: fowl.birth_code })}</span>
              ) : null}
            </span>
          )}
          {isNonBreeding && (
            <span className="antigravity-badge text-xs font-black border px-2.5 py-0.5 rounded-full uppercase text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-800" title={t('registry.offspringFarmTooltip')}>
              {ROLE_LABEL['Non-Breeding']}
            </span>
          )}
          <span className="antigravity-badge text-xs font-black border px-2.5 py-0.5 rounded-full uppercase text-teal bg-teal-50 dark:bg-teal-950/50 border-teal-200 dark:border-teal-800">{cardGenInfo.short}</span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-muted-foreground bg-slate-50/80 dark:bg-muted/50 p-3 rounded-lg border border-slate-100 dark:border-border">
          <div>{t('registry.cardSireLabel')} {(() => {
            const name = (fowl.sire || '').trim();
            const target = name && name.toLowerCase() !== 'foundation stock' ? allFowls.find((f) => f.name.trim().toLowerCase() === name.toLowerCase()) : undefined;
            const targetClass = target ? (classificationMap?.get(String(target.id)) ?? getBreedingClassification(target, allFowls)) : null;
            const targetBreed = targetClass?.type === 'Crossbred' ? targetClass.derivedBreed : target?.breed;
            return (
              <>
                {target ? (
                  <button type="button" onClick={(e) => { e.stopPropagation(); onOpenDetails?.(target); }} className="font-bold text-sky-700 dark:text-sky-300 hover:underline underline-offset-2 cursor-pointer" title={t('registry.openSireProfileTooltip')}>{name}</button>
                ) : <strong className="text-slate-800 dark:text-card-foreground">{fowl.sire || 'N/A'}</strong>}
                {targetBreed && <span className="font-semibold"> · {targetBreed}</span>}
              </>
            );
          })()}</div>
          <div>{t('registry.cardDamLabel')} {(() => {
            const name = (fowl.dam || '').trim();
            const target = name && name.toLowerCase() !== 'foundation stock' ? allFowls.find((f) => f.name.trim().toLowerCase() === name.toLowerCase()) : undefined;
            const targetClass = target ? (classificationMap?.get(String(target.id)) ?? getBreedingClassification(target, allFowls)) : null;
            const targetBreed = targetClass?.type === 'Crossbred' ? targetClass.derivedBreed : target?.breed;
            return (
              <>
                {target ? (
                  <button type="button" onClick={(e) => { e.stopPropagation(); onOpenDetails?.(target); }} className="font-bold text-pink hover:underline underline-offset-2 cursor-pointer" title={t('registry.openDamProfileTooltip')}>{name}</button>
                ) : <strong className="text-slate-800 dark:text-card-foreground">{fowl.dam || 'N/A'}</strong>}
                {targetBreed && <span className="font-semibold"> · {targetBreed}</span>}
              </>
            );
          })()}</div>
          <div>{t('registry.cardColorLabel')} <strong className="text-slate-800 dark:text-card-foreground">{formatColorDisplay(fowl.feather_color || fowl.color, fowl.color_category)}</strong></div>
          <div>{t('registry.cardTraitLabel')} <strong className="text-emerald-700 dark:text-emerald-300">{fowl.trait || fowl.behavior_trait || t('registry.cardNotSpecified')}</strong></div>
          <div>{t('registry.cardLegsLabel')} <strong className="text-slate-800 dark:text-card-foreground">{fowl.leg_color || 'N/A'}</strong></div>
          <div className="col-span-2 pt-1 border-t border-slate-200/60 dark:border-border flex items-center justify-between text-xs">
            <span>{t('registry.cardAgeLabel')}</span>
            {(() => {
              const p = getAgeParts(fowl.birthdate);
              return p ? (
                <strong className="text-emerald-700 dark:text-emerald-300 font-black">{getAgeLabel(p)} <span className="font-mono font-semibold text-muted-foreground">{t('registry.cardBornDate', { date: fowl.birthdate })}</span></strong>
              ) : (
                <strong className="text-amber-700 dark:text-amber-300 font-bold">{fowl.age || t('registry.cardNoBirthDate')}</strong>
              );
            })()}
          </div>
        </div>
        <div className="text-xs text-muted-foreground flex justify-between items-center bg-slate-50 dark:bg-muted/50 p-2.5 px-3.5 rounded-md border border-slate-100 dark:border-border">
          <div className="font-semibold">{t('registry.cardSiblingsLabel')} <span className="text-emerald-700 dark:text-emerald-300 font-extrabold">{siblings.length > 0 ? siblings.join(', ') : t('registry.cardNone')}</span></div>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <button type="button" onClick={() => onEdit(fowl)} className="inline-flex items-center gap-1.5 text-xs font-bold text-success dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200/80 px-3 py-1.5 rounded-sm transition-all cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
            {t('registry.cardActionEdit')}
          </button>
          <button type="button" onClick={() => onArchive(fowl)} className="inline-flex items-center gap-1.5 text-xs font-bold text-warning dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200/80 px-3 py-1.5 rounded-sm transition-all cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21 8-2-2H5l-2 2"/><path d="M3 12v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6"/><path d="M10 12h4"/></svg>
            {t('registry.cardActionArchive')}
          </button>
          <button type="button" onClick={() => onDeceased(fowl)} className="inline-flex items-center gap-1.5 text-xs font-bold text-danger dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200/80 px-3 py-1.5 rounded-sm transition-all cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
            {t('registry.cardActionDeceased')}
          </button>
          {onSetActive && (
            <button type="button" onClick={() => onSetActive(fowl)} className="inline-flex items-center gap-1.5 text-xs font-bold text-success dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200/80 px-3 py-1.5 rounded-sm transition-all cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h18"/><path d="m9 16-4-4 4-4"/></svg>
              {t('registry.cardActionSetActive')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const PAGE_SIZE = 10;

function InventoryHint({ onGoToInventory }: { onGoToInventory?: () => void }) {
  const { t } = useT();
  if (!onGoToInventory) return null;
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 rounded-lg border border-dashed border-slate-300 dark:border-border bg-slate-50/70 dark:bg-muted/40 text-xs">
      <span className="text-muted-foreground font-semibold">
        {t('registry.inventoryHint')}
      </span>
      <button
        type="button"
        onClick={onGoToInventory}
        className="shrink-0 font-black text-emerald-700 dark:text-emerald-300 hover:underline cursor-pointer text-left sm:text-right"
      >
        {t('registry.openChickenInventory')}
      </button>
    </div>
  );
}

function InventoryMovedPanel({
  tab,
  archivedCount,
  deceasedCount,
  onGoToInventory,
}: {
  tab: 'archived' | 'deceased';
  archivedCount: number;
  deceasedCount: number;
  onGoToInventory?: () => void;
}) {
  const { t } = useT();
  const isArchived = tab === 'archived';
  return (
    <div className="bg-white dark:bg-card p-8 sm:p-12 text-center rounded-xl border border-slate-200/80 dark:border-border shadow-sm space-y-4 max-w-xl mx-auto my-6 animate-fadeIn">
      <div className={`w-14 h-14 rounded-2xl ${isArchived ? 'bg-amber-50 dark:bg-amber-500/10 text-warning border border-amber-100 dark:border-amber-900/40' : 'bg-rose-50 dark:bg-rose-500/10 text-danger border border-rose-100 dark:border-rose-900/40'} flex items-center justify-center text-2xl mx-auto shadow-xs`}>
        {isArchived ? '📦' : '💀'}
      </div>
      <div className="space-y-1.5">
        <h2 className="text-base font-black text-slate-900 dark:text-foreground">
          {isArchived ? t('registry.archivedMovedTitle') : t('registry.deceasedMovedTitle')}
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground font-normal max-w-md mx-auto">
          {t('registry.registryLiveNotice', {
            count: String(isArchived ? archivedCount : deceasedCount),
            status: isArchived ? t('domain.statusActive') : t('domain.statusDeceased'),
          })}
        </p>
      </div>
      {onGoToInventory && (
        <button
          type="button"
          onClick={onGoToInventory}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-md text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all cursor-pointer"
        >
          {t('registry.openChickenInventory')}
        </button>
      )}
    </div>
  );
}

type BodyProps = {
  tab: 'males' | 'females' | 'offspring';
  lists: RegistryLists;
  fowls: FowlRecord[];
  matchHistory: MatchRecord[];
  query: string;
  setQuery: (q: string) => void;
  debouncedQuery: string;
  sortKey?: RegistrySortKey;
  onSortChange?: (key: RegistrySortKey) => void;
  setProfilingSubTab: (tab: ProfilingSubTab) => void;
  onGoToInventory?: () => void;
  handleOpenEditModal: (fowl: FowlRecord) => void;
  category?: BreedingClassification;
  onCategoryChange?: (category: BreedingClassification) => void;
  handleSetActiveStatus: (fowl: FowlRecord) => Promise<void>;
  setSelectedFowlForDetails: (fowl: FowlRecord) => void;
  setSelectedFowlForArchive: (fowl: FowlRecord) => void;
  setSelectedFowlForDeceased: (fowl: FowlRecord) => void;
};

function FowlListsBody({
  tab,
  category: categoryProp,
  onCategoryChange: onCategoryChangeProp,
  lists,
  fowls,
  matchHistory,
  query,
  setQuery,
  debouncedQuery,
  sortKey,
  onSortChange,
  setProfilingSubTab,
  onGoToInventory,
  handleOpenEditModal,
  handleSetActiveStatus,
  setSelectedFowlForDetails,
  setSelectedFowlForArchive,
  setSelectedFowlForDeceased,
}: BodyProps) {
  const { t } = useT();
  const [page, setPage] = useState(1);
  const [filterSire, setFilterSire] = useState('all');
  const [filterDam, setFilterDam] = useState('all');
  const [filterStage, setFilterStage] = useState('all');
  const [filterBreed, setFilterBreed] = useState('all');
  const readFightFilterFromUrl = useCallback((): 'all' | 'with' | 'without' => {
    if (typeof window === 'undefined') return 'all';
    const search = new URLSearchParams(window.location.search);
    const fights = search.get('fights');
    if (fights === 'with' || fights === 'without') return fights;
    const rawClass = (search.get('class') || search.get('category') || '').toLowerCase().trim();
    if (rawClass === 'fight-prospects' || rawClass === 'no-fight') return 'without';
    return 'all';
  }, []);

  const [filterFights, setFilterFights] = useState<'all' | 'with' | 'without'>(readFightFilterFromUrl);
  const [filterRetiredFighter, setFilterRetiredFighter] = useState<boolean>(false);

  useEffect(() => {
    const handleUrlSync = () => {
      const search = new URLSearchParams(window.location.search);
      const fights = search.get('fights');
      if (fights === 'with' || fights === 'without') {
        setFilterFights(fights);
        return;
      }
      const rawClass = (search.get('class') || search.get('category') || '').toLowerCase().trim();
      if (rawClass === 'fight-prospects' || rawClass === 'no-fight') {
        setFilterFights('without');
      }
    };
    handleUrlSync();
    window.addEventListener('popstate', handleUrlSync);
    return () => window.removeEventListener('popstate', handleUrlSync);
  }, []);
  const [filterBreedingType, setFilterBreedingType] = useState<'all' | 'purebred' | 'crossbred' | 'unverified'>('all');
  const [internalSort, setInternalSort] = useState<RegistrySortKey>('identifier');
  const sort = sortKey ?? internalSort;
  const changeSort = onSortChange ?? setInternalSort;

const CLASSIFICATION_ALIASES: Record<string, BreedingClassification> = {
  'all': 'all',
  'all-offspring': 'all',
  'all_offspring': 'all',
  'breeding_stock': 'breeding-stock',
  'material': 'breeding-stock',
  'fight-prospects': 'all',
  'no-fight': 'all',
};

// URL-driven breeding classification for Offspring (?class=all | breeding-stock | non-breeding, with ?category= backward compat)
  const [internalCategory, setInternalCategory] = useUrlTab<BreedingClassification>({
    param: 'class',
    legacyParams: ['category'],
    values: BREEDING_CLASSIFICATIONS,
    defaultValue: 'all',
    aliases: CLASSIFICATION_ALIASES,
  });
  const category = categoryProp ?? internalCategory;
  const setCategory = onCategoryChangeProp ?? setInternalCategory;

  const baseList = useMemo(() => {
    if (tab === 'males') return lists.males;
    if (tab === 'females') return lists.females;
    return lists.nonBreeding;
  }, [tab, lists]);

  const allFowls = fowls;
  const birdCodesMap = useMemo(() => resolveBirdCodes(allFowls), [allFowls]);
  const breedingClassificationMap = useMemo(() => classifyFlock(allFowls), [allFowls]);

  const birdNameCodeMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of allFowls) {
      const code = birdCodesMap.get(String(f.id));
      if (code) {
        map.set(f.name.trim().toLowerCase(), code);
      }
    }
    return map;
  }, [allFowls, birdCodesMap]);

  const { foughtFowlIds, foughtNames } = useMemo(
    () => extractFoughtLookups(matchHistory),
    [matchHistory],
  );
  const regCtx = useMemo(() => buildRegistryContext(allFowls), [allFowls]);

  // Single-source breeding classification counts and active category list for Offspring
  const categoryCounts = useMemo(() => {
    if (tab !== 'offspring') return { all: baseList.length, breedingStock: 0, nonBreeding: 0 };
    return getOffspringClassificationCounts(baseList);
  }, [tab, baseList]);

  const categoryList = useMemo(() => {
    if (tab !== 'offspring') return baseList;
    return filterOffspringByClassification(baseList, category);
  }, [tab, baseList, category]);

  const filterOptions = useMemo(() => {
    const sires = new Map<string, ParentOption>();
    const dams = new Map<string, ParentOption>();
    const stages = new Set<string>();
    const breeds = new Set<string>();
    for (const f of categoryList) {
      const s = (f.sire || '').trim();
      const d = (f.dam || '').trim();
      if (s) {
        const existing = sires.get(s);
        if (existing) {
          existing.count = (existing.count || 0) + 1;
        } else {
          sires.set(s, {
            name: s,
            code: birdNameCodeMap.get(s.toLowerCase()) || null,
            count: 1,
          });
        }
      }
      if (d) {
        const existing = dams.get(d);
        if (existing) {
          existing.count = (existing.count || 0) + 1;
        } else {
          dams.set(d, {
            name: d,
            code: birdNameCodeMap.get(d.toLowerCase()) || null,
            count: 1,
          });
        }
      }
      stages.add((f.growth_stage || 'Stag').trim() || 'Stag');
      if ((f.breed || '').trim()) breeds.add(f.breed.trim());
      const classif = breedingClassificationMap.get(String(f.id));
      if (classif) {
        for (const b of classif.allBreeds) {
          if (b.pct > 0.1 && b.strain) {
            breeds.add(b.strain.trim());
          }
        }
      }
    }
    return {
      sires: Array.from(sires.values()).sort((a, b) => a.name.localeCompare(b.name)),
      dams: Array.from(dams.values()).sort((a, b) => a.name.localeCompare(b.name)),
      stages: [
        ...GROWTH_STAGE_VALUES,
        ...Array.from(stages)
          .filter((s) => !GROWTH_STAGE_VALUES.includes(s as (typeof GROWTH_STAGE_VALUES)[number]))
          .sort((a, b) => a.localeCompare(b)),
      ],
      breeds: Array.from(breeds).sort((a, b) => a.localeCompare(b)),
    };
  }, [categoryList, birdNameCodeMap, breedingClassificationMap]);

  const filtersActive =
    filterSire !== 'all' ||
    filterDam !== 'all' ||
    filterStage !== 'all' ||
    filterBreed !== 'all' ||
    filterBreedingType !== 'all' ||
    filterFights !== 'all' ||
    filterRetiredFighter ||
    query.trim() !== '';

  const clearFilters = () => {
    setFilterSire('all');
    setFilterDam('all');
    setFilterStage('all');
    setFilterBreed('all');
    setFilterBreedingType('all');
    setFilterFights('all');
    setFilterRetiredFighter(false);
    setQuery('');
    setPage(1);
  };

  const comparator = useMemo(
    () => makeRegistryComparator(sort, { fowls: allFowls, matchHistory }),
    [sort, allFowls, matchHistory],
  );

  const paginatedBirds = useMemo(() => {
    const qTrim = debouncedQuery.trim();
    type ItemWithMatch = { fowl: FowlRecord; match: ReturnType<typeof inspectFowlMatch> };
    const matchedList: ItemWithMatch[] = [];

    for (const f of categoryList) {
      const code = birdCodesMap.get(String(f.id)) || null;
      const match = inspectFowlMatch(f, qTrim, code, { includeTraitsAndColors: true });
      if (!match.matched) continue;

      const sireOk = filterSire === 'all' || (f.sire || '').trim().toLowerCase() === filterSire.toLowerCase();
      const damOk = filterDam === 'all' || (f.dam || '').trim().toLowerCase() === filterDam.toLowerCase();
      const stageOk = filterStage === 'all' || ((f.growth_stage || 'Stag').trim() || 'Stag').toLowerCase() === filterStage.toLowerCase();
      const classification = breedingClassificationMap.get(String(f.id)) ?? getBreedingClassification(f, allFowls);
      const breedOk = matchesBreedFilter(f, classification, filterBreed);
      const breedingTypeOk = matchesBreedingTypeFilter(classification, filterBreedingType);
      const hasFights = hasFightRecord(f, foughtFowlIds, foughtNames);
      const fightsOk = filterFights === 'all' || (filterFights === 'with' ? hasFights : !hasFights);
      const isRetired = isRetiredFighter(f, foughtFowlIds, foughtNames, regCtx);
      const retiredOk = !filterRetiredFighter || isRetired;

      if (sireOk && damOk && stageOk && breedOk && breedingTypeOk && fightsOk && retiredOk) {
        matchedList.push({ fowl: f, match });
      }
    }

    // Sort AFTER search + filters and BEFORE pagination so pages reflect order.
    matchedList.sort((a, b) => {
      if (qTrim) {
        const rel = compareFowlSearchRelevance(a.match, b.match);
        if (rel !== 0) return rel;
      }
      return comparator(a.fowl, b.fowl);
    });

    const list = matchedList.map((item) => item.fowl);
    const start = (page - 1) * PAGE_SIZE;
    return { list, pagedList: list.slice(start, start + PAGE_SIZE), totalPages: Math.ceil(list.length / PAGE_SIZE) };
  }, [categoryList, birdCodesMap, debouncedQuery, filterSire, filterDam, filterStage, filterBreed, filterBreedingType, breedingClassificationMap, allFowls, filterFights, filterRetiredFighter, foughtFowlIds, foughtNames, regCtx, comparator, page]);

  const filterBar = (
    <RegistryFilterBar
      query={query}
      onQueryChange={(q) => { setQuery(q); setPage(1); }}
      debouncedQuery={debouncedQuery}
      isDebouncing={query.trim() !== debouncedQuery.trim()}
      filterSire={filterSire}
      onFilterSireChange={(s) => { setFilterSire(s); setPage(1); }}
      filterDam={filterDam}
      onFilterDamChange={(d) => { setFilterDam(d); setPage(1); }}
      filterStage={filterStage}
      onFilterStageChange={(st) => { setFilterStage(st); setPage(1); }}
      filterBreed={filterBreed}
      onFilterBreedChange={(b) => { setFilterBreed(b); setPage(1); }}
      filterBreedingType={filterBreedingType}
      onFilterBreedingTypeChange={(bt) => { setFilterBreedingType(bt); setPage(1); }}
      filterFights={filterFights}
      onFilterFightsChange={(f) => {
        setFilterFights(f);
        setPage(1);
      }}
      filterRetiredFighter={filterRetiredFighter}
      onFilterRetiredFighterChange={(rf) => {
        setFilterRetiredFighter(rf);
        setPage(1);
      }}
      effectiveStatus="Active"
      sort={sort}
      onSortChange={(k) => { changeSort(k); setPage(1); }}
      sireOptions={filterOptions.sires}
      damOptions={filterOptions.dams}
      stageOptions={filterOptions.stages}
      breedOptions={filterOptions.breeds}
      filteredCount={paginatedBirds.list.length}
      totalCount={categoryList.length}
      onResetAll={clearFilters}
    />
  );

  const filteredEmpty = (
    <div className="bg-white dark:bg-card p-8 sm:p-12 text-center rounded-xl border border-slate-200/80 dark:border-border shadow-sm space-y-4 max-w-lg mx-auto my-6 animate-fadeIn">
      <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl mx-auto shadow-xs border border-emerald-100 dark:border-emerald-900/40">
        🔍
      </div>
      <div className="space-y-1.5">
        <h3 className="text-base font-bold text-slate-900 dark:text-foreground">
          {debouncedQuery.trim()
            ? t('registry.noChickensFoundQuery', { query: debouncedQuery })
            : t('registry.noChickensFoundFilters')}
        </h3>
        <p className="text-xs sm:text-sm text-muted-foreground font-normal max-w-sm mx-auto">
          {debouncedQuery.trim()
            ? t('registry.noChickensFoundQueryHelp')
            : t('registry.noChickensFoundFiltersHelp')}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
        {debouncedQuery.trim() && (
          <button
            type="button"
            onClick={() => { setQuery(''); setPage(1); }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all cursor-pointer"
          >
            {t('registry.clearSearch')}
          </button>
        )}
        <button
          type="button"
          onClick={clearFilters}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-muted dark:hover:bg-muted/80 text-foreground transition-all cursor-pointer"
        >
          {t('registry.resetAllFilters')}
        </button>
      </div>
    </div>
  );

  const renderCard = (fowl: FowlRecord, index: number, defaultGender: 'Male' | 'Female') => (
    <FowlCard
      key={fowl.id}
      fowl={fowl}
      index={index}
      gender={defaultGender}
      onEdit={handleOpenEditModal}
      onArchive={setSelectedFowlForArchive}
      onDeceased={setSelectedFowlForDeceased}
      onOpenDetails={setSelectedFowlForDetails}
      onSetActive={fowl.status !== 'Active' ? handleSetActiveStatus : undefined}
      allFowls={allFowls}
      highlightQuery={debouncedQuery}
      classificationMap={breedingClassificationMap}
      isRetired={isRetiredFighter(fowl, foughtFowlIds, foughtNames, regCtx)}
    />
  );

  // BREEDING MALE OR BREEDING FEMALE
  if (tab === 'males' || tab === 'females') {
    const isMaleTab = tab === 'males';
    const birds = paginatedBirds.list;
    const pagedList = paginatedBirds.pagedList;
    const totalPages = paginatedBirds.totalPages;
    const tabIcon = isMaleTab ? '🐓' : '🐔';
    const tabLabel = isMaleTab ? t('registry.maleRegistryTitle') : t('registry.femaleRegistryTitle');
    const tabSub = isMaleTab ? t('registry.maleRegistryDesc') : t('registry.femaleRegistryDesc');
    const accentBg = isMaleTab ? 'bg-sky-600' : 'bg-pink-600';
    const accentSoft = isMaleTab ? 'bg-sky-50 dark:bg-sky-950/50 border-sky-200 dark:border-sky-800' : 'bg-pink-50 dark:bg-pink-950/50 border-pink-200 dark:border-pink-800';
    const accentText = isMaleTab ? 'text-info' : 'text-pink';
    const emptyTitle = isMaleTab ? t('registry.noBreedingMales') : t('registry.noBreedingFemales');
    const emptyHint = isMaleTab ? t('registry.noBreedingMalesDesc') : t('registry.noBreedingFemalesDesc');

    return (
      <div className="space-y-4 animate-fadeIn">
        <div className={`bg-white dark:bg-card p-5 rounded-lg border border-slate-200/80 dark:border-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${isMaleTab ? 'border-l-4 border-l-sky-500' : 'border-l-4 border-l-pink-500'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-md border flex items-center justify-center text-xl shrink-0 ${accentSoft}`}>{tabIcon}</div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-card-foreground tracking-tight">{tabLabel}</h2>
              <p className="text-xs text-muted-foreground font-semibold">{tabSub}</p>
            </div>
          </div>
          <span className={`shrink-0 self-start sm:self-center text-xs font-black text-white px-3 py-1.5 rounded-full ${accentBg}`}>{t('registry.totalCount', { count: String(baseList.length) })}</span>
        </div>

        {filterBar}

        <InventoryHint onGoToInventory={onGoToInventory} />

        {filtersActive && birds.length === 0 ? (
          filteredEmpty
        ) : birds.length === 0 ? (
          <div className="bg-white dark:bg-card p-12 text-center rounded-lg border border-slate-200/80 dark:border-border shadow-sm space-y-3">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto ${isMaleTab ? 'bg-sky-50 dark:bg-sky-500/10' : 'bg-pink-50 dark:bg-pink-500/10'} ${accentText}`}>{tabIcon}</div>
            <h3 className="text-base font-extrabold text-slate-800 dark:text-card-foreground">{emptyTitle}</h3>
            <p className="text-sm text-muted-foreground font-medium max-w-sm mx-auto">{emptyHint}</p>
            <button type="button" onClick={() => setProfilingSubTab('form')} className="mt-2 inline-block bg-slate-900 text-white font-bold px-5 py-2.5 rounded-md text-sm cursor-pointer hover:bg-emerald-700 transition-all">
              {isMaleTab ? t('registry.encodeFirstMale') : t('registry.encodeFirstFemale')}
            </button>
          </div>
        ) : (
          <>
            {pagedList.map((fowl, index) => renderCard(fowl, index, isMaleTab ? 'Male' : 'Female'))}
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>
    );
  }

  // OFFSPRING
  if (tab === 'offspring') {
    const { pagedList, totalPages } = paginatedBirds;

    const categoryTabs: { id: BreedingClassification; label: string; count: number; tooltip?: string }[] = [
      { id: 'all', label: t('registry.categoryAll'), count: categoryCounts.all },
      {
        id: 'breeding-stock',
        label: t('registry.categoryBreedingStock'),
        count: categoryCounts.breedingStock,
        tooltip: t('registry.categoryBreedingStockTooltip'),
      },
      { id: 'non-breeding', label: t('registry.categoryNonBreeding'), count: categoryCounts.nonBreeding },
    ];

    return (
      <div className="space-y-4 animate-fadeIn">
        <div className="bg-white dark:bg-card p-5 rounded-lg border border-slate-200/80 dark:border-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-l-4 border-l-teal-500">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-md border flex items-center justify-center text-xl shrink-0 bg-teal-50 dark:bg-teal-500/10 border-teal-200 dark:border-teal-800 text-teal">🥚</div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-card-foreground tracking-tight">{t('registry.offspringRegistryTitle')}</h2>
              <p className="text-xs text-muted-foreground font-semibold">{t('registry.offspringRegistryDesc')}</p>
            </div>
          </div>
          <span className="shrink-0 self-start sm:self-center text-xs font-black text-white px-3 py-1.5 rounded-full bg-teal-600">{t('registry.totalCount', { count: String(baseList.length) })}</span>
        </div>

        {/* Breeding Classification Segmented Control (Pill-style tabs) */}
        <div
          role="tablist"
          aria-label={t('registry.offspringBreedingClassAria')}
          className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-100 dark:bg-muted/70 rounded-lg border border-slate-200/80 dark:border-border"
        >
          {categoryTabs.map((cat) => {
            const isActive = category === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                role="tab"
                id={`prospect-category-${cat.id}`}
                aria-selected={isActive}
                title={cat.tooltip}
                onClick={() => {
                  setCategory(cat.id);
                  setPage(1);
                }}
                className={cn(
                  'inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-bold transition-all whitespace-nowrap cursor-pointer',
                  isActive
                    ? 'bg-emerald-600 text-white shadow-xs font-black'
                    : 'text-muted-foreground hover:bg-slate-200/60 dark:hover:bg-muted hover:text-foreground'
                )}
              >
                <span>{cat.label}</span>
                <span
                  className={cn(
                    'text-xs font-black px-2 py-0.5 rounded-full transition-colors',
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200/80 dark:bg-muted text-muted-foreground'
                  )}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>

        {filterBar}

        <InventoryHint onGoToInventory={onGoToInventory} />

        {filtersActive && paginatedBirds.list.length === 0 ? (
          filteredEmpty
        ) : paginatedBirds.list.length === 0 ? (
          <div className="bg-white dark:bg-card p-12 text-center rounded-lg border border-slate-200/80 dark:border-border shadow-sm space-y-3">
            <div className="w-16 h-16 bg-teal-50 dark:bg-teal-500/10 text-teal rounded-full flex items-center justify-center text-3xl mx-auto">
              {category === 'breeding-stock' ? '🧬' : category === 'non-breeding' ? '🚫' : '🥚'}
            </div>
            <h3 className="text-base font-extrabold text-slate-800 dark:text-card-foreground">
              {category === 'breeding-stock'
                ? t('registry.noBreedingStock')
                : category === 'non-breeding'
                ? t('registry.noNonBreedingOffspring')
                : t('registry.noOffspring')}
            </h3>
            <p className="text-sm text-muted-foreground font-medium max-w-sm mx-auto">
              {category === 'breeding-stock'
                ? t('registry.noBreedingStockDesc')
                : category === 'non-breeding'
                ? t('registry.noNonBreedingDesc')
                : t('registry.noOffspringDesc')}
            </p>
            {category === 'all' && (
              <button type="button" onClick={() => setProfilingSubTab('form')} className="mt-2 inline-block bg-slate-900 text-white font-bold px-5 py-2.5 rounded-md text-sm cursor-pointer hover:bg-emerald-700 transition-all">
                {t('registry.encodeFirstOffspring')}
              </button>
            )}
          </div>
        ) : (
          <>
            {pagedList.map((child, index) => {
              const childGender: 'Male' | 'Female' = child.gender === 'Male' || child.gender === 'Rooster' ? 'Male' : 'Female';
              return renderCard(child, index, childGender);
            })}
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>
    );
  }

  return null;
}

export default function FowlLists(props: Props) {
  const { tab, fowls } = props;
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 250);
  const lists = useMemo(() => registryTabLists(fowls), [fowls]);

  if (tab === 'archived' || tab === 'deceased') {
    return (
      <InventoryMovedPanel
        tab={tab}
        archivedCount={lists.archived.length}
        deceasedCount={lists.deceased.length}
        onGoToInventory={props.onGoToInventory}
      />
    );
  }

  return (
    <FowlListsBody
      key={tab}
      tab={tab}
      category={props.category}
      onCategoryChange={props.onCategoryChange}
      lists={lists}
      fowls={fowls}
      matchHistory={props.matchHistory}
      query={query}
      setQuery={setQuery}
      debouncedQuery={debouncedQuery}
      sortKey={props.sortKey}
      onSortChange={props.onSortChange}
      setProfilingSubTab={props.setProfilingSubTab}
      onGoToInventory={props.onGoToInventory}
      handleOpenEditModal={props.handleOpenEditModal}
      handleSetActiveStatus={props.handleSetActiveStatus}
      setSelectedFowlForDetails={props.setSelectedFowlForDetails}
      setSelectedFowlForArchive={props.setSelectedFowlForArchive}
      setSelectedFowlForDeceased={props.setSelectedFowlForDeceased}
    />
  );
}
