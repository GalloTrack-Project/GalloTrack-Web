/**
 * Normalizes breed names from every source (registry rows, local custom
 * strains, restored drafts) so matching never depends on case or whitespace.
 */
export function mergeStrainNames(
  ...sources: Array<readonly string[] | null | undefined>
): string[] {
  const byKey = new Map<string, string>();
  for (const source of sources) {
    if (!source) continue;
    for (const rawName of source) {
      if (typeof rawName !== 'string') continue;
      const name = rawName.trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (!byKey.has(key)) byKey.set(key, name);
    }
  }
  return Array.from(byKey.values()).sort((a, b) => a.localeCompare(b));
}

export function findStrainName(
  options: readonly string[],
  query: string,
): string | null {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return null;
  return (
    options.find((option) => option.trim().toLowerCase() === normalized) ?? null
  );
}
