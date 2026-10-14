# GalloTrack System Architectural, Product & Security Review
**Principal Engineer, Product Designer & Security Reviewer Report**  
*Evaluation Date: October 2026 | Target Deployment: Next.js 16 + Supabase Postgres*

---

## A. Executive Summary

GalloTrack is a modern, high-potential lineage, breeding, and match-tracking system for gamefowl farms. Its core lineage calculations (50/50 bloodline inheritance, 3-generation pedigree traversal, and the sire-number / dam-letter / offspring-sequence identifier scheme) demonstrate strong domain understanding. The user interface has rich components, dark mode support, and recently unified registry roles that eliminated counting drift on the owner dashboard.

However, the platform currently exhibits architectural bifurcation, multi-tenant security vulnerabilities, and workflow gaps that must be resolved before presenting to an academic or industry evaluation panel. Storage buckets are configured public, strains and reference data lack tenant boundaries, and several API routes bypass server-side role validation. Lineage links depend on fragile string names rather than foreign keys, risking data corruption if birds are renamed or deleted. The admin side functions largely as a data-inspection viewer rather than a governance console, lacking farm onboarding, health diagnostics, or an active audit log.

- **Farm Owner Side Readiness Score**: **74 / 100** *(Strong core functionality; needs relational integrity, certificate generation, and unified win-rate rules)*
- **Admin Side Readiness Score**: **52 / 100** *(Inspects records and toggles flags, but lacks farm approval flows, system health monitoring, and tamper-evident audit logging)*

---

## B. Scorecards (1–5 Scale)

### 1. Farm Owner Side Scorecard

| Area | Score | Biggest Strength | Biggest Risk |
| :--- | :---: | :--- | :--- |
| **1. Data Integrity & Domain Model** | **3.0 / 5** | Canonical role partitioning (`Breeding Male`, `Breeding Female`, `Non-Breeding`) enforced via `getRegistryCounts` and natural sorting. | Lineage parentage stored primarily as loose strings (`sire`, `dam`), causing broken family trees if names are edited or deleted. |
| **2. Business Rules** | **3.8 / 5** | Standardized bird code sequence generator (`1A1`, `1A2`) and mutually exclusive tab membership. | Win-rate calculation logic is duplicated across 4 files; `helpers.ts` and `MarketplacePage.tsx` return `0%` for un-fought birds instead of `null`. |
| **3. Multi-Farm Isolation** | **4.0 / 5** | Strict row-level security on `fowl`, `match`, and `profiles` ensures owners query only their own `user_id`. | Public storage buckets allow direct URL access to photos, and shared strains allow one farm to see or mutate custom bloodline names from another. |
| **4. Roles & Permissions** | **3.8 / 5** | Database trigger `protect_profile_privileges` blocks privilege escalation on `profiles` updates. | Route proxy in `proxy.ts` marks `/api/*` as public, requiring each route handler to manually replicate auth checks. |
| **5. User Flows** | **3.5 / 5** | Smooth registration flow with automatic bird code assignment and deep-linking between Dashboard and Inventory. | Inactive/deceased birds are hidden in Inventory without cascade protections when sires/dams with living offspring are permanently deleted. |
| **6. UI & Visual Design** | **4.2 / 5** | Modern dark/light theme, rich typography tokens, accessible contrast, and zero sub-12px text regressions. | Decorative clutter ("LIVE", "REGISTERED", "Wave-Motion Tracker" defaults) and misleading milestone countdowns ("0 in next 30 days"). |
| **7. Security & Privacy** | **3.2 / 5** | View-only share tokens isolate public visitors from owner dashboards; signed URLs implemented for match videos. | Share links have no expiration date (`expires_at` missing), and share links generate `http://localhost:3000` URLs in local development. |
| **8. Reliability & Operations** | **2.8 / 5** | Pure JSON backup parser and validator with automated test suite in `lib/backup.test.ts`. | Supabase free tier pauses after 7 days of inactivity; no automated database snapshots or off-site backups configured. |
| **9. Performance** | **3.6 / 5** | Fast client-side searching and filtering with debounce and natural identifier comparators. | N+1 in-memory array filtering on large lineages; images and videos served uncompressed without responsive thumbnails. |
| **10. Code Quality & Testing** | **4.0 / 5** | Clean TypeScript types, zero `tsc` compiler errors, 487 passing vitest tests, and automated tab exclusivity gate. | Outdated unit test fixtures in `FowlLists.test.tsx` that assert legacy tab semantics. |
| **11. Documentation** | **4.2 / 5** | Comprehensive `docs/FARM_OWNER_SYSTEM_GUIDE.md` and UI design standard. | Missing Entity Relationship Diagram (ERD) and developer onboarding architecture notes. |
| **12. Feature Gaps** | **3.4 / 5** | Deep lineage breakdown and bloodline provenance calculation. | No printable pedigree certificates, no printable QR tags, and no pairing compatibility advisor. |
| **Overall Owner Score** | **74 / 100** | **Ready for controlled demonstration; needs Phase 1 data integrity and Phase 3 standout exports.** | |

