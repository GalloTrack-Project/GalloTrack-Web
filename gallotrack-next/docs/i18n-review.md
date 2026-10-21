# GalloTrack Internationalization (i18n) Review & Workflow Guide

## 1. Overview
GalloTrack uses a zero-dependency, strongly-typed custom dictionary system supporting:
- `en` — English (Canonical source of truth)
- `tl` — Tagalog (Natural Filipino)
- `hil` — Hiligaynon / Ilonggo (Western Visayas dialect, currently marked **Beta**)

---

## 2. Hiligaynon (Beta) Status & Limitations
- **Beta Banner:** Whenever Hiligaynon is selected, a subtle `[Beta]` chip is displayed in the switcher, and a notice appears in Settings › Preferences.
- **Unreviewed by default:** **Every** Hiligaynon string that is not a preserved canonical English term is exported with `hil_status = unreviewed` and the note *"Hiligaynon (Beta): not yet confirmed by a native Ilonggo speaker."* Nothing in `hil` may be promoted to `reviewed` without a native Ilonggo speaker's sign-off.
- **Intl API Fallback:** `Intl.DateTimeFormat` and `Intl.NumberFormat` in V8/Node.js and modern browsers return empty arrays for `supportedLocalesOf(['hil'])`. GalloTrack automatically falls back to `fil-PH` / `en-PH` for numeric and peso formatting, while using an explicit Hiligaynon dictionary for month and weekday names (`HIL_MONTHS`, `HIL_WEEKDAYS`).
- **Breed & Bloodline Preservation:** Bloodline names (*Sweater*, *Kelso*, *Roundhead*) and cockfighting classifications (*Cock*, *Stag*, *Sire*, *Dam*, *Derby*) remain in English across all dialects as per standard Philippine cockfighting practice.

---

## 3. How to Add New Translation Keys Safely

### Step 1: Update `lib/i18n/types.ts` (if adding a new category)
If you are introducing a whole new dictionary section, declare it in `AppTranslations`. If adding keys to an existing category, TypeScript will infer the key paths from `en.ts`.

### Step 2: Add Keys to `lib/i18n/en.ts`
Add the key and its canonical English translation with any interpolation placeholders (e.g. `{count}`, `{name}`):
```ts
export const en = {
  // ...
  mySection: {
    welcome: 'Welcome, {name}!',
  },
} as const;
```

### Step 3: Implement Translations in `lib/i18n/tl.ts` and `lib/i18n/hil.ts`
Both `tl.ts` and `hil.ts` are typed with `: AppTranslations`. If you miss any key or introduce mismatched placeholders, `npm run typecheck` will immediately fail.

### Step 4: Run the Audit Script
```bash
npm run i18n:audit
```
This verifies key parity, checks placeholder consistency, and reports any issues.

### Step 5: Export to CSV for Translator Review
```bash
npm run i18n:export
```
This outputs `docs/i18n-review/translations.csv` and `locales/{en,tl,hil}.json`.

### Step 6: Record why a string is uncertain
Add an entry to `scripts/i18n-review-notes.ts`:
```ts
'mySection.myKey': { tl: 'Why the Tagalog wording is uncertain.', hil: 'Why the Hiligaynon wording is uncertain.' },
```
The exporter writes those reasons into the `tl_note` / `hil_note` CSV columns.

---

## 4. Phase 2, Feature 1 — Review Findings

### 4.1 "Mga Tindig" for Offspring — **not present in the codebase**
The reviewer flagged *"Mga Tindig"* as the Hiligaynon label for Offspring. That string does **not** exist in GalloTrack:

| Where searched | Result |
| :--- | :--- |
| `lib/i18n/{en,tl,hil}.ts` (working tree) | no match |
| `locales/{en,tl,hil}.json` (generated) | no match |
| `docs/i18n-glossary.md`, `docs/i18n-review.md`, `docs/i18n-review/translations.csv` | no match |
| Every tracked file in the repo (full-text scan) | no match |
| Git history (`git log -S "Tindig" --all`) | no match (the string was never committed) |
| Prior session artefacts under `scratch/` | no match |

The Hiligaynon Offspring wording in the code is **"mga bata"** (plural noun) with
**"Offspring"** kept as the tab/filter label, exactly as the breeder consultant
wrote it. The review did change the *remaining* inconsistencies (see 4.2).

