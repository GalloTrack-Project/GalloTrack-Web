'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/registry'
import { fetchSystemSettings, updateSystemSettings, type AdminSettings } from '@/lib/admin'

export default function SettingsPage() {
  const [settings, setSettings] = useState<AdminSettings>({
    default_strain: 'Sweater',
    cloud_logs: true,
    event_alerts: true,
  })
  const [loading, setLoading] = useState(false)
  const [savedNotice, setSavedNotice] = useState(false)
  const [loadError, setLoadError] = useState('')

  const [clearingMatches, setClearingMatches] = useState(false)
  const [clearingFowls, setClearingFowls] = useState(false)
  const [clearingAll, setClearingAll] = useState(false)
  const [clearNotice, setClearNotice] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const s = await fetchSystemSettings()
        setSettings(s)
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

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn text-slate-800">
      {/* HEADER CARD */}
      <div className="antigravity-hover bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">System Settings</h2>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Configure global administrative rules, default parameters, and secure cloud behaviors</p>
        </div>
        <span className="antigravity-badge text-[10px] font-mono font-black text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200/60 uppercase self-start sm:self-auto shadow-sm">
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
            <span>GalloTrack System Notice: Global administrative configuration committed successfully.</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-mono">STABLE REVISION</span>
        </div>
      )}

      {/* CONFIGURATION FORM */}
      <form onSubmit={handleSaveSettings} className="antigravity-hover bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
        
        {/* SECTION 1: APPLICATION PREFERENCES */}
        <div className="space-y-4">
          <h3 className="text-xs font-black text-emerald-700 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center space-x-2">
            <span>⚙️</span> <span>Application Matrix Preferences</span>
          </h3>
          <div className="antigravity-hover bg-slate-50/80 p-4.5 rounded-2xl border border-slate-200/50 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:bg-slate-50 transition-all">
            <div className="space-y-0.5">
              <label className="block text-xs font-extrabold text-slate-800">Default Ancestry Strain Classification</label>
              <span className="text-[11px] text-slate-400 font-medium block">Pre-selected classification value inside the profiling matrix encoder</span>
            </div>
            <select 
              value={settings.default_strain || 'Sweater'} 
              onChange={(e) => setSettings(prev => ({ ...prev, default_strain: e.target.value }))}
              className="p-2.5 px-3 border border-slate-200/90 rounded-xl text-xs bg-white font-extrabold text-slate-700 outline-none focus:border-emerald-500 transition-all shadow-sm cursor-pointer"
            >
              <option value="Sweater">Sweater</option>
              <option value="Roundhead">Roundhead</option>
              <option value="Lemon">Lemon</option>
              <option value="Hatch">Hatch</option>
              <option value="Kelso">Kelso</option>
            </select>
          </div>
        </div>

        {/* SECTION 2: SECURITY & VERIFICATION TOGGLES */}
        <div className="space-y-4">
          <h3 className="text-xs font-black text-emerald-700 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center space-x-2">
            <span>🛡️</span> <span>Security & Cluster Verification Toggles</span>
          </h3>
          
          <div className="space-y-3">
            <label className="antigravity-hover bg-slate-50/80 p-4.5 rounded-2xl border border-slate-200/50 flex justify-between items-center px-5 cursor-pointer hover:bg-slate-50 transition-all">
              <div className="space-y-0.5">
                <span className="block text-xs font-extrabold text-slate-800">Real-time Cloud Auditing Logs</span>
                <span className="text-[11px] text-slate-400 font-medium block">Record cryptographic transaction updates to cluster node registries</span>
              </div>
              <input 
                type="checkbox" 
                checked={settings.cloud_logs !== false} 
                onChange={(e) => setSettings(prev => ({ ...prev, cloud_logs: e.target.checked }))}
                className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
              />
            </label>

            <label className="antigravity-hover bg-slate-50/80 p-4.5 rounded-2xl border border-slate-200/50 flex justify-between items-center px-5 cursor-pointer hover:bg-slate-50 transition-all">
              <div className="space-y-0.5">
                <span className="block text-xs font-extrabold text-slate-800">System Event Pop-up Alerts</span>
                <span className="text-[11px] text-slate-400 font-medium block">Enable dynamic pop-up notification frames during analytical operations</span>
              </div>
              <input 
                type="checkbox" 
                checked={settings.event_alerts !== false} 
                onChange={(e) => setSettings(prev => ({ ...prev, event_alerts: e.target.checked }))}
                className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* SECTION 3: DATA CLEANUP */}
        <div className="space-y-4">
          <h3 className="text-xs font-black text-rose-600 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center space-x-2">
            <span>🗑️</span> <span>Data Cleanup</span>
          </h3>
          <p className="text-[11px] text-slate-400 font-medium">Remove orphaned or test data from your registry. This action is irreversible.</p>

          {clearNotice && (
            <div className={`p-3 rounded-xl text-xs font-bold ${clearNotice.startsWith('Error') ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
              {clearNotice}
            </div>
          )}

          <div className="space-y-3">
            <div className="antigravity-hover bg-slate-50/80 p-4.5 rounded-2xl border border-slate-200/50 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:bg-slate-50 transition-all">
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

            <div className="antigravity-hover bg-slate-50/80 p-4.5 rounded-2xl border border-slate-200/50 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:bg-slate-50 transition-all">
              <div className="space-y-0.5">
                <span className="block text-xs font-extrabold text-slate-800">Clear All Fowl Profiles</span>
                <span className="text-[11px] text-slate-400 font-medium block">Deletes all registered gamefowl. Match history is kept (may show broken references).</span>
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

            <div className="antigravity-hover bg-rose-50/80 p-4.5 rounded-2xl border border-rose-200/50 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:bg-rose-50 transition-all">
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
        </div>

        {/* COMMIT BUTTON */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold py-3.5 px-4 rounded-xl text-xs shadow-md shadow-slate-900/10 transition-all duration-200 cursor-pointer disabled:opacity-50 tracking-wider uppercase flex items-center justify-center space-x-2"
          >
            {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
            <span>{loading ? 'Committing Configuration...' : 'Commit Configuration Changes'}</span>
          </button>
        </div>

      </form>
    </div>
  )
}
