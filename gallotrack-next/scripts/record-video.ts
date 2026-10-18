/**
 * record-video.ts — records the GalloTrack video presentation scenes.
 *
 *   npx tsx scripts/record-video.ts                 # all 13 scenes
 *   npx tsx scripts/record-video.ts --scene=S2,S6   # subset
 *   npx tsx scripts/record-video.ts --fast          # dress rehearsal (holds/zooms shortened)
 *
 * Output: recordings/raw/scene-NN-*.webm + recordings/manifest.json
 * (beat timestamps per step → align the live CapCut narration against them).
 * Convert/stitch with: node scripts/stitch-video.mjs
 *
 * Creds come from env (defaults = demo account): SMOKE_EMAIL / SMOKE_PASSWORD.
 * Never commit real credentials.
 *
 * Effects are injected via addInitScript(initEffects, cfg); tsx/esbuild
 * keepNames serializes functions with __name() wrappers that don't exist in
 * the page, so the string shim MUST be registered first on every context.
 */
import { chromium, type Browser, type Locator, type Page } from 'playwright';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { initEffects } from './video/effects';
import { findScenes, type Scene, type Step, type Target } from './video/scenes';

/* ------------------------------- config ---------------------------------- */

const envLocalPath = join(process.cwd(), '.env.local');
const localEnv: Record<string, string> = {};
if (existsSync(envLocalPath)) {
  for (const line of readFileSync(envLocalPath, 'utf8').split(/\r?\n/)) {
    if (!line.includes('=') || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    localEnv[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
}

const BASE = process.env.SMOKE_BASE_URL || localEnv.SMOKE_BASE_URL || 'http://localhost:3000';
const EMAIL = process.env.SMOKE_EMAIL || localEnv.SMOKE_EMAIL;
const PASSWORD = process.env.SMOKE_PASSWORD || localEnv.SMOKE_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error('❌ Missing SMOKE_EMAIL or SMOKE_PASSWORD. Set them in .env.local or environment.');
  process.exit(1);
}
const OUT = process.env.REC_OUT || 'recordings';
const RAW = join(OUT, 'raw');
const AUTH_PATH = join(OUT, '.auth.json');
const MANIFEST = join(OUT, 'manifest.json');
const VIEWPORT = { width: 1920, height: 1080 } as const;
const SHIM = 'globalThis.__name = (fn) => fn;';

const args = process.argv.slice(2);
const FAST = args.includes('--fast') || process.env.REC_FAST === '1';
const sceneArg = args.find((a) => a.startsWith('--scene='));
const onlyIds = sceneArg ? sceneArg.slice('--scene='.length).split(',') : undefined;

const hold = (ms: number) => (FAST ? Math.max(240, Math.round(ms * 0.12)) : ms);
const ZOOM_DUR = FAST ? 260 : 800;
const RESET_DUR = FAST ? 260 : 600;
const TYPE_DELAY = FAST ? 12 : 70;

/* --------------------------- playwright launch --------------------------- */

/** Same fallback the repo's mobile-gate.mjs uses: the cached browser build can
 *  lag the installed Playwright version, and launch() then refuses. */
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

/* ------------------------------- helpers --------------------------------- */

function loc(page: Page, t: Target): Locator {
  let l: Locator;
  if ('css' in t) l = page.locator(t.css);
  else if ('role' in t) l = page.getByRole(t.role, { name: t.name });
  else l = page.getByText(t.text);
  return l.first();
}

function labelOf(step: Step): string {
  if (step.label) return step.label;
  switch (step.type) {
    case 'hold':
      return `hold ${step.ms}ms`;
    case 'reset':
      return 'zoom out';
    default:
      return step.type;
  }
}

/** Move the virtual cursor to a target (rAF lerp in the overlay follows mouse events). */
async function approach(page: Page, l: Locator): Promise<void> {
  const box = await l.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: FAST ? 3 : 10 });
    await page.waitForTimeout(FAST ? 60 : 170);
  }
}

async function pulse(page: Page, l: Locator): Promise<void> {
  try {
    const el = await l.elementHandle({ timeout: 8000 });
    if (el) await page.evaluate((e: SVGElement | HTMLElement) => (window as unknown as GtWindow).__gt.pulse(e), el);
  } catch {
    /* pulse is cosmetic — never fail a scene for it */
  }
}

