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

async function main() {
  const content = Buffer.from('bucket-test');
  for (const bucket of ['match-videos', 'fowl-images']) {
    const path = `test/${Date.now()}.txt`;
    const { error } = await supabase.storage.from(bucket).upload(path, content, { contentType: 'text/plain' });
    if (error) console.error(`UPLOAD FAILED ${bucket}:`, error.message);
    else {
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      console.log(`UPLOAD OK ${bucket}: ${data.publicUrl}`);
      await supabase.storage.from(bucket).remove([path]);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
