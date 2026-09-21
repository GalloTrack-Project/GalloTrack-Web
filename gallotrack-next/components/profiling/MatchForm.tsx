'use client';
import React, { useState } from 'react';
import type { FowlRecord } from '@/lib/types';
import { POST_FIGHT_CONDITIONS, isMale } from '@/lib/helpers';

type Props = {
  fowls: FowlRecord[];
  loading: boolean;
  uploadingVideo: boolean;
  selectedFowlForMatch: string;
  setSelectedFowlForMatch: (v: string) => void;
  matchDate: string;
  setMatchDate: (v: string) => void;
  opponentName: string;
  setOpponentName: (v: string) => void;
  opponentBreed: string;
  setOpponentBreed: (v: string) => void;
  matchLocation: string;
  setMatchLocation: (v: string) => void;
  matchType: string;
  setMatchType: (v: string) => void;
  matchOutcome: string;
  setMatchOutcome: (v: string) => void;
  matchPostFight: string;
  setMatchPostFight: (v: string) => void;
  matchVideoFile: File | null;
  setMatchVideoFile: (f: File | null) => void;
  handleAddMatchRecord: (e: React.FormEvent) => void;
  cockCount: number;
  setCockCount: (v: number) => void;
  ageCategory: string;
  setAgeCategory: (v: string) => void;
  eventType: string;
  setEventType: (v: string) => void;
};

