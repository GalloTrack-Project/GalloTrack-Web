'use client';

import React, { useState } from 'react';
import type { FowlRecord } from '@/lib/types';
import type { WinRateStats } from '@/lib/win-rate';
import { sexLabel } from '@/lib/helpers';
import { formatBirdCodeForDisplay } from '@/lib/bird-code';
import { lineageBirdCode } from '@/lib/lineage-graph';
import WinRatePill from '@/components/match/WinRatePill';
import CrisscrossBadge from '@/components/CrisscrossBadge';
import LineageBirdCard, { initials, recordLabel } from './LineageBirdCard';
import LineagePairBadge from './LineagePairBadge';
import type { ParentTreePair } from './ParentOffspringTree';

const CHILD_LIMIT = 8;

type Props = {
  index: number;
  kind: 'sire' | 'dam';
  rootName: string;
  rootCode: string;
  rootFowl: FowlRecord | null;
  pair: ParentTreePair;
  mateFowl: FowlRecord | null;
  codes: Map<string, string>;
  selectedId: number | null;
  statsOf: (fowl: FowlRecord) => WinRateStats;
  offspringOf: (fowl: FowlRecord) => number;
  onSelect: (fowl: FowlRecord) => void;
  onTogglePair: () => void;
  sexFilter: 'all' | 'males' | 'females';
};

