import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import BreedingHub from './BreedingHub';
import { LanguageProvider } from '@/lib/i18n';
import type { BreedingPairRecord, FowlRecord, MatchRecord } from '@/lib/types';
import { fetchBreedingPairings } from '@/lib/services/breeding-service';

const navMocks = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => navMocks,
  usePathname: () => '/breeding',
  useSearchParams: () => new URLSearchParams(''),
}));

vi.mock('@/lib/chicken-photo', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/chicken-photo')>();
  return {
    ...actual,
    resolveChickenPhotoUrl: vi.fn().mockResolvedValue(null),
    clearChickenPhotoUrlCache: vi.fn(),
  };
});

vi.mock('@/lib/services/breeding-service', () => ({
  fetchBreedingPairings: vi.fn().mockResolvedValue({ data: [], error: null }),
  fetchSafetyIncidents: vi.fn().mockResolvedValue({ data: [], error: null }),
  insertBreedingPairing: vi.fn(),
  updateBreedingPairingOutcome: vi.fn(),
  deleteBreedingPairing: vi.fn(),
  insertSafetyIncident: vi.fn(),
  deleteSafetyIncident: vi.fn(),
}));

type FowlOptions = Partial<FowlRecord>;

const fowl = (
  id: number,
  name: string,
  gender: string,
  birdCode: string,
  options: FowlOptions = {},
): FowlRecord =>
  ({
    id,
    name,
    gender,
    breed: 'Hatch',
    bird_code: birdCode,
    status: 'Active',
    sire: '',
    dam: '',
    ...options,
  }) as FowlRecord;

const match = (id: number, fowlId: number, outcome = 'Win'): MatchRecord =>
  ({
    id,
    fowl_id: fowlId,
    date: '2026-10-01',
    entry_name: 'Test Bird',
    breed: 'Hatch',
    opponent: 'Opponent',
    location: 'Arena',
    type: 'Derby',
    outcome,
    status: 'Verified',
  }) as MatchRecord;

const baseFowls = [
  fowl(1, 'Sire One', 'Rooster', '1'),
  fowl(2, 'Hen One', 'Hen', 'A'),
  fowl(3, 'Chick One', 'Rooster', '1A1', { sire: 'Sire One', dam: 'Hen One' }),
];

function cardFor(label: string): HTMLElement {
  const labelNode = screen.getByText(label);
  const card = labelNode.closest('article');
  if (!(card instanceof HTMLElement)) throw new Error(`Card not found for ${label}`);
  return card;
}

function renderHub(fowls: FowlRecord[], matchHistory: MatchRecord[] = []) {
  return render(
    <BreedingHub
      fowls={fowls}
      matchHistory={matchHistory}
      pairingAnalytics={{ all: new Map(), ranked: [] }}
      setSelectedFowlForDetails={vi.fn()}
    />,
  );
}

async function openIdentityTab() {
  fireEvent.click(screen.getByRole('tab', { name: 'Chicken Identity' }));
  await screen.findByText('Unique Chicken Identity');
}

beforeEach(() => {
  navMocks.push.mockClear();
  navMocks.replace.mockClear();
  navMocks.back.mockClear();
  window.history.replaceState(null, '', '/breeding');
});

describe('Breeding Hub summary cards', () => {
  it('uses lucide icons instead of emoji and keeps labels and numbers', () => {
    renderHub(baseFowls);

    const labels = ['Breeding Males', 'Breeding Females', 'Offspring', 'Active Pairs'];
    for (const label of labels) {
      const card = cardFor(label);
      expect(within(card).getByText(label)).toBeInTheDocument();
      const icon = card.querySelector('svg');
      expect(icon).not.toBeNull();
      expect(icon).toHaveAttribute('aria-hidden', 'true');
      expect(card.textContent).not.toMatch(/\p{Extended_Pictographic}|\uFE0F/u);
    }

    expect(within(cardFor('Breeding Males')).getByText('1')).toBeInTheDocument();
    expect(within(cardFor('Breeding Females')).getByText('1')).toBeInTheDocument();
    expect(within(cardFor('Breeding Males')).getByText('Cocks: 1')).toBeInTheDocument();
    expect(within(cardFor('Breeding Females')).getByText('Hens: A')).toBeInTheDocument();
    expect(within(cardFor('Offspring')).getByText('Chicks: 1A1')).toBeInTheDocument();
  });

  it('renders every KPI count and caption from the real codes', () => {
    const fowls = [
      fowl(1, 'Sire 1', 'Rooster', '1'),
      fowl(2, 'Sire 2', 'Rooster', '2'),
      fowl(3, 'Dam A', 'Hen', 'A'),
      fowl(4, 'Dam B', 'Hen', 'B'),
      fowl(5, 'Offspring 1A1', 'Rooster', '1A1', { sire: 'Sire 1', dam: 'Dam A' }),
      fowl(6, 'Offspring 2B1', 'Hen', '2B1', { sire: 'Sire 2', dam: 'Dam B' }),
      fowl(7, 'Custom Bird', 'Rooster', 'CUSTOM1'),
    ];
    renderHub(fowls);

    expect(within(cardFor('Breeding Males')).getByText('2')).toBeInTheDocument();
    expect(within(cardFor('Breeding Males')).getByText('Cocks: 1, 2')).toBeInTheDocument();
    expect(within(cardFor('Breeding Females')).getByText('2')).toBeInTheDocument();
    expect(within(cardFor('Breeding Females')).getByText('Hens: A, B')).toBeInTheDocument();
    expect(within(cardFor('Offspring')).getByText('2')).toBeInTheDocument();
    expect(within(cardFor('Offspring')).getByText('Chicks: 1A1, 2B1')).toBeInTheDocument();
    expect(within(cardFor('Active Pairs')).getByText('0')).toBeInTheDocument();
    expect(within(cardFor('Active Pairs')).getByText('Breeding pairs')).toBeInTheDocument();
  });
});

