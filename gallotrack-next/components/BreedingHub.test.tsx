import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import BreedingHub from './BreedingHub';
import type { FowlRecord } from '@/lib/types';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/breeding',
  useSearchParams: () => new URLSearchParams(''),
}));

vi.mock('@/lib/services/breeding-service', () => ({
  fetchBreedingPairings: vi.fn().mockResolvedValue({ data: [], error: null }),
  fetchSafetyIncidents: vi.fn().mockResolvedValue({ data: [], error: null }),
  insertBreedingPairing: vi.fn(),
  updateBreedingPairingOutcome: vi.fn(),
  deleteBreedingPairing: vi.fn(),
  insertSafetyIncident: vi.fn(),
  deleteSafetyIncident: vi.fn(),
}));

const fowl = (id: number, name: string, gender: string, birdCode: string): FowlRecord =>
  ({
    id,
    name,
    gender,
    breed: 'Hatch',
    bird_code: birdCode,
    status: 'Active',
    sire: '',
    dam: '',
  }) as FowlRecord;

const fowls = [
  fowl(1, 'Sire One', 'Rooster', '1'),
  fowl(2, 'Hen One', 'Hen', 'A'),
  fowl(3, 'Chick One', 'Rooster', '1A1'),
];

function cardFor(label: string): HTMLElement {
  const labelNode = screen.getByText(label);
  const card = labelNode.closest('.bg-muted\\/40');
  if (!(card instanceof HTMLElement)) throw new Error(`Card not found for ${label}`);
  return card;
}

describe('Breeding Hub summary cards', () => {
  it('uses lucide icons instead of emoji and keeps labels and numbers', () => {
    render(
      <BreedingHub
        fowls={fowls}
        matchHistory={[]}
        pairingAnalytics={{ all: new Map(), ranked: [] }}
        setSelectedFowlForDetails={vi.fn()}
      />,
    );

    const labels = ['Breeding Males', 'Breeding Females', 'Offspring', 'Active Pairs'];
    for (const label of labels) {
      const card = cardFor(label);
      expect(within(card).getByText(label)).toBeInTheDocument();
      const icon = card.querySelector('svg');
      expect(icon).not.toBeNull();
      expect(icon).toHaveAttribute('aria-hidden', 'true');
      expect(card.textContent).not.toMatch(/\p{Extended_Pictographic}|\uFE0F/u);
    }

    expect(within(cardFor('Breeding Males')).getByText('2')).toBeInTheDocument();
    expect(within(cardFor('Breeding Females')).getByText('1')).toBeInTheDocument();
  });
});
