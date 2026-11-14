export type MilestoneCardEntry = {
  info: {
    next: { daysUntil: number } | null;
  };
};

export function selectUpcomingMilestoneCard<T extends MilestoneCardEntry>(
  entries: T[],
  limit = 5,
): { totalSoon: number; visible: T[] } {
  const soon = entries.filter(
    (entry) => entry.info.next && entry.info.next.daysUntil >= 0 && entry.info.next.daysUntil <= 30,
  );
  return {
    totalSoon: soon.length,
    visible: soon.slice(0, limit),
  };
}
