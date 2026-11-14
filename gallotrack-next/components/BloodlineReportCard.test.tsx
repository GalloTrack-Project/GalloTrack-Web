import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import BloodlineReportCard from './BloodlineReportCard';
import type { FowlRecord } from '@/lib/types';

const { mockReport } = vi.hoisted(() => ({
  mockReport: {
    strainType: 'foundation',
    primaryStrain: 'hatch',
    sireStrain: 'unknown',
    damStrain: 'unknown',
    crossPattern: null,
    purityPct: 100,
    generation: 0,
    generationLabel: 'Base Stock',
    hybridVigor: {
      score: 0,
      label: '—',
      description: 'Not applicable for foundation stock without recorded parents',
      factors: [],
    },
    inbreedingCoefficient: null,
    relatedness: {
      type: 'unknown',
      label: 'Unknown (foundation stock, no recorded parents)',
      secondaryLabel: 'kulang sa datos',
      fullLabel: 'Unknown (foundation stock, no recorded parents) · kulang sa datos',
      relationship: 'Foundation stock (no recorded parents)',
      sharedAncestors: [],
      inbreedingCoefficient: null,
      tooltip: 'No recorded parents available to determine relatedness.',
      isCloseBreeding: false,
      requiresConfirmation: false,
    },
    colorReport: null,
    breedCompliance: null,
    heritability: {
      overall: 30,
      label: 'Low Predictability',
      factors: ['Sire lineage incomplete', 'Dam lineage incomplete'],
    },
    performanceBenchmark: null,
    confidence: 50,
  },
}));

vi.mock('@/lib/context', () => ({
  useGaloTrack: () => ({
    generateBloodlineReport: () => mockReport,
  }),
}));

const foundationFowl = {
  id: 1,
  name: 'Foundation Bird',
  breed: 'Kelso',
  gender: 'Rooster',
  sire: '',
  dam: '',
} as FowlRecord;

describe('BloodlineReportCard', () => {
  it('shows a compact, title-cased summary with readable parentage', () => {
    render(<BloodlineReportCard fowl={foundationFowl} />);

    expect(screen.getByText('Foundation')).toBeInTheDocument();
    expect(screen.getByText('Hatch')).toBeInTheDocument();
    expect(screen.getByText('Base Stock')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.queryByText('FOUNDATION')).not.toBeInTheDocument();
    expect(screen.queryByText('hatch')).not.toBeInTheDocument();

    const parentage = screen.getByTestId('bloodline-parentage');
    expect(within(parentage).getByText('Unknown')).toBeInTheDocument();
    expect(
      within(parentage).getByText('Foundation stock, no recorded parents'),
    ).toBeInTheDocument();
  });

  it('reveals the detailed sections on demand', () => {
    render(<BloodlineReportCard fowl={foundationFowl} />);

    expect(screen.queryByText('Sire Strain')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /show bloodline report details/i }));

    expect(screen.getByText('Sire Strain')).toBeInTheDocument();
    expect(screen.getByText('Dam Strain')).toBeInTheDocument();
    expect(screen.getByText('Heritability')).toBeInTheDocument();
  });
});
