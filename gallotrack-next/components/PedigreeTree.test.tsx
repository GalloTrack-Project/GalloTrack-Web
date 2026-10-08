import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PedigreeTree, { buildPedigreeGrid } from './PedigreeTree';
import type { FowlRecord } from '@/lib/types';
import { resolveBirdCodes } from '@/lib/bird-code';
import { UIProvider } from '@/lib/contexts/ui-context';

const sampleFowls = [
  {
    id: 1,
    name: 'Sweater Red Storm',
    breed: '50% Hatch · 50% Sweater',
    gender: 'Rooster',
    sire: 'Titan Sweater',
    dam: 'Crimson Belle',
    bird_code: '2E1',
    chicken_code: '2E1',
    status: 'Active',
    created_at: '2026-01-01',
  },
  {
    id: 2,
    name: 'Titan Sweater',
    breed: 'Sweater',
    gender: 'Rooster',
    sire: '',
    dam: '',
    bird_code: '2',
    chicken_code: '2',
    status: 'Active',
    created_at: '2025-01-01',
  },
  {
    id: 3,
    name: 'Crimson Belle',
    breed: 'Hatch',
    gender: 'Hen',
    sire: '',
    dam: '',
    bird_code: 'E',
    chicken_code: 'E',
    status: 'Active',
    created_at: '2025-01-02',
  },
  // Extra grandparents for full 4-grandparent test
  {
    id: 4,
    name: 'Sire Grand Sire',
    breed: 'Sweater',
    gender: 'Rooster',
    sire: '',
    dam: '',
    bird_code: '1A',
    chicken_code: '1A',
    status: 'Active',
  },
  {
    id: 5,
    name: 'Sire Grand Dam',
    breed: 'Sweater',
    gender: 'Hen',
    sire: '',
    dam: '',
    bird_code: '1B',
    chicken_code: '1B',
    status: 'Active',
  },
  {
    id: 6,
    name: 'Dam Grand Sire',
    breed: 'Hatch',
    gender: 'Rooster',
    sire: '',
    dam: '',
    bird_code: '1C',
    chicken_code: '1C',
    status: 'Active',
  },
  {
    id: 7,
    name: 'Dam Grand Dam',
    breed: 'Hatch',
    gender: 'Hen',
    sire: '',
    dam: '',
    bird_code: '1D',
    chicken_code: '1D',
    status: 'Active',
  },
  {
    id: 8,
    name: 'Full Family Child',
    breed: '50% Hatch · 50% Sweater',
    gender: 'Rooster',
    sire: 'Sire Parent Full',
    dam: 'Dam Parent Full',
    bird_code: '3F1',
    chicken_code: '3F1',
    status: 'Active',
  },
  {
    id: 9,
    name: 'Sire Parent Full',
    breed: 'Sweater',
    gender: 'Rooster',
    sire: 'Sire Grand Sire',
    dam: 'Sire Grand Dam',
    bird_code: '3',
    chicken_code: '3',
    status: 'Active',
  },
  {
    id: 10,
    name: 'Dam Parent Full',
    breed: 'Hatch',
    gender: 'Hen',
    sire: 'Dam Grand Sire',
    dam: 'Dam Grand Dam',
    bird_code: 'F',
    chicken_code: 'F',
    status: 'Active',
  },
] as unknown as FowlRecord[];

function renderWithUI(ui: React.ReactNode) {
  return render(
    <UIProvider theme="light" setTheme={vi.fn()}>
      {ui}
    </UIProvider>
  );
}

describe('PedigreeTree Component & Grid Layout', () => {
  it('renders Subject 2E1 and merges unregistered grandparents into Foundation stock nodes', () => {
    const codes = resolveBirdCodes(sampleFowls);
    renderWithUI(
      <PedigreeTree
        fowls={sampleFowls}
        codes={codes}
        selectedId={1}
        canRegisterAncestor={true}
      />
    );

    // Subject node
    expect(screen.getAllByText('Sweater Red Storm').length).toBeGreaterThan(0);
    expect(screen.getAllByText('50% Hatch · 50% Sweater').length).toBeGreaterThan(0);

    // G1 parents
    expect(screen.getAllByText('Titan Sweater').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Crimson Belle').length).toBeGreaterThan(0);

    // G2 grandparent nodes are merged unknown nodes
    const mergedNodes = screen.getAllByText('Foundation stock');
    expect(mergedNodes.length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Not registered').length).toBeGreaterThanOrEqual(2);
  });

  it('allows re-centering on an ancestor node when clicked', () => {
    const codes = resolveBirdCodes(sampleFowls);
    const onSelect = vi.fn();
    renderWithUI(
      <PedigreeTree
        fowls={sampleFowls}
        codes={codes}
        selectedId={1}
        onSelect={onSelect}
      />
    );

    const titanElements = screen.getAllByText('Titan Sweater');
    const titanCard = titanElements.map((el) => el.closest('[role="treeitem"]')).find(Boolean);
    expect(titanCard).toBeInTheDocument();

    fireEvent.click(titanCard!);
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ name: 'Titan Sweater' }));
  });

  it('supports searching subjects and navigating with Prev/Next buttons', () => {
    const codes = resolveBirdCodes(sampleFowls);
    const onSelect = vi.fn();
    renderWithUI(
      <PedigreeTree
        fowls={sampleFowls}
        codes={codes}
        selectedId={1}
        onSelect={onSelect}
      />
    );

    const prevButton = screen.getByRole('button', { name: /Previous chicken/i });
    const nextButton = screen.getByRole('button', { name: /Next chicken/i });

    expect(prevButton).toBeInTheDocument();
    expect(nextButton).toBeInTheDocument();

    fireEvent.click(nextButton);
    expect(onSelect).toHaveBeenCalled();
  });

  it('VERIFIES NO TWO NODE BOXES OVERLAP (bounding box grid test) for 2E1, full grandparents, and foundation bird', () => {
    const byName = new Map<string, FowlRecord>();
    sampleFowls.forEach((f) => byName.set(f.name.toLowerCase(), f));

    // Case 1: 2E1 Sweater Red Storm (2 merged grandparent nodes)
    const subject2E1 = sampleFowls.find((f) => f.id === 1)!;
    const grid1 = buildPedigreeGrid(subject2E1, sampleFowls, byName, 3);
    expect(grid1.nodes.length).toBe(5); // 1 subject + 2 parents + 2 merged unknown

    // Case 2: Full Family Child (4 registered grandparents)
    const subjectFull = sampleFowls.find((f) => f.id === 8)!;
    const grid2 = buildPedigreeGrid(subjectFull, sampleFowls, byName, 3);
    expect(grid2.nodes.length).toBe(7); // 1 subject + 2 parents + 4 grandparents

    // Case 3: Foundation bird with no parents (Titan Sweater)
    const subjectBase = sampleFowls.find((f) => f.id === 2)!;
    const grid3 = buildPedigreeGrid(subjectBase, sampleFowls, byName, 3);
    expect(grid3.nodes.length).toBe(2); // 1 subject + 1 merged unknown for parents

    // Verify mathematical non-intersection across all cases:
    [grid1, grid2, grid3].forEach(({ nodes }) => {
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          if (a.gen === b.gen) {
            const aEnd = a.startRow + a.rowSpan - 1;
            const bEnd = b.startRow + b.rowSpan - 1;
            const overlaps = !(aEnd < b.startRow || bEnd < a.startRow);
            expect(overlaps).toBe(false);
          }
        }
      }
    });
  });
});
