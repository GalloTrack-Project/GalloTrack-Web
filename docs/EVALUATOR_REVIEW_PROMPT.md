# GalloTrack — Evaluator Review Prompt
**Paste-ready prompts for reviewing GalloTrack-Web**

This file has **three** prompts. Use whichever fits your evaluator:

| # | Prompt | For |
|---|---|---|
| **A** | Reviewer Prompt (paste into an AI reviewer) | An AI / LLM evaluating the repo as a panelist would |
| **B** | Live App Review Prompt (paste into an AI with browser/code access) | A reviewer who will actually open the running app |
| **C** | Evaluator Scorecard (fill in by hand) | A human evaluator at the defense panel |

---

# A. Reviewer Prompt — "Act as a Capstone Panelist"

> Copy everything inside the box and paste it into your AI reviewer. Fill in the bracketed parts.

```
You are an IT/CSC capstone **evaluation panelist** for a student project. Be rigorous, fair, and
evidence-based. Do not be flattering. If something is weak, say so plainly and cite the file.

## PROJECT IDENTITY
- Project name : GalloTrack — Gamefowl Farm Management System
- Team         : Team GalloTrack @ ISUFST
- Purpose     : A web app for gamefowl breeders to register every bird, track bloodlines and
                 pedigrees, log fight (derby) results, and get analytics-driven breeding advice.
- Repo root   : ./GalloTrack-Web

## TECH STACK (verify these claims against the repo — flag anything that doesn't match)
- Frontend : Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Chart.js
- Backend  : Supabase — PostgreSQL, Auth, Storage, Realtime
- Hosting  : Vercel
- Root app : ./gallotrack-next   (the repo root also contains a DEPRECATED Flask backend — ignore
             FLASK_DEPRECATED.md / venv / utils/lineage.py; the active system is the Next.js app)
- DB       : ./supabase/migrations/*.sql  (48 migration files, applied in filename order)
- Docs     : ./docs/FARM_OWNER_SYSTEM_GUIDE.md  (the team's own 700-line system reference)

## CLAIMS TO VERIFY (this is the core of the review)
Check each claim against the actual code and mark each as SUPPORTED / PARTIALLY SUPPORTED /
UNSUPPORTED, with a file:line citation for every verdict.

1. "The Dashboard is a live command center, not a mockup." Verify each of the 3 KPI cards
   (active birds, matches logged, overall win rate) reads from real Supabase data through the
   fowl-context, not from constants. Check the date-range filter actually re-filters match-derived
   numbers and correctly does NOT filter the living-bird count.
2. "Bloodline percentages are computed recursively from parentage." Verify the algorithm in
   ./gallotrack-next/lib/bloodline-composition.ts — 50/50 sire/dam recursion, backcross purity
   (F1 50%, F2 75%, F3 87.5%, F4+ 93.75%+), and whether owner *adjusted* compositions flow down to
   descendants.
3. "Bloodline provenance is honest." Verify the four labels — Declared / Assumed / Derived /
   Adjusted — are actually persisted and rendered, and that the UI does not overclaim DNA-level
   genetic verification.
4. "Breeding pair verdicts are rule-based and evidence-gated." Verify the Elite / Solid /
   Under-Performing / Inconclusive thresholds and the survivability scoring
   (Fit 100, Minor 70, Critical 30, Deceased 0) in ./gallotrack-next/lib/win-rate.ts.
5. "Bird codes follow real gamefowl breeding convention" — sires get numbers (1,2,3), dams get
   letters (A,B,C, skipping X), offspring get composite sire# + damLetter + seq (1A1, 2B1).
   Verify in lib/bird-code.ts and the DB function get_next_fowl_identifier.
6. "Wing Band ID is a separate namespace from bird_code" and can never collide with it.
7. "Row-Level Security isolates farms." Verify the RLS policies in
   ./supabase/migrations/20260804000000_consolidate_owner_isolation.sql enforce
   auth.uid() = user_id on fowl, match, breeding_pairings, safety_incidents, farms, profiles.
8. "Fight media is private." Verify match-videos / match-photos buckets are private and that access
   goes through short-lived signed URLs (lib/media-privacy.ts, /api/match/media), with the
   public fowl-images bucket as a documented exception.
9. "Share links are secure and revocable." Verify the 64-char token in /api/share/[token], that a
   shared link exposes ONLY the one linked record, and that revocation actually deletes the token.
10. "No third-party AI API receives farm data." Grep for openai, anthropic, gemini, google.generativeai,
    huggingface, replicate, cohere, groq, ollama, /api/chat, /v1/chat/completions. Report every hit
    and whether it sends user data.
11. "Quality is automated." Verify the gate in package.json (`npm run gate` = standard-gates.mjs +
    tsc --noEmit + eslint + vitest) and what each gate actually enforces. Check whether the
    standard-gates scans are honestly ratcheted against a baseline rather than silently disabled.
12. "Security hygiene." Verify no secrets are committed (.env files ignored, only NEXT_PUBLIC_*
    in client bundles, SUPABASE_SERVICE_ROLE_KEY server-only). Check scripts/check-secrets.ts and
    run it if safe. Confirm the service-role key never appears in any client component.
13. "Automated tests exist and are meaningful." Count and categorize the test files. Identify tests
    that assert real behavior vs. tautologies. Flag any skipped or empty tests.
14. "The app is accessible and responsive." Check for aria labels, keyboard nav, focus management
    in modals, and whether vitest-axe / jsx-a11y are wired into the test suite and lint config.
15. "Data integrity." Verify the unique constraint on (user_id, bird_code), that archive/deceased
    are reversible soft-deletes, that fowl_status_history is append-only, and that hard delete
    recalculates descendant bloodlines.

## ALSO EVALUATE
- Architecture & code organization: are responsibilities separated (lib/ services vs components vs
  app routes)? Is there a coherent state-management story (fowl-context, auth-context, ui-context)?
- Domain modeling: is the gamefowl domain modeled properly, or is it a generic CRUD app with
  themed labels? Look for domain-specific logic: growth-stage ladder, breeding-role classification,
  tab exclusivity, milestone calendar, pairing conflict detection, breed standards grading.
- Dead code / inconsistencies: the Marketplace was intentionally deprecated (migration
  20261014000000_deprecate_marketplace.sql, /marketplace is a redirect stub). Are there other
  orphaned routes, unused components, or duplicated logic?
- Test/quality-of-life scripts: scripts/verify-schema-contract.ts, scripts/audit-mobile-overflow.ts,
  scripts/check-secrets.ts, scripts/backup-production.ts, scripts/restore-database.ts, the i18n
  export/import/audit scripts. Do they add real safety, or are they theater?
- Documentation honesty: does docs/FARM_OWNER_SYSTEM_GUIDE.md accurately describe the code, or does
  it overclaim? Cross-check its "Rules Check & Discrepancy Observations" table (section 9) against
  the current code and report whether those known quirks are still present.

## OUTPUT FORMAT
Produce a structured report:

1. **Executive Summary** — 6-8 sentences. What is the system, how well is it built, what would you
   score it, and what is the single biggest weakness?
2. **Claims Verification Table** — one row per claim (1-15):
   | # | Claim | Verdict | Evidence (file:line) | Notes |
3. **Strengths** — specific, with citations. No generic praise.
4. **Weaknesses & Risks** — ranked by severity (Critical / High / Medium / Low). For each: what,
   where, why it matters to a user, and a concrete suggested fix.
5. **Missing / Unfinished Work** — what a production deployment would still need.
6. **Rubric Score** — score each out of the weights below, with a one-line justification each, then
   a weighted total out of 100.
7. **Recommended Questions for the Panel** — 5-8 sharp questions the team should be ready to answer,
   each with a suggested strong answer, based on what you actually found in the code.
8. **Verdict** — one of: Outstanding / Strong / Pass / Needs Revision / Reject, plus 3 sentences.

RUBRIC WEIGHTS
- Functional correctness & domain logic   25
- Data integrity & security (RLS, storage, secrets, auth)  20
- Software engineering quality (architecture, typing, tests, gates) 20
- UX/UI, accessibility & responsiveness      15
- Analytics depth & decision support        10
- Documentation & honesty of claims         10
                                                    TOTAL 100

## RULES
- Cite file:line for every factual claim you make. If you cannot cite it, say "not verified".
- Do NOT invent features that are not in the code. If the team claims it and it isn't there, that is
  a Critical finding, not a nitpick.
- Prioritize correctness and security over polish.
- Distinguish clearly between "verified" and "plausible but unverified".
- Be concise. Cite, don't paraphrase.
```

