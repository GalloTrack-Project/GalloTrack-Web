'use client';
import React, { useState, useMemo, useContext, useEffect, useRef } from 'react';
import type { FowlRecord, MatchRecord, PageId, ProfilingSubTab } from '@/lib/types';
import { generateBreedCompliance } from '@/lib/breed-standards';
import {
  formatBirdCodeForDisplay,
  resolveBirdCodes,
  compareBirdCodesNatural,
} from '@/lib/bird-code';
import {
  genderLabel,
  parentBreedOf,
  parentBloodlineOf,
  isMale,
  isFemale,
  formatColorDisplay,
} from '@/lib/helpers';
import { getFowlBloodlineStats } from '@/lib/bloodline-composition';
import BloodlineBreakdown from '@/components/BloodlineBreakdown';
import { Modal } from '@/components/ui';
import StatusBadge from '@/components/ui/StatusBadge';
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
  isRetiredFighter,
  extractFoughtLookups,
} from '@/lib/registry-roles';
import RetiredFighterBadge from '@/components/profiling/RetiredFighterBadge';
import { Search, X } from 'lucide-react';
import { useUrlTab } from '@/lib/hooks/use-url-tab';
import { INVENTORY_STATUS_TABS } from '@/lib/nav-manifest';
import {
  useUnitPrefs,
  weightFromStorage,
  heightFromStorage,
  weightUnitLabel,
  heightUnitLabel,
} from '@/lib/units';
import { UIContext } from '@/lib/contexts/ui-context';
import {
  getBreedingClassification,
  classifyFlock,
  matchesBreedingTypeFilter,
  type BreedingClassification,
} from '@/lib/breeding-classification';
import BreedingTypeBadge from '@/components/BreedingTypeBadge';
import { getOffspringParentageRelatedness } from '@/lib/relatedness-classification';
import RelatednessBadge from '@/components/RelatednessBadge';
import { useT } from '@/lib/i18n';

const INVENTORY_BREEDING_TYPES = ['all', 'purebred', 'crossbred', 'unverified'] as const;
type BreedingTypeFilter = (typeof INVENTORY_BREEDING_TYPES)[number];

type FilterTab = 'all' | 'active' | 'breeding' | 'archived' | 'deceased';
type SortKey = 'name' | 'age' | 'strain' | 'winrate' | 'weight' | 'identifier';
type RoleFilter = 'all' | RoleKey;
type SexFilter = 'all' | 'male' | 'female';

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
};

