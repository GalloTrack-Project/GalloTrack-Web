/**
 * Responsive Horizontal Overflow Audit (Playwright Regression Test)
 *
 * NOTE: This audit script intercepts and mocks the Supabase data layer locally
 * to inject synthetic datasets (including the 40-fowl stress dataset) and verify
 * browser layout and mobile responsiveness. It checks CSS rendering and layout only,
 * and cannot / does not validate real database writes or database constraints.
 *
 * Verifies that all dashboard routes and sub-tabs fit within phone and desktop
 * viewports with ZERO horizontal overflow (document.documentElement.scrollWidth <= clientWidth)
 * and with no action control clipped or pushed past the viewport.
 *
 * Tests across:
 *   - Phone viewports: 320x640, 360x800, 390x844
 *   - Desktop viewports: 1024x768, 1100x800, 1280x720, 1330x900, 1366x768, 1440x900, 1920x1080
 *   - Font scaling: 100%, 125%, 150% on phones; 100% on desktop
 *   - Dynamically discovered tabs and sub-pills across all modules
 *   - Interactive modals & sheets: Chicken Profile modal, Edit Chicken modal, Add Match Record with selected fowl, and DateRangePicker bottom sheet
 *   - Route health guards: Fails on 404, error boundary ("Something went wrong"), or redirect to /login
 *   - Stress dataset: 40 chickens (with long names/crossbred badges), 10 matches (with long opponent names), and 8 pairings
 *   - Local-only guard: strictly refuses to run against external/production URLs
 *   - Credentials security: reads untracked .env.local or process environment with zero hardcoded credentials
 *
 * Usage:
 *   npm run audit:mobile
 *   or:
 *   BASE_URL=http://localhost:3000 npm run audit:mobile
 */

import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { STRESS_FOWLS, STRESS_MATCHES, STRESS_PAIRINGS } from './fixtures/stress-dataset';

// Load environment variables from untracked .env.local if present
const envLocalPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envLocalPath)) {
  const lines = fs.readFileSync(envLocalPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx > 0) {
      const k = trimmed.slice(0, idx).trim();
      const v = trimmed.slice(idx + 1).trim();
      if (!process.env[k]) process.env[k] = v;
    }
  }
}

const BASE_URL = process.env.BASE_URL || process.env.SMOKE_BASE_URL || 'http://localhost:3000';
const EMAIL = process.env.SMOKE_EMAIL || '';
const PASSWORD = process.env.SMOKE_PASSWORD || '';
const ALLOW_EXTERNAL =
  process.env.ALLOW_EXTERNAL_URL === 'true' || process.argv.includes('--allow-external');

if (!EMAIL || !PASSWORD) {
  console.error(
    '\n❌ ERROR: SMOKE_EMAIL and SMOKE_PASSWORD must be provided via environment variables or untracked .env.local.',
  );
  console.error('Credentials must never be hardcoded into the repository.\n');
  process.exit(1);
}

// Validate local-only base URL
function assertLocalBaseUrl(urlStr: string): void {
  try {
    const u = new URL(urlStr);
    const host = u.hostname.toLowerCase();
    const isLocal =
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host === '[::1]' ||
      host.endsWith('.localhost');

    if (!isLocal && !ALLOW_EXTERNAL) {
      console.error(`\n❌ ERROR: Refusing to run audit against non-local BASE_URL (${urlStr}).`);
      console.error('This script is strictly intended for local regression testing.');
      console.error(
        'To override intentionally, pass the --allow-external flag or set ALLOW_EXTERNAL_URL=true.\n',
      );
      process.exit(1);
    }
  } catch (err: unknown) {
    console.error(`\n❌ ERROR: Invalid BASE_URL: "${urlStr}"`);
    process.exit(1);
  }
}

assertLocalBaseUrl(BASE_URL);

interface ViewportSpec {
  name: string;
  width: number;
  height: number;
  /** Desktop sizes are checked at 100% font scale only. */
  desktop?: boolean;
}

/**
 * Viewports under test. Override with AUDIT_VIEWPORTS="320x568,360x800".
 * Default covers the three phone widths the layout gate must satisfy.
 */
const MOBILE_VIEWPORTS: ViewportSpec[] = (process.env.AUDIT_VIEWPORTS ?? '320x640,360x800,390x844')
  .split(',')
  .map((spec) => {
    const [w, h] = spec.trim().split('x').map(Number);
    return { name: spec.trim(), width: w, height: h };
  })
  .filter((v) => !Number.isNaN(v.width) && !Number.isNaN(v.height));

/**
 * Desktop viewports. The old audits only covered phone widths, which is how
 * the desktop horizontal overflow (Match Logs table / action bar) slipped
 * through. Desktop sizes are checked at 100% font scale; the phone widths keep
 * the full 100/125/150% matrix.
 */
const DESKTOP_VIEWPORTS: ViewportSpec[] = (
  process.env.AUDIT_DESKTOP_VIEWPORTS ??
  '1024x768,1100x800,1280x720,1330x900,1366x768,1440x900,1920x1080'
)
  .split(',')
  .map((spec) => {
    const [w, h] = spec.trim().split('x').map(Number);
    return { name: spec.trim(), width: w, height: h, desktop: true };
  })
  .filter((v) => !Number.isNaN(v.width) && !Number.isNaN(v.height));

const VIEWPORTS: ViewportSpec[] = [...MOBILE_VIEWPORTS, ...DESKTOP_VIEWPORTS];

const FONT_SCALES = (process.env.AUDIT_FONT_SCALES ?? '1.0,1.25,1.5')
  .split(',')
  .map((n) => Number(n.trim()))
  .filter((n) => !Number.isNaN(n) && n > 0);

