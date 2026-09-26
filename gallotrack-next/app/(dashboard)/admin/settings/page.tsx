'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { adminGuard, fetchSystemSettings, updateSystemSettings } from '@/lib/admin';
import type { AdminProfileRow, AdminSettings } from '@/lib/admin';
import { Shield, Settings, Bell, Users, ArrowRightLeft, HardDrive, Tag, CircleDot, Megaphone, Dna, User, Mail, Download, FileJson } from 'lucide-react';

type Tab = 'general' | 'alerts' | 'users' | 'transfer' | 'backup';

const defaultSettings: AdminSettings = {
  system_name: 'GalloTrack',
  system_status: 'Operational',
  maintenance_message: '',
  default_strain: 'Sweater',
  cloud_logs: true,
  event_alerts: true,
  allow_registrations: true,
  auto_approve_users: true,
  public_fowl_data: false,
  default_user_role: 'owner',
  default_match_type: '',
  default_arena: '',
  weight_unit: 'kg',
  height_unit: 'cm',
  milestone_alerts: true,
  overdue_alerts: true,
  auto_calculate_age: true,
  theme: 'dark',
};

const inputClass =
  'w-full p-3 border border-border rounded-xl text-xs bg-muted/25 focus:bg-card focus:border-amber-500 transition-all font-semibold outline-none text-card-foreground';
const labelClass = 'block text-[10px] font-black text-muted-foreground mt-2 uppercase tracking-widest';

function ToggleRow({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="bg-muted/25 border border-border hover:border-amber-500/40 rounded-xl p-4 flex items-center justify-between gap-4 cursor-pointer transition-all">
      <div>
        <span className="block text-xs font-extrabold text-card-foreground">{label}</span>
        <span className="text-[11px] text-muted-foreground font-medium block">{desc}</span>
      </div>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="w-5 h-5 accent-amber-500 rounded cursor-pointer shrink-0" />
    </label>
  );
}

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'general', label: 'General', icon: <Settings size={14} /> },
  { id: 'alerts', label: 'Alerts', icon: <Bell size={14} /> },
  { id: 'users', label: 'Users', icon: <Users size={14} /> },
  { id: 'transfer', label: 'Transfer', icon: <ArrowRightLeft size={14} /> },
  { id: 'backup', label: 'Backup', icon: <HardDrive size={14} /> },
];

