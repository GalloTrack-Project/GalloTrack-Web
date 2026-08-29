'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  adminGuard,
  deleteUserRecords,
  fetchAllProfiles,
  profileDisplayName,
  setUserActive,
  setUserRole,
} from '@/lib/admin';
import type { AdminProfileRow } from '@/lib/admin';

type ToastState = { type: 'success' | 'error'; message: string } | null;

export default function AdminPanelPage() {
  const [adminProfile, setAdminProfile] = useState<AdminProfileRow | null>(null);
  const [profiles, setProfiles] = useState<AdminProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminProfileRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3500);
  }, []);

  const loadProfiles = useCallback(async () => {
    try {
      const rows = await fetchAllProfiles();
      setProfiles(rows);
    } catch (err) {
      showToast('error', `Failed to load farm owners: ${(err as Error).message}`);
    }
  }, [showToast]);

  useEffect(() => {
    (async () => {
      const profile = await adminGuard();
      if (!profile) return;
      setAdminProfile(profile);
      setLoading(false);
      await loadProfiles();
    })();
  }, [loadProfiles]);

  const handleToggleActive = async (user: AdminProfileRow) => {
    setActionId(user.id);
    try {
      await setUserActive(user.id, !user.is_active);
      setProfiles((prev) =>
        prev.map((p) => (p.id === user.id ? { ...p, is_active: !user.is_active } : p))
      );
      showToast('success', `${user.is_active ? 'Deactivated' : 'Activated'} ${profileDisplayName(user)}`);
    } catch (err) {
      showToast('error', `Failed to update status: ${(err as Error).message}`);
    } finally {
      setActionId(null);
    }
  };

  const handleToggleRole = async (user: AdminProfileRow) => {
    const nextRole = user.is_admin ? 'owner' : 'admin';
    if (user.id === adminProfile?.id) {
      showToast('error', 'You cannot change your own admin role.');
      return;
    }
    setActionId(user.id);
    try {
      await setUserRole(user.id, nextRole as 'owner' | 'admin');
      setProfiles((prev) =>
        prev.map((p) => (p.id === user.id ? { ...p, role: nextRole, is_admin: nextRole === 'admin' } : p))
      );
      showToast('success', `${profileDisplayName(user)} is now ${nextRole === 'admin' ? 'an Admin' : 'a Farm Owner'}`);
    } catch (err) {
      showToast('error', `Failed to update role: ${(err as Error).message}`);
    } finally {
      setActionId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteUserRecords(pendingDelete.id);
      setProfiles((prev) => prev.filter((p) => p.id !== pendingDelete.id));
      showToast('success', `Removed ${profileDisplayName(pendingDelete)} from the registry`);
      setPendingDelete(null);
    } catch (err) {
      showToast('error', `Failed to delete user: ${(err as Error).message}`);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center gap-4 bg-[#090d16] text-slate-200">
        <div className="w-10 h-10 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[11px] font-mono tracking-widest uppercase text-slate-400">Verifying admin access...</p>
      </div>
    );
  }

  if (!adminProfile) return null;

  const total = profiles.length;
  const active = profiles.filter((p) => p.is_active !== false).length;
  const deactivated = total - active;
  const admins = profiles.filter((p) => p.is_admin).length;

  const statCard = (label: string, value: number, accent: string) => (
    <div className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl p-4 sm:p-5 shadow-2xs">
      <p className={`text-2xl sm:text-3xl font-black ${accent}`}>{value}</p>
      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1">{label}</p>
    </div>
  );

  const statusBadge = (user: AdminProfileRow) =>
    user.is_active === false ? (
      <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400">Deactivated</span>
    ) : (
      <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">Active</span>
    );

  const roleBadge = (user: AdminProfileRow) =>
    user.is_admin || user.role === 'admin' ? (
      <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400">Admin</span>
    ) : (
      <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-400">Owner</span>
    );

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#0a1f1a] via-[#0d2b23] to-[#0a3328] light:from-emerald-50 light:via-slate-50 light:to-teal-50 relative overflow-hidden">
      <div className="absolute top-1/4 -left-20 w-72 h-72 bg-teal-400/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 min-h-screen p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-emerald-500/20 border border-emerald-500/40 rounded-xl flex items-center justify-center text-xl shadow-inner">🛡️</div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-card-foreground tracking-tight leading-none">
                GALLO<span className="text-emerald-400">TRACK</span> <span className="text-emerald-400">ADMIN</span>
              </h1>
              <p className="text-[9px] font-mono text-muted-foreground font-bold tracking-widest uppercase mt-1">Farm Owner Registry &amp; Access Control</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/settings"
              className="text-[11px] font-black uppercase tracking-wider px-4 py-2.5 rounded-xl bg-card/95 backdrop-blur-xl border border-border text-muted-foreground hover:text-emerald-400 hover:border-emerald-500/40 transition-all cursor-pointer"
            >
              ⚙️ System Settings
            </Link>
            <Link
              href="/"
              className="text-[11px] font-black uppercase tracking-wider px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-md shadow-emerald-500/30 transition-all cursor-pointer"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>

        {toast && (
          <div
            className={`mb-4 text-xs font-bold text-center p-3.5 rounded-xl border animate-fadeIn ${
              toast.type === 'success'
                ? 'text-emerald-300 light:text-emerald-700 bg-emerald-500/10 border-emerald-500/30'
                : 'text-rose-300 light:text-rose-600 bg-rose-500/10 border-rose-500/30'
            }`}
          >
            {toast.message}
          </div>
        )}

        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {statCard('Total Farm Owners', total, 'text-emerald-400')}
          {statCard('Active Accounts', active, 'text-sky-400')}
          {statCard('Deactivated', deactivated, 'text-rose-400')}
          {statCard('Admins', admins, 'text-amber-400')}
        </div>

        {/* REGISTRY TABLE */}
        <div className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xs overflow-hidden">
          <div className="px-4 sm:px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-card-foreground">Registered Farm Owners</h2>
            <span className="text-[9px] font-mono text-muted-foreground font-bold uppercase tracking-wider">{total} records</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[760px]">
              <thead>
                <tr className="text-[9px] font-black text-muted-foreground uppercase tracking-widest border-b border-border bg-muted/30">
                  <th className="px-4 sm:px-5 py-3">Owner</th>
                  <th className="px-4 py-3">Farm / Contact</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {profiles.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-xs text-muted-foreground font-semibold">
                      No farm owners registered yet.
                    </td>
                  </tr>
                )}
                {profiles.map((user) => (
                  <tr key={user.id} className="border-b border-border/60 last:border-0 hover:bg-muted/25 transition-colors">
                    <td className="px-4 sm:px-5 py-3.5">
                      <div className="flex items-center space-x-3">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt="avatar" className="w-9 h-9 rounded-xl object-cover border border-border shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-sm shrink-0">👤</div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-extrabold text-card-foreground truncate">{profileDisplayName(user)}</p>
                          <p className="text-[10px] text-muted-foreground font-medium truncate">{user.email || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-[11px] font-bold text-card-foreground truncate">{user.farm_name || user.full_name || '—'}</p>
                      <p className="text-[10px] text-muted-foreground font-medium truncate">{user.contact_number || user.phone_number || '—'}</p>
                    </td>
                    <td className="px-4 py-3.5">{roleBadge(user)}</td>
                    <td className="px-4 py-3.5">{statusBadge(user)}</td>
                    <td className="px-4 py-3.5 text-[10px] text-muted-foreground font-semibold whitespace-nowrap">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          disabled={actionId === user.id}
                          onClick={() => handleToggleActive(user)}
                          className={`text-[9px] font-black uppercase tracking-wider px-3 py-2 rounded-lg border transition-all cursor-pointer disabled:opacity-50 ${
                            user.is_active === false
                              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25'
                              : 'bg-rose-500/10 border-rose-500/40 text-rose-400 hover:bg-rose-500/20'
                          }`}
                        >
                          {actionId === user.id ? '...' : user.is_active === false ? 'Activate' : 'Deactivate'}
                        </button>
                        <button
                          type="button"
                          disabled={actionId === user.id || user.id === adminProfile.id}
                          onClick={() => handleToggleRole(user)}
                          className={`text-[9px] font-black uppercase tracking-wider px-3 py-2 rounded-lg border transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                            user.is_admin || user.role === 'admin'
                              ? 'bg-sky-500/10 border-sky-500/40 text-sky-400 hover:bg-sky-500/20'
                              : 'bg-amber-500/10 border-amber-500/40 text-amber-400 hover:bg-amber-500/20'
                          }`}
                        >
                          {actionId === user.id ? '...' : user.is_admin || user.role === 'admin' ? 'Demote' : 'Promote'}
                        </button>
                        <button
                          type="button"
                          disabled={actionId === user.id || user.id === adminProfile.id}
                          onClick={() => setPendingDelete(user)}
                          className="text-[9px] font-black uppercase tracking-wider px-3 py-2 rounded-lg border border-rose-500/40 text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="mt-4 text-center text-[9px] font-mono text-muted-foreground tracking-widest uppercase">
          ISUFST DINGLE HUB · Admin access is governed by RLS policies
        </p>
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      {pendingDelete && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4 animate-fadeIn">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/40 flex items-center justify-center text-2xl mx-auto">⚠️</div>
            <h3 className="text-center text-sm font-black text-card-foreground">Delete Farm Owner?</h3>
            <p className="text-center text-[11px] text-muted-foreground font-semibold leading-relaxed">
              This permanently removes <span className="text-rose-400 font-black">{profileDisplayName(pendingDelete)}</span> and all
              associated data:
            </p>
            <ul className="text-center text-[10px] text-muted-foreground font-medium space-y-1 list-disc list-inside">
              <li>All fowl profiles and lineage records</li>
              <li>All match history and video evidence</li>
              <li>Farm registration data</li>
              <li>Profile and account information</li>
            </ul>
            <p className="text-center text-[10px] text-rose-400 font-bold">
              This action cannot be undone. The authentication account remains but access will be revoked.
            </p>
            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setPendingDelete(null)}
                className="flex-1 text-[11px] font-black uppercase tracking-wider py-3 rounded-xl border border-border text-muted-foreground hover:text-foreground transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="flex-1 text-[11px] font-black uppercase tracking-wider py-3 rounded-xl bg-rose-500/20 border border-rose-500/50 text-rose-300 hover:bg-rose-500/30 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting && <span className="w-3.5 h-3.5 border-2 border-rose-300 border-t-transparent rounded-full animate-spin"></span>}
                {deleting ? 'Deleting...' : 'Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
