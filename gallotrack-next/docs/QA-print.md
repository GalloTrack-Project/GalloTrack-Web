# Profile Report Print QA

Open a chicken profile, then choose **Print / Export Profile Report**. Print to PDF in
Chrome or Edge and to a physical printer if available.

## Paper and layout

- [ ] A4 portrait uses about 12 mm margins and the report fits on one sheet when the content is short.
- [ ] Letter portrait still prints without clipping or a horizontal scrollbar.
- [ ] Section headers, borders, and the photo frame keep their colors (`print-color-adjust: exact`).
- [ ] Tables and sections do not split awkwardly across pages (`break-inside: avoid`).
- [ ] No on-screen buttons, tabs, or modal controls appear in the printed output.
- [ ] The footer shows the GalloTrack URL and a page number.

## Header and photo

- [ ] The GalloTrack logo and report title are at the top-left.
- [ ] The chicken photo sits beside the title in a 45 x 55 mm framed box using `object-fit: contain`.
- [ ] The caption reads `Bird code - Name`.
- [ ] The full-size photo is used, never the 256 px thumbnail.
- [ ] A fresh signed URL is requested when Print is clicked; an old cached URL is not reused.
- [ ] With no photo, the box shows the initials and `No photo`, never a broken-image icon.
- [ ] If the photo fails or takes longer than about 5 seconds, printing still opens and the toast says the photo could not be loaded.
- [ ] Up to three gallery photos are included only when they load; a failed gallery image is skipped.

## Content

- [ ] The header and Gender field say `Cock` or `Hen`, never `Rooster` or a raw stored value.
- [ ] A hen report has no Performance Metrics, win rate, or Match History.
- [ ] A hen report shows Breeding, offspring count, and pairing history only when those records exist.
- [ ] A cock report has Performance Metrics, `Overall win rate (all time)` from the shared record helper, and Match History.
- [ ] A cock with no fights shows `No fights recorded` and `—%`, not a table of empty zeros.
- [ ] Sire and Dam appear only as parent roles in parent rows.
- [ ] Existing report fields and values are otherwise unchanged.
