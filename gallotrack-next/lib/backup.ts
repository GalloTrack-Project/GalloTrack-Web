/**
 * Backup restore — Data Management tab.
 *
 * A GalloTrack backup is a JSON file with:
 * `{ export_date, data: { fowls, match_history, breeding_pairings, profiles } }`
 * or owner-export format:
 * `{ exported_at, farm, fowls, matches, breeding_pairings }`.
 *
 * Restoring re-inserts records under the *current* authenticated user:
 * - Parents before children / two-pass ID remapping so sire_id, dam_id,
 *   match.fowl_id, and breeding_pairings sire_id/dam_id are rewritten to new IDs.
 * - Bird codes and names are preserved.
 * - Rows that collide by bird_code or name are skipped and reported in collisions.
 * - Cross-user data is sanitized: user_id is always forced to the active user.
 */

import { supabase as defaultSupabase } from '@/lib/registry';

export type BackupRow = Record<string, any>;

export type BackupFile = {
  export_date?: string;
  system_name?: string;
  version?: string;
  data?: {
    fowls?: BackupRow[];
    match_history?: BackupRow[];
    breeding_pairings?: BackupRow[];
    profiles?: BackupRow[];
    system_settings?: Record<string, unknown> | null;
  };
  counts?: Record<string, number>;
  /** Owner-export shape (Settings → Data Management): lists sit at the top level. */
  exported_at?: string;
  farm?: string;
  fowls?: BackupRow[];
  matches?: BackupRow[];
  breeding_pairings?: BackupRow[];
  pairings?: BackupRow[];
  profiles?: BackupRow[];
};

export type ParsedBackup =
  | {
      ok: true;
      backup: BackupFile;
      fowls: number;
      matches: number;
      pairings: number;
      profiles: number;
    }
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

  // Two accepted layouts: admin backup nests under `data`, owner backup puts lists at top level.
  const fowls = nested ? nested.fowls : file.fowls;
  const matches = nested ? nested.match_history : file.matches;
  const pairings = nested ? nested.breeding_pairings : file.breeding_pairings || file.pairings;
  const profiles = nested ? nested.profiles : file.profiles;

  if (!present(fowls) && !present(matches) && !present(pairings)) {
    return { ok: false, error: 'The backup contains no chicken, match, or breeding pairing records.' };
  }
  if (present(fowls) && !isRowArray(fowls)) {
    return { ok: false, error: 'The chicken list in this backup is malformed.' };
  }
  if (present(matches) && !isRowArray(matches)) {
    return { ok: false, error: 'The match list in this backup is malformed.' };
  }
  if (present(pairings) && !isRowArray(pairings)) {
    return { ok: false, error: 'The breeding pairings list in this backup is malformed.' };
  }
  if (present(profiles) && !isRowArray(profiles)) {
    return { ok: false, error: 'The profile list in this backup is malformed.' };
  }

  const normalized: BackupFile = {
    ...file,
    data: {
      fowls: fowls ?? [],
      match_history: matches ?? [],
      breeding_pairings: pairings ?? [],
      profiles: profiles ?? [],
      system_settings: nested?.system_settings ?? null,
    },
  };

  return {
    ok: true,
    backup: normalized,
    fowls: (fowls ?? []).length,
    matches: (matches ?? []).length,
    pairings: (pairings ?? []).length,
    profiles: (profiles ?? []).length,
  };
}

export type RestoreResult = {
  fowls: number;
  matches: number;
  pairings: number;
  profiles: number;
  skipped: number;
  collisions: string[];
  errors: string[];
};

import { filterAllowedColumns } from '@/lib/schema-contract';

/** Drop server-owned columns and filter against schema contract allowlist for fowl. */
function sanitizeFowl(row: BackupRow, userId: string): BackupRow {
  const { id: _id, user_id: _userId, created_at: _createdAt, updated_at: _updatedAt, ...rest } = row;
  if (!rest.bird_code && rest.chicken_code) {
    rest.bird_code = rest.chicken_code;
  }
  if (!rest.behavior_trait && rest.trait) {
    rest.behavior_trait = rest.trait;
  }
  if (!rest.color && rest.feather_color) {
    rest.color = rest.feather_color;
  }
  const filtered = filterAllowedColumns('fowl', rest);
  return { ...filtered, user_id: userId };
}

function sanitizeMatch(row: BackupRow, userId: string): BackupRow {
  const { id: _id, user_id: _userId, created_at: _createdAt, updated_at: _updatedAt, ...rest } = row;
  const filtered = filterAllowedColumns('match', rest);
  return { ...filtered, user_id: userId };
}

