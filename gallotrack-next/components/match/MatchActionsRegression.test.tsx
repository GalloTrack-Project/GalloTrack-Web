import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MatchLogsTable from './MatchLogsTable';
import MatchLogsView from './MatchLogsView';
import MatchRecordForm from './MatchRecordForm';
import { sanitizeRedirectPath } from '@/lib/auth-redirect';
import type { MatchRecord, FowlRecord } from '@/lib/types';

const mockPush = vi.fn();
const mockOpenMatchMediaViewer = vi.fn();
const mockSetShareTarget = vi.fn();
const mockSetSelectedFowlForDetails = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/match-logs',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/lib/contexts/ui-context', () => ({
  useUI: () => ({
    openMatchMediaViewer: mockOpenMatchMediaViewer,
    setShareTarget: mockSetShareTarget,
    selectedFowlForDetails: null,
    setSelectedFowlForDetails: mockSetSelectedFowlForDetails,
    fightHistoryFowl: null,
    setFightHistoryFowl: vi.fn(),
  }),
}));

const mockFowls: FowlRecord[] = [
  {
    id: 10,
    name: 'Thunder King',
    breed: 'Sweater',
    gender: 'Cock',
    status: 'Active',
    registry_role: 'Breeding Male',
  },
  {
    id: 20,
    name: 'Inactive Veteran',
    breed: 'Kelso',
    gender: 'Cock',
    status: 'Deceased',
    registry_role: 'Breeding Male',
  },
  {
    id: 30,
    name: 'Queen Mother',
    breed: 'Hatch',
    gender: 'Hen',
    status: 'Active',
    registry_role: 'Breeding Female',
  },
] as unknown as FowlRecord[];

const mockMatches: MatchRecord[] = [
  {
    id: 101,
    fowl_id: 10,
    entry_name: 'Thunder King',
    breed: 'Sweater',
    opponent: 'Iron Claw',
    location: 'Arena',
    type: 'Derby',
    status: 'Verified',
    date: '2026-10-10',
    outcome: 'Win',
    video_count: 1,
    photo_count: 2,
    videos: ['https://example.com/v1.mp4'],
    photos: ['https://example.com/p1.jpg', 'https://example.com/p2.jpg'],
  },
  {
    id: 102,
    fowl_id: 10,
    entry_name: 'Thunder King',
    breed: 'Sweater',
    opponent: 'Silver Wing',
    location: 'Arena',
    type: 'Derby',
    status: 'Verified',
    date: '2026-10-11',
    outcome: 'Loss',
    video_count: 0,
    photo_count: 0,
    videos: [],
    photos: [],
  },
] as unknown as MatchRecord[];

vi.mock('@/lib/contexts/fowl-context', () => ({
  useFowl: () => ({
    fowls: mockFowls,
    matchHistory: mockMatches,
    matchMedia: new Map(),
    birdCodes: new Map([['10', 'TK-01']]),
    fetchDatabaseResources: vi.fn(),
    loading: false,
  }),
}));

vi.mock('@/lib/hooks/use-registry-options', () => ({
  useRegistryOptions: () => ({ rows: [] }),
}));

vi.mock('@/lib/hooks/use-user-settings', () => ({
  useUserSettings: () => ({ match_location_required: false }),
}));

