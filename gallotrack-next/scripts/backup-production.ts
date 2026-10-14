import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * PRODUCTION & STAGING DATABASE & STORAGE BACKUP SCRIPT
 * Reads database tables and storage bucket files using environment variables.
 * Saves outputs to a timestamped git-ignored backups/ directory.
 *
 * Usage:
 *   npx tsx scripts/backup-production.ts
 */

const ENV_PATH = path.resolve(__dirname, '../.env.local');
const env: Record<string, string> = {};
if (fs.existsSync(ENV_PATH)) {
  for (const line of fs.readFileSync(ENV_PATH, 'utf8').split(/\r?\n/)) {
    if (!line.includes('=') || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
}

const supabaseUrl = process.env.BACKUP_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.BACKUP_SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Error: BACKUP_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

const TABLES_TO_BACKUP = [
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

const BUCKETS_TO_BACKUP = ['fowl-images', 'match-videos', 'match-photos'];

async function backup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.resolve(__dirname, `../../backups/backup-${timestamp}`);
  fs.mkdirSync(backupDir, { recursive: true });

  console.log(`=======================================================`);
  console.log(`📦 GALLOTRACK DATABASE & STORAGE BACKUP`);
  console.log(`Destination: ${backupDir}`);
  console.log(`Target URL: ${supabaseUrl.replace(/https?:\/\//, '').slice(0, 12)}...`);
  console.log(`=======================================================\n`);

  const dbBackup: Record<string, any[]> = {};
  const metadata: Record<string, any> = {
    timestamp: new Date().toISOString(),
    targetUrlHost: new URL(supabaseUrl).hostname,
    tableCounts: {},
    storageCounts: {},
  };

  // 1. Database Table Export
  console.log('--- 1. Backing up Database Tables ---');
  for (const table of TABLES_TO_BACKUP) {
    try {
      const { data, error } = await supabase.from(table).select('*');
      if (error) {
        console.warn(`  ⚠️ Table '${table}': ${error.message}`);
        dbBackup[table] = [];
        metadata.tableCounts[table] = 0;
      } else {
        const count = data ? data.length : 0;
        dbBackup[table] = data || [];
        metadata.tableCounts[table] = count;
        console.log(`  ✓ Table '${table}': ${count} rows`);
      }
    } catch (err: any) {
      console.warn(`  ⚠️ Table '${table}' failed: ${err.message}`);
      dbBackup[table] = [];
      metadata.tableCounts[table] = 0;
    }
  }

  // Save DB JSON
  const dbJsonPath = path.join(backupDir, 'database.json');
  fs.writeFileSync(dbJsonPath, JSON.stringify(dbBackup, null, 2), 'utf8');
  console.log(`  💾 Saved database.json (${(fs.statSync(dbJsonPath).size / 1024).toFixed(1)} KB)`);

  // 2. Storage Bucket Files Download
  console.log('\n--- 2. Backing up Storage Buckets ---');
  const storageDir = path.join(backupDir, 'storage');
  fs.mkdirSync(storageDir, { recursive: true });

  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketNames = Array.from(new Set([...BUCKETS_TO_BACKUP, ...(buckets ? buckets.map((b) => b.name) : [])]));

  for (const bucket of bucketNames) {
    const bucketLocalDir = path.join(storageDir, bucket);
    fs.mkdirSync(bucketLocalDir, { recursive: true });

    const { data: files, error } = await supabase.storage.from(bucket).list('', { limit: 1000 });
    if (error || !files) {
      console.log(`  ℹ️ Bucket '${bucket}': empty or not found`);
      metadata.storageCounts[bucket] = 0;
      continue;
    }

    const validFiles = files.filter((f) => f.name && !f.name.startsWith('.') && f.id !== null && f.metadata !== null);
    metadata.storageCounts[bucket] = validFiles.length;
    console.log(`  ✓ Bucket '${bucket}': downloading ${validFiles.length} objects...`);

    for (const file of validFiles) {
      try {
        const { data: fileData, error: dlErr } = await supabase.storage.from(bucket).download(file.name);
        if (dlErr || !fileData) {
          console.warn(`    ⚠️ Failed downloading ${file.name}: ${dlErr?.message}`);
          continue;
        }
        const buffer = Buffer.from(await fileData.arrayBuffer());
        const filePath = path.join(bucketLocalDir, file.name);
        fs.writeFileSync(filePath, buffer);
      } catch (err: any) {
        console.warn(`    ⚠️ Error saving file ${file.name}: ${err.message}`);
      }
    }
  }

  // Save metadata
  const metaPath = path.join(backupDir, 'metadata.json');
  fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), 'utf8');

  console.log(`\n=======================================================`);
  console.log(`✅ BACKUP COMPLETED SUCCESSFULLY`);
  console.log(`Location: ${backupDir}`);
  console.log(`=======================================================\n`);
}

backup().catch((err) => {
  console.error('Fatal backup error:', err);
  process.exit(1);
});
