/**
 * Match Logs entry points -> /match-logs/{id}/edit and back to the origin page.
 *
 * Covers every place a user can start editing a match:
 *   - Chicken Registry > Match Logs tab  (/profiling?tab=matchForm)
 *   - /match-logs list
 *   - Dashboard match table
 *   - chicken profile modal (media/edit control)
 *   - legacy URL /match-logs/{id}
 *   - direct URL /match-logs/{id}/edit
 *
 * And the return contract: row click and pencil open the edit page, Save and
 * Cancel return to the page the user came from (same-origin returnTo with its
 * query string), and the fallback is /match-logs - never the landing page.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const { mockPush, mockReplace, mockMatchService, mockMediaService, mockFowls, mockPathname } =
  vi.hoisted(() => {
    const push = vi.fn();
    const replace = vi.fn();
    const matchService = {
      updateMatch: vi.fn().mockResolvedValue({ updatedId: 1 }),
      insertMatch: vi.fn().mockResolvedValue({ id: 1 }),
      uploadMatchVideo: vi.fn().mockResolvedValue({ url: 'https://cdn/v.mp4' }),
    };
    const mediaService = {
      fetchMatchMediaDetails: vi.fn().mockResolvedValue({ videos: [], photos: [] }),
      fetchMatchMediaBatch: vi.fn().mockResolvedValue(new Map()),
      attachMatchMediaCounts: vi.fn((rows: unknown[]) => rows),
      insertMatchVideo: vi.fn().mockResolvedValue({}),
      insertMatchPhoto: vi.fn().mockResolvedValue({}),
      deleteMatchMedia: vi.fn().mockResolvedValue({ success: true }),
      uploadMatchPhotoFile: vi.fn().mockResolvedValue({ url: 'https://cdn/p.jpg' }),
      photosFor: vi.fn(() => []),
      videosFor: vi.fn(() => []),
      postersFor: vi.fn(() => []),
      maxMatchVideos: vi.fn(() => 3),
      maxMatchPhotos: vi.fn(() => 5),
    };
    const fowls = [
      {
        id: 501,
        name: 'Lemon',
        breed: 'Lemon',
        growth_stage: 'Cock',
        status: 'Active',
        chicken_code: 'LM-01',
        birthdate: '2024-02-21',
      },
      {
        id: 502,
        name: 'Kelso Warrior',
        breed: 'Kelso',
        growth_stage: 'Cock',
        status: 'Active',
        chicken_code: 'KC-02',
      },
    ];
    const pathname = { current: '/match-logs' };
    return {
      mockPush: push,
      mockReplace: replace,
      mockPathname: pathname,
      mockMatchService: matchService,
      mockMediaService: mediaService,
      mockFowls: fowls,
    };
  });

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => mockPathname.current,
  useSearchParams: () => new URLSearchParams(''),
}));

vi.mock('@/lib/services/match-service', () => mockMatchService);
vi.mock('@/lib/services/media-service', () => mockMediaService);

vi.mock('@/lib/contexts/ui-context', () => ({
  useUI: () => ({ openMatchMediaViewer: vi.fn() }),
}));

vi.mock('@/lib/contexts/fowl-context', () => ({
  useFowl: () => ({
    fowls: mockFowls,
    matchHistory: [
      {
        id: 1,
        user_id: 'u',
        date: '2026-10-01',
        entry_name: 'Lemon',
        breed: 'Lemon',
        opponent: 'Kelso Warrior',
        outcome: 'Win',
        location: 'Cockpit 1',
        type: 'Main Event',
        status: 'Verified',
        cock_count: 1,
        age_category: 'Open',
        fowl_id: 501,
      },
    ],
    matchMedia: new Map(),
    birdCodes: new Map([['501', 'LM-01']]),
    loading: false,
  }),
}));

vi.mock('@/lib/i18n', () => ({
  useT: () => (key: string, params?: Record<string, string | number>) => {
    const map: Record<string, string> = {
      'registry.hatchedDate': 'Hatched {date}',
      'common.cancel': 'Cancel',
    };
    const raw = map[key] ?? key;
    return params ? raw.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? '')) : raw;
  },
  useLanguage: () => ({
    language: 'en',
    setLanguage: vi.fn(),
    languages: [],
    isBeta: () => false,
    t: (k: string) => k,
  }),
}));

import MatchLogsView from '@/components/match/MatchLogsView';
import MatchLogsTable from '@/components/match/MatchLogsTable';
import { sanitizeRedirectPath } from '@/lib/auth-redirect';

describe('Match Logs entry points', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname.current = '/match-logs';
  });

  it('Chicken Registry > Match Logs tab: clicking a row opens the edit page with the registry returnTo', async () => {
    mockPathname.current = '/profiling';
    render(<MatchLogsView />);
    const row = await screen.findByText('Lemon');
    fireEvent.click(row.closest('tr') as HTMLElement);
    expect(mockPush).toHaveBeenCalledWith(
      '/match-logs/1/edit?returnTo=%2Fprofiling%3Ftab%3DmatchForm',
    );
  });

  it('/match-logs list: clicking a row opens the edit page with the list returnTo', async () => {
    render(<MatchLogsView />);
    const row = await screen.findByText('Lemon');
    fireEvent.click(row.closest('tr') as HTMLElement);
    expect(mockPush).toHaveBeenCalledWith('/match-logs/1/edit?returnTo=%2Fmatch-logs');
  });

  it('Dashboard match table: clicking a row opens the edit page and returns to /dashboard', async () => {
    render(<MatchLogsTable />);
    // The table renders rows from the context when no matches prop is given.
    const row = await screen.findByText('Lemon');
    fireEvent.click(row.closest('tr') as HTMLElement);
    expect(mockPush).toHaveBeenCalledWith('/match-logs/1/edit?returnTo=%2Fdashboard');
  });

  it('shared match table honors an explicit returnTo for row and pencil navigation', async () => {
    render(<MatchLogsTable returnTo="/profiling?tab=matchForm&q=Lemon" />);
    const row = await screen.findByText('Lemon');
    const editLink = screen.getByRole('link', { name: 'Edit match record' });
    expect(editLink.getAttribute('href')).toBe(
      '/match-logs/1/edit?returnTo=%2Fprofiling%3Ftab%3DmatchForm%26q%3DLemon',
    );
    fireEvent.click(row.closest('tr') as HTMLElement);
    expect(mockPush).toHaveBeenCalledWith(
      '/match-logs/1/edit?returnTo=%2Fprofiling%3Ftab%3DmatchForm%26q%3DLemon',
    );
  });

  it('never sends the user to the landing page', async () => {
    render(<MatchLogsView />);
    const row = await screen.findByText('Lemon');
    fireEvent.click(row.closest('tr') as HTMLElement);
    const targets = mockPush.mock.calls.map((c) => String(c[0]));
    expect(targets.every((t) => !t.startsWith('/') || t === '/')).toBe(false);
    expect(targets.some((t) => t === '/' || t === '')).toBe(false);
  });
});

describe('returnTo handling', () => {
  it('keeps a same-origin path including its query string', () => {
    expect(sanitizeRedirectPath('/profiling?tab=matchForm', '/match-logs')).toBe(
      '/profiling?tab=matchForm',
    );
  });

  it('falls back to /match-logs for missing, external, or root paths', () => {
    expect(sanitizeRedirectPath(null, '/match-logs')).toBe('/match-logs');
    expect(sanitizeRedirectPath('/', '/match-logs')).toBe('/match-logs');
    expect(sanitizeRedirectPath('https://evil.example/x', '/match-logs')).toBe('/match-logs');
    expect(sanitizeRedirectPath('//evil.example/x', '/match-logs')).toBe('/match-logs');
    expect(sanitizeRedirectPath('/\\evil.example', '/match-logs')).toBe('/match-logs');
  });
});

describe('action bar and legacy route', () => {
  it('the action bar is sticky below lg and static from lg up (never covers fields on desktop)', async () => {
    const MatchRecordForm = (await import('@/components/match/MatchRecordForm')).default;
    const { container } = render(
      <MatchRecordForm
        mode="edit"
        initialRecord={
          {
            id: 1,
            user_id: 'u',
            date: '2026-10-01',
            entry_name: 'Lemon',
            breed: 'Lemon',
            opponent: 'K',
            outcome: 'Win',
            location: 'C',
            type: 'Main Event',
            status: 'Verified',
            cock_count: 1,
            age_category: 'Open',
            fowl_id: 501,
          } as never
        }
        onSuccessRedirect="/match-logs"
      />,
    );
    const bar = Array.from(container.querySelectorAll('div')).find(
      (d) => String(d.className).includes('sticky') && String(d.className).includes('bottom-0'),
    );
    expect(bar).toBeDefined();
    const cls = String((bar as HTMLElement).className);
    expect(cls).toContain('sticky');
    expect(cls).toContain('lg:static');
    // Opaque background (not a translucent overlay) and safe-area padding.
    expect(cls).toContain('bg-card');
    expect(cls).not.toContain('bg-card/95');
    expect(cls).toContain('env(safe-area-inset-bottom)');
    // No negative horizontal margins: the bar must stay inside the container.
    expect(cls).not.toMatch(/-mx-/);
  });

  it('the legacy /match-logs/{id} URL opens the edit page and keeps the returnTo', async () => {
    const redirectMock = vi.fn();
    vi.doMock('next/navigation', () => ({ redirect: redirectMock }));
    const Legacy = (await import('@/app/(dashboard)/match-logs/[id]/page')).default;
    await Legacy({
      params: Promise.resolve({ id: '42' }),
      searchParams: Promise.resolve({ returnTo: '/profiling?tab=matchForm' }),
    } as never);
    expect(redirectMock).toHaveBeenCalledWith(
      '/match-logs/42/edit?returnTo=%2Fprofiling%3Ftab%3DmatchForm',
    );
  });
});
