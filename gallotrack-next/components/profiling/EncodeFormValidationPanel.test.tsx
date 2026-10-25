import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import EncodeForm, { StatusItem } from './EncodeForm';
import type { FowlRecord } from '@/lib/types';

describe('Validation & Summary Panel and StatusItem', () => {
  it('renders StatusItem with each status and asserts text is present without truncation classes', () => {
    const statuses = [
      { label: 'Data Integrity & Lineage Accuracy', value: '0%', tone: 'amber' as const },
      { label: 'Validation', value: 'Pending', tone: 'amber' as const },
      { label: 'Lineage Resolved', value: 'Awaiting', tone: 'amber' as const },
      { label: 'Data Completeness', value: '0%', tone: 'amber' as const },
      { label: 'Validation', value: 'Passed', tone: 'green' as const },
      { label: 'Lineage Resolved', value: 'Resolved', tone: 'green' as const },
      { label: 'Data Completeness', value: '100%', tone: 'green' as const },
      { label: 'Error State', value: 'Failed', tone: 'rose' as const },
    ];

    const { container } = render(
      <div>
        {statuses.map((s, idx) => (
          <StatusItem key={idx} icon="🧪" label={s.label} value={s.value} tone={s.tone} />
        ))}
      </div>
    );

    // Verify all status values are present in DOM
    expect(screen.getAllByText('0%').length).toBe(2);
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Awaiting')).toBeInTheDocument();
    expect(screen.getByText('Passed')).toBeInTheDocument();
    expect(screen.getByText('Resolved')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();

    // Verify badges have NO truncate class and maintain wrap safety
    const badgeElements = container.querySelectorAll('.rounded-full.border');
    expect(badgeElements.length).toBe(statuses.length);
    badgeElements.forEach((badge) => {
      expect(badge.className).not.toContain('truncate');
      expect(badge.className).toContain('whitespace-normal');
      expect(badge.className).toContain('break-words');
    });
  });

  it('renders EncodeForm Validation & Summary Panel with Next ID and farm registry helper text', () => {
    const mockProps = {
      fowls: [] as FowlRecord[],
      newName: 'Thunder',
      setNewName: vi.fn(),
      newBreed: 'Sweater',
      setNewBreed: vi.fn(),
      newGender: 'Rooster',
      setNewGender: vi.fn(),
      newBirthdate: '2024-01-01',
      handleNewBirthdateChange: vi.fn(),
      age: '10',
      handleAgeChange: vi.fn(),
      newGrowthStage: 'Cock',
      setNewGrowthStage: vi.fn(),
      height: '15',
      setHeight: vi.fn(),
      weight: '2.2',
      setWeight: vi.fn(),
      newLegColor: 'Yellow',
      setNewLegColor: vi.fn(),
      availableLegColors: ['Yellow', 'Green'],
      customLegColorNames: new Set<string>(),
      deleteCustomLegColor: vi.fn(),
      legColorQuery: '',
      setLegColorQuery: vi.fn(),
      legColorOpen: false,
      setLegColorOpen: vi.fn(),
      sireName: '',
      setSireName: vi.fn(),
      damName: '',
      setDamName: vi.fn(),
      birdCode: '',
      setBirdCode: vi.fn(),
      wingBand: 'WB-100',
      setWingBand: vi.fn(),
      suggestedBirdCode: '4',
      previewBloodlineStats: null,
      selectedImage: null,
      setSelectedImage: vi.fn(),
      imagePreview: '',
      setImagePreview: vi.fn(),
      strainQuery: '',
      setStrainQuery: vi.fn(),
      strainOpen: false,
      setStrainOpen: vi.fn(),
      availableStrains: [],
      selectedStrains: [],
      addStrain: vi.fn(),
      removeStrain: vi.fn(),
      loading: false,
      uploadingImage: false,
      nextNodeId: '4',
      dataCompleteness: 0,
      validationPassed: false,
      bloodlineVerified: false,
      computedBloodlinePct: 0,
      offspringGenInfo: { short: 'F0', label: 'Foundation Stock' },
      sireGenInfo: { short: 'F0', label: 'Foundation Stock' },
      damGenInfo: { short: 'F0', label: 'Foundation Stock' },
      sireGen: 0,
      damGen: 0,
      generationPurity: vi.fn(),
      handleAddFowl: vi.fn(),
      autoCalcAge: true,
      getAutoCalcAge: () => true,
    };

    const { container } = render(<EncodeForm {...mockProps} />);

    // Header badge check: Next ID: Sire 4
    expect(screen.getByText(/Next ID: Sire 4/i)).toBeInTheDocument();

    // Helper text check: farm registry (not cluster registry)
    expect(screen.getByText(/registering to the farm registry/i)).toBeInTheDocument();
    expect(screen.queryByText(/cluster registry/i)).not.toBeInTheDocument();

    // All status cards check
    expect(screen.getByText(/Data Integrity & Lineage Accuracy/i)).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Awaiting')).toBeInTheDocument();

    // Responsive grid verification: grid-cols-1 on narrowest, min-[360px]:grid-cols-2, lg:grid-cols-4
    const grid = screen.getByTestId('validation-summary-grid');
    expect(grid).toBeInTheDocument();
    expect(grid.className).toContain('grid-cols-1');
    expect(grid.className).toContain('min-[360px]:grid-cols-2');
    expect(grid.className).toContain('lg:grid-cols-4');

    // Status badges within the panel have no truncate class
    const badges = grid?.querySelectorAll('.rounded-full.border');
    expect(badges?.length).toBe(4);
    badges?.forEach((badge) => {
      expect(badge.className).not.toContain('truncate');
      expect(badge.className).toContain('whitespace-normal');
    });

    // Verification of Identifier Separation & Wing Band UX
    expect(screen.getByText(/Unique Chicken Identifier/i)).toBeInTheDocument();
    expect(screen.getByText(/Edit identifier manually/i)).toBeInTheDocument();

    const wingBandInput = screen.getByLabelText(/Wing Banding/i);
    expect(wingBandInput).toBeInTheDocument();
    expect(wingBandInput).toHaveAttribute('maxLength', '50');

    // Auto-assigned badge for Sire on the Unique Chicken Identifier
    expect(screen.getByText(/Auto-Assigned \(Sire\)/i)).toBeInTheDocument();
    // Helper text for filled wing band
    expect(screen.getByText(/This number will be banded on the chicken’s wing/i)).toBeInTheDocument();
  });
});


