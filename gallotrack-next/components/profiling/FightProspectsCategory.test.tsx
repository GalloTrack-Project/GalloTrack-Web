import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FowlLists from './FowlLists';
import type { FowlRecord, MatchRecord } from '@/lib/types';

const replaceMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn(), back: vi.fn() }),
  usePathname: () => '/profiling',
}));

const mockProspects: FowlRecord[] = [
  // Foundation parents (needed for lineage context)
  { id: 1, name: 'Iron Lemon', breed: 'Lemon', gender: 'Rooster', status: 'Active', registry_role: 'Breeding Male' } as FowlRecord,
  { id: 2, name: 'Golden Pearl', breed: 'Lemon', gender: 'Hen', status: 'Active', registry_role: 'Breeding Female' } as FowlRecord,
  { id: 3, name: 'Titan Sweater', breed: 'Sweater', gender: 'Rooster', status: 'Active', registry_role: 'Breeding Male' } as FowlRecord,
  { id: 4, name: 'Sunrise Queen', breed: 'Sweater', gender: 'Hen', status: 'Active', registry_role: 'Breeding Female' } as FowlRecord,

  // Offspring in Fight Prospects (tab: 'offspring')
  // 1. Offspring with fights & breeding_role: 'none'
  {
    id: 10,
    name: 'Lemon Storm',
    breed: 'Lemon',
    gender: 'Rooster',
    sire: 'Iron Lemon',
    dam: 'Golden Pearl',
    bird_code: '1A1',
    wing_band: 'WB-10',
    status: 'Active',
    breeding_role: 'none',
  } as FowlRecord,
  // 2. Offspring without fights & breeding_role: 'none'
  {
    id: 11,
    name: 'Lemon Blaze',
    breed: 'Lemon',
    gender: 'Rooster',
    sire: 'Iron Lemon',
    dam: 'Golden Pearl',
    bird_code: '1A2',
    wing_band: 'WB-11',
    status: 'Active',
    breeding_role: 'none',
  } as FowlRecord,
  // 3. Offspring without fights & breeding_role: 'material' (Sire Material prospect)
  {
    id: 12,
    name: 'Sweater Bolt',
    breed: 'Sweater',
    gender: 'Rooster',
    sire: 'Titan Sweater',
    dam: 'Sunrise Queen',
    bird_code: '2B1',
    wing_band: 'WB-12',
    status: 'Active',
    breeding_role: 'material',
  } as FowlRecord,
  // 4. Offspring with fights & breeding_role: 'material'
  {
    id: 13,
    name: 'Hatch Silver',
    breed: 'Hatch',
    gender: 'Rooster',
    sire: 'Iron Lemon',
    dam: 'Sunrise Queen',
    bird_code: '1B1',
    wing_band: 'WB-13',
    status: 'Active',
    breeding_role: 'material',
  } as FowlRecord,
];

const mockMatches: MatchRecord[] = [
  { id: 101, entry_name: 'Lemon Storm', outcome: 'Win' } as MatchRecord,
  { id: 102, entry_name: 'Hatch Silver', outcome: 'Loss' } as MatchRecord,
];

function renderFightProspects(overrides = {}) {
  return render(
    <FowlLists
      tab="offspring"
      fowls={mockProspects}
      matchHistory={mockMatches}
      loading={false}
      setProfilingSubTab={vi.fn()}
      setSelectedFowlForArchive={vi.fn()}
      setSelectedFowlForDeceased={vi.fn()}
      handleOpenEditModal={vi.fn()}
      handleSetActiveStatus={vi.fn()}
      setSelectedFowlForDetails={vi.fn()}
      {...overrides}
    />
  );
}

