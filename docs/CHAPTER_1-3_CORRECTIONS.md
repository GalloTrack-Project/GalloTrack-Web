# GalloTrack Manuscript — Corrected Parts (Chapters 1–3)

**Purpose:** This is a separate correction file. It does **not** modify your original PDF/manuscript.
**How to use:** Each entry is labeled with the page/section where it belongs. Copy the text under **“DAPAT NAKALAGAY”** into that part of your manuscript.

**Notes:**

- `[VERIFY]` means the source or detail still needs to be checked against the actual reference.
- For the **15 vs 20 respondents** contradiction, the corrected text below uses **20** because that is what Chapter 3 says. If your actual number is **15**, change **all** mentions to 15.
- The corrected reference list is at the end of this file.

---

# CHAPTER 1 — INTRODUCTION

## [p. 1] Title Page — College Name and “Proposal” Wording

**Problem:** The title page says “College of Informatics and Computing Innovation,” but the letterhead and logo say “College of Information and Communication Technology (CICT).” It also says both “A Capstone Project Proposal” and “A Capstone Project Presented.”

**DAPAT NAKALAGAY:**

> **GALLOTRACK: OPTIMIZING GAMEFOWL MANAGEMENT THROUGH IN-DEPTH ANALYTICS, PARENT-OFFSPRING RELATIONSHIPS, AND WINNING PERCENTAGES**
>
> A Capstone Project
>
> Presented to the Faculty of the
> **College of Information and Communication Technology**
> Iloilo State University of Fisheries Science and Technology
> Dingle Campus
> Dingle, Iloilo
>
> In Partial Fulfillment of the Requirements for the Degree
> Bachelor of Science in Information Technology
>
> By
>
> Hazel Dato-on
> Lorraine Grace Dangautan
> Wayne Aldrin Rendon
> Juann Sebandra
> Mary Rose Maligas

**Note:** Verify the official college name and the correct spelling/spacing of “Juann Sebandra.” If the official name is “College of Informatics and Computing Innovation,” use that consistently in the letterhead, title page, and all chapters.

---

## [p. 2] Background of the Study — Word Choice

**Problem:** “Ancestral documentation” and “selective avian propagation” are awkward and less precise.

**DAPAT NAKALAGAY (replace the affected sentences):**

> To address the gap between conventional methods and current software innovations, this study implements computerized data management strategies to replace physical logbooks, thereby reducing errors in **pedigree documentation and match monitoring** (Basir et al., 2024).
>
> Present-day breeding facilities are expanding agricultural enterprises in the country, focused on **selective breeding**.

---

## [pp. 5–6] Objectives of the Study

**Problem:** Grammar errors (“to monitors,” “to produces”) and the general objective is a run-on sentence.

**DAPAT NAKALAGAY:**

> **General Objective**
>
> This study aims to develop **GalloTrack**, a web-based gamefowl management system that provides in-depth analytics for parent–offspring relationships and winning percentages to support data-driven breeding decisions.
>
> **Specific Objectives**
>
> Specifically, this study aims to:
>
> 1. Design a database schema that stores comprehensive gamefowl profiles, including breed (*rasa*), birthdate and age, weight, height, wing band ID, and ancestral records.
> 2. Develop an analytics dashboard that monitors match history and calculates winning percentages for specific birds and bloodlines.
> 3. Implement a report generation module that produces structured summaries of gamefowl profiles, match history, and performance metrics through CSV export and printable reports, facilitating systematic analysis and long-term record-keeping.
> 4. Evaluate the system’s software quality based on ISO/IEC 25010:2023, namely: Functional Suitability, Performance Efficiency, Compatibility, Interaction Capability, Reliability, Security, Maintainability, Flexibility, and Safety.

---

## [pp. 6–9] Conceptual Framework

**Problem:** The framework uses “Cock (Tatay)” and “Hen (Nanay)” as if they are system fields, and it says bloodline percentages are calculated from match records. In the actual system, Sire and Dam are the fields, and bloodline composition is computed from ancestry, separate from match analytics.

**DAPAT NAKALAGAY (replace the Input, Process, and System Evaluation paragraphs):**

> **Input.** The input consists of the data and requirements needed to build the system. These include gamefowl profiles—specifically the **Sire** and **Dam**, breed (*rasa*), birthdate, weight, height, and wing band ID—as well as breeding records and historical match results. These serve as the raw data for lineage tracking and performance analysis.
>
> **Process.** The process involves the systematic development of the system using the **Agile 4-Sprint methodology**. It includes encoding and recording gamefowl information and implementing a recursive relationship-tracking logic to visualize family trees. Match records are analyzed to compute winning percentages and performance trends, while ancestry is traversed recursively to compute the per-strain bloodline composition of each bird.
>
> **Output.** The output is the developed GalloTrack system, a digital platform for gamefowl management. Its primary outputs are the automated **Lineage Trees** that map parentage and the **In-Depth Analytics Dashboard**, which presents winning percentages and bloodline performance breakdowns through charts.
>
> **System Evaluation.** The system is evaluated using the ISO/IEC 25010:2023 software quality standards. Selected respondents—gamefowl breeders, IT experts, and agriculture faculty—assess the system’s **functional suitability**, performance efficiency, and interaction capability to ensure it meets the practical needs of its users.

---

## [pp. 9–11] Significance of the Study — Overclaims

**Problem:** “Real-time analytics” and “web and mobile-based environment” overstate the system. The system is a responsive web app/PWA, and analytics are computed on demand, not streamed in real time.

**DAPAT NAKALAGAY (replace the affected sentences):**

> **Developer.** This project provides the researchers with technical expertise in architecting complex data structures and **interactive analytics dashboards in a responsive web/PWA environment**.
>
> **Avian Veterinarians and Technicians.** By providing organized breeding and performance history, the system offers professionals a better context for assessing the **health and performance records** of specific bloodlines, aiding in more informed farm management consultations.

---

## [pp. 11–12] Scope and Limitations

**Problem:** The section only describes the scope. There is no explicit **Limitations** subsection, and some claims need to match the actual system.

**DAPAT NAKALAGAY (replace the whole section):**

