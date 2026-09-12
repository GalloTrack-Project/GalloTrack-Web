'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Filler } from 'chart.js';
import { getAgeLabel } from '@/lib/helpers';
import { useFowl } from '@/lib/contexts/fowl-context';
import { useUI } from '@/lib/contexts/ui-context';
import FarmBloodlineSummary from '@/components/FarmBloodlineSummary';
import { LayoutDashboard, Bird, Trophy, Zap, Calendar, Dna, Link2, TrendingUp, PieChart, Search, ShieldCheck, AlertTriangle, Stethoscope, CircleDot, Skull, Medal } from 'lucide-react';

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
    return <span className="text-[10px] font-bold text-muted-foreground">{label}</span>;
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-full">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6" /></svg>
      {label}
    </span>
  );
}

export default function DashboardPage() {
  const fowl = useFowl();
  const ui = useUI();
  const router = useRouter();

  const {
    fowls, matchHistory, pairingAnalytics, activeFowls, maleActiveFowls, femaleActiveFowls,
    monthLabels, matchesByMonth, activeSpark, trendWinRate,
    upcomingMilestones, crossbreedChartData, winRatePct, winsCount, lossesCount,
    dateRangeLabel, dateRangeOpen, setDateRangeOpen,
    dateRangePreset, setDateRangePreset, fetchDatabaseResources, loading,
  } = fowl;

  const navigate = (page: string, subTab?: string) => {
    if (subTab) ui.setProfilingSubTab(subTab as never);
    router.push(`/${page}`);
  };

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
          <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-inner"><LayoutDashboard className="w-5 h-5 text-emerald-500" /></div>
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
        <div className="group relative bg-card rounded-2xl border border-border shadow-sm p-5 flex flex-col gap-3 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-t-2xl"></div>
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider leading-tight">Active Fowl Registry</span>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20"><Bird className="w-4 h-4 text-white" /></div>
          </div>
          <div className="text-3xl font-black text-card-foreground tracking-tight leading-none mt-1">{activeFowls.length}</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 bg-sky-500/10 border border-sky-500/20 rounded-xl px-2.5 py-2">
              <span className="text-sm"><Bird className="w-4 h-4 text-sky-400" /></span>
              <div>
                <p className="text-base font-black text-sky-400 leading-none">{maleActiveFowls.length}</p>
                <p className="text-[8px] font-bold uppercase tracking-wider text-sky-400 mt-0.5">Males</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-pink-500/10 border border-pink-500/20 rounded-xl px-2.5 py-2">
              <span className="text-sm"><Bird className="w-4 h-4 text-pink-400" /></span>
              <div>
                <p className="text-base font-black text-pink-400 leading-none">{femaleActiveFowls.length}</p>
                <p className="text-[8px] font-bold uppercase tracking-wider text-pink-400 mt-0.5">Females</p>
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
              <div className="text-[10px] font-bold text-muted-foreground pt-2">No active fowl yet</div>
            )}
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-border pt-2.5">
            <TrendChip up={activeNewThisWeek > 0} label={activeNewThisWeek > 0 ? `${activeNewThisWeek} this week` : 'No change'} />
            <span className="text-[8px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full shrink-0">Registered</span>
          </div>
        </div>

        {/* TOTAL MATCHES LOGGED */}
        <div className="group relative bg-card rounded-2xl border border-border shadow-sm p-5 flex flex-col gap-3 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-t-2xl"></div>
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider leading-tight">Total Matches Logged</span>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20"><Trophy className="w-4 h-4 text-white" /></div>
          </div>
          <div className="text-3xl font-black text-card-foreground tracking-tight leading-none mt-1">{matchHistory.length}</div>
          <div className="h-12 -mx-1">
            {matchHistory.length > 0 ? (
              <Bar
                data={{
                  labels: monthLabels,
                  datasets: [{ data: matchesByMonth, backgroundColor: '#6366f1', borderRadius: 4, maxBarThickness: 14 }],
                }}
                options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false, min: 0 } } }}
              />
            ) : (
              <div className="text-[10px] font-bold text-muted-foreground pt-2">No matches logged yet</div>
            )}
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-border pt-2.5">
            <TrendChip up={matchesThisWeek > 0} label={matchesThisWeek > 0 ? `${matchesThisWeek} this week` : 'No change'} />
            <span className="text-[8px] font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full shrink-0">Logged</span>
          </div>
        </div>

        {/* OVERALL WIN RATE */}
        <div
          onClick={() => ui.setShowPerFowlBreakdownModal(true)}
          className="group relative bg-card rounded-2xl border border-border shadow-sm p-5 flex flex-col gap-3 hover:shadow-lg hover:-translate-y-0.5 hover:border-emerald-400/60 cursor-pointer transition-all duration-300 overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-600 to-teal-400 rounded-t-2xl"></div>
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider leading-tight">Overall Win Rate</span>
            <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full shrink-0">{winsCount}W · {lossesCount}L</span>
          </div>
          <div className="text-3xl font-black text-emerald-400 tracking-tight leading-none mt-1">
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
              <div className="text-[10px] font-bold text-muted-foreground pt-2">No matches logged yet</div>
            )}
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-border pt-2.5">
            <span className="text-[10px] font-extrabold text-emerald-400">Win trend</span>
            <span className="text-[9px] font-black text-muted-foreground group-hover:text-emerald-400 transition-colors flex items-center gap-1"><Search className="w-3 h-3" /> Breakdown</span>
          </div>
        </div>

        {/* QUICK ACTIONS */}
        <div className="group relative bg-card rounded-2xl border border-border shadow-sm p-5 flex flex-col gap-3 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-purple-400 rounded-t-2xl"></div>
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider leading-tight">Quick Actions</span>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shrink-0 shadow-md shadow-violet-500/20"><Zap className="w-4 h-4 text-white" /></div>
          </div>
          <div className="space-y-2 mt-1">
            <button
              onClick={() => navigate('profiling', 'form')}
              className="w-full text-left bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl px-3.5 py-3 transition-all cursor-pointer group/btn"
            >
              <p className="text-[11px] font-extrabold text-emerald-400 group-hover/btn:text-emerald-300">+ Register New Fowl</p>
              <p className="text-[9px] text-emerald-400/70 font-semibold mt-0.5">Add to your roster</p>
            </button>
            <button
              onClick={() => navigate('profiling', 'matchForm')}
              className="w-full text-left bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-xl px-3.5 py-3 transition-all cursor-pointer group/btn"
            >
              <p className="text-[11px] font-extrabold text-indigo-400 group-hover/btn:text-indigo-300">+ Log Match Result</p>
              <p className="text-[9px] text-indigo-400/70 font-semibold mt-0.5">Record fight outcome</p>
            </button>
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-border pt-2.5">
            <span className="text-[10px] font-extrabold text-muted-foreground">Start here</span>
            <span className="text-[8px] font-bold uppercase tracking-widest text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full shrink-0">Actions</span>
          </div>
        </div>
      </div>

      {/* MILESTONES & BLOODLINE ROW — 2 CARDS */}
      {upcomingMilestones.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* DEVELOPMENT CALENDAR & UPCOMING MILESTONES */}
          <div className="bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-6 flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0"><Calendar className="w-4 h-4 text-emerald-400" /></span>
                <div>
                  <h3 className="text-sm font-black text-card-foreground tracking-tight">Upcoming Milestones</h3>
                  <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">{upcomingMilestones.filter(x => x.info.next && x.info.next.daysUntil >= 0 && x.info.next.daysUntil <= 30).length} in the next 30 days</p>
                </div>
              </div>
              <span className="text-[9px] font-mono font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">AUTO</span>
            </div>
            <div className="space-y-2 flex-1">
              {upcomingMilestones.slice(0, 5).map(({ fowl, info }) => {
                const soon = info.next !== null && info.next!.daysUntil >= 0 && info.next!.daysUntil <= 30;
                const overdue = info.next !== null && info.next!.daysUntil < 0;
                return (
                  <div key={fowl.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${soon ? 'bg-emerald-500/10 border-emerald-500/20' : overdue ? 'bg-rose-500/10 border-rose-500/20' : 'bg-muted/50 border-border'}`}>
                    <span className="w-9 h-9 rounded-lg border border-border bg-muted flex items-center justify-center text-base shrink-0">{info.current?.icon || '🐤'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-card-foreground truncate">{fowl.name} <span className="text-[9px] font-bold text-muted-foreground font-mono">#{fowl.id}</span></p>
                      <p className="text-[10px] text-muted-foreground font-semibold truncate">
                        {info.current?.stage || 'Chick'} · Age {getAgeLabel(info.parts)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      {info.next ? (
                        <>
                          <p className={`text-[10px] font-black uppercase tracking-wide ${soon ? 'text-emerald-400' : overdue ? 'text-rose-400' : 'text-amber-400'}`}>
                            {info.next.stage} {soon ? '· SOON' : overdue ? '· OVERDUE' : ''}
                          </p>
                          <p className="text-[9px] font-mono text-muted-foreground font-bold">
                            {info.next.daysUntil >= 0 ? `in ${info.next.daysUntil}d` : `${Math.abs(info.next.daysUntil)}d ago`}
                          </p>
                        </>
                      ) : (
                        <p className="text-[10px] font-black text-emerald-400 uppercase">Fully mature</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => router.push('/milestones')}
              className="mt-3 w-full text-center text-[10px] font-bold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 border border-emerald-500/20 rounded-xl py-2 transition-all cursor-pointer"
            >
              View All Milestones →
            </button>
          </div>

          {/* BLOODLINE OVERVIEW */}
          <div className="bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-6 flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shrink-0"><Dna className="w-4 h-4 text-teal-400" /></span>
                <div>
                  <h3 className="text-sm font-black text-card-foreground tracking-tight">Bloodline Overview</h3>
                  <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">{activeFowls.length} active fowls across all strains</p>
                </div>
              </div>
              <span className="text-[9px] font-mono font-black text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2.5 py-1 rounded-full">LIVE</span>
            </div>
            <div className="space-y-2 flex-1">
              {(() => {
                const strainMap = new Map<string, { count: number; males: number; females: number }>();
                activeFowls.forEach((f) => {
                  const strains = (f.breed || 'Unspecified').split(',').map(s => s.trim()).filter(Boolean);
                  strains.forEach((strain) => {
                    const existing = strainMap.get(strain) || { count: 0, males: 0, females: 0 };
                    existing.count++;
                    if (f.gender === 'Rooster' || f.gender === 'Male') existing.males++;
                    else existing.females++;
                    strainMap.set(strain, existing);
                  });
                });
                const sorted = Array.from(strainMap.entries())
                  .sort((a, b) => b[1].count - a[1].count)
                  .slice(0, 5);
                if (sorted.length === 0) return <p className="text-[10px] text-muted-foreground font-semibold text-center py-4">No strain data yet.</p>;
                const maxCount = sorted[0][1].count;
                return sorted.map(([strain, data]) => (
                  <div key={strain} className="bg-muted/50 border border-border rounded-xl px-3 py-2.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-black text-card-foreground">{strain}</span>
                      <span className="text-[9px] font-bold text-teal-400">{data.count} fowl{data.count !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-teal-400 to-emerald-500 rounded-full transition-all" style={{ width: `${(data.count / maxCount) * 100}%` }}></div>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[8px] font-bold text-sky-400 flex items-center gap-1"><Bird className="w-3 h-3" /> {data.males}</span>
                      <span className="text-[8px] font-bold text-pink-400 flex items-center gap-1"><Bird className="w-3 h-3" /> {data.females}</span>
                    </div>
                  </div>
                ));
              })()}
            </div>
            <button
              type="button"
              onClick={() => router.push('/lineage')}
              className="mt-3 w-full text-center text-[10px] font-bold text-teal-400 hover:text-teal-300 hover:bg-teal-500/10 border border-teal-500/20 rounded-xl py-2 transition-all cursor-pointer"
            >
              View Full Lineage →
            </button>
          </div>
        </div>
      )}

      {/* MIDDLE CHARTS ROW — 2 CARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* GAMEFOWL POPULATION & PERFORMANCE TRENDS */}
        <div className="bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-6 flex flex-col lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
            <div>
              <h3 className="text-sm font-black text-card-foreground tracking-tight">Gamefowl Population & Performance Trends (Q3 2026)</h3>
              <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">Population growth versus empirical win-rate trajectory across the last six months</p>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-bold text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>Population</span>
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
                    x: { grid: { display: false }, ticks: { font: { size: 10, weight: 'bold' }, color: '#94a3b8' } },
                    y: { min: 0, grid: { color: 'rgba(148,163,184,0.15)' }, ticks: { font: { size: 10, weight: 'bold' }, color: '#94a3b8' }, title: { display: true, text: 'Population', font: { size: 9, weight: 'bold' }, color: '#94a3b8' } },
                    y1: { min: 0, max: 100, position: 'right', grid: { drawOnChartArea: false }, ticks: { font: { size: 10, weight: 'bold' }, color: '#34d399', callback: (v) => `${v}%` }, title: { display: true, text: 'Win Rate', font: { size: 9, weight: 'bold' }, color: '#94a3b8' } },
                  },
                }}
              />
            </div>
          ) : (
            <div className="my-auto flex flex-col items-center justify-center text-center p-10 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground"><TrendingUp className="w-5 h-5" /></div>
              <p className="text-xs font-extrabold text-muted-foreground">No data available</p>
              <p className="text-[10px] text-muted-foreground max-w-[220px]">Encode fowl and log matches to visualize population and performance trends.</p>
            </div>
          )}
        </div>

        {/* BLOODLINE WIN RATIOS */}
        <FarmBloodlineSummary />
        <div className="bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-6 flex flex-col">
          <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
            <div>
              <h3 className="text-sm font-black text-card-foreground tracking-tight">Bloodline Win Ratios</h3>
              <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">Win share by primary genetic strain</p>
            </div>
            <span className="text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-black shrink-0">GENETIC</span>
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
                      borderColor: 'var(--card)',
                      hoverOffset: 6,
                    }],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '68%',
                    plugins: {
                      legend: { position: 'bottom', labels: { boxWidth: 10, padding: 12, font: { size: 10, weight: 'bold' }, color: '#94a3b8' } },
                      tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}` }, backgroundColor: '#0f172a', padding: 10, cornerRadius: 8 },
                    },
                  }}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-emerald-400">{winRatePct}%</span>
                  <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">Win Rate</span>
                </div>
              </div>
              <p className="text-center text-[10px] text-muted-foreground font-semibold pb-1">Based on {matchHistory.length} total {matchHistory.length === 1 ? 'match' : 'matches'}</p>
            </>
          ) : (
            <div className="my-auto flex flex-col items-center justify-center text-center p-6 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground"><PieChart className="w-5 h-5" /></div>
              <p className="text-xs font-extrabold text-muted-foreground">No data available</p>
              <p className="text-[10px] text-muted-foreground max-w-[200px]">Log match records to generate bloodline win ratio breakdowns.</p>
            </div>
          )}
        </div>
      </div>

      {/* BREEDING PAIR PERFORMANCE ANALYTICS */}
      {pairingAnalytics.ranked.length > 0 && (
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="p-5 border-b border-border bg-muted/30 flex flex-wrap justify-between items-center gap-3">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0"><Link2 className="w-4 h-4 text-emerald-400" /></span>
              <div>
                <h3 className="text-sm font-black text-card-foreground tracking-tight">Breeding Pair Performance Analytics</h3>
                <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">Empirical win-rate ranking per Sire × Dam cross — pinpoints proven pairings worth repeating and under-performers to drop from future breeding cycles</p>
              </div>
            </div>
            <span className="text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-black px-3 py-1 rounded-full hidden sm:inline">SIRE × DAM MATRIX</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] border-collapse min-w-[860px]">
              <thead>
                <tr className="bg-muted/50 text-muted-foreground font-extrabold uppercase border-b border-border">
                  <th className="p-4 pl-6">Rank</th>
                  <th className="p-4">Sire × Dam Cross</th>
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
                {pairingAnalytics.ranked.map((p, i) => {
                  const elite = p.decided >= 3 && p.winRate >= 70;
                  const solid = p.winRate >= 50;
                  const weak = p.decided >= 3 && p.winRate < 50;
                  return (
                    <tr key={p.key} className={`hover:bg-muted/30 transition-colors ${weak ? 'bg-rose-500/5' : elite ? 'bg-emerald-500/5' : ''}`}>
                      <td className="p-4 pl-6 whitespace-nowrap">
                        {i === 0 ? <Medal className="w-4 h-4 text-amber-500" /> : i === 1 ? <Medal className="w-4 h-4 text-slate-400" /> : i === 2 ? <Medal className="w-4 h-4 text-amber-700" /> : <span className="font-mono font-black text-muted-foreground">#{i + 1}</span>}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0"><Link2 className="w-3.5 h-3.5 text-emerald-400" /></div>
                          <div className="min-w-0">
                            <p className="font-bold text-card-foreground">{p.sire} <span className="text-muted-foreground font-black">×</span> {p.dam}</p>
                            <p className="text-[9px] font-semibold text-muted-foreground truncate">{p.members.map((m) => m.name).join(', ')}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-center font-mono font-bold">{p.members.length}</td>
                      <td className="p-4 text-center font-mono font-bold">{p.totalFights}</td>
                      <td className="p-4 text-center font-mono font-extrabold text-emerald-400">{p.wins}</td>
                      <td className="p-4 text-center font-mono font-extrabold text-rose-400">{p.losses}</td>
                      <td className="p-4 text-center font-mono">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full font-black text-[10px] ${p.winRate >= 50 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
                          {p.winRate}%
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full font-black text-[10px] ${p.resilienceScore >= 80 ? 'bg-teal-500/15 text-teal-400' : p.resilienceScore >= 60 ? 'bg-amber-500/15 text-amber-400' : 'bg-rose-500/15 text-rose-400'}`}>
                            <Stethoscope className="w-3 h-3 inline mr-1" />{p.resilienceScore > 0 ? `${p.resilienceScore}%` : 'N/A'}
                          </span>
                          {p.casualties > 0 && (
                            <span title={`${p.casualties} deceased + ${p.critical} critical from injuries`} className="text-[9px] font-black text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-full px-2 py-0.5 whitespace-nowrap flex items-center gap-1"><Skull className="w-3 h-3" /> {p.casualties}</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-center pr-6">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full font-black text-[9px] uppercase tracking-wider border whitespace-nowrap ${
                          elite ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : solid ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                          : weak ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                          : 'bg-muted text-muted-foreground border-border'
                        }`}>
                          {elite ? 'Elite — Repeat Cross' : solid ? 'Solid Pairing' : weak ? 'Under-Performing' : 'Inconclusive'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3.5 border-t border-border bg-muted/30 flex flex-wrap items-center gap-x-5 gap-y-1 text-[9px] font-bold text-muted-foreground">
            <span>Verdict logic:</span>
            <span className="text-emerald-400">Elite = ≥70% win rate with 3+ decided fights</span>
            <span className="text-sky-400">Solid = ≥50%</span>
            <span className="text-rose-400">Avoid = below 50% with 3+ decided fights</span>
            <span className="text-teal-400">Survivability = post-fight condition resilience (Fit=100 · Critical=40 · Deceased=0) — casualties drag a bloodline down even on wins</span>
            <span className="ml-auto">Focus future breeding cycles strictly on high-performing, resilient bloodlines.</span>
          </div>
        </div>
      )}

      {/* HISTORICAL ANALYTICS MATCH LOGS TABLE */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border bg-muted/30 flex flex-wrap justify-between items-center gap-3">
          <div>
            <h3 className="text-sm font-black text-card-foreground tracking-tight">Historical Analytics Match Logs</h3>
            <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">Complete record of logged derby and arena encounters</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-black px-3 py-1 rounded-full hidden sm:inline">D4 ANALYTICS DB</span>
            <button
              type="button"
              onClick={() => navigate('profiling', 'matchForm')}
              className="bg-card hover:bg-emerald-500/20 active:scale-[0.98] text-card-foreground text-[10px] font-black px-4 py-2 rounded-lg border border-border shadow-sm transition-all cursor-pointer"
            >
              View All →
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] border-collapse min-w-[760px]">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground font-extrabold uppercase border-b border-border">
                <th className="p-4 pl-6">Match Date</th>
                <th className="p-4">Fowl Identifier</th>
                <th className="p-4">Bloodline</th>
                <th className="p-4">Arena Location</th>
                <th className="p-4 text-center">Outcome</th>
                <th className="p-4 text-center">Post-Fight Condition</th>
                <th className="p-4 text-center">Video</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-muted-foreground font-semibold">
              {matchHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground text-xs font-semibold">
                    No data available
                  </td>
                </tr>
              ) : (
                matchHistory.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/30 transition-colors duration-150">
                    <td className="p-4 pl-6 font-mono text-muted-foreground whitespace-nowrap">{log.date}</td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0"><Bird className="w-3.5 h-3.5 text-emerald-400" /></div>
                        <span className="font-bold text-card-foreground">{log.entry_name}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-[10px] uppercase tracking-wide whitespace-nowrap">{log.breed || '—'}</span>
                    </td>
                    <td className="p-4 text-muted-foreground font-normal">{log.location || '—'}</td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full font-black text-[9px] uppercase tracking-wider border ${log.outcome && log.outcome.toLowerCase() === 'win' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : log.outcome && log.outcome.toLowerCase() === 'loss' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-muted text-muted-foreground border-border'}`}>{log.outcome || '—'}</span>
                    </td>
                    <td className="p-4 text-center">
                      {log.post_fight_condition ? (
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full font-black text-[9px] uppercase tracking-wider border whitespace-nowrap ${
                          (log.post_fight_condition || '').toLowerCase().includes('deceased')
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : (log.post_fight_condition || '').toLowerCase().includes('critical') || (log.post_fight_condition || '').toLowerCase().includes('severely')
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-teal-500/10 text-teal-400 border-teal-500/20'
                        }`}>
                          {log.post_fight_condition}
                        </span>
                      ) : (
                        <span className="text-[9px] text-muted-foreground font-bold">—</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {log.video_url ? (
                        <a href={log.video_url} target="_blank" rel="noopener noreferrer" title="Watch match video" className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 hover:border-emerald-500/40 transition-all cursor-pointer">
                          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3" /></svg>
                        </a>
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
}
