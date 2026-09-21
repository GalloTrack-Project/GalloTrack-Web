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
  derbyMatchNumber: number;
  setDerbyMatchNumber: (v: number) => void;
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
  derbyMatchNumber, setDerbyMatchNumber,
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
      {/* MATCH TYPE CONFIGURATION — Dropdown + manual input style */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="rounded-2xl border border-slate-200 dark:border-border bg-white dark:bg-card p-4 sm:p-5 shadow-sm">

        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-[11px] font-extrabold uppercase tracking-[.02em] text-[#344054] dark:text-card-foreground sm:text-xs">Match Type Configuration</h1>
          <span className="text-[10px] font-semibold text-slate-400 dark:text-muted-foreground sm:text-[11px]">Dropdown selection</span>
        </div>

        {/* Match Type dropdown */}
        <div className="mb-5">
          <label className="mb-2.5 block text-[9px] font-bold uppercase tracking-[.02em] text-[#98a2b3] dark:text-muted-foreground">Match Type</label>
          <div className="relative">
            <select
              value={matchType}
              onChange={(e) => setMatchType(e.target.value)}
              className="match-field h-10 w-full cursor-pointer rounded-xl border border-[#dfe5ea] dark:border-border bg-white dark:bg-input px-3 pr-10 text-xs font-semibold text-[#263445] dark:text-card-foreground outline-none transition-colors duration-150 focus:border-[#13a983] focus:shadow-[0_0_0_3px_rgba(19,169,131,.12)]"
            >
              <option value="Derby Match">Derby Match</option>
              <option value="Hack Fight">Hack Fight</option>
              <option value="Main Fight">Main Fight</option>
              <option value="Pot Fight">Pot Fight</option>
            </select>
            <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2">
              <div className="h-[7px] w-[7px] border-r-[1.7px] border-b-[1.7px] border-[#667085] dark:border-muted-foreground rotate-45 -translate-y-[2px]" />
            </div>
          </div>
          <p className="mt-1.5 text-[10px] text-[#98a2b3] dark:text-muted-foreground">Choose the category that will be used for this event.</p>
        </div>

        {/* Number of Cocks — manual input */}
        <div className="mb-5">
          <label className="mb-2.5 block text-[9px] font-bold uppercase tracking-[.02em] text-[#98a2b3] dark:text-muted-foreground">Number of Cocks to Match</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={99}
              value={cockCount || ''}
              onChange={(e) => setCockCount(Number(e.target.value) || 0)}
              placeholder="Type number of cocks"
              className="match-field h-10 min-w-0 flex-1 rounded-xl border border-[#dfe5ea] dark:border-border bg-white dark:bg-input px-3 text-xs font-semibold text-[#263445] dark:text-card-foreground placeholder:text-[#98a2b3] dark:placeholder:text-muted-foreground outline-none transition-colors duration-150 focus:border-[#13a983] focus:shadow-[0_0_0_3px_rgba(19,169,131,.12)]"
            />
            <span className="rounded-xl bg-[#f3f6f8] dark:bg-muted px-4 py-3 text-[11px] font-bold text-[#667085] dark:text-muted-foreground">cocks</span>
          </div>
          <p className="mt-1.5 text-[10px] text-[#98a2b3] dark:text-muted-foreground">Example: type 2, 3, 4, or 5. You may enter a different number if needed.</p>
        </div>

        {/* Bird Class dropdown */}
        <div className="mb-5">
          <label className="mb-2.5 block text-[9px] font-bold uppercase tracking-[.02em] text-[#98a2b3] dark:text-muted-foreground">Bird Class</label>
          <div className="relative">
            <select
              value={ageCategory}
              onChange={(e) => setAgeCategory(e.target.value)}
              className="match-field h-10 w-full cursor-pointer rounded-xl border border-[#dfe5ea] dark:border-border bg-white dark:bg-input px-3 pr-10 text-xs font-semibold text-[#263445] dark:text-card-foreground outline-none transition-colors duration-150 focus:border-[#13a983] focus:shadow-[0_0_0_3px_rgba(19,169,131,.12)]"
            >
              <option value="Cock">Cock</option>
              <option value="Stag">Stag</option>
            </select>
            <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2">
              <div className="h-[7px] w-[7px] border-r-[1.7px] border-b-[1.7px] border-[#667085] dark:border-muted-foreground rotate-45 -translate-y-[2px]" />
            </div>
          </div>
        </div>

        {/* Event Type dropdown */}
        <div className="mb-5">
          <label className="mb-2.5 block text-[9px] font-bold uppercase tracking-[.02em] text-[#98a2b3] dark:text-muted-foreground">Event Type</label>
          <div className="relative">
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="match-field h-10 w-full cursor-pointer rounded-xl border border-[#dfe5ea] dark:border-border bg-white dark:bg-input px-3 pr-10 text-xs font-semibold text-[#263445] dark:text-card-foreground outline-none transition-colors duration-150 focus:border-[#13a983] focus:shadow-[0_0_0_3px_rgba(19,169,131,.12)]"
            >
              <option value="Derby">Derby</option>
              <option value="Lusong">Lusong</option>
            </select>
            <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2">
              <div className="h-[7px] w-[7px] border-r-[1.7px] border-b-[1.7px] border-[#667085] dark:border-muted-foreground rotate-45 -translate-y-[2px]" />
            </div>
          </div>
        </div>

        {/* Chicken Age — manual input + unit */}
        <div className="mb-5">
          <label className="mb-2.5 block text-[9px] font-bold uppercase tracking-[.02em] text-[#98a2b3] dark:text-muted-foreground">Chicken Age</label>
          <div className="grid grid-cols-[minmax(0,1fr)_130px] gap-2">
            <input
              type="number"
              min={1}
              value={chickenAge}
              onChange={(e) => setChickenAge(e.target.value)}
              placeholder="Type age"
              className="match-field no-spinner h-10 w-full rounded-xl border border-[#dfe5ea] dark:border-border bg-white dark:bg-input px-3 text-xs font-semibold text-[#263445] dark:text-card-foreground placeholder:text-[#98a2b3] dark:placeholder:text-muted-foreground outline-none transition-colors duration-150 focus:border-[#13a983] focus:shadow-[0_0_0_3px_rgba(19,169,131,.12)]"
            />
            <div className="relative">
              <select
                value={ageUnit}
                onChange={(e) => setAgeUnit(e.target.value)}
                className="match-field h-10 w-full cursor-pointer rounded-xl border border-[#dfe5ea] dark:border-border bg-white dark:bg-input px-3 pr-9 text-xs font-semibold text-[#263445] dark:text-card-foreground outline-none transition-colors duration-150 focus:border-[#13a983] focus:shadow-[0_0_0_3px_rgba(19,169,131,.12)]"
              >
                <option value="Months">Months</option>
                <option value="Years">Years</option>
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                <div className="h-[7px] w-[7px] border-r-[1.7px] border-b-[1.7px] border-[#667085] dark:border-muted-foreground rotate-45 -translate-y-[2px]" />
              </div>
            </div>
          </div>
          <p className="mt-1.5 text-[10px] text-[#98a2b3] dark:text-muted-foreground">Manual input is allowed. Enter the target age for the participating chickens.</p>
        </div>

        {/* Derby Match Number */}
        <div className="mb-5">
          <label className="mb-2.5 block text-[9px] font-bold uppercase tracking-[.02em] text-[#98a2b3] dark:text-muted-foreground">Derby Match Number</label>
          <input
            type="number"
            min={1}
            max={99}
            value={derbyMatchNumber}
            onChange={(e) => setDerbyMatchNumber(Number(e.target.value) || 1)}
            className="match-field h-10 w-full rounded-xl border border-[#dfe5ea] dark:border-border bg-white dark:bg-input px-3 text-xs font-semibold text-[#263445] dark:text-card-foreground outline-none transition-colors duration-150 focus:border-[#13a983] focus:shadow-[0_0_0_3px_rgba(19,169,131,.12)] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>

        {/* Live Preview — only show when cock count is set */}
        {cockCount > 0 && (
          <div className="border-t border-[#edf0f3] dark:border-border pt-4">
            <label className="mb-2 block text-[9px] font-bold uppercase tracking-[.02em] text-[#98a2b3] dark:text-muted-foreground">Live Preview</label>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-base font-extrabold tracking-[-.02em] text-[#111827] dark:text-card-foreground">{buildPreview()}</p>
              {chickenAge && (
                <span className="rounded-full bg-[#eaf9f4] dark:bg-emerald-950/50 px-2.5 py-1 text-[10px] font-bold text-[#087b60] dark:text-emerald-400">{chickenAge} {ageUnit}</span>
              )}
            </div>
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