---

### 2. Admin Side Scorecard

| Area | Score | Biggest Strength | Biggest Risk |
| :--- | :---: | :--- | :--- |
| **1. Data Integrity & Domain Model** | **2.6 / 5** | Single-table profile flag synchronization via `sync_admin_flags_trigger`. | `farms` table has 0 rows and is unused; farm names are denormalized strings on `profiles` with no multi-user per farm support. |
| **2. Business Rules** | **3.0 / 5** | System settings key/value store (`system_settings`) allows runtime configuration of default units and roles. | No automated detection or enforcement for duplicate wing bands across the system or orphaned parent references. |
| **3. Multi-Farm Isolation** | **3.2 / 5** | Admins can inspect global counts across users via `admin_read_all_fowl` policy. | Admin client-side queries load raw cross-tenant rows without audit tracking of which admin viewed whose private farm data. |
| **4. Roles & Permissions** | **3.4 / 5** | Gated `/admin/*` routes in `proxy.ts` and `adminGuard()` verify `is_admin` and `role = 'admin'`. | Admin status is determined by reading `profiles` table directly rather than JWT claims, causing redundant DB lookups. |
| **5. User Flows** | **2.4 / 5** | Clean user table with account status toggles (`active`, `suspended`, `deactivated`) and password reset. | No onboarding/approval queue: new signups are immediately active by default with no verification gate before accessing farm tools. |
| **6. UI & Visual Design** | **3.5 / 5** | Consistent design tokens, dark mode compatibility, and clear user cards. | Lack of data visualization: Registration chart shows signups, but no activity heatmaps, fighting volume, or storage metrics. |
| **7. Security & Privacy** | **2.5 / 5** | Service-role API routes check `verifyAdmin` before privileged operations. | `admin_audit_logs` table has 0 rows in database; sensitive admin actions (e.g., viewing cross-tenant data, resets) are not reliably recorded. |
| **8. Reliability & Operations** | **2.6 / 5** | Admin backup export JSON captures system settings and profiles. | No automated scheduled backups, no staging database environment, and no disaster recovery runbook. |
| **9. Performance** | **3.0 / 5** | Paginated auth user listing (`perPage: 200`) in `/api/admin/users`. | Admin flock audit (`/api/admin/fowls`) loads all chickens across all farms in a single unbounded query. |
| **10. Code Quality & Testing** | **2.8 / 5** | Shared `verifyAdmin` helper and typed `AdminProfileRow` interfaces. | Very few automated unit or integration tests covering admin API routes and governance actions. |
| **11. Documentation** | **2.0 / 5** | Basic settings documented in `lib/admin.ts`. | No Admin Operations Manual, no incident response guide, and no user management procedure documentation. |
| **12. Feature Gaps** | **2.2 / 5** | Working password reset and account status toggling. | Missing System Health / Data Quality Dashboard, farm onboarding approval workflow, and tenant impersonation. |
| **Overall Admin Score** | **52 / 100** | **Functional prototype for user toggles; lacks production governance and data-health console.** | |

---

## C. Findings List

