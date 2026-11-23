import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PopulationTrendCard } from './PopulationTrendCard';
import type { ChartTokens } from '@/lib/chart-tokens';

vi.mock('react-chartjs-2', () => ({
  Line: ({ data }: { data: { datasets: Array<{ label: string }> } }) => (
    <div data-testid="population-trend-line" data-dataset={data.datasets[0]?.label} />
  ),
}));

const chart: ChartTokens = {
  success: '#166534',
  warning: '#b45309',
  danger: '#7f1d1d',
  info: '#1d4ed8',
  foreground: '#2a1712',
  mutedForeground: '#6b4a3b',
  border: '#e5cdb8',
  card: '#fffdf8',
  series: ['#166534'],
};

const monthLabels = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];

function renderCard(overrides: Partial<React.ComponentProps<typeof PopulationTrendCard>> = {}) {
  return render(
    <PopulationTrendCard
      activeCount={15}
      monthLabels={monthLabels}
      activeSpark={[0, 0, 0, 0, 0, 15]}
      trendWinRate={[null, null, null, null, null, null]}
      matchesByMonth={[0, 0, 0, 1, 0, 0]}
      chart={chart}
      {...overrides}
    />,
  );
}

describe('PopulationTrendCard', () => {
  it('shows current population and progress when fewer than four months have data', () => {
    renderCard();

    expect(screen.getByText('15 active chickens')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Trend appears after 4 months of history. Based on when chickens were registered.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('2 of 4 months recorded')).toBeInTheDocument();

    const progress = screen.getByTestId('population-trend-progress');
    expect(progress).toHaveAttribute('role', 'progressbar');
    expect(progress).toHaveAttribute('aria-valuemin', '0');
    expect(progress).toHaveAttribute('aria-valuemax', '4');
    expect(progress).toHaveAttribute('aria-valuenow', '2');
    expect(progress).toHaveAttribute('aria-valuetext', '2 of 4 months recorded');
    expect(screen.queryByTestId('population-trend-line')).not.toBeInTheDocument();
  });

  it('renders the chart at exactly four months and labels the registration basis', () => {
    renderCard({
      activeSpark: [0, 0, 1, 5, 7, 9],
      matchesByMonth: [0, 0, 0, 0, 0, 0],
    });

    expect(screen.getByTestId('population-trend-line')).toHaveAttribute(
      'data-dataset',
      'Active chickens',
    );
    expect(
      screen.getByText('Active chickens by month, based on registration date.'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('population-trend-progress')).not.toBeInTheDocument();
  });

  it('renders the chart when more than four months have data', () => {
    renderCard({
      activeSpark: [1, 2, 3, 4, 5, 6],
      matchesByMonth: [0, 0, 0, 0, 0, 0],
    });

    expect(screen.getByTestId('population-trend-line')).toBeInTheDocument();
    expect(screen.queryByTestId('population-trend-empty')).not.toBeInTheDocument();
  });

  it('handles zero chickens without drawing a chart', () => {
    renderCard({
      activeCount: 0,
      activeSpark: [0, 0, 0, 0, 0, 0],
      matchesByMonth: [0, 0, 0, 0, 0, 0],
    });

    expect(screen.getByText('0 active chickens')).toBeInTheDocument();
    expect(screen.getByText('0 of 4 months recorded')).toBeInTheDocument();
    expect(screen.getByTestId('population-trend-progress')).toHaveAttribute(
      'aria-valuenow',
      '0',
    );
    expect(screen.queryByTestId('population-trend-line')).not.toBeInTheDocument();
  });
});
