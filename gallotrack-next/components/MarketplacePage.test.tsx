import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import MarketplacePage from './MarketplacePage';
import type { FowlRecord, MatchRecord } from '@/lib/types';
import { resolveChickenPhotoUrl } from '@/lib/chicken-photo';
import { registerToastHandler } from '@/lib/toast-bus';

const routerMocks = vi.hoisted(() => ({
  replace: vi.fn(),
  push: vi.fn(),
  back: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => routerMocks,
  usePathname: () => '/catalog',
}));

vi.mock('@/lib/chicken-photo', () => ({
  resolveChickenPhotoUrl: vi.fn(),
  clearChickenPhotoUrlCache: vi.fn(),
}));

const daysAgo = (days: number) => new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

const makeFowl = (overrides: Partial<FowlRecord>): FowlRecord =>
  ({
    id: 1,
    name: 'Young Cock',
    breed: 'Sweater',
    gender: 'Rooster',
    color: '',
    color_category: '',
    feather_color: 'Black-Breasted Red',
    trait: 'Fast',
    growth_stage: 'Stag',
    behavior_trait: '',
    eye_variant: '',
    birthdate: daysAgo(250),
    age: '',
    weight: '2.5',
    structural_weight: 2.5,
    height: '',
    structural_height: '',
    leg_color: '',
    sire: '',
    dam: '',
    sire_pct: 0,
    dam_pct: 0,
    bloodline_pct: 100,
    status: 'Active',
    ...overrides,
  }) as FowlRecord;

const baseFowls: FowlRecord[] = [
  makeFowl({ id: 1, name: 'Young Cock', bird_code: '1A1', wing_band: 'WB-03' }),
  makeFowl({
    id: 2,
    name: 'Hen Leader',
    gender: 'Hen',
    breed: 'Kelso',
    birthdate: daysAgo(900),
    structural_weight: 2.1,
    weight: '2.1',
    bird_code: 'A',
    wing_band: 'WB-02',
  }),
  makeFowl({
    id: 3,
    name: 'Archived Bird',
    status: 'Archived',
    breed: 'Hatch',
    birthdate: daysAgo(500),
    bird_code: 'ARC',
  }),
  makeFowl({
    id: 4,
    name: 'Deceased Bird',
    gender: 'Hen',
    status: 'Deceased',
    breed: '',
    birthdate: daysAgo(1000),
    bird_code: 'DEC',
  }),
];

const searchFowls: FowlRecord[] = [
  makeFowl({ id: 1, name: 'Sweater Crimson', bird_code: '1', wing_band: 'WB-01' }),
  makeFowl({ id: 2, name: 'Crimson Belle', gender: 'Hen', bird_code: 'A', wing_band: 'WB-02' }),
  makeFowl({
    id: 3,
    name: 'Sweater Red Storm',
    bird_code: '1A1',
    wing_band: 'WB-03',
    sire: 'Foundation Stock',
    dam: 'Crimson Belle',
    growth_stage: 'Stag',
  }),
  makeFowl({
    id: 4,
    name: 'Iron Thunder',
    breed: 'Hatch',
    bird_code: '1A2',
    wing_band: 'WB-99',
    sire: 'Iron Chief',
    dam: 'Lightning Queen',
  }),
];

function renderMarketplace(overrides: Record<string, unknown> = {}) {
  return render(
    <MarketplacePage
      fowls={baseFowls}
      matchHistory={[] as MatchRecord[]}
      setCurrentPage={vi.fn()}
      setProfilingSubTab={vi.fn()}
      {...overrides}
    />,
  );
}

