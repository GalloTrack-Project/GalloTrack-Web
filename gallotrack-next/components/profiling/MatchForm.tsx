'use client';
import React, { useState } from 'react';
import type { FowlRecord } from '@/lib/types';
import { isMale } from '@/lib/helpers';
import { mergeOptions } from '@/lib/lifecycle';
import { useRegistryOptions } from '@/lib/hooks/use-registry-options';
import { useUserSettings } from '@/lib/hooks/use-user-settings';

function SelectChevron() {
  return (
    <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2">
      <div className="h-[7px] w-[7px] border-r-[1.7px] border-b-[1.7px] border-muted-foreground rotate-45 -translate-y-[2px]" />
    </div>
  );
}

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
  opponentBloodline: string;
  setOpponentBloodline: (v: string) => void;
  opponentHatch: string;
  setOpponentHatch: (v: string) => void;
  opponentPhoto: File | null;
  setOpponentPhoto: (f: File | null) => void;
  matchLocation: string;
  setMatchLocation: (v: string) => void;
  matchOutcome: string;
  setMatchOutcome: (v: string) => void;
  matchPostFight: string;
  setMatchPostFight: (v: string) => void;
  matchVideoFiles: File[];
  setMatchVideoFiles: (f: File[]) => void;
  matchPhotoFiles: File[];
  setMatchPhotoFiles: (f: File[]) => void;
  handleAddMatchRecord: (e: React.FormEvent) => void;
  cockCount: number;
  setCockCount: (v: number) => void;
  ageCategory: string;
  setAgeCategory: (v: string) => void;
  eventType: string;
  setEventType: (v: string) => void;
  matchType: string;
  setMatchType: (v: string) => void;
  matchSide: string;
  setMatchSide: (v: string) => void;
  matchNotes: string;
  setMatchNotes: (v: string) => void;
};