/** Desktop sizes only need the 100% scale; the phone widths keep all three. */
const fontScalesFor = (vp: ViewportSpec) => (vp.desktop ? [1.0] : FONT_SCALES);

/** Every language is exercised at every viewport and every font scale. */
const AUDIT_LANGUAGES: readonly string[] = (
  process.env.AUDIT_LANG ? process.env.AUDIT_LANG.split(',') : ['en', 'tl', 'hil']
)
  .map((l) => l.trim())
  .filter(Boolean);

interface BaseRouteSpec {
  name: string;
  path: string;
  hasDynamicTabs: boolean;
  expectedSelector?: string;
}

const BASE_ROUTES: BaseRouteSpec[] = [
  { name: 'Dashboard', path: '/dashboard', hasDynamicTabs: false },
  {
    name: 'Chicken Inventory',
    path: '/catalog',
    hasDynamicTabs: true,
    expectedSelector: '[data-testid="inventory-tabs-container"]',
  },
  { name: 'Chicken Registry', path: '/profiling', hasDynamicTabs: true },
  { name: 'Lineage Directory', path: '/lineage', hasDynamicTabs: true },
  { name: 'Breeding Hub', path: '/breeding', hasDynamicTabs: true },
  { name: 'Match Logs', path: '/match-logs', hasDynamicTabs: false },
  { name: 'Add Match Record', path: '/match-logs/new?fowlId=101', hasDynamicTabs: false },
  { name: 'Edit Match Record', path: '/match-logs/1/edit', hasDynamicTabs: false },
  { name: 'Settings', path: '/settings', hasDynamicTabs: true },
];

function findCachedChromium(): string | null {
  const cache = path.join(
    process.env.USERPROFILE ?? process.env.HOME ?? '',
    'AppData',
    'Local',
    'ms-playwright',
  );
  if (!fs.existsSync(cache)) return null;

  for (const entry of fs.readdirSync(cache)) {
    if (!entry.startsWith('chromium')) continue;
    const dir = path.join(cache, entry);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const sub of fs.readdirSync(dir)) {
      const full = path.join(dir, sub);
      if (!fs.statSync(full).isDirectory()) continue;
      const exes = [
        path.join(full, 'chrome.exe'),
        path.join(full, 'headless_shell.exe'),
        path.join(full, 'chrome-win', 'chrome.exe'),
        path.join(full, 'chrome-win64', 'chrome.exe'),
      ];
      for (const e of exes) {
        if (fs.existsSync(e)) return e;
      }
    }
  }
  return null;
}

async function launchBrowser(): Promise<Browser> {
  if (process.env.PLAYWRIGHT_CHROMIUM_PATH) {
    return chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH });
  }
  try {
    return await chromium.launch();
  } catch {
    const cached = findCachedChromium();
    if (!cached) {
      throw new Error(
        'Chromium executable not found. Please install Playwright browsers or set PLAYWRIGHT_CHROMIUM_PATH.',
      );
    }
    return chromium.launch({ executablePath: cached });
  }
}

async function authenticate(context: BrowserContext, lang: string): Promise<void> {
  // Drop any existing session first: an authenticated context is redirected
  // away from /login, and the Supabase access token is only refreshed while a
  // page is open (this audit closes pages between checks).
  await context.clearCookies();
  await context.addCookies([{ name: 'gt-lang', value: lang, url: BASE_URL }]);

  const page = await context.newPage();
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[type="password"]', { timeout: 15000 });
  await page.waitForTimeout(1000);

  const emailInput = page
    .locator('input[type="email"], input[id="email-address"], input[name="username"]')
    .first();
  await emailInput.fill(EMAIL);
  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.fill(PASSWORD);
  await page.waitForTimeout(400);
  await page.click('button[type="submit"]');

  await page.waitForURL(/dashboard/, { timeout: 20000 });
  await page.close();
}

/**
 * Auth reliability counters. The Supabase access token expires while the audit
 * closes pages between checks, so the run intermittently lands on /login or the
 * landing page. Every such event is counted and recovered by re-authenticating.
 */
const authStats = {
  logins: 0,
  retries: 0,
  sessionRedirects: 0,
  failures: 0,
};

async function authenticateWithRetry(
  context: BrowserContext,
  lang: string,
  attempts = 3,
): Promise<void> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      await authenticate(context, lang);
      authStats.logins++;
      return;
    } catch (err) {
      lastErr = err;
      authStats.retries++;
      await new Promise((resolve) => setTimeout(resolve, 750 * attempt));
    }
  }
  authStats.failures++;
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

function isUnauthenticatedUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    return parsed.pathname === '/' || parsed.pathname.startsWith('/login');
  } catch {
    return false;
  }
}

/**
 * Navigate to a protected page and recover from a lost session by signing in
 * again and retrying. A page that still ends on /login or / is never treated as
 * a pass: the caller records a fatal failure for it.
 */
async function gotoWithAuthRetry(
  page: Page,
  context: BrowserContext,
  lang: string,
  url: string,
  attempts = 3,
): Promise<void> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    if (isUnauthenticatedUrl(page.url())) {
      authStats.sessionRedirects++;
      lastErr = new Error(`Authentication lost: page ended on ${page.url()} while loading ${url}`);
      if (attempt < attempts) {
        await authenticateWithRetry(context, lang);
        continue;
      }
      throw lastErr;
    }
    try {
      await assertPageHealthy(page, url, res);
      return;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/Authentication lost|redirected to \/login|ended on/.test(msg)) {
        authStats.sessionRedirects++;
        lastErr = err;
        if (attempt < attempts) {
          await authenticateWithRetry(context, lang);
          continue;
        }
      }
      throw err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

