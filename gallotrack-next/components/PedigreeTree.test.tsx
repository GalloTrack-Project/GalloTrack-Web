import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PedigreeTree from './PedigreeTree';
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
] as unknown as FowlRecord[];

function renderWithUI(ui: React.ReactNode) {
  return render(
    <UIProvider theme="light" setTheme={vi.fn()}>
      {ui}
    </UIProvider>
  );
}

describe('PedigreeTree Component', () => {
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
    expect(screen.getAllByText('Not in registry').length).toBeGreaterThanOrEqual(2);
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

    const prevButton = screen.getByRole('button', { name: /Previous subject/i });
    const nextButton = screen.getByRole('button', { name: /Next subject/i });

    expect(prevButton).toBeInTheDocument();
    expect(nextButton).toBeInTheDocument();

    fireEvent.click(nextButton);
    expect(onSelect).toHaveBeenCalled();
  });
});
