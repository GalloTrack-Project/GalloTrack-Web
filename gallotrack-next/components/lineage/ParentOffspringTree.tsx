'use client';

import React, { useMemo, useState } from 'react';
import type { FowlRecord, MatchRecord } from '@/lib/types';
import { buildOffspringIndex, nameKey } from '@/lib/family-tree';
import {
  buildChickenMatchStatsMap,
  getChickenMatchStats,
  type WinRateStats,
} from '@/lib/win-rate';
import { lineageBirdCode } from '@/lib/lineage-graph';
import { sexLabel } from '@/lib/helpers';
import { formatBirdCodeForDisplay } from '@/lib/bird-code';
import WinRatePill from '@/components/match/WinRatePill';
import CrisscrossBadge from '@/components/CrisscrossBadge';
import LineageBirdCard, { initials, recordLabel } from './LineageBirdCard';
import LineagePairBadge from './LineagePairBadge';
import type { CrisscrossClassification } from '@/lib/lineage';

export type ParentTreeSexFilter = 'all' | 'males' | 'females';
export type ParentTreeSortOption = 'males-first' | 'code' | 'age' | 'wins' | 'winrate';

export interface ParentTreePair {
  key: string;
  otherName: string;
  otherCode: string;
  isUnknownOther: boolean;
  pairCode: string;
  offspring: FowlRecord[];
  totalOffspring: number;
  maleCount: number;
  femaleCount: number;
  stats: WinRateStats;
  crisscross: CrisscrossClassification;
  isOpen: boolean;
}

interface Props {
  kind: 'sire' | 'dam';
  rootName: string;
  rootCode: string;
  rootFowl: FowlRecord | null;
  pairs: ParentTreePair[];
  codes: Map<string, string>;
  fowls: FowlRecord[];
  matchHistory: MatchRecord[];
  sexFilter: ParentTreeSexFilter;
  onSexFilterChange: (value: ParentTreeSexFilter) => void;
  sortBy: ParentTreeSortOption;
  onSortChange: (value: ParentTreeSortOption) => void;
  showAllOffspring: boolean;
  onTogglePair: (key: string) => void;
  onPick: (fowl: FowlRecord) => void;
}

const THRESHOLD = 6;

const LEGEND = [
  { label: 'Active', dot: 'bg-emerald-500' },
  { label: 'Archived', dot: 'bg-amber-400' },
  { label: 'Deceased', dot: 'bg-rose-400' },
];

