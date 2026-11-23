# Dashboard KPI & Bloodline Report Zoom QA

Use this checklist when validating the authenticated Dashboard and the Individual Chicken
Analytics & Match Logs modal in a real browser. The automated layout fixture is
`scripts/dashboard-kpi-layout-check.ts`; run it after `npm run build` with `npm run test:layout`.

## Matrix

- Widths: 320, 375, 640, 768, 1024, 1280, 1920 px
- Browser zoom: 25%, 50%, 75%, 100%, 125%, 150%, 200%, 300%, 400%, 500%
- Themes: light, dark
- Languages: English, Tagalog, Hiligaynon

## Checks

- [ ] Chicken Registry card: Active chickens, three stat boxes, and By sex row stay inside the card.
- [ ] Total Matches Logged: label, count, trend chip, and Logged badge stay inside the card.
- [ ] Overall Win Rate: label, W-L badge, percentage, formula, and footer stay inside the card.
- [ ] Quick Actions card text wraps instead of overflowing.
- [ ] Upcoming Milestones: bird name, code, stage/age, and status stay inside each row.
- [ ] Bloodline Overview: strain name, chicken count, male/female counts stay inside each row.
- [ ] Bloodline Win Ratios legend: strain label, share, and win rate stay inside the card.
- [ ] Breeding Pair table headers remain readable; intentional horizontal scrolling stays inside the card.
- [ ] Chicken Inventory summary boxes and FowlCard stats stay inside their cards.
- [ ] No horizontal page scrollbar appears at any width or zoom.
- [ ] Labels can wrap to two lines; any truncated label has a `title` tooltip.
- [ ] Numbers and calculations are unchanged.

## Breeding Hub Chicken Identity

Run `npm run test:hub-layout` after `npm run build`. It checks the identity cards at 320, 375,
640, 768, 1024, 1280, and 1920 px with device scale factors 1, 1.5, and 2 in English, Tagalog,
Hiligaynon, light and dark. Then verify the manual zoom matrix:

- [ ] At 25%, 50%, 75%, 100%, 125%, 150%, 200%, 300%, 400%, and 500% zoom, the code tile stays inside the card.
- [ ] `OFFSPRING` never sticks out of the tile; the tile grows to fit its code and label.
- [ ] In narrow cards the tile shows only the code, and the role caption appears under the chicken name.
- [ ] In wide cards the tile label is visible and the role caption is hidden.
- [ ] The legend wraps to multiple rows instead of squeezing or overflowing.
- [ ] Long chicken names use `/` for strain and sex (`Lemon / Hen`, `Hatch / Cock`) and wrap inside the card.
- [ ] Hens show no record, win rate, `No fights`, or fight action; cocks keep their record or `No fights`.
- [ ] Wing band is shown for cocks only.
- [ ] Parents come first, then offspring groups by pair code, then custom-coded birds; pair headings are readable.
- [ ] No horizontal page scrollbar or clipped text at any checked width or zoom.

## Bloodline Report Modal

Open **Individual Chicken Analytics & Match Logs** from the Historical Analytics Match Logs page
for a foundation-stock chicken, then expand **Details**.

- [ ] At 320 px and 375 px the Bloodline Report summary shows two columns; at 640 px and wider it shows three.
- [ ] Parentage occupies its own full-width row and shows `Unknown` with `Foundation stock, no recorded parents`.
- [ ] TYPE shows `Foundation` (not `FOUNDATION`), and lowercase strains such as `hatch` display as `Hatch`.
- [ ] Only one `Assumed, not verified` notice appears, with an icon and a 44px-high `Edit composition` button below the message.
- [ ] Details content (Sire/Dam Strain, Color Genetics, Breed Compliance, Heritability) wraps at every width.
- [ ] The modal itself has no horizontal scrollbar and no text escapes the dialog.
- [ ] Repeat in light/dark and English/Tagalog; stored bloodline values and calculations are unchanged.

## Heritage Dashboard Shell

Check the dashboard at 320, 375, 640, 768, 1024, 1280, and 1920 px, then at every manual zoom level
from 25% to 500%, in English, Tagalog, and Hiligaynon.

