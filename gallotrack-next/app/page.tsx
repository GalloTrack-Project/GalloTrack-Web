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

interface ToastState {
  show: boolean;
  message: string;
  type: 'success' | 'error' | 'warning';
}

export default function GalloTrackSystem() {
  const [showSplash, setShowSplash] = useState(true);
  const [currentPage, setCurrentPage] = useState<'login' | 'dashboard' | 'profiling' | 'marketplace' | 'profile' | 'settings'>('login');
  const [profilingSubTab, setProfilingSubTab] = useState<'form' | 'registry' | 'matchForm'>('form');

  // Premium Toast Notification State
  const [toast, setToast] = useState<ToastState>({ show: false, message: '', type: 'success' });

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

  // Match History Form State Variables
  const [selectedFowlForMatch, setSelectedFowlForMatch] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [opponentName, setOpponentName] = useState('');
  const [matchLocation, setMatchLocation] = useState('');
  const [matchType, setMatchType] = useState('Derby Match');
  const [matchOutcome, setMatchOutcome] = useState('Win');

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

  // Helper Trigger for Dynamic Toast
  const showToastMessage = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 4000);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

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
      setTimeout(() => showToastMessage('Access Authenticated. Welcome back, Hazel!', 'success'), 400);
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
        showToastMessage(`Database Error: ${insertErr.message}`, 'error');
      } else {
        showToastMessage('GalloTrack Registry Object saved successfully.', 'success');
        setNewName(''); setSireName(''); setDamName(''); setWeight(''); setHeight(''); setAge(''); setSelectedImage(null);
        fetchDatabaseResources();
        setProfilingSubTab('registry');
      }
    } catch (err: any) {
      showToastMessage(`Upload Cluster Failure: ${err.message || err}`, 'error');
    } finally {
      setLoading(false);
      setUploadingImage(false);
    }
  };

  const handleAddMatchRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFowlForMatch) {
      showToastMessage("Roster Cluster Selection Error: Select a registered fowl node.", "warning");
      return;
    }
    setLoading(true);

    try {
      const matchedFowl = fowls.find(f => f.name === selectedFowlForMatch);
      const fowlBreed = matchedFowl ? matchedFowl.breed : 'Unknown';

      const payload = {
        date: matchDate || new Date().toISOString().split('T')[0],
        entry_name: selectedFowlForMatch,
        breed: fowlBreed,
        opponent: opponentName || 'Anonymous Opponent',
        location: matchLocation || 'Local Breeding Yard',
        type: matchType,
        outcome: matchOutcome,
        status: 'Verified'
      };

      const { error: insertErr } = await supabase.from('match').insert([payload]);

      if (insertErr) {
        throw insertErr;
      } else {
        showToastMessage('Performance match vector successfully computed and logged.', 'success');
        setOpponentName(''); setMatchLocation('');
        fetchDatabaseResources();
        setProfilingSubTab('registry');
      }
    } catch (err: any) {
      showToastMessage(`Database Write Constraint Fault: ${err.message || err}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // 🔄 ARCHIVE HANDLER (WILL REMOVE THE BUTTON FOREVER ONCE CLICKED)
  const handleArchiveFowlOnly = async (id: number) => {
    setLoading(true);
    try {
      const { error: updateErr } = await supabase
        .from('fowl')
        .update({ status: 'Archived' })
        .eq('id', id);

      if (updateErr) {
        showToastMessage(updateErr.message, 'error');
      } else {
        showToastMessage('Node successfully shifted to relational archive log.', 'warning');
        if (selectedFowlForDetails?.id === id) setSelectedFowlForDetails(null);
        fetchDatabaseResources();
      }
    } catch (err: any) {
      showToastMessage(err.message || err, 'error');
    } finally {
      setLoading(false);
    }
  };

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

      showToastMessage('Relational properties successfully updated.', 'success');
      setEditingFowl(null);
      fetchDatabaseResources();
    } catch (err: any) {
      showToastMessage(`Update Cluster Fault: ${err.message || err}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const calculateCrossbreedWinRatios = () => {
    const breedStats: { [key: string]: { wins: number; total: number } } = {};

    matchHistory.forEach((match) => {
      const breedKey = match.breed || 'Unknown';
      if (!breedStats[breedKey]) {
        breedStats[breedKey] = { wins: 0, total: 0 };
      }
      
      breedStats[breedKey].total += 1;
      if (match.outcome.toLowerCase() === 'win') {
        breedStats[breedKey].wins += 1;
      }
    });

    const labels = Object.keys(breedStats);
    const data = labels.map(label => {
      const stats = breedStats[label];
      return stats.total > 0 ? Math.round((stats.wins / stats.total) * 100) : 0;
    });

    return {
      labels: labels.length > 0 ? labels : ['Roundhead Cross', 'Hatch Cross', 'Kelso Combos'],
      data: data.length > 0 ? data : [65, 45, 58]
    };
  };

  const calculateCohortSuccessProbability = () => {
    const cohortScores: { [key: string]: number[] } = {};

    fowls.filter(f => f.status === 'Active').forEach((fowl) => {
      const breed = fowl.breed;
      if (!cohortScores[breed]) {
        cohortScores[breed] = [];
      }

      const fowlMatches = matchHistory.filter(m => m.entry_name.toLowerCase() === fowl.name.toLowerCase());
      const wins = fowlMatches.filter(m => m.outcome.toLowerCase() === 'win').length;
      
      let dynamicScore = fowlMatches.length > 0 ? (wins / fowlMatches.length) * 100 : 50; 

      if (fowl.sire && fowl.sire.trim() !== '') dynamicScore += 5;
      if (fowl.dam && fowl.dam.trim() !== '') dynamicScore += 5;

      cohortScores[breed].push(Math.min(dynamicScore, 100));
    });

    const labels = Object.keys(cohortScores);
    const data = labels.map(label => {
      const scores = cohortScores[label];
      const average = scores.reduce((a, b) => a + b, 0) / scores.length;
      return Math.round(average);
    });

    return {
      labels: labels.length > 0 ? labels : ['Roundhead', 'Sweater', 'Lemon', 'Kelso', 'Hatch'],
      data: data.length > 0 ? data : [78, 70, 62, 68, 55]
    };
  };

  const crossbreedChartData = calculateCrossbreedWinRatios();
  const cohortChartData = calculateCohortSuccessProbability();

  if (showSplash) {
    return <SplashScreen onFinished={() => setShowSplash(false)} />;
  }

  return (
    <div className="bg-[#f8fafc] min-h-screen font-sans antialiased text-slate-800 flex flex-col md:flex-row overflow-hidden h-screen w-full relative">
      
      {/* ==================== 🚀 PREMIUM HUD TOAST NOTIFICATION SYSTEM ==================== */}
      {toast.show && (
        <div className="fixed top-5 right-5 z-[999] flex items-center p-4 max-w-sm rounded-2xl shadow-xl border backdrop-blur-md animate-slideIn bg-white/95 border-slate-200/80">
          <div className={`flex items-center justify-center w-8 h-8 rounded-xl mr-3 font-bold text-sm ${
            toast.type === 'success' ? 'bg-emerald-50 text-emerald-600' : toast.type === 'error' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
          }`}>
            {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : '‼'}
          </div>
          <div className="text-xs font-semibold tracking-wide text-slate-700">{toast.message}</div>
        </div>
      )}

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
            <button onClick={() => { setUsername(''); setPassword(''); setCurrentPage('login'); showToastMessage('System cluster session destroyed.', 'warning'); }} className="w-full bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-200 border border-slate-700/50 hover:border-rose-900/30 text-left flex items-center space-x-3 px-4 py-2.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer">
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
            
            {/* ==================== 📊 UPGRADED PRO DASHBOARD PANEL ==================== */}
            {currentPage === 'dashboard' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Dynamic Cross-Breeding Analytics</h1>
                    <p className="text-xs text-slate-400 font-semibold mt-0.5">Aggregated empirical cross-breed success algorithms and genetic performance metrics</p>
                  </div>
                  <button onClick={() => { fetchDatabaseResources(); showToastMessage('Live analytics cluster mapping updated.', 'success'); }} className="bg-slate-50 border border-slate-200 shadow-sm text-slate-700 font-bold py-2 px-4 rounded-xl text-xs hover:bg-slate-100 transition-all cursor-pointer">
                    🗘 Refresh Data Node
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/60 flex flex-col items-center justify-between min-h-[340px]">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest text-center w-full border-b pb-3 border-slate-100">Cross-Breed Win Ratios (Empirical Logs)</h3>
                    <div className="w-48 h-48 sm:w-52 sm:h-52 my-auto flex items-center justify-center">
                      <Doughnut 
                        data={{ 
                          labels: crossbreedChartData.labels, 
                          datasets: [{ 
                            data: crossbreedChartData.data, 
                            backgroundColor: ['#059669', '#f43f5e', '#d97706', '#2563eb', '#7c3aed'], 
                            borderWidth: 0 
                          }] 
                        }} 
                        options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10, weight: 'bold' } } } } }} 
                      />
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/60 flex flex-col justify-between min-h-[340px]">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest border-b pb-3 text-center border-slate-100">Lineage Cohort Success Probability (%)</h3>
                    <div className="w-full h-48 sm:h-52 my-auto">
                      <Bar 
                        data={{ 
                          labels: cohortChartData.labels, 
                          datasets: [{ 
                            label: 'Success Rate %', 
                            data: cohortChartData.data, 
                            backgroundColor: '#059669', 
                            borderRadius: 6 
                          }] 
                        }} 
                        options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 100, ticks: { font: { size: 10, weight: 'bold' } } }, x: { ticks: { font: { size: 10, weight: 'bold' } } } } }} 
                      />
                    </div>
                  </div>
                </div>

                {/* Match Logs Table */}
                <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden mt-6">
                  <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h3 className="text-xs font-black text-slate-600 uppercase tracking-wider">Historical Analytics Match Logs</h3>
                    <span className="text-[9px] font-mono bg-slate-200/80 text-slate-600 font-black px-2.5 py-1 rounded-lg">D4 Analytics DB</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 text-slate-500 font-extrabold uppercase border-b border-slate-200/60">
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
                <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col gap-3">
                  <div>
                    <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Profiling & Lineage Core Matrix</h1>
                    <p className="text-xs text-slate-400 font-semibold mt-0.5">Encode specific traits to track ancestry weights and biological specifications</p>
                  </div>
                  <div className="bg-slate-100 p-1 rounded-xl flex w-full border border-slate-200/40 mt-1 shrink-0">
                    <button onClick={() => setProfilingSubTab('form')} className={`flex-1 py-2 text-xs font-black rounded-lg transition-all text-center cursor-pointer ${profilingSubTab === 'form' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}>📝 Encode Node</button>
                    <button onClick={() => setProfilingSubTab('registry')} className={`flex-1 py-2 text-xs font-black rounded-lg transition-all text-center cursor-pointer ${profilingSubTab === 'registry' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}>🌳 Family Registry ({fowls.length})</button>
                    <button onClick={() => setProfilingSubTab('matchForm')} className={`flex-1 py-2 text-xs font-black rounded-lg transition-all text-center cursor-pointer ${profilingSubTab === 'matchForm' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}>⚔️ Match Logs</button>
                  </div>
                </div>

                {/* 1️⃣ SUB-TAB: ENCODE REGISTRY FORM */}
                {profilingSubTab === 'form' && (
                  <form onSubmit={handleAddFowl} className="space-y-4 animate-fadeIn">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm space-y-3">
                      <h3 className="font-extrabold text-[11px] text-emerald-700 uppercase tracking-wider flex items-center space-x-1.5 border-b pb-2"><span>🏷️</span> <span>Step 1: Core Identifiers</span></h3>
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

                    <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm space-y-3">
                      <h3 className="font-extrabold text-[11px] text-emerald-700 uppercase tracking-wider flex items-center space-x-1.5 border-b pb-2"><span>🧬</span> <span>Step 2: Physical Parameters</span></h3>
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

                    <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm space-y-3">
                      <h3 className="font-extrabold text-[11px] text-emerald-700 uppercase tracking-wider flex items-center space-x-1.5 border-b pb-2"><span>🌳</span> <span>Step 3: Ancestry Roots & Photo</span></h3>
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
                    </div>

                    <button type="submit" disabled={loading || uploadingImage} className="w-full bg-slate-900 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl text-xs shadow-md uppercase tracking-wider cursor-pointer transition-all">
                      {uploadingImage ? 'Uploading Attachment...' : 'Commit Node Objects'}
                    </button>
                  </form>
                )}

                {/* 2️⃣ SUB-TAB: COMPACT FAMILY RECORDS LIST */}
                {profilingSubTab === 'registry' && (
                  <div className="space-y-4 animate-fadeIn">
                    {fowls.length === 0 ? (
                      <div className="bg-white p-12 text-center border rounded-2xl text-slate-400 text-xs shadow-sm">No farm objects inside cluster.</div>
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
                              <span className={`text-[9px] font-black border px-2 rounded-md uppercase ${fowl.status === 'Active' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-rose-700 bg-rose-50 border-rose-200'}`}>{fowl.breed} ({fowl.status})</span>
                            </div>
                            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-slate-500 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                              <div>Sire: <strong className="text-slate-800">{fowl.sire || 'N/A'}</strong></div>
                              <div>Dam: <strong className="text-slate-800">{fowl.dam || 'N/A'}</strong></div>
                            </div>
                            
                            {/* 🛠️ Action Buttons Inside the Card */}
                            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
                              <button onClick={() => setSelectedFowlForDetails(fowl)} className="flex-1 min-w-[70px] bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black py-1.5 rounded-lg border text-center cursor-pointer transition-all">🔍 Details</button>
                              <button onClick={() => handleOpenEditModal(fowl)} className="flex-1 min-w-[70px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-black py-1.5 rounded-lg border text-center cursor-pointer transition-all">✏️ Edit</button>
                              
                              {/* 👁️ LALABAS LANG ITONG BUTTON KAPAG ACTIVE. KAPAG ARCHIVED, MAWAWALA NA SYA DITO */}
                              {fowl.status === 'Active' && (
                                <button 
                                  onClick={() => handleArchiveFowlOnly(fowl.id)} 
                                  disabled={loading}
                                  className="flex-1 min-w-[70px] text-[10px] font-black py-1.5 rounded-lg border text-center cursor-pointer transition-all bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-200/40"
                                >
                                  <span className="flex items-center justify-center gap-1">🗎 Archive</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 3️⃣ SUB-TAB: RECORD MATCHES & PERFORMANCE LOGGING */}
                {profilingSubTab === 'matchForm' && (
                  <form onSubmit={handleAddMatchRecord} className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm space-y-4 animate-fadeIn">
                    <h3 className="font-extrabold text-[11px] text-emerald-700 uppercase tracking-wider flex items-center space-x-1.5 border-b pb-2"><span>⚔️</span> <span>Record Match Performance Log</span></h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Select Local Fowl Entry</label>
                        <select value={selectedFowlForMatch} onChange={(e) => setSelectedFowlForMatch(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 font-bold text-slate-700 outline-none" required>
                          <option value="">-- Select Fowl --</option>
                          {fowls.filter(f => f.status === 'Active').map(f => (
                            <option key={f.id} value={f.name}>{f.name} ({f.breed})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Match Date</label>
                        <input type="date" value={matchDate} onChange={(e) => setMatchDate(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 font-medium" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Opponent Entry Identity</label>
                        <input type="text" value={opponentName} onChange={(e) => setOpponentName(e.target.value)} className="w-full p-2.5 border rounded-xl text-xs bg-slate-50/50 outline-none" placeholder="e.g., Kelso Express" required />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Arena Location Hub</label>
                        <input type="text" value={matchLocation} onChange={(e) => setMatchLocation(e.target.value)} className="w-full p-2.5 border rounded-xl text-xs bg-slate-50/50 outline-none" placeholder="e.g., Dingle Breeding Arena" required />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Match Type</label>
                        <select value={matchType} onChange={(e) => setMatchType(e.target.value)} className="w-full p-2.5 border rounded-xl text-xs bg-slate-50 font-bold text-slate-700 outline-none">
                          <option value="Derby Match">Derby Match</option>
                          <option value="Hack Match">Hack Match</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Fight Outcome</label>
                        <select value={matchOutcome} onChange={(e) => setMatchOutcome(e.target.value)} className="w-full p-2.5 border border-amber-200 rounded-xl text-xs bg-amber-50 font-black text-amber-900 outline-none">
                          <option value="Win">🏆 WIN</option>
                          <option value="Loss">💀 LOSS</option>
                          <option value="Draw">🤝 DRAW</option>
                        </select>
                      </div>
                    </div>
                    <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl text-xs shadow-md uppercase tracking-wider cursor-pointer transition-all hover:bg-emerald-600">
                      {loading ? 'Committing Log...' : 'Commit Performance Outcome Entry'}
                    </button>
                  </form>
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
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold">Strain: <span className="text-slate-800">{item.breed}</span></p>
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
        </div>
      )}
    </div>
  );
}