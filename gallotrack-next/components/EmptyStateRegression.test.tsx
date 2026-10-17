import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import DashboardPage from './DashboardPage';
import ProfilingPage from './ProfilingPage';
import MarketplacePage from './MarketplacePage';
import LineageDirectory from './LineageDirectory';
import BreedingHub from './BreedingHub';
import MatchLogsView from './match/MatchLogsView';
import MatchRecordForm from './match/MatchRecordForm';
import SettingsPage from '@/app/(dashboard)/settings/page';
import LandingPage from '@/app/page';
import { UIProvider } from '@/lib/contexts/ui-context';
import { FowlProviderWrapper } from '@/lib/contexts/fowl-context';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(''),
}));

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'light', theme: 'light', setTheme: vi.fn() }),
}));

vi.mock('@/lib/services/fowl-service', () => ({
  fetchStatusHistory: vi.fn().mockResolvedValue([]),
  fetchFowls: vi.fn().mockResolvedValue([]),
  fetchMatchHistory: vi.fn().mockResolvedValue([]),
  getNextIdentifier: vi.fn().mockResolvedValue({ code: '1' }),
}));

vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'test-owner-id', email: 'owner@test.com' },
    isAdmin: false,
    loading: false,
  }),
}));

vi.mock('@/lib/registry', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-owner-id', email: 'owner@test.com' } } }),
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
    storage: {
      from: vi.fn().mockReturnValue({
        list: vi.fn().mockResolvedValue({ data: [] }),
        remove: vi.fn().mockResolvedValue({ data: [] }),
      }),
    },
  },
}));

describe('Empty State Regression Suite (Zero Data State Post-Clear)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const renderWithProviders = (uiNode: React.ReactNode) => {
    return render(
      <UIProvider theme="light" setTheme={vi.fn()}>
        <FowlProviderWrapper>{uiNode}</FowlProviderWrapper>
      </UIProvider>
    );
  };

  it('1. Dashboard renders cleanly with zero fowls and zero matches without throwing', () => {
    const { container } = renderWithProviders(<DashboardPage />);
    expect(container).toBeTruthy();
    // Dashboard header should be present
    expect(screen.getByText(/Dashboard/i)).toBeDefined();
  });

  it('2. Registry tabs (ProfilingPage) render cleanly with zero birds without throwing', () => {
    const { container } = renderWithProviders(<ProfilingPage />);
    expect(container).toBeTruthy();
    expect(screen.getByText(/Breeding Male/i)).toBeDefined();
  });

  it('3. Inventory tabs (MarketplacePage) render cleanly with zero fowls without throwing', () => {
    const { container } = renderWithProviders(
      <MarketplacePage
        fowls={[]}
        matchHistory={[]}
        search=""
        setSearch={vi.fn()}
        debouncedSearch=""
        genderFilter="all"
        setGenderFilter={vi.fn()}
        statusFilter="all"
        setStatusFilter={vi.fn()}
        setCurrentPage={vi.fn()}
        setProfilingSubTab={vi.fn()}
        onRestore={vi.fn()}
        canRestoreDeceased={false}
        setSelectedFowlForDetails={vi.fn()}
      />
    );
    expect(container).toBeTruthy();
    expect(screen.getByText(/Chicken Inventory/i)).toBeDefined();
  });

  it('4. Lineage Directory tabs render cleanly with zero fowls without throwing', () => {
    const { container } = renderWithProviders(
      <LineageDirectory
        fowls={[]}
        matchHistory={[]}
        pairingAnalytics={{ all: new Map(), ranked: [] }}
        setSelectedFowlForDetails={vi.fn()}
      />
    );
    expect(container).toBeTruthy();
    expect(screen.getByText(/Lineage Directory/i)).toBeDefined();
  });

  it('5. Breeding Hub renders cleanly with zero pairings and zero fowls without throwing', () => {
    const { container } = renderWithProviders(
      <BreedingHub
        fowls={[]}
        matchHistory={[]}
        pairingAnalytics={{ all: new Map(), ranked: [] }}
        setSelectedFowlForDetails={vi.fn()}
      />
    );
    expect(container).toBeTruthy();
    expect(screen.getByRole('button', { name: /Breeding Pairs/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Coding System/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Safety Incidents/i })).toBeDefined();
  });

  it('6. Match Logs renders cleanly with zero matches without throwing', () => {
    const { container } = renderWithProviders(<MatchLogsView />);
    expect(container).toBeTruthy();
    expect(screen.getByText(/Match Logs/i)).toBeDefined();
  });

  it('7. Add Match Record form renders cleanly with zero birds without throwing', () => {
    const { container } = renderWithProviders(<MatchRecordForm mode="add" initialFowlId={null} />);
    expect(container).toBeTruthy();
    expect(screen.getAllByText(/Add Match Record/i).length).toBeGreaterThanOrEqual(1);
  });

  it('8. Settings page renders cleanly with zero data without throwing', () => {
    const { container } = renderWithProviders(<SettingsPage />);
    expect(container).toBeTruthy();
    expect(screen.getByText(/Manage your account, farm, and system preferences/i)).toBeDefined();
  });

  it('9. Landing page renders cleanly as static showcase without throwing', () => {
    const { container } = render(<LandingPage />);
    expect(container).toBeTruthy();
  });
});
