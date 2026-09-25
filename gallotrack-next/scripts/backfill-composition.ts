import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import type { FowlRecord } from '../lib/types';
import { computeAllCompositions, getBloodlineStats, compositionIsStale } from '../lib/bloodline-composition';

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

const SELECT =
  'id, name, breed, gender, sire, dam, bloodline_pct, bird_code, bloodline_composition, created_at';

async function main() {
  const apply = process.argv.includes('--apply');
  const { data, error } = await admin.from('fowl').select(SELECT).order('id');
  if (error) {
    console.error('❌ select failed ->', error.message);
    process.exit(1);
  }
  const fowls = (data ?? []) as FowlRecord[];
  console.log(`Loaded ${fowls.length} fowl rows.`);

  const compositions = computeAllCompositions(fowls);
  const updates: Array<{ id: number; bloodline_composition: Record<string, number>; bloodline_pct: number }> = [];
  let stale = 0;

  for (const f of fowls) {
    const comp = compositions.get(String(f.id));
    if (!comp || Object.keys(comp).length === 0) continue;
    const stats = getBloodlineStats(comp);
    const specificPct = stats?.specificPct ?? 0;
    const pctStale = Math.abs((Number(f.bloodline_pct) || 0) - specificPct) > 0.01;
    if (compositionIsStale(f.bloodline_composition, comp) || pctStale) {
      stale++;
      updates.push({ id: f.id, bloodline_composition: comp, bloodline_pct: specificPct });
    }
  }

  console.log(`Rows needing a composition backfill: ${stale}`);
  if (!apply) {
    console.log('Dry run — pass --apply to write.');
    const byId = new Map(fowls.map((f) => [f.id, f]));
    const isFoundation = (v?: string | null) => {
      const k = (v || '').trim().toLowerCase();
      return !k || k === 'foundation stock';
    };
    const offspring = updates.filter((u) => {
      const f = byId.get(u.id);
      return !!f && !isFoundation(f.sire) && !isFoundation(f.dam);
    });
    console.log(`Offspring with registered parents: ${offspring.length}`);
    const multi = updates.filter((u) => Object.keys(u.bloodline_composition).length > 1);
    console.log(`Multi-strain (hatian) compositions: ${multi.length}`);
    multi.slice(0, 5).forEach((u) => {
      const f = byId.get(u.id);
      console.log(`  #${u.id} ${f?.name} (${f?.sire} x ${f?.dam}) -> ${JSON.stringify(u.bloodline_composition)}`);
    });
    const sample = (offspring.length > 0 ? offspring : updates).slice(0, 8);
    sample.forEach((u) => {
      const f = byId.get(u.id);
      const stats = getBloodlineStats(u.bloodline_composition);
      console.log(
        `  #${u.id} ${f?.name} (${f?.sire} x ${f?.dam}) -> ${JSON.stringify(u.bloodline_composition)} (specific ${stats?.specificPct}%)`
      );
    });
    return;
  }

  const groups = new Map<string, { ids: number[]; comp: Record<string, number>; pct: number }>();
  updates.forEach((u) => {
    const key = JSON.stringify(u.bloodline_composition);
    const g = groups.get(key) ?? { ids: [], comp: u.bloodline_composition, pct: u.bloodline_pct };
    g.ids.push(u.id);
    groups.set(key, g);
  });

  const distinct = [...groups.values()];
  console.log(`Distinct compositions: ${distinct.length}`);

  let written = 0;
  for (const g of distinct) {
    const { error: updErr } = await admin
      .from('fowl')
      .update({ bloodline_composition: g.comp, bloodline_pct: g.pct })
      .in('id', g.ids);
    if (updErr) {
      console.error(`❌ update failed for ${JSON.stringify(g.comp)} ->`, updErr.message);
      process.exit(1);
    }
    written += g.ids.length;
  }

  const { data: after, error: afterErr } = await admin
    .from('fowl')
    .select('id, bloodline_composition')
    .not('bloodline_composition', 'is', null);
  if (afterErr) {
    console.error('❌ verify select failed ->', afterErr.message);
    process.exit(1);
  }
  console.log(`✅ Wrote ${written} composition(s). Rows now with a stored composition: ${after?.length}/${fowls.length}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
