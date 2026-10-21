# GalloTrack — Evaluator Presentation Guide
**"How our system actually runs, from the dashboard"**
Team GalloTrack · ISUFST

---

## 0. 30-Second Elevator Pitch (say this first, word for word)

> "GalloTrack is a **gamefowl farm management system** — an online digital flock book for serious
> breeders. Instead of keeping chickens in notebooks and Excel, a farm owner registers every bird
> in our **Chicken Registry**, and the system automatically computes **bloodline percentages**,
> **pedigree trees**, **growth milestones**, and **match win rates**.
>
> The heart of it is the **Dashboard**: it's the command center that tells the owner, in one screen,
> *how many birds are active*, *how many fights we've logged*, *our overall win rate*, *which bloodlines
> are winning*, *which sire × dam pairing is producing the best offspring*, and *which birds are about
> to hit a growth milestone*. Every number on that dashboard is traceable to a real record in the
> database — nothing is hardcoded or faked.
>
> Under the hood it's **Next.js 16 + React 19 + TypeScript** on the front, **Supabase (PostgreSQL +
> Auth + Storage)** on the back, deployed on **Vercel**. Row-Level Security means one farm owner can
> *never* see another owner's chickens. And the bloodline math is **deterministic** — no external AI
> API ever touches your farm data."

---

## 1. How the System Runs — The One-Line Mental Model

```
Register birds  →  Log matches  →  Dashboard computes  →  Lineage & Breeding Hub advise  →  Repeat cross / cull cross
```

Everything in GalloTrack hangs off that loop. If an evaluator asks *"so what's the actual system?"*,
answer with this arrow and point at the four dashboard cards that close the loop.

---

## 2. The Demo Script — Click-by-Click

> Tip: log in as the **Farm Owner** account first. The Admin (`/admin/*`) view is a *separate* role;
> showing it last is safer because switching roles mid-demo logs you out.

### STEP 0 — Landing Page (10 seconds)

**What you say:**
> "This is the public landing page. It explains the product and the 4-step workflow:
> register your breeders, track offspring and lineage, record match logs, review performance and insights.
> Everything after login is private to the farm."

**Don't** linger here. Evaluators care about the working system.

---

### STEP 1 — Dashboard: The 3 KPI Cards (this is the money shot, ~60 seconds)

Point at the top row. Say:

> "**First row = the farm at a glance.** Three cards, three questions:
>
> 1. **Active Chicken Registry Card** — *how many birds do I have right now?* Total living active birds,
>    split into males and females, with a sparkline of the last 7 days. This one is **not** affected by
>    the date filter, because a live bird is live today regardless of when you filter by.
>
> 2. **Total Matches Logged** — *how many fights have I recorded?* With a monthly bar chart of fight volume.
>    This one **is** filtered by the date range.
>
> 3. **Overall Win Rate** — *am I actually winning?* Wins ÷ (Wins + Losses). Note: **draws are recorded in
>    the fight log but excluded from the win-rate denominator** — that's a deliberate decision, a draw is
>    not a loss.
>
>    And this card is **clickable** — click it and it opens a per-bird breakdown so the owner can see
>    which specific rooster is carrying the farm and which one is dead weight."

**Defense line if asked "is that hardcoded?"**
> "No. Every card reads from the `fowl` and `match` tables via the Supabase client. Try it — change the
> date range at the top and the match/win-rate numbers move while the active-bird count stays. That's the
> proof that it's live data."

**Action:** Open the **Date Range Picker** (All Time / This Month / Last 90 Days / Year to Date / Custom),
switch to "This Month", show the numbers change, switch back to "All Time".

---

### STEP 2 — Dashboard: Export & Reports (30 seconds)

> "Top-right **Export & Reports** menu. Four actions:
> - **Export matches (CSV)** — the fight history as a spreadsheet.
> - **Export registry (CSV)** — the full flock roster with bird code, name, gender, strain, birthdate,
>   age, status, weight, height, sire, dam, and bloodline percentage.
> - **Print report** — a clean printable/PDF performance summary of the farm.
> - **Sync data** — force-refresh from the database.
>
> This matters for a real farm: the owner's records have to leave the system. That's our data-portability story."

