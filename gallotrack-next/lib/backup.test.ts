import { describe, it, expect } from 'vitest';
import { parseBackup } from './backup';

const backup = (data: unknown) => JSON.stringify({ export_date: '2026-10-06', system_name: 'GalloTrack', data });

describe('parseBackup', () => {
  it('accepts a full backup and reports its counts', () => {
    const parsed = parseBackup(
      backup({ fowls: [{ id: 1, name: 'King' }, { id: 2, name: 'Lady' }], match_history: [{ id: 9 }] }),
    );

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.fowls).toBe(2);
    expect(parsed.matches).toBe(1);
    expect(parsed.profiles).toBe(0);
  });

  it('accepts a backup that only carries one of the two lists', () => {
    expect(parseBackup(backup({ fowls: [] })).ok).toBe(true);
    expect(parseBackup(backup({ match_history: [] })).ok).toBe(true);
  });

  it('rejects text that is not JSON', () => {
    const parsed = parseBackup('{not json');

    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.error).toMatch(/valid JSON/i);
  });

  it('accepts the owner-export shape, where the lists sit at the top level', () => {
    const parsed = parseBackup(
      JSON.stringify({ exported_at: '2026-10-06', farm: 'GalloTrack', fowls: [{ name: 'King' }], matches: [] }),
    );

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.fowls).toBe(1);
    expect(parsed.matches).toBe(0);
    // Normalized so restore only ever has to read `data`.
    expect(parsed.backup.data?.fowls).toHaveLength(1);
    expect(parsed.backup.data?.match_history).toHaveLength(0);
  });

  it('rejects JSON that is not an object', () => {
    expect(parseBackup('[1,2,3]').ok).toBe(false);
    expect(parseBackup('"a string"').ok).toBe(false);
  });

  it('rejects a file that carries no records at all', () => {
    const parsed = parseBackup(JSON.stringify({ export_date: '2026-10-06', farm: 'GalloTrack' }));

    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.error).toMatch(/neither chicken nor match/i);
  });

  it('rejects a backup with neither chickens nor matches', () => {
    const parsed = parseBackup(backup({ profiles: [] }));

    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.error).toMatch(/neither chicken nor match/i);
  });

  it('rejects malformed lists', () => {
    expect(parseBackup(backup({ fowls: 'nope' })).ok).toBe(false);
    expect(parseBackup(backup({ fowls: [1, 2, 3] })).ok).toBe(false);
    expect(parseBackup(backup({ match_history: [{ id: 1 }], profiles: 'nope' })).ok).toBe(false);
  });
});
