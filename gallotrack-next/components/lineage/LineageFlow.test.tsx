import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { FowlRecord, MatchRecord } from '@/lib/types';
import LineageFlow from './LineageFlow';
import type { LineageDirection } from '@/lib/lineage-graph';

const bird = (partial: Partial<FowlRecord> & { id: number; name: string }): FowlRecord =>
  ({
    breed: 'Kelso',
    gender: 'Rooster',
    sire: '',
    dam: '',
    bird_code: '',
    bloodline_pct: 100,
    status: 'Active',
    ...partial,
  }) as FowlRecord;

const family: FowlRecord[] = [
  bird({ id: 1, name: 'Sire 1', gender: 'Rooster', bird_code: '1' }),
  bird({ id: 2, name: 'Dam A', gender: 'Hen', bird_code: 'A' }),
  bird({ id: 3, name: 'Offspring 1A1', gender: 'Rooster', sire: 'Sire 1', dam: 'Dam A', bird_code: '1A1' }),
  bird({ id: 4, name: 'Offspring 1A2', gender: 'Hen', sire: 'Sire 1', dam: 'Dam A', bird_code: '1A2' }),
  bird({ id: 5, name: 'Offspring 1A3', gender: 'Hen', sire: 'Sire 1', dam: 'Dam A', bird_code: '1A3' }),
  bird({ id: 6, name: 'Dam C', gender: 'Hen', bird_code: 'C' }),
  bird({ id: 7, name: 'Grandchild', gender: 'Rooster', sire: 'Offspring 1A1', dam: 'Dam C', bird_code: '1A1C1' }),
];

