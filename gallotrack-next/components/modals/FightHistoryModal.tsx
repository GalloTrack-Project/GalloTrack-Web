'use client';
import React from 'react';
import { Swords } from 'lucide-react';
import { Modal } from '@/components/ui';
import { useUI } from '@/lib/contexts/ui-context';
import { useFowl } from '@/lib/contexts/fowl-context';
import { resolveBirdCodes, formatBirdCodeForDisplay } from '@/lib/bird-code';

const outcomeClass = (outcome: string) => {
  const o = (outcome || '').toLowerCase();
  if (o === 'win') return 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
  if (o === 'loss') return 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800';
  return 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
};

/**
 * Standalone "View All Fights" list for one chicken — opened from the family
 * and sibling views where only a W-L badge is shown per row.
 */
export default function FightHistoryModal() {
  const ui = useUI();
  const { matchHistory, fowls } = useFowl();

  const bird = ui.fightHistoryFowl;
  if (!bird) return null;

  const birdKey = (bird.name || '').trim().toLowerCase();
  const fights = matchHistory
    .filter((m) => (m.entry_name || '').trim().toLowerCase() === birdKey)
    .slice()
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const wins = fights.filter((m) => (m.outcome || '').toLowerCase() === 'win').length;
  const losses = fights.filter((m) => (m.outcome || '').toLowerCase() === 'loss').length;
  const draws = fights.filter((m) => (m.outcome || '').toLowerCase() === 'draw').length;
  const decided = wins + losses;
  const winRate = decided > 0 ? Math.round((wins / decided) * 100) : 0;
  const code = formatBirdCodeForDisplay(resolveBirdCodes(fowls).get(String(bird.id)) || '');

  const summary = [
    { label: 'Total Fights', value: String(fights.length), tone: 'text-slate-800 dark:text-card-foreground' },
    { label: 'Wins', value: String(wins), tone: 'text-success dark:text-emerald-400' },
    { label: 'Losses', value: String(losses), tone: 'text-danger dark:text-rose-400' },
    { label: 'Draws', value: String(draws), tone: 'text-warning dark:text-amber-400' },
    { label: 'Win Rate', value: decided > 0 ? `${winRate}%` : '—', tone: 'text-teal dark:text-teal-400' },
  ];

  return (
    <Modal
      open
      onClose={() => ui.setFightHistoryFowl(null)}
      title={`All Fights — ${bird.name}`}
      description={`${fights.length} recorded fight${fights.length === 1 ? '' : 's'}${decided > 0 ? ` · ${wins}W-${losses}L${draws > 0 ? `-${draws}D` : ''}` : ''}`}
      icon={<Swords className="w-5 h-5" />}
      iconClassName="bg-emerald-100 dark:bg-emerald-900/50 border-emerald-200 dark:border-emerald-800 text-success dark:text-emerald-300"
      className="max-w-3xl"
    >
      <div className="flex flex-wrap items-center gap-2">
        {code && (
          <span className="font-mono text-xs font-black px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
            {code}
          </span>
        )}
        <span className="text-xs font-bold text-muted-foreground">
          {bird.breed || '—'} · {bird.gender || '—'}
          {bird.status ? ` · ${bird.status}` : ''}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {summary.map((s) => (
          <div key={s.label} className="bg-slate-50 dark:bg-muted/50 border border-slate-200/70 dark:border-border rounded-md p-2.5 text-center">
            <span className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground">{s.label}</span>
            <strong className={`block text-lg font-black ${s.tone}`}>{s.value}</strong>
          </div>
        ))}
      </div>

      {fights.length === 0 ? (
        <div className="bg-slate-50 dark:bg-muted/50 border border-dashed border-slate-300 dark:border-border rounded-md p-6 text-center space-y-1">
          <p className="text-sm font-black text-slate-700 dark:text-card-foreground">No fights recorded yet</p>
          <p className="text-xs font-semibold text-muted-foreground">
            Log matches from the Match Log form and they will appear here.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 dark:border-border rounded-md">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/70 dark:bg-muted/50 text-muted-foreground font-extrabold uppercase border-b border-slate-200 dark:border-border">
                <th className="p-2.5 pl-3">Date</th>
                <th className="p-2.5">Event</th>
                <th className="p-2.5">Class</th>
                <th className="p-2.5">Opponent</th>
                <th className="p-2.5">Breed</th>
                <th className="p-2.5">Location</th>
                <th className="p-2.5 text-center">Outcome</th>
                <th className="p-2.5 text-center">Post-Fight</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-border text-slate-600 dark:text-muted-foreground font-semibold">
              {fights.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/80 dark:hover:bg-muted/50 transition-colors">
                  <td className="p-2.5 pl-3 font-mono text-xs text-muted-foreground">{m.date || '—'}</td>
                  <td className="p-2.5">
                    <span className="bg-slate-100 dark:bg-muted border border-slate-200 dark:border-border text-slate-700 dark:text-card-foreground font-bold px-2 py-0.5 rounded-full">
                      {m.event_type || m.type || '—'}
                    </span>
                  </td>
                  <td className="p-2.5">{m.age_category || '—'}</td>
                  <td className="p-2.5 font-bold text-slate-800 dark:text-card-foreground">{m.opponent || '—'}</td>
                  <td className="p-2.5">{m.opponent_breed || '—'}</td>
                  <td className="p-2.5">{m.location || '—'}</td>
                  <td className="p-2.5 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase border ${outcomeClass(m.outcome)}`}>
                      {m.outcome || '—'}
                    </span>
                  </td>
                  <td className="p-2.5 text-center">{m.post_fight_condition || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
