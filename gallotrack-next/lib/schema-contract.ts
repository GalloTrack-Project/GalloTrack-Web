/**
 * Schema Contract — single source of truth for allowed database columns.
 *
 * Driven by the actual Postgres schema in Supabase.
 * Any non-schema properties are explicitly filtered out before writes,
 * and dropped keys are logged with console.warn (names only, never values).
 */

export const FOWL_COLUMNS = [
  'id',
  'user_id',
  'name',
  'breed',
  'gender',
  'color',
  'color_category',
  'growth_stage',
  'behavior_trait',
  'eye_variant',
  'birthdate',
  'age',
  'weight',
  'height',
  'leg_color',
  'sire',
  'dam',
  'sire_id',
  'dam_id',
  'sire_pct',
  'dam_pct',
  'bloodline_pct',
  'bird_code',
  'wing_band',
  'bloodline_composition',
  'declared_composition',
  'pairing_id',
  'status',
  'condition_status',
  'breeding_role',
  'activity_status',
  'archive_kind',
  'archive_reason',
  'retired_scope',
  'return_date',
  'death_reason',
  'death_date',
  'image_url',
  'notes',
  'created_at',
] as const;

export type FowlColumn = (typeof FOWL_COLUMNS)[number];

export const MATCH_COLUMNS = [
  'id',
  'user_id',
  'fowl_id',
  'opponent_id',
  'date',
  'entry_name',
  'breed',
  'opponent',
  'opponent_breed',
  'opponent_bloodline',
  'opponent_birthdate',
  'opponent_photo_url',
  'location',
  'type',
  'derby_match_number',
  'outcome',
  'status',
  'video_url',
  'post_fight_condition',
  'side',
  'notes',
  'cock_count',
  'age_category',
  'event_type',
  'created_at',
] as const;

export type MatchColumn = (typeof MATCH_COLUMNS)[number];

export const BREEDING_PAIRINGS_COLUMNS = [
  'id',
  'user_id',
  'sire_id',
  'dam_id',
  'sire_name',
  'dam_name',
  'sire_code',
  'dam_code',
  'pairing_code',
  'offspring_seq',
  'pairing_date',
  'ended_date',
  'notes',
  'outcome',
  'created_at',
  'updated_at',
] as const;

export type BreedingPairingsColumn = (typeof BREEDING_PAIRINGS_COLUMNS)[number];

export const FOWL_STATUS_HISTORY_COLUMNS = [
  'id',
  'fowl_id',
  'field',
  'old_value',
  'new_value',
  'reason',
  'note',
  'changed_at',
  'changed_by',
] as const;

export type FowlStatusHistoryColumn = (typeof FOWL_STATUS_HISTORY_COLUMNS)[number];

export const TABLE_SCHEMAS = {
  fowl: FOWL_COLUMNS,
  match: MATCH_COLUMNS,
  breeding_pairings: BREEDING_PAIRINGS_COLUMNS,
  fowl_status_history: FOWL_STATUS_HISTORY_COLUMNS,
} as const;

export type TableName = keyof typeof TABLE_SCHEMAS;

/**
 * Filters a mutation payload against the table's explicit column allowlist.
 * If any keys are dropped, logs a single console.warn with the dropped key names only (never values).
 */
export function filterAllowedColumns<T extends Record<string, unknown>>(
  tableName: TableName,
  payload: T,
  allowedColumns: readonly string[] = TABLE_SCHEMAS[tableName]
): Record<string, unknown> {
  const allowedSet = new Set<string>(allowedColumns);
  const filtered: Record<string, unknown> = {};
  const droppedKeys: string[] = [];

  for (const key of Object.keys(payload)) {
    if (allowedSet.has(key)) {
      filtered[key] = payload[key];
    } else {
      droppedKeys.push(key);
    }
  }

  if (droppedKeys.length > 0) {
    console.warn(
      `[schema-contract] Dropped non-schema keys for table "${tableName}": ${droppedKeys.join(', ')}`
    );
  }

  return filtered;
}
