import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  join(process.cwd(), '..', 'supabase', 'migrations', '20261113000000_milestone_notifications.sql'),
  'utf8',
);

describe('milestone notifications migration contract', () => {
  it('defines the idempotency constraint and owner read/update-only RLS', () => {
    expect(migration).toContain('UNIQUE (user_id, fowl_id, type, stage)');
    expect(migration).toContain('ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY');
    expect(migration).toContain('CREATE POLICY "notifications_owner_select"');
    expect(migration).toContain('CREATE POLICY "notifications_owner_update"');
    expect(migration).not.toContain('CREATE POLICY "notifications_owner_insert"');
    expect(migration).toContain('GRANT UPDATE (read_at)');
    expect(migration).toContain('REVOKE ALL ON public.notifications FROM authenticated');
  });

  it('invalidates unread upcoming notices on birth-date and lifecycle edits', () => {
    expect(migration).toContain('invalidate_unread_milestone_notifications');
    expect(migration).toContain('AFTER UPDATE OF birthdate, status ON public.fowl');
    expect(migration).toContain("type = 'stage_upcoming'");
  });
});
