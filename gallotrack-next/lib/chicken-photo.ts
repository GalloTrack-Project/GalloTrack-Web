import { supabase } from '@/lib/registry';

export const CHICKEN_PHOTO_BUCKET = 'chicken-photos';
export const CHICKEN_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const CHICKEN_PHOTO_MAX_FULL_SIDE = 1600;
export const CHICKEN_PHOTO_THUMB_SIDE = 256;
export const CHICKEN_PHOTO_QUALITY = 0.8;
export const CHICKEN_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const CHICKEN_PHOTO_SETUP_MESSAGE =
  'Photos are not set up yet. Ask the admin to apply the database update.';
export const CHICKEN_PHOTO_UPLOAD_CANCELLED = 'Photo upload was cancelled.';

export type ProcessedChickenPhoto = {
  full: File;
  thumbnail: File;
};

export type ChickenPhotoDimensions = {
  width: number;
  height: number;
};

export type ChickenPhotoThumbnailCrop = {
  x: number;
  y: number;
  size: number;
};

export function computeFullImageDimensions(
  width: number,
  height: number,
): ChickenPhotoDimensions {
  const safeWidth = Math.max(1, Math.round(width));
  const safeHeight = Math.max(1, Math.round(height));
  const longestSide = Math.max(safeWidth, safeHeight);
  const scale =
    longestSide > CHICKEN_PHOTO_MAX_FULL_SIDE
      ? CHICKEN_PHOTO_MAX_FULL_SIDE / longestSide
      : 1;
  return {
    width: Math.max(1, Math.round(safeWidth * scale)),
    height: Math.max(1, Math.round(safeHeight * scale)),
  };
}

export function computeThumbnailCrop(
  width: number,
  height: number,
): ChickenPhotoThumbnailCrop {
  const size = Math.max(1, Math.min(width, height));
  return {
    x: Math.max(0, (width - size) / 2),
    y: Math.max(0, (height - size) * 0.3),
    size,
  };
}

function formatMegabytes(bytes: number): string {
  const megabytes = bytes / (1024 * 1024);
  const rounded = megabytes >= 10 ? Math.round(megabytes) : Math.ceil(megabytes * 10) / 10;
  return `${rounded} MB`;
}

const SIGN_TTL_SECONDS = 60 * 60;
const SIGN_REFRESH_MARGIN_MS = 60 * 1000;
const signedCache = new Map<string, { url: string; expiresAt: number }>();
const signedPending = new Map<string, Promise<string | null>>();

export function validateChickenPhotoFile(file: Pick<File, 'name' | 'size' | 'type'>): string | null {
  const type = (file.type || '').toLowerCase();
  const extension = (file.name.split('.').pop() || '').toLowerCase();
  const allowedExtension = ['jpg', 'jpeg', 'png', 'webp'].includes(extension);
  const allowedType = (CHICKEN_PHOTO_TYPES as readonly string[]).includes(type);

  if (!allowedType && !allowedExtension) {
    return 'Unsupported file. Please upload a JPG, PNG or WebP image.';
  }
  if (file.size > CHICKEN_PHOTO_MAX_BYTES) {
    return `This file is ${formatMegabytes(file.size)}. Maximum size is 5 MB.`;
  }
  if (file.size <= 0) {
    return 'The selected photo is empty. Choose another image.';
  }
  return null;
}

export function isChickenPhotoSetupError(message?: string | null): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes('chicken-photos') ||
    lower.includes('bucket') ||
    lower.includes('not set up') ||
    lower.includes('database update') ||
    lower.includes('photo_path') ||
    lower.includes('photo_thumb_path')
  );
}

type LoadedImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  close?: () => void;
};

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('The selected image could not be read.'));
    };
    image.src = url;
  });
}

async function loadOrientedImage(file: File): Promise<LoadedImage> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        close: () => bitmap.close(),
      };
    } catch {
      // Safari/older browsers can reject the options object; fall through.
    }
  }
  const image = await loadImageElement(file);
  return { source: image, width: image.naturalWidth, height: image.naturalHeight };
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('The photo could not be processed. Try another image.'));
      },
      type,
      quality,
    );
  });
}

