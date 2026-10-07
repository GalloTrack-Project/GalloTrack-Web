'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  X,
  Play,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  AlertTriangle,
  Images,
  Film,
} from 'lucide-react';
import { useUI, MatchMediaViewerConfig } from '@/lib/contexts/ui-context';
import { useFowl } from '@/lib/contexts/fowl-context';
import { formatBirdCodeForDisplay } from '@/lib/bird-code';
import { signMediaUrls } from '@/lib/media-privacy';
import {
  downloadMediaUrl,
  playableKind,
  thumbUrl,
  videoFileNameFromUrl,
} from '@/lib/media-format';

/**
 * Shared match/fowl media viewer: header with match context, Videos/Photos
 * tabs with count badges, a native video player (with AVI/MKV + load-failure
 * download fallbacks) and a swipeable photo gallery with thumbnails.
 */
export default function MatchMediaViewer() {
  const ui = useUI();
  const cfg = ui.matchMediaViewer;
  const closeMatchMediaViewer = ui.closeMatchMediaViewer;

  useEffect(() => {
    if (!cfg) return;
    const opener = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMatchMediaViewer();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      if (opener && typeof opener.focus === 'function') {
        try { opener.focus(); } catch { /* element may be gone */ }
      }
    };
  }, [cfg, closeMatchMediaViewer]);

  if (!cfg) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-3 sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) ui.closeMatchMediaViewer();
      }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Match media"
        className="relative flex w-full max-w-3xl max-h-[92vh] flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-2xl"
      >
        <ViewerBody key={cfg.openedAt ?? 0} cfg={cfg} onClose={ui.closeMatchMediaViewer} />
      </div>
    </div>
  );
}

