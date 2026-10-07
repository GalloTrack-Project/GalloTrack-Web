'use client';
import React, { useMemo, useState } from 'react';
import type { FowlRecord } from '@/lib/types';
import { Swords } from 'lucide-react';
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
import { formatBirdCodeForDisplay } from '@/lib/bird-code';
import ChickenIcon from '@/components/ChickenIcon';

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
}: {
  roleLabel: 'Sire' | 'Dam';
  name: string;
  fowl?: FowlRecord;
  codes: Map<string, string>;
  onPick?: (f: FowlRecord) => void;
}) {
  const accent =
    roleLabel === 'Sire'
      ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-400'
      : 'bg-pink-50 dark:bg-pink-950/40 border-pink-200 dark:border-pink-800 text-pink-700 dark:text-pink-400';
  const code = fowl ? formatBirdCodeForDisplay(codes.get(String(fowl.id)) || '') : '';

  return (
    <button
      type="button"
      onClick={() => fowl && onPick?.(fowl)}
      disabled={!fowl}
      className={`flex items-center gap-2.5 border rounded-2xl px-3.5 py-2 min-w-0 sm:min-w-[170px] text-left transition-all ${
        accent
      } ${fowl ? 'hover:shadow-md hover:-translate-y-0.5 cursor-pointer' : 'cursor-default opacity-90'}`}
    >
      <ChickenIcon className="w-4 h-4 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-black uppercase tracking-widest">{roleLabel}</span>
        <span className="block text-xs font-black text-card-foreground truncate">{name}</span>
        {fowl?.breed && (
          <span className="block text-xs font-bold text-muted-foreground truncate">{fowl.breed}</span>
        )}
        {!fowl && (
          <span className="block text-xs font-bold text-muted-foreground">Not in registry</span>
        )}
      </span>
      {code && (
        <span className="text-xs font-mono font-black bg-card/80 border border-current/20 px-1.5 py-0.5 rounded shrink-0">
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
}: {
  node: DescendantNode;
  depth: number;
  maxDepth: Depth;
  codes: Map<string, string>;
  onPick?: (f: FowlRecord) => void;
  onShowFights?: (f: FowlRecord) => void;
}) {
  const fowl = node.fowl;
  const code = formatBirdCodeForDisplay(codes.get(String(fowl.id)) || '');
  const kids = depth < maxDepth ? node.children : [];
  const totalKids = node.children.length;

  return (
    <div className="gt-kid">
      <div className="group w-full bg-card border border-border rounded-2xl px-3.5 py-2.5 flex items-stretch gap-1.5 shadow-sm hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-md transition-all">
        <button
          type="button"
          onClick={() => onPick?.(fowl)}
          className="flex-1 flex items-center gap-3 text-left min-w-0 cursor-pointer"
        >
          <span
            className={`w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_DOT[fowl.status] || 'bg-muted-foreground'}`}
            title={fowl.status}
          ></span>
          {code && (
            <span className="text-xs font-mono font-black bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.5 rounded shrink-0">
              {code}
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-black text-card-foreground truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
              {fowl.name}
            </span>
            <span className="block text-xs font-semibold text-muted-foreground truncate">
              {isMale(fowl) ? '🐓 Sire' : '🐔 Dam'} · {fowl.breed || '—'}
              {fowl.age ? ` · ${fowl.age}` : ''}
            </span>
          </span>
          {totalKids > 0 && (
            <span className="text-xs font-black bg-muted text-muted-foreground border border-border px-2 py-0.5 rounded-full shrink-0">
              {totalKids} {totalKids === 1 ? 'child' : 'children'}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => onShowFights?.(fowl)}
          aria-label={`View all fights for ${fowl.name}`}
          title="View all fights"
          className="shrink-0 self-center flex items-center gap-1 text-xs font-black uppercase tracking-wider text-muted-foreground hover:text-emerald-700 dark:hover:text-emerald-400 border border-border hover:border-emerald-400 rounded-xl px-2 py-1.5 transition-colors cursor-pointer"
        >
          <Swords className="w-3 h-3" />
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
}) {
  const sireFowl = byName.get(nameKey(pair.sire));
  const damFowl = byName.get(nameKey(pair.dam));
  const roosters = pair.members.filter((m) => isMale(m));
  const hens = pair.members.filter((m) => !isMale(m));

  return (
    <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
      <div className="px-5 pt-5 pb-0 flex items-start gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
          <ParentChip roleLabel="Sire" name={pair.sire} fowl={sireFowl} codes={codes} onPick={onPick} />
          <span className="text-base font-black text-muted-foreground leading-none">+</span>
          <ParentChip roleLabel="Dam" name={pair.dam} fowl={damFowl} codes={codes} onPick={onPick} />
          <span className="text-xs font-black uppercase tracking-widest bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1.5 rounded-full">
            Breeding Pair
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-bold text-muted-foreground">
            {pair.members.length} offspring · {roosters.length} male · {hens.length} female
          </span>
          <button
            type="button"
            onClick={onToggleCollapse}
            className="text-xs font-black text-emerald-600 dark:text-emerald-400 border border-border rounded-xl px-2.5 py-1.5 hover:bg-muted transition-colors cursor-pointer"
          >
            {collapsed ? 'Expand' : 'Collapse'}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="px-5 pb-5 space-y-4">
          {roosters.length > 0 && (
            <div>
              <p className="text-xs font-black text-info dark:text-sky-400 uppercase tracking-widest mb-1.5">
                🐓 Sire · {roosters.length}
              </p>
              <div className="gt-kids">
                {roosters.map((member) => (
                  <OffspringNode
                    key={member.id}
                    node={{ fowl: member, children: collectDescendants(member, index, maxDepth - 1) }}
                    depth={1}
                    maxDepth={maxDepth}
                    codes={codes}
                    onPick={onPick}
                    onShowFights={onShowFights}
                  />
                ))}
              </div>
            </div>
          )}
          {hens.length > 0 && (
            <div>
              <p className="text-xs font-black text-pink uppercase tracking-widest mb-1.5">
                🐔 Dam · {hens.length}
              </p>
              <div className="gt-kids">
                {hens.map((member) => (
                  <OffspringNode
                    key={member.id}
                    node={{ fowl: member, children: collectDescendants(member, index, maxDepth - 1) }}
                    depth={1}
                    maxDepth={maxDepth}
                    codes={codes}
                    onPick={onPick}
                    onShowFights={onShowFights}
                  />
                ))}
              </div>
            </div>
          )}
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
}: Props) {
  const [maxDepth, setMaxDepth] = useState<Depth>(2);
  const [internalCollapsed, setInternalCollapsed] = useState<Set<string>>(new Set());

  const collapsed = collapsedKeys !== undefined ? collapsedKeys : internalCollapsed;
  const toggleCollapse = onToggleCollapse !== undefined
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
      <div className="bg-card p-10 text-center rounded-3xl border border-border shadow-sm space-y-2">
        <p className="text-sm font-extrabold text-card-foreground">No Chickens Yet</p>
        <p className="text-xs text-muted-foreground font-medium">
          Encode chickens with Sire and Dam to build the family tree.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="bg-card rounded-3xl border border-border shadow-sm p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">
            🌳 Family Tree — Sire + Dam → Offspring
          </p>
          <p className="text-xs text-muted-foreground font-semibold">
            Each pair shows the sire, dam, and their offspring down to the selected generation.
            {normalizeParentName(query) && ' Searching for: "' + query + '"'}
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-muted/60 border border-border rounded-2xl p-1.5 shrink-0">
          {([1, 2, 3] as Depth[]).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setMaxDepth(d)}
              className={`px-3 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer ${
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
        <div className="bg-card p-10 text-center rounded-3xl border border-border shadow-sm space-y-2">
          <div className="w-12 h-12 bg-muted text-muted-foreground rounded-full flex items-center justify-center mx-auto">
            <ChickenIcon className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-extrabold text-card-foreground">No Breeding Pairs Found</h3>
          <p className="text-xs text-muted-foreground font-medium max-w-sm mx-auto">
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
