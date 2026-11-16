import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import LineageDirectory from './LineageDirectory';
import { UIProvider } from '@/lib/contexts/ui-context';
import type { FowlRecord, MatchRecord, PairingStats } from '@/lib/types';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/lineage',
  useSearchParams: () => new URLSearchParams(),
}));

const resolvePhoto = vi.hoisted(() => vi.fn());

vi.mock('@/lib/chicken-photo', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/chicken-photo')>();
  return {
    ...actual,
    resolveChickenPhotoUrl: resolvePhoto,
  };
});

type ObserverCallback = (entries: IntersectionObserverEntry[]) => void;

class ObserverMock {
  static instances: ObserverMock[] = [];
  observe = vi.fn();
  disconnect = vi.fn();
  constructor(private callback: ObserverCallback) {
    ObserverMock.instances.push(this);
  }
  trigger(isIntersecting = true) {
    this.callback([{ isIntersecting } as IntersectionObserverEntry]);
  }
}

function bird(partial: Partial<FowlRecord> & { id: number; name: string }): FowlRecord {
  return {
    breed: 'Kelso',
    gender: 'Rooster',
    sire: '',
    dam: '',
    bird_code: '',
    wing_band: '',
    bloodline_pct: 100,
    status: 'Active',
    ...partial,
  } as FowlRecord;
}

const family: FowlRecord[] = [
  bird({
    id: 1,
    name: 'Sire One',
    gender: 'Rooster',
    bird_code: '1',
    photo_path: 'user-1/1/full.webp',
    photo_thumb_path: 'user-1/1/thumb.webp',
  }),
  bird({
    id: 2,
    name: 'Dam A',
    gender: 'Hen',
    bird_code: 'A',
    photo_path: 'user-1/2/full.webp',
    photo_thumb_path: 'user-1/2/thumb.webp',
  }),
  bird({
    id: 3,
    name: 'Cock One',
    gender: 'Rooster',
    sire: 'Sire One',
    dam: 'Dam A',
    bird_code: '1A1',
    photo_path: 'user-1/3/full.webp',
    photo_thumb_path: 'user-1/3/thumb.webp',
  }),
  bird({ id: 4, name: 'Cock Two', gender: 'Rooster', sire: 'Sire One', dam: 'Dam A', bird_code: '1A2' }),
  bird({
    id: 5,
    name: 'Hen One',
    gender: 'Hen',
    sire: 'Sire One',
    dam: 'Dam A',
    bird_code: '1A3',
    photo_path: 'user-1/5/full.webp',
    photo_thumb_path: 'user-1/5/thumb.webp',
  }),
];

function renderFamilies(onPick = vi.fn()) {
  const result = render(
    <UIProvider theme="light" setTheme={() => {}}>
      <LineageDirectory
        fowls={family}
        matchHistory={[] as MatchRecord[]}
        pairingAnalytics={{ all: new Map<string, PairingStats>(), ranked: [] }}
        setSelectedFowlForDetails={onPick}
      />
    </UIProvider>,
  );
  fireEvent.click(screen.getByRole('tab', { name: /Full Siblings & Families/i }));
  return { ...result, onPick };
}

async function revealAvatars() {
  await act(async () => {
    for (const observer of ObserverMock.instances) observer.trigger(true);
  });
}

describe('Full Siblings & Families photos', () => {
  beforeEach(() => {
    ObserverMock.instances = [];
    vi.stubGlobal('IntersectionObserver', ObserverMock);
    Object.defineProperty(window, 'IntersectionObserver', {
      configurable: true,
      writable: true,
      value: ObserverMock,
    });
    localStorage.clear();
    sessionStorage.clear();
    resolvePhoto.mockReset();
    resolvePhoto.mockImplementation(async (path: string) => `https://cdn.test/${path}`);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete (window as Window & { IntersectionObserver?: typeof IntersectionObserver })
      .IntersectionObserver;
    vi.restoreAllMocks();
  });

  it('renders thumbnails for cocks, hens and the header Sire/Dam chips', async () => {
    renderFamilies();
    resolvePhoto.mockClear();
    await revealAvatars();

    for (const name of ['Sire One', 'Dam A', 'Cock One', 'Hen One']) {
      expect(
        await screen.findByRole('button', { name: `View photo of ${name}` }),
      ).toBeInTheDocument();
    }

    expect(resolvePhoto).toHaveBeenCalledWith('user-1/1/thumb.webp');
    expect(resolvePhoto).toHaveBeenCalledWith('user-1/2/thumb.webp');
    expect(resolvePhoto).toHaveBeenCalledWith('user-1/3/thumb.webp');
    expect(resolvePhoto).toHaveBeenCalledWith('user-1/5/thumb.webp');
  });

  it('shows initials when a cock has no photo and still keeps the row profile click', async () => {
    const { onPick } = renderFamilies();
    await revealAvatars();

    expect(screen.getByText('CT')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Cock Two'));
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ name: 'Cock Two' }));
  });

  it('opens the photo lightbox without triggering the row profile click', async () => {
    const { onPick } = renderFamilies();
    await revealAvatars();

    const avatar = await screen.findByRole('button', { name: 'View photo of Cock One' });
    fireEvent.click(avatar);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(onPick).not.toHaveBeenCalled();
  });

  it('keeps hen rows free of fight data and leaves the family TOTAL unchanged', async () => {
    renderFamilies();
    await revealAvatars();

    const henChip = screen.getByText('Hen One').closest('span')?.parentElement as HTMLElement;
    expect(henChip).not.toHaveTextContent(/No fights|\d+W-\d+L|%/);
    expect(screen.getByText(/Total .* Cocks only/i)).toBeInTheDocument();
    expect(screen.getByText('0 of 2 cocks fought')).toBeInTheDocument();
    expect(screen.getAllByText('0W-0L').length).toBeGreaterThan(0);
  });

  it('does not resolve photos for offscreen family cards', async () => {
    renderFamilies();
    resolvePhoto.mockClear();
    expect(ObserverMock.instances.length).toBeGreaterThan(0);
    expect(resolvePhoto).not.toHaveBeenCalled();

    await revealAvatars();
    await waitFor(() => expect(resolvePhoto).toHaveBeenCalled());
  });
});
