# Emoji UI audit

Pre-change scan of the app source and locale files. Every match below was replaced with a lucide icon or plain text before the guard was enabled.

## Summary

- 235 emoji matches
- 29 files
- Scope: `components/`, `app/`, `lib/`, `locales/`
- Docs: 2 matches of U+1F464 were removed from `docs/i18n-review.md`
- Developer-only `scripts/` console output is outside the UI guard scope

## Replacement rules

- Male sign: `M` (or `Mars` icon where a visual indicator is useful)
- Female sign: `F` (or `Venus` icon where a visual indicator is useful)
- Plus sign: `+`
- Other pictographs: lucide icon where one exists, otherwise removed with surrounding spacing cleaned up
- Kept: middle dot, multiplication sign, em dash, arrows, ellipsis, check mark

## Matches by file

### `gallotrack-next/components/BloodlineBreakdown.tsx`

````text
L207  U+1F9EC <U+1F9EC>  <U+1F9EC> {title || 'Bloodline Breakdown'}
L310  U+1F9EC <U+1F9EC>  <U+1F9EC> {title || 'Bloodline Percentage Breakdown'}
L467  U+26A0 <U+26A0>, U+FE0F <U+FE0F>  <U+26A0><U+FE0F> Banta ng “Galapsaw”
````

### `gallotrack-next/components/BloodlineProvenance.tsx`

````text
L22  U+2642 <U+2642>  icon: '<U+2642>',
L28  U+2640 <U+2640>  icon: '<U+2640>',
L33  U+1F9EC <U+1F9EC>  icon: '<U+1F9EC>',
L107  U+1F50E <U+1F50E>  <U+1F50E> {title || 'Where Each Percentage Comes From'}
````

### `gallotrack-next/components/BreedingHub.tsx`

````text
L368  U+1F4A1 <U+1F4A1>  <U+1F4A1> You may also add a descriptive name:{' '}
L529  U+1F413 <U+1F413>  <U+1F413> Sire
L544  U+1F414 <U+1F414>  <U+1F414> Dam
L556  U+1F4DD <U+1F4DD>  <U+1F4DD> {pair.notes}
L772  U+1F413 <U+1F413>  <U+1F413> Sire
L794  U+1F414 <U+1F414>  <U+1F414> Dam
L816  U+26D4 <U+26D4>  <U+26D4>
L835  U+2139 <U+2139>, U+FE0F <U+FE0F>  <U+2139><U+FE0F>
L1447  U+1F413 <U+1F413>  <U+1F413> Sire: <strong className="text-card-foreground">{fowl.sire}</strong>
L1453  U+1F414 <U+1F414>  <U+1F414> Dam: <strong className="text-card-foreground">{fowl.dam}</strong>
L1741  U+1F413 <U+1F413>  icon: '<U+1F413>',
L1748  U+1F414 <U+1F414>  icon: '<U+1F414>',
L1755  U+1F425 <U+1F425>  icon: '<U+1F425>',
L1762  U+2764 <U+2764>, U+FE0F <U+FE0F>  icon: '<U+2764><U+FE0F>',
````

### `gallotrack-next/components/DashboardPage.tsx`

````text
L635  U+1F424 <U+1F424>  <span className="w-9 h-9 rounded-sm border border-border bg-muted flex items-center justify-center text-base shrink-0">{info.current?.icon || '<U+1F424>'}</span>
````

### `gallotrack-next/components/FamilyTree.tsx`

````text
L199  U+2642 <U+2642>, U+2640 <U+2640>  {sex === 'Cock' ? '<U+2642>' : sex === 'Hen' ? '<U+2640>' : ''} {sex}
L402  U+2642 <U+2642>  <U+2642> Cocks ({roosters.length})
L427  U+2640 <U+2640>  <U+2640> Hens ({hens.length})
L660  U+1F333 <U+1F333>  <U+1F333> Family Tree — Sire + Dam → Offspring
````

### `gallotrack-next/components/lineage/LineageBirdCard.tsx`

````text
L42  U+2640 <U+2640>, U+2642 <U+2642>  return sexLabel(fowl) === 'Hen' ? '<U+2640>' : sexLabel(fowl) === 'Cock' ? '<U+2642>' : '';
````

