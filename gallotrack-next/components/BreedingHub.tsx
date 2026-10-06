'use client';
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import type { BreedingPairRecord, FowlRecord, MatchRecord, PairingStats, SafetyIncidentRecord } from '@/lib/types';
import {
  Dna, Trophy, AlertTriangle, Heart,
  Hash, Type, Combine, ChevronDown, ChevronUp, Shield, Plus,
  X, CheckCircle2, Info, BarChart3, Eye, Loader2, RefreshCw,
} from 'lucide-react';
import { formatBirdCodeForDisplay, resolveBirdCodes } from '@/lib/bird-code';
import { genderLabel, parentBreedOf } from '@/lib/helpers';
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
import type { IncidentSeverity, IncidentStatus, IncidentType, PairingOutcome } from '@/lib/breeding';
import {
  deleteBreedingPairing,
  deleteSafetyIncident,
  fetchBreedingPairings,
  fetchSafetyIncidents,
  insertBreedingPairing,
  insertSafetyIncident,
  updateBreedingPairingOutcome,
} from '@/lib/services/breeding-service';

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

const SEVERITY_CONFIG: Record<IncidentSeverity, { bg: string; text: string; border: string; dot: string }> = {
  Minor: { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800', dot: 'bg-amber-400' },
  Moderate: { bg: 'bg-orange-50 dark:bg-orange-950/40', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800', dot: 'bg-orange-500' },
  Severe: { bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-700 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-800', dot: 'bg-rose-500' },
  Critical: { bg: 'bg-red-50 dark:bg-red-950/40', text: 'text-red-700 dark:text-red-400', border: 'border-red-200 dark:border-red-800', dot: 'bg-red-600 animate-pulse' },
};

const OUTCOME_CONFIG: Record<PairingOutcome, { bg: string; text: string; border: string }> = {
  Active: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' },
  Completed: { bg: 'bg-sky-50 dark:bg-sky-950/40', text: 'text-sky-700 dark:text-sky-400', border: 'border-sky-200 dark:border-sky-800' },
  Discontinued: { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border' },
};

/** Resolved bird code for a chicken (live scheme first, stored value as fallback). */
const codeOf = (fowl: FowlRecord, codes: Map<string, string>): string =>
  codes.get(String(fowl.id)) || fowl.bird_code || '';

// ─────────────────────────────────────────────────────────────────────────────
// CODING SYSTEM VISUALIZER
// ─────────────────────────────────────────────────────────────────────────────

function CodingSystemExplainer({ fowls, codes }: { fowls: FowlRecord[]; codes: Map<string, string> }) {
  const sires = fowls
    .filter(isSireGender)
    .filter((f) => classifyBirdCode(codeOf(f, codes)) === 'sire');
  const dams = fowls
    .filter((f) => !isSireGender(f))
    .filter((f) => classifyBirdCode(codeOf(f, codes)) === 'dam');
  const offspring = fowls.filter((f) => classifyBirdCode(codeOf(f, codes)) === 'offspring');

  return (
    <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
      <div className="px-6 pt-6 pb-4 border-b border-border">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 bg-violet-100 dark:bg-violet-950/50 border border-violet-200 dark:border-violet-800 rounded-xl flex items-center justify-center shrink-0">
            <Hash className="w-5 h-5 text-violet-700 dark:text-violet-400" />
          </div>
          <div>
            <h2 className="text-sm font-black text-card-foreground">Coding System</h2>
            <p className="text-xs text-muted-foreground font-semibold">Standardized tagging scheme for every chicken</p>
          </div>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Sire */}
        <div className="bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-sky-600 rounded-lg flex items-center justify-center">
              <Hash className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs font-black text-sky-700 dark:text-sky-400">SIRE</p>
              <p className="text-xs text-sky-600/70 dark:text-sky-500 font-semibold">Male chicken</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {['1', '2', '3', '4', '5'].map(n => (
              <span key={n} className="w-8 h-8 bg-sky-600 text-white rounded-lg flex items-center justify-center text-xs font-black shadow-sm">
                {n}
              </span>
            ))}
            <span className="text-sky-600 dark:text-sky-400 text-xs font-black">···</span>
          </div>
          <p className="text-xs text-sky-700 dark:text-sky-400 font-semibold">
            <strong>Numbers</strong> are used to identify sires
          </p>
          {sires.length > 0 && (
            <div className="pt-2 border-t border-sky-200 dark:border-sky-800">
              <p className="text-xs text-sky-600 dark:text-sky-400 font-black uppercase tracking-widest mb-1.5">On your farm:</p>
              <div className="flex flex-wrap gap-1">
                {sires.slice(0, 6).map(f => (
                  <span key={f.id} className="text-xs font-black bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800 px-1.5 py-0.5 rounded-md">
                    {formatBirdCodeForDisplay(codes.get(String(f.id)) || f.bird_code || '')} · {f.name.length > 8 ? f.name.slice(0, 8) + '…' : f.name}
                  </span>
                ))}
                {sires.length > 6 && <span className="text-xs text-sky-500 font-bold">+{sires.length - 6} more</span>}
              </div>
            </div>
          )}
        </div>

        {/* Dam */}
        <div className="bg-pink-50 dark:bg-pink-950/30 border border-pink-200 dark:border-pink-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-pink-600 rounded-lg flex items-center justify-center">
              <Type className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs font-black text-pink-700 dark:text-pink-400">DAM</p>
              <p className="text-xs text-pink-600/70 dark:text-pink-500 font-semibold">Female chicken</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {['A', 'B', 'C', 'D', 'E'].map(l => (
              <span key={l} className="w-8 h-8 bg-pink-600 text-white rounded-lg flex items-center justify-center text-xs font-black shadow-sm">
                {l}
              </span>
            ))}
            <span className="text-pink-600 dark:text-pink-400 text-xs font-black">···</span>
          </div>
          <p className="text-xs text-pink-700 dark:text-pink-400 font-semibold">
            <strong>Letters</strong> are used to identify dams
          </p>
          {dams.length > 0 && (
            <div className="pt-2 border-t border-pink-200 dark:border-pink-800">
              <p className="text-xs text-pink-600 dark:text-pink-400 font-black uppercase tracking-widest mb-1.5">On your farm:</p>
              <div className="flex flex-wrap gap-1">
                {dams.slice(0, 6).map(f => (
                  <span key={f.id} className="text-xs font-black bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-400 border border-pink-200 dark:border-pink-800 px-1.5 py-0.5 rounded-md">
                    {formatBirdCodeForDisplay(codes.get(String(f.id)) || f.bird_code || '')} · {f.name.length > 8 ? f.name.slice(0, 8) + '…' : f.name}
                  </span>
                ))}
                {dams.length > 6 && <span className="text-xs text-pink-500 font-bold">+{dams.length - 6} more</span>}
              </div>
            </div>
          )}
        </div>

        {/* Offspring */}
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <Combine className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs font-black text-emerald-700 dark:text-emerald-400">OFFSPRING</p>
              <p className="text-xs text-emerald-600/70 dark:text-emerald-500 font-semibold">Sire + Dam combined</p>
            </div>
          </div>
          <div className="space-y-1.5">
            {[
              { code: '1A₁', label: 'Sire 1 × Dam A · 1st' },
              { code: '1A₂', label: 'Sire 1 × Dam A · 2nd' },
              { code: '2B₁', label: 'Sire 2 × Dam B · 1st' },
            ].map(ex => (
              <div key={ex.code} className="flex items-center gap-2">
                <span className="font-black text-sm text-emerald-700 dark:text-emerald-400 font-mono w-10">{ex.code}</span>
                <span className="text-xs text-muted-foreground">{ex.label}</span>
              </div>
            ))}
          </div>
          {offspring.length > 0 && (
            <div className="pt-2 border-t border-emerald-200 dark:border-emerald-800">
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest mb-1.5">On your farm:</p>
              <div className="flex flex-wrap gap-1">
                {offspring.slice(0, 6).map(f => (
                  <span key={f.id} className="text-xs font-black bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.5 rounded-md">
                    {formatBirdCodeForDisplay(codes.get(String(f.id)) || f.bird_code || '')}
                  </span>
                ))}
                {offspring.length > 6 && <span className="text-xs text-emerald-500 font-bold">+{offspring.length - 6} more</span>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Example diagram */}
      <div className="mx-6 mb-6 bg-muted/40 rounded-2xl p-4 border border-border">
        <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-3">Pairing Example</p>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="bg-sky-100 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 rounded-xl px-3 py-2 text-center">
              <p className="text-xs font-black text-sky-600 dark:text-sky-400 uppercase tracking-widest">Sire</p>
              <p className="text-base font-black text-sky-700 dark:text-sky-300 font-mono">1</p>
              <p className="text-xs text-muted-foreground">Lemon 84</p>
            </div>
            <span className="text-muted-foreground font-black">×</span>
            <div className="bg-pink-100 dark:bg-pink-950/50 border border-pink-200 dark:border-pink-800 rounded-xl px-3 py-2 text-center">
              <p className="text-xs font-black text-pink-600 dark:text-pink-400 uppercase tracking-widest">Dam</p>
              <p className="text-base font-black text-pink-700 dark:text-pink-300 font-mono">A</p>
              <p className="text-xs text-muted-foreground">Ground Red</p>
            </div>
            <span className="text-muted-foreground font-black">→</span>
          </div>
          <div className="flex gap-2">
            {['1A₁', '1A₂', '1A₃'].map((code, i) => (
              <div key={code} className="bg-emerald-100 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl px-3 py-2 text-center">
                <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Offspring {i + 1}</p>
                <p className="text-base font-black text-emerald-700 dark:text-emerald-300 font-mono">{code}</p>
              </div>
            ))}
            <div className="flex items-center">
              <span className="text-muted-foreground text-xs font-bold">···</span>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground font-semibold mt-3">
          💡 You may also add a descriptive name: <strong className="text-card-foreground">Lemon Ground Red · 1A₁</strong>
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
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
  const sire = fowls.find(f => f.id === pair.sire_id);
  const dam = fowls.find(f => f.id === pair.dam_id);

  const offspring = offspringForPairing(pair, fowls);

  const offspringMatchStats = offspring.map(o => {
    const matches = matchHistory.filter(m => m.entry_name?.toLowerCase() === o.name.toLowerCase());
    const wins = matches.filter(m => m.outcome?.toLowerCase() === 'win').length;
    const losses = matches.filter(m => m.outcome?.toLowerCase() === 'loss').length;
    const decided = wins + losses;
    return { fowl: o, wins, losses, decided, winRate: decided > 0 ? Math.round((wins / decided) * 100) : 0 };
  });

  const totalWins = offspringMatchStats.reduce((a, s) => a + s.wins, 0);
  const totalLosses = offspringMatchStats.reduce((a, s) => a + s.losses, 0);
  const totalDecided = totalWins + totalLosses;
  const combinedWinRate = totalDecided > 0 ? Math.round((totalWins / totalDecided) * 100) : 0;

  const outCfg = OUTCOME_CONFIG[pair.outcome];
  const offspringBaseCode = buildOffspringBaseCode(pair.sire_code, pair.dam_code) || '—';

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-gradient-to-br from-sky-100 to-pink-100 dark:from-sky-950/50 dark:to-pink-950/50 border border-border rounded-xl flex items-center justify-center shrink-0">
              <Heart className="w-5 h-5 text-rose-500" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-black text-card-foreground">
                  <span className="text-sky-600 dark:text-sky-400 font-mono">{pair.sire_code}</span>
                  <span className="text-muted-foreground mx-1">×</span>
                  <span className="text-pink-600 dark:text-pink-400 font-mono">{pair.dam_code}</span>
                </h3>
                <span className="text-xs font-black bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-800 px-1.5 py-0.5 rounded-md font-mono">
                  → {offspringBaseCode}₁, {offspringBaseCode}₂···
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-semibold truncate">
                {pair.sire_name} × {pair.dam_name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs font-black px-2 py-1 rounded-full border ${outCfg.bg} ${outCfg.text} ${outCfg.border}`}>
              {pair.outcome}
            </span>
            <button
              type="button"
              onClick={onRemove}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
              aria-label="Remove pairing"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-muted/40 rounded-xl p-3 text-center">
            <p className="text-lg font-black text-card-foreground">{offspring.length}</p>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Offspring</p>
          </div>
          <div className="bg-muted/40 rounded-xl p-3 text-center">
            <p className={`text-lg font-black ${combinedWinRate >= 50 ? 'text-emerald-600 dark:text-emerald-400' : totalDecided > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground'}`}>
              {totalDecided > 0 ? `${combinedWinRate}%` : '—'}
            </p>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Win Rate</p>
          </div>
          <div className="bg-muted/40 rounded-xl p-3 text-center">
            <p className="text-lg font-black text-card-foreground">{totalWins}W-{totalLosses}L</p>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Record</p>
          </div>
        </div>

        {/* Parent info */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <button
            type="button"
            onClick={() => sire && setSelectedFowlForDetails(sire)}
            disabled={!sire}
            className="bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 rounded-xl p-2.5 text-left hover:bg-sky-100 dark:hover:bg-sky-950/50 transition-colors cursor-pointer disabled:cursor-default"
          >
            <p className="text-xs font-black text-sky-600 dark:text-sky-400 uppercase tracking-widest">🐓 Sire</p>
            <p className="text-xs font-black text-card-foreground truncate">{pair.sire_name}</p>
            <p className="text-xs text-muted-foreground font-semibold">{sire?.breed || '—'} · Code: <span className="font-mono text-sky-600 dark:text-sky-400">{pair.sire_code}</span></p>
          </button>
          <button
            type="button"
            onClick={() => dam && setSelectedFowlForDetails(dam)}
            disabled={!dam}
            className="bg-pink-50 dark:bg-pink-950/30 border border-pink-200 dark:border-pink-800 rounded-xl p-2.5 text-left hover:bg-pink-100 dark:hover:bg-pink-950/50 transition-colors cursor-pointer disabled:cursor-default"
          >
            <p className="text-xs font-black text-pink-600 dark:text-pink-400 uppercase tracking-widest">🐔 Dam</p>
            <p className="text-xs font-black text-card-foreground truncate">{pair.dam_name}</p>
            <p className="text-xs text-muted-foreground font-semibold">{dam?.breed || '—'} · Code: <span className="font-mono text-pink-600 dark:text-pink-400">{pair.dam_code}</span></p>
          </button>
        </div>

        {pair.notes && (
          <p className="text-xs text-muted-foreground font-semibold bg-muted/30 rounded-lg px-3 py-2 mb-3">
            📝 {pair.notes}
          </p>
        )}

        {offspring.length > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between text-xs font-black text-muted-foreground hover:text-card-foreground transition-colors py-1 cursor-pointer"
          >
            <span className="uppercase tracking-widest">Offspring ({offspring.length})</span>
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}

        {expanded && (
          <div className="mt-2 space-y-1.5">
            {offspringMatchStats.map(({ fowl, wins, losses, decided, winRate }) => {
              const code = codes.get(String(fowl.id)) || fowl.bird_code || '';
              return (
                <button
                  key={fowl.id}
                  type="button"
                  onClick={() => setSelectedFowlForDetails(fowl)}
                  className="group w-full flex items-center justify-between gap-2 bg-muted/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border border-border hover:border-emerald-300 dark:hover:border-emerald-700 rounded-xl px-3 py-2 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-black text-muted-foreground bg-card border border-border px-1.5 py-0.5 rounded-md font-mono shrink-0">
                      {formatBirdCodeForDisplay(code)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-card-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-400 truncate">{fowl.name}</p>
                      <p className="text-xs text-muted-foreground font-semibold truncate">{genderLabel(fowl.gender)} · {fowl.breed}</p>
                    </div>
                  </div>
                  {decided > 0 ? (
                    <span className={`text-xs font-black px-2 py-0.5 rounded-full border shrink-0 ${winRate >= 50 ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'}`}>
                      {winRate}% · {wins}W-{losses}L
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground/50 font-bold shrink-0">No fights</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="px-5 py-2.5 bg-muted/30 border-t border-border flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs font-bold text-muted-foreground">Pairing Date: {pair.pairing_date || 'Not set'}</span>
        <div className="flex items-center gap-2">
          <label htmlFor={`pair-outcome-${pair.id}`} className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            Status
          </label>
          <select
            id={`pair-outcome-${pair.id}`}
            value={pair.outcome}
            onChange={(e) => onOutcomeChange(e.target.value as PairingOutcome)}
            className={`text-xs font-black px-2 py-1 rounded-full border bg-card cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${outCfg.bg} ${outCfg.text} ${outCfg.border}`}
          >
            {PAIRING_OUTCOMES.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <span className="text-xs font-black text-violet-600 dark:text-violet-400 font-mono">Base Code: {offspringBaseCode}</span>
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

  const males = fowls.filter(isSireGender);
  const females = fowls.filter(f => !isSireGender(f));

  const selectedSire = fowls.find(f => f.id === Number(sireId));
  const selectedDam = fowls.find(f => f.id === Number(damId));

  const sireCode = selectedSire ? codeOf(selectedSire, codes) : '';
  const damCode = selectedDam ? codeOf(selectedDam, codes) : '';
  const previewCode = buildOffspringBaseCode(sireCode, damCode);

  const conflict = useMemo(
    () => pairingConflict(pairs, selectedSire, selectedDam),
    [pairs, selectedSire, selectedDam]
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
        }).`
      );
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
    <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-emerald-200 dark:border-emerald-800 shadow-sm p-5 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
          <Plus className="w-4 h-4 text-white" />
        </div>
        <h3 className="text-sm font-black text-card-foreground">Record a New Pairing</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="pair-sire" className="text-xs font-black text-sky-600 dark:text-sky-400 uppercase tracking-widest">🐓 Sire</label>
          <select
            id="pair-sire"
            value={sireId}
            onChange={e => setSireId(e.target.value)}
            required
            className="w-full px-3 py-2.5 border border-border rounded-xl bg-card text-card-foreground text-xs font-bold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/30 transition-all cursor-pointer"
          >
            <option value="">Select a sire...</option>
            {males.map(f => (
              <option key={f.id} value={f.id}>
                {formatBirdCodeForDisplay(codes.get(String(f.id)) || f.bird_code || '')} · {f.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="pair-dam" className="text-xs font-black text-pink-600 dark:text-pink-400 uppercase tracking-widest">🐔 Dam</label>
          <select
            id="pair-dam"
            value={damId}
            onChange={e => setDamId(e.target.value)}
            required
            className="w-full px-3 py-2.5 border border-border rounded-xl bg-card text-card-foreground text-xs font-bold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/30 transition-all cursor-pointer"
          >
            <option value="">Select a dam...</option>
            {females.map(f => (
              <option key={f.id} value={f.id}>
                {formatBirdCodeForDisplay(codes.get(String(f.id)) || f.bird_code || '')} · {f.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {conflict?.kind === 'occupied' && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl p-3 flex items-start gap-2.5">
          <span className="text-rose-600 dark:text-rose-400 shrink-0 text-sm leading-none mt-0.5">⛔</span>
          <div>
            <p className="text-xs font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest">Already Has an Active Partner</p>
            <p className="text-xs font-semibold text-rose-700 dark:text-rose-300">
              {conflict.bird === 'sire' ? selectedSire?.name : selectedDam?.name} is currently paired with{' '}
              {conflict.partnerName} (pairing {conflict.pairing.pairing_code || `#${conflict.pairing.id}`}). 
              Set that pairing to Completed before recording a new one.
            </p>
          </div>
        </div>
      )}

      {conflict?.kind === 'couple' && (
        <div className="bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 rounded-xl p-3 flex items-start gap-2.5">
          <span className="text-sky-600 dark:text-sky-400 shrink-0 text-sm leading-none mt-0.5">ℹ️</span>
          <div>
            <p className="text-xs font-black text-sky-600 dark:text-sky-400 uppercase tracking-widest">This Pairing Is Already Recorded</p>
            <p className="text-xs font-semibold text-sky-700 dark:text-sky-300">
              {conflict.pairing.sire_name || 'Sire'} × {conflict.pairing.dam_name || 'Dam'} — code{' '}
              {conflict.pairing.pairing_code || `#${conflict.pairing.id}`}, status {conflict.pairing.outcome}.
              Submitting will update the existing record; no duplicate will be created.
            </p>
          </div>
        </div>
      )}

      {previewCode && (
        <div className="bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 rounded-xl p-3 flex items-center gap-3">
          <Combine className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0" />
          <div>
            <p className="text-xs font-black text-violet-600 dark:text-violet-400 uppercase tracking-widest">Offspring Code Preview</p>
            <p className="text-sm font-black text-card-foreground font-mono">
              {previewCode}₁, {previewCode}₂, {previewCode}₃···
            </p>
            <p className="text-xs text-muted-foreground">
              Sire <span className="font-mono text-sky-600 dark:text-sky-400">{sireCode}</span> + Dam <span className="font-mono text-pink-600 dark:text-pink-400">{damCode}</span>
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="pair-date" className="text-xs font-black text-muted-foreground uppercase tracking-widest">Pairing Date</label>
          <input
            id="pair-date"
            type="date"
            value={pairingDate}
            onChange={e => setPairingDate(e.target.value)}
            className="w-full px-3 py-2.5 border border-border rounded-xl bg-card text-card-foreground text-xs font-bold outline-none focus:border-emerald-500 transition-all"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="pair-status" className="text-xs font-black text-muted-foreground uppercase tracking-widest">Status</label>
          <select
            id="pair-status"
            value={outcome}
            onChange={e => setOutcome(e.target.value as typeof outcome)}
            className="w-full px-3 py-2.5 border border-border rounded-xl bg-card text-card-foreground text-xs font-bold outline-none focus:border-emerald-500 transition-all cursor-pointer"
          >
            <option value="Active">Active</option>
            <option value="Completed">Completed</option>
            <option value="Discontinued">Discontinued</option>
          </select>
        </div>
      </div>

      <div className="space-y-1">
          <label htmlFor="pair-notes" className="text-xs font-black text-muted-foreground uppercase tracking-widest">Notes / Observations</label>
        <textarea
          id="pair-notes"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          placeholder="e.g. Strong bloodline combination, promising offspring..."
          className="w-full px-3 py-2.5 border border-border rounded-xl bg-card text-card-foreground text-xs font-semibold outline-none focus:border-emerald-500 transition-all resize-none placeholder:text-muted-foreground/50"
        />
      </div>

      {error && (
        <p className="text-xs font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={!sireId || !damId || conflict?.kind === 'occupied'}
          className="flex-1 py-2.5 bg-emerald-600 text-white text-xs font-black rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          Record Pairing
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 bg-muted text-muted-foreground text-xs font-black rounded-xl hover:bg-muted/80 transition-all cursor-pointer"
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

function SafetyIncidentCard({ incident, onRemove }: { incident: SafetyIncidentRecord; onRemove: () => void }) {
  const cfg = SEVERITY_CONFIG[incident.severity];
  const statusColors: Record<string, string> = {
    'Treated': 'text-sky-600 dark:text-sky-400',
    'Monitoring': 'text-amber-600 dark:text-amber-400',
    'Recovered': 'text-emerald-600 dark:text-emerald-400',
    'Deceased': 'text-rose-600 dark:text-rose-400',
  };

  return (
    <div className={`rounded-2xl border p-4 ${cfg.bg} ${cfg.border}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs font-black text-card-foreground">
                <span className={`font-mono ${cfg.text}`}>{formatBirdCodeForDisplay(incident.fowl_code || '')}</span> · {incident.fowl_name}
              </p>
              <span className={`text-xs font-black px-1.5 py-0.5 rounded border ${cfg.bg} ${cfg.text} ${cfg.border} uppercase tracking-wider`}>
                {incident.severity}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs font-bold text-muted-foreground">{incident.type}</span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs font-bold text-muted-foreground">{incident.incident_date}</span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className={`text-xs font-black ${statusColors[incident.status] || 'text-muted-foreground'}`}>{incident.status}</span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="w-6 h-6 flex items-center justify-center rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50"
          aria-label={`Dismiss ${incident.type} incident`}
        >
          <X className="w-3 h-3" />
        </button>
      </div>
      {incident.description && (
        <p className="text-xs text-muted-foreground font-semibold bg-background/60 rounded-lg px-2.5 py-1.5 mt-2">
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
    const fowl = fowls.find(f => f.id === Number(fowlId));
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
    <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-rose-200 dark:border-rose-800 shadow-sm p-5 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-rose-600 rounded-lg flex items-center justify-center">
          <AlertTriangle className="w-4 h-4 text-white" />
        </div>
        <h3 className="text-sm font-black text-card-foreground">Record a Safety Incident</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="inc-fowl" className="text-xs font-black text-muted-foreground uppercase tracking-widest">Chicken</label>
          <select
            id="inc-fowl"
            value={fowlId}
            onChange={e => setFowlId(e.target.value)}
            required
            className="w-full px-3 py-2.5 border border-border rounded-xl bg-card text-card-foreground text-xs font-bold outline-none focus:border-rose-500 transition-all cursor-pointer"
          >
            <option value="">Select a chicken...</option>
            {fowls.map(f => (
              <option key={f.id} value={f.id}>
                {formatBirdCodeForDisplay(codes.get(String(f.id)) || f.bird_code || '')} · {f.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="inc-date" className="text-xs font-black text-muted-foreground uppercase tracking-widest">Date</label>
          <input
            id="inc-date"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full px-3 py-2.5 border border-border rounded-xl bg-card text-card-foreground text-xs font-bold outline-none focus:border-rose-500 transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label htmlFor="inc-type" className="text-xs font-black text-muted-foreground uppercase tracking-widest">Incident Type</label>
          <select
            id="inc-type"
            value={type}
            onChange={e => setType(e.target.value as IncidentType)}
            className="w-full px-3 py-2.5 border border-border rounded-xl bg-card text-card-foreground text-xs font-bold outline-none focus:border-rose-500 transition-all cursor-pointer"
          >
            {INCIDENT_TYPES.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="inc-severity" className="text-xs font-black text-muted-foreground uppercase tracking-widest">Severity</label>
          <select
            id="inc-severity"
            value={severity}
            onChange={e => setSeverity(e.target.value as IncidentSeverity)}
            className="w-full px-3 py-2.5 border border-border rounded-xl bg-card text-card-foreground text-xs font-bold outline-none focus:border-rose-500 transition-all cursor-pointer"
          >
            {INCIDENT_SEVERITIES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="inc-status" className="text-xs font-black text-muted-foreground uppercase tracking-widest">Status</label>
          <select
            id="inc-status"
            value={status}
            onChange={e => setStatus(e.target.value as IncidentStatus)}
            className="w-full px-3 py-2.5 border border-border rounded-xl bg-card text-card-foreground text-xs font-bold outline-none focus:border-rose-500 transition-all cursor-pointer"
          >
            {INCIDENT_STATUSES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1">
          <label htmlFor="inc-description" className="text-xs font-black text-muted-foreground uppercase tracking-widest">Description</label>
        <textarea
          id="inc-description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={2}
          placeholder="e.g. Injured during handling, fever, etc..."
          className="w-full px-3 py-2.5 border border-border rounded-xl bg-card text-card-foreground text-xs font-semibold outline-none focus:border-rose-500 transition-all resize-none placeholder:text-muted-foreground/50"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={!fowlId}
          className="flex-1 py-2.5 bg-rose-600 text-white text-xs font-black rounded-xl hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          Record Incident
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 bg-muted text-muted-foreground text-xs font-black rounded-xl hover:bg-muted/80 transition-all cursor-pointer"
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

function BirdIdentityCard({ fowl, fowls, codes, matchHistory, setSelectedFowlForDetails }: {
  fowl: FowlRecord;
  fowls: FowlRecord[];
  codes: Map<string, string>;
  matchHistory: MatchRecord[];
  setSelectedFowlForDetails: (f: FowlRecord) => void;
}) {
  const code = codeOf(fowl, codes);
  const displayCode = formatBirdCodeForDisplay(code);
  const codeType = classifyBirdCode(code);
  const sireBreed = parentBreedOf(fowl.sire, fowls);
  const damBreed = parentBreedOf(fowl.dam, fowls);

  const matches = matchHistory.filter(m => m.entry_name?.toLowerCase() === fowl.name.toLowerCase());
  const wins = matches.filter(m => m.outcome?.toLowerCase() === 'win').length;
  const losses = matches.filter(m => m.outcome?.toLowerCase() === 'loss').length;
  const decided = wins + losses;
  const winRate = decided > 0 ? Math.round((wins / decided) * 100) : 0;

  const codeColorMap = {
    sire: { bg: 'bg-sky-100 dark:bg-sky-950/50', text: 'text-sky-700 dark:text-sky-400', border: 'border-sky-200 dark:border-sky-800', label: 'SIRE' },
    dam: { bg: 'bg-pink-100 dark:bg-pink-950/50', text: 'text-pink-700 dark:text-pink-400', border: 'border-pink-200 dark:border-pink-800', label: 'DAM' },
    offspring: { bg: 'bg-emerald-100 dark:bg-emerald-950/50', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800', label: 'OFFSPRING' },
    custom: { bg: 'bg-violet-100 dark:bg-violet-950/50', text: 'text-violet-700 dark:text-violet-400', border: 'border-violet-200 dark:border-violet-800', label: 'CUSTOM' },
  };
  const codeColor = codeColorMap[codeType];

  return (
    <button
      type="button"
      onClick={() => setSelectedFowlForDetails(fowl)}
      className="group w-full bg-card rounded-2xl border border-border shadow-sm p-4 text-left hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md transition-all cursor-pointer"
    >
      <div className="flex items-start gap-3">
        <div className={`shrink-0 w-12 h-12 rounded-xl ${codeColor.bg} ${codeColor.border} border flex flex-col items-center justify-center`}>
          <span className={`text-xs font-black ${codeColor.text} uppercase tracking-widest leading-none`}>{codeColor.label}</span>
          <span className={`text-base font-black ${codeColor.text} font-mono leading-none mt-0.5`}>{displayCode || '—'}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-black text-card-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-400 truncate">{fowl.name}</p>
          <p className="text-xs text-muted-foreground font-semibold truncate">{fowl.breed} · {genderLabel(fowl.gender)}</p>
          {fowl.wing_band && (
            <p className="text-xs font-bold text-violet-600 dark:text-violet-400 mt-0.5">Wing Band: {fowl.wing_band}</p>
          )}
          {fowl.bloodline_composition && Object.keys(fowl.bloodline_composition).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {Object.entries(fowl.bloodline_composition).slice(0, 3).map(([strain, pct]) => (
                <span key={strain} className="text-xs font-black bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800 px-1.5 py-0.5 rounded">
                  {strain} {Math.round(pct as number)}%
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="shrink-0 text-right">
          {decided > 0 ? (
            <span className={`text-xs font-black px-2 py-0.5 rounded-full border ${winRate >= 50 ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'}`}>
              {winRate}%
            </span>
          ) : (
            <span className="text-xs text-muted-foreground/50 font-bold">No fights</span>
          )}
          <p className={`text-xs font-bold mt-1 ${fowl.status === 'Active' ? 'text-emerald-600 dark:text-emerald-400' : fowl.status === 'Deceased' ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground'}`}>
            {fowl.status}
          </p>
        </div>
      </div>
      {(fowl.sire || fowl.dam) && (
        <div className="mt-2 pt-2 border-t border-border flex items-center gap-3 text-xs font-semibold text-muted-foreground">
          {fowl.sire && <span>🐓 Sire: <strong className="text-card-foreground">{fowl.sire}</strong>{sireBreed ? ` · ${sireBreed}` : ''}</span>}
          {fowl.dam && <span>🐔 Dam: <strong className="text-card-foreground">{fowl.dam}</strong>{damBreed ? ` · ${damBreed}` : ''}</span>}
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

  const [activeTab, setActiveTab] = useState<BreedingTab>('coding');
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

  const activePairs = useMemo(() =>
    breedingPairs.filter(p => p.outcome === 'Active').length
  , [breedingPairs]);

  const criticalIncidents = useMemo(() => countUrgentIncidents(incidents), [incidents]);

  const filteredFowls = useMemo(() => {
    if (!identitySearch.trim()) return fowls;
    const q = identitySearch.toLowerCase();
    return fowls.filter(f => {
      const code = codeOf(f, codes).toLowerCase();
      return f.name.toLowerCase().includes(q) || code.includes(q) || (f.breed || '').toLowerCase().includes(q) || (f.wing_band || '').toLowerCase().includes(q);
    });
  }, [fowls, codes, identitySearch]);

  const addPair = useCallback(async (payload: Partial<BreedingPairRecord>) => {
    const conflict = pairingConflict(
      breedingPairs,
      fowls.find((f) => f.id === payload.sire_id),
      fowls.find((f) => f.id === payload.dam_id)
    );

    if (conflict?.kind === 'occupied') {
      showToastMessage(
        `${conflict.bird === 'sire' ? 'Sire' : 'Dam'} already has an Active partner (${conflict.partnerName}). End that pairing first.`,
        'error'
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
          'error'
        );
        return;
      }
      setSaving(true);
      const { record, error } = await updateBreedingPairingOutcome(conflict.pairing.id, nextOutcome);
      setSaving(false);
      if (error || !record) {
        showToastMessage(`Failed to update pairing: ${error || 'no record returned'}`, 'error');
        return;
      }
      setBreedingPairs(prev => prev.map(p => (p.id === record.id ? record : p)));
      setShowAddPairing(false);
      showToastMessage(
        `Pairing ${record.sire_name} × ${record.dam_name} set to ${nextOutcome}.`,
        'success'
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
    setBreedingPairs(prev => [record, ...prev]);
    setShowAddPairing(false);
    showToastMessage(`${record.sire_name} × ${record.dam_name} pairing recorded.`, 'success');
  }, [breedingPairs, fowls]);

  const changePairOutcome = useCallback(async (id: number, outcome: PairingOutcome) => {
    const previous = breedingPairs;
    setBreedingPairs(prev => prev.map(p => (p.id === id ? { ...p, outcome } : p)));
    const { record, error } = await updateBreedingPairingOutcome(id, outcome);
    if (error || !record) {
      setBreedingPairs(previous);
      showToastMessage(`Failed to update pairing status: ${error || 'no record returned'}`, 'error');
      return;
    }
    showToastMessage(`Pairing status set to ${outcome}.`, 'success');
  }, [breedingPairs]);

  const addIncident = useCallback(async (payload: Partial<SafetyIncidentRecord>) => {
    setSaving(true);
    const { record, error } = await insertSafetyIncident(payload);
    setSaving(false);
    if (error || !record) {
      showToastMessage(`Failed to save incident: ${error || 'no record returned'}`, 'error');
      return;
    }
    setIncidents(prev => sortIncidents([record, ...prev]));
    setShowAddIncident(false);
    showToastMessage(`Safety incident recorded for ${record.fowl_name}.`, 'success');
  }, []);

  const removePair = useCallback(async (id: number) => {
    const previous = breedingPairs;
    setBreedingPairs(prev => prev.filter(p => p.id !== id));
    const { error } = await deleteBreedingPairing(id);
    if (error) {
      setBreedingPairs(previous);
      showToastMessage(`Failed to delete pairing: ${error}`, 'error');
      return;
    }
    showToastMessage('Pairing removed from history.', 'success');
  }, [breedingPairs]);

  const removeIncident = useCallback(async (id: number) => {
    const previous = incidents;
    setIncidents(prev => prev.filter(i => i.id !== id));
    const { error } = await deleteSafetyIncident(id);
    if (error) {
      setIncidents(previous);
      showToastMessage(`Failed to delete incident: ${error}`, 'error');
      return;
    }
    showToastMessage('Safety incident deleted.', 'success');
  }, [incidents]);

  /** Save an auto-detected sire × dam combination into the pairing history. */
  const _recordDetectedPairing = useCallback(async (ps: PairingStats) => {
    const sireFowl = fowls.find(f => f.name === ps.sire);
    const damFowl = fowls.find(f => f.name === ps.dam);
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
        damFowl ? codeOf(damFowl, codes) : ''
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
    setBreedingPairs(prev => [record, ...prev]);
    showToastMessage(`${ps.sire} × ${ps.dam} added to pairing history.`, 'success');
  }, [fowls, codes]);

  const totalMales = fowls.filter(isSireGender).length;
  const totalFemales = fowls.length - totalMales;
  const totalOffspring = fowls.filter(f => classifyBirdCode(codeOf(f, codes)) === 'offspring').length;

  const TABS = [
    { id: 'coding' as BreedingTab, label: 'Coding System', icon: Hash, activeClass: 'bg-violet-600' },
    { id: 'pairs' as BreedingTab, label: 'Breeding Pairs', icon: Heart, activeClass: 'bg-rose-600' },
    { id: 'identity' as BreedingTab, label: 'Chicken Identity', icon: Eye, activeClass: 'bg-emerald-600' },
    { id: 'safety' as BreedingTab, label: 'Safety Incidents', icon: Shield, activeClass: 'bg-amber-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-card p-6 sm:p-7 rounded-3xl border border-border shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-5">
          <div className="flex items-center gap-4 flex-1">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500/20 to-emerald-500/20 border border-violet-500/30 flex items-center justify-center shrink-0">
              <Dna className="w-6 h-6 text-violet-500" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-card-foreground tracking-tight">
                Breeding &amp; Lineage Hub
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground font-semibold mt-0.5">
                Coding system, pairing history, bloodline monitoring, and safety incidents
              </p>
            </div>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Breeding Males', value: totalMales, color: 'text-sky-600 dark:text-sky-400', icon: '🐓', sub: 'Coded: 1, 2, 3...' },
            { label: 'Breeding Females', value: totalFemales, color: 'text-pink-600 dark:text-pink-400', icon: '🐔', sub: 'Coded: A, B, C...' },
            { label: 'Non-Breeding', value: totalOffspring, color: 'text-emerald-600 dark:text-emerald-400', icon: '🐥', sub: 'Coded: 1A₁, 1A₂...' },
            { label: 'Active Pairs', value: activePairs, color: 'text-rose-600 dark:text-rose-400', icon: '❤️', sub: 'Breeding pairs' },
          ].map(s => (
            <div key={s.label} className="bg-muted/40 rounded-2xl p-4 flex items-center gap-3">
              <span className="text-2xl shrink-0">{s.icon}</span>
              <div className="min-w-0">
                <p className={`text-2xl font-black ${s.color} leading-none`}>{s.value}</p>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mt-0.5">{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1.5 bg-muted/60 p-1.5 rounded-2xl border border-border overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                id={`breeding-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-xs font-bold transition-all duration-200 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? `${tab.activeClass} text-white shadow-sm`
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
                {tab.id === 'safety' && criticalIncidents > 0 && (
                  <span className={`text-xs font-black px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20' : 'bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'}`}>
                    {criticalIncidents}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Load status */}
      {loading && (
        <div className="bg-card rounded-3xl border border-border shadow-sm p-8 flex items-center justify-center gap-3">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
          <p className="text-xs font-bold text-muted-foreground">Loading pairing history and safety records...</p>
        </div>
      )}

      {!loading && loadError && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest">Unable to Load Breeding Records</p>
            <p className="text-xs text-muted-foreground font-semibold mt-0.5 break-words">{loadError}</p>
            <p className="text-xs text-muted-foreground font-semibold mt-1">
              Run the migration first in the Supabase SQL editor{' '}
              <span className="font-mono text-card-foreground">20261004000000_breeding_pairings_safety_incidents.sql</span>.
            </p>
          </div>
          <button
            type="button"
            onClick={loadRecords}
            className="flex items-center gap-1.5 text-xs font-black text-amber-700 dark:text-amber-400 hover:underline cursor-pointer shrink-0"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        </div>
      )}

      {/* ── CODING SYSTEM TAB ─────────────────────────────────────────────── */}
      {!loading && activeTab === 'coding' && (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-400 rounded-xl flex items-center justify-center">
              <Hash className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-card-foreground">Coding System for Lineage</h2>
              <p className="text-xs text-muted-foreground font-bold">Standardized tagging to track every chicken and its family lineage</p>
            </div>
          </div>
          <CodingSystemExplainer fowls={fowls} codes={codes} />

          {pairingAnalytics.ranked.length > 0 && (
            <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
              <div className="px-6 pt-6 pb-4 border-b border-border flex items-center gap-3">
                <div className="w-9 h-9 bg-amber-100 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-amber-700 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-card-foreground">Pairing Performance Analysis</h3>
                  <p className="text-xs text-muted-foreground font-semibold">Best and worst combinations based on offspring win rate</p>
                </div>
              </div>
              <div className="p-6 space-y-3">
                {pairingAnalytics.ranked.slice(0, 8).map((ps, i) => {
                  const isElite = ps.decided >= 3 && ps.winRate >= 70;
                  const isWeak = ps.decided >= 3 && ps.winRate < 50;
                  return (
                    <div
                      key={ps.key}
                      className={`flex items-center justify-between gap-3 rounded-xl px-4 py-3 border ${
                        isElite ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800' :
                        isWeak ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800' :
                        'bg-muted/30 border-border'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-black text-muted-foreground/40 w-4 shrink-0">#{i + 1}</span>
                        {isElite && <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                        {isWeak && <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />}
                        <div className="min-w-0">
                          <p className="text-xs font-black text-card-foreground">
                            <span className="text-sky-600 dark:text-sky-400">{ps.sire}</span>
                            <span className="text-muted-foreground mx-1.5">×</span>
                            <span className="text-pink-600 dark:text-pink-400">{ps.dam}</span>
                          </p>
                          <p className="text-xs text-muted-foreground font-semibold">{ps.members.length} offspring · {ps.totalFights} fights</p>
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        {ps.decided > 0 && (
                          <span className={`text-xs font-black px-2 py-0.5 rounded-full border ${ps.winRate >= 50 ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'}`}>
                            {ps.winRate}%
                          </span>
                        )}
                        <span className="text-xs font-bold text-muted-foreground">{ps.wins}W-{ps.losses}L</span>
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
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 rounded-xl flex items-center justify-center">
                <Heart className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-card-foreground">Breeding Pairs</h2>
                <p className="text-xs text-muted-foreground font-bold">Record and monitor every pairing and the performance of their offspring</p>
              </div>
            </div>
            <button
              id="add-breeding-pair-btn"
              type="button"
              onClick={() => setShowAddPairing(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-black hover:bg-emerald-700 transition-all cursor-pointer shrink-0 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
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
            <div className="bg-card p-10 text-center rounded-3xl border border-border shadow-sm space-y-3">
              <div className="w-14 h-14 bg-rose-100 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center justify-center mx-auto">
                <Heart className="w-7 h-7 text-rose-500" />
              </div>
              <div>
                <p className="text-sm font-black text-card-foreground">No Breeding Pairs Yet</p>
                <p className="text-xs text-muted-foreground font-semibold max-w-xs mx-auto mt-1">
                  Record breeding pairs to monitor pairing history and offspring performance.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddPairing(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-black hover:bg-emerald-700 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Record a Pairing
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {breedingPairs.map(pair => (
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
            <div className="bg-gradient-to-r from-sky-50 to-violet-50 dark:from-sky-950/20 dark:to-violet-950/20 border border-sky-200/50 dark:border-sky-800/50 rounded-3xl p-5 sm:p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-sky-600 rounded-xl flex items-center justify-center">
                  <Info className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-card-foreground">Auto-Detected Pairings</h3>
                  <p className="text-xs text-muted-foreground font-semibold">Based on sire/dam records of chickens in the registry</p>
                </div>
              </div>
              <div className="space-y-2">
                {pairingAnalytics.ranked.slice(0, 5).map(ps => (
                  <div
                    key={ps.key}
                    className="flex items-center justify-between gap-3 bg-card/60 rounded-xl px-4 py-3 border border-border"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-black text-card-foreground">
                        <span className="text-sky-600 dark:text-sky-400">{ps.sire}</span>
                        <span className="text-muted-foreground mx-1.5">×</span>
                        <span className="text-pink-600 dark:text-pink-400">{ps.dam}</span>
                      </p>
                      <p className="text-xs text-muted-foreground font-semibold">{ps.members.length} offspring · {ps.totalFights} recorded fights</p>
                    </div>
                    {ps.decided > 0 && (
                      <span className={`text-xs font-black px-2 py-0.5 rounded-full border shrink-0 ${ps.winRate >= 50 ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'}`}>
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
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-9 h-9 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 rounded-xl flex items-center justify-center">
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-card-foreground">Unique Chicken Identity</h2>
                <p className="text-xs text-muted-foreground font-bold">Each chicken has a unique code based on its sire, dam, and sibling order</p>
              </div>
            </div>
            <div className="relative w-full sm:w-72 shrink-0">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              </span>
              <input
                id="identity-search-input"
                type="text"
                placeholder="Search chicken..."
                value={identitySearch}
                onChange={e => setIdentitySearch(e.target.value)}
                className="w-full pl-10 pr-3.5 py-3 border border-border rounded-2xl bg-card text-card-foreground placeholder:text-muted-foreground text-xs outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-900/30 transition-all font-semibold"
              />
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border shadow-sm p-4 flex flex-wrap gap-3">
            {[
              { type: 'SIRE', code: '1', desc: 'Foundation male', bg: 'bg-sky-100 dark:bg-sky-950/50', text: 'text-sky-700 dark:text-sky-400', border: 'border-sky-200 dark:border-sky-800' },
              { type: 'DAM', code: 'A', desc: 'Foundation female', bg: 'bg-pink-100 dark:bg-pink-950/50', text: 'text-pink-700 dark:text-pink-400', border: 'border-pink-200 dark:border-pink-800' },
              { type: 'OFFSPRING', code: '1A₁', desc: 'Child of Sire 1 × Dam A', bg: 'bg-emerald-100 dark:bg-emerald-950/50', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' },
              { type: 'CUSTOM', code: '···', desc: 'Manual override', bg: 'bg-violet-100 dark:bg-violet-950/50', text: 'text-violet-700 dark:text-violet-400', border: 'border-violet-200 dark:border-violet-800' },
            ].map(l => (
              <div key={l.type} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg ${l.bg} ${l.border} border flex items-center justify-center`}>
                  <span className={`text-xs font-black ${l.text} font-mono`}>{l.code}</span>
                </div>
                <div>
                  <p className={`text-xs font-black ${l.text} uppercase tracking-widest`}>{l.type}</p>
                  <p className="text-xs text-muted-foreground font-semibold">{l.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {filteredFowls.length === 0 ? (
            <div className="bg-card p-8 text-center rounded-3xl border border-border shadow-sm">
              <p className="text-sm font-black text-card-foreground">No Chicken Found</p>
              <p className="text-xs text-muted-foreground mt-1">Try a different name or code</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredFowls.map(f => (
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
          )}
        </section>
      )}

      {/* ── SAFETY INCIDENTS TAB ──────────────────────────────────────────── */}
      {activeTab === 'safety' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-card-foreground">Safety Incidents</h2>
                <p className="text-xs text-muted-foreground font-bold">Record accidents, injuries, or illnesses for each chicken</p>
              </div>
            </div>
            <button
              id="add-safety-incident-btn"
              type="button"
              onClick={() => setShowAddIncident(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-black hover:bg-rose-700 transition-all cursor-pointer shrink-0 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Record Incident
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {(Object.keys(SEVERITY_CONFIG) as (keyof typeof SEVERITY_CONFIG)[]).map(sev => {
              const cfg = SEVERITY_CONFIG[sev];
              const count = incidents.filter(i => i.severity === sev).length;
              return (
                <div key={sev} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${cfg.bg} ${cfg.border}`}>
                  <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                  <span className={`text-xs font-black ${cfg.text} uppercase tracking-widest`}>{sev}</span>
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
            <div className="bg-card p-10 text-center rounded-3xl border border-border shadow-sm space-y-3">
              <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-black text-card-foreground">No Incidents Recorded</p>
                <p className="text-xs text-muted-foreground font-semibold max-w-xs mx-auto mt-1">
                  All chickens are safe. Record safety incidents to monitor the health of your flock.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddIncident(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-black hover:bg-rose-700 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Record Incident
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {incidents.map(incident => (
                <SafetyIncidentCard
                  key={incident.id}
                  incident={incident}
                  onRemove={() => removeIncident(incident.id)}
                />
              ))}
            </div>
          )}

          <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200/60 dark:border-amber-800/60 rounded-2xl p-4 flex items-start gap-3">
            <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest">Safety Monitoring Tip</p>
              <p className="text-xs text-muted-foreground font-semibold mt-0.5">
                Monitor the health of each chicken regularly, especially after a fight.
                Critical incidents require immediate attention. Link each incident to a chicken code so its
                health history can be traced within the family lineage.
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
