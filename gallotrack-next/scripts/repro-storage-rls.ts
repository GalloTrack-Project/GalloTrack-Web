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

const TEST_EMAIL = `storage-rls-${Date.now()}@gallotrack.test`;
const TEST_PASSWORD = 'StorageRls!2026';

async function main() {
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
  });
  if (createErr) { console.error('createUser failed:', createErr.message); process.exit(1); }
  const uid = created.user!.id;

  const { error: signInErr } = await anon.auth.signInWithPassword({ email: TEST_EMAIL, password: TEST_PASSWORD });
  if (signInErr) { console.error('signIn failed:', signInErr.message); process.exit(1); }

  const blob = Buffer.from('auth-upload-test');
  const path = `match-videos/${Date.now()}.mp4`;
  const { error: upErr } = await anon.storage.from('match-videos').upload(path, blob, { contentType: 'video/mp4' });
  console.log('authenticated match-videos upload:', upErr ? `FAIL: ${upErr.message}` : 'OK');

  const path2 = `fowl/${Date.now()}.jpg`;
  const { error: upErr2 } = await anon.storage.from('fowl-images').upload(path2, blob, { contentType: 'image/jpeg' });
  console.log('authenticated fowl-images/fowl upload:', upErr2 ? `FAIL: ${upErr2.message}` : 'OK');

  // full app-like match insert
  const { error: matchErr } = await anon.from('match').insert([{
    user_id: uid,
    date: '2026-09-24',
    entry_name: 'Storage RLS Test',
    breed: 'Test',
    opponent: 'X',
    opponent_breed: 'Y',
    location: 'Z',
    type: 'Derby Match',
    derby_match_number: 1,
    outcome: 'Win',
    status: 'Verified',
    post_fight_condition: 'Fit / Recovered',
    video_url: upErr ? null : `https://example.com/${path}`,
    cock_count: 2,
    age_category: 'Cock',
    event_type: 'Derby',
  }]);
  console.log('match insert:', matchErr ? `FAIL: ${matchErr.message}` : 'OK');

  await anon.auth.signOut();
  await admin.auth.admin.deleteUser(uid);
  console.log('cleaned up');
}

main().catch((e) => { console.error(e); process.exit(1); });
