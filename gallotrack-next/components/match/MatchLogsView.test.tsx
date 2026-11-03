import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import MatchLogsView from './MatchLogsView';
import { validateMatchLinkCandidate } from './LinkChickenModal';
import type { MatchRecord, FowlRecord, MatchMedia } from '@/lib/types';

const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockOpenFowlDetails = vi.fn();
const mockUpdateMatch = vi.fn();
const mockFetchDatabaseResources = vi.fn();
const mockFetchFowls = vi.fn();
const mockCreateChickenProps = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  usePathname: () => '/match-logs',
  useSearchParams: () => mockSearchParams,
}));

vi.mock('@/lib/contexts/ui-context', () => ({
  useUI: () => ({
    openMatchMediaViewer: vi.fn(),
    setSelectedFowlForDetails: mockOpenFowlDetails,
  }),
}));

const mockFowls: Partial<FowlRecord>[] = [
  { id: 10, name: 'Storm Rooster', breed: 'Hatch', gender: 'Rooster' },
  { id: 20, name: 'Flash Cock', breed: 'Sweater', gender: 'Rooster' },
];

const mockMatches: Partial<MatchRecord>[] = [
  {
    id: 1,
    fowl_id: 10,
    entry_name: 'Storm Rooster',
    breed: 'Hatch',
    opponent: 'Tough Opponent A',
    location: 'San Juan Coliseum',
    type: 'Derby',
    outcome: 'Win',
    status: 'Verified',
    date: '2026-10-10',
    age_category: 'Cock',
  },
  {
    id: 2,
    fowl_id: 20,
    entry_name: 'Flash Cock',
    breed: 'Sweater',
    opponent: 'Strong Challenger B',
    location: 'Araneta Coliseum',
    type: 'Hackfight',
    outcome: 'Loss',
    status: 'Verified',
    date: '2026-10-12',
    age_category: 'Stag',
  },
  {
    id: 3,
    fowl_id: 10,
    entry_name: 'Storm Rooster',
    breed: 'Hatch',
    opponent: 'Iron Claw C',
    location: 'Pasay Arena',
    type: 'Derby',
    outcome: 'Draw',
    status: 'Pending',
    date: '2026-10-14',
    age_category: 'Open',
  },
  {
    id: 4,
    fowl_id: 10,
    entry_name: 'Storm Rooster',
    breed: 'Hatch',
    opponent: 'Vintage Rival D',
    location: 'Bacolod Arena',
    type: 'Derby',
    outcome: 'Win',
    status: 'Verified',
    date: '2026-10-15',
    age_category: 'Derby Special',
  },
];

let mockFowlContext = {
  fowls: mockFowls as FowlRecord[],
  matchHistory: mockMatches as MatchRecord[],
  matchMedia: new Map<number, MatchMedia>(),
  birdCodes: new Map<string, string>(),
  loading: false,
  fetchDatabaseResources: mockFetchDatabaseResources,
};

vi.mock('@/lib/services/match-service', () => ({
  updateMatch: (...args: unknown[]) => mockUpdateMatch(...args),
}));

vi.mock('@/lib/services/fowl-service', () => ({
  fetchFowls: (...args: unknown[]) => mockFetchFowls(...args),
}));

vi.mock('@/components/match/CreateChickenForMatch', () => ({
  default: (props: {
    initialName: string;
    initialBreed: string;
    initialSex: string;
    onCreated: (id: number) => void;
  }) => {
    mockCreateChickenProps(props);
    return React.createElement(
      'button',
      { type: 'button', onClick: () => props.onCreated(123) },
      'Create chicken stub',
    );
  },
}));

vi.mock('@/lib/contexts/fowl-context', () => ({
  useFowl: () => mockFowlContext,
}));

