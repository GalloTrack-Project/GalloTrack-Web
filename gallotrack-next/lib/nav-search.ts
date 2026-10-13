export type SearchableItem = {
  id: string;
  label: string;
  hint?: string;
  href: string;
};

/**
 * Case-insensitive matcher for the global search palette. Empty/whitespace
 * queries return everything (the palette shows all pages and actions).
 * Ranking: exact label > label prefix > label contains > hint contains >
 * href contains. Ties keep their original order (Array#sort is stable).
 */
export function matchSearchItems<T extends SearchableItem>(items: T[], query: string): T[] {
  const q = query.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!q) return items;

  const scored: { item: T; score: number }[] = [];
  for (const item of items) {
    const label = item.label.toLowerCase();
    const hint = (item.hint ?? '').toLowerCase();
    const href = item.href.toLowerCase();
    let score = -1;
    if (label === q) score = 0;
    else if (label.startsWith(q)) score = 1;
    else if (label.includes(q)) score = 2;
    else if (hint.includes(q)) score = 3;
    else if (href.includes(q)) score = 4;
    if (score >= 0) scored.push({ item, score });
  }
  scored.sort((a, b) => a.score - b.score);
  return scored.map((entry) => entry.item);
}
