export type ThemeMode = 'light' | 'dark';
export type ThemePresetName = 'heritage' | 'green';

export type ThemeTokens = {
  background: string;
  surface: string;
  surfaceRaised: string;
  border: string;
  text: string;
  textMuted: string;
  brand: string;
  brandStrong: string;
  brandForeground: string;
  accentGold: string;
  accentGoldSoft: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  focusRing: string;
  sidebarGradientFrom: string;
  sidebarGradientVia: string;
  sidebarGradientTo: string;

  /** Legacy aliases retained for the existing shell and feature components. */
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  muted: string;
  mutedForeground: string;
  input: string;
  inputBorder: string;
  primary: string;
  primaryForeground: string;
  accent: string;
  accentForeground: string;
  accentSoft: string;
  ring: string;
  sidebar: string;
  sidebarEnd: string;
  sidebarForeground: string;
  sidebarMuted: string;
  sidebarActive: string;
  sidebarActiveForeground: string;
  brandOrange: string;
  brandRed: string;
  brandGold: string;
  heroStart: string;
  heroMid: string;
  heroEnd: string;
  win: string;
  winBg: string;
  loss: string;
  lossBg: string;
  draw: string;
  drawBg: string;
  lowSample: string;
  lowSampleBg: string;
  cock: string;
  cockBg: string;
  hen: string;
  henBg: string;
};

export const ACTIVE_THEME_PRESET: ThemePresetName = 'heritage';

