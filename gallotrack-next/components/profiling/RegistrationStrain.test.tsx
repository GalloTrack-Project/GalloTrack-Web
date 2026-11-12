import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
  fireEvent.change(screen.getByLabelText(/^Birth Date/i), { target: { value: '2025-01-01' } });
}

async function clickRegister() {
  const register = screen.getByRole('button', { name: /^REGISTER$/i });
  await waitFor(() => expect(register).not.toBeDisabled());
  fireEvent.click(register);
}

const strainInput = () => screen.getByLabelText('Genetic Strain');
const removeStrainButtons = () =>
  screen.queryAllByRole('button', { name: /^Remove / });

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
    expect(await screen.findByText('No breeds registered yet.')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Add breed/i })).toHaveLength(1);
    expect(screen.queryByRole('link', { name: /Add Breeds/i })).not.toBeInTheDocument();
    fireEvent.keyDown(strainInput(), { key: 'Escape' });

    await fillRequiredFields('Hatch');
    fireEvent.keyDown(strainInput(), { key: 'Enter' });

    expect(screen.getByRole('button', { name: 'Remove Hatch' })).toBeInTheDocument();
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

  it('persists a dropdown-selected strain after focus moves away', async () => {
    fetchStrains.mockResolvedValue(['Lemon']);
    await renderPageAndWait();
    const input = strainInput();
    fireEvent.focus(input);
    fireEvent.click(await screen.findByRole('option', { name: /Lemon/ }));

    await fillRequiredFields();
    screen.getByLabelText('Gender Class').focus();
    expect(screen.getByRole('button', { name: 'Remove Lemon' })).toBeInTheDocument();

    await clickRegister();

    await waitFor(() => expect(insertFowl).toHaveBeenCalled());
    expect(insertFowl.mock.calls[0][0]).toEqual(
      expect.objectContaining({ breed: 'Lemon' }),
    );
  });

  it('keeps a selected registered strain after a Breed Registry round trip and gender change', async () => {
    fetchStrains.mockResolvedValue(['Lemon']);
    await renderPageAndWait();
    const input = strainInput();
    fireEvent.focus(input);
    fireEvent.click(await screen.findByRole('option', { name: /Lemon/ }));

    expect(screen.getByRole('button', { name: 'Remove Lemon' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Add breed/i }));
    expect(await screen.findByRole('heading', { name: /Breed Registry/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back to registration' }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Remove Lemon' })).toBeInTheDocument(),
    );
    expect(screen.getAllByText(/100% Lemon/i).length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText('Gender Class'), { target: { value: 'Rooster' } });
    expect(screen.getByRole('button', { name: 'Remove Lemon' })).toBeInTheDocument();
  });

  it('selects a registered breed case-insensitively instead of saving a free-text duplicate', async () => {
    fetchStrains.mockResolvedValue(['CustomBreed']);
    await renderPageAndWait();

    const input = strainInput();
    fireEvent.focus(input);
    await screen.findByRole('option', { name: /CustomBreed/ });

    await fillRequiredFields('custombreed');
    fireEvent.keyDown(strainInput(), { key: 'Tab' });

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Remove CustomBreed' })).toBeInTheDocument(),
    );
    await clickRegister();

    await waitFor(() => expect(insertFowl).toHaveBeenCalled());
    expect(insertFowl.mock.calls[0][0]).toEqual(
      expect.objectContaining({ breed: 'CustomBreed' }),
    );
    expect(saveCustomStrain).not.toHaveBeenCalledWith('custombreed');
  });

  it('shows only registered breeds in the listbox and keeps Manage breeds in its footer', async () => {
    fetchStrains.mockResolvedValue(['Hatch', 'Kelso']);
    await renderPageAndWait();

    fireEvent.focus(strainInput());

    const listbox = await screen.findByRole('listbox', { name: 'Registered breeds' });
    const options = within(listbox).getAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual([
      expect.stringContaining('Hatch'),
      expect.stringContaining('Kelso'),
    ]);
    expect(screen.getByRole('button', { name: /Manage breeds/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Add Breeds/i })).not.toBeInTheDocument();
  });

  it('keeps the selected strain when gender, sire, dam and identifier change', async () => {
    fetchStrains.mockResolvedValue(['Lemon']);
    const { container } = renderPage();
    await waitFor(() => expect(fetchStrains).toHaveBeenCalled());
    const input = await screen.findByLabelText('Genetic Strain');
    fireEvent.focus(input);
    fireEvent.click(await screen.findByRole('option', { name: /Lemon/ }));

    fireEvent.change(screen.getByLabelText('Gender Class'), { target: { value: 'Hen' } });
    fireEvent.change(screen.getByLabelText('Identifier Name'), { target: { value: 'Lemon Bird' } });
    fireEvent.change(container.querySelector('#encode-sire') as HTMLInputElement, {
      target: { value: 'Sire A' },
    });
    fireEvent.change(container.querySelector('#encode-dam') as HTMLInputElement, {
      target: { value: 'Dam B' },
    });

    expect(screen.getByRole('button', { name: 'Remove Lemon' })).toBeInTheDocument();
    expect(screen.getByTestId('purity-composition-editor')).toBeInTheDocument();
    expect(screen.queryByText(/Register a breed first/i)).not.toBeInTheDocument();
  });

  it('keeps selected strain visible after focus moves to Gender Class and marks it selected on reopen', async () => {
    fetchStrains.mockResolvedValue(['Lemon']);
    await renderPageAndWait();
    const input = strainInput();
    fireEvent.focus(input);
    fireEvent.click(await screen.findByRole('option', { name: /Lemon/ }));

    const removeButton = screen.getByRole('button', { name: 'Remove Lemon' });
    expect(removeButton).toBeInTheDocument();
    expect(removeButton).toHaveClass('h-11', 'w-11');
    expect(input.parentElement).toContainElement(removeButton);
    expect(input.parentElement).toHaveClass('flex-wrap');
    expect(input).toHaveValue('');
    expect(input).toHaveAttribute('placeholder', 'Add another strain...');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    screen.getByLabelText('Gender Class').focus();
    expect(input).not.toHaveFocus();
    expect(screen.getByRole('button', { name: 'Remove Lemon' })).toBeInTheDocument();
    expect(input).toHaveAttribute('placeholder', 'Add another strain...');

    fireEvent.focus(input);
    const selectedOption = await screen.findByRole('option', {
      name: /Lemon.*Selected/i,
    });
    expect(selectedOption).toHaveAttribute('aria-selected', 'true');
  });

  it('toggles a selected option off without duplicating it', async () => {
    fetchStrains.mockResolvedValue(['Lemon']);
    await renderPageAndWait();
    const input = strainInput();
    fireEvent.focus(input);
    fireEvent.click(await screen.findByRole('option', { name: /Lemon/ }));

    expect(removeStrainButtons()).toHaveLength(1);
    fireEvent.click(input);
    const selectedOption = await screen.findByRole('option', {
      name: /Lemon.*Selected/i,
    });
    fireEvent.click(selectedOption);

    await waitFor(() => expect(removeStrainButtons()).toHaveLength(0));
    expect(screen.getByText('Strain "Lemon" removed.')).toBeInTheDocument();
    expect(screen.queryByText(/100% Lemon/i)).not.toBeInTheDocument();
  });

  it('removes the last selected strain with Backspace', async () => {
    fetchStrains.mockResolvedValue(['Lemon']);
    await renderPageAndWait();
    const input = strainInput();
    fireEvent.focus(input);
    fireEvent.click(await screen.findByRole('option', { name: /Lemon/ }));

    fireEvent.keyDown(input, { key: 'Backspace' });
    await waitFor(() => expect(removeStrainButtons()).toHaveLength(0));
    expect(screen.getByText('Strain "Lemon" removed.')).toBeInTheDocument();
  });

  it('offers to add an unmatched typed breed and adds it as a chip', async () => {
    fetchStrains.mockResolvedValue(['Hatch']);
    await renderPageAndWait();
    const input = strainInput();
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'Lemon' } });

    expect(
      await screen.findByText('No match. Add "Lemon" as a new breed.'),
    ).toBeInTheDocument();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    fireEvent.click(input);
    fireEvent.click(screen.getByRole('button', { name: 'Add "Lemon" as new breed' }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Remove Lemon' })).toBeInTheDocument(),
    );
    expect(input).toHaveValue('');
    expect(input).toHaveAttribute('placeholder', 'Add another strain...');
  });

  it('supports ArrowDown and Enter selection from the listbox', async () => {
    fetchStrains.mockResolvedValue(['Hatch']);
    await renderPageAndWait();
    const input = strainInput();
    fireEvent.focus(input);
    await screen.findByRole('option', { name: /Hatch/ });

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input).toHaveAttribute('aria-activedescendant', 'genetic-strain-option-0');
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Remove Hatch' })).toBeInTheDocument(),
    );
    expect(screen.getByText('Strain "Hatch" added.')).toBeInTheDocument();
    expect(input).toHaveValue('');
  });

  it('keeps unmatched typed text on blur with a hint, and commits on Enter and Tab', async () => {
    await renderPageAndWait();
    await fillRequiredFields();

    fireEvent.change(strainInput(), { target: { value: 'Hatch' } });
    fireEvent.blur(strainInput());
    expect(removeStrainButtons()).toHaveLength(0);
    expect(strainInput()).toHaveValue('Hatch');
    expect(screen.getByText(/No match\. Reopen the list/i)).toBeInTheDocument();

    fireEvent.change(strainInput(), { target: { value: 'Sweater' } });
    expect(screen.queryByText(/No match\. Reopen the list/i)).not.toBeInTheDocument();
    fireEvent.keyDown(strainInput(), { key: 'Enter' });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Remove Sweater' })).toBeInTheDocument(),
    );

    fireEvent.change(strainInput(), { target: { value: 'Kelso' } });
    fireEvent.keyDown(strainInput(), { key: 'Tab' });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Remove Kelso' })).toBeInTheDocument(),
    );
    expect(removeStrainButtons()).toHaveLength(2);
  });

  it('commits a typed registered strain on blur instead of discarding it', async () => {
    fetchStrains.mockResolvedValue(['  Lemon  ']);
    await renderPageAndWait();
    await fillRequiredFields();

    fireEvent.change(strainInput(), { target: { value: '  LEMON  ' } });
    fireEvent.blur(strainInput());

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Remove Lemon' })).toBeInTheDocument(),
    );
    expect(strainInput()).toHaveValue('');
    expect(strainInput()).toHaveAttribute('placeholder', 'Add another strain...');
    expect(screen.getAllByText(/100% Lemon/i).length).toBeGreaterThan(0);
  });

  it('refreshes breed options when the strain field gains focus', async () => {
    fetchStrains
      .mockResolvedValueOnce([])
      .mockResolvedValue(['Lemon']);
    await renderPageAndWait();

    fireEvent.focus(strainInput());

    expect(await screen.findByRole('option', { name: /Lemon/ })).toBeInTheDocument();
  });

  it('keeps the selected strain and Purity row when a later strain refresh returns empty', async () => {
    fetchStrains
      .mockResolvedValueOnce(['Lemon'])
      .mockResolvedValue([]);
    await renderPageAndWait();
    const input = strainInput();
    fireEvent.focus(input);
    fireEvent.click(await screen.findByRole('option', { name: /Lemon/ }));

    const callsBeforeRefresh = fetchStrains.mock.calls.length;
    screen.getByLabelText('Gender Class').focus();
    fireEvent.focus(input);
    await waitFor(() =>
      expect(fetchStrains.mock.calls.length).toBeGreaterThan(callsBeforeRefresh),
    );

    expect(screen.getByRole('button', { name: 'Remove Lemon' })).toBeInTheDocument();
    expect(screen.queryByText(/Register a breed first/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/100% Lemon/i).length).toBeGreaterThan(0);
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

  it('disables register and keeps typed values when a required field is blank', async () => {
    await renderPageAndWait();
    await fillRequiredFields('   ');

    const register = screen.getByRole('button', { name: /^REGISTER$/i });
    expect(register).toBeDisabled();
    expect(screen.getAllByText('Complete 1 required field to register.').length).toBeGreaterThanOrEqual(1);

    expect(insertFowl).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Identifier Name')).toHaveValue('Strain Test Bird');
    expect(screen.getByLabelText('Gender Class')).toHaveValue('Rooster');
    expect(screen.getByLabelText(/^Birth Date/i)).toHaveValue('2025-01-01');
    expect(screen.getByRole('button', { name: /Go to Genetic Strain/i })).toHaveTextContent(
      'Missing',
    );
  });
});


