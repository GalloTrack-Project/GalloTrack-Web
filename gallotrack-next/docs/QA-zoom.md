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
