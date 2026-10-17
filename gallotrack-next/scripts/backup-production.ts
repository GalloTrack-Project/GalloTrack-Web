import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

/**
 * PRODUCTION & STAGING DATABASE & STORAGE BACKUP SCRIPT
 *
 * Capabilities:
 * - Dynamically derives tables from live PostgREST schema (/rest/v1/).
 * - Excludes derived SQL views and snapshot/backup tables (logging rationale).
 * - Recursively traverses all storage subdirectories preserving folder paths.
 * - Handles storage pagination beyond 1000 objects.
 * - Supports owner-scoped backup via `--owner <user_id>`.
 * - Computes SHA-256 checksums for every downloaded file.
 * - Creates manifest.json with table counts, storage metadata, and checksums.
 * - Fails loudly if live counts mismatch or any download fails.
 * - Never prints secret keys or auth tokens.
 *
 * Usage:
 *   npx tsx scripts/backup-production.ts [--owner <user_id>]
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
function getArg(name: string): string | null {
  for (let i = 0; i < args.length; i++) {
    if (args[i] === `--${name}` && args[i + 1]) {
      return args[i + 1];
    }
    if (args[i].startsWith(`--${name}=`)) {
      return args[i].slice(name.length + 3);
    }
  }
  return null;
}

const ownerArg = getArg('owner');

const supabaseUrl = process.env.BACKUP_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.BACKUP_SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Error: BACKUP_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

interface SchemaItem {
  name: string;
  type: 'table' | 'view' | 'snapshot' | 'rpc';
  reason?: string;
}

interface StorageFile {
  name: string;
  id: string | null;
  updated_at?: string;
  created_at?: string;
  last_accessed_at?: string;
  metadata?: Record<string, any> | null;
}

interface ManifestFileEntry {
  path: string;
  size: number;
  sha256: string;
}

interface ManifestTableEntry {
  rowCount: number;
  liveCount: number;
  status: 'verified' | 'mismatch' | 'error';
  note?: string;
}

interface BackupManifest {
  manifestVersion: string;
  timestamp: string;
  targetHost: string;
  ownerScope: string | null;
  tables: Record<string, ManifestTableEntry>;
  storage: Record<
    string,
    {
      fileCount: number;
      totalBytes: number;
      files: ManifestFileEntry[];
    }
  >;
  schemaAudit: {
    includedTables: string[];
    excludedItems: { name: string; type: string; reason: string }[];
  };
  summary: {
    totalTablesBackedUp: number;
    totalRowsBackedUp: number;
    totalFilesDownloaded: number;
    totalStorageBytesDownloaded: number;
  };
}

async function discoverSchema(): Promise<{
  activeTables: string[];
  excludedItems: { name: string; type: string; reason: string }[];
}> {
  const res = await fetch(`${supabaseUrl}/rest/v1/`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to query OpenAPI schema from ${supabaseUrl}: HTTP ${res.status}`);
  }

  const openApi = await res.json();
  const definitions: Record<string, any> = openApi.definitions || {};

  const activeTables: string[] = [];
  const excludedItems: { name: string; type: string; reason: string }[] = [];

  for (const name of Object.keys(definitions)) {
    // 1. Views
    if (name.startsWith('vw_')) {
      excludedItems.push({
        name,
        type: 'view',
        reason: 'Derived SQL view (computed, non-relational table)',
      });
      continue;
    }

    // 2. Snapshots or backup archives
    if (/backup/i.test(name)) {
      excludedItems.push({
        name,
        type: 'snapshot',
        reason: 'Snapshot / point-in-time recovery archive table (skipped per safety net protocol)',
      });
      continue;
    }

    // 3. RPC functions
    if (name.startsWith('rpc/')) {
      excludedItems.push({
        name,
        type: 'rpc',
        reason: 'Stored function / RPC endpoint',
      });
      continue;
    }

    // Live schema table
    activeTables.push(name);
  }

  // Check known requested tables that do not exist in live schema
  const knownPotentialTables = ['match_options'];
  for (const kt of knownPotentialTables) {
    if (!definitions[kt]) {
      excludedItems.push({
        name: kt,
        type: 'missing_table',
        reason: 'Table does not exist in live database schema (not exposed by PostgREST)',
      });
    }
  }

  return { activeTables: activeTables.sort(), excludedItems };
}

async function listRecursive(bucket: string, prefix = ''): Promise<{ path: string; size: number }[]> {
  const result: { path: string; size: number }[] = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });

    if (error) {
      throw new Error(`Failed listing storage in bucket '${bucket}', prefix '${prefix}': ${error.message}`);
    }

    if (!data || data.length === 0) break;

    for (const item of data as StorageFile[]) {
      if (!item.name || item.name.startsWith('.')) continue;

      const fullItemPath = prefix ? `${prefix}/${item.name}` : item.name;

      if (item.id === null) {
        // Subdirectory - traverse recursively
        const subFiles = await listRecursive(bucket, fullItemPath);
        result.push(...subFiles);
      } else {
        const size = item.metadata?.size ?? 0;
        result.push({ path: fullItemPath, size });
      }
    }

    if (data.length < limit) break;
    offset += limit;
  }

  return result;
}

function sha256(buf: Buffer): string {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

async function backup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.resolve(__dirname, `../../backups/backup-${timestamp}`);
  fs.mkdirSync(backupDir, { recursive: true });

  const targetHost = new URL(supabaseUrl).hostname;
  console.log(`=======================================================`);
  console.log(`📦 GALLOTRACK DATABASE & STORAGE BACKUP`);
  console.log(`Destination: ${backupDir}`);
  console.log(`Target Supabase Host: ${targetHost}`);
  console.log(`Owner Scope: ${ownerArg ? ownerArg : 'ALL (Full Database Backup)'}`);
  console.log(`=======================================================\n`);

  // 1. Schema Discovery
  console.log('--- 1. Live Schema Discovery ---');
  const { activeTables, excludedItems } = await discoverSchema();
  console.log(`Discovered ${activeTables.length} active database tables to back up:`);
  console.log(`  ${activeTables.join(', ')}`);

  console.log(`\nExcluded Schema Objects (${excludedItems.length}):`);
  for (const ex of excludedItems) {
    console.log(`  • ${ex.name} [${ex.type}]: ${ex.reason}`);
  }

  // 2. Fetch and Export Tables
  console.log('\n--- 2. Exporting Database Tables ---');
  const dbBackup: Record<string, any[]> = {};
  const manifestTables: Record<string, ManifestTableEntry> = {};

  // For owner scope: pre-fetch owner's fowl IDs to correctly filter fowl_status_history
  let ownerFowlIds: number[] = [];
  if (ownerArg) {
    const { data: ownerFowls, error: fErr } = await supabase
      .from('fowl')
      .select('id')
      .eq('user_id', ownerArg);
    if (fErr) {
      throw new Error(`Failed to fetch owner fowls for scope filtering: ${fErr.message}`);
    }
    ownerFowlIds = (ownerFowls || []).map((f) => f.id);
  }

  for (const table of activeTables) {
    try {
      // Build query and live count query based on scope
      let selectQuery = supabase.from(table).select('*');
      let countQuery = supabase.from(table).select('*', { count: 'exact', head: true });

      if (ownerArg) {
        if (table === 'fowl') {
          selectQuery = selectQuery.eq('user_id', ownerArg);
          countQuery = countQuery.eq('user_id', ownerArg);
        } else if (table === 'match') {
          selectQuery = selectQuery.eq('user_id', ownerArg);
          countQuery = countQuery.eq('user_id', ownerArg);
        } else if (table === 'breeding_pairings') {
          selectQuery = selectQuery.eq('user_id', ownerArg);
          countQuery = countQuery.eq('user_id', ownerArg);
        } else if (table === 'share_links') {
          selectQuery = selectQuery.eq('user_id', ownerArg);
          countQuery = countQuery.eq('user_id', ownerArg);
        } else if (table === 'profiles') {
          selectQuery = selectQuery.eq('id', ownerArg);
          countQuery = countQuery.eq('id', ownerArg);
        } else if (table === 'farms') {
          selectQuery = selectQuery.eq('owner_id', ownerArg);
          countQuery = countQuery.eq('owner_id', ownerArg);
        } else if (table === 'fowl_status_history') {
          if (ownerFowlIds.length > 0) {
            selectQuery = selectQuery.in('fowl_id', ownerFowlIds);
            countQuery = countQuery.in('fowl_id', ownerFowlIds);
          } else {
            selectQuery = selectQuery.in('fowl_id', [-999999]);
            countQuery = countQuery.in('fowl_id', [-999999]);
          }
        } else if (
          [
            'registry_options',
            'user_settings',
            'safety_incidents',
            'fowl_identifier_counters',
            'match_photos',
            'match_videos',
            'fowl_photos',
          ].includes(table)
        ) {
          selectQuery = selectQuery.eq('user_id', ownerArg);
          countQuery = countQuery.eq('user_id', ownerArg);
        } else if (table === 'admin_audit_logs') {
          selectQuery = selectQuery.eq('admin_id', ownerArg);
          countQuery = countQuery.eq('admin_id', ownerArg);
        } else {
          // System reference tables without user_id (strains, leg_colors, system_settings)
          // In owner-scoped personal backup, these are omitted so personal backup has no cross-user/system data
          dbBackup[table] = [];
          manifestTables[table] = {
            rowCount: 0,
            liveCount: 0,
            status: 'verified',
            note: 'System reference table (omitted from owner-scoped backup)',
          };
          console.log(`  ✓ Table '${table}': 0 rows (system table skipped for owner-scoped backup)`);
          continue;
        }
      }

      // Fetch live count
      const { count: liveCount, error: countErr } = await countQuery;
      if (countErr) {
        throw new Error(`Failed to query live count for table '${table}': ${countErr.message}`);
      }
      const expectedCount = liveCount ?? 0;

      // Fetch actual rows
      const { data: rows, error: selectErr } = await selectQuery;
      if (selectErr) {
        throw new Error(`Failed to select rows from table '${table}': ${selectErr.message}`);
      }

      const rowCount = rows ? rows.length : 0;

      // Fail loudly if counts differ
      if (rowCount !== expectedCount) {
        throw new Error(
          `ROW COUNT MISMATCH for table '${table}': live count was ${expectedCount}, but exported ${rowCount} rows!`,
        );
      }

      dbBackup[table] = rows || [];
      manifestTables[table] = {
        rowCount,
        liveCount: expectedCount,
        status: 'verified',
      };

      console.log(`  ✓ Table '${table}': ${rowCount} rows (verified match against live count ${expectedCount})`);
    } catch (err: any) {
      console.error(`❌ Table '${table}' backup failed:`, err.message);
      throw err;
    }
  }

  // Save database.json
  const dbJsonPath = path.join(backupDir, 'database.json');
  fs.writeFileSync(dbJsonPath, JSON.stringify(dbBackup, null, 2), 'utf8');
  console.log(`  💾 Saved database.json (${(fs.statSync(dbJsonPath).size / 1024).toFixed(1)} KB)`);

  // 3. Storage Bucket Files Download
  console.log('\n--- 3. Backing up Storage Buckets (Recursive) ---');
  const storageDir = path.join(backupDir, 'storage');
  fs.mkdirSync(storageDir, { recursive: true });

  const { data: bucketList, error: bListErr } = await supabase.storage.listBuckets();
  if (bListErr) {
    throw new Error(`Failed to list storage buckets: ${bListErr.message}`);
  }

  const allBucketNames = Array.from(
    new Set(['fowl-images', 'match-videos', 'match-photos', ...(bucketList ? bucketList.map((b) => b.name) : [])]),
  );

  const manifestStorage: Record<
    string,
    {
      fileCount: number;
      totalBytes: number;
      files: ManifestFileEntry[];
    }
  > = {};

  let totalFilesDownloaded = 0;
  let totalStorageBytesDownloaded = 0;

  for (const bucket of allBucketNames) {
    const bucketLocalDir = path.join(storageDir, bucket);
    fs.mkdirSync(bucketLocalDir, { recursive: true });

    let allObjects: { path: string; size: number }[] = [];
    try {
      allObjects = await listRecursive(bucket, '');
    } catch (listErr: any) {
      console.warn(`  ℹ️ Bucket '${bucket}': unable to list or empty (${listErr.message})`);
      manifestStorage[bucket] = { fileCount: 0, totalBytes: 0, files: [] };
      continue;
    }

    // Scope filtering for storage
    let filesToDownload = allObjects;
    if (ownerArg) {
      // In owner mode, only download files belonging to the owner
      // (paths starting with `${ownerArg}/` or matching URLs in owner's records)
      filesToDownload = allObjects.filter((f) => {
        if (f.path.startsWith(`${ownerArg}/`)) return true;
        if (f.path.startsWith(`profiles/${ownerArg}`)) return true;
        return false;
      });
    }

    console.log(
      `  ✓ Bucket '${bucket}': ${allObjects.length} total objects in bucket; downloading ${filesToDownload.length} object(s)...`,
    );

    const bucketFilesManifest: ManifestFileEntry[] = [];
    let bucketTotalBytes = 0;

    for (const file of filesToDownload) {
      try {
        const { data: fileBlob, error: dlErr } = await supabase.storage.from(bucket).download(file.path);
        if (dlErr || !fileBlob) {
          throw new Error(`Download error for ${bucket}/${file.path}: ${dlErr?.message || 'Empty response'}`);
        }

        const buffer = Buffer.from(await fileBlob.arrayBuffer());
        const checksum = sha256(buffer);

        const localFilePath = path.join(bucketLocalDir, file.path);
        fs.mkdirSync(path.dirname(localFilePath), { recursive: true });
        fs.writeFileSync(localFilePath, buffer);

        bucketTotalBytes += buffer.length;
        totalStorageBytesDownloaded += buffer.length;
        totalFilesDownloaded++;

        bucketFilesManifest.push({
          path: file.path,
          size: buffer.length,
          sha256: checksum,
        });

        console.log(`    📥 Downloaded ${file.path} (${(buffer.length / 1024).toFixed(1)} KB, sha256: ${checksum.slice(0, 12)}...)`);
      } catch (dlException: any) {
        console.error(`❌ FAILED downloading object ${bucket}/${file.path}:`, dlException.message);
        throw dlException;
      }
    }

    manifestStorage[bucket] = {
      fileCount: bucketFilesManifest.length,
      totalBytes: bucketTotalBytes,
      files: bucketFilesManifest,
    };
  }

  // 4. Generate manifest.json
  const totalRows = Object.values(manifestTables).reduce((acc, t) => acc + t.rowCount, 0);
  const manifest: BackupManifest = {
    manifestVersion: '1.0',
    timestamp: new Date().toISOString(),
    targetHost,
    ownerScope: ownerArg || null,
    tables: manifestTables,
    storage: manifestStorage,
    schemaAudit: {
      includedTables: activeTables,
      excludedItems,
    },
    summary: {
      totalTablesBackedUp: activeTables.length,
      totalRowsBackedUp: totalRows,
      totalFilesDownloaded,
      totalStorageBytesDownloaded,
    },
  };

  const manifestPath = path.join(backupDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

  // Also write legacy metadata.json for backward compatibility with older tools
  const metaPath = path.join(backupDir, 'metadata.json');
  fs.writeFileSync(
    metaPath,
    JSON.stringify(
      {
        timestamp: manifest.timestamp,
        targetUrlHost: targetHost,
        ownerScope: ownerArg || null,
        tableCounts: Object.fromEntries(Object.entries(manifestTables).map(([k, v]) => [k, v.rowCount])),
        storageCounts: Object.fromEntries(Object.entries(manifestStorage).map(([k, v]) => [k, v.fileCount])),
      },
      null,
      2,
    ),
    'utf8',
  );

  console.log(`\n=======================================================`);
  console.log(`✅ BACKUP COMPLETED AND VERIFIED`);
  console.log(`Manifest: ${manifestPath}`);
  console.log(`Summary:`);
  console.log(`  • Tables Backed Up: ${activeTables.length}`);
  console.log(`  • Total Rows: ${totalRows}`);
  console.log(`  • Files Downloaded: ${totalFilesDownloaded} (${(totalStorageBytesDownloaded / (1024 * 1024)).toFixed(2)} MB)`);
  console.log(`=======================================================\n`);
}

backup().catch((err) => {
  console.error('\n💥 FATAL BACKUP ERROR (terminating with code 1):', err.message);
  process.exit(1);
});
