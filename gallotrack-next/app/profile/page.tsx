'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mjvsbzayumcxmjcokwki.supabase.co'
const supabaseAnonKey = 'sb_publishable_MpufdSUihyXde5KmWAun_w_j0GSCTa3'
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default function ProfilePage() {
  const [fullName, setFullName] = useState('Hazel Dela Cruz')
  const [phoneNumber, setPhoneNumber] = useState('09123456789')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function loadProfile() {
      if (typeof window !== 'undefined') {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()
            
          if (profile) {
            setFullName(profile.full_name || 'Hazel Dela Cruz')
            setPhoneNumber(profile.phone_number || '09123456789')
            setAvatarUrl(profile.avatar_url || '')
          }
        }
      }
    }
    loadProfile()
  }, [])

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setSavedSuccess(false)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: fullName,
            phone_number: phoneNumber,
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id)

        if (error) throw error

        if (typeof window !== 'undefined') {
          localStorage.setItem('gallotrack_admin_name', fullName)
          localStorage.setItem('gallotrack_admin_phone', phoneNumber)
          if (avatarUrl) {
            localStorage.setItem('gallotrack_admin_avatar', avatarUrl)
          } else {
            localStorage.removeItem('gallotrack_admin_avatar')
          }
          window.dispatchEvent(new Event('admin-profile-update'))
        }
        setSavedSuccess(true)
        setTimeout(() => setSavedSuccess(false), 4000)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const filePath = `profiles/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('fowl-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from('fowl-images')
        .getPublicUrl(filePath)

      const publicImageUrl = data.publicUrl
      setAvatarUrl(publicImageUrl)

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar_url: publicImageUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (updateError) throw updateError

      if (typeof window !== 'undefined') {
        localStorage.setItem('gallotrack_admin_avatar', publicImageUrl)
        window.dispatchEvent(new Event('admin-profile-update'))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn text-slate-800">
      {/* HEADER SECTION */}
      <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Profile Management</h2>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Manage administrative credentials and personnel identity access layers</p>
        </div>
        <span className="text-[10px] font-mono font-black text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200/60 uppercase self-start sm:self-auto shadow-sm">
          ● Frame Authenticated
        </span>
      </div>

      {savedSuccess && (
        <div className="bg-emerald-50/90 border border-emerald-200 text-emerald-800 p-4 rounded-2xl text-xs font-bold flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="flex items-center space-x-2">
            <span className="text-base">✓</span>
            <span>GalloTrack System Notice: Administrative identity credentials updated successfully.</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-mono">D4 CLUSTER SYNC</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* ADMINISTRATIVE DETAILS BADGE */}
        <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4 md:col-span-1 flex flex-col items-center justify-center text-center">
          <div className="relative group cursor-pointer w-20 h-20 select-none" onClick={triggerFileInput}>
            {avatarUrl ? (
              <img 
                src={avatarUrl} 
                alt="Profile Avatar" 
                className="w-20 h-20 rounded-2xl object-cover shadow-lg shadow-emerald-900/20 border border-slate-200 transition-transform duration-200 group-hover:scale-[1.02]"
              />
            ) : (
              <div className="w-20 h-20 bg-gradient-to-tr from-slate-900 to-emerald-800 text-white rounded-2xl flex items-center justify-center text-3xl font-black shadow-lg shadow-emerald-900/20 border border-white/20 transition-transform duration-200 group-hover:scale-[1.02]">
                👤
              </div>
            )}
            <div className="absolute inset-0 bg-black/45 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center text-white text-[9px] font-bold space-y-1">
              <span className="text-sm">📷</span>
              <span>Change Photo</span>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              accept="image/*" 
              className="hidden" 
            />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900">{fullName}</h3>
            <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-3 py-0.5 rounded-full border border-emerald-200/60 mt-1 inline-block uppercase tracking-wider">System Lead Admin</span>
          </div>
          <hr className="w-full border-slate-100" />
          <div className="w-full text-left space-y-2 text-[11px] text-slate-500 font-mono">
            <div className="flex justify-between"><span>HUB LOCATION:</span> <span className="text-slate-800 font-bold">ISUFST-DINGLE</span></div>
            <div className="flex justify-between"><span>CLUSTER NODE:</span> <span className="text-slate-800 font-bold">NODE-ALPHA</span></div>
            <div className="flex justify-between"><span>GLOBAL ACCESS:</span> <span className="text-emerald-600 font-bold">VERIFIED</span></div>
          </div>
        </div>

        {/* INPUT IDENTITY FORM */}
        <form onSubmit={handleUpdateProfile} className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-5 md:col-span-2">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
              <span>🪪</span> <span>Administrative Identity Credentials</span>
            </h3>
            <span className="text-[9px] font-mono text-slate-400 font-semibold">SECURE CLUSTER FORM</span>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1.5 tracking-wider">Full Account Name</label>
              <input 
                type="text" 
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)} 
                className="w-full p-3 border border-slate-200/90 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all font-semibold outline-none" 
                required 
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1.5 tracking-wider">Contact Communication Number</label>
              <input 
                type="text" 
                value={phoneNumber} 
                onChange={(e) => setPhoneNumber(e.target.value)} 
                className="w-full p-3 border border-slate-200/90 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all font-semibold outline-none" 
                required 
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold py-3.5 px-4 rounded-xl text-xs shadow-md shadow-slate-900/10 transition-all duration-200 cursor-pointer disabled:opacity-50 tracking-wider uppercase flex items-center justify-center space-x-2"
            >
              {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
              <span>{loading ? 'Updating Credentials...' : 'Commit Account Updates'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}