> **Scope and Limitations**
>
> This study focuses on developing **GalloTrack**, an integrated gamefowl management system designed to help breeders organize and monitor their operations through in-depth analytics. The system provides features for recording comprehensive gamefowl profiles, including breed (*rasa*), birthdate and age, weight, height, and wing band ID. It tracks parent–offspring relationships by identifying parentage and computing the **per-strain bloodline composition** of each bird using a fixed 50/50 contribution from the Sire and Dam. It also allows users to monitor related gamefowl through a **sibling tracking** feature, helping breeders analyze performance and genetic patterns among their flock. Through the analytics dashboard, users view summarized data such as winning percentages and match history results in graphical form. The system is accessible through web browsers on computers and mobile devices with internet connectivity, allowing farm owners and breeders to manage their data conveniently.
>
> **Limitations of the Study**
>
> This study is limited to a web-based, responsive/PWA system that requires internet access and a modern browser. It does not provide a native Android or iOS application or an offline mode. Each farm owner account manages one farm, and data is isolated through Supabase Row Level Security. Bloodline calculation uses a fixed 50/50 contribution from the Sire and Dam and depends on registered parent records; parents that are named but not registered are recorded as **“Unknown.”** The system does not verify biological parentage through DNA testing, provide veterinary diagnosis, manage farm finances or feed inventory, or schedule matches. Evaluation is limited to a purposive sample of respondents in Dingle, Iloilo, and the results are not generalizable to all gamefowl farms. ISO/IEC 25010:2023 is used as an evaluation lens, not as a formal certification.

---

## [pp. 12–17] Definition of Terms — Corrected Entries

**Problem:** Several definitions do not match the actual system or use outdated ISO terms. “Sire” is missing, and “Dam” is out of alphabetical order.

**DAPAT NAKALAGAY (replace the affected entries and arrange alphabetically):**

> **Administrator** – A person who manages or helps manage the affairs of a business or organization, specifically responsible for the technical management of a system (Oxford Learner’s Dictionary, 2024). In this study, it refers to the **platform-level user** responsible for managing user accounts, account verification, system settings, audit logs, and backup/restore.
>
> **Agile Methodology** – A project management and software creation strategy centered on iterative progress and regular refinement through brief operational cycles known as sprints (Beck et al., 2001). In this study, it refers to the **four-sprint Scrum-based process** used in constructing GalloTrack, enabling incremental deployment of system features.
>
> **Bloodline Percentage** – The proportional inherited genetic makeup received from ancestral stock, calculated by examining pedigree history through successive generations (Biology Online, 2022). In this study, it refers to the **per-strain bloodline composition** computed recursively from the Sire and Dam, with each parent contributing 50%. Parents that are named but not registered contribute an “Unknown” share so that the total remains 100%.
>
> **Dam** – The maternal parent of an animal (Merriam-Webster, 2024). In this study, it refers to the female parent recorded in the platform’s **Dam** field, serving as a primary component for lineage calculations.
>
> **Data Analytics Dashboard** – A visual workspace that consolidates and displays data from multiple sources into intuitive visualizations to track key metrics and performance indicators (Techopedia, 2023). In this study, it refers to the visual interface of GalloTrack where breeders monitor winning percentages and the overall performance outcomes of their gamefowl through charts and graphs.
>
> **Farm Owner/Breeder** – The primary user who encodes and manages gamefowl profiles, lineage, breeding pairs, and match records for their own farm. In this study, the farm owner is the main user of the GalloTrack lineage and analytics features.
>
> **Gamefowl** – Domestic fowl of a breed primarily used for breeding and competitive sports (Merriam-Webster, 2024). In this study, it refers to the specific **breeds or strains**, such as Lemon, Sweater, or Hatch, whose profiles (weight, height, and breed) are managed and tracked within the system.
>
> **ISO/IEC 25010** – A global benchmark outlining a comprehensive framework for assessing software quality across nine characteristics: functional suitability, performance efficiency, compatibility, interaction capability, reliability, security, maintainability, flexibility, and safety (International Organization for Standardization, 2023). In this study, it refers to the standardized assessment model used by evaluators to measure the overall quality of the GalloTrack platform.
>
> **Lineage Monitoring** – The systematic process of recording and tracking the pedigree or ancestry of an organism to maintain genetic integrity or track specific traits over generations (Biology Online, 2022). In this study, it refers to the digital tracking of ancestral history and bloodline composition based on the records of the **Sire** and **Dam**.
>
> **Likert Scale** – A psychometric rating method employed in surveys to quantify user attitudes, ranging from strong disagreement to strong agreement (Likert, 1932). In this study, it refers to the 5-point rating system (5 – Excellent to 1 – Poor) used by evaluators to assess the GalloTrack platform.
>
> **Management System** – A framework of processes and resources an organization uses to meet its objectives and quality requirements through centralized data organization (International Organization for Standardization, 2015). In this study, it refers to the GalloTrack platform used to digitize the manual recording practices of gamefowl farms.
>
> **Parent–Offspring Relationships** – The biological and genetic connection between a progenitor (parent) and its descendant (offspring) (Encyclopaedia Britannica, 2024). In this study, it refers to the digital mapping of the **Sire** and **Dam** to visualize family trees and automate the tracing of genetic history.
>
> **Purposive Sampling** – A non-probability selection method where participants are chosen intentionally according to specific criteria pertinent to the research focus (Palinkas et al., 2015). In this study, it refers to the intentional selection of **20 evaluators** comprising IT specialists, gamefowl breeders, and agriculture faculty qualified to assess the platform.
>
> **Rasa** – A vernacular term denoting “breed” or “strain,” describing a classified lineage of domesticated avian stock sharing distinct hereditary attributes. In this study, it refers to the specific genetic categorization (such as Sweater, Hatch, or Lemon) documented within individual gamefowl records to perform recursive lineage analytics.
>
> **Recursive Algorithm** – A computational logic in which a procedure invokes itself iteratively to analyze structured or nested parameters until it reaches a designated stopping state (Cormen et al., 2022). In this study, it refers to the program routine that traverses ancestral records across successive generations to calculate bloodline composition and map lineage trees.
>
> **Sire** – The paternal parent of an animal (Merriam-Webster, 2024). In this study, it refers to the male parent recorded in the platform’s **Sire** field, serving as a primary component for lineage calculations.
>
> **Winning Percentages** – A mathematical ratio used to measure the success rate of a competitor, calculated by dividing the total number of wins by the total number of **decided matches** (wins plus losses), excluding draws (Cambridge University Press, 2024). In this study, it refers to the calculated metric used to identify high-performing stock and support data-driven breeding decisions.

