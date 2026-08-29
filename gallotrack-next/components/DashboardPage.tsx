'use client';
import React from 'react';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Filler } from 'chart.js';
import type { FowlRecord, MatchRecord, PairingStats, MilestoneInfo } from '@/lib/types';
import { getAgeLabel } from '@/lib/helpers';
import FarmBloodlineSummary from '@/components/FarmBloodlineSummary';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Filler);

const DATE_RANGES: { id: '7d' | '30d' | 'month' | '3m' | 'all'; label: string }[] = [
  { id: '7d', label: 'Last 7 Days' },
  { id: '30d', label: 'Last 30 Days' },
  { id: 'month', label: 'This Month' },
  { id: '3m', label: 'Last 3 Months' },
  { id: 'all', label: 'All Time' },
];

function TrendChip({ up, label }: { up: boolean; label: string }) {
  if (!up) {
    return <span className="text-[10px] font-bold text-slate-400">{label}</span>;
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-full">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6" /></svg>
      {label}
    </span>
  );
}

type Props = {
  fowls: FowlRecord[];
  matchHistory: MatchRecord[];
  pairingAnalytics: { all: Map<string, PairingStats>; ranked: PairingStats[] };
  activeFowls: FowlRecord[];
  maleActiveFowls: FowlRecord[];
  femaleActiveFowls: FowlRecord[];
  monthLabels: string[];
  matchesByMonth: number[];
  activeSpark: number[];
  trendWinRate: number[];
  upcomingMilestones: { fowl: FowlRecord; info: MilestoneInfo }[];
  crossbreedChartData: { labels: string[]; data: number[]; hasData: boolean };
  winRatePct: number;
  winsCount: number;
  lossesCount: number;
  setShowPerFowlBreakdownModal: (v: boolean) => void;
  setCurrentPage: (v: string) => void;
  setProfilingSubTab: (v: string) => void;
  breakdownTab: string;
  dateRangeLabel: string;
  dateRangeOpen: boolean;
  setDateRangeOpen: (v: boolean | ((o: boolean) => boolean)) => void;
  dateRangePreset: string;
  setDateRangePreset: (v: '7d' | '30d' | 'month' | '3m' | 'all') => void;
  fetchDatabaseResources: () => void;
  loading: boolean;
};

