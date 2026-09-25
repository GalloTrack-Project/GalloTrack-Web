import { describe, it, expect } from 'vitest';
import type { FowlRecord } from './types';
import {
  UNKNOWN_BLOODLINE,
  baseComposition,
  blendCompositions,
  computeBloodlineComposition,
  computeAllCompositions,
  getBloodlineStats,
  getFowlBloodlineStats,
  normalizeComposition,
  parseComposition,
  specificBloodlinePct,
} from './bloodline-composition';

const bird = (partial: Partial<FowlRecord> & { id: number; name: string }): FowlRecord =>
  ({
    breed: '',
    gender: 'Rooster',
    sire: '',
    dam: '',
    bloodline_pct: 100,
    ...partial,
  }) as FowlRecord;

describe('baseComposition', () => {
  it('gives 100% to a single strain', () => {
    expect(baseComposition({ breed: 'Kelso' })).toEqual({ Kelso: 100 });
  });

  it('splits a multi-strain tag evenly (2-way cross)', () => {
    expect(baseComposition({ breed: 'Hatch, Roundhead' })).toEqual({ Hatch: 50, Roundhead: 50 });
  });

  it('splits a 3-way tag evenly', () => {
    expect(baseComposition({ breed: 'Hatch, Roundhead, Kelso' })).toEqual({
      Hatch: 33.3,
      Roundhead: 33.3,
      Kelso: 33.4,
    });
  });

  it('returns Unknown when no breed is listed', () => {
    expect(baseComposition({ breed: '' })).toEqual({ [UNKNOWN_BLOODLINE]: 100 });
  });
});

describe('blendCompositions', () => {
  it('applies the 50/50 rule', () => {
    expect(blendCompositions({ Kelso: 100 }, { Hatch: 50, Roundhead: 50 })).toEqual({
      Kelso: 50,
      Hatch: 25,
      Roundhead: 25,
    });
  });

  it('keeps the total at 100', () => {
    const blended = blendCompositions({ A: 60, B: 40 }, { C: 100 });
    expect(Object.values(blended).reduce((s, v) => s + v, 0)).toBeCloseTo(100, 1);
  });
});

describe('normalizeComposition', () => {
  it('merges case variants', () => {
    expect(normalizeComposition({ Hatch: 30, ' hatch ': 20, Kelso: 50 })).toEqual({ Hatch: 50, Kelso: 50 });
  });

  it('drops zero and negative entries', () => {
    expect(normalizeComposition({ Hatch: 0, Kelso: -5, Albany: 100 })).toEqual({ Albany: 100 });
  });

  it('returns empty object for empty input', () => {
    expect(normalizeComposition(null)).toEqual({});
    expect(normalizeComposition({})).toEqual({});
  });
});

describe('computeBloodlineComposition', () => {
  it('returns 100% of own strain for foundation stock', () => {
    const fowls = [bird({ id: 1, name: 'Kelso Foundation', breed: 'Kelso' })];
    expect(computeBloodlineComposition(fowls[0], fowls)).toEqual({ Kelso: 100 });
  });

  it('follows the adviser 50/50 multi-way cross example', () => {
    const fowls: FowlRecord[] = [
      bird({ id: 1, name: 'Pure Kelso', breed: 'Kelso', gender: 'Rooster' }),
      bird({ id: 2, name: 'HR Hen', breed: 'Hatch, Roundhead', gender: 'Hen' }),
      bird({ id: 3, name: 'Offspring', breed: 'Kelso', sire: 'Pure Kelso', dam: 'HR Hen' }),
    ];
    expect(computeBloodlineComposition(fowls[2], fowls)).toEqual({
      Kelso: 50,
      Hatch: 25,
      Roundhead: 25,
    });
  });

  it('halves again for the next generation', () => {
    const fowls: FowlRecord[] = [
      bird({ id: 1, name: 'Pure Kelso', breed: 'Kelso' }),
      bird({ id: 2, name: 'HR Hen', breed: 'Hatch, Roundhead', gender: 'Hen' }),
      bird({ id: 3, name: 'F1', sire: 'Pure Kelso', dam: 'HR Hen' }),
      bird({ id: 4, name: 'F2', sire: 'Pure Kelso', dam: 'F1' }),
    ];
    expect(computeBloodlineComposition(fowls[3], fowls)).toEqual({
      Kelso: 75,
      Hatch: 12.5,
      Roundhead: 12.5,
    });
  });

  it('marks an unregistered parent as Unknown instead of inventing blood', () => {
    const fowls: FowlRecord[] = [bird({ id: 1, name: 'Pure Kelso', breed: 'Kelso' })];
    const child = bird({ id: 2, name: 'Child', sire: 'Pure Kelso', dam: 'Some Unregistered Hen' });
    expect(computeBloodlineComposition(child, fowls)).toEqual({ Kelso: 50, [UNKNOWN_BLOODLINE]: 50 });
  });

  it('treats Foundation Stock as an absent parent', () => {
    const fowls: FowlRecord[] = [bird({ id: 1, name: 'Pure Hatch', breed: 'Hatch' })];
    const child = bird({ id: 2, name: 'Child', sire: 'Pure Hatch', dam: 'Foundation Stock' });
    expect(computeBloodlineComposition(child, fowls)).toEqual({ Hatch: 50, [UNKNOWN_BLOODLINE]: 50 });
  });

  it('never loops on circular pedigrees', () => {
    const fowls: FowlRecord[] = [
      bird({ id: 1, name: 'A', breed: 'Kelso', sire: 'B', dam: 'Foundation Stock' }),
      bird({ id: 2, name: 'B', breed: 'Hatch', sire: 'A', dam: 'Foundation Stock' }),
    ];
    const comp = computeBloodlineComposition(fowls[0], fowls);
    expect(Object.values(comp).reduce((s, v) => s + v, 0)).toBeCloseTo(100, 1);
  });

  it('is idempotent when called repeatedly', () => {
    const fowls: FowlRecord[] = [
      bird({ id: 1, name: 'S', breed: 'Kelso' }),
      bird({ id: 2, name: 'D', breed: 'Hatch', gender: 'Hen' }),
      bird({ id: 3, name: 'C', sire: 'S', dam: 'D' }),
    ];
    const first = computeBloodlineComposition(fowls[2], fowls);
    const second = computeBloodlineComposition(fowls[2], fowls);
    expect(second).toEqual(first);
    expect(first).toEqual({ Kelso: 50, Hatch: 50 });
  });
});

