import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MarketplacePage from './MarketplacePage';
import type { FowlRecord, MatchRecord } from '@/lib/types';

// MarketplacePage syncs its status filter to ?status= via useUrlTab, which
// needs the App Router context that this unit test does not mount.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }),
  usePathname: () => '/catalog',
}));

// Mock chickens matching the exact scenario described by user:
// 1. "Sweater Crimson" (name contains "crim")
// 2. "Crimson Belle" (dam, name starts with "crim")
// 3. "Sweater Red Storm" (name does NOT contain "crim", but dam is "Crimson Belle")
// 4. "Iron Thunder" (name and parents do NOT contain "crim", identifier 1A2, wing band WB-99)
const mockFowls: FowlRecord[] = [
  {
    id: 1,
    name: 'Sweater Crimson',
    breed: 'Sweater',
    gender: 'Rooster',
    growth_stage: 'Cock',
    sire: 'Foundation Stock',
    dam: 'Foundation Stock',
    bird_code: '1',
    wing_band: 'WB-01',
    status: 'Active',
    weight: '2.1 kg',
    bloodline_pct: 100,
  } as FowlRecord,
  {
    id: 2,
    name: 'Crimson Belle',
    breed: 'Sweater',
    gender: 'Hen',
    growth_stage: 'Hen',
    sire: 'Foundation Stock',
    dam: 'Foundation Stock',
    bird_code: 'A',
    wing_band: 'WB-02',
    status: 'Active',
    weight: '1.8 kg',
    bloodline_pct: 100,
  } as FowlRecord,
  {
    id: 3,
    name: 'Sweater Red Storm',
    breed: 'Sweater',
    gender: 'Rooster',
    growth_stage: 'Stag',
    sire: 'Foundation Stock',
    dam: 'Crimson Belle',
    bird_code: '1A1',
    wing_band: 'WB-03',
    status: 'Active',
    weight: '2.0 kg',
    bloodline_pct: 100,
  } as FowlRecord,
  {
    id: 4,
    name: 'Iron Thunder',
    breed: 'Hatch',
    gender: 'Rooster',
    growth_stage: 'Cock',
    sire: 'Iron Chief',
    dam: 'Lightning Queen',
    bird_code: '1A2',
    wing_band: 'WB-99',
    status: 'Active',
    weight: '2.3 kg',
    bloodline_pct: 100,
  } as FowlRecord,
];

function renderMarketplace(overrides = {}) {
  return render(
    <MarketplacePage
      fowls={mockFowls}
      matchHistory={[] as MatchRecord[]}
      setCurrentPage={vi.fn()}
      setProfilingSubTab={vi.fn()}
      {...overrides}
    />
  );
}

