#!/usr/bin/env node
/**
 * The six CI gates from docs/GalloTrack-UI-Standard.html §08.
 *
 * Gates 1-4 are static scans implemented here. Gates 5-6 are real tooling and
 * are invoked by `npm run gate` (eslint with jsx-a11y, then vitest with axe).
 *
 * Every scan is RATCHETED against scripts/standard-gates.baseline.json: the
 * recorded count per file is the ceiling, and the gate fails only when a file
 * gets worse. That lets the gate land mid-migration instead of blocking on the
 * hundreds of pre-existing violations — the baseline shrinks as PR 5 and 6
 * remove them, and it can never grow.
 *
 *   node scripts/standard-gates.mjs            # check against the baseline
 *   node scripts/standard-gates.mjs --update   # re-record the baseline
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const baselinePath = join(root, 'scripts', 'standard-gates.baseline.json');
const SCAN_DIRS = ['app', 'components'];
const SKIP_DIRS = new Set(['node_modules', '.next', 'out', 'build', 'dist']);

/* ---------------------------------------------------------------- helpers */

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function countMatches(source, pattern) {
  const hits = source.match(pattern);
  return hits ? hits.length : 0;
}

function rel(file) {
  return relative(root, file).split(sep).join('/');
}

/* ------------------------------------------------------------------ gates */

// Gate 1 — no type below the 12px floor (Std §Typography, finding T6).
function gateSubTwelvePx(files) {
  const violations = {};
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    const hits = [...source.matchAll(/text-\[(\d+(?:\.\d+)?)px\]/g)].filter(
      (m) => Number.parseFloat(m[1]) < 12,
    );
    if (hits.length) violations[rel(file)] = hits.length;
  }
  return violations;
}

// Gate 2 — no raw hex in TSX; colour must come from a token (Std §Colour).
function gateRawHex(files) {
  // Exception: app/global-error.tsx renders *instead of* the root layout, so
  // globals.css (and with it every Tailwind colour token) is unavailable there.
  // Inline colours are the only option in that file.
  const exempt = new Set(['app/global-error.tsx']);
  const violations = {};
  for (const file of files) {
    if (!file.endsWith('.tsx')) continue;
    if (exempt.has(rel(file))) continue;
    const source = readFileSync(file, 'utf8');
    // Hex inside an HTML entity (&#9876;) is not a colour.
    const stripped = source.replace(/&#\d+;/g, '');
    const hits = countMatches(stripped, /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g);
    if (hits) violations[rel(file)] = hits;
  }
  return violations;
}

// Gate 3 — outline-none is only allowed alongside a replacement (Std §A11y #3).
function gateNakedOutlineNone(files) {
  const violations = {};
  for (const file of files) {
    if (!file.endsWith('.tsx')) continue;
    const source = readFileSync(file, 'utf8');
    let hits = 0;
    for (const match of source.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
      const cls = match[1] ?? match[2] ?? '';
      if (!/(^|\s)outline-none(\s|$)/.test(cls)) continue;
      // A focus/focus-visible ring, or a peer/group focus helper, counts as a replacement.
      if (/focus(-visible)?:/.test(cls)) continue;
      hits += 1;
    }
    if (hits) violations[rel(file)] = hits;
  }
  return violations;
}

// Gate 4 — an icon-only button must carry an accessible name (Std §A11y #1).
function gateUnnamedIconButtons(files) {
  const violations = {};
  for (const file of files) {
    if (!file.endsWith('.tsx')) continue;
    const source = readFileSync(file, 'utf8');
    let hits = 0;
    for (const match of source.matchAll(/<button\b[^>]*>/g)) {
      const openingTag = match[0];
      if (/aria-label|aria-labelledby|title=/.test(openingTag)) continue;
      const rest = source.slice(match.index + openingTag.length);
      const close = rest.indexOf('</button>');
      const inner = close === -1 ? rest.slice(0, 300) : rest.slice(0, close);
      const text = inner
        .replace(/\{[^}]*\}/g, '')
        .replace(/<[^>]*>/g, '')
        .trim();
      // `{expr}` may well render a label, so only a button with neither literal
      // text nor any expression — i.e. purely icon elements — counts as unnamed.
      const hasExpression = /\{[^}]*\}/.test(inner);
      if (!text && !hasExpression) hits += 1;
    }
    if (hits) violations[rel(file)] = hits;
  }
  return violations;
}