export default function ParentPairBranch({
  index,
  kind,
  rootName,
  rootCode,
  rootFowl,
  pair,
  mateFowl,
  codes,
  selectedId,
  statsOf,
  offspringOf,
  onSelect,
  onTogglePair,
  sexFilter,
}: Props) {
  const [showAll, setShowAll] = useState(false);
  const parentNoun = kind === 'sire' ? 'sire' : 'dam';
  const otherNoun = kind === 'sire' ? 'dam' : 'sire';
  const visibleOffspring = showAll ? pair.offspring : pair.offspring.slice(0, CHILD_LIMIT);
  const hiddenCount = pair.offspring.length - visibleOffspring.length;
  const mateLabel = pair.isUnknownOther
    ? pair.otherName
    : `${pair.otherName}, ${mateFowl ? sexLabel(mateFowl) : otherNoun}, ${
        mateFowl ? offspringOf(mateFowl) : 0
      } offspring`;

  return (
    <section
      aria-label={`Pair ${index + 1}: ${rootName} and ${pair.otherName}`}
      className="border-border space-y-2 rounded-lg border p-2.5 sm:p-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-xs font-black tracking-widest uppercase">
          Pair {index + 1}
        </span>
        {pair.pairCode && (
          <span className="border-border bg-muted text-foreground rounded border px-1.5 py-0.5 font-mono text-xs font-black uppercase">
            {pair.pairCode}
          </span>
        )}
        <CrisscrossBadge classification={pair.crisscross} compact />
        <span className="text-muted-foreground text-xs font-semibold">
          {pair.maleCount}M {pair.femaleCount}F
        </span>
        <WinRatePill stats={pair.stats} className="ml-auto" />
        <button
          type="button"
          onClick={onTogglePair}
          aria-expanded={pair.isOpen}
          className="border-border bg-card text-muted-foreground hover:text-foreground min-h-11 cursor-pointer rounded border px-3 text-xs font-bold transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:outline-none sm:min-h-8"
        >
          {pair.isOpen ? 'Collapse' : `Expand (${pair.offspring.length})`}
        </button>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
        <div className="min-h-[82px] w-full">
          {rootFowl ? (
            <LineageBirdCard
              fowl={rootFowl}
              code={rootCode}
              stats={statsOf(rootFowl)}
              offspringCount={pair.totalOffspring}
              isRoot
              isSelected={selectedId === rootFowl.id}
              label={`${rootName}, ${sexLabel(rootFowl)}, ${
                rootCode ? `code ${formatBirdCodeForDisplay(rootCode)}` : 'no code'
              }, root ${parentNoun}, ${pair.totalOffspring} offspring, ${recordLabel(
                statsOf(rootFowl),
              )}`}
              onClick={() => onSelect(rootFowl)}
              testId="parent-tree-bird-card"
            />
          ) : (
            <div className="bg-card border-border flex h-full min-h-[82px] w-full flex-col justify-center rounded-lg border border-dashed px-3 py-2 text-left">
              <div className="flex items-center gap-1.5">
                <span className="bg-muted text-muted-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black">
                  {initials(rootName)}
                </span>
                <span className="text-muted-foreground text-xs font-black tracking-wider uppercase">
                  Root
                </span>
              </div>
              <p className="text-card-foreground mt-1 truncate text-xs font-black" title={rootName}>
                {rootName}
              </p>
              <p className="text-muted-foreground text-xs font-semibold">Not in registry</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center">
          <LineagePairBadge
            sireName={kind === 'sire' ? rootName : pair.otherName}
            damName={kind === 'dam' ? rootName : pair.otherName}
            childCount={pair.totalOffspring}
            crisscross={pair.crisscross}
            onClick={onTogglePair}
            className="!text-xs min-h-11 px-3 sm:min-h-7 sm:px-2"
            testId="parent-tree-pair-badge"
          />
        </div>

        <div className="min-h-[82px] w-full">
          {mateFowl ? (
            <LineageBirdCard
              fowl={mateFowl}
              code={pair.otherCode || lineageBirdCode(mateFowl, codes)}
              stats={statsOf(mateFowl)}
              offspringCount={offspringOf(mateFowl)}
              isSelected={selectedId === mateFowl.id}
              label={mateLabel}
              onClick={() => onSelect(mateFowl)}
              testId="parent-tree-bird-card"
            />
          ) : (
            <div className="bg-card border-border flex h-full min-h-[82px] w-full flex-col justify-center rounded-lg border border-dashed px-3 py-2 text-left">
              <div className="flex items-center gap-1.5">
                <span className="bg-muted text-muted-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black">
                  {initials(pair.otherName)}
                </span>
                <span className="text-muted-foreground text-xs font-black tracking-wider uppercase">
                  {otherNoun}
                </span>
              </div>
              <p
                className="text-card-foreground mt-1 truncate text-xs font-black"
                title={pair.otherName}
              >
                {pair.otherName}
              </p>
              <p className="text-muted-foreground text-xs font-semibold">Not in registry</p>
            </div>
          )}
        </div>
      </div>

      {pair.isOpen && (
        <div className="min-w-0">
          {pair.offspring.length === 0 ? (
            <p className="text-muted-foreground border-border rounded-md border border-dashed px-3 py-3 text-center text-xs font-semibold">
              No {sexFilter === 'males' ? 'cocks' : sexFilter === 'females' ? 'hens' : 'offspring'}{' '}
              match this filter.
            </p>
          ) : (
            <>
              <div
                data-testid="parent-offspring-grid"
                className="grid gap-2"
                style={{
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 9.5rem), 1fr))',
                }}
              >
                {visibleOffspring.map((offspring) => {
                  const code = lineageBirdCode(offspring, codes);
                  return (
                    <div key={offspring.id} className="min-h-[78px] min-w-0">
                      <LineageBirdCard
                        fowl={offspring}
                        code={code}
                        stats={statsOf(offspring)}
                        offspringCount={offspringOf(offspring)}
                        isSelected={selectedId === offspring.id}
                        label={`${offspring.name}, ${sexLabel(offspring)}, ${
                          code ? `code ${code}` : 'no code'
                        }, ${offspringOf(offspring)} offspring, ${recordLabel(statsOf(offspring))}`}
                        onClick={() => onSelect(offspring)}
                        testId="parent-tree-bird-card"
                      />
                    </div>
                  );
                })}
                {hiddenCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAll(true)}
                    className="bg-card border-border text-muted-foreground hover:text-foreground min-h-[78px] w-full cursor-pointer rounded-lg border border-dashed px-3 text-xs font-bold transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:outline-none"
                  >
                    +{hiddenCount} more
                  </button>
                )}
              </div>
              {showAll && pair.offspring.length > CHILD_LIMIT && (
                <button
                  type="button"
                  onClick={() => setShowAll(false)}
                  className="text-muted-foreground hover:text-foreground mt-2 min-h-9 cursor-pointer rounded px-2 text-xs font-bold underline-offset-2 hover:underline"
                >
                  Show fewer
                </button>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
