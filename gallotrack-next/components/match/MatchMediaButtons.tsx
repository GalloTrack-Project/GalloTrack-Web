'use client';
import React from 'react';
import { Play, Image as ImageIcon, Pencil, Share2 } from 'lucide-react';
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
  const effectiveVideos =
    videos && videos.length > 0
      ? videos
      : match.videos && match.videos.length > 0
      ? match.videos
      : match.video_url && match.video_url.trim() !== ''
      ? [match.video_url.trim()]
      : [];

  const effectivePhotos =
    photos && photos.length > 0
      ? photos
      : match.photos && match.photos.length > 0
      ? match.photos
      : [];

  const effectivePosters =
    posters && posters.length > 0
      ? posters
      : match.video_posters && match.video_posters.length > 0
      ? match.video_posters
      : [];

  const isProcessing = Boolean(
    (match as any).video_status === 'processing' ||
    (match as any).status === 'processing' ||
    (match as any).video_processing ||
    (typeof match.video_url === 'string' && /processing|converting|transcoding/i.test(match.video_url)) ||
    effectiveVideos.some((v) => typeof v === 'string' && /processing|converting|transcoding/i.test(v))
  );

  const videoCount = match.video_count !== undefined ? match.video_count : effectiveVideos.length;
  const photoCount = match.photo_count !== undefined ? match.photo_count : effectivePhotos.length;

  const hasVideos = (videoCount > 0 || effectiveVideos.length > 0) && !isProcessing;
  const hasPhotos = photoCount > 0 || effectivePhotos.length > 0;

  const openVideos = () =>
    ui.openMatchMediaViewer({
      match,
      videos: effectiveVideos,
      photos: effectivePhotos,
      videoPosters: effectivePosters,
      tab: 'videos',
    });
  const openPhotos = () =>
    ui.openMatchMediaViewer({
      match,
      videos: effectiveVideos,
      photos: effectivePhotos,
      videoPosters: effectivePosters,
      tab: 'photos',
    });

  return (
    <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
      {isProcessing ? (
        <span
          title="Video is being processed/converted"
          aria-label={`Video processing for ${match.entry_name}`}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-amber-500/10 border border-amber-500/20 text-warning text-xs font-bold whitespace-nowrap cursor-wait"
        >
          <span className="inline-block h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          Processing…
        </span>
      ) : null}

      {hasVideos ? (
        <button
          type="button"
          title={videoCount > 1 ? `Watch ${videoCount} videos` : 'Watch match video'}
          aria-label={videoCount > 1 ? `Watch ${videoCount} videos for ${match.entry_name}` : `Watch match video for ${match.entry_name}`}
          onClick={openVideos}
          className="relative inline-flex items-center justify-center w-8 h-8 rounded-sm bg-emerald-500/10 border border-emerald-500/20 text-success hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Play size={13} fill="currentColor" strokeWidth={0} />
          <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 text-white text-xs font-black px-1 leading-none">
            {videoCount}
          </span>
        </button>
      ) : null}

      {hasPhotos ? (
        <button
          type="button"
          title={photoCount > 1 ? `View ${photoCount} photos` : 'View match photo'}
          aria-label={photoCount > 1 ? `View ${photoCount} photos for ${match.entry_name}` : `View match photo for ${match.entry_name}`}
          onClick={openPhotos}
          className="relative inline-flex items-center justify-center w-8 h-8 rounded-sm bg-teal-500/10 border border-teal-500/20 text-teal hover:bg-teal-500/20 hover:border-teal-500/40 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ImageIcon size={13} aria-hidden="true" />
          <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-teal-600 text-white text-xs font-black px-1 leading-none">
            {photoCount}
          </span>
        </button>
      ) : null}

      {!hasVideos && !hasPhotos && !isProcessing ? (
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
