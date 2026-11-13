import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProfilingPage from '@/components/ProfilingPage';
import { UIProvider } from '@/lib/contexts/ui-context';
import { FowlProviderWrapper } from '@/lib/contexts/fowl-context';
import { FOWL_DRAFT_TTL_MS, fowlDraftKey } from '@/lib/fowl-draft';
import { toastMessage } from '@/lib/toast-bus';
import type { CreateDraftFields } from '@/lib/fowl-draft';

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
  insertFowl: vi.fn().mockResolvedValue({ id: 1 }),
  updateFowl: vi.fn().mockResolvedValue({}),
  isChickenCodeUniqueViolation: vi.fn().mockReturnValue(false),
}));

vi.mock('@/lib/services/strain-service', () => ({
  fetchStrains: vi.fn().mockResolvedValue(['Kelso']),
  fetchLegColors: vi.fn().mockResolvedValue([]),
  saveCustomStrain: vi.fn().mockResolvedValue(true),
  createRegisteredBreed: vi.fn().mockResolvedValue({ ok: true, name: 'Hatch' }),
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

vi.mock('@/lib/services/options-service', () => ({
  fetchRegistryOptions: vi.fn().mockResolvedValue([]),
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
    rpc: vi.fn().mockResolvedValue({ data: '1', error: null }),
  },
}));

const OWNER_ID = 'draft-owner';

function renderPage() {
  window.history.replaceState({}, '', '/profiling?tab=form');
  return render(
    <UIProvider theme="light" setTheme={() => {}}>
      <FowlProviderWrapper>
        <ProfilingPage />
      </FowlProviderWrapper>
    </UIProvider>,
  );
}

function createKey() {
  return fowlDraftKey(OWNER_ID, 'create');
}

function readCreateDraft(): { photoSelected: boolean; fields: CreateDraftFields } | null {
  const raw = sessionStorage.getItem(createKey());
  return raw ? JSON.parse(raw) : null;
}

function seedDraft(
  fields: Partial<CreateDraftFields>,
  savedAt = Date.now(),
  photoSelected = false,
) {
  const base = {
    newName: '',
    newBreed: '',
    newGender: '',
    newColor: '',
    newColorCategory: '',
    newGrowthStage: '',
    newBehaviorTrait: '',
    newEyeVariant: 'Standard Eye',
    newBirthdate: '',
    sireName: '',
    damName: '',
    sirePct: '',
    damPct: '',
    weight: '',
    height: '',
    newLegColor: '',
    age: '',
    birdCode: '',
    wingBand: '',
    newDeclaredComposition: null,
    strainQuery: '',
    selectedStrains: [],
    legColorQuery: '',
    ...fields,
  };
  sessionStorage.setItem(createKey(), JSON.stringify({
    version: 1,
    kind: 'create',
    userId: OWNER_ID,
    savedAt,
    photoSelected,
    fields: base,
  }));
}

describe('Add Breeds flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('gallotrack_user_id', OWNER_ID);
  });

  it('uses one Add breed button and opens the registry with Add New Breed', async () => {
    renderPage();

    expect(await screen.findByRole('button', { name: /Add breed/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Add Breeds/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Add breed/i }));

    expect(await screen.findByRole('heading', { name: /Breed Registry/i })).toBeInTheDocument();
    expect(await screen.findByLabelText('New breed name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to registration' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Add Breeds/i })).not.toBeInTheDocument();
  });

  it('restores every typed field after the breed registry round trip', async () => {
    const { container } = renderPage();

    fireEvent.change(await screen.findByLabelText('Identifier Name'), {
      target: { value: 'Draft Bird' },
    });
    fireEvent.change(screen.getByLabelText('Genetic Strain'), {
      target: { value: 'Kel' },
    });
    fireEvent.change(screen.getByLabelText('Gender Class'), {
      target: { value: 'Rooster' },
    });
    fireEvent.change(screen.getByLabelText(/^Birth Date/i), {
      target: { value: '2024-01-01' },
    });
    fireEvent.change(container.querySelector('#encode-sire') as HTMLInputElement, {
      target: { value: 'Sire A' },
    });
    fireEvent.change(container.querySelector('#encode-dam') as HTMLInputElement, {
      target: { value: 'Dam B' },
    });

    await waitFor(() => expect(readCreateDraft()).not.toBeNull());
    const rawDraft = sessionStorage.getItem(createKey()) ?? '';
    expect(rawDraft).not.toContain('.png');
    expect(rawDraft).not.toContain('data:image');

    fireEvent.click(screen.getByRole('button', { name: /Add breed/i }));

    expect(await screen.findByRole('heading', { name: /Breed Registry/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back to registration' }));

    await waitFor(() =>
      expect(screen.getByLabelText('Identifier Name')).toHaveValue('Draft Bird'),
    );
    expect(screen.getByLabelText('Genetic Strain')).toHaveValue('Kel');
    expect(screen.getByLabelText('Gender Class')).toHaveValue('Rooster');
    expect(screen.getByLabelText(/^Birth Date/i)).toHaveValue('2024-01-01');
    expect(container.querySelector('#encode-sire')).toHaveValue('Sire A');
    expect(container.querySelector('#encode-dam')).toHaveValue('Dam B');
    expect(screen.getByText('Draft restored')).toBeInTheDocument();
  });

  it('returns after creating a breed with it selected and the success toast', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /Add breed/i }));

    const nameInput = await screen.findByLabelText('New breed name');
    fireEvent.change(nameInput, { target: { value: 'Sweater' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(screen.getByLabelText('Identifier Name')).toBeInTheDocument(),
    );
    expect(screen.queryByRole('heading', { name: /Breed Registry/i })).not.toBeInTheDocument();
    expect((await screen.findAllByText('Sweater')).length).toBeGreaterThan(0);
    expect(toastMessage).toHaveBeenCalledWith('Breed added and selected', 'success');
    expect(readCreateDraft()?.fields.selectedStrains).toContain('Sweater');

    expect(await screen.findByRole('button', { name: 'Remove Sweater' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Gender Class'), { target: { value: 'Rooster' } });
    expect(screen.getByRole('button', { name: 'Remove Sweater' })).toBeInTheDocument();
  });

  it('keeps the user in the registry when Add New Breed is cancelled', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /Add breed/i }));
    expect(await screen.findByLabelText('New breed name')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByRole('heading', { name: /Breed Registry/i })).toBeInTheDocument();
    expect(screen.queryByLabelText('New breed name')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to registration' })).toBeInTheDocument();
  });

  it('clears the draft when the registration form is cancelled', async () => {
    renderPage();

    fireEvent.change(await screen.findByLabelText('Identifier Name'), {
      target: { value: 'Discard Me' },
    });
    await waitFor(() => expect(readCreateDraft()).not.toBeNull());

    fireEvent.click(screen.getByRole('button', { name: 'Cancel registration' }));

    expect(sessionStorage.getItem(createKey())).toBeNull();
    expect(screen.queryByLabelText('Identifier Name')).not.toBeInTheDocument();
  });

  it('clears the draft when the chicken is saved', async () => {
    renderPage();

    fireEvent.change(await screen.findByLabelText('Identifier Name'), {
      target: { value: 'Saved Bird' },
    });
    fireEvent.change(screen.getByLabelText('Genetic Strain'), {
      target: { value: 'Kelso' },
    });
    fireEvent.keyDown(screen.getByLabelText('Genetic Strain'), { key: 'Enter' });
    fireEvent.change(screen.getByLabelText('Gender Class'), {
      target: { value: 'Rooster' },
    });
    fireEvent.change(screen.getByLabelText(/^Birth Date/i), {
      target: { value: '2024-01-01' },
    });

    await waitFor(() => expect(readCreateDraft()).not.toBeNull());
    fireEvent.click(screen.getByRole('button', { name: /REGISTER/i }));

    await waitFor(() => expect(sessionStorage.getItem(createKey())).toBeNull());
  });

  it('restores a valid draft after a refresh', async () => {
    seedDraft({
      newName: 'Reloaded Bird',
      newBreed: 'Kel',
      strainQuery: 'Kel',
      selectedStrains: ['Kelso'],
      newGender: 'Rooster',
      newBirthdate: '2024-01-01',
      sireName: 'Sire A',
      damName: 'Dam B',
    });
    renderPage();

    await waitFor(() =>
      expect(screen.getByLabelText('Identifier Name')).toHaveValue('Reloaded Bird'),
    );
    expect(screen.getByLabelText(/^Birth Date/i)).toHaveValue('2024-01-01');
    expect(screen.getByText('Draft restored')).toBeInTheDocument();
  });

  it('shows the photo notice when a restored draft had a pending photo', async () => {
    seedDraft({ newName: 'Photo Bird' }, Date.now(), true);
    renderPage();

    await waitFor(() =>
      expect(screen.getByLabelText('Identifier Name')).toHaveValue('Photo Bird'),
    );
    expect(screen.getByText('Draft restored')).toBeInTheDocument();
    expect(screen.getByText('Please add the photo again.')).toBeInTheDocument();
  });

  it('ignores a draft older than 24 hours', async () => {
    seedDraft({ newName: 'Old Bird' }, Date.now() - FOWL_DRAFT_TTL_MS - 1000);
    renderPage();

    await screen.findByLabelText('Identifier Name');
    expect(screen.getByLabelText('Identifier Name')).toHaveValue('');
    expect(screen.queryByText('Draft restored')).not.toBeInTheDocument();
    expect(sessionStorage.getItem(createKey())).toBeNull();
  });

  it('ignores drafts written for another user', async () => {
    sessionStorage.setItem(
      fowlDraftKey('other-user', 'create'),
      JSON.stringify({
        version: 1,
        kind: 'create',
        userId: 'other-user',
        savedAt: Date.now(),
        photoSelected: false,
        fields: { newName: 'Someone Else' },
      }),
    );
    renderPage();

    await screen.findByLabelText('Identifier Name');
    expect(screen.getByLabelText('Identifier Name')).toHaveValue('');
    expect(screen.queryByText('Draft restored')).not.toBeInTheDocument();
  });
});
