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

async function main() {
  const { data: rows, error } = await admin
    .from('fowl')
    .select('id, user_id, name, gender, status, sire, dam, bird_code, wing_band, created_at')
    .order('id');
  if (error) {
    console.error('Error fetching fowls:', error.message);
    return;
  }

  console.log(`Fetched ${rows.length} chickens.`);
  const sample = rows.slice(0, 30);
  console.log(JSON.stringify(sample, null, 2));

  // Check unique user_ids
  const userIds = Array.from(new Set(rows.map(r => r.user_id)));
  console.log(`Users count: ${userIds.length}, Users:`, userIds);

  // Check parents that are missing or 'Foundation Stock' or ambiguous
  const names = new Set(rows.map(r => (r.name || '').trim().toLowerCase()));
  const missingSire = rows.filter(r => {
    const s = (r.sire || '').trim().toLowerCase();
    return !s || (s !== 'foundation stock' && !names.has(s));
  });
  const missingDam = rows.filter(r => {
    const d = (r.dam || '').trim().toLowerCase();
    return !d || (d !== 'foundation stock' && !names.has(d));
  });

  console.log(`Chickens with missing/unmatched Sire: ${missingSire.length}`);
  missingSire.forEach(f => console.log(`  - [ID ${f.id}] ${f.name} (Gender: ${f.gender}) Sire: "${f.sire}" Dam: "${f.dam}" Current Code: "${f.bird_code}"`));

  console.log(`Chickens with missing/unmatched Dam: ${missingDam.length}`);
  missingDam.forEach(f => console.log(`  - [ID ${f.id}] ${f.name} (Gender: ${f.gender}) Sire: "${f.sire}" Dam: "${f.dam}" Current Code: "${f.bird_code}"`));
}

main();
