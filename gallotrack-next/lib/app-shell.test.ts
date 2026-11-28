import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { BRAND_TAGLINE_KEY } from './brand-tagline';
import { en } from './i18n/en';
import { tl } from './i18n/tl';
import { hil } from './i18n/hil';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('shared shell alignment', () => {
  it('uses one translated tagline constant for the sidebar and footer band', () => {
    expect(BRAND_TAGLINE_KEY).toBe('heritage.footerTagline');
    const layout = read('app/(dashboard)/layout.tsx');
    expect(layout.split('BRAND_TAGLINE_KEY').length - 1).toBeGreaterThanOrEqual(2);
    for (const dictionary of [en, tl, hil]) {
      expect(dictionary.heritage.footerTagline.trim().length).toBeGreaterThan(0);
    }
  });

  it('renders the breadcrumb and visible header utilities, with a mobile overflow menu fallback', () => {
    const layout = read('app/(dashboard)/layout.tsx');
    expect(layout).toContain("t('header.portal')");
    expect(layout).toContain('CompactLanguageSwitcher');
    expect(layout).toContain('NotificationBell');
    expect(layout).toContain("t('header.settings')");
    expect(layout).toContain("t('header.toggleTheme')");
    expect(layout).toContain('hidden items-center gap-1.5 md:flex');
  });

  it('shows the capstone badge, version, connection state, and offline warning in the sidebar', () => {
    const layout = read('app/(dashboard)/layout.tsx');
    expect(layout).toContain("t('heritage.capstoneBadge')");
    expect(layout).toContain("t('nav.version')");
    expect(layout).toContain('online={!fowl.loadError}');
    expect(layout).toContain("t('heritage.onlineStatus')");
    expect(layout).toContain("t('heritage.offlineStatus')");
    expect(layout).toContain("t('heritage.offlineTooltip')");
  });
});

describe('Breeding Hub presentation source', () => {
  it('uses a local farm photo and no external image URLs', () => {
    const source = read('components/BreedingHub.tsx');
    expect(source).toContain('/images/hero-farm.jpg');
    expect(source).not.toMatch(/(?:src|href)=["'`]?https?:\/\//i);
    expect(source).not.toMatch(/url\(\s*["']?https?:\/\//i);
    expect(source).not.toContain('Left Leg');
  });

  it('builds the offspring examples from the real code generator', () => {
    const source = read('components/BreedingHub.tsx');
    expect(source).toContain('offspringBase(');
    expect(source).toContain('offspringExample1');
    expect(source).not.toContain('1A.');
  });
});
