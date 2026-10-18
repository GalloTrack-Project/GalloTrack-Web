/**
 * CLONE ALL PER-USER DATA FROM ONE OWNER TO A TEST ACCOUNT
 *
 * Copies every per-user table from SRC_EMAIL to DST_EMAIL (creating the
 * target auth account with DST_PASSWORD if it does not exist yet).
 * The source account is never modified. Re-runs are safe: if the target
 * already owns data, the script reports state and exits without changes.
 *
 * Usage:
 *   npx tsx scripts/clone-owner-to-test-user.ts            # real run
 *   npx tsx scripts/clone-owner-to-test-user.ts --dry-run  # plan only
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const ENV_PATH = path.resolve(__dirname, '../.env.local');
const env: Record<string, string> = {};
if (fs.existsSync(ENV_PATH)) {
  for (const line of fs.readFileSync(ENV_PATH, 'utf8').split(/\r?\n/)) {
    if (!line.includes('=') || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
}

const SRC_EMAIL = process.env.CLONE_SRC_EMAIL || env.CLONE_SRC_EMAIL || process.env.SRC_EMAIL || env.SRC_EMAIL;
const DST_EMAIL = process.env.CLONE_DST_EMAIL || env.CLONE_DST_EMAIL || process.env.DST_EMAIL || env.DST_EMAIL;
const DST_PASSWORD = process.env.CLONE_DST_PASSWORD || env.CLONE_DST_PASSWORD || process.env.DST_PASSWORD || env.DST_PASSWORD;
const DRY_RUN = process.argv.includes('--dry-run');

if (!SRC_EMAIL || !DST_EMAIL || !DST_PASSWORD) {
  console.error('❌ Missing required environment variables: CLONE_SRC_EMAIL, CLONE_DST_EMAIL, CLONE_DST_PASSWORD. Set them in .env.local or environment.');
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const db: SupabaseClient = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type Row = Record<string, unknown>;
type IdMap = Record<string, number>;

const fkMaps: Record<string, IdMap> = { fowl: {}, match: {}, breeding_pairings: {} };

const TABLE_PLAN: {
  table: string;
  ownerCol: 'user_id' | 'owner_id' | null;
  orderCol?: string;
  remap?: Record<string, keyof typeof fkMaps>;
  shareLink?: boolean;
  changedBy?: boolean;
}[] = [
  { table: 'farms', ownerCol: 'owner_id' },
  { table: 'match', ownerCol: 'user_id', remap: { fowl_id: 'fowl', opponent_id: 'fowl' } },
  { table: 'fowl_photos', ownerCol: 'user_id', remap: { fowl_id: 'fowl' } },
  { table: 'match_photos', ownerCol: 'user_id', remap: { match_id: 'match' } },
  { table: 'match_videos', ownerCol: 'user_id', remap: { match_id: 'match' } },
  { table: 'safety_incidents', ownerCol: 'user_id', remap: { fowl_id: 'fowl' } },
  { table: 'registry_options', ownerCol: 'user_id' },
  { table: 'share_links', ownerCol: 'user_id', shareLink: true },
  { table: 'user_settings', ownerCol: 'user_id', orderCol: 'key' },
  { table: 'fowl_identifier_counters', ownerCol: 'user_id', orderCol: 'counter_type' },
];

function fail(where: string, message: string): never {
  console.error(`❌ ${where}: ${message}`);
  process.exit(1);
}

async function listUsers() {
  const { data, error } = await db.auth.admin.listUsers({ page: 1, perPage: 500 });
  if (error) fail('auth.admin.listUsers', error.message);
  return data?.users ?? [];
}

async function headCount(table: string, col: string, value: string): Promise<number> {
  const { count, error } = await db
    .from(table)
    .select('*', { count: 'exact', head: true })
    .eq(col, value);
  return error ? -1 : (count ?? 0);
}

async function headCountIn(table: string, col: string, values: string[]): Promise<number> {
  if (!values.length) return 0;
  const { count, error } = await db
    .from(table)
    .select('*', { count: 'exact', head: true })
    .in(col, values);
  return error ? -1 : (count ?? 0);
}

async function fetchAll(table: string, col: string, value: string, orderCol = 'id'): Promise<Row[]> {
  const { data, error } = await db.from(table).select('*').eq(col, value).order(orderCol as never);
  if (error) fail(table, error.message);
  return (data ?? []) as Row[];
}

async function insertRow(table: string, payload: Row): Promise<Row> {
  if (DRY_RUN) return { id: -1 };
  const { data, error } = await db.from(table).insert(payload).select('*').single();
  if (error) fail(table, error.message);
  return data as Row;
}

async function patchRow(table: string, id: unknown, payload: Row): Promise<void> {
  if (DRY_RUN) return;
  const { error } = await db.from(table).update(payload).eq('id', id as never);
  if (error) fail(table, `patch #${String(id)}: ${error.message}`);
}

function buildPayload(row: Row, ownerCol: string | null, dstId: string, extra: Row = {}): Row {
  const payload: Row = { ...row };
  delete payload.id;
  if (ownerCol) payload[ownerCol] = dstId;
  return { ...payload, ...extra };
}

async function positionalMap(table: string, ownerCol: string, srcId: string, dstId: string): Promise<boolean> {
  const srcRows = await fetchAll(table, ownerCol, srcId);
  const dstRows = await fetchAll(table, ownerCol, dstId);
  if (srcRows.length !== dstRows.length || srcRows.length === 0) {
    console.log(
      `• ${table}: target already has ${dstRows.length} row(s) vs source ${srcRows.length} -> skipped, but ids cannot be remapped`,
    );
    return false;
  }
  srcRows.forEach((row, i) => {
    fkMaps[table][String(row.id)] = Number(dstRows[i].id);
  });
  console.log(`• ${table}: target already has ${dstRows.length} row(s) -> skipped (ids remapped)`);
  return true;
}

async function allCounts(userId: string, fowlIds: string[]): Promise<Record<string, number>> {
  const out: Record<string, number> = { profiles: await headCount('profiles', 'id', userId) };
  for (const plan of TABLE_PLAN) {
    out[plan.table] = await headCount(plan.table, plan.ownerCol as string, userId);
  }
  out.fowl = await headCount('fowl', 'user_id', userId);
  out.breeding_pairings = await headCount('breeding_pairings', 'user_id', userId);
  out.fowl_status_history = await headCountIn('fowl_status_history', 'fowl_id', fowlIds);
  return out;
}

async function fowlIdList(userId: string): Promise<string[]> {
  const { data, error } = await db.from('fowl').select('id').eq('user_id', userId);
  if (error) fail('fowl', error.message);
  return (data ?? []).map((r) => String((r as { id: unknown }).id));
}

async function ensureTargetAccount(): Promise<string> {
  const users = await listUsers();
  const existing = users.find((u) => u.email?.toLowerCase() === DST_EMAIL.toLowerCase());

  if (existing) {
    console.log(`• Account ${DST_EMAIL} already exists (${existing.id})`);
    if (DRY_RUN) return existing.id;
    const { error } = await db.auth.admin.updateUserById(existing.id, {
      password: DST_PASSWORD,
      email_confirm: true,
    });
    if (error) fail('auth.admin.updateUserById', error.message);
    console.log('  → password reset to the default, email confirmed');
    return existing.id;
  }

  console.log(`• Creating account ${DST_EMAIL} (password: ${DST_PASSWORD}, auto-confirmed)`);
  if (DRY_RUN) return '00000000-0000-0000-0000-000000000000';
  const { data, error } = await db.auth.admin.createUser({
    email: DST_EMAIL,
    password: DST_PASSWORD,
    email_confirm: true,
  });
  if (error) fail('auth.admin.createUser', error.message);
  return data.user.id;
}

async function copyProfile(srcId: string, dstId: string): Promise<void> {
  const rows = await fetchAll('profiles', 'id', srcId);
  if (!rows.length) {
    console.log('• profiles: source has no row -> skipped');
    return;
  }
  const src = rows[0];
  const identity: Row = {
    full_name: src.full_name,
    avatar_url: src.avatar_url,
    phone_number: src.phone_number,
    farm_name: src.farm_name,
    email: DST_EMAIL,
    role: 'owner',
    is_admin: false,
    is_active: true,
    is_verified: false,
    account_status: 'active',
    updated_at: new Date().toISOString(),
  };

  const existing = await headCount('profiles', 'id', dstId);
  if (existing > 0) {
    if (DRY_RUN) {
      console.log('• profiles: target already has a row -> will update identity fields');
      return;
    }
    const { error } = await db.from('profiles').update(identity).eq('id', dstId);
    if (error) fail('profiles', error.message);
    console.log('• profiles: existing row updated (name/farm/phone cloned from source)');
  } else {
    await insertRow('profiles', { ...src, ...identity, id: dstId, created_at: src.created_at });
    console.log('• profiles: cloned');
  }
}

async function copyFowl(srcId: string, dstId: string): Promise<Row[]> {
  const rows = await fetchAll('fowl', 'user_id', srcId);
  const dstN = await headCount('fowl', 'user_id', dstId);
  if (dstN > 0) {
    await positionalMap('fowl', 'user_id', srcId, dstId);
    return rows;
  }
  console.log(`• fowl: ${rows.length} row(s)`);

  for (const row of rows) {
    const created = await insertRow(
      'fowl',
      buildPayload(row, 'user_id', dstId, { sire_id: null, dam_id: null, pairing_id: null }),
    );
    fkMaps.fowl[String(row.id)] = Number(created.id);
  }

  let relinked = 0;
  for (const row of rows) {
    const sire = row.sire_id != null ? fkMaps.fowl[String(row.sire_id)] ?? null : null;
    const dam = row.dam_id != null ? fkMaps.fowl[String(row.dam_id)] ?? null : null;
    if (sire == null && dam == null) continue;
    await patchRow('fowl', fkMaps.fowl[String(row.id)], { sire_id: sire, dam_id: dam });
    relinked += 1;
  }
  if (relinked) console.log(`  → parent links (sire_id/dam_id) restored on ${relinked} row(s)`);
  return rows;
}

async function copyPairings(srcFowl: Row[], srcId: string, dstId: string): Promise<void> {
  const rows = await fetchAll('breeding_pairings', 'user_id', srcId);
  const dstN = await headCount('breeding_pairings', 'user_id', dstId);
  if (dstN > 0) {
    await positionalMap('breeding_pairings', 'user_id', srcId, dstId);
  } else {
    console.log(`• breeding_pairings: ${rows.length} row(s)`);

    for (const row of rows) {
      const created = await insertRow(
        'breeding_pairings',
        buildPayload(row, 'user_id', dstId, {
          sire_id: row.sire_id != null ? fkMaps.fowl[String(row.sire_id)] ?? null : null,
          dam_id: row.dam_id != null ? fkMaps.fowl[String(row.dam_id)] ?? null : null,
          offspring_seq: 0,
        }),
      );
      fkMaps.breeding_pairings[String(row.id)] = Number(created.id);
    }
  }

  const dstFowl = await fetchAll('fowl', 'user_id', dstId);
  let linked = 0;
  let drift = 0;
  for (const row of rows) {
    const children = srcFowl.filter((f) => String(f.pairing_id) === String(row.id)).length;
    if (children !== Number(row.offspring_seq ?? 0)) drift += 1;
  }
  for (const row of dstFowl) {
    const srcPairing = srcFowl.find((f) => fkMaps.fowl[String(f.id)] === Number(row.id))?.pairing_id;
    if (srcPairing == null) continue;
    const target = fkMaps.breeding_pairings[String(srcPairing)];
    if (target == null || Number(row.pairing_id) === target) continue;
    await patchRow('fowl', row.id, { pairing_id: target });
    linked += 1;
  }
  if (linked) console.log(`  → pairing_id linked on ${linked} fowl row(s) (offspring_seq recounted by trigger)`);
  if (drift) console.log(`  ⚠️ ${drift} pairing(s) where the source offspring_seq disagreed with the real child count`);
}

async function copyStatusHistory(srcFowlIds: string[], srcId: string, dstId: string): Promise<void> {
  if (!srcFowlIds.length) {
    console.log('• fowl_status_history: 0 row(s)');
    return;
  }
  const dstFowlIds = await fowlIdList(dstId);
  if ((await headCountIn('fowl_status_history', 'fowl_id', dstFowlIds)) > 0) {
    console.log('• fowl_status_history: target already has rows -> skipped');
    return;
  }
  const { data, error } = await db
    .from('fowl_status_history')
    .select('*')
    .in('fowl_id', srcFowlIds)
    .order('id');
  if (error) fail('fowl_status_history', error.message);
  const rows = (data ?? []) as Row[];
  for (const row of rows) {
    const mappedFowl = fkMaps.fowl[String(row.fowl_id)];
    if (mappedFowl == null) {
      console.log(`  ⚠️ fowl_status_history #${String(row.id)}: fowl_id not cloned -> skipped`);
      continue;
    }
    const extra: Row = { fowl_id: mappedFowl };
    if (row.changed_by != null) extra.changed_by = String(row.changed_by) === srcId ? dstId : row.changed_by;
    await insertRow('fowl_status_history', buildPayload(row, null, dstId, extra));
  }
  console.log(`• fowl_status_history: ${rows.length} row(s)`);
}

async function copyTable(plan: (typeof TABLE_PLAN)[number], srcId: string, dstId: string): Promise<void> {
  const rows = await fetchAll(plan.table, plan.ownerCol as string, srcId, plan.orderCol ?? 'id');
  const dstN = await headCount(plan.table, plan.ownerCol as string, dstId);
  if (dstN > 0) {
    if (fkMaps[plan.table]) await positionalMap(plan.table, plan.ownerCol as string, srcId, dstId);
    else console.log(`• ${plan.table}: target already has ${dstN} row(s) -> skipped`);
    return;
  }
  if (!rows.length) {
    console.log(`• ${plan.table}: 0 row(s)`);
    return;
  }

  for (const row of rows) {
    const extra: Row = {};
    for (const [col, mapName] of Object.entries(plan.remap ?? {})) {
      const value = row[col];
      if (value == null) continue;
      const mapped = fkMaps[mapName][String(value)];
      if (mapped == null) {
        console.log(`  ⚠️ ${plan.table} #${String(row.id)}: ${col}=${String(value)} has no clone -> NULL`);
        extra[col] = null;
      } else {
        extra[col] = mapped;
      }
    }
    if (plan.shareLink) {
      const mapName = String(row.entity_type);
      const mapped = fkMaps[mapName]?.[String(row.entity_id)];
      if (mapped != null) extra.entity_id = mapped;
      else console.log(`  ⚠️ share_links #${String(row.id)}: entity ${mapName}#${String(row.entity_id)} not cloned -> kept as-is`);
      extra.token = randomBytes(16).toString('hex');
    }

    const created = await insertRow(plan.table, buildPayload(row, plan.ownerCol, dstId, extra));
    if (fkMaps[plan.table]) fkMaps[plan.table][String(row.id)] = Number(created.id);
  }
  console.log(`• ${plan.table}: ${rows.length} row(s)`);
}

async function main() {
  console.log('=======================================================');
  console.log(`GALLOTRACK OWNER CLONE${DRY_RUN ? ' (DRY RUN)' : ''}`);
  console.log(`source: ${SRC_EMAIL}`);
  console.log(`target: ${DST_EMAIL} (password: ${DRY_RUN ? '(unchanged)' : DST_PASSWORD})`);
  console.log('=======================================================\n');

  const users = await listUsers();
  const src = users.find((u) => u.email?.toLowerCase() === SRC_EMAIL.toLowerCase());
  if (!src) fail('lookup', `source user not found: ${SRC_EMAIL}`);
  const srcId = src.id;
  console.log(`source uuid: ${srcId}`);

  const srcFowlIds = await fowlIdList(srcId);
  const srcCounts = await allCounts(srcId, srcFowlIds);
  console.log('source row counts:', JSON.stringify(srcCounts), '\n');

  const dstId = await ensureTargetAccount();

  await copyProfile(srcId, dstId);
  const srcFowl = await copyFowl(srcId, dstId);
  await copyPairings(srcFowl, srcId, dstId);
  for (const plan of TABLE_PLAN) await copyTable(plan, srcId, dstId);
  await copyStatusHistory(srcFowlIds, srcId, dstId);

  if (DRY_RUN) {
    console.log('\nDRY RUN complete - no rows were written.');
    return;
  }

  const finalSrc = await allCounts(srcId, srcFowlIds);
  const finalDst = await allCounts(dstId, await fowlIdList(dstId));
  console.log('\n================ CLONE RESULT ================');
  console.log('table'.padEnd(28) + 'source'.padStart(8) + 'target'.padStart(8));
  for (const table of Object.keys(finalSrc)) {
    console.log(table.padEnd(28) + String(finalSrc[table]).padStart(8) + String(finalDst[table]).padStart(8));
  }
  const profile = await db
    .from('profiles')
    .select('full_name, farm_name, role, is_admin, is_active, email')
    .eq('id', dstId)
    .single();
  if (profile.data) console.log('target profile:', JSON.stringify(profile.data));
  console.log('source rows are UNCHANGED (copy, not move).');
  console.log('==============================================');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
