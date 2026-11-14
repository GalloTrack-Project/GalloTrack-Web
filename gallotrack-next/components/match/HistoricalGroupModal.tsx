'use client';

import React from 'react';
import { Modal } from '@/components/ui';
import WinRatePill from '@/components/match/WinRatePill';
import MatchMediaButtons from '@/components/match/MatchMediaButtons';
import { useFowl } from '@/lib/contexts/fowl-context';
import { photosFor, postersFor, videosFor } from '@/lib/services/media-service';
import {
  computeHistoricalGroupStats,
  historicalGroupSexLabel,
  type HistoricalMatchGroup,
} from '@/lib/historical-matches';

type Props = {
  group: HistoricalMatchGroup;
  onClose: () => void;
  onLinkRequest: (group: HistoricalMatchGroup) => void;
  onCreateRequest: (group: HistoricalMatchGroup) => void;
};

export default function HistoricalGroupModal({
  group,
  onClose,
  onLinkRequest,
  onCreateRequest,
}: Props) {
  const { matchMedia } = useFowl();
  const stats = computeHistoricalGroupStats(group);
  const isHen = /^(hen|female|pullet)$/i.test((group.sex || '').trim());

  return (
    <Modal
      open
      onClose={onClose}
      title="Individual Chicken Analytics & Match Logs"
      description={`Historical entry · ${group.entryName}${group.strain ? ` · ${group.strain}` : ''}`}
      className="max-w-3xl"
    >
      <div className="space-y-4">
        <div className="border-border bg-muted/30 flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-card-foreground truncate text-base font-black">{group.entryName}</p>
            <p className="text-muted-foreground text-xs font-semibold">
              {group.strain || 'Strain not recorded'}
              {'·'}
              {historicalGroupSexLabel(group)}
              {'·'}
              Historical entry (not registered)
            </p>
            <p className="text-muted-foreground mt-1 text-xs font-semibold">
              {stats.total} fight{stats.total === 1 ? '' : 's'} tracked
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onLinkRequest(group)}
              className="inline-flex h-10 cursor-pointer items-center rounded-md bg-emerald-600 px-3 text-xs font-black text-white transition-colors hover:bg-emerald-700"
            >
              Link to registered profile
            </button>
            <button
              type="button"
              onClick={() => onCreateRequest(group)}
              className="border-border bg-card text-foreground hover:bg-muted inline-flex h-10 cursor-pointer items-center rounded-md border px-3 text-xs font-black transition-colors"
            >
              Create profile
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-muted-foreground text-[10px] font-black tracking-widest uppercase">
            Historical record
          </span>
          {isHen ? (
            <span className="text-muted-foreground text-sm font-black">—</span>
          ) : (
            <WinRatePill stats={stats} />
          )}
        </div>

        <div className="border-border overflow-hidden rounded-md border">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-muted/40 text-muted-foreground border-border border-b font-black uppercase">
                <th className="p-2.5">Date</th>
                <th className="p-2.5">Opponent</th>
                <th className="p-2.5">Arena</th>
                <th className="p-2.5 text-center">Outcome</th>
                <th className="p-2.5 text-center">Condition</th>
                <th className="p-2.5 text-center">Media</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {group.matches.map((match) => (
                <tr key={match.id}>
                  <td className="text-muted-foreground p-2.5 font-mono whitespace-nowrap">
                    {match.date || '—'}
                  </td>
                  <td className="text-card-foreground p-2.5 font-bold">
                    {match.opponent || '—'}
                  </td>
                  <td className="text-muted-foreground p-2.5">{match.location || '—'}</td>
                  <td className="text-card-foreground p-2.5 text-center font-black uppercase">
                    {match.outcome || '—'}
                  </td>
                  <td className="text-muted-foreground p-2.5 text-center">
                    {match.post_fight_condition || 'Not recorded'}
                  </td>
                  <td className="p-2.5" onClick={(event) => event.stopPropagation()}>
                    <MatchMediaButtons
                      match={match}
                      videos={videosFor(matchMedia, match.id, match)}
                      photos={photosFor(matchMedia, match.id, match)}
                      posters={postersFor(matchMedia, match.id, match)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-border bg-muted/20 rounded-md border p-3">
          <p className="text-muted-foreground text-[10px] font-black tracking-widest uppercase">
            Bloodline &amp; parentage
          </p>
          <p className="text-card-foreground mt-1 text-sm font-semibold">
            Not registered, no parents recorded.
          </p>
          <p className="text-muted-foreground mt-1 text-xs font-semibold">
            This historical entry is never merged into a registered chicken&apos;s bloodline or
            record until you explicitly link or create a profile.
          </p>
        </div>
      </div>
    </Modal>
  );
}
