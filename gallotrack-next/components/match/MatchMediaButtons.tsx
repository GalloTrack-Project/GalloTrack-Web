'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Play, Pencil, Share2 } from 'lucide-react';
import { useUI } from '@/lib/contexts/ui-context';
import type { MatchRecord } from '@/lib/types';

type Props = {
  match: MatchRecord;
  videos?: string[];
  photos?: string[];
  /** Poster frames index-aligned with `videos`. */
  posters?: (string | null)[];
  /** Show the Edit + Share action buttons (hidden inside read-only surfaces like the share page). */
  showActions?: boolean;
  onEdit?: () => void;
  onShare?: () => void;
  returnTo?: string;
};

/**
 * Shared Actions for a match row:
 * - Play media (only when media exists, with count badge)
 * - Edit match record (navigates to /match-logs/[id]/edit with returnTo)
 * - Share match (opens share modal)
 */
export default function MatchMediaButtons({
  match,
  videos,
  photos,
  posters,
  showActions = true,
  onEdit,
  onShare,
  returnTo,
}: Props) {
  const ui = useUI();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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

  type ProcessingFlags = { video_status?: string; video_processing?: boolean };
  const flags = match as MatchRecord & Partial<ProcessingFlags>;
  const isProcessing = Boolean(
    flags.video_status === 'processing' ||
    flags.status === 'processing' ||
    flags.video_processing ||
    (typeof match.video_url === 'string' &&
      /processing|converting|transcoding/i.test(match.video_url)) ||
    effectiveVideos.some(
      (v) => typeof v === 'string' && /processing|converting|transcoding/i.test(v),
    ),
  );

  const videoCount = match.video_count !== undefined ? match.video_count : effectiveVideos.length;
  const photoCount = match.photo_count !== undefined ? match.photo_count : effectivePhotos.length;

  const hasVideos = (videoCount > 0 || effectiveVideos.length > 0) && !isProcessing;
  const hasPhotos = photoCount > 0 || effectivePhotos.length > 0;
  const hasMedia = (hasVideos || hasPhotos) && !isProcessing;
  const totalMediaCount =
    (videoCount > 0 ? videoCount : 0) + (photoCount > 0 ? photoCount : 0) ||
    effectiveVideos.length + effectivePhotos.length;

  const openMedia = () =>
    ui.openMatchMediaViewer({
      match,
      videos: effectiveVideos,
      photos: effectivePhotos,
      videoPosters: effectivePosters,
      tab: hasVideos ? 'videos' : 'photos',
    });

  const search = searchParams?.toString() ?? '';
  const currentPath =
    pathname && pathname.startsWith('/') ? `${pathname}${search ? `?${search}` : ''}` : '';
  const safeReturn = returnTo || currentPath || '/match-logs';
  const editHref = `/match-logs/${match.id}/edit${safeReturn ? `?returnTo=${encodeURIComponent(safeReturn)}` : ''}`;

  const closeModals = () => {
    if (ui.selectedFowlForDetails) ui.setSelectedFowlForDetails(null);
    if (ui.fightHistoryFowl) ui.setFightHistoryFowl(null);
  };

  return (
    <div className="flex items-center justify-center gap-1 whitespace-nowrap">
      {isProcessing ? (
        <span
          title="Video is being processed/converted"
          aria-label={`Video processing for ${match.entry_name}`}
          className="text-warning inline-flex cursor-wait items-center gap-1.5 rounded-sm border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-bold whitespace-nowrap"
        >
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-500" />
          Processing…
        </span>
      ) : null}

      {hasMedia ? (
        <button
          type="button"
          title="Play media"
          aria-label="Play media"
          onClick={(e) => {
            e.stopPropagation();
            openMedia();
          }}
          className="text-success focus-visible:ring-ring relative inline-flex h-8 min-h-[44px] w-8 min-w-[44px] cursor-pointer items-center justify-center rounded-sm border border-emerald-500/20 bg-emerald-500/10 transition-all hover:border-emerald-500/40 hover:bg-emerald-500/20 focus-visible:ring-2 focus-visible:outline-none sm:min-h-[32px] sm:min-w-[32px]"
        >
          <Play size={13} fill="currentColor" strokeWidth={0} />
          <span className="pointer-events-none absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] leading-none font-black text-white">
            {totalMediaCount}
          </span>
        </button>
      ) : null}

      {!hasMedia && !isProcessing ? (
        <span
          className="text-muted-foreground/70 hidden text-xs font-bold xl:inline"
          title="No videos or photos yet"
        >
          No media
        </span>
      ) : null}

      {showActions ? (
        <>
          <span aria-hidden="true" className="bg-border mx-0.5 hidden h-5 w-px xl:inline-block" />
          {onEdit ? (
            <button
              type="button"
              title="Edit match record"
              aria-label="Edit match record"
              onClick={(e) => {
                e.stopPropagation();
                closeModals();
                onEdit();
              }}
              className="bg-muted border-border text-muted-foreground hover:text-success hover:border-success/40 focus-visible:ring-ring inline-flex h-8 min-h-[44px] w-8 min-w-[44px] cursor-pointer items-center justify-center rounded-sm border transition-all focus-visible:ring-2 focus-visible:outline-none sm:min-h-[32px] sm:min-w-[32px]"
            >
              <Pencil size={13} />
            </button>
          ) : (
            <Link
              href={editHref}
              title="Edit match record"
              aria-label="Edit match record"
              onClick={(e) => {
                e.stopPropagation();
                closeModals();
              }}
              className="bg-muted border-border text-muted-foreground hover:text-success hover:border-success/40 focus-visible:ring-ring inline-flex h-8 min-h-[44px] w-8 min-w-[44px] cursor-pointer items-center justify-center rounded-sm border transition-all focus-visible:ring-2 focus-visible:outline-none sm:min-h-[32px] sm:min-w-[32px]"
            >
              <Pencil size={13} />
            </Link>
          )}

          <button
            type="button"
            title="Share match"
            aria-label="Share match"
            onClick={(e) => {
              e.stopPropagation();
              if (onShare) {
                onShare();
              } else {
                ui.setShareTarget({
                  type: 'match',
                  id: match.id,
                  label: `${match.entry_name} vs ${match.opponent || 'Opponent'} — ${match.date || ''}`,
                });
              }
            }}
            className="bg-muted border-border text-muted-foreground hover:text-success hover:border-success/40 focus-visible:ring-ring inline-flex h-8 min-h-[44px] w-8 min-w-[44px] cursor-pointer items-center justify-center rounded-sm border transition-all focus-visible:ring-2 focus-visible:outline-none sm:min-h-[32px] sm:min-w-[32px]"
          >
            <Share2 size={13} />
          </button>
        </>
      ) : null}
    </div>
  );
}
