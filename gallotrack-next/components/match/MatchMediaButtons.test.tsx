import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';

vi.mock('@/lib/media-privacy', () => ({
  signMediaUrls: (urls: (string | null | undefined)[]) => Promise.resolve(urls),
  signMediaUrl: (url: string) => Promise.resolve(url),
}));

vi.mock('@/lib/contexts/fowl-context', () => ({
  useFowl: () => ({ fowls: [], birdCodes: new Map() }),
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
    </UIProvider>
  );
}

describe('MatchMediaButtons + MatchMediaViewer', () => {
  let playSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    playSpy = vi
      .spyOn(HTMLMediaElement.prototype, 'play')
      .mockResolvedValue(undefined as unknown as void);
  });

  afterEach(() => {
    playSpy.mockRestore();
  });

  it('shows Watch and Photos buttons with counts for a match with one video and one photo', () => {
    renderRow();

    const watch = screen.getByTitle('Watch match video');
    expect(within(watch).getByText('1')).toBeTruthy();
    expect(screen.getByLabelText('Watch match video for Hatch Mountain')).toBeTruthy();

    const photos = screen.getByTitle('View match photo');
    expect(within(photos).getByText('1')).toBeTruthy();
    expect(screen.getByLabelText('View match photo for Hatch Mountain')).toBeTruthy();

    expect(screen.queryByText('No media')).toBeNull();
    expect(screen.getByTitle('Edit match')).toBeTruthy();
    expect(screen.getByTitle('Share link')).toBeTruthy();
  });

  it('opens the viewer and plays the video when Watch is clicked', async () => {
    renderRow();

    fireEvent.click(screen.getByTitle('Watch match video'));

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
