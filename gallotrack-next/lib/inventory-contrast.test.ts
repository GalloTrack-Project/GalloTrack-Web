import { describe, expect, it } from 'vitest';
import { getThemeTokens, type ThemeMode } from './theme/heritage';

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

const modes: ThemeMode[] = ['light', 'dark'];

describe('Chicken Inventory heritage contrast', () => {
  it.each(modes)('keeps inventory text and chip pairs at WCAG AA in %s mode', (mode) => {
    const tokens = getThemeTokens('heritage', mode);
    const pairs: Array<[string, string, string]> = [
      ['body text', tokens.text, tokens.background],
      ['card text', tokens.cardForeground, tokens.card],
      ['muted text', tokens.mutedForeground, tokens.background],
      ['muted text on card', tokens.mutedForeground, tokens.card],
      ['active tab', tokens.brandForeground, tokens.brand],
      ['primary button', tokens.primaryForeground, tokens.primary],
      ['strain chip', tokens.foreground, tokens.accentGoldSoft],
      ['status active', tokens.win, tokens.winBg],
      ['status archived', tokens.lowSample, tokens.lowSampleBg],
      ['status deceased', tokens.loss, tokens.lossBg],
      ['cock chip', tokens.cock, tokens.cockBg],
      ['hen chip', tokens.hen, tokens.henBg],
      ['sidebar text', tokens.sidebarForeground, tokens.sidebarGradientFrom],
      ['sidebar muted', tokens.sidebarMuted, tokens.sidebarGradientFrom],
    ];

    for (const [name, foreground, background] of pairs) {
      expect(contrast(foreground, background), `${mode}: ${name}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each(modes)('keeps inventory focus and border tokens visible in %s mode', (mode) => {
    const tokens = getThemeTokens('heritage', mode);
    expect(contrast(tokens.focusRing, tokens.background), `${mode}: focus on page`).toBeGreaterThanOrEqual(3);
    expect(contrast(tokens.focusRing, tokens.card), `${mode}: focus on card`).toBeGreaterThanOrEqual(3);
  });
});
