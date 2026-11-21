'use client';

import { formatWinRatePct, type WinRateStats } from '@/lib/win-rate';
import { useT } from '@/lib/i18n';
import { cn } from '@/components/ui/utils';

export default function LineageRecordPill({
  stats,
  compact = true,
  className,
}: {
  stats: WinRateStats;
  compact?: boolean;
  className?: string;
}) {
  const t = useT();

  if (stats.decided === 0) {
    return (
      <span
        className={cn(
          'border-border bg-muted/60 text-muted-foreground inline-flex max-w-full items-center rounded-full border font-black',
          compact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-1 text-[11px]',
          className,
        )}
      >
        <span className="truncate">
          {formatWinRatePct(stats)}
          {stats.draws > 0 ? ` · ${stats.draws}D` : ''}
        </span>
      </span>
    );
  }

  const tone = stats.isLowSample
    ? 'border-low-sample/25 bg-low-sample-bg text-low-sample'
    : stats.winRate !== null && stats.winRate < 40
      ? 'border-loss/20 bg-loss-bg text-loss'
      : 'border-win/20 bg-win-bg text-win';

  return (
    <span
      className={cn(
        'inline-flex max-w-full flex-wrap items-center gap-1 rounded-full border font-black',
        compact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-1 text-[11px]',
        tone,
        className,
      )}
      title={`${formatWinRatePct(stats)} · ${stats.wins}W-${stats.losses}L${
        stats.draws > 0 ? `-${stats.draws}D` : ''
      }`}
    >
      <span className="truncate">
        {formatWinRatePct(stats)} · {stats.wins}W-{stats.losses}L
        {stats.draws > 0 ? `-${stats.draws}D` : ''}
      </span>
      {stats.isLowSample && (
        <span className="bg-background/65 rounded px-1 text-[8px] tracking-wide uppercase">
          {stats.decided === 1 ? t('heritage.oneMatch') : t('heritage.lowSample')}
        </span>
      )}
    </span>
  );
}
