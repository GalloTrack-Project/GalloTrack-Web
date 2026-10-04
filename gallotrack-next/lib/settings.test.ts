import { describe, it, expect } from 'vitest';
import { DEFAULT_SETTINGS, mergeSettings } from './settings';

describe('mergeSettings', () => {
  it('returns the defaults when nothing is stored', () => {
    expect(mergeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(mergeSettings([])).toEqual(DEFAULT_SETTINGS);
    expect(mergeSettings(undefined).ranking_metric).toBe('total_wins');
    expect(mergeSettings(undefined).match_location_required).toBe(false);
    expect(mergeSettings(undefined).family_headline).toBe('offspring');
  });

  it('applies stored overrides', () => {
    const merged = mergeSettings([
      { key: 'ranking_metric', value: 'win_rate' },
      { key: 'match_location_required', value: true },
    ]);
    expect(merged.ranking_metric).toBe('win_rate');
    expect(merged.match_location_required).toBe(true);
    expect(merged.family_headline).toBe('offspring');
  });

  it('ignores unknown keys and null values', () => {
    const merged = mergeSettings([
      { key: 'something_else', value: 'x' },
      { key: 'ranking_metric', value: null },
    ]);
    expect(merged).toEqual(DEFAULT_SETTINGS);
  });
});
