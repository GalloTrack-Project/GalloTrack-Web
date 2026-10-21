/**
 * Per-key translator-review notes.
 *
 * The CSV export (docs/i18n-review/translations.csv) lists every key with its
 * review status. This module adds the *reason* a string is not marked as
 * confirmed, so a native reviewer can see at a glance what needs checking.
 *
 * Policy:
 *  - Every Hiligaynon string that is not a preserved canonical English term
 *    is UNREVIEWED until a native Ilonggo speaker confirms it. The blanket
 *    reason is added automatically by the exporter.
 *  - Tagalog strings are listed here only where the wording is not standard
 *    Filipino, is a domain coinage, or was changed during the Phase 2
 *    Feature 1 review and needs a second pair of eyes.
 */

export interface ReviewNote {
  /** Why the Tagalog wording is uncertain (or what changed in it). */
  tl?: string;
  /** Why the Hiligaynon wording is uncertain. */
  hil?: string;
}

export const REVIEW_NOTES: Record<string, ReviewNote> = {
  // ── Generic UI actions ────────────────────────────────────────────────────
  'common.save': {
    tl: 'English loan verb ("I-save"). "Tipigan" (to store) is the native alternative.',
    hil: 'English loan verb ("I-save"). "Tipigan" (to store) is the native alternative.',
  },
  'common.close': {
    tl: 'Bare infinitive ("Isara") on a button; the imperative form may read better.',
    hil: 'Bare infinitive ("Isira"); the imperative form may read better for a button.',
  },
  'common.clear': {
    tl: '"Linisin" (to clean) for the "Clear filters" action - confirm.',
    hil: '"Tinluan" (to clean) for the "Clear filters" action - uncertain.',
  },
  'common.delete': {
    tl: '"Burahin" (to erase) is standard Tagalog.',
    hil: '"Panason" (to erase) is standard Hiligaynon; the English loan "delete" is also common.',
  },
  'common.previous': {
    tl: '"Nakaraan" (the previous one) - standard.',
    hil: '"Nagligad" actually means "recent/past". "Kaagi" (before) may be the better word for the Previous control.',
  },
  'common.no': {
    tl: '"Hindi" - standard Tagalog.',
    hil: '"Indi" is a Tagalog loan. Hiligaynon normally uses "Hui" for "no" - needs confirmation, especially next to "Huo" (yes).',
  },
  'common.optional': {
    tl: 'English loan ("opsyonal") - standard in Philippine apps.',
    hil: 'English loan ("opsyonal") - common in Philippine apps, but not yet confirmed by a native speaker.',
  },
  'common.of': {
    tl: 'Genitive marker "ng" - standard.',
    hil: 'Genitive marker "sang" - standard Hiligaynon.',
  },

  // ── Navigation ────────────────────────────────────────────────────────────
  'nav.profile': {
    tl: '"Aking Profile" - standard Tagalog.',
    hil: '"Akon" is more Manobo/Hindi than Hiligaynon; "Akong"/"Ako" is the expected Hiligaynon possessive.',
  },
  'nav.registry': {
    tl: '"Rehistro ng Manok" - standard Tagalog.',
    hil: '"Listahan sang Manok" - confirm whether "Rehistro" should be kept for consistency with the registry tab.',
  },
  'header.languageSwitcher': {
    tl: '"Palitan ang wika" - standard Tagalog.',
    hil: '"hamba" as a word for "language" needs confirmation ("pinulongan" is certain).',
  },
  'header.searchPlaceholder': {
    tl: '"Pumili ng manok, lahi, o code" - standard.',
    hil: '"Pangitaa ang bisan ano (manok, kaliwat, hampang)" - "kaliwat" for "lineage" needs confirmation.',
  },

  // ── Domain: status and results ───────────────────────────────────────────
  'domain.statusArchived': {
    tl: '"Naka-archive" - standard loanword usage.',
    hil: '"Nakatago" means "hidden". "Naka-archive" may read clearer next to the English term in parentheses.',
  },
  'domain.statusDeceased': {
    tl: '"Pumanaw" - standard and appropriately reverent Tagalog.',
    hil: '"Napatay" (killed) is blunt for a record; "Nagtaliwan" (passed away) may be preferred by breeders.',
  },
  'domain.outcomeLoss': {
    tl: '"Talo" - standard Tagalog.',
    hil: '"Pirdi" is Cebuano-flavoured; confirm with a Hiligaynon speaker.',
  },
  'domain.outcomeNoContest': {
    tl: '"Walang Laban" - standard Tagalog.',
    hil: '"Wala Laban" - some speakers say "Wala sing laban". Not confirmed.',
  },
  'domain.relatednessOutcross': {
    tl: 'Kept in English on purpose: Outcross is a relatedness category, not a breeding type.',
    hil: 'Kept in English on purpose: Outcross is a relatedness category, not a breeding type.',
  },

  // ── Registry / Register Chicken ───────────────────────────────────────────
  'registry.trait': {
    tl: '"Katangian / Trait". "Katangian" (attribute) is generic; confirm the term breeders use for gamefowl traits.',
    hil: '"Kinaiya" is also used for gender in genderClass, so the two labels collide. Suggest a different word or keep "Trait".',
  },
  'registry.genderClass': {
    tl: '"Kasarian at Klase" - "Klase" is a direct English loan; "Uri" may be clearer.',
    hil: '"Kinaiya kag Klase" - "Klase" is an English loan and "Kinaiya" collides with the trait label.',
  },
  'registry.step1Title': {
    tl: '"Hakbang 1: Pangunahing Pagkakakilanlan" - "Hakbang" (step) is standard.',
    hil: '"Tikang 1" reads as "from 1"; "Hugpo 1" or "Una nga Bahin" may be more natural for a step heading.',
  },
  'registry.step2Title': {
    tl: '"Hakbang 2: Pisikal na Sukat" - standard.',
    hil: '"Tikang 2" - same step-heading doubt as step1Title.',
  },
  'registry.step3Title': {
    tl: '"Hakbang 3: Pinagmulang Lahi at Larawan" - standard.',
    hil: '"Tikang 3" - same step-heading doubt as step1Title; "Ginhalinan nga Lahi" for "Pinagmulang Lahi" also needs confirmation.',
  },
  'registry.growthStage': {
    tl: '"Yugto ng Paglaki" - standard Tagalog.',
    hil: '"Lebel sang Pagdako" - "Lebel" is an English loan; "Pagdako" (growth) is fine.',
  },
  'registry.birthDate': {
    tl: '"Petsa ng Kapanganakan" - standard Tagalog.',
    hil: '"Pagkabun-ag" (hatching) needs confirmation.',
  },
  'registry.featherColor': {
    tl: '"Kulay ng Balahibo" - standard Tagalog.',
    hil: '"Bulbol" (feather) is Visayan; confirm it is used for chicken feathers in Hiligaynon.',
  },
  'registry.legColor': {
    tl: '"Kulay ng Paa" - standard Tagalog.',
    hil: '"Tiil" (leg) - confirm.',
  },
  'registry.validationPassed': {
    tl: '"Pumasa" - standard Tagalog.',
    hil: '"Napasar" is a loan from English "pass"; confirm.',
  },
  'registry.fullSiblingsNotice': {
    tl: '"buong kapatid" (full sibling) - standard.',
    hil: '"bilog nga utod" - "bilog" (whole) and "utod" (sibling) both need confirmation.',
  },
  'registry.lineageResolved': {
    tl: '"Nalutas ang Lahi" - standard.',
    hil: '"Nahusay ang Kaliwat" - "nahusay" (clean/neat) as "resolved" needs confirmation.',
  },
  'registry.matchingColors': {
    tl: '"Tugmang mga kulay" - standard.',
    hil: '"Nagasanto nga mga kolor" - "nagasanto" (matched) needs confirmation.',
  },
  'registry.existingOffspringSiblings': {
    tl: 'Changed in this review to "Mga Kasalukuyang Anak at Kapatid" (plural noun is now "mga anak", per the breeder-approved rule).',
    hil: 'Changed in this review to "Mga Yara nga Bata kag Utod". "Yara" (relatives) is uncertain and "Utod" (sibling) needs confirmation.',
  },
  'registry.awaitingParents': {
    tl: 'Changed in this review to "Naghihintay ng Sire at Dam" (glossary: Parents = "Sire at Dam").',
    hil: 'Changed in this review to "Nagahulat sang Sire kag Dam" (breeder consultant wrote "sire kag dam").',
  },
  'registry.awaitingParentsStatus': {
    tl: 'Changed in this review to "Naghihintay ng Sire at Dam".',
    hil: 'Changed in this review to "Nagahulat sang Sire kag Dam".',
  },
  'registry.viewChildrenTitle': {
    tl: 'Changed in this review to "Tingnan ang {count} na anak ng {name}" (was "inakay", plural noun rule).',
    hil: 'Changed in this review from "pisu" to "bata" so the plural noun matches "mga bata".',
  },
  'registry.offspringOf': {
    tl: 'Changed in this review to "Mga Anak ng {name}" (plural noun rule).',
    hil: 'Changed in this review to "Mga Bata sang {name}" (plural noun rule).',
  },
  'registry.noOffspring': {
    tl: '"Walang Offspring" keeps the canonical English label - fine as a heading.',
    hil: 'Changed in this review to "Wala sang mga Bata" (plural noun rule).',
  },
  'registry.noOffspringDesc': {
    tl: 'Changed in this review to "Walang nakitang mga anak sa rehistro." (plural noun rule).',
    hil: '"mga bata nga manok" - already follows the "mga bata" rule.',
  },
  'registry.sortOffspring': {
    tl: '"Pinakamaraming anak" - plural noun "anak", consistent with the rule.',
    hil: '"Pinakadamo nga bata" - "bata" per the breeder consultant.',
  },
  'registry.offspringRegistryDesc': {
    tl: '"Bawat anak ng rehistradong pares ng pagpapalahi" - "pares" (pair) is standard; confirm.',
    hil: '"Kada bata sang rehistrado nga pares sa pagpaliwat" - "pares" and "rehistrado" both need confirmation.',
  },
  'registry.offspringBreedingClassAria': {
    tl: 'Changed in this review to "Mga klasipikasyon ng pampalahi para sa mga anak" (plural noun rule).',
    hil: 'Changed in this review to "Mga klasipikasyon sang pampalahi para sa mga bata" (plural noun rule).',
  },
  'registry.categoryBreedingStockTooltip': {
    tl: 'Changed in this review to "Mga anak na inilalaan..." (plural noun rule).',
    hil: 'Changed in this review to "Mga bata nga ginatagana..." (plural noun rule).',
  },
  'registry.noBreedingStockDesc': {
    tl: 'Changed in this review to "Walang anak na kasalukuyang nakatala..." (plural noun rule).',
    hil: 'Changed in this review to "Wala sang bata nga sa subong gintalana..." (plural noun rule).',
  },
  'registry.noNonBreedingDesc': {
    tl: 'Changed in this review to "Walang anak na tumutugma..." (plural noun rule).',
    hil: 'Changed in this review to "Wala sang bata nga nagasibu..." (plural noun rule).',
  },
  'registry.generationLadderHelp': {
    tl: '"Matatag" for F4+ (prime) - "Matatag" means "strong/stable"; confirm the intended sense.',
    hil: '"Prirme" (prime) and "Ikaduha" (second) need confirmation; "Una nga Krus" mixes the English "Cross".',
  },
  'registry.autoAssigned': {
    tl: '"Awtomatikong Itinalaga" - standard Tagalog.',
    hil: '"Ginhatag" (assigned) needs confirmation.',
  },
  'registry.selectStage': {
    tl: '"Pumili ng yugto..." - standard.',
    hil: '"Pilia ang lebel..." - "Pilia" (choose) needs confirmation.',
  },
  'registry.stageChick': {
    tl: 'Changed in this review to "Chick (Sisiw)" so the canonical English term leads, with the Tagalog gloss after it.',
    hil: 'Changed in this review to plain "Chick": the Hiligaynon gloss was previously "Pisu"/"Pisi" and the breeder consultant prefers "bata", so no gloss is asserted until a native speaker confirms one.',
  },

  // ── Auth / preferences / dates ────────────────────────────────────────────
  'registry.hatchedDate': {
    tl: 'Added in the Match Logs review to replace the ambiguous "hatch {date}". "Isilang {date}" needs a native read.',
    hil: 'Added in the Match Logs review to replace the ambiguous "hatch {date}". "Natawo {date}" needs a native read.',
  },
  'auth.registerSubtitle': {
    tl: '"kural at pamahalaan" (pen and management) - confirm against the breeder\'s own phrasing.',
    hil: '"dumalahon" (to record) and "kudal" (pen) need confirmation.',
  },
  'preferences.title': {
    tl: '"Mga Kagustuhan" - standard Tagalog.',
    hil: '"Mga Pinasahi nga Gusto" - "pinasahi" (preferred) needs confirmation.',
  },
  'dateRange.allTime': {
    tl: '"Lahat ng Oras" - standard.',
    hil: '"Halin Sang Una" - "Halin" (since/from) needs confirmation.',
  },
  'dateRange.customRange': {
    tl: '"Pasadyang Saklaw" - standard.',
    hil: '"Imo Pili nga Petsa" - confirm.',
  },
};
