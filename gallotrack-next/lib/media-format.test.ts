import { describe, expect, it } from 'vitest';
import {
  MAX_PHOTO_BYTES,
  MAX_VIDEO_BYTES,
  fileExt,
  formatBytes,
  playableKind,
  sniffImageKind,
  sniffVideoKind,
  storagePathFromUrl,
  thumbUrl,
  uploadKey,
  validatePhotoFile,
  validatePhotoFileMeta,
  validateVideoFile,
  validateVideoFileMeta,
} from './media-format';

const bytes = (...vals: number[]) => new Uint8Array(vals);
const asciiBytes = (s: string) => Uint8Array.from(s.split('').map((c) => c.charCodeAt(0)));

function mp4Head() {
  const head = new Uint8Array(32);
  head.set(asciiBytes('\0\0\0\x20ftypisom'), 0);
  return head;
}

function movHead() {
  const head = new Uint8Array(32);
  head.set(asciiBytes('\0\0\0\x20ftypqt  '), 0);
  return head;
}

function aviHead() {
  const head = new Uint8Array(32);
  head.set(asciiBytes('RIFF\0\0\0\0AVI LIST'), 0);
  return head;
}

function webmHead() {
  const head = new Uint8Array(64);
  head.set(bytes(0x1a, 0x45, 0xdf, 0xa3), 0);
  head.set(asciiBytes('....webm'), 4);
  return head;
}

function mkvHead() {
  const head = new Uint8Array(64);
  head.set(bytes(0x1a, 0x45, 0xdf, 0xa3), 0);
  head.set(asciiBytes('....matroska'), 4);
  return head;
}

function makeFile(content: Uint8Array | string, name: string, type: string): File {
  const parts = typeof content === 'string' ? [asciiBytes(content)] : [content];
  return new File(parts as unknown as BlobPart[], name, { type });
}

describe('fileExt', () => {
  it('lowercases and extracts the extension', () => {
    expect(fileExt('Clip.MP4')).toBe('mp4');
    expect(fileExt('a.b.c.mov')).toBe('mov');
    expect(fileExt('noext')).toBe('');
    expect(fileExt('')).toBe('');
  });
});

describe('uploadKey', () => {
  it('is stable per kind, name and size', () => {
    expect(uploadKey('video', { name: 'a.mp4', size: 10 })).toBe('video:a.mp4:10');
    expect(uploadKey('photo', { name: 'a.mp4', size: 10 })).toBe('photo:a.mp4:10');
    expect(uploadKey('video', { name: 'a.mp4', size: 11 })).toBe('video:a.mp4:11');
  });
});

describe('sniffVideoKind', () => {
  it('detects MP4 from the ftyp box', () => {
    expect(sniffVideoKind(mp4Head())).toBe('mp4');
  });

  it('detects QuickTime MOV from the qt brand', () => {
    expect(sniffVideoKind(movHead())).toBe('mov');
  });

  it('detects AVI from RIFF/AVI', () => {
    expect(sniffVideoKind(aviHead())).toBe('avi');
  });

  it('detects WebM from EBML + webm doctype', () => {
    expect(sniffVideoKind(webmHead())).toBe('webm');
  });

  it('detects Matroska from EBML + matroska doctype', () => {
    expect(sniffVideoKind(mkvHead())).toBe('mkv');
  });

  it('defaults EBML without a doctype to mkv', () => {
    expect(sniffVideoKind(bytes(0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0, 0, 0, 0, 0, 0))).toBe('mkv');
  });

  it('rejects RIFF that is not AVI (e.g. WebP) and random data', () => {
    expect(sniffVideoKind(asciiBytes('RIFF\0\0\0\0WEBPVP8 '))).toBeNull();
    expect(sniffVideoKind(bytes(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12))).toBeNull();
  });

  it('rejects truncated headers', () => {
    expect(sniffVideoKind(bytes(0x1a, 0x45))).toBeNull();
  });
});

