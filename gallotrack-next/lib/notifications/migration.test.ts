import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  join(
    process.cwd(),
    '..',
    'supabase',
    'migrations',
    '20261114000000_notification_state_preferences.sql',
  ),
  'utf8',
);

describe('derived notification migration contract', () => {
  it('is additive and creates both per-user tables', () => {
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.notification_state');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.notification_preferences');
    expect(migration).toContain('PRIMARY KEY (user_id, key)');
    expect(migration).toContain("settings   JSONB NOT NULL DEFAULT '{}'::jsonb");
    expect(migration).not.toMatch(/ALTER TABLE public\.fowl/i);
    expect(migration).not.toContain('CREATE TRIGGER');
  });

  it('enables owner-only RLS for select, insert, update and delete', () => {
    expect(migration).toContain('ALTER TABLE public.notification_state ENABLE ROW LEVEL SECURITY');
    expect(migration).toContain(
      'ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY',
    );
    for (const table of ['notification_state', 'notification_preferences']) {
      expect(migration).toContain(`CREATE POLICY "${table}_owner_select"`);
      expect(migration).toContain(`CREATE POLICY "${table}_owner_insert"`);
      expect(migration).toContain(`CREATE POLICY "${table}_owner_update"`);
      expect(migration).toContain(`CREATE POLICY "${table}_owner_delete"`);
    }
  });
});