beforeEach(() => {
  routerMocks.replace.mockClear();
  routerMocks.push.mockClear();
  routerMocks.back.mockClear();
  window.history.replaceState({}, '', '/catalog');
  localStorage.clear();
  localStorage.setItem(
    'gallotrack_user_preferences',
    JSON.stringify({ weight_unit: 'kg', height_unit: 'cm' }),
  );
  vi.mocked(resolveChickenPhotoUrl).mockReset();
  vi.mocked(resolveChickenPhotoUrl).mockResolvedValue(null);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Chicken Inventory heritage page', () => {
  it('renders one h1, the shared banner, and all six real-count tabs', async () => {
    renderMarketplace();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Chicken Inventory');

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(6);
    expect(screen.getByRole('tab', { name: 'All chickens, 4' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Active, 2' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Active breeders, 2' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Ready to breed, 2' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Archived, 1' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Deceased, 1' })).toBeInTheDocument();
    const allTab = screen.getByRole('tab', { name: 'All chickens, 4' });
    expect(allTab).toHaveAttribute('aria-selected', 'true');
    expect(allTab.className).toContain('focus-visible:ring-offset-2');
    expect(screen.getByTestId('inventory-tabs-container').className).toContain('overflow-x-auto');
  });

  it('supports arrow-key tab navigation and scrolls the selected tab into view', () => {
    const scrollIntoView = vi.fn();
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });
    try {
      renderMarketplace();
      const allTab = screen.getByRole('tab', { name: 'All chickens, 4' });
      allTab.focus();
      fireEvent.keyDown(allTab, { key: 'ArrowRight' });
      expect(screen.getByRole('tab', { name: 'Active, 2' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      expect(screen.getByRole('tab', { name: 'Active, 2' })).toHaveFocus();
      expect(scrollIntoView).toHaveBeenCalled();
    } finally {
      delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
    }
  });

  it('restores tab and search from the URL after mount', async () => {
    window.history.replaceState({}, '', '/catalog?tab=archived&q=Arch&sort=name-desc&page=1');
    renderMarketplace();

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Archived, 1' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
    });
    await waitFor(() => {
      expect(screen.getByLabelText(/Search inventory/i)).toHaveValue('Arch');
      expect(screen.getByRole('heading', { level: 4, name: /Archived Bird/i })).toBeInTheDocument();
    });
  });

  it('updates URL filters and responds to back/forward popstate', async () => {
    renderMarketplace();
    fireEvent.click(screen.getByRole('tab', { name: 'Archived, 1' }));
    expect(routerMocks.replace.mock.calls.some(([href]) => String(href).includes('tab=archived'))).toBe(true);

    window.history.replaceState({}, '', '/catalog?tab=deceased');
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Deceased, 1' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
    });
  });

  it('searches names normally and includes parents only when requested', async () => {
    renderMarketplace({ fowls: searchFowls });
    const search = screen.getByLabelText(/Search inventory/i);
    fireEvent.change(search, { target: { value: 'crim' } });

    await waitFor(() => {
      expect(screen.getByText('2 chickens')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 4, name: /Crimson Belle/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 4, name: /Sweater Crimson/i })).toBeInTheDocument();
    });
    expect(screen.queryByRole('heading', { level: 4, name: /Sweater Red Storm/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/Include parents/i));
    await waitFor(() => {
      expect(screen.getByText('3 chickens')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 4, name: /Sweater Red Storm/i })).toBeInTheDocument();
      expect(screen.getByText(/Dam: Crimson Belle/i)).toBeInTheDocument();
    });
  });

  it('matches wing bands for cocks only', async () => {
    renderMarketplace();
    const search = screen.getByLabelText(/Search inventory/i);
    fireEvent.change(search, { target: { value: 'WB-02' } });
    await waitFor(() => {
      expect(screen.getByText('No chickens match your filters')).toBeInTheDocument();
    });

    fireEvent.change(search, { target: { value: 'WB-03' } });
    await waitFor(() => {
      expect(screen.getByText('1 chickens')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 4, name: /Young Cock/i })).toBeInTheDocument();
    });
  });

  it('combines role and sex filters and clears them', async () => {
    renderMarketplace();
    fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'breeding-female' } });
    fireEvent.change(screen.getByLabelText('Sex'), { target: { value: 'female' } });

    expect(screen.getByRole('heading', { level: 4, name: /Hen Leader/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 4, name: /Young Cock/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Clear filters/i }));
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 4, name: /Young Cock/i })).toBeInTheDocument();
      expect(screen.getByLabelText('Role')).toHaveValue('all');
      expect(screen.getByLabelText('Sex')).toHaveValue('all');
    });
  });

  it('filters Foundation stock, Purebred, and Crossbred with the existing classifier', () => {
    const typeFowls: FowlRecord[] = [
      makeFowl({ id: 1, name: 'Foundation Bird', breed: 'Sweater', bird_code: 'F1' }),
      makeFowl({ id: 2, name: 'Sweater Sire', breed: 'Sweater', bird_code: 'S1' }),
      makeFowl({ id: 3, name: 'Sweater Dam', breed: 'Sweater', gender: 'Hen', bird_code: 'D1' }),
      makeFowl({
        id: 4,
        name: 'Purebred Child',
        breed: 'Sweater',
        sire: 'Sweater Sire',
        dam: 'Sweater Dam',
        bird_code: 'P1',
      }),
      makeFowl({ id: 5, name: 'Hatch Sire', breed: 'Hatch', bird_code: 'H1' }),
      makeFowl({ id: 6, name: 'Lemon Dam', breed: 'Lemon', gender: 'Hen', bird_code: 'L1' }),
      makeFowl({
        id: 7,
        name: 'Crossbred Child',
        breed: 'Hatch',
        sire: 'Hatch Sire',
        dam: 'Lemon Dam',
        bird_code: 'C1',
      }),
    ];
    renderMarketplace({ fowls: typeFowls });
    const type = screen.getByLabelText('Breeding type');

    fireEvent.change(type, { target: { value: 'foundation' } });
    expect(screen.getByRole('heading', { level: 4, name: /Foundation Bird/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 4, name: /Purebred Child/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 4, name: /Crossbred Child/i })).not.toBeInTheDocument();

    fireEvent.change(type, { target: { value: 'purebred' } });
    expect(screen.getByRole('heading', { level: 4, name: /Purebred Child/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 4, name: /Foundation Bird/i })).not.toBeInTheDocument();

    fireEvent.change(type, { target: { value: 'crossbred' } });
    expect(screen.getByRole('heading', { level: 4, name: /Crossbred Child/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 4, name: /Purebred Child/i })).not.toBeInTheDocument();
  });

  it('renders sex with Cock/Hen icons and word, age, stage, and system weight units', async () => {
    localStorage.setItem(
      'gallotrack_user_preferences',
      JSON.stringify({ weight_unit: 'lbs', height_unit: 'inches' }),
    );
    renderMarketplace();
    const card = screen.getByRole('heading', { level: 4, name: /Young Cock/i }).closest('article');
    expect(card).not.toBeNull();
    const scope = within(card as HTMLElement);

    expect(scope.getByText('Cock')).toBeInTheDocument();
    expect(scope.getByText('Stag')).toBeInTheDocument();
    expect(scope.getByText(/mo$/)).toBeInTheDocument();
    await waitFor(() => expect(scope.getByText(/lbs$/)).toBeInTheDocument());
    expect(scope.queryByText('2.5')).not.toBeInTheDocument();
  });

  it('shows no wing band, record, or fight actions for hens', () => {
    renderMarketplace();
    const card = screen.getByRole('heading', { level: 4, name: /Hen Leader/i }).closest('article');
    const scope = within(card as HTMLElement);
    expect(card?.querySelector('[data-fowl-sex="hen"]')).not.toBeNull();
    expect(scope.getAllByText('Hen').length).toBeGreaterThan(0);
    expect(scope.queryByText('WB-02')).not.toBeInTheDocument();
    expect(scope.queryByText(/Performance/i)).not.toBeInTheDocument();
    expect(scope.queryByText(/No fights/i)).not.toBeInTheDocument();
  });

  it('keeps the Not registered legacy strain badge', () => {
    renderMarketplace();
    const card = screen.getByRole('heading', { level: 4, name: /Deceased Bird/i }).closest('article');
    expect(within(card as HTMLElement).getByText('Not registered')).toBeInTheDocument();
  });

  it('wraps long strain and bloodline chips and exposes full text as tooltip and aria-label', () => {
    const longFowls: FowlRecord[] = [
      makeFowl({ id: 1, name: 'Hatch Sire', breed: 'Hatch', gender: 'Rooster' }),
      makeFowl({ id: 2, name: 'Lemon Dam', breed: 'Lemon', gender: 'Hen' }),
      makeFowl({
        id: 3,
        name: 'Hatch Lemon Cross',
        breed: 'Hatch',
        gender: 'Rooster',
        sire: 'Hatch Sire',
        dam: 'Lemon Dam',
        bird_code: '1A1',
      }),
    ];
    renderMarketplace({ fowls: longFowls });
    const card = screen.getByRole('heading', { level: 4, name: /Hatch Lemon Cross/i }).closest('article');
    const scope = within(card as HTMLElement);
    const bloodlineChip = scope.getByTitle(/Crossbred/i);
    expect(bloodlineChip).toHaveAttribute('aria-label', expect.stringMatching(/Crossbred/i));
    expect(bloodlineChip.className).toContain('break-words');
    expect(bloodlineChip.className).not.toContain('truncate');
    expect(card?.className).toContain('@container');
    expect(card?.className).not.toMatch(/whitespace-nowrap/);
  });

  it('copies the raw bird code, shows the toast, and leaves data unchanged', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    const toastSpy = vi.fn();
    registerToastHandler(toastSpy);
    try {
      renderMarketplace();
      const before = JSON.stringify(baseFowls);
      fireEvent.click(screen.getByRole('button', { name: /Copy code of Young Cock/i }));
      await waitFor(() => expect(writeText).toHaveBeenCalledWith('1A1'));
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Code copied', variant: 'success' }),
      );
      expect(JSON.stringify(baseFowls)).toBe(before);
    } finally {
      registerToastHandler(null);
    }
  });

  it('opens the existing full profile and the restore action from archived cards', () => {
    const onOpen = vi.fn();
    renderMarketplace({ setSelectedFowlForDetails: onOpen, onRestore: vi.fn() });

    const firstCard = screen.getByRole('heading', { level: 4, name: /Archived Bird/i }).closest('article');
    fireEvent.click(within(firstCard as HTMLElement).getByRole('button', { name: /Full profile/i }));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 3 }));

    const archivedCard = screen.getByRole('heading', { level: 4, name: /Archived Bird/i }).closest('article');
    fireEvent.click(within(archivedCard as HTMLElement).getByRole('button', { name: /Restore to Active/i }));
    expect(screen.getByText('Restore to Active?')).toBeInTheDocument();
  });

  it('shows initials when there is no photo and Photo unavailable when signing fails', async () => {
    const first = renderMarketplace();
    const initialsCard = screen.getByRole('heading', { level: 4, name: /Young Cock/i }).closest('article');
    expect(within(initialsCard as HTMLElement).getByText('YC')).toBeInTheDocument();
    first.unmount();

    const withPhoto = [
      makeFowl({ id: 9, name: 'Photo Bird', bird_code: 'PB1', photo_thumb_path: 'user/9/thumb.webp' }),
      ...baseFowls,
    ];
    renderMarketplace({ fowls: withPhoto });
    await waitFor(() => {
      expect(screen.getAllByText(/Photo unavailable/i).length).toBeGreaterThan(0);
    });
  });

  it('loads card photos lazily from the signed resolver', async () => {
    vi.mocked(resolveChickenPhotoUrl).mockResolvedValue('https://signed.example/photo.webp');
    renderMarketplace({
      fowls: [
        makeFowl({
          id: 10,
          name: 'Lazy Bird',
          bird_code: 'LB1',
          photo_thumb_path: 'user/10/thumb.webp',
        }),
      ],
    });
    const image = await screen.findByRole('img', { name: /Lazy Bird/i });
    expect(image).toHaveAttribute('loading', 'lazy');
    expect(resolveChickenPhotoUrl).toHaveBeenCalledWith('user/10/thumb.webp');
  });

  it('paginates 24 cards per page and keeps the page in the URL', async () => {
    const many = Array.from({ length: 30 }, (_, index) =>
      makeFowl({ id: 100 + index, name: `Bird ${String(index + 1).padStart(2, '0')}`, bird_code: `B${index + 1}` }),
    );
    renderMarketplace({ fowls: many });
    expect(screen.getAllByRole('heading', { level: 4 })).toHaveLength(24);
    expect(screen.getByText('Showing 24 of 30')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => {
      expect(screen.getAllByRole('heading', { level: 4 })).toHaveLength(6);
      expect(screen.getByText('Showing 30 of 30')).toBeInTheDocument();
    });
    expect(routerMocks.replace.mock.calls.some(([href]) => String(href).includes('page=2'))).toBe(true);
  });

  it('renders empty, no-results, and skeleton states', async () => {
    const { unmount } = renderMarketplace({ fowls: [] });
    expect(screen.getByText('No chickens yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Register a chicken/i })).toBeInTheDocument();
    unmount();

    const noResults = renderMarketplace();
    fireEvent.change(screen.getByLabelText(/Search inventory/i), {
      target: { value: 'NoSuchBird' },
    });
    await waitFor(() => {
      expect(screen.getByText('No chickens match your filters')).toBeInTheDocument();
    });
    noResults.unmount();

    renderMarketplace({ loading: true });
    expect(screen.getByText('Loading chickens...')).toBeInTheDocument();
  });

  it('does not embed remote image URLs in the page source', () => {
    const source = readFileSync(join(process.cwd(), 'components/MarketplacePage.tsx'), 'utf8');
    const banner = readFileSync(join(process.cwd(), 'components/layout/PageBanner.tsx'), 'utf8');
    for (const text of [source, banner]) {
      expect(text).not.toMatch(/src=["']https?:/i);
      expect(text).not.toMatch(/imageSrc=["']https?:/i);
    }
    expect(source).toContain('/images/hero-farm.jpg');
  });
});
