'use client';

import React, { useMemo } from 'react';
import { Plus, Trash2, RotateCcw, AlertTriangle, Info, SlidersHorizontal, Check } from 'lucide-react';
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
  const pedigreeSummary = useMemo(
    () => formatCompositionSummary(activePedigree),
    [activePedigree]
  );

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
          ([breed, percent]) => ({ breed, percent })
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
      className="rounded-xl border border-border bg-card p-4 space-y-3.5 shadow-xs"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            Purity (breed composition)
            <span className="text-[10px] font-normal normal-case px-1.5 py-0.5 rounded-full border border-border bg-muted/50 text-foreground">
              {hasParents ? 'Recorded Lineage' : 'Foundation Stock'}
            </span>
          </h4>
          <p className="text-[11px] text-muted-foreground mt-0.5">
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
                'text-[10px] font-semibold px-2 py-0.5 rounded-md border inline-flex items-center gap-1',
                isCustomDeclared
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
              )}
            >
              {isCustomDeclared ? 'Adjusted by owner' : 'Derived from parents'}
            </span>
          ) : (
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
          )}
        </div>
      </div>

      {/* Edit modal summary if current vs calculated values exist */}
      {(currentValue !== undefined || calculatedValue !== undefined) && (
        <div className="p-2.5 rounded-lg border border-border/80 bg-muted/20 text-xs space-y-1">
          {calculatedValue && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Calculated from parents:</span>
              <span className="font-mono font-medium text-foreground">
                {formatCompositionSummary(calculatedValue)}
              </span>
            </div>
          )}
          {currentValue && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Current declaration:</span>
              <span className="font-mono font-medium text-foreground">
                {currentValue.map((c) => `${c.percent}% ${c.breed}`).join(' / ')}
              </span>
            </div>
          )}
          {source && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Source:</span>
              <span className="font-medium text-foreground capitalize">{source}</span>
            </div>
          )}
        </div>
      )}

      {/* ── PARENTS RECORDED VIEW ── */}
      {hasParents && (
        <div className="space-y-3">
          <div className="p-3 rounded-lg border border-border/70 bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-start sm:items-center gap-2 text-xs">
              <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
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
                'min-h-[44px] px-3 py-2 text-xs font-medium rounded-lg border transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0',
                isCustomDeclared
                  ? 'border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20'
                  : 'border-border bg-background hover:bg-muted text-foreground'
              )}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              {isCustomDeclared ? 'Adjusting manually (Active)' : 'Adjust manually'}
            </button>
          </div>

          {!isCustomDeclared ? (
            <p className="text-[11px] text-muted-foreground px-1">
              By default, this bird inherits the 50/50 pedigree average from its parents. Toggle &quot;Adjust manually&quot; if you observed specific breed traits differing from the expectation.
            </p>
          ) : (
            /* Offspring manual adjustment rows */
            <div className="space-y-3 pt-1">
              <div className="space-y-2">
                {value.map((item, idx) => {
                  const pedPct = getPedigreePct(item.breed);
                  const isLineage = pedPct !== null && pedPct > 0;
                  return (
                    <div key={idx} className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      {/* Breed selector */}
                      <div className="flex-1 min-w-[140px]">
                        <select
                          disabled={disabled}
                          value={item.breed}
                          onChange={(e) => handleRowChange(idx, 'breed', e.target.value)}
                          className="w-full min-h-[44px] h-11 px-3 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-hidden focus:border-emerald-500"
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
                      <div className="w-32 shrink-0 flex items-center gap-1">
                        <input
                          type="number"
                          disabled={disabled}
                          min="0"
                          max="100"
                          step="0.1"
                          value={item.percent === 0 ? '' : item.percent}
                          onChange={(e) => handleRowChange(idx, 'percent', e.target.value)}
                          placeholder="0"
                          className="w-full min-h-[44px] h-11 px-2.5 text-xs text-right rounded-lg border border-border bg-background text-foreground focus:outline-hidden focus:border-emerald-500 font-mono"
                          aria-label={`Percentage for ${item.breed}`}
                        />
                        <span className="text-xs text-muted-foreground font-semibold shrink-0">%</span>
                      </div>

                      {/* Pedigree reference tag */}
                      <div className="w-24 shrink-0 text-[11px] font-mono text-muted-foreground">
                        {isLineage ? `(Ped: ${pedPct}%)` : <span className="text-amber-600 dark:text-amber-400 font-sans text-[10px]">Non-lineage</span>}
                      </div>

                      {/* Remove row */}
                      {value.length > 1 && (
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => handleRemoveRow(idx)}
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 text-muted-foreground hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer shrink-0"
                          title="Remove breed share"
                          aria-label={`Remove breed share ${item.breed}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Action buttons & Total indicator */}
              <div className="flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-border/50">
                <div className="flex items-center gap-2 flex-wrap">
                  {value.length < 4 && (
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={handleAddRow}
                      className="min-h-[44px] text-xs font-medium px-3 py-2 rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-colors cursor-pointer inline-flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Another Breed
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={handleResetToCalculated}
                    className="min-h-[44px] text-xs text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset to calculated
                  </button>
                </div>

                {/* Total indicator */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">Total:</span>
                  <span
                    className={cn(
                      'text-xs font-bold font-mono px-2.5 py-1 rounded-md border min-h-[30px] flex items-center',
                      Math.abs(currentTotal - 100) <= 0.11
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                        : 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                    )}
                  >
                    {currentTotal}%
                    {Math.abs(currentTotal - 100) > 0.11 && (
                      <span className="ml-1 text-[10px] font-normal text-muted-foreground">
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
                  className="p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{w}</span>
                </div>
              ))}

              {/* Errors (blocking save) */}
              {validation.error && (
                <div className="p-2.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
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
            <div className="p-3 rounded-lg border border-border/60 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Info className="w-4 h-4 text-muted-foreground shrink-0" />
                <span>No breeds yet. Add your breeds first to declare custom composition.</span>
              </div>
              <a
                href="/breeds"
                className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline shrink-0 min-h-[44px] flex items-center"
              >
                Add Breeds →
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Rows */}
              <div className="space-y-2">
                {/* Always render at least Row 0: Registered Breed */}
                {(!value || value.length === 0) ? (
                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    <div className="flex-1 min-w-[140px] flex items-center px-3 min-h-[44px] h-11 text-xs rounded-lg border border-border bg-muted/30 font-medium text-foreground">
                      {currentBreed}
                      <span className="ml-2 text-[10px] text-muted-foreground font-normal">(Registered)</span>
                    </div>
                    <div className="w-32 shrink-0 flex items-center gap-1">
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
                        className="w-full min-h-[44px] h-11 px-2.5 text-xs text-right rounded-lg border border-border bg-background text-foreground focus:outline-hidden focus:border-emerald-500 font-mono"
                        aria-label={`Percentage for ${currentBreed}`}
                      />
                      <span className="text-xs text-muted-foreground font-semibold shrink-0">%</span>
                    </div>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={handleShortcut100}
                      className="min-h-[44px] px-3 py-2 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-colors cursor-pointer inline-flex items-center gap-1 shrink-0"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      100% {currentBreed}
                    </button>
                  </div>
                ) : (
                  value.map((item, idx) => {
                    const isFirst = idx === 0;
                    return (
                      <div key={idx} className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        <div className="flex-1 min-w-[140px]">
                          {isFirst ? (
                            <div className="flex items-center px-3 min-h-[44px] h-11 text-xs rounded-lg border border-border bg-muted/30 font-medium text-foreground">
                              {item.breed}
                              <span className="ml-2 text-[10px] text-muted-foreground font-normal">(Registered)</span>
                            </div>
                          ) : (
                            <select
                              disabled={disabled}
                              value={item.breed}
                              onChange={(e) => handleRowChange(idx, 'breed', e.target.value)}
                              className="w-full min-h-[44px] h-11 px-3 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-hidden focus:border-emerald-500"
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

                        <div className="w-32 shrink-0 flex items-center gap-1">
                          <input
                            type="number"
                            disabled={disabled}
                            min="0"
                            max="100"
                            step="0.1"
                            value={item.percent === 0 ? '' : item.percent}
                            onChange={(e) => handleRowChange(idx, 'percent', e.target.value)}
                            placeholder="0"
                            className="w-full min-h-[44px] h-11 px-2.5 text-xs text-right rounded-lg border border-border bg-background text-foreground focus:outline-hidden focus:border-emerald-500 font-mono"
                            aria-label={`Percentage for ${item.breed}`}
                          />
                          <span className="text-xs text-muted-foreground font-semibold shrink-0">%</span>
                        </div>

                        {/* If single row and not 100%, show 100% shortcut */}
                        {isFirst && value.length === 1 && (
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={handleShortcut100}
                            className="min-h-[44px] px-3 py-2 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-colors cursor-pointer inline-flex items-center gap-1 shrink-0"
                          >
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            100% {currentBreed}
                          </button>
                        )}

                        {value.length > 1 && (
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => handleRemoveRow(idx)}
                            className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 text-muted-foreground hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer shrink-0"
                            title="Remove breed share"
                            aria-label={`Remove breed share ${item.breed}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Action buttons & Total indicator */}
              <div className="flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-border/50">
                <div className="flex items-center gap-2 flex-wrap">
                  {(!value || value.length < 4) && (
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={handleAddRow}
                      className="min-h-[44px] text-xs font-medium px-3 py-2 rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-colors cursor-pointer inline-flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      + Add another breed
                    </button>
                  )}
                  {isCustomDeclared && (
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onChange(null)}
                      className="min-h-[44px] text-xs text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Clear (assumed pure)
                    </button>
                  )}
                </div>

                {/* Total indicator */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">Total:</span>
                  <span
                    className={cn(
                      'text-xs font-bold font-mono px-2.5 py-1 rounded-md border min-h-[30px] flex items-center',
                      !isCustomDeclared
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                        : Math.abs(currentTotal - 100) <= 0.11
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                        : 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                    )}
                  >
                    {!isCustomDeclared ? '100% (Assumed)' : `${currentTotal}%`}
                    {isCustomDeclared && Math.abs(currentTotal - 100) > 0.11 && (
                      <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                        ({remainingPercent}% left)
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* Inline Validation Error */}
              {isCustomDeclared && validation.error && (
                <div className="p-2.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{validation.error}</span>
                </div>
              )}

              {/* Inline Warnings */}
              {isCustomDeclared &&
                validation.warnings.map((w, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2"
                  >
                    <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{w}</span>
                  </div>
                ))}

              {/* Preview of resulting type */}
              {previewClassification && validation.valid && (
                <div className="p-2.5 rounded-lg border border-border/80 bg-muted/30 text-xs flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Preview Classification:</span>
                  <span className="font-semibold text-foreground">
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
