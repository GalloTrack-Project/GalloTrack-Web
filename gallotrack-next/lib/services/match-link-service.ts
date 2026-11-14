import { updateMatch } from '@/lib/services/match-service';
import type { MatchRecord } from '@/lib/types';

/**
 * Original entered names for links performed with the explicit rename option.
 * Kept in-session so Unlink can restore the historical snapshot. Default linking
 * never overwrites entry_name, so it needs no extra storage.
 */
const originalEntryNames = new Map<number, string>();

export interface LinkMatchesResult {
  linked: number;
  error?: string;
}

export async function linkHistoricalMatchesToFowl(options: {
  matches: MatchRecord[];
  fowlId: number;
  fowlName: string;
  fowlBreed: string;
  updateRecordedName?: boolean;
}): Promise<LinkMatchesResult> {
  const { matches, fowlId, fowlName, fowlBreed, updateRecordedName = false } = options;
  const errors: string[] = [];
  let linked = 0;

  for (const match of matches) {
    const payload: Record<string, unknown> = { fowl_id: fowlId };
    if (updateRecordedName) {
      if (!originalEntryNames.has(match.id)) {
        originalEntryNames.set(match.id, match.entry_name);
      }
      payload.entry_name = fowlName;
      payload.breed = fowlBreed || 'Unknown';
    }
    const result = await updateMatch(match.id, payload);
    if (result.error) errors.push(result.error);
    else linked += 1;
  }

  return errors.length > 0 ? { linked, error: errors[0] } : { linked };
}

export async function unlinkHistoricalMatch(
  match: MatchRecord,
): Promise<{ error?: string }> {
  const payload: Record<string, unknown> = { fowl_id: null };
  const originalName = originalEntryNames.get(match.id);
  if (originalName !== undefined) {
    payload.entry_name = originalName;
  }
  const result = await updateMatch(match.id, payload);
  if (!result.error) originalEntryNames.delete(match.id);
  return result.error ? { error: result.error } : {};
}
