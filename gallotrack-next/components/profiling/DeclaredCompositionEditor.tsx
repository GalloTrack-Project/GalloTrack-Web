'use client';

import React, { useMemo } from 'react';
import {
  Plus,
  Trash2,
  RotateCcw,
  AlertTriangle,
  Info,
  SlidersHorizontal,
  Check,
} from 'lucide-react';
import type { DeclaredBreedShare } from '@/lib/types';
import {
  validateDeclaredComposition,
  declaredToComposition,
  type DeclaredCompositionValidationResult,
  type BloodlineComposition,
} from '@/lib/bloodline-composition';
import { getBreedingClassification, type CompositionSource } from '@/lib/breeding-classification';
import { cn } from '@/components/ui/utils';

export interface DeclaredCompositionEditorProps {
  registeredBreed: string;
  availableBreeds: string[];
  value: DeclaredBreedShare[] | null;
  onChange: (val: DeclaredBreedShare[] | null) => void;
  disabled?: boolean;
  hasParents?: boolean;
  pedigreeComposition?: BloodlineComposition | null;
  currentValue?: DeclaredBreedShare[] | null;
  calculatedValue?: BloodlineComposition | null;
  source?: CompositionSource;
}

export function formatCompositionSummary(comp?: BloodlineComposition | null): string {
  if (!comp || Object.keys(comp).length === 0) return 'Unknown';
  return Object.entries(comp)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([breed, pct]) => `${pct}% ${breed}`)
    .join(' / ');
}

