# GalloTrack Internationalization (i18n) Glossary

This document establishes the canonical terminology and translation standards across English (`en`), Tagalog (`tl`), and Hiligaynon (`hil` - Beta).

---

## 1. Domain Terminology Matrix

| English Concept | Canonical DB Value (Never Translate) | Tagalog Display Label | Hiligaynon Display Label (Beta) | Notes & Context |
| :--- | :--- | :--- | :--- | :--- |
| **Sire** | `'Sire'` | Sire | Sire | Canonical gamefowl term: keep "Sire" in English in all three languages (no "Ama" or "Amay" as UI label; native glosses in tooltips only) |
| **Dam** | `'Dam'` | Dam | Dam | Canonical gamefowl term: keep "Dam" in English in all three languages (no "Ina" or "Iloy" as UI label; native glosses in tooltips only) |
| **Parents** | — | Sire at Dam | Sire kag Dam | Breeder-approved phrasing (consultant wrote "sire kag dam") |
| **Offspring (Tab / Filter)** | `'Offspring'` | Offspring | Offspring | Tab & filter label kept as "Offspring" across all three languages |
| **Offspring (Plural noun in text)** | — | mga anak | mga bata | Native consultant approved: "mga bata" in Hiligaynon, "mga anak" in Tagalog. Use only where a plural noun is required; never as a label |
| **Cock** | `'Cock'` | Cock | Cock | Mature male gamefowl (2+ years) |
| **Bull Stag** | `'Bull Stag'` | Bull Stag | Bull Stag | Young adult male gamefowl (12–24 months) |
| **Stag** | `'Stag'` | Stag | Stag | Young male gamefowl (6–11 months) |
| **Pullet** | `'Pullet'` | Pullet | Pullet | Young female gamefowl (6–11 months) |
| **Hen** | `'Hen'` | Hen | Hen | Mature female bird (12+ months) |
| **Chick** | `'Chick'` | Chick (Sisiw) | Chick | Tagalog keeps a gloss after the canonical term; Hiligaynon keeps the canonical term only until a native reviewer confirms a gloss |
| **Active** | `'Active'` | Aktibo | Aktibo | Status: In active yard |
| **Archived** | `'Archived'` | Naka-archive | Naka-archive | Status: Retained in records |
| **Deceased** | `'Deceased'` | Pumanaw | Napatay | Status: Dead |
| **Sold** | `'Sold'` | Naibenta | Nabaligya | Status: Transferred/sold |
| **Quarantined** | `'Quarantined'` | Naka-quarantine | Naka-quarantine | Status: Isolation pen |
| **Purebred** | `'Purebred'` | Purebred | Purebred | Breeding Type: 100% single bloodline |
| **Crossbred** | `'Crossbred'` | Crossbred | Crossbred | Breeding Type: Hybrid multiple bloodlines |
| **Unverified Lineage** | `'Unverified'` | Unverified Lineage | Unverified Lineage | Breeding Type: Unverified lineage |
| **Outcross** | `'Outcross'` | Outcross | Outcross | Relatedness category (Close Breeding, Line Breeding, Outcross) — **never** a Breeding Type |
| **Close Breeding** | `'Close'` | Close Breeding | Close Breeding | Relatedness category |
| **Line Breeding** | `'Line'` | Line Breeding | Line Breeding | Relatedness category |
| **Inbreeding** | `'Inbreeding'` | Inbreeding | Inbreeding | Relatedness: Closely related pairing |
| **Win** | `'Win'` | Panalo | Daug | Match result |
| **Loss** | `'Loss'` | Talo | Pildi | Match result |
| **Draw** | `'Draw'` | Tabla | Tabla | Match result |
| **No Contest** | `'No Contest'` | Walang Laban | Wala Laban | Canceled or abandoned |

### 1.1 Breeding Type vs Relatedness (do not mix up)

| Dimension | Allowed values | Where it appears |
| :--- | :--- | :--- |
| **Breeding Type** | Purebred · Crossbred · Unverified Lineage (+ "All") | `registry.breedingTypeLabel` filter on the Chicken Registry / Inventory |
| **Relatedness** | Close Breeding · Line Breeding · Outcross | Relatedness badge / bloodline report |