### `gallotrack-next/components/lineage/LineageFlow.tsx`

````text
L94  U+2642 <U+2642>  if (label === 'Cock') return '<U+2642>';
L95  U+2640 <U+2640>  if (label === 'Hen') return '<U+2640>';
L1292  U+2642 <U+2642>  <span className="font-black text-sky-600 dark:text-sky-400"><U+2642></span> Cock
L1295  U+2640 <U+2640>  <span className="font-black text-pink-600 dark:text-pink-400"><U+2640></span> Hen
````

### `gallotrack-next/components/lineage/ParentOffspringTree.tsx`

````text
L230  U+2642 <U+2642>, U+2640 <U+2640>  {pair.totalOffspring} offspring · {pair.maleCount}<U+2642> {pair.femaleCount}<U+2640>
````

### `gallotrack-next/components/LineageDirectory.tsx`

````text
L88  U+2642 <U+2642>, U+2640 <U+2640>  {label === 'Cock' ? '<U+2642>' : label === 'Hen' ? '<U+2640>' : ''} {label}
L209  U+1F50D <U+1F50D>  <U+1F50D>
L1830  U+2642 <U+2642>, U+2640 <U+2640>  {kind === 'sire' ? '<U+2642> Cock' : '<U+2640> Hen'}
L1841  U+2642 <U+2642>, U+2640 <U+2640>  <span>{activeMales}<U+2642> {activeFemales}<U+2640></span>
L1977  U+2642 <U+2642>, U+2640 <U+2640>  {pg.maleCount}<U+2642> {pg.femaleCount}<U+2640>
L2033  U+2642 <U+2642>  <U+2642> Cocks ({pg.maleCount})
L2044  U+2640 <U+2640>  <U+2640> Hens ({pg.femaleCount})
L2250  U+2642 <U+2642>  <U+2642> Cocks ({males.length})
L2261  U+2640 <U+2640>  <U+2640> Hens ({females.length})
L2441  U+2642 <U+2642>  <U+2642> Cocks ({males.length})
L2447  U+2640 <U+2640>  <U+2640> Hens ({females.length})
L2786  U+2640 <U+2640>, U+2642 <U+2642>  {mc.gender === 'Female' ? '<U+2640>' : '<U+2642>'}
````

### `gallotrack-next/components/MarketplacePage.tsx`

````text
L299  U+1F3F7 <U+1F3F7>  <U+1F3F7> <HighlightText text={fowl.wing_band} query={query} />
L322  U+1F3A8 <U+1F3A8>  <U+1F3A8> {formatColorDisplay(fowl.feather_color || fowl.color, fowl.color_category)}
L330  U+26A1 <U+26A1>  <U+26A1> {fowl.trait || fowl.behavior_trait}
L1253  U+1F50D <U+1F50D>  <U+1F50D>
````

### `gallotrack-next/components/match/MatchRecordForm.tsx`

````text
L735  U+2694 <U+2694>, U+FE0F <U+FE0F>  <span><U+2694><U+FE0F></span>
````

### `gallotrack-next/components/modals/EditFowlModal.tsx`

````text
L885  U+26A0 <U+26A0>, U+FE0F <U+FE0F>  <span><U+26A0><U+FE0F></span>
L894  U+26A0 <U+26A0>, U+FE0F <U+FE0F>  <span><U+26A0><U+FE0F></span>
L1126  U+26A0 <U+26A0>, U+FE0F <U+FE0F>  <U+26A0><U+FE0F> {formatCheck.error}
L1130  U+274C <U+274C>  <U+274C> Already taken by another chicken
L1142  U+26A0 <U+26A0>, U+FE0F <U+FE0F>  <U+26A0><U+FE0F> Changing this will update the official registry code and will be logged in
L1184  U+274C <U+274C>  <U+274C> Wing Banding &quot;{trimmedBand}&quot; is already assigned to another
L1263  U+26A0 <U+26A0>, U+FE0F <U+FE0F>  <span className="shrink-0 text-base"><U+26A0><U+FE0F></span>
````

