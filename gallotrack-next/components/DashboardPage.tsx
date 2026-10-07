'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Filler } from 'chart.js';
import { getAgeLabel } from '@/lib/helpers';
import { formatBirdCodeForDisplay } from '@/lib/bird-code';
import { useChartTokens, withAlpha } from '@/lib/chart-tokens';
import { useFowl } from '@/lib/contexts/fowl-context';
import { useUI } from '@/lib/contexts/ui-context';
import MatchLogsTable from '@/components/match/MatchLogsTable';
import { LayoutDashboard, Trophy, Zap, Calendar, Dna, Link2, TrendingUp, PieChart, Search, Stethoscope, Skull, Medal, Download, Printer, ChevronDown } from 'lucide-react';
import ChickenIcon from '@/components/ChickenIcon';
import DateRangePicker from '@/components/DateRangePicker';
import { downloadCsv, printReport } from '@/lib/report-export';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Filler);

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function TrendChip({ up, label }: { up: boolean; label: string }) {
  if (!up) {
    return <span className="text-sm font-bold text-muted-foreground">{label}</span>;
  }
  return (
    <span className="inline-flex items-center gap-1 text-sm font-bold text-success bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-full">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6" /></svg>
      {label}
    </span>
  );
}

export default function DashboardPage() {
  const fowl = useFowl();
  const ui = useUI();
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const chart = useChartTokens(resolvedTheme);

  const {
    fowls, matchHistory, pairingAnalytics, activeFowls, maleActiveFowls, femaleActiveFowls,
    monthLabels, matchesByMonth, activeSpark, trendWinRate,
    upcomingMilestones, crossbreedChartData, winRatePct, winsCount, lossesCount,
    dateRangeLabel, dateRangeOpen, setDateRangeOpen,
    dateRangePreset, setDateRangePreset,
    dateRangeCustom, setDateRangeCustom,
    fetchDatabaseResources, loading,
    birdCodes,
  } = fowl;

  const [reportsMenuOpen, setReportsMenuOpen] = React.useState(false);

  const navigate = (page: string, subTab?: string) => {
    if (subTab) ui.setProfilingSubTab(subTab as never);
    router.push(`/${page}`);
  };

  const weeklyCounts = React.useMemo(() => {
    const isWithinThisWeek = (value?: string) => {
      if (!value) return false;
      const t = new Date(value).getTime();
      // eslint-disable-next-line react-hooks/purity -- Date.now() is acceptable for relative time display
      return !isNaN(t) && Date.now() - t < WEEK_MS;
    };
    return {
      activeNewThisWeek: activeFowls.filter((f) => isWithinThisWeek(f.created_at)).length,
      matchesThisWeek: matchHistory.filter((m) => isWithinThisWeek(m.date)).length,
    };
  }, [activeFowls, matchHistory]);
  const { activeNewThisWeek, matchesThisWeek } = weeklyCounts;

  const matchColumns = ['Date', 'Our Chicken', 'Opponent', 'Breed', 'Opponent Breed', 'Event', 'Outcome', 'Location', 'Post-Fight Condition', 'Notes'];
  const matchRows = React.useMemo(
    () =>
      matchHistory.map((m) => [
        m.date, m.entry_name, m.opponent, m.breed, m.opponent_breed,
        [m.event_type, m.type].filter(Boolean).join(' · '), m.outcome, m.location,
        m.post_fight_condition, [m.side, m.notes].filter(Boolean).join(' · '),
      ]),
    [matchHistory],
  );

  const registryColumns = ['Bird Code', 'Name', 'Gender', 'Breed', 'Birthdate', 'Age', 'Status', 'Weight', 'Height', 'Sire', 'Dam', 'Bloodline %'];
  const registryRows = React.useMemo(
    () =>
      fowls.map((f) => [
        formatBirdCodeForDisplay(birdCodes.get(String(f.id)) || f.bird_code || ''),
        f.name, f.gender, f.breed, f.birthdate, f.age, f.status, f.weight, f.height,
        f.sire, f.dam, f.bloodline_pct,
      ]),
    [fowls, birdCodes],
  );

  const topStrains = React.useMemo(() => {
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
    return Array.from(strainMap.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);
  }, [activeFowls]);

  const exportMatchesCsv = () => downloadCsv('gallotrack-match-history', [matchColumns, ...matchRows]);
  const exportRegistryCsv = () => downloadCsv('gallotrack-fowl-registry', [registryColumns, ...registryRows]);
  const printPerformanceReport = () =>
    printReport({
      title: 'GalloTrack Performance Report',
      meta: `${dateRangeLabel} · ${activeFowls.length} active birds · ${matchHistory.length} matches logged`,
      sections: [
        {
          heading: 'Performance Metrics',
          fields: [
            { label: 'Overall win rate', value: winsCount + lossesCount > 0 ? `${winRatePct}%` : '—' },
            { label: 'Record', value: `${winsCount}W – ${lossesCount}L` },
            { label: 'Matches logged', value: String(matchHistory.length) },
            { label: 'Active registry', value: `${activeFowls.length} (${maleActiveFowls.length} breeding males · ${femaleActiveFowls.length} breeding females)` },
          ],
        },
        {
          heading: 'Bloodline Win Ratios',
          table: {
            columns: ['Bloodline cross', 'Win rate %'],
            rows: crossbreedChartData.labels.map((l, i) => [l, crossbreedChartData.data[i]]),
          },
        },
        {
          heading: 'Monthly Activity',
          table: {
            columns: ['Month', 'Matches', 'Win rate %'],
            rows: monthLabels.map((l, i) => [l, matchesByMonth[i], trendWinRate[i]]),
          },
        },
        { heading: 'Fowl Registry', table: { columns: registryColumns, rows: registryRows } },
      ],
    });

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* HEADER CARDS */}
      <div className="rounded-lg border border-border bg-card/70 p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-md bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-inner"><LayoutDashboard className="w-5 h-5 text-success" /></div>
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-card-foreground tracking-tight">Chicken Farm Dashboard</h1>
            <p className="text-sm text-muted-foreground font-semibold mt-1">Registry, match results, milestones, and bloodline performance of your chickens</p>
          </div>
        </div>
        {/* HEADER ACTIONS: DATE RANGE PICKER & DASHBOARD REPORTS */}
        <div className="flex flex-wrap items-center gap-2.5">
          <DateRangePicker
            label={dateRangeLabel}
            preset={dateRangePreset}
            custom={dateRangeCustom}
            open={dateRangeOpen}
            onOpenChange={setDateRangeOpen}
            onApply={(p, c) => { setDateRangePreset(p); setDateRangeCustom(c); }}
          />

          {/* DEDICATED REPORTS & EXPORTS MENU */}
          <div className="relative">
            {reportsMenuOpen && (
              <div
                className="fixed inset-0 z-40"
                onClick={() => setReportsMenuOpen(false)}
                aria-hidden="true"
              />
            )}
            <button
              type="button"
              onClick={() => setReportsMenuOpen(!reportsMenuOpen)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-card border border-slate-200/90 dark:border-border hover:bg-slate-50 dark:hover:bg-muted/40 shadow-2xs transition-colors cursor-pointer"
              aria-label="Export reports and data"
              aria-expanded={reportsMenuOpen}
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Export & Reports</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${reportsMenuOpen ? "rotate-180" : ""}`} />
            </button>

            {reportsMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 z-50 w-56 rounded-xl bg-white dark:bg-card border border-slate-200/90 dark:border-border shadow-xl p-1.5 space-y-0.5"
              >
                <div className="px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Data Exports
                </div>
                <button
                  type="button"
                  onClick={() => { setReportsMenuOpen(false); exportMatchesCsv(); }}
                  className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-muted transition-colors cursor-pointer flex items-center gap-2.5"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Export matches (CSV)</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setReportsMenuOpen(false); exportRegistryCsv(); }}
                  className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-muted transition-colors cursor-pointer flex items-center gap-2.5"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Export registry (CSV)</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setReportsMenuOpen(false); printPerformanceReport(); }}
                  className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-muted transition-colors cursor-pointer flex items-center gap-2.5"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>Print report</span>
                </button>

                <div className="h-px bg-slate-100 dark:bg-border my-1" />

                <button
                  type="button"
                  onClick={() => { setReportsMenuOpen(false); fetchDatabaseResources(); }}
                  disabled={loading}
                  className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-muted transition-colors cursor-pointer flex items-center gap-2.5"
                >
                  <span className={`text-xs ${loading ? "animate-spin" : ""}`}>↻</span>
                  <span>{loading ? "Syncing..." : "Sync Data"}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TOP METRICS ROW — 4 CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

        {/* ACTIVE FOWL REGISTRY */}
        <div className="group relative bg-card rounded-lg border border-border shadow-sm p-5 flex flex-col gap-3 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-t-lg"></div>
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider leading-tight">Active Chicken Registry</span>
            <div className="w-9 h-9 rounded-md bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20"><ChickenIcon className="w-4 h-4 text-white" /></div>
          </div>
          <div className="text-3xl font-black text-card-foreground tracking-tight leading-none mt-1">{activeFowls.length}</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 bg-sky-500/10 border border-sky-500/20 rounded-md px-2.5 py-2">
              <span className="text-sm"><ChickenIcon className="w-4 h-4 text-info" /></span>
              <div>
                <p className="text-base font-black text-info leading-none">{maleActiveFowls.length}</p>
                <p className="text-sm font-bold uppercase tracking-wider text-info mt-0.5">Breeding Males</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-pink-500/10 border border-pink-500/20 rounded-md px-2.5 py-2">
              <span className="text-sm"><ChickenIcon className="w-4 h-4 text-pink" /></span>
              <div>
                <p className="text-base font-black text-pink leading-none">{femaleActiveFowls.length}</p>
                <p className="text-sm font-bold uppercase tracking-wider text-pink mt-0.5">Breeding Females</p>
              </div>
            </div>
          </div>
          <div className="h-12 -mx-1">
            {activeFowls.length > 0 ? (
              <Line
                data={{
                  labels: monthLabels,
                  datasets: [{ data: activeSpark, borderColor: chart.success, backgroundColor: withAlpha(chart.success, 0.14), fill: true, borderWidth: 2, pointRadius: 0, tension: 0.4 }],
                }}
                options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false, min: 0 } } }}
              />
            ) : (
              <div className="text-sm font-bold text-muted-foreground pt-2">No active chickens yet</div>
            )}
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-border pt-2.5">
            <TrendChip up={activeNewThisWeek > 0} label={activeNewThisWeek > 0 ? `${activeNewThisWeek} this week` : 'No change'} />
            <span className="text-sm font-bold uppercase tracking-widest text-success bg-emerald-500/10 px-2 py-0.5 rounded-full shrink-0">Registered</span>
          </div>
        </div>

        {/* TOTAL MATCHES LOGGED */}
        <div className="group relative bg-card rounded-lg border border-border shadow-sm p-5 flex flex-col gap-3 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-t-lg"></div>
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider leading-tight">Total Matches Logged</span>
            <div className="w-9 h-9 rounded-md bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20"><Trophy className="w-4 h-4 text-white" /></div>
          </div>
          <div className="text-3xl font-black text-card-foreground tracking-tight leading-none mt-1">{matchHistory.length}</div>
          <div className="h-12 -mx-1">
            {matchHistory.length > 0 ? (
              <Bar
                data={{
                  labels: monthLabels,
                  datasets: [{ data: matchesByMonth, backgroundColor: chart.info, borderRadius: 4, maxBarThickness: 14 }],
                }}
                options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false, min: 0 } } }}
              />
            ) : (
              <div className="text-sm font-bold text-muted-foreground pt-2">No matches logged yet</div>
            )}
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-border pt-2.5">
            <TrendChip up={matchesThisWeek > 0} label={matchesThisWeek > 0 ? `${matchesThisWeek} this week` : 'No change'} />
            <span className="text-sm font-bold uppercase tracking-widest text-indigo bg-indigo-500/10 px-2 py-0.5 rounded-full shrink-0">Logged</span>
          </div>
        </div>

        {/* OVERALL WIN RATE */}
        <div
          role="button"
          tabIndex={0}
          aria-label={`Overall win rate: ${winsCount + lossesCount > 0 ? `${winRatePct}%` : 'No fights'}, ${winsCount}W ${lossesCount}L. Click to view win rate breakdown by chicken`}
          onClick={() => ui.setShowPerFowlBreakdownModal(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              ui.setShowPerFowlBreakdownModal(true);
            }
          }}
          className="group relative bg-card rounded-lg border border-border shadow-sm p-5 flex flex-col gap-3 hover:shadow-lg hover:-translate-y-0.5 hover:border-emerald-400/60 cursor-pointer transition-all duration-300 overflow-hidden focus:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-600 to-teal-400 rounded-t-lg"></div>
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider leading-tight">Overall Win Rate</span>
            <span className="text-sm font-black text-success bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full shrink-0">{winsCount}W · {lossesCount}L</span>
          </div>
          <div className="text-3xl font-black text-success tracking-tight leading-none mt-1">
            {winsCount + lossesCount > 0 ? `${winRatePct}%` : '—'}
          </div>
          <p className="text-xs font-semibold text-muted-foreground -mt-1.5">
            Wins ÷ (wins + losses) — draws are excluded
          </p>
          <div className="h-12 -mx-1">
            {matchHistory.length > 0 ? (
              <Line
                data={{
                  labels: monthLabels,
                  datasets: [{ data: trendWinRate, borderColor: chart.success, backgroundColor: withAlpha(chart.success, 0.16), fill: true, borderWidth: 2, pointRadius: 0, tension: 0.4 }],
                }}
                options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false, min: 0, max: 100 } } }}
              />
            ) : (
              <div className="text-sm font-bold text-muted-foreground pt-2">No matches logged yet</div>
            )}
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-border pt-2.5">
            <span className="text-sm font-extrabold text-success">Win trend</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                ui.setShowPerFowlBreakdownModal(true);
              }}
              className="text-sm font-black text-muted-foreground group-hover:text-success transition-colors flex items-center gap-1 cursor-pointer focus:outline-hidden hover:underline"
              aria-label="View win rate breakdown by chicken"
            >
              <Search className="w-3 h-3" /> Breakdown
            </button>
          </div>
        </div>

        {/* QUICK ACTIONS */}
        <div className="group relative bg-card rounded-lg border border-border shadow-sm p-5 flex flex-col gap-3 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-purple-400 rounded-t-lg"></div>
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider leading-tight">Quick Actions</span>
            <div className="w-9 h-9 rounded-md bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shrink-0 shadow-md shadow-violet-500/20"><Zap className="w-4 h-4 text-white" /></div>
          </div>
          <div className="space-y-2 mt-1">
            <button
              onClick={() => navigate('profiling', 'form')}
              className="w-full text-left bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-md px-3.5 py-3 transition-all cursor-pointer group/btn"
            >
              <p className="text-sm font-extrabold text-success group-hover/btn:text-success">+ Register New Chicken</p>
              <p className="text-sm text-success/70 font-semibold mt-0.5">Add to your roster</p>
            </button>
            <button
              onClick={() => navigate('profiling', 'matchForm')}
              className="w-full text-left bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-md px-3.5 py-3 transition-all cursor-pointer group/btn"
            >
              <p className="text-sm font-extrabold text-indigo group-hover/btn:text-indigo">+ Log Match Result</p>
              <p className="text-sm text-indigo/70 font-semibold mt-0.5">Record fight outcome</p>
            </button>
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-border pt-2.5">
            <span className="text-sm font-extrabold text-muted-foreground">Start here</span>
            <span className="text-sm font-bold uppercase tracking-widest text-violet bg-violet-500/10 px-2 py-0.5 rounded-full shrink-0">Actions</span>
          </div>
        </div>
      </div>

      {/* MILESTONES & BLOODLINE ROW — 2 CARDS */}
      {upcomingMilestones.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* DEVELOPMENT CALENDAR & UPCOMING MILESTONES */}
          <div className="bg-card rounded-lg border border-border shadow-sm p-5 sm:p-6 flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0"><Calendar className="w-4 h-4 text-success" /></span>
                <div>
                  <h2 className="text-sm font-black text-card-foreground tracking-tight">Upcoming Milestones</h2>
                  <p className="text-sm text-muted-foreground font-semibold mt-0.5">{upcomingMilestones.filter(x => x.info.next && x.info.next.daysUntil >= 0 && x.info.next.daysUntil <= 30).length} in the next 30 days</p>
                </div>
              </div>
              <span className="text-sm font-mono font-black text-success bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">AUTO</span>
            </div>
            <div className="space-y-2 flex-1">
              {upcomingMilestones.slice(0, 5).map(({ fowl, info }) => {
                const soon = info.next !== null && info.next!.daysUntil >= 0 && info.next!.daysUntil <= 30;
                const overdue = info.next !== null && info.next!.daysUntil < 0;
                return (
                  <div key={fowl.id} className={`flex items-center gap-3 p-3 rounded-md border transition-all ${soon ? 'bg-emerald-500/10 border-emerald-500/20' : overdue ? 'bg-rose-500/10 border-rose-500/20' : 'bg-muted/50 border-border'}`}>
                    <span className="w-9 h-9 rounded-sm border border-border bg-muted flex items-center justify-center text-base shrink-0">{info.current?.icon || '🐤'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-card-foreground truncate">{fowl.name} <span className="text-sm font-bold text-muted-foreground font-mono">#{fowl.id}</span></p>
                      <p className="text-sm text-muted-foreground font-semibold truncate">
                        {info.current?.stage || 'Chick'} · Age {getAgeLabel(info.parts)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      {info.next ? (
                        <>
                          <p className={`text-sm font-black uppercase tracking-wide ${soon ? 'text-success' : overdue ? 'text-danger' : 'text-warning'}`}>
                            {info.next.stage} {soon ? '· SOON' : overdue ? '· OVERDUE' : ''}
                          </p>
                          <p className="text-sm font-mono text-muted-foreground font-bold">
                            {info.next.daysUntil >= 0 ? `in ${info.next.daysUntil}d` : `${Math.abs(info.next.daysUntil)}d ago`}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm font-black text-success uppercase">Fully mature</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => router.push('/milestones')}
              className="mt-3 w-full text-center text-sm font-bold text-success hover:text-success hover:bg-emerald-500/10 border border-emerald-500/20 rounded-md py-2 transition-all cursor-pointer"
            >
              View All Milestones →
            </button>
          </div>

          {/* BLOODLINE OVERVIEW */}
          <div className="bg-card rounded-lg border border-border shadow-sm p-5 sm:p-6 flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-md bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shrink-0"><Dna className="w-4 h-4 text-teal" /></span>
                <div>
                  <h3 className="text-sm font-black text-card-foreground tracking-tight">Bloodline Overview</h3>
                  <p className="text-sm text-muted-foreground font-semibold mt-0.5">{activeFowls.length} active chickens across all strains</p>
                </div>
              </div>
              <span className="text-sm font-mono font-black text-teal bg-teal-500/10 border border-teal-500/20 px-2.5 py-1 rounded-full">LIVE</span>
            </div>
            <div className="space-y-2 flex-1">
              {(() => {
                if (topStrains.length === 0) return <p className="text-sm text-muted-foreground font-semibold text-center py-4">No strain data yet.</p>;
                const maxCount = topStrains[0][1].count;
                return topStrains.map(([strain, data]) => (
                  <div key={strain} className="bg-muted/50 border border-border rounded-md px-3 py-2.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-black text-card-foreground">{strain}</span>
                      <span className="text-sm font-bold text-teal">{data.count} chicken{data.count !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-teal-400 to-emerald-500 rounded-full transition-all" style={{ width: `${(data.count / maxCount) * 100}%` }}></div>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-sm font-bold text-info flex items-center gap-1"><ChickenIcon className="w-3 h-3" /> {data.males}</span>
                      <span className="text-sm font-bold text-pink flex items-center gap-1"><ChickenIcon className="w-3 h-3" /> {data.females}</span>
                    </div>
                  </div>
                ));
              })()}
            </div>
            <button
              type="button"
              onClick={() => router.push('/lineage')}
              className="mt-3 w-full text-center text-sm font-bold text-teal hover:text-teal hover:bg-teal-500/10 border border-teal-500/20 rounded-md py-2 transition-all cursor-pointer"
            >
              View Full Lineage →
            </button>
          </div>
        </div>
      )}

      {/* MIDDLE CHARTS ROW — 2 CARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* GAMEFOWL POPULATION & PERFORMANCE TRENDS */}
        <div className="bg-card rounded-lg border border-border shadow-sm p-5 sm:p-6 flex flex-col lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
            <div>
              <h3 className="text-sm font-black text-card-foreground tracking-tight">Chicken Population & Performance Trends (Q3 2026)</h3>
              <p className="text-sm text-muted-foreground font-semibold mt-0.5">Population growth versus empirical win-rate trajectory across the last six months</p>
            </div>
            <div className="flex items-center gap-4 text-sm font-bold text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-success"></span>Population</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded border-t-2 border-dashed border-info bg-transparent"></span>Win Rate %</span>
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
                      borderColor: chart.success,
                      backgroundColor: withAlpha(chart.success, 0.16),
                      fill: true,
                      borderWidth: 2.5,
                      pointRadius: 3,
                      pointBackgroundColor: chart.success,
                      tension: 0.4,
                      yAxisID: 'y',
                    },
                    {
                      label: 'Win Rate %',
                      data: trendWinRate,
                      borderColor: chart.info,
                      backgroundColor: withAlpha(chart.info, 0.06),
                      fill: false,
                      borderWidth: 2,
                      borderDash: [6, 5],
                      pointRadius: 3,
                      pointBackgroundColor: chart.info,
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
                      backgroundColor: chart.card,
                      titleColor: chart.foreground,
                      bodyColor: chart.foreground,
                      borderColor: chart.border,
                      borderWidth: 1,
                      titleFont: { size: 11, weight: 'bold' },
                      bodyFont: { size: 11 },
                      padding: 10,
                      cornerRadius: 8,
                    },
                  },
                  scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 10, weight: 'bold' }, color: chart.mutedForeground } },
                    y: { min: 0, grid: { color: withAlpha(chart.mutedForeground, 0.2) }, ticks: { font: { size: 10, weight: 'bold' }, color: chart.mutedForeground }, title: { display: true, text: 'Population', font: { size: 9, weight: 'bold' }, color: chart.mutedForeground } },
                    y1: { min: 0, max: 100, position: 'right', grid: { drawOnChartArea: false }, ticks: { font: { size: 10, weight: 'bold' }, color: chart.info, callback: (v) => `${v}%` }, title: { display: true, text: 'Win Rate', font: { size: 9, weight: 'bold' }, color: chart.mutedForeground } },
                  },
                }}
              />
            </div>
          ) : (
            <div className="my-auto flex flex-col items-center justify-center text-center p-10 space-y-2">
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-muted-foreground"><TrendingUp className="w-5 h-5" /></div>
              <p className="text-sm font-extrabold text-muted-foreground">No data available</p>
              <p className="text-sm text-muted-foreground max-w-[220px]">Encode chickens and log matches to visualize population and performance trends.</p>
            </div>
          )}
        </div>

        {/* BLOODLINE WIN RATIOS */}
        <div className="bg-card rounded-lg border border-border shadow-sm p-5 sm:p-6 flex flex-col">
          <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
            <div>
              <h3 className="text-sm font-black text-card-foreground tracking-tight">Bloodline Win Ratios</h3>
              <p className="text-sm text-muted-foreground font-semibold mt-0.5">Win share by primary genetic strain</p>
            </div>
            <span className="text-sm font-mono bg-emerald-500/10 text-success border border-emerald-500/20 px-2 py-0.5 rounded-full font-black shrink-0">GENETIC</span>
          </div>
          {crossbreedChartData.hasData ? (
            <>
              <div className="relative mx-auto my-4 h-52 w-52 sm:h-56 sm:w-56">
                <Doughnut
                  data={{
                    labels: crossbreedChartData.labels.map((l, i) => `${l} ${crossbreedChartData.data[i]}%`),
                    datasets: [{
                      data: crossbreedChartData.data,
                      backgroundColor: chart.series,
                      borderWidth: 3,
                      borderColor: chart.card,
                      hoverOffset: 6,
                    }],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '68%',
                    plugins: {
                      legend: { display: false },
                      tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}` }, backgroundColor: chart.card, titleColor: chart.foreground, bodyColor: chart.foreground, borderColor: chart.border, borderWidth: 1, padding: 10, cornerRadius: 8 },
                    },
                  }}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-success">
                    {winsCount + lossesCount > 0 ? `${winRatePct}%` : '—'}
                  </span>
                  <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Win Rate</span>
                </div>
              </div>
              <ul className="mx-auto flex flex-col items-center gap-1.5">
                {crossbreedChartData.labels.map((label, i) => (
                  <li key={label} className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <span
                      aria-hidden="true"
                      className="h-2.5 w-2.5 shrink-0 rounded-sm"
                      style={{ backgroundColor: chart.series[i % chart.series.length] }}
                    />
                    <span>{label} {crossbreedChartData.data[i]}%</span>
                  </li>
                ))}
              </ul>
              <p className="text-center text-sm text-muted-foreground font-semibold pb-1 mt-3">Based on {matchHistory.length} total {matchHistory.length === 1 ? 'match' : 'matches'}</p>
            </>
          ) : (
            <div className="my-auto flex flex-col items-center justify-center text-center p-6 space-y-2">
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-muted-foreground"><PieChart className="w-5 h-5" /></div>
              <p className="text-sm font-extrabold text-muted-foreground">No data available</p>
              <p className="text-sm text-muted-foreground max-w-[200px]">Log match records to generate bloodline win ratio breakdowns.</p>
            </div>
          )}
        </div>
      </div>

      {/* BREEDING PAIR PERFORMANCE ANALYTICS */}
      {pairingAnalytics.ranked.length > 0 && (
        <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
          <div className="p-5 border-b border-border bg-muted/30 flex flex-wrap justify-between items-center gap-3">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0"><Link2 className="w-4 h-4 text-success" /></span>
              <div>
                <h3 className="text-sm font-black text-card-foreground tracking-tight">Breeding Pair Performance Analytics</h3>
                <p className="text-sm text-muted-foreground font-semibold mt-0.5">Empirical win-rate ranking per Sire × Dam cross — pinpoints proven pairings worth repeating and under-performers to drop from future breeding cycles</p>
              </div>
            </div>
            <span className="text-sm font-mono bg-emerald-500/10 text-success border border-emerald-500/20 font-black px-3 py-1 rounded-full hidden sm:inline">SIRE × DAM MATRIX</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse min-w-[860px]">
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
                  const elite = p.decided >= 5 && p.winRate >= 70;
                  const solid = p.winRate >= 50;
                  const weak = p.decided >= 5 && p.winRate < 50;
                  return (
                    <tr key={p.key} className={`hover:bg-muted/30 transition-colors ${weak ? 'bg-rose-500/5' : elite ? 'bg-emerald-500/5' : ''}`}>
                      <td className="p-4 pl-6 whitespace-nowrap">
                        {i === 0 ? <Medal className="w-4 h-4 text-warning" /> : i === 1 ? <Medal className="w-4 h-4 text-muted-foreground" /> : i === 2 ? <Medal className="w-4 h-4 text-amber-700" /> : <span className="font-mono font-black text-muted-foreground">#{i + 1}</span>}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0"><Link2 className="w-3.5 h-3.5 text-success" /></div>
                          <div className="min-w-0">
                            <p className="font-bold text-card-foreground">{p.sire} <span className="text-muted-foreground font-black">×</span> {p.dam}</p>
                            <p className="text-sm font-semibold text-muted-foreground truncate">{p.members.map((m) => m.name).join(', ')}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-center font-mono font-bold">{p.members.length}</td>
                      <td className="p-4 text-center font-mono font-bold">{p.totalFights}</td>
                      <td className="p-4 text-center font-mono font-extrabold text-success">{p.wins}</td>
                      <td className="p-4 text-center font-mono font-extrabold text-danger">{p.losses}</td>
                      <td className="p-4 text-center font-mono">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full font-black text-sm ${p.winRate >= 50 ? 'bg-emerald-500/15 text-success' : 'bg-rose-500/15 text-danger'}`}>
                          {p.winRate}%
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full font-black text-sm ${p.resilienceScore >= 80 ? 'bg-teal-500/15 text-teal' : p.resilienceScore >= 60 ? 'bg-amber-500/15 text-warning' : 'bg-rose-500/15 text-danger'}`}>
                            <Stethoscope className="w-3 h-3 inline mr-1" />{p.resilienceScore > 0 ? `${p.resilienceScore}%` : 'N/A'}
                          </span>
                          {p.casualties > 0 && (
                            <span title={`${p.casualties} deceased + ${p.critical} critical from injuries`} className="text-sm font-black text-danger bg-rose-500/10 border border-rose-500/20 rounded-full px-2 py-0.5 whitespace-nowrap flex items-center gap-1"><Skull className="w-3 h-3" /> {p.casualties}</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-center pr-6">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full font-black text-sm uppercase tracking-wider border whitespace-nowrap ${
                            elite ? 'bg-emerald-500/15 text-success border-emerald-500/30'
                            : solid ? 'bg-sky-500/15 text-info border-sky-500/30'
                            : weak ? 'bg-rose-500/15 text-danger border-rose-500/30'
                            : 'bg-muted text-muted-foreground border-border'
                          }`}>
                            {elite ? 'Elite — Repeat Cross' : solid ? 'Solid Pairing' : weak ? 'Under-Performing' : 'Inconclusive'}
                          </span>
                          <span className={`text-sm font-bold px-1.5 py-0.5 rounded-full ${
                            p.verdictConfidence === 'High' ? 'bg-emerald-500/10 text-success' :
                            p.verdictConfidence === 'Medium' ? 'bg-amber-500/10 text-warning' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {p.verdictConfidence} Confidence
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
            <span className="text-teal">Survivability = post-fight condition resilience (Fit=100 · Critical=30 · Deceased=0)</span>
            <span className="text-warning">Confidence = Low (&lt;5 fights) · Medium (5-9) · High (10+)</span>
            <span className="ml-auto">Focus future breeding cycles strictly on high-performing, resilient bloodlines.</span>
          </div>
        </div>
      )}

      {/* HISTORICAL ANALYTICS MATCH LOGS TABLE */}
      <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border bg-muted/30 flex flex-wrap justify-between items-center gap-3">
          <div>
            <h3 className="text-sm font-black text-card-foreground tracking-tight">Historical Analytics Match Logs</h3>
            <p className="text-sm text-muted-foreground font-semibold mt-0.5">Complete record of logged derby and arena encounters</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-mono bg-emerald-500/10 text-success border border-emerald-500/20 font-black px-3 py-1 rounded-full hidden sm:inline">D4 ANALYTICS DB</span>
            <button
              type="button"
              onClick={() => navigate('profiling', 'matchForm')}
              className="bg-card hover:bg-emerald-500/20 active:scale-[0.98] text-card-foreground text-sm font-black px-4 py-2 rounded-sm border border-border shadow-sm transition-all cursor-pointer"
            >
              View All →
            </button>
          </div>
        </div>
        <MatchLogsTable />
      </div>
    </div>
  );
}
