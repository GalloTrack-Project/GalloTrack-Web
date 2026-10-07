'use client';

import React from 'react';
import { computeWinRate, getWinRatePillClasses, type WinRateStats } from '@/lib/win-rate';

interface WinRatePillProps {
  wins?: number;
  losses?: number;
  draws?: number;
  stats?: WinRateStats;
  showNoFights?: boolean;
  size?: 'sm' | 'md';
  onClick?: () => void;
  className?: string;
}

export default function WinRatePill({
  wins = 0,
  losses = 0,
  draws = 0,
  stats: propStats,
  showNoFights = true,
  size = 'sm',
  onClick,
  className = '',
}: WinRatePillProps) {
  const stats = propStats || computeWinRate(wins, losses, draws);

  if (stats.decided === 0) {
    if (!showNoFights) return null;
    return (
      <span className={`text-xs font-bold text-muted-foreground/60 ${className}`}>
        No fights
      </span>
    );
  }

  const pillClass = getWinRatePillClasses(stats);
  const sizeClass = size === 'md' ? 'text-xs px-2.5 py-1' : 'text-xs px-2 py-0.5';

  const content = (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-black whitespace-nowrap transition-colors ${pillClass} ${sizeClass} ${
        onClick ? 'cursor-pointer hover:opacity-85' : ''
      } ${className}`}
      title={
        stats.isLowSample
          ? `${stats.winRate}% win rate (${stats.wins}W-${stats.losses}L) · Small sample size (${stats.decided} ${
              stats.decided === 1 ? 'fight' : 'fights'
            })`
          : `${stats.winRate}% win rate (${stats.wins}W-${stats.losses}L)`
      }
    >
      <span>
        {stats.winRate}% · {stats.wins}W-{stats.losses}L
        {stats.draws > 0 ? `-${stats.draws}D` : ''}
      </span>
      {stats.isLowSample && (
        <span
          className="text-[9px] font-bold uppercase tracking-wider px-1 py-0.2 rounded bg-black/5 dark:bg-white/10 text-muted-foreground select-none"
          title="Small sample size (< 3 decided matches)"
        >
          {stats.decided === 1 ? '1 fight' : 'low sample'}
        </span>
      )}
    </span>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="inline-flex cursor-pointer focus:outline-hidden"
        aria-label={`View fights for ${stats.wins}W-${stats.losses}L record`}
      >
        {content}
      </button>
    );
  }

  return content;
}
