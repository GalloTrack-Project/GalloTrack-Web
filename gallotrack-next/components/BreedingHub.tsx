'use client';
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import type {
  BreedingPairRecord,
  FowlRecord,
  MatchRecord,
  PairingStats,
  SafetyIncidentRecord,
} from '@/lib/types';
import {
  Dna,
  Trophy,
  AlertTriangle,
  Heart,
  Hash,
  Combine,
  ChevronDown,
  ChevronUp,
  Shield,
  Plus,
  X,
  CheckCircle2,
  Info,
  BarChart3,
  Eye,
  Loader2,
  RefreshCw,
  Mars,
  Venus,
  Egg,
  Users,
} from 'lucide-react';
import { formatBirdCodeForDisplay, offspringBase, resolveBirdCodes } from '@/lib/bird-code';
import { sexLabel, parentBreedOf, isFemale, canFight } from '@/lib/helpers';
import { buildChickenMatchStatsMap, getChickenMatchStats } from '@/lib/win-rate';
import { offspringForPairing, pairingCodeFor, pairingConflict } from '@/lib/lineage';
import { toastMessage as showToastMessage } from '@/lib/toast-bus';
import {
  classifyBirdCode,
  countUrgentIncidents,
  INCIDENT_SEVERITIES,
  INCIDENT_STATUSES,
  INCIDENT_TYPES,
  isSireGender,
  offspringBaseCode as buildOffspringBaseCode,
  PAIRING_OUTCOMES,
  sortIncidents,
  validatePairing,
} from '@/lib/breeding';
import type {
  IncidentSeverity,
  IncidentStatus,
  IncidentType,
  PairingOutcome,
} from '@/lib/breeding';
import {
  deleteBreedingPairing,
  deleteSafetyIncident,
  fetchBreedingPairings,
  fetchSafetyIncidents,
  insertBreedingPairing,
  insertSafetyIncident,
  updateBreedingPairingOutcome,
} from '@/lib/services/breeding-service';
import { useUrlTab } from '@/lib/hooks/use-url-tab';
import { BREEDING_TABS } from '@/lib/nav-manifest';
import { useT } from '@/lib/i18n';
import { buildIdentityGroups, parentCodeLabels } from '@/lib/hub-identity';
import { classifyPairingRelatedness } from '@/lib/relatedness-classification';
import RelatednessBadge from '@/components/RelatednessBadge';
import CrisscrossBadge from '@/components/CrisscrossBadge';
import { classifyCrisscross } from '@/lib/lineage';
import BreedingTypeBadge from '@/components/BreedingTypeBadge';
import { getBreedingClassification } from '@/lib/breeding-classification';
import { computeBloodlineComposition, blendCompositions } from '@/lib/bloodline-composition';
import ChickenPhoto from '@/components/ChickenPhoto';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface BreedingHubProps {
  fowls: FowlRecord[];
  matchHistory: MatchRecord[];
  pairingAnalytics: { all: Map<string, PairingStats>; ranked: PairingStats[] };
  setSelectedFowlForDetails: (f: FowlRecord) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<
  IncidentSeverity,
  { bg: string; text: string; border: string; dot: string }
> = {
  Minor: {
    bg: 'bg-low-sample-bg dark:bg-low-sample-bg',
    text: 'text-warning dark:text-warning',
    border: 'border-warning/30 dark:border-warning/30',
    dot: 'bg-warning',
  },
  Moderate: {
    bg: 'bg-low-sample-bg dark:bg-low-sample-bg',
    text: 'text-warning dark:text-warning',
    border: 'border-warning/30 dark:border-warning/30',
    dot: 'bg-warning',
  },
  Severe: {
    bg: 'bg-loss-bg dark:bg-loss-bg',
    text: 'text-danger dark:text-danger',
    border: 'border-danger/30 dark:border-danger/30',
    dot: 'bg-danger',
  },
  Critical: {
    bg: 'bg-loss-bg dark:bg-loss-bg',
    text: 'text-danger dark:text-danger',
    border: 'border-danger/30 dark:border-danger/30',
    dot: 'bg-danger animate-pulse',
  },
};

const OUTCOME_CONFIG: Record<PairingOutcome, { bg: string; text: string; border: string }> = {
  Active: {
    bg: 'bg-win-bg dark:bg-win-bg',
    text: 'text-success dark:text-success',
    border: 'border-success/30 dark:border-success/30',
  },
  Completed: {
    bg: 'bg-cock-bg dark:bg-cock-bg',
    text: 'text-cock dark:text-cock',
    border: 'border-cock/30 dark:border-cock/30',
  },
  Discontinued: { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border' },
};

/** Resolved bird code for a chicken (live scheme first, stored value as fallback). */
const codeOf = (fowl: FowlRecord, codes: Map<string, string>): string =>
  codes.get(String(fowl.id)) || fowl.bird_code || '';

// ─────────────────────────────────────────────────────────────────────────────
// CODING SYSTEM VISUALIZER
// ─────────────────────────────────────────────────────────────────────────────

function FarmCodeChips({
  fowls,
  codes,
  kind,
  emptyLabel,
}: {
  fowls: FowlRecord[];
  codes: Map<string, string>;
  kind: 'sire' | 'dam' | 'offspring';
  emptyLabel: string;
}) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? fowls : fowls.slice(0, 6);
  const remaining = fowls.length - visible.length;

  if (fowls.length === 0) {
    return <p className="text-xs font-semibold break-words opacity-80">{emptyLabel}</p>;
  }

  return (
    <div className="flex min-w-0 flex-wrap gap-1.5">
      {visible.map((fowl) => {
        const code = formatBirdCodeForDisplay(codeOf(fowl, codes));
        return (
          <span
            key={fowl.id}
            title={`${fowl.name}${code ? ` (${code})` : ''}`}
            className="border-current bg-background/70 inline-flex min-h-8 min-w-0 max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold"
          >
            {kind === 'sire' && <Mars className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
            {kind === 'dam' && <Venus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
            <span className="min-w-0 break-words">{kind === 'offspring' ? code : fowl.name}</span>
            {kind !== 'offspring' && code && (
              <span className="shrink-0 font-mono text-[10px] font-black opacity-75">{code}</span>
            )}
          </span>
        );
      })}
      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="bg-background/80 hover:bg-background inline-flex min-h-11 cursor-pointer items-center rounded-full border border-current px-3 text-xs font-black transition-colors focus-visible:ring-2 focus-visible:ring-current focus-visible:outline-none"
        >
          {t('hub.moreCount', { count: remaining })}
        </button>
      )}
    </div>
  );
}

function CodingSystemExplainer({
  fowls,
  codes,
}: {
  fowls: FowlRecord[];
  codes: Map<string, string>;
}) {
  const t = useT();
  const sires = fowls
    .filter(isSireGender)
    .filter((f) => classifyBirdCode(codeOf(f, codes)) === 'sire');
  const dams = fowls
    .filter((f) => isFemale(f.gender))
    .filter((f) => classifyBirdCode(codeOf(f, codes)) === 'dam');
  const offspring = fowls.filter((f) => classifyBirdCode(codeOf(f, codes)) === 'offspring');
  const offspringExample1 = `${offspringBase('1', 'A')}1`;
  const offspringExample2 = `${offspringBase('1', 'A')}2`;
  const offspringExample3 = `${offspringBase('2', 'B')}1`;

  return (
    <div className="bg-card border-border min-w-0 overflow-hidden rounded-3xl border shadow-sm">
      <div className="border-border border-b px-5 pt-5 pb-4 sm:px-6 sm:pt-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="bg-sidebar text-sidebar-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
            <Hash className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 className="text-card-foreground text-sm font-black break-words">
              Coding System
            </h3>
            <p className="text-muted-foreground text-xs font-semibold break-words">
              {t('hub.codingCardSubtitle')}
            </p>
          </div>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 p-4 sm:p-6 lg:grid-cols-3">
        <section className="bg-cock-bg text-cock min-w-0 space-y-3 rounded-2xl border border-cock/30 p-4 [overflow-wrap:anywhere]">
          <div className="flex min-w-0 items-center gap-2">
            <span className="bg-background/80 flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
              <Mars className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-black tracking-widest uppercase">{t('hub.codeTypeSire')}</p>
              <p className="text-xs font-semibold">{t('hub.sireSubtitle')}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {['1', '2', '3', '4', '5'].map((n) => (
              <span key={n} className="bg-cock text-background flex h-8 w-8 items-center justify-center rounded-lg text-xs font-black shadow-sm">
                {n}
              </span>
            ))}
            <span className="text-xs font-black">...</span>
          </div>
          <p className="text-xs font-semibold">
            <strong>{t('hub.sireHelper')}</strong>
          </p>
          <div className="border-t border-current pt-3">
            <p className="mb-2 text-xs font-black tracking-widest uppercase">{t('hub.onYourFarm')}</p>
            <FarmCodeChips fowls={sires} codes={codes} kind="sire" emptyLabel={t('hub.noCodedCocks')} />
          </div>
        </section>

        <section className="bg-hen-bg text-hen min-w-0 space-y-3 rounded-2xl border border-hen/30 p-4 [overflow-wrap:anywhere]">
          <div className="flex min-w-0 items-center gap-2">
            <span className="bg-background/80 flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
              <Venus className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-black tracking-widest uppercase">{t('hub.codeTypeDam')}</p>
              <p className="text-xs font-semibold">{t('hub.damSubtitle')}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {['A', 'B', 'C', 'D', 'E'].map((letter) => (
              <span key={letter} className="bg-hen text-background flex h-8 w-8 items-center justify-center rounded-lg text-xs font-black shadow-sm">
                {letter}
              </span>
            ))}
            <span className="text-xs font-black">...</span>
          </div>
          <p className="text-xs font-semibold">
            <strong>{t('hub.damHelper')}</strong>
          </p>
          <div className="border-t border-current pt-3">
            <p className="mb-2 text-xs font-black tracking-widest uppercase">{t('hub.onYourFarm')}</p>
            <FarmCodeChips fowls={dams} codes={codes} kind="dam" emptyLabel={t('hub.noCodedDams')} />
          </div>
        </section>

        <section className="bg-win-bg text-success min-w-0 space-y-3 rounded-2xl border border-success/30 p-4 [overflow-wrap:anywhere]">
          <div className="flex min-w-0 items-center gap-2">
            <span className="bg-background/80 flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
              <Combine className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-black tracking-widest uppercase">
                {t('hub.codeTypeOffspring')}
              </p>
              <p className="text-xs font-semibold">{t('hub.offspringSubtitle')}</p>
            </div>
          </div>
          <div className="space-y-1.5">
            {([
              { code: offspringExample1, key: 'hub.exampleLineFirst', sire: '1', dam: 'A' },
              { code: offspringExample2, key: 'hub.exampleLineSecond', sire: '1', dam: 'A' },
              { code: offspringExample3, key: 'hub.exampleLineThird', sire: '2', dam: 'B' },
            ] as const).map((example) => (
              <div key={example.code} className="flex min-w-0 items-start gap-2">
                <span className="w-12 shrink-0 font-mono text-sm font-black">{example.code}</span>
                <span className="text-xs font-semibold break-words">
                  {t(example.key, { sire: example.sire, dam: example.dam })}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-current pt-3">
            <p className="mb-2 text-xs font-black tracking-widest uppercase">{t('hub.onYourFarm')}</p>
            <FarmCodeChips fowls={offspring} codes={codes} kind="offspring" emptyLabel={t('hub.noCodedOffspring')} />
          </div>
        </section>
      </div>

      <div className="bg-muted/40 border-border mx-4 mb-4 rounded-2xl border p-4 sm:mx-6 sm:mb-6">
        <p className="text-muted-foreground mb-3 text-xs font-black tracking-widest uppercase">
          {t('hub.pairingExampleTitle')}
        </p>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div className="bg-cock-bg text-cock min-w-24 rounded-xl border border-cock/30 px-3 py-2 text-center">
            <p className="text-xs font-black tracking-widest uppercase">{t('hub.codeTypeSire')}</p>
            <p className="font-mono text-base font-black">1</p>
          </div>
          <span className="text-muted-foreground font-black">x</span>
          <div className="bg-hen-bg text-hen min-w-24 rounded-xl border border-hen/30 px-3 py-2 text-center">
            <p className="text-xs font-black tracking-widest uppercase">{t('hub.codeTypeDam')}</p>
            <p className="font-mono text-base font-black">A</p>
          </div>
          <span className="text-muted-foreground font-black">-&gt;</span>
          {[offspringExample1, offspringExample2, `${offspringBase('1', 'A')}3`].map((code, index) => (
            <div key={code} className="bg-win-bg text-success min-w-28 rounded-xl border border-success/30 px-3 py-2 text-center">
              <p className="text-xs font-black tracking-widest uppercase">
                {t('hub.offspringNumber', { number: index + 1 })}
              </p>
              <p className="font-mono text-base font-black">{code}</p>
            </div>
          ))}
        </div>
        <p className="text-muted-foreground mt-3 text-xs font-semibold break-words">
          {t('hub.exampleNote', { name: `Lemon Ground Red - ${offspringExample1}` })}
        </p>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// BREEDING PAIR CARD
// ─────────────────────────────────────────────────────────────────────────────

function BreedingPairCard({
  pair,
  fowls,
  codes,
  matchHistory,
  onRemove,
  onOutcomeChange,
  setSelectedFowlForDetails,
}: {
  pair: BreedingPairRecord;
  fowls: FowlRecord[];
  codes: Map<string, string>;
  matchHistory: MatchRecord[];
  onRemove: () => void;
  onOutcomeChange: (outcome: PairingOutcome) => void;
  setSelectedFowlForDetails: (f: FowlRecord) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const sire =
    fowls.find((f) => f.id === pair.sire_id) ||
    (pair.sire_name
      ? fowls.find((f) => f.name.toLowerCase() === pair.sire_name.toLowerCase())
      : undefined);
  const dam =
    fowls.find((f) => f.id === pair.dam_id) ||
    (pair.dam_name
      ? fowls.find((f) => f.name.toLowerCase() === pair.dam_name.toLowerCase())
      : undefined);
  const relatedness = useMemo(
    () => classifyPairingRelatedness(sire, dam, fowls),
    [sire, dam, fowls],
  );
  const crisscross = useMemo(
    () => classifyCrisscross(sire, dam, fowls),
    [sire, dam, fowls],
  );

  const offspring = offspringForPairing(pair, fowls);
  const matchStatsMap = useMemo(
    () => buildChickenMatchStatsMap(matchHistory, fowls),
    [matchHistory, fowls],
  );

  const offspringMatchStats = offspring.map((o) => {
    const record = getChickenMatchStats(matchStatsMap, o);
    return {
      fowl: o,
      wins: canFight(o) ? record.wins : 0,
      losses: canFight(o) ? record.losses : 0,
      decided: canFight(o) ? record.decided : 0,
      draws: canFight(o) ? record.draws : 0,
      total: canFight(o) ? record.total : 0,
      winRate: canFight(o) ? record.winRate : null,
    };
  });

  const totalWins = offspringMatchStats.reduce((a, s) => a + s.wins, 0);
  const totalLosses = offspringMatchStats.reduce((a, s) => a + s.losses, 0);
  const totalDecided = totalWins + totalLosses;
  const combinedWinRate = totalDecided > 0 ? Math.round((totalWins / totalDecided) * 100) : null;

  const outCfg = OUTCOME_CONFIG[pair.outcome];
  const offspringBaseCode = buildOffspringBaseCode(pair.sire_code, pair.dam_code) || '—';

  return (
    <div className="bg-card border-border overflow-hidden rounded-2xl border shadow-sm">
      <div className="p-4 sm:p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="border-border flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-gradient-to-br from-cock-bg to-hen-bg dark:from-cock-bg dark:to-hen-bg">
              <Heart className="h-5 w-5 text-danger" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-card-foreground text-sm font-black">
                  <span className="font-mono text-cock dark:text-cock">{pair.sire_code}</span>
                  <span className="text-muted-foreground mx-1">×</span>
                  <span className="font-mono text-hen dark:text-hen">
                    {pair.dam_code}
                  </span>
                </h3>
                <span className="rounded-md border border-accent/30 bg-accent-soft px-1.5 py-0.5 font-mono text-xs font-black text-primary dark:border-accent/30 dark:bg-accent-soft dark:text-primary">
                  → {offspringBaseCode}₁, {offspringBaseCode}₂···
                </span>
              </div>
              <p className="text-muted-foreground break-words text-xs font-semibold">
                {pair.sire_name} × {pair.dam_name}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {crisscross.isCrisscross ? (
              <CrisscrossBadge classification={crisscross} compact />
            ) : (
              <RelatednessBadge classification={relatedness} compact />
            )}
            <span
              className={`rounded-full border px-2 py-1 text-xs font-black ${outCfg.bg} ${outCfg.text} ${outCfg.border}`}
            >
              {pair.outcome}
            </span>
            <button
              type="button"
              onClick={onRemove}
              className="text-muted-foreground flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-loss-bg hover:text-danger dark:hover:bg-loss-bg"
              aria-label="Remove pairing"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="mb-4 grid grid-cols-3 gap-3">
          <div className="bg-muted/40 rounded-xl p-3 text-center">
            <p className="text-card-foreground text-lg font-black">{offspring.length}</p>
            <p className="text-muted-foreground text-xs font-bold tracking-widest uppercase">
              Offspring
            </p>
          </div>
          <div className="bg-muted/40 rounded-xl p-3 text-center">
            <p
              className={`text-lg font-black ${(combinedWinRate ?? 0) >= 50 ? 'text-success dark:text-success' : totalDecided > 0 ? 'text-danger dark:text-danger' : 'text-muted-foreground'}`}
            >
              {totalDecided > 0 ? `${combinedWinRate}%` : '—'}
            </p>
            <p className="text-muted-foreground text-xs font-bold tracking-widest uppercase">
              Win Rate
            </p>
          </div>
          <div className="bg-muted/40 rounded-xl p-3 text-center">
            <p className="text-card-foreground text-lg font-black">
              {totalWins}W-{totalLosses}L
            </p>
            <p className="text-muted-foreground text-xs font-bold tracking-widest uppercase">
              Record
            </p>
          </div>
        </div>

        {/* Parent info */}
        <div className="mb-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => sire && setSelectedFowlForDetails(sire)}
            disabled={!sire}
            className="cursor-pointer rounded-xl border border-cock/30 bg-cock-bg p-2.5 text-left transition-colors hover:bg-cock-bg disabled:cursor-default dark:border-cock/30 dark:bg-cock-bg dark:hover:bg-cock-bg"
          >
            <p className="text-xs font-black tracking-widest text-cock uppercase dark:text-cock">
               Sire
            </p>
            <p className="text-card-foreground break-words text-xs font-black">{pair.sire_name}</p>
            <p className="text-muted-foreground text-xs font-semibold">
              {sire?.breed || '—'} · Code:{' '}
              <span className="font-mono text-cock dark:text-cock">{pair.sire_code}</span>
            </p>
          </button>
          <button
            type="button"
            onClick={() => dam && setSelectedFowlForDetails(dam)}
            disabled={!dam}
            className="cursor-pointer rounded-xl border border-hen/30 bg-hen-bg p-2.5 text-left transition-colors hover:bg-hen-bg disabled:cursor-default dark:border-hen/30 dark:bg-hen-bg dark:hover:bg-hen-bg"
          >
            <p className="text-xs font-black tracking-widest text-hen uppercase dark:text-hen">
               Dam
            </p>
            <p className="text-card-foreground break-words text-xs font-black">{pair.dam_name}</p>
            <p className="text-muted-foreground text-xs font-semibold">
              {dam?.breed || '—'} · Code:{' '}
              <span className="font-mono text-hen dark:text-hen">{pair.dam_code}</span>
            </p>
          </button>
        </div>

        {pair.notes && (
          <p className="text-muted-foreground bg-muted/30 mb-3 rounded-lg px-3 py-2 text-xs font-semibold">
             {pair.notes}
          </p>
        )}

        {offspring.length > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-muted-foreground hover:text-card-foreground flex w-full cursor-pointer items-center justify-between py-1 text-xs font-black transition-colors"
          >
            <span className="tracking-widest uppercase">Offspring ({offspring.length})</span>
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        )}

        {expanded && (
          <div className="mt-2 space-y-1.5">
            {offspringMatchStats.map(({ fowl, wins, losses, draws, total, winRate }) => {
              const code = codes.get(String(fowl.id)) || fowl.bird_code || '';
              return (
                <button
                  key={fowl.id}
                  type="button"
                  onClick={() => setSelectedFowlForDetails(fowl)}
                  className="group bg-muted/30 border-border flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border px-3 py-2 transition-all hover:border-success/30 hover:bg-win-bg dark:hover:border-success/30 dark:hover:bg-win-bg"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="text-muted-foreground bg-card border-border shrink-0 rounded-md border px-1.5 py-0.5 font-mono text-xs font-black">
                      {formatBirdCodeForDisplay(code)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-card-foreground break-words text-xs font-black group-hover:text-success dark:group-hover:text-success">
                        {fowl.name}
                      </p>
                      <p className="text-muted-foreground break-words text-xs font-semibold">
                        {sexLabel(fowl)} · {fowl.breed}
                      </p>
                    </div>
                  </div>
                  {canFight(fowl) &&
                    (total > 0 ? (
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-black ${(winRate ?? 0) >= 50 ? 'border-success/30 bg-win-bg text-success dark:border-success/30 dark:bg-win-bg dark:text-success' : 'border-danger/30 bg-loss-bg text-danger dark:border-danger/30 dark:bg-loss-bg dark:text-danger'}`}
                      >
                        {winRate === null ? '—%' : `${winRate}%`} · {wins}W-{losses}L
                        {draws > 0 ? `-${draws}D` : ''}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/50 shrink-0 text-xs font-bold">
                        No fights
                      </span>
                    ))}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-muted/30 border-border flex flex-wrap items-center justify-between gap-2 border-t px-5 py-2.5">
        <span className="text-muted-foreground text-xs font-bold">
          Pairing Date: {pair.pairing_date || 'Not set'}
        </span>
        <div className="flex items-center gap-2">
          <label
            htmlFor={`pair-outcome-${pair.id}`}
            className="text-muted-foreground text-xs font-bold tracking-widest uppercase"
          >
            Status
          </label>
          <select
            id={`pair-outcome-${pair.id}`}
            value={pair.outcome}
            onChange={(e) => onOutcomeChange(e.target.value as PairingOutcome)}
            className={`bg-card cursor-pointer rounded-full border px-2 py-1 text-xs font-black focus:ring-2 focus:ring-success/40 focus:outline-none ${outCfg.bg} ${outCfg.text} ${outCfg.border}`}
          >
            {PAIRING_OUTCOMES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <span className="font-mono text-xs font-black text-primary dark:text-primary">
            Base Code: {offspringBaseCode}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ADD PAIRING FORM
// ─────────────────────────────────────────────────────────────────────────────

function AddPairingForm({
  fowls,
  codes,
  pairs,
  onAdd,
  onCancel,
}: {
  fowls: FowlRecord[];
  codes: Map<string, string>;
  pairs: BreedingPairRecord[];
  onAdd: (payload: Partial<BreedingPairRecord>) => void;
  onCancel: () => void;
}) {
  const [sireId, setSireId] = useState('');
  const [damId, setDamId] = useState('');
  const [pairingDate, setPairingDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [outcome, setOutcome] = useState<PairingOutcome>('Active');
  const [error, setError] = useState('');

  const [confirmCloseBreeding, setConfirmCloseBreeding] = useState(false);

  useEffect(() => {
    setConfirmCloseBreeding(false);
  }, [sireId, damId]);

  const males = fowls.filter(isSireGender);
  const females = fowls.filter((f) => isFemale(f.gender));

  const selectedSire = fowls.find((f) => f.id === Number(sireId));
  const selectedDam = fowls.find((f) => f.id === Number(damId));

  const sireCode = selectedSire ? codeOf(selectedSire, codes) : '';
  const damCode = selectedDam ? codeOf(selectedDam, codes) : '';
  const previewCode = buildOffspringBaseCode(sireCode, damCode);

  const conflict = useMemo(
    () => pairingConflict(pairs, selectedSire, selectedDam),
    [pairs, selectedSire, selectedDam],
  );

  const expectedComposition = useMemo(() => {
    if (!selectedSire || !selectedDam) return null;
    const sireComp = computeBloodlineComposition(selectedSire, fowls);
    const damComp = computeBloodlineComposition(selectedDam, fowls);
    return blendCompositions(sireComp, damComp, 0.5, 0.5);
  }, [selectedSire, selectedDam, fowls]);

  const expectedBreedMix = useMemo(() => {
    if (!expectedComposition || !selectedSire || !selectedDam) return null;
    const syntheticChild = {
      id: -999,
      name: 'Preview Offspring',
      breed: '',
      bloodline_composition: expectedComposition,
    } as unknown as FowlRecord;
    return getBreedingClassification(syntheticChild, fowls);
  }, [expectedComposition, selectedSire, selectedDam, fowls]);

  const relatedness = useMemo(() => {
    if (!selectedSire || !selectedDam) return null;
    return classifyPairingRelatedness(selectedSire, selectedDam, fowls);
  }, [selectedSire, selectedDam, fowls]);

  const crisscross = useMemo(
    () => classifyCrisscross(selectedSire ?? null, selectedDam ?? null, fowls),
    [selectedSire, selectedDam, fowls],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const problem = validatePairing(selectedSire, selectedDam);
    if (problem) {
      setError(problem);
      return;
    }
    if (conflict?.kind === 'occupied') {
      setError(
        `${conflict.bird === 'sire' ? 'Sire' : 'Dam'} "${
          conflict.bird === 'sire' ? selectedSire?.name : selectedDam?.name
        }" ay may Active partner na si ${conflict.partnerName} (pairing ${
          conflict.pairing.pairing_code || `#${conflict.pairing.id}`
        }).`,
      );
      return;
    }
    if (relatedness?.isCloseBreeding && !confirmCloseBreeding) {
      setError('Please confirm the close breeding warning before recording this pairing.');
      return;
    }
    setError('');
    onAdd({
      sire_id: selectedSire!.id,
      dam_id: selectedDam!.id,
      sire_name: selectedSire!.name,
      dam_name: selectedDam!.name,
      sire_code: sireCode || null,
      dam_code: damCode || null,
      pairing_code: pairingCodeFor(sireCode, damCode),
      pairing_date: pairingDate || null,
      notes: notes.trim() || null,
      outcome,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-card space-y-4 rounded-2xl border border-success/30 p-5 shadow-sm dark:border-success/30"
    >
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Plus className="h-4 w-4 text-primary-foreground" />
        </div>
        <h3 className="text-card-foreground text-sm font-black">Record a New Pairing</h3>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label
            htmlFor="pair-sire"
            className="text-xs font-black tracking-widest text-cock uppercase dark:text-cock"
          >
             Sire
          </label>
          <select
            id="pair-sire"
            value={sireId}
            onChange={(e) => setSireId(e.target.value)}
            required
            className="border-border bg-card text-card-foreground w-full cursor-pointer rounded-xl border px-3 py-2.5 text-xs font-bold transition-all outline-none focus:border-success/30 focus:ring-2 focus:ring-success/40 dark:focus:ring-success/40"
          >
            <option value="">Select a sire...</option>
            {males.map((f) => (
              <option key={f.id} value={f.id}>
                {formatBirdCodeForDisplay(codes.get(String(f.id)) || f.bird_code || '')} · {f.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label
            htmlFor="pair-dam"
            className="text-xs font-black tracking-widest text-hen uppercase dark:text-hen"
          >
             Dam
          </label>
          <select
            id="pair-dam"
            value={damId}
            onChange={(e) => setDamId(e.target.value)}
            required
            className="border-border bg-card text-card-foreground w-full cursor-pointer rounded-xl border px-3 py-2.5 text-xs font-bold transition-all outline-none focus:border-success/30 focus:ring-2 focus:ring-success/40 dark:focus:ring-success/40"
          >
            <option value="">Select a dam...</option>
            {females.map((f) => (
              <option key={f.id} value={f.id}>
                {formatBirdCodeForDisplay(codes.get(String(f.id)) || f.bird_code || '')} · {f.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {conflict?.kind === 'occupied' && (
        <div className="flex items-start gap-2.5 rounded-xl border border-danger/30 bg-loss-bg p-3 dark:border-danger/30 dark:bg-loss-bg">
          <span className="mt-0.5 shrink-0 text-danger dark:text-danger">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-black tracking-widest text-danger uppercase dark:text-danger">
              Already Has an Active Partner
            </p>
            <p className="text-xs font-semibold text-danger dark:text-danger">
              {conflict.bird === 'sire' ? selectedSire?.name : selectedDam?.name} is currently
              paired with {conflict.partnerName} (pairing{' '}
              {conflict.pairing.pairing_code || `#${conflict.pairing.id}`}). Set that pairing to
              Completed before recording a new one.
            </p>
          </div>
        </div>
      )}

      {conflict?.kind === 'couple' && (
        <div className="flex items-start gap-2.5 rounded-xl border border-cock/30 bg-cock-bg p-3 dark:border-cock/30 dark:bg-cock-bg">
          <span className="mt-0.5 shrink-0 text-cock dark:text-cock">
            <Info className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-black tracking-widest text-cock uppercase dark:text-cock">
              This Pairing Is Already Recorded
            </p>
            <p className="text-xs font-semibold text-cock dark:text-cock">
              {conflict.pairing.sire_name || 'Sire'} × {conflict.pairing.dam_name || 'Dam'} — code{' '}
              {conflict.pairing.pairing_code || `#${conflict.pairing.id}`}, status{' '}
              {conflict.pairing.outcome}. Submitting will update the existing record; no duplicate
              will be created.
            </p>
          </div>
        </div>
      )}

      {/* Live Preview: Breed mix + Relatedness */}
      {selectedSire && selectedDam && (
        <div className="dark:bg-card/70 border-border space-y-3 rounded-xl border bg-muted p-3.5">
          <div className="flex items-center gap-2">
            <Dna className="h-4 w-4 text-success dark:text-success" />
            <p className="text-card-foreground text-xs font-black tracking-widest uppercase">
              Offspring & Lineage Live Preview
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* Expected Offspring Breed Mix */}
            <div className="bg-card border-border space-y-1.5 rounded-lg border p-3">
              <p className="text-muted-foreground text-xs font-black tracking-wider uppercase">
                Expected Offspring Breed Mix
              </p>
              {expectedBreedMix ? (
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <BreedingTypeBadge classification={expectedBreedMix} />
                    <span className="text-card-foreground text-xs font-black">
                      {expectedBreedMix.type === 'Crossbred'
                        ? expectedBreedMix.derivedBreed
                        : expectedBreedMix.dominantBreed}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-xs font-semibold">
                    {expectedBreedMix.summary}
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground text-xs">Calculating breed mix...</p>
              )}
            </div>

            {/* Pairing Relatedness */}
            <div className="bg-card border-border space-y-1.5 rounded-lg border p-3">
              <p className="text-muted-foreground text-xs font-black tracking-wider uppercase">
                Pairing Relatedness
              </p>
              {crisscross.isCrisscross ? (
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <CrisscrossBadge classification={crisscross} />
                  </div>
                  <p className="text-muted-foreground text-xs font-semibold">
                    {crisscross.reason}
                  </p>
                </div>
              ) : relatedness ? (
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <RelatednessBadge classification={relatedness} showSecondary />
                  </div>
                  <p className="text-muted-foreground text-xs font-semibold">
                    {relatedness.relationship}
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground text-xs">Evaluating relatedness...</p>
              )}
            </div>
          </div>

          {/* Close Breeding Warning + Confirmation */}
          {relatedness?.isCloseBreeding && (
            <div className="space-y-2.5 rounded-xl border border-warning/30 bg-low-sample-bg p-3.5 dark:border-warning/30 dark:bg-low-sample-bg">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning dark:text-warning" />
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-black tracking-widest text-warning uppercase dark:text-warning">
                      Close Breeding Warning
                    </p>
                    <span className="text-xs font-semibold text-warning dark:text-warning">
                      ({relatedness.secondaryLabel})
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-warning dark:text-warning">
                    {relatedness.relationship}. Inbreeding can amplify undesirable recessive traits
                    and reduce vitality.
                  </p>
                </div>
              </div>
              <label className="flex cursor-pointer items-center gap-2.5 border-t border-warning/30 pt-1.5 dark:border-warning/30">
                <input
                  id="confirm-close-breeding"
                  type="checkbox"
                  checked={confirmCloseBreeding}
                  onChange={(e) => setConfirmCloseBreeding(e.target.checked)}
                  className="h-4 w-4 cursor-pointer rounded border-warning/30 text-warning focus:ring-warning/40"
                />
                <span className="text-xs font-bold text-warning select-none dark:text-warning">
                  I understand the risks of close breeding and confirm this pairing
                </span>
              </label>
            </div>
          )}
        </div>
      )}

      {previewCode && (
        <div className="flex items-center gap-3 rounded-xl border border-accent/30 bg-accent-soft p-3 dark:border-accent/30 dark:bg-accent-soft">
          <Combine className="h-4 w-4 shrink-0 text-primary dark:text-primary" />
          <div>
            <p className="text-xs font-black tracking-widest text-primary uppercase dark:text-primary">
              Offspring Code Preview
            </p>
            <p className="text-card-foreground font-mono text-sm font-black">
              {previewCode}₁, {previewCode}₂, {previewCode}₃···
            </p>
            <p className="text-muted-foreground text-xs">
              Sire <span className="font-mono text-cock dark:text-cock">{sireCode}</span> +
              Dam <span className="font-mono text-hen dark:text-hen">{damCode}</span>
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label
            htmlFor="pair-date"
            className="text-muted-foreground text-xs font-black tracking-widest uppercase"
          >
            Pairing Date
          </label>
          <input
            id="pair-date"
            type="date"
            value={pairingDate}
            onChange={(e) => setPairingDate(e.target.value)}
            className="border-border bg-card text-card-foreground w-full rounded-xl border px-3 py-2.5 text-xs font-bold transition-all outline-none focus:border-success/30"
          />
        </div>
        <div className="space-y-1">
          <label
            htmlFor="pair-status"
            className="text-muted-foreground text-xs font-black tracking-widest uppercase"
          >
            Status
          </label>
          <select
            id="pair-status"
            value={outcome}
            onChange={(e) => setOutcome(e.target.value as typeof outcome)}
            className="border-border bg-card text-card-foreground w-full cursor-pointer rounded-xl border px-3 py-2.5 text-xs font-bold transition-all outline-none focus:border-success/30"
          >
            <option value="Active">Active</option>
            <option value="Completed">Completed</option>
            <option value="Discontinued">Discontinued</option>
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label
          htmlFor="pair-notes"
          className="text-muted-foreground text-xs font-black tracking-widest uppercase"
        >
          Notes / Observations
        </label>
        <textarea
          id="pair-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="e.g. Strong bloodline combination, promising offspring..."
          className="border-border bg-card text-card-foreground placeholder:text-muted-foreground/50 w-full resize-none rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all outline-none focus:border-success/30"
        />
      </div>

      {error && (
        <p className="rounded-xl border border-danger/30 bg-loss-bg px-3 py-2 text-xs font-black text-danger dark:border-danger/30 dark:bg-loss-bg dark:text-danger">
          {error}
        </p>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={
            !sireId ||
            !damId ||
            conflict?.kind === 'occupied' ||
            (relatedness?.isCloseBreeding && !confirmCloseBreeding)
          }
          className="flex-1 cursor-pointer rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 min-h-11 py-2.5 text-xs font-black transition-all disabled:cursor-not-allowed disabled:opacity-50"
        >
          {relatedness?.isCloseBreeding && !confirmCloseBreeding
            ? 'Confirm Close Breeding to Save'
            : 'Record Pairing'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="bg-muted text-muted-foreground hover:bg-muted/80 min-h-11 cursor-pointer rounded-xl px-5 py-2.5 text-xs font-black transition-all"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SAFETY INCIDENT CARD
// ─────────────────────────────────────────────────────────────────────────────

function SafetyIncidentCard({
  incident,
  onRemove,
}: {
  incident: SafetyIncidentRecord;
  onRemove: () => void;
}) {
  const cfg = SEVERITY_CONFIG[incident.severity];
  const statusColors: Record<string, string> = {
    Treated: 'text-cock dark:text-cock',
    Monitoring: 'text-warning dark:text-warning',
    Recovered: 'text-success dark:text-success',
    Deceased: 'text-danger dark:text-danger',
  };

  return (
    <div className={`rounded-2xl border p-4 ${cfg.bg} ${cfg.border}`}>
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`h-2 w-2 shrink-0 rounded-full ${cfg.dot}`} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-card-foreground text-xs font-black">
                <span className={`font-mono ${cfg.text}`}>
                  {formatBirdCodeForDisplay(incident.fowl_code || '')}
                </span>{' '}
                · {incident.fowl_name}
              </p>
              <span
                className={`rounded border px-1.5 py-0.5 text-xs font-black ${cfg.bg} ${cfg.text} ${cfg.border} tracking-wider uppercase`}
              >
                {incident.severity}
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="text-muted-foreground text-xs font-bold">{incident.type}</span>
              <span className="text-muted-foreground text-xs">·</span>
              <span className="text-muted-foreground text-xs font-bold">
                {incident.incident_date}
              </span>
              <span className="text-muted-foreground text-xs">·</span>
              <span
                className={`text-xs font-black ${statusColors[incident.status] || 'text-muted-foreground'}`}
              >
                {incident.status}
              </span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-muted-foreground flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-loss-bg hover:text-danger focus-visible:ring-2 focus-visible:ring-danger/40 focus-visible:outline-none dark:hover:bg-loss-bg"
          aria-label={`Dismiss ${incident.type} incident`}
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      {incident.description && (
        <p className="text-muted-foreground bg-background/60 mt-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold">
          {incident.description}
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ADD INCIDENT FORM
// ─────────────────────────────────────────────────────────────────────────────

function AddIncidentForm({
  fowls,
  codes,
  onAdd,
  onCancel,
}: {
  fowls: FowlRecord[];
  codes: Map<string, string>;
  onAdd: (payload: Partial<SafetyIncidentRecord>) => void;
  onCancel: () => void;
}) {
  const [fowlId, setFowlId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<IncidentType>('Injury');
  const [severity, setSeverity] = useState<IncidentSeverity>('Minor');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<IncidentStatus>('Treated');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fowl = fowls.find((f) => f.id === Number(fowlId));
    if (!fowl) return;
    onAdd({
      fowl_id: fowl.id,
      fowl_name: fowl.name,
      fowl_code: codeOf(fowl, codes) || null,
      incident_date: date,
      type,
      severity,
      description: description.trim() || null,
      status,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-card space-y-4 rounded-2xl border border-danger/30 p-5 shadow-sm dark:border-danger/30"
    >
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <AlertTriangle className="h-4 w-4 text-primary-foreground" />
        </div>
        <h3 className="text-card-foreground text-sm font-black">Record a Safety Incident</h3>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label
            htmlFor="inc-fowl"
            className="text-muted-foreground text-xs font-black tracking-widest uppercase"
          >
            Chicken
          </label>
          <select
            id="inc-fowl"
            value={fowlId}
            onChange={(e) => setFowlId(e.target.value)}
            required
            className="border-border bg-card text-card-foreground w-full cursor-pointer rounded-xl border px-3 py-2.5 text-xs font-bold transition-all outline-none focus:border-danger/30"
          >
            <option value="">Select a chicken...</option>
            {fowls.map((f) => (
              <option key={f.id} value={f.id}>
                {formatBirdCodeForDisplay(codes.get(String(f.id)) || f.bird_code || '')} · {f.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label
            htmlFor="inc-date"
            className="text-muted-foreground text-xs font-black tracking-widest uppercase"
          >
            Date
          </label>
          <input
            id="inc-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border-border bg-card text-card-foreground w-full rounded-xl border px-3 py-2.5 text-xs font-bold transition-all outline-none focus:border-danger/30"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <label
            htmlFor="inc-type"
            className="text-muted-foreground text-xs font-black tracking-widest uppercase"
          >
            Incident Type
          </label>
          <select
            id="inc-type"
            value={type}
            onChange={(e) => setType(e.target.value as IncidentType)}
            className="border-border bg-card text-card-foreground w-full cursor-pointer rounded-xl border px-3 py-2.5 text-xs font-bold transition-all outline-none focus:border-danger/30"
          >
            {INCIDENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label
            htmlFor="inc-severity"
            className="text-muted-foreground text-xs font-black tracking-widest uppercase"
          >
            Severity
          </label>
          <select
            id="inc-severity"
            value={severity}
            onChange={(e) => setSeverity(e.target.value as IncidentSeverity)}
            className="border-border bg-card text-card-foreground w-full cursor-pointer rounded-xl border px-3 py-2.5 text-xs font-bold transition-all outline-none focus:border-danger/30"
          >
            {INCIDENT_SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label
            htmlFor="inc-status"
            className="text-muted-foreground text-xs font-black tracking-widest uppercase"
          >
            Status
          </label>
          <select
            id="inc-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as IncidentStatus)}
            className="border-border bg-card text-card-foreground w-full cursor-pointer rounded-xl border px-3 py-2.5 text-xs font-bold transition-all outline-none focus:border-danger/30"
          >
            {INCIDENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label
          htmlFor="inc-description"
          className="text-muted-foreground text-xs font-black tracking-widest uppercase"
        >
          Description
        </label>
        <textarea
          id="inc-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="e.g. Injured during handling, fever, etc..."
          className="border-border bg-card text-card-foreground placeholder:text-muted-foreground/50 w-full resize-none rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all outline-none focus:border-danger/30"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={!fowlId}
          className="flex-1 cursor-pointer rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 min-h-11 py-2.5 text-xs font-black transition-all disabled:cursor-not-allowed disabled:opacity-50"
        >
          Record Incident
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="bg-muted text-muted-foreground hover:bg-muted/80 min-h-11 cursor-pointer rounded-xl px-5 py-2.5 text-xs font-black transition-all"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BIRD IDENTITY CARD
// ─────────────────────────────────────────────────────────────────────────────

function BirdIdentityCard({
  fowl,
  fowls,
  codes,
  matchHistory,
  setSelectedFowlForDetails,
}: {
  fowl: FowlRecord;
  fowls: FowlRecord[];
  codes: Map<string, string>;
  matchHistory: MatchRecord[];
  setSelectedFowlForDetails: (f: FowlRecord) => void;
}) {
  const t = useT();
  const code = codeOf(fowl, codes);
  const displayCode = formatBirdCodeForDisplay(code);
  const codeType = classifyBirdCode(code);
  const isFighter = canFight(fowl);
  const parents = parentCodeLabels(fowl, fowls, codes);
  const sireBreed = parentBreedOf(fowl.sire, fowls);
  const damBreed = parentBreedOf(fowl.dam, fowls);

  const matchStatsMap = useMemo(
    () => buildChickenMatchStatsMap(matchHistory, fowls),
    [matchHistory, fowls],
  );
  const record = getChickenMatchStats(matchStatsMap, fowl);
  const wins = canFight(fowl) ? record.wins : 0;
  const losses = canFight(fowl) ? record.losses : 0;
  const total = canFight(fowl) ? record.total : 0;
  const draws = canFight(fowl) ? record.draws : 0;
  const winRate = canFight(fowl) ? record.winRate : null;

  const codeColorMap = {
    sire: {
      bg: 'bg-cock-bg dark:bg-cock-bg',
      text: 'text-cock dark:text-cock',
      border: 'border-cock/30 dark:border-cock/30',
      label: 'SIRE',
    },
    dam: {
      bg: 'bg-hen-bg dark:bg-hen-bg',
      text: 'text-hen dark:text-hen',
      border: 'border-hen/30 dark:border-hen/30',
      label: 'DAM',
    },
    offspring: {
      bg: 'bg-win-bg dark:bg-win-bg',
      text: 'text-success dark:text-success',
      border: 'border-success/30 dark:border-success/30',
      label: 'OFFSPRING',
    },
    custom: {
      bg: 'bg-accent-soft dark:bg-accent-soft',
      text: 'text-primary dark:text-primary',
      border: 'border-accent/30 dark:border-accent/30',
      label: 'CUSTOM',
    },
  };
  const codeColor = codeColorMap[codeType];
  const sireLabel = parents.sire || '—';
  const damLabel = parents.dam || '—';
  const tileAria =
    codeType === 'sire'
      ? t('hub.tileSireAria', { code: displayCode || '—' })
      : codeType === 'dam'
        ? t('hub.tileDamAria', { code: displayCode || '—' })
        : codeType === 'offspring'
          ? t('hub.tileOffspringAria', {
              code: displayCode || '—',
              sire: sireLabel,
              dam: damLabel,
            })
          : t('hub.tileCustomAria', { code: displayCode || '—' });
  const roleCaption =
    codeType === 'sire'
      ? t('hub.roleCaptionSire')
      : codeType === 'dam'
        ? t('hub.roleCaptionDam')
        : codeType === 'offspring'
          ? t('hub.roleCaptionOffspring', { sire: sireLabel, dam: damLabel })
          : t('hub.roleCaptionCustom');
  const initials =
    fowl.name
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?';

  return (
    <button
      type="button"
      onClick={() => setSelectedFowlForDetails(fowl)}
      data-testid="identity-card"
      data-fowl-name={fowl.name}
      data-code-kind={codeType}
      data-fighter={isFighter ? 'true' : 'false'}
      className="hub-identity-card group bg-card border-border w-full cursor-pointer rounded-2xl border p-4 text-left shadow-sm transition-all hover:border-success/30 hover:shadow-md dark:hover:border-success/30"
    >
      <div className="flex min-w-0 items-start gap-3">
        <div data-testid="identity-avatar" className="shrink-0">
          <ChickenPhoto
            name={fowl.name}
            code={code}
            imageUrl={fowl.image_url}
            photoPath={fowl.photo_path}
            photoThumbPath={fowl.photo_thumb_path}
            size={44}
            shape={isFemale(fowl.gender) ? 'round' : 'square'}
            interactive={false}
            showLightbox={false}
            className="border-border border"
            fallback={
              <span className="bg-muted text-muted-foreground flex h-full w-full items-center justify-center text-xs font-black">
                {initials}
              </span>
            }
          />
        </div>
        <span
          role="img"
          aria-label={tileAria}
          title={tileAria}
          data-testid="identity-code-tile"
          className={`hub-identity-tile rounded-xl border ${codeColor.bg} ${codeColor.border} ${codeColor.text}`}
        >
          <span
            data-testid="identity-tile-label"
            className="hub-identity-tile-label font-black tracking-widest uppercase"
          >
            {codeColor.label}
          </span>
          <span data-testid="identity-tile-code" className="hub-identity-tile-code font-black">
            {displayCode || '—'}
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="hub-identity-fit text-card-foreground text-xs font-black group-hover:text-success dark:group-hover:text-success">
            {fowl.name}
          </p>
          <p className="hub-identity-fit text-muted-foreground text-xs font-semibold">
            {fowl.breed ? `${fowl.breed} / ` : ''}
            {sexLabel(fowl)}
          </p>
          <p
            data-testid="identity-role-caption"
            className="hub-identity-role-caption text-muted-foreground mt-0.5 font-semibold"
          >
            {roleCaption}
          </p>
          {isFighter && fowl.wing_band && (
            <p className="hub-identity-fit mt-0.5 text-xs font-bold text-primary dark:text-primary">
              Wing Band: {fowl.wing_band}
            </p>
          )}
          {fowl.bloodline_composition && Object.keys(fowl.bloodline_composition).length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {Object.entries(fowl.bloodline_composition)
                .slice(0, 3)
                .map(([strain, pct]) => (
                  <span
                    key={strain}
                    className="rounded border border-success/30 bg-win-bg px-1.5 py-0.5 text-xs font-black text-success dark:border-success/30 dark:bg-win-bg dark:text-success"
                  >
                    {strain} {Math.round(pct as number)}%
                  </span>
                ))}
            </div>
          )}
        </div>
        <div className="shrink-0 text-right">
          {isFighter &&
            (total > 0 ? (
              <span
                data-testid="identity-fight-summary"
                className={`rounded-full border px-2 py-0.5 text-xs font-black ${(winRate ?? 0) >= 50 ? 'border-success/30 bg-win-bg text-success dark:border-success/30 dark:bg-win-bg dark:text-success' : 'border-danger/30 bg-loss-bg text-danger dark:border-danger/30 dark:bg-loss-bg dark:text-danger'}`}
              >
                {winRate === null ? '—%' : `${winRate}%`} · {wins}W-{losses}L
                {draws > 0 ? `-${draws}D` : ''}
              </span>
            ) : (
              <span
                data-testid="identity-fight-summary"
                className="text-muted-foreground/50 text-xs font-bold"
              >
                No fights
              </span>
            ))}
          <p
            data-testid="identity-status"
            className={`mt-1 text-xs font-bold ${fowl.status === 'Active' ? 'text-success dark:text-success' : fowl.status === 'Deceased' ? 'text-danger dark:text-danger' : 'text-muted-foreground'}`}
          >
            {fowl.status}
          </p>
        </div>
      </div>
      {(fowl.sire || fowl.dam) && (
        <div className="border-border text-muted-foreground mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t pt-2 text-xs font-semibold">
          {fowl.sire && (
            <span className="hub-identity-fit">
              Sire: <strong className="text-card-foreground">{fowl.sire}</strong>
              {sireBreed ? ` · ${sireBreed}` : ''}
            </span>
          )}
          {fowl.dam && (
            <span className="hub-identity-fit">
              Dam: <strong className="text-card-foreground">{fowl.dam}</strong>
              {damBreed ? ` · ${damBreed}` : ''}
            </span>
          )}
        </div>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

type BreedingTab = 'coding' | 'pairs' | 'identity' | 'safety';

export default function BreedingHub({
  fowls,
  matchHistory,
  pairingAnalytics,
  setSelectedFowlForDetails,
}: BreedingHubProps) {
  const t = useT();
  const [activeTab, setActiveTab] = useUrlTab<BreedingTab>({
    param: 'tab',
    values: BREEDING_TABS,
    defaultValue: 'coding',
    history: 'push',
  });
  const [breedingPairs, setBreedingPairs] = useState<BreedingPairRecord[]>([]);
  const [incidents, setIncidents] = useState<SafetyIncidentRecord[]>([]);
  const [showAddPairing, setShowAddPairing] = useState(false);
  const [showAddIncident, setShowAddIncident] = useState(false);
  const [identitySearch, setIdentitySearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [_saving, setSaving] = useState(false);

  const codes = useMemo(() => resolveBirdCodes(fowls), [fowls]);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    const [pairsResult, incidentsResult] = await Promise.all([
      fetchBreedingPairings(),
      fetchSafetyIncidents(),
    ]);
    setBreedingPairs(pairsResult.data);
    setIncidents(sortIncidents(incidentsResult.data));
    setLoadError(pairsResult.error || incidentsResult.error || '');
    setLoading(false);
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const activePairs = useMemo(
    () => breedingPairs.filter((p) => p.outcome === 'Active').length,
    [breedingPairs],
  );

  const criticalIncidents = useMemo(() => countUrgentIncidents(incidents), [incidents]);

  const filteredFowls = useMemo(() => {
    if (!identitySearch.trim()) return fowls;
    const q = identitySearch.toLowerCase();
    return fowls.filter((f) => {
      const code = codeOf(f, codes).toLowerCase();
      return (
        f.name.toLowerCase().includes(q) ||
        code.includes(q) ||
        (f.breed || '').toLowerCase().includes(q) ||
        (f.wing_band || '').toLowerCase().includes(q)
      );
    });
  }, [fowls, codes, identitySearch]);

  const allIdentityGroups = useMemo(() => buildIdentityGroups(fowls, codes), [fowls, codes]);
  const identityGroups = useMemo(() => {
    if (!identitySearch.trim()) return allIdentityGroups;
    const allowed = new Set(filteredFowls.map((f) => f.id));
    return allIdentityGroups
      .map((group) => ({ ...group, fowls: group.fowls.filter((f) => allowed.has(f.id)) }))
      .filter((group) => group.fowls.length > 0);
  }, [allIdentityGroups, filteredFowls, identitySearch]);

  const addPair = useCallback(
    async (payload: Partial<BreedingPairRecord>) => {
      const conflict = pairingConflict(
        breedingPairs,
        fowls.find((f) => f.id === payload.sire_id),
        fowls.find((f) => f.id === payload.dam_id),
      );

      if (conflict?.kind === 'occupied') {
        showToastMessage(
          `${conflict.bird === 'sire' ? 'Sire' : 'Dam'} already has an Active partner (${conflict.partnerName}). End that pairing first.`,
          'error',
        );
        return;
      }

      // Same couple already on file: update that row instead of inserting a duplicate.
      if (conflict?.kind === 'couple') {
        const nextOutcome = (payload.outcome as PairingOutcome) || 'Active';
        if (conflict.pairing.outcome === nextOutcome) {
          setShowAddPairing(false);
          showToastMessage(
            `This pairing is already recorded as ${nextOutcome} (${conflict.pairing.pairing_code || `#${conflict.pairing.id}`}).`,
            'error',
          );
          return;
        }
        setSaving(true);
        const { record, error } = await updateBreedingPairingOutcome(
          conflict.pairing.id,
          nextOutcome,
        );
        setSaving(false);
        if (error || !record) {
          showToastMessage(`Failed to update pairing: ${error || 'no record returned'}`, 'error');
          return;
        }
        setBreedingPairs((prev) => prev.map((p) => (p.id === record.id ? record : p)));
        setShowAddPairing(false);
        showToastMessage(
          `Pairing ${record.sire_name} × ${record.dam_name} set to ${nextOutcome}.`,
          'success',
        );
        return;
      }

      setSaving(true);
      const { record, error } = await insertBreedingPairing(payload);
      setSaving(false);
      if (error || !record) {
        showToastMessage(`Failed to save pairing: ${error || 'no record returned'}`, 'error');
        return;
      }
      setBreedingPairs((prev) => [record, ...prev]);
      setShowAddPairing(false);
      showToastMessage(`${record.sire_name} × ${record.dam_name} pairing recorded.`, 'success');
    },
    [breedingPairs, fowls],
  );

  const changePairOutcome = useCallback(
    async (id: number, outcome: PairingOutcome) => {
      const previous = breedingPairs;
      setBreedingPairs((prev) => prev.map((p) => (p.id === id ? { ...p, outcome } : p)));
      const { record, error } = await updateBreedingPairingOutcome(id, outcome);
      if (error || !record) {
        setBreedingPairs(previous);
        showToastMessage(
          `Failed to update pairing status: ${error || 'no record returned'}`,
          'error',
        );
        return;
      }
      showToastMessage(`Pairing status set to ${outcome}.`, 'success');
    },
    [breedingPairs],
  );

  const addIncident = useCallback(async (payload: Partial<SafetyIncidentRecord>) => {
    setSaving(true);
    const { record, error } = await insertSafetyIncident(payload);
    setSaving(false);
    if (error || !record) {
      showToastMessage(`Failed to save incident: ${error || 'no record returned'}`, 'error');
      return;
    }
    setIncidents((prev) => sortIncidents([record, ...prev]));
    setShowAddIncident(false);
    showToastMessage(`Safety incident recorded for ${record.fowl_name}.`, 'success');
  }, []);

  const removePair = useCallback(
    async (id: number) => {
      const previous = breedingPairs;
      setBreedingPairs((prev) => prev.filter((p) => p.id !== id));
      const { error } = await deleteBreedingPairing(id);
      if (error) {
        setBreedingPairs(previous);
        showToastMessage(`Failed to delete pairing: ${error}`, 'error');
        return;
      }
      showToastMessage('Pairing removed from history.', 'success');
    },
    [breedingPairs],
  );

  const removeIncident = useCallback(
    async (id: number) => {
      const previous = incidents;
      setIncidents((prev) => prev.filter((i) => i.id !== id));
      const { error } = await deleteSafetyIncident(id);
      if (error) {
        setIncidents(previous);
        showToastMessage(`Failed to delete incident: ${error}`, 'error');
        return;
      }
      showToastMessage('Safety incident deleted.', 'success');
    },
    [incidents],
  );

  /** Save an auto-detected sire × dam combination into the pairing history. */
  const _recordDetectedPairing = useCallback(
    async (ps: PairingStats) => {
      const sireFowl = fowls.find((f) => f.name === ps.sire);
      const damFowl = fowls.find((f) => f.name === ps.dam);
      setSaving(true);
      const { record, error } = await insertBreedingPairing({
        sire_id: sireFowl?.id ?? null,
        dam_id: damFowl?.id ?? null,
        sire_name: ps.sire,
        dam_name: ps.dam,
        sire_code: sireFowl ? codeOf(sireFowl, codes) || null : null,
        dam_code: damFowl ? codeOf(damFowl, codes) || null : null,
        pairing_code: pairingCodeFor(
          sireFowl ? codeOf(sireFowl, codes) : '',
          damFowl ? codeOf(damFowl, codes) : '',
        ),
        pairing_date: null,
        notes: `Auto-detected from ${ps.members.length} registered offspring.`,
        outcome: 'Active',
      });
      setSaving(false);
      if (error || !record) {
        showToastMessage(`Failed to save pairing: ${error || 'no record returned'}`, 'error');
        return;
      }
      setBreedingPairs((prev) => [record, ...prev]);
      showToastMessage(`${ps.sire} × ${ps.dam} added to pairing history.`, 'success');
    },
    [fowls, codes],
  );

  const codedSires = useMemo(
    () =>
      fowls
        .filter(isSireGender)
        .filter((f) => classifyBirdCode(codeOf(f, codes)) === 'sire'),
    [fowls, codes],
  );
  const codedDams = useMemo(
    () =>
      fowls
        .filter((f) => isFemale(f.gender))
        .filter((f) => classifyBirdCode(codeOf(f, codes)) === 'dam'),
    [fowls, codes],
  );
  const codedOffspring = useMemo(
    () => fowls.filter((f) => classifyBirdCode(codeOf(f, codes)) === 'offspring'),
    [fowls, codes],
  );
  const [bannerImageOk, setBannerImageOk] = useState(true);
  const tabButtonRefs = useRef<Map<BreedingTab, HTMLButtonElement>>(new Map());

  const summarizeCodes = (items: FowlRecord[]) => {
    const values = items
      .map((f) => formatBirdCodeForDisplay(codeOf(f, codes)))
      .filter(Boolean);
    if (values.length === 0) return '-';
    const first = values.slice(0, 3).join(', ');
    return values.length > 3 ? `${first}, +${values.length - 3}` : first;
  };

  const TABS = [
    { id: 'coding' as BreedingTab, label: 'Coding System', icon: Hash },
    { id: 'pairs' as BreedingTab, label: 'Breeding Pairs', icon: Heart },
    { id: 'identity' as BreedingTab, label: 'Chicken Identity', icon: Eye },
    { id: 'safety' as BreedingTab, label: 'Safety Incidents', icon: Shield },
  ];

  const handleTabKeyDown = (event: React.KeyboardEvent, index: number) => {
    let nextIndex = index;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % TABS.length;
    else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + TABS.length) % TABS.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = TABS.length - 1;
    else return;
    event.preventDefault();
    const next = TABS[nextIndex];
    setActiveTab(next.id);
    tabButtonRefs.current.get(next.id)?.focus();
  };

  const kpis = [
    {
      key: 'males',
      label: t('hub.kpiBreedingMales'),
      value: codedSires.length,
      caption: t('hub.kpiCocksCaption', { codes: summarizeCodes(codedSires) }),
      icon: Mars,
      tone: 'bg-cock-bg text-cock',
    },
    {
      key: 'females',
      label: t('hub.kpiBreedingFemales'),
      value: codedDams.length,
      caption: t('hub.kpiHensCaption', { codes: summarizeCodes(codedDams) }),
      icon: Venus,
      tone: 'bg-hen-bg text-hen',
    },
    {
      key: 'offspring',
      label: t('hub.kpiOffspring'),
      value: codedOffspring.length,
      caption: t('hub.kpiChicksCaption', { codes: summarizeCodes(codedOffspring) }),
      icon: Egg,
      tone: 'bg-low-sample-bg text-warning',
    },
    {
      key: 'pairs',
      label: t('hub.kpiActivePairs'),
      value: activePairs,
      caption: t('hub.kpiPairsCaption'),
      icon: Users,
      tone: 'bg-win-bg text-success',
    },
  ];

  return (
    <div className="min-w-0 space-y-5">
      <section className="border-primary/15 from-accent-soft via-background to-brand-orange/10 relative overflow-hidden rounded-3xl border bg-gradient-to-r p-5 shadow-sm sm:p-7">
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 hidden w-2/3 md:block">
          {bannerImageOk && (
            <>
              <Image
                src="/images/hero-farm.jpg"
                alt=""
                fill
                priority={false}
                loading="lazy"
                sizes="(max-width: 1023px) 0vw, 55vw"
                className="object-cover object-center opacity-35"
                onError={() => setBannerImageOk(false)}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/20" />
            </>
          )}
        </div>
        <div className="relative z-10 flex min-w-0 items-center gap-4">
          <div className="bg-sidebar text-sidebar-foreground flex h-16 w-16 shrink-0 items-center justify-center rounded-full shadow-lg shadow-primary/20">
            <Dna className="h-8 w-8" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="text-card-foreground text-2xl leading-tight font-black tracking-tight break-words sm:text-3xl">
              {t('hub.bannerTitle')}
            </h1>
            <p className="text-muted-foreground mt-1 max-w-xl text-sm font-semibold break-words">
              {t('hub.bannerSubtitle')}
            </p>
          </div>
        </div>
      </section>

      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <article
              key={kpi.key}
              className="bg-card border-border flex min-w-0 items-start gap-3 rounded-2xl border p-4 shadow-sm [overflow-wrap:anywhere]"
            >
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${kpi.tone}`}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-card-foreground text-3xl leading-none font-black">{kpi.value}</p>
                <p className="text-muted-foreground mt-1 text-xs font-black tracking-wide uppercase break-words">
                  {kpi.label}
                </p>
                <p className="text-muted-foreground mt-0.5 text-xs font-semibold break-words">
                  {kpi.caption}
                </p>
              </div>
            </article>
          );
        })}
      </div>

      <div
        role="tablist"
        aria-label="Breeding Hub Navigation"
        className="bg-muted/50 border-border flex min-w-0 flex-wrap items-center gap-1.5 rounded-full border p-1.5"
      >
        {TABS.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                if (el) tabButtonRefs.current.set(tab.id, el);
                else tabButtonRefs.current.delete(tab.id);
              }}
              type="button"
              role="tab"
              id={`breeding-tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`breeding-panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
              className={`focus-visible:ring-ring flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold transition-colors motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none sm:px-4 ${
                isActive
                  ? 'bg-sidebar text-sidebar-foreground border-sidebar shadow-sm'
                  : 'bg-card text-foreground border-border hover:bg-accent-soft'
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="min-w-0 break-words">{tab.label}</span>
              {tab.id === 'safety' && criticalIncidents > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-xs font-black ${
                    isActive ? 'bg-primary-foreground/20' : 'bg-danger/10 text-danger'
                  }`}
                >
                  {criticalIncidents}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Load status */}
      {loading && (
        <div className="bg-card border-border flex items-center justify-center gap-3 rounded-3xl border p-8 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin text-success" />
          <p className="text-muted-foreground text-xs font-bold">
            Loading pairing history and safety records...
          </p>
        </div>
      )}

      {!loading && loadError && (
        <div className="flex flex-col gap-3 rounded-2xl border border-warning/30 bg-low-sample-bg p-4 sm:flex-row sm:items-start dark:border-warning/30 dark:bg-low-sample-bg">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning dark:text-warning" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black tracking-widest text-warning uppercase dark:text-warning">
              Unable to Load Breeding Records
            </p>
            <p className="text-muted-foreground mt-0.5 text-xs font-semibold break-words">
              {loadError}
            </p>
            <p className="text-muted-foreground mt-1 text-xs font-semibold">
              Run the migration first in the Supabase SQL editor{' '}
              <span className="text-card-foreground font-mono">
                20261004000000_breeding_pairings_safety_incidents.sql
              </span>
              .
            </p>
          </div>
          <button
            type="button"
            onClick={loadRecords}
            className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs font-black text-warning hover:underline dark:text-warning"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </button>
        </div>
      )}

      {/* ── CODING SYSTEM TAB ─────────────────────────────────────────────── */}
      {!loading && activeTab === 'coding' && (
        <section
          id="breeding-panel-coding"
          role="tabpanel"
          aria-labelledby="breeding-tab-coding"
          className="min-w-0 space-y-4"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="bg-sidebar text-sidebar-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
              <Hash className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 className="text-card-foreground text-base font-black break-words">
                {t('hub.codingSectionTitle')}
              </h2>
              <p className="text-muted-foreground text-xs font-bold break-words">
                {t('hub.codingSectionSubtitle')}
              </p>
            </div>
          </div>
          <CodingSystemExplainer fowls={fowls} codes={codes} />

          {pairingAnalytics.ranked.length > 0 && (
            <div className="bg-card border-border overflow-hidden rounded-3xl border shadow-sm">
              <div className="border-border flex items-center gap-3 border-b px-6 pt-6 pb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-warning/30 bg-low-sample-bg dark:border-warning/30 dark:bg-low-sample-bg">
                  <BarChart3 className="h-5 w-5 text-warning dark:text-warning" />
                </div>
                <div>
                  <h3 className="text-card-foreground text-sm font-black">
                    Pairing Performance Analysis
                  </h3>
                  <p className="text-muted-foreground text-xs font-semibold">
                    Best and worst combinations based on offspring win rate
                  </p>
                </div>
              </div>
              <div className="space-y-3 p-6">
                {pairingAnalytics.ranked.slice(0, 8).map((ps, i) => {
                  const isElite = ps.decided >= 3 && ps.winRate >= 70;
                  const isWeak = ps.decided >= 3 && ps.winRate < 50;
                  return (
                    <div
                      key={ps.key}
                      className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
                        isElite
                          ? 'border-success/30 bg-win-bg dark:border-success/30 dark:bg-win-bg'
                          : isWeak
                            ? 'border-danger/30 bg-loss-bg dark:border-danger/30 dark:bg-loss-bg'
                            : 'bg-muted/30 border-border'
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="text-muted-foreground/40 w-4 shrink-0 text-xs font-black">
                          #{i + 1}
                        </span>
                        {isElite && <Trophy className="h-3.5 w-3.5 shrink-0 text-warning" />}
                        {isWeak && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-danger" />}
                        <div className="min-w-0">
                          <p className="text-card-foreground text-xs font-black">
                            <span className="text-cock dark:text-cock">{ps.sire}</span>
                            <span className="text-muted-foreground mx-1.5">×</span>
                            <span className="text-hen dark:text-hen">{ps.dam}</span>
                          </p>
                          <p className="text-muted-foreground text-xs font-semibold">
                            {ps.members.length} offspring · {ps.totalFights} fights
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {ps.decided > 0 && (
                          <span
                            className={`rounded-full border px-2 py-0.5 text-xs font-black ${(ps.winRate ?? 0) >= 50 ? 'border-success/30 bg-win-bg text-success dark:border-success/30 dark:bg-win-bg dark:text-success' : 'border-danger/30 bg-loss-bg text-danger dark:border-danger/30 dark:bg-loss-bg dark:text-danger'}`}
                          >
                            {ps.winRate}%
                          </span>
                        )}
                        <span className="text-muted-foreground text-xs font-bold">
                          {ps.wins}W-{ps.losses}L
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── BREEDING PAIRS TAB ────────────────────────────────────────────── */}
      {activeTab === 'pairs' && (
        <section
          id="breeding-panel-pairs"
          role="tabpanel"
          aria-labelledby="breeding-tab-pairs"
          className="min-w-0 space-y-4"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 text-primary border-primary/20 flex h-9 w-9 items-center justify-center rounded-xl border">
                <Heart className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-card-foreground text-base font-black">Breeding Pairs</h2>
                <p className="text-muted-foreground text-xs font-bold">
                  Record and monitor every pairing and the performance of their offspring
                </p>
              </div>
            </div>
            <button
              id="add-breeding-pair-btn"
              type="button"
              onClick={() => setShowAddPairing(true)}
              className="flex shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 min-h-11 px-4 py-2.5 text-xs font-black shadow-sm transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              New Pairing
            </button>
          </div>

          {showAddPairing && (
            <AddPairingForm
              fowls={fowls}
              codes={codes}
              pairs={breedingPairs}
              onAdd={addPair}
              onCancel={() => setShowAddPairing(false)}
            />
          )}

          {breedingPairs.length === 0 && !showAddPairing ? (
            <div className="bg-card border-border space-y-3 rounded-3xl border p-10 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-danger/30 bg-loss-bg dark:border-danger/30 dark:bg-loss-bg">
                <Heart className="h-7 w-7 text-danger" />
              </div>
              <div>
                <p className="text-card-foreground text-sm font-black">No Breeding Pairs Yet</p>
                <p className="text-muted-foreground mx-auto mt-1 max-w-xs text-xs font-semibold">
                  Record breeding pairs to monitor pairing history and offspring performance.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddPairing(true)}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 min-h-11 px-5 py-2.5 text-xs font-black transition-all"
              >
                <Plus className="h-3.5 w-3.5" />
                Record a Pairing
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {breedingPairs.map((pair) => (
                <BreedingPairCard
                  key={pair.id}
                  pair={pair}
                  fowls={fowls}
                  codes={codes}
                  matchHistory={matchHistory}
                  onRemove={() => removePair(pair.id)}
                  onOutcomeChange={(outcome) => changePairOutcome(pair.id, outcome)}
                  setSelectedFowlForDetails={setSelectedFowlForDetails}
                />
              ))}
            </div>
          )}

          {pairingAnalytics.ranked.length > 0 && (
            <div className="rounded-3xl border border-cock/30 bg-gradient-to-r from-cock-bg to-accent-soft p-5 sm:p-6 dark:border-cock/30 dark:from-cock-bg dark:to-accent-soft">
              <div className="mb-4 flex items-center gap-3">
                <div className="bg-cock text-background flex h-9 w-9 items-center justify-center rounded-xl">
                  <Info className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-card-foreground text-sm font-black">
                    Auto-Detected Pairings
                  </h3>
                  <p className="text-muted-foreground text-xs font-semibold">
                    Based on sire/dam records of chickens in the registry
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {pairingAnalytics.ranked.slice(0, 5).map((ps) => (
                  <div
                    key={ps.key}
                    className="bg-card/60 border-border flex items-center justify-between gap-3 rounded-xl border px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-card-foreground text-xs font-black">
                        <span className="text-cock dark:text-cock">{ps.sire}</span>
                        <span className="text-muted-foreground mx-1.5">×</span>
                        <span className="text-hen dark:text-hen">{ps.dam}</span>
                      </p>
                      <p className="text-muted-foreground text-xs font-semibold">
                        {ps.members.length} offspring · {ps.totalFights} recorded fights
                      </p>
                    </div>
                    {ps.decided > 0 && (
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-black ${(ps.winRate ?? 0) >= 50 ? 'border-success/30 bg-win-bg text-success dark:border-success/30 dark:bg-win-bg dark:text-success' : 'border-danger/30 bg-loss-bg text-danger dark:border-danger/30 dark:bg-loss-bg dark:text-danger'}`}
                      >
                        {ps.winRate}% win rate
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── BIRD IDENTITY TAB ─────────────────────────────────────────────── */}
      {activeTab === 'identity' && (
        <section
          id="breeding-panel-identity"
          role="tabpanel"
          aria-labelledby="breeding-tab-identity"
          className="min-w-0 space-y-4"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex flex-1 items-center gap-3">
              <div className="bg-win-bg text-success border-success/30 flex h-9 w-9 items-center justify-center rounded-xl border">
                <Eye className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-card-foreground text-base font-black">
                  Unique Chicken Identity
                </h2>
                <p className="text-muted-foreground text-xs font-bold">
                  Each chicken has a unique code based on its sire, dam, and sibling order
                </p>
              </div>
            </div>
            <div className="relative w-full shrink-0 sm:w-72">
              <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </span>
              <input
                id="identity-search-input"
                type="text"
                placeholder="Search chicken..."
                value={identitySearch}
                onChange={(e) => setIdentitySearch(e.target.value)}
                className="border-border bg-card text-card-foreground placeholder:text-muted-foreground w-full rounded-2xl border py-3 pr-3.5 pl-10 text-xs font-semibold transition-all outline-none focus:border-success/30 focus:ring-4 focus:ring-success/40 dark:focus:ring-success/40"
              />
            </div>
          </div>

          <div
            data-testid="identity-legend"
            className="hub-identity-legend bg-card border-border rounded-2xl border p-4 shadow-sm"
          >
            {[
              {
                type: 'SIRE',
                code: '1',
                desc: t('hub.legendSireDesc'),
                bg: 'bg-cock-bg dark:bg-cock-bg',
                text: 'text-cock dark:text-cock',
                border: 'border-cock/30 dark:border-cock/30',
              },
              {
                type: 'DAM',
                code: 'A',
                desc: t('hub.legendDamDesc'),
                bg: 'bg-hen-bg dark:bg-hen-bg',
                text: 'text-hen dark:text-hen',
                border: 'border-hen/30 dark:border-hen/30',
              },
              {
                type: 'OFFSPRING',
                code: '1A₁',
                desc: t('hub.legendOffspringDesc'),
                bg: 'bg-win-bg dark:bg-win-bg',
                text: 'text-success dark:text-success',
                border: 'border-success/30 dark:border-success/30',
              },
              {
                type: 'CUSTOM',
                code: '···',
                desc: t('hub.legendCustomDesc'),
                bg: 'bg-accent-soft dark:bg-accent-soft',
                text: 'text-primary dark:text-primary',
                border: 'border-accent/30 dark:border-accent/30',
              },
            ].map((l) => (
              <div
                key={l.type}
                data-testid="identity-legend-item"
                className="hub-identity-legend-item"
              >
                <div
                  className={`hub-identity-legend-code rounded-lg border ${l.bg} ${l.border}`}
                >
                  <span className={`text-xs font-black ${l.text} font-mono`}>{l.code}</span>
                </div>
                <div className="min-w-0">
                  <p
                    className={`hub-identity-fit text-xs font-black ${l.text} tracking-widest uppercase`}
                  >
                    {l.type}
                  </p>
                  <p className="hub-identity-fit text-muted-foreground text-xs font-semibold">
                    {l.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {filteredFowls.length === 0 ? (
            <div className="bg-card border-border rounded-3xl border p-8 text-center shadow-sm">
              <p className="text-card-foreground text-sm font-black">No Chicken Found</p>
              <p className="text-muted-foreground mt-1 text-xs">Try a different name or code</p>
            </div>
          ) : (
            <div className="space-y-5">
              {identityGroups.map((group) => (
                <div
                  key={group.key}
                  data-testid="identity-group"
                  data-group-kind={group.kind}
                  className="space-y-2"
                >
                  {group.kind === 'offspring' && (
                    <h3
                      data-testid="identity-pair-heading"
                      className="hub-identity-fit bg-muted/40 text-card-foreground rounded-lg px-3 py-1.5 text-xs font-black tracking-wide"
                    >
                      {t('hub.pairHeading', {
                        sire: group.sireLabel || '—',
                        dam: group.damLabel || '—',
                      })}
                    </h3>
                  )}
                  {group.kind === 'custom' && (
                    <h3
                      data-testid="identity-custom-heading"
                      className="hub-identity-fit bg-muted/40 text-card-foreground rounded-lg px-3 py-1.5 text-xs font-black tracking-wide"
                    >
                      {t('hub.customGroupHeading')}
                    </h3>
                  )}
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {group.fowls.map((f) => (
                      <BirdIdentityCard
                        key={f.id}
                        fowl={f}
                        fowls={fowls}
                        codes={codes}
                        matchHistory={matchHistory}
                        setSelectedFowlForDetails={setSelectedFowlForDetails}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── SAFETY INCIDENTS TAB ──────────────────────────────────────────── */}
      {activeTab === 'safety' && (
        <section
          id="breeding-panel-safety"
          role="tabpanel"
          aria-labelledby="breeding-tab-safety"
          className="min-w-0 space-y-4"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-warning/10 text-warning border-warning/30 flex h-9 w-9 items-center justify-center rounded-xl border">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-card-foreground text-base font-black">Safety Incidents</h2>
                <p className="text-muted-foreground text-xs font-bold">
                  Record accidents, injuries, or illnesses for each chicken
                </p>
              </div>
            </div>
            <button
              id="add-safety-incident-btn"
              type="button"
              onClick={() => setShowAddIncident(true)}
              className="flex shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 min-h-11 px-4 py-2.5 text-xs font-black shadow-sm transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              Record Incident
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {(Object.keys(SEVERITY_CONFIG) as (keyof typeof SEVERITY_CONFIG)[]).map((sev) => {
              const cfg = SEVERITY_CONFIG[sev];
              const count = incidents.filter((i) => i.severity === sev).length;
              return (
                <div
                  key={sev}
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 ${cfg.bg} ${cfg.border}`}
                >
                  <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                  <span className={`text-xs font-black ${cfg.text} tracking-widest uppercase`}>
                    {sev}
                  </span>
                  {count > 0 && <span className={`text-xs font-black ${cfg.text}`}>({count})</span>}
                </div>
              );
            })}
          </div>

          {showAddIncident && (
            <AddIncidentForm
              fowls={fowls}
              codes={codes}
              onAdd={addIncident}
              onCancel={() => setShowAddIncident(false)}
            />
          )}

          {incidents.length === 0 && !showAddIncident ? (
            <div className="bg-card border-border space-y-3 rounded-3xl border p-10 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-success/30 bg-win-bg dark:border-success/30 dark:bg-win-bg">
                <CheckCircle2 className="h-7 w-7 text-success" />
              </div>
              <div>
                <p className="text-card-foreground text-sm font-black">No Incidents Recorded</p>
                <p className="text-muted-foreground mx-auto mt-1 max-w-xs text-xs font-semibold">
                  All chickens are safe. Record safety incidents to monitor the health of your
                  flock.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddIncident(true)}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 min-h-11 px-5 py-2.5 text-xs font-black transition-all"
              >
                <Plus className="h-3.5 w-3.5" />
                Record Incident
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {incidents.map((incident) => (
                <SafetyIncidentCard
                  key={incident.id}
                  incident={incident}
                  onRemove={() => removeIncident(incident.id)}
                />
              ))}
            </div>
          )}

          <div className="flex items-start gap-3 rounded-2xl border border-warning/30 bg-gradient-to-r from-low-sample-bg to-low-sample-bg p-4 dark:border-warning/30 dark:from-low-sample-bg dark:to-low-sample-bg">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning dark:text-warning" />
            <div>
              <p className="text-xs font-black tracking-widest text-warning uppercase dark:text-warning">
                Safety Monitoring Tip
              </p>
              <p className="text-muted-foreground mt-0.5 text-xs font-semibold">
                Monitor the health of each chicken regularly, especially after a fight. Critical
                incidents require immediate attention. Link each incident to a chicken code so its
                health history can be traced within the family lineage.
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
