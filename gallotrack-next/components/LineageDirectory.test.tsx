import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { FowlRecord, PairingStats } from '@/lib/types';
import LineageDirectory from './LineageDirectory';
import { UIProvider, useUI } from '@/lib/contexts/ui-context';

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

function FightProbe() {
  const ui = useUI();
  return <div data-testid="fight-probe">{ui.fightHistoryFowl?.name ?? 'none'}</div>;
}

function renderDirectory(onPick: (f: FowlRecord) => void = vi.fn()) {
  return render(
    <UIProvider theme="light" setTheme={() => {}}>
      <LineageDirectory
        fowls={family}
        matchHistory={[]}
        pairingAnalytics={{ all: new Map<string, PairingStats>(), ranked: [] }}
        search=""
        setSearch={() => {}}
        debouncedSearch=""
        setSelectedFowlForDetails={onPick}
      />
      <FightProbe />
    </UIProvider>
  );
}

describe('LineageDirectory', () => {
  it('shows offspring, breeding pairs, and total chickens as separate labeled counts', () => {
    renderDirectory();
    const valueOf = (label: string) => {
      const labelNode = screen.getAllByText(label)[0];
      return (labelNode.previousElementSibling as HTMLElement | null)?.textContent;
    };
    expect(valueOf('Offspring (Registered Children)')).toBe('4');
    expect(valueOf('Breeding Pairs')).toBe('2');
    expect(valueOf('Full-Sibling Families')).toBe('1');
    expect(valueOf('Total Chickens Tracked')).toBe('7');
  });

  it('opens the standalone fight history for an offspring row', () => {
    renderDirectory();
    fireEvent.click(screen.getByRole('button', { name: 'View all fights for Offspring 1A2' }));
    expect(screen.getByTestId('fight-probe')).toHaveTextContent('Offspring 1A2');
  });

  it('opens the chicken profile when an offspring name is clicked', () => {
    const onPick = vi.fn();
    renderDirectory(onPick);
    fireEvent.click(screen.getByRole('button', { name: /Offspring 1A1 Sire/ }));
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ name: 'Offspring 1A1' }));
  });
});
