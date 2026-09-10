'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/registry';
import { adminGuard } from '@/lib/admin';

type Listing = {
  id: string;
  user_id: string;
  fowl_id: string | null;
  title: string;
  description: string;
  price: number;
  currency: string;
  breed: string;
  gender: string;
  age: string;
  weight: string;
  color: string;
  image_url: string;
  status: string;
  admin_notes: string;
  created_at: string;
  updated_at: string;
  seller_name: string;
  farm_name: string;
};

type Stats = { total: number; pending: number; approved: number; flagged: number };

export default function AdminMarketplacePage() {
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<Listing[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, approved: 0, flagged: 0 });
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [notesModal, setNotesModal] = useState<{ id: string; notes: string } | null>(null);

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3500);
  }, []);

  const loadListings = useCallback(async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) return;
      const res = await fetch('/api/admin/marketplace', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const { listings: data } = await res.json();
        setListings(data);
        setStats({
          total: data.length,
          pending: data.filter((l: Listing) => l.status === 'pending').length,
          approved: data.filter((l: Listing) => l.status === 'approved').length,
          flagged: data.filter((l: Listing) => l.status === 'flagged').length,
        });
      }
    } catch {
      showToast('error', 'Failed to load listings');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    adminGuard().then((p) => {
      if (!p) return;
      setAuthorized(true);
      loadListings();
    });
  }, [loadListings]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return listings.filter((l) => {
      if (q && !l.title.toLowerCase().includes(q) && !l.breed.toLowerCase().includes(q) && !l.seller_name.toLowerCase().includes(q) && !l.farm_name.toLowerCase().includes(q)) return false;
      if (filterStatus !== 'all' && l.status !== filterStatus) return false;
      return true;
    });
  }, [listings, search, filterStatus]);

  const handleModerate = async (id: string, status: string, admin_notes?: string) => {
    setActionId(id);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) return;
      const res = await fetch('/api/admin/marketplace', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, admin_notes }),
      });
      if (res.ok) {
        showToast('success', `Listing ${status}`);
        await loadListings();
      } else {
        showToast('error', 'Failed to update listing');
      }
    } catch {
      showToast('error', 'Network error');
    } finally {
      setActionId(null);
    }
  };

  if (!authorized || loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center gap-4 bg-background text-foreground">
        <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[11px] font-mono tracking-widest uppercase text-muted-foreground">Loading marketplace moderation...</p>
      </div>
    );
  }

  const statCard = (label: string, value: number, accent: string, icon: string) => (
    <div className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl p-4 sm:p-5 shadow-2xs">
      <div className="flex items-center justify-between">
        <p className={`text-2xl sm:text-3xl font-black ${accent}`}>{value}</p>
        <span className="text-xl opacity-60">{icon}</span>
      </div>
      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1">{label}</p>
    </div>
  );

  const statusBadge = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'pending': return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'flagged': return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      case 'removed': return 'bg-muted text-muted-foreground border-border';
      case 'sold': return 'bg-sky-500/15 text-sky-400 border-sky-500/30';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <div className="min-h-screen w-full bg-background relative overflow-hidden">
      <div className="absolute top-1/4 -left-20 w-72 h-72 bg-amber-400/5 dark:bg-amber-400/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-amber-400/5 dark:bg-amber-400/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 min-h-screen p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        {toast && (
          <div className={`mb-4 text-xs font-bold text-center p-3.5 rounded-xl border animate-fadeIn ${
            toast.type === 'success' ? 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30' : 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30'
          }`}>{toast.message}</div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-card-foreground tracking-tight leading-none">
              Marketplace <span className="text-amber-400">Moderation</span>
            </h1>
            <p className="text-[9px] font-mono text-muted-foreground font-bold tracking-widest uppercase mt-1">Review, approve, and manage marketplace listings</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4">
          {statCard('Total Listings', stats.total, 'text-amber-400', '📋')}
          {statCard('Pending Review', stats.pending, 'text-amber-400', '⏳')}
          {statCard('Approved', stats.approved, 'text-emerald-400', '✅')}
          {statCard('Flagged', stats.flagged, 'text-rose-400', '🚩')}
        </div>

        <div className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xs p-4 mb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">🔍</span>
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by title, breed, seller, or farm..." className="w-full pl-9 pr-4 py-2.5 border border-border rounded-xl text-xs bg-muted/25 focus:bg-card focus:border-amber-500 transition-all font-semibold outline-none text-card-foreground placeholder:text-muted-foreground/60" />
            </div>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2.5 border border-border rounded-xl text-[10px] font-bold bg-muted/25 focus:border-amber-500 transition-all outline-none text-card-foreground cursor-pointer">
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="flagged">Flagged</option>
              <option value="removed">Removed</option>
              <option value="sold">Sold</option>
            </select>
          </div>
        </div>

        {/* MOBILE CARDS */}
        <div className="md:hidden space-y-3 mb-6">
          {filtered.length === 0 && (
            <div className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl p-8 text-center">
              <p className="text-xs text-muted-foreground font-semibold">No listings found.</p>
            </div>
          )}
          {filtered.map((listing) => (
            <div key={listing.id} className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl p-4 shadow-2xs">
              <div className="flex items-center gap-3 mb-2">
                {listing.image_url ? (
                  <img src={listing.image_url} alt={listing.title} className="w-12 h-12 rounded-xl object-cover border border-border shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-muted/30 flex items-center justify-center text-xl shrink-0">
                    {listing.gender === 'Rooster' ? '🐓' : '🐔'}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-extrabold text-card-foreground truncate">{listing.title}</p>
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${statusBadge(listing.status)}`}>{listing.status}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{listing.breed} · ₱{listing.price.toLocaleString()}</p>
                </div>
              </div>
              <p className="text-[9px] text-muted-foreground mb-3">Seller: {listing.seller_name} · {listing.farm_name}</p>
              <div className="flex gap-2">
                {listing.status === 'pending' && (
                  <>
                    <button type="button" disabled={actionId === listing.id} onClick={() => handleModerate(listing.id, 'approved')} className="flex-1 text-[9px] font-black uppercase tracking-wider px-3 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25 transition-all cursor-pointer disabled:opacity-50">Approve</button>
                    <button type="button" disabled={actionId === listing.id} onClick={() => handleModerate(listing.id, 'flagged')} className="flex-1 text-[9px] font-black uppercase tracking-wider px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/40 text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer disabled:opacity-50">Flag</button>
                  </>
                )}
                {listing.status === 'approved' && (
                  <button type="button" disabled={actionId === listing.id} onClick={() => handleModerate(listing.id, 'removed')} className="flex-1 text-[9px] font-black uppercase tracking-wider px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/40 text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer disabled:opacity-50">Remove</button>
                )}
                {listing.status === 'flagged' && (
                  <>
                    <button type="button" disabled={actionId === listing.id} onClick={() => handleModerate(listing.id, 'approved')} className="flex-1 text-[9px] font-black uppercase tracking-wider px-3 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25 transition-all cursor-pointer disabled:opacity-50">Approve</button>
                    <button type="button" disabled={actionId === listing.id} onClick={() => handleModerate(listing.id, 'removed')} className="flex-1 text-[9px] font-black uppercase tracking-wider px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/40 text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer disabled:opacity-50">Remove</button>
                  </>
                )}
                <button type="button" onClick={() => setNotesModal({ id: listing.id, notes: listing.admin_notes })} className="text-[9px] font-black uppercase tracking-wider px-3 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-all cursor-pointer">Notes</button>
              </div>
            </div>
          ))}
        </div>

        {/* DESKTOP TABLE */}
        <div className="hidden md:block bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xs overflow-hidden">
          <div className="px-4 sm:px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-card-foreground">All Listings</h2>
            <span className="text-[9px] font-mono text-muted-foreground font-bold uppercase tracking-wider">{filtered.length} of {listings.length} records</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[900px]">
              <thead>
                <tr className="text-[9px] font-black text-muted-foreground uppercase tracking-widest border-b border-border bg-muted/30">
                  <th className="px-4 sm:px-5 py-3">Listing</th>
                  <th className="px-4 py-3">Breed / Gender</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Seller</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-10 text-center text-xs text-muted-foreground font-semibold">No listings found.</td></tr>
                )}
                {filtered.map((listing) => (
                  <tr key={listing.id} className="border-b border-border/60 last:border-0 hover:bg-muted/25 transition-colors">
                    <td className="px-4 sm:px-5 py-3.5">
                      <div className="flex items-center space-x-3">
                        {listing.image_url ? (
                          <img src={listing.image_url} alt={listing.title} className="w-9 h-9 rounded-xl object-cover border border-border shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-muted/30 flex items-center justify-center text-sm shrink-0">{listing.gender === 'Rooster' ? '🐓' : '🐔'}</div>
                        )}
                        <div>
                          <p className="text-xs font-extrabold text-card-foreground truncate">{listing.title}</p>
                          {listing.description && <p className="text-[9px] text-muted-foreground truncate max-w-[200px]">{listing.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-[11px] font-bold text-card-foreground">{listing.breed}</p>
                      <p className="text-[10px] text-muted-foreground">{listing.gender}</p>
                    </td>
                    <td className="px-4 py-3.5 text-sm font-black text-emerald-400">₱{listing.price.toLocaleString()}</td>
                    <td className="px-4 py-3.5">
                      <p className="text-[11px] font-bold text-card-foreground truncate">{listing.seller_name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{listing.farm_name}</p>
                    </td>
                    <td className="px-4 py-3.5"><span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${statusBadge(listing.status)}`}>{listing.status}</span></td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        {listing.status === 'pending' && (
                          <>
                            <button type="button" disabled={actionId === listing.id} onClick={() => handleModerate(listing.id, 'approved')} className="text-[9px] font-black uppercase tracking-wider px-3 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25 transition-all cursor-pointer disabled:opacity-50">Approve</button>
                            <button type="button" disabled={actionId === listing.id} onClick={() => handleModerate(listing.id, 'flagged')} className="text-[9px] font-black uppercase tracking-wider px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/40 text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer disabled:opacity-50">Flag</button>
                          </>
                        )}
                        {listing.status === 'approved' && (
                          <button type="button" disabled={actionId === listing.id} onClick={() => handleModerate(listing.id, 'removed')} className="text-[9px] font-black uppercase tracking-wider px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/40 text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer disabled:opacity-50">Remove</button>
                        )}
                        {listing.status === 'flagged' && (
                          <>
                            <button type="button" disabled={actionId === listing.id} onClick={() => handleModerate(listing.id, 'approved')} className="text-[9px] font-black uppercase tracking-wider px-3 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25 transition-all cursor-pointer disabled:opacity-50">Approve</button>
                            <button type="button" disabled={actionId === listing.id} onClick={() => handleModerate(listing.id, 'removed')} className="text-[9px] font-black uppercase tracking-wider px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/40 text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer disabled:opacity-50">Remove</button>
                          </>
                        )}
                        <button type="button" onClick={() => setNotesModal({ id: listing.id, notes: listing.admin_notes })} className="text-[9px] font-black uppercase tracking-wider px-3 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-all cursor-pointer">Notes</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* NOTES MODAL */}
        {notesModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setNotesModal(null)}>
            <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-fadeIn" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-sm font-black text-card-foreground">Admin Notes</h3>
              <textarea
                value={notesModal.notes}
                onChange={(e) => setNotesModal((prev) => prev ? { ...prev, notes: e.target.value } : null)}
                className="w-full p-3 border border-border rounded-xl text-xs bg-muted/25 focus:bg-card focus:border-amber-500 transition-all font-semibold outline-none text-card-foreground min-h-[100px] resize-y"
                placeholder="Add notes about this listing..."
                rows={4}
              />
              <div className="flex gap-2.5">
                <button type="button" onClick={() => setNotesModal(null)} className="flex-1 text-[11px] font-black uppercase tracking-wider py-3 rounded-xl border border-border text-muted-foreground hover:text-foreground transition-all cursor-pointer">Cancel</button>
                <button type="button" onClick={() => { handleModerate(notesModal.id, listings.find((l) => l.id === notesModal.id)?.status || 'pending', notesModal.notes); setNotesModal(null); }} className="flex-1 text-[11px] font-black uppercase tracking-wider py-3 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-300 hover:bg-amber-500/30 transition-all cursor-pointer">Save Notes</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
