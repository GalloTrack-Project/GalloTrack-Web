/** Debug helper: dump rendered text of key pages for needle selection. */
import { chromium } from 'playwright';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

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
      const exe = ['headless_shell.exe', 'chrome.exe'].map((n) => join(full, n))
        .concat([join(full, 'chrome-win', 'chrome.exe'), join(full, 'chrome-win64', 'chrome.exe')])
        .find((p) => existsSync(p));
      if (exe) return exe;
    }
  }
  return null;
}

async function launch() {
  try { return await chromium.launch(); }
  catch {
    const cached = findCachedChromium();
    if (!cached) throw new Error('no chromium');
    return chromium.launch({ executablePath: cached });
  }
}

async function main() {
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#email-address', { timeout: 30000 });
  await page.fill('#email-address', 'client@gmail.com');
  await page.fill('#password', 'password123');
  await page.click('button[type=submit]');
  await page.waitForURL(/dashboard/, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(4000);

  for (const path of ['/dashboard', '/breeding']) {
    await page.goto('http://localhost:3000' + path, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    const text = await page.locator('main, body').first().innerText().catch(() => '');
    console.log('==== ' + path + ' ==== (' + text.length + ' chars)');
    console.log(text.slice(0, 1500));
    console.log('...');
  }
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
