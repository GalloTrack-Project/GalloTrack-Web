import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BreedsPage from '@/app/(dashboard)/breeds/page';
import { UIProvider, useUI } from '@/lib/contexts/ui-context';
import { FowlProviderWrapper } from '@/lib/contexts/fowl-context';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/profiling',
  useSearchParams: () => new URLSearchParams(''),
}));

vi.mock('@/lib/services/fowl-service', () => ({
  fetchStatusHistory: vi.fn().mockResolvedValue([]),
  fetchFowls: vi.fn().mockResolvedValue([]),
  fetchMatchHistory: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/services/strain-service', () => ({
  fetchStrains: vi.fn().mockReturnValue(new Promise(() => {})),
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

function OpenDashboard() {
  const ui = useUI();
  React.useEffect(() => {
    ui.setCurrentPage('dashboard');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

function renderBreeds(canCreate: boolean) {
  return render(
    <UIProvider theme="light" setTheme={() => {}}>
      <FowlProviderWrapper>
        <OpenDashboard />
        <BreedsPage canCreate={canCreate} />
      </FowlProviderWrapper>
    </UIProvider>,
  );
}

describe('Breed Registry states', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('shows a loading state instead of the empty state while breeds load', async () => {
    renderBreeds(true);

    expect(await screen.findByText('Loading breeds...')).toBeInTheDocument();
    expect(screen.queryByText('No breeds registered yet.')).not.toBeInTheDocument();
  });

  it('shows a read-only registry when the user cannot create breeds', async () => {
    renderBreeds(false);

    expect(
      await screen.findByText('Your account can view breeds but cannot create new ones.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Add New Breed/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
  });
});
