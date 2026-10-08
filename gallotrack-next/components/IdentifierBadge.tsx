'use client';

import React from 'react';
import type { FowlRecord } from '@/lib/types';
import { formatBirdCodeForDisplay, birdCodeOf } from '@/lib/bird-code';

export interface IdentifierBadgeProps {
  code?: string | null;
  fowl?: FowlRecord | null;
  allFowls?: FowlRecord[];
  codes?: Map<string, string>;
  className?: string;
  showBrackets?: boolean;
  highlightQuery?: string;
}

/**
 * Single source of truth for rendering chicken identifier badges across GalloTrack.
 *
 * Examples:
 *   Sires     -> [1], [2], [3]
 *   Dams      -> [A], [B], [C]
 *   Offspring -> [1A1], [1A2], [2B1]
 */
export default function IdentifierBadge({
  code: propCode,
  fowl,
  allFowls = [],
  codes,
  className = '',
  showBrackets = true,
}: IdentifierBadgeProps) {
  let resolvedCode = propCode;

  if (!resolvedCode && fowl) {
    if (codes && codes.has(String(fowl.id))) {
      resolvedCode = codes.get(String(fowl.id));
    } else if (fowl.chicken_code || fowl.bird_code || fowl.birth_code) {
      resolvedCode = fowl.chicken_code || fowl.bird_code || fowl.birth_code;
    } else if (allFowls.length > 0) {
      resolvedCode = birdCodeOf(fowl, allFowls);
    }
  }

  const display = formatBirdCodeForDisplay(resolvedCode || '');
  if (!display) {
    return showBrackets ? (
      <span className={`font-mono text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border font-bold uppercase select-none ${className}`}>
        [—]
      </span>
    ) : (
      <span className={`font-mono text-xs text-muted-foreground font-bold select-none ${className}`}>
        —
      </span>
    );
  }

  const content = showBrackets ? `[${display}]` : display;

  return (
    <span
      className={`font-mono text-xs px-1.5 py-0.5 rounded bg-muted text-foreground border border-border font-bold uppercase shrink-0 tracking-tight ${className}`}
    >
      {content}
    </span>
  );
}