export default function DeclaredCompositionEditor({
  registeredBreed,
  availableBreeds,
  value,
  onChange,
  disabled = false,
  hasParents = false,
  pedigreeComposition,
  currentValue,
  calculatedValue,
  source,
}: DeclaredCompositionEditorProps) {
  const currentBreed = registeredBreed.trim() || 'Registered Breed';
  const isCustomDeclared = Array.isArray(value) && value.length > 0;

  // Resolve pedigree summary string
  const activePedigree = pedigreeComposition ?? calculatedValue ?? null;
  const pedigreeSummary = useMemo(() => formatCompositionSummary(activePedigree), [activePedigree]);

  // Validation
  const validation: DeclaredCompositionValidationResult = useMemo(() => {
    if (!isCustomDeclared) {
      return { valid: true, total: 100, parsed: [], errors: [], warnings: [] };
    }
    return validateDeclaredComposition(value, registeredBreed, availableBreeds, {
      isOffspring: hasParents,
      pedigreeComposition: activePedigree,
    });
  }, [isCustomDeclared, value, registeredBreed, availableBreeds, hasParents, activePedigree]);

  // Preview classification
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

  // Calculate live total and remaining
  const currentTotal = useMemo(() => {
    if (!value || value.length === 0) return 0;
    const sum = value.reduce((acc, row) => acc + (Number(row.percent) || 0), 0);
    return Math.round(sum * 10) / 10;
  }, [value]);

  const remainingPercent = Math.round(Math.max(0, 100 - currentTotal) * 10) / 10;

  // Toggle manual adjustment on offspring
  const handleToggleOffspringAdjust = () => {
    if (disabled) return;
    if (isCustomDeclared) {
      // Turn off manual adjustment -> clear declaration
      onChange(null);
    } else {
      // Turn on manual adjustment -> prefill from calculated pedigree
      if (activePedigree && Object.keys(activePedigree).length > 0) {
        const prefilled: DeclaredBreedShare[] = Object.entries(activePedigree).map(
          ([breed, percent]) => ({ breed, percent }),
        );
        onChange(prefilled);
      } else {
        const initial = registeredBreed.trim() || availableBreeds[0] || 'Registered Breed';
        onChange([{ breed: initial, percent: 100 }]);
      }
    }
  };

  // One-tap 100% shortcut for foundation
  const handleShortcut100 = () => {
    if (disabled) return;
    const b = registeredBreed.trim() || availableBreeds[0] || 'Registered Breed';
    onChange([{ breed: b, percent: 100 }]);
  };

  // Add row
  const handleAddRow = () => {
    if (disabled || (value && value.length >= 4)) return;
    const existingKeys = new Set((value || []).map((v) => v.breed.trim().toLowerCase()));
    const nextBreed =
      availableBreeds.find((b) => !existingKeys.has(b.trim().toLowerCase())) ||
      availableBreeds[0] ||
      currentBreed;

    if (!value || value.length === 0) {
      onChange([
        { breed: currentBreed, percent: 0 },
        { breed: nextBreed, percent: 0 },
      ]);
    } else {
      onChange([...value, { breed: nextBreed, percent: 0 }]);
    }
  };

  // Remove row
  const handleRemoveRow = (index: number) => {
    if (disabled || !value) return;
    const next = value.filter((_, i) => i !== index);
    if (next.length === 0) {
      onChange(null);
    } else {
      onChange(next);
    }
  };

  // Change row
  const handleRowChange = (index: number, field: 'breed' | 'percent', val: string | number) => {
    if (disabled) return;
    const baseList = value ? [...value] : [{ breed: currentBreed, percent: 0 }];
    if (index >= baseList.length) {
      baseList.push({ breed: currentBreed, percent: 0 });
    }

    if (field === 'breed') {
      baseList[index] = { ...baseList[index], breed: String(val) };
    } else {
      const parsedVal = val === '' ? 0 : typeof val === 'number' ? val : parseFloat(val);
      const num = Number.isNaN(parsedVal) ? 0 : parsedVal;
      baseList[index] = { ...baseList[index], percent: num };
    }
    onChange(baseList);
  };

  // Reset to calculated
  const handleResetToCalculated = () => {
    if (disabled) return;
    onChange(null);
  };

  // Pedigree lookup helper for offspring
  const getPedigreePct = (breedName: string): number | null => {
    if (!activePedigree) return null;
    const key = breedName.trim().toLowerCase();
    for (const [s, pct] of Object.entries(activePedigree)) {
      if (s.trim().toLowerCase() === key) return pct;
    }
    return null;
  };

  return (
    <div
      id="purity-composition-section"
      data-testid="purity-composition-editor"
      className="border-border bg-card space-y-3.5 rounded-xl border p-4 shadow-xs"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-muted-foreground flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase">
            Purity (breed composition)
            <span className="border-border bg-muted/50 text-foreground rounded-full border px-1.5 py-0.5 text-xs font-normal normal-case">
              {hasParents ? 'Recorded Lineage' : 'Foundation Stock'}
            </span>
          </h4>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {hasParents
              ? 'Expected values calculated from parents; you may adjust manually based on bird traits.'
              : 'Enter it manually if you know it. Leave blank if unknown; the system assumes 100% of the selected breed and marks it Assumed.'}
          </p>
        </div>

        {/* Source badge indicator */}
        <div className="flex items-center gap-2">
          {hasParents ? (
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold',
                isCustomDeclared
                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                  : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
              )}
            >
              {isCustomDeclared ? 'Adjusted by owner' : 'Derived from parents'}
            </span>
          ) : (
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold',
                isCustomDeclared
                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                  : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
              )}
            >
              {isCustomDeclared
                ? 'Declared by owner'
                : 'Assumed from registered breed (not verified)'}
            </span>
          )}
        </div>
      </div>

      {/* Edit modal summary if current vs calculated values exist */}
      {(currentValue !== undefined || calculatedValue !== undefined) && (
        <div className="border-border/80 bg-muted/20 space-y-1 rounded-lg border p-2.5 text-xs">
          {calculatedValue && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Calculated from parents:</span>
              <span className="text-foreground font-mono font-medium">
                {formatCompositionSummary(calculatedValue)}
              </span>
            </div>
          )}
          {currentValue && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Current declaration:</span>
              <span className="text-foreground font-mono font-medium">
                {currentValue.map((c) => `${c.percent}% ${c.breed}`).join(' / ')}
              </span>
            </div>
          )}
          {source && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Source:</span>
              <span className="text-foreground font-medium capitalize">{source}</span>
            </div>
          )}
        </div>
      )}

      {/* ── PARENTS RECORDED VIEW ── */}
      {hasParents && (
        <div className="space-y-3">
          <div className="border-border/70 bg-muted/30 flex flex-col justify-between gap-2.5 rounded-lg border p-3 sm:flex-row sm:items-center">
            <div className="flex items-start gap-2 text-xs sm:items-center">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 sm:mt-0 dark:text-emerald-400" />
              <div>
                <span className="text-muted-foreground">Calculated from parents: </span>
                <strong className="text-foreground">{pedigreeSummary}</strong>
              </div>
            </div>
            <button
              type="button"
              disabled={disabled}
              onClick={handleToggleOffspringAdjust}
              className={cn(
                'inline-flex min-h-[44px] shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors',
                isCustomDeclared
                  ? 'border-amber-500/50 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-400'
                  : 'border-border bg-background hover:bg-muted text-foreground',
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {isCustomDeclared ? 'Adjusting manually (Active)' : 'Adjust manually'}
            </button>
          </div>

          {!isCustomDeclared ? (
            <p className="text-muted-foreground px-1 text-xs">
              By default, this bird inherits the 50/50 pedigree average from its parents. Toggle
              &quot;Adjust manually&quot; if you observed specific breed traits differing from the
              expectation.
            </p>
          ) : (
            /* Offspring manual adjustment rows */
            <div className="space-y-3 pt-1">
              <div className="space-y-2">
                {value.map((item, idx) => {
                  const pedPct = getPedigreePct(item.breed);
                  const isLineage = pedPct !== null && pedPct > 0;
                  return (
                    <div key={idx} className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                      {/* Breed selector */}
                      <div className="min-w-[140px] flex-1">
                        <select
                          disabled={disabled}
                          value={item.breed}
                          onChange={(e) => handleRowChange(idx, 'breed', e.target.value)}
                          className="border-border bg-background text-foreground h-11 min-h-[44px] w-full rounded-lg border px-3 text-xs focus:border-emerald-500 focus:outline-hidden"
                          aria-label={`Breed for share ${idx + 1}`}
                        >
                          {availableBreeds.map((b) => (
                            <option key={b} value={b}>
                              {b}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Percent input with pedigree indicator */}
                      <div className="flex w-32 shrink-0 items-center gap-1">
                        <input
                          type="number"
                          disabled={disabled}
                          min="0"
                          max="100"
                          step="0.1"
                          value={item.percent === 0 ? '' : item.percent}
                          onChange={(e) => handleRowChange(idx, 'percent', e.target.value)}
                          placeholder="0"
                          className="border-border bg-background text-foreground h-11 min-h-[44px] w-full rounded-lg border px-2.5 text-right font-mono text-xs focus:border-emerald-500 focus:outline-hidden"
                          aria-label={`Percentage for ${item.breed}`}
                        />
                        <span className="text-muted-foreground shrink-0 text-xs font-semibold">
                          %
                        </span>
                      </div>

                      {/* Pedigree reference tag */}
                      <div className="text-muted-foreground w-24 shrink-0 font-mono text-xs">
                        {isLineage ? (
                          `(Ped: ${pedPct}%)`
                        ) : (
                          <span className="font-sans text-xs text-amber-600 dark:text-amber-400">
                            Non-lineage
                          </span>
                        )}
                      </div>

                      {/* Remove row */}
                      {value.length > 1 && (
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => handleRemoveRow(idx)}
                          className="text-muted-foreground flex min-h-[44px] min-w-[44px] shrink-0 cursor-pointer items-center justify-center rounded-lg p-2 transition-colors hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
                          title="Remove breed share"
                          aria-label={`Remove breed share ${item.breed}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Action buttons & Total indicator */}
              <div className="border-border/50 flex flex-wrap items-center justify-between gap-2 border-t pt-2">
                <div className="flex flex-wrap items-center gap-2">
                  {value.length < 4 && (
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={handleAddRow}
                      className="border-border bg-background hover:bg-muted text-foreground inline-flex min-h-[44px] cursor-pointer items-center gap-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Another Breed
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={handleResetToCalculated}
                    className="text-muted-foreground hover:text-foreground inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-xs transition-colors"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset to calculated
                  </button>
                </div>

                {/* Total indicator */}
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs font-semibold">Total:</span>
                  <span
                    className={cn(
                      'flex min-h-[30px] items-center rounded-md border px-2.5 py-1 font-mono text-xs font-bold',
                      Math.abs(currentTotal - 100) <= 0.11
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                        : 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
                    )}
                  >
                    {currentTotal}%
                    {Math.abs(currentTotal - 100) > 0.11 && (
                      <span className="text-muted-foreground ml-1 text-xs font-normal">
                        ({remainingPercent}% left)
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* Warnings (non-blocking) */}
              {validation.warnings.map((w, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-800 dark:text-amber-300"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span className="leading-relaxed">{w}</span>
                </div>
              ))}

              {/* Errors (blocking save) */}
              {validation.error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-700 dark:text-red-400">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="leading-relaxed">{validation.error}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── NO PARENTS (FOUNDATION / UNKNOWN PARENTS) VIEW ── */}
      {!hasParents && (
        <div className="space-y-3">
          {availableBreeds.length === 0 ? (
            <div className="border-border/60 bg-muted/20 flex flex-col justify-between gap-2.5 rounded-lg border p-3 sm:flex-row sm:items-center">
              <div className="text-muted-foreground flex items-center gap-2 text-xs">
                <Info className="text-muted-foreground h-4 w-4 shrink-0" />
                <span>No breeds yet. Add your breeds first to declare custom composition.</span>
              </div>
              <a
                href="/breeds"
                className="flex min-h-[44px] shrink-0 items-center text-xs font-bold text-emerald-700 hover:underline dark:text-emerald-400"
              >
                Add Breeds →
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Rows */}
              <div className="space-y-2">
                {/* Always render at least Row 0: Registered Breed */}
                {!value || value.length === 0 ? (
                  <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                    <div className="border-border bg-muted/30 text-foreground flex h-11 min-h-[44px] min-w-[140px] flex-1 items-center rounded-lg border px-3 text-xs font-medium">
                      {currentBreed}
                      <span className="text-muted-foreground ml-2 text-xs font-normal">
                        (Registered)
                      </span>
                    </div>
                    <div className="flex w-32 shrink-0 items-center gap-1">
                      <input
                        type="number"
                        disabled={disabled}
                        min="0"
                        max="100"
                        step="0.1"
                        value=""
                        placeholder="100"
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '') {
                            onChange(null);
                          } else {
                            onChange([{ breed: currentBreed, percent: parseFloat(val) || 0 }]);
                          }
                        }}
                        className="border-border bg-background text-foreground h-11 min-h-[44px] w-full rounded-lg border px-2.5 text-right font-mono text-xs focus:border-emerald-500 focus:outline-hidden"
                        aria-label={`Percentage for ${currentBreed}`}
                      />
                      <span className="text-muted-foreground shrink-0 text-xs font-semibold">
                        %
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={handleShortcut100}
                      className="border-border bg-background hover:bg-muted text-foreground inline-flex min-h-[44px] shrink-0 cursor-pointer items-center gap-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors"
                    >
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      100% {currentBreed}
                    </button>
                  </div>
                ) : (
                  value.map((item, idx) => {
                    const isFirst = idx === 0;
                    return (
                      <div key={idx} className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                        <div className="min-w-[140px] flex-1">
                          {isFirst ? (
                            <div className="border-border bg-muted/30 text-foreground flex h-11 min-h-[44px] items-center rounded-lg border px-3 text-xs font-medium">
                              {item.breed}
                              <span className="text-muted-foreground ml-2 text-xs font-normal">
                                (Registered)
                              </span>
                            </div>
                          ) : (
                            <select
                              disabled={disabled}
                              value={item.breed}
                              onChange={(e) => handleRowChange(idx, 'breed', e.target.value)}
                              className="border-border bg-background text-foreground h-11 min-h-[44px] w-full rounded-lg border px-3 text-xs focus:border-emerald-500 focus:outline-hidden"
                              aria-label={`Breed for share ${idx + 1}`}
                            >
                              {availableBreeds.map((b) => (
                                <option key={b} value={b}>
                                  {b}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>

                        <div className="flex w-32 shrink-0 items-center gap-1">
                          <input
                            type="number"
                            disabled={disabled}
                            min="0"
                            max="100"
                            step="0.1"
                            value={item.percent === 0 ? '' : item.percent}
                            onChange={(e) => handleRowChange(idx, 'percent', e.target.value)}
                            placeholder="0"
                            className="border-border bg-background text-foreground h-11 min-h-[44px] w-full rounded-lg border px-2.5 text-right font-mono text-xs focus:border-emerald-500 focus:outline-hidden"
                            aria-label={`Percentage for ${item.breed}`}
                          />
                          <span className="text-muted-foreground shrink-0 text-xs font-semibold">
                            %
                          </span>
                        </div>

                        {/* If single row and not 100%, show 100% shortcut */}
                        {isFirst && value.length === 1 && (
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={handleShortcut100}
                            className="border-border bg-background hover:bg-muted text-foreground inline-flex min-h-[44px] shrink-0 cursor-pointer items-center gap-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors"
                          >
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                            100% {currentBreed}
                          </button>
                        )}

                        {value.length > 1 && (
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => handleRemoveRow(idx)}
                            className="text-muted-foreground flex min-h-[44px] min-w-[44px] shrink-0 cursor-pointer items-center justify-center rounded-lg p-2 transition-colors hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
                            title="Remove breed share"
                            aria-label={`Remove breed share ${item.breed}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Action buttons & Total indicator */}
              <div className="border-border/50 flex flex-wrap items-center justify-between gap-2 border-t pt-2">
                <div className="flex flex-wrap items-center gap-2">
                  {(!value || value.length < 4) && (
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={handleAddRow}
                      className="border-border bg-background hover:bg-muted text-foreground inline-flex min-h-[44px] cursor-pointer items-center gap-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />+ Add another breed
                    </button>
                  )}
                  {isCustomDeclared && (
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onChange(null)}
                      className="text-muted-foreground hover:text-foreground inline-flex min-h-[44px] cursor-pointer items-center gap-1 rounded-lg px-3 py-2 text-xs transition-colors"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Clear (assumed pure)
                    </button>
                  )}
                </div>

                {/* Total indicator */}
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs font-semibold">Total:</span>
                  <span
                    className={cn(
                      'flex min-h-[30px] items-center rounded-md border px-2.5 py-1 font-mono text-xs font-bold',
                      !isCustomDeclared
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                        : Math.abs(currentTotal - 100) <= 0.11
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                          : 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
                    )}
                  >
                    {!isCustomDeclared ? '100% (Assumed)' : `${currentTotal}%`}
                    {isCustomDeclared && Math.abs(currentTotal - 100) > 0.11 && (
                      <span className="text-muted-foreground ml-1 text-xs font-normal">
                        ({remainingPercent}% left)
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* Inline Validation Error */}
              {isCustomDeclared && validation.error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-700 dark:text-red-400">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="leading-relaxed">{validation.error}</span>
                </div>
              )}

              {/* Inline Warnings */}
              {isCustomDeclared &&
                validation.warnings.map((w, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-800 dark:text-amber-300"
                  >
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span className="leading-relaxed">{w}</span>
                  </div>
                ))}

              {/* Preview of resulting type */}
              {previewClassification && validation.valid && (
                <div className="border-border/80 bg-muted/30 flex items-center justify-between gap-2 rounded-lg border p-2.5 text-xs">
                  <span className="text-muted-foreground">Preview Classification:</span>
                  <span className="text-foreground font-semibold">
                    {previewClassification.badgeLabel}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