async function encodeCanvas(canvas: HTMLCanvasElement): Promise<{ blob: Blob; extension: string }> {
  let blob = await canvasToBlob(canvas, 'image/webp', CHICKEN_PHOTO_QUALITY);
  if (blob.type === 'image/webp') return { blob, extension: 'webp' };
  if (blob.type === 'image/jpeg') return { blob, extension: 'jpg' };
  blob = await canvasToBlob(canvas, 'image/jpeg', CHICKEN_PHOTO_QUALITY);
  return { blob, extension: blob.type === 'image/png' ? 'png' : 'jpg' };
}

function drawFullImage(image: LoadedImage): HTMLCanvasElement {
  const { width, height } = computeFullImageDimensions(image.width, image.height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('The photo could not be processed. Try another image.');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image.source, 0, 0, width, height);
  return canvas;
}

function drawThumbnail(image: LoadedImage): HTMLCanvasElement {
  const crop = computeThumbnailCrop(image.width, image.height);
  const canvas = document.createElement('canvas');
  canvas.width = CHICKEN_PHOTO_THUMB_SIDE;
  canvas.height = CHICKEN_PHOTO_THUMB_SIDE;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('The photo could not be processed. Try another image.');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(
    image.source,
    crop.x,
    crop.y,
    crop.size,
    crop.size,
    0,
    0,
    CHICKEN_PHOTO_THUMB_SIDE,
    CHICKEN_PHOTO_THUMB_SIDE,
  );
  return canvas;
}

export async function processChickenPhoto(file: File): Promise<ProcessedChickenPhoto> {
  const validation = validateChickenPhotoFile(file);
  if (validation) throw new Error(validation);

  const image = await loadOrientedImage(file);
  try {
    const fullEncoded = await encodeCanvas(drawFullImage(image));
    const thumbEncoded = await encodeCanvas(drawThumbnail(image));

    const full = new File([fullEncoded.blob], `chicken-photo.${fullEncoded.extension}`, {
      type: fullEncoded.blob.type || 'image/webp',
    });
    const thumbnail = new File([thumbEncoded.blob], `chicken-photo-thumb.${thumbEncoded.extension}`, {
      type: thumbEncoded.blob.type || 'image/webp',
    });

    return { full, thumbnail };
  } finally {
    image.close?.();
  }
}

const SIGNED_STORAGE_PREFIX = 'gallotrack:chicken-photo-url:';
const BATCH_DELAY_MS = 10;
type SignedUrlWaiter = (url: string | null) => void;

const batchWaiters = new Map<string, SignedUrlWaiter[]>();
let batchTimer: ReturnType<typeof setTimeout> | null = null;

function readSessionCache(path: string): { url: string; expiresAt: number } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(SIGNED_STORAGE_PREFIX + path);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { url?: unknown; expiresAt?: unknown };
    if (typeof parsed.url !== 'string' || typeof parsed.expiresAt !== 'number') {
      window.sessionStorage.removeItem(SIGNED_STORAGE_PREFIX + path);
      return null;
    }
    return { url: parsed.url, expiresAt: parsed.expiresAt };
  } catch {
    return null;
  }
}

function writeSessionCache(path: string, cache: { url: string; expiresAt: number }): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(SIGNED_STORAGE_PREFIX + path, JSON.stringify(cache));
  } catch {
    /* storage may be full or disabled */
  }
}

function getCachedSignedUrl(path: string): string | null {
  const memory = signedCache.get(path);
  if (memory) {
    if (Date.now() < memory.expiresAt - SIGN_REFRESH_MARGIN_MS) return memory.url;
    signedCache.delete(path);
  }

  const session = readSessionCache(path);
  if (!session) return null;
  if (Date.now() < session.expiresAt - SIGN_REFRESH_MARGIN_MS) {
    signedCache.set(path, session);
    return session.url;
  }

  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage.removeItem(SIGNED_STORAGE_PREFIX + path);
    } catch {
      /* ignore */
    }
  }
  return null;
}

function cacheSignedUrl(path: string, url: string): void {
  const cache = { url, expiresAt: Date.now() + SIGN_TTL_SECONDS * 1000 };
  signedCache.set(path, cache);
  writeSessionCache(path, cache);
}