function ViewerBody({ cfg, onClose }: { cfg: MatchMediaViewerConfig; onClose: () => void }) {
  const { fowls, birdCodes } = useFowl();
  const [tab, setTab] = useState<'videos' | 'photos'>(cfg.videos.length > 0 || cfg.photos.length === 0 ? cfg.tab : 'photos');
  const [videos, setVideos] = useState<(string | null)[]>(cfg.videos);
  const [photos, setPhotos] = useState<string[]>(cfg.photos);
  const [posters, setPosters] = useState<(string | null)[]>(cfg.videoPosters || []);
  const [resolving, setResolving] = useState(true);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const codeByName = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const f of fowls) {
      const code = birdCodes.get(String(f.id)) || f.bird_code;
      if (code) m.set((f.name || '').trim().toLowerCase(), code);
    }
    return m;
  }, [fowls, birdCodes]);

  // Resolve private-bucket URLs to signed, playable ones — async only, so no
  // render-phase state updates. Poster frames live in match-photos (private).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [v, p, po] = await Promise.all([
        signMediaUrls(cfg.videos),
        signMediaUrls(cfg.photos),
        signMediaUrls(cfg.videoPosters || []),
      ]);
      if (cancelled) return;
      setVideos(v);
      setPhotos(p.filter((x): x is string => Boolean(x)));
      setPosters(po);
      setResolving(false);
    })();
    return () => { cancelled = true; };
  }, [cfg]);

  useEffect(() => {
    const id = requestAnimationFrame(() => closeRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, []);

  const match = cfg.match;
  const rawName = (match?.entry_name || cfg.title || '').trim();
  const code = codeByName.get(rawName.toLowerCase());
  const outcome = (match?.outcome || '').toLowerCase();

  return (
    <>
      <header className="flex items-start gap-3 border-b border-border px-4 py-3 sm:px-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {code && (
              <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 font-mono text-xs font-black uppercase text-success border border-emerald-500/20">
                [{formatBirdCodeForDisplay(code)}]
              </span>
            )}
            <h2 className="truncate text-base font-black text-card-foreground">
              {rawName || 'Match media'}
            </h2>
            {match && match.outcome && (
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-black uppercase tracking-wider ${
                  outcome === 'win'
                    ? 'border-emerald-500/20 bg-emerald-500/10 text-success'
                    : outcome === 'loss'
                      ? 'border-rose-500/20 bg-rose-500/10 text-danger'
                      : 'border-border bg-muted text-muted-foreground'
                }`}
              >
                {match.outcome}
              </span>
            )}
          </div>
          {match && (
            <p className="mt-0.5 truncate text-xs font-semibold text-muted-foreground">
              {[
                match.opponent ? `vs ${match.opponent}` : null,
                match.location || null,
                match.date || null,
              ].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close media viewer"
          title="Close (Esc)"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-border bg-muted text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X size={16} />
        </button>
      </header>

      <div role="tablist" aria-label="Media type" className="flex gap-1 border-b border-border px-3 pt-2 sm:px-4">
        <MediaTab
          active={tab === 'videos'}
          disabled={cfg.videos.length === 0}
          label="Videos"
          count={videos.length || cfg.videos.length}
          icon={<Film size={14} />}
          onClick={() => setTab('videos')}
        />
        <MediaTab
          active={tab === 'photos'}
          disabled={cfg.photos.length === 0}
          label="Photos"
          count={photos.length || cfg.photos.length}
          icon={<Images size={14} />}
          onClick={() => setTab('photos')}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {resolving ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 p-8 text-muted-foreground">
            <Loader2 size={22} className="animate-spin" />
            <span className="text-sm font-semibold">Loading media…</span>
          </div>
        ) : tab === 'videos' ? (
          <VideosPane urls={videos} posters={posters} title={rawName} />
        ) : (
          <PhotosPane urls={photos} title={rawName} />
        )}
      </div>
    </>
  );
}

function MediaTab({
  active,
  disabled,
  label,
  count,
  icon,
  onClick,
}: {
  active: boolean;
  disabled: boolean;
  label: string;
  count: number;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      disabled={disabled}
      onClick={onClick}
      className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        active
          ? 'border-success text-success'
          : 'border-transparent text-muted-foreground hover:text-foreground'
      } ${disabled ? 'cursor-not-allowed opacity-40 hover:text-muted-foreground' : 'cursor-pointer'}`}
    >
      {icon}
      {label}
      <span
        className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-xs font-black ${
          active ? 'bg-emerald-500/15 text-success' : 'bg-muted text-muted-foreground'
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function VideosPane({
  urls,
  posters,
  title,
}: {
  urls: (string | null)[];
  posters: (string | null)[];
  title: string;
}) {
  const [index, setIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [failed, setFailed] = useState(false);

  if (urls.length === 0 || urls.every((u) => !u)) {
    return (
      <EmptyPane icon={<Film size={26} />} text="No videos for this match yet." />
    );
  }

  const current = urls[Math.min(index, urls.length - 1)] as string;
  const poster = posters[Math.min(index, posters.length - 1)] || undefined;
  const kind = playableKind(current);

  if (kind === 'unsupported') {
    return (
      <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 p-8 text-center">
        <AlertTriangle size={28} className="text-warning" />
        <div>
          <p className="text-sm font-bold text-card-foreground">
            This file ({current.toLowerCase().endsWith('.mkv') ? 'MKV' : 'AVI'}) can&apos;t be played in a browser.
          </p>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">
            No format converter is available in this deployment — download the file to watch it in a local player.
          </p>
        </div>
        <button
          type="button"
          onClick={() => downloadMediaUrl(current, videoFileNameFromUrl(current))}
          className="inline-flex h-11 items-center gap-2 rounded-sm border border-border bg-muted px-4 text-sm font-bold text-card-foreground transition-colors hover:border-success/40 hover:text-success focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Download size={15} /> Download file
        </button>
        {urls.length > 1 && (
          <VideoStrip urls={urls} posters={posters} index={index} onPick={(i) => setIndex(i)} />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-3 sm:p-4">
      <div className="relative overflow-hidden rounded-lg bg-black/90">
        {failed ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 p-6 text-center">
            <AlertTriangle size={26} className="text-warning" />
            <div>
              <p className="text-sm font-bold text-white">This video could not be loaded.</p>
              <p className="mt-1 text-xs font-semibold text-white/60">
                {kind === 'attempt'
                  ? 'MOV playback depends on the codec used when recording.'
                  : 'The file may be corrupt or still uploading.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => downloadMediaUrl(current, videoFileNameFromUrl(current))}
              className="inline-flex h-11 items-center gap-2 rounded-sm border border-white/25 bg-white/10 px-4 text-sm font-bold text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <Download size={15} /> Download video
            </button>
          </div>
        ) : (
          <>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption -- user-uploaded clips have no caption track */}
            <video
              ref={videoRef}
              key={current}
              src={current}
              poster={poster}
              controls
              preload="metadata"
              playsInline
              className="max-h-[55vh] w-full bg-black"
              onPlay={() => setShowOverlay(false)}
              onPause={() => setShowOverlay(true)}
              onError={() => setFailed(true)}
            />
            {showOverlay && (
              <button
                type="button"
                aria-label={`Play video${title ? ` for ${title}` : ''}`}
                onClick={() => videoRef.current?.play().catch(() => setFailed(true))}
                className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors hover:bg-black/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/90 text-white shadow-lg">
                  <Play size={28} fill="currentColor" strokeWidth={0} className="ml-1" />
                </span>
              </button>
            )}
          </>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-muted-foreground">
          Video {Math.min(index, urls.length - 1) + 1} / {urls.length}
        </span>
        <button
          type="button"
          onClick={() => downloadMediaUrl(current, videoFileNameFromUrl(current))}
          className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-border bg-muted px-3 text-xs font-bold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          title="Download this video"
        >
          <Download size={13} /> Download
        </button>
      </div>

      {urls.length > 1 && (
        <VideoStrip urls={urls} posters={posters} index={index} onPick={(i) => { setIndex(i); setFailed(false); setShowOverlay(true); }} />
      )}
    </div>
  );
}

function VideoStrip({
  urls,
  posters,
  index,
  onPick,
}: {
  urls: (string | null)[];
  posters: (string | null)[];
  index: number;
  onPick: (i: number) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1" role="listbox" aria-label="Videos">
      {urls.map((url, i) => {
        const poster = posters[i];
        const active = i === index;
        return (
          <button
            key={`${url}-${i}`}
            type="button"
            role="option"
            aria-selected={active}
            aria-label={`Play video ${i + 1}`}
            title={`Video ${i + 1}`}
            onClick={() => onPick(i)}
            className={`relative h-16 w-24 shrink-0 overflow-hidden rounded border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              active ? 'border-success ring-1 ring-success/50' : 'border-border hover:border-success/40'
            }`}
          >
            {poster ? (
              <img src={thumbUrl(poster, 240)} alt="" className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-black/70 text-white/80">
                <Play size={18} fill="currentColor" strokeWidth={0} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function PhotosPane({ urls, title }: { urls: string[]; title: string }) {
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [zoom, setZoom] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const total = urls.length;
  const current = total > 0 ? urls[Math.min(index, total - 1)] : null;

  const go = useCallback(
    (delta: number) => {
      if (total === 0) return;
      setIndex((i) => (i + delta + total) % total);
      setZoom(false);
      setStatus('loading');
    },
    [total]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [go]);

  // Reset loading state when the visible photo changes (render-time
  // adjustment — avoids setState inside an effect).
  const [lastUrl, setLastUrl] = useState(current);
  if (current !== lastUrl) {
    setLastUrl(current);
    setStatus('loading');
    setZoom(false);
  }

  if (total === 0 || !current) {
    return <EmptyPane icon={<Images size={26} />} text="No photos for this match yet." />;
  }

  const counter = `${Math.min(index, total - 1) + 1} / ${total}`;

  return (
    <div className="flex flex-col gap-3 p-3 sm:p-4">
      <div
        className="relative flex min-h-[240px] items-center justify-center overflow-hidden rounded-lg bg-black/90"
        onTouchStart={(e) => { touchStartX.current = e.touches[0]?.clientX ?? null; }}
        onTouchEnd={(e) => {
          const start = touchStartX.current;
          if (start == null) return;
          const end = e.changedTouches[0]?.clientX ?? start;
          const dx = end - start;
          if (Math.abs(dx) > 45) go(dx < 0 ? 1 : -1);
          touchStartX.current = null;
        }}
      >
        {status === 'loading' && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60">
            <Loader2 size={26} className="animate-spin text-white" />
          </div>
        )}
        {status === 'error' ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 p-6 text-center">
            <AlertTriangle size={26} className="text-warning" />
            <div>
              <p className="text-sm font-bold text-white">This photo could not be loaded.</p>
              <p className="mt-1 text-xs font-semibold text-white/60">The file may have been moved or removed.</p>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setZoom((z) => !z)}
            aria-pressed={zoom}
            aria-label={zoom ? `Zoom out photo ${Math.min(index, total - 1) + 1}` : `Zoom in photo ${Math.min(index, total - 1) + 1}`}
            className="block border-0 bg-transparent p-0 cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <img
              src={current}
              alt={`${title || 'Match'} — ${Math.min(index, total - 1) + 1} of ${total}`}
              loading="lazy"
              onLoad={() => setStatus('ready')}
              onError={() => setStatus('error')}
              className={`max-h-[55vh] w-auto object-contain transition-transform ${zoom ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
              style={zoom ? { transform: 'scale(1.6)' } : undefined}
            />
          </button>
        )}

        {total > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous photo"
              title="Previous photo"
              className="absolute left-1 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white transition-colors hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next photo"
              title="Next photo"
              className="absolute right-1 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white transition-colors hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <ChevronRight size={22} />
            </button>
          </>
        )}
        <span className="absolute bottom-2 right-2 z-20 rounded bg-black/65 px-2 py-1 text-xs font-black text-white">
          {counter}
        </span>
      </div>

      {total > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1" role="listbox" aria-label="Photos">
          {urls.map((url, i) => {
            const active = i === index;
            return (
              <button
                key={`${url}-${i}`}
                type="button"
                role="option"
                aria-selected={active}
                aria-label={`View photo ${i + 1}`}
                title={`Photo ${i + 1}`}
                onClick={() => { setIndex(i); setZoom(false); setStatus('loading'); }}
                className={`h-16 w-16 shrink-0 overflow-hidden rounded border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  active ? 'border-success ring-1 ring-success/50' : 'border-border hover:border-success/40'
                }`}
              >
                <img src={thumbUrl(url, 160)} alt="" className="h-full w-full object-cover" loading="lazy" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyPane({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
      {icon}
      <p className="text-sm font-semibold">{text}</p>
    </div>
  );
}
