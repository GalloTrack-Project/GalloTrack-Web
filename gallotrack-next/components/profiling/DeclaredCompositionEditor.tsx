'use client';

import React, { useMemo } from 'react';
import { Plus, Trash2, RotateCcw, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import type { DeclaredBreedShare } from '@/lib/types';
import {
  validateDeclaredComposition,
  declaredToComposition,
  type DeclaredCompositionValidationResult,
} from '@/lib/bloodline-composition';
import { getBreedingClassification } from '@/lib/breeding-classification';
import { cn } from '@/components/ui/utils';

interface DeclaredCompositionEditorProps {
  registeredBreed: string;
  availableBreeds: string[];
  value: DeclaredBreedShare[] | null;
  onChange: (val: DeclaredBreedShare[] | null) => void;
  disabled?: boolean;
}

export default function DeclaredCompositionEditor({
  registeredBreed,
  availableBreeds,
  value,
  onChange,
  disabled = false,
}: DeclaredCompositionEditorProps) {
  const currentBreed = registeredBreed.trim() || 'Unspecified';
  const isCustomDeclared = Array.isArray(value) && value.length > 0;

  // Compute validation
  const validation: DeclaredCompositionValidationResult = useMemo(() => {
    if (!isCustomDeclared) {
      return { valid: true, total: 100, parsed: [], errors: [], warnings: [] };
    }
    return validateDeclaredComposition(value, registeredBreed, availableBreeds);
  }, [isCustomDeclared, value, registeredBreed, availableBreeds]);

  // Compute preview classification
  const previewClassification = useMemo(() => {
    if (!isCustomDeclared) return null;
    const comp = declaredToComposition(validation.parsed);
    const mockFowl = {
      id: -999,
      name: 'Preview',
      breed: registeredBreed,
      bloodline_composition: comp,
      declared_composition: validation.parsed,
    };
    return getBreedingClassification(mockFowl as any, []);
  }, [isCustomDeclared, validation.parsed, registeredBreed]);

  const handleStartCustom = () => {
    if (availableBreeds.length === 0) return;
    const initialBreed = availableBreeds.includes(registeredBreed.trim())
      ? registeredBreed.trim()
      : availableBreeds[0] || registeredBreed.trim();
    onChange([{ breed: initialBreed, percent: 100 }]);
  };

  const handleResetToAssumed = () => {
    onChange(null);
  };

  const handleAddRow = () => {
    if (!value || value.length >= 4) return;
    const existingKeys = new Set(value.map((v) => v.breed.trim().toLowerCase()));
    const nextBreed = availableBreeds.find((b) => !existingKeys.has(b.trim().toLowerCase())) || availableBreeds[0] || registeredBreed.trim();
    onChange([...value, { breed: nextBreed, percent: 0 }]);
  };

  const handleRemoveRow = (index: number) => {
    if (!value) return;
    const next = value.filter((_, i) => i !== index);
    if (next.length === 0) {
      onChange(null);
    } else {
      onChange(next);
    }
  };

  const handleRowChange = (index: number, field: 'breed' | 'percent', val: string | number) => {
    if (!value) return;
    const next = [...value];
    if (field === 'breed') {
      next[index] = { ...next[index], breed: String(val) };
    } else {
      const num = typeof val === 'number' ? val : parseFloat(val) || 0;
      next[index] = { ...next[index], percent: num };
    }
    onChange(next);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            Breed Composition
            <span className="text-[10px] font-normal normal-case px-1.5 py-0.5 rounded-full border border-border bg-muted/50 text-foreground">
              Foundation Stock
            </span>
          </h4>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Declare known genetic background for birds without recorded parents.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'text-[10px] font-semibold px-2 py-0.5 rounded-md border inline-flex items-center gap-1',
              isCustomDeclared
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
            )}
          >
            {isCustomDeclared ? 'Declared by owner' : 'Assumed from registered breed (not verified)'}
          </span>
        </div>
      </div>

      <div className="p-2.5 rounded-lg border border-border/70 bg-muted/30 text-xs text-muted-foreground flex items-start gap-2">
        <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          Not sure? Leave it blank. The system assumes 100% of the selected breed and marks it as Assumed. You can declare the real percentage any time.
        </p>
      </div>

      {/* Assumed view */}
      {!isCustomDeclared ? (
        availableBreeds.length === 0 ? (
          <div className="p-3 rounded-lg border border-border/60 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Info className="w-4 h-4 text-muted-foreground shrink-0" />
              <span>No breeds yet. Add your breeds first to declare custom composition.</span>
            </div>
            <a
              href="/breeds"
              className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline shrink-0"
            >
              Add Breeds →
            </a>
          </div>
        ) : (
          <div className="p-3 rounded-lg border border-border/60 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>
                Default: <strong className="text-foreground">100% {currentBreed}</strong> (assumed pure)
              </span>
            </div>
            <button
              type="button"
              disabled={disabled}
              onClick={handleStartCustom}
              className="text-xs font-medium px-2.5 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer inline-flex items-center justify-center gap-1 shrink-0 self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              Declare Custom Composition
            </button>
          </div>
        )
      ) : (
        /* Custom declared composition editor */
        <div className="space-y-3 pt-1">
          <div className="space-y-2">
            {value.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="flex-1 min-w-[130px]">
                  <select
                    disabled={disabled}
                    value={item.breed}
                    onChange={(e) => handleRowChange(idx, 'breed', e.target.value)}
                    className="w-full h-8 px-2.5 text-xs rounded-md border border-border bg-background text-foreground focus:outline-hidden focus:border-emerald-500"
                    aria-label={`Breed for share ${idx + 1}`}
                  >
                    {availableBreeds.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-24 shrink-0 flex items-center gap-1">
                  <input
                    type="number"
                    disabled={disabled}
                    min="1"
                    max="100"
                    step="0.1"
                    value={item.percent || ''}
                    onChange={(e) => handleRowChange(idx, 'percent', e.target.value)}
                    placeholder="%"
                    className="w-full h-8 px-2 text-xs text-right rounded-md border border-border bg-background text-foreground focus:outline-hidden focus:border-emerald-500 font-mono"
                    aria-label={`Percentage for ${item.breed}`}
                  />
                  <span className="text-xs text-muted-foreground font-semibold">%</span>
                </div>
                {value.length > 1 && (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => handleRemoveRow(idx)}
                    className="p-1.5 text-muted-foreground hover:text-red-600 dark:hover:text-red-400 rounded-md hover:bg-red-500/10 transition-colors cursor-pointer shrink-0"
                    title="Remove breed share"
                    aria-label={`Remove breed share ${item.breed}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Action buttons & Total indicator */}
          <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-border/50">
            <div className="flex items-center gap-2">
              {value.length < 4 && (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={handleAddRow}
                  className="text-xs font-medium px-2 py-1 rounded-md border border-border bg-background hover:bg-muted text-foreground transition-colors cursor-pointer inline-flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Add Breed
                </button>
              )}
              <button
                type="button"
                disabled={disabled}
                onClick={handleResetToAssumed}
                className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md transition-colors cursor-pointer inline-flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Reset to 100% {currentBreed}
              </button>
            </div>

            {/* Total indicator */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">Total:</span>
              <span
                className={cn(
                  'text-xs font-bold font-mono px-2 py-0.5 rounded-md border',
                  Math.abs(validation.total - 100) <= 0.11
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                    : 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                )}
              >
                {validation.total}%
              </span>
            </div>
          </div>

          {/* Inline Validation Error */}
          {validation.error && (
            <div className="p-2 rounded-md border border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{validation.error}</span>
            </div>
          )}

          {/* Inline Warning (e.g. Registered breed not highest share) */}
          {validation.warning && (
            <div className="p-2 rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>{validation.warning}</span>
            </div>
          )}

          {/* Preview of resulting type */}
          {previewClassification && validation.valid && (
            <div className="p-2 rounded-md border border-border/80 bg-muted/30 text-xs flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Preview Classification:</span>
              <span className="font-semibold text-foreground">
                {previewClassification.badgeLabel}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
