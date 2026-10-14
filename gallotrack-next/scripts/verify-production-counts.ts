import { createClient } from '@supabase/supabase-js';
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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function checkCounts() {
  console.log('--- PRODUCTION READ-ONLY DATABASE AUDIT ---');

  const tables = [
    'fowl',
    'match',
    'profiles',
    'farms',
    'strains',
    'leg_colors',
    'breeding_pairings',
    // 'marketplace_listings', // DEPRECATED — removed from active tables
    'admin_audit_logs',
    'share_links',
    'system_settings',
  ];

  for (const table of tables) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`Table '${table}': ERROR (${error.message})`);
    } else {
      console.log(`Table '${table}': ${count} rows`);
    }
  }

  // Analyze fowl table per user_id
  const { data: fowls } = await supabase.from('fowl').select('user_id, name, registry_role, status');
  if (fowls) {
    const userMap = new Map<string, number>();
    fowls.forEach((f) => {
      userMap.set(f.user_id, (userMap.get(f.user_id) || 0) + 1);
    });

    console.log('\n--- FOWL DISTRIBUTION PER USER_ID ---');
    let idx = 1;
    for (const [uid, cnt] of userMap.entries()) {
      console.log(`User Tenant #${idx++} (${uid.slice(0, 8)}...): ${cnt} chickens`);
    }
  }

  // Storage buckets
  const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
  console.log('\n--- STORAGE BUCKETS ---');
  if (bErr) {
    console.log('Error listing buckets:', bErr.message);
  } else if (buckets) {
    for (const b of buckets) {
      const { data: files } = await supabase.storage.from(b.name).list('', { limit: 1000 });
      console.log(`Bucket '${b.name}' (public: ${b.public}): ${files ? files.length : 0} objects`);
    }
  }
}

checkCounts();
