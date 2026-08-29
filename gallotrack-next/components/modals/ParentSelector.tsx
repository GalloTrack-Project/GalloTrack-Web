'use client';
import React, { useState, useEffect, useRef } from 'react';
import type { FowlRecord } from '@/lib/types';

export type ParentSelectorProps = {
  value: string;
  onChange: (v: string) => void;
  onPick?: (fowl: FowlRecord) => void;
  fowls: FowlRecord[];
  preferredGender?: 'Male' | 'Female';
  placeholder?: string;
  accent?: 'emerald' | 'amber';
  compact?: boolean;
};

export default function ParentSelector({ value, onChange, onPick, fowls, preferredGender, placeholder, accent = 'emerald', compact }: ParentSelectorProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(value);
  const [prevValue, setPrevValue] = useState(value);
  const boxRef = useRef<HTMLDivElement>(null);

  if (prevValue !== value) {
    setPrevValue(value);
    setText(value);
  }

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const q = text.trim().toLowerCase();
  const candidates = fowls
    .filter((f) => {
      const name = (f.name || '').trim().toLowerCase();
      return name && name !== 'foundation stock' && name.includes(q);
    })
    .sort((a, b) => {
      if (preferredGender === 'Male') return (a.gender === 'Male' ? 0 : 1) - (b.gender === 'Male' ? 0 : 1);
      if (preferredGender === 'Female') return (a.gender === 'Female' ? 0 : 1) - (b.gender === 'Female' ? 0 : 1);
      return 0;
    })
    .slice(0, 6);

  const accentBg = accent === 'emerald' ? 'bg-emerald-600' : 'bg-amber-500';
  const genderIcon = preferredGender === 'Male' ? '🐓' : preferredGender === 'Female' ? '🐔' : '🐣';
  const pad = compact ? 'p-2.5' : 'p-3';

  return (
    <div ref={boxRef} className="relative">
      <input
        type="text"
        value={text}
        onChange={(e) => { setText(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        className={`w-full ${pad} border border-slate-300 rounded-xl text-xs bg-white text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-emerald-500 font-semibold`}
        placeholder={placeholder || 'Type a name or pick from registry...'}
      />
      {open && (
        <div className="absolute z-50 mt-1.5 w-full bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto">
          {candidates.length > 0 && (
            <>
              <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-400">
                Registered fowls in your registry
              </div>
              {candidates.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setText(f.name);
                    onChange(f.name);
                    if (onPick) onPick(f);
                    setOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-emerald-50 border-b border-slate-50 text-left cursor-pointer"
                >
                  <span className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] shrink-0">{f.gender === 'Male' ? '🐓' : f.gender === 'Female' ? '🐔' : '🐣'}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs font-black text-slate-800 truncate">{f.name}</span>
                    <span className="block text-[9px] font-semibold text-slate-400 truncate">{f.breed} · {f.growth_stage || 'Stag'} · {f.gender || 'Unset'}</span>
                  </span>
                  <span className={`shrink-0 text-[8px] font-mono font-black px-1.5 py-0.5 rounded-full uppercase ${f.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>{f.status}</span>
                </button>
              ))}
            </>
          )}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              setOpen(false);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-50 text-left cursor-pointer border-t border-slate-100"
          >
            <span className={`w-7 h-7 rounded-lg ${accentBg} text-white flex items-center justify-center text-[10px] font-black shrink-0`}>{genderIcon}</span>
            <span className="flex-1 min-w-0">
              <span className="block text-xs font-black text-slate-800 truncate">
                {text.trim() ? `Use "${text.trim()}" as custom ${preferredGender?.toLowerCase() || 'parent'}` : 'External / Foundation Stock name...'}
              </span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
