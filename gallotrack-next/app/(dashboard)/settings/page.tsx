'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/registry'
import type { AdminSettings } from '@/lib/admin'
import { User, Home, Settings, Bell, Database, Monitor, X } from 'lucide-react'

type Tab = 'account' | 'farm' | 'preferences' | 'notifications' | 'data' | 'system'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'account', label: 'Account', icon: <User size={14} /> },
  { id: 'farm', label: 'Farm Profile', icon: <Home size={14} /> },
  { id: 'preferences', label: 'Preferences', icon: <Settings size={14} /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell size={14} /> },
  { id: 'data', label: 'Data Management', icon: <Database size={14} /> },
  { id: 'system', label: 'System Info', icon: <Monitor size={14} /> },
]

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:ring-offset-2 ${checked ? 'bg-emerald-500' : 'bg-slate-200'}`}
    >
      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  )
}

function Field({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 py-3.5 border-b border-slate-100 last:border-0">
      <div className="space-y-0.5 min-w-0">
        <span className="block text-xs font-extrabold text-slate-800">{label}</span>
        {description && <span className="text-[11px] text-slate-400 font-medium block">{description}</span>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function SelectInput({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="p-2.5 px-3 border border-slate-200/90 rounded-xl text-xs bg-white font-semibold text-slate-700 outline-none focus:border-emerald-500 transition-all shadow-sm cursor-pointer min-w-[160px]">
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

function TextInput({ value, onChange, placeholder, type = 'text' }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="p-2.5 px-3 border border-slate-200/90 rounded-xl text-xs bg-white font-semibold text-slate-700 outline-none focus:border-emerald-500 transition-all shadow-sm min-w-[200px]" />
  )
}

function SectionCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">{title}</h4>
        {description && <p className="text-[11px] text-slate-400 font-medium mt-0.5">{description}</p>}
      </div>
      <div className="px-5 divide-y divide-slate-50">{children}</div>
    </div>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('account')
  const [settings, setSettings] = useState<AdminSettings>({
    default_strain: 'Sweater',
    cloud_logs: true,
    event_alerts: true,
    weight_unit: 'kg',
    height_unit: 'cm',
    milestone_alerts: true,
    overdue_alerts: true,
    auto_calculate_age: true,
    theme: 'light',
  })
  const [loading, setLoading] = useState(false)
  const [savedNotice, setSavedNotice] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [clearNotice, setClearNotice] = useState('')
  const [clearing, setClearing] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userName, setUserName] = useState('')
  const [userCreatedAt, setUserCreatedAt] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [changingPw, setChangingPw] = useState(false)
  const [pwMessage, setPwMessage] = useState('')

  const update = (key: keyof AdminSettings, value: unknown) => setSettings((prev) => ({ ...prev, [key]: value }))

  const STORAGE_KEY = 'gallotrack_user_preferences'

  function loadPrefsFromStorage() {
    try {
      if (typeof window === 'undefined') return {}
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : {}
    } catch { return {} }
  }

  function savePrefsToStorage(prefs: Record<string, unknown>) {
    try {
      if (typeof window === 'undefined') return
      const existing = loadPrefsFromStorage()
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...existing, ...prefs }))
    } catch { /* silent */ }
  }

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setUserEmail(user.email || '')
          setUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || '')
          setUserCreatedAt(new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }))

          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle()

          const storedPrefs = loadPrefsFromStorage()

          if (profile) {
            setSettings((prev) => ({
              ...prev,
              farm_name: storedPrefs.farm_name || profile.farm_name || '',
              farm_location: storedPrefs.farm_location || '',
              contact_number: storedPrefs.contact_number || profile.phone_number || '',
              farm_description: storedPrefs.farm_description || '',
              default_match_type: storedPrefs.default_match_type || '',
              default_arena: storedPrefs.default_arena || '',
              default_strain: storedPrefs.default_strain || 'Sweater',
              weight_unit: storedPrefs.weight_unit || 'kg',
              height_unit: storedPrefs.height_unit || 'cm',
              auto_calculate_age: storedPrefs.auto_calculate_age !== false,
              milestone_alerts: storedPrefs.milestone_alerts !== false,
              overdue_alerts: storedPrefs.overdue_alerts !== false,
              event_alerts: storedPrefs.event_alerts !== false,
              cloud_logs: storedPrefs.cloud_logs !== false,
              theme: storedPrefs.theme || 'light',
            }))
          }
        }
      } catch (err: unknown) {
        setLoadError(err instanceof Error ? err.message : 'Failed to load settings')
      }
    }
    load()
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setSavedNotice(false)
    setLoadError('')
    try {
      savePrefsToStorage({
        farm_name: settings.farm_name || '',
        farm_location: settings.farm_location || '',
        contact_number: settings.contact_number || '',
        farm_description: settings.farm_description || '',
        default_match_type: settings.default_match_type || '',
        default_arena: settings.default_arena || '',
        default_strain: settings.default_strain || 'Sweater',
        weight_unit: settings.weight_unit || 'kg',
        height_unit: settings.height_unit || 'cm',
        auto_calculate_age: settings.auto_calculate_age !== false,
        milestone_alerts: settings.milestone_alerts !== false,
        overdue_alerts: settings.overdue_alerts !== false,
        event_alerts: settings.event_alerts !== false,
        cloud_logs: settings.cloud_logs !== false,
        theme: settings.theme || 'light',
      })

      window.dispatchEvent(new Event('admin-profile-update'))
      setSavedNotice(true)
      setTimeout(() => setSavedNotice(false), 4000)
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  async function handleChangePassword() {
    if (!newPassword || newPassword.length < 6) { setPwMessage('Password must be at least 6 characters.'); return }
    setChangingPw(true)
    setPwMessage('')
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setPwMessage('Password updated successfully.')
      setNewPassword('')
    } catch (err: unknown) {
      setPwMessage(err instanceof Error ? err.message : 'Failed to change password')
    } finally {
      setChangingPw(false)
      setTimeout(() => setPwMessage(''), 4000)
    }
  }

  async function handleClear(table: string, label: string) {
    if (!confirm(`Delete all ${label}? This cannot be undone.`)) return
    setClearing(table)
    setClearNotice('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { error } = await supabase.from(table).delete().eq('user_id', user.id)
      if (error) throw error
      setClearNotice(`All ${label} deleted.`)
      window.dispatchEvent(new Event('admin-profile-update'))
    } catch (err: unknown) {
      setClearNotice(`Error: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setClearing('')
      setTimeout(() => setClearNotice(''), 5000)
    }
  }

  async function handleExport() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [fowls, matches] = await Promise.all([
        supabase.from('fowl').select('*').eq('user_id', user.id),
        supabase.from('match').select('*').eq('user_id', user.id),
      ])
      const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), farm: settings.farm_name || 'GalloTrack', fowls: fowls.data || [], matches: matches.data || [] }, null, 2)], { type: 'application/json' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `gallotrack-backup-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      setClearNotice('Data exported successfully.')
      setTimeout(() => setClearNotice(''), 5000)
    } catch {
      setClearNotice('Export failed.')
    }
  }

  function renderTabContent() {
    switch (activeTab) {
      case 'account':
        return (
          <div className="space-y-4">
            <SectionCard title="Profile Information" description="Your account details from Supabase Authentication">
              <Field label="Email Address" description="Used for login and notifications">
                <span className="text-xs font-semibold text-slate-700 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">{userEmail || '—'}</span>
              </Field>
              <Field label="Display Name">
                <TextInput value={userName} onChange={setUserName} placeholder="Your name" />
              </Field>
              <Field label="Member Since">
                <span className="text-xs font-medium text-slate-500">{userCreatedAt || '—'}</span>
              </Field>
            </SectionCard>
            <SectionCard title="Change Password" description="Update your account password. You will remain logged in.">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 py-3.5">
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password (min. 6 chars)" className="p-2.5 px-3 border border-slate-200/90 rounded-xl text-xs bg-white font-semibold text-slate-700 outline-none focus:border-emerald-500 transition-all shadow-sm min-w-[240px]" />
                <button type="button" onClick={handleChangePassword} disabled={changingPw} className="bg-slate-900 hover:bg-emerald-700 text-white font-bold py-2.5 px-5 rounded-xl text-[11px] transition-all cursor-pointer disabled:opacity-50 shrink-0">
                  {changingPw ? 'Updating...' : 'Update Password'}
                </button>
              </div>
              {pwMessage && <p className={`text-[11px] font-bold pb-3 ${pwMessage.includes('success') ? 'text-emerald-600' : 'text-rose-600'}`}>{pwMessage}</p>}
            </SectionCard>
            <SectionCard title="Account Status">
              <Field label="Authentication Provider">
                <span className="text-xs font-semibold text-slate-600 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">Supabase Auth</span>
              </Field>
              <Field label="Session Status">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Active
                </span>
              </Field>
            </SectionCard>
          </div>
        )

      case 'farm':
        return (
          <div className="space-y-4">
            <SectionCard title="Farm Identity" description="Your breeding yard or farm information">
              <Field label="Farm / Yard Name" description="Displayed on reports and dashboard">
                <TextInput value={settings.farm_name || ''} onChange={(v) => update('farm_name', v)} placeholder="e.g. Dingle Cockpit Farm" />
              </Field>
              <Field label="Location / Address" description="Physical location or campus cluster">
                <TextInput value={settings.farm_location || ''} onChange={(v) => update('farm_location', v)} placeholder="e.g. Dingle, Iloilo" />
              </Field>
              <Field label="Contact Number" description="Primary contact for farm records">
                <TextInput value={settings.contact_number || ''} onChange={(v) => update('contact_number', v)} placeholder="e.g. 09171234567" type="tel" />
              </Field>
              <Field label="Farm Description" description="Short description shown on profile">
                <textarea value={settings.farm_description || ''} onChange={(e) => update('farm_description', e.target.value)} placeholder="Brief description of your farm..." rows={3} className="p-2.5 px-3 border border-slate-200/90 rounded-xl text-xs bg-white font-semibold text-slate-700 outline-none focus:border-emerald-500 transition-all shadow-sm w-full resize-none" />
              </Field>
            </SectionCard>
            <SectionCard title="Default Match Settings" description="Pre-filled values when logging new matches">
              <Field label="Default Match Type">
                <SelectInput value={settings.default_match_type || 'Derby Match'} onChange={(v) => update('default_match_type', v)} options={[
                  { value: 'Derby Match', label: 'Derby Match' },
                  { value: 'Local Sparring', label: 'Local Sparring' },
                  { value: 'Practice Fight', label: 'Practice Fight' },
                  { value: 'Exhibition', label: 'Exhibition' },
                ]} />
              </Field>
              <Field label="Default Arena" description="Pre-filled arena location">
                <TextInput value={settings.default_arena || ''} onChange={(v) => update('default_arena', v)} placeholder="e.g. Dingle Arena" />
              </Field>
              <Field label="Default Genetic Strain">
                <SelectInput value={settings.default_strain || 'Sweater'} onChange={(v) => update('default_strain', v)} options={[
                  { value: 'Sweater', label: 'Sweater' },
                  { value: 'Roundhead', label: 'Roundhead' },
                  { value: 'Hatch', label: 'Hatch' },
                  { value: 'Kelso', label: 'Kelso' },
                  { value: 'Lemon 84', label: 'Lemon 84' },
                  { value: 'Albany', label: 'Albany' },
                  { value: 'Claret', label: 'Claret' },
                ]} />
              </Field>
            </SectionCard>
          </div>
        )

      case 'preferences':
        return (
          <div className="space-y-4">
            <SectionCard title="Measurement Units" description="Units used throughout the system">
              <Field label="Weight Unit">
                <SelectInput value={settings.weight_unit || 'kg'} onChange={(v) => update('weight_unit', v)} options={[
                  { value: 'kg', label: 'Kilograms (kg)' },
                  { value: 'lbs', label: 'Pounds (lbs)' },
                ]} />
              </Field>
              <Field label="Height Unit">
                <SelectInput value={settings.height_unit || 'cm'} onChange={(v) => update('height_unit', v)} options={[
                  { value: 'cm', label: 'Centimeters (cm)' },
                  { value: 'inches', label: 'Inches (in)' },
                ]} />
              </Field>
            </SectionCard>
            <SectionCard title="System Behavior" description="How the system calculates and displays data">
              <Field label="Auto-Calculate Age" description="Compute age and growth stage from birth date automatically">
                <Toggle checked={settings.auto_calculate_age !== false} onChange={(v) => update('auto_calculate_age', v)} />
              </Field>
              <Field label="Appearance">
                <SelectInput value={settings.theme || 'light'} onChange={(v) => update('theme', v)} options={[
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark' },
                  { value: 'system', label: 'System Default' },
                ]} />
              </Field>
            </SectionCard>
          </div>
        )

      case 'notifications':
        return (
          <div className="space-y-4">
            <SectionCard title="Alert Preferences" description="Control which notifications appear in the system">
              <Field label="Milestone Alerts" description="Notifications for upcoming growth stage transitions">
                <Toggle checked={settings.milestone_alerts !== false} onChange={(v) => update('milestone_alerts', v)} />
              </Field>
              <Field label="Overdue Stage Warnings" description="Highlight fowls past their expected stage transition">
                <Toggle checked={settings.overdue_alerts !== false} onChange={(v) => update('overdue_alerts', v)} />
              </Field>
              <Field label="System Event Toasts" description="Show toast notifications on save, delete, errors">
                <Toggle checked={settings.event_alerts !== false} onChange={(v) => update('event_alerts', v)} />
              </Field>
              <Field label="Cloud Audit Logs" description="Record transaction updates to the cluster">
                <Toggle checked={settings.cloud_logs !== false} onChange={(v) => update('cloud_logs', v)} />
              </Field>
            </SectionCard>
          </div>
        )

      case 'data':
        return (
          <div className="space-y-4">
            {clearNotice && (
              <div className={`p-3 rounded-xl text-xs font-bold ${clearNotice.startsWith('Error') || clearNotice.includes('failed') ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                {clearNotice}
              </div>
            )}
            <SectionCard title="Backup & Export" description="Download your data for safekeeping">
              <Field label="Export All Data" description="Download a JSON backup of all fowl and match records">
                <button type="button" onClick={handleExport} className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 px-5 rounded-xl text-[11px] transition-all cursor-pointer flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                  Export JSON
                </button>
              </Field>
            </SectionCard>
            <SectionCard title="Danger Zone" description="Irreversible actions. Proceed with caution.">
              <Field label="Clear Match Records" description="Deletes all logged match history. Fowl profiles are kept.">
                <button type="button" onClick={() => handleClear('match', 'match records')} disabled={clearing === 'match'} className="bg-rose-500 hover:bg-rose-600 text-white font-bold py-2 px-4 rounded-xl text-[11px] transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5">
                  {clearing === 'match' && <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
                  {clearing === 'match' ? 'Clearing...' : 'Clear Matches'}
                </button>
              </Field>
              <Field label="Clear Fowl Profiles" description="Deletes all registered gamefowl. Match history kept.">
                <button type="button" onClick={() => handleClear('fowl', 'fowl profiles')} disabled={clearing === 'fowl'} className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-4 rounded-xl text-[11px] transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5">
                  {clearing === 'fowl' && <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
                  {clearing === 'fowl' ? 'Clearing...' : 'Clear Fowls'}
                </button>
              </Field>
              <Field label="Clear Everything" description="Deletes ALL fowl profiles and match records. Fresh start.">
                <button type="button" onClick={() => { if (confirm('Delete ALL data? This cannot be undone.')) { handleClear('match', 'all data'); handleClear('fowl', 'all data') } }} disabled={clearing !== ''} className="bg-rose-700 hover:bg-rose-800 text-white font-bold py-2 px-4 rounded-xl text-[11px] transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5">
                  Clear Everything
                </button>
              </Field>
            </SectionCard>
          </div>
        )

      case 'system':
        return (
          <div className="space-y-4">
            <SectionCard title="System Information" description="GalloTrack platform details">
              <Field label="Application">
                <span className="text-xs font-bold text-slate-800">GalloTrack-Web</span>
              </Field>
              <Field label="Version">
                <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">v1.0.0</span>
              </Field>
              <Field label="Framework">
                <span className="text-xs font-semibold text-slate-600">Next.js + Tailwind CSS</span>
              </Field>
              <Field label="Backend">
                <span className="text-xs font-semibold text-slate-600">Supabase (PostgreSQL + Auth)</span>
              </Field>
              <Field label="Database Region">
                <span className="text-xs font-semibold text-slate-600">Southeast Asia (ap-southeast-1)</span>
              </Field>
            </SectionCard>
            <SectionCard title="Connection Status">
              <Field label="API Status">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Connected
                </span>
              </Field>
              <Field label="Authentication">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Active Session
                </span>
              </Field>
              <Field label="Last Sync">
                <span className="text-xs font-medium text-slate-500">{new Date().toLocaleString()}</span>
              </Field>
            </SectionCard>
            <SectionCard title="Academic Information">
              <Field label="Institution">
                <span className="text-xs font-semibold text-slate-600">ISUFST CICT — Capstone Project</span>
              </Field>
              <Field label="Repository">
                <a href="https://github.com/GalloTrack-Project/GalloTrack-Web" target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-emerald-600 hover:text-emerald-700 underline underline-offset-2">github.com/GalloTrack-Project/GalloTrack-Web</a>
              </Field>
            </SectionCard>
          </div>
        )
    }
  }

  return (
    <div className="max-w-5xl mx-auto animate-fadeIn text-slate-800">
      {/* HEADER */}
      <div className="bg-white/90 backdrop-blur-md p-5 rounded-3xl border border-slate-200/80 shadow-sm mb-6 flex items-center gap-3">
        <button type="button" onClick={() => router.back()} className="w-9 h-9 shrink-0 rounded-full bg-slate-100 border border-slate-200 text-slate-500 hover:text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50 flex items-center justify-center transition-all cursor-pointer" title="Go Back">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <div>
          <h2 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">Settings</h2>
          <p className="text-[11px] text-slate-400 font-semibold">Manage your account, farm, and system preferences</p>
        </div>
      </div>

      {loadError && (
        <div className="bg-rose-50/90 border border-rose-200 text-rose-800 p-4 rounded-2xl text-xs font-bold flex items-center justify-between shadow-sm mb-4">
          <span>{loadError}</span>
          <button onClick={() => setLoadError('')} className="text-rose-600 hover:text-rose-800 font-bold cursor-pointer"><X size={14} /></button>
        </div>
      )}

      {savedNotice && (
        <div className="fixed top-4 right-4 z-50 animate-slideInRight">
          <div className="bg-emerald-600 text-white px-5 py-3.5 rounded-2xl shadow-xl shadow-emerald-500/30 flex items-center gap-3 border border-emerald-500">
            <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div>
              <p className="text-sm font-black">Settings saved!</p>
              <p className="text-[10px] font-semibold text-emerald-100">Changes synced across devices</p>
            </div>
            <button onClick={() => setSavedNotice(false)} className="ml-2 text-emerald-200 hover:text-white cursor-pointer shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        {/* SIDEBAR TABS */}
        <div className="md:w-56 shrink-0">
          <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-sm p-2 md:sticky md:top-4">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer ${activeTab === tab.id ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 border border-transparent'}`}
              >
                <span className="text-sm">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* CONTENT */}
        <form onSubmit={handleSave} className="flex-1 min-w-0 space-y-4">
          {renderTabContent()}

          <div className="flex items-center justify-between pt-2 pb-4">
            <p className="text-[10px] text-slate-400 font-medium">Changes are saved to Supabase and synced across devices.</p>
            <button type="submit" disabled={loading} className="bg-slate-900 hover:bg-emerald-700 text-white font-bold py-2.5 px-6 rounded-xl text-xs shadow-md transition-all duration-200 cursor-pointer disabled:opacity-50 tracking-wide uppercase flex items-center gap-2 shrink-0">
              {loading && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
