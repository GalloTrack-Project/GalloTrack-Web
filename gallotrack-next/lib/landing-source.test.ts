import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { HERO_SLIDES } from '@/lib/hero-slides';
import { tl } from '@/lib/i18n/tl';
import { hil } from '@/lib/i18n/hil';

const root = process.cwd();
const landingFiles = [
  'app/page.tsx',
  'app/about/page.tsx',
  'lib/hero-config.ts',
  'lib/hero-slides.ts',
  'components/hero/HeroCarousel.tsx',
  ...fs
    .readdirSync(path.join(root, 'components/landing'))
    .filter((file) => file.endsWith('.tsx') && !file.endsWith('.test.tsx'))
    .map((file) => `components/landing/${file}`),
  ...fs
    .readdirSync(path.join(root, 'components/about'))
    .filter((file) => file.endsWith('.tsx') && !file.endsWith('.test.tsx'))
    .map((file) => `components/about/${file}`),
  ...fs
    .readdirSync(path.join(root, 'components/auth'))
    .filter((file) => file.endsWith('.tsx') && !file.endsWith('.test.tsx'))
    .map((file) => `components/auth/${file}`),
];

describe('Landing page source rules', () => {
  it('uses local, swappable hero slide paths and data-driven captions', () => {
    for (const slide of HERO_SLIDES) {
      expect(slide.src).toMatch(/^\/images\/hero\/[a-z0-9-]+\.webp$/);
      expect(slide.alt.length).toBeGreaterThan(10);
      expect(slide.caption.length).toBeGreaterThan(5);
      expect(slide.captionKey.startsWith('landing.')).toBe(true);
      expect(slide.caption).not.toMatch(/banana/i);
    }
  });

  it('has no external image URLs or hotlinked image backgrounds', () => {
    for (const file of landingFiles) {
      const source = fs.readFileSync(path.join(root, file), 'utf8');
      expect(source, file).not.toMatch(/(?:src|href)=["'`{]?https?:\/\//i);
      expect(source, file).not.toMatch(/url\(\s*["']?https?:\/\//i);
    }
  });

  it('translates the new landing feature labels in Tagalog and Hiligaynon', () => {
    expect(tl.landing.featureRegistryTitle).not.toBe('Chicken Registry');
    expect(tl.landing.featureNotificationsTitle).toBe('Mga Abiso');
    expect(hil.landing.featureRegistryTitle).toBe('Listahan sang Manok');
    expect(hil.landing.featureNotificationsTitle).toBe('Mga Pahibalo');
  });
});
