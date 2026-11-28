'use client';

import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { FowlRecord } from '@/lib/types';
import type { LineageIndex, LineageLayoutNode } from '@/lib/lineage-graph';
import { lineageBirdCode } from '@/lib/lineage-graph';
import { canFight, sexLabel } from '@/lib/helpers';
import type { WinRateStats } from '@/lib/win-rate';
import type { LineagePairType } from '@/lib/lineage-filters';
import { featherColorOf } from '@/lib/lineage-filters';
import { useT } from '@/lib/i18n';
import ChickenPhoto from '@/components/ChickenPhoto';
import { initials, SexMark } from './LineageBirdCard';
import LineageRecordPill from './LineageRecordPill';
import LineageStatusBadge from './LineageStatusBadge';

type SortKey =
  | 'code'
  | 'name'
  | 'sex'
  | 'strain'
  | 'feather'
  | 'generation'
  | 'sire'
  | 'dam'
  | 'status'
  | 'record';

interface SortState {
  key: SortKey;
  direction: 'asc' | 'desc';
}

export interface LineageTableViewProps {
  nodes: LineageLayoutNode[];
  totalCount: number;
  codes: Map<string, string>;
  index: LineageIndex;
  statsOf: (fowl: FowlRecord) => WinRateStats;
  generationNumberByGen: Map<number, number>;
  pairTypeByNode: Map<string, LineagePairType>;
  selectedId?: string | null;
  onSelect: (fowl: FowlRecord) => void;
}

