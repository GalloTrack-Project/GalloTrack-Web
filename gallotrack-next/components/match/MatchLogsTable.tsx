'use client';
import React from 'react';
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
  const { fowls, matchHistory, matchMedia, birdCodes } = useFowl();
  const rows = matches ?? matchHistory;

  const codeByName = React.useMemo(() => {
    const m = new Map<string, string>();
    fowls.forEach((f) => {
      const code = birdCodes.get(String(f.id));
      const k = (f.name || '').trim().toLowerCase();
      if (code && k) m.set(k, code);
    });
    return m;
  }, [fowls, birdCodes]);

  const hatchByName = React.useMemo(() => {
    const m = new Map<string, string>();
    fowls.forEach((f) => {
      const k = (f.name || '').trim();
      if (k && f.birthdate) m.set(k, f.birthdate);
    });
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
              const nameKey = (log.entry_name || '').trim().toLowerCase();
              const code = codeByName.get(nameKey);
              const hatch = hatchByName.get((log.entry_name || '').trim());
              return (
                <tr key={log.id} className="hover:bg-muted/30 transition-colors duration-150">
                  <td className="p-4 pl-6 font-mono text-muted-foreground whitespace-nowrap">{log.date}</td>
                  <td className="p-4">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0"><ChickenIcon className="w-3.5 h-3.5 text-success" /></div>
                      {code && (
                        <span className="text-sm font-mono font-black px-1.5 py-0.5 rounded bg-emerald-500/10 text-success border border-emerald-500/20 uppercase">
                          [{formatBirdCodeForDisplay(code)}]
                        </span>
                      )}
                      <span className="font-bold text-card-foreground">{log.entry_name}</span>
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
                  <td className="p-4 text-center">
                    <MatchMediaButtons
                      match={log}
                      videos={videosFor(matchMedia, log.id)}
                      photos={photosFor(matchMedia, log.id)}
                      posters={postersFor(matchMedia, log.id)}
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
