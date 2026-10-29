# Review: Chapters 1–3 vs the Actual GalloTrack System

**Reviewed file:** `C:\Users\Lenovo\Downloads\GalloTrack-Final documents.docx.pdf`
**Basis:** the PDF plus the actual codebase (`gallotrack-next/`, `supabase/migrations/`, `README.md`, `FLASK_DEPRECATED.md`)
**Date:** October 26, 2026

---

## 1. Short answer

**Hindi lahat tama.** Karamihan ng claims tungkol sa features ay tugma sa actual system, pero may mga **major na hindi na tugma sa final implementation**, may **internal contradictions**, at may **citation/reference errors** na malamang matanong sa defense.

Ang pinakamalaking problema:

1. **Chapter 3 diagrams (ERD, Class, DFD, Use Case)** ay hindi tugma sa actual database at modules.
2. **Marketplace module, Python/Flask, at Match Scheduling** ay binanggit sa Chapter 3 pero wala na / wala talaga sa final system.
3. **15 vs 20 respondents** — magkaiba sa Chapter 1 at Chapter 3.
4. **ISO/IEC 25010 definitions** sa Chapter 3 ay mali ang ilang definition.
5. **References** — maraming in-text citations ang wala sa reference list.
6. **Chapter 4** ay may results section sa title pero **walang evaluation results table** (cross-chapter issue).

---

## 2. What is correct (verified against the system) 🟢

| Claim in the paper | Evidence in the system |
|---|---|
| Web-based gamefowl management system | Next.js app (`gallotrack-next/`) |
| Gamefowl profile with breed/rasa, birthdate, age, weight, height, wing band, sire/dam | `lib/schema-contract.ts` → `FOWL_COLUMNS` includes `breed`, `birthdate`, `age`, `weight`, `height`, `wing_band`, `sire`, `dam`, `sire_id`, `dam_id` |
| Age computed from birthdate | `supabase/migrations/20260813000000_birthdate_auto_age.sql` |
| Wing band ID | `supabase/migrations/20261002000000_add_wing_band.sql`; unique per owner |
| Parent–offspring relationship tracking | `sire_id` / `dam_id` self-referencing FKs in `fowl`; `lib/lineage.ts` |
| Family tree / pedigree / ancestors | `components/PedigreeTree.tsx`, `components/LineageDirectory.tsx` |
| Sibling tracking | “Full Siblings & Families” tab in `LineageDirectory` |
| Recursive bloodline calculation | `lib/bloodline-composition.ts` — recursive composition walk |
| 50% sire + 50% dam contribution | `blendCompositions(sire, dam, 0.5, 0.5)` in `lib/bloodline-composition.ts` |
| Winning percentage / win rate analytics | `lib/helpers.ts` → `winRateOf()`; `components/DashboardPage.tsx` |
| Win rate per bird and per bloodline/strain | Dashboard strain performance chart; `lib/bloodlines.ts` |
| Match history / match logs | `match` table; `app/(dashboard)/match-logs/` |
| CSV export | `lib/report-export.ts` → `downloadCsv()` |
| Printable report / Print-to-PDF | `lib/report-export.ts` → `printReport()`; pedigree print in `PedigreeTree.tsx` |
| Self-referencing database design | `fowl.sire_id` and `fowl.dam_id` reference `fowl.id` |
| Supabase/PostgreSQL database | `README.md`; `supabase/migrations/` |
| Responsive web / mobile access | Next.js app + PWA manifest (`public/manifest.json`); no native app |
| Admin panel and backup/restore | `app/(dashboard)/admin/`, `admin/settings/page.tsx` |
| Breeding pairs and safety incidents | `breeding_pairings`, `safety_incidents` migrations and Breeding Hub UI |
| Bird codes / coding system | `bird_code`, `birth_code`, `fowl_identifier_counters` |
| PHP 50 billion industry estimate | Verified in Abraham (2017) abstract from the UPLB repository |
| Gan (2018) record-keeping recommendation | Verified in Gan (2018) abstract |
| Pradas et al. (2024) PERSEUS | Real source (Bioinformatics, DOI: 10.1093/bioinformatics/btae060) |
| Paucar-Chanca & Caso-Huamani (2023) Cuytec | Real source (DOI: 10.52973/rcfcv-e33251) |
| Umarova et al. (2026) cattle pedigree software | Real source (DOI: 10.1017/s002202992610243x) |

