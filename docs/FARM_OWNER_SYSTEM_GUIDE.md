# GalloTrack: Complete Farm Owner System Guide

## Summary of the Whole System

1. GalloTrack is a dedicated gamefowl farm management web platform designed for serious breeders and cockerels.
2. It tracks bloodlines, family lineages, breeding pairs, growth milestones, health traits, and fight records.
3. As the Farm Owner, you have complete administrative authority over your farm's records, pedigree trees, and media.
4. Your chickens are tagged using an established breeding coding scheme: counting numbers for sires, letters for dams, and composite codes for offspring.
5. Every physical bird can also carry its real-world metal wing band ID to connect the computer screen to the physical pen.
6. The system automatically computes recursive bloodline percentages and backcross purity (F-scale) from parentage.
7. Matches are logged with outcomes, injury conditions, locations, notes, and private, owner-only videos and photos.
8. The Breeding Hub analyzes actual combat win rates and injury survivability to rate sire-dam crosses as Elite, Solid, or Under-Performing.
9. All your data is saved in a cloud PostgreSQL database with owner-isolated security policies ensuring privacy between farms.
10. The platform allows full export and backup restore, safeguarding decades of generational breeding history.

---

## Page & Navigation Map

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           GALLOTRACK SIDEBAR & TOP BAR                          │
│  [Logo] GALLOTRACK v1.0.0             [Active Status: ACCESS ACTIVE]            │
│  [User: Farm Owner Name]              [Farm: Your Farm Name]                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ├── 1. Dashboard (/dashboard)                                                  │
│  │    ├── Date Range Picker (Presets & Custom Range)                            │
│  │    ├── Export & Reports Menu (CSV Exports, Print Report, Data Sync)          │
│  │    ├── Active Chicken Registry Card (Total, Males, Females, Sparkline Trend) │
│  │    ├── Total Matches Logged Card (Total, Monthly Bar Chart, Weekly Trend)    │
│  │    ├── Overall Win Rate Card (Win/Loss Count, Trend Line, Per-Bird Modal)    │
│  │    ├── Quick Actions (+ Register New Chicken, + Log Match Result)            │
│  │    ├── Upcoming Milestones Card (30-day Growth Events & Maturity)            │
│  │    ├── Bloodline Overview Card (Active Counts by Strain, Ratio Bars)         │
│  │    ├── Population & Performance Trends Chart (Dual-Axis 6-Month Trajectory)  │
│  │    ├── Bloodline Win Ratios Doughnut Chart (Empirical Strain Share)          │
│  │    ├── Breeding Pair Performance Analytics Table (Sire × Dam Matrix)         │
│  │    └── Historical Analytics Match Logs Table (Recent Encounters)             │
│  │                                                                              │
│  ├── 2. Chicken Registry (/profiling)                                           │
│  │    ├── Top Action: "+ Register Chicken" (Toggles Step 1-3 Encode Form)       │
│  │    ├── Top Action: "Breeds" (Manages Custom Strains & Leg Colors)            │
│  │    ├── Tab: Breeding Male (Active Foundation & Promoted Sires)               │
│  │    ├── Tab: Breeding Female (Active Foundation & Promoted Dams)              │
│  │    ├── Tab: Non-Breeding (Active Offspring with Parentage)                   │
│  │    ├── Tab: Match Logs (Record Fight Form & Historical Battle Log)           │
│  │    ├── Tab: Sire Material (Prospect Birds for Future Breeding)               │
│  │    └── Controls: Search Filter, Parent Filter, Sort by Code/Name/Age         │
│  │                                                                              │
│  ├── 3. Chicken Inventory (/catalog)                                            │
│  │    ├── Status Tab: All (Complete Headcount across all statuses)              │
│  │    ├── Status Tab: Active (Alive, Active Roster on Farm)                     │
│  │    ├── Status Tab: Breeding Ready (Active + Mature ≥8 Months)                │
│  │    ├── Status Tab: Archived (Sold, Transferred, or Retired Birds)            │
│  │    ├── Status Tab: Deceased (Mortality Log with Documented Causes)           │
│  │    └── Controls: Role Filters, Search Bar, Natural Sort, Restore Buttons     │
│  │                                                                              │
│  ├── 4. Lineage Directory (/lineage)                                            │
│  │    ├── Tab: Family Tree (Visual Hierarchy from Founders Down)                │
│  │    ├── Tab: Full Siblings & Families (Grouped by Exact Sire × Dam Couple)    │
│  │    ├── Tab: Sire Offspring Tree (All Progeny Sired by Each Rooster)          │
│  │    ├── Tab: Dam Offspring Tree (All Progeny Produced by Each Hen)            │
│  │    └── Tab: Pedigree / Ancestors (4-Generation Ancestral Pedigree Box Chart) │
│  │                                                                              │
│  ├── 5. Breeding Hub (/breeding)                                                │
│  │    ├── Section: Coding System Explainer (Sire #, Dam Letter, Offspring Code) │
│  │    ├── Section: Active Breeding Pairs (Pairing Code, Duration, Outcome)      │
│  │    ├── Section: New Breeding Pair Planner (Mating Compatibility & Checks)    │
│  │    ├── Section: Breeding Pair Analytics (Win Rate, Survivability, Verdict)  │
│  │    └── Section: Safety & Hazard Incidents (Pen Fights, Escapes, Injuries)    │
│  │                                                                              │
│  ├── 6. My Profile (/profile)                                                   │
│  │    ├── Profile Avatar Upload with Interactive Cropping Tool                  │
│  │    ├── Farm Name, Owner Full Name, and Contact Number                        │
│  │    └── Account Password & Login Security Settings                            │
│  │                                                                              │
│  └── Top Bar & Global Controls                                                  │
│       ├── Connection Status: "PostgreSQL Connected" (Live Supabase Link)        │
│       ├── Settings Gear Icon (/settings: Units, Preferences, JSON Backup)       │
│       ├── Theme Toggle (Sun/Moon: Dark Mode vs Light Mode)                      │
│       └── Log Out Button (Clears Active Session Token)                          │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 0. Big Picture

### What GalloTrack Is For
1. **Lineage Preservation**: Records exact father-and-mother genealogy so you never lose track of a bloodline over decades.
2. **Breeding Decision Support**: Connects fight outcomes of offspring back to their parents to tell you which breeding pairs are worth repeating.
3. **Physical and Digital Identification**: Unifies computer bird codes, real-world metal wing bands, and photo archives.
4. **Health and Milestone Tracking**: Automatically calculates growth stages, feeding transitions, vaccination dates, and fight conditioning windows.
5. **Private Farm Record Keeping**: Keeps all derby match videos, sparring notes, and financial listings isolated to your farm account.

### Technology Stack in Simple Words
- **Frontend (What You See)**: Built with Next.js 16 and React 19. It runs directly in your web browser or phone, providing instant searches and live charts without full page refreshes.
- **Backend (Behind the Curtain)**: Next.js server routes that calculate statistics, generate CSV files, and process media tokens.
- **Database**: Supabase PostgreSQL 15. A high-performance, relational database that enforces rules, calculates sequences, and keeps records permanently safe.
- **Storage**: Supabase Object Storage buckets. Dedicated cloud hard drives that store bird photos (`fowl-images`), fight videos (`match-videos`), and match photos (`match-photos`).

### Authentication, Ownership, and Global Controls
- **Login Mechanism**: Handled via Supabase Authentication in [gallotrack-next/app/auth/login/page.tsx](file:///c:/Users/angelica/Desktop/GalloTrack-Web/gallotrack-next/app/auth/login/page.tsx). When you sign in with your email and password, the server issues an encrypted JSON Web Token (JWT) session stored securely in browser cookies.
- **What "Farm Owner" Means**: In the database table `profiles` (column `role`), you are designated as `'farm_owner'`. As owner, you see full farm records, can edit all birds, manage breeding pens, export backups, and change farm settings. *(Note: System administrators have `role = 'admin'` and can inspect user accounts and server statistics across farms).*
- **How Farms and Users Are Connected**:
  - The `profiles` table stores your user ID (`id` matching `auth.users.id`), `farm_name`, `full_name`, and `avatar_url`.
  - The `farms` table stores your farm identity (`user_id` / `owner_id`, `farm_name`).
  - Every single operational table (`fowl`, `breeding_pairings`, `match`, `safety_incidents`, `share_links`) contains a `user_id` column.
  - **Database Row-Level Security (RLS)** in [supabase/migrations/20260804000000_consolidate_owner_isolation.sql](file:///c:/Users/angelica/Desktop/GalloTrack-Web/supabase/migrations/20260804000000_consolidate_owner_isolation.sql) enforces `USING (auth.uid() = user_id)`. You can never see or modify another farm owner's chickens, and they can never see yours.
- **"ACCESS ACTIVE" and Sidebar Indicators**:
  - Located in [gallotrack-next/app/(dashboard)/layout.tsx:161-170](file:///c:/Users/angelica/Desktop/GalloTrack-Web/gallotrack-next/app/%28dashboard%29/layout.tsx#L161-L170).
  - Displays a green indicator dot and `Access Active` if your database session is authenticated and in good standing. If your account is suspended or logged out, it switches to red `Access Restricted`.
  - Shows your registered farm name directly underneath.
- **Top Bar Controls**:
  - **PostgreSQL Connected**: Confirms real-time live connection to your Supabase PostgreSQL cluster.
  - **Settings Gear Icon**: Opens `/settings` where you can set measurement units (kg/lbs, cm/in), default fight preferences, and export full JSON database backups.
  - **Theme Toggle (Sun/Moon)**: Uses `next-themes` to toggle between a dark cockpit theme and a clean daylight theme.
  - **Log Out Button**: Runs `supabase.auth.signOut()`, invalidates your local access token, and redirects you to the login screen.

---

## 1. Dashboard

The Dashboard is located in [gallotrack-next/components/DashboardPage.tsx](file:///c:/Users/angelica/Desktop/GalloTrack-Web/gallotrack-next/components/DashboardPage.tsx). It gives an executive overview of farm inventory, active fight records, growth events, and genetic win ratios.

```text
┌────────────────────────────────────────────────────────────────────────────────┐
│                          CHICKEN FARM DASHBOARD                                │
│ [Date Range: All Time ▾]                               [Export & Reports ▾]    │
├─────────────────────┬─────────────────────┬───────────────────┬────────────────┤
│ ACTIVE CHICKENS     │ TOTAL MATCHES       │ OVERALL WIN RATE  │ QUICK ACTIONS  │
│        42           │        18           │       72%         │ + Register Fowl│
│ 12 Males · 15 Females│ 13 Wins · 5 Losses  │ (Click Breakdown) │ + Log Match    │
│ [~ Sparkline Trend] │ [|| Monthly Bars]   │ [~ Win Trajectory]│                │
├─────────────────────┴─────────────────────┴───────────────────┴────────────────┤
│ UPCOMING MILESTONES (Next 30 Days)        │ BLOODLINE OVERVIEW (Active Strains)│
│ • Roundhead Storm #12: Stag (in 4d)       │ • Sweater: 16 chickens (45%)       │
│ • Kelso Gold #18: Mature Cock (in 12d)    │ • Roundhead: 12 chickens (35%)     │
├───────────────────────────────────────────┴────────────────────────────────────┤
│ CHICKEN POPULATION & PERFORMANCE TRENDS (Dual-Axis 6-Month Chart)              │
│ ── Population (Green Area)          - - - Win Rate % (Blue Dashed)             │
├───────────────────────────────────────────┬────────────────────────────────────┤
│ BLOODLINE WIN RATIOS (Doughnut Chart)     │ BREEDING PAIR MATRIX               │
│ Sweater Cross: 75% Win Share              │ Sire 1 × Dam A: 80% Win Rate (Elite│
│ Roundhead Cross: 60% Win Share            │ Sire 2 × Dam B: 40% (Under-perform)│
├───────────────────────────────────────────┴────────────────────────────────────┤
│ HISTORICAL ANALYTICS MATCH LOGS TABLE (Recent Derby Encounters)                │
└────────────────────────────────────────────────────────────────────────────────┘
```

### Every Widget Explained

#### 1. Header Bar: Date Range Picker & Export Menu
- **Date Range Picker**:
  - Component: [DateRangePicker.tsx](file:///c:/Users/angelica/Desktop/GalloTrack-Web/gallotrack-next/components/DateRangePicker.tsx).
  - Presets: All Time, This Month, Last Month, Last 90 Days, Year to Date, Custom Date Range.
  - Affects: Match statistics, win rates, monthly activity charts, and fight log tables. It does **not** hide living chickens from the current headcount.
- **Export & Reports Dropdown**:
  - Handled in [report-export.ts](file:///c:/Users/angelica/Desktop/GalloTrack-Web/gallotrack-next/lib/report-export.ts).
  - **Export matches (CSV)**: Downloads all fight records as a spreadsheet (`Date, Our Chicken, Opponent, Breed, Outcome, Condition, Notes`).
  - **Export registry (CSV)**: Downloads your complete flock roster (`Bird Code, Name, Gender, Breed, Birthdate, Age, Status, Weight, Height, Sire, Dam, Bloodline %`).
  - **Print report**: Generates a clean, printable PDF report summary of your flock metrics and pedigree ratios.
  - **Sync Data**: Triggers an immediate re-fetch from the database.

#### 2. Active Chicken Registry Card
- **What it shows**: Total living, active chickens currently on the farm, broken down into Breeding Males and Breeding Females.
- **Data Source**: Table `fowl` where `status = 'Active'` (via `activeFowls` in [fowl-context.tsx:84](file:///c:/Users/angelica/Desktop/GalloTrack-Web/gallotrack-next/lib/contexts/fowl-context.tsx#L84)).
- **Exact Formula**:
  - Total = Count of birds where `status = 'Active'`.
  - Breeding Males = Count where `status = 'Active'` and gender is Rooster/Male.
  - Breeding Females = Count where `status = 'Active'` and gender is Hen/Female.
  - Trend Badge = Count of active birds created in the last 7 days (`Date.now() - created_at < 7 days`).
- **Date Range Effect**: Unaffected (reflects current living inventory).
- **Empty State**: Displays `0` with the label `"No active chickens yet"`.

#### 3. Total Matches Logged Card
- **What it shows**: Total fight encounters logged in the system, plus a monthly bar graph of fight volume.
- **Data Source**: Table `match` filtered by selected date range.
- **Exact Formula**: Count of rows in `match` matching your farm `user_id`.
- **Date Range Effect**: Fully filtered by the chosen date range.
- **Empty State**: Displays `0` with the label `"No matches logged yet"`.

#### 4. Overall Win Rate Card
- **What it shows**: Aggregate fight winning percentage with wins and losses counter (`14W · 4L`). Clicking this card opens an interactive modal showing win rate broken down per individual bird.
- **Data Source**: Table `match` (column `outcome`).
- **Exact Formula**:
  $$\text{Win Rate \%} = \text{Round}\left(\frac{\text{Wins}}{\text{Wins} + \text{Losses}} \times 100\right)$$
  *(Important: Draws are recorded in fight history but excluded from the win percentage divisor).*
- **Date Range Effect**: Fully filtered by the chosen date range.
- **Empty State**: Displays `—` when no decided fights exist.

#### 5. Quick Actions Card
- **What it shows**: Two one-click shortcuts:
  - **+ Register New Chicken**: Directs to the Registry registration form.
  - **+ Log Match Result**: Directs to the Match Logs fight recorder.
- **Data Source**: Navigation action.
- **Date Range Effect**: None.

#### 6. Upcoming Milestones Card
- **What it shows**: Chickens approaching biological or conditioning milestones within the next 30 days (e.g. chick to stag transition at 6 months, conditioning milestone at 8 months, or overdue growth stages).
- **Data Source**: Derived from `fowl.birthdate` and `fowl.growth_stage` via [helpers.ts (line 22)](file:///c:/Users/angelica/Desktop/GalloTrack-Web/gallotrack-next/lib/helpers.ts#L22).
- **Exact Formula**: Days until milestone = $\text{Milestone Target Date} - \text{Today}$.
- **Date Range Effect**: Unaffected (looks ahead 30 days from today).
- **Empty State**: Card collapses automatically if no milestones are due in the next 30 days.

#### 7. Bloodline Overview Card
- **What it shows**: Top 5 genetic strains in your active flock with headcount and sex distribution.
- **Data Source**: Derived from `fowl.breed` on all active birds.
- **Exact Formula**: Splits comma-separated strains in `fowl.breed`, sums occurrences, and calculates percentage share of total active birds.
- **Date Range Effect**: Unaffected.
- **Empty State**: Displays `"No strain data yet."`

#### 8. Chicken Population & Performance Trends Chart
- **What it shows**: Dual-axis line graph across the past 6 calendar months:
  - Left axis (green filled line): Active flock population.
  - Right axis (blue dashed line): Monthly win rate percentage.
- **Data Source**: Monthly grouping of `fowl.created_at` and `match.date`.
- **Date Range Effect**: Shows trailing 6 months from the selected date range.
- **Empty State**: Shows an icon placeholder: `"No data available. Encode chickens and log matches to visualize trends."`

#### 9. Bloodline Win Ratios Doughnut Chart
- **What it shows**: Pie breakdown of which primary genetic strains produce the most wins in the pit.
- **Data Source**: Joins `match.breed` with `match.outcome = 'Win'`.
- **Exact Formula**: Win share per strain = $(\text{Wins for Strain} \div \text{Total Decided Wins}) \times 100$.
- **Date Range Effect**: Filtered by date range.
- **Empty State**: Displays `"No data available. Log match records to generate bloodline win ratio breakdowns."`

#### 10. Breeding Pair Performance Analytics Table (Sire × Dam Matrix)
- **What it shows**: Ranking of every recorded breeding couple based on the combat record of their children:
  - Columns: Rank, Sire × Dam Cross, Offspring Count, Total Fights, Wins, Losses, Win Rate %, Survivability %, and Breeding Verdict.
- **Data Source**: Computed dynamically in [win-rate.ts](file:///c:/Users/angelica/Desktop/GalloTrack-Web/gallotrack-next/lib/win-rate.ts) by linking `match.entry_name` to `fowl.name`, then grouping by `fowl.sire` and `fowl.dam`.
- **Verdict Formula**:
  - **Elite — Repeat Cross**: Win Rate $\ge 70\%$ with at least 5 decided fights.
  - **Solid Pairing**: Win Rate $\ge 50\%$.
  - **Under-Performing**: Win Rate $< 50\%$ with at least 5 decided fights.
  - **Inconclusive**: Fewer than 5 fights logged.
  - **Survivability Score**: Resilience index based on post-fight conditions (Fit = 100, Minor Injury = 70, Critical = 30, Deceased = 0).
- **Date Range Effect**: Filtered by date range.
- **Empty State**: Table is hidden if no paired offspring have logged fights.

#### 11. Historical Analytics Match Logs Table
- **What it shows**: Recent arena fights with date, entry name, opponent, breed, outcome badge (Win/Loss/Draw), and quick link to view full fight media.
- **Data Source**: Most recent entries from table `match`.
- **Date Range Effect**: Filtered by date range.

---

## 2. Chicken Registry

The Registry is located in [gallotrack-next/components/ProfilingPage.tsx](file:///c:/Users/angelica/Desktop/GalloTrack-Web/gallotrack-next/components/ProfilingPage.tsx) and [gallotrack-next/components/profiling/FowlLists.tsx](file:///c:/Users/angelica/Desktop/GalloTrack-Web/gallotrack-next/components/profiling/FowlLists.tsx). It is your digital flock book.

### The Five Main Tabs
Tab switching is coordinated by [RegistryNav.tsx](file:///c:/Users/angelica/Desktop/GalloTrack-Web/gallotrack-next/components/profiling/RegistryNav.tsx) and single-source role selectors in [registry-roles.ts](file:///c:/Users/angelica/Desktop/GalloTrack-Web/gallotrack-next/lib/registry-roles.ts):

1. **Breeding Male**:
   - Contains: Active roosters designated for breeding.
   - Decided by: `fowl.status = 'Active'` AND (`fowl.registry_role = 'Breeding Male'` OR fallback role calculation where the male is Foundation Stock or already has recorded children).
   - Expected identifier: Integer numbers (`1, 2, 3, 4`).
2. **Breeding Female**:
   - Contains: Active broodhens designated for breeding.
   - Decided by: `fowl.status = 'Active'` AND (`fowl.registry_role = 'Breeding Female'` OR fallback role calculation where the female is Foundation Stock or has recorded children).
   - Expected identifier: Letters (`A, B, C, ... AA`).
3. **Non-Breeding**:
   - Contains: Active chicks, stags, pullets, and battlecocks produced from your breeding pens that are not yet parents themselves.
   - Decided by: `fowl.status = 'Active'` AND (`fowl.registry_role = 'Non-Breeding'` OR fallback role calculation where the bird has registered parents but no children of its own).
   - Expected identifier: Family combination codes (`1A1, 1A2, 2B1`).
4. **Match Logs**:
   - Contains: The derby and arena combat log recorder and historical fight tables.
5. **Sire Material**:
   - Contains: High-potential prospect stags or battlecocks being evaluated for future breeding duties.
   - Decided by: `fowl.breeding_role = 'material'` AND (`fowl.status = 'Active'` OR legacy status `'Sire Material'`).

### The Register Chicken Form Step-by-Step
Accessed by clicking the top `+ Register Chicken` button. Handled in [EncodeForm.tsx](file:///c:/Users/angelica/Desktop/GalloTrack-Web/gallotrack-next/components/profiling/EncodeForm.tsx).

- **Step 1: Core Identifiers**:
  - `Identifier Name` (Required): Unique text name for the bird. Checked for duplicates.
  - `Unique Chicken Identifier` (Auto-Generated): Displays the next sequential code. Can be manually edited by clicking "Edit identifier manually".
  - `Wing Band ID` (Optional): Physical metal band code stamped on the wing (`max 24 characters`, alphanumeric plus `.-_`). Checked for duplicates per farm.
  - `Genetic Strain` (Required): Searchable tag selector. Pick known breeds (e.g. Sweater, Kelso, Hatch) or type a new custom strain name.
  - `Gender Class` (Required): Dropdown choice between **Sire** (Rooster) or **Dam** (Hen).
- **Step 2: Physical Parameters**:
  - `Birth Date` (Required): Calendar picker. Cannot be in the future.
  - `Age (Mos)` (Required / Auto-calculated): Computed automatically from birth date (`total months`).
  - `Growth Stage` (Auto-computed / Editable): Chick (<3 mos), Stag/Pullet (<6 mos), Bull Stag (<12 mos), Cock/Hen (≥12 mos).
  - `Height` & `Weight` (Optional): Positive decimals. Automatically converted and stored in standard units (cm and kg).
  - `Leg Color` (Optional): Yellow, White, Green / Slate, Willow, Black, or custom text.
- **Step 3: Ancestry Roots & Photo**:
  - `Sire (Father)`: Select from existing roosters in your flock or type a custom name. Leave blank for "Foundation Stock".
  - `Dam (Mother)`: Select from existing hens in your flock or type a custom name. Leave blank for "Foundation Stock".
  - `Existing Offspring & Siblings Box`: Displays real-time counts of full and half-siblings sharing these parents.
  - `Bloodline Split & Backcross Preview`: Dynamically computes the genetic inheritance percentage (50% Sire / 50% Dam) and backcross purity (F1 = 50%, F2 = 75%, F3 = 87.5%, F4+ = 93.75%+).
  - `Chicken Attachment Photo`: Optional image upload from your phone or computer.
- **Summary & Submit**:
  - Displays data completeness score (0–100%) and validation pass status.
  - Clicking **REGISTER** saves the record.

#### What Is Saved in the Database When Registering
The save process executes in [fowl-context.tsx:626-802](file:///c:/Users/angelica/Desktop/GalloTrack-Web/gallotrack-next/lib/contexts/fowl-context.tsx#L626-L802):
1. **Photo Storage**: If an image is selected, it uploads to Supabase Storage bucket `fowl-images` under `fowl/{timestamp}-{random}.ext`. The public web URL is generated.
2. **Counter Increment**: Calls database function `get_next_fowl_identifier` in [20261007000002_automatic_unique_identifiers.sql](file:///c:/Users/angelica/Desktop/GalloTrack-Web/supabase/migrations/20261007000002_automatic_unique_identifiers.sql) which locks and updates the counter in table `fowl_identifier_counters`.
3. **Chicken Insert**: Inserts a new row into table `fowl`:
   - `user_id`, `name`, `breed`, `gender`, `color`, `color_category`, `growth_stage`, `behavior_trait`, `eye_variant`, `birthdate`, `age`, `weight`, `height`, `leg_color`.
   - `sire`, `dam` (text snapshots).
   - `sire_id`, `dam_id` (resolved database integer IDs from existing birds).
   - `sire_pct`, `dam_pct` (legacy columns: 100 if foundation, 50 if parents).
   - `bloodline_pct`, `bloodline_composition` (JSON breakdown of strains).
   - `chicken_code`, `bird_code`, `wing_band`, `status = 'Active'`, `image_url`.
4. **Database Triggers**:
   - `fowl_autofill_pairing_id` checks table `breeding_pairings` and links `pairing_id` if a matching active pair exists.
   - `sync_pairing_offspring_seq` increments `breeding_pairings.offspring_seq` by 1.
5. **Strain Cache**: If custom strains were entered, saves them to table `strains`.

### Chicken Cards & Available Actions
Each card in the registry list shows the bird’s code, wing band tag, strain, gender, photo, age, sire, dam, and behavior trait.

- **Edit Button**:
  - Opens `EditChickenModal`. Allows updating name, breed, weight, height, color, leg color, birth date, wing band, and identifier.
  - Updates table `fowl`. Can be saved or cancelled anytime.
- **Archive Button**:
  - Opens `ArchiveModal`. Allows moving the chicken off the active roster without deleting its family history.
  - Prompts for a structured reason: Sold, Transferred, Inactive, Retired (from fighting, breeding, or both), or Other.
  - Updates `fowl.status = 'Archived'`, `fowl.activity_status = 'inactive'`, and logs an entry to table `fowl_status_history`.
  - **Can it be undone?** Yes! You can restore an archived chicken anytime from the Inventory page.
- **Deceased Button**:
  - Opens `MarkDeceasedModal`. Used when a chicken dies from illness, predator, or match injury.
  - Prompts for mortality cause (Illness / Disease, Old Age, Predator Attack, Match Injury, Heat Stress / Weather, or Other note).
  - Updates `fowl.status = 'Deceased'`, `fowl.condition_status = 'Deceased'`, and logs an entry to `fowl_status_history`.
  - **Can it be undone?** Yes, the Farm Owner can restore a deceased bird if recorded in error.
- **Set as Sire Material Button**:
  - Updates `fowl.breeding_role = 'material'` and `fowl.status = 'Sire Material'`. Moves the bird into the Sire Material evaluation tab.
- **Promote to Breeder Button** (On Offspring Cards):
  - Accessible on non-breeding offspring.
  - Prompts whether to promote to **Breeding Male** (assigns next sire number `1, 2, ...`) or **Breeding Female** (assigns next dam letter `A, B, ...`).
  - Preserves the original birth code in column `fowl.birth_code` (e.g. "born as 1A1"), updates `fowl.chicken_code`, sets `fowl.registry_role = 'Breeding Male'` or `'Breeding Female'`, and sets `breeding_role = 'breeder'`.

### Filters, Search, and Sorting
- **Search Bar**: Debounced instant search in [RegistryFilterBar.tsx](file:///c:/Users/angelica/Desktop/GalloTrack-Web/gallotrack-next/components/profiling/RegistryFilterBar.tsx). Searches by name, chicken identifier, wing band ID, and strain. Highlights matching letters in yellow.
- **Parent Filters**: Dropdown filters allowing you to filter the list to only birds sired by a specific rooster or mothered by a specific hen.
- **Sort Dropdown**: Sort by Identifier (natural sorting: 1, 2, 10, 1A1, 1A2), Name (A–Z), Age (oldest or youngest), and Data Completeness.

### The "Breeds" Button & Registry Options
Clicking the `Breeds` button in the top right opens `/breeds` ([app/(dashboard)/breeds/page.tsx](file:///c:/Users/angelica/Desktop/GalloTrack-Web/gallotrack-next/app/%28dashboard%29/breeds/page.tsx)):
- Allows managing your farm's strain directory (table `strains`). You can add custom gamefowl bloodlines (e.g. "Dink Fair Sweater", "McLean Hatch") or delete custom strains that are no longer used.
- Built-in industry strains cannot be deleted to prevent pedigree corruption.
- Leg color options (Yellow, White, Green / Slate, Willow, Black) can also be customized here and stored in table `leg_colors`.

### Match Logs Tab & Recording Fights
Clicking the `Match Logs` tab displays the battle recorder form and log history table ([MatchForm.tsx](file:///c:/Users/angelica/Desktop/GalloTrack-Web/gallotrack-next/components/profiling/MatchForm.tsx)).

#### The Record Fight Form Fields
- `Select Chicken` (Required): Dropdown of living chickens in your registry.
- `Match Date` (Required): Date the fight occurred.
- `Opponent Name` & `Opponent Breed` (Required): Opposing entry name and opposing rooster breed.
- `Match Location` (Optional): Arena or cockpit name (e.g. "San Juan Coliseum", "Davao Cockpit Arena").
- `Match Type` (Required): Derby Match, Hackfight / Regular, Sparring / Tupada, Championship.
- `Event Type` & `Derby Match Number` (Optional): Derby name and cock number in the derby lineup (e.g. Cock #3).
- `Bet Type & Target` (Optional): Betting category (durbe, lusok, contra, bulsay).
- `Match Outcome` (Required): Win, Loss, or Draw.
- `Post-Fight Condition` (Required): Fit / Recovered, Minor Injury, Severely Injured / Critical, Deceased (Died from injuries).
- `Fight Notes` (Optional): Description of style, cutting ability, gaffing placement, and timing.

#### Photo & Video Upload (Limits & Privacy)
- **Video Upload**:
  - Formats: MP4, MOV, WebM, MKV. Max file size: 100 MB per video.
  - Stored in: **Private** storage bucket `match-videos` under `{owner_user_id}/{match_id}-{filename}`.
  - First-frame poster: The browser automatically captures the opening video frame at upload time and saves a poster thumbnail to `match-photos`.
- **Photo Upload**:
  - Formats: JPG, PNG, WebP. Max file size: 10 MB per photo.
  - Stored in: **Private** storage bucket `match-photos`.
- **Database Tables Written**:
  - Main record written to table `match`: `user_id, fowl_id, entry_name, breed, opponent, opponent_breed, location, date, type, outcome, post_fight_condition, notes`.
  - Video records written to table `match_videos`: `match_id, video_url, poster_url`.
  - Photo records written to table `match_photos`: `match_id, photo_url`.

#### Match Sharing (Public, View-Only, Revocable)
- On any fight log row, click the **Share** button.
- The system generates an unguessable 64-character security token in table `share_links` ([app/api/share/[token]/route.ts](file:///c:/Users/angelica/Desktop/GalloTrack-Web/gallotrack-next/app/api/share/%5Btoken%5D/route.ts)).
- You receive a link like: `https://your-domain.com/share/a1b2c3d4...`
- **What a recipient sees**: A clean, view-only fight summary with the playable match video and photos. They cannot edit your data, cannot see your dashboard, and cannot access other chickens.
- **Video Security**: The server issues a temporary 1-hour signed URL for the private video file so unauthorized download links expire.
- **Revoke**: You can click **Revoke Link** anytime in the share modal. This deletes the token from `share_links`, immediately disabling the public link.

---

## 3. Chicken Inventory

The Inventory page is located at `/catalog` ([gallotrack-next/components/MarketplacePage.tsx](file:///c:/Users/angelica/Desktop/GalloTrack-Web/gallotrack-next/components/MarketplacePage.tsx)). It serves as your complete farm stock inventory and lifecycle archive.

```text
┌────────────────────────────────────────────────────────────────────────────────┐
│                             CHICKEN INVENTORY                                  │
│  [All (48)] [Active (42)] [Breeding Ready (24)] [Archived (4)] [Deceased (2)]  │
│  [Role Filter: All Roles ▾]           [Search chicken, band, strain...       ] │
├────────────────────────────────────────────────────────────────────────────────┤
│  [ CARD: Roundhead Storm ]              [ CARD: Iron Lemon ]                   │
│  • Status: Active · Compliance: Grade A • Status: Active · Compliance: Grade A │
│  • Tag: [1] · Wing Band: 🏷 W-001       • Tag: [4] · Wing Band: 🏷 W-004       │
│  • Rooster (Cock) · 24mo · 2.1kg        • Rooster (Bull Stag) · 10mo · 1.9kg   │
│  • Sire: Foundation Stock               • Sire: Roundhead Storm                │
│  • Dam: Foundation Stock                • Dam: Golden Pearl                    │
│  • Win Rate: 80% (4W · 1L)              • Win Rate: 100% (2W · 0L)             │
│  [ View Profile ]                       [ View Profile ]                       │
└────────────────────────────────────────────────────────────────────────────────┘
```

### Purpose and Status Tabs
While the Chicken Registry focuses on active breeding pens and registration, the Inventory page tracks every bird that has ever existed on your farm, including past champions and retired birds.

1. **All**: Shows all birds in your database regardless of status.
2. **Active**: Living chickens currently roaming the pens (`fowl.status = 'Active'`).
3. **Breeding Ready**:
   - **What it means**: Living birds that are biologically mature enough to breed.
   - **Formula in [registry-roles.ts:208-223](file:///c:/Users/angelica/Desktop/GalloTrack-Web/gallotrack-next/lib/registry-roles.ts#L208-L223)**: `status = 'Active'` AND (age $\ge 240$ days / ~8 months, OR mature growth stage: Cock, Hen, Bull Stag, Broodcock, Broodhen).
4. **Archived**: Birds that were sold to other breeders, transferred, or retired from duty (`fowl.status = 'Archived'`).
5. **Deceased**: Mortality archive of deceased birds (`fowl.status = 'Deceased'`).

### Card Fields and Information
Each card shows:
- Top color accent bar: Green for Active, Amber for Archived, Rose for Deceased.
- Breed Compliance Grade: Evaluates conformation standards (Grade A, B, C) based on expected weight, height, and leg color for that strain.
- Identifier tag, wing band, sex symbol, age, weight, height.
- Sire and Dam names with their respective breeds.
- Overall career win rate and record (`4W · 1L · 80%`).

### Restoring Archived and Deceased Birds
- On Archived cards, a **Restore** button is available.
- Clicking Restore runs `restoreFowl` in [fowl-service.ts:174](file:///c:/Users/angelica/Desktop/GalloTrack-Web/gallotrack-next/lib/services/fowl-service.ts#L174):
  - Sets `fowl.status = 'Active'` and `fowl.activity_status = 'active'`.
  - Clears archive reasons.
  - Logs a restoration audit event in `fowl_status_history`.
  - The chicken immediately reappears on your active registry and dashboard.
- On Deceased cards, the Farm Owner has an exclusive **Restore to Active** action to correct accidental mortality entries.

---

## 4. Lineage Directory

The Lineage Directory is located at `/lineage` ([gallotrack-next/components/LineageDirectory.tsx](file:///c:/Users/angelica/Desktop/GalloTrack-Web/gallotrack-next/components/LineageDirectory.tsx)). It calculates and draws the genetic pedigree of your farm.

### The Five Lineage Tabs

#### 1. Family Tree (`tree`)
- Component: [FamilyTree.tsx](file:///c:/Users/angelica/Desktop/GalloTrack-Web/gallotrack-next/components/FamilyTree.tsx).
- Displays a visual chart starting from your Foundation Stock birds at the top and branching downward into each succeeding generation.
- Nodes show bird codes, names, sex, and generational purity badges.

#### 2. Full Siblings & Families (`families`)
- Groups chickens by exact **Sire $\times$ Dam couples**.
- Every clutch of full brothers and full sisters sharing the same father and mother is grouped into an expandable card.
- Shows total family fights, aggregate family win rate, best performing sibling, and a full list of all brothers and sisters.

#### 3. Sire Offspring Tree (`sire`)
- Groups chickens by their father.
- Select any rooster to see every single hen he has been mated with and every son and daughter he has produced across all mating seasons.

#### 4. Dam Offspring Tree (`dam`)
- Groups chickens by their mother.
- Select any broodhen to see every rooster she was paired with and all progeny she produced.

#### 5. Pedigree / Ancestors (`pedigree`)
- Component: [PedigreeTree.tsx](file:///c:/Users/angelica/Desktop/GalloTrack-Web/gallotrack-next/components/PedigreeTree.tsx).
- Traditional 4-generation horizontal pedigree chart for any selected chicken:
  - **Generation 1**: Parents (Father 50%, Mother 50%).
  - **Generation 2**: Grandparents (Paternal Grandsire, Paternal Granddam, Maternal Grandsire, Maternal Granddam — 25% each).
  - **Generation 3**: Great-Grandparents (12.5% each).
  - **Generation 4**: Great-Great-Grandparents (6.25% each).
- Clicking any ancestor opens their complete profile.

### How Lineage Calculations Work
- **What "Foundation Stock" Means**: A bird whose ancestors were not born on your farm (e.g. purchased champion broodcock or imported hen). It has no parents recorded in your database (`sire_id` and `dam_id` are `NULL`). The system treats it as generation 0 with 100% purity of its own named strain.
- **Bloodline Percentage Engine**: Handled in [bloodline-composition.ts](file:///c:/Users/angelica/Desktop/GalloTrack-Web/gallotrack-next/lib/bloodline-composition.ts):
  - Traverses the pedigree tree upwards.
  - Takes 50% from the sire's bloodline map and 50% from the dam's bloodline map.
  - Example: A pure 100% Sweater sire paired with a pure 100% Kelso dam produces offspring with `{ "Sweater": 50, "Kelso": 50 }`.
  - If that 50/50 offspring is backcrossed to a pure Sweater sire, the next generation receives $50\% + 25\% = 75\%$ Sweater and $25\%$ Kelso.
- **Family Win Rates**: Handled in [win-rate.ts](file:///c:/Users/angelica/Desktop/GalloTrack-Web/gallotrack-next/lib/win-rate.ts):
  - Sums all wins and losses across every brother and sister in that family group to establish empirical bloodline cross viability.

---

## 5. Breeding Hub

The Breeding Hub is located at `/breeding` ([gallotrack-next/components/BreedingHub.tsx](file:///c:/Users/angelica/Desktop/GalloTrack-Web/gallotrack-next/components/BreedingHub.tsx)). It manages active mating pens and pairing recommendations.

### Sections in the Breeding Hub

#### 1. Coding System Explainer
- Interactive visual reference explaining the standard tagging scheme:
  - **Sires**: Numbers `1, 2, 3, 4`.
  - **Dams**: Letters `A, B, C` (skipping `X`).
  - **Offspring**: Combination `1A1, 1A2`.
  - **Unknowns**: `0` for unknown sire, `X` for unknown dam.

#### 2. Active Breeding Pairs List
- Shows all currently active mating pens on your farm.
- Cards show:
  - Pairing Code (e.g. `1A` or `2C`).
  - Sire profile link & Dam profile link.
  - Start date and active duration (e.g. "Active for 45 days").
  - Offspring count (live counter maintained by database triggers).
  - Status toggle: Active, Completed, or Discontinued.

#### 3. New Breeding Pair Planner
- Click **+ New Breeding Pair** to create a mating:
  - Pick a Sire and Dam from dropdowns of mature, active birds.
  - **Safety Conflict Detection**: The system warns you if either the sire or dam is already committed to another active breeding pair ([lineage.ts:pairingConflict](file:///c:/Users/angelica/Desktop/GalloTrack-Web/gallotrack-next/lib/lineage.ts)).
  - Automatically calculates the pairing code (e.g. Sire `2` + Dam `B` = `2B`).
  - Saved to table `breeding_pairings` with `outcome = 'Active'` and `start_date = today`.

#### 4. Breeding Pair Analytics & Recommendations
- Pinpoints high-performing genetic crosses:
  - Ranks pairs based on offspring win rates.
  - Flags **Elite crosses** to repeat and **Under-performing crosses** to dismantle.
  - Calculates post-fight survivability and resilience scores.

#### 5. Safety & Hazard Incidents
- Managed in [breeding-service.ts](file:///c:/Users/angelica/Desktop/GalloTrack-Web/gallotrack-next/lib/services/breeding-service.ts) and table `safety_incidents`.
- Allows logging pen accidents:
  - Types: Severe Hen Pecking / Aggression, Pen Wire Injury, Sickness, Pen Escape.
  - Severities: Minor, Moderate, Severe, Critical.
  - Status: Open, In Progress, Resolved.
- Alerts the farm owner to separate dangerous roosters and track veterinary recovery notes.

---

## 6. My Profile

The Profile page is located at `/profile` ([gallotrack-next/app/(dashboard)/profile/page.tsx](file:///c:/Users/angelica/Desktop/GalloTrack-Web/gallotrack-next/app/%28dashboard%29/profile/page.tsx)).

### What the Farm Owner Can Manage
- **Profile Picture**: Upload an avatar with an interactive zoom and crop tool (`react-easy-crop`). Uploads to Supabase Storage and saves to `profiles.avatar_url`.
- **Farm Name**: Updates your official farm branding across reports, certificates, and the sidebar. Saves to `profiles.farm_name` and syncs to `farms.farm_name`.
- **Full Name & Contact Number**: Updates your personal owner information in `profiles.full_name` and `profiles.phone_number`.
- **Account Password**: Allows changing your login password via Supabase Auth.

---

## 7. Behind the Scenes

### Database Architecture & Entity Relationships

```text
┌──────────────────────┐         1:N         ┌──────────────────────────────┐
│       profiles       │────────────────────<│             fowl             │
│ (id, farm_name, role)│                     │ (id, chicken_code, wing_band)│
└──────────────────────┘                     └──────────────────────────────┘
           │ 1:1                                       │ 1:N            │ 1:N
           ▼                                           ▼                ▼
┌──────────────────────┐                     ┌────────────────┐ ┌────────────────┐
│        farms         │                     │  fowl_photos   │ │ status_history │
│ (id, owner_id, name) │                     │ (fowl_id, url) │ │(fowl_id, reason│
└──────────────────────┘                     └────────────────┘ └────────────────┘
           │ 1:N                                       ▲ 1:N
           ▼                                           │
┌──────────────────────┐                     ┌──────────────────────────────┐
│  breeding_pairings   │────────────────────<│            match             │
│ (sire_id, dam_id)    │     produces        │(fowl_id, outcome, condition) │
└──────────────────────┘                     └──────────────────────────────┘
           │ 1:N                                       │ 1:N            │ 1:N
           ▼                                           ▼                ▼
┌──────────────────────┐                     ┌────────────────┐ ┌────────────────┐
│   safety_incidents   │                     │  match_videos  │ │  match_photos  │
│ (severity, status)   │                     │(video_url, ...)| │ (photo_url)    │
└──────────────────────┘                     └────────────────┘ └────────────────┘
```

### Table Dictionary
1. `profiles`: User account details, role (`farm_owner`), farm name.
2. `farms`: Primary farm registry linked to owner ID.
3. `fowl`: Master chicken table (identifiers, traits, measurements, parents, bloodlines).
4. `fowl_identifier_counters`: Atomic sequence counter ensuring unique codes per role and prefix.
5. `fowl_status_history`: Append-only audit history of status changes, archive reasons, and promotions.
6. `fowl_photos`: Secondary chicken gallery images.
7. `breeding_pairings`: Active and historical breeding pairs, pairing codes, and offspring counts.
8. `safety_incidents`: Breeding pen injuries, hazard records, and incident severity.
9. `match`: Fight encounter records (opponent, event type, date, outcome, condition).
10. `match_videos`: Video file URLs and poster frame thumbnails for fights.
11. `match_photos`: Fight photo URLs.
12. `share_links`: Cryptographic tokens for public, view-only match and bird shares.
13. `strains`: Master directory of built-in and custom farm gamefowl strains.
14. `leg_colors`: Master directory of selectable leg colors.
15. `admin_audit_logs`: Administrative actions log.

### Where Media Files Are Stored & Who Can View Them
- **`fowl-images` (Public Storage Bucket)**:
  - Stores chicken attachment photos.
  - Access: Publicly viewable image URLs so gallery profile cards and public marketplace listings render without token overhead.
- **`match-videos` (Private Storage Bucket)**:
  - Stores derby fight videos.
  - Access: **Private / Owner-Only**. Anonymous or direct HTTP access is blocked by storage policies. The logged-in Farm Owner is issued a short-lived 1-hour signed URL via [media-privacy.ts](file:///c:/Users/angelica/Desktop/GalloTrack-Web/gallotrack-next/lib/media-privacy.ts).
- **`match-photos` (Private Storage Bucket)**:
  - Stores fight photos and video poster frames.
  - Access: **Private / Owner-Only**. Accessible only by the owner or through temporary signed share tokens.

### Audit Logs & Safety Incidents
- **Audit Logs (`admin_audit_logs`)**: Automatically records administrative interventions (password resets, account privilege changes, farm transfers). Regular owners cannot alter audit log rows.
- **Safety Incidents (`safety_incidents`)**: Practical farm pen management tool. Allows documenting which birds are too aggressive during breeding or suffer coop injuries.

### AI Features Explained
- **Is there an AI service running?**: No third-party AI APIs (such as OpenAI, Google Gemini, or external vision models) are sent your data or photos.
- **How features work**: All bloodline percentages, milestone alerts, breeding pair verdicts, and pedigree charts are computed using deterministic mathematical algorithms and rule-based formulas running directly on your Next.js server. Your farm data is never transmitted to outside AI companies.

### Backups and Data Protection
- **JSON Backup Export**: In **Settings $\rightarrow$ Data Management**, you can download a full `.json` file backup containing all chickens, fights, and farm settings.
- **Backup Restore**: Uploading your backup file re-imports your flock records safely. It checks existing chicken IDs to prevent duplicate rows if run more than once.
- **What happens on deletion**: If a chicken is permanently deleted via the detail modal, it is removed from the database (`hard delete`). Descendant bloodlines are recalculated immediately. If deleted by mistake, the chicken can only be recovered if you previously downloaded a JSON backup file.

---

## 8. End-to-End Workflows

### a) Register a Founder Sire & Founder Dam
1. Click **+ Register Chicken** on the Chicken Registry page.
2. In Step 1, enter Name: *"Black Butcher 1"*, Strain: *"Black Butcher"*, Gender: *"Sire"*.
3. Notice the code displays `Auto-Assigned (Sire)` with the next number (e.g. `1`).
4. In Step 2, enter Birth Date: `2024-01-10`.
5. In Step 3, leave Sire and Dam blank (defaults to "Foundation Stock").
6. Click **REGISTER**.
7. System saves the rooster to `fowl` with `chicken_code = '1'`. It appears in the **Breeding Male** tab.
8. Repeat for a hen: Name: *"Kelso Lady"*, Gender: *"Dam"*. Code auto-assigns next letter (e.g. `'A'`). It saves to `fowl` and appears in the **Breeding Female** tab.

### b) Register an Offspring from a Pair
1. Click **+ Register Chicken**.
2. Enter Name: *"Butcher Kelso 1"*, Gender: *"Sire"*.
3. In Step 3, pick Sire: *"Black Butcher 1"* (code `1`) and Dam: *"Kelso Lady"* (code `A`).
4. Identifier preview immediately updates live to `1A1 · Auto-Assigned (Offspring)`.
5. Step 3 displays live 50% Butcher / 50% Kelso bloodline breakdown.
6. Click **REGISTER**.
7. Offspring is saved with `chicken_code = '1A1'`, `sire_id = [Black Butcher ID]`, `dam_id = [Kelso Lady ID]`.
8. The bird is placed in the **Non-Breeding** tab.

### c) Record a Match, Watch Media, and Share It
1. Click **Chicken Registry $\rightarrow$ Match Logs** tab.
2. Select chicken: *"Butcher Kelso 1"*.
3. Enter Opponent: *"Red Bull Entry"*, Opponent Breed: *"Sweater"*, Location: *"Davao Cockpit"*.
4. Select Outcome: *"Win"*, Post-Fight Condition: *"Fit / Recovered"*.
5. Drag and drop fight video file (MP4, <100MB) and victory photo.
6. Click **Submit Match Record**.
7. System uploads video to private bucket `match-videos`, captures first-frame thumbnail, and writes records to `match` and `match_videos`.
8. To share: Find the match in the table, click **Share**, and click **Copy Link**. Send the link to a buyer or friend. They can watch the fight video view-only without logging in. Click **Revoke** when finished to deactivate the link.

### d) Archive a Chicken, Mark Deceased, and Restore
1. On any chicken card in the Registry, click **Archive**.
2. Select reason: *"Sold"* and click Confirm.
3. Chicken disappears from the active registry and moves to the **Chicken Inventory $\rightarrow$ Archived** tab.
4. To restore: Open **Chicken Inventory $\rightarrow$ Archived**, find the bird, and click **Restore**. The chicken immediately moves back to the active registry.
5. If a chicken dies: Click **Deceased** on its card, choose cause: *"Illness / Disease"*, and confirm. It moves to the **Deceased** inventory archive.

### e) Promote an Offspring to Breeder
1. In the **Non-Breeding** tab, locate a mature stag with birth code `1A1`.
2. Click **Promote to Breeder** on its profile.
3. Choose **Breeding Male**.
4. System assigns the next available sire number (e.g. `5`), preserves `birth_code = '1A1'`, and sets `registry_role = 'Breeding Male'`.
5. The rooster moves permanently into the **Breeding Male** tab.

### f) Create a Breeding Pair
1. Go to **Breeding Hub $\rightarrow$ Active Breeding Pairs**.
2. Click **+ New Breeding Pair**.
3. Select Sire `1` and Dam `A`.
4. System verifies that neither bird is currently in another active pen.
5. Click **Create Pairing**.
6. The pairing is saved to `breeding_pairings` with pairing code `1A`. Subsequent offspring registered with these parents automatically increment this pair's child counter.

### g) View Lineage, Pedigree, and Win Rates
1. Go to **Lineage Directory**.
2. Click **Full Siblings & Families** to see all offspring grouped by parents.
3. Click **Pedigree / Ancestors** and search for any bird.
4. Inspect the 4-generation pedigree tree showing exact genetic bloodline splits.

### h) Export Reports
1. On the **Dashboard**, click **Export & Reports**.
2. Click **Export registry (CSV)** for a full flock spreadsheet.
3. Click **Export matches (CSV)** for fight history.
4. Click **Print report** to print a hard-copy PDF performance evaluation.

---

## 9. Rules Check & Discrepancy Observations

### Rule Verification Table

| Rule | Expected Behavior | Current System Status | Verification / File Reference |
| :--- | :--- | :--- | :--- |
| **Breeding Male Tab** | Sires only (Numbers: `1, 2, 3`) | **Complies** (with minor manual edit risk) | Filtered in [registry-roles.ts:194](file:///c:/Users/angelica/Desktop/GalloTrack-Web/gallotrack-next/lib/registry-roles.ts#L194). Only males with sire roles appear. |
| **Breeding Female Tab** | Dams only (Letters: `A, B, C`) | **Complies** (with minor manual edit risk) | Filtered in [registry-roles.ts:195](file:///c:/Users/angelica/Desktop/GalloTrack-Web/gallotrack-next/lib/registry-roles.ts#L195). Only females with dam roles appear. |
| **Non-Breeding Tab** | Offspring only (Codes: `1A1, 1A2`) | **Complies** | Filtered in [registry-roles.ts:196](file:///c:/Users/angelica/Desktop/GalloTrack-Web/gallotrack-next/lib/registry-roles.ts#L196). Offspring birds appear here. |
| **One Role per Chicken** | No chicken appears in >1 tab | **Partially Breached by Sire Material** | `assertTabExclusivity` enforces mutual exclusivity for Males, Females, and Non-Breeding. However, Sire Material birds simultaneously exist in either Males or Non-Breeding. |
| **One Source of Truth for Counts** | All pages report identical numbers | **Minor Discrepancies Observed** | Dashboard reports active chickens from `activeFowls.length`, whereas Inventory reports counts through `inventoryCounts()`. If legacy statuses exist, numbers can vary slightly. |
| **Unique, Permanent Identifiers** | Never reused, unique per farm | **Complies** | Enforced by database unique index `fowl_user_chicken_code_key` in [20261007000002_automatic_unique_identifiers.sql](file:///c:/Users/angelica/Desktop/GalloTrack-Web/supabase/migrations/20261007000002_automatic_unique_identifiers.sql). |
| **Internal IDs Hidden from Users** | Only show bird codes / wing bands | **Minor Inconsistency** | The registration form header still displays `ID: GT-0063` (the predicted database row ID), which can confuse owners into thinking it is a chicken identifier. |
| **Warn Before Archiving Active Parents** | Warn if bird has living offspring | **Missing Confirmation Warning** | Archiving a sire or dam with existing offspring proceeds without a prompt warning the owner that the bird is an active parent of registered progeny. |

### Known Quirks & Inconsistencies
1. **Offspring Post-Registration Redirect Quirk**: In [fowl-context.tsx:794](file:///c:/Users/angelica/Desktop/GalloTrack-Web/gallotrack-next/lib/contexts/fowl-context.tsx#L794), after registering an offspring, the screen redirects you to the Breeding Male or Breeding Female tab instead of the Non-Breeding tab. The chick is safely saved in Non-Breeding, but you have to click that tab to see it.
2. **Identifier Defaults to "Sire" on Blank Form**: Opening the registration form displays `"4 · Auto-Assigned (Sire)"` before you select gender because blank gender defaults to male.
3. **Database Column `registry_role` Saved as NULL**: When inserting new chickens, `registry_role` is omitted from the initial SQL payload, causing the database column to sit as `NULL`. The frontend relies on fallback rules in [registry-roles.ts](file:///c:/Users/angelica/Desktop/GalloTrack-Web/gallotrack-next/lib/registry-roles.ts) to sort the tabs.

---

## 10. Security & Safety Observations (Read-Only)

1. **Storage Bucket Privacy**:
   - `match-videos` and `match-photos` are configured as **Private buckets** with strict mime-type allow-lists (100MB and 10MB caps). Private files cannot be accessed anonymously over HTTP; they require authenticated 1-hour signed tokens.
   - `fowl-images` is a **Public bucket**. Anyone with the exact direct file URL can view a chicken photo. This is standard for catalog display images.
2. **Row-Level Security (RLS)**:
   - RLS is enabled across all core tables (`fowl`, `match`, `breeding_pairings`, `safety_incidents`, `farms`, `profiles`).
   - Every read and write query is checked against `auth.uid() = user_id`. You cannot read or tamper with another farm's chickens.
3. **Public Share Link Exposure**:
   - The share-link feature in `/share/[token]` uses random 64-character hexadecimal tokens. Only the specific fight or bird record linked to that token is exposed. Personal account data, dashboard metrics, and other birds remain strictly hidden. Revoking the token immediately deletes access.
4. **Logged-Out Visitor Access**:
   - All dashboard routes (`/dashboard`, `/profiling`, `/catalog`, `/lineage`, `/breeding`, `/profile`, `/settings`) are protected by Next.js middleware and Supabase session guards. Unauthenticated users are redirected to `/auth/login`.
5. **Secrets & Keys in Codebase**:
   - The browser client only has access to `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. These keys are public-facing and safe because all database permissions are enforced server-side by Row-Level Security.
   - The administrative master key (`SUPABASE_SERVICE_ROLE_KEY`) is stored strictly in server-side environment variables and is never exposed in client-side JavaScript.
