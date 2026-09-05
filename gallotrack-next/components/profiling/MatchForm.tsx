'use client';
import React from 'react';
import type { FowlRecord } from '@/lib/types';
import { POST_FIGHT_CONDITIONS } from '@/lib/helpers';

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
}: Props) {
  return (
    <form onSubmit={handleAddMatchRecord} className="antigravity-hover bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-5 animate-fadeIn">
      <h3 className="font-black text-xs text-emerald-700 uppercase tracking-wider flex items-center space-x-2 border-b pb-2.5 border-slate-100">
        <span>⚔️</span> <span>Record Fight Performance Log</span>
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Select Local Fowl Entry</label>
          <select value={selectedFowlForMatch} onChange={(e) => setSelectedFowlForMatch(e.target.value)} className="w-full p-3 border border-slate-200/90 rounded-xl text-xs bg-slate-50 font-extrabold text-slate-700 outline-none focus:border-emerald-500 cursor-pointer" required>
            <option value="">-- Select Fowl Node --</option>
            {fowls.filter(f => f.status === 'Active').map(f => (
              <option key={f.id} value={f.name}>{f.name} ({f.breed})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Match Date</label>
          <input type="date" value={matchDate} onChange={(e) => setMatchDate(e.target.value)} className="w-full p-3 border border-slate-300 rounded-xl text-xs bg-white text-neutral-900 font-semibold outline-none focus:border-emerald-500" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Opponent Entry Identity</label>
          <input type="text" value={opponentName} onChange={(e) => setOpponentName(e.target.value)} className="w-full p-3 border border-slate-300 rounded-xl text-xs bg-white text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-emerald-500 font-semibold" placeholder="e.g., Kelso Express" required />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Opponent Breed / Rasa</label>
          <input type="text" value={opponentBreed} onChange={(e) => setOpponentBreed(e.target.value)} className="w-full p-3 border border-slate-300 rounded-xl text-xs bg-white text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-emerald-500 font-semibold" placeholder="e.g., Kelso, Roundhead" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Arena Location Hub</label>
          <input
            list="arena-locations"
            value={matchLocation}
            onChange={(e) => setMatchLocation(e.target.value)}
            className="w-full p-3 border border-slate-300 rounded-xl text-xs bg-white text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all font-semibold"
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
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Match Type</label>
          <select value={matchType} onChange={(e) => setMatchType(e.target.value)} className="w-full p-3 border border-slate-200/90 rounded-xl text-xs bg-slate-50 font-bold text-slate-700 outline-none cursor-pointer focus:border-emerald-500 transition-all">
            <option value="Derby Match">Derby Match</option>
            <option value="Hack Match">Hack Match</option>
            <option value="2-Cock Derby">2-Cock Derby</option>
            <option value="3-Cock Derby">3-Cock Derby</option>
            <option value="4-Cock Derby">4-Cock Derby</option>
            <option value="5-Cock Derby">5-Cock Derby</option>
            <option value="Special Championship">Special Championship</option>
            <option value="Regional Circuit">Regional Circuit</option>
            <option value="Main Event / Solo">Main Event / Solo</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Fight Outcome</label>
          <select value={matchOutcome} onChange={(e) => setMatchOutcome(e.target.value)} className="w-full p-3 border border-amber-200/80 rounded-xl text-xs bg-amber-50 font-black text-amber-900 outline-none cursor-pointer">
            <option value="Win">🏆 WIN</option>
            <option value="Loss">💀 LOSS</option>
            <option value="Draw">🤝 DRAW</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">🩺 Post-Fight Condition / Health Status</label>
          <select value={matchPostFight} onChange={(e) => setMatchPostFight(e.target.value)} className="w-full p-3 border border-slate-200/90 rounded-xl text-xs bg-slate-50 font-bold text-slate-700 outline-none cursor-pointer focus:border-emerald-500 transition-all">
            {POST_FIGHT_CONDITIONS.map((c) => (
              <option key={c.value} value={c.value}>{c.icon} {c.value} — {c.desc}</option>
            ))}
          </select>
          <p className="mt-1.5 text-[9px] text-slate-400 font-semibold leading-relaxed">Drives the bloodline <strong className="text-slate-600">Survivability / Health Resilience</strong> score — a win that ends in death or critical injury lowers the cross&apos;s toughness rating even if the record shows a victory.</p>
        </div>
      </div>
      <div>
        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Video Evidence Upload</label>
        <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-slate-200 border-dashed rounded-2xl cursor-pointer bg-slate-50/80 hover:bg-slate-100/70 transition-all">
          <span className="text-xs text-slate-600 font-bold">🎥 {matchVideoFile ? matchVideoFile.name : 'Upload fight match recording (MP4, MOV, AVI)'}</span>
          <input type="file" accept="video/mp4,video/quicktime,video/x-msvideo" onChange={(e) => e.target.files && setMatchVideoFile(e.target.files[0])} className="hidden" />
        </label>
      </div>
      <button type="submit" disabled={loading || uploadingVideo} className="w-full bg-slate-900 text-white font-extrabold py-3.5 rounded-2xl text-xs shadow-md uppercase tracking-wider cursor-pointer transition-all duration-200 hover:bg-emerald-700 flex items-center justify-center space-x-2">
        {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
        <span>{loading ? 'Recording...' : 'RECORD MATCH'}</span>
      </button>
    </form>
  );
}
