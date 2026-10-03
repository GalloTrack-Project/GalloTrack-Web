'use client';
import React from 'react';
import { Skull } from 'lucide-react';
import { Modal } from '@/components/ui';
import type { FowlRecord } from '@/lib/types';

type DeceasedModalProps = {
  selectedFowlForDeceased: FowlRecord | null;
  setSelectedFowlForDeceased: (f: FowlRecord | null) => void;
  handleMarkFowlDeceased: () => void;
  deathReasonInput: string;
  setDeathReasonInput: (v: string) => void;
  deathReasonNote: string;
  setDeathReasonNote: (v: string) => void;
  loading: boolean;
};

export default function DeceasedModal({
  selectedFowlForDeceased,
  setSelectedFowlForDeceased,
  handleMarkFowlDeceased,
  deathReasonInput,
  setDeathReasonInput,
  deathReasonNote,
  setDeathReasonNote,
  loading,
}: DeceasedModalProps) {
  if (!selectedFowlForDeceased) return null;

  return (
    <Modal
      open
      onClose={() => setSelectedFowlForDeceased(null)}
      title="Record Mortality"
      description="Transition node to Deceased status — cause of death required"
      icon={<Skull className="w-5 h-5" />}
      iconClassName="bg-rose-100 dark:bg-rose-900/50 border-rose-200 dark:border-rose-800 text-danger dark:text-rose-300"
      className="max-w-md"
    >
      <div className="bg-rose-50/60 dark:bg-muted/50 p-4 rounded-md border border-rose-200/60 dark:border-border space-y-2">
        <p className="text-sm font-bold text-slate-800 dark:text-card-foreground">
          Target Chicken:{' '}
          <strong className="text-rose-700 dark:text-rose-300 font-black">
            {selectedFowlForDeceased.name}
          </strong>{' '}
          ({selectedFowlForDeceased.breed})
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Use this ONLY when the chicken has died. Mortality removes the chicken from the active
          registry. Non-mortality removals (sold, transferred, other) belong under{' '}
          <strong className="text-amber-700 dark:text-amber-300">Archive</strong> instead.
        </p>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="cause-of-death"
          className="block text-sm font-semibold text-slate-700 dark:text-card-foreground"
        >
          Cause of Death
        </label>
        <select
          id="cause-of-death"
          value={deathReasonInput}
          onChange={(e) => setDeathReasonInput(e.target.value)}
          className="w-full p-3 border border-input-border rounded-md text-sm bg-slate-50 dark:bg-muted font-semibold text-slate-800 dark:text-card-foreground focus:border-rose-500 cursor-pointer"
        >
          <option value="Illness">Illness / Disease</option>
          <option value="Injury">Injury / Fight Trauma</option>
          <option value="Natural">Natural Causes / Old Age</option>
          <option value="Other">Other Unspecified Cause</option>
        </select>
        {deathReasonInput === 'Other' && (
          <div className="space-y-1.5">
            <label
              htmlFor="type-cause-of-death"
              className="block text-sm font-semibold text-slate-700 dark:text-card-foreground"
            >
              Type Cause of Death
            </label>
            <input
              id="type-cause-of-death"
              type="text"
              value={deathReasonNote}
              onChange={(e) => setDeathReasonNote(e.target.value)}
              maxLength={60}
              placeholder="e.g. Heat stroke, predator attack…"
              className="w-full p-3 border border-input-border rounded-md text-sm bg-slate-50 dark:bg-muted font-semibold text-slate-800 dark:text-card-foreground focus:border-rose-500"
            />
            <p className="text-sm text-muted-foreground leading-relaxed">
              This is saved as the cause of death and shown on the chicken&apos;s record.
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => setSelectedFowlForDeceased(null)}
          className="flex-1 bg-slate-100 dark:bg-muted hover:bg-slate-200 text-slate-700 dark:text-card-foreground font-semibold py-3 rounded-sm text-sm transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleMarkFowlDeceased}
          disabled={loading}
          className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold py-3 rounded-sm text-sm transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-md disabled:opacity-60"
        >
          {loading && (
            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          <span>Record Deceased</span>
        </button>
      </div>
    </Modal>
  );
}