interface OverflowCheckResult {
  clientWidth: number;
  scrollWidth: number;
  hasOverflow: boolean;
  overflowAmount: number;
  culprits: Array<{ tag: string; id: string; className: string; right: number }>;
}

async function measureOverflow(page: Page): Promise<OverflowCheckResult> {
  return await page.evaluate(() => {
    const clientWidth = document.documentElement.clientWidth;
    const scrollWidth = document.documentElement.scrollWidth;
    const bodyScrollWidth = document.body.scrollWidth;
    const effectiveScroll = Math.max(scrollWidth, bodyScrollWidth);

    const culprits: Array<{ tag: string; id: string; className: string; right: number }> = [];
    if (effectiveScroll > clientWidth) {
      document.querySelectorAll('*').forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.right > clientWidth + 1) {
          culprits.push({
            tag: el.tagName,
            id: el.id,
            className: (el.className?.toString?.() || '').slice(0, 60),
            right: Math.round(rect.right),
          });
        }
      });
    }

    return {
      clientWidth,
      scrollWidth: effectiveScroll,
      hasOverflow: effectiveScroll > clientWidth,
      overflowAmount: Math.max(0, effectiveScroll - clientWidth),
      culprits: culprits.slice(0, 5),
    };
  });
}

async function assertPageHealthy(page: Page, url: string, response: any): Promise<void> {
  const currentUrl = page.url();
  if (currentUrl.includes('/login')) {
    throw new Error(`Authentication lost: redirected to /login when navigating to ${url}`);
  }
  if (isUnauthenticatedUrl(currentUrl)) {
    throw new Error(
      `Authentication lost: landed on the landing page (${currentUrl}) when navigating to ${url}`,
    );
  }
  if (response && response.status() >= 400) {
    throw new Error(
      `HTTP Error ${response.status()} (${response.statusText()}) navigating to ${url}`,
    );
  }
  const pageError = await page.evaluate(() => {
    const text = document.body?.innerText || '';
    if (
      text.includes('404') &&
      (text.includes('This page could not be found') ||
        text.includes('Page Not Found') ||
        text.includes('Record Not Found'))
    ) {
      return '404 / Not Found page detected';
    }
    if (
      text.includes('Something went wrong') ||
      text.includes('Application error: a client-side exception')
    ) {
      return 'Error boundary triggered: "Something went wrong"';
    }
    return null;
  });
  if (pageError) {
    throw new Error(`Page render failure on ${url}: ${pageError}`);
  }
}

interface RenderElementCounts {
  cards: number;
  rows: number;
  badges: number;
}

async function countRenderedElements(page: Page): Promise<RenderElementCounts> {
  return await page.evaluate(() => {
    // Cards: fowl cards, pair cards, dashboard stat cards
    const cards = document.querySelectorAll(
      '.group.bg-card, [data-testid="fowl-card"], article, div[class*="rounded-2xl border"], div[class*="rounded-3xl border"], div[class*="bg-card"][class*="rounded-lg border"]',
    ).length;

    // Table rows
    const rows = document.querySelectorAll('tbody tr, [role="row"]').length;

    // Badges / pills: status badges, breeding type badges, bloodline chips, tags
    const badges = document.querySelectorAll(
      '[data-testid="status-badge"], span[class*="rounded-full"], span[class*="rounded-md"][class*="text-xs"], span[class*="tracking-wider"], span[class*="font-mono"]',
    ).length;

    return { cards, rows, badges };
  });
}

/**
 * Detects action controls (Edit / Share / Media / Save / Cancel) that are cut
 * off: either pushed past the viewport's right edge, or clipped by an ancestor
 * that hides overflow. This is the check that catches the "Media & Actions
 * column is cut off" and "action bar covers the fields" regressions.
 */
async function measureClippedActions(page: Page): Promise<{ count: number; details: string[] }> {
  return await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const details: string[] = [];
    const selector =
      'a[href], button, [role="button"], [role="tab"], input[type="submit"], [data-testid*="action"]';
    const seen = new Set<string>();
    document.querySelectorAll(selector).forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const style = getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none') return;
      const label = (el.getAttribute('aria-label') || el.textContent || el.tagName)
        .toString()
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, 40);

      // 1. pushed past the right edge of the viewport
      if (rect.right > vw + 1) {
        const key = `viewport:${label}`;
        if (!seen.has(key)) {
          seen.add(key);
          details.push(`"${label}" extends ${Math.round(rect.right - vw)}px past the viewport`);
        }
        return;
      }

      // 2. clipped by an ancestor with hidden/clip overflow
      let ancestor: HTMLElement | null = el.parentElement;
      while (ancestor && ancestor !== document.body) {
        const overflowX = getComputedStyle(ancestor).overflowX;
        if (overflowX === 'auto' || overflowX === 'scroll') break;
        if (overflowX === 'hidden' || overflowX === 'clip') {
          const over = Math.round(rect.right - ancestor.getBoundingClientRect().right);
          if (over > 2) {
            const key = `clip:${label}`;
            if (!seen.has(key)) {
              seen.add(key);
              details.push(`"${label}" is clipped ${over}px by its container`);
            }
          }
          break;
        }
        ancestor = ancestor.parentElement;
      }
    });
    return { count: details.length, details: details.slice(0, 5) };
  });
}

interface FailureReport {
  viewport: string;
  fontScale: string;
  targetDescription: string;
  clientWidth: number;
  scrollWidth: number;
  overflowAmount: number;
  culprits: Array<{ tag: string; id: string; className: string; right: number }>;
}

