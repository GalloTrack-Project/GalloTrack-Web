'use client';

import React from 'react';
import { Line } from 'react-chartjs-2';
import { TrendingUp } from 'lucide-react';
import type { ChartTokens } from '@/lib/chart-tokens';
import { withAlpha } from '@/lib/chart-tokens';
import { useT } from '@/lib/i18n';

export const POPULATION_TREND_MIN_MONTHS = 4;

export type PopulationTrendCardProps = {
  activeCount: number;
  monthLabels: string[];
  activeSpark: number[];
  trendWinRate: (number | null)[];
  matchesByMonth: number[];
  chart: ChartTokens;
  minMonths?: number;
};

function monthsWithData(
  monthLabels: string[],
  activeSpark: number[],
  matchesByMonth: number[],
): number {
  return monthLabels.reduce(
    (count, _label, index) =>
      count + (activeSpark[index] > 0 || matchesByMonth[index] > 0 ? 1 : 0),
    0,
  );
}

export function PopulationTrendCard({
  activeCount,
  monthLabels,
  activeSpark,
  trendWinRate,
  matchesByMonth,
  chart,
  minMonths = POPULATION_TREND_MIN_MONTHS,
}: PopulationTrendCardProps) {
  const t = useT();
  const recordedMonths = monthsWithData(monthLabels, activeSpark, matchesByMonth);
  const thresholdReached = recordedMonths >= minMonths;
  const recordedForProgress = Math.min(recordedMonths, minMonths);
  const progressPct = minMonths > 0 ? (recordedForProgress / minMonths) * 100 : 0;
  const progressText = t('heritage.trendProgress', {
    done: String(recordedForProgress),
    total: String(minMonths),
  });
  const populationText =
    activeCount === 1
      ? t('heritage.activeChickenCountOne')
      : t('heritage.activeChickenCount', { count: String(activeCount) });

  return (
    <section
      data-testid="population-trend-card"
      className="border-border bg-card flex min-w-0 flex-col rounded-2xl border p-4 shadow-sm sm:p-5 lg:col-span-3"
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

      {!thresholdReached ? (
        <div
          data-testid="population-trend-empty"
          className="mt-3 flex min-h-64 flex-1 flex-col items-center justify-center py-5 text-center"
        >
          <TrendingUp className="text-muted-foreground mb-2 h-8 w-8" aria-hidden="true" />
          <p className="text-card-foreground text-2xl font-black break-words">{populationText}</p>
          <p className="text-muted-foreground mt-1 max-w-sm text-xs font-semibold break-words">
            {t('heritage.trendEmptyBasis', { months: String(minMonths) })}
          </p>

          <div className="mt-3 w-full max-w-xs">
            <div className="text-muted-foreground flex items-center justify-between gap-2 text-xs font-bold">
              <span>{progressText}</span>
              <span className="tabular-nums">
                {recordedForProgress}/{minMonths}
              </span>
            </div>
            <div
              data-testid="population-trend-progress"
              role="progressbar"
              aria-label={t('heritage.trendProgressLabel')}
              aria-valuemin={0}
              aria-valuemax={minMonths}
              aria-valuenow={recordedForProgress}
              aria-valuetext={progressText}
              className="border-border bg-muted mt-1.5 h-2 w-full overflow-hidden rounded-full border"
            >
              <div
                className="bg-primary h-full rounded-full transition-[width] duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div data-testid="population-trend-chart" className="mt-3 flex min-h-64 flex-1 flex-col">
          <div className="min-h-56 flex-1">
            <Line
              aria-label={`${t('heritage.populationPerformance')}. ${t('heritage.populationChartBasis')}`}
              data={{
                labels: monthLabels,
                datasets: [
                  {
                    label: t('heritage.activePopulation'),
                    data: activeSpark,
                    borderColor: chart.success,
                    backgroundColor: withAlpha(chart.success, 0.16),
                    fill: true,
                    borderWidth: 2.5,
                    pointRadius: 3,
                    tension: 0.35,
                  },
                  {
                    label: t('heritage.winRateTrend'),
                    data: trendWinRate,
                    borderColor: chart.warning,
                    backgroundColor: withAlpha(chart.warning, 0.06),
                    fill: false,
                    borderWidth: 2,
                    borderDash: [5, 4],
                    pointRadius: 3,
                    spanGaps: false,
                    tension: 0.35,
                    yAxisID: 'y1',
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                  legend: {
                    display: true,
                    labels: {
                      boxWidth: 10,
                      boxHeight: 10,
                      color: chart.foreground,
                      font: { size: 10, weight: 'bold' },
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
                      font: { size: 10, weight: 'bold' },
                    },
                    title: {
                      display: true,
                      text: t('heritage.month'),
                      color: chart.mutedForeground,
                      font: { size: 10, weight: 'bold' },
                    },
                  },
                  y: {
                    beginAtZero: true,
                    grid: { color: withAlpha(chart.mutedForeground, 0.2) },
                    ticks: {
                      color: chart.mutedForeground,
                      font: { size: 10, weight: 'bold' },
                    },
                    title: {
                      display: true,
                      text: t('heritage.activePopulation'),
                      color: chart.mutedForeground,
                      font: { size: 10, weight: 'bold' },
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
                      font: { size: 10, weight: 'bold' },
                    },
                    title: {
                      display: true,
                      text: t('heritage.winRateTrend'),
                      color: chart.mutedForeground,
                      font: { size: 10, weight: 'bold' },
                    },
                  },
                },
              }}
            />
          </div>
          <p className="text-muted-foreground mt-2 text-[11px] font-semibold break-words">
            {t('heritage.populationChartBasis')}
          </p>
          <table className="sr-only">
            <caption>{t('heritage.populationPerformance')}</caption>
            <thead>
              <tr>
                <th>{t('heritage.date')}</th>
                <th>{t('heritage.activePopulation')}</th>
                <th>{t('heritage.winRateTrend')}</th>
              </tr>
            </thead>
            <tbody>
              {monthLabels.map((label, index) => (
                <tr key={label}>
                  <td>{label}</td>
                  <td>{activeSpark[index]}</td>
                  <td>{trendWinRate[index] == null ? '-' : `${trendWinRate[index]}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
