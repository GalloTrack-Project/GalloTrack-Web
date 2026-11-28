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
  });

  it('is safe to re-run and hardens anon access plus updated_at', () => {
    expect(migration).toContain('DROP POLICY IF EXISTS');
    expect(migration).toContain('REVOKE ALL ON public.notification_state FROM anon;');
    expect(migration).toContain('REVOKE ALL ON public.notification_preferences FROM anon;');
    expect(migration).toContain(
      'CREATE OR REPLACE FUNCTION public.set_notification_preferences_updated_at()',
    );
    expect(migration).toContain(
      'DROP TRIGGER IF EXISTS notification_preferences_set_updated_at ON public.notification_preferences;',
    );
    expect(migration).toMatch(
      /CREATE TRIGGER notification_preferences_set_updated_at\s+BEFORE INSERT OR UPDATE ON public\.notification_preferences/,
    );
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
