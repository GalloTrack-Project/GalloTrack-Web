'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FowlRecord } from '@/lib/types';
import { getFowlBloodlineStats, UNKNOWN_BLOODLINE, isFoundationName } from '@/lib/bloodline-composition';
import { birdCodeOf, compareBirdCodesNatural, formatBirdCodeForDisplay } from '@/lib/bird-code';
import { useUI } from '@/lib/contexts/ui-context';
import BloodlineBreakdown from '@/components/BloodlineBreakdown';
import ChickenIcon from '@/components/ChickenIcon';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tooltip } from '@/components/ui/Tooltip';
import { Button } from '@/components/ui/Button';
import { SkipLink } from '@/components/ui/SkipLink';
import StatusBadge from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ArrowLeft, ChevronLeft, ChevronRight, Maximize2, Printer, ExternalLink, Plus, UserPlus, Search, X } from 'lucide-react';

const MAX_ANCESTOR_GENERATIONS = 3;
const CARD_WIDTH = 190;

const keyFn = (v?: string | null) => String(v ?? '').trim().toLowerCase();

type Accent = 'emerald' | 'sky' | 'amber' | 'violet';

const ACCENT: Record<Accent, { border: string; badge: string; text: string; ring: string }> = {
  emerald: {
    border: 'border-emerald-300 dark:border-emerald-700',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400',
    text: 'text-emerald-700 dark:text-emerald-400',
    ring: 'focus-visible:ring-emerald-500',
  },
  sky: {
    border: 'border-sky-300 dark:border-sky-700',
    badge: 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-400',
    text: 'text-sky-700 dark:text-sky-400',
    ring: 'focus-visible:ring-sky-500',
  },
  amber: {
    border: 'border-amber-300 dark:border-amber-700',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400',
    text: 'text-amber-700 dark:text-amber-400',
    ring: 'focus-visible:ring-amber-500',
  },
  violet: {
    border: 'border-violet-300 dark:border-violet-700',
    badge: 'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-400',
    text: 'text-violet-700 dark:text-violet-400',
    ring: 'focus-visible:ring-violet-500',
  },
};

const GEN_ACCENT: Accent[] = ['emerald', 'sky', 'amber', 'violet'];

const ROLE_LABEL = (gen: number, side: 'sire' | 'dam' | 'self'): string => {
  if (gen === 0) return 'Subject';
  if (side === 'self') return 'Subject';
  const prefix = gen === 1 ? '' : gen === 2 ? 'Grand' : 'Great-Grand';
  return `${prefix}${side === 'sire' ? 'Sire' : 'Dam'}`;
};

type ResolvedNode = {
  fowl: FowlRecord | null;
  name: string;
  isMerged?: boolean;
  sideHint?: 'sire' | 'dam' | 'both';
  childBreedHint?: string;
  childName?: string;
};

type GridCell = ResolvedNode | null;
type AncestorGrid = GridCell[][];

function resolveFowlByName(
  fowls: FowlRecord[],
  byName: Map<string, FowlRecord>,
  name?: string | null,
): FowlRecord | undefined {
  if (isFoundationName(name)) return undefined;
  return byName.get(keyFn(name));
}

