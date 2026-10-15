# GalloTrack Video Presentation — Recording Plan

**Status:** PLAN ONLY — approved for implementation after clarification round (see §1).
**Source script:** *GALLOTRACK GAMEFOWL MANAGEMENT SYSTEM — Video Presentation Script* (13 scenes, narration by Lorraine).
**Audio:** Recorded **live in CapCut later** — this plan produces silent video clips only.
**Date:** 2026-10-14

---

## 1. Confirmed decisions (clarification round)

| # | Decision | Choice |
|---|----------|--------|
| 1 | Output structure | **Per-scene clips + one stitched full video** |
| 2 | Pacing | **Natural speed with 3–4 s holds after each action** (room to talk over) |
| 3 | Environment | **Localhost dev server** (`npm run dev`) with demo account `client@gmail.com` |
| 4 | Video spec | **1920×1080 @ 30 fps** — *as-built: Playwright 1.55 has no `recordVideo.fps` option; capture is 1920×1080@25fps VP8 (its fixed rate). Deliverables are H.264 MP4 @25fps — natively smooth. If 30fps is required, add `-vf fps=30` to the stitch conversion (duplicates ~20% of frames; not recommended).* |
| 5 | Effects | **All four:** zoom & pan, custom cursor + click ripple, target highlight pulse, scroll animations |
| 6 | Scene 4 form | **Type only, never submit** — farm data stays clean |
| 7 | Format | **Install ffmpeg (winget), convert .webm → .mp4, stitch** — most CapCut-friendly |

---

## 2. Tools, skills & extensions needed

### 2.1 Tools (already in the project unless noted)

| Tool | Version / status | Purpose |
|------|------------------|---------|
| **Playwright** | `^1.55.0` — already a devDependency ✔ | Headed Chromium + `recordVideo` (context option), `page.mouse`, `page.clock`, `storageState` |
| **tsx** | already a devDependency ✔ | Runs the TypeScript recording driver, same as existing `scripts/*.ts` |
| **Node / npm** | installed ✔ | Runtime |
| **ffmpeg** | ❌ **not installed — to be installed via `winget install Gyan.FFmpeg`** | `.webm → .mp4` (H.264/yuv420p) conversion + scene concatenation |
| **Existing scripts reused** | `scripts/smoke-record-pages.ts`, `scripts/debug-pages.ts` ✔ | Pre-flight render check of all 13 scene pages; selector/needle discovery |
| **Dev server** | `npm run dev` (Next 16, port 3000) | Recording target |

**Playwright constraints that shape this plan:**