**Alphabetical order:** Administrator, Agile Methodology, Bloodline Percentage, Dam, Data Analytics Dashboard, Farm Owner/Breeder, Gamefowl, ISO/IEC 25010, Lineage Monitoring, Likert Scale, Management System, Parent–Offspring Relationships, Purposive Sampling, Rasa, Recursive Algorithm, Sire, Winning Percentages.

---

# CHAPTER 2 — REVIEW OF RELATED LITERATURE

## [p. 18] Gamefowl Breeding and Genetics — Replace the BYU Sentence

**Problem:** “According to Brigham Young University (n.d.)” is a university webpage, not a study. The sentence “The study emphasized…” is unsupported.

**DAPAT NAKALAGAY:**

> Gamefowl are selectively bred for competitive performance, endurance, and specific physical traits. Selective breeding is central to improving gamefowl quality, requiring careful selection based on temperament, physical characteristics, and performance. In practice, breeders use “trios”—breeding groups consisting of one rooster and two hens—to maintain genetic control and prevent undesirable traits from entering the breeding stock (The Poultry Site, n.d.). In contrast, while traditional breeding relies on manual observation and physical separation of trios, GalloTrack provides a digital platform that automates the recording of these relationships.

---

## [p. 19] Gamefowl Management in the Philippine Context — Replace the UPLB Paragraph

**Problem:** The cited UPLB (2020) URL is a generic College of Agriculture and Food Science page and does not contain the claim that “most local breeders rely on memory or basic spreadsheets.” The citation is unsupported.

**DAPAT NAKALAGAY:**

> Local studies document the operational and record-keeping challenges of gamefowl farms. Gan (2018) found that Laguna breeders face disease exposure, climate variability, and rising input costs, and recommended systematic record keeping for long-term farm viability. Abraham (2017) similarly noted that many gamefowl farms remain unregistered and rely on informal management practices. These findings highlight the need for a more structured, digital approach to recording lineages and match histories. GalloTrack addresses this need by providing an integrated information system that digitizes the entire management process. Similar to how tracer studies evaluate program effectiveness for alumni, GalloTrack evaluates the performance outcomes of gamefowl by tracking winning percentages and parental influence. This lets administrators and farm owners quickly see performance results through easy-to-understand charts, helping them plan breeding cycles and make data-driven decisions more effectively.

---

## [p. 20] Algorithmic Lineage and Data Analytics — Replace the Domo Sentence

**Problem:** Domo is a commercial vendor, not “studies.” The sentence “According to studies on data analytics dashboards (Domo, n.d.)” is inaccurate.

**DAPAT NAKALAGAY:**

> Data analytics dashboards consolidate performance indicators into intuitive visualizations that support monitoring and decision-making (Techopedia, 2023). In computer science, representing complex parent–offspring relationships requires self-referencing database schemas and recursive algorithms. These technical tools allow for the calculation of fractional genetic contributions from ancestors, which reduces the guesswork traditionally associated with manual pedigree tracing. GalloTrack applies these concepts specifically to the gamefowl sector. While standard database systems simply store records, GalloTrack analyzes match results to compute winning percentages and uses a recursive algorithm to compute per-strain bloodline composition across multiple generations. It then presents these results through an analytics dashboard, helping breeders identify high-performing stock through data rather than anecdotal evidence.

---

## [p. 21] Remove the Orphan Numbered List and Integrate the Three Sources

**Problem:** The numbered list of Obinaju (2023), Zainuddin et al. (2023), and Paca Vargas et al. (2023) looks like leftover notes. It is not integrated into the literature review and is not in the reference list.

**DAPAT NAKALAGAY (replace the orphan list with this paragraph, placed under “Digital Transformation of Livestock and Poultry Record-Keeping”):**

> Related poultry systems also demonstrate the value of digital records. Obinaju (2023) emphasized record keeping as an effective management practice in poultry businesses in Uyo, Nigeria. Zainuddin et al. (2023) developed a monitoring and reporting system for broiler development using the PIECES framework, while Paca Vargas et al. (2023) proposed a computerized system for managing poultry production processes. These studies support the shift from manual records to structured digital monitoring and provide a basis for GalloTrack’s record-management features.

---

## [p. 24] Correct “Quadruply” and “Cascading Keys”

**DAPAT NAKALAGAY:**

> Umarova et al. (2026) digitized pedigree tracking in cattle management using an eight-table database connected through **foreign keys with cascading updates and deletes**, successfully expediting registration **fourfold** while constructing family trees automatically.

---

## [pp. 25–26] System Evaluation Based on ISO/IEC 25010 — Correct the Terms

**Problem:** The section uses “dependability,” “usability,” “execution efficiency,” “adaptability,” and “operational safety,” which are not the official ISO/IEC 25010:2023 terms.

**DAPAT NAKALAGAY:**

> **System Evaluation Based on ISO/IEC 25010 Standards**
>
> Global quality benchmarks, specifically ISO/IEC 25010, are widely applied to assess modern agricultural software frameworks. Sabado (2024) assessed a specialized layer poultry system across functional suitability, reliability, interaction capability, and maintainability. Similarly, Gabato et al. (2024) used IT professionals to evaluate a livestock monitoring platform focusing on performance efficiency, compatibility, and functional suitability. These studies confirm the usefulness of ISO/IEC 25010 metrics for assessing agricultural web applications and establishing standardized survey frameworks. Consequently, GalloTrack integrates the ISO/IEC 25010:2023 criteria—functional suitability, performance efficiency, compatibility, interaction capability, reliability, security, maintainability, flexibility, and safety—through a 5-point Likert rating scale completed by IT specialists, gamefowl breeders, and agriculture faculty.

---

## [pp. 27–29] Table 1 — Additional Rows

**Problem:** The table is missing several sources discussed in the text.