function compareText(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

export default function LineageTableView({
  nodes,
  totalCount,
  codes,
  index,
  statsOf,
  generationNumberByGen,
  pairTypeByNode,
  selectedId,
  onSelect,
}: LineageTableViewProps) {
  const t = useT();
  const [sort, setSort] = useState<SortState>({ key: 'generation', direction: 'asc' });

  const rows = useMemo(() => {
    const valueOf = (node: LineageLayoutNode, key: SortKey): string | number => {
      const fowl = node.fowl;
      const parents = index.parentsByChild.get(String(fowl.id));
      switch (key) {
        case 'code':
          return lineageBirdCode(fowl, codes);
        case 'name':
          return fowl.name;
        case 'sex':
          return sexLabel(fowl);
        case 'strain':
          return fowl.breed || '';
        case 'feather':
          return featherColorOf(fowl);
        case 'generation':
          return generationNumberByGen.get(node.generation) ?? 1;
        case 'sire':
          return parents?.sire?.name || (fowl.sire || '').trim();
        case 'dam':
          return parents?.dam?.name || (fowl.dam || '').trim();
        case 'status':
          return fowl.status || '';
        case 'record':
          if (!canFight(fowl)) return -1;
          return statsOf(fowl).winRate ?? -1;
        default:
          return '';
      }
    };

    return [...nodes].sort((a, b) => {
      if (sort.key === 'generation') {
        const genA = generationNumberByGen.get(a.generation) ?? 1;
        const genB = generationNumberByGen.get(b.generation) ?? 1;
        const byGen = genA - genB;
        if (byGen !== 0) return sort.direction === 'asc' ? byGen : -byGen;
      }
      const av = valueOf(a, sort.key);
      const bv = valueOf(b, sort.key);
      const byValue =
        typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : compareText(String(av), String(bv));
      const directed = sort.direction === 'asc' ? byValue : -byValue;
      return directed || compareText(a.fowl.name, b.fowl.name) || a.fowl.id - b.fowl.id;
    });
  }, [nodes, sort, codes, index, statsOf, generationNumberByGen]);

  const changeSort = (key: SortKey) => {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: key === 'record' ? 'desc' : 'asc' },
    );
  };

  const sortIcon = (key: SortKey) => {
    if (sort.key !== key) return <ArrowUpDown className="h-3 w-3" aria-hidden="true" />;
    return sort.direction === 'asc' ? (
      <ArrowUp className="h-3 w-3" aria-hidden="true" />
    ) : (
      <ArrowDown className="h-3 w-3" aria-hidden="true" />
    );
  };

  const header = (key: SortKey, label: string, className = '') => (
    <th
      scope="col"
      aria-sort={
        sort.key === key ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'
      }
      className={`border-border bg-muted/50 text-muted-foreground border-b px-2 py-2 text-left text-[10px] font-black tracking-wider uppercase ${className}`}
    >
      <button
        type="button"
        onClick={() => changeSort(key)}
        className="focus-visible:ring-brand-orange inline-flex min-h-11 cursor-pointer items-center gap-1 rounded text-left hover:text-foreground focus-visible:ring-2 focus-visible:outline-none"
      >
        {label}
        {sortIcon(key)}
      </button>
    </th>
  );

  const generationOf = (node: LineageLayoutNode) =>
    t('lineageDirectory.generationNumber', {
      number: generationNumberByGen.get(node.generation) ?? 1,
    });

  const parentsOf = (fowl: FowlRecord) => {
    const parents = index.parentsByChild.get(String(fowl.id));
    return {
      sire: parents?.sire?.name || (fowl.sire || '').trim(),
      dam: parents?.dam?.name || (fowl.dam || '').trim(),
    };
  };

  if (nodes.length === 0) {
    return (
      <div className="border-border bg-card text-muted-foreground rounded-xl border p-8 text-center text-sm font-semibold">
        {t('lineageDirectory.tableEmpty')}
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <div className="text-muted-foreground mb-2 flex flex-wrap items-center justify-between gap-2 px-1 text-xs font-bold">
        <span aria-live="polite">
          {t('lineageDirectory.tableCount', { shown: nodes.length, total: totalCount })}
        </span>
        <span>{t('lineageDirectory.insightsTip')}</span>
      </div>

      <div className="md:hidden space-y-2">
        {rows.map((node) => {
          const fowl = node.fowl;
          const code = lineageBirdCode(fowl, codes);
          const stats = statsOf(fowl);
          const parents = parentsOf(fowl);
          const selected = selectedId === node.id;
          return (
            <button
              key={node.id}
              type="button"
              onClick={() => onSelect(fowl)}
              aria-label={t('lineageDirectory.openDetails', { name: fowl.name })}
              className={`bg-card w-full rounded-xl border p-2.5 text-left shadow-xs transition-colors focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:outline-none ${
                selected ? 'border-brand-orange bg-accent-soft/30' : 'border-border'
              }`}
            >
              <div className="flex min-w-0 items-start gap-2.5">
                <ChickenPhoto
                  name={fowl.name}
                  code={code}
                  imageUrl={fowl.image_url}
                  photoPath={fowl.photo_path}
                  photoThumbPath={fowl.photo_thumb_path}
                  size={48}
                  shape="square"
                  interactive={false}
                  className="border-border h-12 w-12 shrink-0 rounded-lg border"
                  fallback={
                    <span
                      className={`flex h-full w-full items-center justify-center text-[10px] font-black ${
                        sexLabel(fowl) === 'Hen' ? 'bg-hen-bg text-hen' : 'bg-cock-bg text-cock'
                      }`}
                      aria-hidden="true"
                    >
                      {initials(fowl.name)}
                    </span>
                  }
                  unavailableFallback={
                    <span className="text-muted-foreground flex h-full w-full items-center justify-center p-0.5 text-center text-[6px] leading-tight font-bold break-words">
                      {t('registry.cardPhotoUnavailable')}
                    </span>
                  }
                />
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-start justify-between gap-1">
                    <p className="text-card-foreground line-clamp-2 text-sm font-black">
                      {fowl.name}
                    </p>
                    {node.isRoot && (
                      <span className="bg-primary text-primary-foreground shrink-0 rounded px-1 py-0.5 text-[8px] font-black">
                        {t('lineageDirectory.rootTag')}
                      </span>
                    )}
                  </div>
                  <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-bold">
                    <SexMark fowl={fowl} />
                    {code && <span className="font-mono">{code}</span>}
                    <span>{fowl.breed}</span>
                    <span>{featherColorOf(fowl) || '—'}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    <LineageStatusBadge fowl={fowl} compact />
                    <span className="text-muted-foreground text-[10px] font-bold">
                      {generationOf(node)}
                    </span>
                    {canFight(fowl) &&
                      (stats.total > 0 ? (
                        <LineageRecordPill stats={stats} compact />
                      ) : (
                        <span className="text-muted-foreground text-[10px] font-bold">
                          {t('lineageDirectory.noFights')}
                        </span>
                      ))}
                  </div>
                  <p className="text-muted-foreground mt-1 truncate text-[10px] font-semibold">
                    {t('lineageDirectory.columnSire')}: {parents.sire || '—'} ·{' '}
                    {t('lineageDirectory.columnDam')}: {parents.dam || '—'}
                  </p>
                  {pairTypeByNode.get(node.id) && (
                    <p className="text-muted-foreground truncate text-[10px] font-semibold">
                      {t('lineageDirectory.pairType')}:{' '}
                      {pairTypeByNode.get(node.id) === 'crisscross'
                        ? t('lineageDirectory.pairCrisscross')
                        : pairTypeByNode.get(node.id) === 'outcross'
                          ? t('lineageDirectory.pairOutcross')
                          : t('lineageDirectory.pairOthers')}
                    </p>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="border-border bg-card hidden overflow-x-auto rounded-xl border md:block">
        <table className="w-full min-w-[62rem] border-collapse text-left text-xs">
          <caption className="sr-only">
            {t('lineageDirectory.tableCount', { shown: nodes.length, total: totalCount })}
          </caption>
          <thead>
            <tr>
              <th
                scope="col"
                className="border-border bg-muted/50 text-muted-foreground border-b px-2 py-2 text-left text-[10px] font-black tracking-wider uppercase"
              >
                {t('lineageDirectory.columnPhoto')}
              </th>
              {header('code', t('lineageDirectory.columnCode'))}
              {header('name', t('lineageDirectory.columnName'))}
              {header('sex', t('lineageDirectory.columnSex'))}
              {header('strain', t('lineageDirectory.columnStrain'))}
              {header('feather', t('lineageDirectory.columnFeather'))}
              {header('generation', t('lineageDirectory.columnGeneration'))}
              {header('sire', t('lineageDirectory.columnSire'))}
              {header('dam', t('lineageDirectory.columnDam'))}
              {header('status', t('lineageDirectory.columnStatus'))}
              {header('record', t('lineageDirectory.columnRecord'))}
            </tr>
          </thead>
          <tbody>
            {rows.map((node) => {
              const fowl = node.fowl;
              const code = lineageBirdCode(fowl, codes);
              const stats = statsOf(fowl);
              const parents = parentsOf(fowl);
              const selected = selectedId === node.id;
              return (
                <tr
                  key={node.id}
                  onClick={() => onSelect(fowl)}
                  className={`border-border cursor-pointer border-b last:border-b-0 ${
                    selected ? 'bg-accent-soft/40' : 'hover:bg-muted/35'
                  }`}
                >
                  <td className="px-2 py-1.5">
                    <ChickenPhoto
                      name={fowl.name}
                      code={code}
                      imageUrl={fowl.image_url}
                      photoPath={fowl.photo_path}
                      photoThumbPath={fowl.photo_thumb_path}
                      size={34}
                      shape="square"
                      interactive={false}
                      className="border-border h-8.5 w-8.5 rounded-md border"
                      fallback={
                        <span
                          className={`flex h-full w-full items-center justify-center text-[9px] font-black ${
                            sexLabel(fowl) === 'Hen'
                              ? 'bg-hen-bg text-hen'
                              : 'bg-cock-bg text-cock'
                          }`}
                          aria-hidden="true"
                        >
                          {initials(fowl.name)}
                        </span>
                      }
                      unavailableFallback={
                        <span className="text-muted-foreground flex h-full w-full items-center justify-center p-0.5 text-center text-[5px] leading-tight font-bold break-words">
                          {t('registry.cardPhotoUnavailable')}
                        </span>
                      }
                    />
                  </td>
                  <td className="text-muted-foreground px-2 py-1.5 font-mono font-bold">
                    {code || '—'}
                  </td>
                  <td className="max-w-[13rem] px-2 py-1.5">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelect(fowl);
                      }}
                      aria-label={t('lineageDirectory.openDetails', { name: fowl.name })}
                      className="text-card-foreground focus-visible:ring-brand-orange line-clamp-2 max-w-full cursor-pointer text-left font-black hover:underline focus-visible:ring-2 focus-visible:outline-none"
                    >
                      {fowl.name}
                      {node.isRoot && (
                        <span className="bg-primary text-primary-foreground ml-1 inline-block rounded px-1 text-[8px]">
                          {t('lineageDirectory.rootTag')}
                        </span>
                      )}
                    </button>
                  </td>
                  <td className="px-2 py-1.5">
                    <SexMark fowl={fowl} />
                  </td>
                  <td className="text-muted-foreground max-w-[10rem] px-2 py-1.5 font-semibold">
                    <span className="line-clamp-2">{fowl.breed || '—'}</span>
                  </td>
                  <td className="text-muted-foreground max-w-[10rem] px-2 py-1.5 font-semibold">
                    <span className="line-clamp-2">{featherColorOf(fowl) || '—'}</span>
                  </td>
                  <td className="text-muted-foreground px-2 py-1.5 font-bold">
                    {generationOf(node)}
                  </td>
                  <td className="text-muted-foreground max-w-[10rem] px-2 py-1.5 font-semibold">
                    <span className="line-clamp-2">{parents.sire || '—'}</span>
                  </td>
                  <td className="text-muted-foreground max-w-[10rem] px-2 py-1.5 font-semibold">
                    <span className="line-clamp-2">{parents.dam || '—'}</span>
                  </td>
                  <td className="px-2 py-1.5">
                    <LineageStatusBadge fowl={fowl} compact />
                  </td>
                  <td className="px-2 py-1.5">
                    {canFight(fowl) ? (
                      stats.total > 0 ? (
                        <LineageRecordPill stats={stats} compact />
                      ) : (
                        <span className="text-muted-foreground text-[10px] font-bold">
                          {t('lineageDirectory.noFights')}
                        </span>
                      )
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