### `gallotrack-next/components/modals/FowlDetailsModal.tsx`

````text
L440  U+1F9EC <U+1F9EC>  icon={<span aria-hidden="true"><U+1F9EC></span>}
L527  U+1F4DC <U+1F4DC>  <U+1F4DC> View pedigree
L533  U+1F480 <U+1F480>  <U+1F480> DECEASED
L604  U+26A0 <U+26A0>, U+FE0F <U+FE0F>, U+270F <U+270F>  <U+26A0><U+FE0F> No birth date recorded — use <U+270F><U+FE0F> Edit to set one for automatic age &amp; milestone
L611  U+1F480 <U+1F480>  <U+1F480> Cause of Death:{' '}
L623  U+1F4E6 <U+1F4E6>  <U+1F4E6> Archived:{' '}
L803  U+1FA79 <U+1FA79>  <U+1FA79> Condition: {conditionLabel(bird.condition_status)}
L806  U+1F9EC <U+1F9EC>  <U+1F9EC> {breedingRoleLabel(bird.breeding_role)}
L815  U+1F3C1 <U+1F3C1>  <U+1F3C1> {retiredScopeLabel(bird.retired_scope, optionRows)}
L893  U+21A9 <U+21A9>  <U+21A9> Return / Restore
L1081  U+1F333 <U+1F333>  <span><U+1F333> Lineage Relationships</span>
L1132  U+2642 <U+2642>  '<U+2642>',
L1139  U+2640 <U+2640>  '<U+2640>',
L1147  U+1F49E <U+1F49E>  '<U+1F49E>',
L1161  U+1F95A <U+1F95A>  <U+1F95A>
L1242  U+1F465 <U+1F465>, U+1F413 <U+1F413>, U+1F414 <U+1F414>  const icon = isFull ? '<U+1F465>' : isSire ? '<U+1F413>' : '<U+1F414>';
L1292  U+1F9EC <U+1F9EC>  <span><U+1F9EC> Sibling Match &amp; Lineage Relations</span>
L1307  U+1F9EC <U+1F9EC>  <span className="shrink-0 text-sm"><U+1F9EC></span>
L1337  U+1F465 <U+1F465>  <U+1F465> {full.length} Full
L1340  U+1F413 <U+1F413>  <U+1F413> {halfSire.length} Sire-side Half
L1343  U+1F414 <U+1F414>  <U+1F414> {halfDam.length} Dam-side Half
L1397  U+1F4CA <U+1F4CA>  <span><U+1F4CA> Sibling Performance Analysis</span>
L1470  U+2694 <U+2694>  <U+2694>
L1504  U+1F9EC <U+1F9EC>  <U+1F9EC> Breeding Insight
L1554  U+1F4C5 <U+1F4C5>  <span><U+1F4C5> Development Timeline &amp; Calendar Milestones</span>
L1608  U+1F5D3 <U+1F5D3>, U+FE0F <U+FE0F>  <U+1F5D3><U+FE0F> Next milestone: reach{' '}
L1645  U+2694 <U+2694>, U+FE0F <U+FE0F>  <span><U+2694><U+FE0F> Combat Analytics & Performance Vectors</span>
L1659  U+1F3C6 <U+1F3C6>  <strong className="text-success text-base font-black">{wins} <U+1F3C6></strong>
L1663  U+1F480 <U+1F480>  <strong className="text-danger text-base font-black">{losses} <U+1F480></strong>
L1667  U+1F91D <U+1F91D>  <strong className="text-warning text-base font-black">{draws} <U+1F91D></strong>
L1709  U+1F3C6 <U+1F3C6>  <U+1F3C6> Individual Per-Breed Performance ({breeds.length} breed
L1794  U+1F94A <U+1F94A>  <U+1F94A> Previous Opponents ({opponents.length} faced)
L1976  U+1F480 <U+1F480>  ? '<U+1F480> '
L1983  U+1F7E0 <U+1F7E0>  ? '<U+1F7E0> '
L1984  U+1F7E2 <U+1F7E2>  : '<U+1F7E2> '}
L2088  U+1F9EC <U+1F9EC>  <U+1F9EC> Lineage Generation
L2107  U+2642 <U+2642>  <span><U+2642> Sire Contribution</span>
L2168  U+2640 <U+2640>  <span><U+2640> Dam Contribution</span>
L2241  U+1F517 <U+1F517>  <U+1F517> Pairing Performance ({ps.sire} × {ps.dam})
````

