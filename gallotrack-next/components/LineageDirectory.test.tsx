import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import type { FowlRecord, PairingStats } from '@/lib/types';
import LineageDirectory from './LineageDirectory';
import { UIProvider, useUI } from '@/lib/contexts/ui-context';

const bird = (partial: Partial<FowlRecord> & { id: number; name: string }): FowlRecord =>
  ({
    breed: 'Kelso',
    gender: 'Rooster',
    sire: '',
    dam: '',
    bird_code: '',
    wing_band: '',
    bloodline_pct: 100,
    status: 'Active',
    ...partial,
  }) as FowlRecord;

// Test family:
// - Sire 1 + Dam A -> Offspring 1A1, Offspring 1A2, Offspring 1A3 (3 offspring -> 1 full-sibling family with >=2 children)
// - Offspring 1A1 + Dam C -> Grandchild (1 offspring)
// Total chickens: 7
// Breeding pairs: 2 (Sire 1 x Dam A, Offspring 1A1 x Dam C)
// Full sibling families (>= 2 offspring): 1 (Sire 1 x Dam A, with 3 offspring)
// Sires: 2 (Sire 1 with 3 offspring, Offspring 1A1 with 1 offspring -> total 4 sired)
// Dams: 2 (Dam A with 3 offspring, Dam C with 1 offspring -> total 4 produced)
const family: FowlRecord[] = [
  bird({ id: 1, name: 'Sire 1', gender: 'Rooster', bird_code: '1' }),
  bird({ id: 2, name: 'Dam A', gender: 'Hen', bird_code: 'A' }),
  bird({ id: 3, name: 'Offspring 1A1', gender: 'Rooster', sire: 'Sire 1', dam: 'Dam A', bird_code: '1A1', wing_band: 'WB-01' }),
  bird({ id: 4, name: 'Offspring 1A2', gender: 'Hen', sire: 'Sire 1', dam: 'Dam A', bird_code: '1A2', wing_band: 'WB-02' }),
  bird({ id: 5, name: 'Offspring 1A3', gender: 'Hen', sire: 'Sire 1', dam: 'Dam A', bird_code: '1A3', wing_band: 'WB-03' }),
  bird({ id: 6, name: 'Dam C', gender: 'Hen', bird_code: 'C' }),
  bird({ id: 7, name: 'Grandchild', gender: 'Rooster', sire: 'Offspring 1A1', dam: 'Dam C', bird_code: '1A1C1', wing_band: 'WB-04' }),
];

function FightProbe() {
  const ui = useUI();
  return <div data-testid="fight-probe">{ui.fightHistoryFowl?.name ?? 'none'}</div>;
}

function renderDirectory(onPick: (f: FowlRecord) => void = vi.fn(), overrides = {}) {
  return render(
    <UIProvider theme="light" setTheme={() => {}}>
      <LineageDirectory
        fowls={family}
        matchHistory={[]}
        pairingAnalytics={{ all: new Map<string, PairingStats>(), ranked: [] }}
        setSelectedFowlForDetails={onPick}
        {...overrides}
      />
      <FightProbe />
    </UIProvider>
  );
}

