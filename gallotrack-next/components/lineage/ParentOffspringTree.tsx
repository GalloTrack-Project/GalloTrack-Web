'use client';

import React, { useMemo, useState } from 'react';
import type { FowlRecord, MatchRecord } from '@/lib/types';
import { buildOffspringIndex, nameKey } from '@/lib/family-tree';
import {
  buildChickenMatchStatsMap,
  getChickenMatchStats,
  type WinRateStats,
} from '@/lib/win-rate';
import type { CrisscrossClassification } from '@/lib/lineage';
import ParentPairBranch from './ParentPairBranch';

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
  onTogglePair: (key: string) => void;
  onPick: (fowl: FowlRecord) => void;
}

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
  onTogglePair,
  onPick,
}: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(null);

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

  const statsOf = (fowl: FowlRecord) => getChickenMatchStats(statsMap, fowl);
  const offspringOf = (fowl: FowlRecord) =>
    childIndex.get(nameKey(fowl.name))?.length ?? 0;

  const selectBird = (fowl: FowlRecord) => {
    setSelectedId(fowl.id);
    onPick(fowl);
  };

  const parentNoun = kind === 'sire' ? 'sire' : 'dam';

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
    <div className="min-w-0 space-y-2.5">
      {pairs.map((pair, index) => (
        <ParentPairBranch
          key={pair.key}
          index={index}
          kind={kind}
          rootName={rootName}
          rootCode={rootCode}
          rootFowl={rootFowl}
          pair={pair}
          mateFowl={
            pair.isUnknownOther ? null : (byName.get(nameKey(pair.otherName)) ?? null)
          }
          codes={codes}
          selectedId={selectedId}
          statsOf={statsOf}
          offspringOf={offspringOf}
          onSelect={selectBird}
          onTogglePair={() => onTogglePair(pair.key)}
          sexFilter={sexFilter}
        />
      ))}

      <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold">
        {LEGEND.map((item) => (
          <span key={item.label} className="inline-flex items-center gap-1">
            <span className={`h-1.5 w-1.5 rounded-full ${item.dot}`} aria-hidden="true" />
            {item.label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1">
          <span className="border-border bg-card rounded-full border px-1.5 py-0.5 font-mono text-xs font-black">
            ⌘
          </span>
          Pair badge = offspring count
        </span>
      </div>
    </div>
  );
}
