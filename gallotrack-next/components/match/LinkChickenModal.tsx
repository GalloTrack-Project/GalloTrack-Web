'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Modal } from '@/components/ui';
import CreateChickenForMatch from '@/components/match/CreateChickenForMatch';
import { formatBirdCodeForDisplay } from '@/lib/bird-code';
import { canFight, sexLabel } from '@/lib/helpers';
import { computeWinRate, type WinRateStats } from '@/lib/win-rate';
import type { FowlRecord, MatchRecord } from '@/lib/types';
import { cn } from '@/components/ui/utils';

type Props = {
  match: MatchRecord;
  fowls: FowlRecord[];
  birdCodes: Map<string, string>;
  statsMap: Map<string, WinRateStats>;
  /** Other unlinked matches with the same entered name. */
  historicalMatches: MatchRecord[];
  onClose: () => void;
  onLink: (fowl: FowlRecord, matches: MatchRecord[]) => Promise<boolean>;
  onCreateAndLink: (fowlId: number, matches: MatchRecord[]) => Promise<boolean>;
  /** The edit form already owns persistence, so it only needs the picker tab. */
  showCreateTab?: boolean;
  showBulk?: boolean;
};

type Tab = 'link' | 'create';

const MALE_SEX_VALUES = ['cock', 'rooster', 'stag', 'male'];

export function validateMatchLinkCandidate(
  fowl: FowlRecord,
  explicitSex?: string | null,
): string | null {
  if (!canFight(fowl) || sexLabel(fowl) !== 'Cock') {
    return 'Only cocks can be linked to a fight.';
  }
  const sex = (explicitSex || '').trim().toLowerCase();
  if (sex && !MALE_SEX_VALUES.includes(sex) && sexLabel({ gender: explicitSex }) === 'Hen') {
    return 'Only cocks can be linked to a fight.';
  }
  return null;
}

