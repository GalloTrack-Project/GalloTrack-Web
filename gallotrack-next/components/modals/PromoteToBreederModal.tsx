'use client';
import React, { useState, useEffect } from 'react';
import { Award, ShieldAlert, ArrowRight } from 'lucide-react';
import { Modal } from '@/components/ui';
import type { FowlRecord } from '@/lib/types';
import ChickenIcon from '@/components/ChickenIcon';

type PromoteToBreederModalProps = {
  isOpen: boolean;
  onClose: () => void;
  fowl: FowlRecord | null;
  targetRole: 'Breeding Male' | 'Breeding Female';
  suggestedCode: string;
  onConfirm: (assignedCode: string) => Promise<void>;
  loading?: boolean;
};

export default function PromoteToBreederModal({
  isOpen,
  onClose,
  fowl,
  targetRole,
  suggestedCode,
  onConfirm,
  loading = false,
}: PromoteToBreederModalProps) {
  const [code, setCode] = useState(suggestedCode);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setCode(suggestedCode);
  }, [suggestedCode]);

  if (!isOpen || !fowl) return null;

  const birthCode = (fowl.birth_code || fowl.bird_code || fowl.chicken_code || '').trim();
  const isMale = targetRole === 'Breeding Male';
  const roleLabel = isMale ? 'Breeding Male (Sire)' : 'Breeding Female (Dam)';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await onConfirm(code.trim() || suggestedCode);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Promote Offspring to Breeding Stock"
      icon={<Award className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
      className="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Chicken Summary Card */}
        <div className="bg-slate-50 dark:bg-muted/40 p-4 rounded-lg border border-slate-200/80 dark:border-border space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-md bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shrink-0">
              <ChickenIcon className="w-5 h-5 text-emerald-700 dark:text-emerald-300" />
            </span>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-black text-slate-900 dark:text-card-foreground truncate">
                {fowl.name}
              </h4>
              <p className="text-xs text-muted-foreground font-semibold">
                {fowl.breed} · {fowl.gender || (isMale ? 'Rooster' : 'Hen')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200/60 dark:border-border/60">
            <div>
              <span className="text-muted-foreground font-medium block">Current Role:</span>
              <span className="font-bold text-slate-700 dark:text-slate-300">Non-Breeding</span>
            </div>
            <div>
              <span className="text-muted-foreground font-medium block">Birth Code:</span>
              <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                born as {birthCode || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Transition Preview */}
        <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg space-y-2">
          <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
            <span>Promotion Target</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-200/60 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200">
              {roleLabel}
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            This chicken will leave the <strong>Non-Breeding</strong> tab and appear strictly in the{' '}
            <strong>Breeding</strong> tab. Its birth code (<code className="font-mono">{birthCode}</code>) will remain
            preserved as historical reference.
          </p>
        </div>

        {/* Breeder Identifier Input */}
        <div>
          <label
            htmlFor="promote-breeder-code"
            className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-card-foreground mb-1"
          >
            New Breeder Identifier ({isMale ? 'Sire Number' : 'Dam Letter'})
          </label>
          <div className="relative">
            <input
              id="promote-breeder-code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full p-2.5 font-mono text-base font-black border border-emerald-400 rounded-md bg-white dark:bg-input text-slate-900 dark:text-foreground focus:ring-4 focus:ring-emerald-100"
              placeholder={suggestedCode}
              required
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            This becomes the chicken's main identifier in breeding charts and pedigrees.
          </p>
        </div>

        {/* Notice of reversible audit */}
        <div className="flex items-start gap-2 text-xs text-muted-foreground bg-slate-100/70 dark:bg-muted/30 p-2.5 rounded-md">
          <ShieldAlert className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <span>
            This action is logged in <code>fowl_status_history</code> and is fully reversible.
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-border">
          <button
            type="button"
            onClick={onClose}
            disabled={busy || loading}
            className="px-3.5 py-2 text-xs font-bold rounded-md border border-slate-300 dark:border-border hover:bg-slate-100 dark:hover:bg-muted text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || loading}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-black rounded-md bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm cursor-pointer disabled:opacity-50"
          >
            <span>{busy || loading ? 'Promoting...' : 'Confirm Promotion & Select'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </Modal>
  );
}
