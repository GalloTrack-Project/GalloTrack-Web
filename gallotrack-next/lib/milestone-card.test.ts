import { describe, expect, it } from 'vitest';
import { selectUpcomingMilestoneCard } from './milestone-card';

function entry(daysUntil: number | null, id: number) {
  return { id, info: { next: daysUntil === null ? null : { daysUntil } } };
}

describe('selectUpcomingMilestoneCard', () => {
  it('counts only the next 30 days and never lists later items', () => {
    const entries = [
      entry(3, 1),
      entry(7, 2),
      entry(30, 3),
      entry(31, 4),
      entry(150, 5),
      entry(null, 6),
    ];
    const result = selectUpcomingMilestoneCard(entries);
    expect(result.totalSoon).toBe(3);
    expect(result.visible.map((item) => item.id)).toEqual([1, 2, 3]);
  });

  it('keeps the subtitle count aligned when more than five items are soon', () => {
    const entries = Array.from({ length: 7 }, (_, index) => entry(index + 1, index + 1));
    const result = selectUpcomingMilestoneCard(entries);
    expect(result.totalSoon).toBe(7);
    expect(result.visible).toHaveLength(5);
  });

  it('returns no visible items when nothing is within 30 days', () => {
    const result = selectUpcomingMilestoneCard([entry(31, 1), entry(null, 2)]);
    expect(result.totalSoon).toBe(0);
    expect(result.visible).toEqual([]);
  });
});
