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

export type ChickenPhotoCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ProcessedChickenPhoto = {
  full: File;
  thumbnail: File;
  previewUrl: string;
};

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

function drawSquareCrop(
  image: LoadedImage,
  crop: ChickenPhotoCrop,
  outputSide: number,
): HTMLCanvasElement {
  const sourceX = Math.max(0, Math.min(crop.x, image.width - 1));
  const sourceY = Math.max(0, Math.min(crop.y, image.height - 1));
  const cropSide = Math.max(1, Math.min(crop.width, crop.height, image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = outputSide;
  canvas.height = outputSide;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('The photo could not be processed. Try another image.');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(
    image.source,
    sourceX,
    sourceY,
    cropSide,
    cropSide,
    0,
    0,
    outputSide,
    outputSide,
  );
  return canvas;
}

export async function processChickenPhoto(
  file: File,
  crop?: ChickenPhotoCrop | null,
): Promise<ProcessedChickenPhoto> {
  const validation = validateChickenPhotoFile(file);
  if (validation) throw new Error(validation);

  const image = await loadOrientedImage(file);
  try {
    const fallbackSide = Math.min(image.width, image.height);
    const area: ChickenPhotoCrop = crop && crop.width > 0 && crop.height > 0
      ? crop
      : {
          x: Math.max(0, (image.width - fallbackSide) / 2),
          y: Math.max(0, (image.height - fallbackSide) / 2),
          width: fallbackSide,
          height: fallbackSide,
        };
    const sourceSide = Math.min(area.width, area.height, image.width, image.height);
    const fullSide = Math.max(1, Math.min(CHICKEN_PHOTO_MAX_FULL_SIDE, Math.round(sourceSide)));

    const fullEncoded = await encodeCanvas(
      drawSquareCrop(image, area, fullSide),
    );
    const thumbEncoded = await encodeCanvas(
      drawSquareCrop(image, area, CHICKEN_PHOTO_THUMB_SIDE),
    );

    const full = new File([fullEncoded.blob], `chicken-photo.${fullEncoded.extension}`, {
      type: fullEncoded.blob.type || 'image/webp',
    });
    const thumbnail = new File([thumbEncoded.blob], `chicken-photo-thumb.${thumbEncoded.extension}`, {
      type: thumbEncoded.blob.type || 'image/webp',
    });

    return {
      full,
      thumbnail,
      previewUrl: URL.createObjectURL(full),
    };
  } finally {
    image.close?.();
  }
}

export async function resolveChickenPhotoUrl(path?: string | null): Promise<string | null> {
  if (!path) return null;
  if (/^https?:\/\//i.test(path) || path.startsWith('data:')) return path;

  const cached = signedCache.get(path);
  if (cached && Date.now() < cached.expiresAt - SIGN_REFRESH_MARGIN_MS) return cached.url;

  const pending = signedPending.get(path);
  if (pending) return pending;

  const promise = (async () => {
    try {
      const { data, error } = await supabase.storage
        .from(CHICKEN_PHOTO_BUCKET)
        .createSignedUrl(path, SIGN_TTL_SECONDS);
      if (error || !data?.signedUrl) return null;
      signedCache.set(path, {
        url: data.signedUrl,
        expiresAt: Date.now() + SIGN_TTL_SECONDS * 1000,
      });
      return data.signedUrl;
    } catch {
      return null;
    } finally {
      signedPending.delete(path);
    }
  })();

  signedPending.set(path, promise);
  return promise;
}

export function clearChickenPhotoUrlCache(): void {
  signedCache.clear();
  signedPending.clear();
}
