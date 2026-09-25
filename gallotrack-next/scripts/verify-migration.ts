import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const ENV_PATH = new URL('../.env.local', import.meta.url).pathname.replace(/^\//, '');
const env: Record<string, string> = {};
for (const line of fs.readFileSync(ENV_PATH, 'utf8').split(/\r?\n/)) {
  if (!line.includes('=') || line.startsWith('#')) continue;
  const i = line.indexOf('=');
  env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
}

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

type Row = { id: number; user_id: string; name: string; bird_code: string | null; bloodline_composition: unknown };

async function main() {
  let ok = true;

  const { data: cols, error: colErr } = await admin.from('fowl').select('bird_code, bloodline_composition').limit(1);
  if (colErr) {
    console.log('❌ Columns missing ->', colErr.message);
    console.log('   Run supabase/migrations/20260925000000_bird_code_and_bloodline_composition.sql in the SQL Editor.');
    process.exit(1);
  }
  console.log(`✅ Columns exist (probe rows: ${cols?.length ?? 0})`);

  const { data: rows, error } = await admin
    .from('fowl')
    .select('id, user_id, name, bird_code, bloodline_composition')
    .order('id');
  if (error) {
    console.log('❌ Select failed ->', error.message);
    process.exit(1);
  }

  const all = (rows ?? []) as Row[];
  const missing = all.filter((r) => !r.bird_code || !r.bird_code.trim());
  console.log(`   fowl rows: ${all.length}`);
  console.log(`   with bird_code: ${all.length - missing.length}/${all.length}`);
  if (missing.length) {
    ok = false;
    console.log(`❌ ${missing.length} row(s) still have no bird_code (backfill did not run):`);
    missing.slice(0, 10).forEach((r) => console.log(`     #${r.id} ${r.name}`));
  }

  const seen = new Map<string, number[]>();
  all.forEach((r) => {
    if (!r.bird_code) return;
    const key = `${r.user_id}|${r.bird_code.trim().toLowerCase()}`;
    seen.set(key, [...(seen.get(key) ?? []), r.id]);
  });
  const dupes = [...seen.entries()].filter(([, ids]) => ids.length > 1);
  if (dupes.length) {
    ok = false;
    console.log('❌ Duplicate bird_code within the same user:');
    dupes.forEach(([key, ids]) => console.log(`     ${key} -> rows ${ids.join(', ')}`));
  } else {
    console.log('✅ No duplicate bird_code per user');
  }

  const withComp = all.filter((r) => r.bloodline_composition && Object.keys(r.bloodline_composition as object).length > 0);
  if (withComp.length !== all.length) {
    ok = false;
    console.log(`❌ Only ${withComp.length}/${all.length} rows have a stored bloodline_composition. Run: npx tsx scripts\\backfill-composition.ts --apply`);
  } else {
    console.log(`✅ All ${withComp.length}/${all.length} rows have a stored bloodline_composition`);
  }

  if (!ok) process.exit(1);
  console.log('✅ Migration verified.');
}

main().catch((e) => { console.error(e); process.exit(1); });
