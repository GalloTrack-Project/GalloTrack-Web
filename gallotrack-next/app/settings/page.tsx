'use client'
import { useState } from 'react'

export default function SettingsPage() {
  const [loading, setLoading] = useState(false)
  const [defaultBreed, setDefaultBreed] = useState('Sweater')
  const [notifications, setNotifications] = useState(true)
  const [systemLogs, setSystemLogs] = useState(true)

  async function handleSaveSettings() {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      alert('GalloTrack System Notice: Core application parameters updated successfully!')
    }, 800)
  }

  return (
    <div className="max-w-xl mx-auto mt-6 p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
      <div>
        <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">System Settings</h2>
        <p className="text-xs text-zinc-400 font-medium">Configure global administrative rules and deployment behaviors</p>
      </div>

      <hr className="border-zinc-200 dark:border-zinc-800" />

      <div className="space-y-4">
        <h3 className="text-xs font-black text-emerald-700 dark:text-emerald-500 uppercase tracking-widest">Application Preferences</h3>
        
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 bg-zinc-50 dark:bg-zinc-800/40 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
          <div>
            <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block">Default Ancestry Strain</label>
            <span className="text-[10px] text-zinc-400 font-medium">Pre-selected classification value inside the profiling matrix engine</span>
          </div>
          <select 
            value={defaultBreed} 
            onChange={(e) => setDefaultBreed(e.target.value)}
            className="p-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs bg-white dark:bg-zinc-800 text-zinc-800 dark:text-white font-bold outline-none"
          >
            <option value="Sweater">Sweater</option>
            <option value="Lemon">Lemon</option>
            <option value="Hatch">Hatch</option>
            <option value="Kelso">Kelso</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xs font-black text-emerald-700 dark:text-emerald-500 uppercase tracking-widest">Security & Verification Toggles</h3>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-800/40 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
            <div>
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block">Real-time Cloud Auditing Logs</span>
              <span className="text-[10px] text-zinc-400 font-medium">Record cryptographic transaction updates to cluster node registries</span>
            </div>
            <input 
              type="checkbox" 
              checked={systemLogs} 
              onChange={(e) => setSystemLogs(e.target.checked)}
              className="w-4 h-4 accent-emerald-600 cursor-pointer"
            />
          </div>

          <div className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-800/40 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
            <div>
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block">System Event Alerts</span>
              <span className="text-[10px] text-zinc-400 font-medium">Enable pop-up notification frames during dynamic operations</span>
            </div>
            <input 
              type="checkbox" 
              checked={notifications} 
              onChange={(e) => setNotifications(e.target.checked)}
              className="w-4 h-4 accent-emerald-600 cursor-pointer"
            />
          </div>
        </div>
      </div>

      <hr className="border-zinc-200 dark:border-zinc-800" />

      <button
        onClick={handleSaveSettings}
        disabled={loading}
        className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-md shadow-emerald-700/10 transition-all cursor-pointer disabled:opacity-50"
      >
        {loading ? 'Saving Parameters...' : 'Commit Configuration Changes'}
      </button>
    </div>
  )
}