**Conclusion:** The feature descriptions are mostly accurate. The problems are mainly in **Chapter 3's technical design diagrams**, **outdated stack**, **role definitions**, **respondent count**, **ISO definitions**, and **references**.

---

## 3. Major issues (fix before final defense) 🔴

### 3.1 Chapter 3 diagrams do not match the actual database

**Where:** Section 3.2.5, Figures 3–7 (pp. 35–38)

**Problem:**

- **Figure 4 (ERD)** shows tables: `USER`, `FOWL`, `LINEAGE (PARENT)`, `PERFORMANCE`, `MATCH`, `MATCH_PARTICIPANT`.
- **Figure 7 (Class Diagram)** shows classes: `User`, `Fowl`, `Match`, `Performance`, `Lineage`.
- **Figure 6 (DFD)** shows data stores `D1 Fowls DB`, `D2 Lineage DB`, `D3 Metrics DB`, `D4 Analytics DB` and a process “Log Breeding Metrics.”

**Actual system:**

- `fowl` is **self-referencing** via `sire_id` and `dam_id`. There is **no separate `LINEAGE` table**.
- There is **no `PERFORMANCE` table** and **no `MATCH_PARTICIPANT` table**. Wins/losses/win rate are **computed** in `lib/helpers.ts` / `lib/win-rate.ts`.
- Bloodline data is stored in `fowl.bloodline_composition` (JSONB) and `fowl.bloodline_pct`, not in a separate lineage table.
- Actual core tables include: `profiles`, `farms`, `fowl`, `match`, `breeding_pairings`, `safety_incidents`, `fowl_status_history`, `strains`, `fowl_photos`, `match_videos`, `match_photos`, `match_options`, `system_settings`, `admin_audit_logs`, `registry_options`, `fowl_identifier_counters`.
- The DFD does not include the core process **“Record Match Results,”** even though match logging is one of the main modules.

**Fix:**

- Redraw the ERD from the actual schema. At minimum show:
  - `profiles` / `farms` (owner)
  - `fowl` (self-referencing `sire_id`, `dam_id`; `wing_band`, `bloodline_composition`, `status`)
  - `match` (`fowl_id`, `opponent`, `outcome`, `date`, `post_fight_condition`)
  - `breeding_pairings` (`sire_id`, `dam_id`, `pairing_code`)
  - `safety_incidents`
  - `fowl_status_history`
- Redraw the Class Diagram to mirror the actual domain model, or label it clearly as a **conceptual domain model**, not an implementation class diagram.
- Add “Record Match Results,” “Manage Breeding Pairings,” “Generate Reports,” and “Authenticate User” to the DFD.
- Split the Use Case actor **“ADMIN/OWNER”** into **Admin** and **Farm Owner**, because they have different permissions in the system.

---

### 3.2 “Marketplace module” is deprecated and removed

**Where:** Section 3.2.3, Sprint 3 (p. 34)

**Problem:** The paper says Sprint 3 includes “the creation of the marketplace module, allowing for the listing and viewing of verified gamefowl data.”

**Actual system:**

- Marketplace is **deprecated**. See `supabase/migrations/20261014000000_deprecate_marketplace.sql` — the table was renamed to `marketplace_listings_deprecated`.
- Marketplace API routes now return “Marketplace has been deprecated and is no longer available.”
- The remaining `/catalog` route is an **internal catalog/inventory view**, not a marketplace.

**Fix:** Remove the marketplace from the current system description. If it was part of your development history, say:

> “Sprint 3 originally included a marketplace prototype. It was later deprecated and removed after review because it was outside the core analytics and lineage scope of the study.”

That is a stronger, more honest framing than pretending it is still a feature.

---

### 3.3 Python/Flask is no longer the stack

**Where:** Section 3.5, Software Requirements (p. 40)

**Problem:** The paper lists:

> “Programming language and frameworks: Python/Flask, Javascript/TypeScrpt (Next.js)”

**Actual system:**

