'use client';
import React, { useState } from 'react';
import type { FowlRecord } from '@/lib/types';
import { useGaloTrack } from '@/lib/context';
import { isFemale } from '@/lib/helpers';
import { Dna, BarChart3, Zap, Lightbulb } from 'lucide-react';
import ChickenIcon from '@/components/ChickenIcon';

type Props = { fowl: FowlRecord; compact?: boolean };

function TierBadge({ tier }: { tier: string }) {
  const cls =
    tier === 'S'
      ? 'bg-amber-400 text-amber-900'
      : tier === 'A'
        ? 'bg-emerald-500 text-white'
        : tier === 'B'
          ? 'bg-sky-500 text-white'
          : 'bg-slate-400 text-white';
  return <span className={`rounded px-1.5 py-0.5 text-xs font-black ${cls}`}>{tier}</span>;
}

export default function BloodlineReportCard({ fowl, compact = false }: Props) {
  const { generateBloodlineReport } = useGaloTrack();
  const [expanded, setExpanded] = useState(false);
  const report = generateBloodlineReport(fowl);
  const isDamRecord = isFemale(fowl.gender) || fowl.registry_role === 'Breeding Female';

  if (compact) {
    return (
      <div className="space-y-2 rounded-lg border border-teal-200 bg-gradient-to-r from-teal-50 to-emerald-50 p-3 dark:border-teal-900/50 dark:from-teal-950/40 dark:to-emerald-950/40">
        <div className="flex items-center justify-between gap-2">
          <span className="text-teal text-xs font-black tracking-widest uppercase">
            <Dna className="h-3 w-3" /> Bloodline
          </span>
          <div className="flex items-center gap-1.5">
            {report.crossPattern && <TierBadge tier={report.crossPattern.tier} />}
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-black ${report.strainType === 'purebred' ? 'bg-sky-100 text-sky-700 dark:text-sky-300' : report.strainType === 'crossbred' ? 'text-violet bg-violet-100' : report.strainType === 'linebred' ? 'bg-amber-100 text-amber-700 dark:text-amber-300' : 'dark:bg-muted dark:text-card-foreground bg-slate-100 text-slate-600'}`}
            >
              {report.strainType.toUpperCase()}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <p className="text-muted-foreground text-xs font-bold uppercase">Strain</p>
            <p className="dark:text-card-foreground text-xs font-black text-slate-800">
              {report.primaryStrain}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-bold uppercase">Purity</p>
            <p className="text-teal text-xs font-black">{report.purityPct}%</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-bold uppercase">Vigor</p>
            <p className="text-xs font-black text-emerald-700 dark:text-emerald-300">
              {report.hybridVigor?.label === '—' ? '—' : report.hybridVigor.score}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-bold uppercase">Kinship</p>
            <p
              className={`text-xs font-black ${
                report.relatedness?.type === 'close'
                  ? 'text-amber-600 dark:text-amber-400'
                  : report.relatedness?.type === 'line'
                    ? 'text-blue-600 dark:text-blue-400'
                    : report.relatedness?.type === 'outcross'
                      ? 'text-success dark:text-emerald-300'
                      : 'text-muted-foreground'
              }`}
              title={report.relatedness?.tooltip}
            >
              {report.relatedness?.type === 'close'
                ? 'Close'
                : report.relatedness?.type === 'line'
                  ? 'Line'
                  : report.relatedness?.type === 'outcross'
                    ? 'Outcross'
                    : '—'}
            </p>
          </div>
        </div>
        {report.crossPattern && (
          <p className="text-teal text-center text-xs font-semibold">
            {report.crossPattern.label}
            {!isDamRecord && report.crossPattern.fightingStyle
              ? ` — ${report.crossPattern.fightingStyle}`
              : ''}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-teal-200 bg-gradient-to-br from-teal-50 to-emerald-50 p-4 dark:border-teal-900/50 dark:from-teal-950/40 dark:to-emerald-950/40">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-teal text-xs font-black tracking-widest uppercase">
            <Dna className="h-3 w-3" /> Bloodline Report
          </span>
          {report.crossPattern && <TierBadge tier={report.crossPattern.tier} />}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-teal hover:text-teal dark:hover:text-teal cursor-pointer text-xs font-bold"
        >
          {expanded ? '▲ Less' : '▼ Details'}
        </button>
      </div>

      {/* Summary Grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <div className="dark:bg-card/70 rounded-md border border-teal-100 bg-white/70 p-2 text-center dark:border-teal-900/50">
          <p className="text-muted-foreground text-xs font-bold uppercase">Type</p>
          <p
            className={`text-xs font-black ${report.strainType === 'purebred' ? 'text-sky-700 dark:text-sky-300' : report.strainType === 'crossbred' ? 'text-violet' : report.strainType === 'linebred' ? 'text-amber-700 dark:text-amber-300' : 'dark:text-card-foreground text-slate-600'}`}
          >
            {report.strainType.toUpperCase()}
          </p>
        </div>
        <div className="dark:bg-card/70 rounded-md border border-teal-100 bg-white/70 p-2 text-center dark:border-teal-900/50">
          <p className="text-muted-foreground text-xs font-bold uppercase">Strain</p>
          <p className="dark:text-card-foreground text-xs font-black text-slate-800">
            {report.primaryStrain}
          </p>
        </div>
        <div className="dark:bg-card/70 rounded-md border border-teal-100 bg-white/70 p-2 text-center dark:border-teal-900/50">
          <p className="text-muted-foreground text-xs font-bold uppercase">Generation</p>
          <p className="text-teal text-xs font-black">{report.generationLabel}</p>
        </div>
        <div className="dark:bg-card/70 rounded-md border border-teal-100 bg-white/70 p-2 text-center dark:border-teal-900/50">
          <p className="text-muted-foreground text-xs font-bold uppercase">Purity</p>
          <p className="text-teal text-xs font-black">{report.purityPct}%</p>
        </div>
        <div className="dark:bg-card/70 rounded-md border border-teal-100 bg-white/70 p-2 text-center dark:border-teal-900/50">
          <p className="text-muted-foreground text-xs font-bold uppercase">Parentage</p>
          <p
            className={`text-xs font-black ${
              report.relatedness?.type === 'close'
                ? 'text-amber-600 dark:text-amber-400'
                : report.relatedness?.type === 'line'
                  ? 'text-blue-600 dark:text-blue-400'
                  : report.relatedness?.type === 'outcross'
                    ? 'text-success dark:text-emerald-300'
                    : 'text-muted-foreground'
            }`}
            title={report.relatedness?.tooltip}
          >
            {report.relatedness?.type === 'unknown'
              ? 'Unknown (foundation stock, no recorded parents)'
              : report.relatedness?.label || 'Unknown (foundation stock, no recorded parents)'}
          </p>
          <p
            className="text-muted-foreground truncate text-xs"
            title={report.relatedness?.relationship}
          >
            {report.relatedness?.relationship || 'Foundation stock (no recorded parents)'}
          </p>
        </div>
      </div>

      {/* Cross Pattern */}
      {report.crossPattern && (
        <div className="dark:bg-card/70 space-y-1 rounded-md border border-violet-200 bg-white/70 p-3 dark:border-violet-900/50">
          <div className="flex items-center justify-between">
            <span className="text-violet text-xs font-black uppercase">
              {report.crossPattern.label}
            </span>
            <div className="flex items-center gap-2">
              <TierBadge tier={report.crossPattern.tier} />
              <span className="text-success text-xs font-bold dark:text-emerald-300">
                +{report.crossPattern.winRateBonus}% win rate
              </span>
            </div>
          </div>
          <p className="text-muted-foreground text-xs">{report.crossPattern.description}</p>
          {!isDamRecord && report.crossPattern.fightingStyle && (
            <p className="text-violet text-xs font-semibold">
              Fighting style: {report.crossPattern.fightingStyle}
            </p>
          )}
        </div>
      )}

      {/* Performance Benchmark */}
      {report.performanceBenchmark &&
        (report.performanceBenchmark.totalFights > 0 ||
          report.performanceBenchmark.avgWinRate !== null) && (
          <div className="dark:bg-card/70 space-y-2 rounded-md border border-sky-200 bg-white/70 p-3 dark:border-sky-900/50">
            <p className="text-xs font-black text-sky-700 uppercase dark:text-sky-300">
              <BarChart3 className="h-3 w-3" /> Strain Performance Benchmark
            </p>
            <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
              <div>
                <p className="text-muted-foreground text-xs font-bold">Structural Weight</p>
                <p className="dark:text-card-foreground text-xs font-black text-slate-800">
                  {(() => {
                    const regWeight =
                      fowl.structural_weight !== undefined &&
                      fowl.structural_weight !== null &&
                      fowl.structural_weight !== ''
                        ? fowl.structural_weight
                        : fowl.weight;
                    if (!regWeight) return 'N/A';
                    const clean = String(regWeight)
                      .replace(/\s*kg$/i, '')
                      .trim();
                    return clean ? `${clean}kg` : 'N/A';
                  })()}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-bold">Win Rate</p>
                <p className="text-xs font-black text-sky-700 dark:text-sky-300">
                  {report.performanceBenchmark.avgWinRate !== null
                    ? `${report.performanceBenchmark.avgWinRate}%`
                    : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-bold">Fights Tracked</p>
                <p className="text-xs font-black text-sky-700 dark:text-sky-300">
                  {report.performanceBenchmark.totalFights}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-bold">Avg Weight</p>
                <p className="text-xs font-black text-sky-700 dark:text-sky-300">
                  {report.performanceBenchmark.avgWeight}kg
                </p>
              </div>
            </div>
            {report.performanceBenchmark.topPerformers.length > 0 && (
              <p className="text-info text-xs dark:text-sky-300">
                Top performers: {report.performanceBenchmark.topPerformers.join(', ')}
              </p>
            )}
          </div>
        )}

      {/* Hybrid Vigor Bar */}
      {report.hybridVigor?.label !== '—' && (
        <div className="dark:bg-card/70 space-y-2 rounded-md border border-emerald-200 bg-white/70 p-3 dark:border-emerald-900/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-emerald-700 uppercase dark:text-emerald-300">
              <Zap className="h-3 w-3" /> Hybrid Vigor
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-black ${
                report.hybridVigor.score >= 90
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                  : report.hybridVigor.score >= 80
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                    : report.hybridVigor.score >= 70
                      ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300'
                      : report.hybridVigor.score >= 50
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                        : 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300'
              }`}
            >
              {report.hybridVigor.label} ({report.hybridVigor.score}/100)
            </span>
          </div>
          <div className="dark:bg-muted h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all ${
                report.hybridVigor.score >= 90
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                  : report.hybridVigor.score >= 80
                    ? 'bg-emerald-500'
                    : report.hybridVigor.score >= 70
                      ? 'bg-sky-500'
                      : report.hybridVigor.score >= 50
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
              }`}
              style={{ width: `${report.hybridVigor.score}%` }}
            />
          </div>
        </div>
      )}

      {/* Expanded Details */}
      {expanded && (
        <div className="animate-fadeIn space-y-3">
          {/* Sire / Dam Strains */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md border border-sky-200 bg-sky-50 p-2 dark:border-sky-900/50 dark:bg-sky-950/40">
              <p className="text-info text-xs font-black uppercase dark:text-sky-300">
                <ChickenIcon className="h-3 w-3" /> Sire Strain
              </p>
              <p className="dark:text-card-foreground text-xs font-bold text-slate-800">
                {report.sireStrain}
              </p>
            </div>
            <div className="rounded-md border border-pink-200 bg-pink-50 p-2 dark:border-pink-900/50 dark:bg-pink-950/40">
              <p className="text-pink text-xs font-black uppercase">
                <ChickenIcon className="h-3 w-3" /> Dam Strain
              </p>
              <p className="dark:text-card-foreground text-xs font-bold text-slate-800">
                {report.damStrain}
              </p>
            </div>
          </div>

          {/* Vigor Factors */}
          {report.hybridVigor?.label !== '—' && report.hybridVigor.factors.length > 0 && (
            <div className="dark:bg-card/70 dark:border-border space-y-1 rounded-md border border-slate-200 bg-white/70 p-3">
              <p className="text-muted-foreground text-xs font-black uppercase">Vigor Factors</p>
              {report.hybridVigor.factors.map((f, i) => (
                <p key={i} className="dark:text-card-foreground text-xs text-slate-600">
                  • {f}
                </p>
              ))}
            </div>
          )}

          {/* Heritability */}
          <div className="dark:bg-card/70 space-y-2 rounded-md border border-indigo-200 bg-white/70 p-3 dark:border-indigo-900/50">
            <div className="flex items-center justify-between">
              <span className="text-indigo text-xs font-black uppercase">Heritability</span>
              <span className="text-indigo text-xs font-black">
                {report.heritability.overall}/100 — {report.heritability.label}
              </span>
            </div>
            <div className="dark:bg-muted h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-indigo-500"
                style={{ width: `${report.heritability.overall}%` }}
              />
            </div>
            {report.heritability.factors.length > 0 && (
              <div className="space-y-0.5">
                {report.heritability.factors.map((f, i) => (
                  <p key={i} className="text-muted-foreground text-xs">
                    • {f}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Color Report */}
          {report.colorReport && (
            <div className="dark:bg-card/70 space-y-2 rounded-md border border-amber-200 bg-white/70 p-3 dark:border-amber-900/50">
              <p className="text-xs font-black text-amber-700 uppercase dark:text-amber-300">
                Color Genetics
              </p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground font-bold">Leg Color</p>
                  <p className="dark:text-card-foreground font-semibold text-slate-700">
                    {report.colorReport.legColor?.name || 'Unknown'}
                  </p>
                  {report.colorReport.legColor && (
                    <p className="text-muted-foreground">{report.colorReport.legColor.dominance}</p>
                  )}
                </div>
                <div>
                  <p className="text-muted-foreground font-bold">Plumage</p>
                  <p className="dark:text-card-foreground font-semibold text-slate-700">
                    {report.colorReport.plumageColor}
                  </p>
                  <p className="text-muted-foreground">{report.colorReport.plumagePattern}</p>
                </div>
                <div>
                  <p className="text-muted-foreground font-bold">Complement</p>
                  <p className="dark:text-card-foreground text-xs font-semibold text-slate-700">
                    {report.colorReport.colorComplement}
                  </p>
                </div>
              </div>
              {report.colorReport.inheritance &&
                report.colorReport.inheritance.notes.length > 0 && (
                  <div className="space-y-0.5">
                    {report.colorReport.inheritance.notes.map((n, i) => (
                      <p key={i} className="text-warning text-xs dark:text-amber-300">
                        • {n}
                      </p>
                    ))}
                  </div>
                )}
              {report.colorReport.inheritance &&
                report.colorReport.inheritance.probabilityTable.length > 0 && (
                  <div className="space-y-0.5">
                    <p className="text-muted-foreground text-xs font-bold">
                      Offspring Probability:
                    </p>
                    {report.colorReport.inheritance.probabilityTable.map((p, i) => (
                      <p key={i} className="dark:text-card-foreground text-xs text-slate-600">
                        {' '}
                        {p.phenotype}: <span className="font-black">{p.probability}%</span>
                      </p>
                    ))}
                  </div>
                )}
            </div>
          )}

          {/* Breed Compliance */}
          {report.breedCompliance && report.breedCompliance.matchedStandard && (
            <div className="dark:bg-card/70 space-y-2 rounded-md border border-sky-200 bg-white/70 p-3 dark:border-sky-900/50">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black text-sky-700 uppercase dark:text-sky-300">
                  Breed Compliance
                </p>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-black ${
                      report.breedCompliance.complianceGrade.startsWith('A')
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                        : report.breedCompliance.complianceGrade.startsWith('B')
                          ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                    }`}
                  >
                    {report.breedCompliance.complianceGrade}
                  </span>
                  <span className="text-xs font-black text-sky-700 dark:text-sky-300">
                    {report.breedCompliance.overallScore}/100
                  </span>
                </div>
              </div>
              <p className="text-muted-foreground text-xs">
                Standard: {report.breedCompliance.matchedStandard.name} (
                {report.breedCompliance.matchedStandard.origin})
              </p>
              <div className="grid grid-cols-4 gap-1 text-xs">
                <div>
                  <p className="text-muted-foreground font-bold">Weight</p>
                  <p
                    className={
                      report.breedCompliance.weightCompliance.status === 'within'
                        ? 'text-success font-semibold dark:text-emerald-300'
                        : 'text-warning font-semibold dark:text-amber-300'
                    }
                  >
                    {report.breedCompliance.weightCompliance.actual}kg
                    <span className="text-muted-foreground block">
                      {report.breedCompliance.weightCompliance.status} (
                      {report.breedCompliance.weightCompliance.deviation}%)
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground font-bold">Height</p>
                  <p
                    className={
                      report.breedCompliance.heightCompliance.status === 'within'
                        ? 'text-success font-semibold dark:text-emerald-300'
                        : 'text-warning font-semibold dark:text-amber-300'
                    }
                  >
                    {report.breedCompliance.heightCompliance.actual}cm
                    <span className="text-muted-foreground block">
                      {report.breedCompliance.heightCompliance.status} (
                      {report.breedCompliance.heightCompliance.deviation}%)
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground font-bold">Legs</p>
                  <p
                    className={
                      report.breedCompliance.legColorCompliance.status === 'matches'
                        ? 'text-success font-semibold dark:text-emerald-300'
                        : 'text-warning font-semibold dark:text-amber-300'
                    }
                  >
                    {report.breedCompliance.legColorCompliance.actual}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground font-bold">Plumage</p>
                  <p
                    className={
                      report.breedCompliance.plumageCompliance.status === 'matches'
                        ? 'text-success font-semibold dark:text-emerald-300'
                        : 'text-warning font-semibold dark:text-amber-300'
                    }
                  >
                    {report.breedCompliance.plumageCompliance.actual}
                  </p>
                </div>
              </div>
              {report.breedCompliance.recommendations.length > 0 && (
                <div className="space-y-0.5">
                  {report.breedCompliance.recommendations.map((r, i) => (
                    <p key={i} className="text-warning text-xs dark:text-amber-300">
                      <Lightbulb className="inline h-3 w-3" /> {r}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Confidence */}
          <div className="text-center">
            <p className="text-muted-foreground text-xs font-semibold">
              Classification confidence:{' '}
              <span className="text-teal font-black">{report.confidence}%</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
