'use client';
import React from 'react';
import { Play, Image, Pencil, Share2 } from 'lucide-react';
import { useUI } from '@/lib/contexts/ui-context';
import type { MatchRecord } from '@/lib/types';

type Props = {
  match: MatchRecord;
  videos: string[];
  photos: string[];
  /** Poster frames index-aligned with `videos`. */
  posters?: (string | null)[];
  /** Show the Edit + Share action buttons (hidden inside read-only surfaces like the share page). */
  showActions?: boolean;
  onEdit?: () => void;
  onShare?: () => void;
};

/**
 * Shared Videos/Photos buttons (with count badges) + Edit/Share actions for a
 * match row. Opens the tabbed MatchMediaViewer with signed URLs.
 */
export default function MatchMediaButtons({
  match,
  videos,
  photos,
  posters,
  showActions = true,
  onEdit,
  onShare,
}: Props) {
  const ui = useUI();
  const hasVideos = videos.length > 0;
  const hasPhotos = photos.length > 0;

  const openVideos = () =>
    ui.openMatchMediaViewer({ match, videos, photos, videoPosters: posters, tab: 'videos' });
  const openPhotos = () =>
    ui.openMatchMediaViewer({ match, videos, photos, videoPosters: posters, tab: 'photos' });

  return (
    <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
      {hasVideos ? (
        <button
          type="button"
          title={videos.length > 1 ? `Watch ${videos.length} videos` : 'Watch match video'}
          aria-label={videos.length > 1 ? `Watch ${videos.length} videos for ${match.entry_name}` : `Watch match video for ${match.entry_name}`}
          onClick={openVideos}
          className="relative inline-flex items-center justify-center w-8 h-8 rounded-sm bg-emerald-500/10 border border-emerald-500/20 text-success hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Play size={13} fill="currentColor" strokeWidth={0} />
          <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 text-white text-[9px] font-black px-1 leading-none">
            {videos.length}
          </span>
        </button>
      ) : null}

      {hasPhotos ? (
        <button
          type="button"
          title={photos.length > 1 ? `View ${photos.length} photos` : 'View match photo'}
          aria-label={photos.length > 1 ? `View ${photos.length} photos for ${match.entry_name}` : `View match photo for ${match.entry_name}`}
          onClick={openPhotos}
          className="relative inline-flex items-center justify-center w-8 h-8 rounded-sm bg-teal-500/10 border border-teal-500/20 text-teal hover:bg-teal-500/20 hover:border-teal-500/40 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Image size={13} />
          <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-teal-600 text-white text-[9px] font-black px-1 leading-none">
            {photos.length}
          </span>
        </button>
      ) : null}

      {!hasVideos && !hasPhotos ? (
        <span className="text-xs font-bold text-muted-foreground/70" title="No videos or photos yet">
          No media
        </span>
      ) : null}

      {showActions ? (
        <>
          <span aria-hidden="true" className="mx-0.5 h-5 w-px bg-border" />
          <button
            type="button"
            title="Edit match"
            aria-label={`Edit match ${match.entry_name} vs ${match.opponent || 'opponent'}`}
            onClick={() => (onEdit ? onEdit() : ui.setEditingMatch(match))}
            className="inline-flex items-center justify-center w-8 h-8 rounded-sm bg-muted border border-border text-muted-foreground hover:text-success hover:border-success/40 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Pencil size={13} />
          </button>
          <button
            type="button"
            title="Share match record"
            aria-label={`Share match ${match.entry_name} vs ${match.opponent || 'opponent'}`}
            onClick={() =>
              onShare
                ? onShare()
                : ui.setShareTarget({
                    type: 'match',
                    id: match.id,
                    label: `${match.entry_name} vs ${match.opponent || 'Opponent'} — ${match.date || ''}`,
                  })
            }
            className="inline-flex items-center justify-center w-8 h-8 rounded-sm bg-muted border border-border text-muted-foreground hover:text-success hover:border-success/40 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Share2 size={13} />
          </button>
        </>
      ) : null}
    </div>
  );
}