---

# B. Live App Review Prompt — "Review the running system"

> Use this when the evaluator (or an AI with browser access) will **actually open the app**.
> Combine with the code-review prompt above for a full assessment.

```
You are evaluating a **working web application**, not a document. Open it, use it, and judge it by
what it does — not by what the README claims.

## ACCESS
- URL      : [PASTE YOUR DEPLOYED URL HERE]
- Role 1   : Farm Owner  — email [FARM_OWNER_EMAIL]  password [PASSWORD]
- Role 2   : Admin       — email [ADMIN_EMAIL]        password [PASSWORD]
- Local run: cd gallotrack-next && npm install && npm run dev   (needs .env.local from .env.example)

## DO THIS, IN THIS ORDER

### Phase 1 — First impression (2 min)
Load the landing page. Does it state what the product does and who it is for? Is the 4-step
workflow clear? Then log in. Does the transition feel intentional? Is the loading state handled?

### Phase 2 — Dashboard (5 min)
- Confirm the 3 KPI cards show values consistent with the seeded data.
- Change the date range. Do the match/win-rate numbers move? Does the live bird count correctly
  stay put? Flag it if either behaves wrongly.
- Open the win-rate card's per-bird breakdown modal.
- Export CSV (registry + matches). Does the file open correctly in a spreadsheet with real headers
  and the right number of rows?
- Check the charts render with data and the empty states look intentional when data is missing.
- Test the "Quick Actions" links actually land on the right tab, not just the right page.

### Phase 3 — Registry + code generation (6 min)
- Register a new sire. Verify the auto-assigned code is the next number, not a random one.
- Register a dam. Verify the next letter, and that 'X' is skipped.
- Register an offspring with both parents selected. Verify the composite code (e.g. 1A1) and that
  the live bloodline % preview updates to 50/50 before you submit.
- Try to manually override a code with a wrong pattern. Does it reject it with a useful message?
- Try registering an offspring with only one parent. Does the code stay blank with the
  "select both sire and dam" guidance?
- Try to reuse an existing bird code. Does it block you?
- Register a bird with NO parents and NO declared composition. Does it get labeled 'Assumed'?

### Phase 4 — Lineage honesty (4 min)
- Open the Lineage Directory. Generate the 4-generation pedigree. Are the percentages right
  (50/50 → 25/25 → 12.5 → 6.25)?
- Check the provenance label on every bloodline figure. Are they honest and visible, or hidden in
  a tooltip?
- Adjust an offspring's composition and confirm the adjustment flows to its descendants.

### Phase 5 — Breeding (4 min)
- Create a breeding pair. Then try to put the same sire in a second active pair. Does it block?
  (Safety Conflict Detection.)
- Check the pair analytics verdicts against the underlying match data — are Elite/Solid/
  Under-Performing/Inconclusive applied consistently with the stated thresholds?

### Phase 6 — Match logging + media + sharing (5 min)
- Log a match with a video. Confirm the poster frame is captured.
- Check the video is NOT publicly fetchable (open the raw storage URL in a private window — it
  should fail). Then confirm it plays for the signed-in owner.
- Generate a share link. Open it in a private window (not logged in) — does it show ONLY that one
  match? Does it leak the dashboard or other birds?
- Revoke the link. Re-open it. It must now be dead.

### Phase 7 — Isolation & roles (5 min)
- Log in as Admin. You should see the System Overview, User Registry, System Config, Audit Logs.
- Confirm the admin can see account counts and system stats but NOT another farm's chickens.
- Suspend a test user, log in as them, confirm access is blocked with a clear message.

### Phase 8 — Lifecycle (4 min)
- Archive a bird with a reason. Confirm it moves to Inventory → Archived, the dashboard count
  drops, and the family tree still works.
- Restore it. Confirm it comes back exactly as it was.
- Mark a bird deceased with a cause, then restore it. Confirm the status history was written.
- Check whether archiving a bird that has registered offspring warns you. (Known gap if it doesn't.)

### Phase 9 — Craft (5 min)
- Resize to 375px. Check for horizontal overflow, overlapping elements, and unreachable buttons.
- Keyboard-only pass: Tab through the Registry form and a modal. Can you reach everything? Does
  focus trap in modals? Does Esc close them? Is there a visible focus ring?
- Run a contrast check on the primary surfaces.
- Check the light theme on the same screens — not just dark.
- Look for empty states, loading skeletons, and error states. Are they designed or default?

### Phase 10 — Report
1. What works (concrete, with the interaction you tested).
2. What is broken or wrong (reproduction steps for each).
3. UX problems that cost a real user time or trust.
4. Security findings, ranked by severity.
5. Score out of 100 using the same rubric as the code-review prompt, plus a separate
   **UI/UX score out of 20** justified in 5 bullet points.

RULES
- Do not report a bug without reproducing it. Give exact steps and the observed result.
- Distinguish blockers from polish.
- Note anything that is confusing even if it technically works.
```