export default function ParentOffspringTree({
  kind,
  rootName,
  rootCode,
  rootFowl,
  pairs,
  codes,
  fowls,
  matchHistory,
  sexFilter,
  onSexFilterChange,
  sortBy,
  onSortChange,
  showAllOffspring,
  onTogglePair,
  onPick,
}: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [revealedPairs, setRevealedPairs] = useState<Set<string>>(new Set());

  const statsMap = useMemo(
    () => buildChickenMatchStatsMap(matchHistory, fowls),
    [matchHistory, fowls],
  );
  const childIndex = useMemo(() => buildOffspringIndex(fowls), [fowls]);
  const byName = useMemo(() => {
    const map = new Map<string, FowlRecord>();
    fowls.forEach((fowl) => {
      const key = nameKey(fowl.name);
      if (key && !map.has(key)) map.set(key, fowl);
    });
    return map;
  }, [fowls]);

  const totalOffspring = pairs.reduce((sum, pair) => sum + pair.totalOffspring, 0);
  const totalMales = pairs.reduce((sum, pair) => sum + pair.maleCount, 0);
  const totalFemales = pairs.reduce((sum, pair) => sum + pair.femaleCount, 0);

  const statsOf = (fowl: FowlRecord) => getChickenMatchStats(statsMap, fowl);
  const offspringOf = (fowl: FowlRecord) =>
    childIndex.get(nameKey(fowl.name))?.length ?? 0;

  const selectBird = (fowl: FowlRecord) => {
    setSelectedId(fowl.id);
    onPick(fowl);
  };

  const parentNoun = kind === 'sire' ? 'sire' : 'dam';
  const otherNoun = kind === 'sire' ? 'dam' : 'sire';

  const renderPlaceholder = (name: string, role: 'root' | 'mate') => (
    <div className="bg-card border-border flex h-full min-h-[88px] w-full flex-col justify-center rounded-lg border border-dashed px-3 py-2 text-left">
      <div className="flex items-center gap-1.5">
        <span className="bg-muted text-muted-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-black">
          {initials(name)}
        </span>
        <span className="text-muted-foreground text-[10px] font-black uppercase tracking-wider">
          {role === 'root' ? 'Root' : otherNoun}
        </span>
      </div>
      <p className="text-card-foreground mt-1 truncate text-xs font-black" title={name}>
        {name}
      </p>
      <p className="text-muted-foreground text-[10px] font-semibold">Not in registry</p>
    </div>
  );

  if (pairs.length === 0) {
    return (
      <div className="bg-card border-border rounded-lg border p-10 text-center shadow-xs">
        <p className="text-card-foreground text-sm font-extrabold">
          No offspring recorded for this {parentNoun} yet
        </p>
        <p className="text-muted-foreground mt-1 text-xs font-medium">
          Register a chicken with {rootName} as its {parentNoun} to add it to this tree.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="bg-card border-border flex flex-col gap-2 rounded-lg border p-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="group"
          aria-label={`Filter ${parentNoun} offspring by sex`}
          className="flex flex-wrap items-center gap-1.5"
        >
          {(
            [
              ['all', `All (${totalOffspring})`],
              ['males', `Cocks (${totalMales})`],
              ['females', `Hens (${totalFemales})`],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={sexFilter === value}
              onClick={() => onSexFilterChange(value)}
              className={`min-h-9 cursor-pointer rounded-md px-2.5 py-1.5 text-xs font-bold transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:outline-none ${
                sexFilter === value
                  ? value === 'males'
                    ? 'bg-sky-600 text-white shadow-2xs'
                    : value === 'females'
                      ? 'bg-pink-600 text-white shadow-2xs'
                      : 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="text-muted-foreground flex items-center gap-1.5 text-xs font-bold">
          Sort
          <select
            aria-label={`Sort ${parentNoun} offspring`}
            value={sortBy}
            onChange={(event) => onSortChange(event.target.value as ParentTreeSortOption)}
            className="border-border bg-card text-foreground focus:border-emerald-500 h-8 cursor-pointer rounded border px-2 text-xs font-bold focus:outline-none"
          >
            <option value="males-first">Cocks first, then code</option>
            <option value="winrate">Win rate</option>
            <option value="code">Code only</option>
            <option value="age">Age</option>
            <option value="wins">Wins</option>
          </select>
        </label>
      </div>

      <div className="overflow-x-auto">
        <div className="mx-auto w-full min-w-0 space-y-5">
          {pairs.map((pair, pairIndex) => {
            const mateFowl = pair.isUnknownOther
              ? null
              : byName.get(nameKey(pair.otherName)) ?? null;
            const visibleLimit =
              showAllOffspring || revealedPairs.has(pair.key)
                ? pair.offspring.length
                : THRESHOLD;
            const visibleOffspring = pair.offspring.slice(0, visibleLimit);
            const hiddenCount = pair.offspring.length - visibleOffspring.length;
            const mateLabel = pair.isUnknownOther
              ? pair.otherName
              : `${pair.otherName}, ${mateFowl ? sexLabel(mateFowl) : otherNoun}, ${
                  mateFowl ? offspringOf(mateFowl) : 0
                } offspring`;

            return (
              <section
                key={pair.key}
                aria-label={`Pair ${pairIndex + 1}: ${rootName} and ${pair.otherName}`}
                className="border-border/70 space-y-2 border-b pb-5 last:border-b-0 last:pb-0"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">
                    Pair {pairIndex + 1}
                  </span>
                  {pair.pairCode && (
                    <span className="border-border bg-muted text-foreground rounded border px-1.5 py-0.5 font-mono text-[10px] font-black uppercase">
                      {pair.pairCode}
                    </span>
                  )}
                  <CrisscrossBadge classification={pair.crisscross} compact />
                  <span className="text-muted-foreground text-[10px] font-semibold">
                    {pair.totalOffspring} offspring · {pair.maleCount}M {pair.femaleCount}F
                  </span>
                  <WinRatePill stats={pair.stats} className="ml-auto" />
                  <button
                    type="button"
                    onClick={() => onTogglePair(pair.key)}
                    aria-expanded={pair.isOpen}
                    className="border-border bg-card text-muted-foreground hover:text-foreground min-h-8 cursor-pointer rounded border px-2 text-[10px] font-bold transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:outline-none"
                  >
                    {pair.isOpen ? 'Collapse' : `Expand (${pair.offspring.length})`}
                  </button>
                </div>

                <div className="flex flex-col items-stretch justify-center gap-2 sm:flex-row sm:items-center">
                  <div className="min-h-[88px] w-full sm:w-[230px]">
                    {rootFowl ? (
                      <LineageBirdCard
                        fowl={rootFowl}
                        code={rootCode}
                        stats={statsOf(rootFowl)}
                        offspringCount={totalOffspring}
                        isRoot
                        isSelected={selectedId === rootFowl.id}
                        label={`${rootName}, ${sexLabel(rootFowl)}, ${
                          rootCode ? `code ${formatBirdCodeForDisplay(rootCode)}` : 'no code'
                        }, root ${parentNoun}, ${totalOffspring} offspring, ${recordLabel(
                          statsOf(rootFowl),
                        )}`}
                        onClick={() => selectBird(rootFowl)}
                        testId="parent-tree-bird-card"
                      />
                    ) : (
                      renderPlaceholder(rootName, 'root')
                    )}
                  </div>

                  <div className="flex items-center justify-center">
                    <LineagePairBadge
                      sireName={kind === 'sire' ? rootName : pair.otherName}
                      damName={kind === 'dam' ? rootName : pair.otherName}
                      childCount={pair.totalOffspring}
                      crisscross={pair.crisscross}
                      onClick={() => onTogglePair(pair.key)}
                      testId="parent-tree-pair-badge"
                    />
                  </div>

                  <div className="min-h-[88px] w-full sm:w-[230px]">
                    {mateFowl ? (
                      <LineageBirdCard
                        fowl={mateFowl}
                        code={pair.otherCode || lineageBirdCode(mateFowl, codes)}
                        stats={statsOf(mateFowl)}
                        offspringCount={offspringOf(mateFowl)}
                        isSelected={selectedId === mateFowl.id}
                        label={mateLabel}
                        onClick={() => selectBird(mateFowl)}
                        testId="parent-tree-bird-card"
                      />
                    ) : (
                      renderPlaceholder(pair.otherName, 'mate')
                    )}
                  </div>
                </div>

                {pair.isOpen && (
                  <div className="mx-auto w-full max-w-3xl">
                    {pair.offspring.length === 0 ? (
                      <p className="text-muted-foreground rounded-md border border-dashed border-border px-3 py-3 text-center text-xs font-semibold">
                        No {sexFilter === 'males' ? 'cocks' : sexFilter === 'females' ? 'hens' : 'offspring'} match this filter.
                      </p>
                    ) : (
                      <div className="gt-kids">
                        {visibleOffspring.map((offspring) => {
                          const code = lineageBirdCode(offspring, codes);
                          return (
                            <div key={offspring.id} className="gt-kid">
                              <div className="min-h-[88px]">
                                <LineageBirdCard
                                  fowl={offspring}
                                  code={code}
                                  stats={statsOf(offspring)}
                                  offspringCount={offspringOf(offspring)}
                                  isSelected={selectedId === offspring.id}
                                  label={`${offspring.name}, ${sexLabel(offspring)}, ${
                                    code ? `code ${code}` : 'no code'
                                  }, ${offspringOf(offspring)} offspring, ${recordLabel(
                                    statsOf(offspring),
                                  )}`}
                                  onClick={() => selectBird(offspring)}
                                  testId="parent-tree-bird-card"
                                />
                              </div>
                            </div>
                          );
                        })}
                        {hiddenCount > 0 && (
                          <div className="gt-kid">
                            <button
                              type="button"
                              onClick={() =>
                                setRevealedPairs((prev) => {
                                  const next = new Set(prev);
                                  next.add(pair.key);
                                  return next;
                                })
                              }
                              className="bg-card border-border text-muted-foreground hover:text-foreground min-h-10 w-full cursor-pointer rounded-lg border border-dashed px-3 text-xs font-bold transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:outline-none"
                            >
                              +{hiddenCount} more
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>

      <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-semibold">
        {LEGEND.map((item) => (
          <span key={item.label} className="inline-flex items-center gap-1">
            <span className={`h-1.5 w-1.5 rounded-full ${item.dot}`} aria-hidden="true" />
            {item.label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1">
          <span className="border-border bg-card rounded-full border px-1.5 py-0.5 font-mono text-[9px] font-black">
            ⌘
          </span>
          Pair badge = offspring count
        </span>
      </div>
    </div>
  );
}
