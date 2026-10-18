/**
 * verify-schema-contract.ts — validates that all columns defined in lib/schema-contract.ts
 * exist in the live database schema, and ensures that phantom columns (chicken_code, birth_code, tag_number)
 * do not exist on public.fowl.
 *
 * SAFETY GUARANTEES:
 * - Read-only: executes only SELECT queries with LIMIT 0. Never performs mutations.
 * - Local-only: exits immediately if executed in production/deployment environments (e.g. VERCEL=1).
 * - Never prints secrets: Supabase URLs and API keys are masked or omitted from logs.
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { TABLE_SCHEMAS, TableName } from '../lib/schema-contract';

// Deployment guard: strictly local only
if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
  console.log('[verify:schema] Skipped: this verification script runs locally only.');
  process.exit(0);
}

// Load local environment safely without printing credentials
const envPath = path.resolve(__dirname, '../.env.local');
const env: Record<string, string> = {};
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    if (!line.includes('=') || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[verify:schema] ❌ Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in environment/.env.local');
  process.exit(1);
}

const client = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
});

async function runVerification() {
  console.log('[verify:schema] Starting read-only schema contract verification...');
  let hasErrors = false;

  // 1. Verify all allowed columns exist per table by querying select(col).limit(0)
  for (const [tableName, columns] of Object.entries(TABLE_SCHEMAS) as [TableName, readonly string[]][]) {
    const colList = columns.join(',');
    const { error } = await client.from(tableName).select(colList).limit(0);

    if (error) {
      console.error(`[verify:schema] ❌ Table "${tableName}" failed schema check: ${error.message}`);
      hasErrors = true;
    } else {
      console.log(`[verify:schema] ✔ Table "${tableName}" schema contract verified (${columns.length} columns)`);
    }
  }

  // 2. Explicitly assert that phantom columns do NOT exist on public.fowl
  const phantomColumns = ['chicken_code', 'birth_code', 'tag_number'];
  for (const col of phantomColumns) {
    const { error } = await client.from('fowl').select(col).limit(0);
    if (!error) {
      console.error(`[verify:schema] ❌ Phantom column "${col}" unexpectedly exists on table "fowl"!`);
      hasErrors = true;
    } else {
      console.log(`[verify:schema] ✔ Verified phantom column "${col}" does not exist on table "fowl"`);
    }
  }

  if (hasErrors) {
    console.error('\n[verify:schema] ❌ Schema contract verification failed.');
    process.exit(1);
  } else {
    console.log('\n[verify:schema] 🎉 All schema contracts verified successfully.');
    process.exit(0);
  }
}

runVerification().catch((err) => {
  console.error('[verify:schema] Unexpected execution error:', err?.message || err);
  process.exit(1);
});
