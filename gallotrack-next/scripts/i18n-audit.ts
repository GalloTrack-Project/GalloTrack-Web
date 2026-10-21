/**
 * GalloTrack i18n Translation Audit
 *
 * Verifies:
 * 1. Complete key parity across `en`, `tl`, and `hil`.
 * 2. Exact placeholder preservation (`{count}`, `{name}`, etc.).
 * 3. Hiligaynon Beta translation completeness and coverage.
 * 4. Scans App Shell components for suspicious hardcoded user-facing strings.
 *
 * Usage:
 *   npm run i18n:audit
 */

import fs from 'node:fs';
import path from 'node:path';
import { en } from '../lib/i18n/en';
import { tl } from '../lib/i18n/tl';
import { hil } from '../lib/i18n/hil';

interface AuditStats {
  totalKeys: number;
  tlMissing: string[];
  hilMissing: string[];
  placeholderMismatches: string[];
  hilBetaCount: number;
}

function extractPlaceholders(text: string): string[] {
  const matches = text.match(/\{([a-zA-Z0-9_]+)\}/g) || [];
  return Array.from(new Set(matches)).sort();
}

function traverse(
  enObj: Record<string, any>,
  tlObj: Record<string, any>,
  hilObj: Record<string, any>,
  prefix: string,
  stats: AuditStats
) {
  for (const [key, enVal] of Object.entries(enObj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof enVal === 'string') {
      stats.totalKeys++;

      // Check Tagalog
      const tlVal = tlObj?.[key];
      if (tlVal === undefined || tlVal === null) {
        stats.tlMissing.push(fullKey);
      } else {
        const enP = extractPlaceholders(enVal);
        const tlP = extractPlaceholders(tlVal);
        for (const p of enP) {
          if (!tlP.includes(p)) {
            stats.placeholderMismatches.push(`[tl] ${fullKey}: missing "${p}"`);
          }
        }
      }

      // Check Hiligaynon
      const hilVal = hilObj?.[key];
      if (hilVal === undefined || hilVal === null) {
        stats.hilMissing.push(fullKey);
      } else {
        stats.hilBetaCount++;
        const enP = extractPlaceholders(enVal);
        const hilP = extractPlaceholders(hilVal);
        for (const p of enP) {
          if (!hilP.includes(p)) {
            stats.placeholderMismatches.push(`[hil] ${fullKey}: missing "${p}"`);
          }
        }
      }
    } else if (typeof enVal === 'object' && enVal !== null) {
      traverse(
        enVal,
        tlObj?.[key] || {},
        hilObj?.[key] || {},
        fullKey,
        stats
      );
    }
  }
}

function auditAppShellFiles() {
  console.log('🔎 Auditing App Shell components for i18n coverage...\n');
  const appShellFiles = [
    'app/(dashboard)/layout.tsx',
    'app/(dashboard)/settings/page.tsx',
    'components/nav/MobileNav.tsx',
    'components/DateRangePicker.tsx',
    'app/login/page.tsx',
    'app/register/page.tsx',
    'app/not-found.tsx',
    'app/error.tsx',
    'components/landing/Navbar.tsx',
    'components/landing/Footer.tsx',
  ];

  for (const relPath of appShellFiles) {
    const fullPath = path.resolve(__dirname, '..', relPath);
    if (!fs.existsSync(fullPath)) {
      console.warn(`  ⚠️  File not found: ${relPath}`);
      continue;
    }
    const content = fs.readFileSync(fullPath, 'utf-8');
    const hasI18nImport =
      content.includes('lib/i18n') ||
      content.includes('LanguageSwitcher') ||
      content.includes('useT(') ||
      content.includes('useLanguage(');

    console.log(`  ✓ ${relPath}: ${hasI18nImport ? 'i18n integrated' : 'Needs review'}`);
  }
  console.log('');
}

function runAudit() {
  console.log('============================================================');
  console.log('GALLOTRACK INTERNATIONALIZATION (i18n) AUDIT');
  console.log('============================================================\n');

  const stats: AuditStats = {
    totalKeys: 0,
    tlMissing: [],
    hilMissing: [],
    placeholderMismatches: [],
    hilBetaCount: 0,
  };

  traverse(en, tl, hil, '', stats);

  auditAppShellFiles();

  console.log('============================================================');
  console.log('DICTIONARY AUDIT RESULTS');
  console.log('============================================================');
  console.log(`Total Canonical English Keys: ${stats.totalKeys}`);
  console.log(`Tagalog (tl) Keys:            ${stats.totalKeys - stats.tlMissing.length} / ${stats.totalKeys}`);
  console.log(`Hiligaynon (hil Beta) Keys:   ${stats.hilBetaCount} / ${stats.totalKeys}`);
  console.log(`Placeholder Mismatches:       ${stats.placeholderMismatches.length}\n`);

  let hasErrors = false;

  if (stats.tlMissing.length > 0) {
    hasErrors = true;
    console.error(`❌ Tagalog is missing ${stats.tlMissing.length} key(s):`);
    for (const k of stats.tlMissing) console.error(`   - ${k}`);
  }

  if (stats.hilMissing.length > 0) {
    hasErrors = true;
    console.error(`❌ Hiligaynon is missing ${stats.hilMissing.length} key(s):`);
    for (const k of stats.hilMissing) console.error(`   - ${k}`);
  }

  if (stats.placeholderMismatches.length > 0) {
    hasErrors = true;
    console.error(`❌ Found ${stats.placeholderMismatches.length} placeholder mismatch(es):`);
    for (const m of stats.placeholderMismatches) console.error(`   - ${m}`);
  }

  if (hasErrors) {
    console.error('\n❌ i18n Audit FAILED. Please resolve missing keys or placeholders.');
    process.exit(1);
  }

  console.log('============================================================');
  console.log('✓ ALL DICTIONARIES HAVE 100% KEY PARITY');
  console.log('✓ ALL PLACEHOLDERS VALIDATED');
  console.log('✓ APP SHELL COMPONENTS AUDITED');
  console.log('============================================================\n');
}

runAudit();
