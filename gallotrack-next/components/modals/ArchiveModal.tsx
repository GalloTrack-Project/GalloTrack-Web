'use client';
import React from 'react';
import type { FowlRecord } from '@/lib/types';

type ArchiveModalProps = {
  selectedFowlForArchive: FowlRecord | null;
  setSelectedFowlForArchive: (f: FowlRecord | null) => void;
  handleArchiveFowlWithReason: () => void;
  archiveReasonInput: string;
  setArchiveReasonInput: (v: string) => void;
  loading: boolean;
};

export default function ArchiveModal({
  selectedFowlForArchive,
  setSelectedFowlForArchive,
  handleArchiveFowlWithReason,
  archiveReasonInput,
  setArchiveReasonInput,
  loading,
}: ArchiveModalProps) {
  if (!selectedFowlForArchive) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-amber-200 max-w-md w-full p-6 space-y-5 relative">
        <button 
          onClick={() => setSelectedFowlForArchive(null)} 
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all cursor-pointer"
        >
          ✕
        </button>

        <div className="flex items-center space-x-3 text-amber-800 border-b pb-3 border-amber-100">
          <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center text-xl">📦</div>
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight">Archive Gamefowl Node</h3>
            <p className="text-[11px] text-slate-500 font-semibold">Select a NON-MORTALITY reason for inventory removal</p>
          </div>
        </div>

        <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200/60 space-y-2">
          <p className="text-xs font-bold text-slate-800">Target Fowl: <strong className="text-amber-800 font-black">{selectedFowlForArchive.name}</strong> ({selectedFowlForArchive.breed})</p>
          <p className="text-[10px] text-slate-500 leading-relaxed">Archiving records a non-death disposition (sold, transferred, retired, inactive). It does NOT imply mortality. If the fowl has died, use <strong className="text-rose-700">💀 Deceased</strong> instead.</p>
        </div>

        <div className="space-y-2">
          <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">Select Archive Reason (Non-Mortality)</label>
          <select 
            value={archiveReasonInput} 
            onChange={(e) => setArchiveReasonInput(e.target.value)} 
            className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 font-extrabold text-slate-800 outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="SOLD">🏷️ SOLD — Sold / Transferred to a Buyer</option>
            <option value="TRANSFERRED">🤝 TRANSFERRED — Moved to Another Farm / Owner</option>
            <option value="RETIRED">🌾 RETIRED — Retired from Circuit / Breeding</option>
            <option value="INACTIVE">⏸️ INACTIVE — Discontinued / On Hold (Non-Mortality)</option>
            <option value="OTHER">📦 OTHER — Other Non-Mortality Reason</option>
          </select>
        </div>

        <div className="flex space-x-3 pt-2">
          <button 
            type="button" 
            onClick={() => setSelectedFowlForArchive(null)} 
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black py-3 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button 
            type="button" 
            onClick={handleArchiveFowlWithReason} 
            disabled={loading}
            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-black py-3 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center space-x-2 shadow-md"
          >
            {loading && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
            <span>Confirm Archive</span>
          </button>
        </div>
      </div>
    </div>
  );
}
