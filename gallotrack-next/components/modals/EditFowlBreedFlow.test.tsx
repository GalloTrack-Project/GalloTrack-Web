import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProfilingPage from '@/components/ProfilingPage';
import { ModalsWrapper } from '@/app/(dashboard)/wrappers';
import { UIProvider } from '@/lib/contexts/ui-context';
import { FowlProviderWrapper, useFowl } from '@/lib/contexts/fowl-context';
import { loadFowlDraft } from '@/lib/fowl-draft';
import { toastMessage } from '@/lib/toast-bus';
import type { FowlRecord } from '@/lib/types';

const push = vi.hoisted(() => vi.fn());
const replace = vi.hoisted(() => vi.fn());
const back = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace, back }),
  usePathname: () => '/profiling',
  useSearchParams: () => new URLSearchParams(''),
}));

vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: () => ({
    handleLogout: vi.fn(),
    handleSendResetLink: vi.fn(),
    forgotEmail: '',
    setForgotEmail: vi.fn(),
    forgotLoading: false,
    forgotSent: false,
    forgotError: '',
    setForgotSent: vi.fn(),
  }),
  useAuthOptional: () => ({
    currentUserId: 'test-owner-id',
    userActive: true,
    authChecked: true,
  }),
}));

vi.mock('@/lib/services/options-service', () => ({
  fetchRegistryOptions: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/services/fowl-service', () => ({
  fetchStatusHistory: vi.fn().mockResolvedValue([]),
  fetchFowls: vi.fn().mockResolvedValue([]),
  fetchMatchHistory: vi.fn().mockResolvedValue([]),
  getNextIdentifier: vi.fn().mockResolvedValue({ code: '1' }),
  insertFowl: vi.fn().mockResolvedValue({ id: 1 }),
  isChickenCodeUniqueViolation: vi.fn().mockReturnValue(false),
}));

vi.mock('@/lib/services/strain-service', () => ({
  fetchStrains: vi.fn().mockResolvedValue(['Kelso']),
  fetchLegColors: vi.fn().mockResolvedValue([]),
  saveCustomStrain: vi.fn().mockResolvedValue(true),
  saveCustomLegColor: vi.fn().mockResolvedValue(true),
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

vi.mock('@/lib/toast-bus', () => ({
  toastMessage: vi.fn(),
  toast: vi.fn(),
  registerToastHandler: vi.fn(),
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
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    }),
  },
}));

const fowl: FowlRecord = {
  id: 10,
  name: 'Iron Clad',
  breed: 'Hatch',
  gender: 'Rooster',
  color: 'Dark Red',
  behavior_trait: 'Calm',
  color_category: 'Red',
  growth_stage: 'Cock',
  eye_variant: 'Red',
  birthdate: '2024-01-01',
  age: '12 Months',
  weight: '2.1',
  height: '44',
  leg_color: 'Green / Slate',
  sire: 'Foundation Stock',
  dam: 'Foundation Stock',
  sire_pct: 100,
  dam_pct: 100,
  bloodline_pct: 100,
  status: 'Active',
  bird_code: '2',
  wing_band: 'WB-002',
};

function OpenEditHarness() {
  const store = useFowl();
  React.useEffect(() => {
    store.handleOpenEditModal(fowl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

function renderEditFlow() {
  window.history.replaceState({}, '', '/profiling?tab=form');
  return render(
    <UIProvider theme="light" setTheme={() => {}}>
      <FowlProviderWrapper>
        <OpenEditHarness />
        <ProfilingPage />
        <ModalsWrapper />
      </FowlProviderWrapper>
    </UIProvider>,
  );
}

function closeBreedsWithBrowserBack() {
  act(() => {
    window.history.replaceState({}, '', '/profiling?tab=form');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
}

describe('Edit modal breed registry round trip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('gallotrack_user_id', 'test-owner-id');
  });

  it('returns to the same edit modal for the same chicken with the draft restored', async () => {
    renderEditFlow();

    const dialog = await screen.findByRole('dialog');
    const breedInput = within(dialog).getByPlaceholderText('Select or type strain');
    fireEvent.change(breedInput, { target: { value: 'Kelso Draft' } });

    await waitFor(() => {
      expect(loadFowlDraft('test-owner-id', 'edit', fowl.id)).not.toBeNull();
    });
    const savedDraft = loadFowlDraft('test-owner-id', 'edit', fowl.id);
    expect(savedDraft?.kind).toBe('edit');
    if (savedDraft?.kind === 'edit') {
      expect(savedDraft.fields.editBreed).toBe('Kelso Draft');
    }

    const addBreeds = await within(dialog).findAllByRole('link', { name: /Add Breeds/i });
    fireEvent.click(addBreeds[0]);

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );

    closeBreedsWithBrowserBack();

    const restoredDialog = await screen.findByRole('dialog');
    expect(within(restoredDialog).getByText(/Update parameters for Iron Clad/i)).toBeInTheDocument();
    expect(within(restoredDialog).getByPlaceholderText('Select or type strain')).toHaveValue('Kelso Draft');
    expect((await within(restoredDialog).findByText('Draft restored'))).toBeInTheDocument();
  });

  it('selects the newly created breed in the same edit modal', async () => {
    renderEditFlow();

    const dialog = await screen.findByRole('dialog');
    const addBreeds = await within(dialog).findAllByRole('link', { name: /Add Breeds/i });
    fireEvent.click(addBreeds[0]);

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );

    const nameInput = await screen.findByLabelText('New breed name');
    fireEvent.change(nameInput, { target: { value: 'Kelso' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    const restoredDialog = await screen.findByRole('dialog');
    expect(loadFowlDraft('test-owner-id', 'edit', fowl.id)).not.toBeNull();
    expect(within(restoredDialog).getByPlaceholderText('Select or type strain')).toHaveValue('Kelso');
    expect((await within(restoredDialog).findByText('Draft restored'))).toBeInTheDocument();
    expect(toastMessage).toHaveBeenCalledWith('Breed added and selected', 'success');
  });
});
