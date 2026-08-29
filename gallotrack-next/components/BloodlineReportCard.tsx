'use client';
import React, { useState } from 'react';
import type { FowlRecord } from '@/lib/types';
import { useGaloTrack } from '@/lib/context';

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
      <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 rounded-2xl p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[9px] font-black text-teal-700 uppercase tracking-widest">🧬 Bloodline</span>
          <div className="flex items-center gap-1.5">
            {report.crossPattern && <TierBadge tier={report.crossPattern.tier} />}
            <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${report.strainType === 'purebred' ? 'bg-sky-100 text-sky-700' : report.strainType === 'crossbred' ? 'bg-violet-100 text-violet-700' : report.strainType === 'linebred' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
              {report.strainType.toUpperCase()}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div><p className="text-[8px] font-bold text-slate-400 uppercase">Strain</p><p className="text-[10px] font-black text-slate-800">{report.primaryStrain}</p></div>
          <div><p className="text-[8px] font-bold text-slate-400 uppercase">Purity</p><p className="text-[10px] font-black text-teal-700">{report.purityPct}%</p></div>
          <div><p className="text-[8px] font-bold text-slate-400 uppercase">Vigor</p><p className="text-[10px] font-black text-emerald-700">{report.hybridVigor.score}</p></div>
          <div><p className="text-[8px] font-bold text-slate-400 uppercase">Inbred</p><p className={`text-[10px] font-black ${report.inbreedingCoefficient > 20 ? 'text-rose-600' : 'text-emerald-600'}`}>{report.inbreedingCoefficient}%</p></div>
        </div>
        {report.crossPattern && <p className="text-[8px] text-teal-600 font-semibold text-center">{report.crossPattern.label} — {report.crossPattern.fightingStyle}</p>}
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-200 rounded-2xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-teal-700 uppercase tracking-widest">🧬 Bloodline Report</span>
          {report.crossPattern && <TierBadge tier={report.crossPattern.tier} />}
        </div>
        <button onClick={() => setExpanded(!expanded)} className="text-[8px] font-bold text-teal-600 hover:text-teal-800 cursor-pointer">
          {expanded ? '▲ Less' : '▼ Details'}
        </button>
      </div>

      {/* Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <div className="bg-white/70 border border-teal-100 rounded-xl p-2 text-center">
          <p className="text-[8px] font-bold text-slate-400 uppercase">Type</p>
          <p className={`text-[10px] font-black ${report.strainType === 'purebred' ? 'text-sky-700' : report.strainType === 'crossbred' ? 'text-violet-700' : report.strainType === 'linebred' ? 'text-amber-700' : 'text-slate-600'}`}>{report.strainType.toUpperCase()}</p>
        </div>
        <div className="bg-white/70 border border-teal-100 rounded-xl p-2 text-center">
          <p className="text-[8px] font-bold text-slate-400 uppercase">Strain</p>
          <p className="text-[10px] font-black text-slate-800">{report.primaryStrain}</p>
        </div>
        <div className="bg-white/70 border border-teal-100 rounded-xl p-2 text-center">
          <p className="text-[8px] font-bold text-slate-400 uppercase">Generation</p>
          <p className="text-[10px] font-black text-teal-700">{report.generationLabel}</p>
        </div>
        <div className="bg-white/70 border border-teal-100 rounded-xl p-2 text-center">
          <p className="text-[8px] font-bold text-slate-400 uppercase">Purity</p>
          <p className="text-[10px] font-black text-teal-700">{report.purityPct}%</p>
        </div>
        <div className="bg-white/70 border border-teal-100 rounded-xl p-2 text-center">
          <p className="text-[8px] font-bold text-slate-400 uppercase">Inbreeding</p>
          <p className={`text-[10px] font-black ${report.inbreedingCoefficient > 30 ? 'text-rose-600' : report.inbreedingCoefficient > 15 ? 'text-amber-600' : 'text-emerald-600'}`}>{report.inbreedingCoefficient}%</p>
        </div>
      </div>

      {/* Cross Pattern */}
      {report.crossPattern && (
        <div className="bg-white/70 border border-violet-200 rounded-xl p-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black text-violet-700 uppercase">{report.crossPattern.label}</span>
            <div className="flex items-center gap-2">
              <TierBadge tier={report.crossPattern.tier} />
              <span className="text-[8px] font-bold text-emerald-600">+{report.crossPattern.winRateBonus}% win rate</span>
            </div>
          </div>
          <p className="text-[9px] text-slate-500">{report.crossPattern.description}</p>
          <p className="text-[8px] text-violet-600 font-semibold">Fighting style: {report.crossPattern.fightingStyle}</p>
        </div>
      )}

      {/* Performance Benchmark */}
      {report.performanceBenchmark && report.performanceBenchmark.totalFights > 0 && (
        <div className="bg-white/70 border border-sky-200 rounded-xl p-3 space-y-2">
          <p className="text-[9px] font-black text-sky-700 uppercase">📊 Strain Performance Benchmark</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-[8px] font-bold text-slate-400">Win Rate</p>
              <p className="text-[11px] font-black text-sky-700">{report.performanceBenchmark.avgWinRate}%</p>
            </div>
            <div>
              <p className="text-[8px] font-bold text-slate-400">Fights Tracked</p>
              <p className="text-[11px] font-black text-sky-700">{report.performanceBenchmark.totalFights}</p>
            </div>
            <div>
              <p className="text-[8px] font-bold text-slate-400">Avg Weight</p>
              <p className="text-[11px] font-black text-sky-700">{report.performanceBenchmark.avgWeight}kg</p>
            </div>
          </div>
          {report.performanceBenchmark.topPerformers.length > 0 && (
            <p className="text-[8px] text-sky-600">Top performers: {report.performanceBenchmark.topPerformers.join(', ')}</p>
          )}
        </div>
      )}

      {/* Hybrid Vigor Bar */}
      <div className="bg-white/70 border border-emerald-200 rounded-xl p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-black text-emerald-700 uppercase">⚡ Hybrid Vigor</span>
          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
            report.hybridVigor.score >= 90 ? 'bg-amber-100 text-amber-700' :
            report.hybridVigor.score >= 80 ? 'bg-emerald-100 text-emerald-700' :
            report.hybridVigor.score >= 70 ? 'bg-sky-100 text-sky-700' :
            report.hybridVigor.score >= 50 ? 'bg-amber-100 text-amber-700' :
            'bg-rose-100 text-rose-700'
          }`}>
            {report.hybridVigor.label} ({report.hybridVigor.score}/100)
          </span>
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
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
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-2">
              <p className="text-[8px] font-black text-sky-600 uppercase">🐓 Sire Strain</p>
              <p className="text-[10px] font-bold text-slate-800">{report.sireStrain}</p>
            </div>
            <div className="bg-pink-50 border border-pink-200 rounded-xl p-2">
              <p className="text-[8px] font-black text-pink-600 uppercase">🐔 Dam Strain</p>
              <p className="text-[10px] font-bold text-slate-800">{report.damStrain}</p>
            </div>
          </div>

          {/* Vigor Factors */}
          {report.hybridVigor.factors.length > 0 && (
            <div className="bg-white/70 border border-slate-200 rounded-xl p-3 space-y-1">
              <p className="text-[9px] font-black text-slate-500 uppercase">Vigor Factors</p>
              {report.hybridVigor.factors.map((f, i) => (
                <p key={i} className="text-[8px] text-slate-600">• {f}</p>
              ))}
            </div>
          )}

          {/* Heritability */}
          <div className="bg-white/70 border border-indigo-200 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black text-indigo-700 uppercase">🧮 Heritability</span>
              <span className="text-[9px] font-black text-indigo-700">{report.heritability.overall}/100 — {report.heritability.label}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${report.heritability.overall}%` }} />
            </div>
            {report.heritability.factors.length > 0 && (
              <div className="space-y-0.5">
                {report.heritability.factors.map((f, i) => (
                  <p key={i} className="text-[8px] text-slate-500">• {f}</p>
                ))}
              </div>
            )}
          </div>

          {/* Color Report */}
          {report.colorReport && (
            <div className="bg-white/70 border border-amber-200 rounded-xl p-3 space-y-2">
              <p className="text-[9px] font-black text-amber-700 uppercase">🎨 Color Genetics</p>
              <div className="grid grid-cols-3 gap-2 text-[8px]">
                <div>
                  <p className="font-bold text-slate-400">Leg Color</p>
                  <p className="font-semibold text-slate-700">{report.colorReport.legColor?.name || 'Unknown'}</p>
                  {report.colorReport.legColor && <p className="text-slate-400">{report.colorReport.legColor.dominance}</p>}
                </div>
                <div>
                  <p className="font-bold text-slate-400">Plumage</p>
                  <p className="font-semibold text-slate-700">{report.colorReport.plumageColor}</p>
                  <p className="text-slate-400">{report.colorReport.plumagePattern}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-400">Complement</p>
                  <p className="font-semibold text-slate-700 text-[7px]">{report.colorReport.colorComplement}</p>
                </div>
              </div>
              {report.colorReport.inheritance && report.colorReport.inheritance.notes.length > 0 && (
                <div className="space-y-0.5">
                  {report.colorReport.inheritance.notes.map((n, i) => (
                    <p key={i} className="text-[8px] text-amber-600">• {n}</p>
                  ))}
                </div>
              )}
              {report.colorReport.inheritance && report.colorReport.inheritance.probabilityTable.length > 0 && (
                <div className="space-y-0.5">
                  <p className="text-[8px] font-bold text-slate-400">Offspring Probability:</p>
                  {report.colorReport.inheritance.probabilityTable.map((p, i) => (
                    <p key={i} className="text-[8px] text-slate-600">  {p.phenotype}: <span className="font-black">{p.probability}%</span></p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Breed Compliance */}
          {report.breedCompliance && report.breedCompliance.matchedStandard && (
            <div className="bg-white/70 border border-sky-200 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-black text-sky-700 uppercase">📏 Breed Compliance</p>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                    report.breedCompliance.complianceGrade.startsWith('A') ? 'bg-emerald-100 text-emerald-700' :
                    report.breedCompliance.complianceGrade.startsWith('B') ? 'bg-sky-100 text-sky-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>{report.breedCompliance.complianceGrade}</span>
                  <span className="text-[8px] font-black text-sky-700">{report.breedCompliance.overallScore}/100</span>
                </div>
              </div>
              <p className="text-[8px] text-slate-500">Standard: {report.breedCompliance.matchedStandard.name} ({report.breedCompliance.matchedStandard.origin})</p>
              <div className="grid grid-cols-4 gap-1 text-[8px]">
                <div>
                  <p className="font-bold text-slate-400">Weight</p>
                  <p className={report.breedCompliance.weightCompliance.status === 'within' ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-semibold'}>
                    {report.breedCompliance.weightCompliance.actual}kg
                    <span className="text-slate-400 block">{report.breedCompliance.weightCompliance.status} ({report.breedCompliance.weightCompliance.deviation}%)</span>
                  </p>
                </div>
                <div>
                  <p className="font-bold text-slate-400">Height</p>
                  <p className={report.breedCompliance.heightCompliance.status === 'within' ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-semibold'}>
                    {report.breedCompliance.heightCompliance.actual}cm
                    <span className="text-slate-400 block">{report.breedCompliance.heightCompliance.status} ({report.breedCompliance.heightCompliance.deviation}%)</span>
                  </p>
                </div>
                <div>
                  <p className="font-bold text-slate-400">Legs</p>
                  <p className={report.breedCompliance.legColorCompliance.status === 'matches' ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-semibold'}>
                    {report.breedCompliance.legColorCompliance.actual}
                  </p>
                </div>
                <div>
                  <p className="font-bold text-slate-400">Plumage</p>
                  <p className={report.breedCompliance.plumageCompliance.status === 'matches' ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-semibold'}>
                    {report.breedCompliance.plumageCompliance.actual}
                  </p>
                </div>
              </div>
              {report.breedCompliance.recommendations.length > 0 && (
                <div className="space-y-0.5">
                  {report.breedCompliance.recommendations.map((r, i) => (
                    <p key={i} className="text-[8px] text-amber-600">💡 {r}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Confidence */}
          <div className="text-center">
            <p className="text-[8px] text-slate-400 font-semibold">Classification confidence: <span className="text-teal-600 font-black">{report.confidence}%</span></p>
          </div>
        </div>
      )}
    </div>
  );
}
