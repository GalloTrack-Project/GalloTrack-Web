import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const envPath = new URL('../.env.local', import.meta.url).pathname.replace(/^\//, '');
const env: Record<string, string> = {};
for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  if (!line.includes('=') || line.startsWith('#')) continue;
  const i = line.indexOf('=');
  env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const REQUIRED = [
  { id: 'fowl-images', public: true },
  { id: 'match-videos', public: true },
];

async function main() {
  const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
  if (listErr) {
    console.error('listBuckets failed:', listErr.message);
    process.exit(1);
  }
  console.log('Existing buckets:', buckets?.map(b => b.name).join(', ') || '(none)');

  for (const b of REQUIRED) {
    const exists = buckets?.some(x => x.name === b.id);
    if (exists) {
      console.log(`OK (exists): ${b.id}`);
      continue;
    }
    const { error } = await supabase.storage.createBucket(b.id, { public: b.public });
    if (error) console.error(`FAILED create ${b.id}:`, error.message);
    else console.log(`CREATED: ${b.id} (public=${b.public})`);
  }

  const { data: after } = await supabase.storage.listBuckets();
  console.log('Buckets now:', after?.map(b => b.name).join(', ') || '(none)');
}

main().catch((e) => { console.error(e); process.exit(1); });