- [ ] The red sidebar becomes a drawer on mobile; menu, focus trap, Escape close, and 44 px targets work.
- [ ] Header title, accent bar, date/report actions, search, bell, and avatar menu stay inside the header.
- [ ] Global search still opens with Ctrl/Cmd+K; language switcher, theme toggle, settings, and logout are reachable from the avatar menu.
- [ ] Hero counts are the live registry and bloodline counts; the banner hides and restores from its control.
- [ ] KPI cards, milestone rows, bloodline cards, donut legend, and recent match rows wrap without clipping.
- [ ] No horizontal page scrollbar appears at any width, zoom, theme, or language.

## Footer Band and Form Action Bars

Check the Register Chicken form (/profiling?tab=form) and the Edit Chicken modal at 320, 375,
640, 768, 1024, and 1280 px with browser zoom from 100% to 200%, in English, Tagalog, and
Hiligaynon, light and dark.

- [ ] Every dashboard route renders exactly one footer band (data-testid="footer-band"); the Register route renders no page-level wavy band.
- [ ] The footer band is in normal flow, hidden below 768 px or under 700 px height, and is never fixed or sticky.
- [ ] The footer band is fully visible above the fixed form action bar when the page is scrolled to the bottom; neither Cancel nor Register is covered.
- [ ] elementFromPoint at the centre of Register and Cancel returns the button (or a child of it), never the footer band, a panel, or another overlay.
- [ ] The action bar has a solid background, top border, soft shadow, safe-area padding, and the Register/Cancel buttons are inside the viewport.
- [ ] The action bar is above page content and below dropdowns, modals, and toasts.
- [ ] Cancel shows the short label "Cancel" with "Cancel registration" as its accessible name; labels do not break into awkward lines.
- [ ] Register is enabled when idle and disabled only while registering, processing a photo, or uploading a photo.
- [ ] Clicking Register with missing fields shows the top summary ("Cannot register yet: N required fields"), focuses the first missing field, keeps typed values, and shows inline field messages.
- [ ] The existing Required field checklist remains visible and its links still focus the matching fields.
- [ ] Edit Chicken keeps its action buttons inside a sticky modal footer; no page-level footer band appears inside the modal.
## Full Siblings & Families Cards

Verify the family card at 320, 375, 640, 768, 1024, 1280, and 1920 px and at 100% to 200%
zoom. Then verify the manual matrix down to 25% and up to 500%.

- [ ] Cock rows keep the ID, NAME, RECORD, WIN RATE, and SAMPLE columns with a 44 px rounded-square avatar.
- [ ] Hen chips show a 32 px round avatar before the code and name.
- [ ] Header Sire/Dam chips show a 28 px round avatar before the name and keep the variety text.
- [ ] At narrow container widths the header chip hides its avatar before the name wraps.
- [ ] Names wrap with `overflow-wrap: anywhere`; badges wrap; no fixed heights or `nowrap` clip text.
- [ ] Light/dark and English/Tagalog/Hiligaynon labels stay inside the card.
- [ ] No horizontal page scrollbar and no clipped text at any checked width or zoom.

## Heritage Landing Page

Check the public landing page at 320, 375, 640, 768, 1024, 1280, and 1920 px, then at manual zoom
levels from 25% to 500%, in English, Tagalog, and Hiligaynon, light and dark.

- [ ] Header links, logo, language switcher, theme toggle, Log in, and Sign up stay inside the bar at every width.
- [ ] The mobile menu opens as a drawer, traps Tab focus, closes with Escape, and returns focus to the menu button.
- [ ] Hero headline, badge, subtitle, buttons, and reassurance lines wrap without clipping.
- [ ] The farm photo keeps its 4/3 frame, the caption comes from `HERO_IMAGES`, and image-error fallback shows the brand mark.
- [ ] With two images, arrows, dots, and pause work; autoplay stops on hover/focus and is off under reduced motion.
- [ ] Decorative swooshes, feather watermarks, and the farm silhouette stay behind text and are hidden on small screens.
- [ ] The five feature cards stack without horizontal scroll and link to the matching capability anchors below.
- [ ] Core capabilities, workflow, about, CTA, and footer text stays inside cards in all three languages.
- [ ] Login and Sign-up keep the same header and preserve their forms, validation, and auth routes.
- [ ] No horizontal page scrollbar appears at any checked width, zoom, theme, or language.
