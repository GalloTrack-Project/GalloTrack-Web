import { describe, expect, it } from 'vitest';
import {
  CHICKEN_PHOTO_SETUP_MESSAGE,
  computeFullImageDimensions,
  computeThumbnailCrop,
  isChickenPhotoSetupError,
  processChickenPhoto,
  resolveChickenPhotoUrl,
  validateChickenPhotoFile,
} from '@/lib/chicken-photo';

function file(name: string, type: string, size = 100): File {
  const f = new File(['x'], name, { type });
  Object.defineProperty(f, 'size', { value: size });
  return f;
}

describe('chicken photo helpers', () => {
  it('accepts JPG, PNG and WebP', () => {
    expect(validateChickenPhotoFile(file('a.jpg', 'image/jpeg'))).toBeNull();
    expect(validateChickenPhotoFile(file('a.png', 'image/png'))).toBeNull();
    expect(validateChickenPhotoFile(file('a.webp', 'image/webp'))).toBeNull();
  });

  it('rejects other file types and files over 5 MB', () => {
    expect(validateChickenPhotoFile(file('a.gif', 'image/gif'))).toBe(
      'Unsupported file. Please upload a JPG, PNG or WebP image.',
    );
    expect(validateChickenPhotoFile(file('a.pdf', 'application/pdf'))).toBe(
      'Unsupported file. Please upload a JPG, PNG or WebP image.',
    );
    expect(
      validateChickenPhotoFile(file('a.jpg', 'image/jpeg', 5 * 1024 * 1024 + 1)),
    ).toBe('This file is 5.1 MB. Maximum size is 5 MB.');
  });

  it('rejects invalid files before trying to process them', async () => {
    await expect(processChickenPhoto(file('a.txt', 'text/plain'))).rejects.toThrow(
      'Unsupported file. Please upload a JPG, PNG or WebP image.',
    );
  });

  it('scales tall and wide photos without distorting them and caps the long side at 1600', () => {
    expect(computeFullImageDimensions(1000, 2000)).toEqual({ width: 800, height: 1600 });
    expect(computeFullImageDimensions(3000, 1000)).toEqual({ width: 1600, height: 533 });
    expect(computeFullImageDimensions(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it('builds a square thumbnail crop centered horizontally and biased toward the top', () => {
    expect(computeThumbnailCrop(400, 1000)).toEqual({ x: 0, y: 180, size: 400 });
    expect(computeThumbnailCrop(1000, 400)).toEqual({ x: 300, y: 0, size: 400 });
    expect(computeThumbnailCrop(500, 500)).toEqual({ x: 0, y: 0, size: 500 });
  });

  it('maps missing bucket/schema errors to the setup message', () => {
    expect(isChickenPhotoSetupError('Bucket not found')).toBe(true);
    expect(isChickenPhotoSetupError('column "photo_path" does not exist')).toBe(true);
    expect(isChickenPhotoSetupError('This feature needs a database update.')).toBe(true);
    expect(
      isChickenPhotoSetupError(CHICKEN_PHOTO_SETUP_MESSAGE),
    ).toBe(true);
    expect(isChickenPhotoSetupError('Network error')).toBe(false);
  });

  it('passes legacy absolute URLs through without signing', async () => {
    await expect(resolveChickenPhotoUrl('https://cdn.test/photo.jpg')).resolves.toBe(
      'https://cdn.test/photo.jpg',
    );
    await expect(resolveChickenPhotoUrl('')).resolves.toBeNull();
  });
});