---

### STEP 3 — Dashboard: The Analytics Row (60 seconds — this is the "so what?")

> "Now the part that turns bookkeeping into **decisions**.
>
> - **Population & Performance Trends** — dual-axis 6-month chart. Green filled line = how many birds
>   we have. Blue dashed line = monthly win rate. You can literally see *did the flock get bigger and
>   did it get better*.
>
> - **Bloodline Win Ratios (doughnut)** — which strain is actually producing wins. If 75% of our wins come
>   from Sweater crosses, that tells the owner where to spend the next breeding season.
>
> - **Breeding Pair Performance Matrix** — this is the crown jewel. A Sire × Dam table. For every pairing
>   we've ever made, it shows offspring count, total fights, wins, losses, win rate %, survivability %, and
>   a **verdict**: *Elite — repeat this cross* / *Solid pairing* / *Under-performing — dismantle it* /
>   *Inconclusive — not enough fights yet*.
>
>   Survivability is the other half of the story: we score post-fight condition — Fit = 100, Minor Injury = 70,
>   Critical = 30, Deceased = 0 — so a cross that wins but kills the bird doesn't get crowned Elite.
>
> - **Upcoming Milestones** — auto-computed from birthdate: chick → stag at 6 months, conditioning at
>   8 months, maturity at 12 months. The owner gets a 30-day lookahead so they know who to prepare for the pit.
>
> - **Historical Match Logs table** — the raw recent encounters, drill-down to full media."

**Defense if asked "how do you decide Elite?"**
> "Win rate ≥ 70% **with at least 5 decided fights** → Elite. Between 50–70% → Solid. Below 50% with ≥5
> fights → Under-Performing. Fewer than 5 → Inconclusive, because we don't want to call a cross elite off
> one fight. That's in `lib/win-rate.ts`."

---

### STEP 4 — Chicken Registry `/profiling` (60 seconds)

