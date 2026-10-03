'use client';
import React from 'react';
import type {
  FowlRecord,
  MatchRecord,
  SiblingRelation,
  AgeParts,
  MilestoneInfo,
  PairingAnalytics,
  ArchiveBadge,
} from '@/lib/types';
import BloodlineReportCard from '@/components/BloodlineReportCard';
import BloodlineBreakdown from '@/components/BloodlineBreakdown';
import { getFowlBloodlineStats } from '@/lib/bloodline-composition';
import { birdCodeOf, formatBirdCodeForDisplay } from '@/lib/bird-code';
import { useUnitPrefs, weightFromStorage, heightFromStorage, weightUnitLabel, heightUnitLabel } from '@/lib/units';
import { useFowl } from '@/lib/contexts/fowl-context';
import { isMale } from '@/lib/helpers';

type FowlDetailsModalProps = {
  selectedFowlForDetails: FowlRecord | null;
  setSelectedFowlForDetails: (f: FowlRecord | null) => void;
  matchHistory: MatchRecord[];
  fowls: FowlRecord[];
  getAgeParts: (birthdate: string) => AgeParts | null;
  getAgeLabel: (parts: AgeParts) => string;
  getAgeExact: (parts: AgeParts) => string;
  getAgeMetrics: (parts: AgeParts) => string;
  generationOf: (f: FowlRecord) => number;
  generationPurity: (gen: number) => number;
  generationInfo: (gen: number) => { short: string; label: string; desc: string; tone: string };
  bloodlineOf: (f: FowlRecord) => number;
  cleanPct: (v: unknown) => number;
  getSiblingRelations: (f: FowlRecord) => SiblingRelation[];
  getMilestoneInfo: (birthdate: string, gender: string) => MilestoneInfo | null;
  getArchiveBadgeStyle: (reason: string) => ArchiveBadge;
  pairingAnalytics: PairingAnalytics;
};

