'use client';
import React, { useEffect, useState } from 'react';
import { PencilLine, Trash2, Upload } from 'lucide-react';
import { Modal } from '@/components/ui';
import { useUI } from '@/lib/contexts/ui-context';
import { useFowl } from '@/lib/contexts/fowl-context';
import { useRegistryOptions } from '@/lib/hooks/use-registry-options';
import { mergeOptions } from '@/lib/lifecycle';
import { updateMatch, uploadMatchVideo } from '@/lib/services/match-service';
import {
  fetchMatchVideoRows,
  fetchMatchPhotoRows,
  deleteMatchVideo,
  deleteMatchPhoto,
  insertMatchVideo,
  insertMatchPhoto,
  uploadMatchPhotoFile,
} from '@/lib/services/media-service';
import { toastMessage } from '@/lib/toast-bus';
import { signMediaUrls } from '@/lib/media-privacy';
import {
  MAX_MATCH_PHOTOS,
  MAX_MATCH_VIDEOS,
  captureVideoPoster,
  uploadKey,
  validatePhotoFile,
  validateVideoFile,
} from '@/lib/media-format';
import type { MatchRecord } from '@/lib/types';

type Fields = {
  date: string;
  entry_name: string;
  breed: string;
  opponent: string;
  opponent_breed: string;
  opponent_bloodline: string;
  opponent_birthdate: string;
  location: string;
  outcome: string;
  post_fight_condition: string;
  side: string;
  notes: string;
  type: string;
  event_type: string;
  cock_count: number;
  age_category: string;
};

const MAX_VIDEOS = MAX_MATCH_VIDEOS;
const MAX_PHOTOS = MAX_MATCH_PHOTOS;

export default function EditMatchModal() {
  const ui = useUI();
  const { editingMatch, setEditingMatch } = ui;
  if (!editingMatch) return null;
  return (
    <EditMatchInner
      key={editingMatch.id}
      match={editingMatch}
      onClose={() => setEditingMatch(null)}
    />
  );
}

