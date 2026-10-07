import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
});
