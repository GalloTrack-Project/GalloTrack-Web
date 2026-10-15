import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FowlLists from './FowlLists';
import type { FowlRecord, MatchRecord } from '@/lib/types';
import {
  getOffspringClassificationCounts,
  isBreedingStockOffspring,
  isNonBreedingOffspring,
  hasFightRecord,
  extractFoughtLookups,
} from '@/lib/registry-roles';

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

  // Offspring in Offspring Registry (tab: 'offspring')
  // 1. Non-Breeding + Has Fight Record (fowl_id: 10)
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
  // 2. Non-Breeding + No Fight Record
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
  // 3. Breeding Stock + No Fight Record
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
  // 4. Breeding Stock + Has Fight Record (fowl_id: 13)
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
  { id: 101, fowl_id: 10, entry_name: 'Lemon Storm', outcome: 'Win' } as MatchRecord,
  { id: 102, fowl_id: 13, entry_name: 'Hatch Silver', outcome: 'Loss' } as MatchRecord,
];

function renderOffspringRegistry(overrides = {}) {
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

describe('Offspring Breeding Classification & Fighting Status Registry', () => {
  it('enforces Breeding Stock + Non-Breeding = All Offspring invariant on dataset', () => {
    const offspring = mockProspects.filter((f) => f.id >= 10);
    const counts = getOffspringClassificationCounts(offspring);

    expect(counts.all).toBe(4);
    expect(counts.breedingStock).toBe(2);
    expect(counts.nonBreeding).toBe(2);
    expect(counts.breedingStock + counts.nonBreeding).toBe(counts.all);

    // Mutual exclusivity check
    for (const f of offspring) {
      const isBS = isBreedingStockOffspring(f);
      const isNB = isNonBreedingOffspring(f);
      expect(isBS !== isNB).toBe(true);
    }
  });

  it('determines fight status by fowl ID foreign key rather than name', () => {
    const { foughtFowlIds, foughtNames } = extractFoughtLookups(mockMatches);
    expect(foughtFowlIds.has(10)).toBe(true);
    expect(foughtFowlIds.has(13)).toBe(true);
    expect(foughtFowlIds.has(11)).toBe(false);
    expect(foughtFowlIds.has(12)).toBe(false);

    // Chicken #10 (Lemon Storm) has fight record
    expect(hasFightRecord(mockProspects[4], foughtFowlIds, foughtNames)).toBe(true);
    // Chicken #11 (Lemon Blaze) has no fight record
    expect(hasFightRecord(mockProspects[5], foughtFowlIds, foughtNames)).toBe(false);

    // Verify even if an entry_name matches another chicken, fowl_id is authoritative
    const renamedChicken = { ...mockProspects[5], name: 'Lemon Storm' }; // Name matches Lemon Storm, but ID is 11
    expect(hasFightRecord(renamedChicken, foughtFowlIds, new Set())).toBe(false);
  });

  it('renders all three breeding classification pills with live counts and header total agreeing', () => {
    renderOffspringRegistry();

    // Header total: 4 offspring
    expect(screen.getByText(/4 Total/i)).toBeInTheDocument();
    expect(screen.getByText('Offspring Registry')).toBeInTheDocument();
    expect(screen.getByText('Every child of a registered breeding pair')).toBeInTheDocument();

    // Breeding classification pills:
    // All Offspring: 4
    // Breeding Stock: 2 (Sweater Bolt and Hatch Silver have breeding_role: 'material')
    // Non-Breeding: 2 (Lemon Storm and Lemon Blaze have breeding_role: 'none')
    const allTab = screen.getByRole('tab', { name: /All Offspring/i });
    const breedingStockTab = screen.getByRole('tab', { name: /Breeding Stock/i });
    const nonBreedingTab = screen.getByRole('tab', { name: /Non-Breeding/i });

    expect(allTab).toBeInTheDocument();
    expect(allTab).toHaveTextContent('All Offspring4');
    expect(allTab).toHaveAttribute('aria-selected', 'true');

    expect(breedingStockTab).toBeInTheDocument();
    expect(breedingStockTab).toHaveTextContent('Breeding Stock2');
    expect(breedingStockTab).toHaveAttribute('aria-selected', 'false');

    expect(nonBreedingTab).toBeInTheDocument();
    expect(nonBreedingTab).toHaveTextContent('Non-Breeding2');
    expect(nonBreedingTab).toHaveAttribute('aria-selected', 'false');

    // Initial results count: 4 of 4
    expect(screen.getAllByText('4 of 4')[0]).toBeInTheDocument();
  });

  it('switches to Breeding Stock classification and updates list and results count', async () => {
    renderOffspringRegistry();

    const breedingStockTab = screen.getByRole('tab', { name: /Breeding Stock/i });
    fireEvent.click(breedingStockTab);

    await waitFor(() => {
      expect(screen.getAllByText('2 of 2')[0]).toBeInTheDocument();
    });

    // Only Sweater Bolt and Hatch Silver should appear in Breeding Stock
    expect(screen.getByRole('heading', { level: 4, name: /Sweater Bolt/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 4, name: /Hatch Silver/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 4, name: /Lemon Storm/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 4, name: /Lemon Blaze/i })).not.toBeInTheDocument();
  });

  it('switches to Non-Breeding classification and updates list and results count', async () => {
    renderOffspringRegistry();

    const nonBreedingTab = screen.getByRole('tab', { name: /Non-Breeding/i });
    fireEvent.click(nonBreedingTab);

    await waitFor(() => {
      expect(screen.getAllByText('2 of 2')[0]).toBeInTheDocument();
    });

    // Only Lemon Storm and Lemon Blaze should appear in Non-Breeding
    expect(screen.getByRole('heading', { level: 4, name: /Lemon Storm/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 4, name: /Lemon Blaze/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 4, name: /Sweater Bolt/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 4, name: /Hatch Silver/i })).not.toBeInTheDocument();
  });

  it('supports Non-Breeding chicken with No Fight Record (orthogonal dimensions)', async () => {
    renderOffspringRegistry();

    // Select Non-Breeding classification pill
    const nonBreedingTab = screen.getByRole('tab', { name: /Non-Breeding/i });
    fireEvent.click(nonBreedingTab);

    // Select Fighting Status filter: "without" (No Fight Record)
    const fightFilter = screen.getByLabelText(/Fighting Status/i);
    fireEvent.change(fightFilter, { target: { value: 'without' } });

    // Lemon Blaze is Non-Breeding AND has No Fight Record
    await waitFor(() => {
      expect(screen.getAllByText('1 of 2')[0]).toBeInTheDocument();
    });

    expect(screen.getByRole('heading', { level: 4, name: /Lemon Blaze/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 4, name: /Lemon Storm/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 4, name: /Sweater Bolt/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 4, name: /Hatch Silver/i })).not.toBeInTheDocument();
  });

  it('supports Breeding Stock chicken with No Fight Record', async () => {
    renderOffspringRegistry();

    // Select Breeding Stock classification pill
    const breedingStockTab = screen.getByRole('tab', { name: /Breeding Stock/i });
    fireEvent.click(breedingStockTab);

    // Select Fighting Status filter: "without" (No Fight Record)
    const fightFilter = screen.getByLabelText(/Fighting Status/i);
    fireEvent.change(fightFilter, { target: { value: 'without' } });

    // Sweater Bolt is Breeding Stock AND has No Fight Record
    await waitFor(() => {
      expect(screen.getAllByText('1 of 2')[0]).toBeInTheDocument();
    });

    expect(screen.getByRole('heading', { level: 4, name: /Sweater Bolt/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 4, name: /Hatch Silver/i })).not.toBeInTheDocument();
  });

  it('combines classification pill, fighting status filter, and search simultaneously', async () => {
    renderOffspringRegistry();

    // Search for "Storm"
    const searchInput = screen.getByLabelText(/Search Registry/i);
    fireEvent.change(searchInput, { target: { value: 'Storm' } });

    await waitFor(() => {
      expect(screen.getAllByText('1 of 4')[0]).toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { level: 4, name: /Lemon Storm/i })).toBeInTheDocument();

    // Filter to "without" (No Fight Record) -> Lemon Storm has a fight, so 0 results
    const fightFilter = screen.getByLabelText(/Fighting Status/i);
    fireEvent.change(fightFilter, { target: { value: 'without' } });

    await waitFor(() => {
      expect(screen.getByText(/No chickens found for "Storm"/i)).toBeInTheDocument();
    });
  });

  it('renders classification-specific empty states when a classification has 0 chickens', async () => {
    // Only Non-Breeding offspring (0 Breeding Stock)
    const onlyNonBreeding: FowlRecord[] = [
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
        breeding_role: 'none',
      } as FowlRecord,
    ];

    render(
      <FowlLists
        tab="offspring"
        fowls={onlyNonBreeding}
        matchHistory={[]}
        loading={false}
        setProfilingSubTab={vi.fn()}
        setSelectedFowlForArchive={vi.fn()}
        setSelectedFowlForDeceased={vi.fn()}
        handleOpenEditModal={vi.fn()}
        handleSetActiveStatus={vi.fn()}
        setSelectedFowlForDetails={vi.fn()}
      />
    );

    const breedingStockTab = screen.getByRole('tab', { name: /Breeding Stock/i });
    fireEvent.click(breedingStockTab);

    await waitFor(() => {
      expect(screen.getByText(/No Breeding Stock/i)).toBeInTheDocument();
      expect(screen.getByText(/No offspring are currently designated as future breeding stock/i)).toBeInTheDocument();
    });
  });
});