export const THEME_PRESETS: Record<ThemePresetName, Record<ThemeMode, ThemeTokens>> = {
  heritage: {
    light: {
      background: '#FFF8ED',
      surface: '#FFFDF8',
      surfaceRaised: '#FFFFFF',
      border: '#E5CDB8',
      text: '#2A1712',
      textMuted: '#6B4A3B',
      brand: '#A80F17',
      brandStrong: '#7A0910',
      brandForeground: '#FFFFFF',
      accentGold: '#B45309',
      accentGoldSoft: '#FCEBC1',
      success: '#166534',
      warning: '#92400E',
      danger: '#7F1D1D',
      info: '#1D4ED8',
      focusRing: '#B45309',
      sidebarGradientFrom: '#65070B',
      sidebarGradientVia: '#8B0E14',
      sidebarGradientTo: '#B01218',
      foreground: '#2A1712',
      card: '#FFFDF8',
      cardForeground: '#2A1712',
      popover: '#FFFFFF',
      popoverForeground: '#2A1712',
      muted: '#F7E9DA',
      mutedForeground: '#6B4A3B',
      input: '#FFFFFF',
      inputBorder: '#8A5A4A',
      primary: '#A80F17',
      primaryForeground: '#FFFFFF',
      accent: '#B45309',
      accentForeground: '#FFFFFF',
      accentSoft: '#FCEBC1',
      ring: '#B45309',
      sidebar: '#65070B',
      sidebarEnd: '#B01218',
      sidebarForeground: '#FFFFFF',
      sidebarMuted: '#FFE8DE',
      sidebarActive: '#C2410C',
      sidebarActiveForeground: '#FFFFFF',
      brandOrange: '#B45309',
      brandRed: '#B3200F',
      brandGold: '#FFD21F',
      heroStart: '#65070B',
      heroMid: '#A80F17',
      heroEnd: '#B45309',
      win: '#166534',
      winBg: '#DCFCE7',
      loss: '#7F1D1D',
      lossBg: '#FEE2E2',
      draw: '#475569',
      drawBg: '#E2E8F0',
      lowSample: '#92400E',
      lowSampleBg: '#FEF3C7',
      cock: '#1D4ED8',
      cockBg: '#DBEAFE',
      hen: '#BE185D',
      henBg: '#FCE7F3',
    },
    dark: {
      background: '#140B09',
      surface: '#1F1311',
      surfaceRaised: '#2A1916',
      border: '#4A2C24',
      text: '#FBEFE9',
      textMuted: '#D6BDB1',
      brand: '#C21A1A',
      brandStrong: '#8F1016',
      brandForeground: '#FFFFFF',
      accentGold: '#FCD34D',
      accentGoldSoft: '#3A2406',
      success: '#86EFAC',
      warning: '#FCD34D',
      danger: '#FDA4AF',
      info: '#93C5FD',
      focusRing: '#FCD34D',
      sidebarGradientFrom: '#3B0407',
      sidebarGradientVia: '#6E090E',
      sidebarGradientTo: '#9B1016',
      foreground: '#FBEFE9',
      card: '#1F1311',
      cardForeground: '#FBEFE9',
      popover: '#2A1916',
      popoverForeground: '#FBEFE9',
      muted: '#2A1916',
      mutedForeground: '#D6BDB1',
      input: '#2A1916',
      inputBorder: '#A97866',
      primary: '#FCA5A5',
      primaryForeground: '#1A0B07',
      accent: '#FCD34D',
      accentForeground: '#1A0B07',
      accentSoft: '#3A2406',
      ring: '#FCD34D',
      sidebar: '#3B0407',
      sidebarEnd: '#9B1016',
      sidebarForeground: '#FFF7F2',
      sidebarMuted: '#E8C9BB',
      sidebarActive: '#F0B429',
      sidebarActiveForeground: '#1A0B07',
      brandOrange: '#FCD34D',
      brandRed: '#FCA5A5',
      brandGold: '#FFD21F',
      heroStart: '#3B0407',
      heroMid: '#8F1016',
      heroEnd: '#C21A1A',
      win: '#86EFAC',
      winBg: '#14351F',
      loss: '#FDA4AF',
      lossBg: '#4C0519',
      draw: '#CBD5E1',
      drawBg: '#1E293B',
      lowSample: '#FCD34D',
      lowSampleBg: '#3A2406',
      cock: '#93C5FD',
      cockBg: '#172554',
      hen: '#F9A8D4',
      henBg: '#500724',
    },
  },
  green: {
    light: {
      background: '#F8FAFC',
      surface: '#FFFFFF',
      surfaceRaised: '#FFFFFF',
      border: '#E2E8F0',
      text: '#0F172A',
      textMuted: '#64748B',
      brand: '#065F46',
      brandStrong: '#022C22',
      brandForeground: '#FFFFFF',
      accentGold: '#B45309',
      accentGoldSoft: '#FEF3C7',
      success: '#065F46',
      warning: '#92400E',
      danger: '#9F1239',
      info: '#075985',
      focusRing: '#065F46',
      sidebarGradientFrom: '#065F46',
      sidebarGradientVia: '#044C3A',
      sidebarGradientTo: '#022C22',
      foreground: '#0F172A',
      card: '#FFFFFF',
      cardForeground: '#0F172A',
      popover: '#FFFFFF',
      popoverForeground: '#0F172A',
      muted: '#F1F5F9',
      mutedForeground: '#64748B',
      input: '#FFFFFF',
      inputBorder: '#6B7C93',
      primary: '#065F46',
      primaryForeground: '#FFFFFF',
      accent: '#065F46',
      accentForeground: '#FFFFFF',
      accentSoft: '#D1FAE5',
      ring: '#0F172A',
      sidebar: '#065F46',
      sidebarEnd: '#022C22',
      sidebarForeground: '#FFFFFF',
      sidebarMuted: '#D1FAE5',
      sidebarActive: '#047857',
      sidebarActiveForeground: '#FFFFFF',
      brandOrange: '#047857',
      brandRed: '#065F46',
      brandGold: '#FFD21F',
      heroStart: '#022C22',
      heroMid: '#065F46',
      heroEnd: '#047857',
      win: '#166534',
      winBg: '#DCFCE7',
      loss: '#9F1239',
      lossBg: '#FFE4E6',
      draw: '#475569',
      drawBg: '#E2E8F0',
      lowSample: '#92400E',
      lowSampleBg: '#FEF3C7',
      cock: '#1D4ED8',
      cockBg: '#DBEAFE',
      hen: '#BE185D',
      henBg: '#FCE7F3',
    },
    dark: {
      background: '#090D16',
      surface: '#0F172A',
      surfaceRaised: '#1E293B',
      border: '#1E293B',
      text: '#E2E8F0',
      textMuted: '#94A3B8',
      brand: '#047857',
      brandStrong: '#022C22',
      brandForeground: '#FFFFFF',
      accentGold: '#FBBF24',
      accentGoldSoft: '#3A2406',
      success: '#4ADE80',
      warning: '#FBBF24',
      danger: '#FDA4AF',
      info: '#7DD3FC',
      focusRing: '#E2E8F0',
      sidebarGradientFrom: '#065F46',
      sidebarGradientVia: '#044E37',
      sidebarGradientTo: '#022C22',
      foreground: '#E2E8F0',
      card: '#0F172A',
      cardForeground: '#E2E8F0',
      popover: '#0F172A',
      popoverForeground: '#E2E8F0',
      muted: '#1E293B',
      mutedForeground: '#94A3B8',
      input: '#1E293B',
      inputBorder: '#64748B',
      primary: '#047857',
      primaryForeground: '#FFFFFF',
      accent: '#10B981',
      accentForeground: '#04210F',
      accentSoft: '#052E1B',
      ring: '#E2E8F0',
      sidebar: '#065F46',
      sidebarEnd: '#022C22',
      sidebarForeground: '#FFFFFF',
      sidebarMuted: '#A7F3D0',
      sidebarActive: '#047857',
      sidebarActiveForeground: '#FFFFFF',
      brandOrange: '#34D399',
      brandRed: '#5EEAD4',
      brandGold: '#FFD21F',
      heroStart: '#022C22',
      heroMid: '#065F46',
      heroEnd: '#047857',
      win: '#86EFAC',
      winBg: '#14351F',
      loss: '#FDA4AF',
      lossBg: '#4C0519',
      draw: '#CBD5E1',
      drawBg: '#1E293B',
      lowSample: '#FCD34D',
      lowSampleBg: '#3A2406',
      cock: '#93C5FD',
      cockBg: '#172554',
      hen: '#F9A8D4',
      henBg: '#500724',
    },
  },
};

