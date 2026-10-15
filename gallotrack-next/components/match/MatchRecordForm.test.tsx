import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MatchRecordForm from './MatchRecordForm';
import type { FowlRecord, MatchRecord } from '@/lib/types';
import * as matchService from '@/lib/services/match-service';
import * as mediaService from '@/lib/services/media-service';

const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: vi.fn() }),
  usePathname: () => '/match-logs/new',
  useSearchParams: () => new URLSearchParams(),
}));

const mockFowls: FowlRecord[] = [
  { id: 42, name: 'Lemon Storm', breed: 'Lemon', gender: 'Rooster', status: 'Active' } as FowlRecord,
  { id: 55, name: 'Hatch Silver', breed: 'Hatch', gender: 'Rooster', status: 'Active' } as FowlRecord,
  { id: 46, name: 'Golden Pearl', breed: 'Lemon', gender: 'Hen', status: 'Active' } as FowlRecord, // Female - excluded from candidates
];

const mockBirdCodes = new Map<string, string>([
  ['42', '1A1'],
  ['55', '1B1'],
]);

const mockFetchDatabaseResources = vi.fn();

vi.mock('@/lib/contexts/fowl-context', () => ({
  useFowl: () => ({
    fowls: mockFowls,
    birdCodes: mockBirdCodes,
    fetchDatabaseResources: mockFetchDatabaseResources,
  }),
}));

vi.mock('@/lib/hooks/use-registry-options', () => ({
  useRegistryOptions: () => ({
    rows: [],
  }),
}));

vi.mock('@/lib/hooks/use-user-settings', () => ({
  useUserSettings: () => ({
    match_location_required: false,
  }),
}));

vi.mock('@/lib/registry', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } } }),
    },
  },
}));

vi.mock('@/lib/services/match-service', () => ({
  insertMatch: vi.fn(),
  updateMatch: vi.fn(),
  uploadMatchVideo: vi.fn(),
}));

vi.mock('@/lib/services/media-service', () => ({
  fetchMatchMediaDetails: vi.fn().mockResolvedValue({ videos: [], photos: [] }),
  uploadMatchPhotoFile: vi.fn(),
  insertMatchVideo: vi.fn(),
  insertMatchPhoto: vi.fn(),
  deleteMatchMedia: vi.fn(),
}));