**DAPAT IDAGDAG sa Table 1:**

| Author/Source | Focus of the Literature | Key Contribution to the Study | Relevance to GalloTrack |
|---|---|---|---|
| Siena (2024) | Farm profitability and management practices in Sto. Tomas, Batangas | Examines profitability by enterprise size and highlights vaccination and disease mitigation | Supports the local gamefowl context and the need for systematic records |
| Pradas et al. (2024) | PERSEUS web-based pedigree visualization | Maps ancestral networks through directed graphs | Supports the lineage-tree and pedigree visualization features |
| Umarova et al. (2026) | Automated pedigree accounting in cattle breeding | Uses a relational database and automatic family-tree generation | Supports the self-referencing schema and automated lineage approach |
| Paucar-Chanca & Caso-Huamani (2023) | Cuytec mobile app for guinea pig records | Documents productive, reproductive, and genealogical records | Supports digital pedigree and breeding records for small livestock |
| Sabado (2024) | Layer Poultry Farm Management System | Evaluates a poultry management system using ISO/IEC 25010 | Supports the use of ISO/IEC 25010 in poultry system evaluation |
| Obinaju (2023) | Record keeping in poultry businesses in Uyo | Emphasizes record keeping as a management practice | Supports the need for structured poultry records |
| Paca Vargas et al. (2023) | Computerized poultry production management system | Proposes a system for managing poultry production processes | Supports the shift from manual to computerized poultry management |

**Also fix in the existing Baesa and Palaoag row:** “livestock-managemen t” → “livestock-management processes.”

---

## [pp. 18–26] Remove Overclaims

**Problem:** The chapter uses absolute claims that the system cannot support.

**DAPAT NAKALAGAY (replace the affected phrases):**

- “This ensures that genetic records are verifiable…” → **“This helps organize and preserve genetic records…”**
- “This ensures that breeders can identify high-performing stock through scientific data…” → **“This helps breeders identify high-performing stock through data…”**
- “which eliminates the guesswork…” → **“which reduces the guesswork…”**
- “the system checks the accuracy of genetic history…” → **“the system computes and presents the genetic composition…”**
- “not offered by standard platforms” → **“not commonly offered in general poultry systems”**

---

# CHAPTER 3 — METHODOLOGY

## [p. 31] Overview — Clarify Mobile Access

**DAPAT NAKALAGAY:**

> The system is accessible through web browsers on computers and through responsive mobile web/PWA access on mobile devices, allowing users to manage their data anytime and anywhere with an internet connection.

---

## [p. 31] 3.1 Research Design — Clarify Agile/Scrum

**Problem:** The paper claims Scrum but describes generic phases. Either commit to Scrum or call it Agile with four sprints.

**DAPAT NAKALAGAY:**

> **3.1 Research Design**
>
> The study adopts the **Agile Development Methodology**, specifically a **Scrum-based framework**, to design and develop GalloTrack. This approach allows iterative and incremental development, enabling the researchers to continuously improve system features such as the recursive lineage algorithm based on testing and stakeholder feedback. The development process is organized into **four sprints**, with each sprint including sprint planning, development, testing, review, and refinement. The Agile cycle guides the entire process through iterative phases of requirements, design, development, testing, deployment, and review.

---

## [p. 33] 3.2.1 Sprint 1 — Past Tense

**DAPAT NAKALAGAY:**

> In this initial stage, the researchers identified the functional and non-functional requirements of the system. This involved gathering data on gamefowl profiling (breed, weight, height, birthdate, and wing band), breeding history, and performance metrics. The goal was to define the features for lineage tracking and winning-percentage computation based on the needs of local breeders.

---

## [p. 33] 3.2.2 Sprint 2 — Past Tense

**DAPAT NAKALAGAY:**

> During this phase, the researchers designed the system architecture and created the database schema. A **self-referencing database** was developed to store and relate gamefowl records through the `sire_id` and `dam_id` fields. This design supports the recursive relationship-tracking system that visualizes family trees and maps genetic history.

---

## [p. 34] 3.2.3 Sprint 3 — Remove Marketplace, Add Actual Modules

**Problem:** The marketplace module is deprecated and removed. The sprint also under-describes the actual modules.

**DAPAT NAKALAGAY:**

> **3.2.3 Sprint 3: Web Application Development**
>
> This sprint focused on building the core platform. The researchers developed the web-based system for managing gamefowl records and implemented the parent–offspring relationship tracking feature. This phase also included the **breeding and lineage hub**, **gamefowl registry and inventory**, **match logging and history**, and **role-based access for farm owners and administrators**. A marketplace prototype was initially explored but was later deprecated and removed because it fell outside the study’s core lineage and analytics scope.

---

## [p. 34] 3.2.4 Sprint 4 — Past Tense

**DAPAT NAKALAGAY:**

> The final sprint involved the development of the in-depth analytics dashboard. This component visualizes breeding and performance data through graphical charts, specifically displaying winning percentages and per-strain bloodline performance. Following development, all components were integrated, and system testing and review were conducted to ensure the platform met the established software quality standards.

---

## [p. 35] Figure 3 — Use Case Diagram Description

**Problem:** The diagram merges “Admin” and “Owner” into one actor and misses several actual use cases.

**DAPAT NAKALAGAY (use this description and update the diagram):**

> Figure 3 shows two actors: the **Farm Owner/Breeder** and the **Administrator**. The Farm Owner manages gamefowl profiles and inventory, records breeding pairs and match results, tracks lineage and siblings, views analytics, and generates reports. The Administrator manages user accounts, verifies farms, configures system settings, reviews audit logs, and performs backup/restore. Both actors authenticate before accessing the system.

**Use cases to include:**

- Authenticate / Manage Account
- Manage Farm Profile
- Manage Gamefowl Registry and Inventory
- Track Lineage, Pedigree, and Siblings
- Manage Breeding Pairings
- Log Match Results and History
- View Analytics Dashboard
- Generate Reports (CSV / Print)
- Manage Safety Incidents
- Admin: Manage Users, Verify Farms, System Settings, Audit Logs, Backup/Restore

---

## [p. 36] Figure 4 — ERD Description and Actual Entities

