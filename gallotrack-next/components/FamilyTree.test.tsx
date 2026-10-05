import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { FowlRecord } from '@/lib/types';
import FamilyTree from './FamilyTree';

const bird = (partial: Partial<FowlRecord> & { id: number; name: string }): FowlRecord =>
  ({
    breed: 'Kelso',
    gender: 'Rooster',
    sire: '',
    dam: '',
    bloodline_pct: 100,
    status: 'Active',
    ...partial,
  }) as FowlRecord;

const family: FowlRecord[] = [
  bird({ id: 1, name: 'Sire 1', gender: 'Rooster' }),
  bird({ id: 2, name: 'Dam A', gender: 'Hen' }),
  bird({ id: 3, name: 'Offspring 1A1', gender: 'Rooster', sire: 'Sire 1', dam: 'Dam A' }),
  bird({ id: 4, name: 'Offspring 1A2', gender: 'Hen', sire: 'Sire 1', dam: 'Dam A' }),
  bird({ id: 5, name: 'Offspring 1A3', gender: 'Hen', sire: 'Sire 1', dam: 'Dam A' }),
  bird({ id: 6, name: 'Dam C', gender: 'Hen' }),
  bird({ id: 7, name: 'Grandchild', gender: 'Rooster', sire: 'Offspring 1A1', dam: 'Dam C' }),
];

describe('FamilyTree', () => {
  it('shows the breeding pair and its offspring', () => {
    render(<FamilyTree fowls={family} codes={new Map()} />);
    expect(screen.getAllByText('Sire')).toHaveLength(2);
    expect(screen.getAllByText('Dam')).toHaveLength(2);
    expect(screen.getByText('Sire 1')).toBeInTheDocument();
    expect(screen.getByText('Dam A')).toBeInTheDocument();
    expect(screen.getAllByText('Offspring 1A1')).toHaveLength(2);
    expect(screen.getByText('Offspring 1A2')).toBeInTheDocument();
    expect(screen.getByText('Offspring 1A3')).toBeInTheDocument();
    expect(screen.getAllByText('Breeding Pair')).toHaveLength(2);
    expect(screen.getByText('3 offspring · 1 male · 2 female')).toBeInTheDocument();
  });

  it('groups offspring into roosters and hens with counts', () => {
    render(<FamilyTree fowls={family} codes={new Map()} />);
    expect(screen.getAllByText(/Sire · 1/)).toHaveLength(2);
    expect(screen.getByText(/Dam · 2/)).toBeInTheDocument();
    const roosterGroup = screen
      .getAllByText('Offspring 1A1')
      .map((el) => el.closest('.gt-kids'))
      .find((el) => el !== null);
    const henGroup = screen.getByText('Offspring 1A2').closest('.gt-kids');
    expect(roosterGroup).toBeTruthy();
    expect(henGroup).toBeTruthy();
    expect(roosterGroup).not.toBe(henGroup);
  });

  it('nests grandchildren under their parent when depth allows', () => {
    render(<FamilyTree fowls={family} codes={new Map()} />);
    // once under Offspring 1A1, once as a member of its own pair
    expect(screen.getAllByText('Grandchild')).toHaveLength(2);
    expect(screen.getByText('1 child')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Offspring' }));
    expect(screen.getAllByText('Grandchild')).toHaveLength(1);
  });

  it('filters pairs by the query', () => {
    render(<FamilyTree fowls={family} codes={new Map()} query="offspring 1a2" />);
    expect(screen.getByText('Offspring 1A2')).toBeInTheDocument();
    expect(screen.queryByText('Offspring 1A1')).not.toBeInTheDocument();
    expect(screen.getByText('Sire 1')).toBeInTheDocument();
  });

  it('shows an empty state when no pair can be built', () => {
    render(
      <FamilyTree
        fowls={[bird({ id: 1, name: 'Lone Bird', sire: '', dam: '' })]}
        codes={new Map()}
      />
    );
    expect(screen.getByText('No Breeding Pairs Found')).toBeInTheDocument();
  });

  it('lets a pair be collapsed', () => {
    render(<FamilyTree fowls={family} codes={new Map()} />);
    expect(screen.getByText('Offspring 1A2')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Collapse' })[0]);
    expect(screen.queryByText('Offspring 1A2')).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Expand' })[0]);
    expect(screen.getByText('Offspring 1A2')).toBeInTheDocument();
  });
});
