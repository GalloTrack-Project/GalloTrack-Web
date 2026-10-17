'use client';
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Edit2 } from 'lucide-react';
import ChickenIcon from '@/components/ChickenIcon';
import MatchMediaButtons from '@/components/match/MatchMediaButtons';
import { formatBirdCodeForDisplay } from '@/lib/bird-code';
import { useFowl } from '@/lib/contexts/fowl-context';
import { photosFor, postersFor, videosFor } from '@/lib/services/media-service';
import type { MatchRecord } from '@/lib/types';

type Props = {
  /** Rows to render — defaults to the full match history from context. */
  matches?: MatchRecord[];
  emptyText?: string;
};

/**
 * Shared "Historical Analytics Match Logs" table used by the Dashboard and the
 * Chicken Registry (Record Match tab), so both show identical columns,
 * identifier chips, and media buttons.
 */
export default function MatchLogsTable({ matches, emptyText = 'No data available' }: Props) {
  const router = useRouter();
  const { fowls, matchHistory, matchMedia, birdCodes } = useFowl();
  const rows = matches ?? matchHistory;

  const fowlById = React.useMemo(() => {
    const m = new Map<number, any>();
    fowls.forEach((f) => m.set(f.id, f));
    return m;
  }, [fowls]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm border-collapse min-w-[860px]">
        <thead>
          <tr className="bg-muted/50 text-muted-foreground font-extrabold uppercase border-b border-border">
            <th className="p-4 pl-6">Match Date</th>
            <th className="p-4">Chicken Identifier</th>
            <th className="p-4">Opponent</th>
            <th className="p-4">Arena Location</th>
            <th className="p-4 text-center">Outcome</th>
            <th className="p-4 text-center">Post-Fight Condition</th>
            <th className="p-4 text-center">Media &amp; Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border text-muted-foreground font-semibold">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={7} className="p-8 text-center text-muted-foreground text-sm font-semibold">
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map((log) => {
              const fowl = log.fowl_id != null ? fowlById.get(log.fowl_id) : null;
              const code = fowl ? birdCodes.get(String(fowl.id)) : '';
              const hatch = fowl?.birthdate;
              const isOrphan = log.fowl_id == null;
              return (
                <tr
                  key={log.id}
                  onClick={() => router.push(`/match-logs/${log.id}/edit`)}
                  className="hover:bg-muted/30 transition-colors duration-150 cursor-pointer group"
                >
                  <td className="p-4 pl-6 font-mono text-muted-foreground whitespace-nowrap">{log.date}</td>
                  <td className="p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0"><ChickenIcon className="w-3.5 h-3.5 text-success" /></div>
                      {code && (
                        <span className="text-sm font-mono font-black px-1.5 py-0.5 rounded bg-emerald-500/10 text-success border border-emerald-500/20 uppercase">
                          [{formatBirdCodeForDisplay(code)}]
                        </span>
                      )}
                      <span className="font-bold text-card-foreground group-hover:text-emerald-600 transition-colors">{log.entry_name}</span>
                      {isOrphan && (
                        <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                          Historical entry (no profile linked)
                        </span>
                      )}
                    </div>
                    <span className="block text-xs font-semibold text-muted-foreground mt-0.5">
                      {log.breed || '—'}{hatch ? ` · hatch ${hatch}` : ''}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1.5">
                      {log.opponent_photo_url && (
                        <img src={log.opponent_photo_url} alt="Opponent" className="h-6 w-6 rounded-full border border-border object-cover shrink-0" />
                      )}
                      <span className="font-bold text-card-foreground">{log.opponent || '—'}</span>
                    </div>
                    <span className="block text-xs font-semibold text-muted-foreground normal-case mt-0.5">
                      {[log.opponent_breed, log.opponent_bloodline].filter(Boolean).join(' · ') || '—'}
                    </span>
                  </td>
                  <td className="p-4 text-muted-foreground font-normal">{log.location || '—'}</td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full font-black text-sm uppercase tracking-wider border ${log.outcome && log.outcome.toLowerCase() === 'win' ? 'bg-emerald-500/10 text-success border-emerald-500/20' : log.outcome && log.outcome.toLowerCase() === 'loss' ? 'bg-rose-500/10 text-danger border-rose-500/20' : 'bg-muted text-muted-foreground border-border'}`}>{log.outcome || '—'}</span>
                  </td>
                  <td className="p-4 text-center">
                    {log.post_fight_condition ? (
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full font-black text-sm uppercase tracking-wider border whitespace-nowrap ${
                        (log.post_fight_condition || '').toLowerCase().includes('deceased')
                          ? 'bg-rose-500/10 text-danger border-rose-500/20'
                          : (log.post_fight_condition || '').toLowerCase().includes('critical') || (log.post_fight_condition || '').toLowerCase().includes('severely')
                          ? 'bg-amber-500/10 text-warning border-amber-500/20'
                          : 'bg-teal-500/10 text-teal border-teal-500/20'
                      }`}>
                        {log.post_fight_condition}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground font-bold">—</span>
                    )}
                  </td>
                  <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-2">
                      <MatchMediaButtons
                        match={log}
                        videos={videosFor(matchMedia, log.id, log)}
                        photos={photosFor(matchMedia, log.id, log)}
                        posters={postersFor(matchMedia, log.id, log)}
                      />
                      <Link
                        href={`/match-logs/${log.id}/edit`}
                        className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        title="Edit Match Record"
                        aria-label={`Edit Match #${log.id}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Link>
                    </div>
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
