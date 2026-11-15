import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import RelatednessBadge from './RelatednessBadge';
import BreedingTypeBadge from './BreedingTypeBadge';
import type { BreedingClassification } from '@/lib/breeding-classification';
import type { RelatednessClassification } from '@/lib/relatedness-classification';

const outcross: RelatednessClassification = {
  type: 'outcross',
  label: 'Outcross (no known shared ancestor)',
  secondaryLabel: 'hindi magka-anak',
  fullLabel: 'Outcross (no known shared ancestor)',
  relationship: 'No shared ancestor within search depth',
  sharedAncestors: [],
  inbreedingCoefficient: 0,
  tooltip: 'Based on recorded lineage only.',
  isCloseBreeding: false,
  requiresConfirmation: false,
};

const crossbred: BreedingClassification = {
  type: 'Crossbred',
  purityPct: 50,
  dominantBreed: 'Hatch',
  derivedBreed: 'Hatch × Lemon',
  badgeLabel: 'Crossbred · 50% Hatch / 50% Lemon',
  summary: '50% Hatch / 50% Lemon',
  topBreeds: [
    { strain: 'Hatch', pct: 50 },
    { strain: 'Lemon', pct: 50 },
  ],
  allBreeds: [
    { strain: 'Hatch', pct: 50 },
    { strain: 'Lemon', pct: 50 },
  ],
  extraBreedsCount: 0,
  tooltipText: 'Crossbred from recorded parents.',
  compositionSource: 'assumed',
  basedOnAssumed: true,
  sourceLabel: 'Assumed from registered breed (not verified)',
};

describe('profile badge wrapping', () => {
  it('shows the short Outcross label with the full tooltip and aria-label', () => {
    render(<RelatednessBadge classification={outcross} compact />);

    const badge = screen.getByText('Outcross').closest('[data-relatedness-badge]');
    expect(badge).not.toBeNull();
    expect(badge).toHaveAttribute('title', expect.stringContaining('recorded lineage'));
    expect(badge?.getAttribute('aria-label')).toContain('Outcross');
    expect(badge?.getAttribute('aria-label')).toContain('recorded lineage');
    expect(badge?.className).toContain('max-w-full');
    expect(badge?.className).toContain('min-w-0');
    expect(badge?.className).toContain('whitespace-normal');
    expect(badge?.className).toContain('[overflow-wrap:anywhere]');
    expect(badge?.className).not.toContain('shrink-0');
  });

  it('wraps a long Crossbred badge without nowrap or fixed sizing', () => {
    render(<BreedingTypeBadge classification={crossbred} />);

    const badge = screen.getByText(/Crossbred/).closest('[data-breeding-badge]');
    expect(badge).not.toBeNull();
    expect(badge?.className).toContain('max-w-full');
    expect(badge?.className).toContain('min-w-0');
    expect(badge?.className).toContain('flex-wrap');
    expect(badge?.className).toContain('whitespace-normal');
    expect(badge?.className).toContain('[overflow-wrap:anywhere]');
    expect(badge?.className).not.toContain('whitespace-nowrap');
    expect(badge?.className).not.toMatch(/\bw-\[/);
    expect(badge?.getAttribute('title')).toContain('Assumed');
  });
});
