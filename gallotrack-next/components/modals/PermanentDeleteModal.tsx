'use client';
import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/ui';
import type { FowlRecord } from '@/lib/types';

type PermanentDeleteModalProps = {
  pendingPermanentDelete: FowlRecord | null;
  setPendingPermanentDelete: (f: FowlRecord | null) => void;
  handlePermanentDelete: () => void;
  permanentDeleting: boolean;
};

export default function PermanentDeleteModal({
  pendingPermanentDelete,
  setPendingPermanentDelete,
  handlePermanentDelete,
  permanentDeleting,
}: PermanentDeleteModalProps) {
  if (!pendingPermanentDelete) return null;

  return (
    <Modal
      open
      onClose={() => setPendingPermanentDelete(null)}
      title="Permanently Delete?"
      description="This action cannot be undone"
      icon={<AlertTriangle className="w-5 h-5" />}
      iconClassName="bg-rose-100 dark:bg-rose-900/50 border-rose-200 dark:border-rose-800 text-danger dark:text-rose-300"
      className="max-w-md"
    >
      <div className="bg-rose-50/60 dark:bg-muted/50 p-4 rounded-md border border-rose-200/60 dark:border-border space-y-2">
        <p className="text-sm font-bold text-slate-800 dark:text-card-foreground">
          Target Chicken:{' '}
          <strong className="text-rose-800 dark:text-rose-300 font-black">
            {pendingPermanentDelete.name}
          </strong>{' '}
          ({pendingPermanentDelete.breed})
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          This chicken record will be{' '}
          <strong className="text-rose-700 dark:text-rose-300">permanently deleted</strong> from the
          database. This action cannot be undone.
        </p>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => setPendingPermanentDelete(null)}
          className="flex-1 bg-slate-100 dark:bg-muted hover:bg-slate-200 text-slate-700 dark:text-card-foreground font-semibold py-3 rounded-sm text-sm transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handlePermanentDelete}
          disabled={permanentDeleting}
          className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold py-3 rounded-sm text-sm transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-md disabled:opacity-60"
        >
          {permanentDeleting && (
            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          <span>Delete Permanently</span>
        </button>
      </div>
    </Modal>
  );
}
