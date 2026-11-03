'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Modal } from '@/components/ui';
import { formatBirdCodeForDisplay } from '@/lib/bird-code';
import { canFight, sexLabel } from '@/lib/helpers';
import type { FowlRecord, MatchRecord } from '@/lib/types';
import { cn } from '@/components/ui/utils';

type Props = {
  match: MatchRecord;
  fowls: FowlRecord[];
  birdCodes: Map<string, string>;
  onClose: () => void;
  onConfirm: (fowl: FowlRecord) => Promise<boolean>;
};

export default function LinkChickenModal({ match, fowls, birdCodes, onClose, onConfirm }: Props) {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const candidates = useMemo(() => {
    const term = query.trim().toLowerCase();
    return fowls
      .filter(canFight)
      .filter((fowl) => {
        if (!term) return true;
        const code = birdCodes.get(String(fowl.id)) || fowl.bird_code || fowl.chicken_code || '';
        return (
          fowl.name.toLowerCase().includes(term) ||
          code.toLowerCase().includes(term) ||
          (fowl.wing_band || '').toLowerCase().includes(term)
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name) || a.id - b.id);
  }, [fowls, birdCodes, query]);

  const selected = selectedId != null ? fowls.find((f) => f.id === selectedId) ?? null : null;
  const nameDiffers =
    !!selected &&
    selected.name.trim().toLowerCase() !== (match.entry_name || '').trim().toLowerCase();

  const handleConfirm = async () => {
    if (!selected || saving) return;
    setSaving(true);
    try {
      const ok = await onConfirm(selected);
      if (ok) onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Link to profile"
      description={`Match vs ${match.opponent || 'opponent'} ? ${match.date || 'date not recorded'}`}
      className="max-w-2xl"
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="link-chicken-search" className="text-muted-foreground block text-xs font-black tracking-widest uppercase">
            Search chickens
          </label>
          <div className="relative mt-1.5">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" aria-hidden="true" />
            <input
              id="link-chicken-search"
              type="search"
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, band/ID..."
              className="border-input-border bg-card text-foreground placeholder:text-muted-foreground focus:border-emerald-500 h-11 w-full rounded-md border pr-9 pl-9 text-sm font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear chicken search"
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        <div
          role="listbox"
          aria-label="Eligible chickens"
          className="border-border bg-muted/20 max-h-72 divide-y divide-border/60 overflow-y-auto rounded-md border"
        >
          {candidates.length === 0 ? (
            <p className="text-muted-foreground p-4 text-sm font-semibold">No eligible chickens match that search.</p>
          ) : (
            candidates.map((fowl) => {
              const code = formatBirdCodeForDisplay(
                birdCodes.get(String(fowl.id)) || fowl.bird_code || fowl.chicken_code || '',
              );
              const isSelected = selectedId === fowl.id;
              return (
                <button
                  key={fowl.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => setSelectedId(fowl.id)}
                  className={cn(
                    'flex min-h-[44px] w-full cursor-pointer items-center gap-3 px-3 py-2 text-left transition-colors',
                    isSelected ? 'bg-emerald-500/10' : 'hover:bg-muted/60',
                  )}
                >
                  <span className="border-border bg-card text-foreground shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px] font-black">
                    {code || '?'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="text-card-foreground block truncate text-sm font-bold">{fowl.name}</span>
                    <span className="text-muted-foreground block truncate text-[11px] font-semibold">
                      {sexLabel(fowl)} ? {fowl.status || 'Unknown status'}
                      {fowl.wing_band ? ` ? Band ${fowl.wing_band}` : ''}
                    </span>
                  </span>
                  <span
                    className={cn(
                      'h-3.5 w-3.5 shrink-0 rounded-full border',
                      isSelected ? 'border-emerald-600 bg-emerald-600' : 'border-border bg-card',
                    )}
                    aria-hidden="true"
                  />
                </button>
              );
            })
          )}
        </div>

        {nameDiffers && selected && (
          <p
            role="status"
            className="rounded-md border border-amber-300/70 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
          >
            The selected chicken is named ?{selected.name}?, but this match is recorded as ?{match.entry_name}?.
            Saving will update the recorded name.
          </p>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="border-border bg-card text-foreground hover:bg-muted h-11 cursor-pointer rounded-md border px-4 text-sm font-black transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selected || saving}
            className="inline-flex h-11 cursor-pointer items-center justify-center rounded-md bg-emerald-600 px-5 text-sm font-black text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Linking?' : 'Link chicken'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
