'use client';
import React, { useState, useMemo } from 'react';
import { Dna, Search, Trash2, Lock, Plus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useFowl } from '@/lib/contexts/fowl-context';
import { useUI } from '@/lib/contexts/ui-context';
import { STRAIN_LIST } from '@/lib/helpers';
import * as strainService from '@/lib/services/strain-service';

export default function BreedsPage() {
  const { availableStrains, customStrainNames, fowls, activeFowls, fetchDatabaseResources } = useFowl();
  const ui = useUI();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [newBreedName, setNewBreedName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const breedFowlCounts = useMemo(() => {
    const counts = new Map<string, number>();
    activeFowls.forEach((f) => {
      const breeds = (f.breed || '').split(',').map(s => s.trim()).filter(Boolean);
      breeds.forEach((b) => counts.set(b, (counts.get(b) || 0) + 1));
    });
    return counts;
  }, [activeFowls]);

  const breeds = useMemo(() => {
    const q = search.trim().toLowerCase();
    return availableStrains
      .filter((s) => !q || s.toLowerCase().includes(q))
      .sort((a, b) => {
        const aCount = breedFowlCounts.get(a) || 0;
        const bCount = breedFowlCounts.get(b) || 0;
        if (bCount !== aCount) return bCount - aCount;
        return a.localeCompare(b);
      });
  }, [availableStrains, search, breedFowlCounts]);

  const customCount = availableStrains.filter(s => customStrainNames.has(s)).length;
  const builtInCount = availableStrains.length - customCount;

  const handleAdd = async () => {
    const trimmed = newBreedName.trim();
    if (!trimmed) return;
    if (availableStrains.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
      ui.showToastMessage(`"${trimmed}" already exists.`, 'error');
      return;
    }
    const ok = await strainService.saveCustomStrain(trimmed);
    if (ok) {
      ui.showToastMessage(`Breed "${trimmed}" created.`, 'success');
      setNewBreedName('');
      setShowAddForm(false);
      fetchDatabaseResources();
    } else {
      ui.showToastMessage('Failed to create breed.', 'error');
    }
  };

  const handleDelete = async (name: string) => {
    setDeleting(name);
    const result = await strainService.deleteStrain(name);
    if (result.error) {
      ui.showToastMessage(`Failed to delete "${name}": ${result.error}`, 'error');
    } else {
      ui.showToastMessage(`Breed "${name}" deleted.`, 'success');
      fetchDatabaseResources();
    }
    setDeleting(null);
    setConfirmDelete(null);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-9 h-9 rounded-xl bg-muted border border-border flex items-center justify-center text-muted-foreground hover:text-emerald-500 hover:border-emerald-500/50 transition-all cursor-pointer"
          >
            ←
          </button>
          <div>
            <h1 className="text-lg font-black text-card-foreground tracking-tight flex items-center gap-2">
              <Dna className="w-5 h-5" /> Breed Registry
            </h1>
            <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">Create and manage genetic strains for your fowl registry</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer"
        >
          <span className="text-base">{showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}</span>
          {showAddForm ? 'Cancel' : 'Add New Breed'}
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card rounded-2xl border border-border shadow-sm p-4 text-center">
          <p className="text-2xl font-black text-card-foreground">{availableStrains.length}</p>
          <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1">Total Breeds</p>
        </div>
        <div className="bg-card rounded-2xl border border-border shadow-sm p-4 text-center">
          <p className="text-2xl font-black text-sky-600">{builtInCount}</p>
          <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1">Built-in</p>
        </div>
        <div className="bg-card rounded-2xl border border-border shadow-sm p-4 text-center">
          <p className="text-2xl font-black text-emerald-600">{customCount}</p>
          <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1">Custom</p>
        </div>
      </div>

      {/* ADD FORM */}
      {showAddForm && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 space-y-3">
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Create New Breed</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={newBreedName}
              onChange={(e) => setNewBreedName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
              placeholder="e.g. Roundhead, Kelso, Sweater..."
              className="flex-1 p-3 border border-emerald-500/30 rounded-xl text-xs bg-background text-foreground placeholder:text-muted-foreground outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all font-semibold"
              autoFocus
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={!newBreedName.trim()}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl transition-all cursor-pointer shrink-0"
            >
              Save
            </button>
          </div>
          <p className="text-[9px] text-muted-foreground font-semibold">Type the breed name then click <strong className="text-emerald-600">Save</strong> or press Enter.</p>
        </div>
      )}

      {/* SEARCH */}
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search breeds..."
          className="w-full p-3 pl-10 border border-border rounded-xl text-xs bg-background text-foreground placeholder:text-muted-foreground outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all font-semibold"
        />
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm"><Search className="w-4 h-4" /></span>
      </div>

      {/* BREED LIST */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-6">
        {breeds.length === 0 ? (
          <div className="text-center py-12">
            <Dna className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm font-bold text-muted-foreground">{search ? 'No breeds match your search.' : 'No breeds registered yet.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {breeds.map((breed) => {
              const isCustom = customStrainNames.has(breed);
              const count = breedFowlCounts.get(breed) || 0;
              const isConfirming = confirmDelete === breed;
              const isDeletingThis = deleting === breed;
              return (
                <div key={breed} className={`relative flex flex-col p-4 rounded-xl border transition-all ${isCustom ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-muted/50 border-border'}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-card-foreground truncate">{breed}</p>
                      <span className={`inline-block text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full mt-1 ${isCustom ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700' : 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400 border border-sky-200 dark:border-sky-700'}`}>
                        {isCustom ? 'Custom' : 'Built-in'}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-black text-card-foreground leading-none">{count}</p>
                      <p className="text-[8px] font-bold text-muted-foreground uppercase mt-0.5">fowl{count !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  {isCustom && (
                    <div className="mt-auto pt-2 border-t border-emerald-500/20">
                      {isConfirming ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold text-rose-500">Delete?</span>
                          <button
                            type="button"
                            onClick={() => handleDelete(breed)}
                            disabled={isDeletingThis}
                            className="text-[9px] font-bold bg-rose-500 text-white px-2.5 py-1 rounded-lg hover:bg-rose-600 transition-all cursor-pointer disabled:opacity-50"
                          >
                            {isDeletingThis ? '...' : 'Yes'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(null)}
                            className="text-[9px] font-bold bg-muted text-muted-foreground px-2.5 py-1 rounded-lg hover:bg-muted/80 transition-all cursor-pointer"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(breed)}
                          className="text-[9px] font-bold text-rose-500 hover:text-rose-700 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3 inline mr-1" /> Delete
                        </button>
                      )}
                    </div>
                  )}
                  {!isCustom && (
                    <div className="mt-auto pt-2 border-t border-border">
                      <span className="text-[9px] font-bold text-muted-foreground/50"><Lock className="w-3 h-3 inline mr-1" /> Built-in</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
