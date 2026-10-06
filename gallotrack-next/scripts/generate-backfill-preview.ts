import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import { offspringBase } from '../lib/bird-code';

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

function numberToLetter(n: number): string {
  let value = Math.max(1, Math.floor(Number(n) || 1));
  let out = '';
  while (value > 0) {
    value -= 1;
    out = String.fromCharCode(65 + (value % 26)) + out;
    value = Math.floor(value / 26);
  }
  return out;
}

// Dams sequence: A, B, C... W, Y, Z, AA... (skipping single 'X' reserved for unknown dam)
function getDamLetter(index: number): string {
  let count = 0;
  for (let n = 1; n < 100000; n++) {
    const l = numberToLetter(n);
    if (l === 'X') continue; // skip single X
    count++;
    if (count === index) return l;
  }
  return 'A';
}

async function main() {
  const { data: rows, error } = await admin
    .from('fowl')
    .select('id, user_id, name, gender, status, sire, dam, bird_code, wing_band, created_at')
    .order('id');
  if (error) {
    console.error('Error fetching fowls:', error.message);
    return;
  }

  // Group by user_id
  const byUser = new Map<string, typeof rows>();
  for (const r of rows) {
    if (!byUser.has(r.user_id)) byUser.set(r.user_id, []);
    byUser.get(r.user_id)!.push(r);
  }

  for (const [userId, fowls] of byUser.entries()) {
    console.log(`\n======================================================`);
    console.log(`USER: ${userId} (${fowls.length} chickens)`);
    console.log(`======================================================`);

    const byName = new Map<string, typeof fowls[0]>();
    for (const f of fowls) {
      const k = (f.name || '').trim().toLowerCase();
      if (k) byName.set(k, f);
    }

    // 1. Separate Founders vs Offspring
    // Founder: sire & dam are 'Foundation Stock' or empty or missing
    // Offspring: has recorded sire or dam (or both)
    const siresFounders: typeof fowls = [];
    const damsFounders: typeof fowls = [];
    const offspring: typeof fowls = [];
    const flaggedMissingParents: Array<{ fowl: typeof fowls[0]; reason: string }> = [];

    for (const f of fowls) {
      const s = (f.sire || '').trim().toLowerCase();
      const d = (f.dam || '').trim().toLowerCase();
      const isSireFounder = !s || s === 'foundation stock';
      const isDamFounder = !d || d === 'foundation stock';

      if (isSireFounder && isDamFounder) {
        if (f.gender === 'Hen' || f.gender === 'Female') {
          damsFounders.push(f);
        } else {
          siresFounders.push(f);
        }
      } else {
        // Offspring
        offspring.push(f);
        // Check if sire or dam named doesn't exist in registry
        const sireExists = s && s !== 'foundation stock' && byName.has(s);
        const damExists = d && d !== 'foundation stock' && byName.has(d);
        if ((s && s !== 'foundation stock' && !sireExists) || (d && d !== 'foundation stock' && !damExists)) {
          flaggedMissingParents.push({
            fowl: f,
            reason: `Named parent not found in registry (Sire: "${f.sire}", Dam: "${f.dam}")`
          });
        } else if (isSireFounder || isDamFounder) {
          flaggedMissingParents.push({
            fowl: f,
            reason: `One parent is unknown / foundation stock (Sire: "${f.sire}", Dam: "${f.dam}")`
          });
        }
      }
    }

    // Assign founder codes
    const assignedCodes = new Map<number, string>();
    siresFounders.forEach((f, idx) => {
      assignedCodes.set(f.id, String(idx + 1));
    });

    damsFounders.forEach((f, idx) => {
      assignedCodes.set(f.id, getDamLetter(idx + 1));
    });

    // Assign offspring codes
    // Pair map: pairKey -> count
    const pairCounters = new Map<string, number>();

    for (const f of offspring) {
      const s = (f.sire || '').trim().toLowerCase();
      const d = (f.dam || '').trim().toLowerCase();

      const sireBird = s && s !== 'foundation stock' ? byName.get(s) : null;
      const damBird = d && d !== 'foundation stock' ? byName.get(d) : null;

      const sireCode = sireBird ? assignedCodes.get(sireBird.id) || '0' : '0';
      const damCode = damBird ? assignedCodes.get(damBird.id) || 'X' : 'X';

      const pairKey = offspringBase(sireCode, damCode);
      const nextSeq = (pairCounters.get(pairKey) || 0) + 1;
      pairCounters.set(pairKey, nextSeq);

      const code = `${pairKey}${nextSeq}`;
      assignedCodes.set(f.id, code);
    }

    console.log(`\nPROPOSED CODES PREVIEW:`);
    console.log(`-------------------------------------------------------------------------------------------------`);
    console.log(`ID | Chicken Name                | Gender  | Current Code | Proposed Code | Parents`);
    console.log(`-------------------------------------------------------------------------------------------------`);
    for (const f of fowls) {
      const proposed = assignedCodes.get(f.id);
      const isFlagged = flaggedMissingParents.some(p => p.fowl.id === f.id);
      const flagMark = isFlagged ? '⚠️ ' : '  ';
      console.log(
        `${String(f.id).padEnd(4)} | ${flagMark}${f.name.padEnd(25)} | ${(f.gender || '').padEnd(7)} | ${(f.bird_code || '—').padEnd(12)} | ${(proposed || '—').padEnd(13)} | Sire: ${f.sire || 'None'}, Dam: ${f.dam || 'None'}`
      );
    }

    if (flaggedMissingParents.length > 0) {
      console.log(`\n⚠️  FLAGGED RECORDS NEEDING ATTENTION (${flaggedMissingParents.length}):`);
      for (const item of flaggedMissingParents) {
        console.log(` - [ID ${item.fowl.id}] ${item.fowl.name}: ${item.reason} -> Proposed Code: ${assignedCodes.get(item.fowl.id)}`);
      }
    }
  }
}

main();
