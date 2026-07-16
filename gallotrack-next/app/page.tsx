'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Doughnut, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { createClient } from '@supabase/supabase-js';
import ProfilePage from '@/app/profile/page';
import SettingsPage from '@/app/settings/page';
import SplashScreen from '@/components/SplashScreen';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const supabaseUrl = 'https://mjvsbzayumcxmjcokwki.supabase.co';
const supabaseAnonKey = 'sb_publishable_MpufdSUihyXde5KmWAun_w_j0GSCTa3'; 
const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : { from: () => ({ select: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }) } as any;

interface FowlRecord {
  id: number;
  name: string;
  breed: string;
  gender: string;
  color: string;
  color_category: string;
  growth_stage: string;
  behavior_trait: string;
  eye_variant: string;
  birthdate: string;
  age: string;
  weight: string;
  height: string;
  sire: string;
  dam: string;
  sire_pct: number;
  dam_pct: number;
  bloodline_pct: number;
  status: string;
  image_url?: string;
}

interface MatchRecord {
  id: number;
  date: string;
  entry_name: string;
  breed: string;
  opponent: string;
  location: string;
  type: string;
  outcome: string;
  status: string;
}

export default function GalloTrackSystem() {
  const [showSplash, setShowSplash] = useState(true);
  const [currentPage, setCurrentPage] = useState<'login' | 'dashboard' | 'profiling' | 'marketplace' | 'profile' | 'settings'>('login');
  
  // 🔀 Sub-tab selector para sa Profiling page ('form' o 'registry')
  const [profilingSubTab, setProfilingSubTab] = useState<'form' | 'registry'>('form');

  // 🔍 Interactive Detail at Edit States
  const [selectedFowlForDetails, setSelectedFowlForDetails] = useState<FowlRecord | null>(null);
  const [editingFowl, setEditingFowl] = useState<FowlRecord | null>(null);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const [fowls, setFowls] = useState<FowlRecord[]>([]);
  const [matchHistory, setMatchHistory] = useState<MatchRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const mainScrollRef = useRef<HTMLElement>(null);

  // Form Field States
  const [newName, setNewName] = useState('');
  const [newBreed, setNewBreed] = useState('Sweater');
  const [newGender, setNewGender] = useState('Rooster');
  const [newColor, setNewColor] = useState('Bright Red');
  const [newColorCategory, setNewColorCategory] = useState('Red');
  const [newGrowthStage, setNewGrowthStage] = useState('Stag');
  const [newBehaviorTrait, setNewBehaviorTrait] = useState('Wave-Motion Tracker');
  const [newEyeVariant, setNewEyeVariant] = useState('Standard Eye');
  const [newBirthdate, setNewBirthdate] = useState('');
  const [sireName, setSireName] = useState('');
  const [damName, setDamName] = useState('');
  const [sirePct, setSirePct] = useState(100);
  const [damPct, setDamPct] = useState(100);
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState(''); 
  const [search, setSearch] = useState('');
  
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Edit Modal Form States
  const [editName, setEditName] = useState('');
  const [editBreed, setEditBreed] = useState('');
  const [editGender, setEditGender] = useState('');
  const [editColorCategory, setEditColorCategory] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editBehaviorTrait, setEditBehaviorTrait] = useState('');
  const [editEyeVariant, setEditEyeVariant] = useState('');
  const [editAge, setEditAge] = useState('');
  const [editGrowthStage, setEditGrowthStage] = useState('');
  const [editWeight, setEditWeight] = useState('');
  const [editHeight, setEditHeight] = useState('');
  const [editSire, setEditSire] = useState('');
  const [editDam, setEditDam] = useState('');
  const [editSirePct, setEditSirePct] = useState(100);
  const [editDamPct, setEditDamPct] = useState(100);

  // Splash Screen Effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // Reset scroll when tab changes
  useEffect(() => {
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTop = 0;
    }
  }, [currentPage, profilingSubTab]);

  const fetchDatabaseResources = async () => {
    setLoading(true);
    try {
      const { data: fowlData, error: fowlErr } = await supabase
        .from('fowl')
        .select('*')
        .order('id', { ascending: false });

      const { data: matchData, error: matchErr } = await supabase
        .from('match')
        .select('*')
        .order('id', { ascending: false });

      if (fowlData) setFowls(fowlData);
      
      if (matchData && matchData.length > 0) {
        setMatchHistory(matchData);
      } else {
        setMatchHistory([
          { id: 101, date: '2026-05-12', entry_name: 'Red Thunder', breed: 'Sweater', opponent: 'Kelso Express', location: 'Dingle Breeding Arena', type: 'Derby Match', outcome: 'Win', status: 'Verified' },
          { id: 102, date: '2026-05-18', entry_name: 'Gold Blade', breed: 'Lemon', opponent: 'Hatch Dominator', location: 'Iloilo Exhibition Center', type: 'Hack Match', outcome: 'Win', status: 'Verified' },
          { id: 103, date: '2026-05-25', entry_name: 'Red Thunder', breed: 'Sweater', opponent: 'Lemon Slasher', location: 'Dingle Breeding Arena', type: 'Derby Match', outcome: 'Loss', status: 'Verified' },
          { id: 104, date: '2026-06-02', entry_name: 'Red Thunder', breed: 'Sweater', opponent: 'Grey Warrior', location: 'Local Breeding Yard', type: 'Hack Match', outcome: 'Draw', status: 'Verified' }
        ]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentPage !== 'login') {
      fetchDatabaseResources();
    }
  }, [currentPage]);

  const autoComputeGrowthStage = (monthsValue: number) => {
    if (monthsValue >= 5 && monthsValue <= 11) return 'Stag';
    if (monthsValue >= 12 && monthsValue <= 24) return 'Bull Stag';
    if (monthsValue > 24) return 'Cock';
    return 'Stag';
  };

  const handleAgeChange = (val: string) => {
    setAge(val);
    if (val && !isNaN(Number(val))) {
      setNewGrowthStage(autoComputeGrowthStage(Number(val)));
    }
  };

  const handleEditAgeChange = (val: string) => {
    setEditAge(val);
    if (val && !isNaN(Number(val))) {
      setEditGrowthStage(autoComputeGrowthStage(Number(val)));
    }
  };

  const getSiblingsForFowl = (currentSire: string, currentDam: string, currentId: number) => {
    if (!currentSire || !currentDam) return [];
    return fowls.filter(f => 
      f.id !== currentId && 
      f.sire.toLowerCase().trim() === currentSire.toLowerCase().trim() &&
      f.dam.toLowerCase().trim() === currentDam.toLowerCase().trim()
    ).map(f => f.name);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() !== '' && password === 'cict123') {
      setError('');
      setCurrentPage('dashboard');
    } else {
      setError('Data Privacy Act Notice: Cryptographic verification mismatch.');
    }
  };

  const handleAddFowl = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    let publicImageUrl = '';

    try {
      if (selectedImage) {
        setUploadingImage(true);
        const fileExt = selectedImage.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `fowl/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('fowl-images')
          .upload(filePath, selectedImage);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('fowl-images')
          .getPublicUrl(filePath);

        publicImageUrl = data.publicUrl;
      }

      const calculatedBloodline = (Number(sirePct) + Number(damPct)) / 2;
      
      const payload = {
        name: newName,
        breed: newBreed,
        gender: newGender,
        color: newColor,
        color_category: newColorCategory,
        growth_stage: newGrowthStage,
        behavior_trait: newBehaviorTrait,
        eye_variant: newEyeVariant,
        birthdate: newBirthdate || '2026-01-01',
        age: age ? `${age} Months` : 'N/A',
        weight: weight ? `${weight} kg` : 'N/A',
        height: height ? `${height} cm` : 'N/A',
        sire: sireName,
        dam: damName,
        sire_pct: Number(sirePct),
        dam_pct: Number(damPct),
        bloodline_pct: calculatedBloodline,
        status: 'Active',
        image_url: publicImageUrl
      };

      const { error: insertErr } = await supabase.from('fowl').insert([payload]);

      if (insertErr) {
        alert(`Database Insertion Error: ${insertErr.message}`);
      } else {
        alert('GalloTrack Notice: Record successfully saved.');
        setNewName(''); setSireName(''); setDamName(''); setWeight(''); setHeight(''); setAge(''); setSelectedImage(null);
        fetchDatabaseResources();
        setProfilingSubTab('registry'); // Kusang lilipat sa listahan pagkatapos mag-save!
      }
    } catch (err: any) {
      alert(`Upload Error: ${err.message || err}`);
    } finally {
      setLoading(false);
      setUploadingImage(false);
    }
  };

  const handleArchiveFowl = async (id: number) => {
    const { error: updateErr } = await supabase.from('fowl').update({ status: 'Archived' }).eq('id', id);
    if (updateErr) alert(updateErr.message);
    else {
      fetchDatabaseResources();
      if (selectedFowlForDetails?.id === id) {
        setSelectedFowlForDetails(null);
      }
    }
  };

  // ✏️ Simulan ang pag-edit ng record at buksan ang edit form modal
  const handleOpenEditModal = (fowl: FowlRecord) => {
    setEditingFowl(fowl);
    setEditName(fowl.name);
    setEditBreed(fowl.breed);
    setEditGender(fowl.gender);
    setEditColorCategory(fowl.color_category);
    setEditColor(fowl.color);
    setEditBehaviorTrait(fowl.behavior_trait);
    setEditEyeVariant(fowl.eye_variant || 'Standard Eye');
    setEditAge(fowl.age ? fowl.age.replace(' Months', '') : '');
    setEditGrowthStage(fowl.growth_stage);
    setEditWeight(fowl.weight ? fowl.weight.replace(' kg', '') : '');
    setEditHeight(fowl.height ? fowl.height.replace(' cm', '') : '');
    setEditSire(fowl.sire);
    setEditDam(fowl.dam);
    setEditSirePct(fowl.sire_pct ?? 100);
    setEditDamPct(fowl.dam_pct ?? 100);
  };

  // 💾 I-save ang in-edit na Fowl sa Supabase
  const handleUpdateFowl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFowl) return;
    setLoading(true);

    try {
      const calculatedBloodline = (Number(editSirePct) + Number(editDamPct)) / 2;
      const payload = {
        name: editName,
        breed: editBreed,
        gender: editGender,
        color: editColor,
        color_category: editColorCategory,
        growth_stage: editGrowthStage,
        behavior_trait: editBehaviorTrait,
        eye_variant: editEyeVariant,
        age: editAge ? `${editAge} Months` : 'N/A',
        weight: editWeight ? `${editWeight} kg` : 'N/A',
        height: editHeight ? `${editHeight} cm` : 'N/A',
        sire: editSire,
        dam: editDam,
        sire_pct: Number(editSirePct),
        dam_pct: Number(editDamPct),
        bloodline_pct: calculatedBloodline
      };

      const { error: updateErr } = await supabase
        .from('fowl')
        .update(payload)
        .eq('id', editingFowl.id);

      if (updateErr) throw updateErr;

      alert('GalloTrack Notice: Record updated successfully.');
      setEditingFowl(null);
      fetchDatabaseResources();
    } catch (err: any) {
      alert(`Update Error: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  if (showSplash) {
    return <SplashScreen onFinished={() => setShowSplash(false)} />;
  }

  return (
    <div className="bg-[#f1f5f9] min-h-screen font-sans antialiased text-slate-800 flex flex-col md:flex-row overflow-hidden h-screen w-full relative">
      
      {/* ==================== PREMIUM LOGIN FRAMEWORK ==================== */}
      {currentPage === 'login' && (
        <div className="flex items-center justify-center min-h-screen w-full p-6 bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#047857] overflow-hidden">
          <div className="bg-white/95 backdrop-blur-md p-10 rounded-3xl shadow-2xl border border-white/20 max-w-md w-full space-y-8 transition-all">
            <div className="text-center space-y-3">
              <span className="text-[10px] font-black tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase border border-emerald-200/50">ISUFST CICT Official Capstone</span>
              <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">GALLOTRACK</h1>
              <p className="text-xs text-slate-500 font-medium max-w-xs mx-auto leading-relaxed">Advanced Gamefowl Lineage Analytics & Structural Trace Registry Framework</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-2 uppercase tracking-wider">Administrative Identity</label>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full p-3.5 border border-slate-200 rounded-xl text-sm bg-slate-50/50 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all outline-none" placeholder="Enter username" required />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-2 uppercase tracking-wider">System Cryptokey Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3.5 border border-slate-200 rounded-xl text-sm bg-slate-50/50 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all outline-none" placeholder="••••••••••••" required />
              </div>
              {error && <div className="text-xs text-rose-600 font-semibold text-center bg-rose-50 border border-rose-100 p-3 rounded-xl">{error}</div>}
              <button type="submit" className="w-full bg-slate-900 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-xl shadow-slate-900/20 cursor-pointer text-sm tracking-wide">Authenticate Frame Session</button>
            </form>
          </div>
        </div>
      )}

      {/* ==================== ENTERPRISE NAVIGATION (Desktop Sidebar) ==================== */}
      {currentPage !== 'login' && (
        <aside className="hidden md:flex w-64 bg-slate-900 text-slate-200 flex-col md:fixed md:inset-y-0 md:left-0 z-50 border-r border-slate-800 shadow-2xl h-full justify-between">
          <div>
            <div className="p-6 border-b border-slate-800/60 bg-slate-950/40">
              <h2 className="text-2xl font-black tracking-tight text-white bg-gradient-to-r from-white to-emerald-400 bg-clip-text text-transparent">GALLOTRACK</h2>
              <span className="text-[9px] font-mono font-bold text-emerald-400 tracking-wider uppercase mt-1 block font-extrabold">v1.2.0 Production stable</span>
            </div>
            <nav className="p-4 space-y-1.5 mt-4">
              {[
                { id: 'dashboard', label: 'Dashboard Analytics', icon: '📊' },
                { id: 'profiling', label: 'Profiling & Lineage', icon: '🧬' },
                { id: 'marketplace', label: ' Breeding Catalog', icon: '🛒' },
                { id: 'profile', label: 'Profile Management', icon: '👤' },
                { id: 'settings', label: 'System Settings', icon: '⚙️' },
              ].map((menu) => (
                <button 
                  key={menu.id}
                  onClick={() => setCurrentPage(menu.id as any)} 
                  className={`w-full text-left flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer ${
                    currentPage === menu.id 
                      ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg shadow-emerald-700/30 font-extrabold' 
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
                  }`}
                >
                  <span className="text-sm">{menu.icon}</span>
                  <span>{menu.label}</span>
                </button>
              ))}
            </nav>
          </div>
          
          <div className="p-4 border-t border-slate-800 bg-slate-950/60 space-y-3">
            <button onClick={() => { setUsername(''); setPassword(''); setCurrentPage('login'); }} className="w-full bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-200 border border-slate-700/50 hover:border-rose-900/30 text-left flex items-center space-x-3 px-4 py-2.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer">
              <span>🚪 Terminate Core Session</span>
            </button>
            <div className="text-center text-[9px] text-slate-600 font-mono tracking-widest uppercase">ISUFST CLUSTER SYSTEM</div>
          </div>
        </aside>
      )}

      {/* ==================== MAIN CONTENT & VIEWPORT FRAME ==================== */}
      {currentPage !== 'login' && (
        <div className="flex-1 md:pl-64 flex flex-col h-full w-full min-h-0 overflow-hidden">
          
          {/* Header Bar */}
          <header className="bg-white border-b border-slate-200/80 p-4 sticky top-0 z-40 flex justify-between items-center shadow-sm px-6 shrink-0">
            <div className="text-[10px] md:text-xs font-mono font-bold text-slate-400 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>SUPABASE POSTGRESQL DATA LINK: ACTIVE</span>
            </div>
            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border">Dingle Campus Hub</span>
          </header>

          {/* Main Scrollable Area */}
          <main ref={mainScrollRef} className="p-4 md:p-8 flex-1 overflow-y-auto max-w-6xl w-full mx-auto pb-24 md:pb-8">
            
            {/* ==================== 📊 DASHBOARD PANEL ==================== */}
            {currentPage === 'dashboard' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm">
                  <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Dynamic Cross-Breeding Analytics</h1>
                  <p className="text-xs text-slate-500 font-medium">Aggregated empirical cross-breed success algorithms and genetic performance metrics</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60 flex flex-col items-center">
                    <h3 className="text-xs font-black text-slate-400 uppercase mb-6 tracking-widest text-center w-full border-b pb-3">Cross-Breed Win Ratios (Empirical Logs)</h3>
                    <div className="w-48 h-48 sm:w-56 sm:h-56">
                      <Doughnut data={{ labels: ['Roundhead Cross', 'Hatch Cross', 'Kelso Combos'], datasets: [{ data: [65, 45, 58], backgroundColor: ['#10b981', '#f43f5e', '#f59e0b'], borderWidth: 0 }] }} options={{ responsive: true, maintainAspectRatio: false }} />
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60">
                    <h3 className="text-xs font-black text-slate-400 uppercase mb-6 tracking-widest border-b pb-3 text-center">Lineage Cohort Success Probability (%)</h3>
                    <div className="w-full h-48 sm:h-56">
                      <Bar data={{ labels: ['Roundhead', 'Sweater', 'Lemon', 'Kelso', 'Hatch'], datasets: [{ label: 'Estimated Success Rate %', data: [78, 70, 62, 68, 55], backgroundColor: '#059669', borderRadius: 8 }] }} options={{ responsive: true, maintainAspectRatio: false }} />
                    </div>
                  </div>
                </div>

                {/* Match Logs Table */}
                <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">Historical Analytics Match Logs</h3>
                    <span className="text-[9px] font-mono bg-slate-200 text-slate-600 font-bold px-2 py-0.5 rounded-md">D4 Analytics DB</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead>
                        <tr className="bg-slate-50/70 text-slate-500 font-bold uppercase border-b border-slate-200/60">
                          <th className="p-4 pl-6">Match Date</th>
                          <th className="p-4">Entry Identifier</th>
                          <th className="p-4">Config Structure</th>
                          <th className="p-4">Arena Location</th>
                          <th className="p-4 text-center">Outcome Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                        {matchHistory.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50/40 transition-colors">
                            <td className="p-4 pl-6 font-mono text-slate-400">{log.date}</td>
                            <td className="p-4 font-bold text-slate-900">{log.entry_name} <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded border ml-1.5">{log.breed}</span></td>
                            <td className="p-4 text-slate-600 font-medium">{log.type}</td>
                            <td className="p-4 text-slate-400 font-normal">{log.location}</td>
                            <td className="p-4 text-center">
                              <span className={`px-2.5 py-0.5 rounded-full font-black text-[9px] uppercase tracking-wide border ${log.outcome === 'Win' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : log.outcome === 'Loss' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>{log.outcome}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ==================== 🧬 PROFILING ENGINE PANEL ==================== */}
            {currentPage === 'profiling' && (
              <div className="space-y-5 animate-fadeIn">
                
                {/* Header Profile Title */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col gap-3">
                  <div>
                    <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Profiling & Lineage Core Matrix</h1>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">Encode specific traits to track ancestry weights and biological specifications</p>
                  </div>

                  {/* 🔀 Premium Segmented Control Switcher */}
                  <div className="bg-slate-100 p-1 rounded-xl flex w-full border border-slate-200/40 mt-1 shrink-0">
                    <button 
                      onClick={() => setProfilingSubTab('form')}
                      className={`flex-1 py-2 text-xs font-black rounded-lg transition-all text-center cursor-pointer ${profilingSubTab === 'form' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}
                    >
                      📝 Encode Node
                    </button>
                    <button 
                      onClick={() => setProfilingSubTab('registry')}
                      className={`flex-1 py-2 text-xs font-black rounded-lg transition-all text-center cursor-pointer ${profilingSubTab === 'registry' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}
                    >
                      🌳 Family Registry ({fowls.length})
                    </button>
                  </div>
                </div>

                {/* 1️⃣ SUB-TAB: ENCODE REGISTRY FORM */}
                {profilingSubTab === 'form' && (
                  <form onSubmit={handleAddFowl} className="space-y-4 animate-fadeIn">
                    
                    {/* Card A: Identifiers & Strain */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm space-y-3">
                      <h3 className="font-extrabold text-[11px] text-emerald-700 uppercase tracking-wider flex items-center space-x-1.5 border-b pb-2">
                        <span>🏷️</span> <span>Step 1: Core Identifiers</span>
                      </h3>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wide">Identifier Name</label>
                        <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50/50 outline-none focus:bg-white focus:border-emerald-500 transition-all font-medium" placeholder="e.g., Roundhead Storm" required />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wide">Genetic Strain</label>
                          <select value={newBreed} onChange={(e) => setNewBreed(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 font-bold text-slate-700 outline-none">
                            <option value="Roundhead">Roundhead</option>
                            <option value="Sweater">Sweater</option>
                            <option value="Lemon">Lemon</option>
                            <option value="Hatch">Hatch</option>
                            <option value="Kelso">Kelso</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wide">Gender Class</label>
                          <select value={newGender} onChange={(e) => setNewGender(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 font-bold text-slate-700 outline-none">
                            <option value="Rooster">Rooster (Cock)</option>
                            <option value="Hen">Hen (Pullet)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Card B: Physical & Behavioral Specifications */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm space-y-3">
                      <h3 className="font-extrabold text-[11px] text-emerald-700 uppercase tracking-wider flex items-center space-x-1.5 border-b pb-2">
                        <span>🧬</span> <span>Step 2: Physical & Behavioral Matrix</span>
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wide">Color Category</label>
                          <select value={newColorCategory} onChange={(e) => { setNewColorCategory(e.target.value); setNewColor(e.target.value === 'Red' ? 'Bright Red' : 'Talisay / Grey'); }} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 font-bold text-slate-700 outline-none">
                            <option value="Red">Red Class</option>
                            <option value="Light Color">Light Class</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wide">Specific Tone</label>
                          <select value={newColor} onChange={(e) => setNewColor(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-700 font-medium">
                            {newColorCategory === 'Red' ? (
                              <>
                                <option value="Bright Red">Bright Red</option>
                                <option value="Dark Red">Dark Red</option>
                                <option value="Light Red">Light Red</option>
                              </>
                            ) : (
                              <>
                                <option value="Talisay / Grey">Talisay / Grey</option>
                                <option value="White Cup">White Cup</option>
                                <option value="Black">Black</option>
                              </>
                            )}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wide">Behavioral Trait</label>
                          <select value={newBehaviorTrait} onChange={(e) => setNewBehaviorTrait(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-700 font-medium outline-none">
                            <option value="Wave-Motion Tracker">Wave Tracker</option>
                            <option value="Precision Stepper">Precision Stepper</option>
                            <option value="Aggressive Alertness">Aggressive Alertness</option>
                            <option value="Smart Lineage Spec">Smart Lineage Spec</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wide">Eye Variant</label>
                          <select value={newEyeVariant} onChange={(e) => setNewEyeVariant(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-700 font-medium outline-none">
                            <option value="Standard Eye">Standard Eye</option>
                            <option value="Prairie Eye Sub-strain">Prairie Eye</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wide">Age (Mos)</label>
                          <input type="number" value={age} onChange={(e) => handleAgeChange(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs text-center font-bold" placeholder="0" required />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wide">Growth</label>
                          <input type="text" value={newGrowthStage} readOnly className="w-full p-2.5 border border-emerald-100 rounded-xl text-xs text-center font-bold bg-emerald-50 text-emerald-800" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wide">Weight (kg)</label>
                          <input type="text" value={weight} onChange={(e) => setWeight(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs text-center font-bold" placeholder="0.0" />
                        </div>
                      </div>
                    </div>

                    {/* Card C: Ancestry Parents & Attachment */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm space-y-3">
                      <h3 className="font-extrabold text-[11px] text-emerald-700 uppercase tracking-wider flex items-center space-x-1.5 border-b pb-2">
                        <span>🌳</span> <span>Step 3: Ancestry Roots & Photo</span>
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wide">Sire (Father)</label>
                          <input type="text" value={sireName} onChange={(e) => setSireName(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50/50 outline-none" placeholder="Sire" required />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wide">Dam (Mother)</label>
                          <input type="text" value={damName} onChange={(e) => setDamName(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50/50 outline-none" placeholder="Dam" required />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wide">Sire Pct (%)</label>
                          <input type="number" value={sirePct} onChange={(e) => setSirePct(Number(e.target.value))} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50/50 outline-none font-bold" min="0" max="100" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wide">Dam Pct (%)</label>
                          <input type="number" value={damPct} onChange={(e) => setDamPct(Number(e.target.value))} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50/50 outline-none font-bold" min="0" max="100" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wide">Fowl Attachment</label>
                        <label className="flex flex-col items-center justify-center w-full h-16 border-2 border-slate-200 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100/70 transition-all">
                          <span className="text-[10px] text-slate-500 font-bold">📷 {selectedImage ? selectedImage.name : 'Choose fowl image file'}</span>
                          <input type="file" accept="image/*" onChange={(e) => e.target.files && setSelectedImage(e.target.files[0])} className="hidden" />
                        </label>
                      </div>
                    </div>

                    {/* Submit Node */}
                    <button type="submit" disabled={loading || uploadingImage} className="w-full bg-slate-900 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl text-xs shadow-md uppercase tracking-wider cursor-pointer transition-all">
                      {uploadingImage ? 'Uploading Attachment...' : 'Commit Node Objects'}
                    </button>
                  </form>
                )}

                {/* 2️⃣ SUB-TAB: COMPACT FAMILY RECORDS LIST */}
                {profilingSubTab === 'registry' && (
                  <div className="space-y-4 animate-fadeIn">
                    {fowls.length === 0 ? (
                      <div className="bg-white p-12 text-center border rounded-2xl text-slate-400 text-xs shadow-sm">
                        No farm objects inside the live cloud cluster. Encode on the other tab!
                      </div>
                    ) : fowls.map(fowl => {
                      const siblings = getSiblingsForFowl(fowl.sire, fowl.dam, fowl.id);
                      return (
                        <div key={fowl.id} className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm relative overflow-hidden flex flex-col sm:flex-row gap-4 items-center">
                          <div className="w-20 h-20 bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center text-slate-400 text-[9px] font-mono shadow-inner relative">
                            {fowl.image_url ? <img src={fowl.image_url} alt={fowl.name} className="w-full h-full object-cover" /> : 'NO PHOTO'}
                          </div>
                          
                          <div className="flex-1 w-full space-y-3">
                            <span className="absolute top-0 right-0 text-[8px] font-black uppercase px-3 py-1 bg-slate-900 text-white rounded-bl-xl tracking-wider shadow-sm">{fowl.growth_stage || 'Stag'}</span>
                            <div className="flex items-center space-x-2">
                              <h4 className="text-base font-extrabold text-slate-900">{fowl.name}</h4>
                              <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 rounded-md uppercase">{fowl.breed}</span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-slate-500 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                              <div>Color: <strong className="text-slate-800">{fowl.color_category} ({fowl.color})</strong></div>
                              <div>Trait: <strong className="text-emerald-700">{fowl.behavior_trait}</strong></div>
                              <div>Sire: <strong className="text-slate-800">{fowl.sire}</strong></div>
                              <div>Dam: <strong className="text-slate-800">{fowl.dam}</strong></div>
                            </div>
                            
                            <div className="text-[10px] text-slate-500 flex justify-between items-center bg-slate-50 p-2 px-3 rounded-lg border">
                              <div className="font-semibold">Siblings: <span className="text-emerald-700 font-bold">{siblings.length > 0 ? siblings.join(', ') : 'None'}</span></div>
                            </div>

                            {/* 🛠️ Action Buttons Inside the Card */}
                            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
                              <button 
                                onClick={() => setSelectedFowlForDetails(fowl)}
                                className="flex-1 min-w-[70px] bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black py-1.5 rounded-lg border border-slate-300/40 text-center cursor-pointer transition-all flex items-center justify-center space-x-1"
                              >
                                <span>🔍</span> <span>More Details</span>
                              </button>
                              <button 
                                onClick={() => handleOpenEditModal(fowl)}
                                className="flex-1 min-w-[70px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-black py-1.5 rounded-lg border border-emerald-200/50 text-center cursor-pointer transition-all flex items-center justify-center space-x-1"
                              >
                                <span>✏️</span> <span>Edit</span>
                              </button>
                              {fowl.status === 'Active' && (
                                <button 
                                  onClick={() => handleArchiveFowl(fowl.id)}
                                  className="flex-1 min-w-[70px] bg-rose-50 hover:bg-rose-100 text-rose-600 text-[10px] font-black py-1.5 rounded-lg border border-rose-200/40 text-center cursor-pointer transition-all flex items-center justify-center space-x-1"
                                >
                                  <span>🗎</span> <span>Archive</span>
                                </button>
                              )}
                            </div>

                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Catalog Panel */}
            {currentPage === 'marketplace' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h1 className="text-xl font-black text-slate-900 tracking-tight">Verified Breeding Cohort Catalog</h1>
                    <p className="text-xs text-slate-500 font-medium">Transparent cohort matrix filterable by active pedigree clusters</p>
                  </div>
                  <input type="text" placeholder="🔍 Search lineage strains..." value={search} onChange={(e) => setSearch(e.target.value)} className="p-2.5 border border-slate-200 rounded-xl bg-slate-50/50 text-xs outline-none focus:bg-white focus:border-emerald-500 w-full sm:w-60 transition-all" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {fowls.filter(item => item.status === 'Active' && item.breed.toLowerCase().includes(search.toLowerCase())).map(item => (
                    <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-200/60 flex flex-col sm:flex-row gap-3 items-center shadow-sm relative overflow-hidden">
                      <span className="absolute top-2 right-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">✓ Verified Pedigree</span>
                      <div className="w-16 h-16 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center font-mono text-slate-300 text-[8px] relative">
                        {item.image_url ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" /> : 'NO PHOTO'}
                      </div>
                      <div className="space-y-1 flex-1 w-full text-xs">
                        <div className="flex items-center space-x-1.5">
                          <h4 className="font-black text-slate-900">{item.name}</h4>
                          <span className="text-[8px] font-mono font-bold bg-slate-900 text-white px-1.5 py-0.5 rounded uppercase">{item.growth_stage || 'Stag'}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold">Strain: <span className="text-slate-800">{item.breed}</span></p>
                        <div className="grid grid-cols-2 gap-1 bg-slate-50 p-1.5 rounded-lg text-[10px] text-slate-600">
                          <div>Tone: <strong className="text-slate-800">{item.color}</strong></div>
                          <div>Trait: <strong className="text-emerald-700">{item.behavior_trait}</strong></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* External Custom Core Subpages */}
            {currentPage === 'profile' && <div className="p-1 animate-fadeIn"><ProfilePage /></div>}
            {currentPage === 'settings' && <div className="p-1 animate-fadeIn"><SettingsPage /></div>}

          </main>

          {/* ==================== 📱 PREMIUM BOTTOM NAV (Only visible on Mobile view) ==================== */}
          <nav className="fixed bottom-0 left-0 right-0 h-16 border-t border-slate-200 bg-white flex justify-around items-center px-4 shrink-0 z-50 md:hidden shadow-lg">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: '📊' },
              { id: 'profiling', label: 'Profiling', icon: '🧬' },
              { id: 'marketplace', label: 'Catalog', icon: '🛒' },
              { id: 'profile', label: 'Profile', icon: '👤' },
              { id: 'settings', label: 'Settings', icon: '⚙️' },
            ].map((menu) => (
              <button 
                key={menu.id}
                onClick={() => setCurrentPage(menu.id as any)}
                className={`flex flex-col items-center justify-center w-12 h-full cursor-pointer transition-all ${
                  currentPage === menu.id ? 'text-emerald-600 scale-105' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <span className="text-lg">{menu.icon}</span>
                <span className="text-[8px] font-black mt-0.5 tracking-wider">{menu.label}</span>
              </button>
            ))}
          </nav>

        </div>
      )}

      {/* ==================== 🔍 MORE DETAILS POPUP OVERLAY (MODAL) ==================== */}
      {selectedFowlForDetails && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[99] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center space-x-2">
                <span className="text-lg">🧬</span>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Genetic Profile & Analysis</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">ID #{selectedFowlForDetails.id}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedFowlForDetails(null)}
                className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-600">
              
              {/* Profile Card Intro */}
              <div className="flex items-center space-x-4 bg-slate-50 p-4 rounded-2xl border">
                <div className="w-16 h-16 bg-slate-200 rounded-xl overflow-hidden shadow-inner flex-shrink-0">
                  {selectedFowlForDetails.image_url ? (
                    <img src={selectedFowlForDetails.image_url} alt={selectedFowlForDetails.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-mono text-[8px] text-slate-400 font-bold">NO PHOTO</div>
                  )}
                </div>
                <div>
                  <div className="flex items-center space-x-1.5">
                    <h4 className="text-lg font-black text-slate-900">{selectedFowlForDetails.name}</h4>
                    <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded uppercase">{selectedFowlForDetails.breed}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium">Growth Classification: <strong className="text-slate-700">{selectedFowlForDetails.growth_stage}</strong></p>
                </div>
              </div>

              {/* 🧬 Lineage Bloodline Analytics Progress Indicators */}
              <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Lineage Integration Balance</h4>
                
                {/* Sire Pct */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500">
                    <span>♂ Sire Heritage Weight ({selectedFowlForDetails.sire})</span>
                    <span className="text-slate-800">{selectedFowlForDetails.sire_pct ?? 100}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div className="bg-sky-500 h-full rounded-full" style={{ width: `${selectedFowlForDetails.sire_pct ?? 100}%` }}></div>
                  </div>
                </div>

                {/* Dam Pct */}
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500">
                    <span>♀ Dam Heritage Weight ({selectedFowlForDetails.dam})</span>
                    <span className="text-slate-800">{selectedFowlForDetails.dam_pct ?? 100}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div className="bg-pink-500 h-full rounded-full" style={{ width: `${selectedFowlForDetails.dam_pct ?? 100}%` }}></div>
                  </div>
                </div>

                {/* Bloodline Pct Total */}
                <div className="pt-2 border-t border-slate-200/50 flex justify-between items-center text-[11px]">
                  <span className="font-extrabold text-slate-700">Combined Bloodline Index</span>
                  <span className="font-mono font-black text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 rounded-full">
                    {selectedFowlForDetails.bloodline_pct ?? 100}%
                  </span>
                </div>
              </div>

              {/* Physical Specifications Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Age Parameter</span>
                  <strong className="text-slate-800 text-xs mt-0.5 block">{selectedFowlForDetails.age || 'N/A'}</strong>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Structural Weight</span>
                  <strong className="text-slate-800 text-xs mt-0.5 block">{selectedFowlForDetails.weight || 'N/A'}</strong>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Height Dimension</span>
                  <strong className="text-slate-800 text-xs mt-0.5 block">{selectedFowlForDetails.height || 'N/A'}</strong>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Eye Specimen Variant</span>
                  <strong className="text-slate-800 text-xs mt-0.5 block">{selectedFowlForDetails.eye_variant || 'Standard Eye'}</strong>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Visual Color Range</span>
                  <strong className="text-slate-800 text-xs mt-0.5 block">{selectedFowlForDetails.color_category} ({selectedFowlForDetails.color})</strong>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Behavioral Spec</span>
                  <strong className="text-emerald-700 text-xs mt-0.5 block font-bold">{selectedFowlForDetails.behavior_trait}</strong>
                </div>
              </div>

              {/* Status */}
              <div className="flex justify-between items-center p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="font-bold text-slate-500">Global Archive Node Status</span>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${selectedFowlForDetails.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                  ● {selectedFowlForDetails.status}
                </span>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ==================== ✏️ EDIT NODE POPUP OVERLAY (MODAL) ==================== */}
      {editingFowl && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[99] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center space-x-2">
                <span className="text-lg">✏️</span>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Edit Node Registry</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Update parameters for {editingFowl.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setEditingFowl(null)}
                className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                ✕ Cancel
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleUpdateFowl} className="overflow-y-auto p-6 space-y-4 text-xs">
              
              {/* Form Card 1: Core Info */}
              <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-200/40">
                <h4 className="font-black text-emerald-700 text-[10px] uppercase tracking-wider flex items-center space-x-1 border-b pb-1">
                  <span>🏷️</span> <span>Core Identity</span>
                </h4>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Identifier Name</label>
                  <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-white outline-none focus:border-emerald-500 font-medium" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Genetic Strain</label>
                    <select value={editBreed} onChange={(e) => setEditBreed(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-white font-bold text-slate-700 outline-none">
                      <option value="Roundhead">Roundhead</option>
                      <option value="Sweater">Sweater</option>
                      <option value="Lemon">Lemon</option>
                      <option value="Hatch">Hatch</option>
                      <option value="Kelso">Kelso</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Gender Class</label>
                    <select value={editGender} onChange={(e) => setEditGender(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-white font-bold text-slate-700 outline-none">
                      <option value="Rooster">Rooster (Cock)</option>
                      <option value="Hen">Hen (Pullet)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Form Card 2: Physical Metrics */}
              <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-200/40">
                <h4 className="font-black text-emerald-700 text-[10px] uppercase tracking-wider flex items-center space-x-1 border-b pb-1">
                  <span>📐</span> <span>Physical Parameters</span>
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Color Group</label>
                    <select value={editColorCategory} onChange={(e) => { setEditColorCategory(e.target.value); setEditColor(e.target.value === 'Red' ? 'Bright Red' : 'Talisay / Grey'); }} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-white font-bold text-slate-700 outline-none">
                      <option value="Red">Red Class</option>
                      <option value="Light Color">Light Class</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Specific Tone</label>
                    <select value={editColor} onChange={(e) => setEditColor(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 font-medium">
                      {editColorCategory === 'Red' ? (
                        <>
                          <option value="Bright Red">Bright Red</option>
                          <option value="Dark Red">Dark Red</option>
                          <option value="Light Red">Light Red</option>
                        </>
                      ) : (
                        <>
                          <option value="Talisay / Grey">Talisay / Grey</option>
                          <option value="White Cup">White Cup</option>
                          <option value="Black">Black</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Age (Mos)</label>
                    <input type="number" value={editAge} onChange={(e) => handleEditAgeChange(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs text-center font-bold bg-white" placeholder="0" required />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Growth</label>
                    <input type="text" value={editGrowthStage} readOnly className="w-full p-2.5 border border-emerald-100 rounded-xl text-xs text-center font-bold bg-emerald-50 text-emerald-800" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Weight (kg)</label>
                    <input type="text" value={editWeight} onChange={(e) => setEditWeight(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs text-center font-bold bg-white" placeholder="0.0" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Height (cm)</label>
                    <input type="text" value={editHeight} onChange={(e) => setEditHeight(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold bg-white" placeholder="e.g., 40" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Eye Variant</label>
                    <select value={editEyeVariant} onChange={(e) => setEditEyeVariant(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 font-medium outline-none">
                      <option value="Standard Eye">Standard Eye</option>
                      <option value="Prairie Eye Sub-strain">Prairie Eye</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Behavioral Trait</label>
                  <select value={editBehaviorTrait} onChange={(e) => setEditBehaviorTrait(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 font-medium outline-none">
                    <option value="Wave-Motion Tracker">Wave Tracker</option>
                    <option value="Precision Stepper">Precision Stepper</option>
                    <option value="Aggressive Alertness">Aggressive Alertness</option>
                    <option value="Smart Lineage Spec">Smart Lineage Spec</option>
                  </select>
                </div>
              </div>

              {/* Form Card 3: Lineage Metrics */}
              <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-200/40">
                <h4 className="font-black text-emerald-700 text-[10px] uppercase tracking-wider flex items-center space-x-1 border-b pb-1">
                  <span>🌳</span> <span>Ancestry Lineage Roots</span>
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Sire (Father)</label>
                    <input type="text" value={editSire} onChange={(e) => setEditSire(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-white outline-none" placeholder="Sire" required />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Dam (Mother)</label>
                    <input type="text" value={editDam} onChange={(e) => setEditDam(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-white outline-none" placeholder="Dam" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Sire Pct (%)</label>
                    <input type="number" value={editSirePct} onChange={(e) => setEditSirePct(Number(e.target.value))} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-white outline-none font-bold" min="0" max="100" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Dam Pct (%)</label>
                    <input type="number" value={editDamPct} onChange={(e) => setEditDamPct(Number(e.target.value))} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-white outline-none font-bold" min="0" max="100" />
                  </div>
                </div>
              </div>

              {/* Submit Changes */}
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-slate-900 hover:bg-emerald-700 text-white font-black py-3.5 rounded-xl text-xs shadow-md uppercase tracking-wider cursor-pointer transition-all"
              >
                {loading ? 'Saving Parameters...' : 'Commit Updated Registry Node'}
              </button>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}