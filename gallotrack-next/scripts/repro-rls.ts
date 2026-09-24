import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const envPath = new URL('../.env.local', import.meta.url).pathname.replace(/^\//, '');
const env: Record<string, string> = {};
for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  if (!line.includes('=') || line.startsWith('#')) continue;
  const i = line.indexOf('=');
  env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
}

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const TEST_EMAIL = `rls-repro-${Date.now()}@gallotrack.test`;
const TEST_PASSWORD = 'RlsRepro!2026';

async function main() {
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { first_name: 'RLS', last_name: 'Repro' },
  });
  if (createErr) { console.error('createUser failed:', createErr.message); process.exit(1); }
  const uid = created.user!.id;
  console.log('created user', uid, TEST_EMAIL);

  const { error: signInErr } = await anon.auth.signInWithPassword({ email: TEST_EMAIL, password: TEST_PASSWORD });
  if (signInErr) { console.error('signIn failed:', signInErr.message); process.exit(1); }
  console.log('signed in');

  const payload = {
    user_id: uid,
    date: '2026-09-24',
    entry_name: 'RLS Test Fowl',
    breed: 'Test',
    opponent: 'Opponent',
    opponent_breed: 'Test',
    location: 'Test Yard',
    type: 'Derby Match',
    derby_match_number: 1,
    outcome: 'Win',
    status: 'Verified',
    post_fight_condition: 'Fit / Recovered',
    video_url: null,
    cock_count: 2,
    age_category: 'Cock',
    event_type: 'Derby',
  };

  const { error: matchErr } = await anon.from('match').insert([payload]);
  console.log('match insert:', matchErr ? `FAIL: ${matchErr.code} | ${matchErr.message} | ${matchErr.details}` : 'OK');

  const { error: fowlErr } = await anon.from('fowl').insert([{
    user_id: uid,
    name: 'RLS Test Fowl',
    breed: 'Test',
    gender: 'Rooster',
    status: 'Active',
  }]);
  console.log('fowl insert:', fowlErr ? `FAIL: ${fowlErr.code} | ${fowlErr.message}` : 'OK');

  const { error: moErr } = await anon.from('match_options').insert([{
    user_id: uid,
    option_number: 1,
    fowl_entry: 'RLS Test Fowl',
    bet_type: 'durbe',
    target_number: 1,
    status: 'pending',
  }]);
  console.log('match_options insert:', moErr ? `FAIL: ${moErr.code} | ${moErr.message}` : 'OK');

  const { data: session } = await anon.auth.getSession();
  const jwt = session.session?.access_token;
  if (jwt) {
    const payloadB64 = jwt.split('.')[1];
    const claims = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
    console.log('jwt role/sub:', claims.role, claims.sub);
  }

  await anon.auth.signOut();
  await admin.auth.admin.deleteUser(uid);
  console.log('cleaned up test user');
}

main().catch((e) => { console.error(e); process.exit(1); });
