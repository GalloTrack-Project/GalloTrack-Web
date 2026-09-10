'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/registry';
import { useFowl } from '@/lib/contexts/fowl-context';

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
  seller_contact: string;
};

type FormData = {
  title: string;
  description: string;
  price: string;
  breed: string;
  gender: string;
  age: string;
  weight: string;
  color: string;
  image_url: string;
  fowl_id: string;
};

const emptyForm: FormData = {
  title: '', description: '', price: '', breed: '', gender: 'Rooster',
  age: '', weight: '', color: '', image_url: '', fowl_id: '',
};

export default function MarketplacePage() {
  const { fowls } = useFowl();
  const [listings, setListings] = useState<Listing[]>([]);
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'browse' | 'my' | 'create'>('browse');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<FormData>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>('');

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3500);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const uid = sessionData?.session?.user?.id;
      if (!token) return;
      if (uid) setUserId(uid);

      const [approvedRes, myRes] = await Promise.all([
        fetch('/api/marketplace', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/marketplace', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (approvedRes.ok) {
        const { listings: data } = await approvedRes.json();
        setListings(data);
      }
      if (myRes.ok) {
        const { listings: data } = await myRes.json();
        setMyListings(data.filter((l: Listing) => l.user_id === uid));
      }
    } catch {
      showToast('error', 'Failed to load marketplace data');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredListings = useMemo(() => {
    const q = search.toLowerCase();
    return listings.filter((l) => {
      if (q && !l.title.toLowerCase().includes(q) && !l.breed.toLowerCase().includes(q) && !l.seller_name.toLowerCase().includes(q) && !l.farm_name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [listings, search]);

  const filteredMyListings = useMemo(() => {
    const q = search.toLowerCase();
    return myListings.filter((l) => {
      if (q && !l.title.toLowerCase().includes(q) && !l.breed.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [myListings, search]);

  const handleSelectFowl = (fowlId: string) => {
    const fowl = fowls.find((f) => String(f.id) === fowlId);
    if (!fowl) return;
    setForm((prev) => ({
      ...prev,
      fowl_id: fowlId,
      title: fowl.name,
      breed: fowl.breed,
      gender: fowl.gender === 'Male' ? 'Rooster' : 'Hen',
      age: fowl.age || '',
      weight: fowl.weight || '',
      color: fowl.color || '',
      image_url: fowl.image_url || '',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.breed.trim() || !form.price) {
      showToast('error', 'Please fill in title, breed, and price');
      return;
    }
    setSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) return;

      const url = editingId ? `/api/marketplace/${editingId}` : '/api/marketplace';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          price: Number(form.price),
        }),
      });

      if (res.ok) {
        showToast('success', editingId ? 'Listing updated!' : 'Listing created! Pending admin approval.');
        setForm(emptyForm);
        setEditingId(null);
        setActiveTab('my');
        await loadData();
      } else {
        const data = await res.json();
        showToast('error', data.error || 'Failed to save listing');
      }
    } catch {
      showToast('error', 'Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (listing: Listing) => {
    setForm({
      title: listing.title,
      description: listing.description,
      price: String(listing.price),
      breed: listing.breed,
      gender: listing.gender,
      age: listing.age,
      weight: listing.weight,
      color: listing.color,
      image_url: listing.image_url,
      fowl_id: listing.fowl_id || '',
    });
    setEditingId(listing.id);
    setActiveTab('create');
  };

  const handleDelete = async (id: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) return;

      const res = await fetch(`/api/marketplace/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        showToast('success', 'Listing deleted');
        setDeleteConfirm(null);
        await loadData();
      } else {
        showToast('error', 'Failed to delete listing');
      }
    } catch {
      showToast('error', 'Network error');
    }
  };

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

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center gap-4 bg-background text-foreground">
        <div className="w-10 h-10 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[11px] font-mono tracking-widest uppercase text-muted-foreground">Loading marketplace...</p>
      </div>
    );
  }

  const inputClass = 'w-full p-3 border border-border rounded-xl text-xs bg-muted/25 focus:bg-card focus:border-emerald-500 transition-all font-semibold outline-none text-card-foreground';
  const labelClass = 'block text-[10px] font-black text-muted-foreground mt-2 uppercase tracking-widest';

  return (
    <div className="space-y-6 animate-fadeIn">
      {toast && (
        <div className={`fixed top-5 right-5 z-[9999] text-xs font-bold p-4 rounded-xl border shadow-2xl backdrop-blur-xl animate-fadeIn ${
          toast.type === 'success' ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30' : 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30'
        }`}>{toast.message}</div>
      )}

      {/* HEADER */}
      <div className="rounded-3xl border border-border bg-card/70 backdrop-blur-md p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-xl shrink-0 shadow-inner">🥚</div>
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-card-foreground tracking-tight">Marketplace</h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-semibold mt-1">Buy and sell gamefowl within the GalloTrack community</p>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-2 p-1 bg-muted/30 rounded-xl w-fit">
        {[
          { id: 'browse' as const, label: 'Browse', icon: '🔍' },
          { id: 'my' as const, label: 'My Listings', icon: '📋' },
          { id: 'create' as const, label: editingId ? 'Edit Listing' : 'Create Listing', icon: editingId ? '✏️' : '➕' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => { setActiveTab(tab.id); if (tab.id !== 'create') { setEditingId(null); setForm(emptyForm); } }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
              activeTab === tab.id ? 'bg-card shadow-sm text-card-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* BROWSE TAB */}
      {activeTab === 'browse' && (
        <div className="space-y-4">
          <div className="relative max-w-md">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, breed, seller, or farm..."
              className={`${inputClass} pl-9`}
            />
          </div>
          {filteredListings.length === 0 ? (
            <div className="rounded-3xl border border-border bg-card/70 backdrop-blur-md p-12 text-center">
              <span className="text-4xl mb-3 block">🥚</span>
              <p className="text-sm font-bold text-card-foreground">No listings available</p>
              <p className="text-xs text-muted-foreground mt-1">Check back later or create your own listing!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredListings.map((listing) => (
                <div key={listing.id} className="rounded-2xl border border-border bg-card/70 backdrop-blur-md overflow-hidden hover:shadow-lg transition-all">
                  {listing.image_url ? (
                    <img src={listing.image_url} alt={listing.title} className="w-full h-48 object-cover" />
                  ) : (
                    <div className="w-full h-48 bg-muted/30 flex items-center justify-center text-4xl">
                      {listing.gender === 'Rooster' ? '🐓' : '🐔'}
                    </div>
                  )}
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-extrabold text-card-foreground leading-tight">{listing.title}</h3>
                      <span className="text-sm font-black text-emerald-400 whitespace-nowrap">₱{listing.price.toLocaleString()}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">{listing.breed}</span>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">{listing.gender}</span>
                      {listing.age && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">{listing.age}</span>}
                    </div>
                    {listing.description && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2">{listing.description}</p>
                    )}
                    <div className="border-t border-border pt-3 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold text-card-foreground">{listing.seller_name}</p>
                        <p className="text-[9px] text-muted-foreground">{listing.farm_name}</p>
                      </div>
                      {listing.seller_contact && (
                        <span className="text-[9px] font-bold text-muted-foreground">{listing.seller_contact}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MY LISTINGS TAB */}
      {activeTab === 'my' && (
        <div className="space-y-4">
          <div className="relative max-w-md">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">🔍</span>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search your listings..." className={`${inputClass} pl-9`} />
          </div>
          {filteredMyListings.length === 0 ? (
            <div className="rounded-3xl border border-border bg-card/70 backdrop-blur-md p-12 text-center">
              <span className="text-4xl mb-3 block">📋</span>
              <p className="text-sm font-bold text-card-foreground">No listings yet</p>
              <p className="text-xs text-muted-foreground mt-1">Create your first listing to start selling!</p>
              <button type="button" onClick={() => setActiveTab('create')} className="mt-4 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 cursor-pointer">+ Create Listing</button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMyListings.map((listing) => (
                <div key={listing.id} className="rounded-2xl border border-border bg-card/70 backdrop-blur-md p-4 flex items-center gap-4">
                  {listing.image_url ? (
                    <img src={listing.image_url} alt={listing.title} className="w-16 h-16 rounded-xl object-cover border border-border shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-muted/30 flex items-center justify-center text-2xl shrink-0">
                      {listing.gender === 'Rooster' ? '🐓' : '🐔'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-extrabold text-card-foreground truncate">{listing.title}</h3>
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${statusBadge(listing.status)}`}>{listing.status}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{listing.breed} · {listing.gender} · ₱{listing.price.toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button type="button" onClick={() => handleEdit(listing)} className="text-[9px] font-black uppercase tracking-wider px-3 py-2 rounded-lg border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer">Edit</button>
                    <button type="button" onClick={() => setDeleteConfirm(listing.id)} className="text-[9px] font-black uppercase tracking-wider px-3 py-2 rounded-lg border border-rose-500/40 text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CREATE / EDIT TAB */}
      {activeTab === 'create' && (
        <div className="rounded-2xl border border-border bg-card/70 backdrop-blur-md p-6 max-w-2xl">
          <h2 className="text-sm font-extrabold text-card-foreground mb-4">{editingId ? 'Edit Listing' : 'Create New Listing'}</h2>

          {fowls.length > 0 && !editingId && (
            <div className="mb-4">
              <label className={labelClass}>Pre-fill from Fowl Registry</label>
              <select onChange={(e) => handleSelectFowl(e.target.value)} value={form.fowl_id} className={`${inputClass} cursor-pointer`}>
                <option value="">-- Select a fowl --</option>
                {fowls.filter((f) => f.status === 'Active').map((f) => (
                  <option key={f.id} value={f.id}>{f.name} ({f.breed} · {f.gender})</option>
                ))}
              </select>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Title *</label>
                <input type="text" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} className={inputClass} placeholder="e.g., Champion Sweater Rooster" required />
              </div>
              <div>
                <label className={labelClass}>Breed *</label>
                <input type="text" value={form.breed} onChange={(e) => setForm((p) => ({ ...p, breed: e.target.value }))} className={inputClass} placeholder="e.g., Sweater" required />
              </div>
              <div>
                <label className={labelClass}>Price (₱) *</label>
                <input type="number" value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} className={inputClass} placeholder="0" min="0" step="0.01" required />
              </div>
              <div>
                <label className={labelClass}>Gender *</label>
                <select value={form.gender} onChange={(e) => setForm((p) => ({ ...p, gender: e.target.value }))} className={`${inputClass} cursor-pointer`}>
                  <option value="Rooster">Rooster</option>
                  <option value="Hen">Hen</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Age</label>
                <input type="text" value={form.age} onChange={(e) => setForm((p) => ({ ...p, age: e.target.value }))} className={inputClass} placeholder="e.g., 8 months" />
              </div>
              <div>
                <label className={labelClass}>Weight</label>
                <input type="text" value={form.weight} onChange={(e) => setForm((p) => ({ ...p, weight: e.target.value }))} className={inputClass} placeholder="e.g., 2.5 kg" />
              </div>
              <div>
                <label className={labelClass}>Color</label>
                <input type="text" value={form.color} onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))} className={inputClass} placeholder="e.g., Red" />
              </div>
              <div>
                <label className={labelClass}>Image URL</label>
                <input type="url" value={form.image_url} onChange={(e) => setForm((p) => ({ ...p, image_url: e.target.value }))} className={inputClass} placeholder="https://..." />
              </div>
            </div>
            <div>
              <label className={labelClass}>Description</label>
              <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} className={`${inputClass} min-h-[80px] resize-y`} placeholder="Describe your gamefowl..." rows={3} />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className="flex-1 text-[11px] font-black uppercase tracking-wider py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-md shadow-emerald-500/30 transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2">
                {saving && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
                {saving ? 'Saving...' : editingId ? 'Update Listing' : 'Submit Listing'}
              </button>
              {editingId && (
                <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm); setActiveTab('my'); }} className="text-[11px] font-black uppercase tracking-wider px-4 py-3 rounded-xl border border-border text-muted-foreground hover:text-foreground transition-all cursor-pointer">Cancel</button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* DELETE CONFIRMATION */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4 animate-fadeIn">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/40 flex items-center justify-center text-2xl mx-auto">⚠️</div>
            <h3 className="text-center text-sm font-black text-card-foreground">Delete Listing?</h3>
            <p className="text-center text-[11px] text-muted-foreground font-semibold">This action cannot be undone.</p>
            <div className="flex gap-2.5 pt-1">
              <button type="button" onClick={() => setDeleteConfirm(null)} className="flex-1 text-[11px] font-black uppercase tracking-wider py-3 rounded-xl border border-border text-muted-foreground hover:text-foreground transition-all cursor-pointer">Cancel</button>
              <button type="button" onClick={() => handleDelete(deleteConfirm)} className="flex-1 text-[11px] font-black uppercase tracking-wider py-3 rounded-xl bg-rose-500/20 border border-rose-500/50 text-rose-300 hover:bg-rose-500/30 transition-all cursor-pointer">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
