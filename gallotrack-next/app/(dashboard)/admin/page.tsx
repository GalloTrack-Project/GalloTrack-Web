'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, useToast } from '@/components/ui';
import {
  adminGuard,
  deleteUserRecords,
  fetchAllProfiles,
  profileDisplayName,
  setAccountStatus,
  setUserVerified,
} from '@/lib/admin';
import type { AdminProfileRow } from '@/lib/admin';
import { supabase } from '@/lib/registry';
import { Users, CheckCircle, Ban, Shield, Search, User, AlertTriangle, ClipboardList, Clock, FileText } from 'lucide-react';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';
import { useTheme } from 'next-themes';
import { useChartTokens, withAlpha } from '@/lib/chart-tokens';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

type AdminTab = 'users' | 'audit';

interface AuditLog {
  id: string;
  admin_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  marketplace_approved: 'Approved Listing',
  marketplace_flagged: 'Flagged Listing',
  marketplace_removed: 'Removed Listing',
  marketplace_pending: 'Pending Listing',
  reset_password: 'Password Reset',
  transfer_data: 'Data Transfer',
  user_activated: 'User Activated',
  user_deactivated: 'User Deactivated',
  user_suspended: 'User Suspended',
  user_deleted: 'User Deleted',
  user_verified: 'User Verified',
};

interface FarmDetails {
  farm_name?: string;
  farm_location?: string;
  farm_description?: string;
  contact_number?: string;
  created_at?: string;
}

function getAccountStatus(user: AdminProfileRow): 'active' | 'suspended' | 'deactivated' {
  if (user.account_status === 'suspended') return 'suspended';
  if (user.account_status === 'deactivated' || user.is_active === false) return 'deactivated';
  return 'active';
}