describe('Breeding Hub chicken identity', () => {
  it('orders parents, offspring groups and custom birds by code', async () => {
    const fowls = [
      fowl(1, 'Sire 2', 'Rooster', '2'),
      fowl(2, 'Sire 1', 'Rooster', '1'),
      fowl(3, 'Dam B', 'Hen', 'B'),
      fowl(4, 'Dam A', 'Hen', 'A'),
      fowl(5, 'Offspring 1A10', 'Rooster', '1A10', { sire: 'Sire 1', dam: 'Dam A' }),
      fowl(6, 'Offspring 1A2', 'Hen', '1A2', { sire: 'Sire 1', dam: 'Dam A' }),
      fowl(7, 'Offspring 1A1', 'Rooster', '1A1', { sire: 'Sire 1', dam: 'Dam A' }),
      fowl(8, 'Custom Bird', 'Rooster', 'CUSTOM1'),
    ];
    renderHub(fowls);
    await openIdentityTab();

    const cards = screen.getAllByTestId('identity-card');
    expect(cards.map((card) => card.getAttribute('data-fowl-name'))).toEqual([
      'Sire 1',
      'Sire 2',
      'Dam A',
      'Dam B',
      'Offspring 1A1',
      'Offspring 1A2',
      'Offspring 1A10',
      'Custom Bird',
    ]);
    expect(screen.getByTestId('identity-pair-heading')).toHaveTextContent('Sire 1 × Dam A');
    expect(screen.getAllByText('Offspring of Sire 1 × Dam A').length).toBeGreaterThan(0);
    expect(screen.getByText('Code for a new bird cock')).toBeInTheDocument();
    expect(screen.getByText('Code for a new bird hen')).toBeInTheDocument();
    expect(screen.getByTestId('identity-legend')).toHaveClass('hub-identity-legend');
  });

  it('uses initials when there is no photo and shows Photo unavailable when signing fails', async () => {
    const fowls = [
      fowl(1, 'Sire No Photo', 'Rooster', '1'),
      fowl(2, 'Hen Broken Photo', 'Hen', 'A', { photo_thumb_path: 'user-1/2/thumb.webp' }),
    ];
    renderHub(fowls);
    await openIdentityTab();

    const noPhoto = screen.getByText('Sire No Photo').closest('[data-testid="identity-card"]');
    const brokenPhoto = screen
      .getByText('Hen Broken Photo')
      .closest('[data-testid="identity-card"]');
    expect(noPhoto).toBeInstanceOf(HTMLElement);
    expect(brokenPhoto).toBeInstanceOf(HTMLElement);
    expect(within(noPhoto as HTMLElement).getByText('SN')).toBeInTheDocument();
    await waitFor(() =>
      expect(
        within(brokenPhoto as HTMLElement).getByText('Photo unavailable'),
      ).toBeInTheDocument(),
    );
  });

  it('never renders a fight record or No fights for hens, while cocks keep No fights', async () => {
    const fowls = [
      fowl(1, 'Cock No Fights', 'Rooster', '1', { wing_band: 'COCK-BAND' }),
      fowl(2, 'Hen With Record', 'Hen', 'A', { wing_band: 'HEN-BAND' }),
    ];
    renderHub(fowls, [match(1, 2)]);
    await openIdentityTab();

    const henCard = screen.getByText('Hen With Record').closest('[data-testid="identity-card"]');
    const cockCard = screen.getByText('Cock No Fights').closest('[data-testid="identity-card"]');
    expect(henCard).toBeInstanceOf(HTMLElement);
    expect(cockCard).toBeInstanceOf(HTMLElement);

    expect(within(henCard as HTMLElement).queryByTestId('identity-fight-summary')).toBeNull();
    expect(within(henCard as HTMLElement).queryByText('No fights')).toBeNull();
    expect(within(henCard as HTMLElement).queryByText(/\d+W-\d+L/)).toBeNull();
    expect(within(henCard as HTMLElement).queryByText('Wing Band: HEN-BAND')).toBeNull();

    expect(within(cockCard as HTMLElement).getByTestId('identity-fight-summary')).toHaveTextContent(
      'No fights',
    );
    expect(within(cockCard as HTMLElement).getByText('Wing Band: COCK-BAND')).toBeInTheDocument();
  });

  it('hides hen fight records in the Breeding Pairs offspring list too', async () => {
    const pair = {
      id: 1,
      sire_id: 1,
      dam_id: 2,
      sire_name: 'Sire One',
      dam_name: 'Hen One',
      sire_code: '1',
      dam_code: 'A',
      pairing_code: '1A',
      pairing_date: '2026-01-01',
      outcome: 'Active',
    } as BreedingPairRecord;
    vi.mocked(fetchBreedingPairings).mockResolvedValueOnce({ data: [pair] });

    const fowls = [
      fowl(1, 'Sire One', 'Rooster', '1'),
      fowl(2, 'Hen One', 'Hen', 'A'),
      fowl(3, 'Cock Offspring', 'Rooster', '1A1', { sire: 'Sire One', dam: 'Hen One' }),
      fowl(4, 'Hen Offspring', 'Hen', '1A2', { sire: 'Sire One', dam: 'Hen One' }),
    ];
    renderHub(fowls, [match(1, 4)]);

    fireEvent.click(screen.getByRole('tab', { name: 'Breeding Pairs' }));
    await screen.findByText('Sire One × Hen One');
    fireEvent.click(screen.getByRole('button', { name: /Offspring \(2\)/i }));

    const henRow = screen.getByText('Hen Offspring').closest('button');
    const cockRow = screen.getByText('Cock Offspring').closest('button');
    expect(henRow).toBeInstanceOf(HTMLElement);
    expect(cockRow).toBeInstanceOf(HTMLElement);
    expect(within(henRow as HTMLElement).queryByText('No fights')).toBeNull();
    expect(within(henRow as HTMLElement).queryByText(/\d+W-\d+L/)).toBeNull();
    expect(within(cockRow as HTMLElement).getByText('No fights')).toBeInTheDocument();
  });

  it.each([
    ['tl', 'Code para sa new bird cock', 'Offspring nina Sire 1 at Dam A'],
    ['hil', 'Code para sa new bird cock', 'Offspring ni Sire 1 kag Dam A'],
  ] as const)('shows translated legend and offspring caption in %s', async (lang, legend, caption) => {
    render(
      <LanguageProvider initialLanguage={lang}>
        <BreedingHub
          fowls={baseFowls}
          matchHistory={[]}
          pairingAnalytics={{ all: new Map(), ranked: [] }}
          setSelectedFowlForDetails={vi.fn()}
        />
      </LanguageProvider>,
    );
    await openIdentityTab();
    expect(screen.getByText(legend)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(caption)).toBeInTheDocument());
  });
});

