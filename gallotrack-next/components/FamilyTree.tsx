import React, { useMemo, useState } from 'react';
import type { FowlRecord, MatchRecord } from '@/lib/types';
import { Swords, ChevronDown } from 'lucide-react';
import {
  buildBreedingPairs,
  buildOffspringIndex,
  collectDescendants,
  filterBreedingPairs,
  nameKey,
  normalizeParentName,
  type BreedingPair,
  type DescendantNode,
} from '@/lib/family-tree';
import { formatBirdCodeForDisplay, compareBirdCodesNatural, offspringBase } from '@/lib/bird-code';
import {
  buildChickenMatchStatsMap,
  combineWinRates,
  computeWinRate,
  type WinRateStats,
} from '@/lib/win-rate';
import WinRatePill from '@/components/match/WinRatePill';
import ChickenIcon from '@/components/ChickenIcon';
import { getBreedingClassification } from '@/lib/breeding-classification';
import { sexLabel } from '@/lib/helpers';
import {
  classifyPairingRelatedness,
  getOffspringParentageRelatedness,
} from '@/lib/relatedness-classification';
import RelatednessBadge from '@/components/RelatednessBadge';

type Depth = 1 | 2 | 3;

const DEPTH_LABEL: Record<Depth, string> = {
  1: 'Offspring',
  2: '+ Grandchildren',
  3: '+ Great-grandchildren',
};

const STATUS_DOT: Record<string, string> = {
  Active: 'bg-emerald-500',
  Archived: 'bg-amber-400',
  Deceased: 'bg-rose-400',
};

const isMale = (f?: FowlRecord | null) => {
  const g = (f?.gender || '').toLowerCase();
  return g === 'rooster' || g === 'male';
};

function ParentChip({
  roleLabel,
  name,
  fowl,
  codes,
  onPick,
  fowls = [],
}: {
  roleLabel: 'Sire' | 'Dam';
  name: string;
  fowl?: FowlRecord;
  codes: Map<string, string>;
  onPick?: (f: FowlRecord) => void;
  fowls?: FowlRecord[];
}) {
  const accent =
    roleLabel === 'Sire'
      ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-400'
      : 'bg-pink-50 dark:bg-pink-950/40 border-pink-200 dark:border-pink-800 text-pink-700 dark:text-pink-400';
  const code = fowl ? formatBirdCodeForDisplay(codes.get(String(fowl.id)) || '') : '';
  const classification = fowl ? getBreedingClassification(fowl, fowls) : null;
  const displayBreed =
    classification?.type === 'Crossbred' ? classification.derivedBreed : fowl?.breed;

  return (
    <button
      type="button"
      onClick={() => fowl && onPick?.(fowl)}
      disabled={!fowl}
      className={`flex min-w-0 items-center gap-2.5 rounded-2xl border px-3.5 py-2 text-left transition-all sm:min-w-[170px] ${
        accent
      } ${fowl ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md' : 'cursor-default opacity-90'}`}
    >
      <ChickenIcon className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-black tracking-widest uppercase">{roleLabel}</span>
        <span className="text-card-foreground block truncate text-xs font-black">{name}</span>
        {displayBreed && (
          <span
            className="text-muted-foreground block truncate text-xs font-bold"
            title={classification?.sourceLabel}
          >
            {displayBreed}
            {(classification?.compositionSource === 'assumed' ||
              classification?.basedOnAssumed) && (
              <span className="ml-1 font-mono text-xs opacity-75" aria-label="Assumed lineage">
                ~
              </span>
            )}
          </span>
        )}
        {!fowl && (
          <span className="text-muted-foreground block text-xs font-bold">Not in registry</span>
        )}
      </span>
      {code && (
        <span className="bg-card/80 shrink-0 rounded border border-current/20 px-1.5 py-0.5 font-mono text-xs font-black">
          {code}
        </span>
      )}
    </button>
  );
}