export default function AdminSettingsPage() {
  const [adminProfile, setAdminProfile] = useState<AdminProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [settings, setSettings] = useState<AdminSettings>(defaultSettings);
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const { setTheme } = useTheme();

  const [transferEmail, setTransferEmail] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [transferResult, setTransferResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [backing, setBacking] = useState(false);
  const [backupResult, setBackupResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const update = useCallback(<K extends keyof AdminSettings>(key: K, value: AdminSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  useEffect(() => {
    (async () => {
      const profile = await adminGuard();
      if (!profile) return;
      setAdminProfile(profile);
      try {
        const s = await fetchSystemSettings();
        setSettings({ ...defaultSettings, ...s });
        setTheme(s.theme || 'dark');
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
      await updateSystemSettings(settings);
      setTheme(settings.theme || 'dark');
      setMessage({ type: 'success', text: 'System configuration saved successfully.' });
      window.setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: `Save failed: ${(err as Error).message}` });
    } finally {
      setSaving(false);
    }
  };

  const handleTransferData = async () => {
    if (!transferEmail.trim()) { setTransferResult({ type: 'error', text: 'Please enter the target farm owner email.' }); return; }
    setTransferring(true);
    setTransferResult(null);
    try {
      const { supabase } = await import('@/lib/registry');
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) { setTransferResult({ type: 'error', text: 'Not authenticated.' }); return; }
      const res = await fetch('/api/admin/transfer-data', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_email: transferEmail.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTransferResult({ type: 'success', text: `Transferred ${data.fowls_transferred} chickens and ${data.matches_transferred} matches to ${transferEmail}` });
        setTransferEmail('');
      } else {
        setTransferResult({ type: 'error', text: data.error || 'Transfer failed' });
      }
    } catch { setTransferResult({ type: 'error', text: 'Network error during transfer.' }); }
    finally { setTransferring(false); }
  };

  const handleExportBackup = async () => {
    setBacking(true);
    setBackupResult(null);
    try {
      const { supabase } = await import('@/lib/registry');
      const [fowlsRes, matchesRes, profilesRes, settingsRes] = await Promise.all([
        supabase.from('fowl').select('*'),
        supabase.from('match').select('*'),
        supabase.from('profiles').select('*'),
        fetchSystemSettings(),
      ]);
      if (fowlsRes.error) throw new Error(`Chickens: ${fowlsRes.error.message}`);
      if (matchesRes.error) throw new Error(`Matches: ${matchesRes.error.message}`);
      if (profilesRes.error) throw new Error(`Profiles: ${profilesRes.error.message}`);
      const backup = {
        export_date: new Date().toISOString(), system_name: 'GalloTrack', version: '1.0.0',
        data: { fowls: fowlsRes.data || [], match_history: matchesRes.data || [], profiles: profilesRes.data || [], system_settings: settingsRes || {} },
        counts: { fowls: (fowlsRes.data || []).length, matches: (matchesRes.data || []).length, profiles: (profilesRes.data || []).length },
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `gallotrack-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      setBackupResult({ type: 'success', text: `Backup exported: ${backup.counts.fowls} chickens, ${backup.counts.matches} matches, ${backup.counts.profiles} profiles.` });
    } catch (err) { setBackupResult({ type: 'error', text: `Export failed: ${(err as Error).message}` }); }
    finally { setBacking(false); }
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

  const renderTab = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>System Name</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-500 pointer-events-none text-xs"><Tag size={14} /></span>
                <input type="text" value={settings.system_name || ''} onChange={(e) => update('system_name', e.target.value)} className={`${inputClass} pl-9`} placeholder="e.g., GalloTrack" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>System Status</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-500 pointer-events-none text-xs"><CircleDot size={14} /></span>
                  <select value={settings.system_status || 'Operational'} onChange={(e) => update('system_status', e.target.value)} className={`${inputClass} pl-9 cursor-pointer`}>
                    <option value="Operational">Operational</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Degraded">Degraded</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass}>Default Strain</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-500 pointer-events-none text-xs"><Dna size={14} /></span>
                  <select value={settings.default_strain || 'Sweater'} onChange={(e) => update('default_strain', e.target.value)} className={`${inputClass} pl-9 cursor-pointer`}>
                    <option value="Sweater">Sweater</option>
                    <option value="Roundhead">Roundhead</option>
                    <option value="Hatch">Hatch</option>
                    <option value="Kelso">Kelso</option>
                    <option value="Lemon 84">Lemon 84</option>
                    <option value="Albany">Albany</option>
                    <option value="Claret">Claret</option>
                    <option value="Brood">Brood</option>
                    <option value="Classic">Classic</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Default Match Type</label>
                <input type="text" value={settings.default_match_type || ''} onChange={(e) => update('default_match_type', e.target.value)} className={inputClass} placeholder="e.g., Derby" />
              </div>
              <div>
                <label className={labelClass}>Default Arena</label>
                <input type="text" value={settings.default_arena || ''} onChange={(e) => update('default_arena', e.target.value)} className={inputClass} placeholder="e.g., Main Arena" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Weight Unit</label>
                <select value={settings.weight_unit || 'kg'} onChange={(e) => update('weight_unit', e.target.value as 'kg' | 'lbs')} className={`${inputClass} cursor-pointer`}>
                  <option value="kg">Kilograms (kg)</option>
                  <option value="lbs">Pounds (lbs)</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Height Unit</label>
                <select value={settings.height_unit || 'cm'} onChange={(e) => update('height_unit', e.target.value as 'cm' | 'inches')} className={`${inputClass} cursor-pointer`}>
                  <option value="cm">Centimeters (cm)</option>
                  <option value="inches">Inches</option>
                </select>
              </div>
            </div>
            <div>
              <label className={labelClass}>Maintenance Message <span className="opacity-60">(optional)</span></label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-500 pointer-events-none text-xs"><Megaphone size={14} /></span>
                <input type="text" value={settings.maintenance_message || ''} onChange={(e) => update('maintenance_message', e.target.value)} className={`${inputClass} pl-9`} placeholder="Shown during maintenance mode" />
              </div>
            </div>
          </div>
        );
      case 'alerts':
        return (
          <div className="space-y-3">
            <ToggleRow label="Milestone Alerts" desc="Notify when chickens reach growth milestones" checked={settings.milestone_alerts !== false} onChange={(v) => update('milestone_alerts', v)} />
            <ToggleRow label="Overdue Alerts" desc="Notify when tasks or checkups are overdue" checked={settings.overdue_alerts !== false} onChange={(v) => update('overdue_alerts', v)} />
            <ToggleRow label="Auto-Calculate Age" desc="Automatically compute chicken age from birthdate" checked={settings.auto_calculate_age !== false} onChange={(v) => update('auto_calculate_age', v)} />
            <ToggleRow label="Cloud Auditing Logs" desc="Record transaction updates to cluster node registries" checked={settings.cloud_logs !== false} onChange={(v) => update('cloud_logs', v)} />
            <ToggleRow label="Event Pop-up Alerts" desc="Enable dynamic pop-up notification frames" checked={settings.event_alerts !== false} onChange={(v) => update('event_alerts', v)} />
          </div>
        );
      case 'users':
        return (
          <div className="space-y-3">
            <ToggleRow label="Allow New Registrations" desc="Enable or disable new farm owner sign-ups" checked={settings.allow_registrations !== false} onChange={(v) => update('allow_registrations', v)} />
            <ToggleRow label="Auto-Approve New Users" desc="Newly registered accounts are immediately active" checked={settings.auto_approve_users !== false} onChange={(v) => update('auto_approve_users', v)} />
            <ToggleRow label="Public Chicken Data" desc="Allow farm owners to see other users' chicken records" checked={settings.public_fowl_data === true} onChange={(v) => update('public_fowl_data', v)} />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Default Role</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-500 pointer-events-none text-xs"><User size={14} /></span>
                  <select value={settings.default_user_role || 'owner'} onChange={(e) => update('default_user_role', e.target.value)} className={`${inputClass} pl-9 cursor-pointer`}>
                    <option value="owner">Farm Owner</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass}>Theme</label>
                <select value={settings.theme || 'dark'} onChange={(e) => update('theme', e.target.value as 'light' | 'dark' | 'system')} className={`${inputClass} cursor-pointer`}>
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                  <option value="system">System</option>
                </select>
              </div>
            </div>
          </div>
        );
      case 'transfer':
        return (
          <div className="space-y-4">
            <p className="text-[11px] text-muted-foreground font-medium">Transfer all chicken and match data from this admin account to a farm owner account.</p>
            <div>
              <label className={labelClass}>Target Farm Owner Email</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-500 pointer-events-none text-xs"><Mail size={14} /></span>
                <input type="email" value={transferEmail} onChange={(e) => setTransferEmail(e.target.value)} className={`${inputClass} pl-9`} placeholder="e.g., owner@example.com" />
              </div>
            </div>
            {transferResult && (
              <div className={`text-xs font-bold p-3 rounded-xl border ${transferResult.type === 'success' ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30' : 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30'}`}>
                {transferResult.text}
              </div>
            )}
            <button type="button" onClick={handleTransferData} disabled={transferring || !transferEmail.trim()}
              className="w-full text-[11px] font-black uppercase tracking-wider px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-400 hover:to-purple-500 text-white shadow-md shadow-purple-500/30 transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2">
              {transferring && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
              {transferring ? 'Transferring...' : 'Transfer Data to Farm Owner'}
            </button>
          </div>
        );
      case 'backup':
        return (
          <div className="space-y-4">
            <p className="text-[11px] text-muted-foreground font-medium">Download a complete JSON backup of all system data.</p>
            {backupResult && (
              <div className={`text-xs font-bold p-3 rounded-xl border ${backupResult.type === 'success' ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30' : 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30'}`}>
                {backupResult.text}
              </div>
            )}
            <button type="button" onClick={handleExportBackup} disabled={backing}
              className="w-full text-[11px] font-black uppercase tracking-wider px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-md shadow-emerald-500/30 transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2">
              {backing && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
              {!backing && <Download size={14} />}
              {backing ? 'Exporting...' : 'Download Full System Backup'}
            </button>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-muted/25 border border-border rounded-xl p-3 text-center">
                <FileJson className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                <p className="text-[9px] font-black text-card-foreground">Chicken Records</p>
                <p className="text-[8px] text-muted-foreground font-semibold">All breeds</p>
              </div>
              <div className="bg-muted/25 border border-border rounded-xl p-3 text-center">
                <FileJson className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                <p className="text-[9px] font-black text-card-foreground">Match History</p>
                <p className="text-[8px] text-muted-foreground font-semibold">All records</p>
              </div>
              <div className="bg-muted/25 border border-border rounded-xl p-3 text-center">
                <FileJson className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                <p className="text-[9px] font-black text-card-foreground">Profiles</p>
                <p className="text-[8px] text-muted-foreground font-semibold">All accounts</p>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen w-full bg-background relative overflow-hidden">
      <div className="absolute top-1/4 -left-20 w-72 h-72 bg-amber-400/5 dark:bg-amber-400/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-amber-400/5 dark:bg-amber-400/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 min-h-screen p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-card-foreground tracking-tight leading-none">
              System <span className="text-amber-400">Settings</span>
            </h1>
            <p className="text-[9px] font-mono text-muted-foreground font-bold tracking-widest uppercase mt-1">Admin-Controlled Application Configuration</p>
          </div>
        </div>

        {message && (
          <div className={`mb-4 text-xs font-bold text-center p-3.5 rounded-xl border animate-fadeIn ${
            message.type === 'success'
              ? 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30'
              : 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30'
          }`}>{message.text}</div>
        )}

        {/* ADMIN IDENTITY */}
        <div className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xs p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center"><Shield size={18} /></div>
              <div>
                <p className="text-sm font-extrabold text-card-foreground">{adminProfile.full_name || 'Administrator'}</p>
                <p className="text-[10px] text-muted-foreground font-semibold">{adminProfile.email || ''} · Admin session</p>
              </div>
            </div>
            <button type="submit" form="system-settings-form" disabled={saving}
              className="text-[10px] font-black uppercase tracking-wider px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white shadow-md shadow-amber-500/30 transition-all cursor-pointer disabled:opacity-60 flex items-center gap-1.5">
              {saving && <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {/* TAB BAR — matches LineageDirectory pattern */}
        <div className="flex items-center gap-1.5 bg-muted/60 p-1.5 rounded-2xl border border-border overflow-x-auto shrink-0 mb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl text-[10px] sm:text-[11px] font-bold transition-all duration-200 whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* TAB CONTENT */}
        <form id="system-settings-form" onSubmit={handleSave} className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xs p-5">
          {renderTab()}
        </form>

        <p className="mt-4 text-center text-[9px] font-mono text-muted-foreground tracking-widest uppercase">
          Admin-only settings panel
        </p>
      </div>
    </div>
  );
}