- Flask is **deprecated** (`FLASK_DEPRECATED.md`).
- The active system is **Next.js 16 + React 19 + TypeScript + Tailwind CSS 4**, with **Supabase** for PostgreSQL, Auth, Storage, and Realtime.
- Charts use **Chart.js / react-chartjs-2**.
- Hosting is **Vercel**.

**Fix:** Update the stack table:

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Backend / Database | Supabase (PostgreSQL, Auth, Storage, Realtime) |
| Charts | Chart.js, react-chartjs-2 |
| Hosting | Vercel |
| Tooling | Node.js 18+, npm, Git/GitHub, VS Code, Supabase CLI |

If you want to keep the Flask history, say it was the **Sprint 1 prototype**, then the team migrated to Next.js + Supabase. Do not list Flask as a current requirement.

---

### 3.4 “Match Scheduling” does not exist

**Where:** Section 3.4, System Architecture (pp. 39–40)

**Problem:** The paper lists “Match Scheduling and Performance Logging” as a core module.

**Actual system:**

- There is **match logging** (`match-logs` routes, `match` table), but **no match scheduling/calendar** feature.
- The “milestones” feature is for breeding/growth reminders, not match scheduling.

**Fix:** Change to **“Match Logging and Performance History.”** If scheduling was planned, put it under **Future Work/Limitations**, not as an implemented module.

---

### 3.5 “Administrator” definition conflicts with actual roles

**Where:** Definition of Terms, “Administrator” (p. 12); also Use Case/Context diagrams

**Problem:** The paper says the administrator is “the primary user responsible for encoding gamefowl data and managing the analytics dashboard.”

**Actual system:**

- `profiles.role` / `is_admin` distinguishes **Admin** and **Owner**.
- The **Farm Owner** encodes and manages their own farm’s gamefowl records.
- The **Admin** manages user accounts, settings, audit logs, backups, and oversight — not the day-to-day farm records.

**Fix:** Redefine:

> **Administrator** – the platform-level user responsible for user management, account verification, system settings, audit logs, and backup/restore.
>
> **Farm Owner/Breeder** – the primary user who encodes and manages gamefowl profiles, lineage, breeding pairs, and match records for their own farm.

Also add **Farm Owner** to the Definition of Terms and split “Admin/Owner” in the diagrams.

---

### 3.6 15 vs 20 respondents

**Where:**

- Definition of Terms, “Purposive Sampling” (p. 16): **15 evaluators**
- “The Respondents” (pp. 45–46): **20 respondents**

**Problem:** Direct contradiction. A panel will catch this immediately.

**Fix:** Choose one and update all mentions. If 20, change the definition to 20. If 15, change Chapter 3. Also add the breakdown per group (e.g., how many IT experts, breeders, agriculture faculty).

---

### 3.7 Bloodline formula is oversimplified and can mislead

**Where:** Section 3.6 and Figure 8 (p. 41)

**Problem:** The formula shown is:

> `Bloodline% = (Sire% + Dam%) / 2`

If “Sire%” and “Dam%” are read as total bloodline percentages, then a Kelso × Hatch cross gives `(100 + 100) / 2 = 100%`, which is wrong. The actual system computes **per strain**.

**Actual implementation:**

- For each strain `s`: `B_child(s) = 0.5 × B_sire(s) + 0.5 × B_dam(s)`
- The totals are normalized to 100%.
- A parent that is named but not registered contributes an **“Unknown”** share.
- `sire_pct` and `dam_pct` are **legacy fields** and are not averaged into the result (`lib/helpers.ts` comment; `lib/bloodline-composition.ts`).

**Fix:** Rewrite the paragraph and formula:

> For each breed/strain *s*, the offspring’s share is:
>
> `B_offspring(s) = 0.5 × B_sire(s) + 0.5 × B_dam(s)`
>
> where `B_sire(s)` and `B_dam(s)` are the sire’s and dam’s percentage shares for strain *s*. The system applies this recursively up the pedigree and normalizes the results to 100%.
>
> Example: Sire = 100% Kelso; Dam = 100% Hatch → Offspring = 50% Kelso, 50% Hatch.

Also state that the system uses a **fixed 50/50 contribution**, not a user-adjustable percentage.

---

### 3.8 ISO/IEC 25010 definitions are partly wrong