function EditMatchInner({ match, onClose }: { match: MatchRecord; onClose: () => void }) {
  const { fowls, fetchDatabaseResources } = useFowl();
  const { rows } = useRegistryOptions();

  const [fields, setFields] = useState<Fields>(() => ({
    date: match.date || '',
    entry_name: match.entry_name || '',
    breed: match.breed || '',
    opponent: match.opponent || '',
    opponent_breed: match.opponent_breed || '',
    opponent_bloodline: match.opponent_bloodline || '',
    opponent_birthdate: match.opponent_birthdate || '',
    location: match.location || '',
    outcome: match.outcome || 'Win',
    post_fight_condition: match.post_fight_condition || '',
    side: match.side || '',
    notes: match.notes || '',
    type: match.type || 'Main Event',
    event_type: match.event_type || '',
    cock_count: match.cock_count || 1,
    age_category: match.age_category || 'Cock',
  }));
  const [videoRows, setVideoRows] = useState<{ id: number; url: string }[]>([]);
  const [photoRows, setPhotoRows] = useState<{ id: number; url: string }[]>([]);
  const [newVideos, setNewVideos] = useState<File[]>([]);
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchMatchVideoRows([match.id]), fetchMatchPhotoRows([match.id])]).then(async ([v, p]) => {
      if (cancelled) return;
      // Sign private-bucket URLs so the links/thumbnails below actually load.
      const [signedVideos, signedPhotos] = await Promise.all([
        signMediaUrls(v.map((r) => r.url)),
        signMediaUrls(p.map((r) => r.url)),
      ]);
      if (cancelled) return;
      setVideoRows(v.map((r, i) => ({ id: r.id, url: signedVideos[i] || r.url })));
      setPhotoRows(p.map((r, i) => ({ id: r.id, url: signedPhotos[i] || r.url })));
    });
    return () => { cancelled = true; };
  }, [match.id]);

  const set = <K extends keyof Fields>(key: K, value: Fields[K]) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  const matchTypeOptions = mergeOptions(rows, 'match_type', fields.type);
  const eventOptions = mergeOptions(rows, 'event_type', fields.event_type);
  const conditionOptions = mergeOptions(rows, 'post_match_condition', fields.post_fight_condition);

  const handleDeleteVideo = async (rowId: number) => {
    if (!window.confirm('Remove this video from the match? This cannot be undone.')) return;
    const result = await deleteMatchVideo(rowId);
    if (result.error) toastMessage(result.error, 'error');
    else setVideoRows((prev) => prev.filter((r) => r.id !== rowId));
  };

  const handleDeletePhoto = async (rowId: number) => {
    if (!window.confirm('Remove this photo from the match? This cannot be undone.')) return;
    const result = await deleteMatchPhoto(rowId);
    if (result.error) toastMessage(result.error, 'error');
    else setPhotoRows((prev) => prev.filter((r) => r.id !== rowId));
  };

  const handleVideoSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const accepted: File[] = [];
    for (const file of Array.from(files)) {
      const error = await validateVideoFile(file);
      if (error) toastMessage(error, 'error');
      else accepted.push(file);
    }
    if (accepted.length > 0) setNewVideos([...newVideos, ...accepted].slice(0, MAX_VIDEOS));
  };

  const handlePhotoSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const accepted: File[] = [];
    for (const file of Array.from(files)) {
      const error = await validatePhotoFile(file);
      if (error) toastMessage(error, 'error');
      else accepted.push(file);
    }
    if (accepted.length > 0) setNewPhotos([...newPhotos, ...accepted].slice(0, MAX_PHOTOS));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fields.entry_name.trim()) {
      toastMessage('Chicken entry name is required.', 'error');
      return;
    }
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        date: fields.date,
        entry_name: fields.entry_name.trim(),
        breed: fields.breed.trim(),
        opponent: fields.opponent.trim(),
        opponent_breed: fields.opponent_breed.trim(),
        opponent_bloodline: fields.opponent_bloodline.trim() || null,
        opponent_birthdate: fields.opponent_birthdate || null,
        location: fields.location.trim(),
        outcome: fields.outcome,
        post_fight_condition: fields.post_fight_condition,
        side: fields.side.trim() || null,
        notes: fields.notes.trim() || null,
        type: fields.type || 'Main Event',
        event_type: fields.event_type,
        cock_count: fields.cock_count,
        age_category: fields.age_category,
      };
      const result = await updateMatch(match.id, payload);
      if (result.error) throw new Error(result.error);

      const videoBudget = MAX_VIDEOS - videoRows.length;
      if (newVideos.length > videoBudget) {
        toastMessage(`Only ${videoBudget} more video slot(s) available — extras were skipped.`, 'warning');
      }
      let sortOrder = videoRows.length + 1;
      for (const file of newVideos.slice(0, Math.max(videoBudget, 0))) {
        const key = uploadKey('video', file);
        const up = await uploadMatchVideo(file, (pct) => setUploadProgress((prev) => ({ ...prev, [key]: pct })));
        if (up.error) throw new Error(up.error);
        if (up.url) {
          let posterUrl: string | null = null;
          try {
            const posterBlob = await captureVideoPoster(file);
            if (posterBlob) {
              const posterFile = new File(
                [posterBlob],
                `${file.name.replace(/\.[^.]+$/, '') || 'video'}-poster.jpg`,
                { type: 'image/jpeg' }
              );
              const posterUpload = await uploadMatchPhotoFile(posterFile);
              posterUrl = posterUpload.url || null;
            }
          } catch { /* poster is optional */ }
          const ins = await insertMatchVideo(match.id, up.url, sortOrder++, posterUrl);
          if (ins.error) console.warn('Match video save skipped:', ins.error);
        }
      }

      const photoBudget = MAX_PHOTOS - photoRows.length;
      if (newPhotos.length > photoBudget) {
        toastMessage(`Only ${photoBudget} more photo slot(s) available — extras were skipped.`, 'warning');
      }
      let photoOrder = photoRows.length + 1;
      for (const file of newPhotos.slice(0, Math.max(photoBudget, 0))) {
        const key = uploadKey('photo', file);
        const up = await uploadMatchPhotoFile(file, (pct) => setUploadProgress((prev) => ({ ...prev, [key]: pct })));
        if (up.error) throw new Error(up.error);
        if (up.url) {
          const ins = await insertMatchPhoto(match.id, up.url, photoOrder++);
          if (ins.error) console.warn('Match photo save skipped:', ins.error);
        }
      }

      await fetchDatabaseResources();
      toastMessage('Match record updated.', 'success');
      onClose();
    } catch (err) {
      toastMessage(err instanceof Error ? err.message : 'Failed to update match.', 'error');
    } finally {
      setBusy(false);
      setUploadProgress({});
    }
  };

  const inputClass = 'w-full p-2.5 border border-input-border rounded-md text-sm bg-white dark:bg-input text-foreground font-semibold focus:border-success focus:outline-none';
  const labelClass = 'block text-xs font-bold text-muted-foreground uppercase mb-1.5';

  return (
    <Modal
      open
      onClose={onClose}
      title="Edit Match Record"
      description={`${fields.entry_name} vs ${fields.opponent || 'Opponent'}`}
      icon={<PencilLine className="w-5 h-5" />}
      iconClassName="bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-success dark:text-emerald-400"
      className="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelClass} htmlFor="edit-match-date">Match Date</label>
            <input id="edit-match-date" type="date" value={fields.date} onChange={(e) => set('date', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="edit-match-entry">Our Chicken</label>
            <input id="edit-match-entry" list="edit-match-fowls" value={fields.entry_name} onChange={(e) => set('entry_name', e.target.value)} className={inputClass} required />
            <datalist id="edit-match-fowls">
              {fowls.filter((f) => f.status === 'Active').map((f) => (
                <option key={f.id} value={f.name} />
              ))}
            </datalist>
          </div>
          <div>
            <label className={labelClass} htmlFor="edit-match-breed">Our Breed</label>
            <input id="edit-match-breed" value={fields.breed} onChange={(e) => set('breed', e.target.value)} className={inputClass} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelClass} htmlFor="edit-match-opponent">Opponent</label>
            <input id="edit-match-opponent" value={fields.opponent} onChange={(e) => set('opponent', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="edit-match-opp-breed">Opponent Breed</label>
            <input id="edit-match-opp-breed" value={fields.opponent_breed} onChange={(e) => set('opponent_breed', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="edit-match-location">Arena Location</label>
            <input id="edit-match-location" value={fields.location} onChange={(e) => set('location', e.target.value)} className={inputClass} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelClass} htmlFor="edit-match-outcome">Result</label>
            <select id="edit-match-outcome" value={fields.outcome} onChange={(e) => set('outcome', e.target.value)} className={inputClass}>
              <option value="Win">Win</option>
              <option value="Loss">Loss</option>
              <option value="Draw">Draw</option>
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="edit-match-condition">Post-Fight Condition</label>
            <select id="edit-match-condition" value={fields.post_fight_condition} onChange={(e) => set('post_fight_condition', e.target.value)} className={inputClass}>
              {conditionOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label || o.value}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="edit-match-event">Event Type</label>
            <select id="edit-match-event" value={fields.event_type} onChange={(e) => set('event_type', e.target.value)} className={inputClass}>
              {eventOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label || o.value}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelClass} htmlFor="edit-match-cocks">Number of Cocks</label>
            <input id="edit-match-cocks" type="number" min={1} value={fields.cock_count} onChange={(e) => set('cock_count', Number(e.target.value) || 1)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="edit-match-class">Chicken Class</label>
            <select id="edit-match-class" value={fields.age_category} onChange={(e) => set('age_category', e.target.value)} className={inputClass}>
              <option value="Cock">Cock</option>
              <option value="Stag">Stag</option>
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="edit-match-notes">Notes</label>
            <input id="edit-match-notes" value={fields.notes} onChange={(e) => set('notes', e.target.value)} maxLength={300} className={inputClass} placeholder="e.g., slow starter" />
          </div>
        </div>

        {/* Media management */}
        <div className="rounded-md border border-border bg-muted/30 p-3 space-y-3">
          <div>
            <span className="text-xs font-bold text-muted-foreground uppercase">Videos ({videoRows.length + newVideos.length}/{MAX_VIDEOS})</span>
            <ul className="mt-1.5 space-y-1.5">
              {videoRows.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-2 rounded border border-border bg-card px-2.5 py-1.5 text-xs font-bold text-foreground">
                  <a href={row.url} target="_blank" rel="noopener noreferrer" className="truncate hover:text-success">Existing video</a>
                  <button type="button" onClick={() => handleDeleteVideo(row.id)} className="text-danger hover:underline shrink-0 cursor-pointer">Remove</button>
                </li>
              ))}
              {newVideos.map((file, idx) => {
                const pct = uploadProgress[uploadKey('video', file)];
                return (
                  <li key={`new-v-${idx}`} className="rounded border border-border bg-card px-2.5 py-1.5 text-xs font-bold text-foreground">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate">New: {file.name}{pct !== undefined ? ` — ${pct}%` : ''}</span>
                      <button type="button" disabled={pct !== undefined} onClick={() => setNewVideos(newVideos.filter((_, i) => i !== idx))} className="text-danger hover:underline shrink-0 cursor-pointer disabled:opacity-40">Remove</button>
                    </div>
                    {pct !== undefined && (
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Uploading ${file.name}`}>
                        <div className="h-full rounded-full bg-emerald-500 transition-all duration-200" style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            {videoRows.length + newVideos.length < MAX_VIDEOS && (
              <label className="mt-2 inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-success hover:underline">
                <Upload className="w-3.5 h-3.5" /> Add video
                <input type="file" accept="video/mp4,video/quicktime,video/x-msvideo,video/webm,video/x-matroska" multiple className="hidden" onChange={(e) => { void handleVideoSelect(e.target.files); e.target.value = ''; }} />
              </label>
            )}
          </div>

          <div>
            <span className="text-xs font-bold text-muted-foreground uppercase">Photos ({photoRows.length + newPhotos.length}/{MAX_PHOTOS})</span>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {photoRows.map((row) => (
                <div key={row.id} className="relative group">
                  <img src={row.url} alt="Match attachment" className="h-16 w-16 rounded border border-border object-cover" />
                  <button type="button" aria-label="Remove attachment" onClick={() => handleDeletePhoto(row.id)} className="absolute -right-1.5 -top-1.5 hidden h-5 w-5 items-center justify-center rounded-full bg-danger text-white group-hover:flex cursor-pointer">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {newPhotos.map((file, idx) => {
                const pct = uploadProgress[uploadKey('photo', file)];
                return (
                  <div key={`new-p-${idx}`} className="relative">
                    <img src={URL.createObjectURL(file)} alt="New attachment" className="h-16 w-16 rounded border border-dashed border-success object-cover" />
                    <button type="button" aria-label="Remove new attachment" disabled={pct !== undefined} onClick={() => setNewPhotos(newPhotos.filter((_, i) => i !== idx))} className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-white cursor-pointer disabled:opacity-40">
                      <Trash2 className="w-3 h-3" />
                    </button>
                    {pct !== undefined && (
                      <div className="absolute inset-x-0 bottom-0 h-1.5 overflow-hidden rounded-b bg-black/40" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Uploading ${file.name}`}>
                        <div className="h-full bg-emerald-500 transition-all duration-200" style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {photoRows.length + newPhotos.length < MAX_PHOTOS && (
              <label className="mt-2 inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-success hover:underline">
                <Upload className="w-3.5 h-3.5" /> Add photos
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { void handlePhotoSelect(e.target.files); e.target.value = ''; }} />
              </label>
            )}
          </div>
        </div>

        <div className="flex gap-2.5 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-muted hover:bg-muted/80 text-card-foreground font-semibold px-4 py-2.5 rounded-sm text-sm border border-border transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="flex-1 bg-success hover:bg-success/90 text-white font-semibold px-4 py-2.5 rounded-sm text-sm transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {busy && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            Save Changes
          </button>
        </div>
      </form>
    </Modal>
  );
}
