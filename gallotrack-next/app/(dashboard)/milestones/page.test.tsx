import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import MilestonesPage from './page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/lib/contexts/fowl-context', () => {
  const fowl = {
    id: 7,
    name: 'Pearl Lemon',
    bird_code: '1A4',
    gender: 'Hen',
    birthdate: '2024-04-01',
    status: 'Active',
  };
  const info = {
    parts: {
      years: 1,
      months: 7,
      days: 12,
      totalDays: 590,
      totalWeeks: 84,
      totalMonths: 19,
    },
    stages: [],
    current: { id: 'Hen', stage: 'Hen', fromMonths: 12, toMonths: 24, icon: '', note: '' },
    next: {
      id: 'Senior Hen',
      stage: 'Fully mature',
      date: new Date('2026-04-01T00:00:00'),
      daysUntil: 139,
    },
  };
  return {
    useFowl: () => ({
      upcomingMilestones: [{ fowl, info }],
      activeFowls: [fowl],
      birdCodeOf: () => '1A4',
    }),
  };
});

describe('Milestones page', () => {
  it('uses the same identifier format as the dashboard and does not repeat sex/stage text', () => {
    render(<MilestonesPage />);
    expect(screen.getByText('1A4')).toBeInTheDocument();
    expect(screen.queryByText('#7')).not.toBeInTheDocument();
    const rowText = screen.getByText(/Age 1 yr 7 mo/).textContent || '';
    expect(rowText).toContain('Hen');
    expect(rowText.match(/Hen/g)).toHaveLength(1);
  });
});
