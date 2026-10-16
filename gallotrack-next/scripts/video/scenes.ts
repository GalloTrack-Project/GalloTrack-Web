/**
 * scenes.ts — declarative shot list for the GalloTrack video presentation.
 * One entry per script scene (docs/VIDEO_RECORDING_PLAN.md §6). The driver
 * (scripts/record-video.ts) executes steps in order and writes a beat
 * timestamp per step into recordings/manifest.json for CapCut narration sync.
 *
 * Targets: { css } → page.locator(css)  |  { role, name } → getByRole (name may
 * be a RegExp)  |  { text } → getByText (string or RegExp). Locators are
 * always narrowed with .first().
 *
 * Pacing (approved): natural speed, 3–4 s holds after each action so the live
 * narration can be recorded over the clips in CapCut later.
 *
 * Camera rule (v2, per client feedback): the camera NEVER moves for decoration.
 * A crop (zoom) opens only when an ACTION needs it — typing into a form/search,
 * the export menu — and snaps back to full view ('reset') the moment the action
 * group ends. Everything else (tabs, cards, nav, tables) plays at full view with
 * the virtual cursor pointing at the target; clicks get the green pulse ring.
 */

export type Target = { css: string } | { role: AriaRole; name: string | RegExp } | { text: string | RegExp };

// Narrow alias so role targets stay type-safe without importing playwright types.
type AriaRole = 'link' | 'button' | 'tab' | 'searchbox' | 'textbox' | 'combobox' | 'heading' | 'menuitem' | 'table';

export type Step =
  /** Full page load (first step of every scene). */
  | { type: 'goto'; path: string; label?: string }
  /** SPA navigation via the sidebar link (pulse + cursor + click). */
  | { type: 'nav'; name: string | RegExp; label?: string }
  | { type: 'click'; target: Target; label?: string; pulse?: boolean }
  /** Click an ARIA tab (Registry, Lineage) — Breeding Hub tabs are plain buttons. */
  | { type: 'tab'; name: string | RegExp; label?: string }
  /** Click the plain button used as a tab by BreedingHub. */
  | { type: 'htab'; name: string | RegExp; label?: string }
  /** Focus a field (click) then type character-by-character. */
  | { type: 'type'; target: Target; text: string; delay?: number; click?: boolean; label?: string }
  | { type: 'key'; key: string; label?: string }
  /** Raw viewport-coordinate click (e.g. close a menu by clicking its backdrop). */
  | { type: 'clickAt'; x: number; y: number; label?: string }
  | { type: 'hover'; target: Target; label?: string }
  /** Eased camera zoom onto a target; target optional (keeps viewport center). */
  | { type: 'zoom'; target?: Target; level: number; noAnchor?: boolean; label?: string }
  /** Eased return to 1.0x. */
  | { type: 'reset'; dur?: number; label?: string }
  /** Smooth scroll: by = relative px (negative = up), target = element ride. */
  | { type: 'scroll'; target?: Target; by?: number; frac?: number; dur?: number; label?: string }
  | { type: 'hold'; ms: number; label?: string }
  | { type: 'waitUrl'; re: string; label?: string }
  /** Native <select> fuzzy-set: value first, else first option matching regex. */
  | { type: 'select'; target: Target; value?: string; match?: string; label?: string };

export type Scene = {
  id: string; // 'S1'..'S13'
  slug: string; // output filename: scene-01-intro
  title: string; // human title for the manifest
  anonymous?: boolean; // record without auth (Scene 1 shows the login page)
  steps: Step[];
};

const E = 'client@gmail.com';

