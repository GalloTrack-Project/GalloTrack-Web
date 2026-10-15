/**
 * smoke-record-pages.ts — verify every page in the video script renders
 * while authenticated, before we spend time recording it.
 *
 *   npx tsx scripts/smoke-record-pages.ts
 *
 * Credentials come from env (defaults are the demo account) — do not commit
 * real credentials; set SMOKE_EMAIL / SMOKE_PASSWORD instead.
 */
import { chromium } from 'playwright';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** Same fallback the repo's mobile-gate.mjs uses: the cached browser build
 * can lag the installed Playwright version, and launch() then refuses. */
function findCachedChromium(): string | null {
  const cache = join(process.env.USERPROFILE ?? process.env.HOME ?? '', 'AppData', 'Local', 'ms-playwright');
  if (!existsSync(cache)) return null;
  for (const entry of readdirSync(cache)) {
    if (!entry.startsWith('chromium')) continue;
    const dir = join(cache, entry);
    if (!statSync(dir).isDirectory()) continue;
    for (const sub of readdirSync(dir)) {
      const full = join(dir, sub);
      if (!statSync(full).isDirectory()) continue;
      const exe = ['headless_shell.exe', 'chrome.exe']
        .map((n) => join(full, n))
        .concat([
          join(full, 'chrome-win', 'headless_shell.exe'),
          join(full, 'chrome-win', 'chrome.exe'),
          join(full, 'chrome-win64', 'chrome.exe'),
        ])
        .find((p) => existsSync(p));
      if (exe) return exe;
    }
  }
  return null;
}

async function launch() {
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

const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3000';
const EMAIL = process.env.SMOKE_EMAIL || 'client@gmail.com';
const PASSWORD = process.env.SMOKE_PASSWORD || 'password123';

/** [scene, path, mustContain (optional text proving the page rendered)] */
const PAGES: [string, string, string?][] = [
  ['S1 Login', '/'],
  ['S2 Dashboard', '/dashboard', 'Overall Win Rate'],
  ['S3 Registry', '/profiling', 'Breeding Male'],
  ['S5 Inventory', '/catalog'],
  ['S6 Lineage', '/lineage'],
  ['S7 Breeding Hub', '/breeding', 'Coding System'],
  ['S10 Match stats', '/dashboard', 'Total Matches'],
  ['S13 Conclusion', '/dashboard', 'GALLO'],
];

async function main() {
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const failures: string[] = [];

  const record = async (scene: string, needle?: string) => {
    // give client-side data fetches time to land (cold loads take >1.5s)
    await page.waitForLoadState('networkidle').catch(() => {});
    if (needle) {
      await page
        .getByText(needle, { exact: false })
        .first()
        .waitFor({ state: 'attached', timeout: 10000 })
        .catch(() => {});
    }
    await page.waitForTimeout(800);
    const url = page.url();
    const fullText = await page.locator('body').innerText().catch(() => '');
    const body = fullText.slice(0, 400);
    const bouncedToLogin = url.includes('/?redirect') || url.endsWith('/') && !scene.includes('Login');
    const err = (await page.locator('text=/error|failed|exception/i').count().catch(() => 0)) > 0;
    // CSS text-transform uppercases many labels, so compare case-insensitively.
    // Search the whole page text, not the 400-char head used for display.
    const ok = !bouncedToLogin && (!needle || fullText.toLowerCase().includes(needle.toLowerCase()));
    const status = ok ? 'PASS' : 'FAIL';
    console.log(`${status}  ${scene.padEnd(18)} ${url}${ok ? '' : ` (needle=${needle ?? '-'}, bounced=${bouncedToLogin}, errText=${err})`}`);
    if (!ok) failures.push(scene);
  };

  // Scene 1: login page itself
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await record('S1 Login');

  // Authenticated flow: sign in the same way the app does
  await page.fill('#email-address', EMAIL);
  await page.fill('#password', PASSWORD);
  await page.click('button[type=submit]');
  await page.waitForURL(/dashboard/, { timeout: 20000 }).catch(() => {});
  await record('S2 Dashboard', 'Overall Win Rate');

  for (const [scene, path, needle] of PAGES.slice(2)) {
    await page.goto(BASE + path, { waitUntil: 'domcontentloaded' });
    // SPA nav from the sidebar is what the video does; direct nav is close enough for a render check
    await page.waitForTimeout(1200);
    await record(scene, needle);
  }

  // Browser console errors — anything here will show up as a red overlay in the video
  await browser.close();

  if (failures.length) {
    console.error(`\n${failures.length} page(s) failed: ${failures.join(', ')}`);
    process.exit(1);
  }
  console.log('\nAll script pages render — safe to record.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
