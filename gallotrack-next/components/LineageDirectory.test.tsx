import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/lineage',
  useSearchParams: () => new URLSearchParams(),
}));

import type { FowlRecord, MatchRecord, PairingStats } from '@/lib/types';
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

/** Builds `count` dams (Dam A, Dam B, ...) each with exactly one offspring. */
function makeDamFamily(count: number): FowlRecord[] {
  const fowls: FowlRecord[] = [];
  for (let i = 0; i < count; i += 1) {
    const letter = String.fromCharCode(65 + (i % 26));
    const suffix = i >= 26 ? String(Math.floor(i / 26)) : '';
    const label = `${letter}${suffix}`;
    fowls.push(
      bird({ id: 1000 + i, name: `Dam ${label}`, gender: 'Hen', bird_code: label })
    );
    fowls.push(
      bird({
        id: 2000 + i,
        name: `Child ${label}`,
        gender: i % 2 === 0 ? 'Rooster' : 'Hen',
        sire: 'Sire X',
        dam: `Dam ${label}`,
        bird_code: `${i + 1}A1`,
      })
    );
  }
  return fowls;
}

const matchRecord = (
  id: number,
  fowlId: number,
  entryName: string,
  outcome: 'Win' | 'Loss' | 'Draw' = 'Win'
): MatchRecord => ({
  id,
  fowl_id: fowlId,
  date: '2026-10-01',
  entry_name: entryName,
  breed: 'Kelso',
  opponent: 'Opponent',
  location: 'Arena',
  type: 'Derby',
  outcome,
  status: 'Verified',
});


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
    document.body.style.overflow = '';
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

  it('renders tabs with 2-column grid below sm and fifth tab spanning both columns', () => {
    renderDirectory();
    const tablist = screen.getByRole('tablist', { name: /Family Lineage Directory Tabs/i });
    expect(tablist).toHaveClass('grid', 'grid-cols-2', 'sm:flex');

    const pedigreeTab = screen.getByRole('tab', { name: /Pedigree \/ Ancestors/i });
    expect(pedigreeTab).toHaveClass('col-span-2', 'sm:col-span-1');
  });

  it('ensures context bar and top container never stick while scrolling', () => {
    renderDirectory();
    const contextBar = screen.getByTestId('lineage-context-bar');
    expect(contextBar).toHaveClass('static');
    const contextBarClasses = contextBar.className.split(/\s+/);
    expect(contextBarClasses.includes('sticky')).toBe(false);
    expect(contextBarClasses.includes('md:sticky')).toBe(false);

    const topContainer = screen.getByTestId('lineage-top-container');
    expect(topContainer).toHaveClass('static');
    const topContainerClasses = topContainer.className.split(/\s+/);
    expect(topContainerClasses.includes('sticky')).toBe(false);
    expect(topContainerClasses.includes('md:sticky')).toBe(false);
  });

  it('shows dynamic summary text in context bar for Full Siblings & Families by default', () => {
    renderDirectory();
    const contextBar = screen.getByTestId('lineage-context-bar');
    // Default tab is 'families': 1 family · 3 offspring
    expect(contextBar).toHaveTextContent(/1 family/i);
    expect(contextBar).toHaveTextContent(/3 offspring/i);
  });

  it('excludes hens from the family fighting total', () => {
    const familyWithFights: FowlRecord[] = [
      bird({ id: 1, name: 'Sire X', gender: 'Rooster', bird_code: '9' }),
      bird({ id: 2, name: 'Dam Z', gender: 'Hen', bird_code: 'Z' }),
      bird({ id: 3, name: 'Male Fighter', gender: 'Rooster', sire: 'Sire X', dam: 'Dam Z', bird_code: '9Z1' }),
      bird({ id: 4, name: 'Hen With Record', gender: 'Hen', sire: 'Sire X', dam: 'Dam Z', bird_code: '9Z2' }),
    ];
    const match = (id: number, fowlId: number, entryName: string): MatchRecord => ({
      id,
      fowl_id: fowlId,
      date: '2026-10-01',
      entry_name: entryName,
      breed: 'Kelso',
      opponent: 'Opponent',
      location: 'Arena',
      type: 'Derby',
      outcome: 'Win',
      status: 'Verified',
    });

    renderDirectory(vi.fn(), {
      fowls: familyWithFights,
      matchHistory: [match(1, 3, 'Male Fighter'), match(2, 4, 'Hen With Record')],
    });

    const card = screen.getByRole('article');
    expect(card).toHaveTextContent(/1 of 1 males fought/);
    expect(card).toHaveTextContent(/1W-0L/);
    expect(card).not.toHaveTextContent(/2 of 2 males fought/);
  });

  it('applies the hen/fight rule across the canvas, Full Siblings, Sire and Dam tabs', () => {
    const fowls: FowlRecord[] = [
      bird({ id: 1, name: 'Sire X', gender: 'Rooster', bird_code: '9' }),
      bird({ id: 2, name: 'Dam Z', gender: 'Hen', bird_code: 'Z' }),
      bird({ id: 3, name: 'Male Zero', gender: 'Rooster', sire: 'Sire X', dam: 'Dam Z', bird_code: '9Z1' }),
      bird({ id: 4, name: 'Male Fighter', gender: 'Rooster', sire: 'Sire X', dam: 'Dam Z', bird_code: '9Z2' }),
      bird({ id: 5, name: 'Hen With Record', gender: 'Hen', sire: 'Sire X', dam: 'Dam Z', bird_code: '9Z3' }),
    ];
    const matches: MatchRecord[] = [
      matchRecord(1, 4, 'Male Fighter', 'Win'),
      matchRecord(2, 5, 'Hen With Record', 'Win'),
    ];

    renderDirectory(vi.fn(), { fowls, matchHistory: matches });

    // 1. Family Tree canvas
    fireEvent.click(screen.getByRole('tab', { name: /Family Tree/i }));
    const henCard = screen
      .getAllByTestId('lineage-bird-card')
      .find((el) => el.textContent?.includes('Hen With Record'))!;
    expect(henCard.textContent).not.toMatch(/No fights|\dW-\dL/);
    fireEvent.click(henCard);
    const flowDetails = screen.getByTestId('lineage-details');
    expect(within(flowDetails).queryByText('Record')).not.toBeInTheDocument();
    expect(
      within(flowDetails).queryByRole('button', { name: /Fight history/i })
    ).not.toBeInTheDocument();

    // 2. Full Siblings
    fireEvent.click(screen.getByRole('tab', { name: /Full Siblings/i }));
    const familyCard = screen.getByRole('article');
    expect(familyCard).toHaveTextContent('1 of 2 males fought');
    expect(familyCard).toHaveTextContent('1W-0L');
    expect(familyCard.textContent).toMatch(/Best[\s\S]*Male Fighter/);
    expect(familyCard.textContent).not.toMatch(/Best[\s\S]*Hen With Record/);

    const henChip = within(familyCard).getByRole('button', { name: 'Hen With Record' });
    expect(henChip).not.toHaveAttribute('data-record-trend');
    expect(
      within(familyCard).getByRole('button', { name: /Male Zero · No fights/i })
    ).toHaveAttribute('data-record-trend', 'none');

    fireEvent.click(screen.getByRole('button', { name: 'Expand family 1' }));
    const familyTable = screen.getByRole('table');
    const henMemberRow = within(familyTable).getByText('Hen With Record').closest('tr')!;
    expect(henMemberRow).toHaveTextContent('—');
    expect(henMemberRow.textContent).not.toMatch(/No fights|\dW-\dL/);
    expect(
      within(henMemberRow).queryByRole('button', { name: /View all fights/i })
    ).not.toBeInTheDocument();
    const zeroMemberRow = within(familyTable).getByText('Male Zero').closest('tr')!;
    expect(zeroMemberRow).toHaveTextContent('No fights');
    expect(
      within(zeroMemberRow).getByRole('button', { name: 'View all fights for Male Zero' })
    ).toBeInTheDocument();

    // 3. Sire Offspring Tree (desktop table + mobile card + totals)
    fireEvent.click(screen.getByRole('tab', { name: /Sire Offspring Tree/i }));
    const sireRegion = screen.getByRole('region', { name: /Sire X details/i });
    const sireTable = within(sireRegion).getByRole('table');
    const sireHenRow = within(sireTable).getByText('Hen With Record').closest('tr')!;
    expect(sireHenRow).toHaveTextContent('—');
    expect(sireHenRow.textContent).not.toMatch(/No fights|\dW-\dL/);
    expect(within(sireHenRow).queryByRole('button', { name: 'Fights' })).not.toBeInTheDocument();
    const sireZeroRow = within(sireTable).getByText('Male Zero').closest('tr')!;
    expect(sireZeroRow).toHaveTextContent('No fights');
    expect(within(sireZeroRow).getByRole('button', { name: 'Fights' })).toBeInTheDocument();
    expect(screen.queryAllByTitle('View Hen With Record fight history')).toHaveLength(0);
    expect(screen.getAllByTitle('View Male Zero fight history')).toHaveLength(2);

    const sireHenMobile = document.getElementById('fowl-row-5')!;
    expect(sireHenMobile).toHaveTextContent('—');
    expect(sireHenMobile.textContent).not.toMatch(/No fights|\dW-\dL/);
    const sireZeroMobile = document.getElementById('fowl-row-3')!;
    expect(sireZeroMobile).toHaveTextContent('No fights');

    expect(
      within(sireRegion).getByText(/Sire total · 1 of 2 males have fought/)
    ).toBeInTheDocument();
    expect(
      within(sireRegion).getByText(/Sire overall total · 1 of 2 males have fought/)
    ).toBeInTheDocument();
    expect(
      within(sireRegion).getAllByText(/Pair total · 1 of 2 males have fought/).length
    ).toBeGreaterThanOrEqual(1);
    expect(within(sireRegion).queryByText(/2W-0L/)).not.toBeInTheDocument();

    // 4. Dam Offspring Tree (desktop table + selector family total)
    fireEvent.click(screen.getByRole('tab', { name: /Dam Offspring Tree/i }));
    const damRegion = screen.getByRole('region', { name: /Dam Z details/i });
    const damTable = within(damRegion).getByRole('table');
    const damHenRow = within(damTable).getByText('Hen With Record').closest('tr')!;
    expect(damHenRow).toHaveTextContent('—');
    expect(within(damHenRow).queryByRole('button', { name: 'Fights' })).not.toBeInTheDocument();
    const damZeroRow = within(damTable).getByText('Male Zero').closest('tr')!;
    expect(damZeroRow).toHaveTextContent('No fights');
    expect(within(damZeroRow).getByRole('button', { name: 'Fights' })).toBeInTheDocument();
    expect(
      within(damRegion).getAllByText(/1 of 2 males have fought/).length
    ).toBeGreaterThanOrEqual(1);

    const damOption = screen.getByRole('option', { name: /Dam Z/i });
    expect(damOption).toHaveTextContent(/1W-0L/);
    expect(damOption).not.toHaveTextContent(/2W/);
  });

  it('renders every male and female offspring in the expanded member table', () => {
    const manyOffspring: FowlRecord[] = [
      bird({ id: 1, name: 'Sire X', gender: 'Rooster', bird_code: '9' }),
      bird({ id: 2, name: 'Dam Z', gender: 'Hen', bird_code: 'Z' }),
      ...Array.from({ length: 5 }, (_, i) =>
        bird({
          id: 10 + i,
          name: `Male ${i + 1}`,
          gender: 'Rooster',
          sire: 'Sire X',
          dam: 'Dam Z',
          bird_code: `9Z${i + 1}`,
        })
      ),
      ...Array.from({ length: 2 }, (_, i) =>
        bird({
          id: 20 + i,
          name: `Female ${i + 1}`,
          gender: 'Hen',
          sire: 'Sire X',
          dam: 'Dam Z',
          bird_code: `9Z${i + 6}`,
        })
      ),
    ];

    renderDirectory(vi.fn(), { fowls: manyOffspring });

    expect(screen.getByText('7 chickens · 5 M · 2 F')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Expand family 1' }));

    const table = screen.getByRole('table');
    for (let i = 1; i <= 5; i += 1) {
      expect(within(table).getByText(`Male ${i}`)).toBeInTheDocument();
    }
    for (let i = 1; i <= 2; i += 1) {
      expect(within(table).getByText(`Female ${i}`)).toBeInTheDocument();
    }
  });

  it('never labels offspring sex as Sire or Dam in the sire and dam offspring tables', () => {
    renderDirectory();

    fireEvent.click(screen.getByRole('tab', { name: /Sire Offspring Tree/i }));
    const sireTable = within(screen.getByRole('region', { name: /Sire 1 details/i })).getByRole(
      'table'
    );
    expect(within(sireTable).getAllByText(/Cock/).length).toBeGreaterThan(0);
    expect(within(sireTable).getAllByText(/Hen/).length).toBeGreaterThan(0);
    expect(within(sireTable).queryByText(/\bSire\b/)).not.toBeInTheDocument();
    expect(within(sireTable).queryByText(/\bDam\b/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /Dam Offspring Tree/i }));
    const damTable = within(screen.getByRole('region', { name: /Dam A details/i })).getByRole(
      'table'
    );
    expect(within(damTable).getAllByText(/Cock/).length).toBeGreaterThan(0);
    expect(within(damTable).getAllByText(/Hen/).length).toBeGreaterThan(0);
    expect(within(damTable).queryByText(/\bSire\b/)).not.toBeInTheDocument();
    expect(within(damTable).queryByText(/\bDam\b/)).not.toBeInTheDocument();
  });

  it('keeps Sire and Dam as parent roles while pedigree cards show Cock/Hen', () => {
    renderDirectory();
    fireEvent.click(screen.getByRole('tab', { name: /Family Tree/i }));

    // Bird cards label sex as Cock/Hen and never as Sire/Dam.
    const cards = screen.getAllByTestId('lineage-bird-card');
    expect(cards.length).toBeGreaterThan(0);
    cards.forEach((card) => {
      expect(card.textContent).not.toMatch(/\bSire\b|\bDam\b/);
      expect(card.textContent).toMatch(/Cock|Hen/);
    });

    // Pair details still render the parent role boxes.
    fireEvent.click(screen.getAllByTestId('lineage-pair-hub')[0]);
    const details = screen.getByTestId('lineage-details');
    expect(within(details).getAllByText('Sire').length).toBeGreaterThanOrEqual(1);
    expect(within(details).getAllByText('Dam').length).toBeGreaterThanOrEqual(1);
  });

  describe('Full Siblings & Families tab (family-level comparison)', () => {
    const fowls: FowlRecord[] = [
      bird({ id: 1, name: 'Sire X', gender: 'Rooster', bird_code: '9' }),
      bird({ id: 2, name: 'Dam Z', gender: 'Hen', bird_code: 'Z' }),
      bird({ id: 3, name: 'Male A', gender: 'Rooster', sire: 'Sire X', dam: 'Dam Z', bird_code: '9Z1' }),
      bird({ id: 4, name: 'Male B', gender: 'Rooster', sire: 'Sire X', dam: 'Dam Z', bird_code: '9Z2' }),
      bird({ id: 5, name: 'Male C', gender: 'Rooster', sire: 'Sire X', dam: 'Dam Z', bird_code: '9Z3' }),
      bird({ id: 6, name: 'Female A', gender: 'Hen', sire: 'Sire X', dam: 'Dam Z', bird_code: '9Z4' }),
    ];
    const records: MatchRecord[] = [
      matchRecord(1, 3, 'Male A', 'Win'),
      matchRecord(2, 3, 'Male A', 'Win'),
      matchRecord(3, 4, 'Male B', 'Loss'),
      matchRecord(4, 4, 'Male B', 'Loss'),
    ];

    it('collapsed card shows the win rate, best performer, and chips but no Fights buttons', () => {
      renderDirectory(vi.fn(), { fowls, matchHistory: records });

      const card = screen.getByRole('article');
      expect(card).toHaveTextContent('50%');
      expect(card).toHaveTextContent('2W-2L');
      expect(card).toHaveTextContent('2 of 3 males fought');
      expect(card).toHaveTextContent('4 chickens · 3 M · 1 F');
      expect(card).toHaveTextContent('3 male · 1 female');

      expect(card).toHaveTextContent('Best');
      expect(card).toHaveTextContent('Male A');
      expect(card).toHaveTextContent('2W-0L · 100%');

      const chips = card.querySelectorAll('[data-record-trend]');
      expect(chips).toHaveLength(3);
      expect(card.querySelectorAll('[data-record-trend="up"]')).toHaveLength(1);
      expect(card.querySelectorAll('[data-record-trend="down"]')).toHaveLength(1);
      expect(card.querySelectorAll('[data-record-trend="none"]')).toHaveLength(1);

      expect(within(card).queryByRole('table')).not.toBeInTheDocument();
      expect(
        within(card).queryByRole('button', { name: /View all fights/i })
      ).not.toBeInTheDocument();
    });

    it('shows the family total exactly once', () => {
      renderDirectory(vi.fn(), { fowls, matchHistory: records });

      expect(screen.getAllByText(/males fought/i)).toHaveLength(1);
      expect(screen.queryByText(/Family total/i)).not.toBeInTheDocument();
    });

    it('expands into a compact member table with profile links and no N/A role text', () => {
      const onPick = vi.fn();
      renderDirectory(onPick, { fowls, matchHistory: records });

      fireEvent.click(screen.getByRole('button', { name: 'Expand family 1' }));

      const table = screen.getByRole('table');
      expect(within(table).getByRole('columnheader', { name: 'Code' })).toBeInTheDocument();
      expect(within(table).getByRole('columnheader', { name: 'Chicken' })).toBeInTheDocument();
      expect(within(table).getByRole('columnheader', { name: 'Sex' })).toBeInTheDocument();
      expect(within(table).getByRole('columnheader', { name: 'Record' })).toBeInTheDocument();
      expect(within(table).getAllByRole('row')).toHaveLength(5);
      expect(within(table).getAllByText(/Cock/)).toHaveLength(3);
      expect(within(table).getAllByText(/Hen/)).toHaveLength(1);
      expect(within(table).queryByText(/\bSire\b/)).not.toBeInTheDocument();
      expect(within(table).queryByText(/\bDam\b/)).not.toBeInTheDocument();

      expect(screen.queryByText(/N\/A/)).not.toBeInTheDocument();
      expect(within(table).queryByText(/^Sire ·/i)).not.toBeInTheDocument();
      expect(within(table).queryByText(/^Dam ·/i)).not.toBeInTheDocument();

      // Fights actions exist only inside the expanded rows.
      fireEvent.click(within(table).getByRole('button', { name: 'View all fights for Male A' }));
      expect(screen.getByTestId('fight-probe')).toHaveTextContent('Male A');

      fireEvent.click(within(table).getByRole('button', { name: 'Male B' }));
      expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ name: 'Male B' }));

      expect(screen.getByRole('button', { name: /Open in Family Tree/i })).toBeInTheDocument();
    });

    it('opens the family in the Family Tree tab', () => {
      renderDirectory();
      fireEvent.click(screen.getByRole('button', { name: 'Expand family 1' }));
      fireEvent.click(screen.getByRole('button', { name: /Open in Family Tree/i }));

      expect(screen.getByRole('tab', { name: /Family Tree/i })).toHaveAttribute(
        'aria-selected',
        'true'
      );
    });

    it('sorts by win rate, offspring, fights, then name and keeps no-fight families last', () => {
      const multiFamily: FowlRecord[] = [
        // B: 3 males, 3 decided losses (0%).
        bird({ id: 1, name: 'Sire B', gender: 'Rooster', bird_code: 'B' }),
        bird({ id: 2, name: 'Dam B', gender: 'Hen', bird_code: 'DB' }),
        ...Array.from({ length: 3 }, (_, i) =>
          bird({
            id: 10 + i,
            name: `B Male ${i + 1}`,
            gender: 'Rooster',
            sire: 'Sire B',
            dam: 'Dam B',
            bird_code: `B${i + 1}`,
          })
        ),
        // A: 2 males, 2 wins (100%).
        bird({ id: 20, name: 'Sire A', gender: 'Rooster', bird_code: 'A' }),
        bird({ id: 21, name: 'Dam A', gender: 'Hen', bird_code: 'DA' }),
        ...Array.from({ length: 2 }, (_, i) =>
          bird({
            id: 30 + i,
            name: `A Male ${i + 1}`,
            gender: 'Rooster',
            sire: 'Sire A',
            dam: 'Dam A',
            bird_code: `A${i + 1}`,
          })
        ),
        // C: 4 males, no fights at all.
        bird({ id: 40, name: 'Sire C', gender: 'Rooster', bird_code: 'C' }),
        bird({ id: 41, name: 'Dam C', gender: 'Hen', bird_code: 'DC' }),
        ...Array.from({ length: 4 }, (_, i) =>
          bird({
            id: 50 + i,
            name: `C Male ${i + 1}`,
            gender: 'Rooster',
            sire: 'Sire C',
            dam: 'Dam C',
            bird_code: `C${i + 1}`,
          })
        ),
      ];
      const matches: MatchRecord[] = [
        matchRecord(1, 30, 'A Male 1', 'Win'),
        matchRecord(2, 31, 'A Male 2', 'Win'),
        matchRecord(3, 10, 'B Male 1', 'Loss'),
        matchRecord(4, 11, 'B Male 2', 'Loss'),
        matchRecord(5, 12, 'B Male 3', 'Loss'),
      ];

      renderDirectory(vi.fn(), { fowls: multiFamily, matchHistory: matches });

      const order = () => screen.getAllByRole('article').map((card) => card.textContent || '');

      // Default: win rate, families without fights last.
      expect(order()[0]).toContain('Sire A');
      expect(order()[1]).toContain('Sire B');
      expect(order()[2]).toContain('Sire C');

      const sortSelect = screen.getByLabelText('Sort options');
      expect(within(sortSelect).getByRole('option', { name: 'Win rate' })).toBeInTheDocument();
      expect(
        within(sortSelect).getByRole('option', { name: 'Most offspring' })
      ).toBeInTheDocument();
      expect(within(sortSelect).getByRole('option', { name: 'Most fights' })).toBeInTheDocument();
      expect(screen.queryByText('Ranked')).not.toBeInTheDocument();

      fireEvent.change(sortSelect, { target: { value: 'offspring' } });
      expect(order()[0]).toContain('Sire C');
      expect(order()[1]).toContain('Sire B');
      expect(order()[2]).toContain('Sire A');

      fireEvent.change(sortSelect, { target: { value: 'fights' } });
      expect(order()[0]).toContain('Sire B');
      expect(order()[1]).toContain('Sire A');
      expect(order()[2]).toContain('Sire C');

      fireEvent.change(sortSelect, { target: { value: 'name' } });
      expect(order()[0]).toContain('Sire A');
      expect(order()[1]).toContain('Sire B');
      expect(order()[2]).toContain('Sire C');
    });

    it('expands and collapses every family from the toolbar', () => {
      renderDirectory(vi.fn(), { fowls, matchHistory: records });
      expect(screen.queryByRole('table')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /Expand all/i }));
      expect(screen.getAllByRole('table')).toHaveLength(1);
      expect(screen.getByRole('button', { name: 'Collapse family 1' })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /Collapse all/i }));
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });
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

  it('renders context bar tab tools with responsive flex-wrap classes to prevent mobile overflow', () => {
    renderDirectory();
    const sortDropdown = screen.getByLabelText(/Sort options/i);
    // Find the enclosing tab tools container
    const toolsContainer = sortDropdown.closest('.flex-wrap');
    expect(toolsContainer).toBeInTheDocument();
    expect(toolsContainer).toHaveClass('w-full', 'justify-between', 'sm:w-auto', 'sm:justify-end');
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

  it('opens standalone fight history from an expanded member row', () => {
    renderDirectory();
    fireEvent.click(screen.getByRole('button', { name: 'Expand family 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'View all fights for Offspring 1A1' }));
    expect(screen.getByTestId('fight-probe')).toHaveTextContent('Offspring 1A1');
  });

  it('opens chicken profile when an offspring chip is clicked', () => {
    const onPick = vi.fn();
    renderDirectory(onPick);
    fireEvent.click(screen.getByRole('button', { name: /Offspring 1A1 ·/ }));
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
      expect(within(detailsRegion).getByRole('button', { name: /^♂ Cocks \(1\)$/i })).toBeInTheDocument();
      expect(within(detailsRegion).getByRole('button', { name: /^♀ Hens \(2\)$/i })).toBeInTheDocument();

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

      // Filter to Cocks
      fireEvent.click(within(detailsRegion).getByRole('button', { name: /^♂ Cocks \(1\)$/i }));
      expect(within(detailsRegion).getAllByText('[1A1]').length).toBeGreaterThanOrEqual(1);
      expect(within(detailsRegion).queryByText('[1A2]')).not.toBeInTheDocument();
      expect(within(detailsRegion).queryByText('[1A3]')).not.toBeInTheDocument();
      expect(within(detailsRegion).queryByText('Offspring 1A2')).not.toBeInTheDocument();
      expect(within(detailsRegion).queryByText('Offspring 1A3')).not.toBeInTheDocument();

      // Filter to Hens
      fireEvent.click(within(detailsRegion).getByRole('button', { name: /^♀ Hens \(2\)$/i }));
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

    it('renders the dam view with the shared master-detail sidebar and profile header', () => {
      renderDirectory();
      fireEvent.click(screen.getByRole('tab', { name: /Dam Offspring Tree/i }));

      // Same left sidebar pattern as the Sire Offspring Tree.
      const aside = screen.getByRole('complementary', { name: /Dams selection/i });
      expect(aside).toHaveClass('lg:overflow-y-auto');
      expect(within(aside).getByLabelText('Filter dams')).toBeInTheDocument();
      expect(within(aside).getByLabelText('Sort dams')).toHaveValue('most');
      expect(within(aside).getByText('2 dams')).toBeInTheDocument();
      const list = within(aside).getByRole('listbox', { name: /Dams list/i });
      const damA = within(list).getByRole('option', { name: /\[A\]\s*Dam A/i });
      expect(damA).toHaveAttribute('aria-selected', 'true');
      expect(within(list).getByRole('option', { name: /\[C\]\s*Dam C/i })).toBeInTheDocument();

      // The old horizontal selector is gone.
      expect(screen.queryByRole('combobox', { name: 'Select dam' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Show all/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('listbox', { name: 'Dams' })).not.toBeInTheDocument();

      // Same profile header structure and scroll container as the sire view.
      const details = screen.getByRole('region', { name: /Dam A details/i });
      expect(details.className).toMatch(/lg:overflow-y-auto/);
      const heading = within(details).getByRole('heading', { name: 'Dam A' });
      const headerCard = heading.closest('div.bg-card');
      expect(headerCard).not.toHaveClass('sticky');
      expect(headerCard).not.toHaveClass('top-0');
      expect(within(details).getAllByText(/3 offspring/i).length).toBeGreaterThanOrEqual(1);
      expect(within(details).getByText(/1 sire/i)).toBeInTheDocument();
      expect(within(headerCard as HTMLElement).getByText('1♂ 2♀')).toBeInTheDocument();
      expect(within(details).getByRole('button', { name: 'View profile' })).toBeInTheDocument();
      expect(within(headerCard as HTMLElement).getByText('♀ Hen')).toBeInTheDocument();

      // Same pair section + table.
      expect(within(details).getByText(/Sire 1 \(1\)/i)).toBeInTheDocument();
      expect(within(details).getByText(/Dam A \(A\)/i)).toBeInTheDocument();
      const table = within(details).getByRole('table');
      expect(table).toHaveClass('table-fixed');
      for (const name of ['Offspring 1A1', 'Offspring 1A2', 'Offspring 1A3']) {
        expect(within(details).getAllByText(name).length).toBeGreaterThanOrEqual(1);
      }

      // Offspring keep their own sex labels in the dam view.
      expect(within(table).getAllByText(/Cock/).length).toBeGreaterThan(0);
      expect(within(table).getAllByText(/Hen/).length).toBeGreaterThan(0);
    });

    it('switches dams from the shared sidebar and persists the selection in the URL', () => {
      renderDirectory();
      fireEvent.click(screen.getByRole('tab', { name: /Dam Offspring Tree/i }));

      fireEvent.click(screen.getByRole('option', { name: /\[C\]\s*Dam C/i }));

      const details = screen.getByRole('region', { name: /Dam C details/i });
      expect(details).toBeInTheDocument();
      expect(within(details).getByText('♀ Hen')).toBeInTheDocument();
      expect(window.location.search).toContain('dam=C');
    });

    it('restores the dam selection from the ?dam= query param', async () => {
      window.history.replaceState({}, '', '/lineage?tab=dam&dam=C');
      renderDirectory();

      expect(
        await screen.findByRole('region', { name: /Dam C details/i })
      ).toBeInTheDocument();
    });

    it('renders one breeding-pair section per sire and keeps offspring under the right pair', () => {
      const fowls: FowlRecord[] = [
        bird({ id: 1, name: 'Sire One', gender: 'Rooster', bird_code: '1' }),
        bird({ id: 2, name: 'Sire Two', gender: 'Rooster', bird_code: '2' }),
        bird({ id: 3, name: 'Dam Multi', gender: 'Hen', bird_code: 'M' }),
        bird({ id: 4, name: 'Child One', gender: 'Rooster', sire: 'Sire One', dam: 'Dam Multi', bird_code: '1M1' }),
        bird({ id: 5, name: 'Child Two', gender: 'Hen', sire: 'Sire Two', dam: 'Dam Multi', bird_code: '2M1' }),
      ];

      renderDirectory(vi.fn(), { fowls });
      fireEvent.click(screen.getByRole('tab', { name: /Dam Offspring Tree/i }));

      const details = screen.getByRole('region', { name: /Dam Multi details/i });
      expect(within(details).getByText(/Sire One \(1\)/i)).toBeInTheDocument();
      expect(within(details).getByText(/Sire Two \(2\)/i)).toBeInTheDocument();

      const pairOne = within(details)
        .getByText(/Sire One \(1\)/i)
        .closest<HTMLElement>('div.bg-card')!;
      const pairTwo = within(details)
        .getByText(/Sire Two \(2\)/i)
        .closest<HTMLElement>('div.bg-card')!;
      expect(within(pairOne).getAllByText('Child One').length).toBeGreaterThanOrEqual(1);
      expect(within(pairOne).queryByText('Child Two')).not.toBeInTheDocument();
      expect(within(pairTwo).getAllByText('Child Two').length).toBeGreaterThanOrEqual(1);
      expect(within(pairTwo).queryByText('Child One')).not.toBeInTheDocument();
      expect(within(pairOne).getByText(/Dam Multi \(M\)/i)).toBeInTheDocument();
      expect(within(pairTwo).getByText(/Dam Multi \(M\)/i)).toBeInTheDocument();
    });

    it('labels the selected parent by role while offspring keep their individual sex', () => {
      renderDirectory();

      fireEvent.click(screen.getByRole('tab', { name: /Sire Offspring Tree/i }));
      const sireRegion = screen.getByRole('region', { name: /Sire 1 details/i });
      const sireHeading = within(sireRegion).getByRole('heading', { name: 'Sire 1' });
      const sireHeader = sireHeading.closest<HTMLElement>('div.bg-card')!;
      expect(within(sireHeader).getByText('♂ Cock')).toBeInTheDocument();
      const sireTable = within(sireRegion).getByRole('table');
      expect(within(sireTable).getAllByText(/Cock/).length).toBeGreaterThan(0);
      expect(within(sireTable).getAllByText(/Hen/).length).toBeGreaterThan(0);

      fireEvent.click(screen.getByRole('tab', { name: /Dam Offspring Tree/i }));
      const damRegion = screen.getByRole('region', { name: /Dam A details/i });
      const damHeading = within(damRegion).getByRole('heading', { name: 'Dam A' });
      const damHeader = damHeading.closest<HTMLElement>('div.bg-card')!;
      expect(within(damHeader).getByText('♀ Hen')).toBeInTheDocument();
      const damTable = within(damRegion).getByRole('table');
      expect(within(damTable).getAllByText(/Cock/).length).toBeGreaterThan(0);
      expect(within(damTable).getAllByText(/Hen/).length).toBeGreaterThan(0);
    });

    it('filters and sorts the shared dam sidebar', () => {
      renderDirectory(vi.fn(), { fowls: makeDamFamily(12) });
      fireEvent.click(screen.getByRole('tab', { name: /Dam Offspring Tree/i }));

      const aside = screen.getByRole('complementary', { name: /Dams selection/i });
      expect(within(aside).getByText('12 dams')).toBeInTheDocument();

      const filter = within(aside).getByLabelText('Filter dams');
      fireEvent.change(filter, { target: { value: 'Dam L' } });
      expect(within(aside).getByText('1 dam')).toBeInTheDocument();
      fireEvent.click(within(aside).getByRole('option', { name: /Dam L/ }));
      expect(screen.getByRole('region', { name: /Dam L details/i })).toBeInTheDocument();

      fireEvent.change(filter, { target: { value: '' } });
      const sort = within(aside).getByLabelText('Sort dams');
      fireEvent.change(sort, { target: { value: 'name' } });
      expect(sort).toHaveValue('name');
      const damList = within(aside).getByRole('listbox', { name: /Dams list/i });
      expect(within(damList).getAllByRole('option')[0]).toHaveTextContent('Dam A');
    });

    it('collapses and expands only the selected dam pairing accordions', () => {
      renderDirectory();
      fireEvent.click(screen.getByRole('tab', { name: /Dam Offspring Tree/i }));

      expect(screen.getAllByText('Offspring 1A1').length).toBeGreaterThan(0);

      fireEvent.click(screen.getByRole('button', { name: 'Collapse all' }));
      expect(screen.queryAllByText('Offspring 1A1')).toHaveLength(0);

      fireEvent.click(screen.getByRole('button', { name: 'Expand all' }));
      expect(screen.getAllByText('Offspring 1A1').length).toBeGreaterThan(0);
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
      expect(within(table).getByText('♂ Cocks (3)')).toBeInTheDocument();
      expect(within(table).getByText('♀ Hens (2)')).toBeInTheDocument();

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
      expect(within(table).queryByText('♂ Cocks (3)')).not.toBeInTheDocument();
      expect(within(table).queryByText('♀ Hens (2)')).not.toBeInTheDocument();

      // In 'code' sort: natural birth code order 1A1, 1A2, 1A3, 1A4, 1A10
      expect(getCodeOrder()).toEqual(['[1A1]', '[1A2]', '[1A3]', '[1A4]', '[1A10]']);
    });
  });
});
