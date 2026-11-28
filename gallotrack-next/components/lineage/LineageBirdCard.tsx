'use client';

import React from 'react';
import { CircleHelp, Mars, Venus } from 'lucide-react';
import type { FowlRecord } from '@/lib/types';
import { canFight, sexLabel } from '@/lib/helpers';
import type { WinRateStats } from '@/lib/win-rate';
import ChickenPhoto from '@/components/ChickenPhoto';
import CrisscrossBadge from '@/components/CrisscrossBadge';
import type { CrisscrossClassification } from '@/lib/lineage';
import { useT } from '@/lib/i18n';
import { featherColorOf } from '@/lib/lineage-filters';
import LineageRecordPill from './LineageRecordPill';
import LineageStatusBadge from './LineageStatusBadge';

export const STATUS_DOT: Record<string, string> = {
  Active: 'bg-win',
  Archived: 'bg-low-sample',
  Deceased: 'bg-loss',
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
  const label = sexLabel(fowl);
  if (label === 'Hen') return 'text-hen';
  if (label === 'Cock') return 'text-cock';
  return 'text-muted-foreground';
}

export function sexGlyph(fowl: FowlRecord): string {
  return sexLabel(fowl) === 'Hen' ? 'F' : sexLabel(fowl) === 'Cock' ? 'M' : '';
}

export function SexMark({
  fowl,
  className = '',
  showWord = true,
}: {
  fowl: Pick<FowlRecord, 'gender'>;
  className?: string;
  showWord?: boolean;
}) {
  const label = sexLabel(fowl);
  const Icon = label === 'Hen' ? Venus : label === 'Cock' ? Mars : CircleHelp;
  const tone = label === 'Hen' ? 'text-hen' : label === 'Cock' ? 'text-cock' : 'text-muted-foreground';
  return (
    <span className={`inline-flex min-w-0 items-center gap-1 font-black ${tone} ${className}`}>
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      {showWord && <span className="truncate">{label}</span>}
    </span>
  );
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
  const t = useT();
  const fightsEnabled = canFight(fowl);
  const feather = featherColorOf(fowl);
  const wingBand = fightsEnabled ? (fowl.wing_band || '').trim() : '';

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
        `${fowl.name} · ${code || t('lineageDirectory.noCode')} · ${sexLabel(fowl)} · ${
          offspringCount > 0
            ? `${offspringCount} ${t('lineageDirectory.offspringLabel').toLowerCase()}`
            : t('lineageDirectory.noRegisteredOffspring')
        }`
      }
      className={`bg-card group relative flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-xl border p-2.5 text-left shadow-xs transition-[border-color,box-shadow,opacity] focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none ${
        isSelected
          ? 'border-brand-orange ring-2 ring-brand-orange/45'
          : isHighlighted
            ? 'border-brand-orange/70 ring-2 ring-brand-orange/25'
            : 'border-border hover:border-brand-orange/60'
      } ${isRoot ? 'bg-accent-soft/35 border-primary/30' : ''} ${
        isDimmed ? 'opacity-40 saturate-50' : ''
      } ${className}`}
    >
      <div className="flex min-w-0 items-start gap-2">
        <ChickenPhoto
          name={fowl.name}
          code={code}
          imageUrl={fowl.image_url}
          photoPath={fowl.photo_path}
          photoThumbPath={fowl.photo_thumb_path}
          size={56}
          shape="square"
          interactive={false}
          className="border-border h-14 w-14 shrink-0 rounded-lg border"
          fallback={
            <span
              className={`flex h-full w-full items-center justify-center text-[11px] font-black ${
                sexLabel(fowl) === 'Hen'
                  ? 'bg-hen-bg text-hen'
                  : 'bg-cock-bg text-cock'
              }`}
              aria-hidden="true"
            >
              {initials(fowl.name)}
            </span>
          }
          unavailableFallback={
            <span className="text-muted-foreground flex h-full w-full items-center justify-center p-0.5 text-center text-[7px] leading-tight font-bold break-words">
              {t('registry.cardPhotoUnavailable')}
            </span>
          }
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-w-0 items-start gap-1">
            <p
              className="text-card-foreground line-clamp-2 min-w-0 flex-1 text-xs leading-tight font-black"
              title={fowl.name}
            >
              {fowl.name}
            </p>
            {isRoot && (
              <span className="bg-primary text-primary-foreground shrink-0 rounded px-1 py-0.5 text-[8px] font-black tracking-wider uppercase">
                {t('lineageDirectory.rootTag')}
              </span>
            )}
          </div>

          <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-1">
            <SexMark fowl={fowl} className="text-[9px]" />
            {code && (
              <span className="border-border bg-muted text-foreground shrink-0 rounded border px-1 py-0.5 font-mono text-[9px] font-black uppercase">
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
          </div>

          <p className="text-muted-foreground mt-0.5 truncate text-[9px] font-semibold" title={feather}>
            {feather || '—'}
          </p>
          {wingBand && (
            <p className="text-muted-foreground truncate text-[9px] font-semibold" title={wingBand}>
              {t('lineageDirectory.wingBand', { band: wingBand })}
            </p>
          )}
        </div>
      </div>

      <div className="mt-auto flex min-w-0 items-center justify-between gap-1 pt-1.5">
        <div className="flex min-w-0 items-center gap-1">
          <LineageStatusBadge fowl={fowl} compact />
          <span className="text-muted-foreground shrink-0 text-[9px] font-bold">
            {offspringCount} {t('lineageDirectory.offspringLabel').toLowerCase()}
          </span>
        </div>
        {fightsEnabled &&
          (stats.total > 0 ? (
            <LineageRecordPill stats={stats} compact className="shrink-0" />
          ) : (
            <span className="text-muted-foreground shrink-0 text-[9px] font-bold">
              {t('lineageDirectory.noFights')}
            </span>
          ))}
      </div>
    </button>
  );
}