**Where:** Chapter 3, “System Evaluation” (pp. 43–45); also Chapter 1 Definition of Terms (p. 14) and Chapter 2 (pp. 25–26)

**Problem:** The paper mixes old and new ISO 25010 terms and gives incorrect definitions:

| Paper says | Correct ISO/IEC 25010:2023 term | Issue |
|---|---|---|
| Functionality | Functional Suitability | Use the official term |
| Execution efficiency | Performance Efficiency | Use the official term |
| Usability | Interaction Capability | Renamed in 2023 |
| Dependability | Reliability | “Dependability” is not a 25010 characteristic |
| Adaptability | Flexibility | Use the official term |
| Operational safety | Safety | Use the official term |
| Compatibility = “ability to provide functions that meet stated and implied needs” | That is **Functional Suitability** | Wrong definition |
| Maintainability = includes “restore to operational status after failure” | That is **Recoverability**, a sub-characteristic | Wrong emphasis |
| Flexibility = “transferred from one environment to another” | That is **Portability** (old term) | Wrong definition |
| Safety = “protect data from loss/corruption” | That is **Security/Reliability** | Wrong definition |

**Fix:** Use the official 2023 terms consistently and write accurate operational definitions. Suggested:

- **Functional Suitability** – the system provides the required functions (registry, lineage, match logs, analytics, reports) correctly and completely.
- **Performance Efficiency** – the system responds within acceptable time and uses resources efficiently, including recursive lineage calculations and dashboard loading.
- **Compatibility** – the system runs on modern browsers/devices and can exchange data through CSV/JSON export and backup/restore.
- **Interaction Capability** – users can interact effectively, efficiently, and satisfactorily, including learnability, operability, error prevention, and accessibility.
- **Reliability** – the system performs consistently under stated conditions, with accurate calculations and backup/restore support.
- **Security** – authentication, role-based access, and Supabase Row Level Security protect farm data.
- **Maintainability** – modular code, migrations, automated tests, and documentation make the system easy to modify.
- **Flexibility** – the system can adapt to new breeds/strains, match types, and farm settings without major code changes.
- **Safety** – the system avoids states that could harm users, animals, property, or operations, including safeguards against data loss and misleading outputs.

Also change “functional stability” in the Conceptual Framework (p. 7) to **“functional suitability.”**

---

### 3.9 Scope and Limitations has no Limitations

**Where:** Chapter 1, “Scope and Limitations” (pp. 11–12)

**Problem:** The section only describes what the system does. There is no explicit **Limitations** subsection.

**Fix:** Add limitations such as:

- Requires internet access and a modern browser; **no offline mode**.
- Responsive web/PWA only; **no native Android/iOS app**.
- One farm account per owner (`farms.owner_id` is unique).
- Bloodline computation uses a **fixed 50/50** sire/dam contribution; no custom weighting.
- Only **registered** parents can be traced; named-but-unregistered parents become **“Unknown.”**
- The system **does not verify biological parentage** (no DNA testing); it relies on encoded records.
- No financial/accounting, veterinary diagnosis, feed inventory, or automated match scheduling.
- Evaluation is limited to a purposive sample in Dingle, Iloilo; results are not generalizable.
- ISO/IEC 25010:2023 is used as an evaluation lens, not as a certification.

This section will also protect you during the defense.

---

### 3.10 The paper mixes “proposal” and “final manuscript” tenses

**Where:** Title page (p. 1) and Chapter 3

**Problem:**

- Title page says **“A Capstone Project Proposal”** but also **“A Capstone Project Presented…”**
- Chapter 3 uses future tense (“will design,” “will be developed,” “will be evaluated”), but Chapter 4 already reports results.
- “The data will be gathered” and “The system was evaluated” appear in the same section.

**Fix:** Decide:

- **If this is the final manuscript:** change the title to **“A Capstone Project”** and write Chapter 3 in the **past tense** (“was designed,” “was developed,” “was evaluated”).
- **If this is still a proposal:** remove Chapter 4 and keep the future tense.

Given the file name “Final documents” and the presence of Chapter 4, this should be the **final manuscript**.

---

### 3.11 Title page inconsistencies

**Where:** Page 1

**Problems:**

