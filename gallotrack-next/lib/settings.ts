/**
 * Per-farm configuration. Defaults live here (single place, never scattered);
 * a `user_settings` row overrides the default. Nothing from the open-questions
 * list is hardcoded in UI code - it all reads from this merged object.
 */

export const DEFAULT_SETTINGS = {
  /** Best-label ranking rule. total_wins (approved default) | win_rate | win_rate_min */
  ranking_metric: 'total_wins',
  /** Minimum decided matches before a bird can be ranked/Best (win_rate variants). */
  ranking_min_matches: 1,
  /** Whether every match must record a location (approved default: optional). */
  match_location_required: false,
  /** Headline count in the family view: offspring (approved) | total_birds | pairs */
  family_headline: 'offspring',
} as const;

export type SettingsKey = keyof typeof DEFAULT_SETTINGS;
export type UserSettings = {
  [K in SettingsKey]: (typeof DEFAULT_SETTINGS)[K];
};

export type SettingsRow = { key: string; value: unknown };

export const RANKING_METRICS = ['total_wins', 'win_rate', 'win_rate_min'] as const;

export const RANKING_METRIC_LABELS: Record<string, string> = {
  total_wins: 'Total wins',
  win_rate: 'Win rate',
  win_rate_min: 'Win rate (minimum matches)',
};

/** Merge stored overrides over the defaults; unknown keys are ignored. */
export function mergeSettings(rows: SettingsRow[] | undefined): UserSettings {
  const out: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const row of rows ?? []) {
    if (row && row.key in DEFAULT_SETTINGS && row.value !== undefined && row.value !== null) {
      out[row.key] = row.value;
    }
  }
  return out as UserSettings;
}
