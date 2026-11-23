import React from 'react';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import EditFowlModal from './EditFowlModal';
import { getAgeParts } from '@/lib/helpers';
import type { FowlRecord } from '@/lib/types';

const photoState = vi.hoisted(() => ({
  uploadingImage: false,
  processing: false,
}));

vi.mock('@/components/ChickenPhotoField', () => ({
  default: ({ onProcessingChange }: { onProcessingChange?: (value: boolean) => void }) => {
    if (photoState.processing) {
      setTimeout(() => onProcessingChange?.(true), 0);
    }
    return null;
  },
}));

vi.mock('@/lib/contexts/fowl-form-context', () => ({
  useFowlFormStateOptional: () => ({
    uploadingImage: photoState.uploadingImage,
    editPhotoFile: null,
    editPhotoThumbnail: null,
    editPhotoRemoved: false,
    photoUploadProgress: 0,
    editPhotoUploadError: null,
    setEditPhotoFile: vi.fn(),
    setEditPhotoThumbnail: vi.fn(),
    setEditPhotoRemoved: vi.fn(),
    setEditPhotoUploadError: vi.fn(),
    cancelPhotoUpload: vi.fn(),
  }),
}));

const exampleHen: FowlRecord = {
  id: 77,
  name: 'Rusty Dawn',
  breed: 'Sweater',
  gender: 'Hen',
  color: 'Dark Red',
  feather_color: 'Dark Red',
  behavior_trait: 'Calm',
  color_category: 'Red',
  growth_stage: 'Hen',
  eye_variant: 'Standard Eye',
  birthdate: '2025-08-23',
  age: '15 Months',
  weight: '1.9',
  height: '42',
  leg_color: 'Willow',
  sire: 'Foundation Stock',
  dam: 'Foundation Stock',
  sire_pct: 100,
  dam_pct: 100,
  bloodline_pct: 100,
  status: 'Active',
  bird_code: 'E',
  wing_band: '',
  declared_composition: [
    { breed: 'Hatch', percent: 50 },
    { breed: 'Sweater', percent: 25 },
    { breed: 'Roundhead', percent: 25 },
  ],
};

const baseProps = {
  editingFowl: exampleHen,
  setEditingFowl: vi.fn(),
  handleUpdateFowl: vi.fn().mockResolvedValue({ ok: true }),
  loading: false,
  fowls: [exampleHen],
  availableStrains: ['Hatch', 'Sweater'],
  customStrainNames: new Set<string>(),
  deleteCustomStrain: vi.fn().mockResolvedValue(undefined),
  editName: exampleHen.name,
  setEditName: vi.fn(),
  editBreed: exampleHen.breed,
  setEditBreed: vi.fn(),
  editGender: exampleHen.gender,
  setEditGender: vi.fn(),
  editColorCategory: exampleHen.color_category,
  setEditColorCategory: vi.fn(),
  editColor: exampleHen.feather_color ?? exampleHen.color ?? '',
  setEditColor: vi.fn(),
  editBehaviorTrait: 'Calm',
  setEditBehaviorTrait: vi.fn(),
  editEyeVariant: exampleHen.eye_variant,
  setEditEyeVariant: vi.fn(),
  editAge: '15',
  setEditAge: vi.fn(),
  editBirthdate: exampleHen.birthdate,
  setEditBirthdate: vi.fn(),
  editGrowthStage: exampleHen.growth_stage,
  setEditGrowthStage: vi.fn(),
  editWeight: '1.9',
  setEditWeight: vi.fn(),
  editHeight: '42',
  setEditHeight: vi.fn(),
  editLegColor: exampleHen.leg_color,
  setEditLegColor: vi.fn(),
  availableLegColors: ['Willow', 'Yellow'],
  customLegColorNames: new Set<string>(),
  deleteCustomLegColor: vi.fn().mockResolvedValue(undefined),
  editSire: exampleHen.sire,
  setEditSire: vi.fn(),
  editDam: exampleHen.dam,
  setEditDam: vi.fn(),
  setEditSirePct: vi.fn(),
  setEditDamPct: vi.fn(),
  editBirdCode: exampleHen.bird_code ?? '',
  setEditBirdCode: vi.fn(),
  editWingBand: exampleHen.wing_band ?? '',
  setEditWingBand: vi.fn(),
  editDeclaredComposition: exampleHen.declared_composition,
  setEditDeclaredComposition: vi.fn(),
  handleEditBirthdateChange: vi.fn(),
  handleEditAgeChange: vi.fn(),
  autoComputeGrowthStage: vi.fn().mockReturnValue('Hen'),
  getAgeParts,
  getAgeLabel: () => '1y 3mo',
  getAgeMetrics: () => '15m',
  generationOf: () => 1,
  generationPurity: () => 100,
};

