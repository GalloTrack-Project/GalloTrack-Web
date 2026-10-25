import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MatchLogsTable from './MatchLogsTable';
import { fetchMatchMediaBatch, attachMatchMediaCounts } from '@/lib/services/media-service';
import type { MatchRecord, MatchMedia, FowlRecord } from '@/lib/types';

const mockOpenMatchMediaViewer = vi.fn();
const mockOpenFowlDetails = vi.fn();
const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/match-logs',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/lib/contexts/ui-context', () => ({
  useUI: () => ({
    openMatchMediaViewer: mockOpenMatchMediaViewer,
    setShareTarget: vi.fn(),
    setSelectedFowlForDetails: mockOpenFowlDetails,
  }),
}));

const mockFowlContext = {
  fowls: [] as FowlRecord[],
  matchHistory: [],
  matchMedia: new Map<number, MatchMedia>(),
  birdCodes: new Map<string, string>(),
};

vi.mock('@/lib/contexts/fowl-context', () => ({
  useFowl: () => mockFowlContext,
}));

describe('Match Media Resolution and MatchLogsTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('a match with one video and one photo returns counts in the list API logic', async () => {
    const rawMatches: MatchRecord[] = [
      {
        id: 101,
        entry_name: 'Iron Lemon',
        breed: 'Lemon',
        opponent: 'Black Butcher',
        location: 'Pasay Cockpit',
        type: 'Derby',
        outcome: 'Win',
        status: 'Verified',
        date: '2026-10-01',
        video_url: 'https://example.com/videos/match-101.mp4',
      },
      {
        id: 102,
        entry_name: 'Titan Sweater',
        breed: 'Sweater',
        opponent: 'Red Kelso',
        location: 'Araneta',
        type: 'Main Event',
        outcome: 'Loss',
        status: 'Verified',
        date: '2026-10-02',
      },
    ];

    // Mock client simulating match_videos and match_photos tables
    const fakeClient = {
      from: (table: string) => ({
        select: () => ({
          in: (col: string, ids: number[]) => ({
            order: () => ({
              order: async () => {
                if (table === 'match_videos') {
                  return { data: [], error: null };
                }
                if (table === 'match_photos') {
                  return {
                    data: [
                      {
                        match_id: 101,
                        url: 'https://example.com/photos/match-101-a.jpg',
                        sort_order: 1,
                      },
                    ],
                    error: null,
                  };
                }
                return { data: [], error: null };
              },
            }),
          }),
        }),
      }),
    };

    const mediaMap = await fetchMatchMediaBatch(rawMatches, fakeClient);
    const enriched = attachMatchMediaCounts(rawMatches, mediaMap);

    // Match 101 has 1 video (from match.video_url) and 1 photo (from match_photos table)
    expect(enriched[0].video_count).toBe(1);
    expect(enriched[0].photo_count).toBe(1);
    expect(enriched[0].videos).toEqual(['https://example.com/videos/match-101.mp4']);
    expect(enriched[0].photos).toEqual(['https://example.com/photos/match-101-a.jpg']);

    // Match 102 has 0 media
    expect(enriched[1].video_count).toBe(0);
    expect(enriched[1].photo_count).toBe(0);
    expect(enriched[1].videos).toEqual([]);
    expect(enriched[1].photos).toEqual([]);
  });

  it('renders Play media button and exactly one Edit match record action for a match with media', () => {
    const matchesWithMedia: MatchRecord[] = [
      {
        id: 201,
        entry_name: 'Iron Lemon',
        breed: 'Lemon',
        opponent: 'Black Butcher',
        location: 'Pasay Cockpit',
        type: 'Derby',
        outcome: 'Win',
        status: 'Verified',
        date: '2026-10-01',
        video_count: 1,
        photo_count: 1,
        videos: ['https://example.com/videos/iron-lemon.mp4'],
        photos: ['https://example.com/photos/iron-lemon.jpg'],
      },
    ];

    render(<MatchLogsTable matches={matchesWithMedia} />);

    // Play media button exists with combined count "2"
    const playBtn = screen.getByRole('button', { name: 'Play media' });
    expect(playBtn).toBeInTheDocument();
    expect(playBtn).toHaveTextContent('2');

    // Exactly one Edit match record action exists
    const editButtons = screen.getAllByRole('button', { name: 'Edit match record' });
    expect(editButtons).toHaveLength(1);

    // Share action exists
    expect(screen.getByRole('button', { name: 'Share match' })).toBeInTheDocument();

    // "No media" should NOT appear for this row
    expect(screen.queryByText('No media')).not.toBeInTheDocument();

    // Clicking Play media button opens the media viewer
    fireEvent.click(playBtn);
    expect(mockOpenMatchMediaViewer).toHaveBeenCalledWith(
      expect.objectContaining({
        tab: 'videos',
        videos: ['https://example.com/videos/iron-lemon.mp4'],
      }),
    );
  });

  it('renders muted "No media" when a match truly has no videos or photos', () => {
    const emptyMatch: MatchRecord[] = [
      {
        id: 202,
        entry_name: 'Clean Slate',
        breed: 'Kelso',
        opponent: 'Unknown',
        location: 'Farm Pit',
        type: 'Hack',
        outcome: 'Win',
        status: 'Verified',
        date: '2026-10-05',
        video_count: 0,
        photo_count: 0,
        videos: [],
        photos: [],
      },
    ];

    render(<MatchLogsTable matches={emptyMatch} />);

    expect(screen.getByText('No media')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Play media' })).not.toBeInTheDocument();
    // Exactly one Edit match record action still exists
    expect(screen.getAllByRole('button', { name: 'Edit match record' })).toHaveLength(1);
  });

  it('confirms videos being converted show "Processing…" instead of "No media"', () => {
    const processingMatch: MatchRecord[] = [
      {
        id: 203,
        entry_name: 'Storm Runner',
        breed: 'Hatch',
        opponent: 'Red Bull',
        location: 'Derby Dome',
        type: 'Derby',
        outcome: 'Win',
        status: 'Verified',
        date: '2026-10-07',
        video_url: 'processing',
        video_count: 0,
        photo_count: 0,
      },
    ];

    render(<MatchLogsTable matches={processingMatch} />);

    expect(screen.getByText(/Processing…/i)).toBeInTheDocument();
    expect(screen.queryByText('No media')).not.toBeInTheDocument();
  });

  it('clicking the chicken identity opens the chicken info card instead of the match editor', () => {
    const fowl = {
      id: 501,
      name: 'Lemon',
      breed: 'Lemon',
      gender: 'Rooster',
      birthdate: '2024-02-21',
    } as unknown as FowlRecord;
    mockFowlContext.fowls = [fowl];
    const match = {
      id: 1001,
      fowl_id: 501,
      entry_name: 'Lemon',
      breed: 'Lemon',
      opponent: 'Kelso',
      location: 'Dingle Breeding Arena',
      type: 'Derby',
      outcome: 'Win',
      status: 'Verified',
      date: '2026-10-20',
    } as MatchRecord;

    render(<MatchLogsTable matches={[match]} />);
    fireEvent.click(screen.getByRole('button', { name: /View info for Lemon/i }));

    expect(mockOpenFowlDetails).toHaveBeenCalledWith(fowl);
    expect(mockPush).not.toHaveBeenCalled();

    mockFowlContext.fowls = [];
  });
});