### `gallotrack-next/components/PedigreeTree.tsx`

````text
L1023  U+1F4DC <U+1F4DC>  <U+1F4DC> Mobile Pedigree Lineage List (tap to view)
````

### `gallotrack-next/components/profiling/EncodeForm.tsx`

````text
L862  U+26A0 <U+26A0>, U+FE0F <U+FE0F>  <span className="text-rose-600 dark:text-rose-400 font-bold"><U+26A0><U+FE0F> {formatCheck.error}</span>
L869  U+26A0 <U+26A0>, U+FE0F <U+FE0F>  <span className="text-amber-700 dark:text-amber-300 font-bold bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded p-1"><U+26A0><U+FE0F> {parentCheck.warning}</span>
L1241  U+26A0 <U+26A0>, U+FE0F <U+FE0F>  <span><U+26A0><U+FE0F></span>
L1247  U+26A0 <U+26A0>, U+FE0F <U+FE0F>  <span><U+26A0><U+FE0F></span>
````

### `gallotrack-next/components/profiling/FowlLists.tsx`

````text
L141  U+1F3F7 <U+1F3F7>  <span className="antigravity-badge text-xs font-mono font-black border px-2.5 py-0.5 rounded-full uppercase text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-800" title={t('registry.wingBandTooltip')}><U+1F3F7> <Hi
L276  U+1F4E6 <U+1F4E6>, U+1F480 <U+1F480>  {isArchived ? '<U+1F4E6>' : '<U+1F480>'}
L608  U+1F50D <U+1F50D>  <U+1F50D>
L667  U+1F413 <U+1F413>, U+1F414 <U+1F414>  const tabIcon = isMaleTab ? '<U+1F413>' : '<U+1F414>';
L733  U+1F95A <U+1F95A>  <div className="w-11 h-11 rounded-md border flex items-center justify-center text-xl shrink-0 bg-teal-50 dark:bg-teal-500/10 border-teal-200 dark:border-teal-800 text-teal"><U+1F95A></div>
L794  U+1F9EC <U+1F9EC>, U+1F6AB <U+1F6AB>, U+1F95A <U+1F95A>  {category === 'breeding-stock' ? '<U+1F9EC>' : category === 'non-breeding' ? '<U+1F6AB>' : '<U+1F95A>'}
````

### `gallotrack-next/components/StagingBanner.tsx`

````text
L16  U+26A0 <U+26A0>, U+FE0F <U+FE0F>  <span><U+26A0><U+FE0F> STAGING ENVIRONMENT — Test database. Changes do not affect Production.</span>
````

### `gallotrack-next/app/(dashboard)/settings/page.tsx`

````text
L944  U+26A0 <U+26A0>, U+FE0F <U+FE0F>  <U+26A0><U+FE0F> {t('preferences.betaNotice')}
L1731  U+1F527 <U+1F527>  <span className="text-lg"><U+1F527></span>
````

### `gallotrack-next/app/auth/confirm/page.tsx`

````text
L119  U+1F389 <U+1F389>  <h2 className="text-2xl sm:text-3xl font-black text-card-foreground tracking-tight">Email Confirmed Successfully! <U+1F389></h2>
````

### `gallotrack-next/app/auth/update-password/page.tsx`

````text
L192  U+1F389 <U+1F389>  <h2 className="text-2xl sm:text-3xl font-black text-card-foreground tracking-tight text-center">Password Updated Successfully! <U+1F389></h2>
````

### `gallotrack-next/app/auth/verify-otp/page.tsx`

````text
L165  U+1F389 <U+1F389>  <h2 className="text-2xl sm:text-3xl font-black text-card-foreground tracking-tight">Farm Owner Verified! <U+1F389></h2>
````

### `gallotrack-next/app/register/page.tsx`