const GATES = [
  { id: 'sub-12px-type', label: 'No sub-12px type', fn: gateSubTwelvePx },
  { id: 'raw-hex', label: 'No raw hex in TSX', fn: gateRawHex },
  { id: 'naked-outline-none', label: 'No naked outline-none', fn: gateNakedOutlineNone },
  { id: 'unnamed-icon-button', label: 'Icon buttons need a name', fn: gateUnnamedIconButtons },
];

/**
 * Documented, visible exceptions with hard caps. This is NOT the ratchet
 * baseline: nothing here can grow over time, every entry is printed on each run,
 * and each one records why a mechanical fix is impossible. Use only for fixed
 * pixel-size layouts and renderers that cannot read CSS variables.
 */
const ALLOWLIST = {
  'sub-12px-type': {
    'components/PedigreeTree.tsx': {
      max: 6,
      reason:
        'Fixed 220x64 pedigree node cards: Not registered / code tag / status chips overflow the node at 12px',
    },
  },
  'raw-hex': {
    'app/layout.tsx': {
      max: 1,
      reason: 'Next.js metadata themeColor cannot reference CSS variables',
    },
    'app/opengraph-image.tsx': {
      max: 10,
      reason:
        'Satori/ImageResponse renders without CSS variables, so hex literals are required for the share card',
    },
    'components/match/MatchActionsRegression.test.tsx': {
      max: 1,
      reason: 'False positive: "#999" is a fowl identifier inside a test string, not a colour',
    },
  },
};

/* ------------------------------------------------------------------- main */

const files = SCAN_DIRS.flatMap((dir) => walk(join(root, dir)));
const current = {};
for (const gate of GATES) current[gate.id] = gate.fn(files);

const update = process.argv.includes('--update');

if (update) {
  writeFileSync(
    baselinePath,
    `${JSON.stringify({ note: 'Ratchet ceiling per file. Regenerate with: node scripts/standard-gates.mjs --update', gates: current }, null, 2)}\n`,
    'utf8',
  );
  console.log('Baseline updated:');
  for (const gate of GATES) {
    const total = Object.values(current[gate.id]).reduce((a, b) => a + b, 0);
    console.log(
      `  ${gate.label.padEnd(28)} ${total} in ${Object.keys(current[gate.id]).length} file(s)`,
    );
  }
  process.exit(0);
}

if (!existsSync(baselinePath)) {
  console.error('No baseline found. Run: node scripts/standard-gates.mjs --update');
  process.exit(1);
}

const baseline = JSON.parse(readFileSync(baselinePath, 'utf8')).gates ?? {};
let failed = false;

for (const gate of GATES) {
  const was = baseline[gate.id] ?? {};
  const now = current[gate.id];
  const regressions = [];

  for (const [file, count] of Object.entries(now)) {
    const allow = ALLOWLIST[gate.id]?.[file];
    const ceiling = allow?.max ?? was[file] ?? 0;
    if (count > ceiling) regressions.push(`${file}: ${ceiling} -> ${count}`);
  }

  const nowTotal = Object.values(now).reduce((a, b) => a + b, 0);
  const wasTotal = Object.values(was).reduce((a, b) => a + b, 0);
  const improved = wasTotal - nowTotal;

  if (regressions.length) {
    failed = true;
    console.error(`\n✗ ${gate.label} — ${regressions.length} regression(s)`);
    for (const line of regressions) console.error(`    ${line}`);
  } else {
    const delta = improved > 0 ? ` (down ${improved} from ${wasTotal})` : '';
    console.log(`✓ ${gate.label.padEnd(28)} ${nowTotal} outstanding${delta}`);
  }

  for (const [file, allow] of Object.entries(ALLOWLIST[gate.id] ?? {})) {
    const count = now[file] ?? 0;
    if (count > 0) {
      console.log(`    allowlisted: ${file} (${count}/${allow.max}) — ${allow.reason}`);
    }
  }
}

process.exit(failed ? 1 : 0);