export default function FowlDetailsModal({
  selectedFowlForDetails,
  setSelectedFowlForDetails,
  matchHistory,
  fowls,
  getAgeParts,
  getAgeLabel,
  getAgeExact,
  getAgeMetrics,
  generationOf,
  generationPurity,
  generationInfo,
  bloodlineOf,
  cleanPct,
  getSiblingRelations,
  getMilestoneInfo,
  getArchiveBadgeStyle,
  pairingAnalytics,
}: FowlDetailsModalProps) {
  const unitPrefs = useUnitPrefs();
  const { handleSetSireMaterial, handleSetActiveStatus } = useFowl();
  if (!selectedFowlForDetails) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white dark:bg-card rounded-lg shadow-2xl border border-slate-200 dark:border-border max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto relative">
        <button 
          onClick={() => setSelectedFowlForDetails(null)} 
          className="absolute top-5 right-5 text-muted-foreground hover:text-slate-700 dark:hover:text-card-foreground bg-slate-100 dark:bg-muted hover:bg-slate-200 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all cursor-pointer"
        >
          ✕
        </button>

        <h3 className="text-base font-black text-slate-900 dark:text-card-foreground tracking-tight border-b pb-3 border-slate-100 flex items-center space-x-2">
          <span>🧬</span> <span>Individual Chicken Analytics & Match Logs</span>
        </h3>

        <BloodlineReportCard fowl={selectedFowlForDetails} />

        <BloodlineBreakdown
          stats={getFowlBloodlineStats(selectedFowlForDetails, fowls)}
          title="Bloodline Percentage (Hatian ng Dugo)"
          subtitle="Bawat porsyento ay hati mula sa 50/50 na hatian ng Sire at Dam"
        />

        <div className="flex flex-col sm:flex-row gap-4 items-center bg-slate-50 dark:bg-muted/50 p-4 rounded-lg border border-slate-200/70 dark:border-border">
          <div className="w-24 h-24 bg-white dark:bg-card border border-slate-200 dark:border-border rounded-md overflow-hidden shrink-0 flex items-center justify-center relative shadow-inner">
            {selectedFowlForDetails.image_url ? (
              <img src={selectedFowlForDetails.image_url} alt={selectedFowlForDetails.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-mono text-[8px] text-muted-foreground font-bold">NO PHOTO</div>
            )}
          </div>
          <div className="space-y-1.5 text-center sm:text-left flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h4 className="text-lg font-black text-slate-900 dark:text-card-foreground">{selectedFowlForDetails.name}</h4>
              <span className="text-[9px] font-mono font-black text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-full uppercase">
                {formatBirdCodeForDisplay(birdCodeOf(selectedFowlForDetails, fowls)) || '—'}
              </span>
              {selectedFowlForDetails.wing_band ? (
                <span className="text-[9px] font-mono font-black text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 px-2.5 py-0.5 rounded-full uppercase" title="Wing Band ID">
                  ⌁ {selectedFowlForDetails.wing_band}
                </span>
              ) : null}
              <span className="text-[9px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-full uppercase">{selectedFowlForDetails.breed}</span>
              {(() => {
                if (selectedFowlForDetails.status === 'Deceased') {
                  return (
                    <span className="text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase bg-rose-900 text-white border border-rose-950 shadow-2xs">
                      💀 DECEASED
                    </span>
                  );
                }
                if (selectedFowlForDetails.status === 'Sire Material') {
                  return (
                    <span className="text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      ● SIRE MATERIAL
                    </span>
                  );
                }
                if (selectedFowlForDetails.status === 'Archived') {
                  const badge = getArchiveBadgeStyle(selectedFowlForDetails.archive_reason || 'OTHER');
                  return (
                    <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase ${badge.bg} border border-white/20 shadow-2xs`}>
                      {badge.label}
                    </span>
                  );
                }
                return (
                  <span className="text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    ● ACTIVE
                  </span>
                );
              })()}
            </div>
            <p className="text-[11px] text-muted-foreground font-medium">
              Growth Stage: <strong className="text-slate-800 dark:text-card-foreground font-bold">{selectedFowlForDetails.growth_stage || 'Chick'}</strong> | Auto Age: <strong className="text-emerald-700 dark:text-emerald-300 font-bold">{(() => { const p = getAgeParts(selectedFowlForDetails.birthdate); return p ? getAgeLabel(p) : selectedFowlForDetails.age || 'N/A'; })()}</strong> | Legs: <strong className="text-slate-800 dark:text-card-foreground font-bold">{selectedFowlForDetails.leg_color || 'N/A'}</strong>
            </p>
            {(() => {
              const p = getAgeParts(selectedFowlForDetails.birthdate);
              return p ? (
                <p className="text-[10px] font-mono text-muted-foreground font-semibold">
                  Born {selectedFowlForDetails.birthdate} · Exact {getAgeExact(p)} · {getAgeMetrics(p)}
                </p>
              ) : (
                <p className="text-[10px] text-warning dark:text-amber-300 font-bold">⚠️ No birth date recorded — use ✏️ Edit to set one for automatic age &amp; milestone tracking.</p>
              );
            })()}
            {selectedFowlForDetails.status === 'Deceased' && (
              <p className="text-[11px] font-bold text-danger dark:text-rose-300">
                💀 Cause of Death: <strong className="text-rose-800 dark:text-rose-300">{selectedFowlForDetails.death_reason || 'Unspecified'}</strong>
                {selectedFowlForDetails.death_date ? ` · Recorded ${selectedFowlForDetails.death_date}` : ''}
              </p>
            )}
            {selectedFowlForDetails.status !== 'Deceased' && selectedFowlForDetails.status === 'Archived' && selectedFowlForDetails.archive_reason && (
              <p className="text-[11px] font-bold text-amber-700 dark:text-amber-300">
                📦 Archive Reason: <strong className="text-amber-800 dark:text-amber-300">{selectedFowlForDetails.archive_reason}</strong> (Non-Mortality)
              </p>
            )}
            {selectedFowlForDetails.status !== 'Deceased' && selectedFowlForDetails.status !== 'Archived' && isMale(selectedFowlForDetails.gender) && (
              <div className="pt-1.5">
                {selectedFowlForDetails.status === 'Sire Material' ? (
                  <button type="button" onClick={() => handleSetActiveStatus(selectedFowlForDetails)} className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200/80 px-3 py-1.5 rounded-sm transition-all cursor-pointer">
                    Set back to Active
                  </button>
                ) : (
                  <button type="button" onClick={() => handleSetSireMaterial(selectedFowlForDetails)} className="inline-flex items-center gap-1.5 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200/80 px-3 py-1.5 rounded-sm transition-all cursor-pointer">
                    Mark as Sire Material
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* SIBLING MATCH / LINEAGE RELATIONS */}
        {(() => {
          const relations = getSiblingRelations(selectedFowlForDetails);
          const full = relations.filter(r => r.relation === 'Full Sibling');
          const halfSire = relations.filter(r => r.relation === 'Half-Sibling (Shared Sire)');
          const halfDam = relations.filter(r => r.relation === 'Half-Sibling (Shared Dam)');
          const relationCard = (r: SiblingRelation) => {
            const isFull = r.relation === 'Full Sibling';
            const isSire = r.relation === 'Half-Sibling (Shared Sire)';
            const tone = isFull
              ? 'text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50'
              : isSire
              ? 'text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50'
              : 'text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/50';
            const icon = isFull ? '👥' : isSire ? '🐓' : '🐔';
            const badge = isFull ? 'Full Sibling' : 'Half-Sibling';
            const context = isFull
              ? `Shared Sire: ${r.sharedSire} & Dam: ${r.sharedDam}`
              : isSire
              ? `Shared Sire: ${r.sharedSire}`
              : `Shared Dam: ${r.sharedDam}`;
            const target = fowls.find((f) => f.name.trim().toLowerCase() === r.name.trim().toLowerCase());
            return (
              <div
                key={r.id}
                title={`${r.name} — ${badge}. ${context}.${target ? ' Klik para buksan ang profile.' : ''}`}
                onClick={target ? () => setSelectedFowlForDetails(target) : undefined}
                className={`flex items-center justify-between gap-3 p-3 rounded-md border border-slate-100 dark:border-border bg-slate-50/60 dark:bg-muted/50 hover:border-slate-200 transition-colors ${target ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-muted' : ''}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-8 h-8 rounded-sm flex items-center justify-center text-sm shrink-0 border ${tone}`}>{icon}</span>
                  <div className="min-w-0">
                    <p className={`text-xs font-black truncate ${target ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-800 dark:text-card-foreground'}`}>{r.name}</p>
                    <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider truncate">{context}</p>
                  </div>
                </div>
                <span className={`text-[8px] font-black uppercase px-2.5 py-1 rounded-full border shrink-0 ${tone}`}>{badge}</span>
              </div>
            );
          };
          return (
            <div className="bg-white dark:bg-card rounded-lg border border-slate-200/80 dark:border-border shadow-sm p-4 sm:p-5">
              <h4 className="text-[10px] font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-widest flex items-center justify-between border-b pb-2 border-slate-100 mb-3">
                <span>🧬 Sibling Match &amp; Lineage Relations</span>
                <span className={`font-mono px-2 py-0.5 rounded border ${relations.length > 0 ? 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:border-emerald-800' : 'text-muted-foreground bg-slate-100 dark:bg-muted border-slate-200 dark:border-border'}`}>
                  {relations.length > 0 ? `${relations.length} DETECTED` : 'NO MATCHES'}
                </span>
              </h4>
              {relations.length === 0 ? (
                <p className="text-[10px] text-muted-foreground font-semibold">
                  No sibling records detected. Add another chicken sharing the same Sire and/or Dam to build the lineage tree.
                </p>
              ) : (
                <>
                  <p className="text-[10px] text-muted-foreground font-medium bg-slate-50 dark:bg-muted/50 border border-slate-100 dark:border-border rounded-sm px-3 py-2 mb-3 flex items-start gap-2">
                    <span className="text-sm shrink-0">🧬</span>
                    <span>
                      <strong className="text-slate-700 dark:text-card-foreground">How lineage is matched:</strong> chickens sharing both the same{' '}
                      <strong className="text-slate-700 dark:text-card-foreground">Sire</strong> and <strong className="text-slate-700 dark:text-card-foreground">Dam</strong> are <strong className="text-emerald-700 dark:text-emerald-300">Full Siblings</strong> (iisang tatay at iisang nanay);
                      sharing only the <strong className="text-slate-700 dark:text-card-foreground">Sire</strong> marks them <strong className="text-amber-700 dark:text-amber-300">Half-Siblings (Shared Sire)</strong> — magkaiba ang nanay, iisang tatay;
                      sharing only the <strong className="text-slate-700 dark:text-card-foreground">Dam</strong> marks them <strong className="text-sky-700 dark:text-sky-300">Half-Siblings (Shared Dam)</strong> — magkaiba ang tatay, iisang nanay.
                      New encodes appear here instantly.
                    </span>
                  </p>
                  <div className="space-y-2 mb-3">
                    {relations.map(relationCard)}
                  </div>
                  {(full.length > 0 || halfSire.length > 0 || halfDam.length > 0) && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 pt-2.5 border-t border-slate-100 dark:border-border text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                      <span className="text-emerald-700 dark:text-emerald-300">👥 {full.length} Full</span>
                      <span className="text-amber-700 dark:text-amber-300">🐓 {halfSire.length} Sire-side Half</span>
                      <span className="text-sky-700 dark:text-sky-300">🐔 {halfDam.length} Dam-side Half</span>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })()}

        {/* SIBLING PERFORMANCE ANALYSIS */}
        {(() => {
          const relations = getSiblingRelations(selectedFowlForDetails);
          if (relations.length === 0) return null;

          const getMatchStats = (name: string) => {
            const fMatches = matchHistory.filter((x) => x.entry_name?.trim().toLowerCase() === name.trim().toLowerCase());
            const total = fMatches.length;
            const wins = fMatches.filter((x) => x.outcome?.toLowerCase() === 'win').length;
            const losses = fMatches.filter((x) => x.outcome?.toLowerCase() === 'loss').length;
            const draws = fMatches.filter((x) => x.outcome?.toLowerCase() === 'draw').length;
            const decided = wins + losses;
            const winRate = decided > 0 ? Math.round((wins / decided) * 100) : 0;
            return { total, wins, losses, draws, decided, winRate };
          };

          const thisBirdStats = getMatchStats(selectedFowlForDetails.name);
          const siblingData = relations.map((r) => ({
            ...r,
            stats: getMatchStats(r.name),
          }));

          const bestSibling = siblingData
            .filter((s) => s.stats.decided > 0)
            .sort((a, b) => b.stats.winRate - a.stats.winRate || b.stats.wins - a.stats.wins)[0];

          const worseSibling = siblingData
            .filter((s) => s.stats.decided > 0)
            .sort((a, b) => a.stats.winRate - b.stats.winRate)[0];

          const formatStats = (s: { wins: number; losses: number; winRate: number; total: number; decided: number }) => {
            if (s.total === 0) return <span className="text-[10px] text-muted-foreground font-bold">No fights</span>;
            return (
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${s.winRate >= 50 ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'}`}>
                {s.winRate}% · {s.wins}W-{s.losses}L
              </span>
            );
          };

          const toneBadge = (relation: string) => {
            if (relation === 'Full Sibling') return 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
            if (relation === 'Half-Sibling (Shared Sire)') return 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
            return 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800';
          };

          return (
            <div className="bg-white dark:bg-card rounded-lg border border-slate-200/80 dark:border-border shadow-sm p-4 sm:p-5">
              <h4 className="text-[10px] font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-widest flex items-center justify-between border-b pb-2 border-slate-100 mb-3">
                <span>📊 Sibling Performance Analysis</span>
                <span className="font-mono px-2 py-0.5 rounded border text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800">
                  {relations.length} siblings
                </span>
              </h4>

              {/* THIS BIRD */}
              <div className="bg-emerald-50/80 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-900/50 rounded-md p-3 mb-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 bg-emerald-600 text-white rounded-sm flex items-center justify-center text-[9px] font-black">YOU</span>
                    <span className="text-xs font-black text-slate-800 dark:text-muted-foreground">{selectedFowlForDetails.name}</span>
                  </div>
                  {formatStats(thisBirdStats)}
                </div>
              </div>

              {/* SIBLING COMPARISON TABLE */}
              {siblingData.length > 0 && (
                <div className="overflow-x-auto mb-3">
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-border">
                        <th className="text-left py-2 font-bold text-muted-foreground uppercase tracking-wider">Sibling</th>
                        <th className="text-center py-2 font-bold text-muted-foreground uppercase tracking-wider">Type</th>
                        <th className="text-center py-2 font-bold text-muted-foreground uppercase tracking-wider">Fights</th>
                        <th className="text-center py-2 font-bold text-muted-foreground uppercase tracking-wider">W-L</th>
                        <th className="text-center py-2 font-bold text-muted-foreground uppercase tracking-wider">Win Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {siblingData.map((s) => (
                        <tr key={s.id} className="border-b border-slate-50 dark:border-border hover:bg-slate-50/50 dark:hover:bg-muted/50">
                          <td className="py-2 font-black text-slate-800 dark:text-card-foreground">
                            {(() => {
                              const target = fowls.find((f) => f.name.trim().toLowerCase() === s.name.trim().toLowerCase());
                              if (!target) return s.name;
                              return (
                                <button
                                  type="button"
                                  onClick={() => setSelectedFowlForDetails(target)}
                                  className="font-black text-emerald-700 dark:text-emerald-300 hover:underline underline-offset-2 cursor-pointer"
                                  title="Buksan ang profile ng sibling na ito"
                                >
                                  {s.name}
                                </button>
                              );
                            })()}
                          </td>
                          <td className="py-2 text-center">
                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${toneBadge(s.relation)}`}>
                              {s.relation === 'Full Sibling' ? 'Full' : s.relation === 'Half-Sibling (Shared Sire)' ? 'Sire-Half' : 'Dam-Half'}
                            </span>
                          </td>
                          <td className="py-2 text-center font-bold text-slate-600 dark:text-muted-foreground">{s.stats.total}</td>
                          <td className="py-2 text-center font-bold text-slate-600 dark:text-muted-foreground">{s.stats.wins}W-{s.stats.losses}L</td>
                          <td className="py-2 text-center">{formatStats(s.stats)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* BREEDING INSIGHT */}
              <div className="bg-slate-50 dark:bg-muted/50 border border-slate-200/60 dark:border-border rounded-md p-3 space-y-2">
                <p className="text-[9px] font-black text-slate-600 dark:text-muted-foreground uppercase tracking-widest">🧬 Breeding Insight</p>
                {bestSibling && bestSibling.stats.winRate > thisBirdStats.winRate ? (
                  <p className="text-[11px] text-slate-700 dark:text-card-foreground font-medium">
                    <strong className="text-emerald-700 dark:text-emerald-300">{bestSibling.name}</strong> has the best record among siblings at <strong className="text-emerald-700 dark:text-emerald-300">{bestSibling.stats.winRate}%</strong> win rate ({bestSibling.stats.wins}W-{bestSibling.stats.losses}L). Consider using its parent combination for future breeding.
                  </p>
                ) : worseSibling && worseSibling.stats.winRate < thisBirdStats.winRate && thisBirdStats.total > 0 ? (
                  <p className="text-[11px] text-slate-700 dark:text-card-foreground font-medium">
                    <strong className="text-emerald-700 dark:text-emerald-300">{selectedFowlForDetails.name}</strong> outperforms its siblings. This parent combination ({selectedFowlForDetails.sire} × {selectedFowlForDetails.dam}) is a strong breeding candidate.
                  </p>
                ) : thisBirdStats.total === 0 && siblingData.every((s) => s.stats.total === 0) ? (
                  <p className="text-[11px] text-muted-foreground font-medium">
                    No match data yet for any siblings. Log fights to see which parent combination performs best.
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-700 dark:text-card-foreground font-medium">
                    All siblings have similar performance. Track more fights to identify the strongest breeding line.
                  </p>
                )}
              </div>
            </div>
          );
        })()}

        {/* DEVELOPMENT TIMELINE & MILESTONES */}
        {(() => {
          const info = getMilestoneInfo(selectedFowlForDetails.birthdate, selectedFowlForDetails.gender);
          if (!info) return null;
          return (
            <div className="bg-white dark:bg-card rounded-lg border border-slate-200/80 dark:border-border shadow-sm p-4 sm:p-5">
              <h4 className="text-[10px] font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-widest flex items-center justify-between border-b pb-2 border-slate-100 mb-3">
                <span>📅 Development Timeline &amp; Calendar Milestones</span>
                <span className="font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">CURRENT: {info.current?.stage || '—'}</span>
              </h4>
              <div className="space-y-2">
                {info.stages.map((s) => {
                  const isCurrent = info.current?.id === s.id;
                  const isPast = info.parts.totalMonths >= s.toMonths;
                  const isNext = info.next !== null && info.next.id === s.id;
                  return (
                    <div key={s.id} className={`flex items-center gap-3 p-2.5 rounded-md border transition-all ${isCurrent ? 'bg-emerald-50 border-emerald-300 shadow-sm' : isPast ? 'bg-slate-50 dark:bg-muted/50 border-slate-100 dark:border-border opacity-60' : 'bg-white dark:bg-card border-slate-100 dark:border-border'}`}>
                      <span className={`w-8 h-8 rounded-sm flex items-center justify-center text-base shrink-0 ${isCurrent ? 'bg-emerald-600' : isPast ? 'bg-slate-200 dark:bg-muted' : 'bg-white dark:bg-card border border-slate-200 dark:border-border'}`}>{s.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-black ${isCurrent ? 'text-emerald-800 dark:text-emerald-300' : isPast ? 'text-muted-foreground' : 'text-slate-700 dark:text-card-foreground'}`}>
                          {s.stage} <span className="font-mono text-[9px] text-muted-foreground">({s.fromMonths}–{isFinite(s.toMonths) ? s.toMonths : '∞'} mo)</span>
                        </p>
                        <p className="text-[10px] text-muted-foreground font-medium truncate">{s.note}</p>
                      </div>
                      {isCurrent ? (
                        <span className="text-[9px] font-black uppercase text-success dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/50 px-2 py-1 rounded-full shrink-0">● Current</span>
                      ) : isPast ? (
                        <span className="text-[9px] font-bold text-muted-foreground shrink-0">✓ Reached</span>
                      ) : isNext && info.next ? (
                        <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full shrink-0 border ${info.next.daysUntil >= 0 ? 'text-amber-700 bg-amber-50 border-amber-200 dark:border-amber-800' : 'text-muted-foreground bg-slate-100 dark:bg-muted border-slate-200 dark:border-border'}`}>
                          {info.next.daysUntil >= 0 ? `Next · in ${info.next.daysUntil}d` : `Due · ${Math.abs(info.next.daysUntil)}d overdue`}
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              {info.next && (
                <p className="mt-3 text-[10px] text-muted-foreground bg-slate-50 dark:bg-muted/50 border border-slate-100 dark:border-border rounded-sm px-3 py-2 font-semibold">
                  🗓️ Next milestone: reach <span className="text-amber-700 dark:text-amber-300 font-black">{info.next.stage}</span> around <span className="text-slate-800 dark:text-card-foreground font-black">{info.next.date.toLocaleDateString()}</span>
                  {info.next.daysUntil >= 0 ? ` — in ${info.next.daysUntil} day${info.next.daysUntil === 1 ? '' : 's'}.` : ` (already ${Math.abs(info.next.daysUntil)} days past due).`}
                </p>
              )}
            </div>
          );
        })()}

        {/* COMBAT PERFORMANCE STATS VECTOR */}
        {(() => {
          const fowlMatches = matchHistory.filter(m => m.entry_name?.trim().toLowerCase() === selectedFowlForDetails.name?.trim().toLowerCase());
          const totalFights = fowlMatches.length;
          const wins = fowlMatches.filter(m => m.outcome && m.outcome.toLowerCase() === 'win').length;
          const losses = fowlMatches.filter(m => m.outcome && m.outcome.toLowerCase() === 'loss').length;
          const draws = fowlMatches.filter(m => m.outcome && m.outcome.toLowerCase() === 'draw').length;
          const decidedFights = wins + losses;
          const winRate = decidedFights > 0 
            ? Math.round((wins / decidedFights) * 100) 
            : totalFights > 0 
            ? Math.round((wins / totalFights) * 100) 
            : 0;

          return (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4 rounded-lg space-y-3 shadow-sm border border-slate-700/60">
                <h4 className="text-[10px] font-black text-success uppercase tracking-widest flex items-center justify-between border-b pb-2 border-slate-700/80">
                  <span>⚔️ Combat Analytics & Performance Vectors</span>
                  <span className="font-mono text-success bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">CHICKEN ID: #{selectedFowlForDetails.id}</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                  <div className="bg-slate-800/80 p-2.5 rounded-md border border-slate-700/60">
                    <span className="text-[9px] text-muted-foreground font-bold uppercase block">Total Fights</span>
                    <strong className="text-base text-white font-black">{totalFights}</strong>
                  </div>
                  <div className="bg-emerald-950/40 p-2.5 rounded-md border border-emerald-700/40">
                    <span className="text-[9px] text-success font-bold uppercase block">Wins</span>
                    <strong className="text-base text-success font-black">{wins} 🏆</strong>
                  </div>
                  <div className="bg-rose-950/40 p-2.5 rounded-md border border-rose-700/40">
                    <span className="text-[9px] text-danger font-bold uppercase block">Losses</span>
                    <strong className="text-base text-danger font-black">{losses} 💀</strong>
                  </div>
                  <div className="bg-amber-950/40 p-2.5 rounded-md border border-amber-700/40">
                    <span className="text-[9px] text-warning font-bold uppercase block">Draws</span>
                    <strong className="text-base text-warning font-black">{draws} 🤝</strong>
                  </div>
                  <div className="bg-teal-950/40 p-2.5 rounded-md border border-teal-700/40 col-span-2 sm:col-span-1">
                    <span className="text-[9px] text-teal-700 dark:text-teal-400 font-bold uppercase block">Per-Chicken Win Rate</span>
                    <strong className="text-base text-teal-700 dark:text-teal-400 font-black">{winRate}%</strong>
                    <span className="text-[8px] text-muted-foreground block font-mono font-semibold">{wins}W - {losses}L</span>
                  </div>
                </div>
              </div>

              {/* PER-RASA INDIVIDUAL BREAKDOWN */}
              {(() => {
                const breedMap = new Map<string, { fights: number; wins: number; losses: number; draws: number }>();
                fowlMatches.forEach(m => {
                  const breed = (m.opponent_breed || '').trim() || 'Unknown';
                  if (!breedMap.has(breed)) breedMap.set(breed, { fights: 0, wins: 0, losses: 0, draws: 0 });
                  const b = breedMap.get(breed)!;
                  b.fights++;
                  const o = (m.outcome || '').toLowerCase();
                  if (o === 'win') b.wins++;
                  else if (o === 'loss') b.losses++;
                  else if (o === 'draw') b.draws++;
                });
                const breeds = Array.from(breedMap.entries()).sort((a, b) => b[1].fights - a[1].fights);
                if (breeds.length === 0) return null;
                return (
                  <div className="bg-white dark:bg-card rounded-lg border border-slate-200 dark:border-border overflow-hidden shadow-2xs">
                    <div className="p-3 bg-slate-50 dark:bg-muted/50 border-b border-slate-200/80 dark:border-border">
                      <h4 className="text-[11px] font-black text-slate-700 dark:text-card-foreground uppercase tracking-wider">🏆 Individual Per-Rasa Performance ({breeds.length} breed{breeds.length > 1 ? 's' : ''} faced)</h4>
                      <p className="text-[9px] text-muted-foreground font-semibold mt-0.5">Win / Loss breakdown against each opponent breed — specific to this chicken only.</p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-0 divide-x divide-y divide-slate-100">
                      {breeds.map(([breed, stats]) => {
                        const decided = stats.wins + stats.losses;
                        const wr = decided > 0 ? Math.round((stats.wins / decided) * 100) : 0;
                        const tone = wr >= 70 ? 'emerald' : wr >= 40 ? 'amber' : 'rose';
                        return (
                          <div key={breed} className="p-3 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black text-slate-800 dark:text-card-foreground uppercase">{breed}</span>
                              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                                tone === 'emerald' ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : tone === 'amber' ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                              }`}>{wr}%</span>
                            </div>
                            <div className="flex gap-2 text-[9px] font-bold">
                              <span className="text-success dark:text-emerald-300">{stats.wins}W</span>
                              <span className="text-danger dark:text-rose-300">{stats.losses}L</span>
                              {stats.draws > 0 && <span className="text-warning dark:text-amber-300">{stats.draws}D</span>}
                              <span className="text-muted-foreground">{stats.fights} total</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 dark:bg-muted rounded-full overflow-hidden flex">
                              {decided > 0 && <div className={`h-full ${tone === 'emerald' ? 'bg-emerald-500' : tone === 'amber' ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${wr}%` }} />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* DEDICATED INDIVIDUAL MATCH LOG TABLE */}
              <div className="bg-white dark:bg-card rounded-lg border border-slate-200 dark:border-border overflow-hidden shadow-2xs">
                <div className="p-3 bg-slate-50 dark:bg-muted/50 border-b border-slate-200/80 dark:border-border flex justify-between items-center">
                  <h4 className="text-[11px] font-black text-slate-700 dark:text-card-foreground uppercase tracking-wider">Individual Fight History Logs ({totalFights})</h4>
                  <span className="text-[9px] font-mono font-bold bg-slate-200 dark:bg-muted text-slate-700 dark:text-card-foreground px-2 py-0.5 rounded">MATCH LOG PARITY</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-slate-100/70 dark:bg-muted/50 text-muted-foreground font-extrabold uppercase border-b border-slate-200 dark:border-border">
                        <th className="p-2.5 pl-4">Match Date</th>
                        <th className="p-2.5">Opponent Entry</th>
                        <th className="p-2.5">Rasa</th>
                        <th className="p-2.5">Arena Location</th>
                        <th className="p-2.5">Match Type</th>
                        <th className="p-2.5 text-center">Outcome</th>
                        <th className="p-2.5 text-center">🩺 Post-Fight</th>
                        <th className="p-2.5 text-center">Video</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-border text-slate-600 dark:text-muted-foreground font-semibold">
                      {fowlMatches.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-6 text-center text-muted-foreground text-xs">
                            No derby performance logs recorded for this specific chicken node.
                          </td>
                        </tr>
                      ) : (
                        fowlMatches.map(match => (
                          <tr key={match.id} className="hover:bg-slate-50/80 dark:hover:bg-muted/50 transition-colors">
                            <td className="p-2.5 pl-4 font-mono text-[10px] text-muted-foreground">{match.date}</td>
                            <td className="p-2.5 font-bold text-slate-800 dark:text-card-foreground">{match.opponent}</td>
                            <td className="p-2.5 text-slate-600 dark:text-muted-foreground font-semibold">{match.opponent_breed || '—'}</td>
                            <td className="p-2.5 text-slate-600 dark:text-muted-foreground">{match.location}</td>
                            <td className="p-2.5"><span className="bg-slate-100 dark:bg-muted border border-slate-200 dark:border-border text-slate-700 dark:text-card-foreground text-[9px] font-bold px-2 py-0.5 rounded-full">{match.type}</span></td>
                            <td className="p-2.5 text-center">
                              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                                match.outcome.toLowerCase() === 'win' 
                                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' 
                                  : match.outcome.toLowerCase() === 'loss' 
                                  ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800' 
                                  : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                              }`}>
                                {match.outcome}
                              </span>
                            </td>
                            <td className="p-2.5 text-center">
                              {match.post_fight_condition ? (
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border whitespace-nowrap ${
                                  (match.post_fight_condition || '').toLowerCase().includes('deceased')
                                    ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                                    : (match.post_fight_condition || '').toLowerCase().includes('critical') || (match.post_fight_condition || '').toLowerCase().includes('severely')
                                    ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                    : 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800'
                                }`}>
                                  {(match.post_fight_condition || '').toLowerCase().includes('deceased') ? '💀 ' : (match.post_fight_condition || '').toLowerCase().includes('critical') || (match.post_fight_condition || '').toLowerCase().includes('severely') ? '🟠 ' : '🟢 '}{match.post_fight_condition}
                                </span>
                              ) : (
                                <span className="text-[9px] text-muted-foreground font-bold">—</span>
                              )}
                            </td>
                            <td className="p-2.5 text-center">
                              {match.video_url ? (
                                <a href={match.video_url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-black text-success dark:text-emerald-300 hover:text-emerald-800 underline underline-offset-2">▶ PLAY</a>
                              ) : (
                                <span className="text-[9px] text-muted-foreground font-bold">—</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })()}

        <div className="space-y-3 bg-slate-50/50 dark:bg-muted/50 p-4 rounded-lg border border-slate-100 dark:border-border">
          <h4 className="text-[11px] font-black text-muted-foreground uppercase tracking-widest border-b pb-2">Lineage Integration Balance</h4>
          
          {(() => {
            const selGen = generationOf(selectedFowlForDetails);
            const selInfo = generationInfo(selGen);
            return (
              <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/40 dark:to-emerald-950/40 border border-teal-100 dark:border-teal-900/50 rounded-md px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-[9px] font-black text-teal-700 dark:text-teal-300 uppercase tracking-wider">🧬 Breeding Generation</p>
                  <p className="text-[10px] font-bold text-muted-foreground truncate">{selInfo.label} · {selInfo.desc}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-lg font-black text-teal-700 dark:text-teal-300">{generationPurity(selGen)}%</span>
                  <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-wide">Generational Purity</p>
                </div>
              </div>
            );
          })()}
          
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span>♂ Sire Heritage Weight</span>
                {(() => {
                  const sireName = (selectedFowlForDetails.sire || '').trim();
                  const sireLower = sireName.toLowerCase();
                  const isFoundation = sireLower === 'foundation stock' || !sireLower;
                  const isRegistered = !isFoundation && fowls.some((f) => f.name.trim().toLowerCase() === sireLower);
                  return (
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase ${isRegistered ? 'bg-sky-100 text-sky-700 border border-sky-200 dark:border-sky-800' : isFoundation ? 'bg-slate-100 dark:bg-muted text-muted-foreground border border-slate-200 dark:border-border' : 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'}`}>
                      {isRegistered ? '✓ Registered' : isFoundation ? 'Foundation' : 'External'}
                    </span>
                  );
                })()}
              </span>
              <span className="text-slate-800 dark:text-card-foreground">{cleanPct(selectedFowlForDetails.sire_pct)}% · {(() => {
                const name = selectedFowlForDetails.sire || '';
                const target = name.trim() && name.trim().toLowerCase() !== 'foundation stock'
                  ? fowls.find((f) => f.name.trim().toLowerCase() === name.trim().toLowerCase())
                  : undefined;
                return target ? (
                  <button
                    type="button"
                    onClick={() => setSelectedFowlForDetails(target)}
                    className="text-sky-700 dark:text-sky-300 font-bold hover:underline underline-offset-2 cursor-pointer"
                    title="Buksan ang Sire profile"
                  >
                    {name}
                  </button>
                ) : <span className="text-slate-600 dark:text-muted-foreground">{name || '—'}</span>;
              })()}</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-muted h-2 rounded-full overflow-hidden">
              <div className="bg-sky-500 h-full rounded-full" style={{ width: `${cleanPct(selectedFowlForDetails.sire_pct)}%` }}></div>
            </div>
          </div>

          <div className="space-y-1 pt-1">
            <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span>♀ Dam Heritage Weight</span>
                {(() => {
                  const damName = (selectedFowlForDetails.dam || '').trim();
                  const damLower = damName.toLowerCase();
                  const isFoundation = damLower === 'foundation stock' || !damLower;
                  const isRegistered = !isFoundation && fowls.some((f) => f.name.trim().toLowerCase() === damLower);
                  return (
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase ${isRegistered ? 'bg-pink-100 text-pink-700 border border-pink-200 dark:border-pink-800' : isFoundation ? 'bg-slate-100 dark:bg-muted text-muted-foreground border border-slate-200 dark:border-border' : 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'}`}>
                      {isRegistered ? '✓ Registered' : isFoundation ? 'Foundation' : 'External'}
                    </span>
                  );
                })()}
              </span>
              <span className="text-slate-800 dark:text-card-foreground">{cleanPct(selectedFowlForDetails.dam_pct)}% · {(() => {
                const name = selectedFowlForDetails.dam || '';
                const target = name.trim() && name.trim().toLowerCase() !== 'foundation stock'
                  ? fowls.find((f) => f.name.trim().toLowerCase() === name.trim().toLowerCase())
                  : undefined;
                return target ? (
                  <button
                    type="button"
                    onClick={() => setSelectedFowlForDetails(target)}
                    className="text-pink-700 dark:text-pink-300 font-bold hover:underline underline-offset-2 cursor-pointer"
                    title="Buksan ang Dam profile"
                  >
                    {name}
                  </button>
                ) : <span className="text-slate-600 dark:text-muted-foreground">{name || '—'}</span>;
              })()}</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-muted h-2 rounded-full overflow-hidden">
              <div className="bg-pink-500 h-full rounded-full" style={{ width: `${cleanPct(selectedFowlForDetails.dam_pct)}%` }}></div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200/50 dark:border-border flex justify-between items-center text-[11px]">
            <span className="font-extrabold text-slate-700 dark:text-card-foreground">Specific Bloodline %</span>
            <span className="font-mono font-black text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 px-2.5 py-0.5 rounded-full">
              {bloodlineOf(selectedFowlForDetails)}%
            </span>
          </div>

          {(() => {
            const ps = pairingAnalytics.all.get(`${(selectedFowlForDetails.sire || '').trim().toLowerCase()}|||${(selectedFowlForDetails.dam || '').trim().toLowerCase()}`);
            if (!ps) return null;
            return (
              <div className="pt-2 border-t border-slate-200/50 dark:border-border flex justify-between items-center text-[11px] gap-2">
                <span className="font-extrabold text-slate-700 dark:text-card-foreground min-w-0 truncate">🔗 Pairing Performance ({ps.sire} × {ps.dam})</span>
                <span className={`font-mono font-black px-2.5 py-0.5 rounded-full border shrink-0 ${ps.totalFights > 0 ? (ps.winRate >= 50 ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' : 'bg-rose-50 text-rose-700 border-rose-200/60') : 'bg-slate-100 dark:bg-muted text-muted-foreground border-slate-200 dark:border-border'}`}>
                  {ps.totalFights > 0 ? `${ps.winRate}% · ${ps.wins}W-${ps.losses}L` : 'No match data'}
                </span>
              </div>
            );
          })()}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-slate-50 dark:bg-muted/50 p-3 rounded-md border border-slate-100 dark:border-border">
            <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">Structural Weight</span>
            <strong className="text-slate-800 dark:text-card-foreground text-xs mt-0.5 block">{selectedFowlForDetails.weight ? `${weightFromStorage(selectedFowlForDetails.weight, unitPrefs.weightUnit)} ${weightUnitLabel(unitPrefs.weightUnit)}` : 'N/A'}</strong>
          </div>
          <div className="bg-slate-50 dark:bg-muted/50 p-3 rounded-md border border-slate-100 dark:border-border">
            <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">Height Dimension</span>
            <strong className="text-slate-800 dark:text-card-foreground text-xs mt-0.5 block">{selectedFowlForDetails.height ? `${heightFromStorage(selectedFowlForDetails.height, unitPrefs.heightUnit)} ${heightUnitLabel(unitPrefs.heightUnit)}` : 'N/A'}</strong>
          </div>
          <div className="bg-slate-50 dark:bg-muted/50 p-3 rounded-md border border-slate-100 dark:border-border">
            <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">Eye Specimen Variant</span>
            <strong className="text-slate-800 dark:text-card-foreground text-xs mt-0.5 block">{selectedFowlForDetails.eye_variant || 'Standard Eye'}</strong>
          </div>
          <div className="bg-slate-50 dark:bg-muted/50 p-3 rounded-md border border-slate-100 dark:border-border">
            <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">Visual Color Range</span>
            <strong className="text-slate-800 dark:text-card-foreground text-xs mt-0.5 block">{selectedFowlForDetails.color_category} ({selectedFowlForDetails.color})</strong>
          </div>
          <div className="bg-slate-50 dark:bg-muted/50 p-3 rounded-md border border-slate-100 dark:border-border sm:col-span-2">
            <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">Behavioral Spec</span>
            <strong className="text-emerald-700 dark:text-emerald-300 text-xs mt-0.5 block font-bold">{selectedFowlForDetails.behavior_trait}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
