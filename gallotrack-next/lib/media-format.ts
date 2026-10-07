// Shared helpers for match media: format sniffing (never trust extensions),
// upload validation, playable-format detection, storage URL utilities.

export const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB (matches /api/match/upload)
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // 10 MB (matches /api/match/photo)
export const MAX_MATCH_VIDEOS = 3;
export const MAX_MATCH_PHOTOS = 6;

export type VideoKind = 'mp4' | 'mov' | 'avi' | 'webm' | 'mkv';
export type ImageKind = 'jpeg' | 'png' | 'gif' | 'webp';

const VIDEO_EXTS = new Set(['mp4', 'm4v', 'mov', 'avi', 'webm', 'mkv']);
const PHOTO_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp']);

export function fileExt(name: string): string {
  const parts = (name || '').toLowerCase().split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

/** Stable per-file key for tracking upload progress in the record form. */
export function uploadKey(kind: 'video' | 'photo', file: { name: string; size: number }): string {
  return `${kind}:${file.name}:${file.size}`;
}

/**
 * How well a video is expected to play in browsers:
 *  - 'playable'    → MP4/WebM play natively everywhere.
 *  - 'attempt'     → MOV often plays (H.264/AAC) but not always — try, and
 *                    fall back to a download offer if the <video> errors.
 *  - 'unsupported' → AVI/MKV containers are not playable in any modern browser
 *                    and this deployment has no converter — offer download only.
 */
export function playableKind(urlOrName: string): 'playable' | 'attempt' | 'unsupported' {
  const ext = fileExt(urlOrName.split('?')[0] || '');
  if (ext === 'avi' || ext === 'mkv') return 'unsupported';
  if (ext === 'mp4' || ext === 'm4v' || ext === 'webm') return 'playable';
  if (ext === 'mov') return 'attempt';
  return 'attempt';
}

function ascii(head: Uint8Array, start: number, len: number): string {
  let s = '';
  for (let i = start; i < start + len && i < head.length; i++) s += String.fromCharCode(head[i]);
  return s;
}

/** Sniff the real video container from the first bytes of the file. */
export function sniffVideoKind(head: Uint8Array): VideoKind | null {
  if (head.length < 12) return null;
  if (ascii(head, 0, 4) === 'RIFF') {
    return ascii(head, 8, 4) === 'AVI ' ? 'avi' : null;
  }
  if (ascii(head, 4, 4) === 'ftyp') {
    const brand = ascii(head, 8, 4);
    return brand === 'qt  ' ? 'mov' : 'mp4';
  }
  // EBML (WebM / Matroska)
  if (head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3) {
    const window = ascii(head, 0, Math.min(head.length, 64));
    if (window.includes('webm')) return 'webm';
    return 'mkv';
  }
  return null;
}

/** Sniff the real image format from the first bytes of the file. */
export function sniffImageKind(head: Uint8Array): ImageKind | null {
  if (head.length < 12) return null;
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return 'jpeg';
  if (head[0] === 0x89 && ascii(head, 1, 3) === 'PNG') return 'png';
  if (ascii(head, 0, 4) === 'GIF8') return 'gif';
  if (ascii(head, 0, 4) === 'RIFF' && ascii(head, 8, 4) === 'WEBP') return 'webp';
  return null;
}

export function validateVideoFileMeta(file: { name: string; size: number }): string | null {
  if (file.size <= 0) return `"${file.name}" is empty.`;
  if (file.size > MAX_VIDEO_BYTES) return `"${file.name}" is too large (${formatBytes(file.size)} — max ${formatBytes(MAX_VIDEO_BYTES)}).`;
  if (!VIDEO_EXTS.has(fileExt(file.name))) {
    return `"${file.name}" is not an allowed video type — use MP4, MOV, AVI, WebM, or MKV.`;
  }
  return null;
}

export function validatePhotoFileMeta(file: { name: string; size: number }): string | null {
  if (file.size <= 0) return `"${file.name}" is empty.`;
  if (file.size > MAX_PHOTO_BYTES) return `"${file.name}" is too large (${formatBytes(file.size)} — max ${formatBytes(MAX_PHOTO_BYTES)}).`;
  if (!PHOTO_EXTS.has(fileExt(file.name))) {
    return `"${file.name}" is not an allowed image type — use JPG, PNG, GIF, or WebP.`;
  }
  return null;
}

async function readHead(file: Blob, bytes = 64): Promise<Uint8Array | null> {
  try {
    const buf = await file.slice(0, bytes).arrayBuffer();
    return new Uint8Array(buf);
  } catch {
    return null;
  }
}

/** Full client-side video validation: size/extension + magic-byte content sniff. */
export async function validateVideoFile(file: File): Promise<string | null> {
  const metaError = validateVideoFileMeta(file);
  if (metaError) return metaError;
  const head = await readHead(file);
  if (!head || !sniffVideoKind(head)) {
    return `"${file.name}" is not a recognized video file (the contents don't match a video format).`;
  }
  return null;
}

/** Full client-side photo validation: size/extension + magic-byte content sniff. */
export async function validatePhotoFile(file: File): Promise<string | null> {
  const metaError = validatePhotoFileMeta(file);
  if (metaError) return metaError;
  const head = await readHead(file);
  if (!head || !sniffImageKind(head)) {
    return `"${file.name}" is not a recognized image file (the contents don't match an image format).`;
  }
  return null;
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

const STORAGE_MARKERS = [
  '/storage/v1/object/public/',
  '/storage/v1/object/sign/',
  '/storage/v1/object/',
  '/storage/v1/render/image/public/',
  '/storage/v1/render/image/signed/',
  '/storage/v1/render/image/',
];

/** Parse a Supabase Storage URL back into { bucket, path }. Query strings are ignored. */
export function storagePathFromUrl(raw: string): { bucket: string; path: string } | null {
  if (!raw) return null;
  try {
    const url = new URL(raw, 'http://localhost');
    const pathname = url.pathname;
    for (const marker of STORAGE_MARKERS) {
      const idx = pathname.indexOf(marker);
      if (idx >= 0) {
        let rest = pathname.slice(idx + marker.length);
        try {
          rest = decodeURIComponent(rest);
        } catch { /* keep raw */ }
        const slash = rest.indexOf('/');
        if (slash <= 0 || slash === rest.length - 1) return null;
        return { bucket: rest.slice(0, slash), path: rest.slice(slash + 1) };
      }
    }
    return null;
  } catch {
    return null;
  }
}

/** Buckets whose objects are (or will be) private and need signed URLs. */
export const PRIVATE_STORAGE_BUCKETS = new Set(['match-videos', 'match-photos']);

/**
 * Fast thumbnail URL for a public storage image via Supabase image
 * transformations. Falls back to the original URL when the URL is not a
 * public object URL (private/signed/legacy) — callers must tolerate failure
 * (use onerror → original) because transformations may be unavailable on the
 * project's plan.
 */
export function thumbUrl(raw: string, size = 192): string {
  if (!raw) return raw;
  const parsed = storagePathFromUrl(raw);
  if (!parsed || !raw.includes('/storage/v1/object/public/')) return raw;
  try {
    const url = new URL(raw, 'http://localhost');
    const encodedPath = parsed.path.split('/').map(encodeURIComponent).join('/');
    const origin = url.origin.startsWith('http') ? url.origin : '';
    return `${origin}/storage/v1/render/image/public/${encodeURIComponent(parsed.bucket)}/${encodedPath}?width=${size}&height=${size}&resize=cover`;
  } catch {
    return raw;
  }
}

/** Trigger a browser download for a (possibly cross-origin) media URL. */
export async function downloadMediaUrl(url: string, filename: string): Promise<void> {
  if (!url) return;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 15000);
  } catch {
    // CORS/network failure — open it so the user can still save it.
    window.open(url, '_blank', 'noopener');
  }
}