describe('MatchLogsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    mockFowlContext = {
      fowls: mockFowls as FowlRecord[],
      matchHistory: mockMatches as MatchRecord[],
      matchMedia: new Map<number, MatchMedia>(),
      birdCodes: new Map<string, string>(),
      loading: false,
      fetchDatabaseResources: mockFetchDatabaseResources,
    };
    mockUpdateMatch.mockReset();
    mockUpdateMatch.mockResolvedValue({ updatedId: 1 });
    mockFetchDatabaseResources.mockReset();
    mockFetchDatabaseResources.mockResolvedValue(undefined);
    mockFetchFowls.mockReset();
    mockFetchFowls.mockResolvedValue([
      { id: 123, name: 'Hatch Silver Jr', breed: 'Hatch', gender: 'Rooster', status: 'Active' },
    ]);
    mockCreateChickenProps.mockReset();
  });

  it('renders page header and link to "+ Add Match Record"', () => {
    render(<MatchLogsView />);

    expect(screen.getByRole('heading', { name: /Historical Analytics Match Logs/i })).toBeDefined();

    const addLink = screen.getByRole('link', { name: /Add Match Record/i });
    expect(addLink).toBeDefined();
    expect(addLink.getAttribute('href')).toContain('/match-logs/new?returnTo=');
  });

  it('clicking the chicken identity opens the chicken info card instead of the match editor', () => {
    render(<MatchLogsView />);
    fireEvent.click(screen.getAllByRole('button', { name: /View info for Storm Rooster/i })[0]);

    expect(mockOpenFowlDetails).toHaveBeenCalledWith(expect.objectContaining({ id: 10 }));
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('filters matches by search query', () => {
    render(<MatchLogsView />);

    const searchInput = screen.getByPlaceholderText(/Search chicken, identifier, opponent.../i);
    fireEvent.change(searchInput, { target: { value: 'Araneta' } });

    // Should find Challenger B and not Tough Opponent A
    expect(screen.getByText('Strong Challenger B')).toBeDefined();
    expect(screen.queryByText('Tough Opponent A')).toBeNull();
  });

  it('filters matches by outcome select', () => {
    render(<MatchLogsView />);

    const outcomeSelect = screen.getByDisplayValue('All Outcomes');

    // Filter by WIN
    fireEvent.change(outcomeSelect, { target: { value: 'WIN' } });
    expect(screen.getByText('Tough Opponent A')).toBeDefined();
    expect(screen.queryByText('Strong Challenger B')).toBeNull();

    // Filter by LOSS
    fireEvent.change(outcomeSelect, { target: { value: 'LOSS' } });
    expect(screen.getByText('Strong Challenger B')).toBeDefined();
    expect(screen.queryByText('Tough Opponent A')).toBeNull();
  });

  it('filters matches by selected chicken', () => {
    render(<MatchLogsView />);

    const chickenSelect = screen.getByDisplayValue('All Chickens');
    // Filter to chicken id 20 ('Flash Cock')
    fireEvent.change(chickenSelect, { target: { value: '20' } });

    expect(screen.getByText('Strong Challenger B')).toBeDefined();
    expect(screen.queryByText('Tough Opponent A')).toBeNull();
  });

  it('displays empty state with clear filters button when no records match', () => {
    render(<MatchLogsView />);

    const searchInput = screen.getByPlaceholderText(/Search chicken, identifier, opponent.../i);
    fireEvent.change(searchInput, { target: { value: 'NonexistentMatchQueryXYZ' } });

    expect(screen.getByText('No records match your filters')).toBeDefined();
    const clearBtns = screen.getAllByRole('button', { name: /Clear Filters/i });
    expect(clearBtns.length).toBeGreaterThan(0);

    fireEvent.click(clearBtns[0]);
    expect(screen.getByText('Tough Opponent A')).toBeDefined();
  });

  it('offers an inline edit action for match rows', () => {
    render(<MatchLogsView />);

    const editButtons = screen.getAllByRole('button', { name: 'Edit match record' });
    expect(editButtons.length).toBeGreaterThan(0);
  });

  it('filters matches by chicken class (Open)', () => {
    render(<MatchLogsView />);

    const classSelect = screen.getByLabelText(/Filter by chicken class/i);
    expect(classSelect).toBeDefined();

    // Filter to Open
    fireEvent.change(classSelect, { target: { value: 'Open' } });

    // Should find Iron Claw C (match 3, Open) and NOT Tough Opponent A (Cock) or Strong Challenger B (Stag)
    expect(screen.getByText('Iron Claw C')).toBeDefined();
    expect(screen.queryByText('Tough Opponent A')).toBeNull();
    expect(screen.queryByText('Strong Challenger B')).toBeNull();
  });

  it('displays unknown class badge cleanly without breaking', () => {
    render(<MatchLogsView />);

    // Match 4 has unknown class 'Derby Special'
    expect(screen.getByText('Vintage Rival D')).toBeDefined();
    expect(screen.getByText('Derby Special')).toBeDefined();
  });

  it('keeps the lifetime record on page 2 and summarizes the active filter', () => {
    const deepFowl = {
      id: 99,
      name: 'Deep Record',
      breed: 'Kelso',
      gender: 'Rooster',
    } as FowlRecord;

    const deepMatches: MatchRecord[] = Array.from({ length: 12 }, (_, i) => ({
      id: 500 + i,
      fowl_id: 99,
      entry_name: 'Deep Record',
      breed: 'Kelso',
      opponent: `Opponent ${i + 1}`,
      location: 'Test Arena',
      type: 'Derby',
      outcome: i < 11 ? 'Win' : 'Loss',
      status: 'Verified',
      date: `2026-10-${String(i + 1).padStart(2, '0')}`,
    }));

    mockFowlContext = {
      ...mockFowlContext,
      fowls: [deepFowl],
      matchHistory: deepMatches,
    };
    mockSearchParams = new URLSearchParams('page=2');

    render(<MatchLogsView />);

    // Page 2 only shows two wins, but the badge must still show the chicken's
    // full lifetime record (11W-1L = 92%), not 100% · 2W-0L.
    const pageTwoBadges = screen.getAllByTestId('match-record-99');
    expect(pageTwoBadges).toHaveLength(2);
    pageTwoBadges.forEach((badge) => {
      expect(badge).toHaveTextContent('92% · 11W-1L');
    });

    const summary = screen.getByTestId('match-logs-filter-summary');
    expect(within(summary).getByText('12 matches')).toBeInTheDocument();
    expect(within(summary).getByText('11W-1L-0D')).toBeInTheDocument();
    expect(within(summary).getByText('92%')).toBeInTheDocument();

    // The summary follows the filter while the chicken record stays lifetime.
    fireEvent.change(screen.getByLabelText(/Filter by outcome/i), { target: { value: 'LOSS' } });

    const filteredSummary = screen.getByTestId('match-logs-filter-summary');
    expect(within(filteredSummary).getByText('1 match')).toBeInTheDocument();
    expect(within(filteredSummary).getByText('0W-1L-0D')).toBeInTheDocument();
    expect(within(filteredSummary).getByText('0%')).toBeInTheDocument();

    const filteredBadges = screen.getAllByTestId('match-record-99');
    expect(filteredBadges).toHaveLength(1);
    expect(filteredBadges[0]).toHaveTextContent('92% · 11W-1L');
  });

  it('opens the link modal from the historical badge without the old toast', () => {
    const historical = {
      id: 99,
      fowl_id: null,
      entry_name: 'Hatch Silver',
      breed: 'Hatch',
      opponent: 'Old Rival',
      location: 'Arena',
      type: 'Derby',
      outcome: 'Win',
      status: 'Verified',
      date: '2025-02-09',
      age_category: 'Cock',
    } as MatchRecord;
    mockFowlContext = { ...mockFowlContext, matchHistory: [historical] };

    render(<MatchLogsView />);
    fireEvent.click(screen.getByRole('button', { name: 'Link profile for Hatch Silver' }));

    expect(screen.getByRole('heading', { name: 'Link historical match' })).toBeInTheDocument();
    expect(screen.queryByText(/No chicken profile is linked/i)).not.toBeInTheDocument();
  });

  it('lists only registered cocks with exact-name suggestions first', () => {
    const historical = {
      id: 99,
      fowl_id: null,
      entry_name: 'Storm Rooster',
      breed: 'Hatch',
      opponent: 'Old Rival',
      location: 'Arena',
      type: 'Derby',
      outcome: 'Win',
      status: 'Verified',
      date: '2025-02-09',
      age_category: 'Cock',
    } as MatchRecord;
    mockFowlContext = {
      ...mockFowlContext,
      matchHistory: [historical],
      fowls: [
        { id: 30, name: 'Aardvark Cock', breed: 'Kelso', gender: 'Rooster', status: 'Active' },
        { id: 10, name: 'Storm Rooster', breed: 'Hatch', gender: 'Rooster', status: 'Active' },
        { id: 31, name: 'Hen Thing', breed: 'Hatch', gender: 'Hen', status: 'Active' },
      ] as FowlRecord[],
    };

    render(<MatchLogsView />);
    fireEvent.click(screen.getByRole('button', { name: 'Link profile for Storm Rooster' }));
    const picker = screen.getByRole('listbox', { name: 'Eligible chickens' });
    const options = within(picker).getAllByRole('option');
    expect(options[0]).toHaveTextContent('Storm Rooster');
    expect(within(picker).queryByText('Hen Thing')).not.toBeInTheDocument();
  });

  it('rejects hens and non-male recorded sex from being linked', () => {
    expect(
      validateMatchLinkCandidate({ id: 1, name: 'Hen', gender: 'Hen' } as FowlRecord)
    ).toBe('Only cocks can be linked to a fight.');
    expect(
      validateMatchLinkCandidate(
        { id: 2, name: 'Cock', gender: 'Rooster' } as FowlRecord,
        'Hen',
      )
    ).toBe('Only cocks can be linked to a fight.');
  });

  it('warns about a recorded sex conflict and requires explicit confirmation', async () => {
    const historical = {
      id: 99,
      fowl_id: null,
      entry_name: 'Hatch Silver',
      breed: 'Hatch',
      sex: 'Unknown',
      opponent: 'Old Rival',
      location: 'Arena',
      type: 'Derby',
      outcome: 'Win',
      status: 'Verified',
      date: '2025-02-09',
      age_category: 'Cock',
    } as MatchRecord;
    mockFowlContext = { ...mockFowlContext, matchHistory: [historical] };

    render(<MatchLogsView />);
    fireEvent.click(screen.getByRole('button', { name: 'Link profile for Hatch Silver' }));
    const picker = screen.getByRole('listbox', { name: 'Eligible chickens' });
    fireEvent.click(within(picker).getByRole('option', { name: /Storm Rooster/ }));

    expect(screen.getByText(/recorded with sex/i)).toBeInTheDocument();
    const confirmButton = screen.getByRole('button', { name: 'Link chicken' });
    expect(confirmButton).toBeDisabled();

    fireEvent.click(screen.getByLabelText('Confirm recorded sex conflict'));
    expect(confirmButton).toBeEnabled();
    fireEvent.click(confirmButton);
    await waitFor(() => expect(mockUpdateMatch).toHaveBeenCalled());
  });

  it('does not link until the user confirms', () => {
    const historical = {
      id: 99,
      fowl_id: null,
      entry_name: 'Hatch Silver',
      breed: 'Hatch',
      opponent: 'Old Rival',
      location: 'Arena',
      type: 'Derby',
      outcome: 'Win',
      status: 'Verified',
      date: '2025-02-09',
      age_category: 'Cock',
    } as MatchRecord;
    mockFowlContext = { ...mockFowlContext, matchHistory: [historical] };

    render(<MatchLogsView />);
    fireEvent.click(screen.getByRole('button', { name: 'Link profile for Hatch Silver' }));
    const picker = screen.getByRole('listbox', { name: 'Eligible chickens' });
    fireEvent.click(within(picker).getByRole('option', { name: /Storm Rooster/ }));
    expect(mockUpdateMatch).not.toHaveBeenCalled();
  });

  it('bulk-links only the ticked historical matches', async () => {
    const current = {
      id: 99,
      fowl_id: null,
      entry_name: 'Hatch Silver',
      breed: 'Hatch',
      opponent: 'Current Rival',
      location: 'Arena',
      type: 'Derby',
      outcome: 'Win',
      status: 'Verified',
      date: '2025-02-09',
      age_category: 'Cock',
    } as MatchRecord;
    const otherA = { ...current, id: 100, opponent: 'Bulk Rival A' } as MatchRecord;
    const otherB = { ...current, id: 101, opponent: 'Bulk Rival B' } as MatchRecord;
    mockFowlContext = { ...mockFowlContext, matchHistory: [current, otherA, otherB] };

    render(<MatchLogsView />);
    const currentRow = screen.getByText('Current Rival').closest('tr') as HTMLElement;
    fireEvent.click(
      within(currentRow).getByRole('button', { name: 'Link profile for Hatch Silver' })
    );
    fireEvent.click(
      screen.getByLabelText(/Apply to other historical matches with the same entered name/i)
    );
    const bulkLabel = screen
      .getAllByText(/Bulk Rival A/)
      .map((el) => el.closest('label'))
      .find((el): el is HTMLLabelElement => Boolean(el)) as HTMLElement;
    fireEvent.click(within(bulkLabel).getByRole('checkbox'));
    const picker = screen.getByRole('listbox', { name: 'Eligible chickens' });
    fireEvent.click(within(picker).getByRole('option', { name: /Storm Rooster/ }));
    fireEvent.click(screen.getByRole('button', { name: /Link 2 matches/i }));

    await waitFor(() => {
      expect(mockUpdateMatch).toHaveBeenCalledWith(99, expect.objectContaining({ fowl_id: 10 }));
      expect(mockUpdateMatch).toHaveBeenCalledWith(100, expect.objectContaining({ fowl_id: 10 }));
    });
    expect(mockUpdateMatch).not.toHaveBeenCalledWith(101, expect.anything());
  });

  it('prefills the shared registration form and links after save', async () => {
    const historical = {
      id: 99,
      fowl_id: null,
      entry_name: 'Hatch Silver',
      breed: 'Hatch',
      opponent: 'Old Rival',
      location: 'Arena',
      type: 'Derby',
      outcome: 'Win',
      status: 'Verified',
      date: '2025-02-09',
      age_category: 'Cock',
    } as MatchRecord;
    mockFowlContext = { ...mockFowlContext, matchHistory: [historical] };

    render(<MatchLogsView />);
    fireEvent.click(screen.getByRole('button', { name: 'Link profile for Hatch Silver' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Create new profile' }));

    expect(mockCreateChickenProps).toHaveBeenCalledWith(
      expect.objectContaining({
        initialName: 'Hatch Silver',
        initialBreed: 'Hatch',
        initialSex: 'Rooster',
      })
    );
    fireEvent.click(screen.getByRole('button', { name: 'Create chicken stub' }));

    await waitFor(() =>
      expect(mockUpdateMatch).toHaveBeenCalledWith(
        99,
        expect.objectContaining({ fowl_id: 123 })
      )
    );
    expect(mockFetchFowls).toHaveBeenCalled();
  });

  it('opens the guided review queue and steps through unlinked entries', () => {
    const a = {
      id: 300,
      fowl_id: null,
      entry_name: 'Hatch Silver',
      breed: 'Hatch',
      opponent: 'Queue A',
      outcome: 'Win',
      date: '2025-02-09',
    } as MatchRecord;
    const b = {
      ...a,
      id: 301,
      entry_name: 'Hatch Crown',
      opponent: 'Queue B',
    } as MatchRecord;
    mockFowlContext = { ...mockFowlContext, matchHistory: [a, b] } as typeof mockFowlContext;

    render(<MatchLogsView />);
    fireEvent.click(screen.getByRole('button', { name: 'Review unlinked' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('1 of 2')).toBeInTheDocument();
    expect(within(dialog).getByText('Hatch Silver')).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Next' }));
    expect(within(dialog).getByText('2 of 2')).toBeInTheDocument();
    expect(within(dialog).getByText('Hatch Crown')).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Previous' }));
    expect(within(dialog).getByText('1 of 2')).toBeInTheDocument();
  });

  it('shows the unlinked count and filters to unlinked rows only', () => {
    const unlinkedA = {
      id: 200,
      fowl_id: null,
      entry_name: 'Hatch Silver',
      breed: 'Hatch',
      opponent: 'Unlinked A',
      outcome: 'Win',
      date: '2025-02-09',
    } as MatchRecord;
    const unlinkedB = { ...unlinkedA, id: 201, entry_name: 'Other Historical', opponent: 'Unlinked B' } as MatchRecord;
    mockFowlContext = { ...mockFowlContext, matchHistory: [...mockMatches, unlinkedA, unlinkedB] } as typeof mockFowlContext;

    render(<MatchLogsView />);
    const badge = screen.getByRole('button', { name: /2 historical entries need a profile/i });
    expect(badge).toBeInTheDocument();
    fireEvent.click(badge);
    expect(screen.getByLabelText('Unlinked only')).toBeChecked();
    expect(screen.queryByText('Tough Opponent A')).not.toBeInTheDocument();
    expect(screen.getByText('Unlinked A')).toBeInTheDocument();
    expect(screen.getByText('Unlinked B')).toBeInTheDocument();
  });

  it('keeps historical names non-interactive and shows the link action', () => {
    const historical = {
      id: 99,
      fowl_id: null,
      entry_name: 'Hatch Silver',
      breed: 'Hatch',
      opponent: 'Old Rival',
      location: 'Arena',
      type: 'Derby',
      outcome: 'Win',
      status: 'Verified',
      date: '2025-02-09',
      age_category: 'Cock',
    } as MatchRecord;
    mockFowlContext = { ...mockFowlContext, matchHistory: [historical] };

    render(<MatchLogsView />);

    const name = screen.getByText('Hatch Silver');
    expect(name.closest('button')).toBeNull();
    expect(name).toHaveClass('cursor-default');
    fireEvent.click(name);
    expect(screen.queryByText(/No chicken profile is linked/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Link profile for Hatch Silver' })
    ).toBeInTheDocument();
  });

  it('links a historical match and refreshes stats', async () => {
    const historical = {
      id: 99,
      fowl_id: null,
      entry_name: 'Hatch Silver',
      breed: 'Hatch',
      opponent: 'Old Rival',
      location: 'Arena',
      type: 'Derby',
      outcome: 'Win',
      status: 'Verified',
      date: '2025-02-09',
      age_category: 'Cock',
    } as MatchRecord;
    mockFowlContext = { ...mockFowlContext, matchHistory: [historical] };

    render(<MatchLogsView />);
    fireEvent.click(screen.getByRole('button', { name: 'Link profile for Hatch Silver' }));

    const picker = screen.getByRole('listbox', { name: 'Eligible chickens' });
    fireEvent.click(within(picker).getByRole('option', { name: /Storm Rooster/ }));
    expect(screen.getByText(/selected chicken is named/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Link chicken' }));

    await waitFor(() =>
      expect(mockUpdateMatch).toHaveBeenCalledWith(99, { fowl_id: 10 })
    );
    expect(mockFetchDatabaseResources).toHaveBeenCalled();
  });

  it('preserves entry_name unless the explicit rename option is ticked, then unlink restores it', async () => {
    const historical = {
      id: 99,
      fowl_id: null,
      entry_name: 'Hatch Silver',
      breed: 'Hatch',
      opponent: 'Old Rival',
      location: 'Arena',
      type: 'Derby',
      outcome: 'Win',
      status: 'Verified',
      date: '2025-02-09',
      age_category: 'Cock',
    } as MatchRecord;
    mockFowlContext = { ...mockFowlContext, matchHistory: [historical] };

    const { rerender } = render(<MatchLogsView />);
    fireEvent.click(screen.getByRole('button', { name: 'Link profile for Hatch Silver' }));
    const picker = screen.getByRole('listbox', { name: 'Eligible chickens' });
    fireEvent.click(within(picker).getByRole('option', { name: /Storm Rooster/ }));

    fireEvent.click(screen.getByLabelText('Also update the recorded name'));
    fireEvent.click(screen.getByRole('button', { name: 'Link chicken' }));

    await waitFor(() =>
      expect(mockUpdateMatch).toHaveBeenCalledWith(99, {
        fowl_id: 10,
        entry_name: 'Storm Rooster',
        breed: 'Hatch',
      })
    );

    mockFowlContext = {
      ...mockFowlContext,
      matchHistory: [{ ...historical, fowl_id: 10, entry_name: 'Storm Rooster' }],
    };
    rerender(<MatchLogsView />);
    const row = screen.getByText('Old Rival').closest('tr') as HTMLElement;
    fireEvent.click(
      within(row).getByRole('button', { name: 'Unlink chicken profile from Storm Rooster' })
    );
    fireEvent.click(screen.getByRole('button', { name: 'Unlink' }));

    await waitFor(() =>
      expect(mockUpdateMatch).toHaveBeenCalledWith(99, {
        fowl_id: null,
        entry_name: 'Hatch Silver',
      })
    );
  });

  it('unlinks a linked match and refreshes stats', async () => {
    render(<MatchLogsView />);
    const row = screen.getByText('Vintage Rival D').closest('tr') as HTMLElement;
    fireEvent.click(
      within(row).getByRole('button', { name: 'Unlink chicken profile from Storm Rooster' })
    );
    fireEvent.click(screen.getByRole('button', { name: 'Unlink' }));

    await waitFor(() => expect(mockUpdateMatch).toHaveBeenCalledWith(4, { fowl_id: null }));
    expect(mockFetchDatabaseResources).toHaveBeenCalled();
  });

  it('sorts deterministically by date then id and exposes the header indicator', () => {
    const dated = [
      { id: 1, fowl_id: 10, entry_name: 'Storm Rooster', opponent: 'A', outcome: 'Win', date: '2025-02-09' },
      { id: 2, fowl_id: 10, entry_name: 'Storm Rooster', opponent: 'B', outcome: 'Win', date: '2025-03-10' },
      { id: 3, fowl_id: 10, entry_name: 'Storm Rooster', opponent: 'C', outcome: 'Win', date: '2025-02-21' },
      { id: 4, fowl_id: 10, entry_name: 'Storm Rooster', opponent: 'D', outcome: 'Win', date: '2026-02-09' },
      { id: 5, fowl_id: 10, entry_name: 'Storm Rooster', opponent: 'E', outcome: 'Win', date: '2026-09-08' },
    ] as MatchRecord[];
    mockFowlContext = { ...mockFowlContext, matchHistory: dated };

    render(<MatchLogsView />);

    const dateOrder = () =>
      within(screen.getByRole('table'))
        .getAllByRole('row')
        .slice(1)
        .map((row) => row.querySelector('td')?.textContent?.trim());

    expect(dateOrder()).toEqual([
      '2026-09-08',
      '2026-02-09',
      '2025-03-10',
      '2025-02-21',
      '2025-02-09',
    ]);
    const dateHeader = screen.getByRole('columnheader', { name: /Match Date/ });
    expect(dateHeader).toHaveAttribute('aria-sort', 'descending');

    fireEvent.click(screen.getByRole('button', { name: /Sort by match date/i }));
    expect(dateOrder()).toEqual([
      '2025-02-09',
      '2025-02-21',
      '2025-03-10',
      '2026-02-09',
      '2026-09-08',
    ]);
    expect(screen.getByRole('columnheader', { name: /Match Date/ })).toHaveAttribute(
      'aria-sort',
      'ascending'
    );
  });

});
