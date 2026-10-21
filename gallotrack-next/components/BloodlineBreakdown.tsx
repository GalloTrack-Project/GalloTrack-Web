'use client';
import React from 'react';
import type { FowlRecord } from '@/lib/types';
import {
  getBloodlineStats,
  getFowlBloodlineStats,
  computePedigreeComposition,
  hasRecordedParents,
  UNKNOWN_BLOODLINE,
  type BloodlineComposition,
  type BloodlineStats,
} from '@/lib/bloodline-composition';
import {
  getCompositionSourceInfo,
  hasBothParentsRecorded,
  isFoundationStockRecord,
} from '@/lib/breeding-classification';

const PALETTE = [
  'bg-emerald-500',
  'bg-sky-500',
  'bg-amber-500',
  'bg-violet-500',
  'bg-rose-500',
  'bg-teal-500',
  'bg-indigo-500',
  'bg-lime-500',
];

const barColor = (strain: string, index: number): string => {
  if (strain.toLowerCase() === UNKNOWN_BLOODLINE.toLowerCase()) return 'bg-slate-400';
  return PALETTE[index % PALETTE.length];
};

const strainKey = (s: string): string => s.trim().toLowerCase().replace(/\s+/g, ' ');

const findByName = (fowls: FowlRecord[], name?: string | null): FowlRecord | undefined => {
  if (!name || name.trim() === '' || strainKey(name) === 'foundation stock') return undefined;
  const key = strainKey(name);
  return fowls.find((f) => strainKey(f.name || '') === key);
};

function countUnregisteredAncestors(
  fowl: FowlRecord | null | undefined,
  fowls: FowlRecord[] = [],
): number {
  if (!fowl) return 0;
  let count = 0;
  const visited = new Set<string>();
  const walk = (f: FowlRecord | undefined, parentName: string | null | undefined) => {
    if (
      !f &&
      parentName &&
      parentName.trim() !== '' &&
      strainKey(parentName) !== 'foundation stock'
    ) {
      count++;
      return;
    }
    if (!f) return;
    const key = strainKey(f.name || '');
    if (key && visited.has(key)) return;
    if (key) visited.add(key);
    const sire = findByName(fowls, f.sire);
    const dam = findByName(fowls, f.dam);
    if (!sire && f.sire && f.sire.trim() !== '' && strainKey(f.sire) !== 'foundation stock')
      count++;
    else walk(sire, f.sire);
    if (!dam && f.dam && f.dam.trim() !== '' && strainKey(f.dam) !== 'foundation stock') count++;
    else walk(dam, f.dam);
  };
  walk(fowl, fowl.name);
  return count;
}

type SharedAncestor = { name: string; displayName: string };

function findSharedAncestors(
  fowl: FowlRecord | null | undefined,
  fowls: FowlRecord[] = [],
): SharedAncestor[] {
  if (!fowl) return [];
  const occurrences = new Map<string, { displayName: string; sides: Set<'sire' | 'dam'> }>();
  const visited = new Set<string>();

  const walk = (
    f: FowlRecord | undefined,
    parentName: string | null | undefined,
    side: 'sire' | 'dam' | null,
    depth: number,
  ) => {
    const name = f?.name || parentName || '';
    const key = strainKey(name);

    if (key && depth > 0) {
      const entry = occurrences.get(key) || { displayName: name, sides: new Set() };
      if (side) entry.sides.add(side);
      occurrences.set(key, entry);
    }

    if (!f) return;
    const visitedKey = `${depth}:${key}`;
    if (key && visited.has(visitedKey)) return;
    if (key) visited.add(visitedKey);

    const sire = findByName(fowls, f.sire);
    const dam = findByName(fowls, f.dam);

    const childSide: 'sire' | 'dam' = depth === 0 ? ('sire' as const) : (side as 'sire' | 'dam');
    if (f.sire && f.sire.trim() !== '' && strainKey(f.sire) !== 'foundation stock') {
      const sireKey = strainKey(f.sire);
      const sireEntry = occurrences.get(sireKey) || { displayName: f.sire, sides: new Set() };
      sireEntry.sides.add(depth === 0 ? 'sire' : childSide);
      occurrences.set(sireKey, sireEntry);
      walk(sire, f.sire, depth === 0 ? 'sire' : side, depth + 1);
    }
    if (f.dam && f.dam.trim() !== '' && strainKey(f.dam) !== 'foundation stock') {
      const damKey = strainKey(f.dam);
      const damEntry = occurrences.get(damKey) || { displayName: f.dam, sides: new Set() };
      damEntry.sides.add(depth === 0 ? 'dam' : childSide);
      occurrences.set(damKey, damEntry);
      walk(dam, f.dam, depth === 0 ? 'dam' : side, depth + 1);
    }
  };

  walk(fowl, fowl.name, null, 0);

  const subjectKey = strainKey(fowl.name || '');
  const shared: SharedAncestor[] = [];
  for (const [key, value] of occurrences.entries()) {
    if (key === subjectKey) continue;
    if (value.sides.has('sire') && value.sides.has('dam')) {
      shared.push({ name: key, displayName: value.displayName });
    }
  }
  shared.sort((a, b) => a.displayName.localeCompare(b.displayName));
  return shared;
}