---

# C. Evaluator Scorecard (human, print & fill)

```
GALLOTRACK — EVALUATION SCORECARD
Project : GalloTrack — Gamefowl Farm Management System
Team    : Team GalloTrack @ ISUFST
Evaluator: ______________________  Date: ____________

A. FUNCTIONAL REQUIREMENTS (30 pts)
   A1. Chicken registry — register, edit, archive, restore, promote        ___/6
   A2. Automated identifier coding (sire/dam/offspring scheme)              ___/4
   A3. Bloodline % + backcross purity computation                           ___/4
   A4. Match logging with outcomes, conditions, media                       ___/5
   A5. Lineage: family tree, sire/dam trees, 4-gen pedigree                 ___/5
   A6. Breeding pairs, conflict detection, safety incidents                ___/3
   A7. Dashboard analytics (win rate, trends, pair matrix, milestones)      ___/3

B. DATA & SECURITY (25 pts)
   B1. Authentication / session handling                                    ___/5
   B2. RLS multi-farm isolation                                            ___/6
   B3. Private media storage + signed URLs                                 ___/4
   B4. Share tokens + revocation                                            ___/3
   B5. Secrets management (server-only keys)                                ___/3
   B6. Data integrity (uniqueness, soft delete, audit trail, export/restore) ___/4

C. ENGINEERING (20 pts)
   C1. Architecture & separation of concerns                                ___/4
   C2. TypeScript discipline (no `any` sprawl, strict)                      ___/3
   C3. Automated tests — meaningful coverage                              ___/5
   C4. Automated quality gates in CI                                        ___/4
   C5. Schema contract / migration discipline                              ___/4

D. UI/UX & ACCESSIBILITY (15 pts)
   D1. Visual consistency & design system                                  ___/4
   D2. Responsive / mobile                                                  ___/3
   D3. Accessibility (keyboard, a11y, contrast)                             ___/4
   D4. Empty / loading / error states                                       ___/2
   D5. Language (English / Filipino i18n)                                  ___/2

E. INNOVATION & DOCUMENTATION (10 pts)
   E1. Domain depth beyond generic CRUD                                     ___/4
   E2. Honesty of claims (provenance labels, stated limitations)             ___/3
   E3. Documentation quality                                                ___/3

                                       TOTAL   ___/100
   Recommendation:  Outstanding / Strong / Pass / Needs Revision / Reject
   Top 3 strengths:  1. ____________  2. ____________  3. ____________
   Top 3 improvements:1. ____________  2. ____________  3. ____________
```