describe('MatchRecordForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Add Match Record title and only active roosters in chicken dropdown', () => {
    render(<MatchRecordForm mode="add" />);

    expect(screen.getByRole('heading', { name: /Add Match Record/i })).toBeDefined();

    // The select should include Lemon Storm (#42) and Hatch Silver (#55), but not the hen Golden Pearl (#46)
    const chickenSelect = screen.getByLabelText(/Select Local Chicken Entry/i) as HTMLSelectElement;
    expect(chickenSelect).toBeDefined();
    expect(screen.getByText(/Lemon Storm/i)).toBeDefined();
    expect(screen.getByText(/Hatch Silver/i)).toBeDefined();
    expect(screen.queryByText(/Golden Pearl/i)).toBeNull();
  });

  it('pre-selects rooster when initialFowlId is passed', () => {
    render(<MatchRecordForm mode="add" initialFowlId={55} />);

    const chickenSelect = screen.getByLabelText(/Select Local Chicken Entry/i) as HTMLSelectElement;
    expect(chickenSelect.value).toBe('55');
  });

  it('displays inline accessible validation errors when required fields are missing', async () => {
    render(<MatchRecordForm mode="add" />);

    const saveButton = screen.getByRole('button', { name: /Save Match Record/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      // Inline error for chicken
      const fowlError = screen.getByText('Please select a chicken entry.');
      expect(fowlError).toBeDefined();
      expect(fowlError.getAttribute('role')).toBe('alert');

      // Inline error for opponent
      const opponentError = screen.getByText('Opponent entry identity is required.');
      expect(opponentError).toBeDefined();
    });

    // insertMatch must NOT have been called
    expect(matchService.insertMatch).not.toHaveBeenCalled();
  });

  it('submits in Add mode with authoritative fowl_id and entry_name snapshot', async () => {
    vi.mocked(matchService.insertMatch).mockResolvedValue({ id: 999 });

    render(<MatchRecordForm mode="add" />);

    // Select chicken
    const chickenSelect = screen.getByLabelText(/Select Local Chicken Entry/i);
    fireEvent.change(chickenSelect, { target: { value: '42' } });

    // Enter opponent
    const opponentInput = screen.getByLabelText(/Opponent Entry Identity/i);
    fireEvent.change(opponentInput, { target: { value: 'Kelso Champion' } });

    // Submit form
    const saveButton = screen.getByRole('button', { name: /Save Match Record/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(matchService.insertMatch).toHaveBeenCalledWith(
        expect.objectContaining({
          fowl_id: 42,
          entry_name: 'Lemon Storm',
          breed: 'Lemon',
          opponent: 'Kelso Champion',
          user_id: 'test-user-id',
        })
      );
      expect(mockFetchDatabaseResources).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/match-logs');
    });
  });

  it('populates initialRecord in Edit mode and updates record on submit', async () => {
    const existingMatch: MatchRecord = {
      id: 88,
      fowl_id: 55,
      entry_name: 'Hatch Silver',
      breed: 'Hatch',
      date: '2026-09-10',
      opponent: 'Roundhead Ace',
      outcome: 'Win',
      cock_count: 3,
      age_category: 'Stag',
      event_type: 'Derby',
      location: 'Araneta Coliseum',
      type: 'Derby',
      status: 'Verified',
    };

    vi.mocked(matchService.updateMatch).mockResolvedValue({});

    render(<MatchRecordForm mode="edit" initialRecord={existingMatch} />);

    expect(screen.getByRole('heading', { name: /Edit Match Record/i })).toBeDefined();

    const chickenSelect = screen.getByLabelText(/Select Local Chicken Entry/i) as HTMLSelectElement;
    expect(chickenSelect.value).toBe('55');

    const opponentInput = screen.getByLabelText(/Opponent Entry Identity/i) as HTMLInputElement;
    expect(opponentInput.value).toBe('Roundhead Ace');

    // Change opponent
    fireEvent.change(opponentInput, { target: { value: 'Roundhead Master' } });

    const updateButton = screen.getByRole('button', { name: /Update Match Record/i });
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(matchService.updateMatch).toHaveBeenCalledWith(
        88,
        expect.objectContaining({
          fowl_id: 55,
          entry_name: 'Hatch Silver',
          opponent: 'Roundhead Master',
        })
      );
      expect(mockFetchDatabaseResources).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/match-logs');
    });
  });

  it('guards against discarding unsaved changes on Cancel when dirty', async () => {
    render(<MatchRecordForm mode="add" />);

    // Form pristine -> Cancel navigates immediately without modal
    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);
    expect(mockPush).toHaveBeenCalledWith('/match-logs');
    expect(screen.queryByRole('heading', { name: /Unsaved Changes/i })).toBeNull();

    // Now make the form dirty
    const opponentInput = screen.getByLabelText(/Opponent Entry Identity/i);
    fireEvent.change(opponentInput, { target: { value: 'Dirty Opponent' } });

    // Cancel now prompts with dialog
    fireEvent.click(cancelButton);
    expect(screen.getByRole('heading', { name: /Unsaved Changes/i })).toBeDefined();
    expect(screen.getByText(/Are you sure you want to leave\?/i)).toBeDefined();

    // Click "Keep Editing" closes modal without navigation
    const keepEditingBtn = screen.getByRole('button', { name: /Keep Editing/i });
    fireEvent.click(keepEditingBtn);
    expect(screen.queryByRole('heading', { name: /Unsaved Changes/i })).toBeNull();

    // Click "Discard & Leave" navigates away
    fireEvent.click(cancelButton);
    const discardBtn = screen.getByRole('button', { name: /Discard & Leave/i });
    fireEvent.click(discardBtn);
    expect(mockPush).toHaveBeenCalledWith('/match-logs');
  });
});
