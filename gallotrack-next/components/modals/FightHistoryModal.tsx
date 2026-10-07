'use client';
import React from 'react';
import { Swords, Feather, Download, Printer } from 'lucide-react';
import { Modal } from '@/components/ui';
import MatchMediaButtons from '@/components/match/MatchMediaButtons';
import { useUI } from '@/lib/contexts/ui-context';
import { useFowl } from '@/lib/contexts/fowl-context';
import { resolveBirdCodes, formatBirdCodeForDisplay } from '@/lib/bird-code';
import { genderLabel } from '@/lib/helpers';
import { videosFor, photosFor, postersFor } from '@/lib/services/media-service';
import { downloadCsv, printReport } from '@/lib/report-export';

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
  const { matchHistory, fowls, matchMedia } = useFowl();

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

  const reportColumns = ['Date', 'Our Chicken', 'Opponent', 'Our Breed', 'Opponent Breed', 'Event', 'Outcome', 'Location', 'Post-Fight Condition', 'Notes'];
  const reportRows = fights.map((m) => [
    m.date,
    m.entry_name || bird.name,
    m.opponent,
    m.breed,
    m.opponent_breed,
    [m.event_type, m.type].filter(Boolean).join(' · '),
    m.outcome,
    m.location,
    m.post_fight_condition,
    [m.side, m.notes].filter(Boolean).join(' · '),
  ]);

  const fileStem = `${bird.name || 'fowl'}-fight-history`.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();

  const exportCsv = () => downloadCsv(fileStem, [reportColumns, ...reportRows]);

  const exportPrintable = () =>
    printReport({
      title: `Fight History — ${bird.name}`,
      meta: [code, bird.breed || '', genderLabel(bird.gender) || '', bird.status || ''].filter(Boolean).join(' · '),
      sections: [
        { heading: 'Performance Summary', fields: summary.map((s) => ({ label: s.label, value: s.value })) },
        { heading: 'Fight Log', table: { columns: reportColumns, rows: reportRows } },
      ],
    });

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
          {bird.breed || '—'} · {genderLabel(bird.gender) || '—'}
          {bird.status ? ` · ${bird.status}` : ''}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {summary.map((s) => (
          <div key={s.label} className="bg-slate-50 dark:bg-muted/50 border border-slate-200/70 dark:border-border rounded-md p-2.5 text-center">
            <span className="block text-xs font-black uppercase tracking-widest text-muted-foreground">{s.label}</span>
            <strong className={`block text-lg font-black ${s.tone}`}>{s.value}</strong>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Fight log</p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={exportCsv}
            disabled={fights.length === 0}
            className="inline-flex items-center gap-1.5 rounded border border-border bg-card text-card-foreground px-2.5 py-1.5 text-xs font-black hover:bg-muted transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" /> Export CSV
          </button>
          <button
            type="button"
            onClick={exportPrintable}
            disabled={fights.length === 0}
            className="inline-flex items-center gap-1.5 rounded border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 px-2.5 py-1.5 text-xs font-black hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Printer className="w-3.5 h-3.5" aria-hidden="true" /> Print / PDF
          </button>
        </div>
      </div>

      {fights.length === 0 ? (
        <div className="bg-slate-50 dark:bg-muted/50 border border-dashed border-slate-300 dark:border-border rounded-md p-6 text-center space-y-1">
          <p className="text-sm font-black text-slate-700 dark:text-card-foreground">No fights recorded yet</p>
          <p className="text-xs font-semibold text-muted-foreground">
            Log matches from the Match Log form and they will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
          {fights.map((m) => {
            const videos = videosFor(matchMedia, m.id);
            const photos = photosFor(matchMedia, m.id);
            return (
              <div key={m.id} className="rounded-md border border-slate-200 dark:border-border bg-slate-50/70 dark:bg-card p-4 space-y-2.5">
                {/* Header: Our Chicken vs Opponent */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Feather className="w-4 h-4 text-success shrink-0" />
                    <span className="font-black text-sm text-card-foreground truncate">{m.entry_name || bird.name}</span>
                    <span className="font-black text-xs text-muted-foreground">vs</span>
                    <span className="font-black text-sm text-card-foreground truncate">{m.opponent || 'Anonymous Opponent'}</span>
                    {m.opponent_photo_url && (
                      <img src={m.opponent_photo_url} alt="Opponent" className="h-7 w-7 rounded-full border border-border object-cover shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase border ${outcomeClass(m.outcome)}`}>
                      {m.outcome || '—'}
                    </span>
                    <span className="text-xs font-bold text-muted-foreground font-mono">{m.date || '—'}</span>
                  </div>
                </div>

                {/* Details in fixed order: bloodline/breed → hatch → condition → context */}
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div className="flex gap-2">
                    <dt className="font-black text-muted-foreground uppercase w-24 shrink-0">Breed</dt>
                    <dd className="font-bold text-foreground">{m.breed || '—'}{m.opponent_breed ? ` vs ${m.opponent_breed}` : ''}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="font-black text-muted-foreground uppercase w-24 shrink-0">Bloodline</dt>
                    <dd className="font-bold text-foreground">{bird.breed ? `${bird.breed} line` : '—'}{m.opponent_bloodline ? ` vs ${m.opponent_bloodline}` : ''}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="font-black text-muted-foreground uppercase w-24 shrink-0">Hatch</dt>
                    <dd className="font-bold text-foreground">{bird.birthdate || '—'}{m.opponent_birthdate ? ` vs ${m.opponent_birthdate}` : ''}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="font-black text-muted-foreground uppercase w-24 shrink-0">Condition</dt>
                    <dd className="font-bold text-foreground">{m.post_fight_condition || '—'}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="font-black text-muted-foreground uppercase w-24 shrink-0">Event</dt>
                    <dd className="font-bold text-foreground">
                      {[m.event_type, m.type].filter(Boolean).join(' · ') || '—'}
                      {m.age_category ? ` · ${m.age_category}` : ''}
                    </dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="font-black text-muted-foreground uppercase w-24 shrink-0">Location</dt>
                    <dd className="font-bold text-foreground">{m.location || '—'}</dd>
                  </div>
                  {(m.side || m.notes) && (
                    <div className="flex gap-2 sm:col-span-2">
                      <dt className="font-black text-muted-foreground uppercase w-24 shrink-0">Notes</dt>
                      <dd className="font-bold text-foreground">{[m.side, m.notes].filter(Boolean).join(' · ')}</dd>
                    </div>
                  )}
                </dl>

                {/* Media + actions */}
                <div className="flex justify-center pt-1 border-t border-slate-200 dark:border-border">
                  <MatchMediaButtons
                    match={m}
                    videos={videos}
                    photos={photos}
                    posters={postersFor(matchMedia, m.id)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
