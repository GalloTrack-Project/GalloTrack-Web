'use client';
import React, { useEffect, useCallback } from 'react';
import type { FowlRecord } from '@/lib/types';
import type { PartnerSuggestion } from '@/lib/services/match-options-service';
import { POST_FIGHT_CONDITIONS } from '@/lib/helpers';

const BET_TYPES = [
  { value: 'durbe', label: 'Durbe', desc: 'Double / Direct Bet', icon: '🎯' },
  { value: 'lusok', label: 'Lusok', desc: 'Inside / Direct Match', icon: '🔥' },
  { value: 'contra', label: 'Contra', desc: 'Opposing Bet', icon: '⚔️' },
  { value: 'bulsay', label: 'Bulsay', desc: 'Pocket / Alternative', icon: '💰' },
];

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
  matchOption: number;
  setMatchOption: (v: number) => void;
  betType: string;
  setBetType: (v: string) => void;
  targetNumber: number;
  setTargetNumber: (v: number) => void;
  partnerEntry: string;
  setPartnerEntry: (v: string) => void;
  suggestedPartners: PartnerSuggestion[];
  setSuggestedPartners: (v: PartnerSuggestion[]) => void;
  onFindPartners?: (targetNumber: number, betType: string) => void;
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
  matchOption, setMatchOption,
  betType, setBetType,
  targetNumber, setTargetNumber,
  partnerEntry, setPartnerEntry,
  suggestedPartners, setSuggestedPartners,
  onFindPartners,
}: Props) {
  const handleFindPartners = useCallback(() => {
    if (onFindPartners && targetNumber > 0) {
      onFindPartners(targetNumber, betType);
    }
  }, [onFindPartners, targetNumber, betType]);

  useEffect(() => {
    if (targetNumber > 0 && betType && onFindPartners) {
      const timer = setTimeout(() => onFindPartners(targetNumber, betType), 500);
      return () => clearTimeout(timer);
    }
  }, [targetNumber, betType, onFindPartners]);

  return (
    <form onSubmit={handleAddMatchRecord} className="antigravity-hover bg-white dark:bg-card p-6 rounded-3xl border border-slate-200/80 dark:border-border shadow-sm space-y-5 animate-fadeIn">
      <h3 className="font-black text-xs text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center space-x-2 border-b pb-2.5 border-slate-100 dark:border-border">
        <span>⚔️</span> <span>Record Fight Performance Log</span>
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 dark:text-muted-foreground uppercase mb-1.5">Select Local Fowl Entry</label>
          <select value={selectedFowlForMatch} onChange={(e) => setSelectedFowlForMatch(e.target.value)} className="w-full p-3 border border-slate-200/90 dark:border-border rounded-xl text-xs bg-slate-50 dark:bg-muted/50 font-extrabold text-slate-700 dark:text-card-foreground outline-none focus:border-emerald-500 cursor-pointer" required>
            <option value="">-- Select Fowl Node --</option>
            {fowls.filter(f => f.status === 'Active').map(f => (
              <option key={f.id} value={f.name}>{f.name} ({f.breed})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 dark:text-muted-foreground uppercase mb-1.5">Match Date</label>
          <input type="date" value={matchDate} onChange={(e) => setMatchDate(e.target.value)} className="w-full p-3 border border-slate-300 dark:border-border rounded-xl text-xs bg-white dark:bg-input text-neutral-900 dark:text-foreground font-semibold outline-none focus:border-emerald-500" />
        </div>
      </div>
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
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 dark:text-muted-foreground uppercase mb-1.5">Match Type</label>
          <select value={matchType} onChange={(e) => setMatchType(e.target.value)} className="w-full p-3 border border-slate-200/90 dark:border-border rounded-xl text-xs bg-slate-50 dark:bg-muted/50 font-bold text-slate-700 dark:text-card-foreground outline-none cursor-pointer focus:border-emerald-500 transition-all">
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
          <label className="block text-[10px] font-bold text-slate-500 dark:text-muted-foreground uppercase mb-1.5">Fight Outcome</label>
          <select value={matchOutcome} onChange={(e) => setMatchOutcome(e.target.value)} className="w-full p-3 border border-amber-200/80 rounded-xl text-xs bg-amber-50 font-black text-amber-900 outline-none cursor-pointer">
            <option value="Win">🏆 WIN</option>
            <option value="Loss">💀 LOSS</option>
            <option value="Draw">🤝 DRAW</option>
          </select>
        </div>
      </div>

      {/* BETTING / OPTIONS SECTION */}
      <div className="border-t border-slate-100 dark:border-border pt-5 space-y-4">
        <h4 className="font-black text-[10px] text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-2">
          🎯 Betting / Option Mechanics
        </h4>

        {/* Option Number (1-5) */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 dark:text-muted-foreground uppercase mb-2">Option Number</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((num) => {
              const isActive = matchOption === num;
              const isTransitionable = (matchOption === 1 || matchOption === 2) && (num === 3 || num === 4);
              return (
                <button
                  key={num}
                  type="button"
                  onClick={() => setMatchOption(num)}
                  className={`relative flex-1 py-2.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                    isActive
                      ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20'
                      : isTransitionable
                        ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-500/30 hover:bg-amber-100 dark:hover:bg-amber-500/20'
                        : 'bg-slate-50 dark:bg-muted/50 text-slate-600 dark:text-muted-foreground border-slate-200 dark:border-border hover:bg-slate-100 dark:hover:bg-muted'
                  }`}
                >
                  {num}
                  {isTransitionable && !isActive && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-400 rounded-full"></span>
                  )}
                </button>
              );
            })}
          </div>
          {(matchOption === 1 || matchOption === 2) && (
            <p className="mt-1.5 text-[9px] text-amber-600 dark:text-amber-400 font-semibold">
              💡 Options 1-2 can transition to option 3 or 4
            </p>
          )}
        </div>

        {/* Bet Type */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 dark:text-muted-foreground uppercase mb-2">Bet Type</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {BET_TYPES.map((bt) => (
              <button
                key={bt.value}
                type="button"
                onClick={() => setBetType(bt.value)}
                className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                  betType === bt.value
                    ? 'bg-emerald-500/10 border-emerald-500/40 ring-2 ring-emerald-500/20'
                    : 'bg-slate-50 dark:bg-muted/50 border-slate-200 dark:border-border hover:bg-slate-100 dark:hover:bg-muted'
                }`}
              >
                <span className="text-sm">{bt.icon}</span>
                <p className={`text-[10px] font-black mt-1 ${betType === bt.value ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-card-foreground'}`}>{bt.label}</p>
                <p className="text-[8px] text-slate-400 dark:text-muted-foreground font-semibold">{bt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Target Number */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-muted-foreground uppercase mb-1.5">Target Number (Roosters)</label>
            <input
              type="number"
              min={1}
              max={10}
              value={targetNumber}
              onChange={(e) => setTargetNumber(Number(e.target.value))}
              className="w-full p-3 border border-slate-300 dark:border-border rounded-xl text-xs bg-white dark:bg-input text-neutral-900 dark:text-foreground font-semibold outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-muted-foreground uppercase mb-1.5">Partner Entry</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={partnerEntry}
                onChange={(e) => setPartnerEntry(e.target.value)}
                className="flex-1 p-3 border border-slate-300 dark:border-border rounded-xl text-xs bg-white dark:bg-input text-neutral-900 dark:text-foreground placeholder:text-neutral-400 dark:placeholder:text-muted-foreground font-semibold outline-none focus:border-emerald-500"
                placeholder="Auto-filled or manual"
              />
              <button
                type="button"
                onClick={handleFindPartners}
                className="px-4 py-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 rounded-xl text-[10px] font-black hover:bg-emerald-500/20 transition-all cursor-pointer whitespace-nowrap"
              >
                Find
              </button>
            </div>
          </div>
        </div>

        {/* Suggested Partners */}
        {suggestedPartners.length > 0 && (
          <div className="bg-emerald-50/50 dark:bg-emerald-500/5 border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-3">
            <p className="text-[9px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-2">Suggested Partners</p>
            <div className="space-y-1.5">
              {suggestedPartners.map((p) => (
                <button
                  key={p.user_id}
                  type="button"
                  onClick={() => setPartnerEntry(`${p.full_name} — ${p.fowl_entry}`)}
                  className="w-full flex items-center justify-between p-2 rounded-lg bg-white dark:bg-card border border-emerald-100 dark:border-emerald-500/20 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all cursor-pointer text-left"
                >
                  <div>
                    <p className="text-[10px] font-bold text-slate-800 dark:text-card-foreground">{p.full_name}</p>
                    <p className="text-[8px] text-slate-400 dark:text-muted-foreground">{p.farm_name} · {p.fowl_entry}</p>
                  </div>
                  <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/15 px-2 py-0.5 rounded-full">SELECT</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-[10px] font-bold text-slate-500 dark:text-muted-foreground uppercase mb-1.5">🩺 Post-Fight Condition / Health Status</label>
          <select value={matchPostFight} onChange={(e) => setMatchPostFight(e.target.value)} className="w-full p-3 border border-slate-200/90 dark:border-border rounded-xl text-xs bg-slate-50 dark:bg-muted/50 font-bold text-slate-700 dark:text-card-foreground outline-none cursor-pointer focus:border-emerald-500 transition-all">
            {POST_FIGHT_CONDITIONS.map((c) => (
              <option key={c.value} value={c.value}>{c.icon} {c.value} — {c.desc}</option>
            ))}
          </select>
          <p className="mt-1.5 text-[9px] text-slate-400 dark:text-muted-foreground font-semibold leading-relaxed">Drives the bloodline <strong className="text-slate-600 dark:text-muted-foreground">Survivability / Health Resilience</strong> score — a win that ends in death or critical injury lowers the cross&apos;s toughness rating even if the record shows a victory.</p>
        </div>
      </div>
      <div>
        <label className="block text-[10px] font-bold text-slate-500 dark:text-muted-foreground uppercase mb-1.5 tracking-wider">Video Evidence Upload</label>
        <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-slate-200 dark:border-border border-dashed rounded-2xl cursor-pointer bg-slate-50/80 dark:bg-muted/50 hover:bg-slate-100/70 transition-all">
          <span className="text-xs text-slate-600 dark:text-muted-foreground font-bold">🎥 {matchVideoFile ? matchVideoFile.name : 'Upload fight match recording (MP4, MOV, AVI)'}</span>
          <input type="file" accept="video/mp4,video/quicktime,video/x-msvideo" onChange={(e) => e.target.files && setMatchVideoFile(e.target.files[0])} className="hidden" />
        </label>
      </div>
      <button type="submit" disabled={loading || uploadingVideo} className="w-full bg-slate-900 dark:bg-emerald-600 text-white font-extrabold py-3.5 rounded-2xl text-xs shadow-md uppercase tracking-wider cursor-pointer transition-all duration-200 hover:bg-emerald-700 dark:hover:bg-emerald-500 flex items-center justify-center space-x-2">
        {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
        <span>{loading ? 'Recording...' : 'RECORD MATCH'}</span>
      </button>
    </form>
  );
}