describe('Match Actions Regression & Accessibility Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Match Logs Table (/dashboard)', () => {
    it('renders exactly one Edit action per row and opens the inline editor', () => {
      render(<MatchLogsTable matches={mockMatches} />);

      const editButtons = screen.getAllByRole('button', { name: 'Edit match record' });
      // Exactly 1 edit action per match row (2 rows = 2 buttons total)
      expect(editButtons).toHaveLength(2);
      fireEvent.click(editButtons[0]);
      expect(screen.getByRole('dialog', { name: /Edit Match Record/i })).toBeInTheDocument();
    });

    it('renders Play media only when media exists with media count badge', () => {
      render(<MatchLogsTable matches={mockMatches} />);

      const playButtons = screen.getAllByRole('button', { name: 'Play media' });
      // Only match 101 has media, match 102 does not
      expect(playButtons).toHaveLength(1);
      expect(playButtons[0]).toHaveTextContent('3'); // 1 video + 2 photos

      // Match 102 displays 'No media'
      expect(screen.getByText('No media')).toBeInTheDocument();
    });

    it('renders Share button with accessible name "Share match"', () => {
      render(<MatchLogsTable matches={mockMatches} />);

      const shareButtons = screen.getAllByRole('button', { name: 'Share match' });
      expect(shareButtons).toHaveLength(2);
    });

    it('stops click propagation so table row navigation does not fire when actions are clicked', () => {
      render(<MatchLogsTable matches={mockMatches} />);

      const playBtn = screen.getByRole('button', { name: 'Play media' });
      fireEvent.click(playBtn);
      // Opens media viewer, does NOT trigger row navigation router.push
      expect(mockOpenMatchMediaViewer).toHaveBeenCalledTimes(1);
      expect(mockPush).not.toHaveBeenCalled();

      const shareBtn = screen.getAllByRole('button', { name: 'Share match' })[0];
      fireEvent.click(shareBtn);
      expect(mockSetShareTarget).toHaveBeenCalledTimes(1);
      expect(mockPush).not.toHaveBeenCalled();

      const editButton = screen.getAllByRole('button', { name: 'Edit match record' })[0];
      fireEvent.click(editButton);
      // Normal click opens the inline editor and never navigates away
      expect(mockPush).not.toHaveBeenCalledWith('/match-logs/101/edit');
    });

    it('opens chicken details instead of navigating to the edit page when the chicken identifier is clicked', () => {
      render(<MatchLogsTable matches={mockMatches} />);

      fireEvent.click(
        screen.getAllByRole('button', { name: /View info for Thunder King/i })[0],
      );

      expect(mockSetSelectedFowlForDetails).toHaveBeenCalledWith(
        expect.objectContaining({ id: 10 }),
      );
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('does not navigate to the edit page when an unlinked historical chicken cell is clicked', () => {
      const unlinkedMatch = {
        ...mockMatches[0],
        id: 999,
        fowl_id: null,
        entry_name: 'Unknown Historical Bird',
      } as MatchRecord;

      render(<MatchLogsTable matches={[unlinkedMatch]} />);

      fireEvent.click(screen.getByText('Unknown Historical Bird'));

      expect(mockSetSelectedFowlForDetails).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('2. Match Logs View (/match-logs)', () => {
    it('renders exactly one inline Edit action per row', () => {
      render(<MatchLogsView />);

      const editButtons = screen.getAllByRole('button', { name: 'Edit match record' });
      expect(editButtons).toHaveLength(2);
    });
  });

  describe('3. returnTo Redirect Sanitizer Security', () => {
    it('rejects protocol-relative and scheme injections', () => {
      expect(sanitizeRedirectPath('//evil.com', '/match-logs')).toBe('/match-logs');
      expect(sanitizeRedirectPath('https://evil.com/phish', '/match-logs')).toBe('/match-logs');
      expect(sanitizeRedirectPath('javascript:alert(1)', '/match-logs')).toBe('/match-logs');
      expect(sanitizeRedirectPath('/\\evil.com', '/match-logs')).toBe('/match-logs');
      expect(sanitizeRedirectPath('data:text/html,test', '/match-logs')).toBe('/match-logs');
    });

    it('accepts valid relative same-origin routes', () => {
      expect(sanitizeRedirectPath('/dashboard', '/match-logs')).toBe('/dashboard');
      expect(sanitizeRedirectPath('/lineage', '/match-logs')).toBe('/lineage');
      expect(sanitizeRedirectPath('/match-logs', '/match-logs')).toBe('/match-logs');
      expect(sanitizeRedirectPath('/profiling', '/match-logs')).toBe('/profiling');
    });
  });

  describe('4. Add Match Chicken Preselection (?fowlId)', () => {
    it('preselects valid active rooster without warning', () => {
      render(<MatchRecordForm mode="add" initialFowlId={10} />);

      const select = screen.getByRole('combobox', { name: /Select Local Chicken Entry/i }) as HTMLSelectElement;
      expect(select.value).toBe('10');
      expect(screen.queryByRole('status')).toBeNull();
    });

    it('fails gracefully with empty selector and clear message when fowl is not found', () => {
      render(<MatchRecordForm mode="add" initialFowlId={999} />);

      const select = screen.getByRole('combobox', { name: /Select Local Chicken Entry/i }) as HTMLSelectElement;
      expect(select.value).toBe('');
      const warning = screen.getByRole('status');
      expect(warning).toHaveTextContent(/Chicken #999 was not found in your registry/i);
    });

    it('fails gracefully with empty selector and clear message when fowl is inactive (Deceased)', () => {
      render(<MatchRecordForm mode="add" initialFowlId={20} />);

      const select = screen.getByRole('combobox', { name: /Select Local Chicken Entry/i }) as HTMLSelectElement;
      expect(select.value).toBe('');
      const warning = screen.getByRole('status');
      expect(warning).toHaveTextContent(/"Inactive Veteran" is marked as Deceased/i);
    });

    it('fails gracefully with empty selector and clear message when fowl is female (Hen)', () => {
      render(<MatchRecordForm mode="add" initialFowlId={30} />);

      const select = screen.getByRole('combobox', { name: /Select Local Chicken Entry/i }) as HTMLSelectElement;
      expect(select.value).toBe('');
      const warning = screen.getByRole('status');
      expect(warning).toHaveTextContent(/"Queen Mother" is female/i);
    });
  });
});