describe('Breeding Hub coding system', () => {
  it('renders real generator examples and expands the farm code chips', async () => {
    const fowls = [
      ...Array.from({ length: 8 }, (_, index) =>
        fowl(index + 1, `Sire ${index + 1}`, 'Rooster', String(index + 1)),
      ),
      fowl(20, 'Dam A', 'Hen', 'A'),
      fowl(21, 'Dam B', 'Hen', 'B'),
      fowl(30, 'Offspring 1A1', 'Rooster', '1A1', { sire: 'Sire 1', dam: 'Dam A' }),
    ];
    renderHub(fowls);
    await screen.findByText('Coding System for Lineage');

    expect(screen.getAllByText('1A1').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('1A2').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('2B1').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('Sire 7')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /\+2 more/i }));
    expect(screen.getByText('Sire 7')).toBeInTheDocument();
    expect(screen.getByText('Sire 8')).toBeInTheDocument();
  });

  it('provides the four tabs, URL-backed selection, and arrow-key navigation', async () => {
    window.history.replaceState(null, '', '/breeding?tab=identity');
    renderHub(baseFowls);
    await screen.findByText('Unique Chicken Identity');
    expect(screen.getAllByRole('tab')).toHaveLength(4);
    expect(screen.getByRole('tab', { name: 'Coding System' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Breeding Pairs' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Chicken Identity' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: 'Safety Incidents' })).toBeInTheDocument();

    const identityTab = screen.getByRole('tab', { name: 'Chicken Identity' });
    fireEvent.keyDown(identityTab, { key: 'ArrowRight' });
    await screen.findByText('Record accidents, injuries, or illnesses for each chicken');
    expect(navMocks.push).toHaveBeenCalledWith('/breeding?tab=safety', { scroll: false });
    expect(screen.getByRole('tab', { name: 'Safety Incidents' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });
});