function OffspringNode({
  node,
  depth,
  maxDepth,
  codes,
  onPick,
  onShowFights,
  matchStatsMap,
  fowls = [],
}: {
  node: DescendantNode;
  depth: number;
  maxDepth: Depth;
  codes: Map<string, string>;
  onPick?: (f: FowlRecord) => void;
  onShowFights?: (f: FowlRecord) => void;
  matchStatsMap: Map<string, WinRateStats & { matches: MatchRecord[] }>;
  fowls?: FowlRecord[];
}) {
  const fowl = node.fowl;
  const code = formatBirdCodeForDisplay(codes.get(String(fowl.id)) || '');
  const kids = depth < maxDepth ? node.children : [];
  const totalKids = node.children.length;
  const stats = matchStatsMap.get(fowl.name.trim().toLowerCase()) || computeWinRate(0, 0);
  const classification = getBreedingClassification(fowl, fowls);
  const displayBreed =
    classification.type === 'Crossbred' ? classification.derivedBreed : fowl.breed;
  const parentage = getOffspringParentageRelatedness(fowl, fowls);
  const sex = sexLabel(fowl);

  return (
    <div className="gt-kid">
      <div className="group bg-card border-border flex w-full items-stretch gap-1.5 rounded-2xl border px-3.5 py-2.5 shadow-sm transition-all hover:border-emerald-400 hover:shadow-md dark:hover:border-emerald-600">
        <button
          type="button"
          onClick={() => onPick?.(fowl)}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
        >
          <span
            className={`h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_DOT[fowl.status] || 'bg-muted-foreground'}`}
            title={fowl.status}
          ></span>
          {code && (
            <span className="shrink-0 rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 font-mono text-xs font-black text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
              {code}
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="text-card-foreground block truncate text-xs font-black group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
              {fowl.name}
            </span>
            <span className="text-muted-foreground block truncate text-xs font-semibold">
              <span
                className={
                  sex === 'Cock'
                    ? 'text-sky-600 dark:text-sky-400'
                    : sex === 'Hen'
                    ? 'text-pink-600 dark:text-pink-400'
                    : 'text-muted-foreground'
                }
              >
                {sex === 'Cock' ? '♂' : sex === 'Hen' ? '♀' : ''} {sex}
              </span>{' '}
              · {displayBreed || '—'}
              {(classification.compositionSource === 'assumed' ||
                classification.basedOnAssumed) && (
                <span
                  className="ml-1 font-mono text-xs opacity-75"
                  title={classification.sourceLabel}
                  aria-label="Assumed lineage"
                >
                  ~
                </span>
              )}
              {fowl.age ? ` · ${fowl.age}` : ''}
            </span>
          </span>
          <WinRatePill
            wins={stats.wins}
            losses={stats.losses}
            draws={stats.draws}
            stats={stats}
            className="shrink-0"
          />
          {(parentage.type === 'close' || parentage.type === 'line') && (
            <RelatednessBadge classification={parentage} compact />
          )}
          {totalKids > 0 && (
            <span className="bg-muted text-muted-foreground border-border shrink-0 rounded-full border px-2 py-0.5 text-xs font-black">
              {totalKids} {totalKids === 1 ? 'child' : 'children'}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => onShowFights?.(fowl)}
          aria-label={`View all fights for ${fowl.name}`}
          title="View all fights"
          className="text-muted-foreground border-border flex shrink-0 cursor-pointer items-center gap-1 self-center rounded-xl border px-2 py-1.5 text-xs font-black tracking-wider uppercase transition-colors hover:border-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-400"
        >
          <Swords className="h-3 w-3" />
          Fights
        </button>
      </div>

      {kids.length > 0 && (
        <div className="gt-kids">
          {kids.map((child) => (
            <OffspringNode
              key={child.fowl.id}
              node={child}
              depth={depth + 1}
              maxDepth={maxDepth}
              codes={codes}
              onPick={onPick}
              onShowFights={onShowFights}
              matchStatsMap={matchStatsMap}
              fowls={fowls}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PairTree({
  pair,
  codes,
  byName,
  index,
  maxDepth,
  collapsed,
  onToggleCollapse,
  onPick,
  onShowFights,
  matchStatsMap,
  fowls = [],
}: {
  pair: BreedingPair;
  codes: Map<string, string>;
  byName: Map<string, FowlRecord>;
  index: Map<string, FowlRecord[]>;
  maxDepth: Depth;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onPick?: (f: FowlRecord) => void;
  onShowFights?: (f: FowlRecord) => void;
  matchStatsMap: Map<string, WinRateStats & { matches: MatchRecord[] }>;
  fowls?: FowlRecord[];
}) {
  const sireFowl = byName.get(nameKey(pair.sire));
  const damFowl = byName.get(nameKey(pair.dam));

  const [isTotalExpanded, setIsTotalExpanded] = useState(false);

  const sortMembersByCode = (members: FowlRecord[]) =>
    [...members].sort((a, b) => {
      const sa = matchStatsMap.get(a.name.trim().toLowerCase());
      const sb = matchStatsMap.get(b.name.trim().toLowerCase());
      const foughtA = Boolean(sa && sa.decided > 0);
      const foughtB = Boolean(sb && sb.decided > 0);
      if (foughtA !== foughtB) return foughtA ? -1 : 1;
      if (foughtA && foughtB && sa && sb) {
        const rateA = sa.winRate ?? 0;
        const rateB = sb.winRate ?? 0;
        if (rateB !== rateA) return rateB - rateA;
        if (sb.decided !== sa.decided) return sb.decided - sa.decided;
        if (sb.wins !== sa.wins) return sb.wins - sa.wins;
      }
      const codeA = a.birth_code || a.chicken_code || a.bird_code || codes.get(String(a.id)) || '';
      const codeB = b.birth_code || b.chicken_code || b.bird_code || codes.get(String(b.id)) || '';
      if (codeA && codeB) return compareBirdCodesNatural(codeA, codeB);
      if (codeA) return -1;
      if (codeB) return 1;
      return (
        a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }) ||
        a.id - b.id
      );
    });

  const roosters = sortMembersByCode(pair.members.filter((m) => isMale(m)));
  const hens = sortMembersByCode(pair.members.filter((m) => !isMale(m)));

  const foughtCount = pair.members.filter((m) => {
    const s = matchStatsMap.get(m.name.trim().toLowerCase());
    return s && s.total > 0;
  }).length;
  const pairTotalStats = combineWinRates(
    pair.members.map(
      (m) =>
        matchStatsMap.get(m.name.trim().toLowerCase()) || {
          wins: 0,
          losses: 0,
          draws: 0,
        },
    ),
  );

  const sireCode = sireFowl ? codes.get(String(sireFowl.id)) || '' : '';
  const damCode = damFowl ? codes.get(String(damFowl.id)) || '' : '';
  const pairCode = offspringBase(sireCode, damCode);
  const relatedness = useMemo(
    () => classifyPairingRelatedness(sireFowl, damFowl, fowls),
    [sireFowl, damFowl, fowls],
  );

  return (
    <div className="bg-card border-border overflow-hidden rounded-3xl border shadow-sm">
      <div className="flex flex-wrap items-start gap-3 px-5 pt-5 pb-0">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <ParentChip
            roleLabel="Sire"
            name={pair.sire}
            fowl={sireFowl}
            codes={codes}
            onPick={onPick}
            fowls={fowls}
          />
          <span className="text-muted-foreground text-base leading-none font-black">×</span>
          <ParentChip
            roleLabel="Dam"
            name={pair.dam}
            fowl={damFowl}
            codes={codes}
            onPick={onPick}
            fowls={fowls}
          />
          {pairCode && (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-mono text-xs font-black tracking-wider text-emerald-700 uppercase dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400">
              pair {pairCode}
            </span>
          )}
          <RelatednessBadge classification={relatedness} compact />
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-xs font-bold">
            {pair.members.length} offspring · {roosters.length} male · {hens.length} female
          </span>
          {foughtCount > 0 ? (
            <WinRatePill
              wins={pairTotalStats.wins}
              losses={pairTotalStats.losses}
              draws={pairTotalStats.draws}
              stats={pairTotalStats}
            />
          ) : (
            <span className="text-muted-foreground/60 text-xs font-bold">No fights</span>
          )}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="border-border hover:bg-muted cursor-pointer rounded-xl border px-2.5 py-1.5 text-xs font-black text-emerald-600 transition-colors dark:text-emerald-400"
          >
            {collapsed ? 'Expand' : 'Collapse'}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="space-y-4 px-5 pt-4 pb-5">
          {roosters.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-black tracking-widest text-sky-700 uppercase dark:text-sky-400">
                ♂ Cocks ({roosters.length})
              </p>
              <div className="gt-kids">
                {roosters.map((member) => (
                  <OffspringNode
                    key={member.id}
                    node={{
                      fowl: member,
                      children: collectDescendants(member, index, maxDepth - 1),
                    }}
                    depth={1}
                    maxDepth={maxDepth}
                    codes={codes}
                    onPick={onPick}
                    onShowFights={onShowFights}
                    matchStatsMap={matchStatsMap}
                    fowls={fowls}
                  />
                ))}
              </div>
            </div>
          )}
          {hens.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-black tracking-widest text-pink-700 uppercase dark:text-pink-400">
                ♀ Hens ({hens.length})
              </p>
              <div className="gt-kids">
                {hens.map((member) => (
                  <OffspringNode
                    key={member.id}
                    node={{
                      fowl: member,
                      children: collectDescendants(member, index, maxDepth - 1),
                    }}
                    depth={1}
                    maxDepth={maxDepth}
                    codes={codes}
                    onPick={onPick}
                    onShowFights={onShowFights}
                    matchStatsMap={matchStatsMap}
                    fowls={fowls}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom Family Total Row (expandable to show contributors) */}
      <div
        role={foughtCount > 0 ? 'button' : undefined}
        tabIndex={foughtCount > 0 ? 0 : undefined}
        aria-expanded={foughtCount > 0 ? isTotalExpanded : undefined}
        onClick={foughtCount > 0 ? () => setIsTotalExpanded(!isTotalExpanded) : undefined}
        onKeyDown={
          foughtCount > 0
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setIsTotalExpanded(!isTotalExpanded);
                }
              }
            : undefined
        }
        title="Total wins ÷ total decided matches. Draws excluded."
        className={`bg-muted/30 border-border flex items-center justify-between gap-2 border-t px-5 py-3 text-xs font-bold transition-colors select-none ${
          foughtCount > 0
            ? 'hover:bg-muted/50 cursor-pointer focus:ring-1 focus:ring-emerald-500 focus:outline-none'
            : ''
        }`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground tracking-wider uppercase">Family total</span>
          {foughtCount > 0 && (
            <>
              <span className="text-muted-foreground/60 select-none">·</span>
              <span className="text-foreground">
                {foughtCount} of {pair.members.length} offspring have fought · {pairTotalStats.wins}
                W-{pairTotalStats.losses}L · {pairTotalStats.winRate}%
              </span>
            </>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {foughtCount > 0 ? (
            <>
              <WinRatePill
                wins={pairTotalStats.wins}
                losses={pairTotalStats.losses}
                draws={pairTotalStats.draws}
                stats={pairTotalStats}
              />
              <ChevronDown
                className={`text-muted-foreground h-3.5 w-3.5 transition-transform duration-200 ${
                  isTotalExpanded ? 'rotate-180' : ''
                }`}
              />
            </>
          ) : (
            <span className="text-muted-foreground/60 font-semibold">No fights recorded yet</span>
          )}
        </div>
      </div>

      {/* Expandable Breakdown of Contributor Chickens */}
      {isTotalExpanded && foughtCount > 0 && (
        <div className="bg-muted/50 border-border/60 animate-fadeIn space-y-1.5 border-t px-5 py-2.5 text-xs">
          <p className="text-muted-foreground mb-1 text-xs font-semibold">
            Contributors ({foughtCount} of {pair.members.length}):
          </p>
          <div className="flex flex-wrap gap-2">
            {pair.members
              .filter((m) => {
                const s = matchStatsMap.get(m.name.trim().toLowerCase());
                return s && s.total > 0;
              })
              .sort((a, b) => {
                const sa = matchStatsMap.get(a.name.trim().toLowerCase());
                const sb = matchStatsMap.get(b.name.trim().toLowerCase());
                if ((sb?.winRate ?? 0) !== (sa?.winRate ?? 0))
                  return (sb?.winRate ?? 0) - (sa?.winRate ?? 0);
                if ((sb?.decided ?? 0) !== (sa?.decided ?? 0))
                  return (sb?.decided ?? 0) - (sa?.decided ?? 0);
                const codeA =
                  a.birth_code || a.chicken_code || a.bird_code || codes.get(String(a.id)) || '';
                const codeB =
                  b.birth_code || b.chicken_code || b.bird_code || codes.get(String(b.id)) || '';
                if (codeA && codeB) return compareBirdCodesNatural(codeA, codeB);
                return a.name.localeCompare(b.name);
              })
              .map((m) => {
                const cs = matchStatsMap.get(m.name.trim().toLowerCase())!;
                const code =
                  m.birth_code || m.chicken_code || m.bird_code || codes.get(String(m.id)) || '';
                return (
                  <div
                    key={m.id}
                    className="bg-card border-border text-card-foreground inline-flex items-center gap-1.5 rounded border px-2.5 py-1 font-bold shadow-2xs"
                  >
                    {code && (
                      <span className="text-muted-foreground font-mono text-xs">
                        [{formatBirdCodeForDisplay(code)}]
                      </span>
                    )}
                    <span>{m.name}</span>
                    <span className="text-muted-foreground select-none">·</span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400">
                      {cs.wins}W-{cs.losses}L{cs.draws > 0 ? `-${cs.draws}D` : ''}
                    </span>
                    <span className="text-muted-foreground/60 select-none">·</span>
                    <span className="text-muted-foreground">{cs.winRate}%</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

type Props = {
  fowls: FowlRecord[];
  codes: Map<string, string>;
  query?: string;
  onPick?: (f: FowlRecord) => void;
  onShowFights?: (f: FowlRecord) => void;
  sortBy?: 'most' | 'name' | 'newest';
  collapsedKeys?: Set<string>;
  onToggleCollapse?: (key: string) => void;
  matchHistory?: MatchRecord[];
};

/**
 * Family tree: sire + dam (breeding pair) on top, offspring branching below,
 * optionally continuing to grandchildren and great-grandchildren.
 *
 *   Sire 1 + Dam A
 *    ├── Offspring 1A1
 *    │    └── Grandchild
 *    ├── Offspring 1A2
 *    └── Offspring 1A3
 */
export default function FamilyTree({
  fowls,
  codes,
  query = '',
  onPick,
  onShowFights,
  sortBy = 'most',
  collapsedKeys,
  onToggleCollapse,
  matchHistory = [],
}: Props) {
  const [maxDepth, setMaxDepth] = useState<Depth>(2);
  const [internalCollapsed, setInternalCollapsed] = useState<Set<string>>(new Set());

  const matchStatsMap = useMemo(
    () => buildChickenMatchStatsMap(matchHistory, fowls),
    [matchHistory, fowls],
  );

  const collapsed = collapsedKeys !== undefined ? collapsedKeys : internalCollapsed;
  const toggleCollapse =
    onToggleCollapse !== undefined
      ? onToggleCollapse
      : (key: string) => {
          setInternalCollapsed((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
          });
        };

  const byName = useMemo(() => {
    const m = new Map<string, FowlRecord>();
    fowls.forEach((f) => {
      const k = nameKey(f.name);
      if (k && !m.has(k)) m.set(k, f);
    });
    return m;
  }, [fowls]);

  const index = useMemo(() => buildOffspringIndex(fowls), [fowls]);
  const pairs = useMemo(() => {
    const list = filterBreedingPairs(buildBreedingPairs(fowls), query);
    if (sortBy === 'name') {
      return [...list].sort((a, b) => `${a.sire} ${a.dam}`.localeCompare(`${b.sire} ${b.dam}`));
    }
    if (sortBy === 'newest') {
      return [...list].sort((a, b) => {
        const maxA = a.members.length ? Math.max(...a.members.map((m) => m.id)) : 0;
        const maxB = b.members.length ? Math.max(...b.members.map((m) => m.id)) : 0;
        return maxB - maxA;
      });
    }
    return list;
  }, [fowls, query, sortBy]);

  if (fowls.length === 0) {
    return (
      <div className="bg-card border-border space-y-2 rounded-3xl border p-10 text-center shadow-sm">
        <p className="text-card-foreground text-sm font-extrabold">No Chickens Yet</p>
        <p className="text-muted-foreground text-xs font-medium">
          Encode chickens with Sire and Dam to build the family tree.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="bg-card border-border flex flex-col gap-4 rounded-3xl border p-4 shadow-sm sm:p-5 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black tracking-widest text-emerald-700 uppercase dark:text-emerald-400">
            🌳 Family Tree — Sire + Dam → Offspring
          </p>
          <p className="text-muted-foreground text-xs font-semibold">
            Each pair shows the sire, dam, and their offspring down to the selected generation.
            {normalizeParentName(query) && ' Searching for: "' + query + '"'}
          </p>
        </div>
        <div className="bg-muted/60 border-border flex shrink-0 items-center gap-1.5 rounded-2xl border p-1.5">
          {([1, 2, 3] as Depth[]).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setMaxDepth(d)}
              className={`cursor-pointer rounded-xl px-3 py-2 text-xs font-black whitespace-nowrap transition-all ${
                maxDepth === d
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {DEPTH_LABEL[d]}
            </button>
          ))}
        </div>
      </div>

      {pairs.length === 0 ? (
        <div className="bg-card border-border space-y-2 rounded-3xl border p-10 text-center shadow-sm">
          <div className="bg-muted text-muted-foreground mx-auto flex h-12 w-12 items-center justify-center rounded-full">
            <ChickenIcon className="h-6 w-6" />
          </div>
          <h3 className="text-card-foreground text-sm font-extrabold">No Breeding Pairs Found</h3>
          <p className="text-muted-foreground mx-auto max-w-sm text-xs font-medium">
            {normalizeParentName(query)
              ? 'No breeding pair or chicken matches your search.'
              : 'Encode chickens with both Sire and Dam names to see the sire + dam → offspring family tree.'}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {pairs.map((pair) => (
            <PairTree
              key={pair.key}
              pair={pair}
              codes={codes}
              byName={byName}
              index={index}
              maxDepth={maxDepth}
              collapsed={collapsed.has(pair.key)}
              onToggleCollapse={() => toggleCollapse(pair.key)}
              onPick={onPick}
              onShowFights={onShowFights}
              matchStatsMap={matchStatsMap}
              fowls={fowls}
            />
          ))}
        </div>
      )}
    </div>
  );
}
