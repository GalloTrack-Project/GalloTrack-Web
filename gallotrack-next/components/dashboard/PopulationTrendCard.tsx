'use client';

import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import type { ChartTokens } from '@/lib/chart-tokens';
import { withAlpha } from '@/lib/chart-tokens';
import { useT } from '@/lib/i18n';
import type { PopulationHistory } from '@/lib/hooks/use-fowl-analytics';
import { cn } from '@/components/ui/utils';

export const POPULATION_TREND_MIN_MONTHS = 4;
const RANGES = [4, 6, 12] as const;
type TrendRange = (typeof RANGES)[number];

export type PopulationTrendCardProps = {
  activeCount: number;
  populationHistory: PopulationHistory;
  chart: ChartTokens;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  minMonths?: number;
};

function monthsWithData(history: PopulationHistory): number {
  return history.labels.reduce(
    (count, _label, index) =>
      count + (history.active[index] > 0 || history.matches[index] > 0 ? 1 : 0),
    0,
  );
}

export function PopulationTrendCard({
  activeCount,
  populationHistory,
  chart,
  loading = false,
  error = null,
  onRetry,
  minMonths = POPULATION_TREND_MIN_MONTHS,
}: PopulationTrendCardProps) {
  const t = useT();
  const [range, setRange] = React.useState<TrendRange>(4);
  const tableId = `${React.useId()}-population-data`;

  const recordedMonths = monthsWithData(populationHistory);
  const thresholdReached = recordedMonths >= minMonths;
  const coverageMonths = Math.min(recordedMonths, minMonths);
  const progressPct = minMonths > 0 ? (coverageMonths / minMonths) * 100 : 0;
  const coverageText = t('heritage.dataCoverageValue', {
    done: String(coverageMonths),
    total: String(minMonths),
  });
  const progressText = t('heritage.trendProgress', {
    done: String(coverageMonths),
    total: String(minMonths),
  });

  const visibleLabels = populationHistory.labels.slice(-range);
  const visibleActive = populationHistory.active.slice(-range);
  const visibleMatches = populationHistory.matches.slice(-range);
  const visibleWinRate = populationHistory.winRate.slice(-range);
  const currentActive = visibleActive[visibleActive.length - 1] ?? activeCount;
  const previousActive = visibleActive[visibleActive.length - 2] ?? 0;
  const delta = thresholdReached && previousActive > 0 ? currentActive - previousActive : null;
  const deltaText =
    delta == null
      ? null
      : delta === 0
        ? t('heritage.noChangeVsLastMonth')
        : t('heritage.deltaVsLastMonth', {
            delta: delta > 0 ? `+${delta}` : String(delta),
          });

  return (
    <section
      data-testid="population-trend-card"
      className={cn(
        'border-border bg-card flex min-w-0 flex-col rounded-2xl border p-4 shadow-sm sm:p-5',
        thresholdReached ? 'lg:col-span-6' : 'lg:col-span-3',
      )}
    >
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="bg-accent-soft text-accent flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
            <TrendingUp className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className="text-card-foreground text-sm font-black break-words">
              {t('heritage.populationPerformance')}
            </h3>
            <p className="text-muted-foreground mt-0.5 text-xs font-semibold break-words">
              {t('heritage.populationPerformanceSubtitle')}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div
          data-testid="population-trend-loading"
          role="status"
          aria-live="polite"
          className="mt-4 min-h-[18rem] flex-1 animate-pulse motion-reduce:animate-none"
        >
          <span className="sr-only">{t('heritage.populationLoading')}</span>
          <div className="bg-muted h-3 w-28 rounded-full" />
          <div className="bg-muted mt-2 h-10 w-20 rounded-lg" />
          <div className="bg-muted mt-2 h-3 w-40 rounded-full" />
          <div className="bg-muted mt-5 h-24 rounded-xl" />
          <div className="bg-muted mt-4 h-3 w-full rounded-full" />
        </div>
      ) : error ? (
        <div
          data-testid="population-trend-error"
          role="alert"
          className="mt-4 flex min-h-[18rem] flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-center text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
        >
          <p className="text-sm font-black break-words">{t('heritage.populationError')}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="border-border bg-card text-foreground hover:bg-muted inline-flex min-h-11 items-center gap-2 rounded-md border px-3 text-xs font-black"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              {t('common.retry')}
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="mt-4 flex min-w-0 flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-muted-foreground text-[10px] font-black tracking-widest uppercase">
                {t('heritage.activePopulation')}
              </p>
              <p
                data-testid="population-current-value"
                className="text-card-foreground text-4xl leading-none font-black tabular-nums"
              >
                {activeCount}
              </p>
              <p className="text-muted-foreground mt-1 text-xs font-semibold break-words">
                {t('heritage.activePopulationCaption')}
              </p>
            </div>
            {deltaText && (
              <span
                data-testid="population-delta"
                className={cn(
                  'inline-flex min-h-8 items-center gap-1 rounded-full border px-2 py-1 text-xs font-black tabular-nums',
                  delta != null && delta > 0
                    ? 'border-success/30 bg-success/10 text-success'
                    : delta != null && delta < 0
                      ? 'border-loss/30 bg-loss-bg text-loss'
                      : 'border-border bg-muted text-muted-foreground',
                )}
              >
                {delta != null && delta > 0 ? (
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                ) : delta != null && delta < 0 ? (
                  <ArrowDownRight className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {deltaText}
              </span>
            )}
          </div>

          <div className="border-border bg-muted/25 mt-4 rounded-xl border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-black">
              <span className="text-card-foreground">{t('heritage.dataCoverage')}</span>
              <span className="text-muted-foreground tabular-nums">{coverageText}</span>
            </div>
            <div
              data-testid="population-trend-progress"
              role="progressbar"
              aria-label={t('heritage.trendProgressLabel')}
              aria-valuemin={0}
              aria-valuemax={minMonths}
              aria-valuenow={coverageMonths}
              aria-valuetext={progressText}
              className="border-border bg-card mt-2 h-2 w-full overflow-hidden rounded-full border"
            >
              <div
                className="bg-primary h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-muted-foreground mt-2 text-xs font-semibold break-words">
              {t('heritage.dataCoverageNote')}
            </p>
          </div>

          {!thresholdReached ? (
            <div
              data-testid="population-trend-empty"
              className="mt-3 flex min-h-[18rem] flex-1 flex-col items-center justify-center text-center max-sm:min-h-[20.75rem]"
            >
              <TrendingUp className="text-muted-foreground mb-2 h-7 w-7" aria-hidden="true" />
              <p className="text-card-foreground max-w-xs text-sm font-black break-words">
                {t('heritage.trendEmptyBasis', { months: String(minMonths) })}
              </p>
            </div>
          ) : (
            <div data-testid="population-trend-chart" className="mt-3 flex min-h-[18rem] flex-1 flex-col">
              <div
                role="group"
                aria-label={t('heritage.rangeSelectorLabel')}
                className="flex flex-wrap gap-1.5"
              >
                {RANGES.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRange(value)}
                    aria-pressed={range === value}
                    className={cn(
                      'min-h-9 rounded-md border px-2.5 text-xs font-black tabular-nums transition-colors',
                      range === value
                        ? 'border-primary bg-accent-soft text-primary'
                        : 'border-border bg-card text-muted-foreground hover:bg-muted',
                    )}
                  >
                    {t('heritage.lastNMonths', { count: String(value) })}
                  </button>
                ))}
              </div>

              <div
                className="mt-2 min-h-44 flex-1"
                role="img"
                aria-label={`${t('heritage.populationPerformance')}. ${t('heritage.populationChartBasis')}`}
                aria-describedby={tableId}
              >
                <Line
                  data={{
                    labels: visibleLabels,
                    datasets: [
                      {
                        label: t('heritage.activePopulation'),
                        data: visibleActive,
                        borderColor: chart.success,
                        backgroundColor: withAlpha(chart.success, 0.16),
                        fill: true,
                        borderWidth: 2.5,
                        pointRadius: 3,
                        pointHoverRadius: 5,
                        tension: 0.35,
                      },
                      {
                        label: t('heritage.winRateTrend'),
                        data: visibleWinRate,
                        borderColor: chart.warning,
                        backgroundColor: withAlpha(chart.warning, 0.06),
                        fill: false,
                        borderWidth: 2,
                        borderDash: [5, 4],
                        pointRadius: 3,
                        pointHoverRadius: 5,
                        spanGaps: false,
                        tension: 0.35,
                        yAxisID: 'y1',
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                      legend: {
                        display: true,
                        labels: {
                          boxWidth: 10,
                          boxHeight: 10,
                          color: chart.foreground,
                          font: { size: 9, weight: 'bold' },
                        },
                      },
                      tooltip: {
                        backgroundColor: chart.card,
                        titleColor: chart.foreground,
                        bodyColor: chart.foreground,
                        borderColor: chart.border,
                        borderWidth: 1,
                      },
                    },
                    scales: {
                      x: {
                        grid: { display: false },
                        ticks: {
                          color: chart.mutedForeground,
                          font: { size: 9, weight: 'bold' },
                          maxRotation: 0,
                          autoSkip: true,
                        },
                        title: {
                          display: true,
                          text: t('heritage.month'),
                          color: chart.mutedForeground,
                          font: { size: 9, weight: 'bold' },
                        },
                      },
                      y: {
                        beginAtZero: true,
                        grid: { color: withAlpha(chart.mutedForeground, 0.2) },
                        ticks: {
                          color: chart.mutedForeground,
                          font: { size: 9, weight: 'bold' },
                          precision: 0,
                        },
                        title: {
                          display: true,
                          text: t('heritage.activePopulation'),
                          color: chart.mutedForeground,
                          font: { size: 9, weight: 'bold' },
                        },
                      },
                      y1: {
                        beginAtZero: true,
                        max: 100,
                        position: 'right',
                        grid: { drawOnChartArea: false },
                        ticks: {
                          color: chart.warning,
                          callback: (value) => `${value}%`,
                          font: { size: 9, weight: 'bold' },
                        },
                        title: {
                          display: true,
                          text: t('heritage.winRateTrend'),
                          color: chart.mutedForeground,
                          font: { size: 9, weight: 'bold' },
                        },
                      },
                    },
                  }}
                />
              </div>

              <p className="text-muted-foreground mt-2 text-[11px] font-semibold break-words">
                {t('heritage.populationChartBasis')}
              </p>

              <table id={tableId} className="sr-only">
                <caption>{t('heritage.populationPerformance')}</caption>
                <thead>
                  <tr>
                    <th scope="col">{t('heritage.month')}</th>
                    <th scope="col">{t('heritage.activePopulation')}</th>
                    <th scope="col">{t('heritage.winRateTrend')}</th>
                    <th scope="col">{t('registry.tabMatchesShort')}</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleLabels.map((label, index) => (
                    <tr key={label}>
                      <th scope="row">{label}</th>
                      <td>{visibleActive[index]}</td>
                      <td>
                        {visibleWinRate[index] == null ? '—' : `${visibleWinRate[index]}%`}
                      </td>
                      <td>{visibleMatches[index]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
