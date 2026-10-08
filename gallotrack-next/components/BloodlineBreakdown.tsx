'use client';
import React from 'react';
import type { FowlRecord } from '@/lib/types';
import {
  getBloodlineStats,
  UNKNOWN_BLOODLINE,
  type BloodlineComposition,
  type BloodlineStats,
} from '@/lib/bloodline-composition';

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

function countUnregisteredAncestors(fowl: FowlRecord | null | undefined, fowls: FowlRecord[] = []): number {
  if (!fowl) return 0;
  let count = 0;
  const visited = new Set<string>();
  const walk = (f: FowlRecord | undefined, parentName: string | null | undefined) => {
    if (!f && parentName && parentName.trim() !== '' && strainKey(parentName) !== 'foundation stock') {
      count++;
      return;
    }
    if (!f) return;
    const key = strainKey(f.name || '');
    if (key && visited.has(key)) return;
    if (key) visited.add(key);
    const sire = findByName(fowls, f.sire);
    const dam = findByName(fowls, f.dam);
    if (!sire && f.sire && f.sire.trim() !== '' && strainKey(f.sire) !== 'foundation stock') count++;
    else walk(sire, f.sire);
    if (!dam && f.dam && f.dam.trim() !== '' && strainKey(f.dam) !== 'foundation stock') count++;
    else walk(dam, f.dam);
  };
  walk(fowl, fowl.name);
  return count;
}

type SharedAncestor = { name: string; displayName: string };