export default function MatchForm({
  fowls,
  loading,
  uploadingVideo,
  selectedFowlForMatch, setSelectedFowlForMatch,
  matchDate, setMatchDate,
  opponentName, setOpponentName,
  opponentBreed, setOpponentBreed,
  matchLocation, setMatchLocation,
  matchType, setMatchType,
  matchOutcome, setMatchOutcome,
  matchPostFight, setMatchPostFight,
  matchVideoFile, setMatchVideoFile,
  handleAddMatchRecord,
  cockCount, setCockCount,
  ageCategory, setAgeCategory,
  eventType, setEventType,
}: Props) {
  const [chickenAge, setChickenAge] = useState('');
  const [ageUnit, setAgeUnit] = useState('Months');

  const buildPreview = () => {
    const cockText = cockCount > 0 ? `${cockCount} cocks` : '0 cocks';
    const base = `${matchType} · ${cockText} · ${ageCategory} · ${eventType}`;
    if (chickenAge) {
      return `${base} · ${chickenAge} ${ageUnit}`;
    }
    return base;
  };

  const SelectChevron = () => (
    <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2">
      <div className="h-[7px] w-[7px] border-r-[1.7px] border-b-[1.7px] border-[#667085] dark:border-muted-foreground rotate-45 -translate-y-[2px]" />
    </div>
  );

  const selectClass = "match-field h-10 w-full cursor-pointer rounded-xl border border-[#dfe5ea] dark:border-border bg-white dark:bg-input px-3 pr-10 text-xs font-semibold text-[#263445] dark:text-card-foreground outline-none transition-colors duration-150 focus:border-[#13a983] focus:shadow-[0_0_0_3px_rgba(19,169,131,.12)]";
  const inputClass = "match-field h-10 min-w-0 flex-1 rounded-xl border border-[#dfe5ea] dark:border-border bg-white dark:bg-input px-3 text-xs font-semibold text-[#263445] dark:text-card-foreground placeholder:text-[#98a2b3] dark:placeholder:text-muted-foreground outline-none transition-colors duration-150 focus:border-[#13a983] focus:shadow-[0_0_0_3px_rgba(19,169,131,.12)]";

  return (
    <form onSubmit={handleAddMatchRecord} className="antigravity-hover bg-white dark:bg-card p-6 rounded-3xl border border-slate-200/80 dark:border-border shadow-sm space-y-5 animate-fadeIn">
      <h3 className="font-black text-xs text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center space-x-2 border-b pb-2.5 border-slate-100 dark:border-border">
        <span>&#9876;&#65039;</span> <span>Record Fight Performance Log</span>
      </h3>

      {/* Row 1: Fowl + Date */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 dark:text-muted-foreground uppercase mb-1.5">Select Local Fowl Entry</label>
          <select value={selectedFowlForMatch} onChange={(e) => setSelectedFowlForMatch(e.target.value)} className="w-full p-3 border border-slate-200/90 dark:border-border rounded-xl text-xs bg-slate-50 dark:bg-muted/50 font-extrabold text-slate-700 dark:text-card-foreground outline-none focus:border-emerald-500 cursor-pointer" required>
            <option value="">-- Select Fowl Node --</option>
            {fowls.filter(f => f.status === 'Active' && isMale(f.gender)).map(f => (
              <option key={f.id} value={f.name}>{f.name} ({f.breed})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 dark:text-muted-foreground uppercase mb-1.5">Match Date</label>
          <input type="date" value={matchDate} onChange={(e) => setMatchDate(e.target.value)} className="w-full p-3 border border-slate-300 dark:border-border rounded-xl text-xs bg-white dark:bg-input text-neutral-900 dark:text-foreground font-semibold outline-none focus:border-emerald-500" />
        </div>
      </div>

      {/* Row 2: Opponent + Breed + Location */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 dark:text-muted-foreground uppercase mb-1.5">Opponent Entry Identity</label>
          <input type="text" value={opponentName} onChange={(e) => setOpponentName(e.target.value)} className="w-full p-3 border border-slate-300 dark:border-border rounded-xl text-xs bg-white dark:bg-input text-neutral-900 dark:text-foreground placeholder:text-neutral-400 dark:placeholder:text-muted-foreground outline-none focus:border-emerald-500 font-semibold" placeholder="e.g., Kelso Express" required />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 dark:text-muted-foreground uppercase mb-1.5">Opponent Breed / Rasa</label>
          <input type="text" value={opponentBreed} onChange={(e) => setOpponentBreed(e.target.value)} className="w-full p-3 border border-slate-300 dark:border-border rounded-xl text-xs bg-white dark:bg-input text-neutral-900 dark:text-foreground placeholder:text-neutral-400 dark:placeholder:text-muted-foreground outline-none focus:border-emerald-500 font-semibold" placeholder="e.g., Kelso, Roundhead" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 dark:text-muted-foreground uppercase mb-1.5">Arena Location Hub</label>
          <input
            list="arena-locations"
            value={matchLocation}
            onChange={(e) => setMatchLocation(e.target.value)}
            className="w-full p-3 border border-slate-300 dark:border-border rounded-xl text-xs bg-white dark:bg-input text-neutral-900 dark:text-foreground placeholder:text-neutral-400 dark:placeholder:text-muted-foreground outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all font-semibold"
            placeholder="Select or type arena..."
            required
          />
          <datalist id="arena-locations">
            <option value="Dingle Breeding Arena" />
            <option value="Iloilo Coliseum" />
            <option value="Passi Sports Complex" />
            <option value="Janiuay Cockpit Arena" />
            <option value="Pototan Coliseum" />
            <option value="Santa Barbara Sports Complex" />
            <option value="Dumangas Cockpit Arena" />
            <option value="San Enrique Arena" />
            <option value="Local Farm Pit" />
          </datalist>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MATCH TYPE CONFIGURATION — 2-column grid per mockup           */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="rounded-2xl border border-slate-200 dark:border-border bg-white dark:bg-card p-4 sm:p-5 shadow-sm">

        {/* Header */}
        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.02em] text-[#344054] dark:text-card-foreground sm:text-xs">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Match Type Configuration
          </h1>
        </div>

        {/* Row 1: Match Type + Number of Cocks */}
        <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="mb-2.5 block text-[9px] font-bold uppercase tracking-[.02em] text-[#13a983] dark:text-emerald-400">Match Type</label>
            <div className="relative">
              <select value={matchType} onChange={(e) => setMatchType(e.target.value)} className={selectClass}>
                <option value="Derby Match">Derby Match</option>
                <option value="Hack Fight">Hack Fight</option>
                <option value="Main Fight">Main Fight</option>
                <option value="Pot Fight">Pot Fight</option>
              </select>
              <SelectChevron />
            </div>
          </div>
          <div>
            <label className="mb-2.5 block text-[9px] font-bold uppercase tracking-[.02em] text-[#13a983] dark:text-emerald-400">Number of Cocks</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={99}
                value={cockCount || ''}
                onChange={(e) => setCockCount(Number(e.target.value) || 0)}
                placeholder="Enter number"
                className={`${inputClass} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
              />
              <span className="rounded-xl bg-[#f3f6f8] dark:bg-muted px-4 py-3 text-[11px] font-bold text-[#667085] dark:text-muted-foreground">cocks</span>
            </div>
          </div>
        </div>

        {/* Row 2: Bird Class + Event Type */}
        <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="mb-2.5 block text-[9px] font-bold uppercase tracking-[.02em] text-[#13a983] dark:text-emerald-400">Bird Class</label>
            <div className="relative">
              <select value={ageCategory} onChange={(e) => setAgeCategory(e.target.value)} className={selectClass}>
                <option value="Cock">Cock</option>
                <option value="Stag">Stag</option>
              </select>
              <SelectChevron />
            </div>
          </div>
          <div>
            <label className="mb-2.5 block text-[9px] font-bold uppercase tracking-[.02em] text-[#13a983] dark:text-emerald-400">Event Type</label>
            <div className="relative">
              <select value={eventType} onChange={(e) => setEventType(e.target.value)} className={selectClass}>
                <option value="Derby">Derby</option>
                <option value="Lusong">Lusong</option>
              </select>
              <SelectChevron />
            </div>
          </div>
        </div>

        {/* Row 3: Chicken Age + Age Unit */}
        <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="mb-2.5 block text-[9px] font-bold uppercase tracking-[.02em] text-[#13a983] dark:text-emerald-400">Chicken Age</label>
            <input
              type="number"
              min={1}
              value={chickenAge}
              onChange={(e) => setChickenAge(e.target.value)}
              placeholder="Enter age"
              className={`${inputClass} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
            />
          </div>
          <div>
            <label className="mb-2.5 block text-[9px] font-bold uppercase tracking-[.02em] text-[#13a983] dark:text-emerald-400">Age Unit</label>
            <div className="relative">
              <select value={ageUnit} onChange={(e) => setAgeUnit(e.target.value)} className={selectClass}>
                <option value="Months">Months</option>
                <option value="Years">Years</option>
              </select>
              <SelectChevron />
            </div>
          </div>
        </div>

        {/* Live Preview — only show when cock count is set */}
        {cockCount > 0 && (
          <div className="mt-4 rounded-xl bg-[#f0fdf9] dark:bg-emerald-950/30 border border-[#13a983]/20 dark:border-emerald-800/40 p-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="h-2 w-2 rounded-full bg-[#13a983] dark:bg-emerald-400 animate-pulse" />
              <label className="text-[9px] font-bold uppercase tracking-[.02em] text-[#13a983] dark:text-emerald-400">Live Preview</label>
            </div>
            <p className="text-sm font-extrabold tracking-[-.02em] text-[#111827] dark:text-card-foreground">{buildPreview()}</p>
          </div>
        )}

      </div>

      {/* Fight Outcome */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 dark:text-muted-foreground uppercase mb-1.5">Fight Outcome</label>
          <select value={matchOutcome} onChange={(e) => setMatchOutcome(e.target.value)} className="w-full p-3 border border-amber-200/80 rounded-xl text-xs bg-amber-50 font-black text-amber-900 outline-none cursor-pointer">
            <option value="Win">WIN</option>
            <option value="Loss">LOSS</option>
            <option value="Draw">DRAW</option>
          </select>
        </div>
      </div>

      {/* Post-Fight Condition */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-[10px] font-bold text-slate-500 dark:text-muted-foreground uppercase mb-1.5">Post-Fight Condition / Health Status</label>
          <select value={matchPostFight} onChange={(e) => setMatchPostFight(e.target.value)} className="w-full p-3 border border-slate-200/90 dark:border-border rounded-xl text-xs bg-slate-50 dark:bg-muted/50 font-bold text-slate-700 dark:text-card-foreground outline-none cursor-pointer focus:border-emerald-500 transition-all">
            {POST_FIGHT_CONDITIONS.map((c) => (
              <option key={c.value} value={c.value}>{c.icon} {c.value} — {c.desc}</option>
            ))}
          </select>
          <p className="mt-1.5 text-[9px] text-slate-400 dark:text-muted-foreground font-semibold leading-relaxed">Drives the bloodline <strong className="text-slate-600 dark:text-muted-foreground">Survivability / Health Resilience</strong> score — a win that ends in death or critical injury lowers the cross toughness rating even if the record shows a victory.</p>
        </div>
      </div>

      {/* Video Upload */}
      <div>
        <label className="block text-[10px] font-bold text-slate-500 dark:text-muted-foreground uppercase mb-1.5 tracking-wider">Video Evidence Upload</label>
        <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-slate-200 dark:border-border border-dashed rounded-2xl cursor-pointer bg-slate-50/80 dark:bg-muted/50 hover:bg-slate-100/70 transition-all">
          <span className="text-xs text-slate-600 dark:text-muted-foreground font-bold">{matchVideoFile ? matchVideoFile.name : 'Upload fight match recording (MP4, MOV, AVI)'}</span>
          <input type="file" accept="video/mp4,video/quicktime,video/x-msvideo" onChange={(e) => e.target.files && setMatchVideoFile(e.target.files[0])} className="hidden" />
        </label>
      </div>

      {/* Submit */}
      <button type="submit" disabled={loading || uploadingVideo} className="w-full bg-slate-900 dark:bg-emerald-600 text-white font-extrabold py-3.5 rounded-2xl text-xs shadow-md uppercase tracking-wider cursor-pointer transition-all duration-200 hover:bg-emerald-700 dark:hover:bg-emerald-500 flex items-center justify-center space-x-2">
        {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
        <span>{loading ? 'Recording...' : 'RECORD MATCH'}</span>
      </button>
    </form>
  );
}