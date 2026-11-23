import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Z_LAYERS } from './ui-layers';

describe('shared z-index layers', () => {
  it('keeps the documented stacking order', () => {
    expect(Z_LAYERS.content).toBeLessThan(Z_LAYERS.actionBar);
    expect(Z_LAYERS.actionBar).toBeLessThan(Z_LAYERS.dropdown);
    expect(Z_LAYERS.dropdown).toBeLessThan(Z_LAYERS.modal);
    expect(Z_LAYERS.modal).toBeLessThan(Z_LAYERS.toast);
  });

  it('uses the shared tokens for page actions, dropdowns, modals, and toasts', () => {
    const files = [
      'components/profiling/validation/ValidationSummaryPanel.tsx',
      'components/match/MatchRecordForm.tsx',
      'components/ui/Modal.tsx',
      'components/ui/Toast.tsx',
      'components/profiling/EncodeForm.tsx',
      'components/modals/EditFowlModal.tsx',
    ];

    for (const file of files) {
      const source = readFileSync(join(process.cwd(), file), 'utf8');
      expect(source, file).toContain('Z_LAYERS');
      expect(source, file).not.toMatch(/\bz-\[(?:9999|10000)\]/);
    }
  });

  it('reserves action-bar height in the form and after the footer band', () => {
    const form = readFileSync(
      join(process.cwd(), 'components/profiling/EncodeForm.tsx'),
      'utf8',
    );
    const layout = readFileSync(
      join(process.cwd(), 'app/(dashboard)/layout.tsx'),
      'utf8',
    );
    const panel = readFileSync(
      join(process.cwd(), 'components/profiling/validation/ValidationSummaryPanel.tsx'),
      'utf8',
    );

    expect(panel).toContain('--form-action-bar-height');
    expect(form).toContain('--form-action-bar-height');
    expect(layout).toContain('--form-action-bar-height');
  });
});
