'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Bird, CheckCircle, Dna, Users, Search } from 'lucide-react';
import { supabase } from '@/lib/registry';
import { adminGuard } from '@/lib/admin';

type Fowl = {
  id: string;
  name: string;
  breed: string;
  gender: string;
  growth_stage: string;
  birthdate: string;
  status: string;
  created_at: string;
  sire: string;
  dam: string;
  image_url: string;
  user_id: string;
  owner_name: string;
  farm_name: string;
};

type Stats = { total: number; active: number; breeds: number; owners: number };

export default function AdminFlockAuditPage() {
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fowls, setFowls] = useState<Fowl[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, breeds: 0, owners: 0 });
  const [search, setSearch] = useState('');
  const [filterBreed, setFilterBreed] = useState('all');
  const [filterGender, setFilterGender] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadFowls = useCallback(async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) return;
      const res = await fetch('/api/admin/fowls', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const { fowls: data } = await res.json();
        setFowls(data);
        const breeds = new Set(data.map((f: Fowl) => f.breed));
        const owners = new Set(data.map((f: Fowl) => f.user_id));
        setStats({
          total: data.length,
          active: data.filter((f: Fowl) => f.status === 'Active').length,
          breeds: breeds.size,
          owners: owners.size,
        });
      }
    } catch {
      setToast({ type: 'error', message: 'Failed to load fowls' });
      window.setTimeout(() => setToast(null), 3500);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    adminGuard().then((p) => {
      if (!p) return;
      setAuthorized(true);
      loadFowls();
    });
  }, [loadFowls]);

  const breeds = useMemo(() => [...new Set(fowls.map((f) => f.breed))].sort(), [fowls]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return fowls.filter((f) => {
      if (q && !f.name.toLowerCase().includes(q) && !f.breed.toLowerCase().includes(q) && !f.owner_name.toLowerCase().includes(q) && !f.farm_name.toLowerCase().includes(q)) return false;
      if (filterBreed !== 'all' && f.breed !== filterBreed) return false;
      if (filterGender !== 'all' && f.gender !== filterGender) return false;
      if (filterStatus !== 'all' && f.status !== filterStatus) return false;
      return true;
    });
  }, [fowls, search, filterBreed, filterGender, filterStatus]);

  if (!authorized || loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center gap-4 bg-background text-foreground">
        <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[11px] font-mono tracking-widest uppercase text-muted-foreground">Loading flock registry...</p>
      </div>
    );
  }

  const statCard = (label: string, value: number | string, accent: string, icon: ReactNode) => (
    <div className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl p-4 sm:p-5 shadow-2xs">
      <div className="flex items-center justify-between">
        <p className={`text-2xl sm:text-3xl font-black ${accent}`}>{value}</p>
        <span className="text-xl opacity-60">{icon}</span>
      </div>
      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1">{label}</p>
    </div>
  );

  const statusColor = (s: string) => s === 'Active' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : s === 'Sold' ? 'bg-sky-500/15 text-sky-400 border-sky-500/30' : s === 'Deceased' ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' : 'bg-muted text-muted-foreground border-border';

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
              Flock <span className="text-amber-400">Audit</span>
            </h1>
            <p className="text-[9px] font-mono text-muted-foreground font-bold tracking-widest uppercase mt-1">Global view of all registered gamefowl across all owners</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4">
          {statCard('Total Fowls', stats.total, 'text-amber-400', <Bird className="w-5 h-5" />)}
          {statCard('Active', stats.active, 'text-emerald-400', <CheckCircle className="w-5 h-5" />)}
          {statCard('Breeds', stats.breeds, 'text-sky-400', <Dna className="w-5 h-5" />)}
          {statCard('Owners', stats.owners, 'text-purple-400', <Users className="w-5 h-5" />)}
        </div>

        <div className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xs p-4 mb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm"><Search className="w-4 h-4" /></span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, breed, owner, or farm..."
                className="w-full pl-9 pr-4 py-2.5 border border-border rounded-xl text-xs bg-muted/25 focus:bg-card focus:border-amber-500 transition-all font-semibold outline-none text-card-foreground placeholder:text-muted-foreground/60"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <select value={filterBreed} onChange={(e) => setFilterBreed(e.target.value)} className="px-3 py-2.5 border border-border rounded-xl text-[10px] font-bold bg-muted/25 focus:border-amber-500 transition-all outline-none text-card-foreground cursor-pointer">
                <option value="all">All Breeds</option>
                {breeds.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
              <select value={filterGender} onChange={(e) => setFilterGender(e.target.value)} className="px-3 py-2.5 border border-border rounded-xl text-[10px] font-bold bg-muted/25 focus:border-amber-500 transition-all outline-none text-card-foreground cursor-pointer">
                <option value="all">All Genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2.5 border border-border rounded-xl text-[10px] font-bold bg-muted/25 focus:border-amber-500 transition-all outline-none text-card-foreground cursor-pointer">
                <option value="all">All Status</option>
                <option value="Active">Active</option>
                <option value="Sold">Sold</option>
                <option value="Deceased">Deceased</option>
              </select>
            </div>
          </div>
        </div>

        <div className="md:hidden space-y-3 mb-6">
          {filtered.length === 0 && (
            <div className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl p-8 text-center">
              <p className="text-xs text-muted-foreground font-semibold">No fowls found.</p>
            </div>
          )}
          {filtered.map((fowl) => (
            <div key={fowl.id} className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl p-4 shadow-2xs">
              <div className="flex items-center gap-3 mb-2">
                {fowl.image_url ? (
                  <img src={fowl.image_url} alt={fowl.name} className="w-10 h-10 rounded-xl object-cover border border-border shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-sm shrink-0">
                    <Bird className="w-5 h-5" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-extrabold text-card-foreground truncate">{fowl.name}</p>
                  <p className="text-[10px] text-muted-foreground font-medium truncate">{fowl.breed} · {fowl.gender}</p>
                </div>
                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${statusColor(fowl.status)}`}>{fowl.status}</span>
              </div>
              <div className="text-[9px] text-muted-foreground font-medium space-y-0.5">
                <p>Owner: <span className="text-card-foreground font-bold">{fowl.owner_name}</span> · {fowl.farm_name}</p>
                <p>Stage: {fowl.growth_stage || '—'} · Sire: {fowl.sire || '—'} · Dam: {fowl.dam || '—'}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden md:block bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xs overflow-hidden">
          <div className="px-4 sm:px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-card-foreground">All Registered Fowls</h2>
            <span className="text-[9px] font-mono text-muted-foreground font-bold uppercase tracking-wider">{filtered.length} of {fowls.length} records</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[900px]">
              <thead>
                <tr className="text-[9px] font-black text-muted-foreground uppercase tracking-widest border-b border-border bg-muted/30">
                  <th className="px-4 sm:px-5 py-3">Fowl</th>
                  <th className="px-4 py-3">Breed / Gender</th>
                  <th className="px-4 py-3">Stage</th>
                  <th className="px-4 py-3">Sire / Dam</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-10 text-center text-xs text-muted-foreground font-semibold">No fowls found.</td></tr>
                )}
                {filtered.map((fowl) => (
                  <tr key={fowl.id} className="border-b border-border/60 last:border-0 hover:bg-muted/25 transition-colors">
                    <td className="px-4 sm:px-5 py-3.5">
                      <div className="flex items-center space-x-3">
                        {fowl.image_url ? (
                          <img src={fowl.image_url} alt={fowl.name} className="w-9 h-9 rounded-xl object-cover border border-border shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-sm shrink-0"><Bird className="w-5 h-5" /></div>
                        )}
                        <p className="text-xs font-extrabold text-card-foreground truncate">{fowl.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-[11px] font-bold text-card-foreground">{fowl.breed}</p>
                      <p className="text-[10px] text-muted-foreground">{fowl.gender}</p>
                    </td>
                    <td className="px-4 py-3.5 text-[11px] font-bold text-card-foreground">{fowl.growth_stage || '—'}</td>
                    <td className="px-4 py-3.5 text-[10px] text-muted-foreground font-medium">
                      <span>Sire: {fowl.sire || '—'}</span><br />
                      <span>Dam: {fowl.dam || '—'}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-[11px] font-bold text-card-foreground truncate">{fowl.owner_name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{fowl.farm_name}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${statusColor(fowl.status)}`}>{fowl.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
