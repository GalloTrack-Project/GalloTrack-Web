'use client';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Play, Download, AlertTriangle, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useUI } from '@/lib/contexts/ui-context';

/* ─────────────────────────── helpers ───────────────────────────── */

const outcomeColors = (outcome: string) => {
  const o = (outcome || '').toLowerCase();
  if (o === 'win') return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
  if (o === 'loss') return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
  return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
};

const conditionColors = (cond: string) => {
  const c = (cond || '').toLowerCase();
  if (c.includes('deceased')) return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
  if (c.includes('critical') || c.includes('severely')) return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
  return 'bg-teal-500/15 text-teal-300 border-teal-500/30';
};

/* ─────────────────────────── component ─────────────────────────── */

export default function MediaViewerModal() {
  const ui = useUI();
  const {
    videoViewerUrl, setVideoViewerUrl,
    videoViewerMatch, setVideoViewerMatch,
    videoViewerUrls, setVideoViewerUrls,
    imageViewerUrl, setImageViewerUrl,
  } = ui;

  const videoRef = useRef<HTMLVideoElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [videoState, setVideoState] = useState<'loading' | 'ready' | 'error'>('loading');

  // Determine mode: rich match player OR simple single-URL fallback
  const hasRichData = videoViewerUrls.length > 0;
  const urls = hasRichData ? videoViewerUrls : videoViewerUrl ? [videoViewerUrl] : [];
  const activeUrl = urls[activeIdx] ?? null;
  const isOpen = Boolean(activeUrl || imageViewerUrl);

  /* ── Reset state when modal opens ── */
  useEffect(() => {
    if (isOpen) {
      setActiveIdx(0);
      setVideoState('loading');
    }
  }, [isOpen]);

  /* ── Reset video state when switching clips ── */
  useEffect(() => {
    setVideoState('loading');
  }, [activeIdx]);

  /* ── Stop & unload video on close ── */
  const close = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = '';
      videoRef.current.load();
    }
    setVideoViewerUrl(null);
    setVideoViewerMatch(null);
    setVideoViewerUrls([]);
    setImageViewerUrl(null);
  }, [setVideoViewerUrl, setVideoViewerMatch, setVideoViewerUrls, setImageViewerUrl]);

  /* ── Keyboard: Escape + Arrow navigation ── */
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { close(); return; }
      if (e.key === 'ArrowRight') setActiveIdx(i => Math.min(i + 1, urls.length - 1));
      if (e.key === 'ArrowLeft') setActiveIdx(i => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, urls.length, close]);

  if (!isOpen) return null;

  const match = videoViewerMatch;
  const showNav = urls.length > 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={match ? `Match video — ${match.entry_name} vs ${match.opponent}` : 'Video player'}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 backdrop-blur-sm p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      {/* ── Modal panel ── */}
      <div
        className="relative flex flex-col w-full h-full sm:h-auto sm:max-h-[95vh] sm:max-w-4xl sm:rounded-xl bg-[#0d0f14] shadow-2xl overflow-hidden ring-1 ring-white/10"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Close button ── */}
        <button
          type="button"
          aria-label="Close video player"
          onClick={close}
          className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* ── IMAGE VIEWER ── */}
        {imageViewerUrl ? (
          <div className="flex-1 flex items-center justify-center p-4 min-h-[50vh]">
            <img src={imageViewerUrl} alt="Match photo" className="max-h-[85vh] max-w-full rounded-lg object-contain shadow-2xl" />
          </div>
        ) : (
          <>
            {/* ── Match details header ── */}
            {match && (
              <div className="flex-none px-5 pt-5 pb-4 border-b border-white/10 space-y-3">
                {/* Title */}
                <div className="flex items-start gap-3 pr-10">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/35 mb-0.5">Match Video</p>
                    <h2 className="text-base font-black text-white leading-snug">
                      {match.entry_name}
                      {match.opponent ? (
                        <span className="text-white/45 font-bold"> vs {match.opponent}</span>
                      ) : null}
                    </h2>
                    <p className="text-xs font-bold text-white/35 mt-0.5 font-mono">{match.date || '—'}</p>
                  </div>
                </div>

                {/* Detail chips */}
                <div className="flex flex-wrap gap-1.5 text-[11px] font-black">
                  {match.outcome && (
                    <span className={`px-2.5 py-0.5 rounded-full border uppercase tracking-wide ${outcomeColors(match.outcome)}`}>
                      {match.outcome}
                    </span>
                  )}
                  {match.breed && (
                    <span className="px-2.5 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 uppercase tracking-wide">
                      {match.breed}
                    </span>
                  )}
                  {match.location && (
                    <span className="px-2.5 py-0.5 rounded-full border border-white/10 bg-white/5 text-white/55 normal-case">
                      📍 {match.location}
                    </span>
                  )}
                  {match.post_fight_condition && (
                    <span className={`px-2.5 py-0.5 rounded-full border uppercase tracking-wide ${conditionColors(match.post_fight_condition)}`}>
                      {match.post_fight_condition}
                    </span>
                  )}
                  {(match.opponent_breed || match.opponent_bloodline) && (
                    <span className="px-2.5 py-0.5 rounded-full border border-white/10 bg-white/5 text-white/40 normal-case">
                      vs {[match.opponent_breed, match.opponent_bloodline].filter(Boolean).join(' · ')}
                    </span>
                  )}
                </div>

                {/* Multi-clip tabs */}
                {showNav && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-white/35">Clip</span>
                    <div className="flex items-center gap-1">
                      {urls.map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setActiveIdx(i)}
                          className={`h-6 px-2.5 rounded text-[11px] font-black transition-all cursor-pointer ${
                            i === activeIdx
                              ? 'bg-emerald-500 text-white'
                              : 'bg-white/10 text-white/45 hover:bg-white/20'
                          }`}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                    <span className="text-[11px] text-white/25 font-bold ml-auto">
                      {activeIdx + 1} / {urls.length}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* ── VIDEO AREA ── */}
            <div className="relative flex-1 flex items-center justify-center bg-black min-h-[40vh] sm:min-h-[320px]">
              {/* Loading overlay */}
              {videoState === 'loading' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 z-10 pointer-events-none">
                  <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                  <span className="text-xs font-bold text-white/50">Buffering…</span>
                </div>
              )}

              {/* Error overlay */}
              {videoState === 'error' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/80 z-10 px-6 text-center">
                  <AlertTriangle className="w-10 h-10 text-amber-400" />
                  <div>
                    <p className="text-sm font-black text-white">Video failed to load</p>
                    <p className="text-xs text-white/45 font-bold mt-1">
                      The file may be missing, expired, or in a format not supported by your browser.
                    </p>
                  </div>
                  {activeUrl && (
                    <a
                      href={activeUrl}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-black hover:bg-emerald-500/30 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> Download video
                    </a>
                  )}
                </div>
              )}

              {/* Video element — key prop forces remount on URL change */}
              {activeUrl && (
                <video
                  ref={videoRef}
                  key={activeUrl}
                  src={activeUrl}
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-full max-h-[60vh] sm:max-h-[65vh] object-contain bg-black"
                  onLoadedData={() => setVideoState('ready')}
                  onCanPlay={() => setVideoState('ready')}
                  onError={() => setVideoState('error')}
                >
                  <track kind="captions" srcLang="en" label="English" />
                </video>
              )}

              {/* Previous / Next arrow overlays */}
              {showNav && activeIdx > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveIdx(i => i - 1)}
                  aria-label="Previous clip"
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              {showNav && activeIdx < urls.length - 1 && (
                <button
                  type="button"
                  onClick={() => setActiveIdx(i => i + 1)}
                  aria-label="Next clip"
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* ── Footer bar ── */}
            <div className="flex-none flex items-center justify-between gap-3 px-5 py-3 border-t border-white/10 bg-white/5">
              <div className="flex items-center gap-2">
                <Play className="w-3.5 h-3.5 text-emerald-400" fill="currentColor" />
                <span className="text-[11px] font-black text-white/40 uppercase tracking-widest">
                  {urls.length > 1 ? `Clip ${activeIdx + 1} of ${urls.length}` : 'Match Video'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {activeUrl && (
                  <a
                    href={activeUrl}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Download this clip"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-black bg-white/5 border border-white/10 text-white/45 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <Download className="w-3 h-3" /> Download
                  </a>
                )}
                <button
                  type="button"
                  onClick={close}
                  className="px-3 py-1.5 rounded text-[11px] font-black bg-white/5 border border-white/10 text-white/45 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
