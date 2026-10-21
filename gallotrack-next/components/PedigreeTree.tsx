'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FowlRecord } from '@/lib/types';
import {
  getFowlBloodlineStats,
  UNKNOWN_BLOODLINE,
  isFoundationName,
} from '@/lib/bloodline-composition';
import { getBreedingClassification } from '@/lib/breeding-classification';
import { getOffspringParentageRelatedness } from '@/lib/relatedness-classification';
import RelatednessBadge from '@/components/RelatednessBadge';
import { birdCodeOf, compareBirdCodesNatural, formatBirdCodeForDisplay } from '@/lib/bird-code';
import { useUI } from '@/lib/contexts/ui-context';
import BloodlineBreakdown from '@/components/BloodlineBreakdown';
import ChickenIcon from '@/components/ChickenIcon';
import { Card, CardContent } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tooltip } from '@/components/ui/Tooltip';
import { Button } from '@/components/ui/Button';
import { SkipLink } from '@/components/ui/SkipLink';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Printer,
  ExternalLink,
  Plus,
  UserPlus,
  Search,
  X,
} from 'lucide-react';

const keyFn = (v?: string | null) =>
  String(v ?? '')
    .trim()
    .toLowerCase();

export type PedigreeNode = {
  id: string;
  gen: number;
  startRow: number;
  rowSpan: number;
  fowl: FowlRecord | null;
  name: string;
  isMerged?: boolean;
  role: 'subject' | 'sire' | 'dam' | 'unknown';
  sireName?: string;
  damName?: string;
  childBreedHint?: string;
  childName?: string;
};

function resolveFowlByName(
  fowls: FowlRecord[],
  byName: Map<string, FowlRecord>,
  name?: string | null,
): FowlRecord | undefined {
  if (isFoundationName(name)) return undefined;
  return byName.get(keyFn(name));
}

export function buildPedigreeGrid(
  subject: FowlRecord,
  fowls: FowlRecord[],
  byName: Map<string, FowlRecord>,
  numGens: number,
): { nodes: PedigreeNode[]; totalRows: number } {
  const totalRows = Math.pow(2, numGens - 1);
  const nodes: PedigreeNode[] = [];

  // Generation 0: Subject
  nodes.push({
    id: `g0-r0`,
    gen: 0,
    startRow: 1,
    rowSpan: totalRows,
    fowl: subject,
    name: subject.name,
    role: 'subject',
  });

  let currentLevelNodes: PedigreeNode[] = [nodes[0]];

  for (let gen = 1; gen < numGens; gen++) {
    const nextLevelNodes: PedigreeNode[] = [];

    for (const parentNode of currentLevelNodes) {
      if (!parentNode.fowl || parentNode.isMerged) continue;

      const f = parentNode.fowl;
      const sireName = f.sire;
      const damName = f.dam;
      const sireFowl = resolveFowlByName(fowls, byName, sireName);
      const damFowl = resolveFowlByName(fowls, byName, damName);
      const sireAbsent = !sireFowl;
      const damAbsent = !damFowl;

      const childSpan = parentNode.rowSpan;
      const halfSpan = childSpan / 2;
      const sireStartRow = parentNode.startRow;
      const damStartRow = parentNode.startRow + halfSpan;

      if (sireAbsent && damAbsent) {
        const mergedNode: PedigreeNode = {
          id: `g${gen}-merged-${parentNode.startRow}`,
          gen,
          startRow: parentNode.startRow,
          rowSpan: childSpan,
          fowl: null,
          name: 'Foundation stock',
          isMerged: true,
          role: 'unknown',
          childBreedHint: f.breed || undefined,
          childName: f.name,
        };
        nodes.push(mergedNode);
        nextLevelNodes.push(mergedNode);
      } else {
        const sireNode: PedigreeNode = {
          id: `g${gen}-sire-${sireStartRow}`,
          gen,
          startRow: sireStartRow,
          rowSpan: halfSpan,
          fowl: sireFowl ?? null,
          name: sireFowl ? sireFowl.name : sireName || 'Foundation stock',
          role: 'sire',
          childBreedHint: f.breed || undefined,
          childName: f.name,
        };
        const damNode: PedigreeNode = {
          id: `g${gen}-dam-${damStartRow}`,
          gen,
          startRow: damStartRow,
          rowSpan: halfSpan,
          fowl: damFowl ?? null,
          name: damFowl ? damFowl.name : damName || 'Foundation stock',
          role: 'dam',
          childBreedHint: f.breed || undefined,
          childName: f.name,
        };
        nodes.push(sireNode);
        nodes.push(damNode);
        nextLevelNodes.push(sireNode);
        nextLevelNodes.push(damNode);
      }
    }

    currentLevelNodes = nextLevelNodes;
  }

  return { nodes, totalRows };
}