**Problem:** The ERD shows `LINEAGE`, `PERFORMANCE`, and `MATCH_PARTICIPANT` tables that do not exist in the actual database. The actual system uses a self-referencing `fowl` table and computes performance metrics.

**DAPAT NAKALAGAY (use this description and redraw the ERD):**

> Figure 4 presents the database entities and their relationships. The central entity is **`fowl`**, which references itself through `sire_id` and `dam_id` to represent parent–offspring relationships. Each fowl belongs to a farm owner, may have multiple match records, may be part of breeding pairings, and may have status-history and safety-incident records. Bloodline composition is stored in `fowl.bloodline_composition` and `fowl.bloodline_pct`, while win rates are computed from match outcomes rather than stored in a separate performance table.

**Actual entities to show in the ERD:**

| Entity | Key Attributes | Relationships |
|---|---|---|
| `profiles` | `id`, `role`, `is_admin`, `farm_name`, `is_active` | One profile owns one farm |
| `farms` | `id`, `owner_id` (unique), `farm_name`, `contact_number` | One farm has many fowl |
| `fowl` | `id`, `user_id`, `name`, `breed`, `gender`, `birthdate`, `weight`, `height`, `wing_band`, `sire_id`, `dam_id`, `bloodline_composition`, `status` | Self-referencing sire/dam; one fowl has many matches, pairings, status-history rows, and photos |
| `match` | `id`, `user_id`, `fowl_id`, `opponent`, `date`, `outcome`, `post_fight_condition` | Many matches per fowl |
| `breeding_pairings` | `id`, `user_id`, `sire_id`, `dam_id`, `pairing_code`, `pairing_date`, `outcome` | Many pairings per sire/dam |
| `safety_incidents` | `id`, `user_id`, `fowl_id`, `incident_type`, `date`, `notes` | Many incidents per fowl |
| `fowl_status_history` | `id`, `fowl_id`, `field`, `old_value`, `new_value`, `changed_at` | Many history rows per fowl |
| `strains` | `id`, `name` | Reference list for breeds/strains |
| `fowl_photos`, `match_videos`, `match_photos` | Media references | Many media rows per fowl/match |
| `system_settings`, `admin_audit_logs` | Admin configuration and logs | Admin-only entities |

**Remove from the ERD:** `LINEAGE`, `PERFORMANCE`, `MATCH_PARTICIPANT`.

---

## [p. 37] Figure 5 — Context Diagram Description

**DAPAT NAKALAGAY:**

> Figure 5 presents GalloTrack as a single system interacting with two external entities: the **Farm Owner/Breeder** and the **Administrator**. The Farm Owner provides gamefowl profiles, breeding records, and match results, and receives lineage charts, performance analytics, and reports. The Administrator provides user and system configuration data and receives audit logs, account reports, and backup/restore outputs.

---

## [p. 38] Figure 6 — DFD Level 1 Description

**Problem:** The DFD has “Log Breeding Metrics” but no “Record Match Results,” which is a core process.

**DAPAT NAKALAGAY:**

> Figure 6 illustrates the major data processes within GalloTrack: (1) Authenticate and Manage Account, (2) Manage Gamefowl Registry, (3) Track Lineage and Siblings, (4) Manage Breeding Pairings, (5) Log Match Results, (6) Generate Analytics, (7) Generate Reports, and (8) Admin Management. These processes read from and write to the actual Supabase tables (`profiles`, `farms`, `fowl`, `match`, `breeding_pairings`, `safety_incidents`, `fowl_status_history`) rather than separate “Lineage DB” or “Metrics DB” stores.

---

## [p. 38] Figure 7 — Class Diagram Description

**Problem:** The class diagram shows `Performance` and `Lineage` classes that are not actual entities. Performance is computed, and lineage is a self-reference in `Fowl`.

**DAPAT NAKALAGAY:**

> Figure 7 describes the principal domain classes of GalloTrack: **Profile/User**, **Farm**, **Fowl**, **Match**, **BreedingPairing**, **SafetyIncident**, **StatusHistory**, and **ReportExport**. `Fowl` has self-referencing `sire` and `dam` relationships and a `bloodlineComposition` attribute. Win rate and bloodline statistics are computed by service functions rather than stored in separate `Performance` or `Lineage` classes.

---

## [p. 39] 3.3 Data Gathering Method — Expand

**Problem:** The section is only a three-item list with no procedure, participants, or ethics.

**DAPAT NAKALAGAY:**

> **3.3 Data Gathering Method**
>
> The researchers used the following methods to collect the necessary data:
>
> 1. **Interview.** The researchers interviewed gamefowl breeders and farm owners to identify their record-keeping practices, pain points, and desired features for lineage tracking and performance analysis.
> 2. **Observation.** The researchers observed how farms record gamefowl profiles, breeding pairs, and match results, including the use of notebooks, spreadsheets, and memory-based tracking.
> 3. **Review of Related Literature.** The researchers reviewed local and international studies on poultry record-keeping, livestock management systems, pedigree tracking, and ISO/IEC 25010 evaluation.
> 4. **Document Analysis.** Existing forms and records were examined to determine the data fields needed for the GalloTrack database schema.
>
> Participation was voluntary, and informed consent was obtained from all respondents. Personal information was handled in accordance with the Data Privacy Act of 2012 (RA 10173).

---

## [pp. 39–40] 3.4 System Architecture and Design — Corrected Modules

**Problem:** The list includes “Match Scheduling,” which does not exist, and omits actual modules.

**DAPAT NAKALAGAY:**

> **3.4 System Architecture and Design**
>
> GalloTrack is designed as a web-based information system that stores and manages gamefowl information in a centralized Supabase/PostgreSQL database. The system includes the following core modules:
>
> - **Authentication and Role-Based Access** – login, registration, OTP verification, and owner/admin roles.
> - **Farm Profile and Settings** – farm details, preferences, and account management.
> - **Gamefowl Registry and Inventory** – profiles, photos, wing bands, status, and lifecycle records.
> - **Lineage and Sibling Tracking** – family tree, pedigree, sire/dam offspring trees, and full-sibling families.
> - **Breeding and Lineage Hub** – breeding pairs, bird codes, and safety incidents.
> - **Match Logging and Performance History** – match results, post-fight conditions, and media evidence.
> - **In-Depth Analytics Dashboard** – winning percentages, strain performance, and bloodline composition.
> - **Reports and Export** – CSV export and printable/PDF reports.
> - **Admin Panel** – user management, farm verification, system settings, audit logs, and backup/restore.
>
> The system stores historical match records, breeding records, and genetic lineage data. Win rates and bloodline statistics are computed from these records rather than stored as separate performance tables.

