export type ChartTokens = {
  success: string;
  warning: string;
  danger: string;
  info: string;
  foreground: string;
  mutedForeground: string;
  border: string;
  card: string;
  series: string[];
};

const FALLBACK_LIGHT: ChartTokens = {
  success: '#047857',
  warning: '#b45309',
  danger: '#be123c',
  info: '#0369a1',
  foreground: '#0f172a',
  mutedForeground: '#64748b',
  border: '#e2e8f0',
  card: '#ffffff',
  series: ['#047857', '#0369a1', '#b45309', '#be123c', '#64748b', '#0f172a'],
};

const FALLBACK_DARK: ChartTokens = {
  success: '#4ade80',
  warning: '#fbbf24',
  danger: '#fb7185',
  info: '#7dd3fc',
  foreground: '#e2e8f0',
  mutedForeground: '#94a3b8',
  border: '#1e293b',
  card: '#0f172a',
  series: ['#4ade80', '#7dd3fc', '#fbbf24', '#fb7185', '#94a3b8', '#e2e8f0'],
};

/**
 * Chart.js draws to a canvas, so it cannot consume CSS custom properties the
 * way a styled element can. This reads the live token values instead of
 * hardcoding hexes, which is what keeps a series colour in step with the
 * verified contrast values in both themes.
 *
 * `theme` is only consulted during SSR, where `document` is absent and the
 * resolved theme is not knowable — so the values are recomputed whenever it
 * changes.
 */
export function readChartTokens(theme?: string): ChartTokens {
  if (typeof document === 'undefined') {
    return theme === 'dark' ? FALLBACK_DARK : FALLBACK_LIGHT;
  }

  const style = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;

  const success = read('--success', FALLBACK_LIGHT.success);
  const warning = read('--warning', FALLBACK_LIGHT.warning);
  const danger = read('--danger', FALLBACK_LIGHT.danger);
  const info = read('--info', FALLBACK_LIGHT.info);
  const foreground = read('--foreground', FALLBACK_LIGHT.foreground);
  const mutedForeground = read('--muted-foreground', FALLBACK_LIGHT.mutedForeground);
  const border = read('--border', FALLBACK_LIGHT.border);
  const card = read('--card', FALLBACK_LIGHT.card);

  return {
    success,
    warning,
    danger,
    info,
    foreground,
    mutedForeground,
    border,
    card,
    // Six distinct, contrast-verified values — a categorical palette that needs
    // no hex of its own because every entry is already a theme-tested token.
    series: [success, info, warning, danger, mutedForeground, foreground],
  };
}

/** `#rrggbb` (or `#rgb`) → `rgba(r, g, b, a)`, for canvas fills. */
export function withAlpha(hex: string, alpha: number): string {
  const normalized = hex.trim().replace('#', '');
  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => char + char)
          .join('')
      : normalized;

  if (full.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(full)) return hex;

  const value = Number.parseInt(full, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
