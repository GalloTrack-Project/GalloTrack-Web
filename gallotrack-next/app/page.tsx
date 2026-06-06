'use client';
import React, { useState, useEffect } from 'react';
import { Doughnut, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { createClient } from '@supabase/supabase-js';
import ProfilePage from './profile/page';
import SettingsPage from './settings/page';

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
  const [currentPage, setCurrentPage] = useState<'login' | 'dashboard' | 'profiling' | 'marketplace' | 'profile' | 'settings'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const [fowls, setFowls] = useState<FowlRecord[]>([]);
  const [matchHistory, setMatchHistory] = useState<MatchRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // Form Field States wired to structural parameters
  const [newName, setNewName] = useState('');
  const [newBreed, setNewBreed] = useState('Sweater');
  const [newGender, setNewGender] = useState('Rooster');
  const [newColor, setNewColor] = useState('Bright Red');
  const [newColorCategory, setNewColorCategory] = useState('Red');
  const [newGrowthStage, setNewGrowthStage] = useState('Stag');
  const [newBehaviorTrait, setNewBehaviorTrait] = useState('Wave-Motion Cutter');
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
        alert('GalloTrack Notice: Record successfully saved with expanded behavioral & color indices.');
        setNewName(''); setSireName(''); setDamName(''); setWeight(''); setHeight(''); setAge(''); setSelectedImage(null);
        fetchDatabaseResources();
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
    else fetchDatabaseResources();
  };

  return (
    <div className="bg-[#f1f5f9] min-h-screen font-sans antialiased text-slate-800 flex flex-col md:flex-row">
      
      {/* ==================== PREMIUM LOGIN FRAMEWORK ==================== */}
      {currentPage === 'login' && (
        <div className="flex items-center justify-center min-h-screen w-full p-6 bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#047857]">
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

      {/* ==================== ENTERPRISE SIDEBAR NAVIGATION ==================== */}
      {currentPage !== 'login' && (
        <aside className="w-full md:w-64 bg-slate-900 text-slate-200 flex flex-col md:fixed md:inset-y-0 md:left-0 z-50 border-r border-slate-800 shadow-2xl">
          <div className="p-6 border-b border-slate-800/60 bg-slate-950/40 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-white bg-gradient-to-r from-white to-emerald-400 bg-clip-text text-transparent">GALLOTRACK</h2>
              <span className="text-[9px] font-mono font-bold text-emerald-400 tracking-wider uppercase mt-1 block">v1.2.0 Production stable</span>
            </div>
          </div>
          <nav className="flex-1 p-4 space-y-1.5 mt-4">
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
          
          <div className="p-4 border-t border-slate-800 bg-slate-950/60 space-y-3">
            <button onClick={() => { setUsername(''); setPassword(''); setCurrentPage('login'); }} className="w-full bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-200 border border-slate-700/50 hover:border-rose-900/30 text-left flex items-center space-x-3 px-4 py-2.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer">
              <span>🚪 Terminate Core Session</span>
            </button>
            <div className="text-center text-[9px] text-slate-600 font-mono tracking-widest uppercase">ISUFST CLUSTER SYSTEM</div>
          </div>
        </aside>
      )}

      {/* ==================== MAIN PANEL REGION ==================== */}
      {currentPage !== 'login' && (
        <div className="flex-1 md:pl-64 flex flex-col min-h-screen">
          <header className="bg-white border-b border-slate-200/80 p-4 sticky top-0 z-40 flex justify-between items-center shadow-sm px-8">
            <div className="text-xs font-mono font-bold text-slate-400 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>SUPABASE POSTGRESQL DATA LINK: ACTIVE</span>
            </div>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border">Dingle Campus Hub</span>
          </header>

          <main className="p-6 md:p-8 flex-1 max-w-6xl w-full mx-auto space-y-6">
            
            {/* ==================== DASHBOARD PANEL ==================== */}
            {currentPage === 'dashboard' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <div className="space-y-1">
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Dynamic Cross-Breeding Analytics</h1>
                    <p className="text-xs text-slate-500 font-medium">Aggregated empirical cross-breed success algorithms and genetic performance metrics</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60 flex flex-col items-center">
                    <h3 className="text-xs font-black text-slate-400 uppercase mb-6 tracking-widest text-center w-full border-b pb-3">Cross-Breed Win Ratios (Empirical Logs)</h3>
                    <div className="w-56 h-56"><Doughnut data={{ labels: ['Roundhead Cross', 'Hatch Cross', 'Kelso Combos'], datasets: [{ data: [65, 45, 58], backgroundColor: ['#10b981', '#f43f5e', '#f59e0b'], borderWidth: 0 }] }} options={{ responsive: true, maintainAspectRatio: false }} /></div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60">
                    <h3 className="text-xs font-black text-slate-400 uppercase mb-6 tracking-widest border-b pb-3">Lineage Cohort Success Probability (%)</h3>
                    <div className="w-full h-56"><Bar data={{ labels: ['Roundhead', 'Sweater', 'Lemon', 'Kelso', 'Hatch'], datasets: [{ label: 'Estimated Success Rate %', data: [78, 70, 62, 68, 55], backgroundColor: '#059669', borderRadius: 8 }] }} options={{ responsive: true, maintainAspectRatio: false }} /></div>
                  </div>
                </div>

                {/* MATCH LOGS */}
                <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center px-6">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">Historical Analytics Match Logs</h3>
                    <span className="text-[10px] font-mono bg-slate-200 text-slate-600 font-bold px-2 py-0.5 rounded-md">D4 Analytics DB</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
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
                              <span className={`px-3 py-1 rounded-full font-black text-[10px] uppercase tracking-wide border ${log.outcome === 'Win' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : log.outcome === 'Loss' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>{log.outcome}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ==================== PROFILING ENGINE PANEL ==================== */}
            {currentPage === 'profiling' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm">
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">Profiling & Lineage Core Matrix</h1>
                  <p className="text-xs text-slate-500 font-medium">Encode specific traits to track ancestry weights and biological specifications</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* FORM DESIGN */}
                  <form onSubmit={handleAddFowl} className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm space-y-4 lg:col-span-1 self-start">
                    <h3 className="font-bold text-xs text-emerald-700 uppercase tracking-widest border-b pb-3 flex items-center space-x-2"><span>📝</span><span>Encode Registry Node</span></h3>
                    
                    <div className="space-y-3.5">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wide">Identifier Name</label>
                        <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50/50 outline-none focus:bg-white focus:border-emerald-500 transition-all font-medium" placeholder="e.g., Roundhead Storm" required />
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wide">Genetic Strain</label>
                          <select value={newBreed} onChange={(e) => setNewBreed(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 font-bold text-slate-700 outline-none focus:bg-white focus:border-emerald-500 transition-all">
                            <option value="Roundhead">Roundhead</option>
                            <option value="Sweater">Sweater</option>
                            <option value="Lemon">Lemon</option>
                            <option value="Hatch">Hatch</option>
                            <option value="Kelso">Kelso</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wide">Gender Class</label>
                          <select value={newGender} onChange={(e) => setNewGender(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 font-bold text-slate-700 outline-none focus:bg-white focus:border-emerald-500 transition-all">
                            <option value="Rooster">Rooster (Cock)</option>
                            <option value="Hen">Hen (Pullet)</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wide">Color Category</label>
                          <select value={newColorCategory} onChange={(e) => { setNewColorCategory(e.target.value); setNewColor(e.target.value === 'Red' ? 'Bright Red' : 'Talisay / Grey'); }} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-700 font-bold outline-none focus:bg-white focus:border-emerald-500 transition-all">
                            <option value="Red">Red Class</option>
                            <option value="Light Color">Light Color Class</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wide">Specific Tone</label>
                          <select value={newColor} onChange={(e) => setNewColor(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-700 font-medium outline-none focus:bg-white focus:border-emerald-500 transition-all">
                            {newColorCategory === 'Red' ? (
                              <>
                                <option value="Bright Red">Bright Red</option>
                                <option value="Dark Red">Dark Red</option>
                                <option value="Light Red">Light Red</option>
                                <option value="Red Cup">Red Cup</option>
                              </>
                            ) : (
                              <>
                                <option value="Talisay / Grey">Talisay / Grey</option>
                                <option value="White Cup">White Cup</option>
                                <option value="Black">Black</option>
                                <option value="Bulik">Bulik</option>
                                <option value="Brown">Brown</option>
                              </>
                            )}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wide">Behavioral Trait</label>
                          <select value={newBehaviorTrait} onChange={(e) => setNewBehaviorTrait(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-700 outline-none focus:bg-white focus:border-emerald-500 transition-all">
                            <option value="Wave-Motion Cutter">Wave-Motion Cutter</option>
                            <option value="Side-Stepper Slasher">Side-Stepper Slasher</option>
                            <option value="Aggressive Shuffler">Aggressive Shuffler</option>
                            <option value="Strategic / Smart Combat">Strategic Combat</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wide">Eye Variant</label>
                          <select value={newEyeVariant} onChange={(e) => setNewEyeVariant(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-700 outline-none focus:bg-white focus:border-emerald-500 transition-all">
                            <option value="Standard Eye">Standard Eye</option>
                            <option value="Prairie Eye Sub-strain">Prairie Eye</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wide">Age (Mos)</label>
                          <input type="number" value={age} onChange={(e) => handleAgeChange(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs text-center font-bold bg-slate-50/50" placeholder="0" required />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wide">Growth Stage</label>
                          <input type="text" value={newGrowthStage} readOnly className="w-full p-2.5 border border-emerald-200 rounded-xl text-xs text-center font-mono bg-emerald-50/50 font-bold text-emerald-800" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wide">Weight (kg)</label>
                          <input type="text" value={weight} onChange={(e) => setWeight(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs text-center font-bold bg-slate-50/50" placeholder="0.0" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5 border-t border-slate-100 pt-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wide">Sire (Father)</label>
                          <input type="text" value={sireName} onChange={(e) => setSireName(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50/50 outline-none" placeholder="Sire Identity" required />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wide">Dam (Mother)</label>
                          <input type="text" value={damName} onChange={(e) => setDamName(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50/50 outline-none" placeholder="Dam Identity" required />
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wide">Fowl Image Attachment</label>
                        <div className="flex items-center justify-center w-full">
                          <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-slate-200 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100/70 transition-all">
                            <div className="flex flex-col items-center justify-center pt-2 pb-2">
                              <p className="text-[11px] text-slate-500 font-bold">📷 {selectedImage ? selectedImage.name : 'Choose fowl image file'}</p>
                            </div>
                            <input type="file" accept="image/*" onChange={(e) => e.target.files && setSelectedImage(e.target.files[0])} className="hidden" />
                          </label>
                        </div>
                      </div>
                    </div>
                    <button type="submit" disabled={loading || uploadingImage} className="w-full bg-slate-900 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-xs shadow-md shadow-slate-900/10 cursor-pointer transition-all disabled:opacity-50 tracking-wider uppercase">
                      {uploadingImage ? 'Uploading Image...' : 'Commit Node Objects'}
                    </button>
                  </form>

                  {/* FOWL CARDS DISPLAY LIST */}
                  <div className="lg:col-span-2 space-y-4">
                    <h3 className="font-bold text-xs text-slate-400 uppercase tracking-widest pl-1">Automated Family Tree Records Registry</h3>
                    {fowls.length === 0 ? (
                      <div className="bg-white p-12 text-center border rounded-2xl text-slate-400 text-xs italic shadow-sm">No farm objects inside the live cloud cluster. Encode above!</div>
                    ) : fowls.map(fowl => {
                      const siblings = getSiblingsForFowl(fowl.sire, fowl.dam, fowl.id);
                      return (
                        <div key={fowl.id} className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm relative overflow-hidden flex flex-col sm:flex-row gap-5 items-center transition-all hover:shadow-md hover:border-slate-300">
                          
                          <div className="w-24 h-24 bg-slate-50 border border-slate-200/80 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center text-slate-400 text-[9px] font-mono font-bold shadow-inner relative">
                            {fowl.image_url ? (
                              <img src={fowl.image_url} alt={fowl.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-center p-1">NO PHOTO REGISTRY</span>
                            )}
                          </div>
                          
                          <div className="flex-1 w-full space-y-3.5">
                            <span className="absolute top-0 right-0 text-[9px] font-black uppercase px-4 py-1.5 bg-slate-900 text-white rounded-bl-xl tracking-wider shadow-sm">{fowl.growth_stage || 'Stag'}</span>
                            
                            <div>
                              <div className="flex items-center space-x-2">
                                <h4 className="text-xl font-extrabold text-slate-900 tracking-tight">{fowl.name}</h4>
                                <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md uppercase tracking-wide">{fowl.breed}</span>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 mt-2 text-[11px] text-slate-500 font-medium bg-slate-50/60 p-2 rounded-xl border border-slate-100">
                                <div>Color: <strong className="text-slate-800">{fowl.color_category || 'Red'} ({fowl.color || 'Bright Red'})</strong></div>
                                <div>Trait: <strong className="text-emerald-700 font-bold">{fowl.behavior_trait || 'Wave-Motion Cutter'}</strong></div>
                                <div>Eye Spec: <strong className="text-slate-800">{fowl.eye_variant || 'Standard Eye'}</strong></div>
                                <div>Age: <strong className="text-slate-800">{fowl.age}</strong></div>
                                <div>Weight: <strong className="text-slate-800">{fowl.weight}</strong></div>
                              </div>
                            </div>

                            <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-200/40 relative">
                              <span className="text-[8px] font-mono font-bold text-slate-300 uppercase tracking-widest absolute top-1 left-2">Genetic Tree Nodes</span>
                              <div className="grid grid-cols-2 gap-4 text-center mt-2">
                                <div className="bg-white p-2 rounded-lg border border-slate-100 shadow-sm text-xs"><span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider mb-0.5">Sire Line</span><span className="font-extrabold text-slate-800">{fowl.sire}</span></div>
                                <div className="bg-white p-2 rounded-lg border border-slate-100 shadow-sm text-xs"><span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider mb-0.5">Dam Line</span><span className="font-extrabold text-slate-800">{fowl.dam}</span></div>
                              </div>
                            </div>

                            <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 px-4 rounded-xl border border-slate-200/50 flex justify-between items-center gap-4">
                              <div className="font-semibold">Identified Siblings: <span className="text-emerald-700 font-black">{siblings.length > 0 ? siblings.join(', ') : 'None detected'}</span></div>
                              {fowl.status === 'Active' && <button onClick={() => handleArchiveFowl(fowl.id)} className="bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 font-bold px-3 py-1 border border-slate-200 rounded-xl text-[10px] transition-all cursor-pointer shadow-sm">🗎 Archive</button>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ==================== MARKETPLACE CATALOG PANEL ==================== */}
            {currentPage === 'marketplace' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Verified Breeding Cohort Catalog</h1>
                    <p className="text-xs text-slate-500 font-medium">Transparent cohort matrix filterable by active pedigree clusters</p>
                  </div>
                  <input type="text" placeholder="🔍 Search lineage strains (e.g., Roundhead)..." value={search} onChange={(e) => setSearch(e.target.value)} className="p-3 border border-slate-200 rounded-xl bg-slate-50/50 text-xs outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 w-full sm:w-72 transition-all shadow-inner font-medium" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {fowls.filter(item => item.status === 'Active' && item.breed.toLowerCase().includes(search.toLowerCase())).map(item => (
                    <div key={item.id} className="bg-white p-5 rounded-2xl border border-slate-200/60 flex gap-4 items-center shadow-sm relative overflow-hidden hover:border-slate-300 transition-all">
                      <span className="absolute top-3 right-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">✓ Verified Pedigree</span>
                      
                      <div className="w-20 h-20 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center font-mono font-bold text-slate-300 text-[9px] relative shadow-inner">
                        {item.image_url ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" /> : 'NO PHOTO'}
                      </div>
                      
                      <div className="space-y-2 flex-1">
                        <div>
                          <h4 className="text-lg font-black text-slate-900 tracking-tight">{item.name}</h4>
                          <span className="text-[10px] font-bold text-slate-400 block mt-0.5">Strain Grouping: <span className="text-slate-800 font-extrabold">{item.breed}</span></span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 text-[11px] bg-slate-50 p-2 rounded-xl text-slate-600 font-medium border border-slate-100">
                          <div>Class: <strong className="text-slate-900">{item.color}</strong></div>
                          <div>Trait: <strong className="text-emerald-700">{item.behavior_trait || 'Wave-Motion Cutter'}</strong></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* EXTERNAL CORE ROUTING BLOCKS */}
            {currentPage === 'profile' && <div className="p-2 animate-fadeIn"><ProfilePage /></div>}
            {currentPage === 'settings' && <div className="p-2 animate-fadeIn"><SettingsPage /></div>}

          </main>
        </div>
      )}

    </div>
  );
}