| ID | Side | Severity | Area | Evidence | Impact | Recommended Fix | Effort |
| :--- | :---: | :---: | :--- | :--- | :--- | :--- | :---: |
| **SEC-01** | Shared | **Critical** | Security & Privacy | `supabase.storage.listBuckets()` reveals `fowl-images` bucket has `public: true`. | Anyone who discovers or guesses an image URL can access private farm assets unauthenticated. | Set `fowl-images` to `public: false` and generate authenticated signed URLs via storage RLS, matching `match-videos`. | M |
| **SEC-02** | Shared | **High** | Multi-Farm Isolation | `supabase/migrations/20260916000000_leg_colors_and_strains_cleanup.sql` lines 61–63: `CREATE POLICY strains_update_authenticated ON strains FOR UPDATE USING (auth.role() = 'authenticated')`. | Any logged-in farm owner can mutate or soft-delete strains created by other farms or default system strains. | Restrict strain update/delete to `created_by = auth.uid()` or system administrators. | S |
| **SEC-03** | Shared | **High** | Roles & Permissions | `gallotrack-next/proxy.ts` line 8: `PUBLIC_PREFIXES = ['/auth', '/share', '/api', '/_next']`. | Route proxy bypasses all `/api/*` routes. If an API route forgets `verifyAdmin` or session validation, it is completely public. | Remove `'/api'` from `PUBLIC_PREFIXES`. Enforce session validation globally in `proxy.ts`, whitelisting only `/api/share/*` and public webhooks. | M |
| **DAT-01** | Owner | **High** | Data Integrity | `gallotrack-next/lib/services/fowl-service.ts` & `fowl` table: `sire` and `dam` are stored as loose `TEXT` names, while `sire_id` and `dam_id` are often NULL. | If a farm owner renames a sire, all offspring lineage connections and pedigree tree branches break silently. | Enforce dual write of `sire_id`/`dam_id` foreign keys, and add a database trigger that propagates name updates to children. | M |
| **DAT-02** | Owner | **Medium** | Data Integrity | `fowl` table contains overlapping lifecycle fields: `status`, `condition_status`, `breeding_role`, `activity_status`, `archive_kind`, and `retired_scope`. | Status fields can drift out of alignment during direct updates or incomplete forms. | Consolidate lifecycle mutations into a single transactional stored procedure or state machine in `lib/lifecycle.ts`. | M |
| **BUS-01** | Owner | **High** | Business Rules | `lib/helpers.ts` (`winRateOf`) and `MarketplacePage.tsx` (`getWinRate`) return `0%` for un-fought birds; `lib/win-rate.ts` (`computeWinRate`) returns `null`. | Un-fought birds are displayed as 0% losers on Inventory and Dashboard, violating the farm rule that un-fought birds have no win rate. | Replace all ad-hoc win rate calculations with the shared `computeWinRate` function from `lib/win-rate.ts`. | S |
| **BUS-02** | Owner | **Medium** | Business Rules | `lib/win-rate.ts` defines `isLowSample` (<3 matches), but `MarketplacePage.tsx` and `DashboardPage.tsx` do not render the low-sample warning chip. | Fowls with 1 win and 0 losses appear as 100% champions without a sample size caveat. | Render neutral "1 match / Low sample" pill whenever `isLowSample === true`. | S |
| **ADM-01** | Admin | **High** | User Flows & Auditing | `admin_audit_logs` table has 0 rows in database; `lib/admin.ts` `setUserActive` and `setUserVerified` do not insert audit rows. | Sensitive administrative actions (suspensions, resets, deletes) cannot be audited or attributed to a specific admin. | Insert audit log records inside transactions for every admin API route and UI mutation. | M |
| **ADM-02** | Admin | **Medium** | Data Model | `farms` table has 0 rows; `profiles.farm_name` is an unindexed text string on individual user rows. | Multiple owners or farm hands cannot belong to the same farm; no farm-level analytics or management. | Promote `farms` to a primary tenant entity with `profiles.farm_id REFERENCES farms(id)`. | L |
| **ADM-03** | Admin | **Medium** | Performance | `gallotrack-next/app/api/admin/fowls/route.ts` loads all chickens across all farms in one query without pagination. | Performance will degrade as database grows beyond 500 chickens. | Add cursor- or offset-based pagination (`limit`, `offset`) to admin audit routes. | M |
| **UI-01** | Owner | **Low** | UI & Visual Design | Dashboard "Upcoming Milestones" widget displays "0 in the next 30 days" even when past-due milestones are listed below. | Confusing and contradictory copy for the farm owner. | Update copy to "N overdue · N in the next 30 days" or conditionally hide when 0. | S |
| **UI-02** | Shared | **Low** | UI & Visual Design | Dashboard cards display decorative badges ("LIVE", "REGISTERED") that carry no interactive or semantic meaning. | Visual clutter detracting from actionable farm metrics. | Replace decorative tags with meaningful indicators (e.g., "Real-time sync", last updated timestamp). | S |
| **SEC-04** | Owner | **Medium** | Security & Privacy | `share_links` table (`supabase/migrations/20261007000000_match_record_completeness.sql`) lacks `expires_at` column; `ShareModal.tsx` uses `window.location.origin`. | Public share links remain valid forever and generate `http://localhost:3000` URLs in local development. | Add `expires_at` with a 7-day or 30-day default, and use `NEXT_PUBLIC_APP_URL` env variable for absolute share URLs. | S |
| **REL-01** | Shared | **High** | Reliability & Ops | Supabase project is on the Free Tier with no scheduled automated external pg_dump or off-site backup. | Inactivity pauses database; data loss risk if free project is paused or corrupted. | Deploy a daily GitHub Actions cron script that triggers `supabase db dump` to an encrypted S3/GCS bucket. | M |
| **TST-01** | Owner | **Medium** | Code Quality | `components/profiling/FowlLists.test.tsx` fails because test fixtures do not reflect mutually exclusive tab roles. | CI test suite reports failing tests on clean repository checkouts. | Update `mockFowls` in `FowlLists.test.tsx` to align with the `roleOf` invariant. | S |

---

## D. User Flows: Current vs. Ideal

### 1. Farm Owner Lifecycle Flow

#### Current Flow (Fragmented & Loosely Coupled):
```
[Start]
   │
   ├─► Register Chicken Form (4 steps)
   │     ├─ Type name, breed, gender
   │     ├─ Type or pick Sire & Dam (Text string matching only!)
   │     ├─ Auto-assign bird code (1, A, 1A1)
   │     └─ Save to `fowl` (sire_id / dam_id usually left NULL)
   │
   ├─► Breeding Hub
   │     ├─ Create pairing (Picks sire & dam independently of registered status)
   │     └─ Pairing created without validating deceased/archived status of parents
   │
   ├─► Record Match
   │     ├─ Logs entry name, opponent, outcome, video/photo
   │     └─ Computes local win rate (draws/unfought often mishandled)
   │
   ├─► Inventory / Lifecycle
   │     ├─ Mark Deceased or Archived (Moved out of Registry tabs)
   │     └─ Permanent Delete (Deletes sire/dam even if 20 living offspring depend on its name!)
[End: Orphaned Lineage Names]
```