`Outcross` is **not** a breeding type. The breeder-side filter offers only
`All Breeding Types`, `Purebred`, `Crossbred`, `Unverified Lineage` in every
language, and the Outcross label is only reachable through the relatedness
dimension (`domain.relatednessOutcross`).

### 1.2 Growth stages (all six are always offered)

The stored `growth_stage` values are canonical and never translated:
`Chick`, `Stag`, `Bull Stag`, `Pullet`, `Cock`, `Hen`.
Every filter that offers a stage must offer **all six**, in this order,
regardless of which stages happen to exist in the current flock.

---

## 2. Platform & App Shell Terminology

| Concept | English (`en`) | Tagalog (`tl`) | Hiligaynon (`hil` - Beta) |
| :--- | :--- | :--- | :--- |
| Dashboard | Dashboard | Dashboard | Dashboard |
| Chicken Registry | Chicken Registry | Rehistro ng Manok | Listahan sang Manok |
| Breeding Hub | Breeding Hub | Sentro ng Pagpapalahi | Sentro sang Pagpaliwat |
| Match History | Match Logs | Talaan ng Laban | Listahan sang Hampang |
| Analytics | Analytics | Pagsusuri | Pagsusuri |
| Settings | Settings | Mga Setting | Mga Kahusayan |
| Preferences | Preferences | Mga Kagustuhan | Mga Pinasahi nga Gusto |
| Log In | Sign In | Mag-sign In | Mag-sulod |
| Log Out | Log Out | Mag-log Out | Mag-gwa |
| Create Account | Create Account | Gumawa ng Account | Maghimo sang Account |
| Save Changes | Save Changes | I-save ang mga Pagbabago | Tipigan ang mga Ginbag-o |
| Cancel | Cancel | Kanselahin | Kanselahon |
| Delete | Delete | Burahin | Panason |
| Today | Today | Ngayong Araw | Subong nga Adlaw |
| Last 7 Days | Last 7 Days | Huling 7 Araw | Nagligad nga 7 ka Adlaw |
| Last 30 Days | Last 30 Days | Huling 30 Araw | Nagligad nga 30 ka Adlaw |
| This Month | This Month | Ngayong Buwan | Subong nga Bulan |
| All Time | All Time | Lahat ng Oras | Halin Sang Una |
| Custom Range | Custom Range | Pasadyang Saklaw | Imo Pili nga Petsa |

---

## 3. Translation Principles

1. **Gamefowl Integrity Rule:**
   International gamefowl breeding terms (e.g., *Sweater, Kelso, Hatch, Albany, Roundhead, Derby, Cock, Stag, Sire, Dam*) are standard technical terms used nationwide by breeders in the Philippines. They must not be forced into obscure or artificial dialect equivalents.

2. **Display vs Storage Separation:**
   Database records store exact canonical English strings (`'Active'`, `'Sold'`, `'Win'`, `'Sire'`). Localized text is strictly applied at the presentation boundary via `translateStatus()`, `translateRole()`, etc.

3. **Pluralization:**
   Tagalog and Hiligaynon do not use English-style `s` / `es` suffixes. Instead, they use markers like `"mga"` or numbers with ligatures (`"7 ka adlaw"`). Reusable plural helpers in `lib/i18n/formatters.ts` (`pluralize()`) format these expressions correctly.

4. **No invented words:**
   Every Tagalog and Hiligaynon string must either be a standard word in that
   language, a canonical gamefowl term kept in English, or a gloss attached to
   a canonical English term. If a translation is uncertain, keep the English
   term, do not guess, and record the uncertainty in
   [`docs/i18n-review.md`](./i18n-review.md). Hiligaynon in particular is
   **unreviewed** until a native Ilonggo speaker signs off.

5. **Labels vs plural nouns:**
   `Offspring` stays the tab and filter label in all three languages. Use
   `mga anak` (Tagalog) / `mga bata` (Hiligaynon) only where the sentence
   actually needs a plural noun ("Mga Bata ni Juan", "Mga Anak ng Juan").

6. **Growth stages are always complete:**
   Filters that offer a growth stage must offer all six stored values
   (`Chick`, `Stag`, `Bull Stag`, `Pullet`, `Cock`, `Hen`) so that a stage can
   never silently disappear from the list depending on the current flock.
