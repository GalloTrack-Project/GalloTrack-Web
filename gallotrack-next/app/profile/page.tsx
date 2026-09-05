'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Cropper, { type Area, type Point } from 'react-easy-crop'
import { supabase } from '@/lib/registry'

export default function ProfilePage() {
  const [fullName, setFullName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [farmName, setFarmName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [cropping, setCropping] = useState(false)
  const [cropError, setCropError] = useState('')

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
            setFullName(profile.full_name || '')
            setPhoneNumber(profile.phone_number || '')
            setAvatarUrl(profile.avatar_url || '')
            setIsAdmin(profile.is_admin === true || profile.role === 'admin')
            setFarmName(profile.farm_name || '')
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
          .upsert({
            id: user.id,
            user_id: user.id,
            full_name: fullName,
            phone_number: phoneNumber,
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString()
          })

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

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setCropError('Please select a valid image file (JPG, PNG, WebP).')
      return
    }
    e.target.value = ''
    setCropError('')
    if (imageSrc) URL.revokeObjectURL(imageSrc)
    setImageSrc(URL.createObjectURL(file))
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCroppedAreaPixels(null)
  }

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const closeCropper = () => {
    if (imageSrc) URL.revokeObjectURL(imageSrc)
    setImageSrc(null)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCroppedAreaPixels(null)
    setCropError('')
  }

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image()
      image.addEventListener('load', () => resolve(image))
      image.addEventListener('error', (error) => reject(error))
      image.src = url
    })

  const getCroppedImg = async (src: string, pixelCrop: Area, outputSize = 512): Promise<Blob> => {
    const image = await createImage(src)
    const canvas = document.createElement('canvas')
    const scaleX = image.naturalWidth / image.width
    const scaleY = image.naturalHeight / image.height
    const maxDim = Math.max(pixelCrop.width * scaleX, pixelCrop.height * scaleY)
    const size = Math.max(256, Math.min(outputSize, Math.floor(maxDim)))
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas is not supported')
    ctx.drawImage(
      image,
      pixelCrop.x * scaleX,
      pixelCrop.y * scaleY,
      pixelCrop.width * scaleX,
      pixelCrop.height * scaleY,
      0,
      0,
      size,
      size
    )
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Canvas is empty'))), 'image/jpeg', 0.92)
    })
  }

  const saveCroppedImage = async () => {
    if (!imageSrc || !croppedAreaPixels) return
    setCropping(true)
    setCropError('')
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels, 512)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const fileName = `${user.id}-${Date.now()}.jpg`
      const filePath = `profiles/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('fowl-images')
        .upload(filePath, blob, {
          cacheControl: '3600',
          contentType: 'image/jpeg',
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

      closeCropper()
    } catch (err) {
      console.error(err)
      setCropError('Failed to upload cropped image. Please try again.')
    } finally {
      setCropping(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fadeIn text-card-foreground">
      {/* HEADER SECTION */}
      <div className="antigravity-hover bg-card p-6 sm:p-7 rounded-3xl border border-border shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight">Profile Management</h2>
          <p className="text-xs text-muted-foreground font-semibold mt-0.5">Manage administrative credentials and personnel identity access layers</p>
        </div>
        <span className="antigravity-badge text-[10px] font-mono font-black text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200/60 uppercase self-start sm:self-auto shadow-sm flex items-center gap-1.5 dark:text-emerald-400 dark:bg-emerald-950 dark:border-emerald-800">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
          Frame Authenticated
        </span>
      </div>

      {savedSuccess && (
        <div className="bg-emerald-50/90 border border-emerald-200 text-emerald-800 p-4 rounded-2xl text-xs font-bold flex items-center justify-between shadow-sm animate-fadeIn dark:bg-emerald-950/90 dark:border-emerald-800 dark:text-emerald-300">
          <div className="flex items-center space-x-2">
            <span className="w-6 h-6 bg-emerald-200 rounded-full flex items-center justify-center text-emerald-700 text-xs font-black dark:bg-emerald-800 dark:text-emerald-300">✓</span>
            <span>GalloTrack System Notice: Administrative identity credentials updated successfully.</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-mono font-black dark:text-emerald-400">D4 CLUSTER SYNC</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* ADMINISTRATIVE DETAILS BADGE */}
        <div className="antigravity-card bg-card p-7 rounded-3xl border border-border shadow-sm space-y-5 md:col-span-1 flex flex-col items-center text-center">
          <div className="antigravity-avatar relative group cursor-pointer select-none" onClick={triggerFileInput}>
            {avatarUrl ? (
              <img 
                src={avatarUrl} 
                alt="Profile Avatar" 
                className="w-24 h-24 rounded-2xl object-cover shadow-lg shadow-emerald-900/15 border border-border transition-all duration-200 group-hover:scale-[1.03] group-hover:shadow-emerald-900/25"
              />
            ) : (
              <div className="w-24 h-24 bg-gradient-to-br from-teal-700 to-emerald-800 text-white rounded-2xl flex items-center justify-center text-4xl font-black shadow-lg shadow-emerald-900/15 border border-white/10 transition-all duration-200 group-hover:scale-[1.03]">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </div>
            )}
            <div className="absolute inset-0 bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center text-white text-[10px] font-bold gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
              <span>Change Photo</span>
            </div>
            <input type="file" ref={fileInputRef} onChange={onFileSelected} accept="image/*" className="hidden" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-extrabold">{fullName}</h3>
            <span className={`antigravity-badge text-[10px] font-mono font-black px-3 py-1 rounded-full border inline-block uppercase tracking-wider ${
              isAdmin ? 'text-amber-700 bg-amber-50 border-amber-200/60 dark:text-amber-400 dark:bg-amber-950 dark:border-amber-800' : 'text-sky-700 bg-sky-50 border-sky-200/60 dark:text-sky-400 dark:bg-sky-950 dark:border-sky-800'
            }`}>
              {isAdmin ? 'Admin' : 'Farm Owner'}
            </span>
          </div>
          <button
            type="button"
            onClick={triggerFileInput}
            className="group w-full flex items-center justify-center gap-2 bg-teal-700 hover:bg-teal-800 active:scale-[0.99] text-white text-[11px] font-black py-2.5 rounded-xl transition-all duration-200 cursor-pointer shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
            Change Profile Picture
          </button>
          <div className="w-full border-t border-border pt-4 space-y-2.5 text-[11px] text-muted-foreground font-mono">
            <div className="flex items-center justify-between px-1">
              <span className="text-muted-foreground font-bold tracking-wide">HUB LOCATION</span>
              <span className="font-black">{farmName || 'Not Set'}</span>
            </div>
            <div className="flex items-center justify-between px-1">
              <span className="text-muted-foreground font-bold tracking-wide">ROLE</span>
              <span className="font-black">{isAdmin ? 'Admin' : 'Farm Owner'}</span>
            </div>
            <div className="flex items-center justify-between px-1">
              <span className="text-muted-foreground font-bold tracking-wide">GLOBAL ACCESS</span>
              <span className="text-emerald-600 font-black flex items-center gap-1 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                VERIFIED
              </span>
            </div>
          </div>
        </div>

        {/* INPUT IDENTITY FORM */}
        <form onSubmit={handleUpdateProfile} className="antigravity-hover bg-card p-7 rounded-3xl border border-border shadow-sm space-y-6 md:col-span-2">
          <div className="flex justify-between items-center border-b border-border pb-4">
            <h3 className="text-xs font-black text-teal-800 uppercase tracking-widest flex items-center gap-2 dark:text-teal-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/></svg>
              Administrative Identity Credentials
            </h3>
            <span className="text-[9px] font-mono text-muted-foreground font-semibold tracking-wide">SECURE FORM</span>
          </div>
          
          <div className="space-y-5">
            <div>
              <label className="block text-[10px] font-black text-muted-foreground uppercase mb-2 tracking-widest">Full Account Name</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </span>
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full pl-10 pr-3.5 py-3 border border-border rounded-xl text-xs bg-muted/50 focus:bg-background focus:border-teal-500 focus:ring-4 focus:ring-teal-100 dark:focus:ring-teal-900 transition-all font-semibold outline-none" required />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-muted-foreground uppercase mb-2 tracking-widest">Contact Communication Number</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                </span>
                <input type="text" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="w-full pl-10 pr-3.5 py-3 border border-border rounded-xl text-xs bg-muted/50 focus:bg-background focus:border-teal-500 focus:ring-4 focus:ring-teal-100 dark:focus:ring-teal-900 transition-all font-semibold outline-none" required />
              </div>
            </div>
          </div>

          <div className="pt-1">
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full bg-gradient-to-br from-teal-700 to-teal-800 hover:from-teal-600 hover:to-teal-700 active:scale-[0.99] text-white font-black py-3.5 px-4 rounded-xl text-xs shadow-lg shadow-teal-900/25 transition-all duration-200 cursor-pointer disabled:opacity-50 tracking-wider uppercase flex items-center justify-center gap-3 overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
              <span className="relative tracking-widest">{loading ? 'Saving...' : 'Save Changes'}</span>
              {!loading && (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="relative group-hover:translate-x-0.5 transition-transform"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* IMAGE CROPPER MODAL */}
      {imageSrc && (
        <div className="fixed inset-0 bg-slate-900/70 dark:bg-black/70 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-card rounded-3xl shadow-2xl border border-border w-full max-w-lg p-6 space-y-5">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <div>
                <h3 className="text-base font-black tracking-tight">Crop Profile Picture</h3>
                <p className="text-[11px] text-muted-foreground font-semibold">Drag to pan, use the slider to zoom, then save</p>
              </div>
              <button onClick={closeCropper} className="text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all cursor-pointer">✕</button>
            </div>

            <div className="relative w-full h-72 bg-slate-900 rounded-2xl overflow-hidden">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>

            <div className="flex items-center space-x-3 px-1">
              <span className="text-base">🔍</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full accent-teal-600 cursor-pointer"
              />
              <span className="text-base">🔎</span>
            </div>

            {cropError && <p className="text-xs font-bold text-rose-600 text-center">{cropError}</p>}

            <div className="flex space-x-3">
              <button type="button" onClick={closeCropper} className="flex-1 bg-muted hover:bg-muted/80 text-foreground font-black py-3 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer">
                Cancel
              </button>
              <button type="button" onClick={saveCroppedImage} disabled={cropping} className="flex-1 bg-teal-700 hover:bg-teal-800 text-white font-black py-3 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center space-x-2 shadow-md disabled:opacity-50">
                {cropping && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
                <span>{cropping ? 'Uploading...' : 'Crop & Save'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