> "This is the **digital flock book**. Two tabs of interest:
>
> **Register Chicken** is a 3-step form:
> - **Step 1 — Identity**: name, the strain (from *our own* breeds directory, not a hardcoded list),
>   gender, and the **auto-generated bird code**.
> - **Step 2 — Physicals**: birthdate, and the system **auto-computes age and growth stage** —
>   Chick under 3 months, Stag/Pullet under 6, Bull Stag under 12, Cock/Hen at 12+.
>   Weight, height, leg color.
> - **Step 3 — Ancestry**: pick sire and dam, and the system **instantly shows the bloodline split**
>   (50% sire / 50% dam) and the **backcross purity** — F1 50%, F2 75%, F3 87.5%, F4+ 93.75%+.
>   You also see live counts of existing full and half siblings from that same pair.
>
> The **bird code follows real gamefowl breeding convention** — this is the part breeders actually care about:
> sires get plain **numbers** (1, 2, 3), dams get **letters** (A, B, C — skipping X, because X is reserved
> for unknown dams), and **offspring get the composite** (1A1 = sire 1 × dam A, offspring #1).
> The code only generates once **both** parents are picked, and it can be manually overridden with
> pattern validation. There's a DB unique constraint so codes can never collide.
>
> And the **Wing Band ID** is deliberately a *separate namespace* — that's the real metal band stamped on the
> bird's wing. `1A1` as a band never collides with `1A1` as a system code, because they're different things."

**Action:** Open the Register form, type a name, pick gender, and watch the code preview change live.
Then click a parent and watch the bloodline % bar appear. **Don't actually submit** unless you have a
seeded demo farm.

---

### STEP 5 — Chicken Inventory `/catalog` (30 seconds)

> "Registry = *who's in the breeding program right now*. Inventory = *every bird that has ever existed on
> this farm*. Tabs: **All**, **Active Breeders**, **Ready to Breed**, **Archived**, **Deceased**.
>
> - **Ready to Breed** is computed, not manual: alive AND (age ≥ 240 days OR mature growth stage). And when a
>   bird is 1–30 days from that threshold, its card shows an amber **'Ready in N days'** countdown badge.
> - **Archived** = sold / transferred / retired, with a structured reason. **Deceased** = mortality log with
>   documented cause. Both are **restorable** — if you recorded a death by mistake, one click brings the bird
>   back and it reappears on the dashboard immediately."

**Defense:** "Archive is not delete. We keep the family history intact so the pedigree tree never breaks."

---

### STEP 6 — Lineage Directory `/lineage` (45 seconds)

> "Five tabs: **Family Tree**, **Full Siblings & Families**, **Sire Offspring Tree**, **Dam Offspring Tree**, and
> **Pedigree (4-generation ancestors)**.
>
> The pedigree chart gives you Generation 1 parents at 50/50, Generation 2 grandparents at 25% each,
> Generation 3 at 12.5%, Generation 4 at 6.25%.
>
> Now — the **honesty** part, and this is something we're actually proud of. We label every bloodline
> percentage with where it came from:
> - **Declared** — the owner manually entered the composition.
> - **Assumed** — foundation stock with no parents, assumed 100% of its registered strain.
> - **Derived** — computed from the recorded parents.
> - **Adjusted** — the owner overrode the computed value based on what they actually see in the bird.
>
> And we **say it out loud in the UI**: this is a *pedigree expectation and owner observation*, **not DNA
> sequencing**. We can't verify true genetic purity, and we don't pretend to."

**This is a differentiator. Say it proudly.** Most projects overclaim AI purity detection; yours labels the provenance of every number.

---

### STEP 7 — Breeding Hub `/breeding` (45 seconds)

> "The Breeding Hub is where the dashboard's advice turns into action.
> - **Coding system explainer** — the sire/dam/offspring scheme, visually.
> - **Active Breeding Pairs** — every mating pen, with pairing code (`1A`), duration, and a live offspring
>   counter maintained by a database trigger.
> - **New Breeding Pair planner** — pick a sire and dam, and the system **refuses to let you double-book a bird**
>   that's already in another active pen. That's the *Safety Conflict Detection*.
> - **Pair analytics** — the same Elite/Solid/Under-Performing verdicts, plus survivability.
> - **Safety & Hazard Incidents** — log pen aggression, wire injuries, sickness, escapes, with severity and
>   open/resolved status. Real farms lose birds to each other; tracking that is a genuine gap in off-the-shelf
>   software."

---

### STEP 8 — Match Logs + Media + Sharing (45 seconds — the visual crowd-pleaser)

> "Match logging: select the chicken, date, opponent name and breed, arena location, match type
> (derby / hackfight / sparring / championship), event type, derby number, bet type, outcome
> (Win/Loss/Draw), and — critically — **post-fight condition**.
>
> **Media:** drag in a video (MP4/MOV/WebM/MKV, up to 100 MB) and the browser auto-captures the **first frame
> as a poster thumbnail**. Photos up to 10 MB.
>
> **Privacy, and this is the security story:** fight videos and photos go into **private** storage buckets.
> You can't fetch them with a raw URL — the server issues a **1-hour signed URL** only to the logged-in owner.
>
> **Sharing:** hit Share on a fight and you get a link with a 64-character random token. The recipient sees a
> clean view-only fight summary with the video, **without logging in**, and can never see your dashboard or
> your other birds. Hit **Revoke** and the token is deleted — access dies instantly."

---

### STEP 9 — Profile / Settings / Theme (20 seconds)

> "Profile: avatar with zoom-and-crop, farm name, owner name, contact number, password change.
> Settings: units (kg/lbs, cm/in), default fight preferences, and **JSON backup export/restore**.
> Top bar: connection status, **light/dark theme toggle**, and logout."

---

### STEP 10 — Admin Console (only if they ask — 30 seconds)

> "Separate role. The Admin lands on a **System Overview** instead of the farm dashboard: total users,
> active users, registered farms, and an activity trend. Plus **User Registry** (verify / suspend accounts,
> reset passwords, transfer farm data), **System Config**, **Audit Logs** (every admin action is recorded),
> **Flocks**, and **Match History**."

**Say:** "Admins can see accounts and system stats — but **not** another farm's chickens. RLS keeps the
data isolated even from us."

---

## 3. How the System Runs *Technically* (when they ask "how does it actually work?")

```
┌─ Browser ────────────────────────────────────────────────────────────────┐
│ Next.js 16 App Router · React 19 · TypeScript · Tailwind 4 · Chart.js  │
│  Pages: /dashboard /profiling /catalog /lineage /breeding /profile      │
│  Client state: fowl-context · auth-context · ui-context                 │
└───────────────┬──────────────────────────────────────────────────────────┘
                │  Supabase client (anon key — safe to ship)
                │  JWT session in httpOnly cookie
┌───────────────▼──────────────────────────────────────────────────────────┐
│ Supabase                                                               │
│  ├─ Auth      : email/password, OTP, password reset                    │
│  ├─ Postgres  : profiles farms fowl match breeding_pairings             │
│  │              safety_incidents strains leg_colors share_links         │
│  │              fowl_status_history admin_audit_logs                   │
│  │              └─ Row-Level Security: auth.uid() = user_id            │
│  ├─ Storage   : fowl-images (public) · match-videos (private)          │
│  │              match-photos (private) → 1-hour signed URLs            │
│  └─ Realtime  : live data push                                         │
└─────────────────────────────────────────────────────────────────────────┘
                │
┌───────────────▼──────────────────────────────────────────────────────────┐
│ Next.js Route Handlers  /api/fowl /api/match /api/match/media           │
│  /api/admin/* /api/share/[token] /api/user/settings                     │
│  Server-only: SUPABASE_SERVICE_ROLE_KEY — never reaches the browser    │
└─────────────────────────────────────────────────────────────────────────┘
```

**Three things to say out loud:**

1. **"The logic is ours, not a black box."** Bloodline %, win rate, verdicts, survivability, pedigree
   charts — all deterministic math in `lib/bloodline-composition.ts`, `lib/win-rate.ts`, `lib/lineage.ts`,
   `lib/family-tree.ts`. **No third-party AI API ever receives your farm data.** No OpenAI, no Gemini,
   no external vision model. The document in `docs/FARM_OWNER_SYSTEM_GUIDE.md` states this explicitly.

2. **"Isolation is enforced by the database, not the UI."** Even if someone bypassed the frontend,
   RLS policies `USING (auth.uid() = user_id)` block cross-farm reads and writes.

3. **"Quality gates are automated."** `npm run gate` runs 6 ratcheted UI-standard scans + `tsc --noEmit`
   (typecheck) + ESLint (with `jsx-a11y`) + Vitest (including `vitest-axe` accessibility tests).
   There's also `npm run check:secrets` to scan the repo for leaked keys, `npm run verify:schema` to
   enforce the DB column allowlist contract, and `npm run audit:mobile` for mobile overflow.

---

## 4. Anticipated Evaluator Questions & Your Answers

| # | Likely Question | Your Answer |
|---|---|---|
| 1 | *"Is this just CRUD?"* | "The CRUD is the input layer. The value is the **derived layer**: pedigree math, bloodline provenance labelling, sire×dam performance verdicts, survivability scoring, and a 30-day growth calendar — all computed automatically from the records." |
| 2 | *"Does it use AI?"* | "No external AI. Every number comes from deterministic formulas on our server. We were explicit about this in the docs — claiming 'AI purity detection' when you only have pedigree math would be dishonest." |
| 3 | *"How is user data protected?"* | "Supabase Auth + Postgres RLS on every operational table, private storage buckets with 1-hour signed URLs for fight media, and revocable 64-char share tokens. The service-role key is server-only and there's a repo scan for leaked secrets." |
| 4 | *"What if two farms are on the same system?"* | "Completely isolated. `profiles` carries `role`; the admin console sees account counts and system stats, never another farm's birds. A farmer's flock is their business." |
| 5 | *"How do you know the numbers are right?"* | "Automated tests — `npm run gate` runs typecheck, lint, and the Vitest suite including a11y checks. Plus a schema-contract test that fails the build if a DB column allowlist drifts." |
| 6 | *"What happens to the data if I leave?"* | "JSON backup export + restore in Settings, plus CSV exports of registry and matches from the dashboard." |
| 7 | *"What's the actual innovation?"* | "**Honest genetic provenance.** Every percentage in the system is tagged Declared / Assumed / Derived / Adjusted, and owner adjustments flow down to descendants. Most tools just show a number with no epistemic label." |
| 8 | *"Why gamefowl specifically?"* | "Because the domain has real structure we could model properly: numbered sires, lettered dams, composite offspring codes, a defined growth-stage ladder, and a fight outcome vocabulary. A generic livestock app couldn't do any of this." |
| 9 | *"Is it responsive / can you demo on a phone?"* | "Yes — the mobile nav has a 4-item bottom bar with a More sheet, and there's an automated mobile-overflow audit script." |
| 10 | *"What's not done yet?"* | "Name three honestly: (1) the Marketplace was **removed** by migration — the table is renamed `marketplace_listings_deprecated`, data preserved; (2) we don't do DNA verification — only pedigree + owner observation; (3) there's a known small inconsistency where the Dashboard's active-bird count and Inventory's Active Breeders tab intentionally differ (the Inventory tab is the *breeding herd only*)." |

> **Rule:** If you don't know, say *"I'll verify that and get back to you"* — don't guess at a number.

---

## 5. Pre-Demo Checklist (30 min before)

- [ ] Seed a demo farm with **at least 8–12 birds across 3+ strains**, **2–3 active breeding pairs**, and **15+ matches with mixed Win/Loss/Draw** so the charts, doughnut, and pair matrix all have data.
- [ ] Include **at least one offspring** so the pedigree tree and bloodline % aren't empty.
- [ ] Include **one Archived and one Deceased** bird so the Inventory tabs aren't empty.
- [ ] Include **one fight with a video** so the media + share + signed-URL demo lands.
- [ ] Set the date-range picker to **All Time** before you start.
- [ ] Confirm the browser is on a **desktop viewport ≥ 1280px** (the demo layout is desktop-first; mobile demo is a separate quick detour).
- [ ] Zoom to 100%. Dark mode is already the default theme — leave it, it looks better.
- [ ] Have the **Admin account** credentials written down on paper, in case they ask for the admin view.
- [ ] Open `docs/FARM_OWNER_SYSTEM_GUIDE.md` in a second tab — it's your 700-line answer key for any deep question.
- [ ] Do **not** run `git` commands live. Nothing invites questions like "is this on GitHub with secrets?"

---

## 6. 5-Minute Condensed Version (if time is short)

1. **Landing** → 4-step workflow, 10 sec.
2. **Dashboard** → 3 KPI cards + date filter + export menu, 60 sec.
3. **Dashboard analytics** → trends, bloodline doughnut, sire×dam matrix with Elite/Solid verdicts, 60 sec.
4. **Registry** → 3-step form, auto bird code `1A1`, live bloodline % + backcross preview, 60 sec.
5. **Lineage** → 4-gen pedigree + the Declared/Assumed/Derived/Adjusted provenance labels, 45 sec.
6. **Match Logs** → record a fight, private video, revocable share link, 60 sec.
7. **Close** → "deterministic math, RLS isolation, no external AI, automated gates" + Q&A, 30 sec.

**Closing line:**
> "GalloTrack turns a notebook of chicken names into a **decision system**. The dashboard tells the farmer
> what's true today; the Lineage and Breeding Hubs tell them what to do next season. Every number is
> traceable to a record, and every number is labeled with how confident we are in it."

---

*Related docs: `docs/FARM_OWNER_SYSTEM_GUIDE.md` (full 700-line system reference),
`docs/EVALUATOR_REVIEW_PROMPT.md` (paste-ready review prompt),
`docs/STAGING_SETUP_GUIDE.md` (deployment), `docs/IMPROVEMENT_ROADMAP.md` (next sprint).*