export default function AdminPanelPage() {
  const [adminProfile, setAdminProfile] = useState<AdminProfileRow | null>(null);
  const [profiles, setProfiles] = useState<AdminProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminProfileRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast: pushToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'owner'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'suspended' | 'deactivated'>('all');
  const [viewUser, setViewUser] = useState<AdminProfileRow | null>(null);
  const [viewUserFarm, setViewUserFarm] = useState<FarmDetails | null>(null);
  const [loadingFarm, setLoadingFarm] = useState(false);

  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditSearch, setAuditSearch] = useState('');
  const [adminNames, setAdminNames] = useState<Record<string, string>>({});
  const { resolvedTheme } = useTheme();
  const chart = useChartTokens(resolvedTheme);

  /** Sign-ups per month over the last six months, derived once per profile load. */
  const registrationChart = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of profiles) {
      const created = p.created_at ? new Date(p.created_at) : null;
      if (!created || isNaN(created.getTime())) continue;
      const key = `${created.getFullYear()}-${created.getMonth()}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const now = new Date();
    const labels: string[] = [];
    const data: number[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(d.toLocaleDateString('en-US', { month: 'short' }));
      data.push(counts.get(`${d.getFullYear()}-${d.getMonth()}`) || 0);
    }
    return { labels, data };
  }, [profiles]);

  const statusChart = useMemo(() => {
    const tallies = { active: 0, suspended: 0, deactivated: 0 };
    for (const p of profiles) tallies[getAccountStatus(p)]++;
    return {
      labels: ['Active', 'Suspended', 'Deactivated'],
      data: [tallies.active, tallies.suspended, tallies.deactivated],
      colors: [chart.success, chart.warning, chart.danger],
    };
  }, [profiles, chart]);

  const counts = useMemo(() => {
    const c = { total: profiles.length, active: 0, suspended: 0, deactivated: 0, verified: 0, admins: 0 };
    for (const p of profiles) {
      c[getAccountStatus(p)]++;
      if (p.is_verified === true) c.verified++;
      if (p.is_admin || p.role === 'admin') c.admins++;
    }
    return c;
  }, [profiles]);

  const showToast = useCallback(
    (type: 'success' | 'error', message: string) => {
      pushToast({ title: message, variant: type === 'error' ? 'danger' : 'success' });
    },
    [pushToast],
  );

  const loadProfiles = useCallback(async () => {
    try {
      const rows = await fetchAllProfiles();
      setProfiles(rows);

      const { data: sessionData } = await (await import('@/lib/registry')).supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (token) {
        const res = await fetch('/api/admin/users', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const { users } = await res.json();
          const merged: AdminProfileRow[] = users.map((u: { id: string; email: string; created_at: string; last_sign_in_at: string | null; email_confirmed_at: string | null; user_metadata: Record<string, string>; profile: AdminProfileRow | null }) => ({
            id: u.id,
            user_id: u.id,
            email: u.email,
            first_name: u.profile?.first_name || u.user_metadata?.first_name || '',
            middle_name: u.profile?.middle_name || u.user_metadata?.middle_name || '',
            last_name: u.profile?.last_name || u.user_metadata?.last_name || '',
            full_name: u.profile?.full_name || u.user_metadata?.full_name || '',
            farm_name: u.profile?.farm_name || u.user_metadata?.farm_name || '',
            phone_number: u.profile?.phone_number || u.user_metadata?.contact_number || '',
            contact_number: u.profile?.contact_number || u.user_metadata?.contact_number || '',
            avatar_url: u.profile?.avatar_url || u.user_metadata?.avatar_url || '',
            role: u.profile?.role || 'owner',
            is_admin: u.profile?.is_admin || false,
            is_active: u.profile?.is_active !== false,
            is_verified: u.profile?.is_verified ?? null,
            account_status: u.profile?.account_status ?? null,
            created_at: u.created_at,
            last_sign_in_at: u.last_sign_in_at,
            email_confirmed_at: u.email_confirmed_at,
          }));
          setProfiles(merged);
        }
      }
    } catch (err) {
      showToast('error', `Failed to load farm owners: ${(err as Error).message}`);
    }
  }, [showToast]);

  const loadUserFarm = useCallback(async (userId: string) => {
    setLoadingFarm(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) return;
      const res = await fetch(`/api/admin/fowls?user_id=${userId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        if (data.farm) {
          setViewUserFarm({
            farm_name: data.farm.farm_name || data.farm.name,
            farm_location: data.farm.farm_location || data.farm.location,
            farm_description: data.farm.farm_description || data.farm.description,
            contact_number: data.farm.contact_number,
            created_at: data.farm.created_at,
          });
        } else if (data.farm_name || data.farm_location || data.farm_description) {
          setViewUserFarm({
            farm_name: data.farm_name,
            farm_location: data.farm_location,
            farm_description: data.farm_description,
            contact_number: data.contact_number,
            created_at: data.created_at,
          });
        }
      }
    } catch { /* non-critical */ } finally {
      setLoadingFarm(false);
    }
  }, []);


  const loadAuditLogs = useCallback(async () => {
    setAuditLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) { setAuditLoading(false); return; }
      const res = await fetch('/api/admin/audit-logs', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setAuditLogs(data.logs || []);
        const adminIds = [...new Set((data.logs || []).map((l: AuditLog) => l.admin_id))];
        if (adminIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', adminIds);
          const names: Record<string, string> = {};
          (profiles || []).forEach((p: { id: string; full_name?: string; email?: string }) => {
            names[p.id] = p.full_name || p.email?.split('@')[0] || 'Admin';
          });
          setAdminNames(names);
        }
      }
    } catch { /* silent */ } finally {
      setAuditLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const profile = await adminGuard();
      if (!profile) return;
      setAdminProfile(profile);
      setLoading(false);
      await loadProfiles();
    })();
  }, [loadProfiles]);

  useEffect(() => {
    if (activeTab === 'audit' && auditLogs.length === 0 && !auditLoading) {
      loadAuditLogs();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const filteredProfiles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return profiles.filter((p) => {
      if (q) {
        const name = profileDisplayName(p).toLowerCase();
        const email = (p.email || '').toLowerCase();
        const farm = (p.farm_name || '').toLowerCase();
        if (!name.includes(q) && !email.includes(q) && !farm.includes(q)) return false;
      }
      if (filterRole === 'admin' && !p.is_admin && p.role !== 'admin') return false;
      if (filterRole === 'owner' && (p.is_admin || p.role === 'admin')) return false;
      const status = getAccountStatus(p);
      if (filterStatus === 'active' && status !== 'active') return false;
      if (filterStatus === 'suspended' && status !== 'suspended') return false;
      if (filterStatus === 'deactivated' && status !== 'deactivated') return false;
      return true;
    });
  }, [profiles, searchQuery, filterRole, filterStatus]);

  const filteredAuditLogs = useMemo(() => {
    if (!auditSearch.trim()) return auditLogs;
    const q = auditSearch.toLowerCase();
    return auditLogs.filter((log) => {
      const label = ACTION_LABELS[log.action] || log.action;
      const name = adminNames[log.admin_id] || '';
      return label.toLowerCase().includes(q) || name.toLowerCase().includes(q) || (log.target_type || '').toLowerCase().includes(q);
    });
  }, [auditLogs, auditSearch, adminNames]);

  const handleSetStatus = async (user: AdminProfileRow, status: 'active' | 'suspended' | 'deactivated') => {
    setActionId(user.id);
    try {
      await setAccountStatus(user.id, status);
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === user.id
            ? { ...p, account_status: status, is_active: status === 'active' }
            : p
        )
      );
      showToast('success', `Successfully ${status === 'active' ? 'activated' : status === 'suspended' ? 'suspended' : 'deactivated'} ${profileDisplayName(user)}`);
    } catch (err) {
      showToast('error', `Failed to update status: ${(err as Error).message}`);
    } finally {
      setActionId(null);
    }
  };

  const handleToggleVerified = async (user: AdminProfileRow) => {
    setActionId(user.id);
    try {
      const newVerified = !user.is_verified;
      await setUserVerified(user.id, newVerified);
      setProfiles((prev) =>
        prev.map((p) => (p.id === user.id ? { ...p, is_verified: newVerified } : p))
      );
      showToast('success', `Successfully ${newVerified ? 'verified' : 'unverified'} ${profileDisplayName(user)}`);
    } catch (err) {
      showToast('error', `Failed to update verification: ${(err as Error).message}`);
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
      showToast('success', `Successfully deleted ${profileDisplayName(pendingDelete)} from the registry`);
      setPendingDelete(null);
    } catch (err) {
      showToast('error', `Failed to delete user: ${(err as Error).message}`);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center gap-4 bg-background text-foreground">
        <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-mono tracking-widest uppercase text-muted-foreground">Verifying admin access...</p>
      </div>
    );
  }

  if (!adminProfile) return null;

  const { total, active, suspended, deactivated, verified, admins } = counts;

  const statCard = (label: string, value: number, accent: string, icon: React.ReactNode) => (
    <div className="bg-card/95 border border-border rounded-lg p-4 sm:p-5 shadow-2xs">
      <div className="flex items-center justify-between">
        <p className={`text-2xl sm:text-3xl font-black ${accent}`}>{value}</p>
        <span className="text-xl opacity-60">{icon}</span>
      </div>
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">{label}</p>
    </div>
  );

  const statusBadge = (user: AdminProfileRow) => {
    const status = getAccountStatus(user);
    if (status === 'suspended') {
      return <span className="text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-warning">Suspended</span>;
    }
    if (status === 'deactivated') {
      return <span className="text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-danger">Deactivated</span>;
    }
    return <span className="text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-success">Active</span>;
  };

  const verificationBadge = (user: AdminProfileRow) =>
    user.is_verified ? (
      <span className="text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-success">✓ Verified</span>
    ) : (
      <span className="text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-500/15 border border-slate-500/30 text-muted-foreground">✕ Unverified</span>
    );

  const roleBadge = (user: AdminProfileRow) =>
    user.is_admin || user.role === 'admin' ? (
      <span className="text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-warning">Admin</span>
    ) : (
      <span className="text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-sky-500/15 border border-sky-500/30 text-info">Owner</span>
    );

  return (
    <div className="min-h-screen w-full bg-background relative overflow-hidden">
      <div className="absolute top-1/4 -left-20 w-72 h-72 bg-amber-400/5 dark:bg-amber-400/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-amber-400/5 dark:bg-amber-400/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 min-h-screen p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-card-foreground tracking-tight leading-none">
              User <span className="text-warning">Management</span>
            </h1>
            <p className="text-xs font-mono text-muted-foreground font-bold tracking-widest uppercase mt-1">Access Control &amp; Account Administration</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-muted/60 p-1.5 rounded-lg border border-border overflow-x-auto shrink-0 mb-4">
          {([
            { id: 'users' as AdminTab, label: 'Users', icon: <Users size={14} /> },
            { id: 'audit' as AdminTab, label: 'Audit Logs', icon: <ClipboardList size={14} /> },
          ]).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/30'
                  : 'text-muted-foreground hover:text-card-foreground hover:bg-muted'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>


        {activeTab === 'users' && (<>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4 mb-4">
          {statCard('Total Users', total, 'text-warning', <Users size={20} />)}
          {statCard('Active', active, 'text-success', <CheckCircle size={20} />)}
          {statCard('Suspended', suspended, 'text-warning', <Ban size={20} />)}
          {statCard('Deactivated', deactivated, 'text-danger', <Ban size={20} />)}
          {statCard('Verified', verified, 'text-info', <Shield size={20} />)}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mb-4">
          <div className="bg-card/95 border border-border rounded-lg shadow-2xs p-4">
            <p className="text-xs font-black uppercase tracking-widest text-card-foreground mb-3">New Accounts · Last 6 Months</p>
            {total === 0 ? (
              <p className="text-sm text-muted-foreground font-semibold text-center py-10">No accounts yet.</p>
            ) : (
              <div className="h-44">
                <Bar
                  data={{
                    labels: registrationChart.labels,
                    datasets: [{
                      label: 'New accounts',
                      data: registrationChart.data,
                      backgroundColor: withAlpha(chart.warning, 0.75),
                      borderRadius: 4,
                    }],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      x: { grid: { display: false }, ticks: { color: chart.mutedForeground, font: { size: 10, weight: 'bold' } } },
                      y: { beginAtZero: true, ticks: { stepSize: 1, color: chart.mutedForeground, font: { size: 10 } } },
                    },
                  }}
                />
              </div>
            )}
          </div>
          <div className="bg-card/95 border border-border rounded-lg shadow-2xs p-4">
            <p className="text-xs font-black uppercase tracking-widest text-card-foreground mb-3">Account Status</p>
            {total === 0 ? (
              <p className="text-sm text-muted-foreground font-semibold text-center py-10">No accounts yet.</p>
            ) : (
              <div className="h-44">
                <Doughnut
                  data={{
                    labels: statusChart.labels,
                    datasets: [{
                      data: statusChart.data,
                      backgroundColor: statusChart.colors,
                      borderWidth: 0,
                    }],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '62%',
                    plugins: {
                      legend: { position: 'bottom', labels: { color: chart.mutedForeground, boxWidth: 10, font: { size: 11, weight: 'bold' } } },
                    },
                  }}
                />
              </div>
            )}
          </div>
        </div>

        <div className="bg-card/95 border border-border rounded-lg shadow-2xs p-4 mb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm"><Search size={16} /></span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, or farm..."
                className="w-full pl-9 pr-4 py-2.5 border border-border rounded-md text-sm bg-muted/25 focus:bg-card focus:border-amber-500 transition-all font-semibold text-card-foreground placeholder:text-muted-foreground/60"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value as 'all' | 'admin' | 'owner')}
                className="px-3 py-2.5 border border-border rounded-md text-xs font-bold bg-muted/25 focus:border-amber-500 transition-all text-card-foreground cursor-pointer"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admins Only</option>
                <option value="owner">Owners Only</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'suspended' | 'deactivated')}
                className="px-3 py-2.5 border border-border rounded-md text-xs font-bold bg-muted/25 focus:border-amber-500 transition-all text-card-foreground cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="suspended">Suspended Only</option>
                <option value="deactivated">Deactivated Only</option>
              </select>
            </div>
          </div>
        </div>

        <div className="md:hidden space-y-3 mb-6">
          {filteredProfiles.length === 0 && (
            <div className="bg-card/95 border border-border rounded-lg p-8 text-center">
              <p className="text-sm text-muted-foreground font-semibold">No users found.</p>
            </div>
          )}
          {filteredProfiles.map((user) => (
            <div key={user.id} className="bg-card/95 border border-border rounded-lg p-4 shadow-2xs">
              <div className="flex items-center gap-3 mb-3">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="avatar" className="w-10 h-10 rounded-md object-cover border border-border shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-md bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-sm shrink-0"><User size={16} /></div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-extrabold text-card-foreground truncate">{profileDisplayName(user)}</p>
                  <p className="text-xs text-muted-foreground font-medium truncate">{user.email || '—'}</p>
                </div>
                <div className="flex gap-1.5">
                  {roleBadge(user)}
                  {statusBadge(user)}
                  {verificationBadge(user)}
                </div>
              </div>
              <div className="text-xs text-muted-foreground font-medium mb-3">
                <span>{user.farm_name || user.full_name || 'No farm name'}</span>
                <span className="mx-1.5">·</span>
                <span>{user.contact_number || user.phone_number || 'No contact'}</span>
                {user.created_at && (
                  <>
                    <span className="mx-1.5">·</span>
                    <span>Joined {new Date(user.created_at).toLocaleDateString()}</span>
                  </>
                )}
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  disabled={actionId === user.id || user.id === adminProfile.id}
                  onClick={() => {
                    const status = getAccountStatus(user);
                    const nextStatus = status === 'active' ? 'suspended' : 'active';
                    handleSetStatus(user, nextStatus);
                  }}
                  className={`flex-1 text-xs font-black uppercase tracking-wider px-2 py-2 rounded-sm border transition-all cursor-pointer disabled:opacity-50 ${
                    getAccountStatus(user) === 'active'
                      ? 'bg-amber-500/10 border-amber-500/40 text-warning hover:bg-amber-500/20'
                      : 'bg-emerald-500/15 border-emerald-500/40 text-success hover:bg-emerald-500/25'
                  }`}
                >
                  {actionId === user.id ? '...' : getAccountStatus(user) === 'active' ? 'Suspend' : 'Activate'}
                </button>
                <button
                  type="button"
                  disabled={actionId === user.id}
                  onClick={() => handleToggleVerified(user)}
                  className={`flex-1 text-xs font-black uppercase tracking-wider px-2 py-2 rounded-sm border transition-all cursor-pointer disabled:opacity-50 ${
                    user.is_verified
                      ? 'bg-slate-500/10 border-slate-500/40 text-muted-foreground hover:bg-slate-500/20'
                      : 'bg-emerald-500/15 border-emerald-500/40 text-success hover:bg-emerald-500/25'
                  }`}
                >
                  {actionId === user.id ? '...' : user.is_verified ? 'Unverify' : 'Verify'}
                </button>
                <button
                  type="button"
                  disabled={actionId === user.id || user.id === adminProfile.id}
                  onClick={() => setPendingDelete(user)}
                  className="flex-1 text-xs font-black uppercase tracking-wider px-2 py-2 rounded-sm border border-rose-500/40 text-danger hover:bg-rose-500/20 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden md:block bg-card/95 border border-border rounded-lg shadow-2xs overflow-hidden">
          <div className="px-4 sm:px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-widest text-card-foreground">Registered Farm Owners</h2>
            <span className="text-xs font-mono text-muted-foreground font-bold uppercase tracking-wider">{filteredProfiles.length} of {total} records</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[960px]">
              <thead>
                <tr className="text-xs font-black text-muted-foreground uppercase tracking-widest border-b border-border bg-muted/30">
                  <th className="px-4 sm:px-5 py-3">Owner</th>
                  <th className="px-4 py-3">Farm / Contact</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Verified</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProfiles.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-sm text-muted-foreground font-semibold">
                      No users found matching your filters.
                    </td>
                  </tr>
                )}
                {filteredProfiles.map((user) => (
                  <tr key={user.id} className="border-b border-border/60 last:border-0 hover:bg-muted/25 transition-colors">
                    <td className="px-4 sm:px-5 py-3.5">
                      <div className="flex items-center space-x-3">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt="avatar" className="w-9 h-9 rounded-md object-cover border border-border shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-md bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-sm shrink-0"><User size={14} /></div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-extrabold text-card-foreground truncate">{profileDisplayName(user)}</p>
                          <p className="text-xs text-muted-foreground font-medium truncate">{user.email || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-xs font-bold text-card-foreground truncate">{user.farm_name || user.full_name || '—'}</p>
                      <p className="text-xs text-muted-foreground font-medium truncate">{user.contact_number || user.phone_number || '—'}</p>
                    </td>
                    <td className="px-4 py-3.5">{roleBadge(user)}</td>
                    <td className="px-4 py-3.5">{statusBadge(user)}</td>
                    <td className="px-4 py-3.5">{verificationBadge(user)}</td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground font-semibold whitespace-nowrap">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          disabled={actionId === user.id || user.id === adminProfile.id}
                          onClick={() => {
                            const status = getAccountStatus(user);
                            const nextStatus = status === 'active' ? 'suspended' : 'active';
                            handleSetStatus(user, nextStatus);
                          }}
                          className={`text-xs font-black uppercase tracking-wider px-2.5 py-1.5 rounded-sm border transition-all cursor-pointer disabled:opacity-50 ${
                            getAccountStatus(user) === 'active'
                              ? 'bg-amber-500/10 border-amber-500/40 text-warning hover:bg-amber-500/20'
                              : 'bg-emerald-500/15 border-emerald-500/40 text-success hover:bg-emerald-500/25'
                          }`}
                        >
                          {actionId === user.id ? '...' : getAccountStatus(user) === 'active' ? 'Suspend' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          disabled={actionId === user.id}
                          onClick={() => handleToggleVerified(user)}
                          className={`text-xs font-black uppercase tracking-wider px-2.5 py-1.5 rounded-sm border transition-all cursor-pointer disabled:opacity-50 ${
                            user.is_verified
                              ? 'bg-slate-500/10 border-slate-500/40 text-muted-foreground hover:bg-slate-500/20'
                              : 'bg-emerald-500/15 border-emerald-500/40 text-success hover:bg-emerald-500/25'
                          }`}
                        >
                          {actionId === user.id ? '...' : user.is_verified ? 'Unverify' : 'Verify'}
                        </button>
                        <button
                          type="button"
                          disabled={actionId === user.id || user.id === adminProfile.id}
                          onClick={() => setPendingDelete(user)}
                          className="text-xs font-black uppercase tracking-wider px-2.5 py-1.5 rounded-sm border border-rose-500/40 text-danger hover:bg-rose-500/20 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
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

        <p className="mt-4 text-center text-xs font-mono text-muted-foreground tracking-widest uppercase">
          Admin access is governed by RLS policies
        </p>
        </>)}

        {activeTab === 'audit' && (<>
          <div className="bg-card/95 border border-border rounded-lg shadow-2xs p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm"><Search size={16} /></span>
                <input
                  type="text"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="Search by action, admin, or target..."
                  className="w-full pl-9 pr-4 py-2.5 border border-border rounded-md text-sm bg-muted/25 focus:bg-card focus:border-amber-500 transition-all font-semibold text-card-foreground placeholder:text-muted-foreground/60"
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold ml-3">
                <FileText size={14} />
                {filteredAuditLogs.length} entries
              </div>
            </div>
          </div>

          <div className="bg-card/95 border border-border rounded-lg shadow-2xs overflow-hidden">
            {auditLoading ? (
              <div className="p-8 text-center">
                <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-sm text-muted-foreground font-semibold">Loading audit logs...</p>
              </div>
            ) : filteredAuditLogs.length === 0 ? (
              <div className="p-8 text-center">
                <Clock className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground font-semibold">No audit logs found.</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Admin actions will appear here once recorded.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {filteredAuditLogs.map((log) => (
                  <div key={log.id} className="px-4 sm:px-5 py-3.5 hover:bg-muted/25 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-sm bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5">
                          <Shield className="w-3.5 h-3.5 text-warning" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-card-foreground">
                            <span className="text-warning">{adminNames[log.admin_id] || 'Admin'}</span>
                            {' '}
                            <span className="text-muted-foreground">{ACTION_LABELS[log.action] || log.action}</span>
                          </p>
                          {log.target_type && (
                            <p className="text-xs text-muted-foreground/70 mt-0.5">
                              Target: {log.target_type}{log.target_id ? ` (${log.target_id.slice(0, 8)}...)` : ''}
                            </p>
                          )}
                          {log.details && Object.keys(log.details).length > 0 && (
                            <p className="text-xs text-muted-foreground/60 mt-0.5 font-mono">
                              {Object.entries(log.details).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground/60 font-mono whitespace-nowrap shrink-0">
                        {new Date(log.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="mt-4 text-center text-xs font-mono text-muted-foreground tracking-widest uppercase">
            Audit logs are retained for security and compliance
          </p>
        </>)}
      </div>

      {pendingDelete && (
        <Modal
          open
          onClose={() => setPendingDelete(null)}
          title="Delete Farm Owner?"
          description={`This permanently removes ${profileDisplayName(pendingDelete)} and all associated data. This action cannot be undone.`}
          icon={<AlertTriangle size={24} />}
          iconClassName="bg-rose-500/15 border-rose-500/40 text-danger"
          className="max-w-sm"
          closeOnBackdrop={false}
        >
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>All chicken profiles and lineage records</li>
              <li>All match history and video evidence</li>
              <li>Farm registration data</li>
              <li>Profile and account information</li>
            </ul>
            <p className="text-sm text-danger font-semibold">
              The authentication account remains but access will be revoked.
            </p>
            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setPendingDelete(null)}
                className="flex-1 text-sm font-semibold py-3 rounded-sm border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="flex-1 text-sm font-semibold py-3 rounded-sm bg-rose-500/20 border border-rose-500/50 text-danger hover:bg-rose-500/30 transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting && <span className="w-3.5 h-3.5 border-2 border-rose-300 border-t-transparent rounded-full animate-spin"></span>}
                {deleting ? 'Deleting...' : 'Delete Forever'}
              </button>
            </div>
        </Modal>
      )}

      {viewUser && (
        <Modal
          open
          onClose={() => { setViewUser(null); setViewUserFarm(null); }}
          title="User Details"
          className="max-w-lg"
        >
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {viewUser.avatar_url ? (
                  <img src={viewUser.avatar_url} alt="avatar" className="w-14 h-14 rounded-md object-cover border border-border" />
                ) : (
                  <div className="w-14 h-14 rounded-md bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl"><User size={20} /></div>
                )}
                <div>
                  <p className="text-base font-extrabold text-card-foreground">{profileDisplayName(viewUser)}</p>
                  <p className="text-xs text-muted-foreground font-medium">{viewUser.email || '—'}</p>
                  <div className="flex gap-1.5 mt-1">
                    {roleBadge(viewUser)}
                    {statusBadge(viewUser)}
                    {verificationBadge(viewUser)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-muted/25 rounded-md p-3">
                  <p className="font-bold text-muted-foreground uppercase tracking-wider mb-1">Farm</p>
                  <p className="font-bold text-card-foreground">{viewUser.farm_name || viewUserFarm?.farm_name || '—'}</p>
                </div>
                <div className="bg-muted/25 rounded-md p-3">
                  <p className="font-bold text-muted-foreground uppercase tracking-wider mb-1">Contact</p>
                  <p className="font-bold text-card-foreground">{viewUser.contact_number || viewUser.phone_number || viewUserFarm?.contact_number || '—'}</p>
                </div>
                <div className="bg-muted/25 rounded-md p-3">
                  <p className="font-bold text-muted-foreground uppercase tracking-wider mb-1">Joined</p>
                  <p className="font-bold text-card-foreground">{viewUser.created_at ? new Date(viewUser.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}</p>
                </div>
                <div className="bg-muted/25 rounded-md p-3">
                  <p className="font-bold text-muted-foreground uppercase tracking-wider mb-1">Last Sign In</p>
                  <p className="font-bold text-card-foreground">{viewUser.last_sign_in_at ? new Date(viewUser.last_sign_in_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}</p>
                </div>
                <div className="bg-muted/25 rounded-md p-3">
                  <p className="font-bold text-muted-foreground uppercase tracking-wider mb-1">Account Status</p>
                  <p className="font-bold">{statusBadge(viewUser)}</p>
                </div>
                <div className="bg-muted/25 rounded-md p-3">
                  <p className="font-bold text-muted-foreground uppercase tracking-wider mb-1">Verification</p>
                  <p className="font-bold">{verificationBadge(viewUser)}</p>
                </div>
              </div>

              {viewUserFarm && (
                <div className="bg-muted/25 rounded-md p-3 text-xs">
                  <p className="font-bold text-muted-foreground uppercase tracking-wider mb-2">Farm Details</p>
                  {viewUserFarm.farm_name && (
                    <div className="mb-1.5">
                      <span className="font-bold text-card-foreground">Name:</span>{' '}
                      <span className="text-muted-foreground">{viewUserFarm.farm_name}</span>
                    </div>
                  )}
                  {viewUserFarm.farm_location && (
                    <div className="mb-1.5">
                      <span className="font-bold text-card-foreground">Location:</span>{' '}
                      <span className="text-muted-foreground">{viewUserFarm.farm_location}</span>
                    </div>
                  )}
                  {viewUserFarm.farm_description && (
                    <div className="mb-1.5">
                      <span className="font-bold text-card-foreground">Description:</span>{' '}
                      <span className="text-muted-foreground">{viewUserFarm.farm_description}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={actionId === viewUser.id || viewUser.id === adminProfile.id}
                  onClick={() => {
                    const status = getAccountStatus(viewUser);
                    const nextStatus = status === 'active' ? 'suspended' : 'active';
                    handleSetStatus(viewUser, nextStatus);
                  }}
                  className={`flex-1 text-xs font-black uppercase tracking-wider px-3 py-2.5 rounded-md border transition-all cursor-pointer disabled:opacity-50 ${
                    getAccountStatus(viewUser) === 'active'
                      ? 'bg-amber-500/10 border-amber-500/40 text-warning hover:bg-amber-500/20'
                      : 'bg-emerald-500/15 border-emerald-500/40 text-success hover:bg-emerald-500/25'
                  }`}
                >
                  {getAccountStatus(viewUser) === 'active' ? 'Suspend' : 'Activate'}
                </button>
                <button
                  type="button"
                  disabled={actionId === viewUser.id || viewUser.id === adminProfile.id}
                  onClick={() => handleSetStatus(viewUser, 'deactivated')}
                  className="flex-1 text-xs font-black uppercase tracking-wider px-3 py-2.5 rounded-md border border-rose-500/40 text-danger hover:bg-rose-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  Deactivate
                </button>
              </div>

              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Farm Registration</h3>
                  {loadingFarm && (
                    <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                  )}
                  {!viewUserFarm && !loadingFarm && (
                    <button type="button" onClick={() => loadUserFarm(viewUser.id)} className="text-xs font-bold text-warning hover:text-warning cursor-pointer">
                      Load farm info
                    </button>
                  )}
                </div>
                {!loadingFarm && viewUserFarm && (
                  <div className="text-xs text-muted-foreground font-medium space-y-1">
                    {viewUserFarm.created_at && (
                      <p>Registered on {new Date(viewUserFarm.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                    )}
                    {viewUserFarm.farm_location && (
                      <p>Location: {viewUserFarm.farm_location}</p>
                    )}
                  </div>
                )}
                {!loadingFarm && !viewUserFarm && (
                  <p className="text-xs text-muted-foreground text-center py-4">Click "Load farm info" to view farm details.</p>
                )}
              </div>
            </div>
        </Modal>
      )}
    </div>
  );
}
