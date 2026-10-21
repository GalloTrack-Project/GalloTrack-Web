import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';

vi.mock('@/lib/media-privacy', () => ({
  signMediaUrls: (urls: (string | null | undefined)[]) => Promise.resolve(urls),
  signMediaUrl: (url: string) => Promise.resolve(url),
}));

vi.mock('@/lib/contexts/fowl-context', () => ({
  useFowl: () => ({ fowls: [], birdCodes: new Map() }),
}));

const nav = vi.hoisted(() => ({ pathname: '/match-logs', search: '' }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(nav.search),
}));

import { UIProvider } from '@/lib/contexts/ui-context';
import MatchMediaButtons from './MatchMediaButtons';
import MatchMediaViewer from './MatchMediaViewer';
import type { MatchRecord } from '@/lib/types';

const match = {
  id: 1,
  date: '2025-02-09',
  entry_name: 'Hatch Mountain',
  breed: 'Sweater',
  opponent: 'Kelso',
  location: 'Main Arena',
  type: 'Derby',
  outcome: 'Win',
  status: 'Completed',
} as MatchRecord;

const VIDEO_URL = 'https://cdn.test/match-videos/hatch-mountain.mp4';
const PHOTO_URL = 'https://cdn.test/match-photos/hatch-mountain.jpg';

function renderRow() {
  return render(
    <UIProvider theme="dark" setTheme={() => {}}>
      <MatchMediaButtons match={match} videos={[VIDEO_URL]} photos={[PHOTO_URL]} />
      <MatchMediaViewer />
    </UIProvider>,
  );
}

describe('MatchMediaButtons + MatchMediaViewer', () => {
  let playSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    nav.pathname = '/match-logs';
    nav.search = '';
    playSpy = vi
      .spyOn(HTMLMediaElement.prototype, 'play')
      .mockResolvedValue(undefined as unknown as void);
  });

  afterEach(() => {
    playSpy.mockRestore();
  });

  it('shows Play media button with count, Edit match record, and Share match', () => {
    renderRow();

    const playBtn = screen.getByTitle('Play media');
    expect(within(playBtn).getByText('2')).toBeTruthy();
    expect(screen.getByLabelText('Play media')).toBeTruthy();

    expect(screen.queryByText('No media')).toBeNull();
    const editLink = screen.getByTitle('Edit match record');
    expect(editLink).toBeTruthy();
    expect(screen.getByLabelText('Edit match record')).toBeTruthy();
    expect(editLink.getAttribute('href')).toContain('/match-logs/1/edit');

    expect(screen.getByTitle('Share match')).toBeTruthy();
    expect(screen.getByLabelText('Share match')).toBeTruthy();
  });

  it('preserves the current path and query when no explicit returnTo is given (modal entry point)', () => {
    nav.pathname = '/profiling';
    nav.search = 'tab=males&q=Lemon';
    render(
      <UIProvider theme="dark" setTheme={() => {}}>
        <MatchMediaButtons match={match} />
      </UIProvider>,
    );

    const editLink = screen.getByTitle('Edit match record');
    expect(editLink.getAttribute('href')).toBe(
      '/match-logs/1/edit?returnTo=%2Fprofiling%3Ftab%3Dmales%26q%3DLemon',
    );
  });

  it('opens the viewer and plays the video when Play media is clicked', async () => {
    renderRow();

    fireEvent.click(screen.getByTitle('Play media'));

    const dialog = await screen.findByRole('dialog');
    expect(dialog.getAttribute('aria-label')).toBe('Match media');

    // Tabs with counts
    expect(screen.getByRole('tab', { name: /videos/i })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /photos/i })).toBeTruthy();

    // Video element with the (signed) source
    await waitFor(() => {
      const video = dialog.querySelector('video') as HTMLVideoElement | null;
      expect(video).toBeTruthy();
      expect(video!.getAttribute('src')).toContain('hatch-mountain.mp4');
    });

    // Overlay play button starts playback
    const playButton = await screen.findByLabelText(/^Play video/);
    fireEvent.click(playButton);
    expect(playSpy).toHaveBeenCalled();
  });
});