describe('sniffImageKind', () => {
  it('detects JPEG, PNG, GIF and WebP', () => {
    expect(sniffImageKind(bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0))).toBe('jpeg');
    expect(sniffImageKind(asciiBytes('\x89PNG\r\n\x1a\n\0\0\0\0'))).toBe('png');
    expect(sniffImageKind(asciiBytes('GIF89a\0\0\0\0\0\0'))).toBe('gif');
    expect(sniffImageKind(asciiBytes('RIFF\0\0\0\0WEBPVP8 '))).toBe('webp');
  });

  it('rejects non-images', () => {
    expect(sniffImageKind(asciiBytes('RIFF\0\0\0\0AVI LIST'))).toBeNull();
    expect(sniffImageKind(bytes(0, 0, 0, 0x20, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d))).toBeNull();
  });
});

describe('playableKind', () => {
  it('classifies containers for browser playback', () => {
    expect(playableKind('https://x/match-videos/u/1.mp4')).toBe('playable');
    expect(playableKind('https://x/storage/v1/object/public/match-videos/u/1.webm?tok=1')).toBe('playable');
    expect(playableKind('clip.mov')).toBe('attempt');
    expect(playableKind('clip.MOV')).toBe('attempt');
    expect(playableKind('clip.avi')).toBe('unsupported');
    expect(playableKind('clip.mkv')).toBe('unsupported');
    expect(playableKind('mystery')).toBe('attempt');
  });
});

describe('validateVideoFileMeta', () => {
  it('accepts allowed extensions within the size limit', () => {
    expect(validateVideoFileMeta({ name: 'a.mp4', size: 1024 })).toBeNull();
    expect(validateVideoFileMeta({ name: 'a.mov', size: 1024 })).toBeNull();
    expect(validateVideoFileMeta({ name: 'a.avi', size: 1024 })).toBeNull();
    expect(validateVideoFileMeta({ name: 'a.webm', size: 1024 })).toBeNull();
    expect(validateVideoFileMeta({ name: 'a.mkv', size: 1024 })).toBeNull();
  });

  it('rejects wrong extensions, empty files and oversize files', () => {
    expect(validateVideoFileMeta({ name: 'a.txt', size: 1024 })).toMatch(/not an allowed video type/);
    expect(validateVideoFileMeta({ name: 'a.mp4', size: 0 })).toMatch(/empty/);
    expect(validateVideoFileMeta({ name: 'a.mp4', size: MAX_VIDEO_BYTES + 1 })).toMatch(/too large/);
  });
});

describe('validatePhotoFileMeta', () => {
  it('accepts image extensions within the size limit', () => {
    expect(validatePhotoFileMeta({ name: 'a.jpg', size: 1024 })).toBeNull();
    expect(validatePhotoFileMeta({ name: 'a.png', size: 1024 })).toBeNull();
    expect(validatePhotoFileMeta({ name: 'a.webp', size: 1024 })).toBeNull();
  });

  it('rejects wrong extensions, empty files and oversize files', () => {
    expect(validatePhotoFileMeta({ name: 'a.mp4', size: 1024 })).toMatch(/not an allowed image type/);
    expect(validatePhotoFileMeta({ name: 'a.jpg', size: 0 })).toMatch(/empty/);
    expect(validatePhotoFileMeta({ name: 'a.jpg', size: MAX_PHOTO_BYTES + 1 })).toMatch(/too large/);
  });
});

