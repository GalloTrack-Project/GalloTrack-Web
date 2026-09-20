'use client';
import React, { useState } from 'react';
import type { FowlRecord } from '@/lib/types';
import { POST_FIGHT_CONDITIONS, isMale, COCK_COUNT_OPTIONS } from '@/lib/helpers';

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
  const [customMode, setCustomMode] = useState(false);
  const [customType, setCustomType] = useState('');

  const buildPreview = () => {
    return `${cockCount}-Cock ${ageCategory} ${eventType} #${derbyMatchNumber}`;
  };

  React.useEffect(() => {
    if (!customMode) {
      setMatchType(buildPreview());
    }
  }, [cockCount, ageCategory, eventType, derbyMatchNumber, customMode]);

  const handleCustomToggle = () => {
    if (!customMode) {
      setCustomType(matchType);
    } else {
      setCustomType('');
      setMatchType(buildPreview());
    }
    setCustomMode(!customMode);
  };

  const handleCustomChange = (val: string) => {
    setCustomType(val);
    setMatchType(val);
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
      {/* MATCH TYPE — Single grouped container */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="border border-emerald-200 dark:border-emerald-800/50 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 p-4">

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-emerald-200/60 dark:border-emerald-800/40 mb-3">
          <label className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Match Type Configuration</label>
          <button type="button" onClick={handleCustomToggle} className={`text-[9px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${customMode ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-muted border border-slate-200 dark:border-border text-slate-500 dark:text-muted-foreground hover:border-emerald-400'}`}>
            {customMode ? 'Back to Cards' : 'Custom Input'}
          </button>
        </div>

        {customMode ? (
          <div>
            <input
              type="text"
              value={customType}
              onChange={(e) => handleCustomChange(e.target.value)}
              className="w-full p-3 border border-emerald-300 dark:border-emerald-700 rounded-xl text-sm bg-white dark:bg-input font-bold text-slate-700 dark:text-card-foreground outline-none focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-800 transition-all"
              placeholder="e.g., Regional Circuit, Championship, Main Event..."
              required
            />
            <p className="mt-1 text-[9px] text-slate-400 dark:text-muted-foreground font-semibold">Type any custom match type you want.</p>
          </div>
        ) : (
          <div className="space-y-0">

            {/* Row 1: Match Format */}
            <div className="pb-3 border-b border-emerald-100 dark:border-emerald-900/40">
              <p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-500 uppercase mb-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                Match Format
              </p>
              <div className="grid grid-cols-4 gap-2">
                {COCK_COUNT_OPTIONS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setCockCount(n)}
                    className={`py-2.5 rounded-xl text-xs font-black border-2 transition-all cursor-pointer text-center ${
                      cockCount === n
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-200 dark:shadow-emerald-900'
                        : 'bg-white dark:bg-muted border-slate-200 dark:border-border text-slate-600 dark:text-muted-foreground hover:border-emerald-300 dark:hover:border-emerald-700'
                    }`}
                  >
                    {n}-Cock
                  </button>
                ))}
              </div>
            </div>

            {/* Row 2: Bird Class */}
            <div className="py-3 border-b border-emerald-100 dark:border-emerald-900/40">
              <p className="text-[9px] font-bold text-sky-600 dark:text-sky-500 uppercase mb-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500 inline-block"></span>
                Bird Class
              </p>
              <div className="grid grid-cols-2 gap-2">
                {['Cock', 'Stag'].map((age) => (
                  <button
                    key={age}
                    type="button"
                    onClick={() => setAgeCategory(age)}
                    className={`py-2.5 rounded-xl text-xs font-black border-2 transition-all cursor-pointer text-center ${
                      ageCategory === age
                        ? 'bg-sky-600 border-sky-600 text-white shadow-md shadow-sky-200 dark:shadow-sky-900'
                        : 'bg-white dark:bg-muted border-slate-200 dark:border-border text-slate-600 dark:text-muted-foreground hover:border-sky-300 dark:hover:border-sky-700'
                    }`}
                  >
                    {age}
                  </button>
                ))}
              </div>
            </div>

            {/* Row 3: Event Type */}
            <div className="py-3 border-b border-emerald-100 dark:border-emerald-900/40">
              <p className="text-[9px] font-bold text-amber-600 dark:text-amber-500 uppercase mb-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block"></span>
                Event Type
              </p>
              <div className="grid grid-cols-2 gap-2">
                {['Derby', 'Lusong'].map((evt) => (
                  <button
                    key={evt}
                    type="button"
                    onClick={() => setEventType(evt)}
                    className={`py-2.5 rounded-xl text-xs font-black border-2 transition-all cursor-pointer text-center ${
                      eventType === evt
                        ? 'bg-amber-600 border-amber-600 text-white shadow-md shadow-amber-200 dark:shadow-amber-900'
                        : 'bg-white dark:bg-muted border-slate-200 dark:border-border text-slate-600 dark:text-muted-foreground hover:border-amber-300 dark:hover:border-amber-700'
                    }`}
                  >
                    {evt}
                  </button>
                ))}
              </div>
            </div>

            {/* Row 4: Match Number */}
            <div className="py-3 border-b border-emerald-100 dark:border-emerald-900/40">
              <p className="text-[9px] font-bold text-slate-500 dark:text-muted-foreground uppercase mb-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block"></span>
                Match Number
              </p>
              <input
                type="number"
                min={1}
                max={99}
                value={derbyMatchNumber}
                onChange={(e) => setDerbyMatchNumber(Number(e.target.value) || 1)}
                className="w-full p-2.5 border border-slate-200 dark:border-border rounded-xl text-xs bg-white dark:bg-muted/50 font-bold text-slate-700 dark:text-card-foreground outline-none focus:border-emerald-500 transition-all"
              />
            </div>

            {/* Row 5: Live Preview */}
            <div className="pt-3">
              <div className="bg-white dark:bg-muted border border-dashed border-emerald-300 dark:border-emerald-700 rounded-xl p-3 text-center">
                <p className="text-[9px] font-bold text-slate-400 dark:text-muted-foreground uppercase mb-1">Live Preview</p>
                <p className="text-sm font-black text-emerald-700 dark:text-emerald-400 tracking-wide">{buildPreview()}</p>
              </div>
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