function buildAncestorGrid(subject: FowlRecord, fowls: FowlRecord[], byName: Map<string, FowlRecord>): AncestorGrid {
  const cols: AncestorGrid = Array.from({ length: MAX_ANCESTOR_GENERATIONS + 1 }, () => []);

  cols[0][0] = { fowl: subject, name: subject.name };

  for (let gen = 0; gen < MAX_ANCESTOR_GENERATIONS; gen++) {
    const rowsInGen = cols[gen].length;
    for (let r = 0; r < rowsInGen; r++) {
      const cell = cols[gen][r];
      const nextRowBase = r * 2;
      while (cols[gen + 1].length < nextRowBase + 2) cols[gen + 1].push(null);

      if (!cell || !cell.fowl || cell.isMerged) {
        cols[gen + 1][nextRowBase] = null;
        cols[gen + 1][nextRowBase + 1] = null;
        continue;
      }

      const f = cell.fowl;
      const sireName = f.sire;
      const damName = f.dam;
      const sireFowl = resolveFowlByName(fowls, byName, sireName);
      const damFowl = resolveFowlByName(fowls, byName, damName);
      const sireAbsent = !sireFowl;
      const damAbsent = !damFowl;

      if (sireAbsent && damAbsent) {
        cols[gen + 1][nextRowBase] = {
          fowl: null,
          name: 'Foundation stock',
          isMerged: true,
          sideHint: 'both',
          childBreedHint: f.breed || undefined,
          childName: f.name,
        };
        cols[gen + 1][nextRowBase + 1] = null;
      } else {
        cols[gen + 1][nextRowBase] = {
          fowl: sireFowl ?? null,
          name: sireFowl ? sireFowl.name : (sireName || 'Foundation stock'),
          sideHint: 'sire',
          childBreedHint: f.breed || undefined,
          childName: f.name,
        };
        cols[gen + 1][nextRowBase + 1] = {
          fowl: damFowl ?? null,
          name: damFowl ? damFowl.name : (damName || 'Foundation stock'),
          sideHint: 'dam',
          childBreedHint: f.breed || undefined,
          childName: f.name,
        };
      }
    }
  }

  return cols;
}

type Connector = {
  id: string;
  fromGen: number;
  fromRow: number;
  toGen: number;
  toRowSire: number;
  toRowDam: number;
  merged: boolean;
  toRowSingle?: number;
};

function computeConnectors(grid: AncestorGrid): Connector[] {
  const out: Connector[] = [];
  for (let gen = 0; gen < MAX_ANCESTOR_GENERATIONS; gen++) {
    for (let row = 0; row < grid[gen].length; row++) {
      const cell = grid[gen][row];
      if (!cell || !cell.fowl || cell.isMerged) continue;
      const sireRow = row * 2;
      const damRow = row * 2 + 1;
      const sireCell = grid[gen + 1]?.[sireRow];
      const damCell = grid[gen + 1]?.[damRow];
      if (!sireCell && !damCell) continue;
      if (sireCell?.isMerged) {
        out.push({
          id: `c-${gen}-${row}`,
          fromGen: gen,
          fromRow: row,
          toGen: gen + 1,
          toRowSire: sireRow,
          toRowDam: damRow,
          merged: true,
          toRowSingle: sireRow,
        });
      } else {
        out.push({
          id: `c-${gen}-${row}`,
          fromGen: gen,
          fromRow: row,
          toGen: gen + 1,
          toRowSire: sireRow,
          toRowDam: damRow,
          merged: false,
        });
      }
    }
  }
  return out;
}

