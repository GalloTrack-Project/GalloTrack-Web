'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import ChickenIcon from '@/components/ChickenIcon';
import MatchMediaButtons from '@/components/match/MatchMediaButtons';
import { formatBirdCodeForDisplay } from '@/lib/bird-code';
import { useFowl } from '@/lib/contexts/fowl-context';
import { useUI } from '@/lib/contexts/ui-context';
import { useT } from '@/lib/i18n';
import { photosFor, postersFor, videosFor } from '@/lib/services/media-service';
import { toastMessage } from '@/lib/toast-bus';
import type { FowlRecord, MatchRecord } from '@/lib/types';

type Props = {
  /** Rows to render — defaults to the full match history from context. */
  matches?: MatchRecord[];
  emptyText?: string;
  /** Page the user came from; used by row click, Edit, Save, and Cancel. */
  returnTo?: string;
};

/**
 * Shared "Historical Analytics Match Logs" table used by the Dashboard and the
 * Chicken Registry (Record Match tab), so both show identical columns,
 * identifier chips, and media buttons.
 */
export default function MatchLogsTable({
  matches,
  emptyText = 'No data available',
  returnTo = '/dashboard',
}: Props) {
  const router = useRouter();
  const t = useT();
  const ui = useUI();
  const { fowls, matchHistory, matchMedia, birdCodes } = useFowl();
  const rows = matches ?? matchHistory;

  const fowlById = React.useMemo(() => {
    const m = new Map<number, FowlRecord>();
    fowls.forEach((f) => m.set(f.id, f));
    return m;
  }, [fowls]);

  return (
    <div className="max-w-full min-w-0 overflow-x-auto">
      <table className="w-full min-w-[640px] table-fixed border-collapse text-left text-sm">
        <thead>
          <tr className="bg-muted/50 text-muted-foreground border-border border-b font-extrabold uppercase">
            <th className="w-[9%] p-2.5 pl-3 lg:p-3 lg:pl-4">Match Date</th>
            <th className="w-[24%] p-2.5 lg:p-3">Chicken Identifier</th>
            <th className="w-[17%] p-2.5 lg:p-3">Opponent</th>
            <th className="w-[13%] p-2.5 lg:p-3">Arena Location</th>
            <th className="w-[9%] p-2.5 text-center lg:p-3">Outcome</th>
            <th className="w-[13%] p-2.5 text-center lg:p-3">Post-Fight Condition</th>
            <th className="bg-card sticky right-0 w-[15%] min-w-[160px] p-2.5 text-center lg:min-w-[120px] lg:p-2">
              Media &amp; Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-border text-muted-foreground divide-y font-semibold">
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={7}
                className="text-muted-foreground p-8 text-center text-sm font-semibold"
              >
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map((log) => {
              const fowl =
                log.fowl_id != null ? fowlById.get(log.fowl_id) ?? null : null;
              const code = fowl ? birdCodes.get(String(fowl.id)) : '';
              const hatch = fowl?.birthdate;
              const isOrphan = !fowl;
              const openFowlInfo = fowl
                ? (event: React.MouseEvent) => {
                    event.stopPropagation();
                    ui.setSelectedFowlForDetails(fowl);
                  }
                : undefined;
              const handleChickenCellClick = (event: React.MouseEvent) => {
                event.stopPropagation();
                if (fowl) {
                  ui.setSelectedFowlForDetails(fowl);
                } else {
                  toastMessage(
                    'No chicken profile is linked to this historical match.',
                    'warning',
                  );
                }
              };
              return (
                <tr
                  key={log.id}
                  onClick={() =>
                    router.push(
                      `/match-logs/${log.id}/edit?returnTo=${encodeURIComponent(returnTo)}`,
                    )
                  }
                  className="hover:bg-muted/30 group cursor-pointer transition-colors duration-150"
                >
                  <td className="text-muted-foreground p-2.5 pl-3 font-mono whitespace-nowrap lg:p-3 lg:pl-4">
                    {log.date}
                  </td>
                  <td
                    className="min-w-0 cursor-pointer p-2.5 lg:p-3"
                    onClick={handleChickenCellClick}
                    title={fowl ? `View info for ${log.entry_name}` : undefined}
                  >
                    {openFowlInfo ? (
                      <button
                        type="button"
                        onClick={openFowlInfo}
                        aria-label={`View info for ${log.entry_name}`}
                        title={`View info for ${log.entry_name}`}
                        className="focus-visible:ring-ring flex w-full min-w-0 cursor-pointer flex-col items-start rounded-md text-left focus-visible:ring-2 focus-visible:outline-none"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10">
                            <ChickenIcon className="text-success h-3.5 w-3.5" />
                          </div>
                          {code && (
                            <span className="text-success rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-sm font-black uppercase">
                              [{formatBirdCodeForDisplay(code)}]
                            </span>
                          )}
                          <span className="text-card-foreground font-bold transition-colors group-hover:text-emerald-600">
                            {log.entry_name}
                          </span>
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                          <span className="text-muted-foreground text-xs font-semibold">
                            {log.breed || '—'}
                            {hatch ? ` · ${t('registry.hatchedDate', { date: hatch })}` : ''}
                          </span>
                          {log.age_category && (
                            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-xs font-bold whitespace-nowrap text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                              {log.age_category}
                            </span>
                          )}
                        </div>
                      </button>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10">
                            <ChickenIcon className="text-success h-3.5 w-3.5" />
                          </div>
                          {code && (
                            <span className="text-success rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-sm font-black uppercase">
                              [{formatBirdCodeForDisplay(code)}]
                            </span>
                          )}
                          <span className="text-card-foreground font-bold transition-colors group-hover:text-emerald-600">
                            {log.entry_name}
                          </span>
                          {isOrphan && (
                            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-bold whitespace-nowrap text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                              Historical entry (no profile linked)
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                          <span className="text-muted-foreground text-xs font-semibold">
                            {log.breed || '—'}
                            {hatch ? ` · ${t('registry.hatchedDate', { date: hatch })}` : ''}
                          </span>
                          {log.age_category && (
                            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-xs font-bold whitespace-nowrap text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                              {log.age_category}
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </td>
                  <td className="min-w-0 p-2.5 lg:p-3">
                    <div className="flex min-w-0 items-center gap-1.5">
                      {log.opponent_photo_url && (
                        <img
                          src={log.opponent_photo_url}
                          alt="Opponent"
                          className="border-border h-6 w-6 shrink-0 rounded-full border object-cover"
                        />
                      )}
                      <span className="text-card-foreground min-w-0 font-bold break-words">
                        {log.opponent || '—'}
                      </span>
                    </div>
                    <span className="text-muted-foreground mt-0.5 block text-xs font-semibold break-words normal-case">
                      {[log.opponent_breed, log.opponent_bloodline].filter(Boolean).join(' · ') ||
                        '—'}
                    </span>
                  </td>
                  <td className="text-muted-foreground p-2.5 font-normal break-words lg:p-3">
                    {log.location || ' - '}
                  </td>
                  <td className="p-2.5 text-center lg:p-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-sm font-black tracking-wider uppercase ${log.outcome && log.outcome.toLowerCase() === 'win' ? 'text-success border-emerald-500/20 bg-emerald-500/10' : log.outcome && log.outcome.toLowerCase() === 'loss' ? 'text-danger border-rose-500/20 bg-rose-500/10' : 'bg-muted text-muted-foreground border-border'}`}
                    >
                      {log.outcome || '—'}
                    </span>
                  </td>
                  <td className="p-2.5 text-center lg:p-3">
                    {log.post_fight_condition ? (
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-1 text-sm font-black tracking-wider break-words uppercase ${
                          (log.post_fight_condition || '').toLowerCase().includes('deceased')
                            ? 'text-danger border-rose-500/20 bg-rose-500/10'
                            : (log.post_fight_condition || '').toLowerCase().includes('critical') ||
                                (log.post_fight_condition || '').toLowerCase().includes('severely')
                              ? 'text-warning border-amber-500/20 bg-amber-500/10'
                              : 'text-teal border-teal-500/20 bg-teal-500/10'
                        }`}
                      >
                        {log.post_fight_condition}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-sm font-bold">—</span>
                    )}
                  </td>
                  <td
                    className="bg-card sticky right-0 w-[15%] min-w-[160px] p-2.5 text-center lg:min-w-[120px] lg:p-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MatchMediaButtons
                      match={log}
                      videos={videosFor(matchMedia, log.id, log)}
                      photos={photosFor(matchMedia, log.id, log)}
                      posters={postersFor(matchMedia, log.id, log)}
                      returnTo={returnTo}
                    />
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