#### Ideal Flow (Relational Integrity & Production Safeguards):
```
[Start]
   │
   ▼
[1. Foundation Stock Registration]
   │  • Explicitly flag as "Foundation Sire (Numbered)" or "Foundation Dam (Lettered)"
   │  • Physical Wing Band recorded & verified unique
   │  • System assigns immutable ID & Bird Code
   ▼
[2. Verified Breeding Pairing]
   │  • Picker filters only Active, Breeding-Ready adult stock
   │  • Displays inbreeding warning if shared ancestors exist within 3 generations
   │  • Creates Pairing record with target season & coop assignment
   ▼
[3. Offspring Batch / Clutch Registration]
   │  • Select active Pairing -> Sire & Dam automatically locked
   │  • System auto-increments Pair sequence: Sire(1) + Dam(A) + Clutch(1) = 1A1
   │  • Inserts Foreign Keys (`sire_id`, `dam_id`, `pairing_id`) in Postgres
   ▼
[4. Match Logging & Empirical Stats]
   │  • Select chicken from Inventory / Registry
   │  • Upload fight video (transcoded/validated) & photo evidence
   │  • Compute official Win Rate via `computeWinRate` (unfought = null, <3 matches = low sample)
   ▼
[5. Pedigree & Showcase]
   │  • Generate printable PDF Pedigree Certificate with official QR code
   │  • Create revocable Share Link with configurable 7-day / 30-day expiry
   ▼
[6. Safe Lifecycle Transitions]
   │  • Retirement / Deceased / Archive logs append-only audit entry in `fowl_status_history`
   │  • Permanent Delete blocked if chicken has recorded offspring (Foreign Key RESTRICT)
   │  • Soft-archive preserves lineage tree integrity indefinitely
[End]
```

---

### 2. Admin Governance & Management Flow

#### Current Flow (Passive Data Inspection):
```
[Admin Login]
   │
   ├─► Admin Dashboard
   │     ├─ Shows static user counts & signup chart
   │     └─ Lists raw user profiles
   │
   ├─► User Management
   │     ├─ Toggle Active / Suspended / Deactivated
   │     ├─ Toggle Verified
   │     ├─ Trigger Password Reset
   │     └─ [Action NOT logged in `admin_audit_logs`!]
   │
   ├─► Global Flocks / Matches Viewer
   │     └─ Unbounded SELECT of all fowls across all farms
   │
   ├─► System Settings
   │     └─ Edits app-wide default strain, maintenance mode, etc.
[End: No Tenant Approval, No Health Checks, No Audit Trail]
```

#### Ideal Flow (Active Governance & Tenant Health Console):
```
[Admin Login]
   │
   ▼
[1. System Health & Integrity Dashboard]
   │  • Tenant health overview: Total Active Farms, Storage Quotas, System Error Rate
   │  • Automated Data Integrity Check:
   │      - Detect orphan parent strings
   │      - Detect duplicate wing bands
   │      - Detect registry count anomalies
   ▼
[2. Farm Onboarding & Approval Queue]
   │  • New farm registration placed in "Pending Approval" state
   │  • Admin verifies farm identity & assigns Farm Code / Subscription Tier
   │  • Approval automatically provisions farm schema & notification
   ▼
[3. Tenant Governance & Support Console]
   │  • Search farms by owner, email, or farm name
   │  • Secure "View as Farm Owner" read-only support mode with session banner
   │  • Manage suspension/activation with mandatory reason prompt
   ▼
[4. Master Data & Genetic Standard Management]
   │  • Manage official system genetic strains (Sweater, Hatch, Kelso, etc.)
   │  • Review and promote popular user-submitted custom strains to official catalog
   ▼
[5. Tamper-Evident Audit Log Viewer]
   │  • Searchable log of every privileged action:
   │      [Timestamp] [Admin ID] [Action] [Target Farm/User] [Previous -> New Value] [IP]
   │  • One-click audit log CSV export for compliance review
   ▼
[6. Operations & Disaster Recovery Console]
   │  • View live Supabase connection status & database size
   │  • Trigger on-demand backup snapshot & download verified backup JSON
[End]
```

---

