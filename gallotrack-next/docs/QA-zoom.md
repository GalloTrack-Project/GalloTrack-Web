# Dashboard KPI Zoom QA

Use this checklist when validating the authenticated Dashboard in a real browser.
The automated layout fixture is `scripts/dashboard-kpi-layout-check.ts`; run it after
`npm run build` with `npm run test:layout`.

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
