/**
 * GalloTrack i18n Translation Exporter
 *
 * Exports strongly-typed translation dictionaries into:
 *   1. JSON files per language -> locales/{en,tl,hil}.json
 *   2. A combined CSV review sheet -> docs/i18n-review/translations.csv
 *
 * CSV columns: key, en, tl, tl_status, hil, hil_status
 * Status: "reviewed" if value matches en (preserved gamefowl term),
 *         "unreviewed" if translated (hil is always "unreviewed" per glossary policy),
 *         "needs_change" if value is blank/missing.
 *
 * Usage:
 *   npm run i18n:export
 */

import fs from 'node:fs';
import path from 'node:path';
import { en } from '../lib/i18n/en';
import { tl } from '../lib/i18n/tl';
import { hil } from '../lib/i18n/hil';
import { REVIEW_NOTES } from './i18n-review-notes';

const JSON_DIR = path.resolve(__dirname, '../locales');
const CSV_DIR = path.resolve(__dirname, '../docs/i18n-review');

// Keys whose value is the same across all languages (gamefowl terms, proper nouns)
const ALWAYS_REVIEWED_VALUES = new Set([
  'Sire', 'Dam', 'Offspring', 'Cock', 'Stag', 'Bull Stag', 'Pullet', 'Hen', 'Chick',
  'Purebred', 'Crossbred', 'Outcross', 'Unverified Lineage', 'Open',
  'Tabla', 'No Contest', 'Wala Laban', 'Walang Laban',
  'Dashboard', 'Beta', 'Portal', 'Admin',
  'English', 'Tagalog', 'Hiligaynon',
  'v1.0.0',
]);

function classifyStatus(
  enVal: string,
  localVal: string | undefined,
  lang: 'tl' | 'hil',
): 'reviewed' | 'unreviewed' | 'needs_change' {
  if (!localVal) return 'needs_change';
  if (ALWAYS_REVIEWED_VALUES.has(localVal)) return 'reviewed';
  if (localVal === enVal) return 'reviewed'; // kept in English intentionally
  if (lang === 'hil') return 'unreviewed'; // all Hiligaynon marked unreviewed per policy
  return 'unreviewed';
}

function escCsv(val: string): string {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function flattenObject(
  obj: Record<string, any>,
  prefix = '',
): Array<[string, string]> {
  const result: Array<[string, string]> = [];
  for (const [key, val] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof val === 'string') {
      result.push([fullKey, val]);
    } else if (typeof val === 'object' && val !== null) {
      result.push(...flattenObject(val, fullKey));
    }
  }
  return result;
}

function getNestedValue(obj: Record<string, any>, keyPath: string): string | undefined {
  const parts = keyPath.split('.');
  let cur: any = obj;
  for (const part of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[part];
  }
  return typeof cur === 'string' ? cur : undefined;
}

function exportDictionaries() {
  // ── JSON export ──────────────────────────────────────────────────────────
  if (!fs.existsSync(JSON_DIR)) fs.mkdirSync(JSON_DIR, { recursive: true });

  const dicts = [
    { code: 'en', name: 'English (Canonical)', data: en },
    { code: 'tl', name: 'Tagalog', data: tl },
    { code: 'hil', name: 'Hiligaynon (Beta)', data: hil },
  ];

  console.log('📦 Exporting GalloTrack i18n translation dictionaries...\n');

  for (const dict of dicts) {
    const filePath = path.join(JSON_DIR, `${dict.code}.json`);
    const jsonStr = JSON.stringify(dict.data, null, 2) + '\n';
    fs.writeFileSync(filePath, jsonStr, 'utf-8');
    const size = Buffer.byteLength(jsonStr, 'utf-8');
    console.log(`  ✓ ${dict.name} [${dict.code}]: -> ${filePath} (${size} bytes)`);
  }

  // ── CSV review export ────────────────────────────────────────────────────
  if (!fs.existsSync(CSV_DIR)) fs.mkdirSync(CSV_DIR, { recursive: true });

  const enEntries = flattenObject(en as unknown as Record<string, any>);
  const tlData = tl as unknown as Record<string, any>;
  const hilData = hil as unknown as Record<string, any>;

  const csvRows: string[] = [
    ['key', 'en', 'tl', 'tl_status', 'tl_note', 'hil', 'hil_status', 'hil_note']
      .map(escCsv)
      .join(','),
  ];

  const counts = {
    tl: { reviewed: 0, unreviewed: 0, needs_change: 0 },
    hil: { reviewed: 0, unreviewed: 0, needs_change: 0 },
  };

  for (const [key, enVal] of enEntries) {
    const tlVal = getNestedValue(tlData, key);
    const hilVal = getNestedValue(hilData, key);
    const tlStatus = classifyStatus(enVal, tlVal, 'tl');
    const hilStatus = classifyStatus(enVal, hilVal, 'hil');
    counts.tl[tlStatus]++;
    counts.hil[hilStatus]++;

    const notes = REVIEW_NOTES[key];
    const tlNote = notes?.tl ?? (tlStatus === 'unreviewed' ? 'Awaiting native reviewer confirmation.' : '');
    const hilNote =
      notes?.hil ??
      (hilStatus === 'unreviewed'
        ? 'Hiligaynon (Beta): not yet confirmed by a native Ilonggo speaker.'
        : '');

    csvRows.push(
      [key, enVal, tlVal ?? '', tlStatus, tlNote, hilVal ?? '', hilStatus, hilNote]
        .map(escCsv)
        .join(','),
    );
  }

  const csvPath = path.join(CSV_DIR, 'translations.csv');
  fs.writeFileSync(csvPath, csvRows.join('\n') + '\n', 'utf-8');
  console.log(`\n  ✓ CSV review sheet -> ${csvPath} (${csvRows.length - 1} keys)\n`);

  console.log('📊 Status counts per language:');
  for (const lang of ['tl', 'hil'] as const) {
    const c = counts[lang];
    console.log(
      `  ${lang.toUpperCase().padEnd(3)}: reviewed=${c.reviewed}  unreviewed=${c.unreviewed}  needs_change=${c.needs_change}`,
    );
  }

  console.log('\n✅ Export completed successfully!');
}

exportDictionaries();
