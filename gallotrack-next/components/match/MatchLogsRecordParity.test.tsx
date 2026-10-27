import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, cleanup } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/match-logs',
  useSearchParams: () => new URLSearchParams(),
}));

import MatchLogsTable from './MatchLogsTable';
import LineageDirectory from '@/components/LineageDirectory';
import { UIProvider } from '@/lib/contexts/ui-context';
import type { FowlRecord, MatchRecord, PairingStats } from '@/lib/types';

const mockFowlContext = {
  fowls: [] as FowlRecord[],
  matchHistory: [] as MatchRecord[],
  matchMedia: new Map(),
  birdCodes: new Map<string, string>(),
  loading: false,
};

vi.mock('@/lib/contexts/fowl-context', () => ({
  useFowl: () => mockFowlContext,
}));

const bird = (partial: Partial<FowlRecord> & { id: number; name: string }): FowlRecord =>
  ({
    breed: 'Kelso',
    gender: 'Rooster',
    sire: '',
    dam: '',
    bird_code: '',
    wing_band: '',
    bloodline_pct: 100,
    status: 'Active',
    ...partial,
  }) as FowlRecord;

const allWins = bird({ id: 3, name: 'All Wins', sire: 'Sire X', dam: 'Dam A', bird_code: 'A' });
const allLosses = bird({ id: 4, name: 'All Losses', sire: 'Sire X', dam: 'Dam A', bird_code: 'B' });
const drawsOnly = bird({ id: 5, name: 'Draws Only', sire: 'Sire X', dam: 'Dam A', bird_code: 'C' });
const mixed = bird({ id: 6, name: 'Mixed Record', sire: 'Sire X', dam: 'Dam A', bird_code: 'D' });
const deepRecord = bird({ id: 7, name: 'Deep Record', sire: 'Sire X', dam: 'Dam A', bird_code: 'E' });
const lowSample = bird({ id: 8, name: 'Low Sample', sire: 'Sire X', dam: 'Dam A', bird_code: 'F' });
const oneMatch = bird({ id: 9, name: 'One Match', sire: 'Sire X', dam: 'Dam A', bird_code: 'G' });
const hen = bird({ id: 10, name: 'Hen Fighter', gender: 'Hen', sire: 'Sire X', dam: 'Dam A', bird_code: 'H' });

const fowls: FowlRecord[] = [
  bird({ id: 1, name: 'Sire X', gender: 'Rooster', bird_code: 'S' }),
  bird({ id: 2, name: 'Dam A', gender: 'Hen', bird_code: 'D' }),
  allWins,
  allLosses,
  drawsOnly,
  mixed,
  deepRecord,
  lowSample,
  oneMatch,
  hen,
];

let nextMatchId = 1;

const match = (fowl: FowlRecord, outcome: string, index = 0): MatchRecord => ({
  id: nextMatchId++,
  fowl_id: fowl.id,
  entry_name: fowl.name,
  breed: fowl.breed,
  opponent: `Opponent ${index + 1}`,
  location: 'Test Arena',
  type: 'Derby',
  outcome,
  status: 'Verified',
  date: `2026-10-${String((index % 28) + 1).padStart(2, '0')}`,
});

const matches: MatchRecord[] = [
  match(allWins, 'Win', 0),
  match(allWins, 'Win', 1),
  match(allWins, 'Win', 2),
  match(allLosses, 'Loss', 3),
  match(allLosses, 'Loss', 4),
  match(allLosses, 'Loss', 5),
  match(drawsOnly, 'Draw', 6),
  match(drawsOnly, 'Draw', 7),
  match(mixed, 'Win', 8),
  match(mixed, 'Win', 9),
  match(mixed, 'Loss', 10),
  match(mixed, 'Draw', 11),
  ...Array.from({ length: 12 }, (_, i) =>
    match(deepRecord, i === 11 ? 'Loss' : 'Win', i),
  ),
  match(lowSample, 'Win', 12),
  match(lowSample, 'Win', 13),
  match(oneMatch, 'Win', 14),
  match(hen, 'Win', 15),
  match(hen, 'Win', 16),
];

