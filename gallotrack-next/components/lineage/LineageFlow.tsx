'use client';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ChevronDown,
  GitBranch,
  Maximize2,
  Minimize2,
  Minus,
  Network,
  Search,
  SlidersHorizontal,
  Swords,
  Table2,
  User,
  X,
} from 'lucide-react';
import type { FowlRecord, MatchRecord } from '@/lib/types';
import { canFight, fightersOf, sexLabel } from '@/lib/helpers';
import { nameKey } from '@/lib/family-tree';
import {
  buildChickenMatchStatsMap,
  combineWinRates,
  getChickenMatchStats,
  type WinRateStats,
} from '@/lib/win-rate';
import CrisscrossBadge from '@/components/CrisscrossBadge';
import { classifyCrisscross } from '@/lib/lineage';
import ChickenPhoto from '@/components/ChickenPhoto';
import { useT } from '@/lib/i18n';
import {
  DEFAULT_LINEAGE_TREE_FILTERS,
  distinctFeatherColors,
  featherColorOf,
  isWingBandSearchMatch,
  lineagePairTypeOf,
  matchesLineageTreeFilters,
  type LineageGenerationFilter,
  type LineagePairFilter,
  type LineagePairType,
  type LineageSexFilter,
  type LineageTreeFilters,
} from '@/lib/lineage-filters';
import LineageBirdCard from './LineageBirdCard';
import LineagePairBadge from './LineagePairBadge';
import LineageRecordPill from './LineageRecordPill';
import LineageStatusBadge from './LineageStatusBadge';
import LineageTableView from './LineageTableView';
import LineageInsights from './LineageInsights';
import {
  buildLineageIndex,
  buildLineageTopology,
  layoutLineageTopology,
  lineageBirdCode,
  pickDefaultRootId,
  FAMILY_TREE_GENERATIONS,
  type LineageDirection,
  type LineageLayoutNode,
  type LineageLayoutPair,
} from '@/lib/lineage-graph';

export interface LineageFlowProps {
  fowls: FowlRecord[];
  codes: Map<string, string>;
  matchHistory: MatchRecord[];
  query?: string;
  /** Shared toolbar order; keeps the starting-bird selector and results consistent. */
  sortBy?: 'most' | 'name' | 'newest';
  onSortChange?: (sort: 'most' | 'name' | 'newest') => void;
  view?: 'tree' | 'table';
  onViewChange?: (view: 'tree' | 'table') => void;
  filters?: LineageTreeFilters;
  onFiltersChange?: (filters: LineageTreeFilters) => void;
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
  onViewAncestors?: (fowl: FowlRecord) => void;
}

type Selection = { kind: 'bird'; id: string } | { kind: 'pair'; key: string } | null;

/** Never shrink below ~70%; wide generations wrap instead. */
const MIN_SCALE = 0.7;

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
  if (label === 'Cock') return 'text-cock';
  if (label === 'Hen') return 'text-hen';
  return 'text-muted-foreground';
}