export function getThemeTokens(
  preset: ThemePresetName = ACTIVE_THEME_PRESET,
  mode: ThemeMode = 'light',
): ThemeTokens {
  return THEME_PRESETS[preset][mode];
}

export function themeCssVariables(tokens: ThemeTokens): Record<`--${string}`, string> {
  return {
    '--background': tokens.background,
    '--surface': tokens.surface,
    '--surface-raised': tokens.surfaceRaised,
    '--border': tokens.border,
    '--text': tokens.text,
    '--text-muted': tokens.textMuted,
    '--brand': tokens.brand,
    '--brand-strong': tokens.brandStrong,
    '--brand-foreground': tokens.brandForeground,
    '--accent-gold': tokens.accentGold,
    '--accent-gold-soft': tokens.accentGoldSoft,
    '--success': tokens.success,
    '--warning': tokens.warning,
    '--danger': tokens.danger,
    '--info': tokens.info,
    '--focus-ring': tokens.focusRing,
    '--sidebar-gradient-from': tokens.sidebarGradientFrom,
    '--sidebar-gradient-via': tokens.sidebarGradientVia,
    '--sidebar-gradient-to': tokens.sidebarGradientTo,
    '--foreground': tokens.foreground,
    '--card': tokens.card,
    '--card-foreground': tokens.cardForeground,
    '--popover': tokens.popover,
    '--popover-foreground': tokens.popoverForeground,
    '--muted': tokens.muted,
    '--muted-foreground': tokens.mutedForeground,
    '--input': tokens.input,
    '--input-border': tokens.inputBorder,
    '--primary': tokens.primary,
    '--primary-foreground': tokens.primaryForeground,
    '--accent': tokens.accent,
    '--accent-foreground': tokens.accentForeground,
    '--accent-soft': tokens.accentSoft,
    '--ring': tokens.ring,
    '--sidebar': tokens.sidebar,
    '--sidebar-end': tokens.sidebarEnd,
    '--sidebar-foreground': tokens.sidebarForeground,
    '--sidebar-muted': tokens.sidebarMuted,
    '--sidebar-active': tokens.sidebarActive,
    '--sidebar-active-foreground': tokens.sidebarActiveForeground,
    '--brand-orange': tokens.brandOrange,
    '--brand-red': tokens.brandRed,
    '--brand-gold': tokens.brandGold,
    '--hero-start': tokens.heroStart,
    '--hero-mid': tokens.heroMid,
    '--hero-end': tokens.heroEnd,
    '--win': tokens.win,
    '--win-bg': tokens.winBg,
    '--loss': tokens.loss,
    '--loss-bg': tokens.lossBg,
    '--draw': tokens.draw,
    '--draw-bg': tokens.drawBg,
    '--low-sample': tokens.lowSample,
    '--low-sample-bg': tokens.lowSampleBg,
    '--cock': tokens.cock,
    '--cock-bg': tokens.cockBg,
    '--hen': tokens.hen,
    '--hen-bg': tokens.henBg,
  };
}

export const STRAIN_COLORS: Record<string, string> = {
  Lemon: '#D97706',
  Sweater: '#B91C1C',
  Hatch: '#CA8A04',
  Roundhead: '#9A3412',
  Kelso: '#0F766E',
  'Black Butcher': '#1F2937',
  'Black Breasted Red': '#7C2D12',
  Wheaten: '#B45309',
  White: '#64748B',
  Grey: '#475569',
  Gray: '#475569',
  Unknown: '#78716C',
};

const STRAIN_FALLBACK = ['#D97706', '#B91C1C', '#CA8A04', '#9A3412', '#0F766E', '#7C3AED'];

export function strainColor(name: string): string {
  const trimmed = (name || 'Unknown').trim();
  const known = Object.keys(STRAIN_COLORS).find((key) => key.toLowerCase() === trimmed.toLowerCase());
  if (known) return STRAIN_COLORS[known];
  let hash = 0;
  for (let i = 0; i < trimmed.length; i += 1) hash = (hash * 31 + trimmed.charCodeAt(i)) >>> 0;
  return STRAIN_FALLBACK[hash % STRAIN_FALLBACK.length];
}
