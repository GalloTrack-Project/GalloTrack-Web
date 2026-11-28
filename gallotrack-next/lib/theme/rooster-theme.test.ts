import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ACTIVE_THEME_PRESET,
  THEME_PRESETS,
  getThemeTokens,
  type ThemeMode,
  type ThemePresetName,
  type ThemeTokens,
} from './heritage';

function luminance(hex: string): number {
  const value = hex.replace('#', '');
  const rgb = [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16) / 255);
  const linear = rgb.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(foreground: string, background: string): number {
  const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

const presets = Object.keys(THEME_PRESETS) as ThemePresetName[];
const modes: ThemeMode[] = ['light', 'dark'];

const requiredSemanticTokens: Array<keyof ThemeTokens> = [
  'background',
  'surface',
  'surfaceRaised',
  'border',
  'text',
  'textMuted',
  'brand',
  'brandStrong',
  'brandForeground',
  'accentGold',
  'accentGoldSoft',
  'success',
  'warning',
  'danger',
  'info',
  'focusRing',
  'sidebarGradientFrom',
  'sidebarGradientVia',
  'sidebarGradientTo',
];

const textPairs: Array<[keyof ThemeTokens, keyof ThemeTokens]> = [
  ['text', 'background'],
  ['text', 'surface'],
  ['textMuted', 'background'],
  ['textMuted', 'surface'],
  ['brandForeground', 'brand'],
  ['brandForeground', 'brandStrong'],
  ['text', 'accentGoldSoft'],
  ['success', 'surface'],
  ['warning', 'surface'],
  ['danger', 'surface'],
  ['info', 'surface'],
  ['sidebarForeground', 'sidebarGradientFrom'],
  ['sidebarForeground', 'sidebarGradientVia'],
  ['sidebarForeground', 'sidebarGradientTo'],
  ['sidebarMuted', 'sidebarGradientFrom'],
  ['sidebarMuted', 'sidebarGradientVia'],
  ['sidebarMuted', 'sidebarGradientTo'],
];

describe('rooster theme tokens', () => {
  it('ships every required semantic token for the default heritage preset in both modes', () => {
    expect(ACTIVE_THEME_PRESET).toBe('heritage');
    for (const mode of modes) {
      const tokens = getThemeTokens('heritage', mode);
      for (const key of requiredSemanticTokens) {
        expect(tokens[key], `${mode}: ${key}`).toMatch(/^#[0-9A-F]{6}$/i);
      }
    }
  });

  it('keeps all text, semantic, sidebar and chip pairs at WCAG AA in both themes', () => {
    for (const preset of presets) {
      for (const mode of modes) {
        const tokens = getThemeTokens(preset, mode);
        for (const [fg, bg] of textPairs) {
          expect(
            contrast(tokens[fg], tokens[bg]),
            `${preset}/${mode}: ${String(fg)} on ${String(bg)}`,
          ).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });

  it('keeps focus rings visible at 3:1 and the gold accent distinct from danger', () => {
    for (const mode of modes) {
      const tokens = getThemeTokens('heritage', mode);
      expect(contrast(tokens.focusRing, tokens.background), `${mode}: focus ring`).toBeGreaterThanOrEqual(3);
      expect(contrast(tokens.focusRing, tokens.surface), `${mode}: focus ring surface`).toBeGreaterThanOrEqual(3);
      expect(tokens.brand).not.toBe(tokens.danger);
      expect(tokens.accentGold).not.toBe(tokens.danger);
    }
  });

  it('uses the rooster light/dark baseline for the app theme by default', () => {
    const layout = readFileSync(join(process.cwd(), 'app/layout.tsx'), 'utf8');
    expect(layout).toContain('Manrope');
    expect(layout).toContain('defaultTheme="light"');
    expect(layout).toContain('${manrope.variable}');
  });
});