export default function MatchForm({
  fowls,
  loading,
  uploadingVideo,
  selectedFowlForMatch, setSelectedFowlForMatch,
  matchDate, setMatchDate,
  opponentName, setOpponentName,
  opponentBreed, setOpponentBreed,
  opponentBloodline, setOpponentBloodline,
  opponentHatch, setOpponentHatch,
  opponentPhoto, setOpponentPhoto,
  matchLocation, setMatchLocation,
  matchOutcome, setMatchOutcome,
  matchPostFight, setMatchPostFight,
  matchVideoFiles, setMatchVideoFiles,
  matchPhotoFiles, setMatchPhotoFiles,
  handleAddMatchRecord,
  cockCount, setCockCount,
  ageCategory, setAgeCategory,
  eventType, setEventType,
  matchType, setMatchType,
  matchSide, setMatchSide,
  matchNotes, setMatchNotes,
}: Props) {
  const { rows } = useRegistryOptions();
  const settings = useUserSettings();

  const [customEventType, setCustomEventType] = useState('');

  const eventOptions = mergeOptions(rows, 'event_type', eventType || 'Derby');
  const eventValues = eventOptions.map((o) => o.value);

  const eventTypeIsCustom = eventType === '__custom__' || !eventValues.includes(eventType);
  const eventTypeSelectValue = eventValues.includes(eventType) ? eventType : '__custom__';
  const effectiveEventType = eventType === '__custom__' ? customEventType : eventType;
  const customEventTypeEmpty = eventTypeIsCustom && !effectiveEventType.trim();

  const matchTypeOptions = mergeOptions(rows, 'match_type', matchType);
  const conditionOptions = mergeOptions(rows, 'post_match_condition', matchPostFight);
  const locationOptions = mergeOptions(rows, 'location', matchLocation);

  const buildPreview = () => {
    const cockText = cockCount > 0 ? `${cockCount} cocks` : '0 cocks';
    const eventLabel = effectiveEventType || 'Event Type';
    const typeLabel = matchType || 'Match Type';
    return `${eventLabel} · ${typeLabel} · ${cockText} · ${ageCategory}`;
  };

  const selectClass = "match-field h-10 w-full cursor-pointer rounded-md border border-input-border bg-white dark:bg-input px-3 pr-10 text-sm font-semibold text-foreground transition-colors duration-150 focus:border-success focus:shadow-[0_0_0_3px_rgba(19,169,131,.12)]";
  const inputClass = "match-field h-10 min-w-0 flex-1 rounded-md border border-input-border bg-white dark:bg-input px-3 text-sm font-semibold text-foreground placeholder:text-muted-foreground dark:placeholder:text-muted-foreground transition-colors duration-150 focus:border-success focus:shadow-[0_0_0_3px_rgba(19,169,131,.12)]";

  return (
    <form onSubmit={handleAddMatchRecord} className="antigravity-hover bg-white dark:bg-card p-6 rounded-lg border border-slate-200/80 dark:border-border shadow-sm space-y-5 animate-fadeIn">
      <h3 className="font-black text-sm text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center space-x-2 border-b pb-2.5 border-slate-100 dark:border-border">
        <span>&#9876;&#65039;</span> <span>Record Fight Performance Log</span>
      </h3>

      {/* Row 1: Fowl + Date */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5" htmlFor="select-local-chicken-entry">Select Local Chicken Entry</label>
          <select value={selectedFowlForMatch} onChange={(e) => setSelectedFowlForMatch(e.target.value)} className="w-full p-3 border border-input-border rounded-md text-sm bg-slate-50 dark:bg-muted/50 font-extrabold text-slate-700 dark:text-card-foreground focus:border-emerald-500 cursor-pointer" required id="select-local-chicken-entry">
            <option value="">-- Select Chicken Node --</option>
            {fowls.filter(f => f.status === 'Active' && isMale(f.gender)).map(f => (
              <option key={f.id} value={f.name}>{f.name} ({f.breed})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5" htmlFor="match-date">Match Date</label>
          <input type="date" value={matchDate} onChange={(e) => setMatchDate(e.target.value)} className="w-full p-3 border border-input-border rounded-md text-sm bg-white dark:bg-input text-neutral-900 dark:text-foreground font-semibold focus:border-emerald-500" id="match-date" />
        </div>
      </div>

      {/* Row 2: Opponent + Breed + Location */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5" htmlFor="opponent-entry-identity">Opponent Entry Identity</label>
          <input type="text" value={opponentName} onChange={(e) => setOpponentName(e.target.value)} className="w-full p-3 border border-input-border rounded-md text-sm bg-white dark:bg-input text-neutral-900 dark:text-foreground placeholder:text-muted-foreground dark:placeholder:text-muted-foreground focus:border-emerald-500 font-semibold" placeholder="e.g., Kelso Express" required id="opponent-entry-identity" />
        </div>
        <div>
          <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5" htmlFor="opponent-breed-rasa">Opponent Breed / Rasa</label>
          <input type="text" value={opponentBreed} onChange={(e) => setOpponentBreed(e.target.value)} className="w-full p-3 border border-input-border rounded-md text-sm bg-white dark:bg-input text-neutral-900 dark:text-foreground placeholder:text-muted-foreground dark:placeholder:text-muted-foreground focus:border-emerald-500 font-semibold" placeholder="e.g., Kelso, Roundhead" id="opponent-breed-rasa" />
        </div>
        <div>
          <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5" htmlFor="arena-location-hub">Arena Location Hub {settings.match_location_required && <span className="text-danger">*</span>}</label>
          <input
            list="arena-locations"
            value={matchLocation}
            onChange={(e) => setMatchLocation(e.target.value)}
            className="w-full p-3 border border-input-border rounded-md text-sm bg-white dark:bg-input text-neutral-900 dark:text-foreground placeholder:text-muted-foreground dark:placeholder:text-muted-foreground focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all font-semibold"
            placeholder={settings.match_location_required ? 'Select or type arena...' : 'Select or type arena (optional)...'}
            required={settings.match_location_required}
          id="arena-location-hub" />
          <datalist id="arena-locations">
            {locationOptions.map((o) => (
              <option key={o.value} value={o.value} />
            ))}
          </datalist>
        </div>
      </div>

      {/* Row 2b: Opponent bloodline + hatch + photo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5" htmlFor="opponent-bloodline">Opponent Bloodline</label>
          <input type="text" value={opponentBloodline} onChange={(e) => setOpponentBloodline(e.target.value)} className="w-full p-3 border border-input-border rounded-md text-sm bg-white dark:bg-input text-neutral-900 dark:text-foreground placeholder:text-muted-foreground dark:placeholder:text-muted-foreground focus:border-emerald-500 font-semibold" placeholder="e.g., Harold Brown" id="opponent-bloodline" />
        </div>
        <div>
          <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5" htmlFor="opponent-hatch">Opponent Hatch Date</label>
          <input type="date" value={opponentHatch} onChange={(e) => setOpponentHatch(e.target.value)} className="w-full p-3 border border-input-border rounded-md text-sm bg-white dark:bg-input text-neutral-900 dark:text-foreground font-semibold focus:border-emerald-500" id="opponent-hatch" />
        </div>
        <div>
          <span className="block text-xs font-bold text-muted-foreground uppercase mb-1.5">Opponent Photo</span>
          <label className="flex items-center justify-between w-full h-[46px] px-3 border-2 border-slate-200 dark:border-border border-dashed rounded-lg cursor-pointer bg-slate-50/80 dark:bg-muted/50 hover:bg-slate-100/70 transition-all">
            <span className="text-xs text-slate-600 dark:text-muted-foreground font-bold truncate pr-2">{opponentPhoto ? opponentPhoto.name : 'Attach photo (optional)'}</span>
            <input type="file" accept="image/*" onChange={(e) => setOpponentPhoto(e.target.files?.[0] || null)} className="hidden" />
          </label>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MATCH CONFIGURATION — event type and match type are separate   */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="rounded-lg border border-slate-200 dark:border-border bg-white dark:bg-card p-4 sm:p-5 shadow-sm">

        {/* Header */}
        <div className="mb-6">
                <h2 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.02em] text-foreground sm:text-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  Match Configuration
                </h2>
        </div>

        {/* Row 1: Number of Cocks + Chicken Class */}
        <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="mb-2.5 block text-xs font-bold uppercase tracking-[.02em] text-success" htmlFor="number-of-cocks">Number of Cocks</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={99}
                value={cockCount || ''}
                onChange={(e) => setCockCount(Number(e.target.value) || 0)}
                placeholder="Enter number"
                className={`${inputClass} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
              id="number-of-cocks" />
              <span className="rounded-md bg-muted px-4 py-3 text-xs font-bold text-muted-foreground">cocks</span>
            </div>
          </div>
          <div>
            <label className="mb-2.5 block text-xs font-bold uppercase tracking-[.02em] text-success" htmlFor="chicken-class">Chicken Class</label>
            <div className="relative">
              <select value={ageCategory} onChange={(e) => setAgeCategory(e.target.value)} className={selectClass} id="chicken-class">
                <option value="Cock">Cock</option>
                <option value="Stag">Stag</option>
              </select>
              <SelectChevron />
            </div>
          </div>
        </div>

        {/* Row 2: Event Type + Match Type — event type may be "Others" free text */}
        <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="mb-2.5 block text-xs font-bold uppercase tracking-[.02em] text-success" htmlFor="event-type">Event Type</label>
            <div className="relative">
              <select value={eventTypeSelectValue} onChange={(e) => setEventType(e.target.value)} className={selectClass} id="event-type">
                {eventOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label || o.value}</option>
                ))}
                <option value="__custom__">Others (Add Custom)</option>
              </select>
              <SelectChevron />
            </div>
            {eventTypeIsCustom && (
              <input
                type="text"
                value={eventType === '__custom__' ? customEventType : eventType}
                onChange={(e) => {
                  const v = e.target.value;
                  setCustomEventType(v);
                  setEventType(v || '__custom__');
                }}
                placeholder="Type your custom event type..."
                maxLength={50}
                className={`${selectClass} mt-2`}
              />
            )}
            {customEventTypeEmpty && (
              <p className="mt-1 text-xs font-semibold text-danger">Enter a custom event type or pick a preset.</p>
            )}
          </div>
          <div>
            <label className="mb-2.5 block text-xs font-bold uppercase tracking-[.02em] text-success" htmlFor="match-type">Match Type</label>
            <div className="relative">
              <select value={matchType} onChange={(e) => setMatchType(e.target.value)} className={selectClass} id="match-type">
                {matchTypeOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label || o.value}</option>
                ))}
              </select>
              <SelectChevron />
            </div>
          </div>
        </div>

        {/* Row 3: Color / Side + Notes */}
        <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="mb-2.5 block text-xs font-bold uppercase tracking-[.02em] text-success" htmlFor="match-side">Color / Side of Entry</label>
            <input
              type="text"
              value={matchSide}
              onChange={(e) => setMatchSide(e.target.value)}
              placeholder="e.g., Red feather, left side"
              maxLength={100}
              className={inputClass}
              id="match-side"
            />
          </div>
          <div>
            <label className="mb-2.5 block text-xs font-bold uppercase tracking-[.02em] text-success" htmlFor="match-notes">Notes</label>
            <input
              type="text"
              value={matchNotes}
              onChange={(e) => setMatchNotes(e.target.value)}
              placeholder="e.g., slow starter, strong finish"
              maxLength={300}
              className={inputClass}
              id="match-notes"
            />
          </div>
        </div>

        {/* Live Preview — only show when cock count is set */}
        {cockCount > 0 && (
          <div className="mt-4 rounded-md bg-success/5 dark:bg-success/10 border border-success/20 dark:border-success/30 p-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-[.02em] text-success">Live Preview</span>
            </div>
            <p className="text-sm font-extrabold tracking-[-.02em] text-foreground">{buildPreview()}</p>
          </div>
        )}

      </div>

      {/* Fight Outcome */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5" htmlFor="fight-outcome">Fight Outcome</label>
          <select value={matchOutcome} onChange={(e) => setMatchOutcome(e.target.value)} className="w-full p-3 border border-amber-200/80 rounded-md text-sm bg-amber-50 dark:bg-amber-950/50 font-black text-amber-900 cursor-pointer" id="fight-outcome">
            <option value="Win">WIN</option>
            <option value="Loss">LOSS</option>
            <option value="Draw">DRAW</option>
          </select>
        </div>
      </div>

      {/* Post-Fight Condition */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5" htmlFor="post-fight-condition-health-">Post-Fight Condition / Health Status</label>
          <select value={matchPostFight} onChange={(e) => setMatchPostFight(e.target.value)} className="w-full p-3 border border-input-border rounded-md text-sm bg-slate-50 dark:bg-muted/50 font-bold text-slate-700 dark:text-card-foreground cursor-pointer focus:border-emerald-500 transition-all" id="post-fight-condition-health-">
            {conditionOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label || o.value}</option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-muted-foreground font-semibold leading-relaxed">Record the condition exactly as observed — <strong className="text-slate-600 dark:text-muted-foreground">it never changes the chicken&apos;s status automatically.</strong> Status updates (Recovery, Retired, Deceased) are always applied deliberately from the chicken&apos;s profile.</p>
        </div>
      </div>

      {/* Video Upload — up to 3 */}
      <div>
        <span className="block text-xs font-bold text-muted-foreground uppercase mb-1.5 tracking-wider">Video Evidence Upload (up to 3)</span>
        <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-slate-200 dark:border-border border-dashed rounded-lg cursor-pointer bg-slate-50/80 dark:bg-muted/50 hover:bg-slate-100/70 transition-all" htmlFor="field">
          <span className="text-sm text-slate-600 dark:text-muted-foreground font-bold">{matchVideoFiles.length >= 3 ? 'Maximum 3 videos attached' : 'Add fight match recording (MP4, MOV, AVI)'}</span>
          <input type="file" accept="video/mp4,video/quicktime,video/x-msvideo" multiple disabled={matchVideoFiles.length >= 3} onChange={(e) => { if (e.target.files) setMatchVideoFiles([...matchVideoFiles, ...Array.from(e.target.files)].slice(0, 3)); e.target.value = ''; }} className="hidden" id="field" />
        </label>
        {matchVideoFiles.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {matchVideoFiles.map((file, idx) => (
              <li key={`${file.name}-${idx}`} className="flex items-center justify-between rounded-md border border-input-border bg-slate-50 dark:bg-muted/50 px-3 py-2 text-xs font-bold text-foreground">
                <span className="truncate pr-2">Video {idx + 1}: {file.name}</span>
                <button type="button" onClick={() => setMatchVideoFiles(matchVideoFiles.filter((_, i) => i !== idx))} className="text-danger hover:underline shrink-0 cursor-pointer">Remove</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Match Photos */}
      <div>
        <span className="block text-xs font-bold text-muted-foreground uppercase mb-1.5 tracking-wider">Match Photos (up to 6)</span>
        <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-slate-200 dark:border-border border-dashed rounded-lg cursor-pointer bg-slate-50/80 dark:bg-muted/50 hover:bg-slate-100/70 transition-all" htmlFor="match-photos-field">
          <span className="text-sm text-slate-600 dark:text-muted-foreground font-bold">{matchPhotoFiles.length >= 6 ? 'Maximum 6 photos attached' : 'Attach photos of this match'}</span>
          <input type="file" accept="image/*" multiple disabled={matchPhotoFiles.length >= 6} onChange={(e) => { if (e.target.files) setMatchPhotoFiles([...matchPhotoFiles, ...Array.from(e.target.files)].slice(0, 6)); e.target.value = ''; }} className="hidden" id="match-photos-field" />
        </label>
        {matchPhotoFiles.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {matchPhotoFiles.map((file, idx) => (
              <li key={`${file.name}-${idx}`} className="flex items-center justify-between rounded-md border border-input-border bg-slate-50 dark:bg-muted/50 px-3 py-2 text-xs font-bold text-foreground">
                <span className="truncate pr-2">Photo {idx + 1}: {file.name}</span>
                <button type="button" onClick={() => setMatchPhotoFiles(matchPhotoFiles.filter((_, i) => i !== idx))} className="text-danger hover:underline shrink-0 cursor-pointer">Remove</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Submit */}
      <button type="submit" disabled={loading || uploadingVideo || customEventTypeEmpty} className="w-full bg-slate-900 dark:bg-emerald-600 text-white font-extrabold py-3.5 rounded-lg text-sm shadow-md uppercase tracking-wider cursor-pointer transition-all duration-200 hover:bg-emerald-700 dark:hover:bg-emerald-500 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed">
        {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
        <span>{loading ? 'Recording...' : 'RECORD MATCH'}</span>
      </button>
    </form>
  );
}
