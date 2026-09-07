'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/registry'
import { fetchSystemSettings, updateSystemSettings, type AdminSettings } from '@/lib/admin'

function SettingToggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/50 flex justify-between items-center gap-4 hover:bg-slate-50 transition-all cursor-pointer">
      <div className="space-y-0.5">
        <span className="block text-xs font-extrabold text-slate-800">{label}</span>
        <span className="text-[11px] text-slate-400 font-medium block">{description}</span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:ring-offset-2 ${checked ? 'bg-emerald-500' : 'bg-slate-200'}`}
      >
        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </label>
  )
}

function SettingSelect({ label, description, value, onChange, options }: { label: string; description: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/50 flex flex-col sm:flex-row justify-between sm:items-center gap-3 hover:bg-slate-50 transition-all">
      <div className="space-y-0.5">
        <span className="block text-xs font-extrabold text-slate-800">{label}</span>
        <span className="text-[11px] text-slate-400 font-medium block">{description}</span>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="p-2.5 px-3 border border-slate-200/90 rounded-xl text-xs bg-white font-extrabold text-slate-700 outline-none focus:border-emerald-500 transition-all shadow-sm cursor-pointer min-w-[140px]"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function SettingInput({ label, description, value, onChange, placeholder, type = 'text' }: { label: string; description: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/50 flex flex-col sm:flex-row justify-between sm:items-center gap-3 hover:bg-slate-50 transition-all">
      <div className="space-y-0.5">
        <span className="block text-xs font-extrabold text-slate-800">{label}</span>
        <span className="text-[11px] text-slate-400 font-medium block">{description}</span>
      </div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="p-2.5 px-3 border border-slate-200/90 rounded-xl text-xs bg-white font-semibold text-slate-700 outline-none focus:border-emerald-500 transition-all shadow-sm min-w-[200px]"
      />
    </div>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const [settings, setSettings] = useState<AdminSettings>({
    default_strain: 'Sweater',
    cloud_logs: true,
    event_alerts: true,
    weight_unit: 'kg',
    height_unit: 'cm',
    milestone_alerts: true,
    overdue_alerts: true,
    auto_calculate_age: true,
  })
  const [loading, setLoading] = useState(false)
  const [savedNotice, setSavedNotice] = useState(false)
  const [loadError, setLoadError] = useState('')

  const [clearingMatches, setClearingMatches] = useState(false)
  const [clearingFowls, setClearingFowls] = useState(false)
  const [clearingAll, setClearingAll] = useState(false)
  const [clearNotice, setClearNotice] = useState('')

  const update = (key: keyof AdminSettings, value: unknown) => setSettings((prev) => ({ ...prev, [key]: value }))

  useEffect(() => {
    async function load() {
      try {
        const s = await fetchSystemSettings()
        setSettings((prev) => ({ ...prev, ...s }))
      } catch (err: unknown) {
        setLoadError(err instanceof Error ? err.message : 'Failed to load settings')
      }
    }
    load()
  }, [])

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setSavedNotice(false)
    try {
      await updateSystemSettings(settings)
      setSavedNotice(true)
      setTimeout(() => setSavedNotice(false), 4000)
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setLoading(false)
    }
  }

  async function handleClearMatches() {
    setClearingMatches(true)
    setClearNotice('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setClearNotice('Not authenticated.'); return }
      const { error } = await supabase.from('match').delete().eq('user_id', user.id)
      if (error) throw error
      setClearNotice('All match records deleted successfully.')
      window.dispatchEvent(new Event('admin-profile-update'))
    } catch (err: unknown) {
      setClearNotice(`Error: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setClearingMatches(false)
      setTimeout(() => setClearNotice(''), 5000)
    }
  }

  async function handleClearFowls() {
    setClearingFowls(true)
    setClearNotice('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setClearNotice('Not authenticated.'); return }
      const { error } = await supabase.from('fowl').delete().eq('user_id', user.id)
      if (error) throw error
      setClearNotice('All fowl records deleted successfully.')
      window.dispatchEvent(new Event('admin-profile-update'))
    } catch (err: unknown) {
      setClearNotice(`Error: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setClearingFowls(false)
      setTimeout(() => setClearNotice(''), 5000)
    }
  }

  async function handleClearAll() {
    if (!confirm('Are you sure you want to delete ALL your fowl and match records? This cannot be undone.')) return
    setClearingAll(true)
    setClearNotice('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setClearNotice('Not authenticated.'); return }
      const { error: matchErr } = await supabase.from('match').delete().eq('user_id', user.id)
      if (matchErr) throw matchErr
      const { error: fowlErr } = await supabase.from('fowl').delete().eq('user_id', user.id)
      if (fowlErr) throw fowlErr
      setClearNotice('All fowl and match records deleted. Dashboard is now clean.')
      window.dispatchEvent(new Event('admin-profile-update'))
    } catch (err: unknown) {
      setClearNotice(`Error: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setClearingAll(false)
      setTimeout(() => setClearNotice(''), 5000)
    }
  }

  async function handleExportData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [fowlsRes, matchesRes] = await Promise.all([
        supabase.from('fowl').select('*').eq('user_id', user.id),
        supabase.from('match').select('*').eq('user_id', user.id),
      ])
      const exportData = {
        exported_at: new Date().toISOString(),
        farm: settings.farm_name || 'GalloTrack',
        fowls: fowlsRes.data || [],
        matches: matchesRes.data || [],
      }
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `gallotrack-backup-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      setClearNotice('Data exported successfully as JSON file.')
      setTimeout(() => setClearNotice(''), 5000)
    } catch (err: unknown) {
      setClearNotice(`Export failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn text-slate-800">
      {/* HEADER */}
      <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-9 h-9 shrink-0 rounded-full bg-slate-100 border border-slate-200 text-slate-500 hover:text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50 flex items-center justify-center transition-all cursor-pointer"
            title="Go Back"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">System Settings</h2>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">Configure your farm, preferences, and system behavior</p>
          </div>
        </div>
        <span className="text-[10px] font-mono font-black text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200/60 uppercase self-start sm:self-auto shadow-sm">
          ● Config Synchronized
        </span>
      </div>

      {loadError && (
        <div className="bg-rose-50/90 border border-rose-200 text-rose-800 p-4 rounded-2xl text-xs font-bold flex items-center justify-between shadow-sm animate-fadeIn">
          <span>{loadError}</span>
          <button onClick={() => setLoadError('')} className="text-rose-600 hover:text-rose-800 font-bold cursor-pointer">✕</button>
        </div>
      )}

      {savedNotice && (
        <div className="bg-emerald-50/90 border border-emerald-200 text-emerald-800 p-4 rounded-2xl text-xs font-bold flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="flex items-center space-x-2">
            <span className="text-base">✓</span>
            <span>Settings saved successfully.</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-mono">SAVED</span>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-6">

        {/* SECTION 1: FARM IDENTITY */}
        <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
          <h3 className="text-xs font-black text-emerald-700 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center space-x-2">
            <span>🏡</span> <span>Farm Identity</span>
          </h3>
          <SettingInput
            label="Farm / Yard Name"
            description="Your farm or breeding yard name shown across the system"
            value={settings.farm_name || ''}
            onChange={(v) => update('farm_name', v)}
            placeholder="e.g. Dingle Cockpit Farm"
          />
          <SettingInput
            label="Hub Location"
            description="Physical location or campus cluster reference"
            value={settings.farm_location || ''}
            onChange={(v) => update('farm_location', v)}
            placeholder="e.g. Dingle, Iloilo"
          />
          <SettingInput
            label="Contact Number"
            description="Primary contact number for farm records"
            value={settings.contact_number || ''}
            onChange={(v) => update('contact_number', v)}
            placeholder="e.g. 09171234567"
            type="tel"
          />
        </div>

        {/* SECTION 2: MATCH DEFAULTS */}
        <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
          <h3 className="text-xs font-black text-emerald-700 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center space-x-2">
            <span>⚔️</span> <span>Match Defaults</span>
          </h3>
          <SettingSelect
            label="Default Match Type"
            description="Pre-selected type when logging new match records"
            value={settings.default_match_type || 'Derby Match'}
            onChange={(v) => update('default_match_type', v)}
            options={[
              { value: 'Derby Match', label: 'Derby Match' },
              { value: 'Local Sparring', label: 'Local Sparring' },
              { value: 'Practice Fight', label: 'Practice Fight' },
              { value: 'Exhibition', label: 'Exhibition' },
            ]}
          />
          <SettingInput
            label="Default Arena / Location"
            description="Pre-filled arena location when logging matches"
            value={settings.default_arena || ''}
            onChange={(v) => update('default_arena', v)}
            placeholder="e.g. Dingle Arena"
          />
          <SettingSelect
            label="Default Genetic Strain"
            description="Pre-selected strain in the profiling encoder"
            value={settings.default_strain || 'Sweater'}
            onChange={(v) => update('default_strain', v)}
            options={[
              { value: 'Sweater', label: 'Sweater' },
              { value: 'Roundhead', label: 'Roundhead' },
              { value: 'Hatch', label: 'Hatch' },
              { value: 'Kelso', label: 'Kelso' },
              { value: 'Lemon 84', label: 'Lemon 84' },
              { value: 'Albany', label: 'Albany' },
              { value: 'Claret', label: 'Claret' },
            ]}
          />
        </div>

        {/* SECTION 3: MEASUREMENT UNITS */}
        <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
          <h3 className="text-xs font-black text-emerald-700 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center space-x-2">
            <span>📏</span> <span>Measurement Units</span>
          </h3>
          <SettingSelect
            label="Weight Unit"
            description="Unit used for recording fowl weight"
            value={settings.weight_unit || 'kg'}
            onChange={(v) => update('weight_unit', v)}
            options={[
              { value: 'kg', label: 'Kilograms (kg)' },
              { value: 'lbs', label: 'Pounds (lbs)' },
            ]}
          />
          <SettingSelect
            label="Height Unit"
            description="Unit used for recording fowl height"
            value={settings.height_unit || 'cm'}
            onChange={(v) => update('height_unit', v)}
            options={[
              { value: 'cm', label: 'Centimeters (cm)' },
              { value: 'inches', label: 'Inches (in)' },
            ]}
          />
        </div>

        {/* SECTION 4: NOTIFICATIONS & BEHAVIOR */}
        <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
          <h3 className="text-xs font-black text-emerald-700 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center space-x-2">
            <span>🔔</span> <span>Notifications &amp; Behavior</span>
          </h3>
          <div className="space-y-3">
            <SettingToggle
              label="Milestone Alerts"
              description="Show notifications for upcoming growth stage transitions"
              checked={settings.milestone_alerts !== false}
              onChange={(v) => update('milestone_alerts', v)}
            />
            <SettingToggle
              label="Overdue Stage Warnings"
              description="Highlight fowls that have passed their expected stage transition date"
              checked={settings.overdue_alerts !== false}
              onChange={(v) => update('overdue_alerts', v)}
            />
            <SettingToggle
              label="Auto-Calculate Age"
              description="Automatically compute age and growth stage from birth date"
              checked={settings.auto_calculate_age !== false}
              onChange={(v) => update('auto_calculate_age', v)}
            />
          </div>
        </div>

        {/* SECTION 5: SECURITY & SYSTEM */}
        <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
          <h3 className="text-xs font-black text-emerald-700 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center space-x-2">
            <span>🛡️</span> <span>Security &amp; System</span>
          </h3>
          <div className="space-y-3">
            <SettingToggle
              label="Cloud Audit Logs"
              description="Record transaction updates to the Supabase cluster"
              checked={settings.cloud_logs !== false}
              onChange={(v) => update('cloud_logs', v)}
            />
            <SettingToggle
              label="System Event Alerts"
              description="Show toast notifications during operations (save, delete, errors)"
              checked={settings.event_alerts !== false}
              onChange={(v) => update('event_alerts', v)}
            />
          </div>
        </div>

        {/* SECTION 6: DATA MANAGEMENT */}
        <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
          <h3 className="text-xs font-black text-rose-600 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center space-x-2">
            <span>🗄️</span> <span>Data Management</span>
          </h3>

          {clearNotice && (
            <div className={`p-3 rounded-xl text-xs font-bold ${clearNotice.startsWith('Error') || clearNotice.startsWith('Export failed') ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
              {clearNotice}
            </div>
          )}

          <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/50 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:bg-slate-50 transition-all">
            <div className="space-y-0.5">
              <span className="block text-xs font-extrabold text-slate-800">Export All Data</span>
              <span className="text-[11px] text-slate-400 font-medium block">Download a JSON backup of all your fowl and match records</span>
            </div>
            <button
              type="button"
              onClick={handleExportData}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-4 rounded-xl text-[11px] transition-all cursor-pointer shrink-0 flex items-center space-x-1.5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
              <span>Export JSON</span>
            </button>
          </div>

          <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/50 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:bg-slate-50 transition-all">
            <div className="space-y-0.5">
              <span className="block text-xs font-extrabold text-slate-800">Clear All Match Records</span>
              <span className="text-[11px] text-slate-400 font-medium block">Deletes all logged match history. Fowl profiles are kept.</span>
            </div>
            <button
              type="button"
              onClick={handleClearMatches}
              disabled={clearingMatches}
              className="bg-rose-500 hover:bg-rose-600 text-white font-bold py-2 px-4 rounded-xl text-[11px] transition-all disabled:opacity-50 cursor-pointer shrink-0 flex items-center space-x-1.5"
            >
              {clearingMatches && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
              <span>{clearingMatches ? 'Clearing...' : 'Clear Matches'}</span>
            </button>
          </div>

          <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/50 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:bg-slate-50 transition-all">
            <div className="space-y-0.5">
              <span className="block text-xs font-extrabold text-slate-800">Clear All Fowl Profiles</span>
              <span className="text-[11px] text-slate-400 font-medium block">Deletes all registered gamefowl. Match history is kept.</span>
            </div>
            <button
              type="button"
              onClick={handleClearFowls}
              disabled={clearingFowls}
              className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-4 rounded-xl text-[11px] transition-all disabled:opacity-50 cursor-pointer shrink-0 flex items-center space-x-1.5"
            >
              {clearingFowls && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
              <span>{clearingFowls ? 'Clearing...' : 'Clear Fowls'}</span>
            </button>
          </div>

          <div className="bg-rose-50/80 p-4 rounded-2xl border border-rose-200/50 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:bg-rose-50 transition-all">
            <div className="space-y-0.5">
              <span className="block text-xs font-extrabold text-rose-800">Clear ALL Data</span>
              <span className="text-[11px] text-rose-400 font-medium block">Deletes all fowl profiles AND match records. Fresh start.</span>
            </div>
            <button
              type="button"
              onClick={handleClearAll}
              disabled={clearingAll}
              className="bg-rose-700 hover:bg-rose-800 text-white font-bold py-2 px-4 rounded-xl text-[11px] transition-all disabled:opacity-50 cursor-pointer shrink-0 flex items-center space-x-1.5"
            >
              {clearingAll && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
              <span>{clearingAll ? 'Clearing...' : 'Clear Everything'}</span>
            </button>
          </div>
        </div>

        {/* SAVE BUTTON */}
        <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-sm">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold py-3.5 px-4 rounded-xl text-xs shadow-md shadow-slate-900/10 transition-all duration-200 cursor-pointer disabled:opacity-50 tracking-wider uppercase flex items-center justify-center space-x-2"
          >
            {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
            <span>{loading ? 'Saving...' : 'Save All Settings'}</span>
          </button>
          <p className="text-center text-[9px] text-slate-400 font-semibold mt-2.5">Settings are stored in Supabase and applied across all your devices.</p>
        </div>

      </form>
    </div>
  )
}
