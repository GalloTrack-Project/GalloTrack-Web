'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Play, Image as ImageIcon, Feather, Share2, Download, AlertTriangle } from 'lucide-react';
import { genderLabel } from '@/lib/helpers';
import { downloadMediaUrl, playableKind, videoFileNameFromUrl } from '@/lib/media-format';

type SharedMatch = {
  date: string;
  entry_name: string;
  breed: string;
  opponent: string;
  opponent_breed: string | null;
  opponent_bloodline: string | null;
  opponent_birthdate: string | null;
  opponent_photo_url: string | null;
  location: string;
  type: string;
  event_type: string | null;
  age_category: string | null;
  cock_count: number | null;
  outcome: string;
  post_fight_condition: string | null;
  side: string | null;
  notes: string | null;
};

type SharedFowl = {
  id: number;
  name: string;
  breed: string;
  gender: string;
  birthdate: string;
  color: string;
  image_url: string | null;
  status: string;
  sire: string;
  dam: string;
  sire_breed?: string | null;
  dam_breed?: string | null;
  wing_band: string | null;
  bird_code: string | null;
};

type SharePayload =
  | { type: 'match'; match: SharedMatch; videos: string[]; photos: string[] }
  | { type: 'fowl'; fowl: SharedFowl; photos: string[] };

const outcomeClass = (outcome: string) => {
  const o = (outcome || '').toLowerCase();
  if (o === 'win') return 'bg-emerald-500/10 text-emerald-700 border-emerald-200';
  if (o === 'loss') return 'bg-rose-500/10 text-rose-700 border-rose-200';
  return 'bg-amber-500/10 text-amber-700 border-amber-200';
};

/**
 * Player for one shared match video. AVI/MKV can never play in a browser and
 * this deployment has no converter; load failures (including MOV codec
 * mismatches) fall back to an explicit download offer instead of a broken box.
 */
function SharedVideo({ url, index }: { url: string; index: number }) {
  const [failed, setFailed] = useState(false);
  const kind = playableKind(url);

  if (kind === 'unsupported' || failed) {
    return (
      <div className="flex min-h-[150px] flex-col items-center justify-center gap-2 rounded-md border border-border bg-muted/40 p-4 text-center">
        <AlertTriangle size={18} className="text-warning" />
        <p className="text-xs font-bold text-muted-foreground">
          {kind === 'unsupported'
            ? 'This file format (AVI/MKV) can\u2019t be played in a browser.'
            : 'This video could not be loaded in your browser.'}
        </p>
        <button
          type="button"
          onClick={() => downloadMediaUrl(url, videoFileNameFromUrl(url))}
          className="inline-flex h-10 items-center gap-1.5 rounded-sm border border-border bg-card px-3 text-xs font-black text-foreground transition-colors hover:border-success/40 hover:text-success cursor-pointer"
        >
          <Download size={14} /> Download video {index + 1}
        </button>
      </div>
    );
  }

  return (
    <video
      src={url}
      controls
      preload="metadata"
      onError={() => setFailed(true)}
      className="w-full rounded-md border border-border bg-black"
    >
      <track kind="captions" srcLang="en" label="English" />
    </video>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 text-sm">
      <span className="font-black text-muted-foreground uppercase w-32 shrink-0 text-xs pt-0.5">{label}</span>
      <span className="font-bold text-foreground">{value}</span>
    </div>
  );
}

