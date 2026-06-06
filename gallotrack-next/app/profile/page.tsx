'use client'
import { useState } from 'react'

export default function ProfilePage() {
  const [fullName, setFullName] = useState('Juan Dela Cruz')
  const [phoneNumber, setPhoneNumber] = useState('09123456789')
  const [loading, setLoading] = useState(false)

  function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      alert('GalloTrack System Notice: Administrative identity credentials modified successfully!')
    }, 600)
  }

  return (
    <div className="max-w-2xl mx-auto mt-4 space-y-6 animate-fadeIn">
      {/* HEADER SECTION */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Profile Management</h2>
        <p className="text-xs text-slate-400 font-medium mt-1">Manage core system administrative personnel identities and access layers</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* ADMINISTRATIVE DETAILS BADGE */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm space-y-4 md:col-span-1 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-700 rounded-full flex items-center justify-center text-2xl font-black border border-emerald-100 shadow-inner">
            👤
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800">{fullName}</h3>
            <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/40 mt-1 inline-block uppercase">System Admin</span>
          </div>
          <hr className="w-full border-slate-100" />
          <div className="w-full text-left space-y-1.5 text-[10px] text-slate-400 font-mono">
            <div>HUB: <span className="text-slate-700 font-bold">ISUFST-DINGLE</span></div>
            <div>STATUS: <span className="text-emerald-600 font-bold">VERIFIED</span></div>
          </div>
        </div>

        {/* INPUT IDENTITY FORM */}
        <form onSubmit={handleUpdateProfile} className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm space-y-4 md:col-span-2">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Identity Credentials</h3>
          
          <div className="space-y-3.5">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wide">Full Account Name</label>
              <input 
                type="text" 
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)} 
                className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:border-emerald-500 transition-all font-medium outline-none" 
                required 
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wide">Contact Communication Number</label>
              <input 
                type="text" 
                value={phoneNumber} 
                onChange={(e) => setPhoneNumber(e.target.value)} 
                className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:border-emerald-500 transition-all font-medium outline-none" 
                required 
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-md shadow-slate-900/10 transition-all cursor-pointer disabled:opacity-50 tracking-wide uppercase"
            >
              {loading ? 'Updating Credentials...' : 'Commit Account Updates'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}