1. Title page says **“College of Informatics and Computing Innovation.”**
   The letterhead and logo say **“COLLEGE OF INFORMATION AND COMMUNICATION TECHNOLOGY (CICT).”**
   These do not match. Verify the official college name and use it consistently.
2. “A Capstone Project Proposal” and “A Capstone Project Presented” both appear. Choose one.
3. “In Partial Fulfillment Of the Requirements” – capitalization should be “In Partial Fulfillment of the Requirements.”
4. Author name **“Ju ann Sebandra”** – verify the correct spacing/format.

---

### 3.12 References are incomplete and inconsistent

**Where:** References (pp. 57–61)

**Problem:** Many in-text citations are missing from the reference list. This is the most common panel comment.

**Missing references include:**

- Beck et al. (2001)
- Biology Online (2022)
- Britannica (2024)
- Cambridge Dictionary (2024)
- Domo (n.d.)
- GeeksforGeeks (2024)
- ISO Standards (2023) – replace with ISO/IEC 25010:2023
- Likert (1932)
- Merriam-Webster (2024)
- Palinkas et al. (2015)
- Pradas et al. (2024)
- Sabado (2024)
- Siena (2024)
- Umarova et al. (2026)
- Zainuddin et al. (2023)
- Obinaju (2023)
- Paca Vargas et al. (2023)
- Brigham Young University (n.d.)

**Uncited references that should be removed or cited:**

- Open Access Pub (n.d.)
- ResearchGate (n.d.)
- Salto Gamefowl Care (n.d.)
- ScienceDirect (n.d.)
- UNAHCO (n.d.)
- Virtue Supplements (n.d.)

**Formatting issues:**

- “Mendeja … 1(1). . https://…” – double period.
- “Jelokhani … e23220759. . https://…” – double period.
- Alphabetical order: `Paucar-Chanca`, `Open Access Pub`, `Oxford` – `Open`/`Oxford` should come before `Paucar`.
- Some URLs are broken by line breaks (e.g., `engli sh/administrator`).
- Some web sources lack retrieval dates.

**Fix:** Use a reference manager (Zotero/Mendeley) and run a final citation cross-check. Every in-text citation must have a reference entry, and every reference entry must be cited.

---

### 3.13 Chapter 2 has an orphan list of references

**Where:** Page 21, after “Algorithmic Lineage and Data Analytics”

**Problem:** There is a numbered list:

> 1. Obinaju, L. (2023)… “Find the research on ResearchGate”
> 2. Zainuddin, M., Irawati, I., & Mude, M. A. (2023)… “Read the study”
> 3. Paca Vargas, E,R,Torres,M,X,,& Fierro Garcia, T.M (2023)…

This looks like leftover research notes / AI output. It is not integrated into the literature review and not in the references.

**Fix:** Remove the list and integrate the three sources into the “Digital Transformation of Livestock and Poultry Record-Keeping” section, with proper APA citations and reference entries. If they are not needed, delete them.

---

### 3.14 Some cited “studies” are not actually studies

**Where:** Chapter 2, pages 18–20

**Problems:**

- **“According to Brigham Young University (n.d.), gamefowl are selectively bred…”** – A university webpage is not a study. Do not say “the study emphasized” unless it is an actual study. Replace with a peer-reviewed source or cite the specific article/author.
- **“According to the University of the Philippines Los Baños (UPLB, 2020)… The study found that most local breeders still rely on memory or basic spreadsheets…”** – The cited URL (`cafs.uplb.edu.ph/research-and-extension/`) is a generic College of Agriculture and Food Science page and does **not** contain that finding. This is an unsupported citation. Replace with a real study (e.g., Gan 2018 or Abraham 2017) or remove the claim.
- **“According to studies on data analytics dashboards (Domo, n.d.)…”** – Domo is a commercial vendor, not “studies.” Use academic BI/dashboard literature or phrase it as an industry source.
- **“The Poultry Site (n.d.) noted that ‘trios’…”** – The reference URL points to a “production cycles for backyard poultry” article. Verify that the exact quote and page exist; otherwise replace the source.

**Fix:** For each claim, use a source that actually supports it. Do not use a generic webpage to support a specific research finding.

---

### 3.15 Table 1 (Synthesis Matrix) is incomplete

**Where:** Table 1, pp. 27–29