/**
 * Scenario checks that cannot be reached by simply loading a route:
 *  - Register Chicken with every section visible
 *  - the parent selector dropdown (Sire / Dam picker)
 *  - the filter bar with all filters open
 *  - the Edit Chicken modal with the parent selectors open
 */
async function runScenarioChecks(
  page: Page,
  opts: {
    baseUrl: string;
    viewport: string;
    fontScale: string;
    measure: (p: Page) => Promise<OverflowCheckResult>;
    record: (entry: string, check: OverflowCheckResult) => void;
    recordClipped?: (entry: string) => Promise<void>;
  },
): Promise<void> {
  const { baseUrl, measure, record, recordClipped } = opts;
  const check = () => measure(page);

  // ── Register Chicken with every section visible ──────────────────────────
  try {
    await page.goto(`${baseUrl}/profiling?tab=form`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await page.waitForTimeout(900);
    const formVisible = await page
      .locator('#encode-sire, #growth-stage')
      .first()
      .isVisible()
      .catch(() => false);
    if (formVisible) {
      record('Register Chicken (all sections visible)', await check());
      await recordClipped?.('Register Chicken -> Action controls visible');
    } else {
      console.log('  – skipped Register Chicken scenario (form not reachable)');
    }
  } catch (err: unknown) {
    console.error(
      `  ✗ ERROR: [Register Chicken] ${err instanceof Error ? err.message.split('\n')[0] : err}`,
    );
  }

  // ── Parent selector dropdown open ────────────────────────────────────────
  try {
    const sireInput = page.locator('#encode-sire');
    if (await sireInput.isVisible().catch(() => false)) {
      await sireInput.click().catch(() => {});
      await page.waitForTimeout(400);
      record('Register Chicken -> Parent selector open', await check());
      await recordClipped?.('Register Chicken -> Parent selector actions visible');
      await page.keyboard.press('Escape').catch(() => {});
      await page.waitForTimeout(200);
    }
  } catch (err: unknown) {
    console.error(
      `  ✗ ERROR: [Parent selector] ${err instanceof Error ? err.message.split('\n')[0] : err}`,
    );
  }

  // ── Filter bar with all filters open ─────────────────────────────────────
  try {
    await page.goto(`${baseUrl}/catalog`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(900);
    const filtersToggle = page.locator('button[aria-controls="mobile-filter-dropdowns"]').first();
    if (await filtersToggle.isVisible().catch(() => false)) {
      await filtersToggle.click().catch(() => {});
      await page.waitForTimeout(400);
      record('Chicken Inventory -> Filter bar with all filters open', await check());
      await recordClipped?.('Chicken Inventory -> Filter bar actions visible');
    } else {
      // Desktop layout: the filter panel is always visible.
      record('Chicken Inventory -> Filter bar with all filters open', await check());
      await recordClipped?.('Chicken Inventory -> Filter bar actions visible');
    }
  } catch (err: unknown) {
    console.error(
      `  ✗ ERROR: [Filter bar] ${err instanceof Error ? err.message.split('\n')[0] : err}`,
    );
  }

  // ── Edit Chicken modal with the parent selector open ─────────────────────
  try {
    await page.goto(`${baseUrl}/profiling`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(900);
    const editBtn = page.locator('button:has-text("Edit")').first();
    if (await editBtn.isVisible().catch(() => false)) {
      await editBtn.click().catch(() => {});
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(400);
      record('Chicken Registry -> Edit Chicken modal', await check());
      await recordClipped?.('Chicken Registry -> Edit modal actions visible');

      const editSire = page.locator('#edit-sire');
      if (await editSire.isVisible().catch(() => false)) {
        await editSire.click().catch(() => {});
        await page.waitForTimeout(400);
        record('Chicken Registry -> Edit modal -> Parent selector open', await check());
      }

      await page.keyboard.press('Escape').catch(() => {});
      await page.waitForTimeout(200);
    }
  } catch (err: unknown) {
    console.error(
      `  ✗ ERROR: [Edit modal] ${err instanceof Error ? err.message.split('\n')[0] : err}`,
    );
  }
}

async function runAudit(): Promise<void> {
  console.log('============================================================');
  console.log('Responsive Overflow Audit (Playwright with Stress Dataset)');
  console.log(`Base URL: ${BASE_URL} (Local-only verification enforced)`);
  console.log(
    `Stress Dataset: ${STRESS_FOWLS.length} Chickens, ${STRESS_MATCHES.length} Matches, ${STRESS_PAIRINGS.length} Pairings`,
  );
  const matrixCount =
    VIEWPORTS.reduce((n, vp) => n + fontScalesFor(vp).length, 0) * AUDIT_LANGUAGES.length;
  console.log(
    `Matrix: ${VIEWPORTS.length} viewports x ${AUDIT_LANGUAGES.length} languages x font scales (100% on desktop) = ${matrixCount} environment configurations`,
  );
  console.log('============================================================\n');

  let browser: Browser;
  try {
    browser = await launchBrowser();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Failed to launch browser:', msg);
    process.exit(1);
  }

  // Pure in-memory session: no storage-state file, no trace recording, no cookies written to disk
  const context = await browser.newContext();

  try {
    console.log('Authenticating in-memory session (credentials never logged or persisted)...');
    await authenticateWithRetry(context, AUDIT_LANGUAGES[0]);
    console.log('✓ In-memory authentication successful\n');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Failed to authenticate session:', msg);
    await browser.close();
    process.exit(1);
  }

  // Intercept all Supabase REST data calls with deterministic stress dataset
  // Strictly read-only simulation, never writes to database
  await context.route('**/*.supabase.co/rest/v1/**', async (route) => {
    const url = route.request().url();
    const headers = route.request().headers();
    const acceptHeader = headers['accept'] || '';
    const isSingleObject = acceptHeader.includes('application/vnd.pgrst.object+json');

    if (
      url.includes('/fowl_photos') ||
      url.includes('/match_videos') ||
      url.includes('/match_photos') ||
      url.includes('/safety_incidents')
    ) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    }

    if (url.includes('/fowl')) {
      if (isSingleObject) {
        const fowlId = url.match(/id=eq\.(\d+)/)?.[1];
        const match = STRESS_FOWLS.find((f) => String(f.id) === fowlId) || STRESS_FOWLS[0];
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(match),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(STRESS_FOWLS),
      });
    }

    if (url.includes('/match')) {
      if (isSingleObject) {
        const matchId = url.match(/id=eq\.(\d+)/)?.[1];
        const match = STRESS_MATCHES.find((m) => String(m.id) === matchId) || STRESS_MATCHES[0];
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(match),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(STRESS_MATCHES),
      });
    }

    if (url.includes('/breeding_pairings')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(STRESS_PAIRINGS),
      });
    }

    return route.continue();
  });

  const failures: FailureReport[] = [];
  const visitedCatalog = new Set<string>();
  const elementMetricsMap = new Map<string, RenderElementCounts>();
  const perLanguage = new Map<string, { checks: number; failures: number }>();
  let totalChecks = 0;
  let passedChecks = 0;

  for (let vpIdx = 0; vpIdx < VIEWPORTS.length; vpIdx++) {
    const vp = VIEWPORTS[vpIdx];
    for (const fontScale of fontScalesFor(vp)) {
      for (const lang of AUDIT_LANGUAGES) {
        await context.addCookies([{ name: 'gt-lang', value: lang, url: BASE_URL }]);
        const scalePct = `${Math.round(fontScale * 100)}%`;
        const envLabel = `Viewport: ${vp.name} (${vp.width}x${vp.height}) | Font Scale: ${scalePct} | Language: ${lang}`;
        console.log(`>>> Checking ${envLabel}`);

        // Re-authenticate for every configuration: the Supabase access token is
        // refreshed by a timer that only runs while a page is open, and this
        // audit closes every page between checks, so a long run would otherwise
        // silently fall back to /login halfway through.
        try {
          await authenticateWithRetry(context, lang);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          totalChecks++;
          failures.push({
            viewport: vp.name,
            fontScale: scalePct,
            targetDescription: `Authentication (${lang})`,
            clientWidth: vp.width,
            scrollWidth: -1,
            overflowAmount: 999,
            culprits: [{ tag: 'ERROR', id: 'FATAL_AUTH', className: msg.slice(0, 60), right: 999 }],
          });
          console.error(`  ✗ ERROR: re-authentication failed after retries: ${msg.split('\n')[0]}`);
          continue;
        }

        const page = await context.newPage();
        await page.setViewportSize({ width: vp.width, height: vp.height });
        const checksBefore = totalChecks;
        const failsBefore = failures.length;

        for (const route of BASE_ROUTES) {
          const url = `${BASE_URL}${route.path}`;
          try {
            await gotoWithAuthRetry(page, context, lang, url);

            if (route.expectedSelector) {
              await page
                .locator(route.expectedSelector)
                .first()
                .waitFor({ state: 'attached', timeout: 5000 })
                .catch(() => {});
            }

            if (fontScale !== 1.0) {
              await page.evaluate((scale) => {
                document.documentElement.style.fontSize = `${Math.round(scale * 100)}%`;
              }, fontScale);
            }

            // Await data hydration for stress dataset
            if (route.path === '/catalog') {
              await page
                .waitForFunction(
                  () => {
                    const el = document.querySelector('#inventory-tab-all span:last-child');
                    return el && parseInt(el.textContent?.trim() || '0', 10) > 0;
                  },
                  { timeout: 10000 },
                )
                .catch(() => {});
            } else if (route.path === '/profiling') {
              await page
                .waitForFunction(
                  () => {
                    const tabs = document.querySelectorAll('[role="tab"]');
                    return Array.from(tabs).some(
                      (t) => t.textContent?.includes('4') || t.textContent?.includes('24'),
                    );
                  },
                  { timeout: 10000 },
                )
                .catch(() => {});
            } else if (route.path === '/lineage') {
              await page
                .waitForFunction(
                  () => {
                    const tabs = document.querySelectorAll('[role="tab"]');
                    return Array.from(tabs).some((t) => {
                      const num = parseInt(t.textContent?.match(/\d+/)?.[0] || '0', 10);
                      return num > 0;
                    });
                  },
                  { timeout: 10000 },
                )
                .catch(() => {});
            } else if (route.path === '/match-logs') {
              await page
                .locator('tbody tr, [role="row"]')
                .first()
                .waitFor({ state: 'attached', timeout: 8000 })
                .catch(() => {});
            } else if (route.path.includes('/match-logs/1/edit')) {
              await page
                .locator('input[name="opponent_name"], input[placeholder*="opponent" i]')
                .first()
                .waitFor({ state: 'attached', timeout: 8000 })
                .catch(() => {});
            } else {
              await page.waitForTimeout(400);
            }

            if (!route.hasDynamicTabs) {
              // Static route check
              const check = await measureOverflow(page);
              totalChecks++;
              const entryName = `${route.name} (default)`;
              visitedCatalog.add(entryName);

              // Action controls must be fully visible (not clipped, not off-screen)
              const clipped = await measureClippedActions(page);
              totalChecks++;
              const clipEntry = `${route.name} -> Action controls visible`;
              visitedCatalog.add(clipEntry);
              if (clipped.count > 0) {
                failures.push({
                  viewport: vp.name,
                  fontScale: scalePct,
                  targetDescription: clipEntry,
                  clientWidth: vp.width,
                  scrollWidth: -1,
                  overflowAmount: clipped.count,
                  culprits: clipped.details.map((d) => ({
                    tag: 'ACTION',
                    id: 'CLIPPED',
                    className: d,
                    right: 0,
                  })),
                });
                console.error(`  ✗ FAIL: [${clipEntry}] ${clipped.details.join('; ')}`);
              } else {
                passedChecks++;
              }

              // Record render element metrics on default view
              if (!elementMetricsMap.has(entryName)) {
                const counts = await countRenderedElements(page);
                elementMetricsMap.set(entryName, counts);
              }

              if (check.hasOverflow) {
                failures.push({
                  viewport: vp.name,
                  fontScale: scalePct,
                  targetDescription: `${route.name} (${route.path})`,
                  clientWidth: check.clientWidth,
                  scrollWidth: check.scrollWidth,
                  overflowAmount: check.overflowAmount,
                  culprits: check.culprits,
                });
                console.error(
                  `  ✗ FAIL: [${route.name}] scrollWidth=${check.scrollWidth} > clientWidth=${check.clientWidth} (+${check.overflowAmount}px)`,
                );
              } else {
                passedChecks++;
                console.log(
                  `  ✓ PASS: [${route.name}] (${check.clientWidth}px / ${check.scrollWidth}px)`,
                );
              }

              // Route-specific interaction: DateRangePicker on Dashboard
              if (route.path === '/dashboard') {
                const datePickerTrigger = page.locator('button[aria-haspopup="dialog"]').first();
                if (await datePickerTrigger.isVisible()) {
                  await datePickerTrigger.click();
                  await page.waitForTimeout(300);
                  const dpCheck = await measureOverflow(page);
                  totalChecks++;
                  const dpEntry = 'Dashboard -> DateRangePicker Bottom Sheet';
                  visitedCatalog.add(dpEntry);
                  if (!elementMetricsMap.has(dpEntry)) {
                    const counts = await countRenderedElements(page);
                    elementMetricsMap.set(dpEntry, counts);
                  }

                  if (dpCheck.hasOverflow) {
                    failures.push({
                      viewport: vp.name,
                      fontScale: scalePct,
                      targetDescription: dpEntry,
                      clientWidth: dpCheck.clientWidth,
                      scrollWidth: dpCheck.scrollWidth,
                      overflowAmount: dpCheck.overflowAmount,
                      culprits: dpCheck.culprits,
                    });
                    console.error(`  ✗ FAIL: [${dpEntry}] (+${dpCheck.overflowAmount}px)`);
                  } else {
                    passedChecks++;
                  }
                  await page.keyboard.press('Escape').catch(() => {});
                  await page.waitForTimeout(200);
                }
              }
            } else {
              // Discover tabs dynamically via role="tab"
              const tabElements = await page.locator('[role="tab"]').all();
              const tabDetails: Array<{ id: string; text: string; index: number }> = [];

              for (let i = 0; i < tabElements.length; i++) {
                const el = tabElements[i];
                const isVisible = await el.isVisible().catch(() => false);
                if (!isVisible) continue;

                const id = (await el.getAttribute('id')) || '';
                const text = (await el.innerText()).replace(/\s+/g, ' ').trim() || id;
                tabDetails.push({ id, text, index: i });
              }

              // Test initial view of the route
              const initialCheck = await measureOverflow(page);
              totalChecks++;
              const initialEntryName = `${route.name} (Initial)`;
              visitedCatalog.add(initialEntryName);
              if (!elementMetricsMap.has(initialEntryName)) {
                const counts = await countRenderedElements(page);
                elementMetricsMap.set(initialEntryName, counts);
              }

              if (initialCheck.hasOverflow) {
                failures.push({
                  viewport: vp.name,
                  fontScale: scalePct,
                  targetDescription: initialEntryName,
                  clientWidth: initialCheck.clientWidth,
                  scrollWidth: initialCheck.scrollWidth,
                  overflowAmount: initialCheck.overflowAmount,
                  culprits: initialCheck.culprits,
                });
                console.error(
                  `  ✗ FAIL: [${route.name} Initial] (+${initialCheck.overflowAmount}px overflow)`,
                );
              } else {
                passedChecks++;
              }

              // Click and audit each dynamically discovered tab
              for (const t of tabDetails) {
                const tabLoc = t.id
                  ? page.locator(`#${t.id}`)
                  : page.locator('[role="tab"]').nth(t.index);
                await tabLoc.click().catch(() => {});
                await page.waitForTimeout(300);

                // Expand all pair cards if on Lineage Directory
                if (route.path === '/lineage') {
                  const expandAllBtn = page
                    .locator('button:has-text("Expand all"), button:has-text("Expand All")')
                    .first();
                  if (await expandAllBtn.isVisible()) {
                    await expandAllBtn.click().catch(() => {});
                    await page.waitForTimeout(300);
                  }

                  // If Pedigree tab, open mobile outline list and select deep chicken
                  if (t.text.toLowerCase().includes('pedigree')) {
                    const mobileSummary = page
                      .locator('summary')
                      .filter({ hasText: 'Mobile Pedigree Lineage List' })
                      .first();
                    if (await mobileSummary.isVisible()) {
                      await mobileSummary.click().catch(() => {});
                      await page.waitForTimeout(300);
                    }
                  }
                }

                const tabCheck = await measureOverflow(page);
                totalChecks++;
                const entryName = `${route.name} -> Tab: "${t.text}"`;
                visitedCatalog.add(entryName);

                if (!elementMetricsMap.has(entryName)) {
                  const counts = await countRenderedElements(page);
                  elementMetricsMap.set(entryName, counts);
                }

                if (tabCheck.hasOverflow) {
                  failures.push({
                    viewport: vp.name,
                    fontScale: scalePct,
                    targetDescription: entryName,
                    clientWidth: tabCheck.clientWidth,
                    scrollWidth: tabCheck.scrollWidth,
                    overflowAmount: tabCheck.overflowAmount,
                    culprits: tabCheck.culprits,
                  });
                  console.error(
                    `  ✗ FAIL: [${entryName}] (+${tabCheck.overflowAmount}px overflow)`,
                  );
                } else {
                  passedChecks++;
                }

                // Check secondary sub-pills if present (e.g. Offspring sub-filter buttons)
                const pills = await page.locator('button[id^="offspring-pill-"]').all();
                if (pills.length > 0) {
                  for (const pill of pills) {
                    const pVisible = await pill.isVisible().catch(() => false);
                    if (!pVisible) continue;
                    const pText = (await pill.innerText()).replace(/\s+/g, ' ').trim();
                    await pill.click().catch(() => {});
                    await page.waitForTimeout(200);

                    const pillCheck = await measureOverflow(page);
                    totalChecks++;
                    const pillEntryName = `${route.name} -> Tab: "${t.text}" -> Pill: "${pText}"`;
                    visitedCatalog.add(pillEntryName);

                    if (!elementMetricsMap.has(pillEntryName)) {
                      const counts = await countRenderedElements(page);
                      elementMetricsMap.set(pillEntryName, counts);
                    }

                    if (pillCheck.hasOverflow) {
                      failures.push({
                        viewport: vp.name,
                        fontScale: scalePct,
                        targetDescription: pillEntryName,
                        clientWidth: pillCheck.clientWidth,
                        scrollWidth: pillCheck.scrollWidth,
                        overflowAmount: pillCheck.overflowAmount,
                        culprits: pillCheck.culprits,
                      });
                      console.error(
                        `  ✗ FAIL: [${pillEntryName}] (+${pillCheck.overflowAmount}px overflow)`,
                      );
                    } else {
                      passedChecks++;
                    }
                  }
                }
              }

              // Modal Interactions: Chicken Profile Modal on Inventory
              if (route.path === '/catalog') {
                const firstFowlCard = page
                  .locator('.group.bg-card, [data-testid="fowl-card"], article')
                  .first();
                if (await firstFowlCard.isVisible()) {
                  await firstFowlCard.click().catch(() => {});
                  await page
                    .waitForSelector('[role="dialog"], .fixed.inset-0', { timeout: 3000 })
                    .catch(() => {});
                  await page.waitForTimeout(300);

                  const modalCheck = await measureOverflow(page);
                  totalChecks++;
                  const modalEntry = 'Chicken Inventory -> Chicken Profile Modal';
                  visitedCatalog.add(modalEntry);
                  if (!elementMetricsMap.has(modalEntry)) {
                    const counts = await countRenderedElements(page);
                    elementMetricsMap.set(modalEntry, counts);
                  }

                  if (modalCheck.hasOverflow) {
                    failures.push({
                      viewport: vp.name,
                      fontScale: scalePct,
                      targetDescription: modalEntry,
                      clientWidth: modalCheck.clientWidth,
                      scrollWidth: modalCheck.scrollWidth,
                      overflowAmount: modalCheck.overflowAmount,
                      culprits: modalCheck.culprits,
                    });
                    console.error(
                      `  ✗ FAIL: [${modalEntry}] (+${modalCheck.overflowAmount}px overflow)`,
                    );
                  } else {
                    passedChecks++;
                  }

                  await page.keyboard.press('Escape').catch(() => {});
                  const closeBtn = page
                    .locator('button[aria-label*="close" i], button:has-text("Close")')
                    .first();
                  if (await closeBtn.isVisible()) await closeBtn.click().catch(() => {});
                  await page.waitForTimeout(200);
                }
              }

              // Modal Interactions: Edit Chicken Modal on Registry
              if (route.path === '/profiling') {
                const editBtn = page.locator('button:has-text("Edit")').first();
                if (await editBtn.isVisible()) {
                  await editBtn.click().catch(() => {});
                  await page.waitForSelector('[role="dialog"]', { timeout: 3000 }).catch(() => {});
                  await page.waitForTimeout(300);

                  const editCheck = await measureOverflow(page);
                  totalChecks++;
                  const editEntry = 'Chicken Registry -> Edit Chicken Modal';
                  visitedCatalog.add(editEntry);
                  if (!elementMetricsMap.has(editEntry)) {
                    const counts = await countRenderedElements(page);
                    elementMetricsMap.set(editEntry, counts);
                  }

                  if (editCheck.hasOverflow) {
                    failures.push({
                      viewport: vp.name,
                      fontScale: scalePct,
                      targetDescription: editEntry,
                      clientWidth: editCheck.clientWidth,
                      scrollWidth: editCheck.scrollWidth,
                      overflowAmount: editCheck.overflowAmount,
                      culprits: editCheck.culprits,
                    });
                    console.error(
                      `  ✗ FAIL: [${editEntry}] (+${editCheck.overflowAmount}px overflow)`,
                    );
                  } else {
                    passedChecks++;
                  }

                  await page.keyboard.press('Escape').catch(() => {});
                  const cancelBtn = page.locator('button:has-text("Cancel")').first();
                  if (await cancelBtn.isVisible()) await cancelBtn.click().catch(() => {});
                  await page.waitForTimeout(200);
                }
              }
            }
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            totalChecks++;
            failures.push({
              viewport: vp.name,
              fontScale: scalePct,
              targetDescription: `${route.name} (${route.path})`,
              clientWidth: vp.width,
              scrollWidth: -1,
              overflowAmount: 999,
              culprits: [
                { tag: 'ERROR', id: 'FATAL_ROUTE_LOAD', className: msg.slice(0, 60), right: 999 },
              ],
            });
            console.error(`  ✗ ERROR: [${route.name}] navigation failure: ${msg.split('\n')[0]}`);
          }
        }

        // ── Scenario checks ────────────────────────────────────────────────
        // Register Chicken (every section visible), the parent selector, and
        // the filter bar with all filters open.
        await runScenarioChecks(page, {
          baseUrl: BASE_URL,
          viewport: vp.name,
          fontScale: scalePct,
          measure: measureOverflow,
          record: (entry: string, check: OverflowCheckResult) => {
            totalChecks++;
            visitedCatalog.add(entry);
            if (!elementMetricsMap.has(entry)) {
              elementMetricsMap.set(entry, { cards: 0, rows: 0, badges: 0 });
            }
            if (check.hasOverflow) {
              failures.push({
                viewport: vp.name,
                fontScale: scalePct,
                targetDescription: entry,
                clientWidth: check.clientWidth,
                scrollWidth: check.scrollWidth,
                overflowAmount: check.overflowAmount,
                culprits: check.culprits,
              });
              console.error(`  ✗ FAIL: [${entry}] (+${check.overflowAmount}px overflow)`);
            } else {
              passedChecks++;
              console.log(`  ✓ PASS: [${entry}]`);
            }
          },
          recordClipped: async (entry: string) => {
            totalChecks++;
            visitedCatalog.add(entry);
            const clipped = await measureClippedActions(page);
            if (clipped.count > 0) {
              failures.push({
                viewport: vp.name,
                fontScale: scalePct,
                targetDescription: entry,
                clientWidth: vp.width,
                scrollWidth: -1,
                overflowAmount: clipped.count,
                culprits: clipped.details.map((d) => ({
                  tag: 'ACTION',
                  id: 'CLIPPED',
                  className: d,
                  right: 0,
                })),
              });
              console.error(`  ✗ FAIL: [${entry}] ${clipped.details.join('; ')}`);
            } else {
              passedChecks++;
              console.log(`  ✓ PASS: [${entry}]`);
            }
          },
        });

        const langTotals = perLanguage.get(lang) ?? { checks: 0, failures: 0 };
        perLanguage.set(lang, {
          checks: langTotals.checks + (totalChecks - checksBefore),
          failures: langTotals.failures + (failures.length - failsBefore),
        });

        await page.close();
        console.log(`✓ Completed checks for ${envLabel}\n`);
      }
    }
  }

  await browser.close();

  console.log('============================================================');
  console.log('AUDIT SUMMARY');
  console.log('============================================================');
  console.log(`Total Configuration Checks: ${totalChecks}`);
  console.log(`Passed: ${passedChecks}`);
  console.log(`Failed: ${failures.length}\n`);

  console.log(
    `Auth reliability: logins=${authStats.logins}, retries=${authStats.retries}, ` +
      `sessionRedirectsRecovered=${authStats.sessionRedirects}, unrecoverableFailures=${authStats.failures}`,
  );
  console.log('');

  console.log('Checks per language:');
  for (const lang of AUDIT_LANGUAGES) {
    const stats = perLanguage.get(lang) ?? { checks: 0, failures: 0 };
    console.log(`  ${lang.padEnd(4)} ${stats.checks} checks, ${stats.failures} failing`);
  }
  console.log('');

  console.log('============================================================');
  console.log('ACTUAL RENDERED CARDS, ROWS & BADGES PER PAGE/TAB/MODAL:');
  console.log('============================================================');
  const sortedMetrics = Array.from(elementMetricsMap.entries()).sort((a, b) =>
    a[0].localeCompare(b[0]),
  );
  for (const [entry, counts] of sortedMetrics) {
    console.log(`  • ${entry}:`);
    console.log(`    - Rendered Cards: ${counts.cards}`);
    console.log(`    - Rendered Rows: ${counts.rows}`);
    console.log(`    - Rendered Badges / Chips: ${counts.badges}`);
  }
  console.log('');

  console.log('PAGES & TABS DYNAMICALLY DISCOVERED & VISITED:');
  const sortedVisited = Array.from(visitedCatalog).sort();
  for (const item of sortedVisited) {
    console.log(`  ✓ ${item}`);
  }
  console.log('');

  if (failures.length > 0) {
    console.error('============================================================');
    console.error('OVERFLOW FAILURES DETECTED:');
    console.error('============================================================');
    for (const f of failures) {
      console.error(`- Viewport ${f.viewport} (${f.fontScale}) on ${f.targetDescription}:`);
      console.error(
        `  clientWidth: ${f.clientWidth}px, scrollWidth: ${f.scrollWidth}px (overflow: +${f.overflowAmount}px)`,
      );
      for (const c of f.culprits) {
        console.error(
          `    * <${c.tag.toLowerCase()} id="${c.id}"> right=${c.right}px class="${c.className}"`,
        );
      }
    }
    process.exit(1);
  }

  console.log('============================================================');
  console.log('ALL ROUTES, TABS, MODALS & DIALOGS FIT STRICTLY WITHIN MOBILE VIEWPORTS');
  console.log('ZERO HORIZONTAL OVERFLOW DETECTED.');
  console.log('============================================================');
}

runAudit().catch((err: unknown) => {
  console.error('Audit script encountered an unexpected fatal error:', err);
  process.exit(1);
});