---

## [p. 40] 3.5 Hardware and Software Requirements — Corrected Stack

**Problem:** Python/Flask is deprecated; the actual stack is Next.js + Supabase. There are also typos (“TypeScrpt”) and missing tools.

**DAPAT NAKALAGAY:**

> **3.5 Hardware and Software Requirements**
>
> **Hardware Requirements**
>
> - Laptop or desktop computer for system administration and data encoding
> - Mobile phone or tablet (Android or iOS) with a modern browser
> - Internet connection
>
> **Software Requirements**
>
> - Web browser: Google Chrome, Microsoft Edge, Mozilla Firefox, or Safari (latest versions)
> - Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS 4
> - Backend/Database: Supabase (PostgreSQL, Auth, Storage, Realtime)
> - Charts: Chart.js, react-chartjs-2
> - Hosting: Vercel
> - Development tools: Node.js 18+, npm, Git/GitHub, Visual Studio Code, Supabase CLI
>
> The earlier Flask prototype was retired after the team migrated to the Next.js + Supabase architecture.

---

## [pp. 41–42] 3.6 System Testing Method — Corrected and Expanded

**Problem:** Testing is incomplete, and the bloodline formula is misleading.

**DAPAT NAKALAGAY:**

> **3.6 System Testing Method**
>
> The developed system was tested using the following methods:
>
> - **Functional Testing** – to determine whether all features, including automated calculations, work correctly.
> - **Usability/Interaction Capability Testing** – to determine whether the system is intuitive and easy to use for breeders on both desktop and mobile web.
> - **Reliability Testing** – to ensure that the system works properly without errors or data loss, including backup and restore.
> - **Performance Testing** – to check dashboard loading and recursive lineage computation with a large flock.
> - **Security Testing** – to verify authentication, role-based access, and Row Level Security.
> - **Compatibility Testing** – to verify behavior across supported browsers and mobile devices.
> - **User Acceptance Testing (UAT)** – to evaluate the system using ISO/IEC 25010:2023.
>
> The system uses a recursive algorithm to calculate bloodline composition. For each breed/strain *s*:
>
> **B_offspring(s) = 0.5 × B_sire(s) + 0.5 × B_dam(s)**
>
> where `B_sire(s)` and `B_dam(s)` are the sire’s and dam’s percentage shares for strain *s*. The system applies this recursively across the pedigree and normalizes the results to 100%. If a parent is named but not registered, its share is recorded as “Unknown.” The system uses a fixed 50/50 contribution from the sire and dam; it does not use user-adjustable parent percentages.
>
> **Example:** Sire = 100% Kelso; Dam = 100% Hatch → Offspring = 50% Kelso, 50% Hatch.

---

## [pp. 42–43] 3.7 Ethical and Legal Considerations — Add Data Privacy

**Problem:** The section discusses animal welfare but not human data privacy and informed consent.

**DAPAT NAKALAGAY:**

> **3.7 Ethical and Legal Considerations**
>
> Since the study involves livestock, particularly gamefowl, the researchers ensured that the proposed system follows existing rules and regulations set by the appropriate government agencies responsible for animal welfare and livestock management. The study did not involve physical testing, experimentation, or harm to the animals. The system focuses solely on the recording, monitoring, and management of data such as lineage, performance records, and scheduling.
>
> The researchers also complied with the **Data Privacy Act of 2012 (RA 10173)**. Informed consent was obtained from all human respondents, participation was voluntary, and respondents could withdraw at any time. Personal information such as names, email addresses, and farm details was kept confidential and stored securely. Permission was obtained from participating farm owners before their records were observed or used in the study.
>
> Furthermore, the researchers included a disclaimer stating that GalloTrack is intended exclusively for analytical record-keeping and breeding management purposes and does not promote any activity that violates existing animal welfare laws or government regulations.

---

## [pp. 43–45] System Evaluation — Number as 3.8 and Correct Definitions

**Problem:** The section is unnumbered and some definitions are incorrect.

**DAPAT NAKALAGAY:**

> **3.8 System Evaluation**
>
> GalloTrack was evaluated using the ISO/IEC 25010:2023 software quality model, which defines nine quality characteristics for assessing software quality. The table below presents the correct definitions and how GalloTrack addresses each characteristic.

| ISO/IEC 25010:2023 Characteristic | Correct Definition | How GalloTrack Addresses It |
|---|---|---|
| Functional Suitability | Degree to which the system provides functions that meet stated and implied needs under specified conditions | Registry, lineage, match logs, analytics, and reports work as specified |
| Performance Efficiency | Degree to which the system performs its functions within acceptable response time and resource use | Dashboard loads efficiently; recursive lineage computation is optimized |
| Compatibility | Degree to which the system can exchange information with other systems or perform functions while sharing the same environment | Runs on modern browsers/devices; supports CSV/JSON export and backup/restore |
| Interaction Capability | Degree to which specified users can interact with the system effectively, efficiently, and satisfactorily | Clear navigation, responsive UI, error prevention, and accessible labels |
| Reliability | Degree to which the system performs specified functions under specified conditions for a specified period | Consistent calculations, error handling, and backup/restore |
| Security | Degree to which the system protects information and data so that access is appropriate to authorization levels | Supabase Auth, role-based access, and Row Level Security |
| Maintainability | Degree of effectiveness and efficiency with which the system can be modified by intended maintainers | Modular code, migrations, automated tests, and documentation |
| Flexibility | Degree to which the system can adapt to changes in requirements, contexts of use, or environment | Supports new breeds/strains, match types, and farm settings |
| Safety | Degree to which the system avoids states that can endanger human life, health, property, or the environment | Data-loss safeguards, clear disclaimers, and avoidance of misleading outputs |

---

## [pp. 45–46] The Respondents — Fix the Count and Add Breakdown

