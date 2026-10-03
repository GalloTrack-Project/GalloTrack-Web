'use client';
import React, { useState } from 'react';
import type { FowlRecord } from '@/lib/types';
import { useGaloTrack } from '@/lib/context';
import { Dna, BarChart3, Zap, Lightbulb } from 'lucide-react';
import ChickenIcon from '@/components/ChickenIcon';

type Props = { fowl: FowlRecord; compact?: boolean };

function TierBadge({ tier }: { tier: string }) {
  const cls = tier === 'S' ? 'bg-amber-400 text-amber-900' : tier === 'A' ? 'bg-emerald-500 text-white' : tier === 'B' ? 'bg-sky-500 text-white' : 'bg-slate-400 text-white';
  return <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${cls}`}>{tier}</span>;
}

export default function BloodlineReportCard({ fowl, compact = false }: Props) {
  const { generateBloodlineReport } = useGaloTrack();
  const [expanded, setExpanded] = useState(false);
  const report = generateBloodlineReport(fowl);

  if (compact) {
    return (
      <div className="bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/40 dark:to-emerald-950/40 border border-teal-200 dark:border-teal-900/50 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[9px] font-black text-teal-700 dark:text-teal-300 uppercase tracking-widest"><Dna className="w-3 h-3" /> Bloodline</span>
          <div className="flex items-center gap-1.5">
            {report.crossPattern && <TierBadge tier={report.crossPattern.tier} />}
            <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${report.strainType === 'purebred' ? 'bg-sky-100 text-sky-700 dark:text-sky-300' : report.strainType === 'crossbred' ? 'bg-violet-100 text-violet-700 dark:text-violet-300' : report.strainType === 'linebred' ? 'bg-amber-100 text-amber-700 dark:text-amber-300' : 'bg-slate-100 dark:bg-muted text-slate-600 dark:text-card-foreground'}`}>
              {report.strainType.toUpperCase()}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div><p className="text-[8px] font-bold text-muted-foreground uppercase">Strain</p><p className="text-[10px] font-black text-slate-800 dark:text-card-foreground">{report.primaryStrain}</p></div>
          <div><p className="text-[8px] font-bold text-muted-foreground uppercase">Purity</p><p className="text-[10px] font-black text-teal-700 dark:text-teal-300">{report.purityPct}%</p></div>
          <div><p className="text-[8px] font-bold text-muted-foreground uppercase">Vigor</p><p className="text-[10px] font-black text-emerald-700 dark:text-emerald-300">{report.hybridVigor.score}</p></div>
          <div><p className="text-[8px] font-bold text-muted-foreground uppercase">Inbred</p><p className={`text-[10px] font-black ${report.inbreedingCoefficient > 20 ? 'text-danger dark:text-rose-300' : 'text-success dark:text-emerald-300'}`}>{report.inbreedingCoefficient}%</p></div>
        </div>
        {report.crossPattern && <p className="text-[8px] text-teal-700 dark:text-teal-300 font-semibold text-center">{report.crossPattern.label} — {report.crossPattern.fightingStyle}</p>}
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/40 dark:to-emerald-950/40 border border-teal-200 dark:border-teal-900/50 rounded-lg p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-teal-700 dark:text-teal-300 uppercase tracking-widest"><Dna className="w-3 h-3" /> Bloodline Report</span>
          {report.crossPattern && <TierBadge tier={report.crossPattern.tier} />}
        </div>
        <button onClick={() => setExpanded(!expanded)} className="text-[8px] font-bold text-teal-700 dark:text-teal-300 hover:text-teal-800 dark:hover:text-teal-200 cursor-pointer">
          {expanded ? '▲ Less' : '▼ Details'}
        </button>
      </div>

      {/* Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <div className="bg-white/70 dark:bg-card/70 border border-teal-100 dark:border-teal-900/50 rounded-md p-2 text-center">
          <p className="text-[8px] font-bold text-muted-foreground uppercase">Type</p>
          <p className={`text-[10px] font-black ${report.strainType === 'purebred' ? 'text-sky-700 dark:text-sky-300' : report.strainType === 'crossbred' ? 'text-violet-700 dark:text-violet-300' : report.strainType === 'linebred' ? 'text-amber-700 dark:text-amber-300' : 'text-slate-600 dark:text-card-foreground'}`}>{report.strainType.toUpperCase()}</p>
        </div>
        <div className="bg-white/70 dark:bg-card/70 border border-teal-100 dark:border-teal-900/50 rounded-md p-2 text-center">
          <p className="text-[8px] font-bold text-muted-foreground uppercase">Strain</p>
          <p className="text-[10px] font-black text-slate-800 dark:text-card-foreground">{report.primaryStrain}</p>
        </div>
        <div className="bg-white/70 dark:bg-card/70 border border-teal-100 dark:border-teal-900/50 rounded-md p-2 text-center">
          <p className="text-[8px] font-bold text-muted-foreground uppercase">Generation</p>
          <p className="text-[10px] font-black text-teal-700 dark:text-teal-300">{report.generationLabel}</p>
        </div>
        <div className="bg-white/70 dark:bg-card/70 border border-teal-100 dark:border-teal-900/50 rounded-md p-2 text-center">
          <p className="text-[8px] font-bold text-muted-foreground uppercase">Purity</p>
          <p className="text-[10px] font-black text-teal-700 dark:text-teal-300">{report.purityPct}%</p>
        </div>
        <div className="bg-white/70 dark:bg-card/70 border border-teal-100 dark:border-teal-900/50 rounded-md p-2 text-center">
          <p className="text-[8px] font-bold text-muted-foreground uppercase">Inbreeding</p>
          <p className={`text-[10px] font-black ${report.inbreedingCoefficient > 30 ? 'text-danger dark:text-rose-300' : report.inbreedingCoefficient > 15 ? 'text-warning dark:text-amber-300' : 'text-success dark:text-emerald-300'}`}>{report.inbreedingCoefficient}%</p>
        </div>
      </div>

      {/* Cross Pattern */}
      {report.crossPattern && (
        <div className="bg-white/70 dark:bg-card/70 border border-violet-200 dark:border-violet-900/50 rounded-md p-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black text-violet-700 dark:text-violet-300 uppercase">{report.crossPattern.label}</span>
            <div className="flex items-center gap-2">
              <TierBadge tier={report.crossPattern.tier} />
              <span className="text-[8px] font-bold text-success dark:text-emerald-300">+{report.crossPattern.winRateBonus}% win rate</span>
            </div>
          </div>
          <p className="text-[9px] text-muted-foreground">{report.crossPattern.description}</p>
          <p className="text-[8px] text-violet-600 dark:text-violet-300 font-semibold">Fighting style: {report.crossPattern.fightingStyle}</p>
        </div>
      )}

      {/* Performance Benchmark */}
      {report.performanceBenchmark && report.performanceBenchmark.totalFights > 0 && (
        <div className="bg-white/70 dark:bg-card/70 border border-sky-200 dark:border-sky-900/50 rounded-md p-3 space-y-2">
          <p className="text-[9px] font-black text-sky-700 dark:text-sky-300 uppercase"><BarChart3 className="w-3 h-3" /> Strain Performance Benchmark</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-[8px] font-bold text-muted-foreground">Win Rate</p>
              <p className="text-[11px] font-black text-sky-700 dark:text-sky-300">{report.performanceBenchmark.avgWinRate !== null ? `${report.performanceBenchmark.avgWinRate}%` : 'N/A'}</p>
            </div>
            <div>
              <p className="text-[8px] font-bold text-muted-foreground">Fights Tracked</p>
              <p className="text-[11px] font-black text-sky-700 dark:text-sky-300">{report.performanceBenchmark.totalFights}</p>
            </div>
            <div>
              <p className="text-[8px] font-bold text-muted-foreground">Avg Weight</p>
              <p className="text-[11px] font-black text-sky-700 dark:text-sky-300">{report.performanceBenchmark.avgWeight}kg</p>
            </div>
          </div>
          {report.performanceBenchmark.topPerformers.length > 0 && (
            <p className="text-[8px] text-info dark:text-sky-300">Top performers: {report.performanceBenchmark.topPerformers.join(', ')}</p>
          )}
        </div>
      )}

      {/* Hybrid Vigor Bar */}
      <div className="bg-white/70 dark:bg-card/70 border border-emerald-200 dark:border-emerald-900/50 rounded-md p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-black text-emerald-700 dark:text-emerald-300 uppercase"><Zap className="w-3 h-3" /> Hybrid Vigor</span>
          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
            report.hybridVigor.score >= 90 ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300' :
            report.hybridVigor.score >= 80 ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300' :
            report.hybridVigor.score >= 70 ? 'bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300' :
            report.hybridVigor.score >= 50 ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300' :
            'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300'
          }`}>
            {report.hybridVigor.label} ({report.hybridVigor.score}/100)
          </span>
        </div>
        <div className="w-full h-2 bg-slate-100 dark:bg-muted rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${
            report.hybridVigor.score >= 90 ? 'bg-gradient-to-r from-amber-400 to-amber-500' :
            report.hybridVigor.score >= 80 ? 'bg-emerald-500' :
            report.hybridVigor.score >= 70 ? 'bg-sky-500' :
            report.hybridVigor.score >= 50 ? 'bg-amber-500' : 'bg-rose-500'
          }`} style={{ width: `${report.hybridVigor.score}%` }} />
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="space-y-3 animate-fadeIn">
          {/* Sire / Dam Strains */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900/50 rounded-md p-2">
              <p className="text-[8px] font-black text-info dark:text-sky-300 uppercase"><ChickenIcon className="w-3 h-3" /> Sire Strain</p>
              <p className="text-[10px] font-bold text-slate-800 dark:text-card-foreground">{report.sireStrain}</p>
            </div>
            <div className="bg-pink-50 dark:bg-pink-950/40 border border-pink-200 dark:border-pink-900/50 rounded-md p-2">
              <p className="text-[8px] font-black text-pink-600 dark:text-pink-300 uppercase"><ChickenIcon className="w-3 h-3" /> Dam Strain</p>
              <p className="text-[10px] font-bold text-slate-800 dark:text-card-foreground">{report.damStrain}</p>
            </div>
          </div>

          {/* Vigor Factors */}
          {report.hybridVigor.factors.length > 0 && (
            <div className="bg-white/70 dark:bg-card/70 border border-slate-200 dark:border-border rounded-md p-3 space-y-1">
              <p className="text-[9px] font-black text-muted-foreground uppercase">Vigor Factors</p>
              {report.hybridVigor.factors.map((f, i) => (
                <p key={i} className="text-[8px] text-slate-600 dark:text-card-foreground">• {f}</p>
              ))}
            </div>
          )}

          {/* Heritability */}
          <div className="bg-white/70 dark:bg-card/70 border border-indigo-200 dark:border-indigo-900/50 rounded-md p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black text-indigo-700 dark:text-indigo-300 uppercase">Heritability</span>
              <span className="text-[9px] font-black text-indigo-700 dark:text-indigo-300">{report.heritability.overall}/100 — {report.heritability.label}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${report.heritability.overall}%` }} />
            </div>
            {report.heritability.factors.length > 0 && (
              <div className="space-y-0.5">
                {report.heritability.factors.map((f, i) => (
                  <p key={i} className="text-[8px] text-muted-foreground">• {f}</p>
                ))}
              </div>
            )}
          </div>

          {/* Color Report */}
          {report.colorReport && (
            <div className="bg-white/70 dark:bg-card/70 border border-amber-200 dark:border-amber-900/50 rounded-md p-3 space-y-2">
              <p className="text-[9px] font-black text-amber-700 dark:text-amber-300 uppercase">Color Genetics</p>
              <div className="grid grid-cols-3 gap-2 text-[8px]">
                <div>
                  <p className="font-bold text-muted-foreground">Leg Color</p>
                  <p className="font-semibold text-slate-700 dark:text-card-foreground">{report.colorReport.legColor?.name || 'Unknown'}</p>
                  {report.colorReport.legColor && <p className="text-muted-foreground">{report.colorReport.legColor.dominance}</p>}
                </div>
                <div>
                  <p className="font-bold text-muted-foreground">Plumage</p>
                  <p className="font-semibold text-slate-700 dark:text-card-foreground">{report.colorReport.plumageColor}</p>
                  <p className="text-muted-foreground">{report.colorReport.plumagePattern}</p>
                </div>
                <div>
                  <p className="font-bold text-muted-foreground">Complement</p>
                  <p className="font-semibold text-slate-700 dark:text-card-foreground text-[7px]">{report.colorReport.colorComplement}</p>
                </div>
              </div>
              {report.colorReport.inheritance && report.colorReport.inheritance.notes.length > 0 && (
                <div className="space-y-0.5">
                  {report.colorReport.inheritance.notes.map((n, i) => (
                    <p key={i} className="text-[8px] text-warning dark:text-amber-300">• {n}</p>
                  ))}
                </div>
              )}
              {report.colorReport.inheritance && report.colorReport.inheritance.probabilityTable.length > 0 && (
                <div className="space-y-0.5">
                  <p className="text-[8px] font-bold text-muted-foreground">Offspring Probability:</p>
                  {report.colorReport.inheritance.probabilityTable.map((p, i) => (
                    <p key={i} className="text-[8px] text-slate-600 dark:text-card-foreground">  {p.phenotype}: <span className="font-black">{p.probability}%</span></p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Breed Compliance */}
          {report.breedCompliance && report.breedCompliance.matchedStandard && (
            <div className="bg-white/70 dark:bg-card/70 border border-sky-200 dark:border-sky-900/50 rounded-md p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-black text-sky-700 dark:text-sky-300 uppercase">Breed Compliance</p>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                    report.breedCompliance.complianceGrade.startsWith('A') ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300' :
                    report.breedCompliance.complianceGrade.startsWith('B') ? 'bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300' :
                    'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'
                  }`}>{report.breedCompliance.complianceGrade}</span>
                  <span className="text-[8px] font-black text-sky-700 dark:text-sky-300">{report.breedCompliance.overallScore}/100</span>
                </div>
              </div>
              <p className="text-[8px] text-muted-foreground">Standard: {report.breedCompliance.matchedStandard.name} ({report.breedCompliance.matchedStandard.origin})</p>
              <div className="grid grid-cols-4 gap-1 text-[8px]">
                <div>
                  <p className="font-bold text-muted-foreground">Weight</p>
                  <p className={report.breedCompliance.weightCompliance.status === 'within' ? 'text-success dark:text-emerald-300 font-semibold' : 'text-warning dark:text-amber-300 font-semibold'}>
                    {report.breedCompliance.weightCompliance.actual}kg
                    <span className="text-muted-foreground block">{report.breedCompliance.weightCompliance.status} ({report.breedCompliance.weightCompliance.deviation}%)</span>
                  </p>
                </div>
                <div>
                  <p className="font-bold text-muted-foreground">Height</p>
                  <p className={report.breedCompliance.heightCompliance.status === 'within' ? 'text-success dark:text-emerald-300 font-semibold' : 'text-warning dark:text-amber-300 font-semibold'}>
                    {report.breedCompliance.heightCompliance.actual}cm
                    <span className="text-muted-foreground block">{report.breedCompliance.heightCompliance.status} ({report.breedCompliance.heightCompliance.deviation}%)</span>
                  </p>
                </div>
                <div>
                  <p className="font-bold text-muted-foreground">Legs</p>
                  <p className={report.breedCompliance.legColorCompliance.status === 'matches' ? 'text-success dark:text-emerald-300 font-semibold' : 'text-warning dark:text-amber-300 font-semibold'}>
                    {report.breedCompliance.legColorCompliance.actual}
                  </p>
                </div>
                <div>
                  <p className="font-bold text-muted-foreground">Plumage</p>
                  <p className={report.breedCompliance.plumageCompliance.status === 'matches' ? 'text-success dark:text-emerald-300 font-semibold' : 'text-warning dark:text-amber-300 font-semibold'}>
                    {report.breedCompliance.plumageCompliance.actual}
                  </p>
                </div>
              </div>
              {report.breedCompliance.recommendations.length > 0 && (
                <div className="space-y-0.5">
                  {report.breedCompliance.recommendations.map((r, i) => (
                    <p key={i} className="text-[8px] text-warning dark:text-amber-300"><Lightbulb className="w-3 h-3 inline" /> {r}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Confidence */}
          <div className="text-center">
            <p className="text-[8px] text-muted-foreground font-semibold">Classification confidence: <span className="text-teal-700 dark:text-teal-300 font-black">{report.confidence}%</span></p>
          </div>
        </div>
      )}
    </div>
  );
}
