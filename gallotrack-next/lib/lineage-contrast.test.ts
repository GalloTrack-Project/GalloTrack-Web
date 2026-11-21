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

describe('Lineage Directory heritage contrast', () => {
  it('keeps text pairs at WCAG AA in both modes', () => {
    for (const mode of modes) {
      const t = getThemeTokens('heritage', mode);
      const pairs: Array<[string, string, string]> = [
        ['primary button', t.primaryForeground, t.primary],
        ['pair hub', t.lowSample, t.lowSampleBg],
        ['banner title', t.foreground, t.card],
        ['banner subtitle', t.mutedForeground, t.card],
        ['insights tile', t.cardForeground, t.muted],
        ['active status', t.win, t.winBg],
        ['archived status', t.lowSample, t.lowSampleBg],
        ['deceased status', t.loss, t.lossBg],
        ['cock label', t.cock, t.cockBg],
        ['hen label', t.hen, t.henBg],
        ['primary link on accent soft', t.primary, t.accentSoft],
      ];
      for (const [name, foreground, background] of pairs) {
        expect(contrast(foreground, background), `${mode}: ${name}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('keeps connectors and the decorative orange at 3:1 or better', () => {
    for (const mode of modes) {
      const t = getThemeTokens('heritage', mode);
      expect(
        contrast(t.inputBorder, t.background),
        `${mode}: connectors`,
      ).toBeGreaterThanOrEqual(3);
      expect(
        contrast(t.brandOrange, t.background),
        `${mode}: orange focus`,
      ).toBeGreaterThanOrEqual(3);
    }
  });
});