---

## Quick-Reference: Where Everything Lives (paste this into the reviewer's context)

| Module | Route | Key implementation |
|---|---|---|
| Dashboard (farmer) | `/dashboard` | `components/DashboardPage.tsx` |
| Dashboard (admin) | `/dashboard` | `app/(dashboard)/dashboard/admin-page.tsx` |
| Chicken Registry | `/profiling` | `components/ProfilingPage.tsx`, `components/profiling/EncodeForm.tsx` |
| Chicken Inventory | `/catalog` | `components/MarketplacePage.tsx` (inventory variant) |
| Lineage Directory | `/lineage` | `components/LineageDirectory.tsx`, `FamilyTree.tsx`, `PedigreeTree.tsx` |
| Breeding Hub | `/breeding` | `components/BreedingHub.tsx` |
| Match Logs | `/match-logs` | `components/match/MatchLogsView.tsx`, `MatchRecordForm.tsx` |
| Milestones | `/milestones` | `app/(dashboard)/milestones/page.tsx` |
| Breeds / Strains | `/breeds` | `app/(dashboard)/breeds/page.tsx` |
| Profile | `/profile` | `app/(dashboard)/profile/page.tsx` |
| Admin Console | `/admin/*` | `app/(dashboard)/admin/*` + `app/api/admin/*` |
| Share (public) | `/share/[token]` | `app/api/share/[token]/route.ts` |
| Nav / roles | — | `lib/nav-manifest.ts`, `lib/registry-roles.ts` |
| Bloodline math | — | `lib/bloodline-composition.ts`, `lib/bloodlines.ts` |
| Win rate + verdicts | — | `lib/win-rate.ts`, `lib/ranking.ts` |
| Pedigree / families | — | `lib/family-tree.ts`, `lib/family-stats.ts` |
| Bird code scheme | — | `lib/bird-code.ts`, `lib/wing-band.ts` |
| Breeding logic | — | `lib/breeding.ts`, `lib/breeding-classification.ts` |
| Media privacy | — | `lib/media-privacy.ts`, `app/api/match/media/route.ts` |
| State contexts | — | `lib/contexts/fowl-context.tsx`, `auth-context.tsx`, `ui-context.tsx` |
| DB migrations | — | `supabase/migrations/*.sql` (48 files) |
| Quality gates | — | `scripts/standard-gates.mjs`, `npm run gate` |
| Full system doc | — | `docs/FARM_OWNER_SYSTEM_GUIDE.md` |

---

*Companion doc: `docs/EVALUATOR_PRESENTATION.md` — the demo script and Q&A defenses.*