describe('MarketplacePage (Chicken Inventory) search and filtering', () => {
  it('renders search input with placeholder "Search name, ID, or wing band…"', () => {
    renderMarketplace();
    const searchInput = screen.getByLabelText(/Search Inventory/i);
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveAttribute('placeholder', 'Search name, ID, or wing band…');
    expect(screen.getByLabelText(/Include parents/i)).toBeInTheDocument();
  });

  it('searching "crim" matches ONLY chickens with "crim" in their own name, ranking startsWith before contains', async () => {
    renderMarketplace();
    const searchInput = screen.getByLabelText(/Search Inventory/i);
    fireEvent.change(searchInput, { target: { value: 'crim' } });

    // Wait for debounced search (250ms)
    await waitFor(() => {
      const banner = screen.getByTestId('search-results-banner');
      expect(banner).toHaveTextContent(/Showing 2 results for “crim”/i);
    });

    // Crimson Belle and Sweater Crimson should appear as chicken cards
    expect(screen.getByRole('heading', { level: 4, name: /Crimson Belle/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 4, name: /Sweater Crimson/i })).toBeInTheDocument();

    // Sweater Red Storm should NOT appear (even though dam is Crimson Belle)
    expect(screen.queryByRole('heading', { level: 4, name: /Sweater Red Storm/i })).not.toBeInTheDocument();

    // Ranking verification: Crimson Belle (starts with "crim") should appear before Sweater Crimson
    const cards = screen.getAllByRole('heading', { level: 4 });
    const cardNames = cards.map((c) => c.textContent);
    expect(cardNames[0]).toMatch(/Crimson Belle/i);
    expect(cardNames[1]).toMatch(/Sweater Crimson/i);
  });

  it('enabling "Include parents" includes Sweater Red Storm with parent match hint', async () => {
    renderMarketplace();
    const searchInput = screen.getByLabelText(/Search Inventory/i);
    fireEvent.change(searchInput, { target: { value: 'crim' } });

    await waitFor(() => {
      const banner = screen.getByTestId('search-results-banner');
      expect(banner).toHaveTextContent(/Showing 2 results for “crim”/i);
    });

    // Check "Include parents" checkbox
    const includeParentsCheckbox = screen.getByLabelText(/Include parents/i);
    fireEvent.click(includeParentsCheckbox);

    await waitFor(() => {
      const banner = screen.getByTestId('search-results-banner');
      expect(banner).toHaveTextContent(/Showing 3 results for “crim”/i);
    });

    expect(screen.getByRole('heading', { level: 4, name: /Sweater Red Storm/i })).toBeInTheDocument();
    // Hint badge displayed for parent match
    expect(screen.getByText(/Dam: Crimson Belle/i)).toBeInTheDocument();
  });

  it('matches by unique identifier code (e.g. "1A2" or prefix "1A")', async () => {
    renderMarketplace();
    const searchInput = screen.getByLabelText(/Search Inventory/i);
    fireEvent.change(searchInput, { target: { value: '1A2' } });

    await waitFor(() => {
      const banner = screen.getByTestId('search-results-banner');
      expect(banner).toHaveTextContent(/Showing 1 result for “1A2”/i);
    });
    expect(screen.getByRole('heading', { level: 4, name: /Iron Thunder/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 4, name: /Crimson Belle/i })).not.toBeInTheDocument();
  });

  it('matches by wing band (e.g. "WB-99")', async () => {
    renderMarketplace();
    const searchInput = screen.getByLabelText(/Search Inventory/i);
    fireEvent.change(searchInput, { target: { value: 'WB-99' } });

    await waitFor(() => {
      const banner = screen.getByTestId('search-results-banner');
      expect(banner).toHaveTextContent(/Showing 1 result for “WB-99”/i);
    });
    expect(screen.getByRole('heading', { level: 4, name: /Iron Thunder/i })).toBeInTheDocument();
  });

  it('clears search via Escape key and via the clear button', async () => {
    renderMarketplace();
    const searchInput = screen.getByLabelText(/Search Inventory/i);
    fireEvent.change(searchInput, { target: { value: 'crim' } });

    await waitFor(() => {
      expect(searchInput).toHaveValue('crim');
    });

    // Press Escape
    fireEvent.keyDown(searchInput, { key: 'Escape', code: 'Escape' });
    await waitFor(() => {
      expect(searchInput).toHaveValue('');
    });

    // Retype and test Clear search link in banner
    fireEvent.change(searchInput, { target: { value: 'crim' } });
    await waitFor(() => {
      expect(screen.getByTestId('search-results-banner')).toBeInTheDocument();
    });

    const clearBannerButton = screen.getAllByRole('button', { name: /Clear search/i })[0];
    fireEvent.click(clearBannerButton);
    await waitFor(() => {
      expect(searchInput).toHaveValue('');
    });
  });

  it('shows friendly empty state when nothing matches and allows clearing', async () => {
    renderMarketplace();
    const searchInput = screen.getByLabelText(/Search Inventory/i);
    fireEvent.change(searchInput, { target: { value: 'NoSuchBird' } });

    await waitFor(() => {
      expect(screen.getByText(/No chickens found for "NoSuchBird"/i)).toBeInTheDocument();
    });

    const clearBtns = screen.getAllByRole('button', { name: /Clear search/i });
    fireEvent.click(clearBtns[0]);
    await waitFor(() => {
      expect(searchInput).toHaveValue('');
    });
  });
});

