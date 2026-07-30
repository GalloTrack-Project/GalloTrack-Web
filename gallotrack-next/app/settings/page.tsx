'use client'
import { useState } from 'react'

export default function SettingsPage() {
  const [defaultStrain, setDefaultStrain] = useState('Sweater')
  const [cloudLogs, setCloudLogs] = useState(true)
  const [eventAlerts, setEventAlerts] = useState(true)
  const [loading, setLoading] = useState(false)
  const [savedNotice, setSavedNotice] = useState(false)

  function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setSavedNotice(false)
    setTimeout(() => {
      setLoading(false)
      setSavedNotice(true)
      setTimeout(() => setSavedNotice(false), 4000)
    }, 500)
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
              value={defaultStrain} 
              onChange={(e) => setDefaultStrain(e.target.value)}
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
            {/* TOGGLE 1 */}
            <label className="antigravity-hover bg-slate-50/80 p-4.5 rounded-2xl border border-slate-200/50 flex justify-between items-center px-5 cursor-pointer hover:bg-slate-50 transition-all">
              <div className="space-y-0.5">
                <span className="block text-xs font-extrabold text-slate-800">Real-time Cloud Auditing Logs</span>
                <span className="text-[11px] text-slate-400 font-medium block">Record cryptographic transaction updates to cluster node registries</span>
              </div>
              <input 
                type="checkbox" 
                checked={cloudLogs} 
                onChange={(e) => setCloudLogs(e.target.checked)}
                className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
              />
            </label>

            {/* TOGGLE 2 */}
            <label className="antigravity-hover bg-slate-50/80 p-4.5 rounded-2xl border border-slate-200/50 flex justify-between items-center px-5 cursor-pointer hover:bg-slate-50 transition-all">
              <div className="space-y-0.5">
                <span className="block text-xs font-extrabold text-slate-800">System Event Pop-up Alerts</span>
                <span className="text-[11px] text-slate-400 font-medium block">Enable dynamic pop-up notification frames during analytical operations</span>
              </div>
              <input 
                type="checkbox" 
                checked={eventAlerts} 
                onChange={(e) => setEventAlerts(e.target.checked)}
                className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
              />
            </label>
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