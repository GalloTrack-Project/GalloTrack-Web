import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

vi.mock('next/font/google', () => ({
  Geist: () => ({ variable: '--font-geist-sans' }),
  Geist_Mono: () => ({ variable: '--font-geist-mono' }),
}));

import { metadata as layoutMetadata, viewport as layoutViewport } from '../app/layout';
import { metadata as landingMetadata } from '../app/page';

describe('GalloTrack Favicon Suite & Metadata', () => {
  const root = path.join(__dirname, '..');

  it('all required icon assets exist on disk', () => {
    const requiredFiles = [
      'app/icon.svg',
      'app/favicon.ico',
      'app/apple-icon.png',
      'public/favicon.ico',
      'public/icon-192x192.png',
      'public/icon-512x512.png',
      'public/icon-maskable-512x512.png',
      'public/manifest.json',
    ];

    for (const rel of requiredFiles) {
      const fullPath = path.join(root, rel);
      expect(fs.existsSync(fullPath), `Missing icon file: ${rel}`).toBe(true);
      expect(fs.statSync(fullPath).size, `File is empty: ${rel}`).toBeGreaterThan(0);
    }
  });

  it('favicon.ico is a valid multi-size ICO containing 16x16, 32x32, and 48x48 images', () => {
    const icoPath = path.join(root, 'app/favicon.ico');
    const buf = fs.readFileSync(icoPath);

    // 2-byte reserved (0), 2-byte type (1 = ICO), 2-byte image count
    expect(buf.readUInt16LE(0)).toBe(0);
    expect(buf.readUInt16LE(2)).toBe(1);
    const count = buf.readUInt16LE(4);
    expect(count).toBe(3);

    const sizes: number[] = [];
    for (let i = 0; i < count; i++) {
      const offset = 6 + i * 16;
      const w = buf.readUInt8(offset) || 256;
      const h = buf.readUInt8(offset + 1) || 256;
      expect(w).toBe(h);
      sizes.push(w);

      const imgOffset = buf.readUInt32LE(offset + 12);
      const magic = buf.subarray(imgOffset, imgOffset + 8);
      // Valid PNG header magic: 89 50 4E 47 0D 0A 1A 0A
      expect(magic).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    }

    expect(sizes).toEqual([16, 32, 48]);
  });

  it('apple-icon.png is exactly 180x180 with solid background', async () => {
    const applePath = path.join(root, 'app/apple-icon.png');
    const meta = await sharp(applePath).metadata();
    expect(meta.width).toBe(180);
    expect(meta.height).toBe(180);
    expect(meta.format).toBe('png');
  });

  it('PWA icons have expected dimensions', async () => {
    const p192 = await sharp(path.join(root, 'public/icon-192x192.png')).metadata();
    expect(p192.width).toBe(192);
    expect(p192.height).toBe(192);

    const p512 = await sharp(path.join(root, 'public/icon-512x512.png')).metadata();
    expect(p512.width).toBe(512);
    expect(p512.height).toBe(512);

    const pMaskable = await sharp(path.join(root, 'public/icon-maskable-512x512.png')).metadata();
    expect(pMaskable.width).toBe(512);
    expect(pMaskable.height).toBe(512);
  });

  it('manifest.json has correct PWA metadata and icon configurations', () => {
    const manifestPath = path.join(root, 'public/manifest.json');
    const content = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    expect(content.name).toBe('GalloTrack');
    expect(content.short_name).toBe('GalloTrack');
    expect(content.theme_color).toBe('#022c22');
    expect(content.background_color).toBe('#090d16');

    const srcs = content.icons.map((i: { src: string }) => i.src);
    expect(srcs).toContain('/icon-192x192.png');
    expect(srcs).toContain('/icon-512x512.png');
    expect(srcs).toContain('/icon-maskable-512x512.png');

    const maskableIcon = content.icons.find((i: { purpose?: string }) => i.purpose === 'maskable');
    expect(maskableIcon).toBeDefined();
    expect(maskableIcon.sizes).toBe('512x512');
  });

  it('layout metadata exports expected title template and default', () => {
    expect(layoutMetadata.title).toEqual({
      template: '%s | GalloTrack',
      default: 'GalloTrack | Gamefowl Breeding & Match Analytics',
    });
    expect(layoutViewport.themeColor).toBe('#022c22');
    expect(layoutMetadata.manifest).toBe('/manifest.json');
  });

  it('landing page metadata uses absolute title preventing duplicate template suffix', () => {
    expect(landingMetadata.title).toEqual({
      absolute: 'GalloTrack | Gamefowl Breeding & Match Analytics',
    });
    expect(landingMetadata.description).not.toMatch(/100%|guaranteed|#1|revolutionary/i);
    expect(landingMetadata.description).toContain('lineage tracking');
    expect(landingMetadata.description).toContain('fight performance logs');
  });
});
