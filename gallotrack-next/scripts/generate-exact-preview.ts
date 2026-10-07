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
    console.error('Error:', error);
    return;
  }

  const userIds = Array.from(new Set(fowls.map(f => f.user_id)));

  for (const uid of userIds) {
    const userFowls = fowls.filter(f => f.user_id === uid);
    if (userFowls.length === 0) continue;

    console.log(`\n========================================================================================`);
    console.log(`USER: ${uid} (Total chickens: ${userFowls.length})`);
    console.log(`========================================================================================`);

    const ctx = buildRegistryContext(userFowls);
    const byName = new Map<string, FowlRecord>();
    userFowls.forEach(f => {
      const k = (f.name || '').trim().toLowerCase();
      if (k && !byName.has(k)) byName.set(k, f);
    });

    // Sires and Dams in registration order (created_at ascending, then id ascending)
    const siresList = userFowls
      .filter(f => {
        const r = roleOf(f, ctx);
        return r === 'Breeding Male' || (!isKnownParent(f.sire) && !isKnownParent(f.dam) && !isFemaleCode(f.gender));
      })
      .sort((a, b) => (a.created_at || '').localeCompare(b.created_at || '') || a.id - b.id);

    const damsList = userFowls
      .filter(f => {
        const r = roleOf(f, ctx);
        return r === 'Breeding Female' || (!isKnownParent(f.sire) && !isKnownParent(f.dam) && isFemaleCode(f.gender));
      })
      .sort((a, b) => (a.created_at || '').localeCompare(b.created_at || '') || a.id - b.id);

    const proposedSireCodes = new Map<number, string>();
    siresList.forEach((f, idx) => {
      proposedSireCodes.set(f.id, String(idx + 1));
    });

    const proposedDamCodes = new Map<number, string>();
    damsList.forEach((f, idx) => {
      proposedDamCodes.set(f.id, getDamLetter(idx + 1));
    });

    console.log('\n--- SIRES (Breeding Males / Founder Roosters) ---');
    siresList.forEach(s => {
      console.log(`ID ${s.id} | ${s.name.padEnd(20)} | Current: ${(s.bird_code || '—').padEnd(4)} | Proposed: ${proposedSireCodes.get(s.id)} | Registered: ${s.created_at}`);
    });

    console.log('\n--- DAMS (Breeding Females / Founder Hens) ---');
    damsList.forEach(d => {
      console.log(`ID ${d.id} | ${d.name.padEnd(20)} | Current: ${(d.bird_code || '—').padEnd(4)} | Proposed: ${proposedDamCodes.get(d.id)} | Registered: ${d.created_at}`);
    });

    // Offspring (has known sire or dam)
    const offspringList = userFowls.filter(f => isKnownParent(f.sire) || isKnownParent(f.dam));

    // Sort offspring by: Pair, then Birth date ascending (oldest first), then created_at, then name
    // First determine pair prefix for each offspring
    const offspringWithPair = offspringList.map(f => {
      const sName = (f.sire || '').trim().toLowerCase();
      const dName = (f.dam || '').trim().toLowerCase();
      const sireFowl = sName && sName !== 'foundation stock' ? byName.get(sName) : null;
      const damFowl = dName && dName !== 'foundation stock' ? byName.get(dName) : null;

      const sireCode = sireFowl ? proposedSireCodes.get(sireFowl.id) || '0' : '0';
      const damCode = damFowl ? proposedDamCodes.get(damFowl.id) || 'X' : 'X';
      const pairPrefix = `${sireCode}${damCode}`;

      return {
        fowl: f,
        sireFowl,
        damFowl,
        sireCode,
        damCode,
        pairPrefix,
      };
    });

    // Group by pairPrefix
    const pairGroups = new Map<string, typeof offspringWithPair>();
    offspringWithPair.forEach(item => {
      if (!pairGroups.has(item.pairPrefix)) pairGroups.set(item.pairPrefix, []);
      pairGroups.get(item.pairPrefix)!.push(item);
    });

    const proposedOffspringCodes = new Map<number, string>();
    const flaggedRecords: Array<{ fowl: FowlRecord; reason: string }> = [];

    pairGroups.forEach((items, pairPrefix) => {
      // Sort inside pair by: birthdate (oldest = 1), created_at, name
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

      items.forEach((item, seq) => {
        const seqNumber = seq + 1;
        const code = `${pairPrefix}${seqNumber}`;
        proposedOffspringCodes.set(item.fowl.id, code);

        if (!item.sireFowl || !item.damFowl) {
          flaggedRecords.push({
            fowl: item.fowl,
            reason: `Incomplete parents (Sire: "${item.fowl.sire}", Dam: "${item.fowl.dam}")`,
          });
        }
        if (!item.fowl.birthdate) {
          flaggedRecords.push({
            fowl: item.fowl,
            reason: `Missing birth date`,
          });
        }
      });
    });

    console.log('\n--- PROPOSED OFFSPRING CODES PREVIEW ---');
    console.log('ID   | Name                     | Gender  | Sire (Code)         | Dam (Code)          | Birthdate  | Current | Proposed');
    console.log('----------------------------------------------------------------------------------------------------------------------');
    offspringWithPair.forEach(item => {
      const proposed = proposedOffspringCodes.get(item.fowl.id);
      const sireLabel = `${item.fowl.sire} (${item.sireCode})`;
      const damLabel = `${item.fowl.dam} (${item.damCode})`;
      console.log(
        `${String(item.fowl.id).padEnd(4)} | ${item.fowl.name.padEnd(24)} | ${(item.fowl.gender || '').padEnd(7)} | ${sireLabel.padEnd(19)} | ${damLabel.padEnd(19)} | ${(item.fowl.birthdate || 'N/A').padEnd(10)} | ${(item.fowl.bird_code || '—').padEnd(7)} | ${proposed}`
      );
    });

    console.log(`\nFlagged records (${flaggedRecords.length}):`);
    flaggedRecords.forEach(fr => {
      console.log(` - [ID ${fr.fowl.id}] ${fr.fowl.name}: ${fr.reason} -> Proposed: ${proposedOffspringCodes.get(fr.fowl.id)}`);
    });
  }
}

main().catch(console.error);