**Problem:** The text cites more sources than the table includes. Missing from the matrix:

- Siena (2024)
- Pradas et al. (2024)
- Umarova et al. (2026)
- Paucar-Chanca & Caso-Huamani (2023)
- Sabado (2024)
- Obinaju (2023)
- Paca Vargas et al. (2023)
- Brigham Young University (n.d.)
- Domo (n.d.)

Also, **Baesa & Palaoag (2024)** appears in the table but is not discussed in the text. Either discuss it or remove the row.

**Fix:** Add rows for all major sources used in the synthesis, or trim the text so the table and text match.

---

### 3.16 Winning percentage definition does not match the system

**Where:** Definition of Terms, “Winning Percentages” (p. 17)

**Problem:** The paper says “dividing the total number of wins by the total number of matches played.”

**Actual system:** `winRateOf()` divides by **decided fights only** (`wins + losses`), excluding draws:

```ts
const decided = wins + losses;
return decided > 0 ? Math.round((wins / decided) * 100) : 0;
```

**Fix:** Change the operational definition to:

> “Winning percentage is computed as wins divided by decided matches (wins + losses), excluding draws.”

Also mention this in the analytics module description.

---

### 3.17 The “Nanay field” does not exist in the system

**Where:** Definition of Terms (p. 13–14), Conceptual Framework (p. 6), Chapter 2 (p. 18–19)

**Problem:** The paper repeatedly says “Sire (Tatay)” and “Dam (Nanay)” and refers to the platform’s **“Nanay” field**.

**Actual system:** The UI labels are **“Sire”** and **“Dam.”** There is no “Nanay” field. “Tatay/Nanay” are local glosses, not field names.

**Fix:** Say “Sire (father)” and “Dam (mother)” and refer to the **Sire** and **Dam** fields. If you want to keep the local terms, write “Sire (Tatay)” as a gloss, not as a field name.

---

### 3.18 Chapter 4 promises evaluation results but does not show them

**Where:** Chapter 4 intro (p. 47) and Chapter 3 “System Evaluation” / “The Respondents”

**Problem:** Chapter 4 says it presents “the results of its system evaluation,” but pages 47–56 only describe the system and show screenshots. There is **no table of means, standard deviations, or Likert interpretations** for the 20 (or 15) respondents.

**Fix:** Add an evaluation results section:

- Demographic profile of respondents
- Mean and SD per ISO/IEC 25010:2023 criterion
- Overall weighted mean and interpretation
- Qualitative comments
- Discussion of results

Without this, Chapter 3’s UAT promise is unfulfilled.

---

### 3.19 Figure and section numbering are inconsistent

**Where:** Chapters 1, 3, and 4

**Problems:**

- **Figure 1** appears in Chapter 1 (Conceptual Framework) and again in Chapter 4 (Home Page). If numbering is continuous, Chapter 4 should start at Figure 9. If per-chapter, use **Figure 1.1, Figure 3.1, Figure 4.1**.
- Chapter 3 has “System Evaluation,” “The Respondents,” and “Research Gathering Instrument” after 3.7 but they are **unnumbered**. Make them **3.8**, **3.8.1**, **3.8.2**, or **3.9**, etc.
- “Research Gathering Instrument” should be **“Research Instrument”** or **“Data Gathering Instrument.”**

---

### 3.20 Ethics section lacks data privacy and informed consent

**Where:** Section 3.7 (pp. 42–43)

**Problem:** The section discusses animal welfare but not **human data privacy**, even though the system stores emails, account data, and farm information, and the study involves human respondents.

**Fix:** Add:

- **RA 10173 (Data Privacy Act of 2012)** compliance
- Informed consent for respondents
- Voluntary participation and right to withdraw
- Confidentiality and secure storage of data
- Permission from farm owners/institution
- Animal welfare disclaimer (already present)

---

### 3.21 Testing and instrument sections are incomplete

**Where:** Sections 3.6 and “Research Gathering Instrument” (pp. 41–46)

**Problems:**

- Testing lists only functionality, usability, reliability, and UAT. No **performance, security, compatibility, or maintainability** testing, even though these are ISO criteria.
- The questionnaire is described as “valid and reliable” but there is no validation process, pilot test, or Cronbach’s alpha.
- “Descriptive statistics was used” – grammar, and no formula/weighted mean procedure.
- No test case table.

