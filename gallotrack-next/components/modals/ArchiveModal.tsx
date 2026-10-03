'use client';
import React from 'react';
import { Archive } from 'lucide-react';
import { Modal } from '@/components/ui';
import type { FowlRecord } from '@/lib/types';

type ArchiveModalProps = {
  selectedFowlForArchive: FowlRecord | null;
  setSelectedFowlForArchive: (f: FowlRecord | null) => void;
  handleArchiveFowlWithReason: () => void;
  archiveReasonInput: string;
  setArchiveReasonInput: (v: string) => void;
  archiveReasonNote: string;
  setArchiveReasonNote: (v: string) => void;
  loading: boolean;
};

export default function ArchiveModal({
  selectedFowlForArchive,
  setSelectedFowlForArchive,
  handleArchiveFowlWithReason,
  archiveReasonInput,
  setArchiveReasonInput,
  archiveReasonNote,
  setArchiveReasonNote,
  loading,
}: ArchiveModalProps) {
  if (!selectedFowlForArchive) return null;

  return (
    <Modal
      open
      onClose={() => setSelectedFowlForArchive(null)}
      title="Archive Chicken Node"
      description="Select a NON-MORTALITY reason for inventory removal"
      icon={<Archive className="w-5 h-5" />}
      iconClassName="bg-amber-100 dark:bg-amber-900/50 border-amber-200 dark:border-amber-800 text-warning dark:text-amber-300"
      className="max-w-md"
    >
      <div className="bg-amber-50/60 dark:bg-muted/50 p-4 rounded-md border border-amber-200/60 dark:border-border space-y-2">
        <p className="text-sm font-bold text-slate-800 dark:text-card-foreground">
          Target Chicken:{' '}
          <strong className="text-amber-800 dark:text-amber-300 font-black">
            {selectedFowlForArchive.name}
          </strong>{' '}
          ({selectedFowlForArchive.breed})
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Archiving records a non-death disposition (sold, transferred, other). It does NOT imply
          mortality. If the chicken has died, use{' '}
          <strong className="text-rose-700 dark:text-rose-300">Deceased</strong> instead.
        </p>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="select-archive-reason-non-mo"
          className="block text-sm font-semibold text-slate-700 dark:text-card-foreground"
        >
          Select Archive Reason (Non-Mortality)
        </label>
        <select
          id="select-archive-reason-non-mo"
          value={archiveReasonInput}
          onChange={(e) => setArchiveReasonInput(e.target.value)}
          className="w-full p-3 border border-input-border rounded-md text-sm bg-slate-50 dark:bg-muted font-semibold text-slate-800 dark:text-card-foreground focus:border-amber-500 cursor-pointer"
        >
          <option value="SOLD">SOLD — Sold / Transferred to a Buyer</option>
          <option value="TRANSFERRED">TRANSFERRED — Moved to Another Farm / Owner</option>
          <option value="OTHER">OTHER — Other Non-Mortality Reason</option>
        </select>
        {archiveReasonInput === 'OTHER' && (
          <div className="space-y-1.5">
            <label
              htmlFor="type-archive-reason"
              className="block text-sm font-semibold text-slate-700 dark:text-card-foreground"
            >
              Type Archive Reason
            </label>
            <input
              id="type-archive-reason"
              type="text"
              value={archiveReasonNote}
              onChange={(e) => setArchiveReasonNote(e.target.value)}
              maxLength={60}
              placeholder="e.g. Retired from circuit, on hold, discontinued…"
              className="w-full p-3 border border-input-border rounded-md text-sm bg-slate-50 dark:bg-muted font-semibold text-slate-800 dark:text-card-foreground focus:border-amber-500"
            />
            <p className="text-sm text-muted-foreground leading-relaxed">
              This is saved as the archive reason and shown on the chicken&apos;s record.
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => setSelectedFowlForArchive(null)}
          className="flex-1 bg-slate-100 dark:bg-muted hover:bg-slate-200 text-slate-700 dark:text-card-foreground font-semibold py-3 rounded-sm text-sm transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleArchiveFowlWithReason}
          disabled={loading}
          className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 rounded-sm text-sm transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-md disabled:opacity-60"
        >
          {loading && (
            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          <span>Confirm Archive</span>
        </button>
      </div>
    </Modal>
  );
}