**Problem:** Chapter 1 says 15 evaluators; this section says 20. The corrected text below uses 20.

**DAPAT NAKALAGAY:**

> **3.8.1 The Respondents**
>
> The evaluation of GalloTrack was conducted among **20 respondents**: **[X] IT experts**, **[Y] gamefowl owners/breeders**, and **[Z] agriculture faculty** from the Iloilo State University of Fisheries Science and Technology (ISUFST) Dingle Campus. The respondents were selected through **purposive sampling** based on their relevance, experience, and contribution to the evaluation process. The criteria included at least one year of experience in gamefowl breeding or farm management, familiarity with digital record-keeping, or expertise in software evaluation.

**Note:** Fill in X, Y, and Z so that they total 20. If your actual total is 15, change **all** mentions in Chapter 1 and Chapter 3 to 15.

---

## [p. 46] Research Instrument — Rename and Add Validation

**Problem:** “Research Gathering Instrument” is grammatically incorrect, and the instrument’s validity/reliability is asserted without evidence.

**DAPAT NAKALAGAY:**

> **3.8.2 Research Instrument**
>
> Data were gathered using a researcher-made survey questionnaire. The instrument was validated by **[three] IT and agriculture experts** and pilot-tested among **[n] non-respondents**. Reliability was assessed using **Cronbach’s alpha**, which yielded **[value]**, indicating acceptable internal consistency.
>
> The system was evaluated using a 5-point Likert scale: **5 – Excellent, 4 – Very Good, 3 – Good, 2 – Fair, 1 – Poor**. Descriptive statistics, specifically the **weighted mean and standard deviation**, were used to determine the level of assessment.
>
> **Scale Interpretation**
>
> | Range | Interpretation |
> |---|---|
> | 4.20–5.00 | Excellent |
> | 3.40–4.19 | Very Good |
> | 2.60–3.39 | Good |
> | 1.80–2.59 | Fair |
> | 1.00–1.79 | Poor |

**Note:** Replace the bracketed values with your actual validation and reliability results.

---

# CHAPTER 4 — CROSS-FIXES (BRIEF)

These are not part of Chapters 1–3, but they affect consistency.

## [p. 47] Chapter 4 Intro — Evaluation Results

**Problem:** The intro says the chapter includes evaluation results, but pages 47–56 only describe the system and show screenshots.

**DAPAT IDAGDAG after the system description:**

> **Evaluation Results**
>
> The evaluation results are summarized in the table below.

| ISO/IEC 25010:2023 Criterion | Mean | Standard Deviation | Interpretation |
|---|---|---|---|
| Functional Suitability | | | |
| Performance Efficiency | | | |
| Compatibility | | | |
| Interaction Capability | | | |
| Reliability | | | |
| Security | | | |
| Maintainability | | | |
| Flexibility | | | |
| Safety | | | |
| **Overall Weighted Mean** | | | |

**Note:** Fill in the actual means and SDs from your survey. Add a short discussion of each criterion and the overall interpretation.

## [pp. 49–56] Figure Numbering

**Problem:** Chapter 1 already has Figure 1, and Chapter 4 restarts at Figure 1.

**DAPAT NAKALAGAY:**

- If using continuous numbering: Chapter 4 should start at **Figure 9**.
- If using per-chapter numbering: use **Figure 1.1**, **Figure 3.1**, **Figure 4.1**, etc.

## [pp. 47–56] Features Not in Chapters 1–3

Chapter 4 mentions **breeding pairings**, **safety incidents**, **bird codes**, **inventory/catalog**, and the **admin panel**, but these are missing from the Chapter 1 scope and Chapter 3 modules. Add them to the scope/modules or explain why they are excluded.

---

# CORRECTED REFERENCES

Replace the current reference list with the following. Remove the uncited sources (Open Access Pub, ResearchGate, Salto Gamefowl Care, ScienceDirect, UNAHCO, Virtue Supplements) and the unsupported UPLB (2020) entry.

