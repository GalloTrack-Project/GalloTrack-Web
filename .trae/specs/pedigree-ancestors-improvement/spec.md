# Pedigree / Ancestors Tab Improvement - Product Requirements Document

## Overview
- **Summary**: Redesign the "Pedigree / Ancestors" tab of the Family Lineage Directory to improve layout, clarity, and usability while preserving existing bloodline calculations and data.
- **Purpose**: Make the pedigree tree easier to read and navigate; surface the bloodline breakdown in a compact summary; collapse unknown ancestors; add searchable subject selection with URL support and export.
- **Target Users**: Farm owners and breeders using GalloTrack to manage gamefowl lineage, view ancestry, and plan breeding decisions.

## Goals
- Tree is visible above the fold at 1366×768 with a compact bloodline summary beside it.
- Unknown (Foundation Stock) grandparents collapse into single merged nodes instead of four identical boxes.
- Subject selection is searchable, step-able via prev/next, and deep-linkable via URL (`?chicken=2E1`).
- Node percentages and bloodline labels are unambiguous (no duplicate "Sweater 50%" + "50% Hatch · 50% Sweater" confusion).
- Ancestors are clickable to re-center the pedigree, with a breadcrumb/Back path.
- Print / PDF export produces a clean 4-generation pedigree sheet.
- Accessible (keyboard, screen reader), light/dark aware, mobile-friendly, with loading/empty states.

## Non-Goals
- Do NOT change the bloodline calculation algorithm in `bloodline-composition.ts`.
- Do NOT modify any lineage data, fowl records, or database schema.
- Do NOT invent medical or genetic claims; keep shared-ancestor wording strictly neutral.
- Do NOT create chicken data automatically; "Register ancestor" only prefills the form.

