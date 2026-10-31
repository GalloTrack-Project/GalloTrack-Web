'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  Link2,
  Maximize2,
  Minimize2,
  Minus,
  Search,
  Swords,
  User,
  X,
} from 'lucide-react';
import type { FowlRecord, MatchRecord } from '@/lib/types';
import { isMale, canFight, fightersOf, sexLabel } from '@/lib/helpers';
import { nameKey } from '@/lib/family-tree';
import {
  buildChickenMatchStatsMap,
  combineWinRates,
  computeWinRate,
  type WinRateStats,
} from '@/lib/win-rate';
import WinRatePill from '@/components/match/WinRatePill';
import {
  buildLineageIndex,
  buildLineageTopology,
  layoutLineageTopology,
  lineageBirdCode,
  pickDefaultRootId,
  type LineageDirection,
  type LineageLayoutNode,
  type LineageLayoutPair,
} from '@/lib/lineage-graph';

export interface LineageFlowProps {
  fowls: FowlRecord[];
  codes: Map<string, string>;
  matchHistory: MatchRecord[];
  query?: string;
  /** Shared toolbar order; keeps the family selector ordering consistent. */
  sortBy?: 'most' | 'name' | 'newest';
  rootName?: string | null;
  onRootChange?: (name: string) => void;
  direction: LineageDirection;
  onDirectionChange: (direction: LineageDirection) => void;
  collapsedNodes: Set<string>;
  onToggleCollapsed: (id: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onPick: (fowl: FowlRecord) => void;
  onShowFights: (fowl: FowlRecord) => void;
  onOpenAsSire?: (fowl: FowlRecord) => void;
  onOpenAsDam?: (fowl: FowlRecord) => void;
}

type Selection = { kind: 'bird'; id: string } | { kind: 'pair'; key: string } | null;

/** Never shrink below ~70%; wide generations wrap instead. */
const MIN_SCALE = 0.7;
const DEFAULT_DEPTH = 3;

const STATUS_DOT: Record<string, string> = {
  Active: 'bg-emerald-500',
  Archived: 'bg-amber-400',
  Deceased: 'bg-rose-400',
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function recordLabel(stats?: WinRateStats): string {
  if (!stats || stats.total === 0) return 'No fights';
  return `${stats.wins}W-${stats.losses}L${stats.draws > 0 ? `-${stats.draws}D` : ''}${
    stats.winRate !== null ? ` · ${stats.winRate}%` : ''
  }`;
}

function sexTone(fowl: FowlRecord): string {
  const label = sexLabel(fowl);
  if (label === 'Cock') return 'text-sky-600 dark:text-sky-400';
  if (label === 'Hen') return 'text-pink-600 dark:text-pink-400';
  return 'text-muted-foreground';
}

function sexGlyph(fowl: FowlRecord): string {
  const label = sexLabel(fowl);
  if (label === 'Cock') return '♂';
  if (label === 'Hen') return '♀';
  return '?';
}

interface PairOption {
  key: string;
  sire: FowlRecord;
  dam: FowlRecord;
  childIds: string[];
}

export default function LineageFlow({
  fowls,
  codes,
  matchHistory,
  query = '',
  sortBy = 'most',
  rootName,
  onRootChange,
  direction,
  onDirectionChange,
  collapsedNodes,
  onToggleCollapsed,
  onExpandAll,
  onCollapseAll,
  onPick,
  onShowFights,
  onOpenAsSire,
  onOpenAsDam,
}: LineageFlowProps) {
  const index = useMemo(() => buildLineageIndex(fowls), [fowls]);
  const defaultRootId = useMemo(() => pickDefaultRootId(fowls, index), [fowls, index]);

  const root = useMemo(() => {
    const wanted = nameKey(rootName);
    if (wanted) {
      const found = fowls.find((f) => nameKey(f.name) === wanted);
      if (found) return found;
    }
    return defaultRootId ? index.byId.get(defaultRootId) ?? null : null;
  }, [rootName, fowls, defaultRootId, index]);

  const [depth, setDepth] = useState(DEFAULT_DEPTH);
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<Selection>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [finder, setFinder] = useState('');
  const [finderIndex, setFinderIndex] = useState(0);
  const [sexFocus, setSexFocus] = useState<'all' | 'male' | 'female'>('all');
  const [containerWidth, setContainerWidth] = useState(0);

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const finderRef = useRef<HTMLDivElement | null>(null);
  const scrollTargetRef = useRef<string | null>(null);

  const statsMap = useMemo(
    () => buildChickenMatchStatsMap(matchHistory, fowls),
    [matchHistory, fowls]
  );
  const statsOf = useCallback(
    (fowl: FowlRecord) =>
      statsMap.get(fowl.name.trim().toLowerCase()) || computeWinRate(0, 0),
    [statsMap]
  );

  const pairOptions = useMemo<PairOption[]>(() => {
    const map = new Map<string, PairOption>();
    index.parentsByChild.forEach(({ sire, dam }, childId) => {
      if (!sire || !dam || sire.id === dam.id) return;
      const key = `${sire.id}|||${dam.id}`;
      const entry = map.get(key) ?? { key, sire, dam, childIds: [] };
      if (!entry.childIds.includes(childId)) entry.childIds.push(childId);
      map.set(key, entry);
    });
    const list = Array.from(map.values());
    return list.sort((a, b) => {
      if (sortBy === 'name') return a.sire.name.localeCompare(b.sire.name);
      if (sortBy === 'newest') {
        const newest = (pair: PairOption) =>
          Math.max(...pair.childIds.map((id) => index.byId.get(id)?.id ?? 0), 0);
        return newest(b) - newest(a) || a.sire.name.localeCompare(b.sire.name);
      }
      return (
        b.childIds.length - a.childIds.length || a.sire.name.localeCompare(b.sire.name)
      );
    });
  }, [index, sortBy]);

  const activePairKey = useMemo(() => {
    if (!root) return '';
    const candidates = pairOptions.filter(
      (pair) => pair.sire.id === root.id || pair.dam.id === root.id
    );
    candidates.sort((a, b) => b.childIds.length - a.childIds.length);
    return candidates[0]?.key ?? '';
  }, [pairOptions, root]);

  const topology = useMemo(() => {
    if (!root) return null;
    return buildLineageTopology(index, {
      rootId: String(root.id),
      direction,
      // The toolbar value is a generation (row) count; the graph walks edges.
      maxDepth: Math.max(1, depth - 1),
      collapsed: collapsedNodes,
    });
  }, [index, root, direction, depth, collapsedNodes]);

  const measuredWidth = containerWidth > 0 ? containerWidth : 1024;
  const compact = measuredWidth < 640;
  const paddingX = compact ? 8 : 92;
  const nodeGap = compact ? 20 : 28;
  const chainGap = compact ? 24 : 74;
  const rowGap = compact ? 96 : 138;
  const wrapGap = compact ? 56 : 84;
  const paddingY = compact ? 40 : 64;
  const maxRowWidth = Math.max(0, measuredWidth / MIN_SCALE - paddingX * 2);

  const layout = useMemo(
    () =>
      topology
        ? layoutLineageTopology(topology, {
            maxRowWidth,
            nodeGap,
            chainGap,
            rowGap,
            wrapGap,
            paddingX,
            paddingY,
          })
        : null,
    [topology, maxRowWidth, nodeGap, chainGap, rowGap, wrapGap, paddingX, paddingY]
  );

  // Fit to the available width; wrapping keeps the scale at or above MIN_SCALE.
  const scale = layout
    ? Math.max(MIN_SCALE, Math.min(1, measuredWidth / layout.width))
    : 1;

  const queryMatches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return fowls.filter((fowl) => {
      const code = lineageBirdCode(fowl, codes).toLowerCase();
      return (
        fowl.name.toLowerCase().includes(term) ||
        code.includes(term) ||
        (fowl.wing_band || '').toLowerCase().includes(term) ||
        String(fowl.id) === term
      );
    });
  }, [query, fowls, codes]);

