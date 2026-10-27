'use client';

import React from 'react';
import WinRatePill from '@/components/match/WinRatePill';
import { canFight } from '@/lib/helpers';
import type { FowlRecord } from '@/lib/types';
import type { WinRateStats } from '@/lib/win-rate';

type Props = {
  fowl?: FowlRecord | null;
  stats?: WinRateStats | null;
  className?: string;
};

/**
 * Lifetime fight record shown in the Match Logs table.
 *
 * Uses the same stats object (`buildChickenMatchStatsMap`) and the same
 * `WinRatePill` renderer as the Lineage Directory, so the percentage, W-L-D
 * and LOW SAMPLE / 1 MATCH badge can never drift between the two views.
 * Only fighting birds (cocks/stags) get a record; hens always return null.
 */
export default function MatchLogsRecordBadge({ fowl, stats, className = '' }: Props) {
  if (!fowl || !stats || !canFight(fowl)) return null;

  return (
    <span className={className} data-testid={`match-record-${fowl.id}`}>
      <WinRatePill stats={stats} />
    </span>
  );
}