function getWinRate(fowlName: string, matches: MatchRecord[]) {
  const m = matches.filter(
    (x) => x.entry_name?.trim().toLowerCase() === fowlName.trim().toLowerCase(),
  );
  const wins = m.filter((x) => x.outcome?.toLowerCase() === 'win').length;
  const losses = m.filter((x) => x.outcome?.toLowerCase() === 'loss').length;
  const total = m.length;
  const decided = wins + losses;
  const winRate = decided > 0 ? Math.round((wins / decided) * 100) : 0;
  return { total, wins, losses, winRate };
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

function GenderIcon({ gender }: { gender: string }) {
  const g = gender?.toLowerCase();
  if (g === 'rooster' || g === 'male') return <span className="text-info text-sm">{'\u2642'}</span>;
  if (g === 'hen' || g === 'female') return <span className="text-pink text-sm">{'\u2640'}</span>;
  return <span className="text-muted-foreground text-sm">{'\u2014'}</span>;
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
  matches,
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
  matches: MatchRecord[];
  onClick: () => void;
  code?: string;
  query?: string;
  parentHint?: string;
  onOpenProfile?: () => void;
  onRestore?: () => void;
  classification?: BreedingClassification;
}) {
  const unitPrefs = useUnitPrefs();
  const stats = useMemo(() => getWinRate(fowl.name, matches), [fowl.name, matches]);
  const sireBreed = parentBreedOf(fowl.sire, fowls);
  const damBreed = parentBreedOf(fowl.dam, fowls);
  const parentage = getOffspringParentageRelatedness(fowl, fowls);
  const regWeight =
    fowl.structural_weight !== undefined &&
    fowl.structural_weight !== null &&
    fowl.structural_weight !== ''
      ? String(fowl.structural_weight)
      : fowl.weight || '';
  const regHeight =
    fowl.structural_height !== undefined &&
    fowl.structural_height !== null &&
    fowl.structural_height !== ''
      ? String(fowl.structural_height)
      : fowl.height || '';
  const compliance = useMemo(
    () =>
      generateBreedCompliance(
        fowl.breed,
        regWeight,
        regHeight,
        fowl.leg_color,
        fowl.color_category,
        fowl.gender,
        fowl.registry_role,
      ),
    [
      fowl.breed,
      regWeight,
      regHeight,
      fowl.leg_color,
      fowl.color_category,
      fowl.gender,
      fowl.registry_role,
    ],
  );
  const { foughtFowlIds, foughtNames } = useMemo(() => extractFoughtLookups(matches), [matches]);
  const regCtx = useMemo(() => buildRegistryContext(fowls), [fowls]);
  const isRetired = isRetiredFighter(fowl, foughtFowlIds, foughtNames, regCtx);
  const accent = isActiveStatus(fowl)
    ? 'from-emerald-400 to-emerald-500'
    : isArchivedStatus(fowl)
      ? 'from-amber-400 to-amber-500'
      : 'from-rose-400 to-rose-500';
  const readyInDays = isBreedingReadySoon(fowl) ? daysUntilBreedingReady(fowl) : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button')) return;
        onClick();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className="group bg-card border-border relative w-full cursor-pointer overflow-hidden rounded-lg border p-5 text-left shadow-sm transition-all duration-200 hover:border-emerald-500/40 hover:shadow-md focus:ring-2 focus:ring-emerald-400/60"
    >
      {/* Top accent */}
      <div className={`absolute top-0 right-0 left-0 h-1 bg-gradient-to-r ${accent}`}></div>

      {/* Status + Compliance */}
      <div className="mb-3 flex items-center justify-between">
        <StatusBadge status={fowl.status} />
        {compliance.complianceGrade && compliance.matchedStandard && (
          <ComplianceBadge grade={compliance.complianceGrade} />
        )}
      </div>

      {/* Photo + Identifier + Name + Breed */}
      <div className="mb-4 flex items-center gap-3">
        <div className="bg-muted border-border flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border shadow-inner">
          {fowl.image_url ? (
            <img src={fowl.image_url} alt={fowl.name} className="h-full w-full object-cover" />
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-muted-foreground/50"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            {code && (
              <span className="text-success shrink-0 rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-xs font-black uppercase">
                <HighlightText text={formatBirdCodeForDisplay(code)} query={query} />
              </span>
            )}
            <h4 className="text-card-foreground group-hover:text-success truncate text-sm font-black transition-colors">
              <HighlightText text={fowl.name} query={query} />
            </h4>
          </div>
          {parentHint && (
            <div className="mt-1 inline-flex items-center gap-1 rounded-sm border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-400">
              <span className="font-normal opacity-80">Matched via:</span>
              <span className="font-extrabold">{parentHint}</span>
            </div>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-success rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-xs font-black">
              {classification?.type === 'Crossbred' ? classification.derivedBreed : fowl.breed}
            </span>
            {classification && <BreedingTypeBadge classification={classification} />}
            {parentage && (parentage.type === 'close' || parentage.type === 'line') && (
              <RelatednessBadge classification={parentage} compact />
            )}
            {isRetired && <RetiredFighterBadge />}
            {fowl.wing_band ? (
              <span className="text-muted-foreground font-mono text-xs font-bold">
                🏷 <HighlightText text={fowl.wing_band} query={query} />
              </span>
            ) : null}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <GenderIcon gender={fowl.gender} />
            <span className="text-muted-foreground text-xs font-semibold">
              {genderLabel(fowl.gender)}
            </span>
            <span className="text-muted-foreground/40">{'\u00B7'}</span>
            <span className="text-muted-foreground text-xs font-semibold">
              {getAgeDisplay(fowl.birthdate)}
            </span>
            {readyInDays !== null && (
              <span className="rounded-full border border-amber-500/30 bg-amber-500/15 px-1.5 py-0.5 text-xs font-black tracking-wider text-amber-700 uppercase dark:text-amber-400">
                Ready in {readyInDays} {readyInDays === 1 ? 'day' : 'days'}
              </span>
            )}
          </div>
          {(fowl.feather_color || fowl.color || fowl.trait || fowl.behavior_trait) && (
            <div className="text-muted-foreground mt-1 flex items-center gap-1.5 truncate text-xs font-semibold">
              {(fowl.feather_color || fowl.color) && (
                <span>
                  🎨 {formatColorDisplay(fowl.feather_color || fowl.color, fowl.color_category)}
                </span>
              )}
              {(fowl.feather_color || fowl.color) && (fowl.trait || fowl.behavior_trait) && (
                <span className="text-muted-foreground/40">·</span>
              )}
              {(fowl.trait || fowl.behavior_trait) && (
                <span className="font-bold text-emerald-700 dark:text-emerald-300">
                  ⚡ {fowl.trait || fowl.behavior_trait}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Data grid */}
      <div className="mb-3 grid grid-cols-3 gap-2 text-center">
        <div className="bg-muted/50 rounded-md px-1 py-2">
          <p className="text-muted-foreground text-xs font-bold uppercase">Age</p>
          <p className="text-card-foreground text-sm font-black">{getAgeDisplay(fowl.birthdate)}</p>
        </div>
        <div className="bg-muted/50 rounded-md px-1 py-2">
          <p className="text-muted-foreground text-xs font-bold uppercase">Weight</p>
          <p className="text-card-foreground text-sm font-black">
            {regWeight
              ? `${weightFromStorage(regWeight, unitPrefs.weightUnit)} ${weightUnitLabel(unitPrefs.weightUnit)}`
              : '\u2014'}
          </p>
        </div>
        <div className="bg-muted/50 rounded-md px-1 py-2">
          <p className="text-muted-foreground text-xs font-bold uppercase">Stage</p>
          <p className="text-card-foreground truncate text-sm font-black">
            {fowl.growth_stage || '\u2014'}
          </p>
        </div>
      </div>

      {/* Win rate */}
      {stats.total > 0 && (
        <div className="border-border border-t pt-3">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-muted-foreground text-xs font-bold uppercase">Performance</span>
            <span
              className={`text-sm font-black ${stats.winRate >= 50 ? 'text-success' : 'text-danger'}`}
            >
              {stats.winRate}%
            </span>
          </div>
          <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
            <div
              className={`h-full rounded-full transition-all ${stats.winRate >= 50 ? 'bg-emerald-500' : 'bg-rose-400'}`}
              style={{ width: `${stats.winRate}%` }}
            ></div>
          </div>
          <p className="text-muted-foreground mt-1.5 text-xs font-semibold">
            {stats.wins}W {'\u00B7'} {stats.losses}L {'\u00B7'} {stats.total} total
          </p>
        </div>
      )}

      {/* Lineage */}
      {(fowl.sire || fowl.dam) && (
        <div className="border-border/50 mt-3 flex items-center justify-between gap-2 border-t pt-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-muted-foreground text-xs font-bold uppercase">Lineage:</span>
            <span className="text-muted-foreground truncate text-xs font-semibold">
              {fowl.sire || '—'}
              {sireBreed ? ` (${sireBreed})` : ''} {'×'} {fowl.dam || '—'}
              {damBreed ? ` (${damBreed})` : ''}
            </span>
          </div>
        </div>
      )}

      {/* Card actions: profile link + restore */}
      {(onOpenProfile || onRestore) && (
        <div className="border-border mt-3 flex items-center justify-between gap-2 border-t pt-3">
          {onOpenProfile && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenProfile();
              }}
              className="cursor-pointer text-xs font-black text-emerald-700 hover:underline dark:text-emerald-300"
            >
              Full profile →
            </button>
          )}
          {onRestore && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRestore();
              }}
              className="text-success ml-auto inline-flex cursor-pointer items-center gap-1.5 rounded-sm border border-emerald-200/80 bg-emerald-50 px-3 py-1.5 text-xs font-bold transition-all hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              Restore to Active
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function FowlDetailModal({
  fowl,
  matches,
  onClose,
  fowls,
  code,
}: {
  fowl: FowlRecord;
  matches: MatchRecord[];
  onClose: () => void;
  fowls: FowlRecord[];
  code?: string;
}) {
  const unitPrefs = useUnitPrefs();
  const stats = getWinRate(fowl.name, matches);
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
          <div className="bg-muted border-border flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border shadow-inner">
            {fowl.image_url ? (
              <img src={fowl.image_url} alt={fowl.name} className="h-full w-full object-cover" />
            ) : (
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
            )}
          </div>
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
              {genderLabel(fowl.gender)} {'\u00B7'} {getAgeDisplay(fowl.birthdate)} {'\u00B7'}{' '}
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
        {!isDamRecord && stats.total > 0 && (
          <div className="bg-muted/50 border-border space-y-3 rounded-lg border p-4">
            <h4 className="text-muted-foreground text-xs font-black tracking-widest uppercase">
              Match Performance
            </h4>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-card border-border rounded-md border py-2.5">
                <p className="text-card-foreground text-xl font-black">{stats.total}</p>
                <p className="text-muted-foreground text-xs font-bold uppercase">Total</p>
              </div>
              <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 py-2.5">
                <p className="text-success text-xl font-black">{stats.wins}</p>
                <p className="text-success text-xs font-bold uppercase">Wins</p>
              </div>
              <div className="rounded-md border border-rose-500/30 bg-rose-500/10 py-2.5">
                <p className="text-danger text-xl font-black">{stats.losses}</p>
                <p className="text-danger text-xs font-bold uppercase">Losses</p>
              </div>
              <div
                className={`rounded-md border py-2.5 ${stats.winRate >= 50 ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-rose-500/30 bg-rose-500/10'}`}
              >
                <p
                  className={`text-xl font-black ${stats.winRate >= 50 ? 'text-success' : 'text-danger'}`}
                >
                  {stats.winRate}%
                </p>
                <p
                  className={`text-xs font-bold uppercase ${stats.winRate >= 50 ? 'text-success' : 'text-danger'}`}
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
  debouncedSearch: propDebouncedSearch,
  genderFilter: propGenderFilter,
  setGenderFilter: propSetGenderFilter,
  statusFilter: propStatusFilter,
  setStatusFilter: propSetStatusFilter,
  setCurrentPage,
  setProfilingSubTab,
  onRestore,
  canRestoreDeceased = false,
  setSelectedFowlForDetails,
}: Props) {
  const { t } = useT();
  const [internalSearch, setInternalSearch] = useState('');
  const search = propSearch !== undefined ? propSearch : internalSearch;
  const setSearch = propSetSearch !== undefined ? propSetSearch : setInternalSearch;

  const ui = useContext(UIContext);
  const [internalActiveTab, setInternalActiveTab] = useState<FilterTab>('all');
  const activeTab = propStatusFilter ?? ui?.inventoryStatusFilter ?? internalActiveTab;
  const setActiveTab = propSetStatusFilter ?? ui?.setInventoryStatusFilter ?? setInternalActiveTab;

  // URL-driven status filter: ?status=<INVENTORY_STATUS_TABS> (default 'all'
  // omitted from the URL). This surface only renders at /catalog.
  const [urlStatus, setUrlStatus, urlStatusMeta] = useUrlTab<FilterTab>({
    param: 'status',
    values: INVENTORY_STATUS_TABS,
    defaultValue: 'all',
  });
  const prevUrlSyncStatusRef = useRef(activeTab);
  useEffect(() => {
    // Apply URL → state only at mount (shareable link) and on back/forward.
    // User-driven changes write the URL via the effect below; re-applying them
    // here ping-pongs the two setters into an infinite update loop
    // ("Maximum update depth exceeded") that unmounts the page.
    if (
      urlStatusMeta.change === 'popstate' ||
      (urlStatusMeta.change === 'mount' && urlStatusMeta.paramPresent)
    ) {
      if (urlStatus !== activeTab) setActiveTab(urlStatus);
    }
  }, [urlStatus, urlStatusMeta, activeTab, setActiveTab]);
  useEffect(() => {
    if (prevUrlSyncStatusRef.current === activeTab) return;
    prevUrlSyncStatusRef.current = activeTab;
    if (activeTab === urlStatus) return;
    setUrlStatus(activeTab);
  }, [activeTab, urlStatus, setUrlStatus]);

  // URL-driven breeding type filter: ?breedingType=<INVENTORY_BREEDING_TYPES>
  const [internalBreedingType, setInternalBreedingType] = useState<BreedingTypeFilter>('all');
  const [urlBreedingType, setUrlBreedingType, urlBreedingTypeMeta] = useUrlTab<BreedingTypeFilter>({
    param: 'breedingType',
    values: INVENTORY_BREEDING_TYPES,
    defaultValue: 'all',
  });
  const prevUrlSyncBreedingTypeRef = useRef(internalBreedingType);
  useEffect(() => {
    if (
      urlBreedingTypeMeta.change === 'popstate' ||
      (urlBreedingTypeMeta.change === 'mount' && urlBreedingTypeMeta.paramPresent)
    ) {
      if (urlBreedingType !== internalBreedingType) setInternalBreedingType(urlBreedingType);
    }
  }, [urlBreedingType, urlBreedingTypeMeta, internalBreedingType]);
  useEffect(() => {
    if (prevUrlSyncBreedingTypeRef.current === internalBreedingType) return;
    prevUrlSyncBreedingTypeRef.current = internalBreedingType;
    if (internalBreedingType === urlBreedingType) return;
    setUrlBreedingType(internalBreedingType);
  }, [internalBreedingType, urlBreedingType, setUrlBreedingType]);

  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [internalGenderFilter, setInternalGenderFilter] = useState<SexFilter>('all');
  const sexFilter = propGenderFilter ?? ui?.inventoryGenderFilter ?? internalGenderFilter;
  const setSexFilter =
    propSetGenderFilter ?? ui?.setInventoryGenderFilter ?? setInternalGenderFilter;
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [selectedFowl, setSelectedFowl] = useState<FowlRecord | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<FowlRecord | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [includeParents, setIncludeParents] = useState(false);
  const internalDebouncedQuery = useDebounce(search || '', 250);
  const debouncedQuery =
    (propDebouncedSearch !== undefined ? propDebouncedSearch : internalDebouncedQuery) || '';

  const registryCtx = useMemo(() => buildRegistryContext(fowls), [fowls]);
  const counts = useMemo(() => inventoryCounts(fowls, registryCtx), [fowls, registryCtx]);
  const classificationMap = useMemo(() => classifyFlock(fowls), [fowls]);

  const tabs: { id: FilterTab; label: string; count: number; tooltip?: string }[] = useMemo(
    () => [
      { id: 'all', label: 'All Chickens', count: counts.all },
      {
        id: 'active',
        label: 'Active Breeders',
        count: counts.breedersStock,
        tooltip: 'Living breeding herd — Breeding Males (sires) and Breeding Females (dams).',
      },
      { id: 'breeding', label: 'Ready to Breed', count: counts.breedingReady },
      { id: 'archived', label: 'Archived', count: counts.archived },
      { id: 'deceased', label: 'Deceased', count: counts.deceased },
    ],
    [counts],
  );

  const tabRefs = useRef<Map<FilterTab, HTMLButtonElement>>(new Map());

  const handleTabKeyDown = (e: React.KeyboardEvent, index: number) => {
    let targetIndex = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      targetIndex = (index + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      targetIndex = (index - 1 + tabs.length) % tabs.length;
    } else if (e.key === 'Home') {
      e.preventDefault();
      targetIndex = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      targetIndex = tabs.length - 1;
    }

    if (targetIndex >= 0) {
      const nextTab = tabs[targetIndex];
      setActiveTab(nextTab.id);
      setRoleFilter('all');
      tabRefs.current.get(nextTab.id)?.focus();
    }
  };

  const birdCodes = useMemo(() => resolveBirdCodes(fowls), [fowls]);

  const { filteredFowls, matchMap } = useMemo(() => {
    let pool = fowls;
    if (activeTab === 'active') pool = pool.filter((f) => isBreederStock(f, registryCtx));
    else if (activeTab === 'breeding') pool = pool.filter((f) => isBreedingReady(f, registryCtx));
    else if (activeTab === 'archived') pool = pool.filter((f) => isArchivedStatus(f));
    else if (activeTab === 'deceased') pool = pool.filter((f) => isDeceasedStatus(f));
    if (roleFilter !== 'all') pool = pool.filter((f) => roleOf(f, registryCtx) === roleFilter);
    if (sexFilter === 'male') pool = pool.filter((f) => isMale(f.gender));
    else if (sexFilter === 'female') pool = pool.filter((f) => isFemale(f.gender));
    if (internalBreedingType !== 'all') {
      pool = pool.filter((f) => {
        const c = classificationMap.get(String(f.id)) ?? getBreedingClassification(f, fowls);
        return matchesBreedingTypeFilter(c, internalBreedingType);
      });
    }

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

      if (sortKey === 'identifier') {
        const r = compareBirdCodesNatural(
          birdCodes.get(String(a.id)) || '',
          birdCodes.get(String(b.id)) || '',
        );
        if (r !== 0) return r;
        return a.id - b.id;
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
  }, [
    fowls,
    debouncedQuery,
    includeParents,
    activeTab,
    roleFilter,
    sexFilter,
    internalBreedingType,
    classificationMap,
    registryCtx,
    sortKey,
    matchHistory,
    birdCodes,
  ]);

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

  return (
    <div className="animate-fadeIn space-y-6">
      {/* Header */}
      <div className="border-border bg-card/70 flex flex-col justify-between gap-4 rounded-lg border p-6 sm:p-7 md:flex-row md:items-center">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-emerald-500/30 bg-emerald-500/15 text-xl shadow-inner">
            {'\uD83E\uDDEC'}
          </div>
          <div>
            <h1 className="text-card-foreground text-xl font-black tracking-tight sm:text-2xl md:text-3xl">
              Chicken Inventory
            </h1>
            <p className="text-muted-foreground mt-1 text-sm font-semibold">
              All your chickens in one list — status, age, weight, stage, and lineage
            </p>
          </div>
        </div>
        <div className="flex w-full flex-col items-stretch gap-3 sm:flex-row sm:items-center md:w-auto">
          <div className="flex flex-1 flex-col gap-1.5 md:flex-none">
            <div className="relative flex-1 md:w-72">
              <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2">
                <Search className="h-4 w-4" />
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
                className="border-border bg-card text-card-foreground placeholder:text-muted-foreground w-full rounded-lg border py-2.5 pr-9 pl-10 text-sm font-semibold transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 sm:py-3 [&::-webkit-search-cancel-button]:appearance-none"
              />
              {search.length > 0 && (
                <button
                  type="button"
                  aria-label="Clear search input"
                  onClick={() => setSearch('')}
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer rounded-md p-1 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <label className="text-muted-foreground hover:text-foreground inline-flex cursor-pointer items-center gap-1.5 pl-1 text-xs font-semibold select-none">
              <input
                type="checkbox"
                checked={includeParents}
                onChange={(e) => setIncludeParents(e.target.checked)}
                className="border-border h-3.5 w-3.5 cursor-pointer rounded text-emerald-600 accent-emerald-600 focus:ring-emerald-500/20"
              />
              <span>Include parents</span>
            </label>
          </div>
          <button
            type="button"
            onClick={() => {
              setCurrentPage('profiling');
              setProfilingSubTab('form');
            }}
            className="flex shrink-0 cursor-pointer items-center gap-2 self-start rounded-lg bg-emerald-600 px-4 py-3 text-xs font-black whitespace-nowrap text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-[0.98] sm:self-auto"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span className="hidden sm:inline">Add Chicken</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {/* 1. Status Tab Bar (No horizontal scrolling; wrapped pills / responsive grid) */}
      <div
        role="tablist"
        aria-label="Chicken inventory status tabs"
        data-testid="inventory-tabs-container"
        className="bg-muted/60 dark:bg-muted/40 border-border grid w-full grid-cols-2 items-stretch gap-2 rounded-lg border p-1.5 md:flex md:flex-wrap md:items-center"
      >
        {tabs.map((tab, idx) => {
          const isSelected = activeTab === tab.id;
          const isFifth = idx === 4;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                if (el) tabRefs.current.set(tab.id, el);
                else tabRefs.current.delete(tab.id);
              }}
              type="button"
              role="tab"
              id={`inventory-tab-${tab.id}`}
              aria-selected={isSelected}
              aria-controls="inventory-tabpanel"
              tabIndex={isSelected ? 0 : -1}
              title={tab.tooltip}
              onClick={() => {
                setActiveTab(tab.id);
                setRoleFilter('all');
              }}
              onKeyDown={(e) => handleTabKeyDown(e, idx)}
              className={cn(
                'flex min-h-[44px] cursor-pointer items-center justify-between gap-2 rounded-md px-3.5 py-2 text-xs font-bold transition-all outline-none select-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 sm:justify-center',
                isFifth ? 'col-span-2 md:col-span-1 md:w-auto' : 'col-span-1 md:w-auto',
                isSelected
                  ? 'bg-emerald-600 font-black text-white shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <span className="text-left leading-snug whitespace-normal sm:text-center">
                {tab.label}
              </span>
              <span
                className={cn(
                  'shrink-0 rounded-full px-2 py-0.5 text-xs font-black transition-colors',
                  isSelected ? 'bg-white/20 text-white' : 'bg-border text-muted-foreground',
                )}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 2. Filters Row (Role, Sex, Type, Sort) in a separate row below tabs */}
      <div
        data-testid="inventory-filters-row"
        className="bg-card border-border grid w-full [grid-template-columns:repeat(2,minmax(0,1fr))] grid-cols-2 items-center gap-2.5 rounded-lg border p-2 shadow-xs md:flex md:flex-wrap"
      >
        <div className="flex w-full min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center md:w-auto">
          <label
            htmlFor="inventory-role"
            className="text-muted-foreground text-xs font-bold whitespace-nowrap"
          >
            Role
          </label>
          <select
            id="inventory-role"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
            className={cn(
              'bg-card h-9 w-full max-w-full min-w-0 cursor-pointer truncate rounded-md border px-2.5 py-1.5 text-xs font-bold transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 sm:w-auto',
              roleFilter !== 'all'
                ? 'text-success border-emerald-500/50 bg-emerald-500/5'
                : 'text-card-foreground border-border',
            )}
          >
            <option value="all">All roles</option>
            {ROLE_FILTER_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {roleLabel(r)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex w-full min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center md:w-auto">
          <label
            htmlFor="inventory-sex"
            className="text-muted-foreground text-xs font-bold whitespace-nowrap"
          >
            Sex
          </label>
          <select
            id="inventory-sex"
            aria-label="Filter by sex"
            value={sexFilter}
            onChange={(e) => setSexFilter(e.target.value as SexFilter)}
            className={cn(
              'bg-card h-9 w-full max-w-full min-w-0 cursor-pointer truncate rounded-md border px-2.5 py-1.5 text-xs font-bold transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 sm:w-auto',
              sexFilter !== 'all'
                ? 'text-success border-emerald-500/50 bg-emerald-500/5'
                : 'text-card-foreground border-border',
            )}
          >
            <option value="all">All sexes</option>
            <option value="male">Male (Roosters)</option>
            <option value="female">Female (Hens)</option>
          </select>
        </div>

        <div className="flex w-full min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center md:w-auto">
          <label
            htmlFor="inventory-breeding-type"
            className="text-muted-foreground text-xs font-bold whitespace-nowrap"
          >
            {t('registry.breedingTypeLabel')}
          </label>
          <select
            id="inventory-breeding-type"
            aria-label="Filter by breeding type"
            value={internalBreedingType}
            onChange={(e) => setInternalBreedingType(e.target.value as BreedingTypeFilter)}
            className={cn(
              'bg-card h-9 w-full max-w-full min-w-0 cursor-pointer truncate rounded-md border px-2.5 py-1.5 text-xs font-bold transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 sm:w-auto',
              internalBreedingType !== 'all'
                ? 'text-success border-emerald-500/50 bg-emerald-500/5'
                : 'text-card-foreground border-border',
            )}
            title={t('registry.breedingTypeHelp')}
          >
            <option value="all">{t('registry.allBreedingTypesOption')}</option>
            <option value="purebred">{t('domain.breedingPurebred')}</option>
            <option value="crossbred">{t('domain.breedingCrossbred')}</option>
            <option value="unverified">{t('domain.breedingUnverified')}</option>
          </select>
        </div>

        <div className="flex w-full min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center md:ml-auto md:w-auto">
          <label
            htmlFor="inventory-sort"
            className="text-muted-foreground text-xs font-bold whitespace-nowrap"
          >
            Sort
          </label>
          <select
            id="inventory-sort"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="bg-card text-card-foreground border-border h-9 w-full max-w-full min-w-0 cursor-pointer truncate rounded-md border px-2.5 py-1.5 text-xs font-bold transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 sm:w-auto"
          >
            <option value="name">Name (A–Z)</option>
            <option value="identifier">Identifier (1A2 before 1A10)</option>
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
          className="bg-muted/60 border-border animate-fadeIn flex items-center justify-between rounded-lg border px-3.5 py-2 text-xs font-medium"
        >
          <span className="text-muted-foreground">
            Showing <strong className="text-foreground font-black">{filteredFowls.length}</strong>{' '}
            {filteredFowls.length === 1 ? 'result' : 'results'} for &ldquo;
            <span className="font-bold text-emerald-700 dark:text-emerald-400">
              {debouncedQuery}
            </span>
            &rdquo;
            {includeParents && <span className="ml-1 opacity-75">(including parents)</span>}
          </span>
          <button
            type="button"
            onClick={() => setSearch('')}
            className="cursor-pointer text-xs font-bold text-emerald-700 hover:underline dark:text-emerald-400"
          >
            Clear search
          </button>
        </div>
      )}

      {/* Grid Tabpanel */}
      <div id="inventory-tabpanel" role="tabpanel" aria-labelledby={`inventory-tab-${activeTab}`}>
        {filteredFowls.length === 0 ? (
          <div className="bg-card border-border mx-auto my-6 max-w-md space-y-3.5 rounded-lg border p-12 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-2xl text-emerald-600 dark:text-emerald-400">
              🔍
            </div>
            <div className="space-y-1">
              <h2 className="text-card-foreground text-base font-extrabold">
                {debouncedQuery.trim()
                  ? `No chickens found for "${debouncedQuery}"`
                  : activeTab === 'active'
                    ? 'No Active Breeders'
                    : 'No Chickens Found'}
              </h2>
              <p className="text-muted-foreground mx-auto max-w-sm text-xs font-medium sm:text-sm">
                {debouncedQuery.trim()
                  ? 'No chickens match your search in this tab. Check the spelling or enable "Include parents" to search lineage.'
                  : activeTab === 'active'
                    ? 'No active breeding males or females found in the herd.'
                    : 'No chickens match your current filters. Try adjusting your search or add new chickens.'}
              </p>
            </div>
            {debouncedQuery.trim() && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-emerald-700"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredFowls.map((fowl) => {
              const m = matchMap.get(fowl.id);
              const parentHint =
                m?.reason === 'sire' || m?.reason === 'dam' ? m.parentHint : undefined;
              const restorable =
                isArchivedStatus(fowl) || (isDeceasedStatus(fowl) && canRestoreDeceased);
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
                  onOpenProfile={
                    setSelectedFowlForDetails ? () => setSelectedFowlForDetails(fowl) : undefined
                  }
                  onRestore={onRestore && restorable ? () => setRestoreTarget(fowl) : undefined}
                  classification={classificationMap.get(String(fowl.id))}
                />
              );
            })}
          </div>
        )}
      </div>

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

      {/* Restore confirmation */}
      {restoreTarget && (
        <Modal
          open
          onClose={() => {
            if (!restoring) setRestoreTarget(null);
          }}
          title="Restore to Active?"
          className="max-w-md"
        >
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Move <strong className="text-foreground">{restoreTarget.name}</strong> back to the
              active registry? It will reappear in the Chicken Registry tabs, count as Active, and a
              history entry will be logged.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={restoring}
                onClick={() => setRestoreTarget(null)}
                className="bg-muted text-foreground hover:bg-muted/80 cursor-pointer rounded-md px-4 py-2 text-xs font-bold transition-all disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={restoring}
                onClick={() => {
                  void confirmRestore();
                }}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-emerald-700 disabled:opacity-60"
              >
                {restoring ? 'Restoring…' : 'Restore to Active'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
