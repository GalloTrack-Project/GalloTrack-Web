'use client';

import { useEffect, useState } from 'react';
import { adminGuard } from '@/lib/admin';
import type { AdminProfileRow } from '@/lib/admin';
import { fetchSystemSettings, updateSystemSettings } from '@/lib/admin';

export default function AdminSettingsPage() {
  const [adminProfile, setAdminProfile] = useState<AdminProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [systemName, setSystemName] = useState('GalloTrack');
  const [systemStatus, setSystemStatus] = useState('Operational');
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [defaultStrain, setDefaultStrain] = useState('Sweater');
  const [cloudLogs, setCloudLogs] = useState(true);
  const [eventAlerts, setEventAlerts] = useState(true);
  const [allowRegistrations, setAllowRegistrations] = useState(true);
  const [autoApproveUsers, setAutoApproveUsers] = useState(true);
  const [publicFowlData, setPublicFowlData] = useState(false);
  const [defaultUserRole, setDefaultUserRole] = useState('owner');

  // Data Transfer state
  const [transferEmail, setTransferEmail] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [transferResult, setTransferResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      const profile = await adminGuard();
      if (!profile) return;
      setAdminProfile(profile);
      try {
        const settings = await fetchSystemSettings();
        setSystemName(settings.system_name || 'GalloTrack');
        setSystemStatus(settings.system_status || 'Operational');
        setMaintenanceMessage(settings.maintenance_message || '');
        setDefaultStrain(settings.default_strain || 'Sweater');
        setCloudLogs(settings.cloud_logs !== false);
        setEventAlerts(settings.event_alerts !== false);
        setAllowRegistrations(settings.allow_registrations !== false);
        setAutoApproveUsers(settings.auto_approve_users !== false);
        setPublicFowlData(settings.public_fowl_data === true);
        setDefaultUserRole(settings.default_user_role || 'owner');
      } catch (err) {
        setMessage({ type: 'error', text: `Failed to load settings: ${(err as Error).message}` });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await updateSystemSettings({
        system_name: systemName,
        system_status: systemStatus,
        maintenance_message: maintenanceMessage,
        default_strain: defaultStrain,
        cloud_logs: cloudLogs,
        event_alerts: eventAlerts,
        allow_registrations: allowRegistrations,
        auto_approve_users: autoApproveUsers,
        public_fowl_data: publicFowlData,
        default_user_role: defaultUserRole,
      });
      setMessage({ type: 'success', text: 'System configuration saved successfully.' });
      window.setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: `Save failed: ${(err as Error).message}` });
    } finally {
      setSaving(false);
    }
  };

  const handleTransferData = async () => {
    if (!transferEmail.trim()) {
      setTransferResult({ type: 'error', text: 'Please enter the target farm owner email.' });
      return;
    }
    setTransferring(true);
    setTransferResult(null);
    try {
      const { supabase } = await import('@/lib/registry');
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        setTransferResult({ type: 'error', text: 'Not authenticated.' });
        return;
      }
      const res = await fetch('/api/admin/transfer-data', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_email: transferEmail.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTransferResult({ type: 'success', text: `Transferred ${data.fowls_transferred} fowls and ${data.matches_transferred} matches to ${transferEmail}` });
        setTransferEmail('');
      } else {
        setTransferResult({ type: 'error', text: data.error || 'Transfer failed' });
      }
    } catch {
      setTransferResult({ type: 'error', text: 'Network error during transfer.' });
    } finally {
      setTransferring(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center gap-4 bg-background text-foreground">
        <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[11px] font-mono tracking-widest uppercase text-muted-foreground">Loading system configuration...</p>
      </div>
    );
  }

  if (!adminProfile) return null;

  const inputClass =
    'w-full p-3 border border-border rounded-xl text-xs bg-muted/25 focus:bg-card focus:border-amber-500 transition-all font-semibold outline-none text-card-foreground';
  const labelClass = 'block text-[10px] font-black text-muted-foreground mt-2 uppercase tracking-widest';

  return (
    <div className="min-h-screen w-full bg-background relative overflow-hidden">
      <div className="absolute top-1/4 -left-20 w-72 h-72 bg-amber-400/5 dark:bg-amber-400/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-amber-400/5 dark:bg-amber-400/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 min-h-screen p-4 sm:p-6 lg:p-8 pb-64 max-w-3xl mx-auto">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-card-foreground tracking-tight leading-none">
              System <span className="text-amber-400">Settings</span>
            </h1>
            <p className="text-[9px] font-mono text-muted-foreground font-bold tracking-widest uppercase mt-1">Admin-Controlled Application Configuration</p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="submit"
              form="system-settings-form"
              disabled={saving}
              className="text-[11px] font-black uppercase tracking-wider px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white shadow-md shadow-amber-500/30 transition-all cursor-pointer disabled:opacity-60 flex items-center gap-2"
            >
              {saving && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
              {saving ? 'SAVING...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {message && (
          <div
            className={`mb-4 text-xs font-bold text-center p-3.5 rounded-xl border animate-fadeIn ${
              message.type === 'success'
                ? 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30'
                : 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* IDENTITY */}
        <div className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xs p-5 mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xl">🛡️</div>
            <div>
              <p className="text-sm font-extrabold text-card-foreground">{adminProfile.full_name || 'Administrator'}</p>
              <p className="text-[10px] text-muted-foreground font-semibold">{adminProfile.email || ''} · Admin privileged session</p>
            </div>
          </div>
        </div>

        <form id="system-settings-form" onSubmit={handleSave} className="space-y-5 [scroll-behavior:smooth] scroll-pt-24">
          {/* GENERAL */}
          <div className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xs p-6 space-y-5">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-amber-400 border-b border-border pb-3">General Configuration</h2>

            <div>
              <label className={labelClass}>System Name</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-500 pointer-events-none text-xs">🏷️</span>
                <input type="text" value={systemName} onChange={(e) => setSystemName(e.target.value)} className={`${inputClass} pl-9`} placeholder="e.g., GalloTrack" required />
              </div>
            </div>

            <div>
              <label className={labelClass}>System Status</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-500 pointer-events-none text-xs">🚦</span>
                <select value={systemStatus} onChange={(e) => setSystemStatus(e.target.value)} className={`${inputClass} pl-9 cursor-pointer`}>
                  <option value="Operational">Operational</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Degraded">Degraded</option>
                </select>
              </div>
            </div>

            <div>
              <label className={labelClass}>Maintenance Message <span className="opacity-60">(optional)</span></label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-500 pointer-events-none text-xs">📣</span>
                <input
                  type="text"
                  value={maintenanceMessage}
                  onChange={(e) => setMaintenanceMessage(e.target.value)}
                  className={`${inputClass} pl-9`}
                  placeholder="Shown to users while the system is in maintenance"
                />
              </div>
            </div>
          </div>

          {/* PROFILING DEFAULTS */}
          <div className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xs p-6 space-y-5">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-amber-400 border-b border-border pb-3">Profiling &amp; Analytics Defaults</h2>

            <div>
              <label className={labelClass}>Default Ancestry Strain Classification</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-500 pointer-events-none text-xs">🧬</span>
                <select value={defaultStrain} onChange={(e) => setDefaultStrain(e.target.value)} className={`${inputClass} pl-9 cursor-pointer`}>
                  <option value="Sweater">Sweater</option>
                  <option value="Brood">Brood</option>
                  <option value="Classic">Classic</option>
                  <option value="Hybrid">Hybrid</option>
                </select>
              </div>
            </div>
          </div>

          {/* USER MANAGEMENT */}
          <div className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xs p-6 space-y-5">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-amber-400 border-b border-border pb-3">User Management</h2>

            <label className="bg-muted/25 border border-border hover:border-amber-500/40 rounded-xl p-4 flex items-center justify-between gap-4 cursor-pointer transition-all">
              <div>
                <span className="block text-xs font-extrabold text-card-foreground">Allow New Registrations</span>
                <span className="text-[11px] text-muted-foreground font-medium block">Enable or disable new farm owner sign-ups</span>
              </div>
              <input type="checkbox" checked={allowRegistrations} onChange={(e) => setAllowRegistrations(e.target.checked)} className="w-5 h-5 accent-amber-500 rounded cursor-pointer shrink-0" />
            </label>

            <label className="bg-muted/25 border border-border hover:border-amber-500/40 rounded-xl p-4 flex items-center justify-between gap-4 cursor-pointer transition-all">
              <div>
                <span className="block text-xs font-extrabold text-card-foreground">Auto-Approve New Users</span>
                <span className="text-[11px] text-muted-foreground font-medium block">Newly registered accounts are immediately active</span>
              </div>
              <input type="checkbox" checked={autoApproveUsers} onChange={(e) => setAutoApproveUsers(e.target.checked)} className="w-5 h-5 accent-amber-500 rounded cursor-pointer shrink-0" />
            </label>

            <label className="bg-muted/25 border border-border hover:border-amber-500/40 rounded-xl p-4 flex items-center justify-between gap-4 cursor-pointer transition-all">
              <div>
                <span className="block text-xs font-extrabold text-card-foreground">Show Fowl Data in Public View</span>
                <span className="text-[11px] text-muted-foreground font-medium block">Allow farm owners to see other users' fowl records</span>
              </div>
              <input type="checkbox" checked={publicFowlData} onChange={(e) => setPublicFowlData(e.target.checked)} className="w-5 h-5 accent-amber-500 rounded cursor-pointer shrink-0" />
            </label>

            <div>
              <label className={labelClass}>Default New User Role</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-500 pointer-events-none text-xs">👤</span>
                <select value={defaultUserRole} onChange={(e) => setDefaultUserRole(e.target.value)} className={`${inputClass} pl-9 cursor-pointer`}>
                  <option value="owner">Farm Owner</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECURE BEHAVIORS */}
          <div className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xs p-6 space-y-5">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-amber-400 border-b border-border pb-3">Secure Cloud Behaviors</h2>

            <label className="bg-muted/25 border border-border hover:border-amber-500/40 rounded-xl p-4 flex items-center justify-between gap-4 cursor-pointer transition-all">
              <div>
                <span className="block text-xs font-extrabold text-card-foreground">Real-time Cloud Auditing Logs</span>
                <span className="text-[11px] text-muted-foreground font-medium block">Record transaction updates to cluster node registries</span>
              </div>
              <input type="checkbox" checked={cloudLogs} onChange={(e) => setCloudLogs(e.target.checked)} className="w-5 h-5 accent-amber-500 rounded cursor-pointer shrink-0" />
            </label>

            <label className="bg-muted/25 border border-border hover:border-amber-500/40 rounded-xl p-4 flex items-center justify-between gap-4 cursor-pointer transition-all">
              <div>
                <span className="block text-xs font-extrabold text-card-foreground">System Event Pop-up Alerts</span>
                <span className="text-[11px] text-muted-foreground font-medium block">Enable dynamic pop-up notification frames</span>
              </div>
              <input type="checkbox" checked={eventAlerts} onChange={(e) => setEventAlerts(e.target.checked)} className="w-5 h-5 accent-amber-500 rounded cursor-pointer shrink-0" />
            </label>
          </div>

          {/* DATA TRANSFER */}
          <div className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xs p-6 space-y-5">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-amber-400 border-b border-border pb-3">Data Transfer</h2>
            <p className="text-[11px] text-muted-foreground font-medium">
              Transfer all fowl and match data from this admin account to a farm owner account. This moves your encoded chickens to the farm owner dashboard.
            </p>

            <div>
              <label className={labelClass}>Target Farm Owner Email</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-500 pointer-events-none text-xs">📧</span>
                <input
                  type="email"
                  value={transferEmail}
                  onChange={(e) => setTransferEmail(e.target.value)}
                  className={`${inputClass} pl-9`}
                  placeholder="e.g., hazeldato-on@isufst.edu.ph"
                />
              </div>
            </div>

            {transferResult && (
              <div className={`text-xs font-bold p-3 rounded-xl border ${
                transferResult.type === 'success'
                  ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30'
                  : 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30'
              }`}>
                {transferResult.text}
              </div>
            )}

            <button
              type="button"
              onClick={handleTransferData}
              disabled={transferring || !transferEmail.trim()}
              className="w-full text-[11px] font-black uppercase tracking-wider px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-400 hover:to-purple-500 text-white shadow-md shadow-purple-500/30 transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {transferring && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
              {transferring ? 'Transferring...' : 'Transfer Data to Farm Owner'}
            </button>
          </div>

        </form>

        <p className="mt-4 text-center text-[9px] font-mono text-muted-foreground tracking-widest uppercase">
          Admin-only settings panel
        </p>
        </div>
    </div>
  );
}