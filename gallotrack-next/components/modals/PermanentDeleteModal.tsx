'use client';
import React from 'react';
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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-rose-200 max-w-md w-full p-6 space-y-5 relative">
        <button 
          onClick={() => setPendingPermanentDelete(null)} 
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all cursor-pointer"
        >
          ✕
        </button>

        <div className="flex items-center space-x-3 text-rose-800 border-b pb-3 border-rose-100">
          <div className="w-10 h-10 bg-rose-100 rounded-2xl flex items-center justify-center text-xl">⚠️</div>
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight">Permanently Delete?</h3>
            <p className="text-[11px] text-slate-500 font-semibold">This action cannot be undone</p>
          </div>
        </div>

        <div className="bg-rose-50/60 p-4 rounded-2xl border border-rose-200/60 space-y-2">
          <p className="text-xs font-bold text-slate-800">Target Fowl: <strong className="text-rose-800 font-black">{pendingPermanentDelete.name}</strong> ({pendingPermanentDelete.breed})</p>
          <p className="text-[10px] text-slate-500 leading-relaxed">This fowl record will be <strong className="text-rose-700">permanently deleted</strong> from the database. This action cannot be undone.</p>
        </div>

        <div className="flex space-x-3 pt-2">
          <button 
            type="button" 
            onClick={() => setPendingPermanentDelete(null)} 
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black py-3 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button 
            type="button" 
            onClick={handlePermanentDelete} 
            disabled={permanentDeleting}
            className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-black py-3 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center space-x-2 shadow-md"
          >
            {permanentDeleting && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
            <span>Delete Permanently</span>
          </button>
        </div>
      </div>
    </div>
  );
}