async function interactive(page: Page, l: Locator, doPulse: boolean): Promise<void> {
  if (doPulse) await pulse(page, l);
  await approach(page, l);
}

type GtWindow = {
  __gt: {
    focus: (el: Element | null, level: number, dur: number, noAnchor?: boolean) => Promise<null>;
    unfocus: (dur: number) => Promise<null>;
    scrollTo: (y: number, dur: number) => Promise<null>;
    scrollToBy: (dy: number, dur: number) => Promise<null>;
    scrollToEl: (el: Element | null, dur: number, frac?: number) => Promise<null>;
    pulse: (el: Element | null) => void;
    stats: () => { s: number; y: number; anchor: number | null };
  };
};

/* ------------------------------ step executor ---------------------------- */

async function exec(step: Step, page: Page): Promise<void> {
  switch (step.type) {
    case 'goto': {
      await page.goto(BASE + step.path, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
      await page.waitForTimeout(FAST ? 350 : 900);
      return;
    }
    case 'waitUrl': {
      await page.waitForURL(new RegExp(step.re), { timeout: 25000 });
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(FAST ? 300 : 900);
      return;
    }
    case 'nav': {
      const l = page.getByRole('link', { name: step.name }).first();
      await interactive(page, l, true);
      await l.click({ delay: 70 });
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(FAST ? 250 : 700);
      return;
    }
    case 'click':
    case 'tab':
    case 'htab': {
      const l = loc(page, step.type === 'click' ? step.target : { role: step.type === 'tab' ? 'tab' : 'button', name: step.name });
      await interactive(page, l, step.type !== 'click' || step.pulse !== false);
      await l.click({ delay: 70 });
      await page.waitForTimeout(FAST ? 220 : 550);
      return;
    }
    case 'type': {
      const l = loc(page, step.target);
      if (step.click !== false) await interactive(page, l, true);
      await l.pressSequentially(step.text, { delay: step.delay ?? TYPE_DELAY });
      await page.waitForTimeout(FAST ? 150 : 350);
      return;
    }
    case 'key': {
      await page.keyboard.press(step.key);
      await page.waitForTimeout(FAST ? 120 : 300);
      return;
    }
    case 'clickAt': {
      await page.mouse.move(step.x, step.y, { steps: FAST ? 3 : 10 });
      await page.waitForTimeout(FAST ? 60 : 200);
      await page.mouse.click(step.x, step.y, { delay: 70 });
      await page.waitForTimeout(FAST ? 200 : 500);
      return;
    }
    case 'hover': {
      const l = loc(page, step.target);
      await interactive(page, l, false);
      await l.hover();
      await page.waitForTimeout(FAST ? 150 : 350);
      return;
    }
    case 'zoom': {
      // stash the handle first: passing ElementHandles inside object args makes
      // Playwright's Unboxed<> instantiation explode (TS2589)
      if (step.target) {
        const h = await loc(page, step.target).elementHandle({ timeout: 12000 });
        if (!h) throw new Error(`zoom target not found: ${JSON.stringify(step.target)}`);
        await page.evaluate((e: SVGElement | HTMLElement) => {
          (window as unknown as { __gt_last?: Element }).__gt_last = e;
        }, h);
      }
      await page.evaluate((o: { level: number; dur: number; na: boolean; hasEl: boolean }) => {
        const w = window as unknown as GtWindow & { __gt_last?: Element };
        return w.__gt.focus(o.hasEl ? w.__gt_last ?? null : null, o.level, o.dur, o.na);
      }, { level: step.level, dur: ZOOM_DUR, na: !!step.noAnchor, hasEl: !!step.target });
      return;
    }
    case 'reset': {
      await page.evaluate((d: number) => (window as unknown as GtWindow).__gt.unfocus(d), step.dur ? hold(step.dur) : RESET_DUR);
      return;
    }
    case 'scroll': {
      const dur = step.dur ? hold(step.dur) : hold(800);
      if (step.target) {
        const h = await loc(page, step.target).elementHandle({ timeout: 12000 });
        if (!h) throw new Error(`scroll target not found: ${JSON.stringify(step.target)}`);
        await page.evaluate((e: SVGElement | HTMLElement) => {
          (window as unknown as { __gt_last?: Element }).__gt_last = e;
        }, h);
        await page.evaluate((o: { dur: number; frac: number }) => {
          const w = window as unknown as GtWindow & { __gt_last?: Element };
          return w.__gt.scrollToEl(w.__gt_last ?? null, o.dur, o.frac);
        }, { dur, frac: step.frac ?? 0.32 });
      } else {
        await page.evaluate(
          ([dy, d]: [number, number]) => (window as unknown as GtWindow).__gt.scrollToBy(dy, d),
          [step.by ?? 500, dur] as [number, number],
        );
      }
      return;
    }
    case 'select': {
      const css = 'css' in step.target ? step.target.css : (() => { throw new Error('select target must be {css}'); })();
      await page.evaluate(
        ([sel, value, match]: [string, string | null, string | null]) => {
          const s = document.querySelector(sel) as HTMLSelectElement | null;
          if (!s) throw new Error('select not found: ' + sel);
          const opts = Array.from(s.options);
          let chosen: HTMLOptionElement | undefined;
          if (value) chosen = opts.find((o) => o.value === value || o.text.trim() === value);
          if (!chosen && match) {
            const re = new RegExp(match, 'i');
            chosen = opts.find((o) => re.test(o.value) || re.test(o.text));
          }
          if (!chosen) {
            throw new Error(
              'no option matched in ' + sel + ' (value=' + value + ', match=' + match + '); options: ' +
                opts.map((o) => `${o.value}:"${o.text.trim()}"`).join(', '),
            );
          }
          s.value = chosen.value;
          s.dispatchEvent(new Event('input', { bubbles: true }));
          s.dispatchEvent(new Event('change', { bubbles: true }));
        },
        [css, step.value ?? null, step.match ?? null] as [string, string | null, string | null],
      );
      await page.waitForTimeout(FAST ? 300 : 900);
      return;
    }
    case 'hold': {
      await page.waitForTimeout(hold(step.ms));
      return;
    }
  }
}

/* ------------------------------ scene runner ----------------------------- */

type SceneResult = {
  id: string;
  title: string;
  file: string | null;
  durationMs: number;
  ok: boolean;
  error?: string;
  consoleErrors: string[];
  beats: { tMs: number; label: string }[];
};

async function prepareContext(browser: Browser, scene: Scene): Promise<{ ctx: Awaited<ReturnType<Browser['newContext']>>; page: Page }> {
  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    recordVideo: { dir: RAW, size: VIEWPORT },
    storageState: scene.anonymous ? undefined : AUTH_PATH,
    acceptDownloads: true,
    locale: 'en-US',
    colorScheme: 'light',
  });
  await ctx.addInitScript({ content: SHIM });
  await ctx.addInitScript(initEffects, { headerPx: 64 });
  const page = await ctx.newPage();
  return { ctx, page };
}