````text
L401  U+1F464 <U+1F464>  <U+1F464>
L465  U+1F3E1 <U+1F3E1>  <U+1F3E1>
L512  U+1F512 <U+1F512>  <U+1F512>
````

### `gallotrack-next/lib/helpers.ts`

````text
L5  U+1F7E2 <U+1F7E2>  { value: 'Fit / Recovered', icon: '<U+1F7E2>', short: 'FIT', desc: 'Pulled through cleanly' },
L6  U+1F7E0 <U+1F7E0>  { value: 'Severely Injured / Critical', icon: '<U+1F7E0>', short: 'CRITICAL', desc: 'Badly hurt after the fight' },
L7  U+1F480 <U+1F480>  { value: 'Deceased (Died from injuries)', icon: '<U+1F480>', short: 'DECEASED', desc: 'Died from fight injuries' },
L354  U+1F423 <U+1F423>  { id: 'Chick', stage: 'Chick', fromMonths: 0, toMonths: 6, icon: '<U+1F423>', note: 'Brooding & starter feed phase' },
L355  U+1F424 <U+1F424>  { id: 'Pullet', stage: 'Pullet', fromMonths: 6, toMonths: 12, icon: '<U+1F424>', note: 'Grower phase — feathering out' },
L356  U+1F414 <U+1F414>  { id: 'Hen', stage: 'Hen', fromMonths: 12, toMonths: 24, icon: '<U+1F414>', note: 'Mature laying hen' },
L357  U+1F985 <U+1F985>  { id: 'Senior Hen', stage: 'Hen', fromMonths: 24, toMonths: Infinity, icon: '<U+1F985>', note: 'Senior breeder / retired rotation' },
L360  U+1F423 <U+1F423>  { id: 'Chick', stage: 'Chick', fromMonths: 0, toMonths: 6, icon: '<U+1F423>', note: 'Brooding & starter feed phase' },
L361  U+1F424 <U+1F424>  { id: 'Stag', stage: 'Stag', fromMonths: 6, toMonths: 12, icon: '<U+1F424>', note: 'Grower phase — conditioning' },
L362  U+1F413 <U+1F413>  { id: 'Bull Stag', stage: 'Bull Stag', fromMonths: 12, toMonths: 24, icon: '<U+1F413>', note: 'Training & fight preparation' },
L363  U+2694 <U+2694>, U+FE0F <U+FE0F>  { id: 'Cock', stage: 'Cock', fromMonths: 24, toMonths: Infinity, icon: '<U+2694><U+FE0F>', note: 'Prime fighting cock / proven breeder' },
````

### `gallotrack-next/lib/i18n/en.ts`

````text
L312  U+274C <U+274C>  idAlreadyInUse: '<U+274C> Identifier "{code}" is already in use by another chicken',
L317  U+274C <U+274C>  wingBandDuplicate: '<U+274C> Wing Banding "{band}" is already assigned to another chicken.',
L334  U+1F4C5 <U+1F4C5>  autoAgeLabel: '<U+1F4C5> Auto Age: {label} · Exact {exact}',
L352  U+2795 <U+2795>  saveNewLegColor: '<U+2795> Save "{color}" as new leg color',
L363  U+1F464 <U+1F464>  existingOffspringSiblings: '<U+1F464> Existing Offspring & Siblings',
L364  U+1F413 <U+1F413>  sireOffspringHeader: '<U+1F413> {name} Offspring',
L365  U+1F414 <U+1F414>  damOffspringHeader: '<U+1F414> {name} Offspring',
L368  U+1F9EC <U+1F9EC>  lineageGeneration: '<U+1F9EC> Lineage Generation',
L372  U+1F413 <U+1F413>  sireLineage: '<U+1F413> Sire Lineage',
L373  U+1F414 <U+1F414>  damLineage: '<U+1F414> Dam Lineage',
L377  U+1F9EC <U+1F9EC>  bloodlineSplitEmptyTitle: '<U+1F9EC> Bloodline Split',
L424  U+1F512 <U+1F512>  verifyBeforeRegistering: '<U+1F512> Verify lineage accuracy before registering to the farm registry.',
L442  U+2795 <U+2795>  encodeFirstMale: '<U+2795> Encode First Cock',
L443  U+2795 <U+2795>  encodeFirstFemale: '<U+2795> Encode First Hen',
L480  U+2795 <U+2795>  encodeFirstOffspring: '<U+2795> Encode First Offspring Chicken',
L495  U+1F4C5 <U+1F4C5>  cardAgeLabel: '<U+1F4C5> Age:',
L510  U+1F413 <U+1F413>  badgeMale: '<U+1F413> Male',
L511  U+1F414 <U+1F414>  badgeFemale: '<U+1F414> Female',
````