describe('Fight Prospects category segmented control', () => {
  it('renders all three category pill tabs with live count badges and header total agreeing', () => {
    renderFightProspects();

    // Header total: 4 offspring
    expect(screen.getByText(/4 Total/i)).toBeInTheDocument();

    // Category pills:
    // All Offspring: 4
    // Non-Breeding: 2 (Lemon Storm and Lemon Blaze have breeding_role: 'none')
    // No Fight Yet: 2 (Lemon Blaze and Sweater Bolt have 0 matches)
    const allTab = screen.getByRole('tab', { name: /All Offspring/i });
    const nonBreedingTab = screen.getByRole('tab', { name: /Non-Breeding/i });
    const noFightTab = screen.getByRole('tab', { name: /No Fight Yet/i });

    expect(allTab).toBeInTheDocument();
    expect(allTab).toHaveTextContent('All Offspring4');
    expect(allTab).toHaveAttribute('aria-selected', 'true');

    expect(nonBreedingTab).toBeInTheDocument();
    expect(nonBreedingTab).toHaveTextContent('Non-Breeding2');
    expect(nonBreedingTab).toHaveAttribute('aria-selected', 'false');

    expect(noFightTab).toBeInTheDocument();
    expect(noFightTab).toHaveTextContent('No Fight Yet2');
    expect(noFightTab).toHaveAttribute('aria-selected', 'false');

    // Initial results count: 4 of 4
    expect(screen.getAllByText('4 of 4')[0]).toBeInTheDocument();
  });

  it('switches to Non-Breeding category and updates list and results count', async () => {
    renderFightProspects();

    const nonBreedingTab = screen.getByRole('tab', { name: /Non-Breeding/i });
    fireEvent.click(nonBreedingTab);

    await waitFor(() => {
      expect(screen.getAllByText('2 of 2')[0]).toBeInTheDocument();
    });

    // Only Lemon Storm and Lemon Blaze should be in this view
    expect(screen.getByRole('heading', { level: 4, name: /Lemon Storm/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 4, name: /Lemon Blaze/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 4, name: /Sweater Bolt/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 4, name: /Hatch Silver/i })).not.toBeInTheDocument();
  });

  it('switches to No Fight Yet category and updates list and results count', async () => {
    renderFightProspects();

    const noFightTab = screen.getByRole('tab', { name: /No Fight Yet/i });
    fireEvent.click(noFightTab);

    await waitFor(() => {
      expect(screen.getAllByText('2 of 2')[0]).toBeInTheDocument();
    });

    // Only Lemon Blaze and Sweater Bolt have 0 match records
    expect(screen.getByRole('heading', { level: 4, name: /Lemon Blaze/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 4, name: /Sweater Bolt/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 4, name: /Lemon Storm/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 4, name: /Hatch Silver/i })).not.toBeInTheDocument();
  });

  it('works together with search bar inside a category', async () => {
    renderFightProspects();

    const noFightTab = screen.getByRole('tab', { name: /No Fight Yet/i });
    fireEvent.click(noFightTab);

    await waitFor(() => {
      expect(screen.getAllByText('2 of 2')[0]).toBeInTheDocument();
    });

    // Search for "Bolt"
    const searchInput = screen.getByLabelText(/Search Registry/i);
    fireEvent.change(searchInput, { target: { value: 'Bolt' } });

    await waitFor(() => {
      expect(screen.getAllByText('1 of 2')[0]).toBeInTheDocument();
    });

    expect(screen.getByRole('heading', { level: 4, name: /Sweater Bolt/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 4, name: /Lemon Blaze/i })).not.toBeInTheDocument();
  });

  it('renders category-specific empty state when a category has 0 chickens', async () => {
    // Prospects where all have fought and all are material (0 non-breeding, 0 no-fight)
    const allFoughtMaterial: FowlRecord[] = [
      { id: 1, name: 'Iron Lemon', breed: 'Lemon', gender: 'Rooster', status: 'Active', registry_role: 'Breeding Male' } as FowlRecord,
      {
        id: 10,
        name: 'Lemon Storm',
        breed: 'Lemon',
        gender: 'Rooster',
        sire: 'Iron Lemon',
        dam: 'Golden Pearl',
        bird_code: '1A1',
        status: 'Active',
        breeding_role: 'material',
      } as FowlRecord,
    ];
    const matches: MatchRecord[] = [
      { id: 1, entry_name: 'Lemon Storm', outcome: 'Win' } as MatchRecord,
    ];

    render(
      <FowlLists
        tab="offspring"
        fowls={allFoughtMaterial}
        matchHistory={matches}
        loading={false}
        setProfilingSubTab={vi.fn()}
        setSelectedFowlForArchive={vi.fn()}
        setSelectedFowlForDeceased={vi.fn()}
        handleOpenEditModal={vi.fn()}
        handleSetActiveStatus={vi.fn()}
        setSelectedFowlForDetails={vi.fn()}
      />
    );

    const noFightTab = screen.getByRole('tab', { name: /No Fight Yet/i });
    fireEvent.click(noFightTab);

    await waitFor(() => {
      expect(screen.getByText(/No Unfought Offspring/i)).toBeInTheDocument();
      expect(screen.getByText(/All registered offspring currently have recorded matches in the system/i)).toBeInTheDocument();
    });

    const nonBreedingTab = screen.getByRole('tab', { name: /Non-Breeding/i });
    fireEvent.click(nonBreedingTab);

    await waitFor(() => {
      expect(screen.getByText(/No Non-Breeding Offspring/i)).toBeInTheDocument();
      expect(screen.getByText(/No offspring match this category yet/i)).toBeInTheDocument();
    });
  });
});
