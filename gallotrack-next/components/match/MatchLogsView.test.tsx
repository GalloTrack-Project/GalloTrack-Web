import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import MatchLogsView from './MatchLogsView';
import type { MatchRecord, FowlRecord, MatchMedia } from '@/lib/types';

const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockOpenFowlDetails = vi.fn();
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
};

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
    };
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
});