type ConnectorPath = {
  id: string;
  path: string;
  isDashed: boolean;
};

function computeGridConnectors(
  nodes: PedigreeNode[],
  numGens: number,
  totalRows: number,
  colWidth = 220,
  colGap = 48,
  rowHeight = 76,
  paddingLeft = 20,
  paddingTop = 20,
): ConnectorPath[] {
  const paths: ConnectorPath[] = [];

  for (const node of nodes) {
    if (!node.fowl || node.isMerged || node.gen >= numGens - 1) continue;

    const gen = node.gen;
    const childCenterX = paddingLeft + gen * (colWidth + colGap) + colWidth;
    const childCenterY = paddingTop + (node.startRow - 1 + node.rowSpan / 2) * rowHeight;
    const midX = childCenterX + colGap / 2;
    const parentLeftX = paddingLeft + (gen + 1) * (colWidth + colGap);

    const childNextGenNodes = nodes.filter(
      (n) =>
        n.gen === gen + 1 &&
        n.startRow >= node.startRow &&
        n.startRow < node.startRow + node.rowSpan,
    );

    for (const pNode of childNextGenNodes) {
      const parentCenterY = paddingTop + (pNode.startRow - 1 + pNode.rowSpan / 2) * rowHeight;
      const pathD = `M ${childCenterX} ${childCenterY} H ${midX} V ${parentCenterY} H ${parentLeftX}`;
      paths.push({
        id: `c-${node.id}-to-${pNode.id}`,
        path: pathD,
        isDashed: Boolean(pNode.isMerged),
      });
    }
  }

  return paths;
}

function AncestorAvatar({ image_url, gender }: { image_url?: string | null; gender?: string }) {
  if (image_url) {
    return (
      <img
        src={image_url}
        alt=""
        aria-hidden="true"
        className="bg-muted border-border h-8 w-8 shrink-0 rounded-full border object-cover"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = 'none';
        }}
      />
    );
  }
  const tone = gender && gender.toLowerCase().includes('hen') ? 'text-pink-500' : 'text-info';
  return (
    <div
      aria-hidden="true"
      className="bg-muted border-border flex h-8 w-8 shrink-0 items-center justify-center rounded-full border"
    >
      <ChickenIcon className={`h-4 w-4 ${tone}`} />
    </div>
  );
}

type CompactNodeCardProps = {
  node: PedigreeNode;
  fowls: FowlRecord[];
  codes: Map<string, string>;
  canRegisterAncestor: boolean;
  onRecenter: (f: FowlRecord) => void;
  onViewProfile: (f: FowlRecord) => void;
  onRegisterMerged: (hint: { side?: 'sire' | 'dam'; breed?: string; childName: string }) => void;
  onRegisterSingle: (hint: {
    side: 'sire' | 'dam';
    breed?: string;
    childName: string;
    placeholderName: string;
  }) => void;
};