describe('MarketplacePage agriculturist terminology (Fight Prospects / Ready to Breed / Active Breeders)', () => {
  it('renders all five inventory tabs without horizontal scrolling and with correct tablist semantics', () => {
    renderMarketplace();
    const tabsContainer = screen.getByTestId('inventory-tabs-container');
    expect(tabsContainer).toBeInTheDocument();
    expect(tabsContainer).toHaveAttribute('role', 'tablist');
    expect(tabsContainer.className).not.toMatch(/overflow-x-auto/);
    expect(tabsContainer.className).not.toMatch(/overflow-x-scroll/);

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(5);
    expect(screen.getByRole('tab', { name: /^All Chickens/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^Active Breeders/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^Ready to Breed/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^Archived/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^Deceased/ })).toBeInTheDocument();
  });

  it('renders the Active Breeders and Ready to Breed inventory tabs with tooltips', () => {
    renderMarketplace();
    const activeBreedersBtn = screen.getByRole('tab', { name: /^Active Breeders/ });
    expect(activeBreedersBtn).toBeInTheDocument();
    expect(activeBreedersBtn).toHaveAttribute(
      'title',
      'Living breeding herd — Breeding Males (sires) and Breeding Females (dams).'
    );
    expect(screen.getByRole('tab', { name: /^Ready to Breed/ })).toBeInTheDocument();
  });

  it('Active Breeders tab lists only the breeding herd — fight prospects excluded', () => {
    renderMarketplace();
    fireEvent.click(screen.getByRole('tab', { name: /^Active Breeders/ }));

    // Foundation-stock parents are the breeding herd…
    expect(screen.getByRole('heading', { level: 4, name: /Sweater Crimson/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 4, name: /Crimson Belle/i })).toBeInTheDocument();
    // …while their offspring (fight prospects) are not.
    expect(screen.queryByRole('heading', { level: 4, name: /Sweater Red Storm/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 4, name: /Iron Thunder/i })).not.toBeInTheDocument();
  });

  it('excludes offspring with breeding_role = breeder from Active Breeders (stays in Registry until promoted)', () => {
    renderMarketplace({
      fowls: [
        {
          id: 1, name: 'Iron Sire', gender: 'Rooster', status: 'Active',
          registry_role: 'Breeding Male', breeding_role: 'breeder',
        } as FowlRecord,
        {
          id: 2, name: 'Prospect Breeder', gender: 'Rooster', status: 'Active',
          registry_role: 'Non-Breeding', breeding_role: 'breeder',
        } as FowlRecord,
      ],
    });

    const activeBreedersTab = screen.getByRole('tab', { name: /^Active Breeders/ });
    expect(activeBreedersTab).toHaveTextContent('Active Breeders1');
    fireEvent.click(activeBreedersTab);

    expect(screen.getByRole('heading', { level: 4, name: /Iron Sire/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 4, name: /Prospect Breeder/i })).not.toBeInTheDocument();
  });

  it('shows a "Ready in N days" badge only inside the 30-day window', () => {
    const born = (days: number) => new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
    renderMarketplace({
      fowls: [
        {
          id: 11, name: 'Soon Hen', gender: 'Hen', breed: 'Kelso', status: 'Active',
          growth_stage: 'Hen', birthdate: born(220), sire: 'Foundation Stock', dam: 'Foundation Stock',
          bird_code: '1A1',
        } as FowlRecord,
        {
          id: 12, name: 'Baby Chick', gender: 'Hen', breed: 'Kelso', status: 'Active',
          growth_stage: 'Chick', birthdate: born(30), sire: 'Foundation Stock', dam: 'Foundation Stock',
          bird_code: '1A2',
        } as FowlRecord,
      ],
    });

    expect(screen.getByText(/Ready in 20 days/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Ready in \d+ days?/i)).toHaveLength(1);
  });

  it('displays "Needs birth date" rather than guessing when birth date is missing', () => {
    renderMarketplace({
      fowls: [
        {
          id: 201, name: 'Dateless Hen', gender: 'Hen', breed: 'Kelso', status: 'Active',
          growth_stage: 'Hen', birthdate: '', sire: 'Foundation Stock', dam: 'Foundation Stock',
          bird_code: 'D1',
        } as FowlRecord,
      ],
    });

    expect(screen.getAllByText(/Needs birth date/i).length).toBeGreaterThan(0);
  });

  it('derives Ready to Breed tab count dynamically from fixtures under the active specification', () => {
    const born = (days: number) => new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
    const testFowls: FowlRecord[] = [
      {
        id: 301, name: 'Ready Sire', gender: 'Rooster', breed: 'Kelso', status: 'Active',
        registry_role: 'Breeding Male', birthdate: born(250), sire: 'Foundation Stock', dam: 'Foundation Stock',
      } as FowlRecord,
      {
        id: 302, name: 'Young Breeder', gender: 'Rooster', breed: 'Kelso', status: 'Active',
        registry_role: 'Breeding Male', birthdate: born(180), sire: 'Foundation Stock', dam: 'Foundation Stock',
      } as FowlRecord,
      {
        id: 303, name: 'No Date Breeder', gender: 'Rooster', breed: 'Kelso', status: 'Active',
        registry_role: 'Breeding Male', birthdate: '', sire: 'Foundation Stock', dam: 'Foundation Stock',
      } as FowlRecord,
    ];

    renderMarketplace({ fowls: testFowls });

    const breedingTab = screen.getByRole('tab', { name: /^Ready to Breed/ });
    expect(breedingTab).toHaveTextContent('Ready to Breed1');
  });

  it('renders Breeding Type dropdown and filters chickens by breeding type', () => {
    // mockFowls has:
    // 1: Sweater Crimson (Purebred)
    // 2: Crimson Belle (Purebred)
    // 3: Sweater Red Storm (Purebred, sire Foundation, dam Crimson Belle [Sweater])
    // 4: Iron Thunder (Unverified, parents Iron Chief / Lightning Queen not in list)
    renderMarketplace();

    const breedingTypeSelect = screen.getByLabelText(/Filter by breeding type/i);
    expect(breedingTypeSelect).toBeInTheDocument();
    expect(screen.getByText('Breeding Type')).toBeInTheDocument();
    expect(breedingTypeSelect).toHaveValue('all');

    // Filter to unverified
    fireEvent.change(breedingTypeSelect, { target: { value: 'unverified' } });
    expect(screen.getByRole('heading', { level: 4, name: /Iron Thunder/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 4, name: /Sweater Crimson/i })).not.toBeInTheDocument();

    // Filter to purebred
    fireEvent.change(breedingTypeSelect, { target: { value: 'purebred' } });
    expect(screen.getByRole('heading', { level: 4, name: /Sweater Crimson/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 4, name: /Iron Thunder/i })).not.toBeInTheDocument();
  });
});