### 4.2 Offspring wording changes made in this review

| Key | Tagalog before → after | Hiligaynon before → after | Reason |
| :--- | :--- | :--- | :--- |
| `registry.awaitingParents` | `Naghihintay ng Magulang` → `Naghihintay ng Sire at Dam` | `Nagahulat sang Ginikannya` → `Nagahulat sang Sire kag Dam` | Glossary: Parents = "Sire at Dam" / "Sire kag Dam" (consultant's own wording) |
| `registry.awaitingParentsStatus` | same as above | same as above | Same rule |
| `registry.offspringBreedingClassAria` | `...ng pampalahing offspring` → `...ng pampalahi para sa mga anak` | `...sang pampalahi nga offspring` → `...sang pampalahi para sa mga bata` | Plural noun must be "mga anak"/"mga bata" |
| `registry.categoryBreedingStockTooltip` | `Mga offspring na ...` → `Mga anak na ...` | `Mga offspring nga ...` → `Mga bata nga ...` | Plural noun rule |
| `registry.noBreedingStockDesc` | `Walang offspring na ...` → `Walang anak na ...` | `Wala sang offspring nga ...` → `Wala sang bata nga ...` | Plural noun rule |
| `registry.noNonBreedingDesc` | `Walang offspring na ...` → `Walang anak na ...` | `Wala sang offspring nga ...` → `Wala sang bata nga ...` | Plural noun rule |
| `registry.noOffspringDesc` | `Walang nakitang mga manok na offspring sa rehistro.` → `Walang nakitang mga anak sa rehistro.` | unchanged (`mga bata nga manok`) | Plural noun rule |
| `registry.noOffspring` | unchanged (`Walang Offspring`, label usage) | `Wala sang Bata` → `Wala sang mga Bata` | Plural noun rule |
| `registry.existingOffspringSiblings` | `Mga Kasalukuyang Offspring at Kapatid` → `Mga Kasalukuyang Anak at Kapatid` | `Mga Yara nga Offspring kag Utod` → `Mga Yara nga Bata kag Utod` | Plural noun rule ("Yara" still flagged) |
| `registry.viewChildrenTitle` | `Tingnan ang {count} inakay ng {name}` → `Tingnan ang {count} na anak ng {name}` | `Tan-awa ang {count} ka pisu sang {name}` → `Tan-awa ang {count} ka bata sang {name}` | Plural noun rule; "pisu" was inconsistent with "mga bata" |
| `registry.offspringOf` | `Mga Offspring ng {name}` → `Mga Anak ng {name}` | `Mga Offspring sang {name}` → `Mga Bata sang {name}` | Plural noun rule |
| `registry.sortOffspring` | unchanged (`Pinakamaraming anak`) | unchanged (`Pinakadamo nga bata`) | Already compliant |

Sire and Dam stay in English in all three languages (`roleSire: 'Sire'`,
`roleDam: 'Dam'`, `sireOption: 'Sire'`, `damOption: 'Dam'`). There is no
"Ama/Ina" or "Amay/Iloy" label anywhere in the dictionaries; native glosses are
tooltip-only.

---

## 5. Strings that are NOT fully confirmed

> [!IMPORTANT]
> Never mark Hiligaynon strings as "reviewed" without confirmation from a native Ilonggo speaker familiar with cockfighting/farming vocabulary.

### 5.1 Hiligaynon — blanket status: **unreviewed**

All 396 translated Hiligaynon strings carry `hil_status = unreviewed` in
`docs/i18n-review/translations.csv` and the blanket reason *"Hiligaynon (Beta):
not yet confirmed by a native Ilonggo speaker."* The table below lists the
strings with a **specific** reason (word choice that I could not verify, a
domain coinage, or a change made during this review). The complete
key-by-key enumeration with status and reason is the CSV.

| Key | English (`en`) | Hiligaynon (`hil`) | Reason / Question |
| :--- | :--- | :--- | :--- |
| `common.save` | Save | I-save | English loan verb. "Tipigan" (to store) is the native alternative. |
| `common.close` | Close | Isira | Bare infinitive; the imperative form may read better on a button. |
| `common.clear` | Clear | Tinluan | "Tinluan" (to clean) for the "Clear filters" action - uncertain. |
| `common.delete` | Delete | Panason | Standard Hiligaynon, but the English loan "delete" is equally common. |
| `common.previous` | Previous | Nagligad | "Nagligad" actually means "recent/past"; "Kaagi" (before) may be better for the Previous control. |
| `common.no` | No | Indi | Tagalog loan. Hiligaynon normally uses "Hui" for "no" - needs confirmation next to "Huo" (yes). |
| `common.optional` | Optional | opsyonal | English loan, common in Philippine apps but not confirmed by a native speaker. |
| `nav.profile` | Profile | Akon Profile | "Akon" is Manobo/Hindi; Hiligaynon expects "Akong"/"Ako". |
| `nav.registry` | Chicken Registry | Listahan sang Manok | Confirm whether "Rehistro" should be kept for consistency with the registry tab. |
| `header.languageSwitcher` | Change language | Ilisi ang hambal/pinulongan | "hamba" as a word for "language" needs confirmation. |
| `header.searchPlaceholder` | Search everything (chicken, lineage, match)... | Pangitaa ang bisan ano (manok, kaliwat, hampang)... | "kaliwat" for "lineage" needs confirmation. |
| `domain.statusArchived` | Archived | Nakatago (Archived) | "Nakatago" means "hidden"; "Naka-archive" may read clearer. |
| `domain.statusDeceased` | Deceased | Napatay | Blunt for a record; "Nagtaliwan" (passed away) may be preferred. |
| `domain.outcomeLoss` | Loss | Pirdi | Cebuano-flavoured; confirm with a Hiligaynon speaker. |
| `domain.outcomeNoContest` | No Contest | Wala Laban | Some speakers say "Wala sing laban". Not confirmed. |
| `registry.trait` | Trait | Kinaiya / Trait | "Kinaiya" is also used for gender in `genderClass` - the two labels collide. |
| `registry.genderClass` | Sex & Class | Kinaiya kag Klase | "Klase" is an English loan and "Kinaiya" collides with the trait label. |
| `registry.step1Title` | Step 1: Basic Identity | Tikang 1: Panguna nga Pagkakilalanan | "Tikang 1" reads as "from 1"; "Hugpo 1" may be more natural for a step heading. |
| `registry.step2Title` | Step 2: Physical Measurements | Tikang 2: Pisikal nga Sukol | Same step-heading doubt. |
| `registry.step3Title` | Step 3: Origin & Photo | Tikang 3: Ginhalinan nga Lahi kag Litrato | Same step-heading doubt; "Ginhalinan nga Lahi" also needs confirmation. |
| `registry.growthStage` | Growth Stage | Lebel sang Pagdako | "Lebel" is an English loan; "Pagdako" (growth) is fine. |
| `registry.birthDate` | Date of Birth | Petsa sang Pagkabun-ag | "Pagkabun-ag" (hatching) needs confirmation. |
| `registry.featherColor` | Feather Color | Kolor sang Bulbol | "Bulbol" (feather) is Visayan - confirm for chicken feathers. |
| `registry.legColor` | Leg Color | Kolor sang Tiil | "Tiil" (leg) - confirm. |
| `registry.validationPassed` | Passed | Napasar | Loan from English "pass"; confirm. |
| `registry.fullSiblingsNotice` | ✓ {count} full sibling(s) with current dam | ✓ {count} bilog nga utod kaupod ang subong nga dam | "bilog" (whole) and "utod" (sibling) both need confirmation. |
| `registry.lineageResolved` | Lineage resolved | Nahusay ang Kaliwat | "nahusay" (clean/neat) as "resolved" needs confirmation. |
| `registry.matchingColors` | Matching colors | Nagasanto nga mga kolor | "nagasanto" (matched) needs confirmation. |
| `registry.existingOffspringSiblings` | 👤 Existing Offspring & Siblings | 👤 Mga Yara nga Bata kag Utod | "Yara" (relatives) is uncertain; "Utod" (sibling) needs confirmation. |
| `registry.awaitingParents` | Awaiting Parents | Nagahulat sang Sire kag Dam | Changed in this review (glossary + consultant wording); confirm the verb "nagahulat". |
| `registry.viewChildrenTitle` | View {count} children of {name} | Tan-awa ang {count} ka bata sang {name} | Changed in this review from "pisu" to "bata"; confirm "tan-awa". |
| `registry.offspringOf` | Offspring of {name} | Mga Bata sang {name} | Changed in this review (plural noun rule). |
| `registry.noOffspring` | No Offspring | Wala sang mga Bata | Changed in this review (plural noun rule). |
| `registry.offspringRegistryDesc` | Each chick of the registered breeding pair | Kada bata sang rehistrado nga pares sa pagpaliwat | "pares" and "rehistrado" need confirmation. |
| `registry.generationLadderHelp` | Generation ladder: F0 … F4+ (Prime)… | Halintang sang henerasyon: … F4+ (Prirme)… | "Prirme" (prime) and "Ikaduha" (second) need confirmation. |
| `registry.autoAssigned` | Auto-Assigned | Awtomatiko nga Ginhatag | "Ginhatag" (assigned) needs confirmation. |
| `registry.selectStage` | Select stage... | Pilia ang lebel... | "Pilia" (choose) needs confirmation. |
| `registry.stageChick` | Chick | Chick | Changed in this review: the previous gloss ("Pisu"/"Pisi") was dropped because the consultant prefers "bata"; no gloss is asserted until a native speaker confirms one. |
| `auth.registerSubtitle` | Register your farm and manage lineage records | Ilista ang imo kudal kag dumalahon ang mga rekord sang kaliwat | "dumalahon" (to record) and "kudal" (pen) need confirmation. |
| `preferences.title` | Preferences | Mga Pinasahi nga Gusto | "pinasahi" (preferred) needs confirmation. |
| `dateRange.allTime` | All Time | Halin Sang Una | "Halin" (since/from) needs confirmation. |
| `dateRange.customRange` | Custom Range | Imo Pili nga Petsa | Confirm. |

### 5.2 Tagalog — strings I am not fully sure about

Tagalog is otherwise standard Filipino. The table lists the entries that are
domain coinages, English loans, or wording changed during this review.

| Key | English (`en`) | Tagalog (`tl`) | Reason / Question |
| :--- | :--- | :--- | :--- |
| `common.save` | Save | I-save | English loan verb; "Tipigan" (to store) is the native alternative. |
| `common.close` | Close | Isara | Bare infinitive on a button - imperative may read better. |
| `common.clear` | Clear | Linisin | "Linisin" (to clean) for "Clear filters" - confirm. |
| `common.optional` | Optional | opsyonal | English loan, standard in Philippine apps. |
| `registry.trait` | Trait | Katangian / Trait | "Katangian" is generic; confirm the term breeders use for gamefowl traits. |
| `registry.genderClass` | Sex & Class | Kasarian at Klase | "Klase" is a direct English loan; "Uri" may be clearer. |
| `registry.awaitingParents` | Awaiting Parents | Naghihintay ng Sire at Dam | Changed in this review (glossary: Parents = "Sire at Dam"). |
| `registry.existingOffspringSiblings` | 👤 Existing Offspring & Siblings | 👤 Mga Kasalukuyang Anak at Kapatid | Changed in this review (plural noun rule). |
| `registry.viewChildrenTitle` | View {count} children of {name} | Tingnan ang {count} na anak ng {name} | Changed in this review (was "inakay"). |
| `registry.offspringOf` | Offspring of {name} | Mga Anak ng {name} | Changed in this review (plural noun rule). |
| `registry.noOffspringDesc` | No offspring chickens found in the registry. | Walang nakitang mga anak sa rehistro. | Changed in this review (plural noun rule). |
| `registry.offspringBreedingClassAria` | Offspring breeding classifications | Mga klasipikasyon ng pampalahi para sa mga anak | Changed in this review (plural noun rule). |
| `registry.categoryBreedingStockTooltip` | Offspring kept as future breeders… | Mga anak na inilalaan bilang susunod na pampalahi… | Changed in this review (plural noun rule). |
| `registry.noBreedingStockDesc` | No offspring are currently designated… | Walang anak na kasalukuyang nakatala… | Changed in this review (plural noun rule). |
| `registry.noNonBreedingDesc` | No offspring match the non-breeding classification. | Walang anak na tumutugma… | Changed in this review (plural noun rule). |
| `registry.stageChick` | Chick | Chick (Sisiw) | Changed in this review so the canonical English term leads and the gloss follows. |
| `registry.offspringRegistryDesc` | Each chick of the registered breeding pair | Bawat anak ng rehistradong pares ng pagpapalahi | "pares" (pair) - confirm. |
| `registry.generationLadderHelp` | Generation ladder: F0 … F4+ (Prime)… | Hagdan ng henerasyon: … F4+ (Matatag)… | "Matatag" means "strong/stable"; confirm the intended sense for "Prime". |
| `auth.registerSubtitle` | Register your farm and manage lineage records | Irehistro ang iyong kural at pamahalaan ang mga tala ng lahi | "kural at pamahalaan" (pen and management) - confirm against the breeder's own phrasing. |
| `nav.profile` | Profile | Aking Profile | Standard Tagalog; confirm the label style vs "Profile ko". |

### 5.3 Known gaps (not fixed in Feature 1)

- `components/modals/ParentSelector.tsx` still hardcodes English section labels
  ("Breeding Males (Sires)", "Breeding Females (Dams)") instead of using the
  dictionary. This is untranslated UI inside a migrated feature and is a
  candidate for Feature 2.
- `components/RelatednessBadge.tsx` renders the relatedness labels that come
  from `lib/relatedness-classification.ts` (Close Breeding / Line Breeding /
  Outcross). The dictionary now owns the canonical wording
  (`domain.relatednessClose`, `domain.relatednessLine`,
  `domain.relatednessOutcross`, `domain.relatednessUnknown`), but the badge
  has not been switched over yet.
- `lib/i18n/index.ts` exposes `translateRelatedness()` for that switch; the
  badge migration is Feature 2 work.

---

## 6. Review CSV Export

Run `npm run i18n:export` to generate `docs/i18n-review/translations.csv`
(tracked in git; it contains no credentials).

**CSV columns:** `key`, `en`, `tl`, `tl_status`, `tl_note`, `hil`, `hil_status`, `hil_note`

**Status values:**
- `reviewed` — value is a preserved English gamefowl term or confirmed equivalent
- `unreviewed` — translated but awaiting native consultant confirmation
- `needs_change` — missing or blank value (should never appear after `npm run i18n:audit` passes)

**Note columns:** `tl_note` / `hil_note` carry the reason a string is not
confirmed. Curated reasons live in `scripts/i18n-review-notes.ts`; every
remaining unreviewed Hiligaynon row gets the blanket reason automatically.

**Latest export counts** (457 keys, regenerated with `npm run i18n:export`):
| Language | Reviewed | Unreviewed | Needs Change |
|:---|:---|:---|:---|
| Tagalog (tl) | 61 | 396 | 0 |
| Hiligaynon (hil) | 61 | 396 | 0 |

---

## 7. Glossary Reference
See [`docs/i18n-glossary.md`](./i18n-glossary.md) for the canonical terminology matrix.

**Key rules from the glossary (summary):**
1. Sire and Dam: kept as English in all three languages — no "Ama/Ina" or "Amay/Iloy" as UI labels. Native glosses only in tooltips.
2. Offspring (tab/filter): kept as "Offspring" in all three languages.
3. Offspring (plural noun in text): "mga anak" in Tagalog, "mga bata" in Hiligaynon (breeder-approved).
4. Breeding Type filter: Purebred / Crossbred / Unverified Lineage (+ All) — **not** Outcross (which belongs to the Relatedness dimension: Close Breeding, Line Breeding, Outcross).
5. Growth stages (all six stored values, always offered): Chick, Stag, Bull Stag, Pullet, Cock, Hen.
6. Never invent words: keep the English term and flag the uncertainty here instead.

---

## 8. Review Guidelines for Translators
1. **Never translate canonical database stored values:** Do not translate `'Active'`, `'Cock'`, `'Sire'`, `'Win'`, etc. when stored in the database.
2. **Preserve placeholders:** Text like `{count}`, `{expected}`, `{days}` must be kept exactly as `{placeholder}` inside the translation string.
3. **Keep Tone Professional:** GalloTrack is used by farm managers and gamefowl breeders; avoid overly casual internet slang while maintaining natural regional phrasing.
4. **Hiligaynon is Beta:** Mark every new Hiligaynon string as "unreviewed" in `docs/i18n-review.md` until a native consultant approves it.
5. **Record the reason:** when you flag a string, add the reason to `scripts/i18n-review-notes.ts` so the CSV explains itself.