**Fix:**

- Add performance testing (dashboard load, large flock), security testing (auth, RLS, role access), compatibility testing (browsers/devices/PWA), and maintainability review (code structure, tests, migrations).
- Add instrument validation: expert review, pilot testing, Cronbach’s alpha (≥ 0.70).
- Add a test case table: feature, input, expected output, actual result, pass/fail.
- Use “Descriptive statistics **were** used” and specify weighted mean and SD.

---

## 4. Minor issues and grammar 🟡

| Where | Issue | Fix |
|---|---|---|
| p. 5 | “to monitors” | “to monitor” |
| p. 5 | “to produces” | “to produce” |
| p. 6 | “Specifically ,” | “Specifically,” |
| p. 4 | “ancestral documentation” | “pedigree/lineage records” |
| p. 2 | “selective avian propagation” | “selective breeding” |
| p. 7 | “functional stability” | “functional suitability” |
| p. 8 | “bloodline trends” | “bloodline performance breakdown” (the dashboard shows distribution/win share, not a time trend) |
| p. 10 | “real-time analytics dashboards” | “interactive analytics dashboards” |
| p. 10 | “web and mobile-based environment” | “responsive web/PWA environment; no native app” |
| p. 14 | “execution efficiency,” “usability,” “dependability,” “adaptability,” “operational safety” | Use official 2023 terms |
| p. 14 | “ISO Standards, 2023” | ISO/IEC 25010:2023 |
| p. 16 | “Rasa” cited to Merriam-Webster | Merriam-Webster does not define *rasa* as breed/strain; use a gamefowl/Filipino glossary or remove the citation |
| p. 15 | “Management System” cited to ISO 25010 | ISO 25010 does not define management system; cite ISO 9000 or remove |
| p. 17 | “Recursive Algorithm” cited to GeeksforGeeks | Weak source; use a textbook (e.g., CLRS) or a peer-reviewed source |
| p. 16 | “Dam” before “Data Analytics” in Definition of Terms | Alphabetical order: Dam, Data Analytics |
| p. 12–17 | “Sire” is not defined | Add a “Sire” entry |
| p. 13 | “Lemon, Sweater, Hatch” called breeds | These are commonly bloodlines/strains; use “breed/strain” consistently |
| p. 24 | “expediting registration speed quadruply” | “fourfold” |
| p. 24 | “cascading keys” | “foreign keys with cascading updates/deletes” |
| p. 19 | “This ensures that genetic records are verifiable” | Overclaim; say “helps organize and preserve” |
| p. 20 | “eliminates the guesswork” | “reduces the guesswork” |
| p. 20 | “checks the accuracy of genetic history” | The system computes, but cannot verify biological accuracy; rephrase |
| p. 23 | “not offered by standard platforms” | Qualify: “not commonly offered in general poultry systems” |
| p. 25 | “dependability,” “usability,” “execution efficiency,” “adaptability,” “operational safety” | Use official 2023 terms |
| p. 25 | Heading “System Evaluation Based on ISO/IEC 25010 Standards.” | Remove the period |
| p. 29 | “livestock-managemen t” | Fix word break |
| p. 34 | “Javascript/TypeScrpt” | “JavaScript/TypeScript” |
| p. 43 | “hear on the existence” | “bear on the existence” |
| p. 46 | “Descriptive statistics was used” | “were used” |
| p. 46 | “GALLOTRACK” | Standardize to “GalloTrack” |
| Whole paper | “gamefowl” vs “game fowl” | Standardize to “gamefowl” |
| Whole paper | “ISO 25010” vs “ISO/IEC 25010:2023” | Standardize |
| References | Double periods, broken URLs, missing retrieval dates | Clean up |

---

## 5. Suggested corrected passages

### 5.1 Administrator definition

> **Administrator** – the platform-level user responsible for managing user accounts, account verification, system settings, audit logs, and backup/restore. In this study, the administrator oversees the GalloTrack platform but does not encode day-to-day farm records; that task belongs to the farm owner/breeder.

### 5.2 Farm Owner definition