async function signDirect(path: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(CHICKEN_PHOTO_BUCKET)
      .createSignedUrl(path, SIGN_TTL_SECONDS);
    if (error || !data?.signedUrl) {
      console.error('[chicken-photo] client signing failed', {
        path,
        error: error?.message ?? 'No signed URL returned',
      });
      return null;
    }
    cacheSignedUrl(path, data.signedUrl);
    return data.signedUrl;
  } catch (error) {
    console.error('[chicken-photo] client signing failed', {
      path,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

function scheduleBatchFlush(): void {
  if (batchTimer) return;
  batchTimer = setTimeout(() => {
    batchTimer = null;
    void flushBatch();
  }, BATCH_DELAY_MS);
}

async function flushBatch(): Promise<void> {
  if (batchWaiters.size === 0) return;

  const waiters = new Map(batchWaiters);
  batchWaiters.clear();
  const finish = (path: string, url: string | null) => {
    signedPending.delete(path);
    const pathWaiters = waiters.get(path) ?? [];
    for (const resolve of pathWaiters) resolve(url);
  };

  const missing: string[] = [];
  for (const path of waiters.keys()) {
    const cached = getCachedSignedUrl(path);
    if (cached) finish(path, cached);
    else missing.push(path);
  }
  if (missing.length === 0) return;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      for (const path of missing) finish(path, null);
      return;
    }

    const response = await fetch('/api/fowl/photo/sign', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ paths: missing }),
      cache: 'no-store',
    });
    const body = (await response.json().catch(() => null)) as
      | {
          signedUrls?: Record<string, string>;
          errors?: Record<string, string>;
          error?: string;
        }
      | null;

    if (response.ok) {
      for (const path of missing) {
        const url = body?.signedUrls?.[path] ?? null;
        if (url) {
          cacheSignedUrl(path, url);
          finish(path, url);
        } else {
          console.error('[chicken-photo] batch signing returned no URL', {
            path,
            error: body?.errors?.[path] ?? 'No signed URL returned',
          });
          finish(path, null);
        }
      }
      return;
    }

    console.error('[chicken-photo] batch signing failed', {
      status: response.status,
      count: missing.length,
      error: body?.error ?? 'No response',
    });
    await Promise.all(
      missing.map(async (path) => finish(path, await signDirect(path))),
    );
  } catch (error) {
    console.error('[chicken-photo] batch signing request failed', {
      count: missing.length,
      error: error instanceof Error ? error.message : String(error),
    });
    for (const path of missing) finish(path, null);
  }
}

export async function resolveChickenPhotoUrl(path?: string | null): Promise<string | null> {
  if (!path) return null;
  if (/^https?:\/\//i.test(path) || path.startsWith('data:')) return path;

  const cached = getCachedSignedUrl(path);
  if (cached) return cached;

  const pending = signedPending.get(path);
  if (pending) return pending;

  const promise = new Promise<string | null>((resolve) => {
    const waiters = batchWaiters.get(path) ?? [];
    waiters.push(resolve);
    batchWaiters.set(path, waiters);
    scheduleBatchFlush();
  });

  signedPending.set(path, promise);
  return promise;
}

export async function resolveChickenPhotoUrls(
  paths: Array<string | null | undefined>,
): Promise<Map<string, string | null>> {
  const unique = Array.from(new Set(paths.filter((path): path is string => Boolean(path))));
  const entries = await Promise.all(
    unique.map(async (path) => [path, await resolveChickenPhotoUrl(path)] as const),
  );
  return new Map(entries);
}

export function clearChickenPhotoUrlCache(): void {
  if (batchTimer) {
    clearTimeout(batchTimer);
    batchTimer = null;
  }
  for (const [path, waiters] of batchWaiters) {
    signedPending.delete(path);
    for (const resolve of waiters) resolve(null);
  }
  batchWaiters.clear();
  signedCache.clear();
  signedPending.clear();

  if (typeof window !== 'undefined') {
    try {
      const keys: string[] = [];
      for (let index = 0; index < window.sessionStorage.length; index += 1) {
        const key = window.sessionStorage.key(index);
        if (key?.startsWith(SIGNED_STORAGE_PREFIX)) keys.push(key);
      }
      for (const key of keys) window.sessionStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}
