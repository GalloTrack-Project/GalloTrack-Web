import { describe, expect, it } from 'vitest';
import { getThemeTokens, type ThemeMode, type ThemeTokens } from './theme/heritage';

function channel(hex: string): number[] {
  return hex
    .replace('#', '')
    .match(/../g)!
    .map((part) => parseInt(part, 16) / 255);
}

function luminance(hex: string): number {
  const [r, g, b] = channel(hex).map((value) =>
    value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(foreground: string, background: string): number {
  const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

const PAIRS: Array<[string, (tokens: ThemeTokens) => string, (tokens: ThemeTokens) => string]> = [
  ['body text', (tokens) => tokens.foreground, (tokens) => tokens.background],
  ['card text', (tokens) => tokens.cardForeground, (tokens) => tokens.card],
  ['muted text', (tokens) => tokens.mutedForeground, (tokens) => tokens.background],
  ['primary button', (tokens) => tokens.primaryForeground, (tokens) => tokens.primary],
  ['active tab', (tokens) => tokens.sidebarForeground, (tokens) => tokens.sidebar],
  ['sidebar tagline', (tokens) => tokens.sidebarMuted, (tokens) => tokens.sidebar],
  ['cock tint', (tokens) => tokens.cock, (tokens) => tokens.cockBg],
  ['hen tint', (tokens) => tokens.hen, (tokens) => tokens.henBg],
  ['offspring tint', (tokens) => tokens.success, (tokens) => tokens.winBg],
  ['warning tint', (tokens) => tokens.warning, (tokens) => tokens.lowSampleBg],
  ['danger tint', (tokens) => tokens.danger, (tokens) => tokens.lossBg],
  ['accent tint', (tokens) => tokens.primary, (tokens) => tokens.accentSoft],
];

describe('Breeding Hub token contrast', () => {
  it.each(['light', 'dark'] as ThemeMode[])('meets WCAG AA in %s mode', (mode) => {
    const tokens = getThemeTokens('heritage', mode);

    for (const [label, foreground, background] of PAIRS) {
      const ratio = contrast(foreground(tokens), background(tokens));
      expect(ratio, `${label} (${mode})`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
