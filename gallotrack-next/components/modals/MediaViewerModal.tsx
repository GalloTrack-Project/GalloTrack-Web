'use client';
import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useUI } from '@/lib/contexts/ui-context';

export default function MediaViewerModal() {
  const ui = useUI();
  const { videoViewerUrl, setVideoViewerUrl, imageViewerUrl, setImageViewerUrl } = ui;
  const open = Boolean(videoViewerUrl || imageViewerUrl);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setVideoViewerUrl(null);
        setImageViewerUrl(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setVideoViewerUrl, setImageViewerUrl]);

  if (!open) return null;

  const close = () => {
    setVideoViewerUrl(null);
    setImageViewerUrl(null);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 sm:p-8" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close viewer"
        onClick={close}
        className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer"
      >
        <X className="w-5 h-5" />
      </button>
      <div className="max-h-full max-w-full">
        {imageViewerUrl ? (
          <img src={imageViewerUrl} alt="Media preview" className="max-h-[85vh] max-w-full rounded-lg object-contain shadow-2xl" />
        ) : (
          <>
            <video src={videoViewerUrl || ''} controls autoPlay className="max-h-[85vh] max-w-full rounded-lg bg-black shadow-2xl">
              <track kind="captions" srcLang="en" label="English" />
            </video>
          </>
        )}
      </div>
    </div>
  );
}
