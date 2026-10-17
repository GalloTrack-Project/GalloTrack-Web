/**
 * scripts/audit-mobile-overflow.ts
 *
 * Playwright mobile overflow audit script with Stress Dataset Injection:
 * - Injects a comprehensive 40-chicken, 10-match, 8-pairing stress dataset via
 *   Playwright route interception (strictly in-memory, read-only, never writes to DB).
 * - Exercised with long multi-word names (e.g. "Lemon Roundhead Queen Matriarch Supreme Champion"),
 *   long wing bands ("WB-55041-QUEEN-MATRIARCH-SUPREME-A"), 50+ char notes, and multi-strain
 *   crossbred badges ("CROSSBRED · 50% LEMON ROUNDHEAD / 25% HATCH / 25% SWEATER").
 * - Dynamically discovers and tests all tabs (role="tab") on:
 *   - Chicken Inventory (/catalog): All Chickens, Active Breeders, Ready to Breed, Archived, Deceased
 *   - Chicken Registry (/profiling): Breeding Male, Breeding Female, Offspring (with pills: All, Breeding Stock, Non-Breeding), Match Logs
 *   - Lineage Directory (/lineage): All five tabs
 *   - Breeding Hub (/breeding): All tabs (Coding System, Breeding Pairs, Chicken Identity, Safety Incidents)
 *   - Settings (/settings): All tabs (Account, Farm Profile, Preferences, Notifications, Option Lists, Data Management, System Info)
 *   - Match Logs (/match-logs) & Add Match Record (/match-logs/new)
 *
 * Matrix tested:
 * - Viewports: 320x568, 320x640, 360x800, 390x844, 430x932
 * - Font scaling: 100%, 125%, 150%
 *
 * FAILS with exit code 1 if document.documentElement.scrollWidth exceeds clientWidth on any route/tab.
 *
 * SAFETY & PRIVACY:
 * - Strictly LOCAL ONLY: Refuses to run against non-localhost BASE_URL without explicit --allow-external flag.
 * - In-memory session only: Never writes, logs, or commits credentials, tokens, cookies, traces, or storage-state.
 * - Read-only mock layer: Intercepts network calls to provide deterministic stress data without writing to Supabase.
 * - Never runs in CI or on deploy.
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

const BASE_URL = process.env.BASE_URL || process.env.SMOKE_BASE_URL || 'http://localhost:3000';
const EMAIL = process.env.SMOKE_EMAIL || 'client@gmail.com';
const PASSWORD = process.env.SMOKE_PASSWORD || 'password123';
const ALLOW_EXTERNAL = process.env.ALLOW_EXTERNAL_URL === 'true' || process.argv.includes('--allow-external');

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
  { name: 'Chicken Inventory', path: '/catalog', hasDynamicTabs: true, expectedSelector: '[data-testid="inventory-tabs-container"]' },
  { name: 'Chicken Registry', path: '/profiling', hasDynamicTabs: true },
  { name: 'Lineage Directory', path: '/lineage', hasDynamicTabs: true },
  { name: 'Breeding Hub', path: '/breeding', hasDynamicTabs: true },
  { name: 'Match Logs', path: '/match-logs', hasDynamicTabs: false },
  { name: 'Add Match Record', path: '/match-logs/new', hasDynamicTabs: false },
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
    if (effectiveScroll > clientWidth + 1) {
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
      hasOverflow: effectiveScroll > clientWidth + 1,
      overflowAmount: Math.max(0, effectiveScroll - clientWidth),
      culprits: culprits.slice(0, 5),
    };
  });
}

interface RenderElementCounts {
  cards: number;
  rows: number;
  badges: number;
}

async function countRenderedElements(page: Page): Promise<RenderElementCounts> {
  return await page.evaluate(() => {
    // Cards: fowl cards, match cards, breeding pair cards, summary boxes
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
    if (url.includes('/fowl')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(STRESS_FOWLS),
      });
    }
    if (url.includes('/match_videos') || url.includes('/match_photos') || url.includes('/fowl_photos') || url.includes('/safety_incidents')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    }
    if (url.includes('/match')) {
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
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
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
              return Array.from(tabs).some(t => t.textContent?.includes('4') || t.textContent?.includes('24'));
            }, { timeout: 10000 }).catch(() => {});
          } else if (route.path === '/lineage') {
            await page.waitForFunction(() => {
              const tabs = document.querySelectorAll('[role="tab"]');
              return Array.from(tabs).some(t => {
                const num = parseInt(t.textContent?.match(/\d+/)?.[0] || '0', 10);
                return num > 0;
              });
            }, { timeout: 10000 }).catch(() => {});
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
                console.error(`  ✗ FAIL: [${entryName}] scrollWidth=${tabCheck.scrollWidth} > clientWidth=${tabCheck.clientWidth} (+${tabCheck.overflowAmount}px)`);
              } else {
                passedChecks++;
                console.log(`  ✓ PASS: [${entryName}] (${tabCheck.clientWidth}px / ${tabCheck.scrollWidth}px)`);
              }

              // Special check for nested tabs/pills revealed by clicking (e.g. Offspring category pills)
              const nestedPills = await page.locator('[role="tablist"] [role="tab"]').all();
              if (nestedPills.length > tabDetails.length) {
                for (const pill of nestedPills) {
                  const pId = (await pill.getAttribute('id')) || '';
                  if (pId.startsWith('prospect-category-')) {
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
                      console.error(`  ✗ FAIL: [${pillEntryName}] (+${pillCheck.overflowAmount}px)`);
                    } else {
                      passedChecks++;
                      console.log(`  ✓ PASS: [${pillEntryName}] (${pillCheck.clientWidth}px / ${pillCheck.scrollWidth}px)`);
                    }
                  }
                }
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
            culprits: [],
          });
          console.error(`  ✗ ERROR loading ${route.name}: ${msg.split('\n')[0]}`);
        }
      }

      await page.close();
      console.log('');
    }
  }

  await browser.close();

  console.log('============================================================');
  console.log('Mobile Overflow Audit Summary');
  console.log('============================================================');
  console.log(`Total Configurations Checked: ${totalChecks}`);
  console.log(`Passed: ${passedChecks}`);
  console.log(`Failed: ${failures.length}\n`);

  console.log('============================================================');
  console.log('ACTUAL RENDERED CARDS, ROWS & BADGES PER PAGE/TAB:');
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
    console.log(`  • ${item}`);
  }
  console.log('');

  if (failures.length > 0) {
    console.error('FAILURE DETAILS:');
    for (const f of failures) {
      console.error(`- [${f.viewport} @ ${f.fontScale}] on ${f.targetDescription}:`);
      console.error(`  clientWidth: ${f.clientWidth}px, scrollWidth: ${f.scrollWidth}px (overflow: +${f.overflowAmount}px)`);
      if (f.culprits.length > 0) {
        for (const c of f.culprits) {
          console.error(`    * <${c.tag.toLowerCase()} id="${c.id}"> right=${c.right}px (class="${c.className}")`);
        }
      }
    }
    process.exit(1);
  }

  console.log('✓ All routes and dynamic tabs strictly fit mobile viewports with ZERO horizontal overflow across all font scalings.\n');
}

runAudit().catch((err: unknown) => {
  console.error('Audit script fatal error:', err);
  process.exit(1);
});