type Props = {
  composition?: BloodlineComposition | null;
  stats?: BloodlineStats | null;
  title?: string;
  subtitle?: string;
  compact?: boolean;
  fowl?: FowlRecord | null;
  fowls?: FowlRecord[];
  onEditComposition?: () => void;
};

export default function BloodlineBreakdown({
  composition,
  stats,
  title,
  subtitle,
  compact,
  fowl,
  fowls,
  onEditComposition,
}: Props) {
  const resolved = React.useMemo(() => {
    if (stats !== undefined) return stats;
    if (composition !== undefined) return composition ? getBloodlineStats(composition) : null;
    if (fowl) return getFowlBloodlineStats(fowl, fowls ?? []);
    return null;
  }, [stats, composition, fowl, fowls]);

  const unregisteredCount = React.useMemo(
    () => countUnregisteredAncestors(fowl ?? null, fowls ?? []),
    [fowl, fowls],
  );

  const sharedAncestors = React.useMemo(
    () => findSharedAncestors(fowl ?? null, fowls ?? []),
    [fowl, fowls],
  );

  const sourceInfo = React.useMemo(
    () => (fowl ? getCompositionSourceInfo(fowl, fowls ?? []) : null),
    [fowl, fowls],
  );

  const pedigreeSummary = React.useMemo(() => {
    if (!fowl || !fowls || !hasRecordedParents(fowl)) return null;
    const pedComp = computePedigreeComposition(fowl, fowls);
    const pedStats = getBloodlineStats(pedComp);
    return pedStats?.summary ?? null;
  }, [fowl, fowls]);

  const show5050 = React.useMemo(
    () => hasBothParentsRecorded(fowl ?? null, fowls ?? []),
    [fowl, fowls],
  );

  if (!resolved) return null;

  const { entries, dominant, strainCount, isDiluted, summary, knownPct, unknownPct } = resolved;
  const isAssumed = sourceInfo?.source === 'assumed';
  const isAdjusted = sourceInfo?.source === 'adjusted';
  const sourceLine = sourceInfo?.sourceLabel;
  const canEditComposition = Boolean(onEditComposition);

  if (compact) {
    return (
      <div className="space-y-2 rounded-lg border border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50 px-3 py-2 dark:border-emerald-900/50 dark:from-emerald-950/40 dark:to-teal-950/40">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <p className="text-xs font-black tracking-widest text-emerald-700 uppercase dark:text-emerald-300">
              🧬 {title || 'Bloodline Breakdown'}
            </p>
            <span className="inline-flex items-center rounded-full bg-slate-700 px-2 py-0.5 text-xs font-black tracking-wide text-white uppercase">
              {strainCount} strain{strainCount === 1 ? '' : 's'}
            </span>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-700 px-2 py-0.5 text-xs font-black tracking-wider text-white uppercase">
            {dominant.strain} {dominant.pct}%
          </span>
        </div>

        {sourceLine && (
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
              Source: <span className="font-semibold">{sourceLine}</span>
            </p>
            {isAdjusted && pedigreeSummary && (
              <p className="text-muted-foreground text-xs font-semibold">
                Calculated from parents: {pedigreeSummary}
              </p>
            )}
          </div>
        )}

        <div className="dark:bg-muted flex h-4 w-full overflow-hidden rounded-full border border-white/60 bg-white/80">
          {entries.map((entry, i) => (
            <div
              key={entry.strain}
              className={`h-full ${barColor(entry.strain, i)}`}
              style={{ width: `${Math.max(entry.pct > 0 ? 0.5 : 0, entry.pct)}%` }}
              title={`${entry.strain}: ${entry.pct}%`}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {entries.map((entry, i) => (
            <div key={entry.strain} className="flex items-center gap-1">
              <span
                className={`inline-block h-2.5 w-2.5 shrink-0 rounded-sm ${barColor(entry.strain, i)}`}
              />
              <span
                className={`truncate text-xs font-black ${
                  entry.isUnknown
                    ? 'text-muted-foreground'
                    : 'dark:text-card-foreground text-slate-700'
                }`}
              >
                {entry.strain}
              </span>
              <span
                className={`shrink-0 text-xs font-black tabular-nums ${
                  entry.isUnknown
                    ? 'text-muted-foreground'
                    : 'dark:text-card-foreground text-slate-800'
                }`}
              >
                {entry.pct}%
              </span>
            </div>
          ))}
        </div>

        <div className="space-y-0.5">
          {show5050 && (
            <p className="text-muted-foreground text-xs font-semibold">
              50% Sire · 50% Dam · halved each gen
            </p>
          )}
          {isAssumed && (
            <p
              className="text-xs font-semibold text-amber-700 dark:text-amber-300"
              title="No parents are recorded, so the system assumes this bird is 100% of its registered breed. You can declare the real composition by editing the chicken."
            >
              Assumed 100% {dominant.strain}
            </p>
          )}
          {unknownPct > 0 && (
            <p className="text-muted-foreground text-xs font-semibold">
              {unknownPct}% unknown because{' '}
              {unregisteredCount || Math.max(1, Math.ceil(unknownPct / 25))} ancestor
              {unregisteredCount === 1 ||
              (unregisteredCount === 0 && Math.ceil(unknownPct / 25) === 1)
                ? ''
                : 's'}{' '}
              not registered
            </p>
          )}
          {sharedAncestors.slice(0, 2).map((sa) => (
            <p key={sa.name} className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Line-bred: {sa.displayName} appears on both sides
            </p>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50 p-4 dark:border-emerald-900/50 dark:from-emerald-950/40 dark:to-teal-950/40">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black tracking-widest text-emerald-700 uppercase dark:text-emerald-300">
            🧬 {title || 'Bloodline Percentage Breakdown'}
          </p>
          {sourceLine && (
            <div className="mt-0.5 space-y-0.5">
              <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                Source: <span className="font-semibold">{sourceLine}</span>
              </p>
              {isAdjusted && pedigreeSummary && (
                <p className="text-muted-foreground text-xs font-semibold">
                  Calculated from parents:{' '}
                  <span className="text-foreground font-bold">{pedigreeSummary}</span>
                </p>
              )}
            </div>
          )}
          {show5050 && (
            <p className="text-muted-foreground mt-0.5 text-xs font-semibold">
              {subtitle || '50% Sire · 50% Dam — halved each generation'}
            </p>
          )}
        </div>
        <div className="shrink-0 sm:text-right">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-700 px-2.5 py-1 text-xs font-black tracking-wider text-white uppercase">
            {dominant.strain} {dominant.pct}%
          </span>
          <p className="text-muted-foreground mt-1 text-xs font-bold tracking-wide uppercase">
            {strainCount} bloodline{strainCount === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {entries.map((entry, i) => (
          <div key={entry.strain} className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span
                className={`truncate text-xs font-black ${
                  entry.isUnknown
                    ? 'text-muted-foreground'
                    : 'dark:text-card-foreground text-slate-700'
                }`}
              >
                {entry.strain}
              </span>
              <span
                className={`shrink-0 text-xs font-black tabular-nums ${
                  entry.isUnknown
                    ? 'text-muted-foreground'
                    : 'dark:text-card-foreground text-slate-800'
                }`}
              >
                {entry.pct}%
              </span>
            </div>
            <div className="dark:bg-muted h-2 w-full overflow-hidden rounded-full border border-white/60 bg-white/80">
              <div
                className={`h-full rounded-full transition-all duration-500 ${barColor(entry.strain, i)}`}
                style={{ width: `${Math.max(2, Math.min(100, entry.pct))}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {isAssumed ? (
        <div className="space-y-2 border-t border-emerald-100 pt-2 dark:border-emerald-900/50">
          <p className="text-muted-foreground text-xs leading-relaxed font-semibold">
            <span className="font-black text-emerald-700 dark:text-emerald-300">Summary:</span>{' '}
            Assumed 100% {dominant.strain}
          </p>
          <div className="flex flex-col justify-between gap-2 rounded-md border border-amber-500/20 bg-amber-500/10 p-2.5 text-xs text-amber-900 sm:flex-row sm:items-center dark:text-amber-200">
            <p className="leading-relaxed">
              No parents are recorded, so the system assumes this bird is 100% of its registered
              breed. You can declare the real composition by editing the chicken.
            </p>
            {canEditComposition && (
              <button
                type="button"
                onClick={onEditComposition}
                className="shrink-0 cursor-pointer self-start text-xs font-bold text-amber-800 underline hover:no-underline sm:self-auto dark:text-amber-300"
              >
                Edit composition →
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-1.5 border-t border-emerald-100 pt-2 dark:border-emerald-900/50">
          <p className="text-muted-foreground text-xs leading-relaxed font-semibold">
            <span className="font-black text-emerald-700 dark:text-emerald-300">Summary:</span>{' '}
            {summary}
            {isAdjusted && pedigreeSummary && (
              <>
                {' '}
                ·{' '}
                <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                  Calculated from parents: {pedigreeSummary}
                </span>
              </>
            )}
            {unknownPct > 0 && (
              <>
                {' '}
                ·{' '}
                <span className="text-muted-foreground font-black">
                  {unknownPct}% unregistered ancestry
                </span>{' '}
                — set the parents&apos; breed to complete the split.
              </>
            )}
            {knownPct > 0 && unknownPct === 0 && strainCount === 1 && !isAdjusted && (
              <> · Pure / single-bloodline split.</>
            )}
          </p>
          {canEditComposition && (
            <div>
              <button
                type="button"
                onClick={onEditComposition}
                className="cursor-pointer text-xs font-bold text-emerald-700 underline hover:no-underline dark:text-emerald-300"
              >
                Edit composition →
              </button>
            </div>
          )}
        </div>
      )}

      {sharedAncestors.length > 0 && (
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/40">
          <p className="text-xs font-black tracking-wider text-slate-700 uppercase dark:text-slate-300">
            Line-bred ancestors
          </p>
          {sharedAncestors.map((sa) => (
            <p
              key={sa.name}
              className="mt-0.5 text-xs leading-relaxed font-semibold text-slate-600 dark:text-slate-400"
            >
              {sa.displayName} appears on both sire and dam sides.
            </p>
          ))}
        </div>
      )}

      {isDiluted && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900/60 dark:bg-amber-950/40">
          <p className="text-xs font-black tracking-wider text-amber-700 uppercase dark:text-amber-300">
            ⚠️ Banta ng “Galapsaw”
          </p>
          <p className="mt-0.5 text-xs leading-relaxed font-semibold text-amber-700/90 dark:text-amber-300/90">
            Masyado nang maraming halo ang lahi ({strainCount} bloodlines, nangunguna lang ang{' '}
            {dominant.pct}%). Bumaba ang specific bloodline percentage — mas mahirap nang
            panatilihin ang magagandang katangian. Maganda ang pure o kontroladong breeding.
          </p>
        </div>
      )}
    </div>
  );
}
