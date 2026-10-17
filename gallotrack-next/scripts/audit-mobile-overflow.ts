/**
 * scripts/audit-mobile-overflow.ts
 *
 * Playwright mobile overflow audit script.
 * Loads Chicken Inventory (all five status tabs), Chicken Registry (all four tabs),
 * Lineage Directory, Breeding Hub, Match Logs, Add Match Record, and Settings
 * across four mobile viewports (320x640, 360x800, 390x844, 430x932).
 *
 * FAILS with exit code 1 if document.documentElement.scrollWidth exceeds clientWidth on any route.
 *
 * LOCAL-ONLY:
 * - Uses owner / test account session from env (SMOKE_EMAIL / SMOKE_PASSWORD or defaults).
 * - Never prints, logs, or commits credentials, tokens, or cookies.
 * - Never writes, updates, or deletes anything in the database (read-only navigation).
 * - Never runs in CI or on deploy.
 *
 * Usage:
 *   1. Ensure server is running (e.g. npm run dev or npm start on http://localhost:3000)
 *   2. npm run audit:mobile
 *   or:
 *   BASE_URL=http://localhost:3000 npm run audit:mobile
 */

import { chromium, type Browser, type BrowserContext } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

interface ViewportSpec {
  name: string;
  width: number;
  height: number;
}

const VIEWPORTS: ViewportSpec[] = [
  { name: '320x640', width: 320, height: 640 },
  { name: '360x800', width: 360, height: 800 },
  { name: '390x844', width: 390, height: 844 },
  { name: '430x932', width: 430, height: 932 },
];

interface RouteSpec {
  name: string;
  path: string;
  expectedSelector?: string;
}

const ROUTES: RouteSpec[] = [
  // Chicken Inventory (all 5 tabs)
  { name: 'Chicken Inventory (All)', path: '/catalog?status=all', expectedSelector: '[data-testid="inventory-tabs-container"]' },
  { name: 'Chicken Inventory (Active)', path: '/catalog?status=active', expectedSelector: '[data-testid="inventory-tabs-container"]' },
  { name: 'Chicken Inventory (Breeding)', path: '/catalog?status=breeding', expectedSelector: '[data-testid="inventory-tabs-container"]' },
  { name: 'Chicken Inventory (Archived)', path: '/catalog?status=archived', expectedSelector: '[data-testid="inventory-tabs-container"]' },
  { name: 'Chicken Inventory (Deceased)', path: '/catalog?status=deceased', expectedSelector: '[data-testid="inventory-tabs-container"]' },

  // Chicken Registry (all 4 tabs)
  { name: 'Chicken Registry (Males)', path: '/profiling?tab=males' },
  { name: 'Chicken Registry (Females)', path: '/profiling?tab=females' },
  { name: 'Chicken Registry (Archived)', path: '/profiling?tab=archived' },
  { name: 'Chicken Registry (Deceased)', path: '/profiling?tab=deceased' },

  // Lineage Directory
  { name: 'Lineage Directory', path: '/lineage' },

  // Breeding Hub
  { name: 'Breeding Hub', path: '/breeding' },

  // Match Logs
  { name: 'Match Logs', path: '/match-logs' },

  // Add Match Record
  { name: 'Add Match Record', path: '/match-logs/new' },

  // Settings
  { name: 'Settings', path: '/settings' },
];

const BASE_URL = process.env.BASE_URL || process.env.SMOKE_BASE_URL || 'http://localhost:3000';
const EMAIL = process.env.SMOKE_EMAIL || 'client@gmail.com';
const PASSWORD = process.env.SMOKE_PASSWORD || 'password123';

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

async function authenticate(context: BrowserContext): Promise<void> {
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });

  // Fill credentials safely without printing to stdout
  const emailInput = page.locator('input[type="email"], input[id="email-address"], input[name="username"]').first();
  await emailInput.fill(EMAIL);
  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.fill(PASSWORD);
  await page.click('button[type="submit"]');

  await page.waitForURL(/dashboard/, { timeout: 20000 });
  await page.close();
}

interface FailureReport {
  viewport: string;
  routeName: string;
  path: string;
  clientWidth: number;
  scrollWidth: number;
  overflowAmount: number;
  overflowingElements: Array<{ tag: string; id: string; className: string; right: number }>;
}