export default function DashboardPage({
  fowls, matchHistory, pairingAnalytics, activeFowls, maleActiveFowls, femaleActiveFowls,
  monthLabels, matchesByMonth, activeSpark, trendWinRate,
  upcomingMilestones, crossbreedChartData, winRatePct, winsCount, lossesCount,
  setShowPerFowlBreakdownModal, setCurrentPage, setProfilingSubTab,
  breakdownTab: _breakdownTab, dateRangeLabel, dateRangeOpen, setDateRangeOpen,
  dateRangePreset, setDateRangePreset, fetchDatabaseResources, loading,
}: Props) {
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const isWithinThisWeek = (value?: string) => {
    if (!value) return false;
    const t = new Date(value).getTime();
    // eslint-disable-next-line react-hooks/purity -- Date.now() is acceptable for relative time display
    return !isNaN(t) && Date.now() - t < WEEK_MS;
  };
  const activeNewThisWeek = activeFowls.filter(f => isWithinThisWeek(f.created_at)).length;
  const matchesThisWeek = matchHistory.filter(m => isWithinThisWeek(m.date)).length;

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* HEADER CARDS */}
      <div className="rounded-3xl border border-border bg-card/70 backdrop-blur-md p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-xl shrink-0 shadow-inner">📊</div>
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-card-foreground tracking-tight">Enterprise Analytics Dashboard</h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-semibold mt-1">Cross-strain performance vectors, empirical win probabilities, and active inventory metrics</p>
          </div>
        </div>
        {/* DATE RANGE SELECTOR */}
        <div className="relative self-start md:self-auto">
          {dateRangeOpen && (
            <div className="fixed inset-0 z-40" onClick={() => setDateRangeOpen(false)} />
          )}
          <button
            type="button"
            onClick={() => setDateRangeOpen(o => !o)}
            className="bg-muted hover:bg-muted/60 text-foreground border border-border px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center space-x-2 shadow-2xs"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M8 2v4M16 2v4M3 10h18" /></svg>
            <span>{dateRangeLabel}</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${dateRangeOpen ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6" /></svg>
          </button>
          {dateRangeOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-popover rounded-2xl border border-border shadow-xl z-50 p-1.5">
              {DATE_RANGES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => { setDateRangePreset(r.id); setDateRangeOpen(false); }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-[11px] font-bold transition-colors cursor-pointer ${dateRangePreset === r.id ? 'bg-emerald-500/15 text-emerald-300' : 'text-muted-foreground hover:bg-muted'}`}
                >
                  {r.label}
                </button>
              ))}
              <div className="h-px bg-border my-1.5"></div>
              <button
                type="button"
                onClick={() => { setDateRangeOpen(false); fetchDatabaseResources(); }}
                className="w-full text-left px-3 py-2 rounded-xl text-[11px] font-bold text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                {loading ? '↻ Syncing...' : '↻ Refresh Data'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* TOP METRICS ROW — 4 CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

        {/* ACTIVE FOWL REGISTRY */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide leading-tight">Active Fowl Registry</span>
            <span className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-base shrink-0">🐓</span>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight">{activeFowls.length}</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 bg-sky-50/80 border border-sky-100 rounded-xl px-2.5 py-1.5">
              <span className="text-sm">🐓</span>
              <div>
                <p className="text-base font-black text-sky-800 leading-none">{maleActiveFowls.length}</p>
                <p className="text-[8px] font-bold uppercase tracking-wide text-sky-500">Males</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-pink-50/80 border border-pink-100 rounded-xl px-2.5 py-1.5">
              <span className="text-sm">🐔</span>
              <div>
                <p className="text-base font-black text-pink-800 leading-none">{femaleActiveFowls.length}</p>
                <p className="text-[8px] font-bold uppercase tracking-wide text-pink-500">Females</p>
              </div>
            </div>
          </div>
          <div className="h-12 -mx-1">
            {activeFowls.length > 0 ? (
              <Line
                data={{
                  labels: monthLabels,
                  datasets: [{ data: activeSpark, borderColor: '#059669', backgroundColor: 'rgba(5,150,105,0.14)', fill: true, borderWidth: 2, pointRadius: 0, tension: 0.4 }],
                }}
                options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false, min: 0 } } }}
              />
            ) : (
              <div className="text-[10px] font-bold text-slate-300 pt-2">No active fowl yet</div>
            )}
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
            <TrendChip up={activeNewThisWeek > 0} label={activeNewThisWeek > 0 ? `${activeNewThisWeek} this week` : 'No change'} />
            <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full shrink-0">Registered</span>
          </div>
        </div>

        {/* TOTAL MATCHES LOGGED */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide leading-tight">Total Matches Logged</span>
            <span className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-base shrink-0">🏆</span>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight">{matchHistory.length}</div>
          <div className="h-12 -mx-1">
            {matchHistory.length > 0 ? (
              <Bar
                data={{
                  labels: monthLabels,
                  datasets: [{ data: matchesByMonth, backgroundColor: '#059669', borderRadius: 4, maxBarThickness: 14 }],
                }}
                options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false, min: 0 } } }}
              />
            ) : (
              <div className="text-[10px] font-bold text-slate-300 pt-2">No matches logged yet</div>
            )}
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
            <TrendChip up={matchesThisWeek > 0} label={matchesThisWeek > 0 ? `${matchesThisWeek} this week` : 'No change'} />
            <span className="text-[8px] font-bold uppercase tracking-widest text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-full shrink-0">Logged</span>
          </div>
        </div>

        {/* OVERALL WIN RATE */}
        <div
          onClick={() => setShowPerFowlBreakdownModal(true)}
          className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex flex-col gap-3 cursor-pointer hover:border-emerald-400/70 hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide leading-tight">Overall Win Rate</span>
            <span className="text-[9px] font-black text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">{winsCount}W • {lossesCount}L</span>
          </div>
          <div className="text-3xl font-black text-emerald-600 tracking-tight">
            {matchHistory.length > 0 ? `${winRatePct}%` : '—'}
          </div>
          <div className="h-12 -mx-1">
            {matchHistory.length > 0 ? (
              <Line
                data={{
                  labels: monthLabels,
                  datasets: [{ data: trendWinRate, borderColor: '#059669', backgroundColor: 'rgba(5,150,105,0.16)', fill: true, borderWidth: 2, pointRadius: 0, tension: 0.4 }],
                }}
                options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false, min: 0, max: 100 } } }}
              />
            ) : (
              <div className="text-[10px] font-bold text-slate-300 pt-2">No matches logged yet</div>
            )}
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
            <span className="text-[10px] font-extrabold text-emerald-700">Win trend</span>
            <span className="text-[9px] font-black text-slate-400">🔍 Breakdown</span>
          </div>
        </div>

        {/* QUICK ACTIONS */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide leading-tight">Quick Actions</span>
            <span className="w-8 h-8 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center text-base shrink-0">⚡</span>
          </div>
          <div className="space-y-2">
            <button
              onClick={() => { setCurrentPage('profiling'); setProfilingSubTab('form'); }}
              className="w-full text-left bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/60 rounded-xl px-3 py-2.5 transition-all cursor-pointer"
            >
              <p className="text-[11px] font-extrabold text-emerald-800">+ Register New Fowl</p>
              <p className="text-[9px] text-emerald-500 font-semibold">Add to your roster</p>
            </button>
            <button
              onClick={() => { setCurrentPage('profiling'); setProfilingSubTab('matchForm'); }}
              className="w-full text-left bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/60 rounded-xl px-3 py-2.5 transition-all cursor-pointer"
            >
              <p className="text-[11px] font-extrabold text-indigo-800">+ Log Match Result</p>
              <p className="text-[9px] text-indigo-500 font-semibold">Record fight outcome</p>
            </button>
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
            <span className="text-[10px] font-extrabold text-slate-500">Start here</span>
            <span className="text-[8px] font-bold uppercase tracking-widest text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-full shrink-0">Actions</span>
          </div>
        </div>
      </div>

      {/* DEVELOPMENT CALENDAR & UPCOMING MILESTONES */}
      {upcomingMilestones.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4 mb-4">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-lg shrink-0">📅</span>
              <div>
                <h3 className="text-sm font-black text-slate-900 tracking-tight">Development Calendar &amp; Upcoming Milestones</h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Stage transitions predicted from each fowl&apos;s birth date — around the corner: {upcomingMilestones.filter(x => x.info.next && x.info.next.daysUntil >= 0 && x.info.next.daysUntil <= 30).length} in the next 30 days</p>
              </div>
            </div>
            <span className="text-[9px] font-mono font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">AUTO-CALCULATED</span>
          </div>
          <div className="space-y-2">
            {upcomingMilestones.slice(0, 8).map(({ fowl, info }) => {
              const soon = info.next !== null && info.next!.daysUntil >= 0 && info.next!.daysUntil <= 30;
              const overdue = info.next !== null && info.next!.daysUntil < 0;
              return (
                <div key={fowl.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${soon ? 'bg-emerald-50/80 border-emerald-200' : overdue ? 'bg-rose-50/70 border-rose-200' : 'bg-slate-50/60 border-slate-100'}`}>
                  <span className="w-9 h-9 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-base shrink-0">{info.current?.icon || '🐤'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-slate-800 truncate">{fowl.name} <span className="text-[9px] font-bold text-slate-400 font-mono">#{fowl.id}</span></p>
                    <p className="text-[10px] text-slate-400 font-semibold truncate">
                      {info.current?.stage || 'Chick'} · Age {getAgeLabel(info.parts)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {info.next ? (
                      <>
                        <p className={`text-[10px] font-black uppercase tracking-wide ${soon ? 'text-emerald-700' : overdue ? 'text-rose-600' : 'text-amber-700'}`}>
                          {info.next.stage} {soon ? '· SOON' : overdue ? '· OVERDUE' : ''}
                        </p>
                        <p className="text-[9px] font-mono text-slate-400 font-bold">
                          {info.next.date.toLocaleDateString()} · {info.next.daysUntil >= 0 ? `in ${info.next.daysUntil}d` : `${Math.abs(info.next.daysUntil)}d ago`}
                        </p>
                      </>
                    ) : (
                      <p className="text-[10px] font-black text-emerald-700 uppercase">Fully mature</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[9px] text-slate-400 font-semibold text-right">Mirrors the 📅 Development Timeline on each fowl&apos;s analytics profile.</p>
        </div>
      )}

      {/* MIDDLE CHARTS ROW — 2 CARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* GAMEFOWL POPULATION & PERFORMANCE TRENDS */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-6 flex flex-col lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 tracking-tight">Gamefowl Population & Performance Trends (Q3 2026)</h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Population growth versus empirical win-rate trajectory across the last six months</p>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-700"></span>Population</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded bg-emerald-400 border-t-2 border-dashed border-emerald-400 bg-transparent"></span>Win Rate %</span>
            </div>
          </div>
          {fowls.length > 0 || matchHistory.length > 0 ? (
            <div className="w-full h-72 my-4">
              <Line
                data={{
                  labels: monthLabels,
                  datasets: [
                    {
                      label: 'Population',
                      data: activeSpark,
                      borderColor: '#047857',
                      backgroundColor: 'rgba(4,120,87,0.16)',
                      fill: true,
                      borderWidth: 2.5,
                      pointRadius: 3,
                      pointBackgroundColor: '#047857',
                      tension: 0.4,
                      yAxisID: 'y',
                    },
                    {
                      label: 'Win Rate %',
                      data: trendWinRate,
                      borderColor: '#34d399',
                      backgroundColor: 'rgba(52,211,153,0.04)',
                      fill: false,
                      borderWidth: 2,
                      borderDash: [6, 5],
                      pointRadius: 3,
                      pointBackgroundColor: '#34d399',
                      tension: 0.4,
                      yAxisID: 'y1',
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  interaction: { mode: 'index', intersect: false },
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      backgroundColor: '#0f172a',
                      titleFont: { size: 11, weight: 'bold' },
                      bodyFont: { size: 11 },
                      padding: 10,
                      cornerRadius: 8,
                    },
                  },
                  scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 10, weight: 'bold' }, color: '#64748b' } },
                    y: { min: 0, grid: { color: 'rgba(148,163,184,0.15)' }, ticks: { font: { size: 10, weight: 'bold' }, color: '#64748b' }, title: { display: true, text: 'Population', font: { size: 9, weight: 'bold' }, color: '#94a3b8' } },
                    y1: { min: 0, max: 100, position: 'right', grid: { drawOnChartArea: false }, ticks: { font: { size: 10, weight: 'bold' }, color: '#34d399', callback: (v) => `${v}%` }, title: { display: true, text: 'Win Rate', font: { size: 9, weight: 'bold' }, color: '#94a3b8' } },
                  },
                }}
              />
            </div>
          ) : (
            <div className="my-auto flex flex-col items-center justify-center text-center p-10 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 text-xl font-bold">📈</div>
              <p className="text-xs font-extrabold text-slate-500">No data available</p>
              <p className="text-[10px] text-slate-400 max-w-[220px]">Encode fowl and log matches to visualize population and performance trends.</p>
            </div>
          )}
        </div>

        {/* BLOODLINE WIN RATIOS */}
        <FarmBloodlineSummary />
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-6 flex flex-col">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 tracking-tight">Bloodline Win Ratios</h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Win share by primary genetic strain</p>
            </div>
            <span className="text-[9px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-black shrink-0">GENETIC</span>
          </div>
          {crossbreedChartData.hasData ? (
            <>
              <div className="relative w-52 h-52 sm:w-56 sm:h-56 mx-auto my-4 flex items-center justify-center">
                <Doughnut
                  data={{
                    labels: crossbreedChartData.labels.map((l, i) => `${l} ${crossbreedChartData.data[i]}%`),
                    datasets: [{
                      data: crossbreedChartData.data,
                      backgroundColor: ['#059669', '#10b981', '#34d399', '#047857', '#065f46', '#6ee7b7'],
                      borderWidth: 3,
                      borderColor: '#ffffff',
                      hoverOffset: 6,
                    }],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '68%',
                    plugins: {
                      legend: { position: 'bottom', labels: { boxWidth: 10, padding: 12, font: { size: 10, weight: 'bold' }, color: '#334155' } },
                      tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}` }, backgroundColor: '#0f172a', padding: 10, cornerRadius: 8 },
                    },
                  }}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-emerald-700">{winRatePct}%</span>
                  <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Win Rate</span>
                </div>
              </div>
              <p className="text-center text-[10px] text-slate-400 font-semibold pb-1">Based on {matchHistory.length} total {matchHistory.length === 1 ? 'match' : 'matches'}</p>
            </>
          ) : (
            <div className="my-auto flex flex-col items-center justify-center text-center p-6 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 text-xl font-bold">🍩</div>
              <p className="text-xs font-extrabold text-slate-500">No data available</p>
              <p className="text-[10px] text-slate-400 max-w-[200px]">Log match records to generate bloodline win ratio breakdowns.</p>
            </div>
          )}
        </div>
      </div>

      {/* BREEDING PAIR PERFORMANCE ANALYTICS */}
      {pairingAnalytics.ranked.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-wrap justify-between items-center gap-3">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-lg shrink-0">🔗</span>
              <div>
                <h3 className="text-sm font-black text-slate-900 tracking-tight">Breeding Pair Performance Analytics</h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Empirical win-rate ranking per Sire × Dam cross — pinpoints proven pairings worth repeating and under-performers to drop from future breeding cycles</p>
              </div>
            </div>
            <span className="text-[9px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 font-black px-3 py-1 rounded-full hidden sm:inline">SIRE × DAM MATRIX</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] border-collapse min-w-[860px]">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 font-extrabold uppercase border-b border-slate-200/80">
                  <th className="p-4 pl-6">Rank</th>
                  <th className="p-4">Sire × Dam Cross</th>
                  <th className="p-4 text-center">Offspring</th>
                  <th className="p-4 text-center">Fights</th>
                  <th className="p-4 text-center">Wins 🏆</th>
                  <th className="p-4 text-center">Losses 💀</th>
                  <th className="p-4 text-center">Win Rate</th>
                  <th className="p-4 text-center">🩺 Survivability</th>
                  <th className="p-4 text-center pr-6">Breeding Verdict</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600 font-semibold">
                {pairingAnalytics.ranked.map((p, i) => {
                  const elite = p.decided >= 3 && p.winRate >= 70;
                  const solid = p.winRate >= 50;
                  const weak = p.decided >= 3 && p.winRate < 50;
                  return (
                    <tr key={p.key} className={`hover:bg-slate-50/80 transition-colors ${weak ? 'bg-rose-50/30' : elite ? 'bg-emerald-50/30' : ''}`}>
                      <td className="p-4 pl-6 whitespace-nowrap">
                        {i === 0 ? <span className="text-sm">🥇</span> : i === 1 ? <span className="text-sm">🥈</span> : i === 2 ? <span className="text-sm">🥉</span> : <span className="font-mono font-black text-slate-400">#{i + 1}</span>}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 border border-emerald-200/70 flex items-center justify-center text-sm shrink-0">🔗</div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900">{p.sire} <span className="text-slate-300 font-black">×</span> {p.dam}</p>
                            <p className="text-[9px] font-semibold text-slate-400 truncate">{p.members.map((m) => m.name).join(', ')}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-center font-mono font-bold">{p.members.length}</td>
                      <td className="p-4 text-center font-mono font-bold">{p.totalFights}</td>
                      <td className="p-4 text-center font-mono font-extrabold text-emerald-600">{p.wins}</td>
                      <td className="p-4 text-center font-mono font-extrabold text-rose-600">{p.losses}</td>
                      <td className="p-4 text-center font-mono">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full font-black text-[10px] ${p.winRate >= 50 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                          {p.winRate}%
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full font-black text-[10px] ${p.resilienceScore >= 80 ? 'bg-teal-100 text-teal-800' : p.resilienceScore >= 60 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>
                            🩺 {p.resilienceScore > 0 ? `${p.resilienceScore}%` : 'N/A'}
                          </span>
                          {p.casualties > 0 && (
                            <span title={`${p.casualties} deceased + ${p.critical} critical from injuries`} className="text-[9px] font-black text-rose-500 bg-rose-50 border border-rose-200 rounded-full px-2 py-0.5 whitespace-nowrap">💀 {p.casualties}</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-center pr-6">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full font-black text-[9px] uppercase tracking-wider border whitespace-nowrap ${
                          elite ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : solid ? 'bg-sky-50 text-sky-700 border-sky-200'
                          : weak ? 'bg-rose-100 text-rose-800 border-rose-300'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>
                          {elite ? '🏆 Elite — Repeat Cross' : solid ? '✅ Solid Pairing' : weak ? '⚠️ Under-Performing' : '🔎 Inconclusive'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex flex-wrap items-center gap-x-5 gap-y-1 text-[9px] font-bold text-slate-400">
            <span>Verdict logic:</span>
            <span className="text-emerald-700">🏆 Elite = ≥70% win rate with 3+ decided fights</span>
            <span className="text-sky-700">✅ Solid = ≥50%</span>
            <span className="text-rose-700">⚠️ Avoid = below 50% with 3+ decided fights</span>
            <span className="text-teal-700">🩺 Survivability = post-fight condition resilience (Fit=100 · Critical=40 · Deceased=0) — casualties drag a bloodline down even on wins</span>
            <span className="ml-auto">Focus future breeding cycles strictly on high-performing, resilient bloodlines.</span>
          </div>
        </div>
      )}

      {/* HISTORICAL ANALYTICS MATCH LOGS TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-wrap justify-between items-center gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-900 tracking-tight">Historical Analytics Match Logs</h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Complete record of logged derby and arena encounters</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[9px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 font-black px-3 py-1 rounded-full hidden sm:inline">D4 ANALYTICS DB</span>
            <button
              type="button"
              onClick={() => { setCurrentPage('profiling'); setProfilingSubTab('matchForm'); }}
              className="bg-slate-900 hover:bg-emerald-700 active:scale-[0.98] text-white text-[10px] font-black px-4 py-2 rounded-lg shadow-sm transition-all cursor-pointer"
            >
              View All →
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] border-collapse min-w-[760px]">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 font-extrabold uppercase border-b border-slate-200/80">
                <th className="p-4 pl-6">Match Date</th>
                <th className="p-4">Fowl Identifier</th>
                <th className="p-4">Bloodline</th>
                <th className="p-4">Arena Location</th>
                <th className="p-4 text-center">Outcome</th>
                <th className="p-4 text-center">🩺 Post-Fight Condition</th>
                <th className="p-4 text-center">Video</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600 font-semibold">
              {matchHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 text-xs font-semibold">
                    No data available
                  </td>
                </tr>
              ) : (
                matchHistory.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors duration-150">
                    <td className="p-4 pl-6 font-mono text-slate-400 whitespace-nowrap">{log.date}</td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 border border-emerald-200/70 flex items-center justify-center text-sm shrink-0">🐓</div>
                        <span className="font-bold text-slate-900">{log.entry_name}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px] uppercase tracking-wide whitespace-nowrap">{log.breed || '—'}</span>
                    </td>
                    <td className="p-4 text-slate-500 font-normal">{log.location || '—'}</td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full font-black text-[9px] uppercase tracking-wider border ${log.outcome && log.outcome.toLowerCase() === 'win' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : log.outcome && log.outcome.toLowerCase() === 'loss' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>{log.outcome || '—'}</span>
                    </td>
                    <td className="p-4 text-center">
                      {log.post_fight_condition ? (
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full font-black text-[9px] uppercase tracking-wider border whitespace-nowrap ${
                          (log.post_fight_condition || '').toLowerCase().includes('deceased')
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : (log.post_fight_condition || '').toLowerCase().includes('critical') || (log.post_fight_condition || '').toLowerCase().includes('severely')
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-teal-50 text-teal-700 border-teal-200'
                        }`}>
                          {(log.post_fight_condition || '').toLowerCase().includes('deceased') ? '💀 ' : (log.post_fight_condition || '').toLowerCase().includes('critical') || (log.post_fight_condition || '').toLowerCase().includes('severely') ? '🟠 ' : '🟢 '}{log.post_fight_condition}
                        </span>
                      ) : (
                        <span className="text-[9px] text-slate-300 font-bold">—</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {log.video_url ? (
                        <a href={log.video_url} target="_blank" rel="noopener noreferrer" title="Watch match video" className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all cursor-pointer">
                          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3" /></svg>
                        </a>
                      ) : (
                        <span className="text-[9px] text-slate-300 font-bold">—</span>
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
}
