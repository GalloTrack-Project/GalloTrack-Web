# Milestone Notifications

Milestone notifications are derived in the browser from chicken birth dates. There is no
notification cron job and no stored notification list.

## Source of truth

- `lib/helpers.ts` owns `getDevelopmentStages()`, `getMilestoneInfo()`, `getAgeParts()` and
  `autoComputeGrowthStage()`.
- `lib/notifications/milestones.ts` builds derived items with
  `buildMilestoneNotifications(fowls, preferences, today)`.
- Stage thresholds and labels come from `getDevelopmentStages()`; the notification module does
  not keep a second copy of the 6/12/24-month rules.
- The Dashboard card and `/milestones` still read the shared `upcomingMilestones` data from
  `useFowl()` and use the same stage helper.

## States

- `upcoming`: selected lead time before a stage boundary.
- `today`: the stage boundary is today.
- `reached`: the boundary passed within the last 14 days.
- The 24-month boundary is presented as `Fully mature`.

Items use a stable key containing the chicken id, stage, target date and lead type. Dismissed
items are hidden, and a birth-date edit naturally removes stale items because the list is
recomputed from the current registry.

## Persistence

- Migration: `supabase/migrations/20261114000000_notification_state_preferences.sql`
- Tables: `notification_state` and `notification_preferences`.
- Both tables are additive and owner-only through RLS.
- If the tables are unavailable, preferences and read/dismiss state fall back to localStorage
  keys scoped to the user id. The UI shows
  “Notification settings are saved on this device only” and the console logs the fallback.
- Old `user_settings` lead/stage values are read once when no new preference row exists.

## UI

- `NotificationBell` opens the latest 10 items in a dropdown on desktop and a bottom sheet on
  mobile, with Today / This week / Later / Earlier groups.
- `/notifications` is the full list with All / Unread / Upcoming / Reached filters, search and
  pagination.
- Settings → Notifications contains the master switch, stage choices, lead times, audience and
  reset-to-defaults controls.

Do not apply the migration automatically. Print and review the SQL first.
