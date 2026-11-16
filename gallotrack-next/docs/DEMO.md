# Demo Data Seed

`npm run seed:demo` creates a small, clearly marked set of chickens and matches for demoing
milestone notifications and a non-zero win rate.

> **Warning:** run this on the demo account only. It signs in as `DEMO_EMAIL` with the anon key
> and normal RLS. It never uses the service-role key and never writes to another user's rows.

## Environment

Add these to the environment or `gallotrack-next/.env.local`:

```bash
DEMO_EMAIL=demo-owner@example.com
DEMO_PASSWORD=change-me
DEMO_BREED=Lemon
```

`DEMO_BREED` is optional and defaults to `Lemon`. The breed must already exist in the demo
account's registered Breeds list. If it is missing, the script prints the missing breed and stops.

## Usage

```bash
# Dry run: prints exactly what would be created, writes nothing
npm run seed:demo -- --date=2026-11-16

# Create the demo rows
npm run seed:demo -- --date=2026-11-16 --apply

# Dry-run cleanup: prints only the DEMO DATA rows that would be deleted
npm run seed:demo -- --date=2026-11-16 --clean

# Delete only rows created by this script
npm run seed:demo -- --date=2026-11-16 --apply --clean
```

`--date` is the defense/demo date D. Milestone birthdates are calculated backwards from D so the
demo notifications are relevant on D:

- one cock reaches Stag in 3 days
- one hen reaches Pullet on D
- one cock reaches Bull Stag in 1 day
- one cock becomes fully mature in 7 days
- one hen reached Hen 5 days before D

The script also adds one win and one draw linked to `Demo Mature Cock` by `fowl_id`, so the cock shows
a win rate. Hens receive no matches and no wing bands; cocks get unique demo wing bands.

The 7-day, today, and recently-reached alerts are covered by the default notification settings.
To see the 3-day and 1-day alerts too, enable those lead times in Milestone notifications.

## Safety and cleanup

- Without `--apply` the script is read-only.
- Existing demo chickens are skipped only when both the `Demo ` name and `DEMO DATA` Notes marker
  match.
- Existing demo matches are skipped by the same marker, linked demo chicken, opponent, and date.
- `--clean` deletes only rows carrying `DEMO DATA` that were created by this script; it does not
  delete normal registry rows.
- `--clean` exits after cleanup. Run the seed again if you want to recreate the demo rows.
- No database migration is applied by this script.
