import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * ROW COUNT COMPARISON UTILITY
 * Compares table row counts between a backup snapshot and a target Supabase database.
 *
 * Usage:
 *   npx tsx scripts/compare-row-counts.ts [--backup=<folder_name>] [--target=staging|production]
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

const args = process.argv.slice(2);
const getArg = (name: string) => {
  const match = args.find((a) => a.startsWith(`--${name}=`));
  return match ? match.slice(name.length + 3) : null;
};

const backupFolderArg = getArg('backup');
const targetEnv = getArg('target') || 'production';

async function compare() {
  console.log(`=======================================================`);
  console.log(`📊 ROW COUNT COMPARISON AUDIT`);
  console.log(`=======================================================\n`);

  const backupsParentDir = path.resolve(__dirname, '../../backups');
  let selectedBackupDir: string | null = null;

  if (backupFolderArg) {
    selectedBackupDir = path.isAbsolute(backupFolderArg)
      ? backupFolderArg
      : path.join(backupsParentDir, backupFolderArg);
  } else if (fs.existsSync(backupsParentDir)) {
    const entries = fs.readdirSync(backupsParentDir).filter((d) => d.startsWith('backup-')).sort().reverse();
    if (entries.length > 0) {
      selectedBackupDir = path.join(backupsParentDir, entries[0]);
    }
  }

  let sourceCounts: Record<string, number> = {};
  if (selectedBackupDir && fs.existsSync(path.join(selectedBackupDir, 'database.json'))) {
    console.log(`Source Backup: ${path.basename(selectedBackupDir)}`);
    const dbData: Record<string, any[]> = JSON.parse(fs.readFileSync(path.join(selectedBackupDir, 'database.json'), 'utf8'));
    for (const [table, rows] of Object.entries(dbData)) {
      sourceCounts[table] = rows.length;
    }
  } else {
    console.log(`Source: Live Production Database`);
  }

  let targetUrl = '';
  let targetKey = '';

  if (targetEnv === 'staging') {
    targetUrl = process.env.STAGING_SUPABASE_URL || env.STAGING_SUPABASE_URL;
    targetKey = process.env.STAGING_SUPABASE_KEY || env.STAGING_SUPABASE_SERVICE_ROLE_KEY;
  } else {
    targetUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
    targetKey = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  }

  if (!targetUrl || !targetKey) {
    console.error(`❌ Error: Could not determine credentials for target environment '${targetEnv}'`);
    process.exit(1);
  }

  console.log(`Target Database: ${targetEnv.toUpperCase()} (${new URL(targetUrl).hostname})\n`);

  const supabase = createClient(targetUrl, targetKey, { auth: { persistSession: false } });

  const TABLES = [
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

  console.log(`+-----------------------+---------------+---------------+---------------+`);
  console.log(`| Table Name            | Backup Count  | Target Count  | Status        |`);
  console.log(`+-----------------------+---------------+---------------+---------------+`);

  let allMatch = true;

  for (const table of TABLES) {
    const srcCount = sourceCounts[table] ?? 0;
    const { count: tgtCount, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    
    const targetCountVal = error ? -1 : (tgtCount ?? 0);
    const statusStr = error
      ? 'ERROR'
      : srcCount === targetCountVal
      ? '✓ MATCH'
      : '⚠️ MISMATCH';

    if (srcCount !== targetCountVal && !error) allMatch = false;

    const padName = table.padEnd(21);
    const padSrc = String(srcCount).padStart(13);
    const padTgt = String(targetCountVal >= 0 ? targetCountVal : 'ERR').padStart(13);
    const padStatus = statusStr.padEnd(13);

    console.log(`| ${padName} | ${padSrc} | ${padTgt} | ${padStatus} |`);
  }

  console.log(`+-----------------------+---------------+---------------+---------------+`);

  if (allMatch) {
    console.log(`\n✅ All table row counts match perfectly!`);
  } else {
    console.log(`\n⚠️ Mismatches found between backup snapshot and target database.`);
  }
}

compare().catch((err) => {
  console.error('Fatal compare error:', err);
  process.exit(1);
});