function sanitizePairing(row: BackupRow, userId: string): BackupRow {
  const { id: _id, user_id: _userId, created_at: _createdAt, updated_at: _updatedAt, ...rest } = row;
  const filtered = filterAllowedColumns('breeding_pairings', rest);
  return { ...filtered, user_id: userId };
}

function sanitizeProfile(row: BackupRow): BackupRow {
  const { user_id: _userId, created_at: _createdAt, ...rest } = row;
  return rest;
}

const norm = (value: unknown) => String(value ?? '').trim().toLowerCase();

export async function restoreBackup(
  backup: BackupFile,
  opts: { includeProfiles?: boolean } = {},
  client: any = defaultSupabase,
): Promise<RestoreResult> {
  const result: RestoreResult = {
    fowls: 0,
    matches: 0,
    pairings: 0,
    profiles: 0,
    skipped: 0,
    collisions: [],
    errors: [],
  };

  const { data: auth } = await client.auth.getUser();
  const user = auth?.user;
  if (!user) {
    result.errors.push('You must be signed in to restore a backup.');
    return result;
  }

  const currentUserId = user.id;
  const fowlsToRestore = backup.data?.fowls ?? [];
  const matchesToRestore = backup.data?.match_history ?? [];
  const pairingsToRestore = backup.data?.breeding_pairings ?? [];

  // Map to rewrite old IDs to newly assigned database IDs
  // oldFowlId -> newFowlId
  const oldIdToNewId = new Map<number, number>();

  // 1. Fetch existing fowls for current user to detect collisions
  const { data: existingFowlsData, error: efErr } = await client
    .from('fowl')
    .select('id, name, bird_code')
    .eq('user_id', currentUserId);

  if (efErr) {
    result.errors.push(`Failed to check existing chickens: ${efErr.message}`);
    return result;
  }

  const existingFowls = existingFowlsData ?? [];
  const existingNames = new Set(existingFowls.map((f: any) => norm(f.name)));
  const existingCodes = new Set(existingFowls.map((f: any) => norm(f.bird_code)).filter(Boolean));
  const existingByNameOrCode = new Map<string, number>();

  for (const ef of existingFowls) {
    if (ef.name) existingByNameOrCode.set(`name:${norm(ef.name)}`, ef.id);
    if (ef.bird_code) existingByNameOrCode.set(`code:${norm(ef.bird_code)}`, ef.id);
  }

  // 2. Separate valid new fowls from collisions
  const validFowls: BackupRow[] = [];
  for (const fowl of fowlsToRestore) {
    const nameKey = norm(fowl.name);
    const codeKey = norm(fowl.bird_code);

    const hasNameCollision = nameKey && existingNames.has(nameKey);
    const hasCodeCollision = codeKey && existingCodes.has(codeKey);

    if (hasNameCollision || hasCodeCollision) {
      result.skipped++;
      const reason = hasCodeCollision
        ? `Bird code [${fowl.bird_code}] already exists`
        : `Chicken "${fowl.name}" already exists`;
      result.collisions.push(reason);

      // If existing fowl matches, link old ID to the existing bird ID so children still find the parent
      const existingId =
        (codeKey ? existingByNameOrCode.get(`code:${codeKey}`) : undefined) ||
        (nameKey ? existingByNameOrCode.get(`name:${nameKey}`) : undefined);
      if (existingId != null && fowl.id != null) {
        oldIdToNewId.set(Number(fowl.id), existingId);
      }
      continue;
    }

    validFowls.push(fowl);
  }

  // 3. Restore Fowls in Two Passes:
  // Pass 1: Insert birds without sire_id/dam_id to establish new database IDs and build oldId -> newId map
  const pendingLineageUpdates: { newId: number; oldSireId: number | null; oldDamId: number | null }[] = [];

  for (const fowl of validFowls) {
    const oldId = fowl.id != null ? Number(fowl.id) : null;
    const oldSireId = fowl.sire_id != null ? Number(fowl.sire_id) : null;
    const oldDamId = fowl.dam_id != null ? Number(fowl.dam_id) : null;

    // Temporarily clear sire_id and dam_id on insert to avoid foreign key errors before parents exist
    const sanitized = sanitizeFowl(fowl, currentUserId);
    delete sanitized.sire_id;
    delete sanitized.dam_id;
    if (sanitized.declared_composition == null) {
      delete sanitized.declared_composition;
    }

    const { data: inserted, error: insertErr } = await client
      .from('fowl')
      .insert([sanitized])
      .select('id')
      .single();

    if (insertErr || !inserted) {
      result.errors.push(`fowl "${fowl.name}": ${insertErr?.message || 'Insert failed'}`);
      continue;
    }

    const newId = inserted.id;
    result.fowls++;
    if (oldId != null) {
      oldIdToNewId.set(oldId, newId);
    }

    if (oldSireId != null || oldDamId != null) {
      pendingLineageUpdates.push({ newId, oldSireId, oldDamId });
    }
  }

  // Pass 2: Re-link sire_id and dam_id using the mapped new IDs
  for (const update of pendingLineageUpdates) {
    const newSireId = update.oldSireId ? oldIdToNewId.get(update.oldSireId) ?? null : null;
    const newDamId = update.oldDamId ? oldIdToNewId.get(update.oldDamId) ?? null : null;

    if (newSireId != null || newDamId != null) {
      const patch: Record<string, any> = {};
      if (newSireId != null) patch.sire_id = newSireId;
      if (newDamId != null) patch.dam_id = newDamId;

      const { error: updateErr } = await client
        .from('fowl')
        .update(patch)
        .eq('id', update.newId)
        .eq('user_id', currentUserId);

      if (updateErr) {
        result.errors.push(`lineage update for fowl #${update.newId}: ${updateErr.message}`);
      }
    }
  }

  // 4. Restore Match Records:
  // Remap match.fowl_id using oldIdToNewId
  const { data: existingMatchesData } = await client
    .from('match')
    .select('date, entry_name, opponent')
    .eq('user_id', currentUserId);

  const existingMatchKeys = new Set(
    (existingMatchesData ?? []).map((m: any) => `${norm(m.date)}|${norm(m.entry_name)}|${norm(m.opponent)}`),
  );

  for (const match of matchesToRestore) {
    const matchKey = `${norm(match.date)}|${norm(match.entry_name)}|${norm(match.opponent)}`;
    if (matchKey && existingMatchKeys.has(matchKey)) {
      result.skipped++;
      result.collisions.push(`Match on ${match.date} (${match.entry_name} vs ${match.opponent}) already exists`);
      continue;
    }

    const sanitized = sanitizeMatch(match, currentUserId);

    // Remap fowl_id to newly assigned ID if available
    if (match.fowl_id != null) {
      const remappedFowlId = oldIdToNewId.get(Number(match.fowl_id));
      sanitized.fowl_id = remappedFowlId ?? null;
    }

    const { error: matchErr } = await client.from('match').insert([sanitized]);
    if (matchErr) {
      result.errors.push(`match on ${match.date}: ${matchErr.message}`);
    } else {
      result.matches++;
      existingMatchKeys.add(matchKey);
    }
  }

  // 5. Restore Breeding Pairings:
  // Remap sire_id and dam_id using oldIdToNewId
  const { data: existingPairingsData } = await client
    .from('breeding_pairings')
    .select('pairing_code, sire_code, dam_code, pairing_date')
    .eq('user_id', currentUserId);

  const existingPairingKeys = new Set(
    (existingPairingsData ?? []).map((p: any) =>
      p.pairing_code ? norm(p.pairing_code) : `${norm(p.sire_code)}|${norm(p.dam_code)}|${norm(p.pairing_date)}`,
    ),
  );

  for (const pairing of pairingsToRestore) {
    const pairingKey = pairing.pairing_code
      ? norm(pairing.pairing_code)
      : `${norm(pairing.sire_code)}|${norm(pairing.dam_code)}|${norm(pairing.pairing_date)}`;

    if (pairingKey && existingPairingKeys.has(pairingKey)) {
      result.skipped++;
      result.collisions.push(`Breeding pairing [${pairing.pairing_code || pairingKey}] already exists`);
      continue;
    }

    const sanitized = sanitizePairing(pairing, currentUserId);

    // Remap sire_id and dam_id
    if (pairing.sire_id != null) {
      sanitized.sire_id = oldIdToNewId.get(Number(pairing.sire_id)) ?? null;
    }
    if (pairing.dam_id != null) {
      sanitized.dam_id = oldIdToNewId.get(Number(pairing.dam_id)) ?? null;
    }

    const { error: pairErr } = await client.from('breeding_pairings').insert([sanitized]);
    if (pairErr) {
      result.errors.push(`breeding pairing: ${pairErr.message}`);
    } else {
      result.pairings++;
      existingPairingKeys.add(pairingKey);
    }
  }

  // 6. Profiles (optional)
  if (opts.includeProfiles) {
    const profiles = backup.data?.profiles ?? [];
    const mine = profiles.filter((p) => norm(p.id) === norm(currentUserId));
    for (const profile of mine) {
      const { error } = await client.from('profiles').upsert(sanitizeProfile(profile), {
        onConflict: 'id',
      });
      if (error) result.errors.push(`profiles: ${error.message}`);
      else result.profiles++;
    }
  }

  return result;
}