function sexGlyph(fowl: FowlRecord): string {
  const label = sexLabel(fowl);
  if (label === 'Cock') return 'M';
  if (label === 'Hen') return 'F';
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
  onSortChange,
  view: viewProp,
  onViewChange,
  filters: filtersProp,
  onFiltersChange,
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
  onViewAncestors,
}: LineageFlowProps) {
  const t = useT();
  const [internalView, setInternalView] = useState<'tree' | 'table'>('tree');
  const [internalFilters, setInternalFilters] = useState<LineageTreeFilters>(
    DEFAULT_LINEAGE_TREE_FILTERS,
  );
  const view = viewProp ?? internalView;
  const filters = filtersProp ?? internalFilters;
  const changeView = (nextView: 'tree' | 'table') => {
    if (onViewChange) onViewChange(nextView);
    else setInternalView(nextView);
  };
  const changeFilters = (nextFilters: LineageTreeFilters) => {
    if (onFiltersChange) onFiltersChange(nextFilters);
    else setInternalFilters(nextFilters);
  };
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

  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<Selection>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [finder, setFinder] = useState('');
  const [finderIndex, setFinderIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const sexFocus = filters.sex;
  const setSexFocus = (value: LineageSexFilter) =>
    changeFilters({ ...filters, sex: value });

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const finderRef = useRef<HTMLDivElement | null>(null);
  const scrollTargetRef = useRef<string | null>(null);

  const statsMap = useMemo(
    () => buildChickenMatchStatsMap(matchHistory, fowls),
    [matchHistory, fowls]
  );
  const statsOf = useCallback(
    (fowl: FowlRecord) =>
      getChickenMatchStats(statsMap, fowl),
    [statsMap]
  );

  /**
   * A chicken is tagged when its own recorded parents form a crisscross pair.
   * This covers both manually typed parent names and ID-linked/auto-resolved
   * parents, because the index is built from the shared parent resolver.
   */
  const crisscrossForBird = useCallback(
    (fowl: FowlRecord) => {
      const parents = index.parentsByChild.get(String(fowl.id));
      const sire = parents?.sire ?? null;
      const dam = parents?.dam ?? null;
      return {
        classification: classifyCrisscross(sire, dam, index),
        pairName: sire && dam ? `${sire.name} \u00d7 ${dam.name}` : null,
      };
    },
    [index]
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

  const topology = useMemo(() => {
    if (!root) return null;
    return buildLineageTopology(index, {
      rootId: String(root.id),
      direction,
      // Starting bird = generation 1; walk at most two edges outward.
      maxDepth: FAMILY_TREE_GENERATIONS - 1,
      collapsed: collapsedNodes,
    });
  }, [index, root, direction, collapsedNodes]);

  const measuredWidth = containerWidth > 0 ? containerWidth : 1024;
  const compact = measuredWidth < 640;
  const paddingX = compact ? 8 : 92;
  const nodeGap = compact ? 20 : 28;
  const chainGap = compact ? 24 : 74;
  const rowGap = compact ? 156 : 174;
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

  const generationNumberByGen = useMemo(
    () => new Map((layout?.generations ?? []).map((row, rowIndex) => [row.gen, rowIndex + 1])),
    [layout],
  );
  const featherOptions = useMemo(() => distinctFeatherColors(fowls), [fowls]);
  const pairTypeByNode = useMemo(() => {
    const map = new Map<string, LineagePairType>();
    (layout?.nodes ?? []).forEach((node) => {
      map.set(node.id, lineagePairTypeOf(node.fowl, index, fowls));
    });
    return map;
  }, [layout, index, fowls]);
  const matchingNodeIds = useMemo(() => {
    const set = new Set<string>();
    (layout?.nodes ?? []).forEach((node) => {
      if (
        matchesLineageTreeFilters(filters, {
          fowl: node.fowl,
          generation: generationNumberByGen.get(node.generation) ?? 1,
          pairType: pairTypeByNode.get(node.id) ?? 'others',
        })
      ) {
        set.add(node.id);
      }
    });
    return set;
  }, [layout, filters, generationNumberByGen, pairTypeByNode]);
  const hasActiveFilters =
    filters.sex !== 'all' ||
    filters.generation !== 'all' ||
    filters.feather !== 'all' ||
    filters.pair !== 'all';

  const queryMatches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return fowls.filter((fowl) => {
      const code = lineageBirdCode(fowl, codes).toLowerCase();
      return (
        fowl.name.toLowerCase().includes(term) ||
        code.includes(term) ||
        isWingBandSearchMatch(fowl, term) ||
        String(fowl.id) === term
      );
    });
  }, [query, fowls, codes]);

  const queryMatchIds = useMemo(
    () => new Set(queryMatches.map((f) => String(f.id))),
    [queryMatches]
  );

  const sortBirds = useCallback(
    (a: FowlRecord, b: FowlRecord) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name) || a.id - b.id;
      if (sortBy === 'newest') return b.id - a.id || a.name.localeCompare(b.name);
      const offspringA = index.childrenByParent.get(String(a.id))?.length ?? 0;
      const offspringB = index.childrenByParent.get(String(b.id))?.length ?? 0;
      return offspringB - offspringA || a.name.localeCompare(b.name) || a.id - b.id;
    },
    [index, sortBy],
  );

  const startingBirdOptions = useMemo(
    () => [...fowls].sort(sortBirds),
    [fowls, sortBirds],
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
          isWingBandSearchMatch(fowl, term) ||
          String(fowl.id) === term
        );
      })
      .sort((a, b) => {
        const aStarts = a.name.toLowerCase().startsWith(term) ? 0 : 1;
        const bStarts = b.name.toLowerCase().startsWith(term) ? 0 : 1;
        return aStarts - bStarts || sortBirds(a, b);
      })
      .slice(0, 6);
  }, [finder, fowls, codes, sortBirds]);

  const selectedBird =
    selected?.kind === 'bird' ? index.byId.get(selected.id) ?? null : null;
  const selectedPair =
    selected?.kind === 'pair'
      ? pairOptions.find((pair) => pair.key === selected.key) ?? null
      : null;

  const selectedPairCrisscross = selectedPair
    ? classifyCrisscross(selectedPair.sire, selectedPair.dam, index)
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

  const treeCocks = (layout?.nodes ?? []).filter((node) => canFight(node.fowl));
  const treeFoughtCocks = treeCocks.filter((node) => statsOf(node.fowl).total > 0);
  const treeCombinedRecord = combineWinRates(treeCocks.map((node) => statsOf(node.fowl)));
  const shownGenerationCount = layout?.generations.length ?? 0;
  const shownPairCount = layout?.pairs.length ?? 0;
  const rootNames = (layout?.nodes ?? [])
    .filter((node) => node.isRoot)
    .map((node) => node.fowl.name)
    .join(', ');
  const tableNodes = (layout?.nodes ?? []).filter((node) => matchingNodeIds.has(node.id));

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
      onDirectionChange('down');
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

  const onStartingBirdChange = (value: string) => {
    const next = fowls.find((fowl) => String(fowl.id) === value);
    if (!next) return;
    onRootChange?.(next.name);
    onDirectionChange('down');
    setSelected(null);
    setHighlightId(null);
  };

  const clearFilters = () => {
    changeFilters(DEFAULT_LINEAGE_TREE_FILTERS);
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
          aria-expanded="false"
          title="Expand this branch"
          className="border-border bg-card text-foreground focus-visible:ring-brand-orange absolute -top-2 -right-2 z-10 inline-flex h-6 min-w-6 cursor-pointer items-center justify-center rounded-full border px-1 text-[10px] font-black shadow-xs after:absolute after:-inset-2.5 after:content-[''] hover:bg-muted focus-visible:ring-2 focus-visible:outline-none"
        >
          {node.hiddenDescendants > 0 ? `+${node.hiddenDescendants}` : <ChevronDown className="h-3 w-3" />}
        </button>
      );
    }

    // Depth-cut counters are not shown: the canvas is fixed at
    // FAMILY_TREE_GENERATIONS, so branches at the edge simply stop.
    if (Math.abs(node.generation) >= FAMILY_TREE_GENERATIONS - 1) return null;

    return (
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onToggleCollapsed(node.id);
        }}
        aria-label={`Collapse branch of ${node.fowl.name}`}
        aria-expanded="true"
        title="Collapse this branch"
        className="border-border bg-card text-muted-foreground focus-visible:ring-brand-orange absolute -top-2 -right-2 z-10 inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border shadow-xs after:absolute after:-inset-2.5 after:content-[''] hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:outline-none"
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
    const isDimmed = !matchingNodeIds.has(node.id);
    const offspringCount = (index.childrenByParent.get(node.id) ?? []).length;
    const fightsEnabled = canFight(fowl);
    const birdCrisscross = crisscrossForBird(fowl);
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
        <LineageBirdCard
          fowl={fowl}
          code={code}
          stats={stats}
          offspringCount={offspringCount}
          isRoot={node.isRoot}
          isSelected={isSelected}
          isHighlighted={isHighlighted}
          isDimmed={isDimmed}
          crisscross={
            birdCrisscross.classification.isCrisscross ? birdCrisscross : null
          }
          label={label}
          dataNodeId={node.id}
          onClick={() => selectBird(fowl)}
          onDoubleClick={() => focusBird(fowl)}
        />
        {branchControl(node)}
      </div>
    );
  };

  const renderPairHub = (pair: LineageLayoutPair) => {
    const sire = index.byId.get(pair.sireId);
    const dam = index.byId.get(pair.damId);
    if (!sire || !dam) return null;
    const isSelected = selected?.kind === 'pair' && selected.key === pair.key;
    const crisscross = classifyCrisscross(sire, dam, index);
    return (
      <Fragment key={pair.key}>
        <LineagePairBadge
          sireName={sire.name}
          damName={dam.name}
          childCount={pair.childCount}
          isSelected={isSelected}
          crisscross={crisscross}
          onClick={() => selectPair(pair.key)}
          className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
          style={{ left: pair.hubX, top: pair.hubY }}
        />
        {crisscross.isCrisscross && (
          <div
            className="absolute z-10 -translate-x-1/2"
            style={{ left: pair.hubX, top: pair.hubY + 18 }}
          >
            <CrisscrossBadge classification={crisscross} compact />
          </div>
        )}
      </Fragment>
    );
  };

  const isExpandedClass = expanded
    ? 'flex min-h-[calc(100dvh-4rem)] w-full flex-col gap-2'
    : 'space-y-3';

  return (
    <section className={isExpandedClass}>
      {/* Toolbar */}
      <div className="bg-card border-border rounded-xl border p-2.5 shadow-xs">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div ref={finderRef} className="relative min-w-[15rem] flex-[1_1_20rem] sm:max-w-md">
            <span
              aria-hidden="true"
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
            >
              <Search className="h-4 w-4" />
            </span>
            <input
              type="search"
              aria-label={t('lineageDirectory.searchLabel')}
              placeholder={t('lineageDirectory.searchPlaceholder')}
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
              className="border-input-border bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-brand-orange h-11 w-full rounded-lg border py-2 pr-9 pl-10 text-sm font-semibold focus-visible:ring-2 focus-visible:outline-none [&::-webkit-search-cancel-button]:appearance-none"
            />
            {finder && (
              <button
                type="button"
                aria-label={t('common.clear')}
                onClick={() => setFinder('')}
                className="text-muted-foreground hover:text-foreground focus-visible:ring-brand-orange absolute top-1/2 right-2 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded after:absolute after:-inset-2.5 after:content-[''] focus-visible:ring-2 focus-visible:outline-none"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            {finder.trim() !== '' && (
              <div
                role="listbox"
                aria-label={t('lineageDirectory.searchLabel')}
                className="bg-card border-border absolute top-full right-0 left-0 z-30 mt-1 max-h-64 overflow-y-auto rounded-lg border p-1 shadow-lg"
              >
                {finderMatches.length === 0 ? (
                  <p className="text-muted-foreground px-2 py-2 text-xs">
                    {t('lineageDirectory.noSearchResults')}
                  </p>
                ) : (
                  finderMatches.map((match, i) => (
                    <button
                      key={match.id}
                      type="button"
                      role="option"
                      aria-selected={i === finderIndex}
                      onMouseEnter={() => setFinderIndex(i)}
                      onClick={() => focusBird(match)}
                      className={`flex min-h-11 w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-left text-xs ${
                        i === finderIndex ? 'bg-accent-soft' : 'hover:bg-muted/60'
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

          <div className="flex min-w-0 shrink-0 items-center gap-1.5">
            <label htmlFor="lineage-flow-start" className="sr-only">
              {t('lineageDirectory.startingBird')}
            </label>
            <select
              id="lineage-flow-start"
              aria-label={t('lineageDirectory.startingBird')}
              value={root ? String(root.id) : ''}
              onChange={(event) => onStartingBirdChange(event.target.value)}
              className="border-border bg-card text-foreground focus-visible:ring-brand-orange h-11 min-w-[12rem] max-w-[15rem] cursor-pointer rounded-lg border px-2 text-xs font-bold focus-visible:ring-2 focus-visible:outline-none"
            >
              {startingBirdOptions.map((fowl) => (
                <option key={fowl.id} value={String(fowl.id)}>
                  {lineageBirdCode(fowl, codes) ? `${lineageBirdCode(fowl, codes)} · ` : ''}
                  {fowl.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex min-w-0 shrink-0 items-center gap-1.5">
            <label htmlFor="lineage-flow-sort" className="sr-only">
              {t('lineageDirectory.sortLabel')}
            </label>
            <select
              id="lineage-flow-sort"
              aria-label={t('lineageDirectory.sortLabel')}
              value={sortBy}
              onChange={(event) =>
                onSortChange?.(event.target.value as 'most' | 'name' | 'newest')
              }
              className="border-border bg-card text-foreground focus-visible:ring-brand-orange h-11 cursor-pointer rounded-lg border px-2 text-xs font-bold focus-visible:ring-2 focus-visible:outline-none"
            >
              <option value="most">{t('lineageDirectory.sortMost')}</option>
              <option value="name">{t('lineageDirectory.sortName')}</option>
              <option value="newest">{t('lineageDirectory.sortNewest')}</option>
            </select>
          </div>
        </div>

        <div className="mt-2.5 flex min-w-0 flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="View direction"
            className="border-border flex items-center overflow-hidden rounded-lg border"
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
                className={`h-10 min-h-11 cursor-pointer px-2.5 text-xs font-bold transition-colors focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:outline-none ${
                  direction === value
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {view === 'tree' && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onExpandAll}
                className="border-border text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-brand-orange h-10 min-h-11 cursor-pointer rounded-lg border px-2 text-xs font-bold whitespace-nowrap focus-visible:ring-2 focus-visible:outline-none"
              >
                Expand all
              </button>
              <button
                type="button"
                onClick={onCollapseAll}
                className="border-border text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-brand-orange h-10 min-h-11 cursor-pointer rounded-lg border px-2 text-xs font-bold whitespace-nowrap focus-visible:ring-2 focus-visible:outline-none"
              >
                Collapse all
              </button>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            {view === 'tree' && (
              <button
                type="button"
                aria-pressed={expanded}
                onClick={() => setExpanded((value) => !value)}
                aria-label={expanded ? 'Exit expanded canvas' : 'Expand canvas'}
                title={expanded ? 'Exit expanded canvas' : 'Expand canvas'}
                className="border-border text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-brand-orange inline-flex h-10 min-h-11 cursor-pointer items-center gap-1 rounded-lg border px-2 text-xs font-bold focus-visible:ring-2 focus-visible:outline-none"
              >
                {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                {expanded ? 'Exit' : 'Expand'}
              </button>
            )}

            <div
              role="group"
              aria-label={t('lineageDirectory.viewLabel')}
              className="border-border bg-muted/40 flex items-center gap-0.5 rounded-lg border p-0.5"
            >
              {(
                [
                  ['tree', t('lineageDirectory.viewTree'), Network],
                  ['table', t('lineageDirectory.viewTable'), Table2],
                ] as const
              ).map(([value, label, Icon]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={view === value}
                  aria-label={label}
                  title={label}
                  onClick={() => changeView(value)}
                  className={`inline-flex h-10 min-h-11 cursor-pointer items-center gap-1.5 rounded-md px-2 text-xs font-black transition-colors focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:outline-none ${
                    view === value
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="border-border/70 mt-2.5 flex min-w-0 flex-wrap items-center gap-2 border-t pt-2.5">
          <div
            role="group"
            aria-label={t('lineageDirectory.sexHighlight')}
            className="border-border flex items-center overflow-hidden rounded-lg border"
          >
            {(
              [
                ['all', t('lineageDirectory.sexAll')],
                ['male', t('lineageDirectory.sexCocks')],
                ['female', t('lineageDirectory.sexHens')],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={sexFocus === value}
                onClick={() => setSexFocus(value)}
                className={`h-9 min-h-11 cursor-pointer px-2.5 text-xs font-bold transition-colors focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:outline-none ${
                  sexFocus === value
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <span className="text-muted-foreground inline-flex items-center gap-1 text-[10px] font-black tracking-wider uppercase">
            <SlidersHorizontal className="h-3 w-3" aria-hidden="true" />
            {t('lineageDirectory.highlightFilters')}
          </span>

          <label className="text-muted-foreground inline-flex items-center gap-1 text-xs font-bold">
            <span className="sr-only">{t('lineageDirectory.generation')}</span>
            <select
              aria-label={t('lineageDirectory.generation')}
              value={filters.generation}
              onChange={(event) =>
                changeFilters({
                  ...filters,
                  generation: event.target.value as LineageGenerationFilter,
                })
              }
              className="border-border bg-card text-foreground focus-visible:ring-brand-orange h-9 min-h-11 cursor-pointer rounded-lg border px-2 text-xs font-bold focus-visible:ring-2 focus-visible:outline-none"
            >
              <option value="all">
                {t('lineageDirectory.generation')}: {t('lineageDirectory.generationAll')}
              </option>
              <option value="1">
                {t('lineageDirectory.generation')}: {t('lineageDirectory.generationOne')}
              </option>
              <option value="2">
                {t('lineageDirectory.generation')}: {t('lineageDirectory.generationTwo')}
              </option>
              <option value="3">
                {t('lineageDirectory.generation')}: {t('lineageDirectory.generationThree')}
              </option>
            </select>
          </label>

          <label className="text-muted-foreground inline-flex items-center gap-1 text-xs font-bold">
            <span className="sr-only">{t('lineageDirectory.featherColor')}</span>
            <select
              aria-label={t('lineageDirectory.featherColor')}
              value={filters.feather}
              onChange={(event) =>
                changeFilters({ ...filters, feather: event.target.value })
              }
              className="border-border bg-card text-foreground focus-visible:ring-brand-orange h-9 min-h-11 max-w-[12rem] cursor-pointer rounded-lg border px-2 text-xs font-bold focus-visible:ring-2 focus-visible:outline-none"
            >
              <option value="all">
                {t('lineageDirectory.featherColor')}: {t('lineageDirectory.featherAll')}
              </option>
              {featherOptions.map((color) => (
                <option key={color} value={color}>
                  {color}
                </option>
              ))}
            </select>
          </label>

          <label className="text-muted-foreground inline-flex items-center gap-1 text-xs font-bold">
            <span className="sr-only">{t('lineageDirectory.pairType')}</span>
            <select
              aria-label={t('lineageDirectory.pairType')}
              value={filters.pair}
              onChange={(event) =>
                changeFilters({
                  ...filters,
                  pair: event.target.value as LineagePairFilter,
                })
              }
              className="border-border bg-card text-foreground focus-visible:ring-brand-orange h-9 min-h-11 cursor-pointer rounded-lg border px-2 text-xs font-bold focus-visible:ring-2 focus-visible:outline-none"
            >
              <option value="all">
                {t('lineageDirectory.pairType')}: {t('lineageDirectory.pairAll')}
              </option>
              <option value="crisscross">{t('lineageDirectory.pairCrisscross')}</option>
              <option value="outcross">{t('lineageDirectory.pairOutcross')}</option>
              <option value="others">{t('lineageDirectory.pairOthers')}</option>
            </select>
          </label>

          <span
            aria-live="polite"
            className="text-muted-foreground ml-auto text-xs font-bold"
          >
            {t('lineageDirectory.matchCount', {
              count: matchingNodeIds.size,
            })}
          </span>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-primary focus-visible:ring-brand-orange h-9 min-h-11 cursor-pointer rounded-lg px-2 text-xs font-black underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:outline-none"
            >
              {t('lineageDirectory.clearFilters')}
            </button>
          )}
        </div>

        {query.trim() !== '' && (
          <div className="mt-2 flex flex-wrap items-center gap-2 px-1">
            <span className="text-muted-foreground text-xs font-semibold">
              {queryMatches.length === 0 ? (
                <>
                  {t('lineageDirectory.noSearchResults')} “{query.trim()}”
                </>
              ) : (
                <>
                  {queryMatches.length} match{queryMatches.length === 1 ? '' : 'es'} for “
                  {query.trim()}”
                  <button
                    type="button"
                    onClick={() => focusBird(queryMatches[0])}
                    className="text-primary focus-visible:ring-brand-orange ml-1 cursor-pointer font-bold hover:underline focus-visible:ring-2 focus-visible:outline-none"
                  >
                    Focus first
                  </button>
                </>
              )}
            </span>
          </div>
        )}
      </div>

      <div className={`flex min-h-0 flex-col gap-3 ${expanded ? 'flex-1 xl:flex-row' : 'xl:flex-row xl:items-start'}`}>
        {view === 'table' ? (
          <div className="min-w-0 flex-1">
            <LineageTableView
              nodes={tableNodes}
              totalCount={layout?.nodes.length ?? 0}
              codes={codes}
              index={index}
              statsOf={statsOf}
              generationNumberByGen={generationNumberByGen}
              pairTypeByNode={pairTypeByNode}
              selectedId={selectedBird ? String(selectedBird.id) : null}
              onSelect={(fowl) => selectBird(fowl)}
            />
          </div>
        ) : (
        <>
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
                {layout.generations.map((row, rowIndex) => (
                  <div
                    key={row.gen}
                    className="absolute flex items-center gap-1.5"
                    style={{ left: 12, top: row.y - 28 }}
                  >
                    <span className="border-primary/20 bg-accent-soft text-primary rounded-full border px-2 py-0.5 text-[10px] font-black tracking-wider uppercase shadow-xs">
                      {rowIndex === 0
                        ? t('lineageDirectory.generationParents')
                        : t('lineageDirectory.generationNumber', { number: rowIndex + 1 })}
                    </span>
                  </div>
                ))}

                <svg
                  width={layout.width}
                  height={layout.height}
                  className="text-input-border pointer-events-none absolute inset-0"
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
        </>
        )}

        {/* Details / legend */}
        {!expanded && (
          <aside
            aria-label={t('lineageDirectory.detailsAria')}
            className="bg-card border-border w-full shrink-0 rounded-xl border p-4 shadow-sm xl:w-80 2xl:w-96"
          >
            {selectedBird ? (
              <div className="space-y-3" data-testid="lineage-details">
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="text-primary focus-visible:ring-brand-orange inline-flex min-h-11 cursor-pointer items-center gap-1 rounded text-xs font-black hover:underline focus-visible:ring-2 focus-visible:outline-none"
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  {t('lineageDirectory.backToInsights')}
                </button>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <ChickenPhoto
                      name={selectedBird.name}
                      code={lineageBirdCode(selectedBird, codes)}
                      imageUrl={selectedBird.image_url}
                      photoPath={selectedBird.photo_path}
                      photoThumbPath={selectedBird.photo_thumb_path}
                      size={40}
                      className="border-border h-10 w-10"
                      fallback={
                        <span
                          className={`flex h-full w-full items-center justify-center text-xs font-black ${
                            sexLabel(selectedBird) === 'Hen'
                              ? 'bg-hen-bg text-hen'
                              : 'bg-cock-bg text-cock'
                          }`}
                        >
                          {initials(selectedBird.name)}
                        </span>
                      }
                    />
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
                  {featherColorOf(selectedBird) && (
                    <span className="border-border bg-muted text-muted-foreground rounded-full border px-2 py-0.5 font-bold">
                      {featherColorOf(selectedBird)}
                    </span>
                  )}
                  {canFight(selectedBird) && selectedBird.wing_band && (
                    <span className="border-border bg-muted text-muted-foreground rounded-full border px-2 py-0.5 font-bold">
                      {t('lineageDirectory.wingBand', { band: selectedBird.wing_band })}
                    </span>
                  )}
                  <LineageStatusBadge fowl={selectedBird} />
                  {selectedBird.age && (
                    <span className="border-border bg-muted text-muted-foreground rounded-full border px-2 py-0.5 font-bold">
                      {selectedBird.age}
                    </span>
                  )}
                  {(() => {
                    const info = crisscrossForBird(selectedBird);
                    return info.classification.isCrisscross ? (
                      <CrisscrossBadge
                        classification={info.classification}
                        pairName={info.pairName}
                        compact
                      />
                    ) : null;
                  })()}
                </div>

                {canFight(selectedBird) && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-[10px] font-black tracking-widest uppercase">
                      Record
                    </span>
                    {(selectedBirdStats?.total ?? 0) > 0 ? (
                      <LineageRecordPill stats={selectedBirdStats!} compact={false} />
                    ) : (
                      <span className="text-muted-foreground text-xs font-bold">
                        {t('lineageDirectory.noFights')}
                      </span>
                    )}
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
                            className="text-card-foreground hover:text-primary max-w-[70%] cursor-pointer truncate font-bold hover:underline"
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
                    className="bg-primary text-primary-foreground hover:bg-accent focus-visible:ring-brand-orange inline-flex min-h-11 cursor-pointer items-center gap-1 rounded px-2 py-1.5 text-xs font-bold focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <User className="h-3.5 w-3.5" /> {t('lineageDirectory.viewProfile')}
                  </button>
                  {canFight(selectedBird) && (
                    <button
                      type="button"
                      onClick={() => onShowFights(selectedBird)}
                      className="border-border hover:bg-muted focus-visible:ring-brand-orange inline-flex min-h-11 cursor-pointer items-center gap-1 rounded border px-2 py-1.5 text-xs font-bold focus-visible:ring-2 focus-visible:outline-none"
                    >
                      <Swords className="h-3.5 w-3.5" /> {t('lineageDirectory.fightHistory')}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => focusInTree(selectedBird)}
                    className="border-border hover:bg-muted focus-visible:ring-brand-orange inline-flex min-h-11 cursor-pointer items-center gap-1 rounded border px-2 py-1.5 text-xs font-bold focus-visible:ring-2 focus-visible:outline-none"
                  >
                    {t('lineageDirectory.focus')}
                  </button>
                  {onViewAncestors && (
                    <button
                      type="button"
                      onClick={() => onViewAncestors(selectedBird)}
                      className="border-border hover:bg-muted focus-visible:ring-brand-orange inline-flex min-h-11 cursor-pointer items-center gap-1 rounded border px-2 py-1.5 text-xs font-bold focus-visible:ring-2 focus-visible:outline-none"
                    >
                      <GitBranch className="h-3.5 w-3.5" /> {t('lineageDirectory.viewAncestors')}
                    </button>
                  )}
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
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="text-primary focus-visible:ring-brand-orange inline-flex min-h-11 cursor-pointer items-center gap-1 rounded text-xs font-black hover:underline focus-visible:ring-2 focus-visible:outline-none"
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  {t('lineageDirectory.backToInsights')}
                </button>
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

                {selectedPairCrisscross?.isCrisscross && (
                  <div className="space-y-1">
                    <CrisscrossBadge classification={selectedPairCrisscross} />
                    <p className="text-muted-foreground text-xs font-semibold">
                      {selectedPairCrisscross.reason}
                    </p>
                  </div>
                )}

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
                          ? 'border-cock/20 bg-cock-bg/60'
                          : 'border-hen/20 bg-hen-bg/60'
                      }`}
                    >
                      <p
                        className={`text-[10px] font-black tracking-wider uppercase ${
                          tone === 'sky' ? 'text-cock' : 'text-hen'
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
                  <LineageRecordPill stats={pairStats} compact={false} />
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
                    className="bg-primary text-primary-foreground hover:bg-accent focus-visible:ring-brand-orange inline-flex min-h-11 cursor-pointer items-center gap-1 rounded px-2 py-1.5 text-xs font-bold focus-visible:ring-2 focus-visible:outline-none"
                  >
                    Focus family
                  </button>
                </div>
              </div>
            ) : (
              <LineageInsights
                rootNames={rootNames}
                birdCount={layout?.nodes.length ?? 0}
                generationCount={shownGenerationCount}
                pairCount={shownPairCount}
                cocksFought={treeFoughtCocks.length}
                cocksShown={treeCocks.length}
                combinedRecord={treeCombinedRecord}
              />
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
