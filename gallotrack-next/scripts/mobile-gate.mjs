#!/usr/bin/env node
/**
 * Mobile layout gate.
 *
 * Drives a real browser over every route at phone widths and fails on the
 * things that actually break a narrow layout. Static analysis cannot do this:
 * a first pass with regex heuristics produced 146 hits, nearly all false
 * positives, and it was blind to the failure that mattered - content silently
 * cut off by an `overflow: hidden` ancestor, which produces no scrollbar and
 * no measurable document overflow.
 *
 * Requires a running server (`npm run dev`) and a Chromium build:
 *   npx playwright install chromium
 * Point at a specific binary with PLAYWRIGHT_CHROMIUM_PATH if needed.
 *
 *   node scripts/mobile-gate.mjs
 *   BASE_URL=http://localhost:3001 node scripts/mobile-gate.mjs
 */

import { chromium } from 'playwright';
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const WIDTHS = (process.env.WIDTHS ?? '390,360,320').split(',').map(Number);

/**
 * Any Chromium build already sitting in Playwright's standard cache.
 *
 * Playwright's Windows host-requirement check needs a separate `winldd`
 * helper, and when that component is missing or half-installed the launch
 * fails with "Executable doesn't exist at ...PrintDeps.exe" even though the
 * browser itself is present. Falling back to an explicit path skips that
 * machinery entirely.
 */
function findCachedChromium() {
  const cache = join(
    process.env.USERPROFILE ?? process.env.HOME ?? '',
    'AppData',
    'Local',
    'ms-playwright',
  );
  if (!existsSync(cache)) return null;

  const candidates = [];
  for (const entry of readdirSync(cache)) {
    if (!entry.startsWith('chromium')) continue;
    const dir = join(cache, entry);
    if (!statSync(dir).isDirectory()) continue;
    for (const file of readdirSync(dir)) {
      const full = join(dir, file);
      if (statSync(full).isDirectory()) candidates.push(full);
    }
  }

  const exe = (dir) =>
    ['headless_shell.exe', 'chrome.exe'].map((n) => join(dir, n)).find((p) => existsSync(p)) ??
    ['chrome-win', 'chrome-headless-shell-win64', 'chrome-win64']
      .map((sub) => join(dir, sub, 'headless_shell.exe'))
      .concat(['chrome-win', 'chrome-win64'].map((sub) => join(dir, sub, 'chrome.exe')))
      .find((p) => existsSync(p));

  for (const dir of candidates) {
    const found = exe(dir);
    if (found) return found;
  }
  return null;
}

async function launchBrowser() {
  if (process.env.PLAYWRIGHT_CHROMIUM_PATH) {
    return chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH });
  }
  try {
    return await chromium.launch();
  } catch {
    const cached = findCachedChromium();
    if (!cached) throw new Error('no Chromium found; run: npx playwright install chromium');
    return chromium.launch({ executablePath: cached });
  }
}

/** Every page.tsx becomes a route; route groups in parentheses are dropped. */
function discoverRoutes() {
  const routes = [];
  const skip = new Set(['node_modules', '.next', 'out', 'build', 'dist', 'api']);

  function walk(dir) {
    for (const entry of readdirSync(dir)) {
      if (skip.has(entry)) continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
      } else if (entry === 'page.tsx') {
        const rel = relative(join(root, 'app'), dir)
          .split(sep)
          .filter((p) => !p.startsWith('('));
        routes.push('/' + rel.join('/'));
      }
    }
  }

  walk(join(root, 'app'));
  return [...new Set(routes.map((r) => (r === '/' ? '/' : r.replace(/\/$/, ''))))].sort();
}

const PROBE = () => {
  const out = [];
  const vw = window.innerWidth;

  if (document.documentElement.scrollWidth - vw > 1) {
    out.push(`the page scrolls sideways by ${document.documentElement.scrollWidth - vw}px`);
  }

  for (const el of document.querySelectorAll('body *')) {
    const s = getComputedStyle(el);
    if (s.position === 'absolute' || s.position === 'fixed') continue;
    const r = el.getBoundingClientRect();
    if (r.width < 40 || r.height < 14) continue;

    // cut off by an ancestor that neither scrolls nor shows it
    let a = el.parentElement;
    while (a && a !== document.body) {
      const ox = getComputedStyle(a).overflowX;
      if (ox === 'auto' || ox === 'scroll') {
        a = null;
        break;
      }
      if (ox === 'hidden' || ox === 'clip') break;
      a = a.parentElement;
    }
    if (a) {
      const over = Math.round(r.right - a.getBoundingClientRect().right);
      if (over > 2) {
        out.push(
          `"${(el.textContent || el.className || '').toString().trim().replace(/\s+/g, ' ').slice(0, 40)}" is cut off ${over}px past its container`,
        );
      }
    }
  }

  // a text block squeezed to a sliver is a collapsed flex child
  for (const el of document.querySelectorAll('h1,h2,h3,p')) {
    const r = el.getBoundingClientRect();
    const t = (el.textContent || '').trim();
    if (t.length > 45 && r.width > 0 && r.width < 100) {
      out.push(`text squeezed to ${Math.round(r.width)}px: "${t.slice(0, 40)}"`);
    }
  }

  const nav = document.querySelector('nav[aria-label="Mobile"]');
  const footer = document.querySelector('footer');
  if (
    nav &&
    footer &&
    footer.getBoundingClientRect().bottom > nav.getBoundingClientRect().top + 1
  ) {
    out.push('the footer sits under the fixed bottom nav');
  }

  return [...new Set(out)].slice(0, 4);
};

const routes = discoverRoutes();
console.log(`mobile gate: ${routes.length} routes x ${WIDTHS.join('/')}px against ${BASE_URL}\n`);

let browser;
try {
  browser = await launchBrowser();
} catch (error) {
  console.error('Could not launch Chromium. Run: npx playwright install chromium');
  console.error(`  ${error.message.split('\n')[0]}`);
  process.exit(1);
}

let failures = 0;

for (const width of WIDTHS) {
  const context = await browser.newContext({ viewport: { width, height: 800 } });
  const page = await context.newPage();

  for (const route of routes) {
    try {
      await page.goto(BASE_URL + route, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await page.waitForTimeout(700);
      const issues = await page.evaluate(PROBE);

      if (issues.length) {
        failures++;
        console.error(`\u2717 ${width}px  ${route}`);
        for (const issue of issues) console.error(`    ${issue}`);
      } else {
        console.log(`\u2713 ${width}px  ${route}`);
      }
    } catch (error) {
      failures++;
      console.error(
        `\u2717 ${width}px  ${route}\n    could not load: ${error.message.split('\n')[0].slice(0, 80)}`,
      );
    }
  }

  await context.close();
}

await browser.close();

if (failures) {
  console.error(
    `\nmobile gate failed: ${failures} route/width combination(s) with layout problems`,
  );
  process.exit(1);
}

console.log(`\nmobile gate passed: ${routes.length * WIDTHS.length} checks, no layout problems`);
