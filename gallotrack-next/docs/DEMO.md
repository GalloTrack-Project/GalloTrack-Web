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

# Create the demo rows; --confirm-email must exactly match DEMO_EMAIL
npm run seed:demo -- --date=2026-11-16 --apply --confirm-email=demo-owner@example.com

# Dry-run cleanup: prints only the DEMO DATA rows that would be deleted
npm run seed:demo -- --date=2026-11-16 --clean

# Delete only rows created by this script
npm run seed:demo -- --date=2026-11-16 --apply --confirm-email=demo-owner@example.com --clean
```

`--apply` is refused unless `--confirm-email` exactly matches `DEMO_EMAIL`; the script also prints
the target account and Supabase project host before writing. `DEMO_EMAIL` and `DEMO_PASSWORD` are
required even for a dry run.

`--date` is the defense/demo date D. Milestone birthdates are calculated backwards from D so the
demo notifications are relevant on D:

- one cock reaches Stag in 3 days
- one hen reaches Pullet on D
- one cock reaches Bull Stag in 1 day
- one cock becomes fully mature in 7 days
- one hen reached Hen 5 days before D

The script also adds one win and one draw linked to `Demo Mature Cock` by `fowl_id`, so the cock shows
a win rate. Hens receive no matches and no wing bands; cocks get unique free-form `DEMO-WB-*` wing
bands. Bird identifiers use the real foundation scheme (cocks `1`, `2`, `3`; hens `A`, `B`) so they
remain valid when role-based identifier validation is enforced.

Milestone notifications are derived in the browser from these birthdates. There is no notification
cron or daily job. With the default notification lead days (`7` and `0`), the demo produces:

- `Demo Pullet Today`: today alert
- `Demo Mature Cock`: 7-day upcoming alert
- `Demo Reached Hen`: recently-reached alert

`Demo Stag Soon` (3 days) needs the 3-day lead, and `Demo Bull Stag Tomorrow` (1 day) needs the 1-day
lead. Enable those lead times in Milestone notifications to see all five.

## Safety and cleanup

- Without `--apply` the script is read-only.
- `DEMO_EMAIL` and `DEMO_PASSWORD` are required; the script never reads `SUPABASE_SERVICE_ROLE_KEY`.
- `--apply` requires `--confirm-email` equal to `DEMO_EMAIL`, and the target account/project is printed
  before any write.
- The script refuses to continue if the authenticated user's email does not match `DEMO_EMAIL`.
- Existing demo chickens are skipped only when both the `Demo ` name and `DEMO DATA` Notes marker
  match.
- Existing demo matches are skipped by the same marker, linked demo chicken, opponent, and date.
- `--clean` deletes only rows carrying `DEMO DATA` that were created by this script; it does not
  delete normal registry rows.
- `--clean` exits after cleanup. Run the seed again if you want to recreate the demo rows.
- No database migration is applied by this script.
