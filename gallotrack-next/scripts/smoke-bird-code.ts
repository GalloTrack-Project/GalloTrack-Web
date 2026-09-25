import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const ENV_PATH = new URL('../.env.local', import.meta.url).pathname.replace(/^\//, '');
const env: Record<string, string> = {};
for (const line of fs.readFileSync(ENV_PATH, 'utf8').split(/\r?\n/)) {
  if (!line.includes('=') || line.startsWith('#')) continue;
  const i = line.indexOf('=');
  env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
}

const API = process.env.SMOKE_API_BASE || 'http://localhost:3000';
const stamp = Date.now();
const EMAIL = `smoke-birdcode-${stamp}@gallotrack.test`;
const PASSWORD = 'SmokeBirdCode!2026';

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

type Row = { id: number; name: string; bird_code: string | null; bloodline_composition: Record<string, number> | null; bloodline_pct: number | null };

const results: Array<{ name: string; ok: boolean; detail: string }> = [];
const record = (name: string, ok: boolean, detail: string) => {
  results.push({ name, ok, detail });
  console.log(`${ok ? '✅' : '❌'} ${name} — ${detail}`);
};

async function post(token: string, body: Record<string, unknown>) {
  const res = await fetch(`${API}/api/fowl`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* ignore */ }
  return { status: res.status, json, text };
}

async function main() {
  let uid = '';
  try {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { first_name: 'Smoke', last_name: 'BirdCode' },
    });
    if (createErr) throw new Error(`createUser: ${createErr.message}`);
    uid = created.user!.id;

    const { error: signInErr } = await anon.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
    if (signInErr) throw new Error(`signIn: ${signInErr.message}`);
    const token = (anon.auth.getSession ? await anon.auth.getSession() : null)!.data.session!.access_token;

    // ── Setup: two registered parents with deterministic codes ──────────────
    const baseRow = (over: Record<string, unknown>) => ({
      user_id: uid,
      color: 'Bright Red',
      color_category: 'Red',
      growth_stage: 'Cock',
      behavior_trait: 'Wave-Motion Tracker',
      eye_variant: 'Standard Eye',
      birthdate: '2025-01-01',
      age: '24 Months',
      weight: '',
      height: '',
      leg_color: 'Yellow',
      sire: 'Foundation Stock',
      dam: 'Foundation Stock',
      sire_pct: 100,
      dam_pct: 100,
      bloodline_pct: 100,
      status: 'Active',
      image_url: '',
      ...over,
    });
    const { error: parentErr } = await admin.from('fowl').insert([
      baseRow({ name: 'Smoke Sire', breed: 'Hatch', gender: 'Rooster', bird_code: '91A' }),
      baseRow({ name: 'Smoke Dam', breed: 'Sweater', gender: 'Hen', bird_code: '92B', growth_stage: 'Hen' }),
    ]);
    if (parentErr) throw new Error(`parent insert: ${parentErr.message}`);

    const readRow = async (name: string): Promise<Row | null> => {
      const { data } = await admin.from('fowl').select('id, name, bird_code, bloodline_composition, bloodline_pct')
        .eq('user_id', uid).eq('name', name).maybeSingle();
      return (data as Row) ?? null;
    };

    // ── Case A: auto-generated combination code + 50/50 composition ────────
    const a = await post(token, { name: 'Smoke Child A', breed: 'Hatch, Sweater', gender: 'Rooster', sire: 'Smoke Sire', dam: 'Smoke Dam' });
    const aRow = a.status === 201 ? await readRow('Smoke Child A') : null;
    record(
      'A. auto combination code',
      a.status === 201 && aRow?.bird_code === '91Ax92B',
      `status ${a.status}, code ${aRow?.bird_code ?? '(walang row)'} (expected 91Ax92B)`
    );
    record(
      'A2. 50/50 composition persisted',
      a.status === 201 && JSON.stringify(aRow?.bloodline_composition) === JSON.stringify({ Hatch: 50, Sweater: 50 }),
      `composition ${JSON.stringify(aRow?.bloodline_composition)}, bloodline_pct ${aRow?.bloodline_pct}`
    );

    // ── Case B: duplicate code rejected (409) ───────────────────────────────
    const b = await post(token, { name: 'Smoke Dup Child', breed: 'Hatch', gender: 'Hen', sire: 'Smoke Sire', dam: 'Smoke Dam', bird_code: '91Ax92B' });
    record('B. duplicate code -> 409', b.status === 409, `status ${b.status} · ${b.json?.error ?? b.text.slice(0, 80)}`);

    const b2 = await post(token, { name: 'Smoke Dup Parent', breed: 'Hatch', gender: 'Hen', bird_code: '91A' });
    record('B2. parent code reused -> 409', b2.status === 409, `status ${b2.status} · ${b2.json?.error ?? ''}`);

    // ── Case C: invalid characters rejected (400) ───────────────────────────
    const c = await post(token, { name: 'Smoke Bad Char', breed: 'Hatch', gender: 'Hen', bird_code: '1A/B' });
    record('C. invalid chars -> 400', c.status === 400, `status ${c.status} · ${c.json?.error ?? ''}`);

    // ── Case D: over-length rejected (400) ──────────────────────────────────
    const d = await post(token, { name: 'Smoke Too Long', breed: 'Hatch', gender: 'Hen', bird_code: 'a'.repeat(25) });
    record('D. 25-char code -> 400', d.status === 400, `status ${d.status} · ${d.json?.error ?? ''}`);

    // ── Case E: manual override accepted and stored verbatim ────────────────
    const e = await post(token, { name: 'Smoke Manual', breed: 'Kelso', gender: 'Rooster', bird_code: 'ZZ9' });
    const eRow = e.status === 201 ? await readRow('Smoke Manual') : null;
    record('E. manual override stored', e.status === 201 && eRow?.bird_code === 'ZZ9', `status ${e.status}, code ${eRow?.bird_code ?? '(walang row)'}`);

    // ── Case F: DB-level unique index actually fires ────────────────────────
    const childA = await readRow('Smoke Child A');
    let fOk = false;
    let fDetail = 'hindi na-abot';
    if (childA) {
      const { error: dupErr } = await admin.from('fowl').update({ bird_code: '91A' }).eq('id', childA.id);
      fOk = dupErr?.code === '23505' || /duplicate key/i.test(dupErr?.message || '');
      fDetail = dupErr ? `${dupErr.code ?? ''} ${dupErr.message}` : 'walang error — index hindi tumama!';
    }
    record('F. unique index blocks duplicate', fOk, fDetail);

    // ── Case G: missing required field rejected (400) ───────────────────────
    const g = await post(token, { breed: 'Hatch', gender: 'Hen' });
    record('G. missing name -> 400', g.status === 400, `status ${g.status} · ${g.json?.error ?? ''}`);
  } finally {
    if (uid) {
      const { error: delRows } = await admin.from('fowl').delete().eq('user_id', uid);
      if (delRows) console.log('cleanup rows ERROR:', delRows.message);
      const { error: delUser } = await admin.auth.admin.deleteUser(uid);
      if (delUser) console.log('cleanup user ERROR:', delUser.message);
      console.log(`\nCleanup: tinanggal ang test user (${EMAIL}) at lahat ng row niya.`);
    }
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} cases passed`);
  if (failed.length) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
