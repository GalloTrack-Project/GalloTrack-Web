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

const TEST_EMAIL = `upload-api-${Date.now()}@gallotrack.test`;
const TEST_PASSWORD = 'UploadApi!2026';

async function main() {
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
  });
  if (createErr) { console.error('createUser failed:', createErr.message); process.exit(1); }
  const uid = created.user!.id;

  const { data: signIn, error: signInErr } = await anon.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  if (signInErr) { console.error('signIn failed:', signInErr.message); process.exit(1); }
  const token = signIn.session!.access_token;

  const form = new FormData();
  const blob = new Blob([Buffer.from('fake-video-bytes')], { type: 'video/mp4' });
  form.append('file', blob, 'test-match.mp4');

  const res = await fetch('http://localhost:3000/api/match/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const body = await res.json();
  console.log('upload status:', res.status);
  console.log('upload body:', JSON.stringify(body, null, 2));

  if (res.ok && body.url) {
    const head = await fetch(body.url, { method: 'HEAD' });
    console.log('public URL HEAD:', head.status);
  }

  await anon.auth.signOut();
  await admin.auth.admin.deleteUser(uid);
  console.log('cleaned up');
}

main().catch((e) => { console.error(e); process.exit(1); });