### `gallotrack-next/lib/i18n/hil.ts`

````text
L306  U+274C <U+274C>  idAlreadyInUse: '<U+274C> Ang kodigo nga "{code}" ginagamit na sang iban nga manok',
L311  U+274C <U+274C>  wingBandDuplicate: '<U+274C> Ang Wing Banding "{band}" nahatag na sa iban nga manok.',
L328  U+1F4C5 <U+1F4C5>  autoAgeLabel: '<U+1F4C5> Awtomatiko nga Edad: {label} · Eksakto {exact}',
L346  U+2795 <U+2795>  saveNewLegColor: '<U+2795> I-save ang "{color}" bilang bag-o nga kolor sang tiil',
L357  U+1F464 <U+1F464>  existingOffspringSiblings: '<U+1F464> Mga Yara nga Bata kag Utod',
L358  U+1F413 <U+1F413>  sireOffspringHeader: '<U+1F413> Mga Bata ni {name}',
L359  U+1F414 <U+1F414>  damOffspringHeader: '<U+1F414> Mga Bata ni {name}',
L362  U+1F9EC <U+1F9EC>  lineageGeneration: '<U+1F9EC> Kaliwat nga Henerasyon',
L366  U+1F413 <U+1F413>  sireLineage: '<U+1F413> Kaliwat sang Sire',
L367  U+1F414 <U+1F414>  damLineage: '<U+1F414> Kaliwat sang Dam',
L371  U+1F9EC <U+1F9EC>  bloodlineSplitEmptyTitle: '<U+1F9EC> Pihak sang Dugo',
L418  U+1F512 <U+1F512>  verifyBeforeRegistering: '<U+1F512> Siguraduha ang katumpakan sang kaliwat antes irehistro sa kural.',
L436  U+2795 <U+2795>  encodeFirstMale: '<U+2795> I-encode ang Una nga Cock',
L437  U+2795 <U+2795>  encodeFirstFemale: '<U+2795> I-encode ang Una nga Hen',
L474  U+2795 <U+2795>  encodeFirstOffspring: '<U+2795> Maglista sang Una nga Offspring',
L489  U+1F4C5 <U+1F4C5>  cardAgeLabel: '<U+1F4C5> Edad:',
L504  U+1F413 <U+1F413>  badgeMale: '<U+1F413> Male',
L505  U+1F414 <U+1F414>  badgeFemale: '<U+1F414> Female',
````

### `gallotrack-next/lib/i18n/tl.ts`

