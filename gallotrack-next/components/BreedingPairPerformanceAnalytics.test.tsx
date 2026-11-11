import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import BreedingPairPerformanceAnalytics from '@/components/BreedingPairPerformanceAnalytics';
import type { FowlRecord, PairingStats } from '@/lib/types';

function pair(overrides: Partial<PairingStats>): PairingStats {
  return {
    key: 'pair',
    sire: 'Cock Alpha',
    dam: 'Hen Beta',
    members: [{ id: 1, name: 'Chick One' } as FowlRecord],
    totalFights: 10,
    wins: 7,
    losses: 3,
    draws: 0,
    decided: 10,
    winRate: 70,
    resilienceScore: 80,
    resilienceSample: 10,
    casualties: 0,
    critical: 0,
    verdictConfidence: 'High',
    ...overrides,
  };
}

describe('BreedingPairPerformanceAnalytics labels', () => {
  it('renders Cock × Hen badge, column header and subtitle with no parent-role wording', () => {
    render(<BreedingPairPerformanceAnalytics ranked={[pair({})]} />);

    const section = screen.getByTestId('breeding-pair-analytics');
    expect(within(section).getByText('COCK × HEN MATRIX')).toBeInTheDocument();
    expect(within(section).getByText('COCK × HEN CROSS')).toBeInTheDocument();
    expect(
      within(section).getByText(/Empirical win-rate ranking per Cock × Hen cross/),
    ).toBeInTheDocument();
    expect(section).not.toHaveTextContent(/\bSire\b|\bDam\b/);
  });

  it('keeps Cock before Hen in pair rows and preserves ranking/numbers', () => {
    render(
      <BreedingPairPerformanceAnalytics
        ranked={[
          pair({
            key: 'low',
            sire: 'Cock Low',
            dam: 'Hen Low',
            wins: 4,
            losses: 6,
            totalFights: 10,
            winRate: 40,
          }),
          pair({
            key: 'high',
            sire: 'Cock High',
            dam: 'Hen High',
            wins: 9,
            losses: 1,
            totalFights: 10,
            winRate: 90,
          }),
        ]}
      />,
    );

    const rows = screen.getAllByRole('row').slice(1);
    expect(rows[0]).toHaveTextContent('Cock Low × Hen Low');
    expect(rows[0]).toHaveTextContent('4');
    expect(rows[0]).toHaveTextContent('6');
    expect(rows[0]).toHaveTextContent('40%');
    expect(rows[1]).toHaveTextContent('Cock High × Hen High');
    expect(rows[1]).toHaveTextContent('9');
    expect(rows[1]).toHaveTextContent('1');
    expect(rows[1]).toHaveTextContent('90%');
  });

  it('uses the Cock × Hen separator in the pair label placeholder', () => {
    render(<BreedingPairPerformanceAnalytics ranked={[pair({})]} />);
    expect(screen.getByText('Cock Alpha × Hen Beta')).toBeInTheDocument();
  });
});