export const SCENES: Scene[] = [
  {
    id: 'S1',
    slug: 'scene-01-intro',
    title: 'Introduction — login page',
    anonymous: true,
    steps: [
      { type: 'goto', path: '/', label: 'load login page' },
      { type: 'hold', ms: 1800, label: 'hold on login page' },
      { type: 'zoom', target: { css: 'form' }, level: 1.3, label: 'crop to login form (action scope)' },
      { type: 'hold', ms: 1500 },
      { type: 'type', target: { css: '#email-address' }, text: E, label: 'type email' },
      { type: 'type', target: { css: '#password' }, text: 'password123', label: 'type password' },
      { type: 'click', target: { css: 'button[type=submit]' }, label: 'click Sign in' },
      { type: 'waitUrl', re: '/dashboard', label: 'land on dashboard' },
      { type: 'reset', label: 'back to full view after login' },
      { type: 'hold', ms: 4000, label: 'hold on dashboard overview' },
    ],
  },
  {
    id: 'S2',
    slug: 'scene-02-dashboard',
    title: 'Dashboard — summary cards',
    steps: [
      { type: 'goto', path: '/dashboard', label: 'load dashboard' },
      { type: 'hold', ms: 1500, label: 'settle' },
      { type: 'hover', target: { text: /Chicken Registry/i }, label: 'point: Chicken Registry card' },
      { type: 'hold', ms: 3600 },
      { type: 'hover', target: { css: '[title*="Breeding Males"]' }, label: 'point: role breakdown (males/females/prospects)' },
      { type: 'hold', ms: 3400 },
      { type: 'hover', target: { text: /Total Matches Logged/i }, label: 'point: Total Matches Logged' },
      { type: 'hold', ms: 3500 },
      { type: 'hover', target: { text: /Overall Win Rate/i }, label: 'point: Overall Win Rate' },
      { type: 'hold', ms: 3800 },
      { type: 'hover', target: { text: 'Quick Actions' }, label: 'point: Quick Actions' },
      { type: 'hold', ms: 2400 },
      { type: 'hover', target: { text: '+ Register New Chicken' }, label: 'hover Register New Chicken' },
      { type: 'hold', ms: 2200 },
      { type: 'hover', target: { text: '+ Log Match Result' }, label: 'hover Log Match Result' },
      { type: 'hold', ms: 3500, label: 'wide hold' },
    ],
  },
  {
    id: 'S3',
    slug: 'scene-03-registry',
    title: 'Chicken Registry — tabs + search',
    steps: [
      { type: 'goto', path: '/profiling?tab=males', label: 'load Chicken Registry (Breeding Male tab)' },
      { type: 'hold', ms: 1500, label: 'settle' },
      { type: 'click', target: { role: 'tab', name: /Breeding Male/i }, label: 'tab: Breeding Male' },
      { type: 'hold', ms: 3500 },
      { type: 'click', target: { role: 'tab', name: /Breeding Female/i }, label: 'tab: Breeding Female' },
      { type: 'hold', ms: 3500 },
      { type: 'click', target: { role: 'tab', name: /Offspring/i }, label: 'tab: Offspring' },
      { type: 'hold', ms: 3500 },
      { type: 'click', target: { role: 'tab', name: /Match Logs/i }, label: 'tab: Match Logs' },
      { type: 'hold', ms: 3500 },
      { type: 'click', target: { role: 'tab', name: /Offspring/i }, label: 'tab: Offspring' },
      { type: 'hold', ms: 2000 },
      { type: 'click', target: { role: 'tab', name: /Breeding Stock/i }, label: 'pill: Breeding Stock' },
      { type: 'hold', ms: 3500 },
      { type: 'zoom', target: { css: 'input[type=search]' }, level: 1.35, label: 'crop to search (action scope)' },
      { type: 'type', target: { css: 'input[type=search]' }, text: 'WB-', label: 'type search query' },
      { type: 'hold', ms: 3000, label: 'show filtered results' },
      { type: 'key', key: 'Control+a', label: 'select query' },
      { type: 'key', key: 'Backspace', label: 'clear search' },
      { type: 'hold', ms: 1800 },
      { type: 'reset' },
      { type: 'hold', ms: 3000, label: 'wide hold' },
    ],
  },
  {
    id: 'S4',
    slug: 'scene-04-register',
    title: 'Registering a chicken — form (type only, never submit)',
    steps: [
      { type: 'goto', path: '/profiling', label: 'load Chicken Registry' },
      { type: 'hold', ms: 1400 },
      { type: 'click', target: { text: 'View Registry' }, label: 'switch to registry list view' },
      { type: 'hold', ms: 1400, label: 'show the list view' },
      { type: 'click', target: { text: '+ Register Chicken' }, label: 'click + Register Chicken' },
      { type: 'hold', ms: 1600, label: 'registration form opens' },
      { type: 'zoom', target: { css: '#identifier-name' }, level: 1.3, label: 'crop to identity section (action scope)' },
      { type: 'type', target: { css: '#identifier-name' }, text: 'Roundhead Storm', delay: 70, label: 'type name' },
      { type: 'hold', ms: 1600 },
      { type: 'click', target: { text: 'Edit identifier manually' }, label: 'switch to manual identifier' },
      { type: 'hold', ms: 1200 },
      { type: 'type', target: { css: '#chicken-code' }, text: '777', delay: 90, label: 'type manual code' },
      { type: 'hold', ms: 1600, label: 'show validation' },
      { type: 'click', target: { text: 'Use Auto-Generated Code' }, label: 'revert to auto code' },
      { type: 'hold', ms: 1400 },
      { type: 'type', target: { css: '#wing-band-id' }, text: 'W-001', delay: 80, label: 'type wing band' },
      { type: 'hold', ms: 1600 },
      { type: 'reset' },
      { type: 'zoom', target: { css: '#genetic-strain' }, level: 1.3, label: 'crop to strain + gender (action scope)' },
      { type: 'type', target: { css: '#genetic-strain' }, text: 'Sweater', delay: 75, label: 'type strain' },
      { type: 'key', key: 'Enter', label: 'add strain chip' },
      { type: 'hold', ms: 1800 },
      { type: 'select', target: { css: '#gender-class' }, match: 'hen', label: 'select gender: Hen' },
      { type: 'hold', ms: 1800 },
      { type: 'reset' },
      { type: 'scroll', target: { css: '#encode-sire' }, frac: 0.4, dur: 800, label: 'scroll to parents section' },
      { type: 'hold', ms: 2800, label: 'parents + characteristics' },
      { type: 'hold', ms: 2000, label: 'never submit — leave form' },
    ],
  },
  {
    id: 'S5',
    slug: 'scene-05-inventory',
    title: 'Chicken Inventory — search, filters, cards',
    steps: [
      { type: 'goto', path: '/catalog', label: 'load Chicken Inventory' },
      { type: 'hold', ms: 1600, label: 'settle' },
      { type: 'zoom', target: { css: 'input[placeholder*="wing band"]' }, level: 1.35, label: 'crop to search (action scope)' },
      { type: 'type', target: { css: 'input[placeholder*="wing band"]' }, text: 'WB-', label: 'type search query' },
      { type: 'hold', ms: 2800, label: 'filtered cards' },
      { type: 'key', key: 'Control+a', label: 'select query' },
      { type: 'key', key: 'Backspace', label: 'clear search' },
      { type: 'hold', ms: 1400 },
      { type: 'reset' },
      { type: 'click', target: { role: 'button', name: /All Chickens/i }, label: 'filter: All Chickens' },
      { type: 'hold', ms: 3000 },
      { type: 'click', target: { role: 'button', name: /Active Breeders/i }, label: 'filter: Active Breeders' },
      { type: 'hold', ms: 3000 },
      { type: 'click', target: { role: 'button', name: /Ready to Breed/i }, label: 'filter: Ready to Breed' },
      { type: 'hold', ms: 3000 },
      { type: 'click', target: { role: 'button', name: /^Archived/i }, label: 'filter: Archived' },
      { type: 'hold', ms: 3000 },
      { type: 'click', target: { role: 'button', name: /^Deceased/i }, label: 'filter: Deceased' },
      { type: 'hold', ms: 3000 },
      { type: 'select', target: { css: '#inventory-role' }, match: 'material|breeder|male|fight', label: 'filter by role' },
      { type: 'hold', ms: 2400 },
      { type: 'select', target: { css: '#inventory-sex' }, value: 'female', label: 'filter by sex: female' },
      { type: 'hold', ms: 2400 },
      { type: 'select', target: { css: '#inventory-sort' }, value: 'age', label: 'sort by age' },
      { type: 'hold', ms: 2400 },
      { type: 'scroll', by: 700, dur: 900, label: 'scroll through cards' },
      { type: 'hold', ms: 1600 },
      { type: 'scroll', by: 700, dur: 900, label: 'scroll through cards' },
      { type: 'hold', ms: 1800 },
      { type: 'hold', ms: 3000, label: 'wide hold' },
    ],
  },
  {
    id: 'S6',
    slug: 'scene-06-lineage',
    title: 'Lineage Directory — 5 views',
    steps: [
      { type: 'goto', path: '/lineage', label: 'load Lineage Directory' },
      { type: 'hold', ms: 1600, label: 'settle' },
      { type: 'click', target: { role: 'tab', name: /Family Tree/i }, label: 'tab: Family Tree' },
      { type: 'hold', ms: 3200, label: 'family relationships' },
      { type: 'click', target: { role: 'tab', name: /Full Siblings/i }, label: 'tab: Full Siblings & Families' },
      { type: 'hold', ms: 3500 },
      { type: 'click', target: { role: 'tab', name: /Sire Offspring Tree/i }, label: 'tab: Sire Offspring Tree' },
      { type: 'hold', ms: 3500 },
      { type: 'click', target: { role: 'tab', name: /Dam Offspring Tree/i }, label: 'tab: Dam Offspring Tree' },
      { type: 'hold', ms: 3500 },
      { type: 'click', target: { role: 'tab', name: /Pedigree/i }, label: 'tab: Pedigree / Ancestors' },
      { type: 'hold', ms: 3200 },
      { type: 'scroll', by: 650, dur: 900, label: 'ride through ancestors' },
      { type: 'hold', ms: 2200 },
      { type: 'scroll', by: 650, dur: 900, label: 'ride through ancestors' },
      { type: 'hold', ms: 2200 },
      { type: 'hold', ms: 3000, label: 'wide hold' },
    ],
  },
  {
    id: 'S7',
    slug: 'scene-07-breeding-hub',
    title: 'Breeding & Lineage Hub — coding system',
    steps: [
      { type: 'goto', path: '/breeding', label: 'load Breeding Hub' },
      { type: 'hold', ms: 1600, label: 'settle' },
      { type: 'hover', target: { text: /Breeding Males/i }, label: 'point: Breeding Males card' },
      { type: 'hold', ms: 2600 },
      { type: 'hover', target: { text: /Breeding Females/i }, label: 'point: Breeding Females card' },
      { type: 'hold', ms: 2600 },
      { type: 'hover', target: { text: /Active Pairs/i }, label: 'point: Active Pairs card' },
      { type: 'hold', ms: 2600 },
      { type: 'htab', name: /Coding System/i, label: 'tab: Coding System' },
      { type: 'hold', ms: 2000 },
      { type: 'hover', target: { text: '1A₁' }, label: 'point: coding examples (1A₁ · 2B₂)' },
      { type: 'hold', ms: 4000, label: 'narration explains sire numbers / dam letters' },
      { type: 'hold', ms: 3000, label: 'wide hold' },
    ],
  },
  {
    id: 'S8',
    slug: 'scene-08-pairs-identity',
    title: 'Breeding Pairs & Chicken Identity',
    steps: [
      { type: 'goto', path: '/breeding', label: 'load Breeding Hub' },
      { type: 'hold', ms: 1400 },
      { type: 'htab', name: /Breeding Pairs/i, label: 'tab: Breeding Pairs' },
      { type: 'hold', ms: 2000 },
      { type: 'scroll', by: 300, dur: 800, label: 'pan pair records' },
      { type: 'hold', ms: 3000 },
      { type: 'htab', name: /Chicken Identity/i, label: 'tab: Chicken Identity' },
      { type: 'hold', ms: 3500 },
      { type: 'hold', ms: 2500, label: 'wide hold' },
    ],
  },
  {
    id: 'S9',
    slug: 'scene-09-safety',
    title: 'Safety Incidents',
    steps: [
      { type: 'goto', path: '/breeding', label: 'load Breeding Hub' },
      { type: 'hold', ms: 1400 },
      { type: 'htab', name: /Safety Incidents/i, label: 'tab: Safety Incidents' },
      { type: 'hold', ms: 1800 },
      { type: 'hold', ms: 3500, label: 'incidents list' },
      { type: 'scroll', by: 400, dur: 800, label: 'pan incidents' },
      { type: 'hold', ms: 2200 },
      { type: 'hold', ms: 2500, label: 'wide hold' },
    ],
  },
  {
    id: 'S10',
    slug: 'scene-10-match-stats',
    title: 'Match records & performance analytics',
    steps: [
      { type: 'goto', path: '/dashboard', label: 'back to dashboard' },
      { type: 'hold', ms: 1500, label: 'settle' },
      { type: 'hover', target: { text: /Total Matches Logged/i }, label: 'point: Total Matches Logged' },
      { type: 'hold', ms: 3800 },
      { type: 'hover', target: { text: /Overall Win Rate/i }, label: 'point: Overall Win Rate' },
      { type: 'hold', ms: 3800, label: 'wins/losses, draws excluded' },
      { type: 'nav', name: 'Chicken Registry', label: 'sidebar → Chicken Registry' },
      { type: 'hold', ms: 1600 },
      { type: 'click', target: { role: 'tab', name: /Match Logs/i }, label: 'tab: Match Logs' },
      { type: 'hold', ms: 1600 },
      { type: 'hover', target: { css: 'table' }, label: 'point: match history table' },
      { type: 'hold', ms: 3500 },
      { type: 'hold', ms: 3000, label: 'wide hold' },
    ],
  },
  {
    id: 'S11',
    slug: 'scene-11-reports',
    title: 'Reports & data export',
    steps: [
      { type: 'goto', path: '/dashboard', label: 'load dashboard' },
      { type: 'hold', ms: 1500 },
      { type: 'click', target: { role: 'button', name: 'Export reports and data' }, label: 'open Export & Reports' },
      { type: 'hold', ms: 1400, label: 'menu opens' },
      { type: 'zoom', target: { text: 'Data Exports' }, level: 1.35, label: 'crop to export menu (action scope)' },
      { type: 'hold', ms: 1800 },
      { type: 'hover', target: { text: 'Export matches (CSV)' }, label: 'hover: Export matches (CSV)' },
      { type: 'hold', ms: 2400 },
      { type: 'hover', target: { text: 'Export registry (CSV)' }, label: 'hover: Export registry (CSV)' },
      { type: 'hold', ms: 2400 },
      { type: 'hover', target: { text: 'Print report' }, label: 'hover: Print report' },
      { type: 'hold', ms: 2600, label: 'PDF/CSV mention — do NOT trigger downloads' },
      { type: 'clickAt', x: 1850, y: 1000, label: 'click backdrop to close menu' },
      { type: 'hold', ms: 1200, label: 'menu closed' },
      { type: 'reset' },
      { type: 'hold', ms: 3000, label: 'wide hold' },
    ],
  },
  {
    id: 'S12',
    slug: 'scene-12-integration',
    title: 'Connected modules tour',
    steps: [
      { type: 'goto', path: '/dashboard', label: 'dashboard' },
      { type: 'hold', ms: 2600 },
      { type: 'nav', name: 'Chicken Registry', label: 'sidebar → Chicken Registry' },
      { type: 'hold', ms: 2600 },
      { type: 'nav', name: 'Chicken Inventory', label: 'sidebar → Chicken Inventory' },
      { type: 'hold', ms: 2600 },
      { type: 'nav', name: 'Lineage Directory', label: 'sidebar → Lineage Directory' },
      { type: 'hold', ms: 2600 },
      { type: 'nav', name: 'Breeding Hub', label: 'sidebar → Breeding Hub' },
      { type: 'hold', ms: 2600 },
      { type: 'hold', ms: 1500, label: 'end tour' },
    ],
  },
  {
    id: 'S13',
    slug: 'scene-13-conclusion',
    title: 'Conclusion — GalloTrack brand',
    steps: [
      { type: 'goto', path: '/dashboard', label: 'final dashboard' },
      { type: 'hold', ms: 1400 },
      { type: 'hover', target: { text: 'GALLOTRACK' }, label: 'point: GalloTrack logo (sidebar)' },
      { type: 'hold', ms: 4200, label: 'closing narration' },
      { type: 'hold', ms: 5000, label: 'final wide hold' },
    ],
  },
];

export function findScenes(ids?: string[]): Scene[] {
  if (!ids || ids.length === 0) return SCENES;
  const wanted = ids.map((s) => s.trim().toUpperCase().replace(/^SCENE-?/, '').replace(/^S?(\d+)$/, 'S$1'));
  const picked = SCENES.filter((s) => wanted.includes(s.id));
  const missing = wanted.filter((w) => !SCENES.some((s) => s.id === w));
  if (missing.length) throw new Error(`Unknown scene id(s): ${missing.join(', ')} (valid: ${SCENES.map((s) => s.id).join(', ')})`);
  return picked;
}