async function runScene(browser: Browser, scene: Scene): Promise<SceneResult> {
  console.log(`\n=== ${scene.id} ${scene.title} ===`);
  const { ctx, page } = await prepareContext(browser, scene);
  const consoleErrors: string[] = [];
  page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(`console: ${m.text().slice(0, 300)}`);
  });

  const t0 = Date.now();
  const beats: { tMs: number; label: string }[] = [];
  let ok = true;
  let error: string | undefined;

  for (const step of scene.steps) {
    const label = labelOf(step);
    beats.push({ tMs: Date.now() - t0, label });
    const secs = String(Math.round((Date.now() - t0) / 1000)).padStart(3);
    try {
      await exec(step, page);
      console.log(`  [${scene.id} ${secs}s] ${label}`);
    } catch (e) {
      ok = false;
      error = `${label}: ${(e as Error).message.split('\n')[0].slice(0, 300)}`;
      console.error(`  [${scene.id} ${secs}s] FAIL ${error}`);
      break;
    }
  }

  const durationMs = Date.now() - t0;
  const video = page.video();
  await ctx.close();
  let file: string | null = null;
  if (video) {
    file = join(RAW, `${scene.slug}.webm`);
    await video.saveAs(file);
  }
  if (consoleErrors.length) console.log(`  [${scene.id}] ${consoleErrors.length} console error(s): ${consoleErrors[0]}`);
  console.log(`  → ${file ?? '(no video)'} (${(durationMs / 1000).toFixed(1)}s, ${ok ? 'OK' : 'FAILED'})`);
  return { id: scene.id, title: scene.title, file, durationMs, ok, error, consoleErrors, beats };
}

/* --------------------------------- auth ---------------------------------- */