export default function LinkChickenModal({
  match,
  fowls,
  birdCodes,
  statsMap,
  historicalMatches,
  onClose,
  onLink,
  onCreateAndLink,
  showCreateTab = true,
  showBulk = true,
}: Props) {
  const [tab, setTab] = useState<Tab>('link');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [applyBulk, setApplyBulk] = useState(false);
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmSexConflict, setConfirmSexConflict] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);

  const enteredKey = (match.entry_name || '').trim().toLowerCase();
  const explicitSex = String((match as MatchRecord & { sex?: string | null }).sex || '').trim();
  const enteredSex = explicitSex || 'Not recorded';
  const sexConflict =
    !!explicitSex &&
    sexLabel({ gender: explicitSex }) !== 'Cock' &&
    sexLabel({ gender: explicitSex }) !== 'Hen';

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const candidates = useMemo(() => {
    const term = query.trim().toLowerCase();
    const score = (fowl: FowlRecord) => {
      const key = fowl.name.trim().toLowerCase();
      if (enteredKey && key === enteredKey) return 0;
      if (enteredKey && (key.startsWith(enteredKey) || enteredKey.startsWith(key))) return 1;
      if (enteredKey && (key.includes(enteredKey) || enteredKey.includes(key))) return 2;
      return 3;
    };
    return fowls
      .filter(canFight)
      .filter((fowl) => {
        if (!term) return true;
        const code = birdCodes.get(String(fowl.id)) || fowl.bird_code || fowl.chicken_code || '';
        return (
          fowl.name.toLowerCase().includes(term) ||
          code.toLowerCase().includes(term) ||
          (fowl.wing_band || '').toLowerCase().includes(term)
        );
      })
      .sort((a, b) => score(a) - score(b) || a.name.localeCompare(b.name) || a.id - b.id);
  }, [fowls, birdCodes, query, enteredKey]);

  const selected = selectedId != null ? fowls.find((f) => f.id === selectedId) ?? null : null;
  const selectedStats = selected ? statsMap.get(String(selected.id)) ?? computeWinRate(0, 0) : null;
  const nameDiffers =
    !!selected && selected.name.trim().toLowerCase() !== enteredKey;

  const bulkIds = applyBulk ? Array.from(checkedIds) : [];
  const bulkMatches = historicalMatches.filter((m) => bulkIds.includes(m.id));
  const linkTargets = [match, ...bulkMatches];

  const toggleChecked = (id: number) => {
    setCheckedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const validateSelection = (fowl: FowlRecord) =>
    validateMatchLinkCandidate(fowl, explicitSex);

  const handleConfirm = async () => {
    if (!selected || saving) return;
    const validation = validateSelection(selected);
    if (validation) {
      setError(validation);
      return;
    }
    if (sexConflict && !confirmSexConflict) {
      setError('Confirm the recorded sex conflict before linking.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const ok = await onLink(selected, linkTargets);
      if (ok) onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleCreated = async (fowlId: number) => {
    setSaving(true);
    try {
      const ok = await onCreateAndLink(fowlId, linkTargets);
      if (ok) onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Link historical match"
      description={`${match.date || 'Date not recorded'} ? ${match.entry_name || 'No name'}`}
      className="max-w-3xl"
    >
      <div className="space-y-4">
        <dl className="bg-muted/30 border-border grid grid-cols-2 gap-x-4 gap-y-2 rounded-md border p-3 text-xs sm:grid-cols-3">
          {[
            ['Date', match.date || 'Not recorded'],
            ['Entered name', match.entry_name || 'Not recorded'],
            ['Strain', match.breed || 'Not recorded'],
            ['Sex', enteredSex],
            ['Opponent', match.opponent || 'Not recorded'],
            ['Arena', match.location || 'Not recorded'],
            ['Outcome', match.outcome || 'Not recorded'],
          ].map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-muted-foreground text-[9px] font-black tracking-widest uppercase">
                {label}
              </dt>
              <dd className="text-card-foreground truncate font-bold">{value}</dd>
            </div>
          ))}
        </dl>

        <div role="tablist" aria-label="Link historical match" className="border-border flex gap-1 border-b">
          {([
            ['link', 'Link to registered chicken'],
            ...(showCreateTab ? [['create', 'Create new profile'] as const] : []),
          ] as Array<readonly [Tab, string]>).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={cn(
                'cursor-pointer border-b-2 px-3 py-2 text-xs font-black transition-colors',
                tab === value
                  ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                  : 'text-muted-foreground hover:text-foreground border-transparent',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'link' ? (
          <div role="tabpanel" className="space-y-3">
            <div>
              <label htmlFor="link-chicken-search" className="text-muted-foreground block text-xs font-black tracking-widest uppercase">
                Search registered cocks
              </label>
              <div className="relative mt-1.5">
                <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" aria-hidden="true" />
                <input
                  id="link-chicken-search"
                  ref={searchRef}
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search name, code, or band..."
                  className="border-input-border bg-card text-foreground placeholder:text-muted-foreground focus:border-emerald-500 h-11 w-full rounded-md border pr-9 pl-9 text-sm font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    aria-label="Clear chicken search"
                    className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>

            <div
              role="listbox"
              aria-label="Eligible chickens"
              className="border-border bg-muted/20 max-h-64 divide-y divide-border/60 overflow-y-auto rounded-md border"
            >
              {candidates.length === 0 ? (
                <p className="text-muted-foreground p-4 text-sm font-semibold">No eligible chickens match that search.</p>
              ) : (
                candidates.map((fowl) => {
                  const code = formatBirdCodeForDisplay(
                    birdCodes.get(String(fowl.id)) || fowl.bird_code || fowl.chicken_code || '',
                  );
                  const isSelected = selectedId === fowl.id;
                  const stats = statsMap.get(String(fowl.id)) ?? computeWinRate(0, 0);
                  return (
                    <button
                      key={fowl.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        setSelectedId(fowl.id);
                        setConfirmSexConflict(false);
                        setError(null);
                      }}
                      className={cn(
                        'flex min-h-[44px] w-full cursor-pointer items-center gap-3 px-3 py-2 text-left transition-colors',
                        isSelected ? 'bg-emerald-500/10' : 'hover:bg-muted/60',
                      )}
                    >
                      <span className="border-border bg-card text-foreground shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px] font-black">
                        {code || '?'}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="text-card-foreground block truncate text-sm font-bold">{fowl.name}</span>
                        <span className="text-muted-foreground block truncate text-[11px] font-semibold">
                          {sexLabel(fowl)} ? {fowl.status || 'Unknown status'} ? {fowl.breed || 'No strain'}
                          {fowl.wing_band ? ` ? Band ${fowl.wing_band}` : ''}
                        </span>
                      </span>
                      <span className="text-muted-foreground shrink-0 text-[10px] font-black whitespace-nowrap">
                        {stats.winRate === null ? '?%' : `${stats.winRate}%`} ? {stats.wins}W-{stats.losses}L
                      </span>
                      <span
                        className={cn(
                          'h-3.5 w-3.5 shrink-0 rounded-full border',
                          isSelected ? 'border-emerald-600 bg-emerald-600' : 'border-border bg-card',
                        )}
                        aria-hidden="true"
                      />
                    </button>
                  );
                })
              )}
            </div>

            {nameDiffers && selected && (
              <p
                role="status"
                className="rounded-md border border-amber-300/70 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
              >
                The selected chicken is named ?{selected.name}?, but this match is recorded as ?{match.entry_name}?.
                Saving will update the recorded name.
              </p>
            )}

            {sexConflict && selected && (
              <label
                role="status"
                className="flex cursor-pointer items-start gap-2 rounded-md border border-amber-300/70 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
              >
                <input
                  type="checkbox"
                  checked={confirmSexConflict}
                  onChange={(event) => {
                    setConfirmSexConflict(event.target.checked);
                    if (event.target.checked) setError(null);
                  }}
                  aria-label="Confirm recorded sex conflict"
                  className="mt-0.5 h-4 w-4 shrink-0 accent-amber-600"
                />
                <span>
                  This match is recorded with sex ?{explicitSex}?, which conflicts with the
                  selected cock. Confirm that the profile is correct before linking.
                </span>
              </label>
            )}

            {error && (
              <p role="alert" className="text-danger text-xs font-bold">
                {error}
              </p>
            )}

            {showBulk && historicalMatches.length > 0 && (
              <div className="border-border bg-muted/20 space-y-2 rounded-md border p-3">
                <label className="flex cursor-pointer items-center gap-2 text-xs font-bold">
                  <input
                    type="checkbox"
                    checked={applyBulk}
                    onChange={(event) => {
                      setApplyBulk(event.target.checked);
                      if (!event.target.checked) setCheckedIds(new Set());
                    }}
                    className="h-4 w-4 accent-emerald-600"
                  />
                  Apply to other historical matches with the same entered name
                </label>
                {applyBulk && (
                  <ul className="space-y-1.5">
                    {historicalMatches.map((other) => (
                      <li key={other.id}>
                        <label className="hover:bg-muted/60 flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-xs font-semibold">
                          <input
                            type="checkbox"
                            checked={checkedIds.has(other.id)}
                            onChange={() => toggleChecked(other.id)}
                            className="h-4 w-4 accent-emerald-600"
                          />
                          <span className="text-muted-foreground font-mono">{other.date || '?'}</span>
                          <span className="text-card-foreground truncate">vs {other.opponent || 'opponent'}</span>
                          <span className="text-muted-foreground ml-auto shrink-0">{other.outcome || '?'}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground h-11 cursor-pointer px-2 text-xs font-black underline-offset-2 hover:underline"
              >
                Keep as historical
              </button>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={onClose}
                  className="border-border bg-card text-foreground hover:bg-muted h-11 cursor-pointer rounded-md border px-4 text-sm font-black transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={!selected || saving || (sexConflict && !confirmSexConflict)}
                  className="inline-flex h-11 cursor-pointer items-center justify-center rounded-md bg-emerald-600 px-5 text-sm font-black text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? 'Linking?'
                    : linkTargets.length > 1
                      ? `Link ${linkTargets.length} matches`
                      : 'Link chicken'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div role="tabpanel" className="max-h-[60vh] overflow-y-auto pr-1">
            <CreateChickenForMatch
              initialName={match.entry_name || ''}
              initialBreed={match.breed || ''}
              initialSex="Rooster"
              onCreated={handleCreated}
            />
          </div>
        )}
      </div>
    </Modal>
  );
}