````text
L306  U+274C <U+274C>  idAlreadyInUse: '<U+274C> Ang kodigong "{code}" ay ginagamit na ng ibang manok',
L311  U+274C <U+274C>  wingBandDuplicate: '<U+274C> Ang Wing Banding "{band}" ay nakatalaga na sa ibang manok.',
L328  U+1F4C5 <U+1F4C5>  autoAgeLabel: '<U+1F4C5> Awtomatikong Edad: {label} · Eksakto {exact}',
L346  U+2795 <U+2795>  saveNewLegColor: '<U+2795> I-save ang "{color}" bilang bagong kulay ng paa',
L357  U+1F464 <U+1F464>  existingOffspringSiblings: '<U+1F464> Mga Kasalukuyang Anak at Kapatid',
L358  U+1F413 <U+1F413>  sireOffspringHeader: '<U+1F413> Mga Anak ni {name}',
L359  U+1F414 <U+1F414>  damOffspringHeader: '<U+1F414> Mga Anak ni {name}',
L362  U+1F9EC <U+1F9EC>  lineageGeneration: '<U+1F9EC> Henerasyon ng Lahi',
L366  U+1F413 <U+1F413>  sireLineage: '<U+1F413> Lahi ng Sire',
L367  U+1F414 <U+1F414>  damLineage: '<U+1F414> Lahi ng Dam',
L371  U+1F9EC <U+1F9EC>  bloodlineSplitEmptyTitle: '<U+1F9EC> Hati ng Dugo',
L418  U+1F512 <U+1F512>  verifyBeforeRegistering: '<U+1F512> Tiyaking tumpak ang lahi bago irehistro sa kural.',
L436  U+2795 <U+2795>  encodeFirstMale: '<U+2795> I-encode ang Unang Cock',
L437  U+2795 <U+2795>  encodeFirstFemale: '<U+2795> I-encode ang Unang Hen',
L474  U+2795 <U+2795>  encodeFirstOffspring: '<U+2795> Magtala ng Unang Offspring',
L489  U+1F4C5 <U+1F4C5>  cardAgeLabel: '<U+1F4C5> Edad:',
L504  U+1F413 <U+1F413>  badgeMale: '<U+1F413> Male',
L505  U+1F414 <U+1F414>  badgeFemale: '<U+1F414> Female',
````

### `gallotrack-next/locales/en.json`

````text
L275  U+274C <U+274C>  "idAlreadyInUse": "<U+274C> Identifier \"{code}\" is already in use by another chicken",
L280  U+274C <U+274C>  "wingBandDuplicate": "<U+274C> Wing Banding \"{band}\" is already assigned to another chicken.",
L297  U+1F4C5 <U+1F4C5>  "autoAgeLabel": "<U+1F4C5> Auto Age: {label} · Exact {exact}",
L315  U+2795 <U+2795>  "saveNewLegColor": "<U+2795> Save \"{color}\" as new leg color",
L326  U+1F464 <U+1F464>  "existingOffspringSiblings": "<U+1F464> Existing Offspring & Siblings",
L327  U+1F413 <U+1F413>  "sireOffspringHeader": "<U+1F413> {name} Offspring",
L328  U+1F414 <U+1F414>  "damOffspringHeader": "<U+1F414> {name} Offspring",
L331  U+1F9EC <U+1F9EC>  "lineageGeneration": "<U+1F9EC> Lineage Generation",
L335  U+1F413 <U+1F413>  "sireLineage": "<U+1F413> Sire Lineage",
L336  U+1F414 <U+1F414>  "damLineage": "<U+1F414> Dam Lineage",
L340  U+1F9EC <U+1F9EC>  "bloodlineSplitEmptyTitle": "<U+1F9EC> Bloodline Split",
L387  U+1F512 <U+1F512>  "verifyBeforeRegistering": "<U+1F512> Verify lineage accuracy before registering to the farm registry.",
L403  U+2795 <U+2795>  "encodeFirstMale": "<U+2795> Encode First Cock",
L404  U+2795 <U+2795>  "encodeFirstFemale": "<U+2795> Encode First Hen",
L440  U+2795 <U+2795>  "encodeFirstOffspring": "<U+2795> Encode First Offspring Chicken",
L455  U+1F4C5 <U+1F4C5>  "cardAgeLabel": "<U+1F4C5> Age:",
L470  U+1F413 <U+1F413>  "badgeMale": "<U+1F413> Male",
L471  U+1F414 <U+1F414>  "badgeFemale": "<U+1F414> Female",
````

### `gallotrack-next/locales/hil.json`