const maleCases = [allWins, allLosses, drawsOnly, mixed, deepRecord, lowSample, oneMatch];

function normalize(text: string | null | undefined): string {
  return (text || '').replace(/\s+/g, ' ').trim();
}

function matchLogRecordText(id: number): string {
  const badges = screen.getAllByTestId(`match-record-${id}`);
  return normalize(badges[0].textContent);
}

describe('Match Logs records match the Lineage Directory', () => {
  beforeEach(() => {
    localStorage.clear();
    mockFowlContext.fowls = fowls;
    mockFowlContext.matchHistory = matches;
    nextMatchId = 1;
  });

  it('shows the same lifetime record in both views for every fighting chicken', () => {
    // 1. Read the badge rendered by the Match Logs table.
    mockFowlContext.fowls = fowls;
    mockFowlContext.matchHistory = matches;
    render(
      <UIProvider theme="light" setTheme={() => {}}>
        <MatchLogsTable matches={matches} />
      </UIProvider>,
    );

    const matchLogRecords = new Map<number, string>();
    maleCases.forEach((fowl) => {
      matchLogRecords.set(fowl.id, matchLogRecordText(fowl.id));
    });
    expect(screen.queryAllByTestId(`match-record-${hen.id}`)).toHaveLength(0);
    cleanup();

    // 2. Read the same chicken's badge in the Lineage Directory's Sire tab.
    render(
      <UIProvider theme="light" setTheme={() => {}}>
        <LineageDirectory
          fowls={fowls}
          matchHistory={matches}
          pairingAnalytics={{ all: new Map<string, PairingStats>(), ranked: [] }}
          setSelectedFowlForDetails={vi.fn()}
        />
      </UIProvider>,
    );

    fireEvent.click(screen.getByRole('tab', { name: /Sire Offspring Tree/i }));
    const sireRegion = screen.getByRole('region', { name: /Sire X details/i });
    const sireTable = within(sireRegion).getByRole('table');

    maleCases.forEach((fowl) => {
      const row = within(sireTable).getByText(fowl.name).closest('tr');
      expect(row).not.toBeNull();
      const lineagePill = within(row as HTMLElement).getByTitle(/win rate|No decisions yet/i);
      expect(matchLogRecords.get(fowl.id)).toBe(normalize(lineagePill.textContent));
    });

    // 3. A hen with match rows never gets a record in either view.
    const henRow = within(sireTable).getByText(hen.name).closest('tr');
    expect(henRow).not.toBeNull();
    expect(within(henRow as HTMLElement).queryByTitle(/win rate|No decisions yet/i)).toBeNull();
    expect(henRow).toHaveTextContent('—');
  });

  it('covers wins, losses, draws, mixed records, deep history and low samples', () => {
    render(
      <UIProvider theme="light" setTheme={() => {}}>
        <MatchLogsTable matches={matches} />
      </UIProvider>,
    );

    expect(matchLogRecordText(allWins.id)).toMatch(/100% · 3W-0L/);
    expect(matchLogRecordText(allLosses.id)).toMatch(/0% · 0W-3L/);
    expect(matchLogRecordText(drawsOnly.id)).toMatch(/—% · 0W-0L-2D/);
    expect(matchLogRecordText(drawsOnly.id)).not.toMatch(/\b0%/);
    expect(matchLogRecordText(mixed.id)).toMatch(/67% · 2W-1L-1D/);
    expect(matchLogRecordText(deepRecord.id)).toMatch(/92% · 11W-1L/);
    expect(matchLogRecordText(lowSample.id)).toMatch(/100% · 2W-0L/);
    expect(matchLogRecordText(lowSample.id)).toMatch(/low sample/i);
    expect(matchLogRecordText(oneMatch.id)).toMatch(/100% · 1W-0L/);
    expect(matchLogRecordText(oneMatch.id)).toMatch(/1 match/i);
    expect(screen.queryAllByTestId(`match-record-${hen.id}`)).toHaveLength(0);
  });
});
