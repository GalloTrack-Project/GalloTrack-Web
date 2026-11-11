import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import EncodeForm from './EncodeForm';
import type { FowlRecord } from '@/lib/types';

const processPhoto = vi.hoisted(() => vi.fn());

vi.mock('@/lib/chicken-photo', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/chicken-photo')>();
  return { ...actual, processChickenPhoto: processPhoto };
});

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
  validationPassed: true,
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

describe('Validation & Summary Panel', () => {
  it('renders the redesigned panel with complete fields, progress and register state', () => {
    render(<EncodeForm {...mockProps} />);

    expect(screen.getByTestId('chicken-photo-field')).toBeInTheDocument();

    // Header badge check: Next ID: Sire 4
    expect(screen.getByText(/Next ID: Sire 4/i)).toBeInTheDocument();

    // Required progress and statuses
    expect(screen.getByText('Required fields')).toBeInTheDocument();
    expect(screen.getByText('4 of 4 required fields completed')).toBeInTheDocument();
    expect(screen.getByText('Validation')).toBeInTheDocument();
    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(screen.getByText('Lineage')).toBeInTheDocument();
    expect(screen.getByText('Not required')).toBeInTheDocument();
    expect(screen.getAllByText('Complete').length).toBeGreaterThanOrEqual(4);

    const progress = screen.getByRole('progressbar');
    expect(progress).toHaveAttribute('aria-valuemin', '0');
    expect(progress).toHaveAttribute('aria-valuemax', '4');
    expect(progress).toHaveAttribute('aria-valuenow', '4');
    expect(progress).toHaveAttribute('aria-valuetext', '4 of 4 required fields completed');

    expect(screen.queryByText(/Missing:/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/All required fields are complete/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/registering to the farm registry/i)).toBeInTheDocument();
    expect(screen.queryByText(/cluster registry/i)).not.toBeInTheDocument();

    const register = screen.getByRole('button', { name: /REGISTER/i });
    expect(register).toBeEnabled();
    expect(register.className).toContain('focus-visible:ring-2');
    expect(register.className).not.toContain('cursor-not-allowed');

    // Checklist buttons are present and keyboard accessible
    expect(screen.getByRole('button', { name: /Go to Identifier Name/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Go to Genetic Strain/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Go to Gender Class/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Go to Birth Date/i })).toBeInTheDocument();

    // Panel guards against horizontal overflow
    const panel = screen.getByTestId('validation-summary-panel');
    expect(panel.className).toContain('min-w-0');
    expect(panel.className).toContain('overflow-hidden');

    // Responsive grid: one column on mobile, three on desktop
    const grid = screen.getByTestId('validation-summary-grid');
    expect(grid.className).toContain('grid-cols-1');
    expect(grid.className).toContain('md:grid-cols-3');

    // Badges inside the grid never truncate or overflow
    const badges = grid.querySelectorAll('[data-status-badge]');
    expect(badges.length).toBe(3);
    badges.forEach((badge) => {
      expect(badge.className).not.toContain('truncate');
      expect(badge.className).toContain('whitespace-normal');
      expect(badge.className).toContain('break-words');
    });

    // Verification of Identifier Separation & Wing Band UX
    expect(screen.getByText(/Unique Chicken Identifier/i)).toBeInTheDocument();
    expect(screen.getByText(/Edit identifier manually/i)).toBeInTheDocument();

    const wingBandInput = screen.getByLabelText(/Wing Banding/i);
    expect(wingBandInput).toBeInTheDocument();
    expect(wingBandInput).toHaveAttribute('maxLength', '50');

    expect(screen.getByText(/Auto-Assigned \(Sire\)/i)).toBeInTheDocument();
    expect(screen.getByText(/This number will be banded on the chicken’s wing/i)).toBeInTheDocument();
  });
  it('disables register while the selected photo is still processing', async () => {
    let resolveProcess!: (value: { full: File; thumbnail: File }) => void;
    processPhoto.mockReturnValue(
      new Promise((resolve) => {
        resolveProcess = resolve;
      }),
    );
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: vi.fn(() => 'blob:mock'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });

    render(<EncodeForm {...mockProps} />);
    const register = screen.getByRole('button', { name: /REGISTER/i });
    expect(register).toBeEnabled();

    fireEvent.change(screen.getByLabelText(/Choose a photo for/i), {
      target: { files: [new File(['photo'], 'bird.png', { type: 'image/png' })] },
    });

    await waitFor(() => expect(register).toBeDisabled());
    expect(screen.getByText('Processing photo...')).toBeInTheDocument();
    expect(
      screen.getByText('Wait for the photo to finish processing.'),
    ).toBeInTheDocument();

    await act(async () => {
      resolveProcess({
        full: new File(['full'], 'chicken-photo.webp', { type: 'image/webp' }),
        thumbnail: new File(['thumb'], 'chicken-photo-thumb.webp', { type: 'image/webp' }),
      });
    });

    await waitFor(() => expect(register).toBeEnabled());
  });});