function renderModal(overrides: Record<string, unknown> = {}) {
  return render(<EditFowlModal {...baseProps} {...overrides} />);
}

function DeclaredHarness() {
  const [declared, setDeclared] = React.useState(baseProps.editDeclaredComposition);
  return (
    <EditFowlModal
      {...baseProps}
      editBehaviorTrait="Aggressive"
      editDeclaredComposition={declared}
      setEditDeclaredComposition={setDeclared}
    />
  );
}

function collectTsxFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...collectTsxFiles(full));
    else if (entry.endsWith('.tsx')) out.push(full);
  }
  return out;
}

beforeEach(() => {
  photoState.uploadingImage = false;
  photoState.processing = false;
  vi.mocked(baseProps.handleUpdateFowl).mockClear();
});

describe('EditFowlModal save reliability', () => {
  it('reproduces the example Hen: an untouched legacy composition does not disable Save and a trait edit saves', async () => {
    const handleUpdateFowl = vi.fn().mockResolvedValue({ ok: true });
    renderModal({ editBehaviorTrait: 'Aggressive', handleUpdateFowl });

    const save = screen.getByRole('button', { name: 'Save Changes' });
    expect(save).toBeEnabled();
    expect(screen.getByText(/Existing values will be kept/i)).toBeInTheDocument();
    expect(screen.getByText(/unregistered breed|current breed list/i)).toBeInTheDocument();

    fireEvent.click(save);
    await waitFor(() => expect(handleUpdateFowl).toHaveBeenCalledTimes(1));
  });

  it('keeps Save enabled and warns for an untouched legacy unregistered strain', async () => {
    const legacy = { ...exampleHen, breed: 'Legacy Roundhead', declared_composition: null };
    const handleUpdateFowl = vi.fn().mockResolvedValue({ ok: true });
    renderModal({
      editingFowl: legacy,
      fowls: [legacy],
      availableStrains: [],
      editBreed: legacy.breed,
      editBehaviorTrait: 'Aggressive',
      editDeclaredComposition: null,
      handleUpdateFowl,
    });

    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeEnabled();
    expect(screen.getAllByText('Not registered').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => expect(handleUpdateFowl).toHaveBeenCalledTimes(1));
  });

  it('keeps Save enabled for an untouched hen wing band and preserves the legacy warning', async () => {
    const henWithBand = { ...exampleHen, wing_band: 'WB-HEN' };
    const handleUpdateFowl = vi.fn().mockResolvedValue({ ok: true });
    renderModal({
      editingFowl: henWithBand,
      fowls: [henWithBand],
      editWingBand: 'WB-HEN',
      editBehaviorTrait: 'Aggressive',
      handleUpdateFowl,
    });

    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeEnabled();
    expect(screen.getByText(/existing wing band will be preserved/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => expect(handleUpdateFowl).toHaveBeenCalledTimes(1));
  });

  it('blocks a newly entered duplicate wing band and focuses the field', async () => {
    const otherHen = {
      ...exampleHen,
      id: 78,
      name: 'Other Hen',
      bird_code: 'F',
      wing_band: 'WB-DUP',
    };
    const handleUpdateFowl = vi.fn().mockResolvedValue({ ok: true });
    renderModal({
      fowls: [exampleHen, otherHen],
      editWingBand: 'WB-DUP',
      editBehaviorTrait: 'Aggressive',
      handleUpdateFowl,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(screen.getAllByText(/already assigned to another chicken/i).length).toBeGreaterThan(0);
    await waitFor(() => expect(screen.getByLabelText(/Wing Banding/i)).toHaveFocus());
    expect(handleUpdateFowl).not.toHaveBeenCalled();
  });

  it('does not block an untouched legacy duplicate wing band', async () => {
    const legacyBand = { ...exampleHen, wing_band: 'WB-DUP' };
    const otherHen = {
      ...exampleHen,
      id: 78,
      name: 'Other Hen',
      bird_code: 'F',
      wing_band: 'WB-DUP',
    };
    const handleUpdateFowl = vi.fn().mockResolvedValue({ ok: true });
    renderModal({
      editingFowl: legacyBand,
      fowls: [legacyBand, otherHen],
      editWingBand: 'WB-DUP',
      editBehaviorTrait: 'Aggressive',
      handleUpdateFowl,
    });

    expect(
      screen.getByText(/existing wing band is invalid or duplicated/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => expect(handleUpdateFowl).toHaveBeenCalledTimes(1));
  });

  it('shows a validation summary and focuses the first invalid field', async () => {
    renderModal({ editName: '' });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(screen.getByText('Cannot save yet: 1 problem')).toBeInTheDocument();
    expect(screen.getByText('Identifier name is required.')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Identifier Name')).toHaveFocus());
    expect(baseProps.handleUpdateFowl).not.toHaveBeenCalled();
  });

  it('shows No changes to save when nothing changed and does not submit', () => {
    renderModal();
    const save = screen.getByRole('button', { name: 'No changes to save' });
    expect(save).toBeEnabled();
    fireEvent.click(save);
    expect(
      screen.getByText('No changes to save', { selector: 'div[role="status"]' }),
    ).toBeInTheDocument();
    expect(baseProps.handleUpdateFowl).not.toHaveBeenCalled();
  });

  it('is disabled only while saving, uploading, or preparing a photo', async () => {
    const { unmount } = renderModal({ loading: true });
    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled();
    unmount();

    photoState.uploadingImage = true;
    const uploading = renderModal({ editBehaviorTrait: 'Aggressive' });
    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled();
    uploading.unmount();

    photoState.uploadingImage = false;
    photoState.processing = true;
    renderModal({ editBehaviorTrait: 'Aggressive' });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Preparing photo...' })).toBeDisabled();
    });
  });

  it('keeps the modal and typed values open when the save fails', async () => {
    const handleUpdateFowl = vi.fn().mockResolvedValue({ ok: false, error: 'Database offline' });
    renderModal({ editBehaviorTrait: 'Aggressive', handleUpdateFowl });

    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Database offline'));
    expect(screen.getByLabelText('Trait')).toHaveValue('Aggressive');
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeEnabled();
  });

  it('blocks an edited composition that does not total 100 and shows the current total', () => {
    renderModal({
      editDeclaredComposition: [
        { breed: 'Hatch', percent: 50 },
        { breed: 'Sweater', percent: 25 },
        { breed: 'Roundhead', percent: 20 },
      ],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(screen.getByText(/Cannot save yet: 1 problem/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Current total: 95%/i).length).toBeGreaterThan(0);
    expect(baseProps.handleUpdateFowl).not.toHaveBeenCalled();
  });

  it('covers every rendered number input with inputMode and the global spinner rule', () => {
    renderModal();
    const numberInputs = screen.getAllByRole('spinbutton');
    expect(numberInputs.length).toBeGreaterThan(0);
    for (const input of numberInputs) {
      expect(input).toHaveAttribute('inputmode');
      expect(['decimal', 'numeric']).toContain(input.getAttribute('inputmode'));
    }

    const css = readFileSync(path.join(process.cwd(), 'app/globals.css'), 'utf8');
    expect(css).toContain('input[type="number"]::-webkit-outer-spin-button');
    expect(css).toContain('input[type="number"]::-webkit-inner-spin-button');
    expect(css).toContain('-moz-appearance: textfield');

    const roots = [path.join(process.cwd(), 'components'), path.join(process.cwd(), 'app')];
    const files = roots.flatMap((root) => collectTsxFiles(root));
    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      if (!source.includes('type="number"')) continue;
      expect(source, file).toMatch(/inputMode=/);
      expect(source, file).toMatch(/onWheel=/);
    }
  });

  it('keeps decimal typing and wheel protection on percentage inputs', () => {
    render(<DeclaredHarness />);
    const percentInputs = screen.getAllByLabelText(/Percentage for/i);
    expect(percentInputs.length).toBeGreaterThan(0);
    for (const input of percentInputs) {
      expect(input).toHaveAttribute('inputmode', 'decimal');
      expect(input).toHaveAttribute('min', '0');
      expect(input).toHaveAttribute('max', '100');
    }
    const first = percentInputs[0] as HTMLInputElement;
    fireEvent.change(first, { target: { value: '25.5' } });
    expect(first).toHaveValue(25.5);
    first.focus();
    fireEvent.wheel(first);
    expect(first).not.toHaveFocus();
  });
});