- `recordVideo` only supports **fps 25 or 30** → our 1080p@30 choice is a native option; 60 fps would require synthetic frame-doubling, so it was rejected.
- Playwright video contains **no mouse cursor** — the OS cursor is never captured. A cursor is therefore an *in-page overlay* (§4.2), not a browser setting.
- Video container is **`.webm` (VP8/VP9) only** → ffmpeg needed for MP4 (decision #7).
- One video file per browser **context** → we create one context per scene (13 files), sharing a saved `storageState` from a single login.

### 2.2 Skills

- No skills are pre-loaded in this session and **none are required** — the harness is ~200 lines of standard Playwright.
- If desired, community skills can be searched with `npx skills find playwright video recording`, but **nothing will be installed without explicit confirmation** (community skills are not vetted).

### 2.3 In-page "extensions" we author (part of the harness)

1. **Camera / zoom-pan engine** — eased `transform: scale() + translate()` on the document root, framed on a target element's bounding box; returns to `1.0` between beats. No native Playwright zoom exists and ffmpeg `zoompan` would be detached from the interactive steps, so zoom is done *in-page, in real time*.
2. **Virtual cursor + click ripple** — an overlay arrow that follows `page.mouse`, with an expanding ripple on every click (the only way to get cursor/click animation, per §2.1).
3. **Target highlight pulse** — a soft glow ring around the element about to be clicked, ~400 ms before the click.
4. **Scene-step runner** — interprets the declarative scene manifest (§5), emits beat timestamps into `manifest.json`.

No third-party services, APIs, or external dependencies are involved (nothing to integrate via Gravity Index).

---

## 3. Environment & prerequisites

1. `gallotrack-next/.env.local` present (Supabase creds) — dev server can start.
2. Start dev server in background: `npm run dev` → wait for `http://localhost:3000`.
3. **Warm-up:** load every scene route once before recording (first Next compile per route takes seconds; must not happen mid-take).
4. Demo account: `SMOKE_EMAIL` / `SMOKE_PASSWORD` (defaults `client@gmail.com` / `password123`) — **not committed**; set via env if different.
5. ffmpeg on `PATH` after `winget install Gyan.FFmpeg` (verify with `ffmpeg -version`; may need a new shell for PATH).
6. Chromium build cached (`npx playwright install chromium` if missing) — driver reuses the repo's `findCachedChromium()` fallback.

---

## 4. Visual effects specification

### 4.1 Camera (zoom & pan) — **v2 rule: crops are action-scoped only**

> **Client feedback (2nd round): decorative zooms are distracting. The camera never moves to “highlight” something.**

- **Crop opens only when an action needs it**: typing into the login/form/search fields, the open export menu. The view crops to that area, the action plays out inside it, and the moment the action group ends the camera **snaps back to full view** (`reset`).
- **Everything else plays at full view**: tabs, cards, sidebar nav, tables — the virtual cursor travels to the target and the green pulse ring marks each click.
- Crop levels: **1.3× forms**, **1.35× search inputs / export menu**.
- Easing: `cubic-bezier(0.22, 1, 0.36, 1)`, duration **700–900 ms** in, **500 ms** back to 1.0×.
- Exactly **6 crops** exist in the shot list: S1 login form, S3 search, S4 identity section, S4 strain+gender, S5 search, S11 export menu.

### 4.2 Cursor & clicks

- Custom cursor: 20–24 px arrow, high-contrast drop shadow, follows `page.mouse` with ~60 ms lerp so motion looks human.
- Click ripple: 24 → 64 px ring, 450 ms fade, spawned on every click.
- Hover feedback: cursor scales to 1.1× over interactive elements (buttons/tabs).
- Pre-click highlight: pulse ring around the click target (2 pulses, ~400 ms) before acting.

### 4.3 Scroll animations

- Smooth programmatic scrolling (`easeInOut`, ~600–900 ms) through Inventory cards and Lineage trees; camera rides the scroll (zoom held while panning down).

### 4.4 Typing

- Human-like typing speed: **55–90 ms/char with ±25 ms jitter** (Scene 1 login, Scene 3 search, Scene 4 form).

---

## 5. Architecture — files to create

All under `gallotrack-next/` (mirrors existing script conventions):

```
scripts/
├── record-video.ts          # Driver: launch, login once, per-scene context + recordVideo, write manifest
├── video/
│   ├── scenes.ts            # Declarative scene manifest (13 scenes: route, steps, zoom targets, holds)
│   └── effects.ts           # In-page runtime injected via addInitScript (cursor, ripple, zoom, pulse)
├── stitch-video.mjs         # ffmpeg: per-scene .webm → .mp4 + concat → gallotrack-full.mp4
├── smoke-record-pages.ts    # (existing) pre-flight render check
└── debug-pages.ts           # (existing) selector/needle discovery
recordings/                  # OUTPUT — added to .gitignore
├── scene-01-intro.mp4 ... scene-13-conclusion.mp4
├── gallotrack-full.mp4      # stitched
├── raw/                     # original .webm kept until mp4 verified
└── manifest.json            # scene ids, files, start/end ms, per-beat timestamps
```

**Manifest** (drives CapCut narration alignment):

```json
{ "scenes": [{ "id": "S2-dashboard", "file": "scene-02-dashboard.mp4",
    "startMs": 0, "endMs": 41200,
    "beats": [ { "tMs": 3100, "label": "zoom Active Chicken Registry card" }, ... ] }] }
```

**Driver flow:**

1. Context A → login → `storageState.save('recordings/.auth.json')` (gitignored).
2. For each scene: fresh context (viewport `1920×1080`, `recordVideo: { dir, size: 1920×1080, fps: 30 }`) + `storageState` → `addInitScript(effects)` → run scene steps → `context.close()` (finalizes the video file).
3. Write `manifest.json`; print a per-scene table.

---

## 6. Scene-by-scene shot list

> **Selector notes:** sidebar nav links come from `lib/nav-manifest.ts` (`role=link` + accessible name). Tab deep-links use the URL tab contracts (`REGISTRY_TABS`, `LINEAGE_TABS`, `BREEDING_TABS`, `INVENTORY_STATUS_TABS`) so navigation is deterministic. Estimated durations are video-only, before live narration.

### Scene 1 — Introduction (~35 s)
- **Route:** `/` → sign in → `/dashboard`
- **Beats:** ① hold on login page (1.15× zoom on the login card) ② cursor to `#email-address`, highlight-pulse, click-ripple, type email ③ tab → `#password`, type ④ pulse + click `button[type=submit]` ⑤ wait `waitForURL(/dashboard/)`, `networkidle` ⑥ settle 1.0× on dashboard, hold **4 s**
- **Zoom:** login card 1.15× → full dashboard 1.0×

### Scene 2 — Dashboard (~45 s)
- **Route:** `/dashboard`
- **Beats:** pan-and-zoom tour, each target **1.35× / hold 3.5 s**, reset 1.0× between:
  ① **Active Chicken Registry** card (title + role breakdown) ② **Total Matches Logged** ③ **Overall Win Rate** card (aria-label contains `Overall win rate`) ④ breeding males / females / non-breeding summary ⑤ **Quick Actions** card — hover (no click) over `+ Register New Chicken` and `+ Log Match Result`
- **Hold:** 4 s final wide shot

### Scene 3 — Chicken Registry (~50 s)
- **Route:** sidebar click **Chicken Registry** → `/profiling`
- **Beats:** click through tabs in script order (pulse → ripple → click → 3.5 s hold each):
  ① **Breeding Male** ② **Breeding Female**  ③ **Fight Prospects** *(narration says "Fight Prospects" — team is re-recording this line, §9.1)* ④ **Match Logs** ⑤ **Sire Material**
  ⑥ Search demo: click search box, type a wing-band/name fragment (human typing), hold 3 s, clear
- **Zoom:** 1.35× on the tab strip during the sequence; 1.5× on the search box

### Scene 4 — Registering a Chicken (~45 s)
- **Route:** click **`+ Register Chicken`** (ProfilingPage) → `/profiling?tab=form`
- **Beats:** ① zoom to form header ② **Name** field: highlight, type a demo name ③ **Unique Chicken Identifier** (`#chicken-code`): show the *auto-assigned* code — click **"Edit identifier manually"**, type, then revert to **"Use Auto-Generated Code"** (shows the coding system in action) ④ `#wing-band-id`: type e.g. `W-001` ⑤ `#genetic-strain`: type + pick from dropdown ⑥ gender classification select ⑦ parents (sire/dam) fields if visible — scroll-shot ⑧ **STOP — never submit** (decision #6); hold 3 s, then navigate away
- **Zoom:** 1.4× per field, 1.0× between fields
- *Exact field order/labels to be confirmed with `debug-pages.ts` during implementation.*

### Scene 5 — Chicken Inventory (~55 s)
- **Route:** sidebar click **Chicken Inventory** → `/catalog`
- **Beats:** ① 1.15× wide shot of the card grid ② search bar: type + hold + clear ③ click status filters in script order with 3 s holds: **All Chickens → Breeders Stock → Ready to Breed → Archived → Deceased** ④ role/sex filter + sort control (labels confirmed at implementation) ⑤ **scroll animation** down through the chicken cards, camera at 1.25× ⑥ zoom on one card's key details (status/age/weight/lineage)

### Scene 6 — Lineage Directory (~60 s)
- **Route:** sidebar click **Lineage Directory** → `/lineage`
- **Beats:** click the 5 tabs in script order (3.5 s hold each): ① **Family Tree** — zoom 1.4× on one family node/edge ② **Full Siblings & Families** ③ **Sire Offspring Tree** ④ **Dam Offspring Tree** ⑤ **Pedigree / Ancestors** — scroll animation through ancestors, then 1.0× reset

### Scene 7 — Breeding & Lineage Hub (~45 s)
- **Route:** sidebar click **Breeding Hub** → `/breeding`
- **Beats:** ① zoom across summary cards: **Breeding Males** ("Coded: 1, 2, 3…") → **Breeding Females** ("Coded: A, B, C…") → **Active Pairs** ② click **Coding System** tab ③ **1.5× long hold (4 s)** on the code examples (`1A₁ · Sire 1 × Dam A · 1st`, `2B₂`) while the narration explains codes

### Scene 8 — Breeding Pairs & Chicken Identity (~35 s)
- **Route:** `/breeding?tab=pairs` → `/breeding?tab=identity`
- **Beats:** ① click **Breeding Pairs** tab, hover one pair card (1.35×, 3.5 s) ② click **Chicken Identity** tab, hold 3.5 s ③ reset to 1.0×

### Scene 9 — Safety Incidents (~25 s)
- **Route:** `/breeding?tab=safety`
- **Beats:** click **Safety Incidents** tab, 1.3× pan over the incident area/list, 3.5 s hold. *If the demo farm has no incidents, the empty state is shown deliberately (§9.3).*

### Scene 10 — Match Records & Performance (~40 s)
- **Route:** sidebar → `/dashboard`, then sidebar → `/profiling?tab=matchForm`
- **Beats:** ① **1.5× hold on Total Matches Logged + Overall Win Rate** (the script's key statistics moment) ② optional hover on "Breakdown by chicken" button (no click) ③ navigate to **Chicken Registry → Match Logs** ④ zoom on the match table (record/outcome columns), 3.5 s hold, reset

### Scene 11 — Reports & Data Export (~35 s)
- **Route:** `/dashboard`
- **Beats:** ① cursor to **Export & Reports** button (`aria-label="Export reports and data"`), highlight-pulse, click-ripple ② dropdown opens: **Data Exports → "Export matches (CSV)" / "Export registry (CSV)" → print performance report** ③ 1.4× zoom down the menu, **hover each item for ~2 s but do not trigger any download** ④ close menu (Escape / click-away), reset 1.0×, hold 3 s
- **Note:** context is created with `acceptDownloads: true` as a safety net so an accidental click can't stall the run.

### Scene 12 — Database Connection & Integration (~30 s)
- **Route:** rapid tour — `/dashboard` → `/profiling` → `/catalog` → `/lineage` → `/breeding`
- **Beats:** sidebar navigation only, **no zoom** (deliberate wide shots), ~2.5 s per module, one 1.0× resting shot per page; this scene shows *flow*, so pacing is slightly quicker

### Scene 13 — Conclusion (~25 s)
- **Route:** sidebar → `/dashboard`
- **Beats:** ① 1.35× on the GalloTrack name/logo in the header ② **slow zoom-out** to the full dashboard over ~2 s ③ final **5 s hold** at 1.0× (tail room for "Thank you for watching!")

**Estimated total: ~8–9 minutes of raw footage.**

---

## 7. Output artifacts & CapCut workflow

1. **Pre-flight:** `npx tsx scripts/smoke-record-pages.ts` → all 13 scene rows must `PASS` (proves pages render while authenticated; catches bounced-to-login and error overlays before wasting a take).
2. **Dry run:** record Scene 2 + Scene 6 only → review clip for cursor, ripple, zoom smoothness, timing → adjust beats → full run.
3. **Full run:** `npx tsx scripts/record-video.ts` → 13 `.webm` files + `manifest.json`.
4. **Convert & stitch:** `node scripts/stitch-video.mjs`
   - `ffmpeg -i scene-NN-x.webm -c:v libx264 -crf 18 -pix_fmt yuv420p -movflags +faststart scene-NN-x.mp4`
   - concat demuxer over the ordered list → `gallotrack-full.mp4`
5. **CapCut:** import the 13 MP4s in order; use `manifest.json` beat timestamps to align the live narration; delete `raw/*.webm` after verification.

---

## 8. Verification checklist (before calling the recording done)

- [ ] `npm run typecheck` and `npm run lint` pass on the new scripts
- [ ] 13 MP4 files exist + `gallotrack-full.mp4`; `ffprobe` reports `1920×1080, 30 fps, h264`
- [ ] Every scene's duration ≥ its estimated minimum (catches a hung/short take)
- [ ] `manifest.json` timestamps match the files they describe
- [ ] Spot-watch each clip: cursor visible, ripples fire, zoom is smooth, no `bouncedToLogin`, no red error overlay, no console-error banners
- [ ] No accidental form submit (Scene 4), no file downloads (Scene 11), no data mutated anywhere
- [ ] Final stitched file plays start-to-end in CapCut/VLC without seeking artifacts

---

## 9. Risks & known issues

1. **Script/UI label mismatch (Scene 3) — RESOLVED:** the UI tab renders **"Fight Prospects"** (`ROLE_LABEL['Non-Breeding']` in `lib/registry-roles.ts`). The team will **re-record the narration to say "Fight Prospects"** instead of "non-breeding chickens". Video shows the UI as-is.
2. **Credentials:** demo account `client@gmail.com` / `password123` (the `SMOKE_EMAIL`/`SMOKE_PASSWORD` defaults) — supplied by the user for recording; never committed to the repo.
2. **No real cursor in Playwright video** — fully mitigated by the overlay (§4.2), but the overlay must be injected *before* first paint to avoid a cursor "popping in".
3. **fps limit 25/30** — 60 fps is not natively possible; 30 fps confirmed (decision #4).
4. **Empty demo data** (Safety Incidents, Archived/Deceased tabs, lineage trees) — pre-flight must confirm content; empty states are shown intentionally rather than faked.
5. **First-compile latency** — routes warmed before recording; every scene waits `networkidle` + an explicit content needle before its first beat.
6. **Transform-zoom side effects** — zooming the document root moves fixed elements with the "camera" (intended), but modals/portals (e.g., the strain dropdown) must be tested under zoom; fallback is a reduced zoom level for that beat.
7. **Credentials** — demo creds stay in env vars, never in the manifest, repo, or on screen (the login email is typed visibly — confirm whether masking it in CapCut is acceptable, or blur the field in post).

---

## 10. Out of scope

- Audio/narration recording (live, in CapCut)
- Titles, thumbnails, intro/outro cards, transitions between clips
- Any production/staging recording, or any write operation against real farm data
- Publishing/uploading anywhere

---

## 11. Implementation checklist

> **STATUS: COMPLETE — all 13 scenes recorded and verified (see §12).**

- [ ] Install ffmpeg via winget; verify `ffmpeg -version`
- [ ] Create `scripts/video/effects.ts` (cursor, ripple, highlight, zoom camera, smooth scroll)
- [ ] Create `scripts/video/scenes.ts` (13-scene manifest with beats per §6)
- [ ] Create `scripts/record-video.ts` (auth once → storageState → per-scene contexts → manifest)
- [ ] Create `scripts/stitch-video.mjs` (webm→mp4 + concat)
- [ ] Add `recordings/` to `.gitignore`
- [ ] Pre-flight: warm routes + `smoke-record-pages.ts` all PASS
- [ ] Dry run (S2, S6) → review → tune beats
- [ ] Full run → convert → verify (§8) → hand off to CapCut with `manifest.json`

---

## 12. Implementation log (as-built)

**Deliverables** (all under `gallotrack-next/`):

| File | Purpose |
|------|---------|
| `scripts/video/effects.ts` | In-page runtime injected via `addInitScript`: CSS-`zoom` camera (eased, anchored on target boxes), counter-zoomed overlay with virtual cursor + click ripple + target pulse, smooth scroll |
| `scripts/video/scenes.ts` | Declarative 13-scene shot list (`Step` union: goto/nav/click/tab/htab/type/key/clickAt/hover/zoom/reset/scroll/hold/waitUrl/select) + `findScenes()` |
| `scripts/record-video.ts` | Driver: hydration-aware auth → `storageState` → route warm-up → one recorded context per scene → beat-stamped `recordings/manifest.json`. Flags: `--scene=S2,S6`, `--fast` |
| `scripts/stitch-video.mjs` | ffmpeg: `recordings/raw/scene-*.webm` → H.264 MP4 (CRF 18, yuv420p) → `recordings/gallotrack-full.mp4` (concat, duration-verified) |
| `recordings/` (gitignored) | `raw/*.webm`, `scene-NN-*.mp4`, `gallotrack-full.mp4`, `manifest.json`, `.auth.json` |

**Commands:**
```bash
npm run dev                                  # server must be up on :3000
npx tsx scripts/smoke-record-pages.ts        # pre-flight (all scene pages render)
npx tsx scripts/record-video.ts --fast       # dress rehearsal (selectors, ~3 min)
npx tsx scripts/record-video.ts              # real-time full run (~8 min)
node scripts/stitch-video.mjs                # MP4 conversion + stitch
```

**App bugs found & fixed while preparing the recording** (both crashed the page for real users):

1. **URL↔state tab sync infinite loop** (`components/ProfilingPage.tsx`, `components/MarketplacePage.tsx`): the apply-URL effect ran whenever `paramPresent` was true — including after *user-driven* changes (`change === 'user'`) written by the write-back effect. Opening any `?tab=`/`?status=` link and then clicking a different tab ping-ponged the two setters until React threw `Maximum update depth exceeded` and the ErrorBoundary unmounted the whole page. Fix: apply URL → state only on `'popstate'` or `('mount' && paramPresent)`. (Breeding Hub and Lineage Directory were not affected.)
2. **Missing DB column**: `match_videos.poster_url` doesn't exist in this Supabase project (400/`42703`); `media-service.ts` already falls back, so this is noisy but non-fatal — *a real migration may still be needed for the poster-frames feature.*

**Other as-built notes:**
- **Camera v2 (client feedback):** all decorative zooms removed; crops are action-scoped only (6 total, listed in §4.1), all other beats point with the cursor at full view.
- Registry sub-tab defaults to the **form**; Scene 3 deep-links `?tab=males`, Scene 4 shows View Registry → + Register Chicken.
- Registry's third tab renders as **"Fight Prospects"** (per `ROLE_LABEL['Non-Breeding']`) — narration must say "Fight Prospects" (team re-recording).
- Breeding Hub tabs are plain buttons (no `role="tab"`) → driver has a dedicated `htab` step.
- `page.click` actionability times out against the Export menu backdrop (`fixed inset-0 z-40`) → Scene 11 closes it with a raw-coordinate `clickAt` on the backdrop.
- Pre-existing, unrelated test failures on `main`: `FowlLists.test.tsx` (8) and `MobileNav.test.tsx` (2) — verified failing without these changes.