describe('LineageDirectory redesigned top section', () => {
  it('does NOT render the six large stat cards', () => {
    renderDirectory();
    // The previous 6 stat card labels should not exist in the document
    expect(screen.queryByText(/Offspring \(Registered Children\)/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Sire Offspring Groups/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Dam Offspring Groups/i)).not.toBeInTheDocument();
  });

  it('renders compact header with title, subtitle, and search input', () => {
    renderDirectory();
    expect(screen.getByRole('heading', { level: 1, name: /Family Lineage Directory/i })).toBeInTheDocument();
    expect(screen.getByText(/Track sibling groups, sire & dam offspring trees/i)).toBeInTheDocument();
    const searchInput = screen.getByLabelText(/Search family, sire, dam or chicken name/i);
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveAttribute('placeholder', 'Search name, ID, or wing band…');
  });

  it('renders underline tabs with accurate count badges and tablist semantics', () => {
    renderDirectory();
    const tablist = screen.getByRole('tablist', { name: /Family Lineage Directory Tabs/i });
    expect(tablist).toBeInTheDocument();

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(5);

    // Verify tabs and their count badges
    const familyTreeTab = screen.getByRole('tab', { name: /Family Tree\s*2/i });
    const fullFamiliesTab = screen.getByRole('tab', { name: /Full Siblings & Families\s*1/i });
    const sireTab = screen.getByRole('tab', { name: /Sire Offspring Tree\s*2/i });
    const damTab = screen.getByRole('tab', { name: /Dam Offspring Tree\s*2/i });
    const pedigreeTab = screen.getByRole('tab', { name: /Pedigree \/ Ancestors\s*7/i });

    expect(familyTreeTab).toBeInTheDocument();
    expect(fullFamiliesTab).toBeInTheDocument();
    expect(sireTab).toBeInTheDocument();
    expect(damTab).toBeInTheDocument();
    expect(pedigreeTab).toBeInTheDocument();
  });

  it('shows dynamic summary text in context bar for Full Siblings & Families by default', () => {
    renderDirectory();
    const contextBar = screen.getByTestId('lineage-context-bar');
    // Default tab is 'families': 1 family · 3 offspring
    expect(contextBar).toHaveTextContent(/1 family/i);
    expect(contextBar).toHaveTextContent(/3 offspring/i);
  });

  it('updates context bar summary text dynamically when switching to other tabs', () => {
    renderDirectory();
    const contextBar = screen.getByTestId('lineage-context-bar');

    // Switch to Family Tree
    fireEvent.click(screen.getByRole('tab', { name: /Family Tree/i }));
    expect(contextBar).toHaveTextContent(/2 breeding pairs/i);
    expect(contextBar).toHaveTextContent(/4 offspring/i);
    expect(contextBar).toHaveTextContent(/7 chickens tracked/i);

    // Switch to Sire Offspring Tree
    fireEvent.click(screen.getByRole('tab', { name: /Sire Offspring Tree/i }));
    expect(contextBar).toHaveTextContent(/2 sires/i);
    expect(contextBar).toHaveTextContent(/4 offspring sired/i);

    // Switch to Dam Offspring Tree
    fireEvent.click(screen.getByRole('tab', { name: /Dam Offspring Tree/i }));
    expect(contextBar).toHaveTextContent(/2 dams/i);
    expect(contextBar).toHaveTextContent(/4 offspring produced/i);

    // Switch to Pedigree / Ancestors
    fireEvent.click(screen.getByRole('tab', { name: /Pedigree \/ Ancestors/i }));
    expect(contextBar).toHaveTextContent(/7 chickens tracked/i);
  });

  it('shows tab tools (Sort dropdown, Expand/Collapse) on relevant tabs and hides on Pedigree', () => {
    renderDirectory();

    // Default tab is families -> Sort and Expand/Collapse exist
    expect(screen.getByLabelText(/Sort options/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Expand all/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Collapse all/i })).toBeInTheDocument();

    // Switch to Pedigree -> Tools should be hidden
    fireEvent.click(screen.getByRole('tab', { name: /Pedigree \/ Ancestors/i }));
    expect(screen.queryByLabelText(/Sort options/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Expand all/i })).not.toBeInTheDocument();
  });

  it('filters content and reflects search count in context bar when typing', async () => {
    renderDirectory();
    const searchInput = screen.getByLabelText(/Search family, sire, dam or chicken name/i);
    fireEvent.change(searchInput, { target: { value: '1A2' } });

    // Wait for debounced search
    await waitFor(() => {
      const contextBar = screen.getByTestId('lineage-context-bar');
      expect(contextBar).toHaveTextContent(/1 of 1 family/i);
    });

    // Clear search with Escape
    fireEvent.keyDown(searchInput, { key: 'Escape', code: 'Escape' });
    await waitFor(() => {
      expect(searchInput).toHaveValue('');
    });
  });

  it('supports keyboard navigation across tabs using arrow keys', () => {
    renderDirectory();
    const familiesTab = screen.getByRole('tab', { name: /Full Siblings & Families/i });
    familiesTab.focus();

    // Press ArrowRight to navigate to Sire tab
    fireEvent.keyDown(familiesTab, { key: 'ArrowRight' });
    const sireTab = screen.getByRole('tab', { name: /Sire Offspring Tree/i });
    expect(sireTab).toHaveAttribute('aria-selected', 'true');

    // Press ArrowLeft to navigate back to families tab
    fireEvent.keyDown(sireTab, { key: 'ArrowLeft' });
    expect(familiesTab).toHaveAttribute('aria-selected', 'true');
  });

  it('opens standalone fight history for an offspring row', () => {
    renderDirectory();
    fireEvent.click(screen.getByRole('button', { name: 'View all fights for Offspring 1A2' }));
    expect(screen.getByTestId('fight-probe')).toHaveTextContent('Offspring 1A2');
  });

  it('opens chicken profile when an offspring name is clicked', () => {
    const onPick = vi.fn();
    renderDirectory(onPick);
    fireEvent.click(screen.getByRole('button', { name: /Offspring 1A1 Sire/ }));
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ name: 'Offspring 1A1' }));
  });

  describe('Redesigned Sire Offspring Tree & Dam Offspring Tree (grouped by pair)', () => {
    it('renders Level 1 sire row collapsed by default with identifier, name, offspring count, dam count, and male/female split', () => {
      renderDirectory();
      fireEvent.click(screen.getByRole('tab', { name: /Sire Offspring Tree/i }));

      // Level 1 row button exists for Sire 1
      const sireBtn = screen.getByRole('button', { name: /Sire 1/i });
      expect(sireBtn).toBeInTheDocument();
      expect(sireBtn).toHaveTextContent('[1]');
      expect(sireBtn).toHaveTextContent('3 offspring');
      expect(sireBtn).toHaveTextContent('1 male');
      expect(sireBtn).toHaveTextContent('2 females');
      expect(sireBtn).toHaveTextContent('1 dam');

      // Collapsed by default: pair header and offspring rows not rendered yet
      expect(screen.queryByText(/pair 1A/i)).not.toBeInTheDocument();
    });

    it('expanding sire shows filter chips, status legend, and Level 2 pair group with first pair open by default', () => {
      renderDirectory();
      fireEvent.click(screen.getByRole('tab', { name: /Sire Offspring Tree/i }));

      // Click to expand Sire 1
      fireEvent.click(screen.getByRole('button', { name: /Sire 1/i }));

      // Filter chips inside expanded sire
      expect(screen.getByRole('button', { name: /^All \(3\)$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Males \(1\)$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Females \(2\)$/i })).toBeInTheDocument();

      // Status legend is present
      expect(screen.getByText('Active')).toBeInTheDocument();

      // Level 2 pair group header: Dam A (A) · pair 1A · 3 offspring · 1M 2F
      expect(screen.getByText(/Dam A/i)).toBeInTheDocument();
      expect(screen.getByText(/pair 1A/i)).toBeInTheDocument();
      expect(screen.getByText('1M 2F')).toBeInTheDocument();

      // First pair is expanded by default: Level 3 offspring rows are visible
      expect(screen.getAllByText('Offspring 1A1').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Offspring 1A2')).toBeInTheDocument();
      expect(screen.getByText('Offspring 1A3')).toBeInTheDocument();

      const sire1Card = screen.getByRole('button', { name: /Sire 1/i }).parentElement!;
      const sire1Scope = within(sire1Card);

      // Level 3 shows birth code badges
      expect(sire1Scope.getByText('[1A1]')).toBeInTheDocument();
      expect(sire1Scope.getByText('[1A2]')).toBeInTheDocument();
      expect(sire1Scope.getByText('[1A3]')).toBeInTheDocument();

      // Quiet dash for no fights
      expect(sire1Scope.getAllByTitle('No fights recorded').length).toBeGreaterThan(0);

      // Verify NO duplicate listing sections exist
      expect(screen.queryByText(/Sibling Subgroups by Dam/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/🐓 Sire · 1/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/🐔 Dam · 2/i)).not.toBeInTheDocument();
    });

    it('filters offspring by sex inside the pair groups and persists filter state', () => {
      renderDirectory();
      fireEvent.click(screen.getByRole('tab', { name: /Sire Offspring Tree/i }));

      // Expand Sire 1
      fireEvent.click(screen.getByRole('button', { name: /Sire 1/i }));
      const sire1Card = screen.getByRole('button', { name: /Sire 1/i }).parentElement!;
      const sire1Scope = within(sire1Card);

      // Filter to Males
      fireEvent.click(sire1Scope.getByRole('button', { name: /^Males \(1\)$/i }));
      expect(sire1Scope.getByText('[1A1]')).toBeInTheDocument();
      expect(sire1Scope.queryByText('[1A2]')).not.toBeInTheDocument();
      expect(sire1Scope.queryByText('[1A3]')).not.toBeInTheDocument();
      expect(sire1Scope.queryByText('Offspring 1A2')).not.toBeInTheDocument();
      expect(sire1Scope.queryByText('Offspring 1A3')).not.toBeInTheDocument();

      // Filter to Females
      fireEvent.click(sire1Scope.getByRole('button', { name: /^Females \(2\)$/i }));
      expect(sire1Scope.queryByText('[1A1]')).not.toBeInTheDocument();
      expect(sire1Scope.getByText('[1A2]')).toBeInTheDocument();
      expect(sire1Scope.getByText('[1A3]')).toBeInTheDocument();
      expect(sire1Scope.getByText('Offspring 1A2')).toBeInTheDocument();
      expect(sire1Scope.getByText('Offspring 1A3')).toBeInTheDocument();

      // Reset to All
      fireEvent.click(sire1Scope.getByRole('button', { name: /^All \(3\)$/i }));
      expect(sire1Scope.getByText('[1A1]')).toBeInTheDocument();
      expect(sire1Scope.getByText('[1A2]')).toBeInTheDocument();
      expect(sire1Scope.getByText('[1A3]')).toBeInTheDocument();
    });

    it('mirrors the pair-grouped layout in Dam Offspring Tree (dam -> sire pairs -> offspring)', () => {
      renderDirectory();
      fireEvent.click(screen.getByRole('tab', { name: /Dam Offspring Tree/i }));

      // Level 1 Dam row
      const damBtn = screen.getByRole('button', { name: /Dam A/i });
      expect(damBtn).toBeInTheDocument();
      expect(damBtn).toHaveTextContent('[A]');
      expect(damBtn).toHaveTextContent('3 offspring');
      expect(damBtn).toHaveTextContent('1 sire');

      // Expand Dam A
      fireEvent.click(damBtn);

      // Level 2 shows Sire 1 (1) · pair 1A
      expect(screen.getByText(/Sire 1/i)).toBeInTheDocument();
      expect(screen.getByText(/pair 1A/i)).toBeInTheDocument();

      // Offspring rows are visible under the pair
      expect(screen.getByText('Offspring 1A1')).toBeInTheDocument();
      expect(screen.getByText('Offspring 1A2')).toBeInTheDocument();
      expect(screen.getByText('Offspring 1A3')).toBeInTheDocument();
    });
  });
});
