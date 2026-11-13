'use client';

import React from 'react';
import type { FowlRecord } from '@/lib/types';
import { canFight, sexLabel } from '@/lib/helpers';
import type { WinRateStats } from '@/lib/win-rate';
import ChickenPhoto from '@/components/ChickenPhoto';
import CrisscrossBadge from '@/components/CrisscrossBadge';
import type { CrisscrossClassification } from '@/lib/lineage';

export const STATUS_DOT: Record<string, string> = {
  Active: 'bg-emerald-500',
  Archived: 'bg-amber-400',
  Deceased: 'bg-rose-400',
};

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function recordLabel(stats?: WinRateStats): string {
  if (!stats || stats.total === 0) return 'No fights';
  const draw = stats.draws > 0 ? `-${stats.draws}D` : '';
  const rate = stats.winRate === null ? '—' : `${stats.winRate}%`;
  return `${stats.wins}W-${stats.losses}L${draw} · ${rate}`;
}

export function sexTone(fowl: FowlRecord): string {
  return sexLabel(fowl) === 'Hen'
    ? 'text-pink-600 dark:text-pink-400'
    : sexLabel(fowl) === 'Cock'
      ? 'text-sky-600 dark:text-sky-400'
      : 'text-muted-foreground';
}

export function sexGlyph(fowl: FowlRecord): string {
  return sexLabel(fowl) === 'Hen' ? '♀' : sexLabel(fowl) === 'Cock' ? '♂' : '';
}

export interface LineageBirdCardProps {
  fowl: FowlRecord;
  code: string;
  stats: WinRateStats;
  offspringCount: number;
  isRoot?: boolean;
  isSelected?: boolean;
  isHighlighted?: boolean;
  isDimmed?: boolean;
  crisscross?: { classification: CrisscrossClassification; pairName: string | null } | null;
  label: string;
  title?: string;
  onClick: () => void;
  onDoubleClick?: () => void;
  dataNodeId?: string;
  testId?: string;
  className?: string;
}

export default function LineageBirdCard({
  fowl,
  code,
  stats,
  offspringCount,
  isRoot = false,
  isSelected = false,
  isHighlighted = false,
  isDimmed = false,
  crisscross = null,
  label,
  title,
  onClick,
  onDoubleClick,
  dataNodeId,
  testId = 'lineage-bird-card',
  className = '',
}: LineageBirdCardProps) {
  const fightsEnabled = canFight(fowl);

  return (
    <button
      type="button"
      data-testid={testId}
      data-node-id={dataNodeId}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      aria-label={label}
      aria-pressed={isSelected}
      title={
        title ??
        `${fowl.name} · ${code || 'no code'} · ${sexLabel(fowl)} · ${
          offspringCount > 0 ? `${offspringCount} offspring` : 'no registered offspring'
        }`
      }
      className={`bg-card group flex h-full w-full cursor-pointer flex-col rounded-lg border px-2.5 py-2 text-left shadow-xs transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:outline-none ${
        isSelected
          ? 'border-emerald-500 ring-2 ring-emerald-500/40'
          : isHighlighted
            ? 'border-amber-400 ring-2 ring-amber-400/40'
            : 'border-border hover:border-emerald-400'
      } ${isRoot ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : ''} ${
        isDimmed ? 'opacity-40 saturate-50' : ''
      } ${className}`}
    >
      <div className="flex items-center gap-1.5">
        <ChickenPhoto
          name={fowl.name}
          code={code}
          imageUrl={fowl.image_url}
          photoPath={fowl.photo_path}
          photoThumbPath={fowl.photo_thumb_path}
          size={24}
          className="border-border h-6 w-6"
          fallback={
            <span
              className={`flex h-full w-full items-center justify-center text-[9px] font-black ${
                sexLabel(fowl) === 'Hen'
                  ? 'bg-pink-50 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300'
                  : 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300'
              }`}
              aria-hidden="true"
            >
              {initials(fowl.name)}
            </span>
          }
        />
        {code && (
          <span className="border-border bg-muted text-foreground shrink-0 rounded border px-1 py-0.5 font-mono text-[10px] font-black uppercase">
            {code}
          </span>
        )}
        {crisscross?.classification.isCrisscross && (
          <CrisscrossBadge
            classification={crisscross.classification}
            pairName={crisscross.pairName}
            compact
            className="px-1"
          />
        )}
        <span className={`shrink-0 text-[10px] font-black ${sexTone(fowl)}`}>
          {sexGlyph(fowl)} {sexLabel(fowl)}
        </span>
        <span
          className={`ml-auto h-1.5 w-1.5 shrink-0 rounded-full ${
            STATUS_DOT[fowl.status] || 'bg-muted-foreground'
          }`}
          title={fowl.status}
        />
        {isRoot && (
          <span className="text-[9px] font-black tracking-wider text-emerald-700 uppercase dark:text-emerald-400">
            Root
          </span>
        )}
      </div>
      <p
        className="text-card-foreground mt-1 line-clamp-2 text-xs leading-tight font-black"
        title={fowl.name}
      >
        {fowl.name}
      </p>
      <div className="text-muted-foreground mt-auto flex items-center justify-between gap-1 pt-1 text-[10px] font-semibold">
        <span className="truncate">
          {offspringCount > 0 ? `${offspringCount} offspring` : fowl.breed || 'No offspring'}
        </span>
        <span className="shrink-0">{fightsEnabled ? recordLabel(stats) : ''}</span>
      </div>
    </button>
  );
}
