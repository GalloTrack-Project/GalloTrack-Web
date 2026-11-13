# Milestone Notifications

## Single source of stage/milestone math

- `lib/helpers.ts` owns `getDevelopmentStages()` and `getMilestoneInfo()`.
- `useFowlAnalytics()` maps `activeFowls` through `getMilestoneInfo()` and sorts by
  `next.daysUntil`. That `upcomingMilestones` array is exposed by `FowlContext`.
- The Dashboard "Upcoming Milestones" card and the Milestones page both read that same
  `upcomingMilestones` array. No stage thresholds are redefined in those components.
- The notification job calls `getStageBoundaries()`, which iterates
  `getDevelopmentStages()` and `addMonthsToDate()`; it does not hardcode 6/12/24-month
  thresholds or recalculate age independently.

## Generation

- Scheduled by Vercel Cron: `/api/cron/milestone-notifications`, daily at `01:00 UTC`
  (`vercel.json`). Vercel Cron is used because the project already deploys on Vercel and
  has no existing pg_cron setup.
- Required environment: `CRON_SECRET`. Vercel sends it as
  `Authorization: Bearer <CRON_SECRET>`.
- The route uses `SUPABASE_SERVICE_ROLE_KEY` only on the server.
- Inserts are idempotent through the unique constraint
  `(user_id, fowl_id, type, stage)` plus `upsert(..., ignoreDuplicates: true)`.
- The first run creates upcoming notifications only. Stage-changed and fully-mature
  notices require a stored `milestone_notifications_last_run_at` marker, so old transitions
  are not replayed.
- Archived/deceased chickens are skipped and their unread upcoming rows are removed.
- Birth-date edits trigger deletion of that chicken's unread `stage_upcoming` rows. The next
  daily run recreates any still-valid upcoming notices.

## Migration review

Apply only after review:

`supabase/migrations/20261113000000_milestone_notifications.sql`

After applying it:

```powershell
cd gallotrack-next
npm run verify:notification-rls
```

The script creates two disposable users, verifies own-row visibility, own `read_at`
updates, cross-user blocking, owner insert blocking, and non-`read_at` column blocking.
It removes both users when done.

## Screenshots

`npm run build` then `npm run screenshots:notifications` writes:

- `docs/screenshots/notifications-bell.png`
- `docs/screenshots/notifications-panel-unread.png`
- `docs/screenshots/notifications-panel-empty.png`
- `docs/screenshots/notifications-settings.png`