  const queryMatchIds = useMemo(
    () => new Set(queryMatches.map((f) => String(f.id))),
    [queryMatches]
  );

  const finderMatches = useMemo(() => {
    const term = finder.trim().toLowerCase();
    if (!term) return [];
    return fowls
      .filter((fowl) => {
        const code = lineageBirdCode(fowl, codes).toLowerCase();
        return (
          fowl.name.toLowerCase().includes(term) ||
          code.includes(term) ||
          (fowl.wing_band || '').toLowerCase().includes(term) ||
          String(fowl.id) === term
        );
      })
      .sort((a, b) => {
        const aStarts = a.name.toLowerCase().startsWith(term) ? 0 : 1;
        const bStarts = b.name.toLowerCase().startsWith(term) ? 0 : 1;
        return aStarts - bStarts || a.name.localeCompare(b.name);
      })
      .slice(0, 6);
  }, [finder, fowls, codes]);

  const selectedBird =
    selected?.kind === 'bird' ? index.byId.get(selected.id) ?? null : null;
  const selectedPair =
    selected?.kind === 'pair'
      ? pairOptions.find((pair) => pair.key === selected.key) ?? null
      : null;

  const selectedBirdStats = selectedBird ? statsOf(selectedBird) : null;
  const selectedBirdChildren = selectedBird
    ? index.childrenByParent.get(String(selectedBird.id)) ?? []
    : [];
  const selectedBirdPairs = selectedBird
    ? pairOptions.filter(
        (pair) => pair.sire.id === selectedBird.id || pair.dam.id === selectedBird.id
      )
    : [];

  const pairOffspring = selectedPair
    ? selectedPair.childIds
        .map((id) => index.byId.get(id))
        .filter((fowl): fowl is FowlRecord => Boolean(fowl))
    : [];
  const pairFightingBirds = fightersOf(pairOffspring);
  const pairStats = combineWinRates(pairFightingBirds.map((fowl) => statsOf(fowl)));

  // Track the canvas width and re-fit whenever the container resizes.
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const measure = () => setContainerWidth(el.clientWidth);
    measure();

    const observer =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    observer?.observe(el);
    window.addEventListener('resize', measure);