function AncestorAvatar({ image_url, gender, className }: { image_url?: string | null; gender?: string; className?: string }) {
  if (image_url) {
    return (
      <img
        src={image_url}
        alt=""
        aria-hidden="true"
        className={`rounded-md object-cover bg-muted ${className ?? ''}`}
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
      className={`rounded-md bg-muted flex items-center justify-center ${className ?? ''}`}
    >
      <ChickenIcon className={`w-1/2 h-1/2 ${tone}`} />
    </div>
  );
}

type AncestorCardProps = {
  node: ResolvedNode;
  generation: number;
  rowIndex: number;
  accent: Accent;
  fowls: FowlRecord[];
  codes: Map<string, string>;
  canRegisterAncestor: boolean;
  onRecenter: (f: FowlRecord) => void;
  onViewProfile: (f: FowlRecord) => void;
  onRegisterMerged: (hint: { side?: 'sire' | 'dam'; breed?: string; childName: string }) => void;
  onRegisterSingle: (hint: { side: 'sire' | 'dam'; breed?: string; childName: string; placeholderName: string }) => void;
};

function AncestorCard(props: AncestorCardProps) {
  const {
    node, generation, rowIndex, accent, fowls, codes,
    canRegisterAncestor, onRecenter, onViewProfile,
    onRegisterMerged, onRegisterSingle,
  } = props;
  const a = ACCENT[accent];
  const { fowl, name, isMerged, sideHint, childBreedHint, childName } = node;

  if (isMerged) {
    const roleLabel = generation === 1
      ? 'Parents'
      : generation === 2 ? 'Grandparents' : 'Great-Grandparents';

    const card = (
      <div
        data-merged="1"
        data-gen={generation}
        data-row={rowIndex}
        className={`w-[190px] shrink-0 text-left rounded-md border border-dashed ${a.border} bg-card/75 shadow-2xs px-3 py-2 space-y-1.5 transition-all hover:shadow-xs`}
      >
        <div className="flex items-center justify-between gap-1.5">
          <span className={`text-[10px] font-black uppercase tracking-widest ${a.text}`}>{roleLabel}</span>
          <span className="text-[10px] font-black text-muted-foreground tabular-nums">G{generation}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 shrink-0 rounded-md bg-muted/70 border border-dashed border-border flex items-center justify-center text-muted-foreground">
            <UserPlus className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black text-card-foreground leading-tight truncate">Foundation stock</p>
            <p className="text-[10px] font-semibold text-muted-foreground truncate">Not in registry</p>
          </div>
        </div>
        {canRegisterAncestor && (
          <Button
            variant="secondary"
            size="sm"
            fullWidth
            onClick={() => onRegisterMerged({ breed: childBreedHint, childName: childName || '' })}
            aria-label={`Register ${roleLabel} foundation ancestors`}
            className="text-[11px] h-7 gap-1"
          >
            <Plus className="w-3 h-3" /> Register ancestor
          </Button>
        )}
      </div>
    );

    return (
      <Tooltip content="Both sides of this ancestor's lineage are unregistered foundation stock.">
        {card}
      </Tooltip>
    );
  }

  const stats = useMemo(
    () => (fowl ? getFowlBloodlineStats(fowl, fowls) : null),
    [fowl, fowls],
  );
  const code = fowl ? formatBirdCodeForDisplay(codes.get(String(fowl.id)) || birdCodeOf(fowl, fowls)) : '';
  const missing = !fowl;
  const resolvedSide = sideHint === 'both' ? (rowIndex % 2 === 0 ? 'sire' : 'dam') : sideHint;
  const roleRaw: 'sire' | 'dam' | 'self' = generation === 0 ? 'self' : (resolvedSide ?? (rowIndex % 2 === 0 ? 'sire' : 'dam'));
  const roleLabel = ROLE_LABEL(generation, roleRaw);
  const ariaLabel = `${roleLabel}${name ? `: ${name}` : ''}${code ? `, code ${code}` : ''}${fowl ? `, breed ${fowl.breed || 'unspecified'}` : ''}`;

  const summaryText = stats ? stats.summary : (fowl?.breed ? fowl.breed : 'Not in registry');

  const recenter = useCallback(() => {
    if (fowl) onRecenter(fowl);
  }, [fowl, onRecenter]);

  const viewProfile = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (fowl) onViewProfile(fowl);
    },
    [fowl, onViewProfile],
  );

  const onKey = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && fowl) {
      e.preventDefault();
      recenter();
    }
  };

  const registerSide: 'sire' | 'dam' | undefined = !fowl ? (resolvedSide ?? (rowIndex % 2 === 0 ? 'sire' : 'dam')) : undefined;

  if (missing) {
    const registerHandler = () => {
      if (registerSide) {
        onRegisterSingle({
          side: registerSide,
          breed: childBreedHint,
          childName: childName || '',
          placeholderName: name,
        });
      }
    };
    return (
      <div
        data-gen={generation}
        data-row={rowIndex}
        className={`w-[190px] shrink-0 text-left rounded-md border border-dashed ${a.border} bg-card/75 shadow-2xs px-3 py-2 space-y-1.5`}
      >
        <div className="flex items-center justify-between gap-1.5">
          <span className={`text-[10px] font-black uppercase tracking-widest ${a.text}`}>{roleLabel}</span>
          <span className="text-[10px] font-black text-muted-foreground tabular-nums">G{generation}</span>
        </div>
        <div className="flex items-center gap-2">
          <AncestorAvatar gender={registerSide === 'dam' ? 'Hen' : 'Rooster'} className="w-9 h-9 shrink-0 opacity-70" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black text-card-foreground truncate leading-tight">{name || 'Foundation stock'}</p>
            <p className="text-[10px] font-semibold text-muted-foreground truncate">Not in registry</p>
          </div>
        </div>
        {canRegisterAncestor && (
          <Button
            variant="secondary"
            size="sm"
            fullWidth
            onClick={registerHandler}
            aria-label={`Register ${roleLabel} ancestor ${name || ''}`.trim()}
            className="text-[11px] h-7 gap-1"
          >
            <Plus className="w-3 h-3" /> Register ancestor
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      data-gen={generation}
      data-row={rowIndex}
      role="treeitem"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-level={generation + 1}
      onClick={recenter}
      onKeyDown={onKey}
      className={`w-[190px] shrink-0 text-left rounded-md border ${a.border} bg-card shadow-2xs px-3 py-2 space-y-1.5 transition-all hover:shadow-xs hover:-translate-y-0.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${a.ring}`}
    >
      <div className="flex items-center justify-between gap-1.5">
        <span className={`text-[10px] font-black uppercase tracking-widest ${a.text}`}>{roleLabel}</span>
        <span className="text-[10px] font-black text-muted-foreground tabular-nums">G{generation}</span>
      </div>

      <div className="flex items-start gap-2">
        <AncestorAvatar
          image_url={fowl.image_url}
          gender={fowl.gender}
          className="w-9 h-9 shrink-0"
        />
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex items-center gap-1 min-w-0 flex-wrap">
            {code && (
              <span className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded shrink-0 ${a.badge}`}>[{code}]</span>
            )}
            <span className="text-xs font-black text-card-foreground truncate leading-tight">
              {name}
            </span>
          </div>
          {fowl.status && <StatusBadge status={fowl.status} showDot className="scale-75 origin-left" />}
        </div>
      </div>

      <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 truncate">
        {summaryText}
      </p>

      <div className="flex items-center justify-between gap-1.5 pt-0.5 border-t border-border/40">
        <Button
          variant="ghost"
          size="sm"
          onClick={viewProfile}
          aria-label={`View profile of ${name}`}
          className="h-6 px-1.5 text-[11px] gap-1 text-primary hover:text-primary font-bold"
        >
          <ExternalLink className="w-3 h-3" /> Profile
        </Button>
        <Badge variant="neutral" size="sm" className="scale-90 text-[10px] font-bold">
          {roleRaw === 'self' ? 'G0 Subject' : `${(100 / Math.pow(2, generation)).toFixed(0)}% share`}
        </Badge>
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

  const currentIndex = useMemo(() => {
    return sortedFowls.findIndex((f) => f.id === subject.id);
  }, [sortedFowls, subject]);

  const goPrev = useCallback(() => {
    if (sortedFowls.length === 0) return;
    const idx = currentIndex >= 0 ? currentIndex : 0;
    const prevIdx = idx === 0 ? sortedFowls.length - 1 : idx - 1;
    onSelect(sortedFowls[prevIdx]);
  }, [sortedFowls, currentIndex, onSelect]);

  const goNext = useCallback(() => {
    if (sortedFowls.length === 0) return;
    const idx = currentIndex >= 0 ? currentIndex : 0;
    const nextIdx = idx === sortedFowls.length - 1 ? 0 : idx + 1;
    onSelect(sortedFowls[nextIdx]);
  }, [sortedFowls, currentIndex, onSelect]);

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

  const statusPillClass = (status?: string | null) => {
    const s = String(status || '').toLowerCase();
    if (s === 'deceased') return 'bg-rose-900 text-white border border-rose-950';
    if (s === 'archived') return 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800';
    return 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800';
  };

  const statusLabel = (status?: string | null) => {
    const s = String(status || 'Active').toLowerCase();
    if (s === 'deceased') return 'Deceased';
    if (s === 'archived') return 'Archived';
    return 'Active';
  };

  const rolePillClass = (role?: string | null) => {
    const r = String(role || '').toLowerCase();
    if (r === 'breeding male') return 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800';
    if (r === 'breeding female') return 'bg-pink-50 dark:bg-pink-950/50 text-pink-700 dark:text-pink border border-pink-200 dark:border-pink-800';
    if (r === 'non-breeding') return 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
    return 'bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700';
  };

  return (
    <div ref={dropdownRef} className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1">
        <Button
          variant="secondary"
          size="sm"
          onClick={goPrev}
          aria-label="Previous subject by code order"
          title="Previous"
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <div className="relative min-w-[280px] sm:min-w-[340px]">
          <span
            aria-hidden="true"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10"
          >
            <Search className="w-3.5 h-3.5" />
          </span>
          <input
            type="search"
            aria-label="Search pedigree subject"
            placeholder="Search subject by code, name, or wing band…"
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
            className="w-full pl-9 pr-8 py-2 h-9 border border-input-border rounded-md bg-card text-card-foreground placeholder:text-muted-foreground text-xs sm:text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-semibold [&::-webkit-search-cancel-button]:appearance-none"
          />
          {searchQuery.length > 0 && (
            <button
              type="button"
              aria-label="Clear subject search"
              onClick={() => {
                setSearchQuery('');
                setDropdownOpen(false);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {dropdownOpen && matchingFowls.length > 0 && (
            <div
              role="listbox"
              aria-label="Matching chickens"
              className="absolute left-0 right-0 top-full mt-1.5 bg-card border border-border rounded-lg shadow-xl z-50 overflow-hidden divide-y divide-border/50 max-h-80 overflow-y-auto"
            >
              <div className="px-3 py-1.5 bg-muted/50 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Matching ({matchingFowls.length} of {fowls.length})
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
                    className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 transition-colors cursor-pointer group ${isSelected ? 'bg-emerald-500/10 dark:bg-emerald-950/30' : 'hover:bg-emerald-500/10 dark:hover:bg-emerald-950/30'}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {code && (
                        <span className="font-mono text-[11px] font-black px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800 shrink-0">
                          [{formatBirdCodeForDisplay(code)}]
                        </span>
                      )}
                      <span className="font-bold text-xs text-card-foreground truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                        {f.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {f.registry_role && (
                        <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded-full ${rolePillClass(f.registry_role)}`}>
                          {f.registry_role}
                        </span>
                      )}
                      <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded-full ${statusPillClass(f.status)}`}>
                        {statusLabel(f.status)}
                      </span>
                    </div>
                  </button>
                );
              })}
              {matchingFowls.length > 100 && (
                <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/30">
                  Showing first 100 matches — narrow your search.
                </div>
              )}
            </div>
          )}
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={goNext}
          aria-label="Next subject by code order"
          title="Next"
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm border-2 border-emerald-500/50 bg-emerald-500/10" aria-hidden="true" /> G0
        </span>
        <span>→</span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm border-2 border-sky-500/50 bg-sky-500/10" aria-hidden="true" /> G1
        </span>
        <span>→</span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm border-2 border-amber-500/50 bg-amber-500/10" aria-hidden="true" /> G2
        </span>
        <span>→</span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm border-2 border-violet-500/50 bg-violet-500/10" aria-hidden="true" /> G3
        </span>
      </div>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="w-[190px] shrink-0 rounded-md border border-border bg-card shadow-2xs px-3 py-2 space-y-2">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-6" />
      </div>
      <div className="flex items-start gap-2">
        <Skeleton className="w-9 h-9 rounded-md shrink-0" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
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
  const [breadcrumb, setBreadcrumb] = useState<{ id: number; name: string }[]>([]);
  const [fitScale, setFitScale] = useState(1);
  const gridWrapRef = useRef<HTMLDivElement | null>(null);
  const gridInnerRef = useRef<HTMLDivElement | null>(null);
  const [, setSizes] = useState<{ wrapW: number; innerW: number; rowH: number }>({
    wrapW: 0, innerW: 0, rowH: 115,
  });

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
    () => (activeId != null ? fowls.find((f) => f.id === activeId) ?? null : (fowls[0] ?? null)),
    [fowls, activeId],
  );

  const stats = useMemo(
    () => (subject ? getFowlBloodlineStats(subject, fowls) : null),
    [subject, fowls],
  );

  const grid = useMemo<AncestorGrid>(() => {
    if (!subject) return [];
    return buildAncestorGrid(subject, fowls, byName);
  }, [subject, fowls, byName]);

  const connectors = useMemo(() => computeConnectors(grid), [grid]);

  const maxRows = useMemo(() => Math.max(1, ...grid.map((c) => c.length)), [grid]);
  const rowHeight = 115;
  const gapX = 48;
  const paddingX = 20;
  const paddingY = 20;

  const recomputeFit = useCallback(() => {
    const wrap = gridWrapRef.current;
    const inner = gridInnerRef.current;
    if (!wrap || !inner) return;
    const wrapW = wrap.clientWidth;
    const innerW = inner.scrollWidth;
    setSizes({ wrapW, innerW, rowH: rowHeight });
    if (wrapW > 80 && innerW > wrapW) {
      const s = Math.max(0.5, Math.min(1, (wrapW - 16) / innerW));
      setFitScale(s);
    } else {
      setFitScale(1);
    }
  }, [rowHeight]);

  useEffect(() => {
    const t = window.setTimeout(recomputeFit, 10);
    const onResize = () => recomputeFit();
    window.addEventListener('resize', onResize);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('resize', onResize);
    };
  }, [recomputeFit, grid, subject]);

  const resetScale = useCallback(() => setFitScale(1), []);

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

  const doRecenter = useCallback((f: FowlRecord) => {
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
  }, [subject, onSelect, updateUrlForSubject]);

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
      const stub: Partial<FowlRecord> & { id: number; name: string; breed: string; gender: string; sire: string; dam: string; status: string } = {
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
    (hint: { side: 'sire' | 'dam'; breed?: string; childName: string; placeholderName: string }) => {
      const stub: Partial<FowlRecord> & { id: number; name: string; breed: string; gender: string; sire: string; dam: string; status: string } = {
        id: 0,
        name: hint.placeholderName && hint.placeholderName.toLowerCase() !== 'foundation stock' ? hint.placeholderName : '',
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
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-4 w-60" />
              <Skeleton className="h-3 w-96 mt-1" />
            </div>
            <Skeleton className="h-9 w-48" />
          </div>
          <div className="grid md:grid-cols-[1fr_320px] gap-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-8 w-40" />
                  <Skeleton className="h-9 w-28" />
                </div>
                <div className="overflow-x-auto">
                  <div className="flex gap-10 min-w-max p-2">
                    <div className="space-y-2"><CardSkeleton /></div>
                    <div className="space-y-2"><CardSkeleton /><CardSkeleton /></div>
                    <div className="space-y-2"><CardSkeleton /><CardSkeleton /><CardSkeleton /><CardSkeleton /></div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
              </CardContent>
            </Card>
          </div>
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

  const cols = MAX_ANCESTOR_GENERATIONS + 1;
  const innerWidth = cols * CARD_WIDTH + (cols - 1) * gapX + paddingX * 2;
  const innerHeight = maxRows * rowHeight + paddingY * 2;

  const renderOutlineItem = (gen: number, row: number, node: ResolvedNode) => {
    if (!node) return null;
    const indent = '\u00A0\u00A0'.repeat(gen);
    const resolvedSide = node.sideHint === 'both' ? (row % 2 === 0 ? 'sire' : 'dam') : node.sideHint;
    const roleRaw: 'sire' | 'dam' | 'self' = gen === 0 ? 'self' : (resolvedSide ?? (row % 2 === 0 ? 'sire' : 'dam'));
    const label = ROLE_LABEL(gen, roleRaw);
    const code = node.fowl ? formatBirdCodeForDisplay(codes.get(String(node.fowl.id)) || birdCodeOf(node.fowl, fowls)) : '';
    return (
      <li key={`o-${gen}-${row}`} className="text-sm py-1 border-b border-border last:border-b-0">
        <span className="font-mono text-xs text-muted-foreground">{indent}</span>
        <span className={`text-[10px] font-black uppercase tracking-wider ${ACCENT[GEN_ACCENT[gen]].text} mr-1`}>{label}</span>
        {code && <Badge variant="neutral" size="sm" className="mr-1">{code}</Badge>}
        <span className="font-black text-card-foreground">{node.isMerged ? 'Foundation stock (merged)' : node.name}</span>
        {node.fowl && (
          <button
            type="button"
            className="ml-2 text-xs text-primary underline-offset-2 hover:underline font-bold"
            onClick={() => handleViewProfile(node.fowl!)}
          >
            profile
          </button>
        )}
      </li>
    );
  };

  return (
    <div className="space-y-4 print:space-y-2">
      <SkipLink href="#pedigree-main">Skip to pedigree tree</SkipLink>

      <Card className="print:shadow-none print:border-none">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <p className={`text-xs font-black uppercase tracking-widest ${ACCENT.emerald.text}`}>
                📜 Pedigree / Lineage Map
              </p>
              <p className="text-xs text-muted-foreground font-semibold">
                3 ancestor generations (parents → grandparents → great-grandparents). Sire on top, Dam below.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {breadcrumb.length > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={goBack}
                  aria-label={`Back to ${breadcrumb[breadcrumb.length - 1].name}`}
                  className="no-print"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="max-w-[140px] truncate">Back to {breadcrumb[breadcrumb.length - 1].name}</span>
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (fitScale < 1) resetScale();
                  else recomputeFit();
                }}
                aria-label={fitScale < 1 ? 'Reset zoom to 100%' : 'Fit pedigree tree to width'}
                className="no-print"
              >
                <Maximize2 className="w-4 h-4" />
                Fit
                {fitScale < 1 && <span className="text-[10px] text-muted-foreground ml-1 tabular-nums">{Math.round(fitScale * 100)}%</span>}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handlePrint}
                aria-label="Print or export pedigree as PDF"
                className="no-print"
              >
                <Printer className="w-4 h-4" />
                Print / PDF
              </Button>
            </div>
          </div>

          <div className="grid md:grid-cols-[1fr_320px] gap-4 print:grid-cols-[1fr_280px] print:gap-3">
            <div id="pedigree-main" className="min-w-0 space-y-3">
              <Card className="overflow-hidden print:shadow-none">
                <CardContent className="p-3 sm:p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 no-print">
                    <SubjectSelector
                      fowls={fowls}
                      codes={codes}
                      subject={subject}
                      onSelect={handleSubjectSelect}
                    />
                  </div>

                  <div className="md:hidden">
                    <details className="sm:hidden rounded-md border border-border bg-card/60">
                      <summary className="px-3 py-2 text-xs font-bold text-muted-foreground cursor-pointer select-none">
                        Vertical outline view (tap to expand)
                      </summary>
                      <ul className="px-3 pb-3 pt-1 border-t border-border divide-y divide-border">
                        {grid.map((col, g) =>
                          col.map((n, r) => (n ? renderOutlineItem(g, r, n) : null)),
                        )}
                      </ul>
                    </details>
                  </div>

                  <div
                    ref={gridWrapRef}
                    className="relative overflow-x-auto md:overflow-x-hidden no-scrollbar print:overflow-visible border border-border rounded-md bg-muted/20 print:bg-white print:border-0"
                    style={{ minHeight: Math.max(260, Math.min(innerHeight + 16, 480)) }}
                    aria-label="Pedigree ancestor tree"
                    role="tree"
                  >
                    <div className="sr-only" aria-live="polite">
                      Pedigree rooted at {subject.name}. Showing {MAX_ANCESTOR_GENERATIONS + 1} generations.
                      Click any ancestor card or press Enter while focused to re-center the tree on that chicken.
                    </div>

                    <div
                      ref={gridInnerRef}
                      className="relative origin-top-left"
                      style={{
                        width: innerWidth,
                        minWidth: innerWidth,
                        height: innerHeight,
                        transform: `scale(${fitScale})`,
                        transformOrigin: 'top left',
                        transition: 'transform 150ms ease-out',
                      }}
                    >
                      <svg
                        className="absolute inset-0 pointer-events-none"
                        width={innerWidth}
                        height={innerHeight}
                        viewBox={`0 0 ${innerWidth} ${innerHeight}`}
                        aria-hidden="true"
                      >
                        <defs>
                          <marker
                            id="ped-arrow"
                            viewBox="0 0 10 10"
                            refX="9"
                            refY="5"
                            markerWidth="5"
                            markerHeight="5"
                            orient="auto-start-reverse"
                          >
                            <path d="M 0 0 L 10 5 L 0 10 z" className="fill-border" />
                          </marker>
                        </defs>
                        {connectors.map((c) => {
                          const fromX = paddingX + c.fromGen * (CARD_WIDTH + gapX) + CARD_WIDTH;
                          const fromCenterY = paddingY + c.fromRow * rowHeight + rowHeight / 2;
                          const toX = paddingX + c.toGen * (CARD_WIDTH + gapX);
                          const midX = fromX + (toX - fromX) / 2;

                          if (c.merged && typeof c.toRowSingle === 'number') {
                            const toY = paddingY + c.toRowSingle * rowHeight + rowHeight / 2;
                            const path = `M ${fromX} ${fromCenterY} C ${midX} ${fromCenterY}, ${midX} ${toY}, ${toX} ${toY}`;
                            return (
                              <path
                                key={c.id}
                                d={path}
                                className="stroke-border dark:stroke-border/70"
                                fill="none"
                                strokeWidth={1.5}
                                strokeDasharray="4 3"
                              />
                            );
                          }

                          const toSireY = paddingY + c.toRowSire * rowHeight + rowHeight / 2;
                          const toDamY = paddingY + c.toRowDam * rowHeight + rowHeight / 2;
                          return (
                            <g key={c.id}>
                              <path
                                d={`M ${fromX} ${fromCenterY} H ${midX} V ${toSireY} H ${toX}`}
                                className="stroke-border dark:stroke-border/70"
                                fill="none"
                                strokeWidth={1.5}
                              />
                              <path
                                d={`M ${fromX} ${fromCenterY} H ${midX} V ${toDamY} H ${toX}`}
                                className="stroke-border dark:stroke-border/70"
                                fill="none"
                                strokeWidth={1.5}
                              />
                            </g>
                          );
                        })}
                      </svg>

                      <div
                        className="absolute grid"
                        style={{
                          left: 0,
                          top: 0,
                          width: innerWidth,
                          height: innerHeight,
                          gridTemplateColumns: `repeat(${cols}, ${CARD_WIDTH}px)`,
                          columnGap: `${gapX}px`,
                          paddingLeft: paddingX,
                          paddingRight: paddingX,
                          paddingTop: paddingY,
                          paddingBottom: paddingY,
                        }}
                      >
                        {grid.map((col, g) => (
                          <div
                            key={`col-${g}`}
                            className="relative"
                            style={{
                              display: 'grid',
                              gridTemplateRows: `repeat(${maxRows}, ${rowHeight}px)`,
                            }}
                          >
                            {col.map((cell, r) => {
                              if (!cell) return <div key={`c-${g}-${r}`} />;
                              const accent = GEN_ACCENT[g];
                              return (
                                <div
                                  key={`c-${g}-${r}`}
                                  className="flex items-center justify-start"
                                  style={{ gridRow: r + 1 }}
                                >
                                  <AncestorCard
                                    node={cell}
                                    generation={g}
                                    rowIndex={r}
                                    accent={accent}
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
                        ))}
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground font-semibold pt-1">
                    Each ancestor contributes 50% per generation ({UNKNOWN_BLOODLINE} = parent not registered).
                    Click any card or press Enter while focused to re-center the pedigree on that chicken.
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="min-w-0">
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
        </CardContent>
      </Card>

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
