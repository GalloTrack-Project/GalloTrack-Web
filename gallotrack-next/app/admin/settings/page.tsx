'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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
      });
      setMessage({ type: 'success', text: 'System configuration saved successfully.' });
      window.setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: `Save failed: ${(err as Error).message}` });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center gap-4 bg-[#090d16] text-slate-200">
        <div className="w-10 h-10 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[11px] font-mono tracking-widest uppercase text-slate-400">Loading system configuration...</p>
      </div>
    );
  }

  if (!adminProfile) return null;

  const inputClass =
    'w-full p-3 border border-border rounded-xl text-xs bg-muted/25 focus:bg-card focus:border-emerald-500 transition-all font-semibold outline-none text-card-foreground';
  const labelClass = 'block text-[10px] font-black text-muted-foreground mt-2 uppercase tracking-widest';

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#0a1f1a] via-[#0d2b23] to-[#0a3328] light:from-emerald-50 light:via-slate-50 light:to-teal-50 relative overflow-hidden">
      <div className="absolute top-1/4 -left-20 w-72 h-72 bg-teal-400/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 min-h-screen p-4 sm:p-6 lg:p-8 pb-16 max-w-3xl mx-auto">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-emerald-500/20 border border-emerald-500/40 rounded-xl flex items-center justify-center text-xl shadow-inner">⚙️</div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-card-foreground tracking-tight leading-none">
                SYSTEM <span className="text-emerald-400">SETTINGS</span>
              </h1>
              <p className="text-[9px] font-mono text-muted-foreground font-bold tracking-widest uppercase mt-1">Admin-Controlled Application Configuration</p>
            </div>
          </div>
          <Link
            href="/admin"
            className="text-[11px] font-black uppercase tracking-wider px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-md shadow-emerald-500/30 transition-all cursor-pointer w-fit"
          >
            ← Back to Admin
          </Link>
        </div>

        {message && (
          <div
            className={`mb-4 text-xs font-bold text-center p-3.5 rounded-xl border animate-fadeIn ${
              message.type === 'success'
                ? 'text-emerald-300 light:text-emerald-700 bg-emerald-500/10 border-emerald-500/30'
                : 'text-rose-300 light:text-rose-600 bg-rose-500/10 border-rose-500/30'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* IDENTITY */}
        <div className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xs p-5 mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-xl">🛡️</div>
            <div>
              <p className="text-sm font-extrabold text-card-foreground">{adminProfile.full_name || 'Administrator'}</p>
              <p className="text-[10px] text-muted-foreground font-semibold">{adminProfile.email || ''} · Admin privileged session</p>
            </div>
          </div>
        </div>

        <form id="system-settings-form" onSubmit={handleSave} className="space-y-5 [scroll-behavior:smooth] scroll-pt-24">
          {/* GENERAL */}
          <div className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xs p-6 space-y-5">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-emerald-400 border-b border-border pb-3">General Configuration</h2>

            <div>
              <label className={labelClass}>System Name</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none text-xs">🏷️</span>
                <input type="text" value={systemName} onChange={(e) => setSystemName(e.target.value)} className={`${inputClass} pl-9`} placeholder="e.g., GalloTrack" required />
              </div>
            </div>

            <div>
              <label className={labelClass}>System Status</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none text-xs">🚦</span>
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
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none text-xs">📣</span>
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
            <h2 className="text-[10px] font-black uppercase tracking-widest text-emerald-400 border-b border-border pb-3">Profiling &amp; Analytics Defaults</h2>

            <div>
              <label className={labelClass}>Default Ancestry Strain Classification</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none text-xs">🧬</span>
                <select value={defaultStrain} onChange={(e) => setDefaultStrain(e.target.value)} className={`${inputClass} pl-9 cursor-pointer`}>
                  <option value="Sweater">Sweater</option>
                  <option value="Brood">Brood</option>
                  <option value="Classic">Classic</option>
                  <option value="Hybrid">Hybrid</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECURE BEHAVIORS */}
          <div className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xs p-6 space-y-5">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-emerald-400 border-b border-border pb-3">Secure Cloud Behaviors</h2>

            <label className="bg-muted/25 border border-border hover:border-emerald-500/40 rounded-xl p-4 flex items-center justify-between gap-4 cursor-pointer transition-all">
              <div>
                <span className="block text-xs font-extrabold text-card-foreground">Real-time Cloud Auditing Logs</span>
                <span className="text-[11px] text-muted-foreground font-medium block">Record transaction updates to cluster node registries</span>
              </div>
              <input type="checkbox" checked={cloudLogs} onChange={(e) => setCloudLogs(e.target.checked)} className="w-5 h-5 accent-emerald-500 rounded cursor-pointer shrink-0" />
            </label>

            <label className="bg-muted/25 border border-border hover:border-emerald-500/40 rounded-xl p-4 flex items-center justify-between gap-4 cursor-pointer transition-all">
              <div>
                <span className="block text-xs font-extrabold text-card-foreground">System Event Pop-up Alerts</span>
                <span className="text-[11px] text-muted-foreground font-medium block">Enable dynamic pop-up notification frames</span>
              </div>
              <input type="checkbox" checked={eventAlerts} onChange={(e) => setEventAlerts(e.target.checked)} className="w-5 h-5 accent-emerald-500 rounded cursor-pointer shrink-0" />
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 active:scale-[0.99] text-white font-black py-4 rounded-2xl text-xs tracking-widest shadow-lg shadow-emerald-500/30 transition-all duration-200 cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2.5"
          >
            {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
            {saving ? 'SAVING...' : '💾 COMMIT CONFIGURATION CHANGES'}
          </button>
        </form>

        <p className="mt-4 text-center text-[9px] font-mono text-muted-foreground tracking-widest uppercase">
          ISUFST DINGLE HUB · Admin-only settings panel
        </p>
        </div>
    </div>
  );
}