    // The expanded class changes the available width after paint.
    const timer = expanded ? window.setTimeout(measure, 0) : null;

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [expanded]);

  // Dismiss the bird finder when clicking outside it.
  useEffect(() => {
    if (!finder.trim()) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && finderRef.current?.contains(target)) return;
      setFinder('');
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [finder]);

  // Search/focus targets scroll the normal page, never an inner canvas.
  useEffect(() => {
    const id = scrollTargetRef.current;
    if (!id || !layout) return;
    const el = canvasRef.current?.querySelector<HTMLElement>(
      `[data-node-id="${id}"]`
    );
    if (!el) return;
    scrollTargetRef.current = null;
    const reduceMotion =
      typeof window !== 'undefined' &&
      (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false);
    try {
      el.scrollIntoView?.({
        block: 'center',
        behavior: reduceMotion ? 'auto' : 'smooth',
      });
    } catch {
      /* jsdom and some embedded browsers do not implement scrolling. */
    }
  }, [layout, highlightId, selected]);

  // Expanded canvas: Escape exits.
  useEffect(() => {
    if (!expanded) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpanded(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [expanded]);

  const focusBird = useCallback(
    (fowl: FowlRecord) => {
      const id = String(fowl.id);
      onRootChange?.(fowl.name);
      onDirectionChange('both');
      setSelected({ kind: 'bird', id });
      setHighlightId(id);
      setFinder('');
      setFinderIndex(0);
      scrollTargetRef.current = id;
    },
    [onRootChange, onDirectionChange]
  );

  const selectBird = useCallback((fowl: FowlRecord, center = false) => {
    const id = String(fowl.id);
    setSelected({ kind: 'bird', id });
    setHighlightId(id);
    if (center) scrollTargetRef.current = id;
  }, []);

  const selectPair = useCallback((key: string) => {
    setSelected({ kind: 'pair', key });
    setHighlightId(null);
  }, []);

  const focusInTree = useCallback(
    (fowl: FowlRecord) => {
      onRootChange?.(fowl.name);
      setSelected({ kind: 'bird', id: String(fowl.id) });
      scrollTargetRef.current = String(fowl.id);
    },
    [onRootChange]
  );

  const onFamilyChange = (key: string) => {
    const option = pairOptions.find((pair) => pair.key === key);
    if (!option) return;
    const pairCount = (birdId: number) =>
      pairOptions.filter((pair) => pair.sire.id === birdId || pair.dam.id === birdId).length;
    const member =
      pairCount(option.sire.id) <= pairCount(option.dam.id) ? option.sire : option.dam;
    onRootChange?.(member.name);
    onDirectionChange('down');
    setSelected(null);
    setHighlightId(null);
  };

  const branchControl = (node: LineageLayoutNode) => {
    const isCollapsed = collapsedNodes.has(node.id);
    const hasChildren = (index.childrenByParent.get(node.id) ?? []).length > 0;
    if (!hasChildren) return null;

    if (isCollapsed) {
      return (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleCollapsed(node.id);
          }}
          aria-label={`Expand branch of ${node.fowl.name}${
            node.hiddenDescendants > 0 ? ` (${node.hiddenDescendants} hidden)` : ''
          }`}
          title="Expand this branch"
          className="border-border bg-card text-foreground absolute -top-2 -right-2 z-10 inline-flex h-5 min-w-5 cursor-pointer items-center justify-center rounded-full border px-1 text-[10px] font-black shadow-xs hover:bg-muted"
        >
          {node.hiddenDescendants > 0 ? `+${node.hiddenDescendants}` : <ChevronDown className="h-3 w-3" />}
        </button>
      );
    }

    if (node.hiddenChildren > 0) {
      return (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setDepth((current) => Math.min(6, current + 1));
          }}
          aria-label={`Show ${node.hiddenDescendants || node.hiddenChildren} more relatives of ${node.fowl.name}`}
          title="Show one more generation"
          className="absolute -top-2 -right-2 z-10 inline-flex h-5 min-w-5 cursor-pointer items-center justify-center rounded-full border border-amber-300 bg-amber-50 px-1 text-[10px] font-black text-amber-800 shadow-xs hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
        >
          +{node.hiddenDescendants || node.hiddenChildren}
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onToggleCollapsed(node.id);
        }}
        aria-label={`Collapse branch of ${node.fowl.name}`}
        title="Collapse this branch"
        className="border-border bg-card text-muted-foreground absolute -top-2 -right-2 z-10 inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border shadow-xs hover:bg-muted hover:text-foreground"
      >
        <Minus className="h-3 w-3" />
      </button>
    );
  };

  const renderCard = (node: LineageLayoutNode) => {
    const fowl = node.fowl;
    const code = lineageBirdCode(fowl, codes);
    const stats = statsOf(fowl);
    const isSelected = selected?.kind === 'bird' && selected.id === node.id;
    const isHighlighted = highlightId === node.id || queryMatchIds.has(node.id);
    const isDimmed =
      sexFocus !== 'all' && (sexFocus === 'male') !== isMale(fowl.gender);
    const offspringCount = (index.childrenByParent.get(node.id) ?? []).length;
    const fightsEnabled = canFight(fowl);
    const rowNumber =
      (layout?.generations.findIndex((row) => row.gen === node.generation) ?? -1) + 1;
    const label = `${fowl.name}, ${sexLabel(fowl)}, ${
      code ? `code ${code}` : 'no code'
    }, ${rowNumber > 0 ? `generation ${rowNumber}` : 'root generation'}, ${offspringCount} offspring${
      fightsEnabled ? `, ${recordLabel(stats)}` : ''
    }`;

    return (
      <div
        key={node.id}
        className="absolute"
        style={{ left: node.x, top: node.y, width: node.width, height: node.height }}
      >
        <button
          type="button"
          data-testid="lineage-bird-card"
          data-node-id={node.id}
          onClick={() => selectBird(fowl)}
          onDoubleClick={() => focusBird(fowl)}
          aria-label={label}
          aria-pressed={isSelected}
          title={`${fowl.name} · ${code || 'no code'} · ${sexLabel(fowl)} · ${
            offspringCount > 0 ? `${offspringCount} offspring` : 'no registered offspring'
          }`}
          className={`bg-card group flex h-full w-full cursor-pointer flex-col rounded-lg border px-2.5 py-2 text-left shadow-xs transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:outline-none ${
            isSelected
              ? 'border-emerald-500 ring-2 ring-emerald-500/40'
              : isHighlighted
              ? 'border-amber-400 ring-2 ring-amber-400/40'
              : 'border-border hover:border-emerald-400'
          } ${node.isRoot ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : ''} ${
            isDimmed ? 'opacity-40 saturate-50' : ''
          }`}
        >
          <div className="flex items-center gap-1.5">
            {fowl.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={fowl.image_url}
                alt=""
                className="border-border h-6 w-6 shrink-0 rounded-full border object-cover"
              />
            ) : (
              <span
                className={`border-border flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[9px] font-black ${
                  sexLabel(fowl) === 'Hen'
                    ? 'bg-pink-50 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300'
                    : 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300'
                }`}
                aria-hidden="true"
              >
                {initials(fowl.name)}
              </span>
            )}
            {code && (
              <span className="border-border bg-muted text-foreground shrink-0 rounded border px-1 py-0.5 font-mono text-[10px] font-black uppercase">
                {code}
              </span>
            )}
            <span className={`shrink-0 text-[10px] font-black ${sexTone(fowl)}`}>
              {sexGlyph(fowl)} {sexLabel(fowl)}
            </span>
            <span
              className={`ml-auto h-1.5 w-1.5 shrink-0 rounded-full ${
                STATUS_DOT[fowl.status] || 'bg-muted-foreground'
              }`}
              title={fowl.status}
            />
            {node.isRoot && (
              <span className="text-[9px] font-black tracking-wider text-emerald-700 uppercase dark:text-emerald-400">
                Root
              </span>
            )}
          </div>
          <p
            className="text-card-foreground mt-1 line-clamp-2 text-xs leading-tight font-black"
            title={fowl.name}
          >
            {fowl.name}
          </p>
          <div className="text-muted-foreground mt-auto flex items-center justify-between gap-1 pt-1 text-[10px] font-semibold">
            <span className="truncate">
              {offspringCount > 0
                ? `${offspringCount} offspring`
                : (fowl.breed || 'No offspring')}
            </span>
            <span className="shrink-0">
              {fightsEnabled ? recordLabel(stats) : ''}
            </span>
          </div>
        </button>
        {branchControl(node)}
      </div>
    );
  };

  const renderPairHub = (pair: LineageLayoutPair) => {
    const sire = index.byId.get(pair.sireId);
    const dam = index.byId.get(pair.damId);
    if (!sire || !dam) return null;
    const isSelected = selected?.kind === 'pair' && selected.key === pair.key;
    return (
      <button
        key={pair.key}
        type="button"
        data-testid="lineage-pair-hub"
        onClick={() => selectPair(pair.key)}
        aria-label={`Breeding pair ${sire.name} × ${dam.name}, ${pair.childCount} offspring`}
        aria-pressed={isSelected}
        title={`Breeding pair: ${sire.name} × ${dam.name}`}
        className={`bg-card absolute z-10 inline-flex -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black tracking-wider uppercase shadow-xs focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:outline-none ${
          isSelected
            ? 'border-emerald-500 text-emerald-700 ring-2 ring-emerald-500/30 dark:text-emerald-400'
            : 'border-border text-muted-foreground hover:border-emerald-400 hover:text-foreground'
        }`}
        style={{ left: pair.hubX, top: pair.hubY }}
      >
        <Link2 className="h-3 w-3" aria-hidden="true" />
        {pair.childCount}
      </button>
    );
  };

  const rootLabel = root ? `${root.name}` : 'No bird selected';
  const isExpandedClass = expanded
    ? 'flex min-h-[calc(100dvh-4rem)] w-full flex-col gap-2'
    : 'space-y-3';

  return (
    <section className={isExpandedClass}>
      {/* Toolbar */}
      <div className="bg-card border-border rounded-lg border p-2">
        <div className="flex flex-wrap items-center gap-2">
          <div ref={finderRef} className="relative min-w-0 flex-1 sm:max-w-xs">
            <span
              aria-hidden="true"
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2"
            >
              <Search className="h-3.5 w-3.5" />
            </span>
            <input
              type="text"
              aria-label="Find a bird"
              placeholder="Find a bird by name, ID or leg band…"
              value={finder}
              onChange={(event) => {
                setFinder(event.target.value);
                setFinderIndex(0);
              }}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  setFinderIndex((i) => Math.min(finderMatches.length - 1, i + 1));
                } else if (event.key === 'ArrowUp') {
                  event.preventDefault();
                  setFinderIndex((i) => Math.max(0, i - 1));
                } else if (event.key === 'Enter') {
                  event.preventDefault();
                  const match = finderMatches[finderIndex] ?? finderMatches[0];
                  if (match) focusBird(match);
                } else if (event.key === 'Escape') {
                  setFinder('');
                }
              }}
              className="border-input-border bg-muted/60 text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:ring-emerald-500 h-8 w-full rounded-md border py-1.5 pr-7 pl-8 text-xs font-semibold focus:ring-1"
            />
            {finder && (
              <button
                type="button"
                aria-label="Clear bird search"
                onClick={() => setFinder('')}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            )}
            {finder.trim() !== '' && (
              <div
                role="listbox"
                aria-label="Bird matches"
                className="bg-card border-border absolute top-full right-0 left-0 z-30 mt-1 max-h-64 overflow-y-auto rounded-md border p-1 shadow-lg"
              >
                {finderMatches.length === 0 ? (
                  <p className="text-muted-foreground px-2 py-2 text-xs">No birds match.</p>
                ) : (
                  finderMatches.map((match, i) => (
                    <button
                      key={match.id}
                      type="button"
                      role="option"
                      aria-selected={i === finderIndex}
                      onMouseEnter={() => setFinderIndex(i)}
                      onClick={() => focusBird(match)}
                      className={`flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-left text-xs ${
                        i === finderIndex ? 'bg-muted' : 'hover:bg-muted/60'
                      }`}
                    >
                      <span className="border-border bg-muted shrink-0 rounded border px-1 py-0.5 font-mono text-[10px] font-black">
                        {lineageBirdCode(match, codes) || '—'}
                      </span>
                      <span className="text-card-foreground min-w-0 flex-1 truncate font-bold">
                        {match.name}
                      </span>
                      <span className={`shrink-0 text-[10px] font-bold ${sexTone(match)}`}>
                        {sexLabel(match)}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="flex min-w-0 items-center gap-1.5">
            <label htmlFor="lineage-flow-family" className="sr-only">
              Starting family
            </label>
            <select
              id="lineage-flow-family"
              aria-label="Starting family"
              value={activePairKey}
              onChange={(event) => onFamilyChange(event.target.value)}
              className="border-border bg-card text-foreground focus:border-emerald-500 h-8 max-w-[230px] cursor-pointer rounded border px-2 text-xs font-bold focus:outline-none"
            >
              {activePairKey === '' && (
                <option value="">Starting bird: {rootLabel}</option>
              )}
              {pairOptions.map((pair) => (
                <option key={pair.key} value={pair.key}>
                  {pair.sire.name} × {pair.dam.name} · {pair.childIds.length} offspring
                </option>
              ))}
            </select>
          </div>

          <div
            role="group"
            aria-label="View direction"
            className="border-border flex items-center overflow-hidden rounded border"
          >
            {(
              [
                ['down', 'Descendants'],
                ['up', 'Ancestors'],
                ['both', 'Full pedigree'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={direction === value}
                onClick={() => onDirectionChange(value)}
                className={`h-8 cursor-pointer px-2 text-xs font-bold transition-colors ${
                  direction === value
                    ? 'bg-emerald-600 text-white'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <label htmlFor="lineage-flow-depth" className="text-muted-foreground text-xs font-bold">
              Generations
            </label>
            <select
              id="lineage-flow-depth"
              aria-label="Generation depth"
              value={depth}
              onChange={(event) => setDepth(Number(event.target.value))}
              className="border-border bg-card text-foreground focus:border-emerald-500 h-8 cursor-pointer rounded border px-2 text-xs font-bold focus:outline-none"
            >
              {[2, 3, 4, 5, 6].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onExpandAll}
              className="border-border text-muted-foreground hover:bg-muted hover:text-foreground h-8 cursor-pointer rounded border px-2 text-xs font-bold whitespace-nowrap"
            >
              Expand all
            </button>
            <button
              type="button"
              onClick={onCollapseAll}
              className="border-border text-muted-foreground hover:bg-muted hover:text-foreground h-8 cursor-pointer rounded border px-2 text-xs font-bold whitespace-nowrap"
            >
              Collapse all
            </button>
          </div>

          <div
            role="group"
            aria-label="Highlight sex"
            className="border-border flex items-center overflow-hidden rounded border"
          >
            {(
              [
                ['all', 'All'],
                ['male', 'Cocks'],
                ['female', 'Hens'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={sexFocus === value}
                onClick={() => setSexFocus(value)}
                className={`h-8 cursor-pointer px-2 text-xs font-bold transition-colors ${
                  sexFocus === value
                    ? 'bg-sky-600 text-white'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {query.trim() !== '' && (
              <span className="text-muted-foreground text-xs font-semibold">
                {queryMatches.length === 0 ? (
                  <>No birds match “{query.trim()}”.</>
                ) : (
                  <>
                    {queryMatches.length} match{queryMatches.length === 1 ? '' : 'es'} for “
                    {query.trim()}”{' '}
                    <button
                      type="button"
                      onClick={() => focusBird(queryMatches[0])}
                      className="cursor-pointer font-bold text-emerald-600 hover:underline dark:text-emerald-400"
                    >
                      Focus first
                    </button>
                  </>
                )}
              </span>
            )}
            <button
              type="button"
              aria-pressed={expanded}
              onClick={() => setExpanded((value) => !value)}
              aria-label={expanded ? 'Exit expanded canvas' : 'Expand canvas'}
              title={expanded ? 'Exit expanded canvas' : 'Expand canvas'}
              className="border-border text-muted-foreground hover:bg-muted hover:text-foreground inline-flex h-7 cursor-pointer items-center gap-1 rounded border px-2 text-xs font-bold"
            >
              {expanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
              {expanded ? 'Exit' : 'Expand'}
            </button>
          </div>
        </div>
      </div>

      <div className={`flex min-h-0 flex-col gap-3 ${expanded ? 'flex-1 xl:flex-row' : 'xl:flex-row xl:items-start'}`}>
        {/* Canvas */}
        <div className="relative min-w-0 flex-1">
          <div
            ref={canvasRef}
            role="region"
            aria-label="Pedigree canvas"
            aria-describedby="lineage-flow-help"
            className="bg-muted/20 border-border relative w-full overflow-hidden rounded-lg border"
            style={
              layout
                ? { height: Math.max(1, layout.height * scale) }
                : { minHeight: 320 }
            }
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-40"
              style={{
                backgroundImage:
                  'radial-gradient(circle, var(--color-border) 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }}
            />

            {layout ? (
              <div
                data-testid="lineage-canvas"
                data-scale={scale.toFixed(3)}
                data-layout-width={String(layout.width)}
                className="absolute top-0 left-1/2"
                style={{
                  width: layout.width,
                  height: layout.height,
                  transform: `translateX(-50%) scale(${scale})`,
                  transformOrigin: 'top center',
                }}
              >
                {layout.generations.map((row) => (
                  <div
                    key={row.gen}
                    className="absolute flex items-center gap-1.5"
                    style={{ left: 12, top: row.y - 24 }}
                  >
                    <span className="border-border bg-card/90 text-muted-foreground rounded border px-1.5 py-0.5 text-[10px] font-black tracking-widest uppercase">
                      {row.label}
                      {row.isRoot ? ' · Root' : ''}
                    </span>
                  </div>
                ))}

                <svg
                  width={layout.width}
                  height={layout.height}
                  className="text-muted-foreground/50 pointer-events-none absolute inset-0"
                  aria-hidden="true"
                >
                  <g
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  >
                    {layout.pairs.map((pair) => (
                      <g key={pair.key}>
                        {pair.parentPaths.map((d, i) => (
                          <path key={`p${i}`} d={d} vectorEffect="non-scaling-stroke" />
                        ))}
                        <path d={pair.dropPath} vectorEffect="non-scaling-stroke" />
                        <path d={pair.busPath} vectorEffect="non-scaling-stroke" />
                        {pair.childPaths.map((d, i) => (
                          <path key={`c${i}`} d={d} vectorEffect="non-scaling-stroke" />
                        ))}
                      </g>
                    ))}
                    {layout.singles.map((single) => (
                      <g key={single.parentId}>
                        <path d={single.path} vectorEffect="non-scaling-stroke" />
                        <path d={single.busPath} vectorEffect="non-scaling-stroke" />
                        {single.childPaths.map((d, i) => (
                          <path key={`c${i}`} d={d} vectorEffect="non-scaling-stroke" />
                        ))}
                      </g>
                    ))}
                  </g>
                </svg>

                {layout.pairs.map(renderPairHub)}
                {layout.nodes.map(renderCard)}
              </div>
            ) : (
              <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-1 p-6 text-center text-sm">
                <p className="text-foreground font-black">No pedigree to draw yet</p>
                <p className="text-xs">
                  Register chickens with a sire and dam to build the family tree.
                </p>
              </div>
            )}
          </div>

          {layout && (
            <ul className="sr-only" aria-label="Visible pedigree relationships">
              {layout.pairs.map((pair) => {
                const sire = index.byId.get(pair.sireId);
                const dam = index.byId.get(pair.damId);
                const children = pair.childIds
                  .map((id) => index.byId.get(id)?.name)
                  .filter(Boolean);
                if (!sire || !dam) return null;
                return (
                  <li key={pair.key}>
                    {`Breeding pair: ${sire.name} and ${dam.name}. Offspring: ${
                      children.join(', ') || 'none shown'
                    }.`}
                  </li>
                );
              })}
              {layout.singles.map((single) => {
                const parent = index.byId.get(single.parentId);
                const children = single.childIds
                  .map((id) => index.byId.get(id)?.name)
                  .filter(Boolean);
                if (!parent) return null;
                return (
                  <li key={`single-${single.parentId}`}>
                    {`${parent.name} is the recorded parent of ${children.join(
                      ', '
                    )}. The other parent is not registered.`}
                  </li>
                );
              })}
            </ul>
          )}

          <p id="lineage-flow-help" className="sr-only">
            Pedigree canvas. The tree automatically fits the available width and wraps wide
            generations; scroll the page to see taller trees. Use Find a bird to highlight and jump
            to a bird, select a card to open its details, or a pair badge to inspect the breeding
            pair.
          </p>
        </div>

        {/* Details / legend */}
        {!expanded && (
          <aside
            aria-label="Lineage details"
            className="bg-card border-border w-full shrink-0 rounded-lg border p-4 xl:w-80 2xl:w-96"
          >
            {selectedBird ? (
              <div className="space-y-3" data-testid="lineage-details">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    {selectedBird.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={selectedBird.image_url}
                        alt=""
                        className="border-border h-10 w-10 shrink-0 rounded-full border object-cover"
                      />
                    ) : (
                      <span
                        className={`border-border flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-xs font-black ${
                          sexLabel(selectedBird) === 'Hen'
                            ? 'bg-pink-50 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300'
                            : 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300'
                        }`}
                      >
                        {initials(selectedBird.name)}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="text-card-foreground truncate text-sm font-black">
                        {selectedBird.name}
                      </p>
                      <p className="text-muted-foreground text-xs font-semibold">
                        <span className="font-mono">
                          {lineageBirdCode(selectedBird, codes) || 'No code'}
                        </span>{' '}
                        · <span className={sexTone(selectedBird)}>{sexLabel(selectedBird)}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    aria-label="Close lineage details"
                    className="text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer rounded p-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  {selectedBird.breed && (
                    <span className="border-border bg-muted rounded-full border px-2 py-0.5 font-bold">
                      {selectedBird.breed}
                    </span>
                  )}
                  <span className="border-border bg-muted text-muted-foreground rounded-full border px-2 py-0.5 font-bold">
                    {selectedBird.status || 'Unknown status'}
                  </span>
                  {selectedBird.age && (
                    <span className="border-border bg-muted text-muted-foreground rounded-full border px-2 py-0.5 font-bold">
                      {selectedBird.age}
                    </span>
                  )}
                </div>

                {canFight(selectedBird) && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-[10px] font-black tracking-widest uppercase">
                      Record
                    </span>
                    <WinRatePill stats={selectedBirdStats ?? computeWinRate(0, 0)} />
                  </div>
                )}

                <div className="space-y-2 border-t border-border/60 pt-3">
                  <p className="text-muted-foreground text-[10px] font-black tracking-widest uppercase">
                    Parents
                  </p>
                  {(
                    [
                      ['Sire', 'sire'],
                      ['Dam', 'dam'],
                    ] as const
                  ).map(([label, role]) => {
                    const resolved =
                      role === 'sire'
                        ? index.parentsByChild.get(String(selectedBird.id))?.sire ?? null
                        : index.parentsByChild.get(String(selectedBird.id))?.dam ?? null;
                    const snapshot = (role === 'sire' ? selectedBird.sire : selectedBird.dam) || '';
                    return (
                      <div key={role} className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-muted-foreground font-bold">{label}</span>
                        {resolved ? (
                          <button
                            type="button"
                            onClick={() => selectBird(resolved, true)}
                            className="text-card-foreground max-w-[70%] cursor-pointer truncate font-bold hover:text-emerald-700 hover:underline dark:hover:text-emerald-400"
                          >
                            {resolved.name}
                          </button>
                        ) : (
                          <span className="text-muted-foreground max-w-[70%] truncate font-semibold">
                            {snapshot.trim() ? `${snapshot} (not registered)` : 'Not recorded'}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-1.5 border-t border-border/60 pt-3">
                  <p className="text-muted-foreground text-[10px] font-black tracking-widest uppercase">
                    Offspring ({selectedBirdChildren.length})
                  </p>
                  {selectedBirdChildren.length === 0 ? (
                    <p className="text-muted-foreground text-xs font-semibold">
                      No registered offspring.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {selectedBirdChildren.slice(0, 8).map((child) => (
                        <button
                          key={child.id}
                          type="button"
                          onClick={() => selectBird(child, true)}
                          className="border-border bg-muted/50 hover:bg-muted inline-flex max-w-full cursor-pointer items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold"
                          title={child.name}
                        >
                          <span>{lineageBirdCode(child, codes) || child.name}</span>
                          <span className={sexTone(child)}>{sexGlyph(child)}</span>
                        </button>
                      ))}
                      {selectedBirdChildren.length > 8 && (
                        <span className="text-muted-foreground px-1 py-0.5 text-[10px] font-bold">
                          +{selectedBirdChildren.length - 8} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {selectedBirdPairs.length > 0 && (
                  <div className="space-y-1.5 border-t border-border/60 pt-3">
                    <p className="text-muted-foreground text-[10px] font-black tracking-widest uppercase">
                      Breeding pairs ({selectedBirdPairs.length})
                    </p>
                    {selectedBirdPairs.map((pair) => {
                      const partner =
                        pair.sire.id === selectedBird.id ? pair.dam : pair.sire;
                      return (
                        <button
                          key={pair.key}
                          type="button"
                          onClick={() => selectPair(pair.key)}
                          className="border-border hover:bg-muted flex w-full cursor-pointer items-center justify-between gap-2 rounded border px-2 py-1 text-left text-xs"
                        >
                          <span className="min-w-0 truncate font-bold">× {partner.name}</span>
                          <span className="text-muted-foreground shrink-0 text-[10px] font-bold">
                            {pair.childIds.length} offspring
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5 border-t border-border/60 pt-3">
                  <button
                    type="button"
                    onClick={() => onPick(selectedBird)}
                    className="inline-flex cursor-pointer items-center gap-1 rounded bg-emerald-600 px-2 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                  >
                    <User className="h-3.5 w-3.5" /> View profile
                  </button>
                  {canFight(selectedBird) && (
                    <button
                      type="button"
                      onClick={() => onShowFights(selectedBird)}
                      className="border-border hover:bg-muted inline-flex cursor-pointer items-center gap-1 rounded border px-2 py-1.5 text-xs font-bold"
                    >
                      <Swords className="h-3.5 w-3.5" /> Fight history
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => focusInTree(selectedBird)}
                    className="border-border hover:bg-muted inline-flex cursor-pointer items-center gap-1 rounded border px-2 py-1.5 text-xs font-bold"
                  >
                    Focus
                  </button>
                  {selectedBirdChildren.length > 0 && onOpenAsSire && (
                    <button
                      type="button"
                      onClick={() => onOpenAsSire(selectedBird)}
                      className="border-border hover:bg-muted inline-flex cursor-pointer items-center gap-1 rounded border px-2 py-1.5 text-xs font-bold"
                    >
                      Sire tree
                    </button>
                  )}
                  {selectedBirdChildren.length > 0 && onOpenAsDam && (
                    <button
                      type="button"
                      onClick={() => onOpenAsDam(selectedBird)}
                      className="border-border hover:bg-muted inline-flex cursor-pointer items-center gap-1 rounded border px-2 py-1.5 text-xs font-bold"
                    >
                      Dam tree
                    </button>
                  )}
                </div>
              </div>
            ) : selectedPair ? (
              <div className="space-y-3" data-testid="lineage-details">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-card-foreground text-sm font-black">Breeding pair</p>
                    <p className="text-muted-foreground text-xs font-semibold">
                      {selectedPair.childIds.length} registered offspring
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    aria-label="Close lineage details"
                    className="text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer rounded p-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ['Sire', selectedPair.sire, 'sky'],
                      ['Dam', selectedPair.dam, 'pink'],
                    ] as const
                  ).map(([label, bird, tone]) => (
                    <div
                      key={label}
                      className={`rounded-md border p-2 ${
                        tone === 'sky'
                          ? 'border-sky-200 bg-sky-50/70 dark:border-sky-800 dark:bg-sky-950/30'
                          : 'border-pink-200 bg-pink-50/70 dark:border-pink-800 dark:bg-pink-950/30'
                      }`}
                    >
                      <p
                        className={`text-[10px] font-black tracking-wider uppercase ${
                          tone === 'sky'
                            ? 'text-sky-700 dark:text-sky-400'
                            : 'text-pink-700 dark:text-pink-400'
                        }`}
                      >
                        {label}
                      </p>
                      <button
                        type="button"
                        onClick={() => selectBird(bird, true)}
                        className="text-card-foreground max-w-full cursor-pointer truncate text-left text-xs font-black hover:underline"
                      >
                        {bird.name}
                      </button>
                      <p className="text-muted-foreground font-mono text-[10px] font-bold">
                        {lineageBirdCode(bird, codes) || 'No code'} · {sexLabel(bird)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="space-y-1.5 border-t border-border/60 pt-3">
                  <p className="text-muted-foreground text-[10px] font-black tracking-widest uppercase">
                    Offspring
                  </p>
                  <div className="space-y-1">
                    {pairOffspring.map((child) => {
                      const stats = statsOf(child);
                      return (
                        <button
                          key={child.id}
                          type="button"
                          onClick={() => selectBird(child, true)}
                          className="border-border hover:bg-muted flex w-full cursor-pointer items-center gap-2 rounded border px-2 py-1 text-left text-xs"
                        >
                          <span className="text-muted-foreground shrink-0 font-mono text-[10px] font-bold">
                            {lineageBirdCode(child, codes)}
                          </span>
                          <span className="min-w-0 flex-1 truncate font-bold">{child.name}</span>
                          <span className={`shrink-0 text-[10px] font-bold ${sexTone(child)}`}>
                            {sexLabel(child)}
                          </span>
                          {canFight(child) && (
                            <span className="text-muted-foreground shrink-0 text-[10px] font-semibold">
                              {recordLabel(stats)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-border/60 pt-3">
                  <p className="text-muted-foreground mb-1 text-[10px] font-black tracking-widest uppercase">
                    Offspring record
                  </p>
                  <WinRatePill stats={pairStats} />
                  <p className="text-muted-foreground mt-1 text-[10px] font-semibold">
                    {pairStats.foughtCount} of {pairFightingBirds.length} cocks fought
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5 border-t border-border/60 pt-3">
                  <button
                    type="button"
                    onClick={() => onPick(selectedPair.sire)}
                    className="border-border hover:bg-muted inline-flex cursor-pointer items-center gap-1 rounded border px-2 py-1.5 text-xs font-bold"
                  >
                    Sire profile
                  </button>
                  <button
                    type="button"
                    onClick={() => onPick(selectedPair.dam)}
                    className="border-border hover:bg-muted inline-flex cursor-pointer items-center gap-1 rounded border px-2 py-1.5 text-xs font-bold"
                  >
                    Dam profile
                  </button>
                  <button
                    type="button"
                    onClick={() => onRootChange?.(selectedPair.sire.name)}
                    className="inline-flex cursor-pointer items-center gap-1 rounded bg-emerald-600 px-2 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                  >
                    Focus family
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3" data-testid="lineage-details">
                <div>
                  <p className="text-card-foreground text-sm font-black">Explore the pedigree</p>
                  <p className="text-muted-foreground mt-1 text-xs font-semibold">
                    Select a bird card for its parents, offspring and records, or a pair badge to
                    inspect the breeding pair. The tree fits the page width automatically; scroll
                    the page for taller trees.
                  </p>
                </div>
                <div className="border-border space-y-1.5 border-t border-border/60 pt-3">
                  <p className="text-muted-foreground text-[10px] font-black tracking-widest uppercase">
                    Legend
                  </p>
                  <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold">
                    <span className="inline-flex items-center gap-1">
                      <span className="font-black text-sky-600 dark:text-sky-400">♂</span> Cock
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="font-black text-pink-600 dark:text-pink-400">♀</span> Hen
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Link2 className="h-3 w-3" /> Breeding pair
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="border-border rounded border px-1 text-[10px] font-black">
                        +N
                      </span>
                      Hidden relatives
                    </span>
                  </div>
                </div>
                <div className="border-border border-t border-border/60 pt-3 text-xs font-semibold text-muted-foreground">
                  <p>
                    Root bird: <span className="text-card-foreground font-black">{rootLabel}</span>
                  </p>
                  <p className="mt-1">
                    Showing {layout?.nodes.length ?? 0} bird
                    {(layout?.nodes.length ?? 0) === 1 ? '' : 's'} across{' '}
                    {layout?.generations.length ?? 0} generation
                    {(layout?.generations.length ?? 0) === 1 ? '' : 's'}.
                  </p>
                </div>
              </div>
            )}
          </aside>
        )}
      </div>

      {!expanded && (
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-[10px] font-semibold">
          <span>Tree auto-fits the page width</span>
          <span aria-hidden="true">·</span>
          <span>Wide generations wrap into extra rows</span>
          <span aria-hidden="true">·</span>
          <span>Double-click a bird to make it the root</span>
          <span aria-hidden="true">·</span>
          <span>Unregistered parents are labelled, never drawn as birds</span>
        </div>
      )}
    </section>
  );
}
