import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PopulationTrendCard } from './PopulationTrendCard';
import type { ChartTokens } from '@/lib/chart-tokens';
import type { PopulationHistory } from '@/lib/hooks/use-fowl-analytics';

vi.mock('react-chartjs-2', () => ({
  Line: ({
    data,
  }: {
    data: { labels: string[]; datasets: Array<{ label: string }> };
  }) => (
    <div
      data-testid="population-trend-line"
      data-dataset={data.datasets[0]?.label}
      data-labels={data.labels.join('|')}
    />
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

const labels = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];

function history(overrides: Partial<PopulationHistory> = {}): PopulationHistory {
  return {
    labels,
    active: [0, 0, 0, 0, 0, 15],
    matches: [0, 0, 0, 1, 0, 0],
    winRate: [null, null, null, 100, null, null],
    ...overrides,
  };
}

function renderCard(overrides: Partial<React.ComponentProps<typeof PopulationTrendCard>> = {}) {
  return render(
    <PopulationTrendCard
      activeCount={15}
      populationHistory={history()}
      chart={chart}
      onRetry={vi.fn()}
      {...overrides}
    />,
  );
}

describe('PopulationTrendCard', () => {
  it.each([
    [0, 0],
    [1, 1],
    [3, 3],
  ])('keeps the empty state for %i of the required 4 months', (months, expected) => {
    const active = labels.map((_, index) => (index < months ? index + 1 : 0));
    renderCard({ populationHistory: history({ active, matches: [0, 0, 0, 0, 0, 0] }) });

    expect(screen.getByTestId('population-current-value')).toHaveTextContent('15');
    expect(screen.getByText('Active chickens')).toBeInTheDocument();
    expect(screen.getByText('Currently registered and active')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Trend appears after 4 months of history. Based on when chickens were registered.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(`${expected} of 4 months`)).toBeInTheDocument();

    const progress = screen.getByTestId('population-trend-progress');
    expect(progress).toHaveAttribute('role', 'progressbar');
    expect(progress).toHaveAttribute('aria-valuemin', '0');
    expect(progress).toHaveAttribute('aria-valuemax', '4');
    expect(progress).toHaveAttribute('aria-valuenow', String(expected));
    expect(progress).toHaveAttribute('aria-valuetext', `${expected} of 4 months recorded`);
    expect(screen.queryByTestId('population-trend-line')).not.toBeInTheDocument();
  });

  it('renders the chart at exactly four months and shows the delta from the same series', () => {
    renderCard({
      activeCount: 6,
      populationHistory: history({
        active: [0, 0, 1, 2, 4, 6],
        matches: [0, 0, 0, 0, 0, 0],
        winRate: [null, null, null, null, null, null],
      }),
    });

    expect(screen.getByTestId('population-current-value')).toHaveTextContent('6');
    expect(screen.getByText('Data Coverage')).toBeInTheDocument();
    expect(screen.getByText('4 of 4 months')).toBeInTheDocument();
    expect(screen.getByTestId('population-trend-line')).toHaveAttribute(
      'data-dataset',
      'Active chickens',
    );
    expect(
      screen.getByText('Active chickens by month, based on registration date.'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('population-trend-empty')).not.toBeInTheDocument();
    expect(screen.getByTestId('population-delta')).toHaveTextContent('+2 vs last month');
  });

  it('renders more than four months and switches the visible range', () => {
    const twelveLabels = Array.from({ length: 12 }, (_, i) => `M${i + 1}`);
    renderCard({
      activeCount: 12,
      populationHistory: history({
        labels: twelveLabels,
        active: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        matches: new Array(12).fill(0),
        winRate: new Array(12).fill(null),
      }),
    });

    expect(screen.getByTestId('population-trend-line')).toHaveAttribute(
      'data-labels',
      'M9|M10|M11|M12',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Last 12' }));
    expect(screen.getByTestId('population-trend-line')).toHaveAttribute(
      'data-labels',
      twelveLabels.join('|'),
    );
  });

  it('hides the delta when the previous month has no active data', () => {
    renderCard({
      populationHistory: history({
        active: [0, 0, 0, 0, 0, 15],
        matches: [1, 1, 1, 1, 1, 1],
        winRate: [100, 100, 100, 100, 100, 100],
      }),
    });

    expect(screen.getByTestId('population-trend-line')).toBeInTheDocument();
    expect(screen.queryByTestId('population-delta')).not.toBeInTheDocument();
  });

  it('shows a loading skeleton', () => {
    renderCard({ loading: true });

    expect(screen.getByTestId('population-trend-loading')).toHaveAttribute('role', 'status');
    expect(screen.getByText('Loading population trend...')).toBeInTheDocument();
  });

  it('shows the error state with a working Retry action', () => {
    const onRetry = vi.fn();
    renderCard({ error: 'network unavailable', onRetry });

    expect(screen.getByTestId('population-trend-error')).toHaveAttribute('role', 'alert');
    fireEvent.click(screen.getByRole('button', { name: /Retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
