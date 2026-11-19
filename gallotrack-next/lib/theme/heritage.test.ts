import { describe, expect, it } from 'vitest';
import {
  ACTIVE_THEME_PRESET,
  STRAIN_COLORS,
  THEME_PRESETS,
  getThemeTokens,
  strainColor,
  themeCssVariables,
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

const textPairs: Array<[keyof ThemeTokens, keyof ThemeTokens]> = [
  ['foreground', 'background'],
  ['cardForeground', 'card'],
  ['mutedForeground', 'card'],
  ['accent', 'background'],
  ['accent', 'card'],
  ['brandRed', 'background'],
  ['brandRed', 'card'],
  ['brandRed', 'accentSoft'],
  ['sidebarForeground', 'heroStart'],
  ['sidebarForeground', 'heroMid'],
  ['sidebarMuted', 'heroMid'],
  ['sidebarMuted', 'sidebarEnd'],
  ['sidebarForeground', 'sidebar'],
  ['sidebarForeground', 'sidebarEnd'],
  ['sidebarActiveForeground', 'sidebarActive'],
  ['sidebarMuted', 'sidebar'],
  ['win', 'winBg'],
  ['loss', 'lossBg'],
  ['draw', 'drawBg'],
  ['lowSample', 'lowSampleBg'],
  ['cock', 'cockBg'],
  ['hen', 'henBg'],
];

describe('heritage theme tokens', () => {
  it('ships both presets in light and dark with the default set to heritage', () => {
    expect(ACTIVE_THEME_PRESET).toBe('heritage');
    expect(presets.sort()).toEqual(['green', 'heritage']);
    for (const preset of presets) {
      for (const mode of modes) {
        expect(getThemeTokens(preset, mode).background).toMatch(/^#[0-9A-F]{6}$/i);
      }
    }
  });

  it('meets WCAG AA for every semantic text/status pair in both presets and modes', () => {
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

  it('keeps the orange decorative accent at 3:1 or better on the page background', () => {
    for (const preset of presets) {
      for (const mode of modes) {
        const tokens = getThemeTokens(preset, mode);
        expect(
          contrast(tokens.brandOrange, tokens.background),
          `${preset}/${mode}: brand orange`,
        ).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('exposes every token as a CSS variable and reuses fixed strain colors', () => {
    const tokens = getThemeTokens('heritage', 'light');
    const vars = themeCssVariables(tokens);
    expect(Object.keys(vars)).toHaveLength(Object.keys(tokens).length);
    expect(strainColor('Lemon')).toBe(STRAIN_COLORS.Lemon);
    expect(strainColor('lemon')).toBe(STRAIN_COLORS.Lemon);
    expect(strainColor('Unknown strain A')).toBe(strainColor('Unknown strain A'));
  });
});
