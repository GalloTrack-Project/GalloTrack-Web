import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProfilingPage from '@/components/ProfilingPage';
import { UIProvider, useUI } from '@/lib/contexts/ui-context';
import { FowlProviderWrapper } from '@/lib/contexts/fowl-context';

const insertFowl = vi.hoisted(() => vi.fn());
const saveCustomStrain = vi.hoisted(() => vi.fn());
const fetchStrains = vi.hoisted(() => vi.fn());
const toastMessage = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/profiling',
  useSearchParams: () => new URLSearchParams(''),
}));

vi.mock('@/lib/toast-bus', () => ({ toastMessage }));

vi.mock('@/lib/services/fowl-service', () => ({
  fetchFowls: vi.fn().mockResolvedValue([]),
  fetchStatusHistory: vi.fn().mockResolvedValue([]),
  fetchMatchHistory: vi.fn().mockResolvedValue([]),
  getNextIdentifier: vi.fn().mockResolvedValue({ code: '1' }),
  insertFowl,
  updateFowl: vi.fn().mockResolvedValue({}),
  isChickenCodeUniqueViolation: vi.fn().mockReturnValue(false),
}));

vi.mock('@/lib/services/strain-service', () => ({
  fetchStrains,
  fetchLegColors: vi.fn().mockResolvedValue([]),
  saveCustomStrain,
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

vi.mock('@/lib/registry', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'owner-1' } } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'token' } } }),
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
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 501 } }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    }),
  },
}));

function SetPage() {
  const { setCurrentPage } = useUI();
  React.useEffect(() => {
    setCurrentPage('profiling');
  }, [setCurrentPage]);
  return null;
}

function renderPage() {
  return render(
    <UIProvider theme="light" setTheme={() => {}}>
      <SetPage />
      <FowlProviderWrapper>
        <ProfilingPage />
      </FowlProviderWrapper>
    </UIProvider>,
  );
}

async function renderPageAndWait() {
  renderPage();
  await waitFor(() => expect(fetchStrains).toHaveBeenCalled());
  await screen.findByLabelText('Genetic Strain');
}

async function fillRequiredFields(strain?: string) {
  fireEvent.change(await screen.findByLabelText('Identifier Name'), {
    target: { value: 'Strain Test Bird' },
  });
  if (strain !== undefined) {
    fireEvent.change(screen.getByLabelText('Genetic Strain'), { target: { value: strain } });
  }
  fireEvent.change(screen.getByLabelText('Gender Class'), { target: { value: 'Rooster' } });
  fireEvent.change(screen.getByLabelText(/Birth Date/i), { target: { value: '2025-01-01' } });
}

async function clickRegister() {
  const register = screen.getByRole('button', { name: /^REGISTER$/i });
  await waitFor(() => expect(register).not.toBeDisabled());
  fireEvent.click(register);
}

const strainInput = () => screen.getByLabelText('Genetic Strain');

describe('Registration genetic strain', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertFowl.mockResolvedValue({ id: 501 });
    saveCustomStrain.mockResolvedValue(true);
    fetchStrains.mockResolvedValue([]);
    window.history.replaceState({}, '', '/profiling?tab=form');
  });

  it('registers a typed custom strain when no breeds are registered', async () => {
    await renderPageAndWait();
    fireEvent.focus(strainInput());
    expect(await screen.findByText('No breeds yet. Add your breeds first.')).toBeInTheDocument();
    fireEvent.keyDown(strainInput(), { key: 'Escape' });

    await fillRequiredFields('Hatch');

    expect(screen.getAllByText(/100% Hatch/i).length).toBeGreaterThan(0);
    await clickRegister();

    await waitFor(() => expect(insertFowl).toHaveBeenCalled());
    expect(insertFowl.mock.calls[0][0]).toEqual(
      expect.objectContaining({ breed: 'Hatch' }),
    );
    expect(toastMessage).not.toHaveBeenCalledWith(
      expect.stringContaining('Validation Error'),
      'error',
    );
  });

  it('selects a registered breed case-insensitively instead of saving a free-text duplicate', async () => {
    fetchStrains.mockResolvedValue(['CustomBreed']);
    await renderPageAndWait();

    const input = strainInput();
    fireEvent.focus(input);
    await screen.findByRole('button', { name: /CustomBreed/ });

    await fillRequiredFields('custombreed');
    fireEvent.keyDown(strainInput(), { key: 'Tab' });

    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: 'Remove strain' }).length).toBe(1),
    );
    await clickRegister();

    await waitFor(() => expect(insertFowl).toHaveBeenCalled());
    expect(insertFowl.mock.calls[0][0]).toEqual(
      expect.objectContaining({ breed: 'CustomBreed' }),
    );
    expect(saveCustomStrain).not.toHaveBeenCalledWith('custombreed');
  });

  it('commits typed text on blur, Enter and Tab', async () => {
    await renderPageAndWait();
    await fillRequiredFields();

    fireEvent.change(strainInput(), { target: { value: 'Hatch' } });
    fireEvent.blur(strainInput());
    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: 'Remove strain' }).length).toBe(1),
    );

    fireEvent.change(strainInput(), { target: { value: 'Sweater' } });
    fireEvent.keyDown(strainInput(), { key: 'Enter' });
    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: 'Remove strain' }).length).toBe(2),
    );

    fireEvent.change(strainInput(), { target: { value: 'Kelso' } });
    fireEvent.keyDown(strainInput(), { key: 'Tab' });
    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: 'Remove strain' }).length).toBe(3),
    );
  });

  it('shows the inline error and focuses the field for an empty or whitespace strain', async () => {
    await renderPageAndWait();
    await fillRequiredFields();

    fireEvent.change(strainInput(), { target: { value: '   ' } });
    fireEvent.keyDown(strainInput(), { key: 'Enter' });

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Breed/strain is required.');
    expect(strainInput()).toHaveAttribute('aria-invalid', 'true');
    expect(strainInput()).toHaveAttribute('aria-describedby', 'genetic-strain-error');
    expect(document.activeElement).toBe(strainInput());
  });

  it('keeps typed values and toasts after a failed submit', async () => {
    await renderPageAndWait();
    await fillRequiredFields('   ');

    await clickRegister();

    await waitFor(() =>
      expect(toastMessage).toHaveBeenCalledWith(
        expect.stringContaining('Breed/strain is required'),
        'error',
      ),
    );
    expect(insertFowl).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Identifier Name')).toHaveValue('Strain Test Bird');
    expect(screen.getByLabelText('Gender Class')).toHaveValue('Rooster');
    expect(screen.getByLabelText(/Birth Date/i)).toHaveValue('2025-01-01');
    expect(screen.getByRole('alert')).toHaveTextContent('Breed/strain is required.');
    expect(screen.getByText(/Missing:.*Genetic Strain/i)).toBeInTheDocument();
    expect(document.activeElement).toBe(strainInput());
  });
});