describe('computeAllCompositions', () => {
  it('resolves every fowl in one pass', () => {
    const fowls: FowlRecord[] = [
      bird({ id: 1, name: 'S', breed: 'Kelso' }),
      bird({ id: 2, name: 'D', breed: 'Hatch', gender: 'Hen' }),
      bird({ id: 3, name: 'C', sire: 'S', dam: 'D' }),
    ];
    const all = computeAllCompositions(fowls);
    expect(all.get('1')).toEqual({ Kelso: 100 });
    expect(all.get('3')).toEqual({ Kelso: 50, Hatch: 50 });
  });
});

describe('getBloodlineStats', () => {
  it('sorts the dominant strain first', () => {
    const stats = getBloodlineStats({ Hatch: 25, Roundhead: 25, Kelso: 50 })!;
    expect(stats.dominant.strain).toBe('Kelso');
    expect(stats.specificPct).toBe(50);
    expect(stats.strainCount).toBe(3);
    expect(stats.isMixed).toBe(true);
    expect(stats.summary).toBe('50% Kelso · 25% Hatch · 25% Roundhead');
  });

  it('flags over-mixing / galapsaw', () => {
    expect(getBloodlineStats({ A: 40, B: 30, C: 20, D: 10 })!.isDiluted).toBe(true);
    expect(getBloodlineStats({ A: 100 })!.isDiluted).toBe(false);
    expect(getBloodlineStats({ A: 60, B: 40 })!.isDiluted).toBe(false);
  });

  it('separates unknown blood', () => {
    const stats = getBloodlineStats({ Kelso: 50, [UNKNOWN_BLOODLINE]: 50 })!;
    expect(stats.knownPct).toBe(50);
    expect(stats.unknownPct).toBe(50);
    expect(stats.dominant.strain).toBe('Kelso');
  });

  it('returns null for nothing', () => {
    expect(getBloodlineStats(null)).toBeNull();
    expect(getBloodlineStats({})).toBeNull();
  });
});

describe('specificBloodlinePct', () => {
  it('returns the dominant share', () => {
    expect(specificBloodlinePct({ Kelso: 50, Hatch: 25, Roundhead: 25 })).toBe(50);
  });

  it('returns 0 when empty', () => {
    expect(specificBloodlinePct({})).toBe(0);
  });
});

describe('parseComposition', () => {
  it('round-trips a persisted jsonb value', () => {
    expect(parseComposition({ Kelso: 50, Hatch: 25, Roundhead: 25 })).toEqual({
      Kelso: 50,
      Hatch: 25,
      Roundhead: 25,
    });
  });

  it('rejects non-objects', () => {
    expect(parseComposition(null)).toBeNull();
    expect(parseComposition([1, 2])).toBeNull();
    expect(parseComposition('x')).toBeNull();
  });
});

describe('getFowlBloodlineStats', () => {
  it('prefers the persisted composition', () => {
    const f = bird({ id: 1, name: 'X', breed: 'Kelso', bloodline_composition: { Kelso: 40, Hatch: 60 } });
    expect(getFowlBloodlineStats(f, [])!.dominant.strain).toBe('Hatch');
  });

  it('recomputes from ancestry when nothing is persisted', () => {
    const fowls: FowlRecord[] = [
      bird({ id: 1, name: 'S', breed: 'Kelso' }),
      bird({ id: 2, name: 'D', breed: 'Hatch', gender: 'Hen' }),
      bird({ id: 3, name: 'C', sire: 'S', dam: 'D' }),
    ];
    expect(getFowlBloodlineStats(fowls[2], fowls)!.specificPct).toBe(50);
  });

  it('returns null when there is no fowl', () => {
    expect(getFowlBloodlineStats(null)).toBeNull();
  });
});
