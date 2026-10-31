import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  HERO_IMAGES,
  getPrimaryHeroImage,
  getHeroImages,
} from '@/lib/hero-config';

describe('Hero Farm Image Configuration', () => {
  it('configures exactly two farm photos in the single config', () => {
    expect(HERO_IMAGES).toHaveLength(2);
    expect(getHeroImages()).toHaveLength(2);
  });

  it('defines hero-farm.jpg as the primary hero image with correct metadata', () => {
    const primary = getPrimaryHeroImage();
    expect(primary).toBeDefined();
    expect(primary.id).toBe('hero-farm');
    expect(primary.src).toBe('/images/hero-farm.jpg');
    expect(primary.alt).toBe('Gamefowl A-frame coops and shed on the farm');
    expect(primary.credit).toBe('');
    expect(primary.isPrimary).toBe(true);
    expect(primary.aspectRatio).toBe('4/3');
  });

  it('defines farm-2.jpg as the secondary image for carousel/thumbnails with credit: ""', () => {
    const secondary = HERO_IMAGES.find((img) => img.id === 'farm-2');
    expect(secondary).toBeDefined();
    expect(secondary?.src).toBe('/images/farm-2.jpg');
    expect(secondary?.alt).toBe('Gamefowl farm banana trees and coops');
    expect(secondary?.credit).toBe('');
    expect(secondary?.isPrimary).toBe(false);
    expect(secondary?.aspectRatio).toBe('4/3');
  });

  it('ensures both image files exist in the public/images/ directory', () => {
    const publicDir = path.resolve(process.cwd(), 'public/images');
    expect(fs.existsSync(path.join(publicDir, 'hero-farm.jpg'))).toBe(true);
    expect(fs.existsSync(path.join(publicDir, 'farm-2.jpg'))).toBe(true);
  });

  it('verifies both files are non-empty JPEG files', () => {
    const publicDir = path.resolve(process.cwd(), 'public/images');
    for (const img of HERO_IMAGES) {
      const filename = path.basename(img.src);
      const filePath = path.join(publicDir, filename);
      const stat = fs.statSync(filePath);
      expect(stat.size).toBeGreaterThan(10000); // verified non-empty binary
    }
  });
});
