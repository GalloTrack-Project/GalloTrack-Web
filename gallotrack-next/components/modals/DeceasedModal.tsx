'use client';
import React from 'react';
import type { FowlRecord } from '@/lib/types';

type DeceasedModalProps = {
  selectedFowlForDeceased: FowlRecord | null;
  setSelectedFowlForDeceased: (f: FowlRecord | null) => void;
  handleMarkFowlDeceased: () => void;
  deathReasonInput: string;
  setDeathReasonInput: (v: string) => void;
  loading: boolean;
};

export default function DeceasedModal({
  selectedFowlForDeceased,
  setSelectedFowlForDeceased,
  handleMarkFowlDeceased,
  deathReasonInput,
  setDeathReasonInput,
  loading,
}: DeceasedModalProps) {
  if (!selectedFowlForDeceased) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-rose-200 max-w-md w-full p-6 space-y-5 relative">
        <button 
          onClick={() => setSelectedFowlForDeceased(null)} 
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all cursor-pointer"
        >
          ✕
        </button>

        <div className="flex items-center space-x-3 text-rose-700 border-b pb-3 border-rose-100">
          <div className="w-10 h-10 bg-rose-100 rounded-2xl flex items-center justify-center text-xl">💀</div>
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight">Record Mortality</h3>
            <p className="text-[11px] text-slate-500 font-semibold">Transition node to Deceased status — cause of death required</p>
          </div>
        </div>

        <div className="bg-rose-50/60 p-4 rounded-2xl border border-rose-200/60 space-y-2">
          <p className="text-xs font-bold text-slate-800">Target Fowl: <strong className="text-rose-700 font-black">{selectedFowlForDeceased.name}</strong> ({selectedFowlForDeceased.breed})</p>
          <p className="text-[10px] text-slate-500 leading-relaxed">Use this ONLY when the fowl has died. Mortality removes the fowl from the active registry. Non-mortality removals (sold, transferred, retired, inactive) belong under <strong className="text-amber-700">📦 Archive</strong> instead.</p>
        </div>

        <div className="space-y-2">
          <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">Cause of Death</label>
          <select 
            value={deathReasonInput} 
            onChange={(e) => setDeathReasonInput(e.target.value)} 
            className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 font-extrabold text-slate-800 outline-none focus:border-rose-500 cursor-pointer"
          >
            <option value="Illness">Illness / Disease</option>
            <option value="Injury">Injury / Fight Trauma</option>
            <option value="Natural">Natural Causes / Old Age</option>
            <option value="Culling">Selective Culling</option>
            <option value="Other">Other Unspecified Cause</option>
          </select>
        </div>

        <div className="flex space-x-3 pt-2">
          <button 
            type="button" 
            onClick={() => setSelectedFowlForDeceased(null)} 
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black py-3 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button 
            type="button" 
            onClick={handleMarkFowlDeceased} 
            disabled={loading}
            className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-black py-3 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center space-x-2 shadow-md"
          >
            {loading && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
            <span>Record Deceased</span>
          </button>
        </div>
      </div>
    </div>
  );
}