export function videoFileNameFromUrl(url: string, fallback = 'match-video'): string {
  try {
    const parsed = storagePathFromUrl(url);
    const base = parsed ? parsed.path.split('/').pop() : new URL(url, 'http://localhost').pathname.split('/').pop();
    return base || `${fallback}.mp4`;
  } catch {
    return `${fallback}.mp4`;
  }
}

/**
 * Best-effort client-side poster capture (first clear frame) so video lists
 * don't have to load full videos. Returns null for formats browsers can't
 * decode (AVI/MKV) or on any failure — callers must treat it as optional.
 */
export async function captureVideoPoster(file: File, atSeconds = 1): Promise<Blob | null> {
  if (typeof document === 'undefined') return null;
  return new Promise((resolve) => {
    let settled = false;
    let objectUrl = '';
    const finish = (value: Blob | null) => {
      if (settled) return;
      settled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      video.removeAttribute('src');
      try { video.load(); } catch { /* ignore */ }
      resolve(value);
    };
    const timer = setTimeout(() => finish(null), 10000);
    const clear = () => clearTimeout(timer);
    let video: HTMLVideoElement;
    try {
      objectUrl = URL.createObjectURL(file);
      video = document.createElement('video');
      video.muted = true;
      video.preload = 'auto';
      video.playsInline = true;
      video.crossOrigin = 'anonymous';
    } catch {
      clear();
      finish(null);
      return;
    }
    video.onerror = () => { clear(); finish(null); };
    video.onloadeddata = () => {
      try {
        const duration = Number.isFinite(video.duration) ? video.duration : 0;
        video.currentTime = Math.min(atSeconds, duration > 0 ? duration / 3 : 0);
      } catch {
        clear();
        finish(null);
      }
    };
    video.onseeked = () => {
      clear();
      try {
        const width = 640;
        const scale = video.videoWidth ? width / video.videoWidth : 1;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = Math.max(1, Math.round((video.videoHeight || 360) * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) { finish(null); return; }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => finish(blob), 'image/jpeg', 0.72);
      } catch {
        finish(null);
      }
    };
    video.src = objectUrl;
  });
}