describe('validateVideoFile (content sniffing)', () => {
  it('accepts a real MP4 payload behind an .mp4 extension', async () => {
    expect(await validateVideoFile(makeFile(mp4Head(), 'clip.mp4', 'video/mp4'))).toBeNull();
  });

  it('accepts a MOV payload behind a .mov extension', async () => {
    expect(await validateVideoFile(makeFile(movHead(), 'clip.mov', 'video/quicktime'))).toBeNull();
  });

  it('accepts an AVI payload behind an .avi extension', async () => {
    expect(await validateVideoFile(makeFile(aviHead(), 'clip.avi', 'video/x-msvideo'))).toBeNull();
  });

  it('rejects a file whose contents are not video (never trust the extension)', async () => {
    const fake = makeFile(asciiBytes('this is plain text, not video at all'), 'clip.mp4', 'video/mp4');
    await expect(validateVideoFile(fake)).resolves.toMatch(/not a recognized video/);
  });

  it('still enforces size and extension before sniffing', async () => {
    const fake = makeFile(mp4Head(), 'clip.exe', 'application/octet-stream');
    await expect(validateVideoFile(fake)).resolves.toMatch(/not an allowed video type/);
  });
});

describe('validatePhotoFile (content sniffing)', () => {
  it('accepts a real JPEG payload behind a .jpg extension', async () => {
    const jpeg = bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0);
    expect(await validatePhotoFile(makeFile(jpeg, 'shot.jpg', 'image/jpeg'))).toBeNull();
  });

  it('rejects a file whose contents are not an image', async () => {
    const fake = makeFile(asciiBytes('definitely not an image payload'), 'shot.jpg', 'image/jpeg');
    await expect(validatePhotoFile(fake)).resolves.toMatch(/not a recognized image/);
  });

  it('still enforces extension before sniffing', async () => {
    const fake = makeFile(mp4Head(), 'shot.mp4', 'video/mp4');
    await expect(validatePhotoFile(fake)).resolves.toMatch(/not an allowed image type/);
  });
});

describe('storagePathFromUrl', () => {
  it('parses public object URLs', () => {
    expect(
      storagePathFromUrl('https://proj.supabase.co/storage/v1/object/public/match-videos/uid/a.mp4')
    ).toEqual({ bucket: 'match-videos', path: 'uid/a.mp4' });
  });

  it('parses signed object URLs and ignores the token', () => {
    expect(
      storagePathFromUrl('https://proj.supabase.co/storage/v1/object/sign/match-photos/uid/a.jpg?token=abc')
    ).toEqual({ bucket: 'match-photos', path: 'uid/a.jpg' });
  });

  it('parses render/image URLs', () => {
    expect(
      storagePathFromUrl('https://proj.supabase.co/storage/v1/render/image/public/fowl-images/fowl/a.jpg?width=100')
    ).toEqual({ bucket: 'fowl-images', path: 'fowl/a.jpg' });
  });

  it('decodes encoded path segments', () => {
    expect(
      storagePathFromUrl('https://proj.supabase.co/storage/v1/object/public/fowl-images/fowl/a%20b.jpg')
    ).toEqual({ bucket: 'fowl-images', path: 'fowl/a b.jpg' });
  });

  it('returns null for non-storage URLs', () => {
    expect(storagePathFromUrl('https://example.com/some/page')).toBeNull();
    expect(storagePathFromUrl('')).toBeNull();
    expect(storagePathFromUrl('https://proj.supabase.co/storage/v1/bucket-only')).toBeNull();
  });
});

describe('thumbUrl', () => {
  it('rewrites public object URLs into render/image URLs with size params', () => {
    const out = thumbUrl('https://proj.supabase.co/storage/v1/object/public/fowl-images/fowl/a.jpg', 200);
    expect(out).toBe(
      'https://proj.supabase.co/storage/v1/render/image/public/fowl-images/fowl/a.jpg?width=200&height=200&resize=cover'
    );
  });

  it('leaves non-public URLs (signed, private, external) untouched', () => {
    const signed = 'https://proj.supabase.co/storage/v1/object/sign/match-photos/u/a.jpg?token=t';
    expect(thumbUrl(signed)).toBe(signed);
    const external = 'https://cdn.example.com/pic.png';
    expect(thumbUrl(external)).toBe(external);
    expect(thumbUrl('')).toBe('');
  });
});

describe('formatBytes', () => {
  it('formats byte counts for humans', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5 MB');
    expect(formatBytes(1.5 * 1024 * 1024 * 1024)).toBe('1.5 GB');
  });
});