## E. Prioritized 4-Phase Implementation Roadmap

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       GALLOTRACK IMPROVEMENT ROADMAP                        │
├──────────────────────────┬──────────────────────────────────────────────────┤
│ Phase 1: Trust & Isolate │ Data Integrity, Strict RLS, Foreign Keys         │
├──────────────────────────┼──────────────────────────────────────────────────┤
│ Phase 2: Smooth Flow     │ Unified Win Rates, Safe Deletes, Mobile Polish   │
├──────────────────────────┼──────────────────────────────────────────────────┤
│ Phase 3: Standout Feats  │ Printable Pedigree PDF, QR Tags, Admin Health    │
├──────────────────────────┼──────────────────────────────────────────────────┤
│ Phase 4: Pro Finish      │ Scheduled Backups, Staging CI, Complete Docs     │
└──────────────────────────┴──────────────────────────────────────────────────┘
```

---

### Phase 1: "Trust the Data and Isolate the Farms"
**Goal**: Guarantee that database numbers can never corrupt, parent linkages cannot break, and multi-tenant isolation is airtight at the database and storage layers.

#### Tasks:
1. **P1.1 — Secure Supabase Storage Buckets & Policies**:
   - Change `fowl-images` bucket to `public: false`.
   - Update storage policies so authenticated owners can read/write only objects prefixed with their `auth.uid()`.
   - Update image rendering components to use signed URLs via `@/lib/media-privacy.ts`.
2. **P1.2 — Tenant-Scoped Custom Strains & Reference Data**:
   - Alter `strains` and `leg_colors` RLS policies: users can read official strains (`is_custom = false`) plus their own (`created_by = auth.uid()`).
   - Disallow non-admins from updating or deleting system strains (`is_custom = false`).
3. **P1.3 — Strict Foreign Key Relational Lineage**:
   - Write migration `20261011000000_enforce_parent_foreign_keys.sql` adding `sire_id BIGINT REFERENCES fowl(id) ON DELETE RESTRICT` and `dam_id BIGINT REFERENCES fowl(id) ON DELETE RESTRICT`.
   - Run safe backfill mapping existing string names to `sire_id` and `dam_id` within the same `user_id`.
   - Add database trigger preventing deletion of any chicken currently referenced as `sire_id` or `dam_id` by living offspring.
4. **P1.4 — Global Server-Side Route Guarding**:
   - Refactor `proxy.ts` to inspect all `/api/*` endpoints except designated public endpoints (`/api/share/*`).
   - Require active session for all mutative API requests.
5. **P1.5 — Fix Outdated Test Fixtures**:
   - Update `components/profiling/FowlLists.test.tsx` mock data to conform to the `roleOf` invariant.

- **Dependencies**: None.
- **Estimated Effort**: Medium (3–4 days).
- **Acceptance Criteria**:
  - `npm run check:exclusivity` passes with 0 errors.
  - Image URLs without signed tokens return 403 Forbidden.
  - User A cannot see, update, or soft-delete custom strains created by User B.
  - Attempting to delete a sire with registered offspring throws a clear relational constraint error.
  - `npm test` runs 100% green across all test suites.

---

### Phase 2: "Smooth Flow & Unified Business Rules"
**Goal**: Eliminate all UX contradictions, standardize win rate calculations farm-wide, and ensure seamless navigation on desktop and mobile.

#### Tasks:
1. **P2.1 — Standardize Win Rate Calculation Farm-Wide**:
   - Deprecate `winRateOf` in `lib/helpers.ts` and remove ad-hoc math in `MarketplacePage.tsx`.
   - Route all win rate displays through `computeWinRate` in `lib/win-rate.ts`.
   - Ensure chickens with 0 decided matches display `"No fights"` / `"—"`, never `0%`.
   - Render neutral warning chip (`"Low sample"`) whenever decided matches $< 3$.
2. **P2.2 — Remove Visual Clutter & Contradictory UI Elements**:
   - Remove decorative `"LIVE"` and `"REGISTERED"` badges from Dashboard.
   - Fix "Upcoming Milestones" widget: change label to `"N overdue · N in next 30 days"` and hide when 0.
   - Replace default behavioral trait placeholder `"Wave-Motion Tracker"` with standard physical observations (e.g. `"Agile / High Flier"`, `"Ground Fighter"`).
3. **P2.3 — Active Lifecycle Guard in Breeding Hub**:
   - In `BreedingHub.tsx`, filter parent selectors to exclude chickens marked `Deceased` or `Archived`.
   - Provide clear warning banner if an active pairing contains a parent that was recently marked deceased.
4. **P2.4 — Mobile & Responsive Navigation Polish**:
   - Audit mobile touch targets on the Registry filter bar and inventory toolbar to ensure $\ge 44\text{px}$ touch areas.
   - Verify zero horizontal scrolling on mobile viewports ($\le 375\text{px}$).

- **Dependencies**: Phase 1 completed.
- **Estimated Effort**: Medium (2–3 days).
- **Acceptance Criteria**:
  - Un-fought chickens in Inventory, Details Modal, and Lineage cards display `"—"` or `"No fights"`.
  - Dashboard Milestones widget displays accurate non-contradictory counts.
  - Breeding Hub pairing modal disallows selecting deceased or archived parents.
  - `npm run gate:static` and `npm run gate:mobile` pass with 0 regressions.

---

### Phase 3: "Standout Features for Demo Day"
**Goal**: Implement high-value capabilities that impress industry reviewers and demonstrate production maturity.

#### Selected Standout Features:
1. **P3.1 — Printable Pedigree Certificate (PDF Export)**:
   - Client-side vector PDF generation (`jspdf` + `html2canvas` or `@react-pdf/renderer`) rendering a 3-generation certified pedigree document.
   - Includes farm crest/name, chicken bird code, physical traits, verified bloodline percentage breakdown, match record summary, and verification QR code.
2. **P3.2 — Individual Chicken QR Code Cage Tag**:
   - Generate printable printable cage/leg QR cards from chicken details modal.
   - Scanning the QR code resolves to the secure read-only view `/share/[token]` for spectators or buyers.
3. **P3.3 — Admin System Health & Data Quality Console**:
   - New tab in `/admin` that runs automated diagnostic queries:
     - Detects orphan parent strings (chickens where `sire` name has no matching record).
     - Detects duplicate wing bands within farms.
     - Flags counting drift or unassigned bird codes.
     - One-click "Audit Report" download.
4. **P3.4 — Tamper-Evident Admin Action Logging**:
   - Wire all admin mutations (`setUserActive`, `setUserVerified`, password resets, system setting edits) into `admin_audit_logs`.
   - Implement audit log viewer table with filtering by action and date range.

- **Dependencies**: Phase 1 and Phase 2 completed.
- **Estimated Effort**: Large (4–5 days).
- **Acceptance Criteria**:
  - Clicking "Print Pedigree Certificate" downloads a formatted PDF with clean typography, borders, and QR code.
  - Scanning the generated QR code on a mobile phone opens the public chicken profile without requiring login.
  - Admin Health Console correctly identifies test data inconsistencies and displays green checks when data is pristine.
  - Every admin toggle generates an immutable row in `admin_audit_logs`.

---

### Phase 4: "Professional Finish & Operational Readiness"
**Goal**: Guarantee backup reliability, operational continuity, and complete documentation for reviewers.

#### Tasks:
1. **P4.1 — Automated Off-Site Database Backup Workflow**:
   - Set up GitHub Actions scheduled workflow (`.github/workflows/db-backup.yml`) running daily at midnight.
   - Connects to Supabase Postgres via service connection, dumps schema and data to encrypted artifact or external storage.
2. **P4.2 — Demo Seed Data Generator**:
   - Create clean, realistic seed script (`scripts/seed-demo-farms.ts`) provisioning two distinct farms:
     - **Farm A (Anilao Gamefarm)**: 3 Foundation Sires, 7 Foundation Dams, 19 Offspring across 3 seasons, 15 logged matches with realistic win rates.
     - **Farm B (Gemstone Breeders)**: 2 Foundation Sires, 4 Foundation Dams, 12 Offspring, completely isolated.
3. **P4.3 — Comprehensive Architecture & API Documentation**:
   - Create `docs/ARCHITECTURE_AND_ERD.md` with full Mermaid database diagrams and security model.
   - Create `docs/ADMIN_OPERATIONS_MANUAL.md` detailing user management, incident handling, and system recovery.

- **Dependencies**: Phases 1–3 completed.
- **Estimated Effort**: Medium (2–3 days).
- **Acceptance Criteria**:
  - Backup workflow executes successfully and produces a restorable `.sql` snapshot.
  - Seed script can be run on fresh database to immediately instantiate two fully populated demo farms with zero overlaps.
  - Complete documentation repository accessible in `docs/`.

---

## F. Demo-Day Checklist & Presentation Script

### 1. Pre-Flight Technical Checklist
- [ ] Database contains realistic data for two distinct farms (Anilao Farm and Gemstone Breeders).
- [ ] Active Chicken Registry card shows exact counts matching tabs: 29 Active (3 Breeding Male, 7 Breeding Female, 19 Non-Breeding).
- [ ] Whole flock line reads: "31 total · 1 archived · 1 deceased" with working status filter links.
- [ ] Browser console is 100% free of warnings and React errors.
- [ ] Both Dark and Light themes render with high contrast and no illegible text.
- [ ] Mobile responsive view tested on iPhone/Android viewport.
- [ ] Offline/verified backup JSON downloaded and placed on local presentation machine.

---

### 2. Ten-Minute Demo Script

#### Minute 0:00 – 2:00 | Introduction & The Farm Problem
- **Presenter**: *"GalloTrack solves the fundamental challenge in Philippine gamefowl breeding: tracking authentic lineage and empirical fight records without data drift or lost heritage."*
- **Screen**: Open Dashboard on **Anilao Farm**. Point to the **Active Chicken Registry card**.
- **Demonstration**:
  1. Highlight the clean role-based architecture: **3 Breeding Males (Sires)**, **7 Breeding Females (Dams)**, **19 Non-Breeding (Offspring)**.
  2. Explain the flock reconciliation: $3 + 7 + 19 = 29\text{ Active chickens} + 1\text{ Archived} + 1\text{ Deceased} = 31\text{ Total Flock}$.
  3. Click **"Breeding Male: 3"** $\rightarrow$ instantly transitions to Registry filtered to sires with numeric identifiers `[1]`, `[2]`, `[3]`.

#### Minute 2:00 – 4:30 | The Complete Breeding & Lineage Lifecycle
- **Screen**: Open **Register Chicken Form**.
- **Demonstration**:
  1. Show how selecting Sire `Iron Lemon [1]` and Dam `Golden Pearl [A]` automatically calculates the next offspring code `[1A5]` via atomic sequence locking.
  2. Show bloodline inheritance calculation: 50% Lemon + 50% Roundhead = 100% verified composition.
  3. Navigate to **Lineage Directory $\rightarrow$ Pedigree Tree**:
     - Expand `Sweater Bolt [2B2]`.
     - Show 3-generation ancestry showing parents, grandparents, and win-rate badges.
  4. Click **Print Pedigree Certificate**:
     - Show generated PDF with official farm seal and QR verification tag.

#### Minute 4:30 – 6:30 | Multi-Farm Isolation & Security Verification (The "Panel Wow" Moment)
- **Presenter**: *"In multi-tenant breeding systems, proprietary bloodline data and match betting intelligence must be strictly isolated between competing farms."*
- **Demonstration**:
  1. In the current browser window, show Anilao Farm's private flock (31 chickens).
  2. Open an Incognito window and log in as **Gemstone Breeders** (`booterrcap@gmail.com`).
  3. Show Gemstone Breeders' registry: completely separate fowls, separate match history, separate strain library.
  4. Open Network Tab: inspect API responses to prove that PostgreSQL Row Level Security rejects any cross-tenant data requests at the database engine level.

#### Minute 6:30 – 8:30 | The Administrator Governance Console
- **Screen**: Log in as **System Administrator** (`datoonhazel092@gmail.com`) $\rightarrow$ `/admin`.
- **Demonstration**:
  1. Open **System Health & Integrity Dashboard**: Show automated health scan verifying 0 orphan records, 0 duplicate wing bands, and 100% count reconciliation.
  2. Open **User Management**: Demonstrate activating a pending farm and assigning verification badges.
  3. Open **Audit Log Viewer**: Show tamper-evident log capturing the administrative action with exact timestamp and admin ID.

#### Minute 8:30 – 10:00 | Reliability, Backup & Conclusion
- **Screen**: Navigate to **Admin Settings $\rightarrow$ Data Backup**.
- **Demonstration**:
  1. Demonstrate one-click verified JSON backup export.
  2. Conclude: *"GalloTrack provides farm owners with verifiable genetic pedigree integrity and gives administrators robust multi-tenant governance. Thank you, and we welcome your questions."*

---

## G. Risks If Left Unfixed & What NOT to Build

### Risks If Left Unfixed:
1. **Broken Pedigrees upon Renaming**: Because sires and dams are linked by text names, any typographical correction to a foundation rooster's name will silently orphan all its children across the pedigree tree.
2. **Public Image Scraping**: Public storage buckets expose proprietary farm rooster photography to external scraping and unauthorized commercial re-use.
3. **Audit Blind Spots**: Without active audit logging in `admin_audit_logs`, accidental administrative deactivations or data resets cannot be traced or resolved.
4. **Panel Scrutiny on Win Rates**: Presenting un-fought chickens with 0% win rates or claiming 100% win rates on a single match without sample size warnings will be immediately challenged by technical reviewers.

### What NOT to Build (Avoid Scope Creep & Distraction):
1. **DO NOT build algorithmic "AI Fight Predictors"**: Match outcomes involve physical conditioning, handler skill, and chance. Claims of AI predictive fight victory lack scientific validity and will invite skepticism from industry professionals.
2. **DO NOT build an in-app e-commerce payment gateway**: Sabong livestock transactions in the Philippines require specialized logistics, health permits, and local payment channels. Building an in-app checkout adds legal and payment-gateway complexity without core breeding value.
3. **DO NOT build social feeds or public comment sections**: Community moderation requires 24/7 moderation overhead. Keep the platform strictly focused on professional farm management, lineage verification, and verified record sharing.

---

## H. Execution Prompts for Opencode (Safe Step-by-Step Implementation)

Copy and paste each prompt sequentially to implement the roadmap phases safely. Each prompt enforces preview and verification gates before altering code or schema.

---

### Prompt for Phase 1: "Trust the Data and Isolate the Farms"

```text
Task: Implement Phase 1 of docs/IMPROVEMENT_ROADMAP.md ("Trust the Data and Isolate the Farms").

Strict Guidelines:
- Follow AGENTS.md.
- Do NOT delete or mutate existing fowl or match rows.
- Provide a preview of all SQL statements and file diffs before making changes.

Execution Steps:
1. STORAGE SECURITY: Inspect Supabase storage buckets. Update `fowl-images` bucket to private. Ensure image fetching in `lib/services/media-service.ts` and UI components uses signed URLs via `signMediaUrl` with appropriate caching.
2. STRAIN ISOLATION: Update RLS policies on `strains` and `leg_colors` in a new migration `supabase/migrations/20261011000000_secure_strains_and_storage.sql`. Authenticated users may read official strains (is_custom=false) and their own (created_by=auth.uid()). Disallow non-admins from mutating official strains.
3. RELATIONAL INTEGRITY: Create migration `supabase/migrations/20261011000001_enforce_parent_foreign_keys.sql` adding `sire_id` and `dam_id` foreign keys with ON DELETE RESTRICT. Run an idempotent backfill mapping existing text sire/dam names to matching same-user fowl IDs.
4. ROUTE PROTECTION: In `gallotrack-next/proxy.ts`, remove `'/api'` from `PUBLIC_PREFIXES`. Whitelist only public subpaths (`/api/share/*`). Ensure all other API calls require valid auth tokens.
5. TEST FIX: Update `components/profiling/FowlLists.test.tsx` mock data to conform to the `roleOf` invariant so all 10 tests pass.

After completion:
- Run `npm run check:exclusivity`, `npm run typecheck`, and `npx vitest run`.
- Confirm all tests pass and report status.
```

---

### Prompt for Phase 2: "Smooth Flow & Unified Business Rules"

```text
Task: Implement Phase 2 of docs/IMPROVEMENT_ROADMAP.md ("Smooth Flow & Unified Business Rules").

Strict Guidelines:
- Follow AGENTS.md.
- Do NOT change raw database values.

Execution Steps:
1. WIN RATE UNIFICATION: In `lib/helpers.ts`, refactor `winRateOf` to wrap `computeWinRate` from `lib/win-rate.ts`. In `components/MarketplacePage.tsx`, remove local `getWinRate` and use `computeWinRate`. Ensure chickens with 0 decided matches display null ("—" or "No fights"), never 0%.
2. LOW SAMPLE WARNINGS: Add a visual indicator chip ("Low sample" / "1 match") next to any win rate badge where decided matches < 3, in Inventory cards, Fowl Details Modal, and Lineage cards.
3. CLEAN DASHBOARD COPY: In `components/DashboardPage.tsx`, remove decorative "LIVE" and "REGISTERED" badges. Fix "Upcoming Milestones" header copy to accurately state "N overdue · N in the next 30 days" and hide when 0.
4. BREEDING HUB PARENT GUARD: In `components/BreedingHub.tsx`, ensure the parent selector dropdowns filter out chickens marked Deceased or Archived. Display a warning if an active pairing contains an inactive parent.

After completion:
- Run `npm run gate:static`, `npm run typecheck`, and `npx vitest run`.
- Report before and after UI screenshots or diffs.
```

---

### Prompt for Phase 3: "Standout Features for Demo Day"

```text
Task: Implement Phase 3 of docs/IMPROVEMENT_ROADMAP.md ("Standout Features for Demo Day").

Strict Guidelines:
- Follow AGENTS.md.
- Create modular components without bloating existing pages.

Execution Steps:
1. PEDIGREE CERTIFICATE EXPORT: Create `components/modals/PedigreeCertificateModal.tsx` and export service in `lib/services/certificate-service.ts`. Allow farm owners to export a formatted printable PDF pedigree document for any active chicken, including 3-generation lineage, bloodline breakdown, physical traits, and verification QR code.
2. CAGE TAG QR CODE: In `components/modals/FowlDetailsModal.tsx`, add a "Print Cage Tag" action that generates a printable 3"x2" card with chicken bird code, name, wing band, and a QR code linking to `/share/[token]`.
3. ADMIN SYSTEM HEALTH CONSOLE: In `app/(dashboard)/admin/page.tsx`, create a "System Health" tab that runs diagnostic checks:
   - Identifies orphan parent text strings.
   - Identifies duplicate wing bands.
   - Verifies registry count reconciliation across all tenants.
4. ADMIN AUDIT TRAIL: In `lib/admin.ts` and `app/api/admin/users/route.ts`, record every user activation, deactivation, status change, and password reset into `admin_audit_logs`. Render the live audit log in `app/(dashboard)/admin/audit-logs/page.tsx`.

After completion:
- Run `npm run typecheck`, `npm run lint`, and verify all routes build cleanly.
```

---

### Prompt for Phase 4: "Professional Finish & Operational Readiness"

```text
Task: Implement Phase 4 of docs/IMPROVEMENT_ROADMAP.md ("Professional Finish & Operational Readiness").

Strict Guidelines:
- Follow AGENTS.md.
- Do NOT commit secret values or private keys.

Execution Steps:
1. AUTOMATED DB BACKUP: Create `.github/workflows/db-backup.yml` to trigger a daily automated schema and data dump to an encrypted artifact.
2. DEMO SEED DATA SCRIPT: Create `scripts/seed-demo-farms.ts` that provisions two realistic, fully populated demonstration farms (Anilao Farm and Gemstone Breeders) with realistic bloodlines, pairings, matches, and zero overlap.
3. ARCHITECTURE & OPERATIONS DOCS: Create `docs/ARCHITECTURE_AND_ERD.md` with complete Mermaid database diagrams and security policies, and `docs/ADMIN_OPERATIONS_MANUAL.md` covering onboarding, governance, and backup recovery.

After completion:
- Run full CI gate: `npm run gate` (`standard-gates`, `typecheck`, `lint`, and `test`).
- Confirm demo-day readiness.
```
