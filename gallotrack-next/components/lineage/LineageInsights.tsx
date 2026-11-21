'use client';

import { Lightbulb, Link2, Mars, Repeat2, Venus } from 'lucide-react';
import type { WinRateStats } from '@/lib/win-rate';
import { useT } from '@/lib/i18n';
import LineageRecordPill from './LineageRecordPill';

export interface LineageInsightsProps {
  rootNames: string;
  birdCount: number;
  generationCount: number;
  pairCount: number;
  cocksFought: number;
  cocksShown: number;
  combinedRecord: WinRateStats;
}

export default function LineageInsights({
  rootNames,
  birdCount,
  generationCount,
  pairCount,
  cocksFought,
  cocksShown,
  combinedRecord,
}: LineageInsightsProps) {
  const t = useT();

  return (
    <div className="space-y-4" data-testid="lineage-insights">
      <div>
        <h2 className="text-card-foreground text-sm font-black">
          {t('lineageDirectory.insightsTitle')}
        </h2>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed font-semibold">
          {t('lineageDirectory.insightsSummary', { names: rootNames || '—' })}
        </p>
      </div>

      <dl className="border-border grid grid-cols-2 gap-2 border-t pt-3">
        <div className="bg-muted/45 rounded-lg p-2">
          <dt className="text-muted-foreground text-[9px] font-black tracking-wider uppercase">
            {t('lineageDirectory.birdsShown')}
          </dt>
          <dd className="text-card-foreground text-lg font-black tabular-nums">{birdCount}</dd>
        </div>
        <div className="bg-muted/45 rounded-lg p-2">
          <dt className="text-muted-foreground text-[9px] font-black tracking-wider uppercase">
            {t('lineageDirectory.generationsShown')}
          </dt>
          <dd className="text-card-foreground text-lg font-black tabular-nums">{generationCount}</dd>
        </div>
        <div className="bg-muted/45 rounded-lg p-2">
          <dt className="text-muted-foreground text-[9px] font-black tracking-wider uppercase">
            {t('lineageDirectory.breedingPairs')}
          </dt>
          <dd className="text-card-foreground text-lg font-black tabular-nums">{pairCount}</dd>
        </div>
        <div className="bg-muted/45 rounded-lg p-2">
          <dt className="text-muted-foreground text-[9px] font-black tracking-wider uppercase">
            {t('lineageDirectory.cocksFought')}
          </dt>
          <dd className="text-card-foreground text-lg font-black tabular-nums">
            {cocksFought} / {cocksShown}
          </dd>
        </div>
      </dl>

      <div className="border-border border-t pt-3">
        <p className="text-muted-foreground text-[9px] font-black tracking-wider uppercase">
          {t('lineageDirectory.combinedRecord')}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <LineageRecordPill stats={combinedRecord} compact={false} />
          {combinedRecord.isLowSample && (
            <span className="text-muted-foreground text-[10px] font-semibold">
              {t('heritage.smallSampleNote')}
            </span>
          )}
        </div>
      </div>

      <div className="border-border border-t pt-3">
        <p className="text-muted-foreground text-[9px] font-black tracking-wider uppercase">
          {t('lineageDirectory.legend')}
        </p>
        <ul className="text-muted-foreground mt-2 space-y-1.5 text-xs font-semibold">
          <li className="flex items-center gap-2">
            <Mars className="text-cock h-3.5 w-3.5" aria-hidden="true" />
            {t('lineageDirectory.legendCock')}
          </li>
          <li className="flex items-center gap-2">
            <Venus className="text-hen h-3.5 w-3.5" aria-hidden="true" />
            {t('lineageDirectory.legendHen')}
          </li>
          <li className="flex items-center gap-2">
            <Link2 className="text-low-sample h-3.5 w-3.5" aria-hidden="true" />
            {t('lineageDirectory.legendBreedingPair')}
          </li>
          <li className="flex items-center gap-2">
            <Repeat2 className="text-primary h-3.5 w-3.5" aria-hidden="true" />
            {t('lineageDirectory.legendCrisscrossPair')}
          </li>
          <li className="flex items-center gap-2">
            <span className="border-border bg-muted rounded border px-1 text-[9px] font-black">
              +N
            </span>
            {t('lineageDirectory.legendHidden')}
          </li>
        </ul>
      </div>

      <div className="border-primary/15 bg-accent-soft text-foreground flex gap-2 rounded-lg border p-2.5 text-xs font-semibold">
        <Lightbulb className="text-primary mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <p className="min-w-0">{t('lineageDirectory.insightsTip')}</p>
      </div>
    </div>
  );
}