## Background & Context
- Current implementation lives in [PedigreeTree.tsx](file:///c:/Users/angelica/Desktop/GalloTrack-Web/gallotrack-next/components/PedigreeTree.tsx) with the tab rendered in [LineageDirectory.tsx](file:///c:/Users/angelica/Desktop/GalloTrack-Web/gallotrack-next/components/LineageDirectory.tsx#L2647-L2656).
- Bloodline engine is in [bloodline-composition.ts](file:///c:/Users/angelica/Desktop/GalloTrack-Web/gallotrack-next/lib/bloodline-composition.ts); `getFowlBloodlineStats()` returns the per-chicken breakdown and MUST be used as-is.
- Chicken codes are resolved with `resolveBirdCodes()` from [bird-code.ts](file:///c:/Users/angelica/Desktop/GalloTrack-Web/gallotrack-next/lib/bird-code.ts).
- Wrappers and data are injected from [wrappers.tsx](file:///c:/Users/angelica/Desktop/GalloTrack-Web/gallotrack-next/app/(dashboard)/wrappers.tsx#L49-L63).

## Functional Requirements
- **FR-1 (Layout)**: Pedigree tree is the primary element, rendered directly under the context bar. A compact (~320px) Bloodline Summary panel sits to its right on ≥md screens and stacks below it on narrow screens. Tree must fit without vertical scrolling at 1366×768 for 2E1 Sweater Red Storm.
- **FR-2 (Tree connectors)**: Draw visible connector lines between each child node and its two parent nodes (sire above, dam below). Tree is laid out left-to-right with generations as columns (G0 subject = leftmost, G1 parents, G2 grandparents, G3 great-grandparents). Generation labels (G0, G1, G2, G3) are retained.
- **FR-3 (Zoom & scroll)**: Add a zoom/fit control (fit-to-width button). Horizontal scrolling inside the tree card is enabled only when ≥5 generations would be rendered (future-proofing; current max is 4).
- **FR-4 (Unknown ancestor collapse)**: When BOTH parents of a node are unregistered (Foundation Stock / not in registry), render ONE merged card labeled "Foundation stock · not in registry" instead of two separate identical cards. Include a tooltip: "Both sides of this ancestor's lineage are unregistered foundation stock."
- **FR-5 (Register ancestor action)**: On unknown/merged nodes, show a small "Register ancestor" button/action for users who have edit permissions. Clicking opens the existing fowl edit/registration form prefilled as a foundation bird (breed prefilled from the child's side if inferable, sire/dam blank). No data is created automatically.
- **FR-6 (Node content)**: Every node shows: (a) identifier badge (sire number like "2", dam letter like "E", or offspring code like "2E1"), (b) name, (c) small photo/avatar, (d) breed / bloodline composition label (pure parent → "100% Sweater"; subject cross → "50% Hatch · 50% Sweater"; use `stats.summary` for multi-strain). (e) the subject's own share on non-subject nodes. Remove the standalone "Sweater 50%" label on the subject node; show only the cross summary.
- **FR-7 (Re-centering)**: Clicking any ancestor node re-centers the pedigree on that chicken (that chicken becomes the new G0 subject). A breadcrumb bar or "← Back to [previous]" button returns the user to the prior subject. Click node again or press Enter while focused to re-center.
- **FR-8 (View profile)**: Each node has a "View profile" link/action that calls `setSelectedFowlForDetails(fowl)`, same as other lineage tabs.
- **FR-9 (Subject selector)**: Replace the plain `<select>` with a searchable combobox showing `"{code} · {name}"` (e.g. "2E1 · Sweater Red Storm"), plus role tag (Breeding Male / Breeding Female / Non-Breeding) and status pill (Active / Archived / Deceased). Search matches name, identifier (bird_code), and wing_band.
- **FR-10 (Prev/Next stepping)**: Add "« Prev" / "Next »" buttons beside the selector that step through chickens in natural bird-code order (`compareBirdCodesNatural`).
- **FR-11 (URL param)**: Support `?chicken=2E1` on the `/lineage` route. On mount, if the param is present, select the matching chicken (by bird_code, case-insensitive). When the user selects a different chicken, update the URL query param via `history.replaceState` / Next.js router. Other pages (Registry, Inventory, Match Logs) must be able to link to `/lineage?tab=pedigree&chicken=2E1`.
- **FR-12 (View pedigree links)**: On chicken cards (FowlDetailsModal / registry cards), add a "View pedigree" link that navigates to `/lineage?tab=pedigree&chicken={code}`.
- **FR-13 (Compact bloodline summary)**: Right-side panel (see FR-1) shows: (a) segmented/stacked bar with per-bloodline percentages, (b) count of distinct bloodlines, (c) one-line calculation note ("50% sire · 50% dam, halved each generation"), (d) unknown-ancestry note like "50% unknown because 2 grandparents are not registered" (sourced from `stats.unknownPct` + heuristic count of unregistered ancestors in the walk). Height should be ~1/3 of the current full BloodlineBreakdown panel.
- **FR-14 (Shared ancestor indicator — optional if data exists)**: Flag nodes that appear on both sire and dam sides of the pedigree with a clearly labeled neutral indicator, e.g. "Line-bred: Iron Lemon appears on both sides". NO medical or genetic claim. Only surface when an actual duplicated name is detected by walking the tree. If insufficient data exists in the seed/test data to demonstrate this feature, it is acceptable to omit the UI surface and instead log a note.
- **FR-15 (Print / Export PDF)**: Add a "Print / Export PDF" button on the pedigree tab. On click, use `window.print()` with a print stylesheet that: hides navigation, uses white background, lays out the subject details block (photo, identifier, name, hatch date, breed, bloodline %), then the 4-generation pedigree tree. Test that 4 generations fit on A4 / Letter.
- **FR-16 (Quality)**: Nodes are keyboard-focusable and Enter re-centers; `aria-label`s describe each node's role; provide a screen-reader text alternative (nested `<ul>` of ancestors, visually hidden). Full light + dark mode support. Mobile: tree scrolls horizontally inside its card with a Fit button; alternate vertical outline list view on very narrow screens (≤sm). Proper loading skeleton while fowls are fetching and empty state when no fowls exist.

## Non-Functional Requirements
- **NFR-1 (Calculation immutability)**: For any chicken present in the existing seed/registry, the bloodline percentages reported by the new UI MUST be byte-for-byte identical to `getFowlBloodlineStats(fowl, fowls).entries` — call the same function, do not recompute inline.
- **NFR-2 (Performance)**: Pedigree tab must render in ≤300ms for a registry of 500 chickens on a mid-tier laptop. No layout thrash; tree layout is computed via CSS grid / positioned SVG lines.
- **NFR-3 (Test coverage)**: New tests cover (a) merged unknown nodes rendering, (b) re-centering on ancestor click, (c) searchable select filtering, (d) URL `?chicken=` loading, (e) percentage parity against the bloodline engine for a known chicken.
- **NFR-4 (AGENTS.md compliance)**: Follow all rules in [AGENTS.md](file:///c:/Users/angelica/Desktop/GalloTrack-Web/gallotrack-next/AGENTS.md).

## Constraints
- **Technical**: Next.js App Router with RSC + client components (`'use client'`); React 18+; Tailwind CSS; Vitest for tests; existing lucide-react icons only. No new npm packages without explicit user approval. Use existing `useFowl`, `useUI` contexts from `lib/contexts/`.
- **Business**: No changes to Supabase migrations or tables for this task. Permission checks for "Register ancestor" use the existing auth context (isAdmin / farm owner checks already in place).
- **Dependencies**: Depends on `PedigreeTree.tsx`, `BloodlineBreakdown.tsx`, `LineageDirectory.tsx`, `wrappers.tsx`, `FowlDetailsModal.tsx` (for "View pedigree" link).

## Assumptions
- The max generations currently rendered is 4 (MAX_ANCESTOR_GENERATIONS = 3 in PedigreeTree.tsx means G0..G3). Zoom/fit only needs to handle 4 columns now, with graceful handling for future expansion.
- "Register ancestor" reuses the existing `EditFowlModal` / `ui.setEditingFowl()` pattern; prefill with `{ breed: childSideBreed, sire: '', dam: '', registry_role: 'Breeding Male'|'Breeding Female' }` based on the ancestor's role.
- 2E1 Sweater Red Storm is a valid test chicken in the seeded data; the 4 grandparent boxes should collapse to 2 merged foundation cards after the change (one set per parent-side).
- Permission for "Register ancestor": users who can already see `EditFowlModal` (same gate as `setEditingFowl`). No new permission model.

## Acceptance Criteria

### AC-1: Tree + compact summary layout fits 1366×768
- **Type**: `rule`
- **Given**: The Pedigree / Ancestors tab is open and 2E1 Sweater Red Storm is selected
- **When**: Viewport is 1366×768
- **Then**: The entire pedigree tree card is visible without vertical scrolling. The bloodline summary panel sits to the right of the tree at ≥1024px and below at <1024px.
- **Pass Condition**: Resize test: `window.innerHeight=768`, tree card's `getBoundingClientRect().bottom` ≤ `window.innerHeight` minus sticky header (~120px).
- **Evidence**: Manual screenshot + Cypress-like DOM assertion; or Playwright resize snapshot.

### AC-2: Connector lines between nodes render
- **Type**: `rule`
- **Given**: Pedigree tree for 2E1 (G0) → Sire G1 + Dam G1 → G2 grandparents
- **When**: Tree is rendered
- **Then**: A visible SVG or CSS line connects the G0 subject's right edge to the sire-card's left edge and another to the dam-card's left edge; likewise each G1 parent connects to its own two G2 parents.
- **Pass Condition**: Visual inspection + DOM query for `svg` or `.connector-*` elements with non-zero width/height.
- **Evidence**: Screenshot; Vitest render with `container.querySelector('svg')` non-null.

### AC-3: Unknown grandparents collapse into merged nodes
- **Type**: `rule`
- **Given**: 2E1 Sweater Red Storm's sire (2 Titan Sweater) has unregistered sire & dam; dam (E Crimson Belle) also has unregistered sire & dam
- **When**: Tree renders
- **Then**: Instead of 4 "Foundation Stock · Not in registry" G2 boxes, there are exactly 2 merged nodes (one per G1 parent's unknown side), each with the tooltip "Both sides of this ancestor's lineage are unregistered foundation stock."
- **Pass Condition**: Test render counts merged cards = 2 and per-parent unmerged foundation cards = 0.
- **Evidence**: Vitest test case in `PedigreeTree.test.tsx` (new file) using seeded 2E1-equivalent fixture.

### AC-4: Percentages match bloodline engine exactly
- **Type**: `rule`
- **Given**: Any fowl with recorded bloodline_composition
- **When**: PedigreeTree renders the subject node and ancestor nodes
- **Then**: Every percentage label equals the corresponding entry from `getFowlBloodlineStats(fowl, fowls).entries` (to 1 decimal). No inline recomputation.
- **Pass Condition**: Unit test asserts strict equality for a 3-generation fixture.
- **Evidence**: Vitest snapshot + exact-value assertion.

### AC-5: Re-centering on ancestor click with Back
- **Type**: `rule`
- **Given**: Pedigree rooted at 2E1; its sire "2 Titan Sweater" is clickable
- **When**: User clicks / presses Enter on the sire node
- **Then**: Sire "2 Titan Sweater" becomes the G0 subject; a breadcrumb or "← Back to 2E1 Sweater Red Storm" button appears. Clicking Back restores 2E1 as subject.
- **Pass Condition**: End-to-end interaction in a test: subject id before click ≠ after click; Back click restores original id.
- **Evidence**: Vitest fireEvent + state assertions.

### AC-6: Searchable select, Prev/Next, and URL param
- **Type**: `rule`
- **Given**: Registry with chickens having codes 1, A, 1A1, 1A2, 2E1 and names
- **When**: (a) user types "2E1" in the selector, (b) user clicks Next twice from code "1", (c) page loads with `?chicken=1A2&tab=pedigree`
- **Then**: (a) dropdown filters to the single 2E1 match showing "2E1 · Sweater Red Storm"; (b) selection steps in natural code order; (c) subject is 1A2 on initial render. Selector change updates URL param.
- **Pass Condition**: Three separate test assertions for each sub-case.
- **Evidence**: Vitest suite with mock URLSearchParams and mock router.

### AC-7: "Register ancestor" prefills form (no auto-create)
- **Type**: `rule`
- **Given**: Merged foundation node is visible; user has edit permissions
- **When**: User clicks "Register ancestor"
- **Then**: Existing edit fowl modal opens with a new foundation-bird prefill (sire/dam blank, breed inferred from parent if possible); closing without save leaves no new record.
- **Pass Condition**: Assert `ui.editingFowl` is set with expected prefill; `fowl.fowls` length unchanged after modal open+close.
- **Evidence**: Vitest test.

### AC-8: Print stylesheet removes chrome and lays out 4 generations
- **Type**: `rule`
- **Given**: Pedigree / Ancestors tab open with 4-generation tree
- **When**: `window.print()` is triggered (or @media print CSS evaluated)
- **Then**: No sticky header/tabs/navigation; white background; subject header block + 4-generation tree fits a single Letter/A4 page width.
- **Pass Condition**: CSS audit: `@media print` rules exist for `.no-print` / `body.print`; page dimensions set. Vitest can check CSS class presence.
- **Evidence**: Code review + manual print preview screenshot.

### AC-9: Accessibility (a11y) and theme support
- **Type**: `rubric`
- **Dimension**: Accessibility and theme completeness
- **Scale**: 0-4
- **Anchors**:
  - 0 = Missing focus styles, no ARIA, broken dark mode.
  - 1 = Nodes clickable but not focusable; dark mode has at least 1 unreadable contrast pair.
  - 2 = Nodes keyboard-focusable with Enter to re-center; basic aria-labels on interactive elements; light+dark mostly readable. Mobile tree scrolls but no Fit button.
  - 3 = (Pass threshold) All nodes focusable, Enter/Space work, `aria-label` per node with role + relation, screen-reader nested `<ul>` hidden visually; light/dark contrast ≥ AA for node text; mobile tree card has horizontal scroll + Fit button; ≤sm vertical outline fallback.
  - 4 = Level 3 plus `aria-live` announcement on re-center, `role="tree"` semantics, Print stylesheet passes a11y too (links underlined, alt text on avatars).
- **Pass Threshold**: >= 3
- **Evidence**: Axe-core scan via existing `components/ui/a11y.test.tsx` pattern; manual keyboard walkthrough; dark-mode screenshot.

### AC-10: Overall UI clarity (no confusing duplicate labels)
- **Type**: `rubric`
- **Dimension**: Node label clarity and information hierarchy
- **Scale**: 0-4
- **Anchors**:
  - 0 = Subject still shows both "Sweater 50%" and "50% Hatch · 50% Sweater"; nodes lack identifiers/photos.
  - 2 = One summary label shown per node; photos and identifiers present but percentages can still be ambiguous (e.g. "50%" without context).
  - 3 = (Pass threshold) Subject node shows one cross label only ("50% Hatch · 50% Sweater"); ancestor nodes show their contribution share in context ("→ 25% to subject" or "100% Sweater · pure") ; photo + identifier badge + status are all present and readable; node info groups by visual weight.
  - 4 = Level 3 plus tooltip on hover clarifies the contribution path, and a legend explains G0..G3.
- **Pass Threshold**: >= 3
- **Evidence**: Rendered snapshot + heuristic checks in test (no duplicate percentage spans).

## Open Questions
- [ ] Optional FR-14 shared-ancestor indicator: does the current seed data actually contain any line-bred chicken that appears on both sides? If not, we can implement the detector but leave the UI surface hidden until real data triggers it, and report to the user.
- [ ] "Register ancestor" permission gate — confirm that the existing `useAuth().isAdmin` OR farm-owner-of-this-bird check is the correct one, or defer to the same gate used by the current Edit chicken action.
