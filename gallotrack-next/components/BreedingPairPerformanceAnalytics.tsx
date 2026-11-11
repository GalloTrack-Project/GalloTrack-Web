'use client';

import React from 'react';
import { Link2, Medal, Skull, Stethoscope } from 'lucide-react';
import { useT } from '@/lib/i18n';
import type { PairingStats } from '@/lib/types';

export default function BreedingPairPerformanceAnalytics({
  ranked,
}: {
  ranked: PairingStats[];
}) {
  const { t } = useT();

  if (ranked.length === 0) return null;

  return (
    <div
      className="bg-card rounded-lg border border-border shadow-sm overflow-hidden"
      data-testid="breeding-pair-analytics"
    >
      <div className="p-5 border-b border-border bg-muted/30 flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Link2 className="w-4 h-4 text-success" />
          </span>
          <div>
            <h3 className="text-sm font-black text-card-foreground tracking-tight">
              {t('breedingPairAnalytics.title')}
            </h3>
            <p className="text-sm text-muted-foreground font-semibold mt-0.5">
              {t('breedingPairAnalytics.subtitle')}
            </p>
          </div>
        </div>
        <span className="text-sm font-mono bg-emerald-500/10 text-success border border-emerald-500/20 font-black px-3 py-1 rounded-full hidden sm:inline">
          {t('breedingPairAnalytics.badge')}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse min-w-[860px]">
          <thead>
            <tr className="bg-muted/50 text-muted-foreground font-extrabold uppercase border-b border-border">
              <th className="p-4 pl-6">Rank</th>
              <th className="p-4">{t('breedingPairAnalytics.columnCross')}</th>
              <th className="p-4 text-center">Offspring</th>
              <th className="p-4 text-center">Fights</th>
              <th className="p-4 text-center">Wins</th>
              <th className="p-4 text-center">Losses</th>
              <th className="p-4 text-center">Win Rate</th>
              <th className="p-4 text-center">Survivability</th>
              <th className="p-4 text-center pr-6">Breeding Verdict</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-muted-foreground font-semibold">
            {ranked.map((pair, index) => {
              const elite = pair.decided >= 5 && pair.winRate >= 70;
              const solid = pair.winRate >= 50;
              const weak = pair.decided >= 5 && pair.winRate < 50;
              return (
                <tr
                  key={pair.key}
                  className={`hover:bg-muted/30 transition-colors ${
                    weak ? 'bg-rose-500/5' : elite ? 'bg-emerald-500/5' : ''
                  }`}
                >
                  <td className="p-4 pl-6 whitespace-nowrap">
                    {index === 0 ? (
                      <Medal className="w-4 h-4 text-warning" />
                    ) : index === 1 ? (
                      <Medal className="w-4 h-4 text-muted-foreground" />
                    ) : index === 2 ? (
                      <Medal className="w-4 h-4 text-amber-700" />
                    ) : (
                      <span className="font-mono font-black text-muted-foreground">
                        #{index + 1}
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                        <Link2 className="w-3.5 h-3.5 text-success" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-card-foreground">
                          {t('breedingPairAnalytics.pairLabel', {
                            cock: pair.sire,
                            hen: pair.dam,
                          })}
                        </p>
                        <p className="text-sm font-semibold text-muted-foreground truncate">
                          {pair.members.map((member) => member.name).join(', ')}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-center font-mono font-bold">{pair.members.length}</td>
                  <td className="p-4 text-center font-mono font-bold">{pair.totalFights}</td>
                  <td className="p-4 text-center font-mono font-extrabold text-success">
                    {pair.wins}
                  </td>
                  <td className="p-4 text-center font-mono font-extrabold text-danger">
                    {pair.losses}
                  </td>
                  <td className="p-4 text-center font-mono">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full font-black text-sm ${
                        pair.winRate >= 50
                          ? 'bg-emerald-500/15 text-success'
                          : 'bg-rose-500/15 text-danger'
                      }`}
                    >
                      {pair.winRate}%
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full font-black text-sm ${
                          pair.resilienceScore >= 80
                            ? 'bg-teal-500/15 text-teal'
                            : pair.resilienceScore >= 60
                              ? 'bg-amber-500/15 text-warning'
                              : 'bg-rose-500/15 text-danger'
                        }`}
                      >
                        <Stethoscope className="w-3 h-3 inline mr-1" />
                        {pair.resilienceScore > 0 ? `${pair.resilienceScore}%` : 'N/A'}
                      </span>
                      {pair.casualties > 0 && (
                        <span
                          title={`${pair.casualties} deceased + ${pair.critical} critical from injuries`}
                          className="text-sm font-black text-danger bg-rose-500/10 border border-rose-500/20 rounded-full px-2 py-0.5 whitespace-nowrap flex items-center gap-1"
                        >
                          <Skull className="w-3 h-3" /> {pair.casualties}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-center pr-6">
                    <div className="flex flex-col items-center gap-1">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full font-black text-sm uppercase tracking-wider border whitespace-nowrap ${
                          elite
                            ? 'bg-emerald-500/15 text-success border-emerald-500/30'
                            : solid
                              ? 'bg-sky-500/15 text-info border-sky-500/30'
                              : weak
                                ? 'bg-rose-500/15 text-danger border-rose-500/30'
                                : 'bg-muted text-muted-foreground border-border'
                        }`}
                      >
                        {elite
                          ? 'Elite — Repeat Cross'
                          : solid
                            ? 'Solid Pairing'
                            : weak
                              ? 'Under-Performing'
                              : 'Inconclusive'}
                      </span>
                      <span
                        className={`text-sm font-bold px-1.5 py-0.5 rounded-full ${
                          pair.verdictConfidence === 'High'
                            ? 'bg-emerald-500/10 text-success'
                            : pair.verdictConfidence === 'Medium'
                              ? 'bg-amber-500/10 text-warning'
                              : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {pair.verdictConfidence} Confidence
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-6 py-3.5 border-t border-border bg-muted/30 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm font-bold text-muted-foreground">
        <span>Verdict logic:</span>
        <span className="text-success">Elite = ≥70% win rate with 5+ decided fights</span>
        <span className="text-info">Solid = ≥50%</span>
        <span className="text-danger">Avoid = below 50% with 5+ decided fights</span>
        <span className="text-teal">
          Survivability = post-fight condition resilience (Fit=100 · Critical=30 · Deceased=0)
        </span>
        <span className="text-warning">Confidence = Low (&lt;5 fights) · Medium (5-9) · High (10+)</span>
        <span className="ml-auto">
          Focus future breeding cycles strictly on high-performing, resilient bloodlines.
        </span>
      </div>
    </div>
  );
}
