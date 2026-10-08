# Pedigree / Ancestors Tab Improvement - Implementation Plan

## Task 1: Rewrite PedigreeTree layout — tree-first with connectors, merged unknowns, zoom
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None (spec approved)
- **Description**:
  - Refactor [PedigreeTree.tsx](file:///c:/Users/angelica/Desktop/GalloTrack-Web/gallotrack-next/components/PedigreeTree.tsx) from stacked layout (breakdown first, tree second) to tree-as-primary with a two-column grid (tree flex-1 + right summary ~320px at ≥md; stacked at <md).
  - Replace the custom `Branch` flex column layout with a left-to-right CSS grid (generations as columns: G0 col 1, G1 col 2, G2 col 3, G3 col 4) with fixed-width cards (192-208px) so connector lines can be drawn deterministically.
  - Render SVG connector lines: from each child's right edge (midpoint between top/sire-bottom and top/dam-top) to the left edge of the sire card and the left edge of the dam card. Use `position: relative` container + absolutely positioned `<svg>` overlay for pixel accuracy.
  - Preserve generation labels G0/G1/G2/G3 (top of each column).
  - Implement merged-unknown-node detection: when walking ancestors, if both `sireName` and `damName` of a node are absent/foundation, render a single `AncestorCard` (merged variant, with `variant='merged-foundation'`) instead of two separate cards. Show tooltip via existing `Tooltip.tsx` component.
  - Add zoom/fit toolbar (Fit button only) inside the tree card header. Use CSS `transform: scale()` on the grid inner wrapper to fit the tree within available card width at ≥lg; on mobile the toolbar exposes just a Fit button and the card itself scrolls horizontally via `overflow-x: auto`.
  - Node content upgrade per FR-6: add small photo/avatar (existing `<ChickenIcon>` fallback or `image_url`), identifier badge using sire number/dam letter/bird code via `getParentCode` / `formatBirdCodeForDisplay`, breed + `stats.summary` label. Remove the separate `stats.dominant.pct`% label that duplicates the summary; show `stats.summary` alone.
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4, AC-10
- **Test Requirements**:
  - `rule` TR-1.1: Given a 2E1-like fixture (sire & dam each have two unknown parents), `render(<PedigreeTree .../>)` renders exactly 2 merged foundation cards and 0 unmerged "Foundation Stock · Not in registry" cards in G2. Evidence: Vitest `getAllByText(/Foundation stock · not in registry/i).length === 2` + no matches for standalone per-parent "Foundation Stock" wording.
  - `rule` TR-1.2: Connector SVG overlay exists and has ≥4 `<line>` elements for a 3-generation tree. Evidence: `container.querySelector('svg.pedigree-connectors')` non-null, and `querySelectorAll('line').length >= 4`.
  - `rule` TR-1.3: Subject node contains exactly one percentage-based composition summary (from stats.summary) and does NOT contain a separate standalone dominant percentage badge. Evidence: regex count of `/\d+% [A-Z][a-z]+/` occurrences on subject card equals the number of strains in summary (no duplicate "Sweater 50%" badge).
  - `rubric` TR-1.4: Layout clarity; scale 0-4; anchors 0=tree pushed below fold, 2=tree visible but connectors wobbly/misaligned, 3=tree+connectors crisp and tree visible without scroll at 1366×768, 4=plus perfect alignment across zoom levels; threshold ≥3; Evidence = screenshot + DOM bounding-rect check.
- **Notes**: Keep existing `MAX_ANCESTOR_GENERATIONS=3` (G0..G3 = 4 generations). Do NOT change `getFowlBloodlineStats` import/usage — call it exactly as today.

## Task 2: Subject selector upgrade — searchable, prev/next, URL param
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1 (shares PedigreeTree props)
- **Description**:
  - Replace the current plain `<select>` in [PedigreeTree.tsx](file:///c:/Users/angelica/Desktop/GalloTrack-Web/gallotrack-next/components/PedigreeTree.tsx#L191-L208) with a new internal `SubjectSelector` subcomponent. Use a controlled combobox: text input with a dropdown, styled like the existing global search in LineageDirectory.
  - Each option row shows: `[{code}]` badge + `{name}` truncatable + role tag (`registry_role`) + status pill (Active/Archived/Deceased, reusing the existing `StatusPill` style from LineageDirectory).
  - Search filter: match `{name}` contains, `{bird_code|chicken_code|birth_code}` contains (case-insensitive), and `{wing_band}` contains.
  - Add `<` Prev / `>` Next buttons flanking the selector. Traversal order uses `compareBirdCodesNatural` on the bird_code (falling back to `id` sort when code missing). Wrap around at ends.
  - URL sync: on PedigreeTree mount, read `?chicken=` from `window.location.search` (and `useSearchParams()` via Next if available); find the fowl by bird_code/chicken_code/birth_code case-insensitive match and select it. On user selection change, write `history.replaceState` updating the same param (also keep `?tab=pedigree` if present).
  - Wire `?chicken=` in the existing LineageDirectory URL effect [LineageDirectory.tsx](file:///c:/Users/angelica/Desktop/GalloTrack-Web/gallotrack-next/components/LineageDirectory.tsx#L717-L771) so `?tab=pedigree&chicken=2E1` pre-selects the chicken and switches to the pedigree tab.
  - Add "View pedigree" link/button: in [FowlDetailsModal.tsx](file:///c:/Users/angelica/Desktop/GalloTrack-Web/gallotrack-next/components/modals/FowlDetailsModal.tsx) and any chicken-card surface, add a small `GitBranch` + "View pedigree" action that navigates via `useRouter().push(\`/lineage?tab=pedigree&chicken=\${code}\`)`.
- **Acceptance Criteria Addressed**: AC-6, AC-11, AC-12
- **Test Requirements**:
  - `rule` TR-2.1: Searchable select — typing "2E1" filters options to only chickens whose code/name/wing contains "2E1". Evidence: fireEvent.change on input + assert rendered option count.
  - `rule` TR-2.2: Prev/Next stepping — starting at index N, clicking Next twice selects the chicken at index N+2 in `compareBirdCodesNatural` order. Evidence: state id assertions.
  - `rule` TR-2.3: URL `?chicken=1A2` — render with `window.location.search = '?chicken=1A2&tab=pedigree'`; assert that the selected subject.id matches the fowl with code `1A2`. Evidence: rendered subject card name.
  - `rule` TR-2.4: User selecting a new chicken updates `window.location.search` to contain `chicken=NEWCODE`. Evidence: `history.replaceState` spy.
- **Notes**: Reuse existing `SearchInput.tsx` UI component patterns if available; otherwise inline (same approach as LineageDirectory global search).

## Task 3: Compact bloodline summary panel and shared ancestor detection
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 1 (uses the right column slot)
- **Description**:
  - Create a compact `<BloodlineSummaryPanel stats={stats} compact>` component (or extend existing [BloodlineBreakdown.tsx](file:///c:/Users/angelica/Desktop/GalloTrack-Web/gallotrack-next/components/BloodlineBreakdown.tsx) with `compact` prop — it already has a `compact` prop placeholder).
  - For `compact=true`: height ≈ 1/3 of full panel; show only: (a) the segmented bar (stacked divs, 16px tall), (b) inline legend (% + strain name, one line), (c) `{strainCount} bloodline{s}` pill, (d) one-line explanation "50% Sire · 50% Dam · halved each generation", (e) unknown-ancestry note: when `unknownPct > 0`, render "`{unknownPct}% unknown because {nUnknownAncestors} ancestor{s} are not registered`" — `nUnknownAncestors` count derived from walking the rendered tree and counting unregistered nodes (not the pct alone, so 2 grandparents = 50% → nUnknownAncestors=2).
  - Optional shared ancestor detection (FR-14): walk the pedigree tree (subject, sire, dam, recursively) building `Map<nameLower, count>` and `Map<nameLower, side[]>`. Any name with count≥2 AND both "sire" and "dam" sides present → flagged. Render one line at the bottom of the summary panel: `Line-bred: {Name} appears on both sides`. Use neutral tone only (no health/genetic claim). If the seeded/fixture data has no such case, still implement the detector but render nothing; log a comment noting the UI surface is ready.
- **Acceptance Criteria Addressed**: AC-13, AC-14
- **Test Requirements**:
  - `rule` TR-3.1: Compact panel for 2E1 renders a segmented bar with Hatch 50% + Sweater 50%, shows "2 bloodlines", shows the 50% Sire · 50% Dam note, and shows unknown-ancestry note containing "grandparents are not registered" because 2 G2 ancestor pairs are unknown. Evidence: render + queryByText.
  - `rule` TR-3.2: Given a fixture where "Iron Lemon" appears as both a great-grandparent on the sire side and a great-grandparent on the dam side, panel renders `Line-bred: Iron Lemon appears on both sides`. Evidence: render + queryByText.
- **Notes**: Keep existing `BloodlineBreakdown.tsx` full variant unchanged for other usages; only extend the `compact` prop.

## Task 4: Print / Export PDF
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 1 (tree structure stable)
- **Description**:
  - Add a "🖨 Print / Export PDF" button (printer icon from lucide-react) in the toolbar area of the Pedigree tab (inside the subject selector row, right-aligned).
  - On click, call `window.print()` but first apply a transient `print-mode` class to `<body>` / root so `@media print` CSS can scope styles.
  - Write print stylesheet rules (in [globals.css](file:///c:/Users/angelica/Desktop/GalloTrack-Web/gallotrack-next/app/globals.css) or a scoped `<style jsx global>` block):
    - `@page { size: letter; margin: 0.5in; }`
    - Hide: `header`, `.sticky-top-container`, tabs/nav, non-pedigree tab panels, sidebar, all buttons except none (`.no-print { display: none !important; }`)
    - Body: white background, black text, no shadows
    - Print subject summary block first: large avatar + identifier badge + name + hatch date/birthdate + breed + `stats.summary` (large, readable)
    - Print 4-generation pedigree tree scaled down slightly (0.9×) so columns fit letter width; ensure connector lines print
    - Page-break rules: avoid breaking inside node cards.
  - Label all printable regions with `className="print-only"` / `className="no-print"` classes.
- **Acceptance Criteria Addressed**: AC-8
- **Test Requirements**:
  - `rule` TR-4.1: Print button exists and calls `window.print` on click (spy on window.print). Evidence: Vitest fireEvent + spy.
  - `rule` TR-4.2: CSS contains `@media print` rules with `.no-print { display: none }` and `@page size` declaration. Evidence: grep over source files.
- **Notes**: No new dependencies (no jsPDF / html2canvas). Browser native print-to-PDF is the PDF export.

## Task 5: Re-centering, View profile, Back breadcrumb, Register ancestor action
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1 (node click handlers)
- **Description**:
  - Implement re-centering: clicking any ancestor card (that has a registered fowl) replaces the current subject with that ancestor. Maintain a `history: number[]` (fowl ids) stack; push the prior subject id before switching. Render a breadcrumb row above the tree: `← Back to {prevName}` button + full breadcrumb crumbs list (`Home > G0 > G1 Sire ...`) when depth > 1.
  - Keyboard: ancestor nodes have `tabIndex=0`, on `Enter` or `Space` trigger re-center (same as click). `aria-label` on each node: `"{role} — {name}. {code}. Bloodline: {summary}. Press Enter to view {name}'s own pedigree."`.
  - "View profile" link/action on every node card: bottom-right small `User` icon + "View profile". Calls `setSelectedFowlForDetails(fowl)` prop (which is already wired via `onSelect?` — rename/add it as `onViewProfile` and keep both semantics).
  - "Register ancestor" action on merged-foundation nodes and unregistered single nodes: only rendered when user has permission (same gate as edit fowl, reuse `useAuth()` / existing checks that enable the edit button elsewhere). Click calls `ui.setEditingFowl(prefilledNewFowl)` where prefilledNewFowl = a stub FowlRecord: gender inferred (Sire → Rooster, Dam → Hen, merged → prompt user or default Rooster), breed inferred (if parent was 100% Sweater the foundation side likely Sweater too, else empty), sire/dam blank, status=Active. No save happens automatically (just opens the existing modal, which requires user submit).
  - Screen reader alternative: a visually hidden `<nav aria-label="Pedigree ancestry as nested list">` containing `<ul>`/`<li>` where each generation nests under its parent. Update this list on re-center.
- **Acceptance Criteria Addressed**: AC-5, AC-7, AC-9 (partially)
- **Test Requirements**:
  - `rule` TR-5.1: Click ancestor → subject id changes; Back button click → original id restored. Evidence: fireEvent.click two times + assert id transitions.
  - `rule` TR-5.2: Node with tabIndex=0, fireEvent.keyDown Enter → same re-center behavior as click. Evidence: id changed.
  - `rule` TR-5.3: "Register ancestor" click on merged-foundation node → `ui.setEditingFowl` called with prefilled stub (gender inferred, sire/dam empty); fowls array length unchanged (no auto-create). Evidence: vi.spy on UI context.
- **Notes**: Do NOT add any new save/write paths through the fowl context. Open the modal only.

## Task 6: Mobile layout, dark/light mode, loading & empty states, a11y final polish
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1, Task 2, Task 5
- **Description**:
  - Dark mode audit: ensure every custom color (borders, badges, connector stroke) uses Tailwind semantic tokens (`border-emerald-300 dark:border-emerald-800`, not hardcoded hex). Connector SVG stroke = `stroke="currentColor"` with a className like `text-border dark:text-border/80` so it themes.
  - Mobile: at `<md` stack tree + summary vertically. Tree card has `overflow-x: auto` + `max-w-full`; show a "Fit to width" button that resets any zoom-scale to 1 and scrolls to start. On `≤sm` (≤640px) additionally offer a vertical outline fallback toggle (accordion list: Subject → Sire branch expanded → Dam branch expanded) using `<details>` for native a11y.
  - Loading state: when fowls array is empty and context says loading (check fowlContext loading flag), render skeleton cards via [Skeleton.tsx](file:///c:/Users/angelica/Desktop/GalloTrack-Web/gallotrack-next/components/ui/Skeleton.tsx) matching the tree layout shape.
  - Empty state: when fowls.length === 0 (not loading), reuse existing EmptyState component with Dna icon and copy "Register chickens with Sire and Dam to build a pedigree."
  - a11y polish: add `role="tree"` + `aria-roledescription="pedigree tree"` on container; nodes use `role="treeitem"`; `aria-level` = generation + 1; `aria-expanded` for unknown branches (always true currently). Add skip-link target inside the tree for keyboard jump. Use existing `SkipLink.tsx` or add a tabIndex=0 container with label.
- **Acceptance Criteria Addressed**: AC-9
- **Test Requirements**:
  - `rubric` TR-6.1: Theme and a11y coverage — scale 0-4; anchors 0=no dark mode, 1=dark mode broken contrast, 2=dark mode ok but missing ARIA roles, 3=roles in place, contrast AA+, focus outlines visible (≥3), mobile tree scrolls + Fit works; threshold ≥3; Evidence = axe-core scan (existing `components/ui/axe.ts` helper) + manual dark screenshot.
  - `rule` TR-6.2: Empty fowls → EmptyState component renders (matches "Register chickens" text); Loading fowls → Skeleton elements present in tree area. Evidence: Vitest render.
- **Notes**: Use existing UI primitives (Card, Badge, Skeleton, Tooltip, Button) from [components/ui/](file:///c:/Users/angelica/Desktop/GalloTrack-Web/gallotrack-next/components/ui/); do not re-implement.

## Task 7: Wire up in LineageDirectory + add View pedigree link to chicken cards
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 1, Task 2, Task 5
- **Description**:
  - In [LineageDirectory.tsx](file:///c:/Users/angelica/Desktop/GalloTrack-Web/gallotrack-next/components/LineageDirectory.tsx#L2647-L2656) the pedigree tab already mounts `<PedigreeTree fowls={filteredPedigreeFowls} codes={birdCodes} onSelect={setSelectedFowlForDetails} />`. Extend prop forwarding as needed: `onViewProfile`, `canRegisterAncestor` (auth check), current URL `?chicken=` can be read inside PedigreeTree but also pre-pipe the selected fowl id via `selectedId` prop (so parent is in control for tests).
  - Add "View pedigree" link to [FowlDetailsModal.tsx](file:///c:/Users/angelica/Desktop/GalloTrack-Web/gallotrack-next/components/modals/FowlDetailsModal.tsx) in the action row (alongside "Edit chicken", "Record fight"). Use `useRouter()` from Next to navigate to `/lineage?tab=pedigree&chicken={code}`. Code = prefer bird_code/chicken_code else id.
  - Add same "View pedigree" to any chicken-card in ProfilingPage/Registry if visible there; search for similar "View details" patterns.
- **Acceptance Criteria Addressed**: AC-11, AC-12
- **Test Requirements**:
  - `rule` TR-7.1: In FowlDetailsModal, clicking "View pedigree" calls `router.push` with a path containing `/lineage?tab=pedigree&chicken=`. Evidence: Vitest with mocked next/navigation router.
- **Notes**: Be careful not to break the existing edit/record actions — append the new button only.

## Task 8: Add new test file PedigreeTree.test.tsx + extend existing tests
- **Status**: `pending`
- **Priority**: high
- **Depends On**: All tasks 1-7 implemented
- **Description**:
  - Create `gallotrack-next/components/PedigreeTree.test.tsx` mirroring the approach in [LineageDirectory.test.tsx](file:///c:/Users/angelica/Desktop/GalloTrack-Web/gallotrack-next/components/LineageDirectory.test.tsx).
  - Define a 2E1-like fixture:
    ```
    Sire 2 Titan Sweater (id=2, breed='Sweater', sire='', dam='')
    Dam  E Crimson Belle  (id=3, breed='Hatch',   sire='', dam='')
    Subj 2E1 Sweater Red Storm (id=1, sire='2 Titan Sweater', dam='E Crimson Belle', breed='Hatch, Sweater', bird_code='2E1')
    ```
    → expected G2 merged count = 2.
  - Add tests covering all `rule` TRs from tasks 1-5.
  - Percentage-unchanged test: pick a multi-generation fixture with known parents; call both `getFowlBloodlineStats(subject, fowls)` directly and the rendered subject card text from `<BloodlineSummaryPanel>`; assert percentages equal (same rounding).
  - Extend [LineageDirectory.test.tsx](file:///c:/Users/angelica/Desktop/GalloTrack-Web/gallotrack-next/components/LineageDirectory.test.tsx): add a case that switches to pedigree tab with `?tab=pedigree&chicken=1A1` and asserts subject is Offspring 1A1.
- **Acceptance Criteria Addressed**: AC-3, AC-4, AC-5, AC-6
- **Test Requirements**:
  - `rule` TR-8.1: New test file exists, imports PedigreeTree, renders 2E1 fixture, produces ≥4 distinct `it(...)` cases covering merged nodes, re-center with Back, percentage parity, and search/URL. Evidence = file exists + `npx vitest run PedigreeTree.test.tsx` passes.
  - `rule` TR-8.2: LineageDirectory extended test passes — loading `?tab=pedigree&chicken=1A1` selects Offspring 1A1 as subject. Evidence = vitest run.
- **Notes**: Use the `bird(partial)` helper pattern already defined in LineageDirectory.test.tsx to keep fixtures compact.

## Task 9: Run build/lint/tests + fix breakages
- **Status**: `pending`
- **Priority**: high
- **Depends On**: All tasks 1-8
- **Description**:
  - `cd gallotrack-next && npm run build` — fix any TS/type errors.
  - `npm run lint` — fix ESLint issues (respect existing `eslint-suppressions.json`; do not add blanket suppressions).
  - `npm test` or `npx vitest run` — all tests green including new PedigreeTree tests.
  - Manual sanity check: open `/lineage?tab=pedigree&chicken=2E1` (or seed-equivalent), confirm:
    1. Tree visible w/o scrolling at 1366×768
    2. 4 old grandparent boxes → 2 merged "Foundation stock · not in registry" cards
    3. Subject card shows cross "50% Hatch · 50% Sweater" only (no standalone "Sweater 50%")
    4. Clicking Sire node re-centers; Back returns
    5. Prev/Next buttons step through chickens in code order
    6. Print button triggers print dialog
    7. Search in subject selector filters by name/code/wing band
- **Acceptance Criteria Addressed**: All ACs (final verification)
- **Test Requirements**:
  - `rule` TR-9.1: `npm run build` exits 0.
  - `rule` TR-9.2: `npm run lint` exits 0.
  - `rule` TR-9.3: `npx vitest run` exits 0 with all suites passing.
  - `rubric` TR-9.4: Manual checklist 1-7 all pass; 0/7 = fail, 5/7+ = pass; threshold ≥6/7; Evidence = annotated screenshots or dev-run log.
- **Notes**: If 2E1 does not exist in the real seed data, use any chicken whose parents are pure-bred (Sweater/Hatch) and whose grandparents are not registered — the outcome is symmetric. Report the actual chicken code used in the final confirmation.