const match = (id: number, fowlId: number, entryName: string, outcome: 'Win' | 'Loss'): MatchRecord => ({
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

interface HarnessProps {
  fowls?: FowlRecord[];
  matchHistory?: MatchRecord[];
  initialRoot?: string;
  initialDirection?: LineageDirection;
  query?: string;
  onPick?: (fowl: FowlRecord) => void;
  onShowFights?: (fowl: FowlRecord) => void;
  onOpenAsSire?: (fowl: FowlRecord) => void;
  onOpenAsDam?: (fowl: FowlRecord) => void;
}

function Harness({
  fowls = family,
  matchHistory = [],
  initialRoot,
  initialDirection = 'down',
  query = '',
  onPick = vi.fn(),
  onShowFights = vi.fn(),
  onOpenAsSire,
  onOpenAsDam,
}: HarnessProps) {
  const [rootName, setRootName] = useState<string | null>(initialRoot ?? null);
  const [direction, setDirection] = useState<LineageDirection>(initialDirection);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  return (
    <LineageFlow
      fowls={fowls}
      codes={new Map()}
      matchHistory={matchHistory}
      query={query}
      rootName={rootName}
      onRootChange={setRootName}
      direction={direction}
      onDirectionChange={setDirection}
      collapsedNodes={collapsed}
      onToggleCollapsed={(id) =>
        setCollapsed((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        })
      }
      onExpandAll={() => setCollapsed(new Set())}
      onCollapseAll={() => setCollapsed(new Set(['1', '3']))}
      onPick={onPick}
      onShowFights={onShowFights}
      onOpenAsSire={onOpenAsSire}
      onOpenAsDam={onOpenAsDam}
    />
  );
}

const cardFor = (name: string): HTMLElement => {
  const card = screen
    .getAllByTestId('lineage-bird-card')
    .find((el) => el.textContent?.includes(name));
  if (!card) throw new Error(`No bird card for ${name}`);
  return card;
};

describe('LineageFlow pedigree canvas', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders a layered pedigree with generation labels, bird cards and a pair hub', () => {
    render(<Harness />);

    expect(screen.getByRole('region', { name: 'Pedigree canvas' })).toBeInTheDocument();
    expect(screen.getByText('Generation 1 · Root')).toBeInTheDocument();
    expect(screen.getByText('Generation 2')).toBeInTheDocument();
    expect(screen.getByText('Generation 3')).toBeInTheDocument();

    expect(cardFor('Sire 1')).toHaveTextContent('Cock');
    expect(cardFor('Dam A')).toHaveTextContent('Hen');
    expect(cardFor('Offspring 1A1')).toBeInTheDocument();
    expect(cardFor('Grandchild')).toBeInTheDocument();

    expect(
      screen.getByRole('button', {
        name: 'Breeding pair Sire 1 × Dam A, 3 offspring',
      })
    ).toBeInTheDocument();
  });

  it('shows bird details, parents, offspring and record actions', () => {
    const onPick = vi.fn();
    const onShowFights = vi.fn();
    render(<Harness onPick={onPick} onShowFights={onShowFights} matchHistory={[match(1, 3, 'Offspring 1A1', 'Win')]} />);

    fireEvent.click(cardFor('Offspring 1A1'));
    const details = screen.getByTestId('lineage-details');
    expect(within(details).getByText('Offspring 1A1')).toBeInTheDocument();
    expect(within(details).getByText('Sire')).toBeInTheDocument();
    expect(within(details).getByText('Dam')).toBeInTheDocument();
    expect(within(details).getByTitle('Grandchild')).toBeInTheDocument();
    expect(within(details).getByText(/1W-0L/)).toBeInTheDocument();

    fireEvent.click(within(details).getByRole('button', { name: /View profile/i }));
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ name: 'Offspring 1A1' }));

    fireEvent.click(within(details).getByRole('button', { name: /Fight history/i }));
    expect(onShowFights).toHaveBeenCalledWith(expect.objectContaining({ name: 'Offspring 1A1' }));
  });

  it('collapses and expands a branch without duplicating nodes', () => {
    render(<Harness />);

    expect(cardFor('Grandchild')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Collapse branch of Sire 1' }));

    expect(screen.queryAllByTestId('lineage-bird-card').some((el) => el.textContent?.includes('Grandchild'))).toBe(false);
    const expand = screen.getByRole('button', { name: /Expand branch of Sire 1/ });
    expect(expand).toBeInTheDocument();

    fireEvent.click(expand);
    expect(cardFor('Grandchild')).toBeInTheDocument();
    expect(screen.getAllByTestId('lineage-bird-card')).toHaveLength(new Set(family.map((f) => f.id)).size);
  });

  it('reveals deeper generations from the depth control and the hidden-relative badge', () => {
    render(<Harness />);

    fireEvent.change(screen.getByLabelText('Generation depth'), { target: { value: '2' } });
    expect(screen.queryAllByTestId('lineage-bird-card').some((el) => el.textContent?.includes('Grandchild'))).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: /Show 1 more relatives of Offspring 1A1/i }));
    expect(cardFor('Grandchild')).toBeInTheDocument();
  });

  it('walks ancestors above the selected bird', () => {
    render(<Harness initialRoot="Grandchild" />);

    fireEvent.click(screen.getByRole('button', { name: 'Ancestors' }));

    expect(cardFor('Grandchild')).toBeInTheDocument();
    expect(cardFor('Offspring 1A1')).toBeInTheDocument();
    expect(cardFor('Dam C')).toBeInTheDocument();
    expect(cardFor('Sire 1')).toBeInTheDocument();
    expect(screen.getByText('Generation 3 · Root')).toBeInTheDocument();
  });

  it('finds a bird and re-roots the canvas, with a no-match state', () => {
    render(<Harness />);

    const finder = screen.getByLabelText('Find a bird');
    fireEvent.change(finder, { target: { value: 'Grandchild' } });
    fireEvent.keyDown(finder, { key: 'Enter' });

    const rootCard = cardFor('Grandchild');
    expect(rootCard).toHaveTextContent('Root');
    expect(screen.getByTestId('lineage-details')).toHaveTextContent('Grandchild');

    fireEvent.change(finder, { target: { value: 'zzz' } });
    expect(screen.getByText('No birds match.')).toBeInTheDocument();
  });

  it('surfaces global search matches and can focus the first one', () => {
    render(<Harness query="Grandchild" />);

    expect(screen.getByText(/1 match for/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Focus first/i }));
    expect(screen.getByTestId('lineage-details')).toHaveTextContent('Grandchild');
  });

  it('shows pair details with Sire and Dam role boxes and every offspring', () => {
    render(<Harness />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Breeding pair Sire 1 × Dam A, 3 offspring' })
    );
    const details = screen.getByTestId('lineage-details');
    expect(within(details).getByText('Sire')).toBeInTheDocument();
    expect(within(details).getByText('Dam')).toBeInTheDocument();
    expect(within(details).getAllByText('Offspring 1A1').length).toBeGreaterThanOrEqual(1);
    expect(within(details).getByText('Offspring 1A2')).toBeInTheDocument();
    expect(within(details).getByText('Offspring 1A3')).toBeInTheDocument();
  });

  it('zooms, resets and toggles the expanded canvas', () => {
    render(<Harness />);

    expect(screen.getByText('100%')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Zoom in'));
    expect(screen.queryByText('100%')).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Reset view'));
    expect(screen.getByText('100%')).toBeInTheDocument();

    const expand = screen.getByRole('button', { name: 'Expand canvas' });
    fireEvent.click(expand);
    expect(screen.getByRole('button', { name: 'Exit expanded canvas' })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByRole('button', { name: 'Expand canvas' })).toBeInTheDocument();
  });

  it('never fabricates a parent that is not registered', () => {
    const fowls: FowlRecord[] = [
      bird({ id: 10, name: 'External Sire' }),
      bird({ id: 11, name: 'Registered Dam', gender: 'Hen' }),
      bird({ id: 12, name: 'Single Parent Child', sire: 'Not In Registry', dam: 'Registered Dam' }),
    ];
    render(<Harness fowls={fowls} initialRoot="Registered Dam" />);

    expect(cardFor('Registered Dam')).toBeInTheDocument();
    expect(cardFor('Single Parent Child')).toBeInTheDocument();
    expect(screen.queryAllByTestId('lineage-bird-card').some((el) => el.textContent?.includes('Not In Registry'))).toBe(false);
    expect(screen.queryByTestId('lineage-pair-hub')).not.toBeInTheDocument();

    fireEvent.click(cardFor('Single Parent Child'));
    const details = screen.getByTestId('lineage-details');
    expect(within(details).getByText(/Not In Registry \(not registered\)/i)).toBeInTheDocument();
    expect(within(details).getByText('Registered Dam')).toBeInTheDocument();
  });

  it('highlights one sex without hiding the relationship context', () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: 'Hens' }));
    expect(cardFor('Dam A').className).not.toMatch(/opacity-40/);
    expect(cardFor('Sire 1').className).toMatch(/opacity-40/);

    fireEvent.click(screen.getByRole('button', { name: 'Cocks' }));
    expect(cardFor('Sire 1').className).not.toMatch(/opacity-40/);
    expect(cardFor('Dam A').className).toMatch(/opacity-40/);

    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    expect(cardFor('Sire 1').className).not.toMatch(/opacity-40/);
    expect(cardFor('Dam A').className).not.toMatch(/opacity-40/);
  });

  it('offers parent-role navigation only when the bird is a parent', () => {
    const onOpenAsSire = vi.fn();
    render(<Harness onOpenAsSire={onOpenAsSire} />);

    fireEvent.click(cardFor('Offspring 1A1'));
    const details = screen.getByTestId('lineage-details');
    fireEvent.click(within(details).getByRole('button', { name: 'Sire tree' }));
    expect(onOpenAsSire).toHaveBeenCalledWith(expect.objectContaining({ name: 'Offspring 1A1' }));

    expect(within(details).queryByRole('button', { name: 'Dam tree' })).not.toBeInTheDocument();
  });
});