> Abraham, J. K. M. (2017). *An analysis of the gamefowl industry in selected areas in Batangas City* [Undergraduate thesis, University of the Philippines Los Baños]. UPLB University Knowledge Digital Repository. https://www.ukdr.uplb.edu.ph/etd-undergrad/12163/
>
> Baesa, E. M., & Palaoag, T. D. (2024). Digital transformation in swine farms: The design, development, and adoption of SwineTech. *2024 International Conference on Applied System Innovation (ICASI)*. https://doi.org/10.1109/icasi60819.2024.10547741
>
> Basir, M. S., Buckmaster, D., Raturi, A., & Zhang, Y. (2024). From pen and paper to digital precision: A comprehensive review of on-farm recordkeeping. *Precision Agriculture, 25*(6), 2643–2682. https://doi.org/10.1007/s11119-024-10172-7
>
> Beck, K., Beedle, M., van Bennekum, A., Cockburn, A., Cunningham, W., Fowler, M., Grenning, J., Highsmith, J., Hunt, A., Jeffries, R., Kern, J., Marick, B., Martin, R. C., Mellor, S., Schwaber, K., Sutherland, J., & Thomas, D. (2001). *Manifesto for agile software development*. https://agilemanifesto.org/
>
> Biology Online. (2022). *Bloodline*. https://www.biologyonline.com/dictionary/bloodline
>
> Cambridge University Press. (2024). Winning percentage. In *Cambridge Dictionary*. https://dictionary.cambridge.org/dictionary/english/winning-percentage **[VERIFY exact URL]**
>
> Cormen, T. H., Leiserson, C. E., Rivest, R. L., & Stein, C. (2022). *Introduction to algorithms* (4th ed.). MIT Press.
>
> Encyclopaedia Britannica. (2024). *Parent and offspring*. https://www.britannica.com/science/parent-offspring-relationship **[VERIFY exact URL]**
>
> Gabato, A. J., Vendivil, J., Sison, B. A., Botangen, K. A., del Rosario, N. A., & Santiago, K. G. (2024). Development of an RFID-based record management web portal for goats towards precision livestock farming. *2024 IEEE International Conference on Computing (ICOCO)*. https://doi.org/10.1109/icoco62848.2024.10928232
>
> Gan, J. M. (2018). *Status, problems, and prospects of gamefowl breeding production and marketing in selected areas of Laguna* [Undergraduate thesis, University of the Philippines Los Baños]. UPLB University Knowledge Digital Repository. https://www.ukdr.uplb.edu.ph/etd-undergrad/12100/
>
> GeeksforGeeks. (2024). *Recursive algorithms*. https://www.geeksforgeeks.org/recursive-algorithms/ **[VERIFY exact URL]**
>
> International Organization for Standardization. (2015). *Quality management systems — Fundamentals and vocabulary* (ISO 9000:2015). https://www.iso.org/standard/45481.html
>
> International Organization for Standardization. (2023). *Systems and software Quality Requirements and Evaluation (SQuaRE) — Product quality model* (ISO/IEC 25010:2023). https://www.iso.org/standard/78176.html
>
> Jelokhani-Niaraki, A., & Omidipour, R. (2023). Design and deployment of a web-driven GIS framework for logging and tracking livestock and poultry genetic assets. *Brazilian Archives of Biology and Technology, 66*, e23220759. https://doi.org/10.1590/1678-4324-2023220759
>
> Likert, R. (1932). A technique for the measurement of attitudes. *Archives of Psychology, 22*(140), 1–55.
>
> Marhaini, M., Sultan, M. I., & Akbar, M. (2024). Designing a web service based recording application at Asia Farm. *Advances in Social Science, Education and Humanities Research, 843*. https://doi.org/10.2991/978-2-38476-236-1_63
>
> Mendeja, K. L. D., Dulce, N. R., Martinez, V. U., Tuazon, C. N., Gaspado, J. M., & Magnaye, N. A. (2023). Development using the rapid application model of peTrace: Peter’s Poultry Supply Sales and Monitoring Management System. *International Journal of Multidisciplinary, 1*(1). https://doi.org/10.54536/ijm.v1i1.1499
>
> Merriam-Webster. (2024). Dam. In *Merriam-Webster.com dictionary*. https://www.merriam-webster.com/dictionary/dam
>
> Merriam-Webster. (2024). Gamefowl. In *Merriam-Webster.com dictionary*. https://www.merriam-webster.com/dictionary/gamefowl
>
> Obinaju, L. (2023). *Record keeping: An effective management practice in poultry business in Uyo Local Government Area of Akwa Ibom State* [VERIFY journal/repository and URL].
>
> Oxford University Press. (2024). Administrator. In *Oxford Learner’s Dictionaries*. https://www.oxfordlearnersdictionaries.com/definition/english/administrator
>
> Paca Vargas, E. R., Torres, M. X., & Fierro Garcia, T. M. (2023). *Sistema informático para la gestión de procesos de producción avícola* [Computerized system for the management of poultry farm production processes] [VERIFY journal and URL].
>
> Palinkas, L. A., Horwitz, S. M., Green, C. A., Wisdom, J. P., Duan, N., & Hoagwood, K. (2015). Purposeful sampling for qualitative data collection and analysis in mixed method implementation research. *Administration and Policy in Mental Health and Mental Health Services Research, 42*(5), 533–544. https://doi.org/10.1007/s10488-013-0528-y
>
> Paucar-Chanca, R., & Caso-Huamani, L. E. (2023). Cuytec (Versión 1.0): Aplicación de celular para la gestión de registros productivos, reproductivos y genealógicos en cuyes. *Revista Científica de la Facultad de Ciencias Veterinarias, 33*, e33251. https://doi.org/10.52973/rcfcv-e33251
>
> Pradas, N., Jurado-Ruiz, F., Onielfa, C., Arús, P., & Aranzana, M. J. (2024). PERSEUS: An interactive and intuitive web-based tool for pedigree visualization. *Bioinformatics, 40*(2), btae060. https://doi.org/10.1093/bioinformatics/btae060
>
> Sabado, W. (2024). Acceptability of the layer poultry farm management system. *International Journal of Computing Sciences Research*, 2580–2591. https://doi.org/10.25147/ijcsr.2017.001.1.176 **[VERIFY volume/issue]**
>
> Siena, [Initial]. (2024). *[Title of thesis]* [Undergraduate thesis, University of the Philippines Los Baños]. **[VERIFY complete title, author, and URL]**
>
> Techopedia. (2023). *What is a data analytics dashboard?* https://www.techopedia.com/definition/data-analytics-dashboard
>
> The Poultry Site. (n.d.). *Management of gamefowl: Breeding seasons, housing, and trio systems*. https://www.thepoultrysite.com/articles/production-cycles-for-backyard-poultry **[VERIFY that this URL contains the exact trio discussion]**
>
> Umarova, M., Alykeev, I., Zhanboev, E., Sultangaziev, E., & Azhimamatova, A. (2026). Development of software for the automation of pedigree accounting in cattle breeding. *Journal of Dairy Research*, 1–14. https://doi.org/10.1017/S002202992610243X
>
> Zainuddin, M., Irawati, I., & Mude, M. A. (2023). Sistem monitoring pelaporan perkembangan ayam broiler menggunakan metode PIECES. *Buletin Sistem Informasi dan Teknologi Islam, 4*(1), 81–92. https://doi.org/10.33096/busiti.v4i1.1602

---

# QUICK CHECKLIST

- [ ] Title page: correct college name, “A Capstone Project,” author names.
- [ ] Objectives: grammar and ISO 25010 names.
- [ ] Conceptual Framework: Sire/Dam, separate match analytics from bloodline computation, “functional suitability.”
- [ ] Scope: add Limitations.
- [ ] Definition of Terms: Administrator, Farm Owner, Dam/Sire, ISO terms, winning percentage, 20 respondents.
- [ ] Chapter 2: replace BYU, UPLB, and Domo sentences; remove orphan list; add Table 1 rows; fix ISO terms and overclaims.
- [ ] Chapter 3: past tense; remove marketplace; remove match scheduling; update stack; update diagrams; add data privacy; correct testing; correct ISO definitions; fix respondent count; rename instrument; add validation.
- [ ] Chapter 4: add evaluation results table; fix figure numbering.
- [ ] References: replace with corrected list; remove uncited sources; verify `[VERIFY]` items.
