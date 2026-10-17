/**
 * Mobile Horizontal Overflow Audit (Playwright Regression Test)
 *
 * Verifies that all dashboard routes and sub-tabs fit within mobile viewports
 * with ZERO horizontal overflow (document.documentElement.scrollWidth <= clientWidth).
 *
 * Tests across:
 *   - 5 viewports: iPhone SE (320x568), 320x640, Galaxy S20 (360x800), iPhone 12/13/14 (390x844), iPhone 14 Pro Max (430x932)
 *   - 3 font scaling levels: 100%, 125%, 150% (5 * 3 = 15 total environment configurations)
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
const ALLOW_EXTERNAL = process.env.ALLOW_EXTERNAL_URL === 'true' || process.argv.includes('--allow-external');

if (!EMAIL || !PASSWORD) {
  console.error('\n❌ ERROR: SMOKE_EMAIL and SMOKE_PASSWORD must be provided via environment variables or untracked .env.local.');
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
      console.error('To override intentionally, pass the --allow-external flag or set ALLOW_EXTERNAL_URL=true.\n');
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
}

const VIEWPORTS: ViewportSpec[] = [
  { name: '320x568', width: 320, height: 568 },
  { name: '320x640', width: 320, height: 640 },
  { name: '360x800', width: 360, height: 800 },
  { name: '390x844', width: 390, height: 844 },
  { name: '430x932', width: 430, height: 932 },
];

const FONT_SCALES = [1.0, 1.25, 1.5]; // 100%, 125%, 150%

interface BaseRouteSpec {
  name: string;
  path: string;
  hasDynamicTabs: boolean;
  expectedSelector?: string;
}

const BASE_ROUTES: BaseRouteSpec[] = [
  { name: 'Dashboard', path: '/dashboard', hasDynamicTabs: false },
  { name: 'Chicken Inventory', path: '/catalog', hasDynamicTabs: true, expectedSelector: '[data-testid="inventory-tabs-container"]' },
  { name: 'Chicken Registry', path: '/profiling', hasDynamicTabs: true },
  { name: 'Lineage Directory', path: '/lineage', hasDynamicTabs: true },
  { name: 'Breeding Hub', path: '/breeding', hasDynamicTabs: true },
  { name: 'Match Logs', path: '/match-logs', hasDynamicTabs: false },
  { name: 'Add Match Record', path: '/match-logs/new?initialFowlId=101', hasDynamicTabs: false },
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
      throw new Error('Chromium executable not found. Please install Playwright browsers or set PLAYWRIGHT_CHROMIUM_PATH.');
    }
    return chromium.launch({ executablePath: cached });
  }
}

async function authenticate(context: BrowserContext): Promise<void> {
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[type="password"]', { timeout: 15000 });
  await page.waitForTimeout(1000);

  const emailInput = page.locator('input[type="email"], input[id="email-address"], input[name="username"]').first();
  await emailInput.fill(EMAIL);
  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.fill(PASSWORD);
  await page.waitForTimeout(400);
  await page.click('button[type="submit"]');

  await page.waitForURL(/dashboard/, { timeout: 20000 });
  await page.close();
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
  if (response && response.status() >= 400) {
    throw new Error(`HTTP Error ${response.status()} (${response.statusText()}) navigating to ${url}`);
  }
  const pageError = await page.evaluate(() => {
    const text = document.body?.innerText || '';
    if (text.includes('404') && (text.includes('This page could not be found') || text.includes('Page Not Found') || text.includes('Record Not Found'))) {
      return '404 / Not Found page detected';
    }
    if (text.includes('Something went wrong') || text.includes('Application error: a client-side exception')) {
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
      '.group.bg-card, [data-testid="fowl-card"], article, div[class*="rounded-2xl border"], div[class*="rounded-3xl border"], div[class*="bg-card"][class*="rounded-lg border"]'
    ).length;

    // Table rows
    const rows = document.querySelectorAll('tbody tr, [role="row"]').length;

    // Badges / pills: status badges, breeding type badges, bloodline chips, tags
    const badges = document.querySelectorAll(
      '[data-testid="status-badge"], span[class*="rounded-full"], span[class*="rounded-md"][class*="text-xs"], span[class*="tracking-wider"], span[class*="font-mono"]'
    ).length;

    return { cards, rows, badges };
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

async function runAudit(): Promise<void> {
  console.log('============================================================');
  console.log('Mobile Overflow Audit (Playwright with Stress Dataset)');
  console.log(`Base URL: ${BASE_URL} (Local-only verification enforced)`);
  console.log(`Stress Dataset: ${STRESS_FOWLS.length} Chickens, ${STRESS_MATCHES.length} Matches, ${STRESS_PAIRINGS.length} Pairings`);
  console.log(`Matrix: ${VIEWPORTS.length} viewports × ${FONT_SCALES.length} font scalings = ${VIEWPORTS.length * FONT_SCALES.length} environment configurations`);
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
    await authenticate(context);
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

    if (url.includes('/fowl_photos') || url.includes('/match_videos') || url.includes('/match_photos') || url.includes('/safety_incidents')) {
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
  let totalChecks = 0;
  let passedChecks = 0;

  for (const vp of VIEWPORTS) {
    for (const fontScale of FONT_SCALES) {
      const scalePct = `${Math.round(fontScale * 100)}%`;
      const envLabel = `Viewport: ${vp.name} (${vp.width}x${vp.height}) | Font Scale: ${scalePct}`;
      console.log(`>>> Checking ${envLabel}`);

      const page = await context.newPage();
      await page.setViewportSize({ width: vp.width, height: vp.height });

      for (const route of BASE_ROUTES) {
        const url = `${BASE_URL}${route.path}`;
        try {
          const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
          await assertPageHealthy(page, url, res);

          if (route.expectedSelector) {
            await page.locator(route.expectedSelector).first().waitFor({ state: 'attached', timeout: 5000 }).catch(() => {});
          }

          if (fontScale !== 1.0) {
            await page.evaluate((scale) => {
              document.documentElement.style.fontSize = `${Math.round(scale * 100)}%`;
            }, fontScale);
          }

          // Await data hydration for stress dataset
          if (route.path === '/catalog') {
            await page.waitForFunction(() => {
              const el = document.querySelector('#inventory-tab-all span:last-child');
              return el && parseInt(el.textContent?.trim() || '0', 10) > 0;
            }, { timeout: 10000 }).catch(() => {});
          } else if (route.path === '/profiling') {
            await page.waitForFunction(() => {
              const tabs = document.querySelectorAll('[role="tab"]');
              return Array.from(tabs).some((t) => t.textContent?.includes('4') || t.textContent?.includes('24'));
            }, { timeout: 10000 }).catch(() => {});
          } else if (route.path === '/lineage') {
            await page.waitForFunction(() => {
              const tabs = document.querySelectorAll('[role="tab"]');
              return Array.from(tabs).some((t) => {
                const num = parseInt(t.textContent?.match(/\d+/)?.[0] || '0', 10);
                return num > 0;
              });
            }, { timeout: 10000 }).catch(() => {});
          } else if (route.path === '/match-logs') {
            await page.locator('tbody tr, [role="row"]').first().waitFor({ state: 'attached', timeout: 8000 }).catch(() => {});
          } else if (route.path.includes('/match-logs/1/edit')) {
            await page.locator('input[name="opponent_name"], input[placeholder*="opponent" i]').first().waitFor({ state: 'attached', timeout: 8000 }).catch(() => {});
          } else {
            await page.waitForTimeout(400);
          }

          if (!route.hasDynamicTabs) {
            // Static route check
            const check = await measureOverflow(page);
            totalChecks++;
            const entryName = `${route.name} (default)`;
            visitedCatalog.add(entryName);

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
              console.error(`  ✗ FAIL: [${route.name}] scrollWidth=${check.scrollWidth} > clientWidth=${check.clientWidth} (+${check.overflowAmount}px)`);
            } else {
              passedChecks++;
              console.log(`  ✓ PASS: [${route.name}] (${check.clientWidth}px / ${check.scrollWidth}px)`);
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
              console.error(`  ✗ FAIL: [${route.name} Initial] (+${initialCheck.overflowAmount}px overflow)`);
            } else {
              passedChecks++;
            }

            // Click and audit each dynamically discovered tab
            for (const t of tabDetails) {
              const tabLoc = t.id ? page.locator(`#${t.id}`) : page.locator('[role="tab"]').nth(t.index);
              await tabLoc.click().catch(() => {});
              await page.waitForTimeout(300);

              // Expand all pair cards if on Lineage Directory
              if (route.path === '/lineage') {
                const expandAllBtn = page.locator('button:has-text("Expand all"), button:has-text("Expand All")').first();
                if (await expandAllBtn.isVisible()) {
                  await expandAllBtn.click().catch(() => {});
                  await page.waitForTimeout(300);
                }

                // If Pedigree tab, open mobile outline list and select deep chicken
                if (t.text.toLowerCase().includes('pedigree')) {
                  const mobileSummary = page.locator('summary').filter({ hasText: 'Mobile Pedigree Lineage List' }).first();
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
                console.error(`  ✗ FAIL: [${entryName}] (+${tabCheck.overflowAmount}px overflow)`);
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
                    console.error(`  ✗ FAIL: [${pillEntryName}] (+${pillCheck.overflowAmount}px overflow)`);
                  } else {
                    passedChecks++;
                  }
                }
              }
            }

            // Modal Interactions: Chicken Profile Modal on Inventory
            if (route.path === '/catalog') {
              const firstFowlCard = page.locator('.group.bg-card, [data-testid="fowl-card"], article').first();
              if (await firstFowlCard.isVisible()) {
                await firstFowlCard.click().catch(() => {});
                await page.waitForSelector('[role="dialog"], .fixed.inset-0', { timeout: 3000 }).catch(() => {});
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
                  console.error(`  ✗ FAIL: [${modalEntry}] (+${modalCheck.overflowAmount}px overflow)`);
                } else {
                  passedChecks++;
                }

                await page.keyboard.press('Escape').catch(() => {});
                const closeBtn = page.locator('button[aria-label*="close" i], button:has-text("Close")').first();
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
                  console.error(`  ✗ FAIL: [${editEntry}] (+${editCheck.overflowAmount}px overflow)`);
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
          failures.push({
            viewport: vp.name,
            fontScale: scalePct,
            targetDescription: `${route.name} (${route.path})`,
            clientWidth: vp.width,
            scrollWidth: -1,
            overflowAmount: 999,
            culprits: [{ tag: 'ERROR', id: 'FATAL_ROUTE_LOAD', className: msg.slice(0, 60), right: 999 }],
          });
          console.error(`  ✗ ERROR: [${route.name}] navigation failure: ${msg.split('\n')[0]}`);
        }
      }

      await page.close();
      console.log(`✓ Completed checks for ${envLabel}\n`);
    }
  }

  await browser.close();

  console.log('============================================================');
  console.log('AUDIT SUMMARY');
  console.log('============================================================');
  console.log(`Total Configuration Checks: ${totalChecks}`);
  console.log(`Passed: ${passedChecks}`);
  console.log(`Failed: ${failures.length}\n`);

  console.log('============================================================');
  console.log('ACTUAL RENDERED CARDS, ROWS & BADGES PER PAGE/TAB/MODAL:');
  console.log('============================================================');
  const sortedMetrics = Array.from(elementMetricsMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
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
      console.error(`  clientWidth: ${f.clientWidth}px, scrollWidth: ${f.scrollWidth}px (overflow: +${f.overflowAmount}px)`);
      for (const c of f.culprits) {
        console.error(`    * <${c.tag.toLowerCase()} id="${c.id}"> right=${c.right}px class="${c.className}"`);
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