````text
L275  U+274C <U+274C>  "idAlreadyInUse": "<U+274C> Ang kodigo nga \"{code}\" ginagamit na sang iban nga manok",
L280  U+274C <U+274C>  "wingBandDuplicate": "<U+274C> Ang Wing Banding \"{band}\" nahatag na sa iban nga manok.",
L297  U+1F4C5 <U+1F4C5>  "autoAgeLabel": "<U+1F4C5> Awtomatiko nga Edad: {label} · Eksakto {exact}",
L315  U+2795 <U+2795>  "saveNewLegColor": "<U+2795> I-save ang \"{color}\" bilang bag-o nga kolor sang tiil",
L326  U+1F464 <U+1F464>  "existingOffspringSiblings": "<U+1F464> Mga Yara nga Bata kag Utod",
L327  U+1F413 <U+1F413>  "sireOffspringHeader": "<U+1F413> Mga Bata ni {name}",
L328  U+1F414 <U+1F414>  "damOffspringHeader": "<U+1F414> Mga Bata ni {name}",
L331  U+1F9EC <U+1F9EC>  "lineageGeneration": "<U+1F9EC> Kaliwat nga Henerasyon",
L335  U+1F413 <U+1F413>  "sireLineage": "<U+1F413> Kaliwat sang Sire",
L336  U+1F414 <U+1F414>  "damLineage": "<U+1F414> Kaliwat sang Dam",
L340  U+1F9EC <U+1F9EC>  "bloodlineSplitEmptyTitle": "<U+1F9EC> Pihak sang Dugo",
L387  U+1F512 <U+1F512>  "verifyBeforeRegistering": "<U+1F512> Siguraduha ang katumpakan sang kaliwat antes irehistro sa kural.",
L403  U+2795 <U+2795>  "encodeFirstMale": "<U+2795> I-encode ang Una nga Cock",
L404  U+2795 <U+2795>  "encodeFirstFemale": "<U+2795> I-encode ang Una nga Hen",
L440  U+2795 <U+2795>  "encodeFirstOffspring": "<U+2795> Maglista sang Una nga Offspring",
L455  U+1F4C5 <U+1F4C5>  "cardAgeLabel": "<U+1F4C5> Edad:",
L470  U+1F413 <U+1F413>  "badgeMale": "<U+1F413> Male",
L471  U+1F414 <U+1F414>  "badgeFemale": "<U+1F414> Female",
````

### `gallotrack-next/locales/tl.json`

````text
L275  U+274C <U+274C>  "idAlreadyInUse": "<U+274C> Ang kodigong \"{code}\" ay ginagamit na ng ibang manok",
L280  U+274C <U+274C>  "wingBandDuplicate": "<U+274C> Ang Wing Banding \"{band}\" ay nakatalaga na sa ibang manok.",
L297  U+1F4C5 <U+1F4C5>  "autoAgeLabel": "<U+1F4C5> Awtomatikong Edad: {label} · Eksakto {exact}",
L315  U+2795 <U+2795>  "saveNewLegColor": "<U+2795> I-save ang \"{color}\" bilang bagong kulay ng paa",
L326  U+1F464 <U+1F464>  "existingOffspringSiblings": "<U+1F464> Mga Kasalukuyang Anak at Kapatid",
L327  U+1F413 <U+1F413>  "sireOffspringHeader": "<U+1F413> Mga Anak ni {name}",
L328  U+1F414 <U+1F414>  "damOffspringHeader": "<U+1F414> Mga Anak ni {name}",
L331  U+1F9EC <U+1F9EC>  "lineageGeneration": "<U+1F9EC> Henerasyon ng Lahi",
L335  U+1F413 <U+1F413>  "sireLineage": "<U+1F413> Lahi ng Sire",
L336  U+1F414 <U+1F414>  "damLineage": "<U+1F414> Lahi ng Dam",
L340  U+1F9EC <U+1F9EC>  "bloodlineSplitEmptyTitle": "<U+1F9EC> Hati ng Dugo",
L387  U+1F512 <U+1F512>  "verifyBeforeRegistering": "<U+1F512> Tiyaking tumpak ang lahi bago irehistro sa kural.",
L403  U+2795 <U+2795>  "encodeFirstMale": "<U+2795> I-encode ang Unang Cock",
L404  U+2795 <U+2795>  "encodeFirstFemale": "<U+2795> I-encode ang Unang Hen",
L440  U+2795 <U+2795>  "encodeFirstOffspring": "<U+2795> Magtala ng Unang Offspring",
L455  U+1F4C5 <U+1F4C5>  "cardAgeLabel": "<U+1F4C5> Edad:",
L470  U+1F413 <U+1F413>  "badgeMale": "<U+1F413> Male",
L471  U+1F414 <U+1F414>  "badgeFemale": "<U+1F414> Female",
````
