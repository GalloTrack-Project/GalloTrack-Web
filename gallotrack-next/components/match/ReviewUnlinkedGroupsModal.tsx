'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui';
import {
  computeHistoricalGroupStats,
  historicalGroupSexLabel,
  type HistoricalMatchGroup,
} from '@/lib/historical-matches';

type Props = {
  groups: HistoricalMatchGroup[];
  onClose: () => void;
  onLink: (group: HistoricalMatchGroup) => void;
  onCreate: (group: HistoricalMatchGroup) => void;
};

export default function ReviewUnlinkedGroupsModal({
  groups,
  onClose,
  onLink,
  onCreate,
}: Props) {
  const [keptKeys, setKeptKeys] = useState<Set<string>>(new Set());

  return (
    <Modal
      open
      onClose={onClose}
      title="Review unlinked entries"
      description={`${groups.length} historical group${groups.length === 1 ? '' : 's'} need a profile`}
      className="max-w-3xl"
    >
      <div className="space-y-3">
        {groups.length === 0 ? (
          <p className="text-muted-foreground p-4 text-sm font-semibold">
            No unlinked historical entries remain.
          </p>
        ) : (
          groups.map((group) => {
            const stats = computeHistoricalGroupStats(group);
            const dates = Array.from(new Set(group.matches.map((m) => m.date).filter(Boolean))).sort();
            const outcomes = Array.from(
              new Set(group.matches.map((m) => (m.outcome || '').trim()).filter(Boolean)),
            );
            const kept = keptKeys.has(group.key);
            return (
              <div key={group.key} className="border-border bg-card rounded-md border p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-card-foreground truncate text-sm font-black">
                      {group.entryName}
                    </p>
                    <p className="text-muted-foreground text-xs font-semibold">
                      {group.strain || 'Strain not recorded'}
                      {'·'}
                      {group.matches.length} match{group.matches.length === 1 ? '' : 'es'}
                      {'·'}
                      {historicalGroupSexLabel(group)}
                    </p>
                    <p className="text-muted-foreground mt-1 text-[11px] font-semibold">
                      Dates: {dates.length > 0 ? dates.join(', ') : 'Not recorded'}
                      {'·'}
                      Outcomes: {outcomes.length > 0 ? outcomes.join(', ') : 'Not recorded'}
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-[11px] font-semibold">
                      Record: {stats.wins}W-{stats.losses}L-{stats.draws}D
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onLink(group)}
                      className="inline-flex h-10 cursor-pointer items-center rounded-md bg-emerald-600 px-3 text-xs font-black text-white transition-colors hover:bg-emerald-700"
                    >
                      Link to registered chicken
                    </button>
                    <button
                      type="button"
                      onClick={() => onCreate(group)}
                      className="border-border bg-card text-foreground hover:bg-muted inline-flex h-10 cursor-pointer items-center rounded-md border px-3 text-xs font-black transition-colors"
                    >
                      Create new profile
                    </button>
                    <button
                      type="button"
                      disabled={kept}
                      onClick={() => setKeptKeys((current) => new Set(current).add(group.key))}
                      className="text-muted-foreground hover:text-foreground h-10 cursor-pointer px-2 text-xs font-black underline-offset-2 hover:underline disabled:cursor-default disabled:opacity-60"
                    >
                      {kept ? 'Kept as historical' : 'Keep as historical'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Modal>
  );
}