export default function SharePage() {
  const params = useParams<{ token: string }>();
  const token = params?.token || '';
  const [payload, setPayload] = useState<SharePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/share/${encodeURIComponent(token)}`);
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setError(body.error || 'This share link is no longer available.');
        } else {
          setPayload(body as SharePayload);
        }
      } catch {
        if (!cancelled) setError('Could not load this share link.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-background p-4 sm:p-8">
      <div className="max-w-3xl mx-auto space-y-5">
        <header className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-md bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
            <Share2 className="w-4.5 h-4.5 text-success" />
          </div>
          <div>
            <h1 className="text-lg font-black text-foreground tracking-tight">GalloTrack Shared Record</h1>
            <p className="text-xs font-semibold text-muted-foreground">View-only — no account needed</p>
          </div>
        </header>

        {loading && (
          <div className="rounded-lg border border-border bg-card p-8 text-center text-sm font-bold text-muted-foreground animate-pulse">
            Loading shared record...
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 p-6 text-center">
            <p className="text-sm font-black text-rose-700 dark:text-rose-300">{error}</p>
            <p className="text-xs font-semibold text-muted-foreground mt-1">Ask the sender for a fresh link.</p>
          </div>
        )}

        {payload?.type === 'match' && (
          <section className="rounded-lg border border-border bg-card p-5 sm:p-6 space-y-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
              <div className="flex items-center gap-2.5 min-w-0">
                <Feather className="w-5 h-5 text-success shrink-0" />
                <span className="font-black text-lg text-foreground truncate">{payload.match.entry_name}</span>
                <span className="font-black text-sm text-muted-foreground">vs</span>
                <span className="font-black text-lg text-foreground truncate">{payload.match.opponent}</span>
                {payload.match.opponent_photo_url && (
                  <img src={payload.match.opponent_photo_url} alt="Opponent" className="h-8 w-8 rounded-full border border-border object-cover shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase border ${outcomeClass(payload.match.outcome)}`}>
                  {payload.match.outcome}
                </span>
                <span className="text-xs font-mono font-bold text-muted-foreground">{payload.match.date}</span>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
              <Detail label="Our Breed" value={payload.match.breed} />
              <Detail label="Opponent Breed" value={payload.match.opponent_breed} />
              <Detail label="Opponent Bloodline" value={payload.match.opponent_bloodline} />
              <Detail label="Opponent Hatch" value={payload.match.opponent_birthdate} />
              <Detail label="Arena" value={payload.match.location} />
              <Detail label="Event" value={[payload.match.event_type, payload.match.type].filter(Boolean).join(' · ')} />
              <Detail label="Class" value={payload.match.age_category} />
              <Detail label="Condition" value={payload.match.post_fight_condition} />
              <Detail label="Color / Side" value={payload.match.side} />
              <Detail label="Notes" value={payload.match.notes} />
            </div>

            {payload.videos.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-xs font-black uppercase text-muted-foreground flex items-center gap-1.5"><Play className="w-3.5 h-3.5" /> Videos</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {payload.videos.map((url, idx) => (
                    <SharedVideo key={`${url}-${idx}`} url={url} index={idx} />
                  ))}
                </div>
              </div>
            )}

            {payload.photos.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-xs font-black uppercase text-muted-foreground flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5" /> Photos</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {payload.photos.map((url, idx) => (
                    <img key={idx} src={url} alt={`Match attachment ${idx + 1}`} className="w-full h-40 object-cover rounded-md border border-border" />
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {payload?.type === 'fowl' && (
          <section className="rounded-lg border border-border bg-card p-5 sm:p-6 space-y-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-4 border-b border-border pb-4">
              <div className="w-24 h-24 rounded-md border border-border overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                {payload.fowl.image_url ? (
                  <img src={payload.fowl.image_url} alt={payload.fowl.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-muted-foreground">NO PHOTO</span>
                )}
              </div>
              <div className="space-y-1.5">
                <h2 className="text-xl font-black text-foreground">{payload.fowl.name}</h2>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-200">{payload.fowl.breed}</span>
                  <span className="text-xs font-black uppercase px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">{genderLabel(payload.fowl.gender)}</span>
                  <span className="text-xs font-black uppercase px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">{payload.fowl.status}</span>
                  {payload.fowl.bird_code && (
                    <span className="text-xs font-mono font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-200">{payload.fowl.bird_code}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
              <Detail label="Hatch Date" value={payload.fowl.birthdate} />
              <Detail label="Color" value={payload.fowl.color} />
              <Detail label="Sire" value={payload.fowl.sire ? `${payload.fowl.sire}${payload.fowl.sire_breed ? ` (${payload.fowl.sire_breed})` : ''}` : null} />
              <Detail label="Dam" value={payload.fowl.dam ? `${payload.fowl.dam}${payload.fowl.dam_breed ? ` (${payload.fowl.dam_breed})` : ''}` : null} />
              <Detail label="Wing Band" value={payload.fowl.wing_band} />
            </div>

            {payload.photos.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-xs font-black uppercase text-muted-foreground flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5" /> Gallery</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {payload.photos.map((url, idx) => (
                    <img key={idx} src={url} alt={`${payload.type === 'fowl' ? payload.fowl.name : 'Chicken'} ${idx + 1}`} className="w-full h-40 object-cover rounded-md border border-border" />
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        <footer className="text-center text-xs font-semibold text-muted-foreground pb-6">
          Powered by GalloTrack
        </footer>
      </div>
    </main>
  );
}
