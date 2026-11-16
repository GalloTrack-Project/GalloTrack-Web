import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

const outDir = join(process.cwd(), 'docs', 'screenshots');
mkdirSync(outDir, { recursive: true });

type State = 'new' | 'offspring-empty' | 'offspring-ready';

const pageShell = (title: string, body: string) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<style>
  :root { --bg:#f8fafc; --card:#fff; --border:#e2e8f0; --muted:#64748b; --text:#0f172a; --green:#047857; --green-soft:#ecfdf5; --green-border:#a7f3d0; --dash:#cbd5e1; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--text); font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif; }
  .page { max-width:960px; margin:0 auto; padding:24px 16px 40px; }
  .card { background:var(--card); border:1px solid var(--border); border-radius:14px; padding:22px; box-shadow:0 1px 3px rgba(15,23,42,.06); }
  h1 { font-size:16px; margin:0; letter-spacing:.01em; }
  .eyebrow { color:var(--green); font-size:11px; font-weight:800; letter-spacing:.16em; text-transform:uppercase; }
  .step-head { display:flex; align-items:center; justify-content:space-between; gap:12px; border-bottom:1px solid var(--border); padding-bottom:12px; margin-bottom:16px; }
  .step-title { display:flex; align-items:center; gap:10px; }
  .step-num { width:28px; height:28px; border-radius:50%; display:grid; place-items:center; color:#fff; background:var(--green); font-size:12px; font-weight:900; }
  .id-chip { border:1px solid var(--green-border); background:var(--green-soft); color:var(--green); border-radius:999px; padding:5px 10px; font:700 11px ui-monospace,monospace; }
  .field-label { display:block; color:var(--muted); font-size:11px; font-weight:800; letter-spacing:.12em; text-transform:uppercase; margin-bottom:6px; }
  .field, .select, .disabled { width:100%; min-height:44px; border:1px solid var(--border); background:#fff; border-radius:8px; padding:11px 12px; font-size:14px; font-weight:600; color:var(--text); }
  .select { appearance:none; background-image:linear-gradient(45deg,transparent 50%,#64748b 50%),linear-gradient(135deg,#64748b 50%,transparent 50%); background-position:calc(100% - 18px) 50%,calc(100% - 13px) 50%; background-size:5px 5px,5px 5px; background-repeat:no-repeat; }
  .type-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:16px; }
  .type-card { border:1px solid var(--border); border-radius:10px; padding:12px; display:flex; gap:10px; align-items:flex-start; background:#fff; }
  .type-card.active { border-color:#10b981; background:var(--green-soft); }
  .radio { width:16px; height:16px; border:2px solid #94a3b8; border-radius:50%; margin-top:2px; flex:none; }
  .type-card.active .radio { border-color:var(--green); background:radial-gradient(circle at center,var(--green) 0 4px,transparent 5px); }
  .type-title { display:block; font-size:13px; font-weight:900; }
  .type-help { display:block; color:var(--muted); font-size:11px; line-height:1.45; margin-top:2px; }
  .parentage { border:1px solid var(--border); background:#f8fafc; border-radius:10px; padding:12px; margin-bottom:16px; }
  .parentage h2 { font-size:13px; margin:0; }
  .parentage p { color:var(--muted); font-size:11px; font-weight:600; margin:4px 0 10px; }
  .parent-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .pair-summary { color:var(--muted); font-size:11px; font-weight:800; margin:8px 0 0; }
  .external { border:1px dashed var(--dash); border-radius:8px; padding:12px; font-size:12px; font-weight:800; color:var(--muted); margin-bottom:16px; }
  .identity { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px; }
  .identifier { border-radius:10px; padding:12px; display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:14px; }
  .identifier.ready { border:1px solid var(--green-border); background:var(--green-soft); }
  .identifier.waiting { border:1px dashed var(--dash); background:#f8fafc; color:var(--muted); }
  .identifier-line { display:flex; align-items:center; gap:8px; min-width:0; }
  .identifier-label { color:var(--muted); font-size:10px; font-weight:900; letter-spacing:.14em; text-transform:uppercase; }
  .code { font:800 17px ui-monospace,monospace; }
  .badge { border:1px solid var(--green-border); background:#d1fae5; color:var(--green); border-radius:999px; padding:3px 8px; font-size:10px; font-weight:900; white-space:nowrap; }
  .wait-msg { font-size:11px; font-weight:700; text-align:right; }
  .wing-note { color:var(--muted); font-size:11px; font-weight:600; margin-top:5px; }
  .lock { width:15px; height:15px; border:2px solid currentColor; border-radius:3px; position:relative; opacity:.75; }
  .lock:before { content:""; position:absolute; width:7px; height:7px; border:2px solid currentColor; border-bottom:0; border-radius:6px 6px 0 0; left:2px; top:-8px; }
  @media (max-width:640px) {
    .page { padding:16px 10px 32px; }
    .card { padding:16px; border-radius:12px; }
    .type-grid, .identity, .parent-grid { grid-template-columns:1fr; }
    .identifier { align-items:flex-start; flex-direction:column; }
    .wait-msg { text-align:left; }
  }
</style>
</head>
<body><div class="page"><div class="card">${body}</div></div></body>
</html>`;

function stepMarkup(state: State): string {
  const isOffspring = state !== 'new';
  const ready = state === 'offspring-ready';
  return `
  <div class="step-head">
    <div class="step-title"><span class="step-num">1</span><div><div class="eyebrow">Registration</div><h1>Step 1: Core Identifiers</h1></div></div>
    <span class="id-chip">ID: GT-0092</span>
  </div>
  <div class="type-grid">
    <div class="type-card ${isOffspring ? '' : 'active'}"><span class="radio"></span><span><span class="type-title">New bird</span><span class="type-help">Bought, gifted, or parents not in your registry</span></span></div>
    <div class="type-card ${isOffspring ? 'active' : ''}"><span class="radio"></span><span><span class="type-title">Offspring</span><span class="type-help">Born from your registered Sire and Dam</span></span></div>
  </div>
  ${isOffspring ? `
  <div class="parentage">
    <h2>Parentage</h2>
    <p>Choose registered parents. The offspring identifier and lineage come from this pair.</p>
    <div class="parent-grid">
      <div><span class="field-label">Sire</span><div class="field">${ready ? 'SI · Sire 1' : 'Search registered sires...'}</div></div>
      <div><span class="field-label">Dam</span><div class="field">${ready ? 'DA · Dam A' : 'Search registered dams...'}</div></div>
    </div>
    ${ready ? '<p class="pair-summary">Sire 1 × Dam A · 4 offspring so far</p>' : ''}
  </div>` : `
  <div class="external">+ Add parents (optional)</div>`}
  <div class="identity">
    <div><span class="field-label">Identifier Name</span><div class="field">${isOffspring ? 'Thunder Chick' : 'Thunder Hatch'}</div></div>
    <div><span class="field-label">Gender Class</span><div class="select">${isOffspring ? 'Cock' : 'Cock'}</div></div>
  </div>
  ${ready ? `
  <div class="identifier ready">
    <div class="identifier-line"><span class="lock"></span><span class="identifier-label">Identifier:</span><span class="code">1A5</span></div>
    <span class="badge">Auto · Offspring</span>
  </div>` : isOffspring ? `
  <div class="identifier waiting">
    <div class="identifier-line"><span class="lock"></span><span class="identifier-label">Identifier:</span><span class="code">—</span></div>
    <span class="wait-msg">Select a Sire and a Dam to generate the identifier.</span>
  </div>` : `
  <div class="identifier ready">
    <div class="identifier-line"><span class="lock"></span><span class="identifier-label">Identifier:</span><span class="code">3</span></div>
    <span class="badge">Auto · Sire</span>
  </div>`}
  <div><span class="field-label">Wing Banding <span style="font-weight:500;text-transform:none;letter-spacing:0">(optional)</span></span><div class="field">${isOffspring ? 'WB-0092' : 'WB-0091'}</div><p class="wing-note">Optional — the number stamped on the physical metal wing band.</p></div>`;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const states: State[] = ['new', 'offspring-empty', 'offspring-ready'];
  for (const state of states) {
    await page.setContent(pageShell(`Step 1 ${state}`, stepMarkup(state)));
    await page.screenshot({ path: join(outDir, `registration-step1-${state}-desktop.png`), fullPage: true });
    await page.setViewportSize({ width: 390, height: 1000 });
    await page.setContent(pageShell(`Step 1 ${state} mobile`, stepMarkup(state)));
    await page.screenshot({ path: join(outDir, `registration-step1-${state}-mobile.png`), fullPage: true });
    await page.setViewportSize({ width: 1280, height: 1000 });
  }
  await browser.close();
  console.log(`Wrote registration Step 1 screenshots to ${outDir}`);
})();