async function runAudit(): Promise<void> {
  console.log('------------------------------------------------------------');
  console.log('Mobile Overflow Audit (Playwright)');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Auditing ${ROUTES.length} routes across ${VIEWPORTS.length} viewports (${ROUTES.length * VIEWPORTS.length} total configurations)`);
  console.log('------------------------------------------------------------\n');

  let browser: Browser;
  try {
    browser = await launchBrowser();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Failed to launch browser:', msg);
    process.exit(1);
  }

  const context = await browser.newContext();

  try {
    console.log('Authenticating owner session...');
    await authenticate(context);
    console.log('✓ Authentication successful\n');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Failed to authenticate session:', msg);
    await browser.close();
    process.exit(1);
  }

  const failures: FailureReport[] = [];
  let passedCount = 0;

  for (const vp of VIEWPORTS) {
    console.log(`>>> Checking Viewport: ${vp.name} (${vp.width}x${vp.height})`);

    const page = await context.newPage();
    await page.setViewportSize({ width: vp.width, height: vp.height });

    for (const route of ROUTES) {
      const url = `${BASE_URL}${route.path}`;
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        if (route.expectedSelector) {
          await page.locator(route.expectedSelector).first().waitFor({ state: 'attached', timeout: 5000 }).catch(() => {});
        }
        await page.waitForTimeout(600);

        const check = await page.evaluate(() => {
          const clientWidth = document.documentElement.clientWidth;
          const scrollWidth = document.documentElement.scrollWidth;
          const bodyScrollWidth = document.body.scrollWidth;
          const effectiveScroll = Math.max(scrollWidth, bodyScrollWidth);

          const overflowing: Array<{ tag: string; id: string; className: string; right: number }> = [];
          if (effectiveScroll > clientWidth) {
            document.querySelectorAll('*').forEach((el) => {
              const rect = el.getBoundingClientRect();
              if (rect.right > clientWidth + 1) {
                overflowing.push({
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
            overflowing: overflowing.slice(0, 5),
          };
        });

        const overflow = check.scrollWidth - check.clientWidth;
        if (overflow > 1) {
          failures.push({
            viewport: vp.name,
            routeName: route.name,
            path: route.path,
            clientWidth: check.clientWidth,
            scrollWidth: check.scrollWidth,
            overflowAmount: overflow,
            overflowingElements: check.overflowing,
          });
          console.error(`  ✗ FAIL: [${route.name}] (${route.path}) => scrollWidth=${check.scrollWidth} > clientWidth=${check.clientWidth} (+${overflow}px overflow)`);
        } else {
          passedCount++;
          console.log(`  ✓ PASS: [${route.name}] (${check.clientWidth}px / ${check.scrollWidth}px)`);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        failures.push({
          viewport: vp.name,
          routeName: route.name,
          path: route.path,
          clientWidth: vp.width,
          scrollWidth: -1,
          overflowAmount: 999,
          overflowingElements: [],
        });
        console.error(`  ✗ ERROR: [${route.name}] load failed: ${msg.split('\n')[0]}`);
      }
    }

    await page.close();
    console.log('');
  }

  await browser.close();

  console.log('------------------------------------------------------------');
  console.log(`Mobile Overflow Audit Results: ${passedCount} PASSED, ${failures.length} FAILED`);
  console.log('------------------------------------------------------------');

  if (failures.length > 0) {
    console.error('\nFAILURE DETAILS:');
    for (const f of failures) {
      console.error(`- Viewport ${f.viewport} on ${f.routeName} (${f.path}):`);
      console.error(`  clientWidth: ${f.clientWidth}px, scrollWidth: ${f.scrollWidth}px (overflow: +${f.overflowAmount}px)`);
      if (f.overflowingElements.length > 0) {
        console.error('  Culprit elements exceeding viewport right:');
        for (const el of f.overflowingElements) {
          console.error(`    * <${el.tag.toLowerCase()} id="${el.id}"> right=${el.right}px (class="${el.className}")`);
        }
      }
    }
    process.exit(1);
  }

  console.log('\nAll checked routes fit strictly within mobile viewports with zero horizontal overflow.');
}

runAudit().catch((err: unknown) => {
  console.error('Audit script encountered an unexpected fatal error:', err);
  process.exit(1);
});
