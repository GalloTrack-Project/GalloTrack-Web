import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const ENV_PATH = path.resolve(__dirname, '../.env.local');
const env: Record<string, string> = {};
for (const line of fs.readFileSync(ENV_PATH, 'utf8').split(/\r?\n/)) {
  if (!line.includes('=') || line.startsWith('#')) continue;
  const i = line.indexOf('=');
  env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

import { isFemaleCode, numberToLetter, UNKNOWN_DAM_CODE, UNKNOWN_SIRE_CODE, offspringBase } from '../lib/bird-code';
import { isKnownParent } from '../lib/family-tree';
import { roleOf, buildRegistryContext } from '../lib/registry-roles';
import type { FowlRecord } from '../lib/types';

function getDamLetter(index: number): string {
  let count = 0;
  for (let n = 1; n < 100000; n++) {
    const l = numberToLetter(n);
    if (l === UNKNOWN_DAM_CODE) continue; // skip 'X'
    count++;
    if (count === index) return l;
  }
  return 'A';
}

async function main() {
  const { data: fowls, error } = await supabase.from('fowl').select('*').order('id', { ascending: true });
  if (error || !fowls) {
    console.error('Error fetching fowls:', error);
    return;
  }

  console.log(`Fetched ${fowls.length} total fowls across all users.`);

  // Group by user_id
  const userIds = Array.from(new Set(fowls.map(f => f.user_id)));

  const updates: Array<{ id: number; name: string; old_code: string; new_code: string; birth_code: string }> = [];

  for (const uid of userIds) {
    const userFowls = fowls.filter(f => f.user_id === uid);
    if (userFowls.length === 0) continue;

    const ctx = buildRegistryContext(userFowls);
    const byName = new Map<string, FowlRecord>();
    userFowls.forEach(f => {
      const k = (f.name || '').trim().toLowerCase();
      if (k && !byName.has(k)) byName.set(k, f);
    });

    // 1. Sires (Breeding Males / Founder Roosters)
    // Keep existing sire numbers if they exist, otherwise assign 1, 2, 3...
    const siresList = userFowls.filter(f => {
      const r = roleOf(f, ctx);
      return r === 'Breeding Male' || (!isKnownParent(f.sire) && !isKnownParent(f.dam) && !isFemaleCode(f.gender));
    });

    const sireCodes = new Map<number, string>();
    siresList.forEach((s, idx) => {
      const existing = (s.bird_code || '').trim();
      // If existing is a clean number, keep it; else assign index + 1
      if (/^[1-9]\d*$/.test(existing)) {
        sireCodes.set(s.id, existing);
      } else {
        sireCodes.set(s.id, String(idx + 1));
      }
    });

    // 2. Dams (Breeding Females / Founder Hens)
    // Keep existing dam letters if they exist, otherwise assign A, B, C...
    const damsList = userFowls.filter(f => {
      const r = roleOf(f, ctx);
      return r === 'Breeding Female' || (!isKnownParent(f.sire) && !isKnownParent(f.dam) && isFemaleCode(f.gender));
    });

    const damCodes = new Map<number, string>();
    damsList.forEach((d, idx) => {
      const existing = (d.bird_code || '').trim().toUpperCase();
      if (/^[A-Z]+$/.test(existing) && existing !== UNKNOWN_DAM_CODE) {
        damCodes.set(d.id, existing);
      } else {
        damCodes.set(d.id, getDamLetter(idx + 1));
      }
    });

    // 3. Offspring (has known sire or dam)
    const offspringList = userFowls.filter(f => isKnownParent(f.sire) || isKnownParent(f.dam));

    // Group offspring by pair
    const pairMap = new Map<string, Array<{ fowl: FowlRecord; sireCode: string; damCode: string }>>();

    offspringList.forEach(f => {
      const sName = (f.sire || '').trim().toLowerCase();
      const dName = (f.dam || '').trim().toLowerCase();
      const sireFowl = sName && sName !== 'foundation stock' ? byName.get(sName) : null;
      const damFowl = dName && dName !== 'foundation stock' ? byName.get(dName) : null;

      const sireCode = sireFowl ? sireCodes.get(sireFowl.id) || '0' : '0';
      const damCode = damFowl ? damCodes.get(damFowl.id) || 'X' : 'X';
      const pairKey = `${sireCode}${damCode}`;

      if (!pairMap.has(pairKey)) pairMap.set(pairKey, []);
      pairMap.get(pairKey)!.push({ fowl: f, sireCode, damCode });
    });

    pairMap.forEach((items, pairKey) => {
      // Sort inside pair: birthdate (oldest = 1), created_at, name
      items.sort((a, b) => {
        const bDateA = a.fowl.birthdate || '';
        const bDateB = b.fowl.birthdate || '';
        if (bDateA && bDateB && bDateA !== bDateB) return bDateA.localeCompare(bDateB);
        if (bDateA && !bDateB) return -1;
        if (!bDateA && bDateB) return 1;

        const regA = a.fowl.created_at || '';
        const regB = b.fowl.created_at || '';
        if (regA !== regB) return regA.localeCompare(regB);

        return a.fowl.name.localeCompare(b.fowl.name);
      });

      items.forEach((item, idx) => {
        const seq = idx + 1;
        const birthCode = `${pairKey}${seq}`;
        updates.push({
          id: item.fowl.id,
          name: item.fowl.name,
          old_code: item.fowl.bird_code || '',
          new_code: birthCode,
          birth_code: birthCode,
        });
      });
    });
  }

  console.log(`\n========================================================`);
  console.log(`PREPARED ${updates.length} OFFSPRING CODE UPDATES`);
  console.log(`========================================================`);
  updates.forEach(u => {
    console.log(`[ID ${u.id}] ${u.name.padEnd(25)} | Old Code: "${u.old_code.padEnd(4)}" -> New Birth Code: "${u.new_code}"`);
  });

  // Apply updates to Supabase database
  console.log('\nApplying updates to Supabase...');
  for (const u of updates) {
    const { error: updateErr } = await supabase
      .from('fowl')
      .update({
        bird_code: u.new_code,
      })
      .eq('id', u.id);

    if (updateErr) {
      console.error(`Error updating ID ${u.id} (${u.name}):`, updateErr.message);
    }
  }

  console.log('✅ Successfully updated all offspring codes in database!');
}

main().catch(console.error);
