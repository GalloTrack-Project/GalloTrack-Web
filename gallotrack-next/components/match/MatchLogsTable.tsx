'use client';
import React from 'react';
import { Unlink } from 'lucide-react';
import ChickenIcon from '@/components/ChickenIcon';
import ChickenPhoto from '@/components/ChickenPhoto';
import MatchLogsRecordBadge from '@/components/match/MatchLogsRecordBadge';
import MatchMediaButtons from '@/components/match/MatchMediaButtons';
import MatchRecordForm from '@/components/match/MatchRecordForm';
import ChickenEntryName from '@/components/match/ChickenEntryName';
import LinkChickenModal from '@/components/match/LinkChickenModal';
import HistoricalGroupModal from '@/components/match/HistoricalGroupModal';
import { groupUnlinkedMatches, historicalGroupKey, type HistoricalMatchGroup } from '@/lib/historical-matches';
import { Modal } from '@/components/ui';
import { formatBirdCodeForDisplay } from '@/lib/bird-code';
import { useFowl } from '@/lib/contexts/fowl-context';
import { useUI } from '@/lib/contexts/ui-context';
import { useT } from '@/lib/i18n';
import { photosFor, postersFor, videosFor } from '@/lib/services/media-service';
import { linkHistoricalMatchesToFowl, unlinkHistoricalMatch } from '@/lib/services/match-link-service';
import { fetchFowls } from '@/lib/services/fowl-service';
import { canFight, sexLabel } from '@/lib/helpers';
import type { FowlRecord, MatchRecord } from '@/lib/types';
import { buildChickenMatchStatsMap, getChickenMatchStats } from '@/lib/win-rate';

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
  const t = useT();
  const ui = useUI();
  const { fowls, matchHistory, matchMedia, birdCodes, fetchDatabaseResources } = useFowl();
  const rows = matches ?? matchHistory;
  const [editingMatch, setEditingMatch] = React.useState<MatchRecord | null>(null);
  const [linkingMatch, setLinkingMatch] = React.useState<MatchRecord | null>(null);
  const [historicalGroup, setHistoricalGroup] = React.useState<HistoricalMatchGroup | null>(null);
  const [linkGroup, setLinkGroup] = React.useState<HistoricalMatchGroup | null>(null);
  const [linkInitialTab, setLinkInitialTab] = React.useState<'link' | 'create'>('link');
  const [unlinkingMatch, setUnlinkingMatch] = React.useState<MatchRecord | null>(null);
  const [unlinking, setUnlinking] = React.useState(false);

  const fowlById = React.useMemo(() => {
    const m = new Map<number, FowlRecord>();
    fowls.forEach((f) => m.set(f.id, f));
    return m;
  }, [fowls]);

  // Lifetime records come from ALL matches, never from the (possibly filtered)
  // rows passed to this table.
  const matchStats = React.useMemo(
    () => buildChickenMatchStatsMap(matchHistory, fowls),
    [matchHistory, fowls],
  );
  const unlinkedGroups = React.useMemo(
    () => groupUnlinkedMatches(rows),
    [rows],
  );

  const handleLinkChicken = async (
    fowl: FowlRecord,
    matches: MatchRecord[],
    options: { updateRecordedName: boolean },
  ): Promise<boolean> => {
    if (!canFight(fowl) || sexLabel(fowl) !== 'Cock') return false;
    const result = await linkHistoricalMatchesToFowl({
      matches,
      fowlId: fowl.id,
      fowlName: fowl.name,
      fowlBreed: fowl.breed || 'Unknown',
      updateRecordedName: options.updateRecordedName,
    });
    if (result.error) return false;
    await fetchDatabaseResources();
    return true;
  };

  const handleCreateAndLink = async (
    fowlId: number,
    matches: MatchRecord[],
    options: { updateRecordedName: boolean },
  ): Promise<boolean> => {
    const fresh = await fetchFowls();
    const created = fresh.find((fowl) => fowl.id === fowlId);
    if (!created) return false;
    return handleLinkChicken(created, matches, options);
  };

  const handleUnlink = async (match: MatchRecord) => {
    if (unlinking) return;
    setUnlinking(true);
    const result = await unlinkHistoricalMatch(match);
    if (!result.error) {
      await fetchDatabaseResources();
      setUnlinkingMatch(null);
    }
    setUnlinking(false);
  };

  return (
    <>
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
              const recordStats = fowl ? getChickenMatchStats(matchStats, fowl) : undefined;
              const openFowlInfo = fowl
                ? (event: React.MouseEvent) => {
                    event.stopPropagation();
                    ui.setSelectedFowlForDetails(fowl);
                  }
                : undefined;
              return (
                <tr
                  key={log.id}
                  className="hover:bg-muted/30 group transition-colors duration-150"
                >
                  <td className="text-muted-foreground p-2.5 pl-3 font-mono whitespace-nowrap lg:p-3 lg:pl-4">
                    {log.date}
                  </td>
                  <td className="min-w-0 p-2.5 lg:p-3">
                    {openFowlInfo ? (
                      <button
                        type="button"
                        onClick={openFowlInfo}
                        aria-label={`View info for ${log.entry_name}`}
                        title={`View info for ${log.entry_name}`}
                        className="focus-visible:ring-ring flex w-full min-w-0 cursor-pointer flex-col items-start rounded-md text-left focus-visible:ring-2 focus-visible:outline-none"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <ChickenPhoto
                            name={fowl!.name}
                            code={code}
                            imageUrl={fowl!.image_url}
                            photoPath={fowl!.photo_path}
                            photoThumbPath={fowl!.photo_thumb_path}
                            size={32}
                            className="border border-emerald-500/20"
                            fallback={<ChickenIcon className="text-success h-3.5 w-3.5" />}
                          />
                          {code && (
                            <span className="text-success rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-sm font-black uppercase">
                              [{formatBirdCodeForDisplay(code)}]
                            </span>
                          )}
                          <ChickenEntryName name={log.entry_name} variant="linked" />
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
                      <button
                        type="button"
                        onClick={() => {
                          const group = unlinkedGroups.find(
                            (candidate) =>
                              candidate.key ===
                              historicalGroupKey(log.entry_name, log.breed || ''),
                          );
                          if (group) setHistoricalGroup(group);
                        }}
                        aria-label={`View historical analytics for ${log.entry_name}`}
                        title={`View historical analytics for ${log.entry_name}`}
                        className="focus-visible:ring-ring flex w-full min-w-0 cursor-pointer flex-col items-start rounded-md text-left focus-visible:ring-2 focus-visible:outline-none"
                      >
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <div className="border-border bg-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-full border">
                            <ChickenIcon className="text-muted-foreground h-3.5 w-3.5" />
                          </div>
                          <ChickenEntryName name={log.entry_name} variant="historical" />
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                          <span className="text-muted-foreground text-xs font-semibold">
                            {log.breed || '—'}
                          </span>
                          {log.age_category && (
                            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-xs font-bold whitespace-nowrap text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                              {log.age_category}
                            </span>
                          )}
                        </div>
                      </button>
                    )}
                    <MatchLogsRecordBadge
                      fowl={fowl}
                      stats={recordStats}
                      className="mt-1.5 inline-flex"
                    />
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
                      <span className="text-muted-foreground text-sm font-semibold">
                        Not recorded
                      </span>
                    )}
                  </td>
                  <td
                    className="bg-card sticky right-0 w-[15%] min-w-[160px] p-2.5 text-center lg:min-w-[120px] lg:p-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-center gap-1">
                      {!isOrphan && (
                        <button
                          type="button"
                          onClick={() => setUnlinkingMatch(log)}
                          aria-label={`Unlink chicken profile from ${log.entry_name}`}
                          title="Unlink from profile"
                          className="border-border bg-card text-muted-foreground hover:border-rose-400 hover:text-rose-700 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded border transition-colors"
                        >
                          <Unlink className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      )}
                      <MatchMediaButtons
                        match={log}
                        videos={videosFor(matchMedia, log.id, log)}
                        photos={photosFor(matchMedia, log.id, log)}
                        posters={postersFor(matchMedia, log.id, log)}
                        returnTo={returnTo}
                        onEdit={() => setEditingMatch(log)}
                      />
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
        </table>
      </div>
      {editingMatch && (
        <Modal
          open
          onClose={() => setEditingMatch(null)}
          title="Edit Match Record"
          description="Update the recorded details for this match."
          className="max-w-6xl"
        >
          <MatchRecordForm
            mode="edit"
            initialRecord={editingMatch}
            onSuccess={() => setEditingMatch(null)}
            onCancel={() => setEditingMatch(null)}
          />
        </Modal>
      )}

      {historicalGroup && (
        <HistoricalGroupModal
          group={historicalGroup}
          onClose={() => setHistoricalGroup(null)}
          onLinkRequest={(group) => {
            setHistoricalGroup(null);
            setLinkGroup(group);
            setLinkInitialTab('link');
            setLinkingMatch(group.matches[0] ?? null);
          }}
          onCreateRequest={(group) => {
            setHistoricalGroup(null);
            setLinkGroup(group);
            setLinkInitialTab('create');
            setLinkingMatch(group.matches[0] ?? null);
          }}
        />
      )}

      {linkingMatch && (
        <LinkChickenModal
          match={linkingMatch}
          fowls={fowls}
          birdCodes={birdCodes}
          statsMap={matchStats}
          historicalMatches={[]}
          forcedMatches={linkGroup?.matches}
          initialTab={linkInitialTab}
          showBulk={!linkGroup}
          onClose={() => {
            setLinkingMatch(null);
            setLinkGroup(null);
            setLinkInitialTab('link');
          }}
          onLink={async (fowl, matches, options) => {
            const ok = await handleLinkChicken(fowl, matches, options);
            if (ok) {
              setLinkingMatch(null);
              setLinkGroup(null);
            }
            return false;
          }}
          onCreateAndLink={async (fowlId, matches, options) => {
            const ok = await handleCreateAndLink(fowlId, matches, options);
            if (ok) {
              setLinkingMatch(null);
              setLinkGroup(null);
            }
            return false;
          }}
        />
      )}

      {unlinkingMatch && (
        <Modal
          open
          onClose={() => (unlinking ? undefined : setUnlinkingMatch(null))}
          title="Unlink chicken profile"
          description={`Remove the profile link from the match vs ${unlinkingMatch.opponent || 'opponent'}?`}
          className="max-w-md"
        >
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm font-semibold">
              The match will become a historical entry and stop counting toward the linked
              chicken&apos;s Overall record.
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setUnlinkingMatch(null)}
                disabled={unlinking}
                className="border-border bg-card text-foreground hover:bg-muted h-11 cursor-pointer rounded-md border px-4 text-sm font-black transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleUnlink(unlinkingMatch)}
                disabled={unlinking}
                className="inline-flex h-11 cursor-pointer items-center justify-center rounded-md bg-rose-600 px-5 text-sm font-black text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {unlinking ? 'Unlinking?' : 'Unlink'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
