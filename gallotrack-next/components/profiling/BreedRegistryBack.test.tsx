import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProfilingPage from '@/components/ProfilingPage';
import { UIProvider } from '@/lib/contexts/ui-context';
import { FowlProviderWrapper } from '@/lib/contexts/fowl-context';

const push = vi.hoisted(() => vi.fn());
const replace = vi.hoisted(() => vi.fn());
const back = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace, back }),
  usePathname: () => '/profiling',
  useSearchParams: () => new URLSearchParams(''),
}));

vi.mock('@/lib/services/fowl-service', () => ({
  fetchStatusHistory: vi.fn().mockResolvedValue([]),
  fetchFowls: vi.fn().mockResolvedValue([]),
  fetchMatchHistory: vi.fn().mockResolvedValue([]),
  getNextIdentifier: vi.fn().mockResolvedValue({ code: '1' }),
}));

vi.mock('@/lib/services/strain-service', () => ({
  fetchStrains: vi.fn().mockResolvedValue([]),
  fetchLegColors: vi.fn().mockResolvedValue([]),
  saveCustomStrain: vi.fn().mockResolvedValue(true),
  deleteStrain: vi.fn().mockResolvedValue({}),
  deleteLegColor: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/lib/services/match-service', () => ({
  fetchMatches: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/services/media-service', () => ({
  fetchMatchMedia: vi.fn().mockResolvedValue(new Map()),
}));

vi.mock('@/lib/services/breeding-service', () => ({
  fetchBreedingPairings: vi.fn().mockResolvedValue({ data: [] }),
}));

vi.mock('@/lib/registry', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-owner-id' } } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'fake-token' } } }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          single: vi.fn().mockResolvedValue({ data: null }),
          order: vi.fn().mockResolvedValue({ data: [] }),
        }),
        order: vi.fn().mockResolvedValue({ data: [] }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    }),
  },
}));

function renderPage() {
  return render(
    <UIProvider theme="light" setTheme={() => {}}>
      <FowlProviderWrapper>
        <ProfilingPage />
      </FowlProviderWrapper>
    </UIProvider>,
  );
}

function lastUrlParams(mock: typeof push | typeof replace) {
  const url = mock.mock.calls.at(-1)?.[0] as string;
  return new URLSearchParams(url.split('?')[1] || '');
}

describe('Breed Registry back navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/profiling?tab=males');
  });

  it('returns to the same tab and keeps the registry search text', async () => {
    renderPage();

    const search = await screen.findByLabelText('Search Registry');
    fireEvent.change(search, { target: { value: 'Iron' } });
    expect(search).toHaveValue('Iron');

    fireEvent.click(screen.getByRole('button', { name: 'Breeds' }));
    expect(await screen.findByRole('heading', { name: /Breed Registry/i })).toBeInTheDocument();

    const opened = lastUrlParams(push);
    expect(opened.get('view')).toBe('breeds');
    expect(opened.get('tab')).toBe('males');

    fireEvent.click(screen.getByRole('button', { name: 'Back to registry' }));

    const restored = await screen.findByLabelText('Search Registry');
    expect(restored).toHaveValue('Iron');
    const cocksTabs = screen.getAllByRole('tab', { name: /Cocks/i });
    expect(cocksTabs.some((tab) => tab.getAttribute('aria-selected') === 'true')).toBe(true);
    expect(back).not.toHaveBeenCalled();
  });

  it('browser Back from Breeds returns to the Chicken Registry list', async () => {
    renderPage();

    const search = await screen.findByLabelText('Search Registry');
    fireEvent.change(search, { target: { value: 'Hatch' } });
    fireEvent.click(screen.getByRole('button', { name: 'Breeds' }));
    expect(await screen.findByRole('heading', { name: /Breed Registry/i })).toBeInTheDocument();

    act(() => {
      window.history.replaceState({}, '', '/profiling?tab=males');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    const restored = await screen.findByLabelText('Search Registry');
    expect(restored).toHaveValue('Hatch');
    expect(screen.queryByRole('heading', { name: /Breed Registry/i })).not.toBeInTheDocument();
    expect(back).not.toHaveBeenCalled();
  });

  it('returns to the registration form with its draft after Add Breeds', async () => {
    window.history.replaceState({}, '', '/profiling?tab=form');
    renderPage();

    const nameInput = await screen.findByLabelText('Identifier Name');
    fireEvent.change(nameInput, { target: { value: 'Draft Bird' } });

    const addBreeds = await screen.findByRole('link', { name: /Add Breeds/i });
    fireEvent.click(addBreeds);

    expect(await screen.findByRole('heading', { name: /Breed Registry/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to registration' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Back to registration' }));

    await waitFor(() =>
      expect(screen.getByLabelText('Identifier Name')).toHaveValue('Draft Bird'),
    );
    expect(back).not.toHaveBeenCalled();
  });
});
