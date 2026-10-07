import { describe, it, expect, vi, beforeEach } from 'vitest';
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
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, '', '/lineage');
  });

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

  describe('Master-Detail Sire Offspring Tree & Dam Offspring Tree (grouped by pair)', () => {
    it('renders master-detail layout with left sire list and automatically selects the first sire with full family visible in 0 clicks', () => {
      renderDirectory();
      fireEvent.click(screen.getByRole('tab', { name: /Sire Offspring Tree/i }));

      // Left pane has option for Sire 1
      const sireOption = screen.getByRole('option', { name: /\[1\]\s*Sire 1/i });
      expect(sireOption).toBeInTheDocument();
      expect(sireOption).toHaveAttribute('aria-selected', 'true');
      expect(sireOption).toHaveTextContent('[1]');
      expect(sireOption).toHaveTextContent('Sire 1');
      expect(sireOption).toHaveTextContent('3');

      // Right pane details: Sire 1 is selected automatically (0 clicks)
      const detailsRegion = screen.getByRole('region', { name: /Sire 1 details/i });
      expect(detailsRegion).toBeInTheDocument();
      expect(within(detailsRegion).getByText('Sire 1')).toBeInTheDocument();
      expect(within(detailsRegion).getAllByText(/3 offspring/i).length).toBeGreaterThanOrEqual(1);
      expect(within(detailsRegion).getAllByText(/1♂ 2♀/i).length).toBeGreaterThanOrEqual(1);
      expect(within(detailsRegion).getByText(/1 dam/i)).toBeInTheDocument();

      // Pair header is expanded by default with 0 clicks
      expect(within(detailsRegion).getByText(/Sire 1 \(1\)/i)).toBeInTheDocument();
      expect(within(detailsRegion).getByText(/Dam A \(A\)/i)).toBeInTheDocument();
      expect(within(detailsRegion).getByText('1A')).toBeInTheDocument();
      expect(within(detailsRegion).getAllByText(/1♂ 2♀/i).length).toBeGreaterThanOrEqual(1);

      // Offspring rows are visible under the pair with 0 clicks
      expect(within(detailsRegion).getAllByText('Offspring 1A1').length).toBeGreaterThanOrEqual(1);
      expect(within(detailsRegion).getAllByText('Offspring 1A2').length).toBeGreaterThanOrEqual(1);
      expect(within(detailsRegion).getAllByText('Offspring 1A3').length).toBeGreaterThanOrEqual(1);

      // Birth code badges
      expect(within(detailsRegion).getAllByText('[1A1]').length).toBeGreaterThanOrEqual(1);
      expect(within(detailsRegion).getAllByText('[1A2]').length).toBeGreaterThanOrEqual(1);
      expect(within(detailsRegion).getAllByText('[1A3]').length).toBeGreaterThanOrEqual(1);

      // Table headers
      expect(within(detailsRegion).getByRole('columnheader', { name: 'Code' })).toBeInTheDocument();
      expect(within(detailsRegion).getByRole('columnheader', { name: 'Chicken' })).toBeInTheDocument();
      expect(within(detailsRegion).getByRole('columnheader', { name: 'Sex' })).toBeInTheDocument();
      expect(within(detailsRegion).getByRole('columnheader', { name: 'Age' })).toBeInTheDocument();
      expect(within(detailsRegion).getByRole('columnheader', { name: 'Status' })).toBeInTheDocument();
      expect(within(detailsRegion).getByRole('columnheader', { name: 'Record' })).toBeInTheDocument();
      expect(within(detailsRegion).getByRole('columnheader', { name: 'Actions' })).toBeInTheDocument();

      // Filter chips inside pair
      expect(within(detailsRegion).getByRole('button', { name: /^All \(3\)$/i })).toBeInTheDocument();
      expect(within(detailsRegion).getByRole('button', { name: /^♂ Males \(1\)$/i })).toBeInTheDocument();
      expect(within(detailsRegion).getByRole('button', { name: /^♀ Females \(2\)$/i })).toBeInTheDocument();

      // Verify NO duplicate listing sections exist
      expect(screen.queryByText(/Sibling Subgroups by Dam/i)).not.toBeInTheDocument();
    });

    it('switches selected sire in one click from the left list', () => {
      renderDirectory();
      fireEvent.click(screen.getByRole('tab', { name: /Sire Offspring Tree/i }));

      // Click second sire in list (Offspring 1A1)
      const secondSire = screen.getByRole('option', { name: /Offspring 1A1/i });
      fireEvent.click(secondSire);

      // Right pane now displays Offspring 1A1 details
      const detailsRegion = screen.getByRole('region', { name: /Offspring 1A1 details/i });
      expect(detailsRegion).toBeInTheDocument();
      expect(within(detailsRegion).getAllByText('Grandchild').length).toBeGreaterThanOrEqual(1);
    });

    it('filters offspring by sex inside the pair groups and persists filter state', () => {
      renderDirectory();
      fireEvent.click(screen.getByRole('tab', { name: /Sire Offspring Tree/i }));

      const detailsRegion = screen.getByRole('region', { name: /Sire 1 details/i });

      // Filter to Males
      fireEvent.click(within(detailsRegion).getByRole('button', { name: /^♂ Males \(1\)$/i }));
      expect(within(detailsRegion).getAllByText('[1A1]').length).toBeGreaterThanOrEqual(1);
      expect(within(detailsRegion).queryByText('[1A2]')).not.toBeInTheDocument();
      expect(within(detailsRegion).queryByText('[1A3]')).not.toBeInTheDocument();
      expect(within(detailsRegion).queryByText('Offspring 1A2')).not.toBeInTheDocument();
      expect(within(detailsRegion).queryByText('Offspring 1A3')).not.toBeInTheDocument();

      // Filter to Females
      fireEvent.click(within(detailsRegion).getByRole('button', { name: /^♀ Females \(2\)$/i }));
      expect(within(detailsRegion).queryByText('[1A1]')).not.toBeInTheDocument();
      expect(within(detailsRegion).getAllByText('[1A2]').length).toBeGreaterThanOrEqual(1);
      expect(within(detailsRegion).getAllByText('[1A3]').length).toBeGreaterThanOrEqual(1);
      expect(within(detailsRegion).getAllByText('Offspring 1A2').length).toBeGreaterThanOrEqual(1);
      expect(within(detailsRegion).getAllByText('Offspring 1A3').length).toBeGreaterThanOrEqual(1);

      // Reset to All
      fireEvent.click(within(detailsRegion).getByRole('button', { name: /^All \(3\)$/i }));
      expect(within(detailsRegion).getAllByText('[1A1]').length).toBeGreaterThanOrEqual(1);
      expect(within(detailsRegion).getAllByText('[1A2]').length).toBeGreaterThanOrEqual(1);
      expect(within(detailsRegion).getAllByText('[1A3]').length).toBeGreaterThanOrEqual(1);
    });

    it('mirrors the master-detail layout in Dam Offspring Tree (dam -> sire pairs -> offspring)', () => {
      renderDirectory();
      fireEvent.click(screen.getByRole('tab', { name: /Dam Offspring Tree/i }));

      // Left pane has option for Dam A
      const damOption = screen.getByRole('option', { name: /\[A\]\s*Dam A/i });
      expect(damOption).toBeInTheDocument();
      expect(damOption).toHaveAttribute('aria-selected', 'true');

      // Right pane displays Dam A details by default (0 clicks)
      const detailsRegion = screen.getByRole('region', { name: /Dam A details/i });
      expect(detailsRegion).toBeInTheDocument();
      expect(within(detailsRegion).getByText('Dam A')).toBeInTheDocument();
      expect(within(detailsRegion).getAllByText(/3 offspring/i).length).toBeGreaterThanOrEqual(1);
      expect(within(detailsRegion).getByText(/1 sire/i)).toBeInTheDocument();

      // Level 2 shows Sire 1 (1) × Dam A (A) · 1A
      expect(within(detailsRegion).getByText(/Sire 1 \(1\)/i)).toBeInTheDocument();
      expect(within(detailsRegion).getByText(/Dam A \(A\)/i)).toBeInTheDocument();
      expect(within(detailsRegion).getByText('1A')).toBeInTheDocument();

      // Offspring rows are visible under the pair
      expect(within(detailsRegion).getAllByText('Offspring 1A1').length).toBeGreaterThanOrEqual(1);
      expect(within(detailsRegion).getAllByText('Offspring 1A2').length).toBeGreaterThanOrEqual(1);
      expect(within(detailsRegion).getAllByText('Offspring 1A3').length).toBeGreaterThanOrEqual(1);
    });

    it('opens actions menu on ⋯ click and triggers View profile', () => {
      const onPick = vi.fn();
      renderDirectory(onPick);
      fireEvent.click(screen.getByRole('tab', { name: /Sire Offspring Tree/i }));

      const detailsRegion = screen.getByRole('region', { name: /Sire 1 details/i });
      const actionBtns = within(detailsRegion).getAllByRole('button', { name: /Actions for Offspring 1A1/i });
      expect(actionBtns.length).toBeGreaterThanOrEqual(1);
      fireEvent.click(actionBtns[0]);

      const detailsBtns = within(detailsRegion).getAllByRole('button', { name: /View details/i });
      expect(detailsBtns.length).toBeGreaterThanOrEqual(1);
      fireEvent.click(detailsBtns[0]);

      expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ name: 'Offspring 1A1' }));
    });

    it('sorts offspring rows inside pair when sort dropdown is changed', () => {
      renderDirectory();
      fireEvent.click(screen.getByRole('tab', { name: /Sire Offspring Tree/i }));

      const detailsRegion = screen.getByRole('region', { name: /Sire 1 details/i });
      const sortSelect = within(detailsRegion).getByLabelText(/Sort pair offspring/i);

      // Change sort to 'age'
      fireEvent.change(sortSelect, { target: { value: 'age' } });
      expect(sortSelect).toHaveValue('age');

      // Change sort to 'wins'
      fireEvent.change(sortSelect, { target: { value: 'wins' } });
      expect(sortSelect).toHaveValue('wins');
    });

    it('verifies pair header count equals the number of rows visible inside the pair', () => {
      renderDirectory();
      fireEvent.click(screen.getByRole('tab', { name: /Sire Offspring Tree/i }));

      const detailsRegion = screen.getByRole('region', { name: /Sire 1 details/i });

      // Header indicates 3 offspring
      expect(within(detailsRegion).getAllByText(/3\s*offspring/i).length).toBeGreaterThanOrEqual(1);

      // In default 'males-first' sort mode: 1 table header row + 2 sex sub-headers + 3 offspring rows + 1 pair total footer row = 7 rows
      const table = within(detailsRegion).getByRole('table');
      const rows = within(table).getAllByRole('row');
      expect(rows).toHaveLength(7);
      expect(within(table).getByText(/Pair total/i)).toBeInTheDocument();

      // Desktop table offspring action buttons match exactly 3
      const actionButtons = within(table).getAllByRole('button', { name: /Actions for/i });
      expect(actionButtons).toHaveLength(3);
    });

    it('renders males before females in natural birth code order with slim sub-headers, and removes sub-headers when switched to Code only', () => {
      const mixedFamily: FowlRecord[] = [
        bird({ id: 10, name: 'Sire M', gender: 'Rooster', bird_code: '1' }),
        bird({ id: 20, name: 'Dam F', gender: 'Hen', bird_code: 'A' }),
        bird({ id: 21, name: 'Child 1A1', gender: 'Hen', sire: 'Sire M', dam: 'Dam F', bird_code: '1A1' }),
        bird({ id: 22, name: 'Child 1A2', gender: 'Rooster', sire: 'Sire M', dam: 'Dam F', bird_code: '1A2' }),
        bird({ id: 23, name: 'Child 1A3', gender: 'Rooster', sire: 'Sire M', dam: 'Dam F', bird_code: '1A3' }),
        bird({ id: 24, name: 'Child 1A4', gender: 'Hen', sire: 'Sire M', dam: 'Dam F', bird_code: '1A4' }),
        bird({ id: 25, name: 'Child 1A10', gender: 'Rooster', sire: 'Sire M', dam: 'Dam F', bird_code: '1A10' }),
      ];

      render(
        <UIProvider theme="light" setTheme={() => {}}>
          <LineageDirectory
            fowls={mixedFamily}
            matchHistory={[]}
            pairingAnalytics={{ all: new Map<string, PairingStats>(), ranked: [] }}
            setSelectedFowlForDetails={vi.fn()}
          />
        </UIProvider>
      );

      fireEvent.click(screen.getByRole('tab', { name: /Sire Offspring Tree/i }));

      // Sire M is automatically selected in the master-detail layout
      const detailsRegion = screen.getByRole('region', { name: /Sire M details/i });

      // Verify default sort is 'males-first'
      const sortSelect = within(detailsRegion).getByLabelText(/Sort pair offspring/i);
      expect(sortSelect).toHaveValue('males-first');

      const table = within(detailsRegion).getByRole('table');

      // Verify subheaders exist in the table
      expect(within(table).getByText('♂ Males (3)')).toBeInTheDocument();
      expect(within(table).getByText('♀ Females (2)')).toBeInTheDocument();

      // In default 'males-first' sort:
      // Males: 1A2, 1A3, 1A10 (natural order where 1A2 < 1A10)
      // Females: 1A1, 1A4
      const getCodeOrder = () => {
        const rowList = within(table).getAllByRole('row');
        return rowList
          .map(r => r.querySelector('span.font-mono')?.textContent?.trim())
          .filter(Boolean);
      };

      expect(getCodeOrder()).toEqual(['[1A2]', '[1A3]', '[1A10]', '[1A1]', '[1A4]']);

      // Switch sort to 'code' (Code only)
      fireEvent.change(sortSelect, { target: { value: 'code' } });
      expect(sortSelect).toHaveValue('code');

      // Sub-headers must be removed
      expect(within(table).queryByText('♂ Males (3)')).not.toBeInTheDocument();
      expect(within(table).queryByText('♀ Females (2)')).not.toBeInTheDocument();

      // In 'code' sort: natural birth code order 1A1, 1A2, 1A3, 1A4, 1A10
      expect(getCodeOrder()).toEqual(['[1A1]', '[1A2]', '[1A3]', '[1A4]', '[1A10]']);
    });
  });
});