export function CompactNodeCard(props: CompactNodeCardProps) {
  const {
    node,
    fowls,
    codes,
    canRegisterAncestor,
    onRecenter,
    onViewProfile,
    onRegisterMerged,
    onRegisterSingle,
  } = props;
  const { fowl, name, isMerged, role, childBreedHint, childName } = node;

  const stats = useMemo(
    () => (!isMerged && fowl ? getFowlBloodlineStats(fowl, fowls ?? []) : null),
    [isMerged, fowl, fowls],
  );
  const classification = useMemo(
    () => (!isMerged && fowl ? getBreedingClassification(fowl, fowls ?? []) : null),
    [isMerged, fowl, fowls],
  );
  const recenter = useCallback(() => {
    if (!isMerged && fowl) onRecenter(fowl);
  }, [isMerged, fowl, onRecenter]);

  const viewProfile = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!isMerged && fowl) onViewProfile(fowl);
    },
    [isMerged, fowl, onViewProfile],
  );

  const roleBorder =
    role === 'subject'
      ? 'border-l-4 border-l-emerald-500 border-border bg-card'
      : role === 'sire'
        ? 'border-l-4 border-l-sky-500 border-border bg-card'
        : role === 'dam'
          ? 'border-l-4 border-l-pink-500 border-border bg-card'
          : 'border-l-4 border-l-slate-400 border-dashed border-border bg-card/85';

  if (isMerged) {
    return (
      <div
        data-node-box="true"
        data-gen={node.gen}
        data-start-row={node.startRow}
        data-row-span={node.rowSpan}
        className={`h-[64px] w-[220px] shrink-0 rounded-md border text-left ${roleBorder} flex items-center justify-between gap-2 self-center px-2.5 py-1.5 shadow-2xs transition-all`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="bg-muted/80 text-muted-foreground border-border flex h-8 w-8 shrink-0 items-center justify-center rounded-full border">
            <UserPlus className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-card-foreground truncate text-xs leading-tight font-black">
              Foundation stock
            </p>
            <p className="text-muted-foreground truncate text-[10px] font-semibold">
              Not registered
            </p>
          </div>
        </div>
        {canRegisterAncestor && (
          <Tooltip content="Register foundation ancestor">
            <button
              type="button"
              onClick={() =>
                onRegisterMerged({ breed: childBreedHint, childName: childName || '' })
              }
              aria-label="Register foundation ancestor"
              className="bg-muted text-muted-foreground flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-emerald-500/20 hover:text-emerald-600 dark:hover:text-emerald-400"
            >
              <Plus className="h-4 w-4" />
            </button>
          </Tooltip>
        )}
      </div>
    );
  }

  const code = fowl
    ? formatBirdCodeForDisplay(codes.get(String(fowl.id)) || birdCodeOf(fowl, fowls))
    : '';
  const missing = !fowl;

  const displayBreed =
    classification?.type === 'Crossbred' ? classification.derivedBreed : fowl?.breed;
  const isAssumed =
    classification?.compositionSource === 'assumed' || !!classification?.basedOnAssumed;
  const baseSummary = stats ? stats.summary : displayBreed ? displayBreed : 'Not registered';
  const summaryTitle = isAssumed ? `${baseSummary} (assumed lineage)` : baseSummary;

  const onKey = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && fowl) {
      e.preventDefault();
      recenter();
    }
  };

  if (missing) {
    return (
      <div
        data-node-box="true"
        data-gen={node.gen}
        data-start-row={node.startRow}
        data-row-span={node.rowSpan}
        className={`h-[64px] w-[220px] shrink-0 rounded-md border text-left ${roleBorder} flex items-center justify-between gap-2 self-center px-2.5 py-1.5 shadow-2xs transition-all`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <AncestorAvatar gender={role === 'dam' ? 'Hen' : 'Rooster'} />
          <div className="min-w-0 flex-1">
            <p
              className="text-card-foreground truncate text-xs leading-tight font-black"
              title={name}
            >
              {name || 'Foundation stock'}
            </p>
            <p className="text-muted-foreground truncate text-[10px] font-semibold">
              Not registered
            </p>
          </div>
        </div>
        {canRegisterAncestor && (
          <Tooltip content={`Register ancestor ${name || ''}`}>
            <button
              type="button"
              onClick={() =>
                onRegisterSingle({
                  side: role === 'dam' ? 'dam' : 'sire',
                  breed: childBreedHint,
                  childName: childName || '',
                  placeholderName: name,
                })
              }
              aria-label={`Register ancestor ${name || ''}`}
              className="bg-muted text-muted-foreground flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-emerald-500/20 hover:text-emerald-600 dark:hover:text-emerald-400"
            >
              <Plus className="h-4 w-4" />
            </button>
          </Tooltip>
        )}
      </div>
    );
  }

  const ariaLabel = `${node.role.toUpperCase()}: ${name}${code ? `, code ${code}` : ''}, ${baseSummary}${isAssumed ? ' (assumed)' : ''}`;

  return (
    <div
      data-node-box="true"
      data-gen={node.gen}
      data-start-row={node.startRow}
      data-row-span={node.rowSpan}
      role="treeitem"
      aria-selected={role === 'subject'}
      tabIndex={0}
      aria-label={ariaLabel}
      aria-level={node.gen + 1}
      onClick={recenter}
      onKeyDown={onKey}
      className={`group h-[64px] w-[220px] shrink-0 rounded-md border text-left ${roleBorder} flex cursor-pointer items-center justify-between gap-2 self-center px-2.5 py-1.5 shadow-2xs transition-all hover:border-emerald-400/80 hover:shadow-xs focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <AncestorAvatar image_url={fowl.image_url} gender={fowl.gender} />
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex min-w-0 items-center gap-1">
            {code && (
              <span className="py-0.2 shrink-0 rounded bg-emerald-100/80 px-1 font-mono text-[10px] font-black text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300">
                [{code}]
              </span>
            )}
            <span
              className="text-card-foreground truncate text-xs leading-tight font-black"
              title={name}
            >
              {name}
            </span>
          </div>
          <p className="text-muted-foreground truncate text-[11px] font-bold" title={summaryTitle}>
            <span>{baseSummary}</span>
            {isAssumed && baseSummary !== 'Not registered' && (
              <span
                className="ml-1 text-xs font-extrabold text-amber-600 dark:text-amber-400"
                aria-label="Assumed lineage"
              >
                ~
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {fowl.status === 'Archived' ? (
          <span className="rounded bg-amber-100 px-1 text-[9px] font-extrabold text-amber-700 uppercase dark:bg-amber-950/80 dark:text-amber-300">
            Archived
          </span>
        ) : fowl.status === 'Deceased' ? (
          <span className="rounded bg-rose-100 px-1 text-[9px] font-extrabold text-rose-700 uppercase dark:bg-rose-950/80 dark:text-rose-300">
            Deceased
          </span>
        ) : (
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" title="Active" />
        )}
        <button
          type="button"
          onClick={viewProfile}
          aria-label={`View profile of ${name}`}
          title={`View profile of ${name}`}
          className="text-muted-foreground cursor-pointer rounded p-1 transition-colors hover:text-emerald-600 dark:hover:text-emerald-400"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

type SubjectSelectorProps = {
  fowls: FowlRecord[];
  codes: Map<string, string>;
  subject: FowlRecord;
  onSelect: (f: FowlRecord) => void;
};

function SubjectSelector({ fowls, codes, subject, onSelect }: SubjectSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const sortedFowls = useMemo(() => {
    return [...fowls].sort((a, b) => {
      const ca = codes.get(String(a.id)) || birdCodeOf(a, fowls);
      const cb = codes.get(String(b.id)) || birdCodeOf(b, fowls);
      return compareBirdCodesNatural(ca, cb);
    });
  }, [fowls, codes]);

  const matchingFowls = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sortedFowls;
    return sortedFowls.filter((f) => {
      if (f.name.toLowerCase().includes(q)) return true;
      const code = codes.get(String(f.id)) || birdCodeOf(f, fowls);
      if (code.toLowerCase().includes(q)) return true;
      if (f.bird_code && f.bird_code.toLowerCase().includes(q)) return true;
      if (f.chicken_code && f.chicken_code.toLowerCase().includes(q)) return true;
      if (f.birth_code && f.birth_code.toLowerCase().includes(q)) return true;
      if (f.wing_band && f.wing_band.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [searchQuery, sortedFowls, codes, fowls]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  const subjectCode = codes.get(String(subject.id)) || birdCodeOf(subject, fowls);
  const displayLabel = `${formatBirdCodeForDisplay(subjectCode) ? `${formatBirdCodeForDisplay(subjectCode)} · ` : ''}${subject.name}`;

  return (
    <div ref={dropdownRef} className="relative min-w-[260px] flex-1 sm:min-w-[320px]">
      <div className="relative">
        <span
          aria-hidden="true"
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 z-10 -translate-y-1/2"
        >
          <Search className="h-3.5 w-3.5" />
        </span>
        <input
          type="search"
          aria-label="Search pedigree subject"
          placeholder={displayLabel || 'Search subject by code, name, wing band…'}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setDropdownOpen(true);
          }}
          onFocus={() => setDropdownOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              setSearchQuery('');
              setDropdownOpen(false);
            }
          }}
          className="border-input-border bg-card text-card-foreground placeholder:text-foreground/90 h-9 w-full rounded-md border py-2 pr-8 pl-9 text-xs font-bold transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 sm:text-sm [&::-webkit-search-cancel-button]:appearance-none"
        />
        {searchQuery.length > 0 && (
          <button
            type="button"
            aria-label="Clear subject search"
            onClick={() => {
              setSearchQuery('');
              setDropdownOpen(false);
            }}
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer rounded p-1 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {dropdownOpen && matchingFowls.length > 0 && (
        <div
          role="listbox"
          aria-label="Matching chickens"
          className="bg-card border-border divide-border/50 absolute top-full right-0 left-0 z-50 mt-1.5 max-h-80 divide-y overflow-hidden overflow-y-auto rounded-lg border shadow-xl"
        >
          <div className="bg-muted/50 text-muted-foreground px-3 py-1.5 text-xs font-bold tracking-wider uppercase">
            Matching Chickens ({matchingFowls.length})
          </div>
          {matchingFowls.slice(0, 100).map((f) => {
            const code = codes.get(String(f.id)) || birdCodeOf(f, fowls);
            const isSelected = f.id === subject.id;
            return (
              <button
                key={f.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onSelect(f);
                  setDropdownOpen(false);
                  setSearchQuery('');
                }}
                className={`group flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2 text-left transition-colors ${isSelected ? 'bg-emerald-500/10 dark:bg-emerald-950/30' : 'hover:bg-emerald-500/10 dark:hover:bg-emerald-950/30'}`}
              >
                <div className="flex min-w-0 items-center gap-2">
                  {code && (
                    <span className="shrink-0 rounded border border-emerald-200/60 bg-emerald-100 px-1.5 py-0.5 font-mono text-xs font-black text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
                      [{formatBirdCodeForDisplay(code)}]
                    </span>
                  )}
                  <span className="text-card-foreground truncate text-xs font-bold group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                    {f.name}
                  </span>
                </div>
                {f.registry_role && (
                  <span className="bg-muted text-muted-foreground shrink-0 rounded px-1.5 py-0.5 text-xs font-black uppercase">
                    {f.registry_role}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

type Props = {
  fowls: FowlRecord[];
  codes: Map<string, string>;
  selectedId?: number | null;
  onSelect?: (f: FowlRecord) => void;
  onViewProfile?: (f: FowlRecord) => void;
  loading?: boolean;
  canRegisterAncestor?: boolean;
};

export default function PedigreeTree({
  fowls,
  codes,
  selectedId,
  onSelect,
  onViewProfile,
  loading = false,
  canRegisterAncestor = false,
}: Props) {
  const ui = useUI();
  const [internalId, setInternalId] = useState<number | null>(null);
  const [numGens, setNumGens] = useState<number>(3);
  const [breadcrumb, setBreadcrumb] = useState<{ id: number; name: string }[]>([]);

  const activeId = selectedId != null ? selectedId : internalId;

  const byName = useMemo(() => {
    const m = new Map<string, FowlRecord>();
    fowls.forEach((f) => {
      const k = keyFn(f.name);
      if (k && !m.has(k)) m.set(k, f);
    });
    return m;
  }, [fowls]);

  const subject = useMemo(
    () => (activeId != null ? (fowls.find((f) => f.id === activeId) ?? null) : (fowls[0] ?? null)),
    [fowls, activeId],
  );

  const stats = useMemo(
    () => (subject ? getFowlBloodlineStats(subject, fowls) : null),
    [subject, fowls],
  );

  const parentageRelatedness = useMemo(
    () => (subject ? getOffspringParentageRelatedness(subject, fowls) : null),
    [subject, fowls],
  );

  const sortedFowls = useMemo(() => {
    return [...fowls].sort((a, b) => {
      const ca = codes.get(String(a.id)) || birdCodeOf(a, fowls);
      const cb = codes.get(String(b.id)) || birdCodeOf(b, fowls);
      return compareBirdCodesNatural(ca, cb);
    });
  }, [fowls, codes]);

  const currentIndex = useMemo(() => {
    if (!subject) return -1;
    return sortedFowls.findIndex((f) => f.id === subject.id);
  }, [sortedFowls, subject]);

  const { nodes, totalRows } = useMemo(() => {
    if (!subject) return { nodes: [], totalRows: 4 };
    return buildPedigreeGrid(subject, fowls, byName, numGens);
  }, [subject, fowls, byName, numGens]);

  const rowHeight = 76;
  const colWidth = 220;
  const colGap = 48;
  const paddingX = 20;
  const paddingTop = 20;

  const innerWidth = numGens * colWidth + (numGens - 1) * colGap + paddingX * 2;
  const innerHeight = totalRows * rowHeight + paddingTop * 2;

  const connectorPaths = useMemo(
    () =>
      computeGridConnectors(
        nodes,
        numGens,
        totalRows,
        colWidth,
        colGap,
        rowHeight,
        paddingX,
        paddingTop,
      ),
    [nodes, numGens, totalRows, colWidth, colGap, rowHeight, paddingX, paddingTop],
  );

  const updateUrlForSubject = useCallback(
    (f: FowlRecord) => {
      if (typeof window === 'undefined') return;
      const code = codes.get(String(f.id)) || birdCodeOf(f, fowls);
      const params = new URLSearchParams(window.location.search);
      params.set('chicken', code || String(f.id));
      const existingTab = new URLSearchParams(window.location.search).get('tab');
      if (existingTab) {
        params.set('tab', existingTab);
      }
      const qs = params.toString();
      const newUrl = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`;
      try {
        window.history.replaceState({ ...window.history.state }, '', newUrl);
      } catch (_err) {
        // no-op
      }
    },
    [codes, fowls],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (selectedId != null) return;
    if (fowls.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const chicken = params.get('chicken');
    if (!chicken) return;
    const norm = chicken.trim().toLowerCase();
    const found = fowls.find((f) => {
      const code = codes.get(String(f.id)) || birdCodeOf(f, fowls);
      if (code && code.toLowerCase() === norm) return true;
      if (f.bird_code && f.bird_code.toLowerCase() === norm) return true;
      if (f.chicken_code && f.chicken_code.toLowerCase() === norm) return true;
      if (f.birth_code && f.birth_code.toLowerCase() === norm) return true;
      if (f.wing_band && f.wing_band.toLowerCase() === norm) return true;
      if (String(f.id) === norm) return true;
      return false;
    });
    if (found) {
      setInternalId(found.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubjectSelect = useCallback(
    (f: FowlRecord) => {
      if (!subject) return;
      if (f.id === subject.id) {
        updateUrlForSubject(f);
        return;
      }
      setBreadcrumb((prev) => {
        const next = [...prev];
        if (next.length === 0 || next[next.length - 1].id !== subject.id) {
          next.push({ id: subject.id, name: subject.name });
        }
        return next;
      });
      setInternalId(f.id);
      onSelect?.(f);
      updateUrlForSubject(f);
    },
    [subject, onSelect, updateUrlForSubject],
  );

  const doRecenter = useCallback(
    (f: FowlRecord) => {
      if (!subject) return;
      if (f.id === subject.id) return;
      setBreadcrumb((prev) => {
        const next = [...prev];
        if (next.length === 0 || next[next.length - 1].id !== subject.id) {
          next.push({ id: subject.id, name: subject.name });
        }
        return next;
      });
      setInternalId(f.id);
      onSelect?.(f);
      updateUrlForSubject(f);
    },
    [subject, onSelect, updateUrlForSubject],
  );

  const goPrev = useCallback(() => {
    if (sortedFowls.length === 0) return;
    const idx = currentIndex >= 0 ? currentIndex : 0;
    const prevIdx = idx === 0 ? sortedFowls.length - 1 : idx - 1;
    handleSubjectSelect(sortedFowls[prevIdx]);
  }, [sortedFowls, currentIndex, handleSubjectSelect]);

  const goNext = useCallback(() => {
    if (sortedFowls.length === 0) return;
    const idx = currentIndex >= 0 ? currentIndex : 0;
    const nextIdx = idx === sortedFowls.length - 1 ? 0 : idx + 1;
    handleSubjectSelect(sortedFowls[nextIdx]);
  }, [sortedFowls, currentIndex, handleSubjectSelect]);

  const goBack = useCallback(() => {
    setBreadcrumb((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setInternalId(last.id);
      const match = fowls.find((f) => f.id === last.id);
      if (match) onSelect?.(match);
      return prev.slice(0, -1);
    });
  }, [fowls, onSelect]);

  const handleViewProfile = useCallback(
    (f: FowlRecord) => {
      if (onViewProfile) {
        onViewProfile(f);
      } else {
        ui.setSelectedFowlForDetails(f);
      }
    },
    [onViewProfile, ui],
  );

  const handleRegisterMerged = useCallback(
    (_hint: { side?: 'sire' | 'dam'; breed?: string; childName: string }) => {
      if (!subject) return;
      const stub: Partial<FowlRecord> & {
        id: number;
        name: string;
        breed: string;
        gender: string;
        sire: string;
        dam: string;
        status: string;
      } = {
        id: 0,
        name: '',
        breed: _hint.breed || subject.breed || '',
        gender: _hint.side === 'dam' ? 'Hen' : 'Rooster',
        sire: '',
        dam: '',
        status: subject.status || 'Active',
      };
      ui.setEditingFowl(stub as FowlRecord);
    },
    [subject, ui],
  );

  const handleRegisterSingle = useCallback(
    (hint: {
      side: 'sire' | 'dam';
      breed?: string;
      childName: string;
      placeholderName: string;
    }) => {
      const stub: Partial<FowlRecord> & {
        id: number;
        name: string;
        breed: string;
        gender: string;
        sire: string;
        dam: string;
        status: string;
      } = {
        id: 0,
        name:
          hint.placeholderName && hint.placeholderName.toLowerCase() !== 'foundation stock'
            ? hint.placeholderName
            : '',
        breed: hint.breed || subject?.breed || '',
        gender: hint.side === 'dam' ? 'Hen' : 'Rooster',
        sire: '',
        dam: '',
        status: subject?.status || 'Active',
      };
      ui.setEditingFowl(stub as FowlRecord);
    },
    [subject, ui],
  );

  const handlePrint = () => window.print();

  if (loading && fowls.length === 0) {
    return (
      <Card>
        <CardContent className="space-y-4 p-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (fowls.length === 0 || !subject) {
    return (
      <EmptyState
        compact
        title="No Pedigree To Show"
        description="Register chickens with Sire and Dam to build the lineage map."
      />
    );
  }

  return (
    <div className="space-y-4 print:space-y-2">
      <SkipLink href="#pedigree-main">Skip to pedigree chart</SkipLink>

      <div className="flex flex-col items-start gap-4 lg:flex-row">
        <div id="pedigree-main" className="w-full min-w-0 flex-1 space-y-3">
          <Card className="overflow-hidden print:border-none print:shadow-none">
            <CardContent className="space-y-3 p-3 sm:p-4">
              {/* Toolbar */}
              <div className="bg-muted/30 border-border no-print flex flex-wrap items-center justify-between gap-2.5 rounded-lg border p-2.5">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <SubjectSelector
                    fowls={fowls}
                    codes={codes}
                    subject={subject}
                    onSelect={handleSubjectSelect}
                  />

                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={goPrev}
                      aria-label="Previous chicken"
                      title="Previous chicken"
                      className="h-9 w-9 p-0"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={goNext}
                      aria-label="Next chicken"
                      title="Next chicken"
                      className="h-9 w-9 p-0"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  {breadcrumb.length > 0 && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={goBack}
                      aria-label={`Back to ${breadcrumb[breadcrumb.length - 1].name}`}
                      className="h-9 max-w-[160px] gap-1 truncate text-xs"
                    >
                      <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">
                        Back to {breadcrumb[breadcrumb.length - 1].name}
                      </span>
                    </Button>
                  )}

                  {parentageRelatedness && (
                    <RelatednessBadge
                      classification={parentageRelatedness}
                      prefix="Bred from: "
                      showSecondary
                    />
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <div className="bg-muted border-border inline-flex items-center rounded-md border p-0.5 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setNumGens(3)}
                      className={`cursor-pointer rounded px-2.5 py-1 text-xs font-black transition-colors ${
                        numGens === 3
                          ? 'bg-card text-emerald-600 shadow-2xs dark:text-emerald-400'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      3 Gens
                    </button>
                    <button
                      type="button"
                      onClick={() => setNumGens(4)}
                      className={`cursor-pointer rounded px-2.5 py-1 text-xs font-black transition-colors ${
                        numGens === 4
                          ? 'bg-card text-emerald-600 shadow-2xs dark:text-emerald-400'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      4 Gens
                    </button>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handlePrint}
                    aria-label="Print or export pedigree as PDF"
                    className="h-9 gap-1.5 text-xs"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Print / PDF
                  </Button>
                </div>
              </div>

              {/* Mobile Outline View (<768px) */}
              <div className="block md:hidden">
                <details className="border-border bg-card/60 rounded-md border">
                  <summary className="text-muted-foreground cursor-pointer px-3 py-2 text-xs font-bold select-none">
                    📜 Mobile Pedigree Lineage List (tap to view)
                  </summary>
                  <ul className="border-border divide-border space-y-1 divide-y border-t px-3 pt-1 pb-3">
                    {nodes.map((node) => (
                      <li
                        key={node.id}
                        className="flex items-center justify-between py-1.5 text-xs"
                      >
                        <span className="text-muted-foreground font-semibold">
                          {'\u00A0\u00A0'.repeat(node.gen)}
                          <span className="text-card-foreground font-bold">
                            {node.role.toUpperCase()}: {node.name}
                          </span>
                        </span>
                        {node.fowl && (
                          <button
                            type="button"
                            onClick={() => handleViewProfile(node.fowl!)}
                            className="text-primary text-xs font-bold hover:underline"
                          >
                            Profile
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </details>
              </div>

              {/* Desktop CSS Grid Pedigree Chart (≥768px) */}
              <div className="no-scrollbar border-border bg-muted/20 hidden overflow-x-auto rounded-md border p-4 md:block print:border-0 print:bg-white">
                {/* Column Headers */}
                <div
                  className="text-muted-foreground border-border/60 mb-3 grid border-b pb-2 font-mono text-xs font-black tracking-wider uppercase"
                  style={{
                    gridTemplateColumns: `repeat(${numGens}, ${colWidth}px)`,
                    columnGap: `${colGap}px`,
                    paddingLeft: `${paddingX}px`,
                  }}
                >
                  <div>Subject (G0)</div>
                  <div>Parents (G1)</div>
                  <div>Grandparents (G2)</div>
                  {numGens >= 4 && <div>Great-Grandparents (G3)</div>}
                </div>

                <div
                  className="relative"
                  style={{
                    width: innerWidth,
                    minWidth: innerWidth,
                    height: innerHeight,
                  }}
                  aria-label="Pedigree ancestor tree chart"
                  role="tree"
                >
                  <div className="sr-only" aria-live="polite">
                    Pedigree chart for {subject.name}. Showing {numGens} generations.
                  </div>

                  {/* SVG Connector Overlay */}
                  <svg
                    className="pointer-events-none absolute inset-0 z-0"
                    width={innerWidth}
                    height={innerHeight}
                    viewBox={`0 0 ${innerWidth} ${innerHeight}`}
                    aria-hidden="true"
                  >
                    {connectorPaths.map((c) => (
                      <path
                        key={c.id}
                        d={c.path}
                        className="stroke-slate-400 dark:stroke-slate-600"
                        fill="none"
                        strokeWidth={1.5}
                        strokeDasharray={c.isDashed ? '4 3' : undefined}
                      />
                    ))}
                  </svg>

                  {/* Mathematical CSS Grid */}
                  <div
                    className="absolute z-10 grid"
                    style={{
                      left: 0,
                      top: 0,
                      width: innerWidth,
                      height: innerHeight,
                      gridTemplateColumns: `repeat(${numGens}, ${colWidth}px)`,
                      gridTemplateRows: `repeat(${totalRows}, ${rowHeight}px)`,
                      columnGap: `${colGap}px`,
                      paddingLeft: `${paddingX}px`,
                      paddingTop: `${paddingTop}px`,
                    }}
                  >
                    {nodes.map((node) => {
                      const gridCol = node.gen + 1;
                      return (
                        <div
                          key={node.id}
                          className="flex items-center justify-center"
                          style={{
                            gridColumn: gridCol,
                            gridRow: `${node.startRow} / span ${node.rowSpan}`,
                            alignSelf: 'center',
                          }}
                        >
                          <CompactNodeCard
                            node={node}
                            fowls={fowls}
                            codes={codes}
                            canRegisterAncestor={canRegisterAncestor}
                            onRecenter={doRecenter}
                            onViewProfile={handleViewProfile}
                            onRegisterMerged={handleRegisterMerged}
                            onRegisterSingle={handleRegisterSingle}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Compact Right Bloodline Panel */}
        <div className="w-full shrink-0 lg:w-[320px]">
          <BloodlineBreakdown
            stats={stats ?? undefined}
            title={`Bloodline — ${subject.name}`}
            subtitle="Compact summary · 50% sire · 50% dam, halved each generation"
            fowl={subject}
            fowls={fowls}
            compact
          />
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .no-print { display: none !important; }
          header, nav, sidebar, footer { display: none !important; }
          @page { size: letter landscape; margin: 10mm; }
        }
      `}</style>
    </div>
  );
}