> **Farm Owner/Breeder** – the primary user who encodes and manages gamefowl profiles, lineage, breeding pairs, and match records for their own farm. In this study, the farm owner is the main evaluator-user of the GalloTrack analytics and lineage features.

### 5.3 Bloodline formula

> GalloTrack computes bloodline composition per breed/strain. For each strain *s*:
>
> `B_offspring(s) = 0.5 × B_sire(s) + 0.5 × B_dam(s)`
>
> The system applies this recursively across the pedigree and normalizes the results to 100%. If a parent is named but not registered, its share is recorded as “Unknown.” The system uses a fixed 50/50 contribution from the sire and dam; it does not use user-adjustable parent percentages.
>
> Example: Sire = 100% Kelso; Dam = 100% Hatch → Offspring = 50% Kelso, 50% Hatch.

### 5.4 Tech stack

> GalloTrack is a web-based system built with Next.js 16, React 19, TypeScript, and Tailwind CSS 4. Supabase provides the PostgreSQL database, authentication (email/password and OTP), storage, and Row Level Security. Charts are rendered with Chart.js and react-chartjs-2, and the system is deployed on Vercel. The earlier Flask prototype was retired after the team migrated to the Next.js + Supabase architecture.

### 5.5 Winning percentage

> Winning percentage is computed as the number of wins divided by the number of decided matches (wins + losses), excluding draws. This is the single win-rate rule used across the dashboard, match history, and lineage views.

### 5.6 Scope limitations (suggested additions)

> This study is limited to a web-based, responsive/PWA system that requires internet access and a modern browser; it does not provide a native mobile app or an offline mode. Each farm owner account manages one farm, and data is isolated through Supabase Row Level Security. Bloodline calculation uses a fixed 50/50 contribution from the sire and dam and depends on registered parent records; unregistered parents are recorded as “Unknown.” The system does not verify biological parentage, provide veterinary diagnosis, manage finances or feed inventory, or schedule matches. Evaluation is limited to a purposive sample of respondents in Dingle, Iloilo, and the results are not generalizable to all gamefowl farms.

---

## 6. Cross-check with Chapter 4

Even though the request is for Chapters 1–3, these affect the whole manuscript:

1. **No evaluation results.** Chapter 4’s intro promises evaluation results, but the chapter only describes features and screenshots. Add the UAT tables.
2. **Figure numbering restarts.** Chapter 4 uses “Figure 1” again. Use chapter-based numbering or continue from Chapter 3.
3. **Features in Chapter 4 not in Chapters 1–3.** Breeding pairings, safety incidents, bird codes, inventory/catalog, and the admin panel appear in Chapter 4 but are missing from the Chapter 1 scope and Chapter 3 modules. Add them or explain why they are excluded.
4. **Marketplace and match scheduling** appear in Chapter 3 but not in Chapter 4 — another sign they should be removed or moved to future work.

---

## 7. Final checklist before submission

- [ ] Redraw ERD, Class Diagram, DFD, and Use Case Diagram from the actual schema/modules.
- [ ] Remove or reframe the **marketplace** module.
- [ ] Replace **Python/Flask** with the actual Next.js + Supabase stack.
- [ ] Remove **Match Scheduling** or move it to Future Work.
- [ ] Fix **Administrator** definition and add **Farm Owner**.
- [ ] Fix **15 vs 20 respondents** everywhere.
- [ ] Rewrite the **bloodline formula** per strain.
- [ ] Replace ISO 25010 definitions with the official 2023 terms.
- [ ] Add a **Limitations** subsection.
- [ ] Change the title page to **final manuscript** wording and fix the college name.
- [ ] Complete the **reference list**; remove uncited sources.
- [ ] Remove the **orphan list** on p. 21 and integrate the three sources.
- [ ] Replace the **UPLB (2020)** and **BYU (n.d.)** claims with real studies.
- [ ] Complete **Table 1**.
- [ ] Fix the **win rate** definition (exclude draws).
- [ ] Change **“Nanay field”** to **Dam**.
- [ ] Add **evaluation results** to Chapter 4.
- [ ] Add **data privacy/informed consent** to the ethics section.
- [ ] Add **instrument validation** and **test case table**.
- [ ] Fix figure/section numbering.
- [ ] Run a final grammar and citation check.
