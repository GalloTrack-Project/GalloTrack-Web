/**
 * Backup restore — the other half of the Data Management tab.
 *
 * A GalloTrack backup is a JSON file with `{ export_date, data: { fowls,
 * match_history, profiles } }`. Restoring it re-inserts the rows under the
 * *current* user, skipping anything already in the registry so a restore can be
 * run twice without duplicating birds or fights.
 *
 * Parsing/validation is kept pure so it can be unit tested without a database.
 */

import { supabase } from '@/lib/registry';

export type BackupRow = Record<string, unknown>;

export type BackupFile = {
  export_date?: string;
  system_name?: string;
  version?: string;
  data?: {
    fowls?: BackupRow[];
    match_history?: BackupRow[];
    profiles?: BackupRow[];
    system_settings?: Record<string, unknown> | null;
  };
  counts?: Record<string, number>;
  /** Owner-export shape (Settings → Data Management): lists sit at the top level. */
  exported_at?: string;
  farm?: string;
  fowls?: BackupRow[];
  matches?: BackupRow[];
  profiles?: BackupRow[];
};

export type ParsedBackup =
  | { ok: true; backup: BackupFile; fowls: number; matches: number; profiles: number }
  | { ok: false; error: string };

const isRowArray = (value: unknown): value is BackupRow[] =>
  Array.isArray(value) && value.every((row) => !!row && typeof row === 'object' && !Array.isArray(row));

const present = (value: unknown): boolean => value !== undefined && value !== null;

export function parseBackup(text: string): ParsedBackup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'That file is not valid JSON.' };
  }

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'That file is not a GalloTrack backup.' };
  }

  const file = raw as BackupFile;
  const nested = file.data && typeof file.data === 'object' && !Array.isArray(file.data) ? file.data : null;

  // Two accepted layouts: the admin backup nests everything under `data`, the
  // owner backup puts the lists at the top level.
  const fowls = nested ? nested.fowls : file.fowls;
  const matches = nested ? nested.match_history : file.matches;
  const profiles = nested ? nested.profiles : file.profiles;

  if (!present(fowls) && !present(matches)) {
    return { ok: false, error: 'The backup contains neither chicken nor match records.' };
  }
  if (present(fowls) && !isRowArray(fowls)) {
    return { ok: false, error: 'The chicken list in this backup is malformed.' };
  }
  if (present(matches) && !isRowArray(matches)) {
    return { ok: false, error: 'The match list in this backup is malformed.' };
  }
  if (present(profiles) && !isRowArray(profiles)) {
    return { ok: false, error: 'The profile list in this backup is malformed.' };
  }

  const normalized: BackupFile = {
    ...file,
    data: {
      fowls: fowls ?? [],
      match_history: matches ?? [],
      profiles: profiles ?? [],
      system_settings: nested?.system_settings ?? null,
    },
  };

  return {
    ok: true,
    backup: normalized,
    fowls: (fowls ?? []).length,
    matches: (matches ?? []).length,
    profiles: (profiles ?? []).length,
  };
}

export type RestoreResult = {
  fowls: number;
  matches: number;
  profiles: number;
  skipped: number;
  errors: string[];
};

const INSERT_CHUNK = 200;

/** Drop server-owned columns so the database can reassign them on restore. */
function sanitizeRow(row: BackupRow, userId: string): BackupRow {
  const { id: _id, user_id: _userId, created_at: _createdAt, ...rest } = row;
  return { ...rest, user_id: userId };
}

/**
 * Profiles are keyed by the auth user id, so that one column has to survive —
 * everything else still goes through the same cleanup.
 */
function sanitizeProfile(row: BackupRow): BackupRow {
  const { user_id: _userId, created_at: _createdAt, ...rest } = row;
  return rest;
}

const norm = (value: unknown) => String(value ?? '').trim().toLowerCase();

export async function restoreBackup(
  backup: BackupFile,
  opts: { includeProfiles?: boolean } = {},
): Promise<RestoreResult> {
  const result: RestoreResult = { fowls: 0, matches: 0, profiles: 0, skipped: 0, errors: [] };

  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) {
    result.errors.push('You must be signed in to restore a backup.');
    return result;
  }

  const rowsIn = async (table: 'fowl' | 'match', existingKeys: Set<string>, keyOf: (row: BackupRow) => string) => {
    const rows = (table === 'fowl' ? backup.data?.fowls : backup.data?.match_history) ?? [];
    const fresh: BackupRow[] = [];
    for (const row of rows) {
      const key = keyOf(row);
      if (key && existingKeys.has(key)) {
        result.skipped++;
        continue;
      }
      fresh.push(sanitizeRow(row, user.id));
    }

    for (let i = 0; i < fresh.length; i += INSERT_CHUNK) {
      const chunk = fresh.slice(i, i + INSERT_CHUNK);
      const { error } = await supabase.from(table).insert(chunk);
      if (error) {
        // Fall back to row-by-row so one bad row does not lose the whole batch.
        for (const row of chunk) {
          const { error: rowError } = await supabase.from(table).insert([row]);
          if (rowError) result.errors.push(`${table}: ${rowError.message}`);
          else if (table === 'fowl') result.fowls++;
          else result.matches++;
        }
      } else if (table === 'fowl') {
        result.fowls += chunk.length;
      } else {
        result.matches += chunk.length;
      }
    }
  };

  // Existing records are matched by natural key, not by id (ids are reassigned).
  const { data: existingFowls } = await supabase.from('fowl').select('name');
  const fowlKeys = new Set((existingFowls ?? []).map((f) => norm(f.name)));
  await rowsIn('fowl', fowlKeys, (row) => norm(row.name));

  const { data: existingMatches } = await supabase
    .from('match')
    .select('date, entry_name, opponent');
  const matchKeys = new Set(
    (existingMatches ?? []).map((m) => `${norm(m.date)}|${norm(m.entry_name)}|${norm(m.opponent)}`),
  );
  await rowsIn('match', matchKeys, (row) => `${norm(row.date)}|${norm(row.entry_name)}|${norm(row.opponent)}`);

  if (opts.includeProfiles) {
    const profiles = backup.data?.profiles ?? [];
    const mine = profiles.filter((p) => norm(p.id) === norm(user.id));
    for (const profile of mine) {
      const { error } = await supabase.from('profiles').upsert(sanitizeProfile(profile), {
        onConflict: 'id',
      });
      if (error) result.errors.push(`profiles: ${error.message}`);
      else result.profiles++;
    }
  }

  return result;
}