async function authenticate(browser: Browser): Promise<void> {
  console.log(`Authenticating ${EMAIL} against ${BASE} …`);
  const ctx = await browser.newContext({ viewport: VIEWPORT });
  await ctx.addInitScript({ content: SHIM });
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForSelector('#email-address', { timeout: 30000 });
  // wait for React hydration: filling pre-hydration gets clobbered by the
  // controlled re-render and the submit then just reloads /
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(900);
  let landed = false;
  for (let attempt = 1; attempt <= 3 && !landed; attempt++) {
    await page.fill('#email-address', EMAIL);
    await page.fill('#password', PASSWORD);
    if ((await page.inputValue('#email-address').catch(() => '')) !== EMAIL) {
      console.log(`  attempt ${attempt}: form not hydrated yet, retrying…`);
      await page.waitForTimeout(1200);
      continue;
    }
    await page.click('button[type=submit]');
    try {
      await page.waitForURL(/dashboard/, { timeout: 15000 });
      landed = true;
    } catch {
      console.log(`  attempt ${attempt}: no navigation after submit, retrying…`);
    }
  }
  if (!landed) throw new Error('login failed after 3 attempts — check credentials / Supabase');
  await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
  await ctx.storageState({ path: AUTH_PATH });
  await ctx.close();
  console.log(`  session saved → ${AUTH_PATH}`);
}

async function warmRoutes(browser: Browser, scenes: Scene[]): Promise<void> {
  const paths = [...new Set(scenes.flatMap((s) => s.steps.filter((st): st is Extract<Step, { type: 'goto' }> => st.type === 'goto').map((st) => st.path)))];
  console.log(`Warming ${paths.length} route(s): ${paths.join(', ')}`);
  const ctx = await browser.newContext({ viewport: VIEWPORT, storageState: AUTH_PATH });
  await ctx.addInitScript({ content: SHIM });
  const page = await ctx.newPage();
  for (const p of paths) {
    await page.goto(BASE + p, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
    await page.waitForTimeout(400);
  }
  await ctx.close();
  console.log('  routes warm.');
}

/* --------------------------------- main ---------------------------------- */

async function main() {
  const scenes = findScenes(onlyIds);
  // fresh video dir per run — Playwright can leave hash-named temp copies that
  // would otherwise be picked up by the stitcher
  rmSync(RAW, { recursive: true, force: true });
  mkdirSync(RAW, { recursive: true });

  const browser = await launch();
  try {
    if (!sceneArg || !existsSync(AUTH_PATH)) await authenticate(browser);
    await warmRoutes(browser, scenes);

    const results: SceneResult[] = [];
    for (const scene of scenes) results.push(await runScene(browser, scene));

    // merge manifest (subset runs keep other scenes' entries)
    // tidy up: Playwright leaves hash-named temp copies next to our saveAs output
    for (const f of readdirSync(RAW)) {
      if (f.endsWith('.webm') && !f.startsWith('scene-')) rmSync(join(RAW, f), { force: true });
    }
    type Manifest = { generatedAt: string; scenes: Record<string, unknown> };
    const manifest: Manifest = existsSync(MANIFEST)
      ? (JSON.parse(readFileSync(MANIFEST, 'utf8')) as Manifest)
      : { generatedAt: '', scenes: {} };
    for (const r of results) {
      manifest.scenes[r.id] = {
        slug: r.id.toLowerCase(),
        title: r.title,
        file: r.file ? r.file.replace(/\\/g, '/') : null,
        durationMs: r.durationMs,
        ok: r.ok,
        error: r.error,
        consoleErrors: r.consoleErrors.slice(0, 10),
        beats: r.beats,
      };
    }
    manifest.generatedAt = new Date().toISOString();
    writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));

    console.log('\n--- summary ---');
    let failed = 0;
    for (const r of results) {
      const flag = r.ok ? 'OK   ' : 'FAIL ';
      if (!r.ok) failed++;
      console.log(`${flag} ${r.id.padEnd(4)} ${(r.durationMs / 1000).toFixed(1).padStart(6)}s  ${r.title}${r.error ? `  ← ${r.error}` : ''}`);
    }
    console.log(`manifest → ${MANIFEST}`);
    if (failed) {
      console.error(`\n${failed} scene(s) failed.`);
      process.exitCode = 1;
    } else {
      console.log(`\nAll ${results.length} scene(s) recorded. Next: node scripts/stitch-video.mjs`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