function findSharedAncestors(fowl: FowlRecord | null | undefined, fowls: FowlRecord[] = []): SharedAncestor[] {
  if (!fowl) return [];
  const occurrences = new Map<string, { displayName: string; sides: Set<'sire' | 'dam'> }>();
  const visited = new Set<string>();

  const walk = (
    f: FowlRecord | undefined,
    parentName: string | null | undefined,
    side: 'sire' | 'dam' | null,
    depth: number
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
};

export default function BloodlineBreakdown({ composition, stats, title, subtitle, compact, fowl, fowls }: Props) {
  const resolved = stats ?? getBloodlineStats(composition ?? null);
  if (!resolved) return null;

  const { entries, dominant, strainCount, isDiluted, summary, knownPct, unknownPct } = resolved;

  const unregisteredCount = React.useMemo(
    () => countUnregisteredAncestors(fowl ?? null, fowls ?? []),
    [fowl, fowls]
  );

  const sharedAncestors = React.useMemo(
    () => findSharedAncestors(fowl ?? null, fowls ?? []),
    [fowl, fowls]
  );

  if (compact) {
    return (
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-100 dark:border-emerald-900/50 rounded-lg py-2 px-3 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <p className="text-xs font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-widest">
              🧬 {title || 'Bloodline Breakdown'}
            </p>
            <span className="inline-flex items-center bg-slate-700 text-white text-xs font-black px-2 py-0.5 rounded-full uppercase tracking-wide">
              {strainCount} strain{strainCount === 1 ? '' : 's'}
            </span>
          </div>
          <span className="inline-flex items-center gap-1 bg-emerald-700 text-white text-xs font-black px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
            {dominant.strain} {dominant.pct}%
          </span>
        </div>

        <div className="h-4 w-full rounded-full bg-white/80 dark:bg-muted overflow-hidden border border-white/60 flex">
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
              <span className={`inline-block w-2.5 h-2.5 rounded-sm shrink-0 ${barColor(entry.strain, i)}`} />
              <span
                className={`text-xs font-black truncate ${
                  entry.isUnknown ? 'text-muted-foreground' : 'text-slate-700 dark:text-card-foreground'
                }`}
              >
                {entry.strain}
              </span>
              <span
                className={`text-xs font-black tabular-nums shrink-0 ${
                  entry.isUnknown ? 'text-muted-foreground' : 'text-slate-800 dark:text-card-foreground'
                }`}
              >
                {entry.pct}%
              </span>
            </div>
          ))}
        </div>

        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground font-semibold">
            50% Sire · 50% Dam · halved each gen
          </p>
          {unknownPct > 0 && (
            <p className="text-xs text-muted-foreground font-semibold">
              {unknownPct}% unknown because {unregisteredCount || Math.max(1, Math.ceil(unknownPct / 25))} ancestor
              {unregisteredCount === 1 || (unregisteredCount === 0 && Math.ceil(unknownPct / 25) === 1) ? '' : 's'} not
              registered
            </p>
          )}
          {sharedAncestors.slice(0, 2).map((sa) => (
            <p key={sa.name} className="text-xs text-slate-600 dark:text-slate-400 font-semibold">
              Line-bred: {sa.displayName} appears on both sides
            </p>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-100 dark:border-emerald-900/50 rounded-lg p-4 space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-widest">
            🧬 {title || 'Bloodline Percentage Breakdown'}
          </p>
          {subtitle ? (
            <p className="text-xs text-muted-foreground font-semibold mt-0.5">{subtitle}</p>
          ) : (
            <p className="text-xs text-muted-foreground font-semibold mt-0.5">
              50% Sire · 50% Dam — halved each generation
            </p>
          )}
        </div>
        <div className="shrink-0 sm:text-right">
          <span className="inline-flex items-center gap-1.5 bg-emerald-700 text-white text-xs font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
            {dominant.strain} {dominant.pct}%
          </span>
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-wide mt-1">
            {strainCount} bloodline{strainCount === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {entries.map((entry, i) => (
          <div key={entry.strain} className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span
                className={`text-xs font-black truncate ${
                  entry.isUnknown ? 'text-muted-foreground' : 'text-slate-700 dark:text-card-foreground'
                }`}
              >
                {entry.strain}
              </span>
              <span
                className={`text-xs font-black tabular-nums shrink-0 ${
                  entry.isUnknown ? 'text-muted-foreground' : 'text-slate-800 dark:text-card-foreground'
                }`}
              >
                {entry.pct}%
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-white/80 dark:bg-muted overflow-hidden border border-white/60">
              <div
                className={`h-full rounded-full transition-all duration-500 ${barColor(entry.strain, i)}`}
                style={{ width: `${Math.max(2, Math.min(100, entry.pct))}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground font-semibold leading-relaxed border-t border-emerald-100 dark:border-emerald-900/50 pt-2">
        <span className="font-black text-emerald-700 dark:text-emerald-300">Summary:</span> {summary}
        {unknownPct > 0 && (
          <>
            {' '}
            · <span className="font-black text-muted-foreground">{unknownPct}% unregistered ancestry</span> — set the
            parents&apos; breed to complete the split.
          </>
        )}
        {knownPct > 0 && unknownPct === 0 && strainCount === 1 && (
          <> · Pure / single-bloodline split.</>
        )}
      </p>

      {sharedAncestors.length > 0 && (
        <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2">
          <p className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Line-bred ancestors
          </p>
          {sharedAncestors.map((sa) => (
            <p
              key={sa.name}
              className="text-xs text-slate-600 dark:text-slate-400 font-semibold mt-0.5 leading-relaxed"
            >
              {sa.displayName} appears on both sire and dam sides.
            </p>
          ))}
        </div>
      )}

      {isDiluted && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-md px-3 py-2">
          <p className="text-xs font-black text-amber-700 dark:text-amber-300 uppercase tracking-wider">⚠️ Banta ng “Galapsaw”</p>
          <p className="text-xs text-amber-700/90 dark:text-amber-300/90 font-semibold mt-0.5 leading-relaxed">
            Masyado nang maraming halo ang lahi ({strainCount} bloodlines, nangunguna lang ang {dominant.pct}%).
            Bumaba ang specific bloodline percentage — mas mahirap nang panatilihin ang magagandang katangian.
            Maganda ang pure o kontroladong breeding.
          </p>
        </div>
      )}
    </div>
  );
}
