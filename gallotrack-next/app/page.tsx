'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Filler } from 'chart.js';
import { createClient } from '@supabase/supabase-js';
import ProfilePage from '@/app/profile/page';
import SettingsPage from '@/app/settings/page';
import SplashScreen from '@/components/SplashScreen';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Filler);

const supabaseUrl = 'https://mjvsbzayumcxmjcokwki.supabase.co';
const supabaseAnonKey = 'sb_publishable_MpufdSUihyXde5KmWAun_w_j0GSCTa3'; 
const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : { from: () => ({ select: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }) } as any;

interface FowlRecord {
  id: number;
  user_id?: string | number;
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
  death_reason?: string;
  archive_reason?: string;
  image_url?: string;
  created_at?: string;
}

interface MatchRecord {
  id: number;
  user_id?: string | number;
  date: string;
  entry_name: string;
  breed: string;
  opponent: string;
  location: string;
  type: string;
  outcome: string;
  status: string;
  video_url?: string;
}

interface ToastState {
  show: boolean;
  message: string;
  type: 'success' | 'error' | 'warning';
}

function TrendChip({ up, label }: { up: boolean; label: string }) {
  if (!up) {
    return <span className="text-[10px] font-bold text-slate-400">{label}</span>;
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-full">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6" /></svg>
      {label}
    </span>
  );
}

function TrendChipRose({ up, label }: { up: boolean; label: string }) {
  if (!up) {
    return <span className="text-[10px] font-bold text-slate-400">{label}</span>;
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-1 rounded-full">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
      {label}
    </span>
  );
}

const DATE_RANGES: { id: '7d' | '30d' | 'month' | '3m' | 'all'; label: string }[] = [
  { id: '7d', label: 'Last 7 Days' },
  { id: '30d', label: 'Last 30 Days' },
  { id: 'month', label: 'This Month' },
  { id: '3m', label: 'Last 3 Months' },
  { id: 'all', label: 'All Time' },
];

const formatShortDate = (t: number) => {
  const d = new Date(t);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
};

export default function GalloTrackSystem() {
  const [showSplash, setShowSplash] = useState(true);
  const [currentPage, setCurrentPage] = useState<'login' | 'dashboard' | 'profiling' | 'marketplace' | 'profile' | 'settings'>('login');
  const [profilingSubTab, setProfilingSubTab] = useState<'form' | 'registry' | 'archived' | 'deceased' | 'matchForm'>('form');

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [toast, setToast] = useState<ToastState>({ show: false, message: '', type: 'success' });
  const [selectedFowlForDetails, setSelectedFowlForDetails] = useState<FowlRecord | null>(null);
  const [selectedFowlForDeceased, setSelectedFowlForDeceased] = useState<FowlRecord | null>(null);
  const [selectedFowlForArchive, setSelectedFowlForArchive] = useState<FowlRecord | null>(null);
  const [deathReasonInput, setDeathReasonInput] = useState('Illness');
  const [archiveReasonInput, setArchiveReasonInput] = useState('SOLD');
  const [editingFowl, setEditingFowl] = useState<FowlRecord | null>(null);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [adminName, setAdminName] = useState('Hazel Dela Cruz');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [fowls, setFowls] = useState<FowlRecord[]>([]);
  const activeFowls = fowls.filter(f => f.status === 'Active' || !f.status || f.status === 'active');
  const archivedFowls = fowls.filter(f => f.status === 'Archived');
  const deceasedFowls = fowls.filter(f => f.status === 'Deceased');
  const [matchHistory, setMatchHistory] = useState<MatchRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const mainScrollRef = useRef<HTMLElement>(null);

  const [newName, setNewName] = useState('');
  const [newBreed, setNewBreed] = useState('');
  const [newGender, setNewGender] = useState('');
  const [newColor, setNewColor] = useState('Bright Red');
  const [newColorCategory, setNewColorCategory] = useState('Red');
  const [newGrowthStage, setNewGrowthStage] = useState('');
  const [newBehaviorTrait, setNewBehaviorTrait] = useState('Wave-Motion Tracker');
  const [newEyeVariant, setNewEyeVariant] = useState('Standard Eye');
  const [newBirthdate, setNewBirthdate] = useState('');
  const [sireName, setSireName] = useState('');
  const [damName, setDamName] = useState('');
  const [sirePct, setSirePct] = useState<number | string>(100);
  const [damPct, setDamPct] = useState<number | string>(100);
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState(''); 
  const [search, setSearch] = useState('');
  
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [selectedFowlForMatch, setSelectedFowlForMatch] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [opponentName, setOpponentName] = useState('');
  const [matchLocation, setMatchLocation] = useState('');
  const [matchType, setMatchType] = useState('Derby Match');
  const [matchOutcome, setMatchOutcome] = useState('Win');
  const [matchVideoFile, setMatchVideoFile] = useState<File | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);

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
  const [editSirePct, setEditSirePct] = useState<number | string>(100);
  const [editDamPct, setEditDamPct] = useState<number | string>(100);

  const [showPerFowlBreakdownModal, setShowPerFowlBreakdownModal] = useState(false);
  const [breakdownTab, setBreakdownTab] = useState<'individual' | 'strain'>('individual');
  const [dateRangePreset, setDateRangePreset] = useState<'7d' | '30d' | 'month' | '3m' | 'all'>('7d');
  const [dateRangeOpen, setDateRangeOpen] = useState(false);

  const showToastMessage = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 4000);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    async function checkSession() {
      if (typeof window !== 'undefined') {
        const savedRememberMe = localStorage.getItem('gallotrack_rememberMe') === 'true';
        setRememberMe(savedRememberMe);
        
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
          setCurrentUserId(session.user.id);
          localStorage.setItem('gallotrack_user_id', session.user.id);
          setUsername(session.user.email?.split('@')[0] || 'admin');
          setCurrentPage('dashboard');
        }
      }
    }
    checkSession();
  }, []);

  useEffect(() => {
    const handleProfileUpdate = async () => {
      if (typeof window !== 'undefined') {
        const storedName = localStorage.getItem('gallotrack_admin_name');
        if (storedName) setAdminName(storedName);
        const storedAvatar = localStorage.getItem('gallotrack_admin_avatar');
        if (storedAvatar) setAvatarUrl(storedAvatar);

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
          if (profile) {
            setAdminName(profile.full_name || 'Hazel Dela Cruz');
            setAvatarUrl(profile.avatar_url || '');
            localStorage.setItem('gallotrack_admin_name', profile.full_name || '');
            localStorage.setItem('gallotrack_admin_avatar', profile.avatar_url || '');
            localStorage.setItem('gallotrack_admin_phone', profile.phone_number || '');
          }
        }
      }
    };

    handleProfileUpdate();
    window.addEventListener('admin-profile-update', handleProfileUpdate);
    return () => {
      window.removeEventListener('admin-profile-update', handleProfileUpdate);
    };
  }, []);

  useEffect(() => {
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTop = 0;
    }
  }, [currentPage, profilingSubTab]);

  const fetchDatabaseResources = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const activeUserId = user?.id;

      if (!activeUserId) {
        setFowls([]);
        setMatchHistory([]);
        return;
      }

      const { data: fowlData, error: fowlErr } = await supabase
        .from('fowl')
        .select('*')
        .eq('user_id', activeUserId)
        .order('id', { ascending: false });

      if (!fowlErr && fowlData) {
        setFowls(fowlData);
      } else {
        setFowls([]);
      }

      const { data: matchData, error: matchErr } = await supabase
        .from('match')
        .select('*')
        .eq('user_id', activeUserId)
        .order('id', { ascending: false });

      if (!matchErr && matchData) {
        setMatchHistory(matchData);
      } else {
        setMatchHistory([]);
      }
    } catch (err) {
      console.error(err);
      setFowls([]);
      setMatchHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentPage !== 'login') {
      fetchDatabaseResources();
    }
  }, [currentPage]);

  const autoComputeGrowthStage = (monthsValue: number | null, gender: string = 'Rooster') => {
    if (monthsValue === null || isNaN(monthsValue)) return '';
    const isFemale = gender === 'Hen' || gender === 'Pullet';

    if (monthsValue >= 0 && monthsValue <= 5) {
      return 'Chick';
    }
    if (monthsValue >= 6 && monthsValue <= 11) {
      return isFemale ? 'Pullet' : 'Stag';
    }
    if (monthsValue >= 12 && monthsValue <= 24) {
      return isFemale ? 'Hen' : 'Bull Stag';
    }
    if (monthsValue > 24) {
      return isFemale ? 'Hen' : 'Cock';
    }
    return '';
  };

  const handleAgeChange = (val: string, genderVal: string = newGender) => {
    setAge(val);
    if (val.trim() === '' || isNaN(Number(val))) {
      setNewGrowthStage('');
    } else {
      setNewGrowthStage(autoComputeGrowthStage(Number(val), genderVal));
    }
  };

  const handleEditAgeChange = (val: string, genderVal: string = editGender) => {
    setEditAge(val);
    if (val.trim() === '' || isNaN(Number(val))) {
      setEditGrowthStage('');
    } else {
      setEditGrowthStage(autoComputeGrowthStage(Number(val), genderVal));
    }
  };

  const getSiblingsForFowl = (sire: string, dam: string, currentId: number) => {
    if (!sire || !dam || sire === 'Foundation Stock' || dam === 'Foundation Stock') return [];
    return fowls
      .filter(f => f.id !== currentId && f.sire?.toLowerCase() === sire.toLowerCase() && f.dam?.toLowerCase() === dam.toLowerCase())
      .map(f => f.name);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    let loginEmail = username;
    if (!username.includes('@')) {
      loginEmail = `${username}@gallotrack.com`;
    }

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: password
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      if (data.user) {
        setCurrentUserId(data.user.id);
        if (typeof window !== 'undefined') {
          localStorage.setItem('gallotrack_user_id', data.user.id);
        }
      }

      if (data.user && !data.user.email_confirmed_at) {
        await supabase.auth.signOut();
        setError('Please verify your email address before logging in. Check your inbox for the verification link.');
        return;
      }

      setCurrentPage('dashboard');
      if (typeof window !== 'undefined') {
        if (rememberMe) {
          localStorage.setItem('gallotrack_rememberMe', 'true');
          localStorage.setItem('gallotrack_session', 'authenticated');
          localStorage.setItem('gallotrack_username', username);
        } else {
          localStorage.removeItem('gallotrack_rememberMe');
          localStorage.removeItem('gallotrack_session');
          localStorage.removeItem('gallotrack_username');
        }

        let welcomeName = username;
        // Fetch or create profile row in the database
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
        if (profile) {
          if (profile.full_name) {
            welcomeName = profile.full_name.split(' ')[0];
            localStorage.setItem('gallotrack_admin_name', profile.full_name);
          }
          if (profile.avatar_url) {
            localStorage.setItem('gallotrack_admin_avatar', profile.avatar_url);
          }
          if (profile.phone_number) {
            localStorage.setItem('gallotrack_admin_phone', profile.phone_number);
          }
        } else {
          const fullNameMeta = data.user.user_metadata?.full_name || username;
          const { error: insertErr } = await supabase.from('profiles').insert([{
            id: data.user.id,
            full_name: fullNameMeta,
            phone_number: '09123456789',
            avatar_url: ''
          }]);
          if (!insertErr) {
            welcomeName = fullNameMeta.split(' ')[0];
            localStorage.setItem('gallotrack_admin_name', fullNameMeta);
          }
        }
        setTimeout(() => showToastMessage(`Access Authenticated. Welcome back, ${welcomeName}!`, 'success'), 400);
        window.dispatchEvent(new Event('admin-profile-update'));
      }
    } catch (err) {
      console.error(err);
      setError('System Error: Unable to authenticate.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: regEmail,
        password: regPassword,
        options: {
          data: {
            full_name: regName
          }
        }
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      setSuccessMessage('Owner registration initiated. Verification email sent, please check your inbox before logging in.');
      setRegName('');
      setRegEmail('');
      setRegPassword('');
      setIsSignUp(false);
    } catch (err) {
      console.error(err);
      setError('System Error: Unable to complete registration.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setCurrentUserId(null);
    setUsername('');
    setPassword('');
    setCurrentPage('login');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('gallotrack_session');
      localStorage.removeItem('gallotrack_username');
      localStorage.removeItem('gallotrack_rememberMe');
      localStorage.removeItem('gallotrack_admin_name');
      localStorage.removeItem('gallotrack_admin_avatar');
      localStorage.removeItem('gallotrack_admin_phone');
      localStorage.removeItem('gallotrack_user_id');
    }
    await supabase.auth.signOut();
    showToastMessage('System session terminated.', 'warning');
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

      const sPct = sirePct === '' || sirePct === null || isNaN(Number(sirePct)) ? 100 : Number(sirePct);
      const dPct = damPct === '' || damPct === null || isNaN(Number(damPct)) ? 100 : Number(damPct);
      const calculatedBloodline = (sPct + dPct) / 2;
      
      const activeUserId = (await supabase.auth.getUser()).data.user?.id;

      if (!activeUserId) {
        showToastMessage('Authentication Error: Active session user ID not detected.', 'error');
        return;
      }

      const payload = {
        user_id: (await supabase.auth.getUser()).data.user?.id || activeUserId,
        name: newName,
        breed: newBreed || 'Unspecified Strain',
        gender: newGender || 'Rooster',
        color: newColor,
        color_category: newColorCategory,
        growth_stage: newGrowthStage,
        behavior_trait: newBehaviorTrait,
        eye_variant: newEyeVariant,
        birthdate: newBirthdate || '2026-01-01',
        age: age ? `${age} Months` : 'N/A',
        weight: weight ? `${weight.toString().replace(/[^0-9.]/g, '')} kg` : 'N/A',
        height: height ? `${height.toString().replace(/[^0-9.]/g, '')} cm` : 'N/A',
        sire: sireName.trim() ? sireName.trim() : 'Foundation Stock',
        dam: damName.trim() ? damName.trim() : 'Foundation Stock',
        sire_pct: sPct,
        dam_pct: dPct,
        bloodline_pct: calculatedBloodline,
        status: 'Active',
        image_url: publicImageUrl
      };

      const { error: insertErr } = await supabase.from('fowl').insert([payload]);

      if (insertErr) {
        showToastMessage(`Database Error: ${insertErr.message}`, 'error');
      } else {
        showToastMessage('GalloTrack Registry Object saved successfully.', 'success');
        setNewName(''); setNewBreed(''); setNewGender(''); setSireName(''); setDamName(''); setWeight(''); setHeight(''); setAge(''); setNewGrowthStage(''); setSelectedImage(null);
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

      let videoUrl = '';
      if (matchVideoFile) {
        setUploadingVideo(true);
        const fileExt = matchVideoFile.name.split('.').pop();
        const fileName = `match-videos/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('fowl-images')
          .upload(fileName, matchVideoFile);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('fowl-images')
          .getPublicUrl(fileName);

        videoUrl = data.publicUrl;
        setUploadingVideo(false);
      }

      const activeUserId = (await supabase.auth.getUser()).data.user?.id;

      if (!activeUserId) {
        showToastMessage('Authentication Error: Active session user ID not detected.', 'error');
        return;
      }

      const payload = {
        user_id: (await supabase.auth.getUser()).data.user?.id || activeUserId,
        date: matchDate || new Date().toISOString().split('T')[0],
        entry_name: selectedFowlForMatch,
        breed: fowlBreed,
        opponent: opponentName || 'Anonymous Opponent',
        location: matchLocation || 'Local Breeding Yard',
        type: matchType,
        outcome: matchOutcome,
        status: 'Verified',
        video_url: videoUrl || null
      };

      const { error: insertErr } = await supabase.from('match').insert([payload]);

      if (insertErr) {
        throw insertErr;
      } else {
        showToastMessage('Performance match vector successfully computed and logged.', 'success');
        setOpponentName(''); setMatchLocation(''); setMatchVideoFile(null);
        fetchDatabaseResources();
        setProfilingSubTab('registry');
      }
    } catch (err: any) {
      showToastMessage(`Database Write Constraint Fault: ${err.message || err}`, 'error');
    } finally {
      setLoading(false);
      setUploadingVideo(false);
    }
  };

  const handleArchiveFowlOnly = async (id: number) => {
    setLoading(true);
    try {
      const { error: updateErr } = await supabase
        .from('fowl')
        .update({ status: 'Archived', archive_reason: archiveReasonInput })
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

  const handleArchiveFowlWithReason = async () => {
    if (!selectedFowlForArchive) return;
    setLoading(true);
    try {
      const { error: updateErr } = await supabase
        .from('fowl')
        .update({ status: 'Archived', archive_reason: archiveReasonInput })
        .eq('id', selectedFowlForArchive.id);

      if (updateErr) {
        showToastMessage(updateErr.message, 'error');
      } else {
        showToastMessage(`Gamefowl archived under ${archiveReasonInput} status log.`, 'warning');
        if (selectedFowlForDetails?.id === selectedFowlForArchive.id) setSelectedFowlForDetails(null);
        setSelectedFowlForArchive(null);
        fetchDatabaseResources();
      }
    } catch (err: any) {
      showToastMessage(err.message || err, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreFowlOnly = async (id: number) => {
    setLoading(true);
    try {
      const { error: updateErr } = await supabase
        .from('fowl')
        .update({ status: 'Active' })
        .eq('id', id);

      if (updateErr) {
        showToastMessage(updateErr.message, 'error');
      } else {
        showToastMessage('Node successfully restored to active family registry.', 'success');
        if (selectedFowlForDetails?.id === id) setSelectedFowlForDetails(null);
        fetchDatabaseResources();
      }
    } catch (err: any) {
      showToastMessage(err.message || err, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkFowlDeceased = async () => {
    if (!selectedFowlForDeceased) return;
    setLoading(true);
    try {
      const { error: updateErr } = await supabase
        .from('fowl')
        .update({ status: 'Deceased', death_reason: deathReasonInput, death_date: new Date().toISOString().split('T')[0] })
        .eq('id', selectedFowlForDeceased.id);

      if (updateErr) {
        showToastMessage(updateErr.message, 'error');
      } else {
        showToastMessage('Gamefowl node recorded under mortality archive log.', 'error');
        if (selectedFowlForDetails?.id === selectedFowlForDeceased.id) setSelectedFowlForDetails(null);
        setSelectedFowlForDeceased(null);
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
    setEditColorCategory(fowl.color_category || 'Red');
    setEditColor(fowl.color || 'Bright Red');
    setEditBehaviorTrait(fowl.behavior_trait || 'Wave-Motion Tracker');
    setEditEyeVariant(fowl.eye_variant || 'Standard Eye');
    const parsedAge = fowl.age ? Number(fowl.age.replace(/[^0-9.]/g, '')) : 0;
    setEditAge(fowl.age ? fowl.age.replace(' Months', '') : '');
    setEditGrowthStage(fowl.growth_stage || autoComputeGrowthStage(isNaN(parsedAge) ? 0 : parsedAge, fowl.gender));
    setEditWeight(fowl.weight ? fowl.weight.replace(' kg', '') : '');
    setEditHeight(fowl.height ? fowl.height.replace(' cm', '') : '');
    setEditSire(fowl.sire || '');
    setEditDam(fowl.dam || '');
    setEditSirePct(fowl.sire_pct ?? 100);
    setEditDamPct(fowl.dam_pct ?? 100);
  };

  const handleUpdateFowl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFowl) return;
    setLoading(true);

    try {
      const sPct = editSirePct === '' || editSirePct === null || isNaN(Number(editSirePct)) ? 100 : Number(editSirePct);
      const dPct = editDamPct === '' || editDamPct === null || isNaN(Number(editDamPct)) ? 100 : Number(editDamPct);
      const calculatedBloodline = (sPct + dPct) / 2;
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
        weight: editWeight ? `${editWeight.toString().replace(/[^0-9.]/g, '')} kg` : 'N/A',
        height: editHeight ? `${editHeight.toString().replace(/[^0-9.]/g, '')} cm` : 'N/A',
        sire: editSire.trim() ? editSire.trim() : 'Foundation Stock',
        dam: editDam.trim() ? editDam.trim() : 'Foundation Stock',
        sire_pct: sPct,
        dam_pct: dPct,
        bloodline_pct: calculatedBloodline
      };

      const { error: updateErr } = await supabase
        .from('fowl')
        .update(payload)
        .eq('id', editingFowl.id);

      if (updateErr) throw updateErr;

      showToastMessage('GalloTrack Node object updated in cloud cluster.', 'success');
      setEditingFowl(null);
      fetchDatabaseResources();
    } catch (err: any) {
      showToastMessage(`Update Cluster Failure: ${err.message || err}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const calculateCrossbreedWinRatios = () => {
    const breedStats: { [key: string]: { wins: number; total: number } } = {};

    matchHistory.forEach((match) => {
      const breedKey = `${match.breed || 'Unknown'} Cross`;
      if (!breedStats[breedKey]) {
        breedStats[breedKey] = { wins: 0, total: 0 };
      }
      breedStats[breedKey].total += 1;
      if (match.outcome && match.outcome.toLowerCase() === 'win') {
        breedStats[breedKey].wins += 1;
      }
    });

    const labels = Object.keys(breedStats);
    const data = labels.map(label => {
      const stats = breedStats[label];
      return stats.total > 0 ? Math.round((stats.wins / stats.total) * 100) : 0;
    });

    const hasData = labels.length > 0 && matchHistory.length > 0;

    return {
      labels: hasData ? labels : [],
      data: hasData ? data : [],
      hasData
    };
  };

  const calculateCohortSuccessProbability = () => {
    const cohortScores: { [key: string]: number[] } = {};

    activeFowls.forEach((fowl) => {
      const breed = fowl.breed;
      const fowlMatches = matchHistory.filter(m => m.entry_name && m.entry_name.toLowerCase() === fowl.name.toLowerCase());
      
      if (fowlMatches.length > 0) {
        if (!cohortScores[breed]) {
          cohortScores[breed] = [];
        }
        const wins = fowlMatches.filter(m => m.outcome && m.outcome.toLowerCase() === 'win').length;
        let dynamicScore = (wins / fowlMatches.length) * 100;

        if (fowl.sire && fowl.sire.trim() !== '' && fowl.sire !== 'Foundation Stock') dynamicScore += 5;
        if (fowl.dam && fowl.dam.trim() !== '' && fowl.dam !== 'Foundation Stock') dynamicScore += 5;

        cohortScores[breed].push(Math.min(dynamicScore, 100));
      }
    });

    const labels = Object.keys(cohortScores);
    const data = labels.map(label => {
      const scores = cohortScores[label];
      const average = scores.reduce((a, b) => a + b, 0) / scores.length;
      return Math.round(average);
    });

    const hasData = labels.length > 0 && data.length > 0;

    return {
      labels: hasData ? labels : [],
      data: hasData ? data : [],
      hasData
    };
  };

  const calculateMortalityBreakdown = () => {
    const counts: Record<string, number> = {};
    deceasedFowls.forEach(f => {
      const r = f.death_reason || 'Illness';
      counts[r] = (counts[r] || 0) + 1;
    });
    const labels = Object.keys(counts);
    const data = Object.values(counts);
    const hasData = deceasedFowls.length > 0 && labels.length > 0 && data.some(v => v > 0);
    return {
      labels: hasData ? labels : [],
      data: hasData ? data : [],
      hasData
    };
  };

  const getArchiveBadgeStyle = (reason?: string) => {
    const r = (reason || 'RETIRED').toUpperCase();
    switch (r) {
      case 'SOLD':
        return { label: '● SOLD', bg: 'bg-emerald-700 text-white' };
      case 'CULLED':
        return { label: '● CULLED', bg: 'bg-purple-800 text-white' };
      case 'RETIRED':
        return { label: '● RETIRED', bg: 'bg-amber-600 text-white' };
      case 'DIED':
        return { label: '● DIED', bg: 'bg-rose-900 text-white' };
      case 'OTHER':
        return { label: '● OTHER', bg: 'bg-slate-700 text-white' };
      default:
        return { label: `● ${r}`, bg: 'bg-amber-600 text-white' };
    }
  };

  const crossbreedChartData = calculateCrossbreedWinRatios();
  const cohortChartData = calculateCohortSuccessProbability();
  const mortalityChartData = calculateMortalityBreakdown();

  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const isWithinThisWeek = (value?: string) => {
    if (!value) return false;
    const t = new Date(value).getTime();
    return !isNaN(t) && nowMs - t < WEEK_MS;
  };
  const activeNewThisWeek = activeFowls.filter(f => isWithinThisWeek(f.created_at)).length;
  const deceasedNewThisWeek = deceasedFowls.filter(f => isWithinThisWeek(f.created_at)).length;
  const matchesThisWeek = matchHistory.filter(m => isWithinThisWeek(m.date)).length;

  const DAY_MS = 24 * 60 * 60 * 1000;
  const dateRangeLabel = (() => {
    const now = new Date(nowMs);
    if (dateRangePreset === '7d') return `${formatShortDate(nowMs - 7 * DAY_MS)} - ${formatShortDate(nowMs)}`;
    if (dateRangePreset === '30d') return `${formatShortDate(nowMs - 30 * DAY_MS)} - ${formatShortDate(nowMs)}`;
    if (dateRangePreset === 'month') return `${formatShortDate(new Date(now.getFullYear(), now.getMonth(), 1).getTime())} - ${formatShortDate(nowMs)}`;
    if (dateRangePreset === '3m') return `${formatShortDate(nowMs - 90 * DAY_MS)} - ${formatShortDate(nowMs)}`;
    return 'All Time';
  })();

  const winRateSpark = (() => {
    let wins = 0;
    const series: number[] = [];
    for (let i = 0; i < matchHistory.length; i++) {
      if (matchHistory[i].outcome && matchHistory[i].outcome.toLowerCase() === 'win') wins++;
      series.push(Math.round((wins / (i + 1)) * 100));
    }
    return series.length ? series : [0];
  })();

  const mortalitySpark = (() => {
    let deceased = 0;
    const series: number[] = [];
    for (let i = 0; i < fowls.length; i++) {
      if (fowls[i].status === 'Deceased') deceased++;
      series.push(Math.round((deceased / (i + 1)) * 100));
    }
    return series.length ? series : [0];
  })();

  const winRatePct = matchHistory.length > 0
    ? Math.round((matchHistory.filter(m => m.outcome && m.outcome.toLowerCase() === 'win').length / matchHistory.length) * 100)
    : 0;
  const winsCount = matchHistory.filter(m => m.outcome && m.outcome.toLowerCase() === 'win').length;
  const lossesCount = matchHistory.filter(m => m.outcome && m.outcome.toLowerCase() === 'loss').length;
  const mortalityRatePct = fowls.length > 0 ? Math.round((deceasedFowls.length / fowls.length) * 100) : 0;

  if (showSplash) {
    return <SplashScreen onFinished={() => setShowSplash(false)} />;
  }

  return (
    <div className="bg-[#f8fafc] min-h-screen font-sans antialiased text-slate-800 flex flex-col md:flex-row overflow-hidden h-[100dvh] w-full relative selection:bg-emerald-500 selection:text-white">
      
      {/* TOAST NOTIFICATION STACK */}
      {toast.show && (
        <div className="fixed top-5 right-5 z-[9999] flex items-center p-4 px-5 max-w-sm rounded-2xl shadow-2xl border backdrop-blur-xl animate-fadeIn bg-white/95 border-slate-200/80 space-x-3">
          <div className={`flex items-center justify-center w-8 h-8 rounded-xl shrink-0 font-black text-xs shadow-sm ${
            toast.type === 'success' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : toast.type === 'error' ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-amber-100 text-amber-700 border border-amber-200'
          }`}>
            {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : '‼'}
          </div>
          <div className="text-xs font-bold text-slate-800 leading-snug">{toast.message}</div>
        </div>
      )}

      {/* LOGIN VIEW */}
      {currentPage === 'login' && (
        <div className="flex items-center justify-center min-h-screen w-full p-6 bg-gradient-to-br from-[#0a1f1a] via-[#0d2b23] to-[#0a3328] overflow-hidden relative">
          {/* Geometric wireframe pattern overlay */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="wireframe" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 0 0 L 60 0 L 60 60 L 0 60 Z" fill="none" stroke="#ffffff" strokeWidth="0.5"/>
                <path d="M 30 0 L 30 60 M 0 30 L 60 30" fill="none" stroke="#ffffff" strokeWidth="0.3" strokeDasharray="2 3"/>
                <circle cx="30" cy="30" r="3" fill="#ffffff" opacity="0.3"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#wireframe)"/>
          </svg>
          {/* Ambient glow orbs */}
          <div className="absolute top-1/4 -left-20 w-72 h-72 bg-teal-400/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="antigravity-login-card bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-black/30 max-w-md w-full relative z-10 overflow-hidden border border-teal-500/20">
            <div className="p-8 sm:p-10 space-y-7">
              {/* Header & Branding */}
              <div className="text-center space-y-2">
                <span className="text-[9px] font-bold tracking-[0.2em] text-teal-700 uppercase block">ISUFST CICT Capstone Project</span>
                <h1 className="text-3xl sm:text-4xl font-black text-teal-900 tracking-tight leading-none">GALLOTRACK</h1>
                <p className="text-[10px] text-slate-400 font-semibold">Advanced Gamefowl Lineage Analytics &amp; Structural Trace Registry</p>
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-teal-200 to-transparent"></div>

              {!isSignUp ? (
                <form onSubmit={handleLogin} className="space-y-5">
                  {/* ADMINISTRATIVE IDENTITY */}
                  <div>
                    <label className="block text-[10px] font-black text-teal-800 mb-2 uppercase tracking-widest">Administrative Identity</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                      </span>
                      <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full pl-10 pr-3.5 py-3 border border-slate-200/90 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-100 transition-all font-semibold outline-none" placeholder="Enter email address" required />
                    </div>
                  </div>

                  {/* SYSTEM PASSWORD */}
                  <div>
                    <label className="block text-[10px] font-black text-teal-800 mb-2 uppercase tracking-widest">System Password</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      </span>
                      <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-10 pr-11 py-3 border border-slate-200/90 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-100 transition-all font-semibold outline-none" placeholder="••••••••••••" required />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer" title={showPassword ? 'Hide password' : 'Show password'}>
                        {showPassword ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* REMEMBER ME */}
                  <div className="flex items-center justify-between">
                    <label className="flex items-center space-x-2.5 cursor-pointer select-none group">
                      <div className="relative">
                        <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="sr-only peer" />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-[2.5px] after:left-[2.5px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-700 shadow-inner"></div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-hover:text-teal-700 transition-colors">Remember Me</span>
                    </label>
                  </div>

                  {error && <div className="text-xs text-rose-600 font-bold text-center bg-rose-50 border border-rose-200/60 p-3.5 rounded-xl">{error}</div>}
                  {successMessage && <div className="text-xs text-emerald-700 font-bold text-center bg-emerald-50 border border-emerald-200/60 p-3.5 rounded-xl leading-relaxed">{successMessage}</div>}

                  {/* SUBMIT BUTTON */}
                  <button type="submit" disabled={loading} className="group relative w-full bg-gradient-to-br from-teal-700 to-teal-800 hover:from-teal-600 hover:to-teal-700 active:scale-[0.99] text-white font-black py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-teal-900/30 cursor-pointer overflow-hidden">
                    <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative flex items-center justify-center gap-3">
                      <span className="text-sm tracking-widest">LOG IN</span>
                      <span className="text-[9px] font-bold text-teal-200/80 tracking-wide flex items-center gap-1">
                        Secure Access
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-0.5 transition-transform"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                      </span>
                    </div>
                  </button>

                  {/* FOOTER LINKS */}
                  <div className="space-y-4 pt-1">
                    <div className="flex items-center justify-center gap-4">
                      <button type="button" className="text-[10px] font-bold text-slate-400 hover:text-teal-700 transition-colors tracking-wide cursor-pointer underline underline-offset-2 decoration-slate-200 hover:decoration-teal-300">Forgot Password?</button>
                      <span className="text-slate-200 text-[8px]">|</span>
                      <button type="button" onClick={() => { setIsSignUp(true); setError(''); setSuccessMessage(''); }} className="text-[10px] font-bold text-slate-400 hover:text-teal-700 transition-colors tracking-wide cursor-pointer underline underline-offset-2 decoration-slate-200 hover:decoration-teal-300">Create Account</button>
                    </div>
                    <p className="text-[9px] text-slate-300 font-semibold text-center tracking-wide">Powered by Advanced Gamefowl Analytics</p>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="space-y-5">
                  <div>
                    <label className="block text-[10px] font-black text-teal-800 mb-2 uppercase tracking-widest">Owner Full Name</label>
                    <input type="text" value={regName} onChange={(e) => setRegName(e.target.value)} className="w-full p-3.5 border border-slate-200/90 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-100 transition-all font-semibold outline-none" placeholder="Enter your full name" required />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-teal-800 mb-2 uppercase tracking-widest">Email Address</label>
                    <input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} className="w-full p-3.5 border border-slate-200/90 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-100 transition-all font-semibold outline-none" placeholder="Enter email address" required />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-teal-800 mb-2 uppercase tracking-widest">Password</label>
                    <input type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} className="w-full p-3.5 border border-slate-200/90 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-100 transition-all font-semibold outline-none" placeholder="Create secure password" required />
                  </div>

                  {error && <div className="text-xs text-rose-600 font-bold text-center bg-rose-50 border border-rose-200/60 p-3.5 rounded-xl">{error}</div>}

                  <button type="submit" disabled={loading} className="group relative w-full bg-gradient-to-br from-teal-700 to-teal-800 hover:from-teal-600 hover:to-teal-700 active:scale-[0.99] text-white font-black py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-teal-900/30 cursor-pointer flex items-center justify-center space-x-2">
                    {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
                    <span className="tracking-widest">{loading ? 'Creating Account...' : 'Register Owner'}</span>
                  </button>

                  <div className="pt-1">
                    <button type="button" onClick={() => { setIsSignUp(false); setError(''); setSuccessMessage(''); }} className="text-[10px] font-bold text-slate-400 hover:text-teal-700 transition-colors tracking-wide cursor-pointer underline underline-offset-2 decoration-slate-200 hover:decoration-teal-300 w-full text-center block">Already have an account? Log In</button>
                    <p className="text-[9px] text-slate-300 font-semibold text-center tracking-wide mt-4">Powered by Advanced Gamefowl Analytics</p>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ENTERPRISE DESKTOP SIDEBAR NAVIGATION */}
      {currentPage !== 'login' && (
        <aside className="hidden md:flex w-64 bg-slate-900 text-slate-200 flex-col md:fixed md:inset-y-0 md:left-0 z-50 border-r border-slate-800 shadow-2xl h-full justify-between">
          <div>
            <div className="p-6 border-b border-slate-800/80 bg-slate-950/60 flex items-center space-x-3">
              <div className="w-9 h-9 bg-emerald-500/20 border border-emerald-500/40 rounded-xl flex items-center justify-center text-lg shadow-inner">🐓</div>
              <div>
                <h2 className="text-xl font-black tracking-tight text-white">GALLO<span className="text-emerald-400">TRACK</span></h2>
                <span className="text-[9px] font-mono font-bold text-emerald-400 tracking-widest uppercase block">v1.2.0 Enterprise</span>
              </div>
            </div>
            <nav className="p-4 space-y-1.5 mt-2">
              {[
                { id: 'dashboard', label: 'Dashboard Analytics', icon: '📊' },
                { id: 'profiling', label: 'Profiling & Lineage', icon: '🧬' },
                { id: 'marketplace', label: 'Breeding Catalog', icon: '🛒' },
                { id: 'profile', label: 'Profile Management', icon: '👤' },
                { id: 'settings', label: 'System Settings', icon: '⚙️' },
              ].map((menu) => (
                <button 
                  key={menu.id}
                  type="button"
                  onClick={() => setCurrentPage(menu.id as any)} 
                  className={`w-full text-left flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all duration-200 cursor-pointer ${
                    currentPage === menu.id 
                      ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-md shadow-emerald-700/30 font-black scale-[1.01]' 
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
                  }`}
                >
                  <span className="text-base">{menu.icon}</span>
                  <span>{menu.label}</span>
                </button>
              ))}
            </nav>
          </div>
          
          <div className="p-4 border-t border-slate-800/80 bg-slate-950/60 space-y-3">
            <div className="flex items-center space-x-3 px-2 py-1 select-none">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Admin Avatar" className="w-8 h-8 rounded-lg object-cover border border-slate-700/60" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-sm shadow-inner">👤</div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-extrabold text-white truncate">{adminName}</p>
                <p className="text-[9px] text-slate-400 font-bold tracking-wider uppercase truncate">System Lead Admin</p>
              </div>
            </div>
            <button onClick={handleLogout} className="w-full bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-200 border border-slate-700/50 hover:border-rose-900/40 text-left flex items-center space-x-3 px-4 py-2.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer">
              <span>🚪 Terminate Core Session</span>
            </button>
            <div className="text-center text-[9px] text-slate-500 font-mono tracking-widest uppercase">ISUFST DINGLE HUB</div>
          </div>
        </aside>
      )}

      {/* MAIN CONTAINER CONTENT */}
      {currentPage !== 'login' && (
        <div className="flex-1 md:pl-64 flex flex-col h-full w-full min-h-0 overflow-hidden relative pb-16 md:pb-0">
          
          {/* HEADER STRIP */}
          <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-40 shadow-xs shrink-0">
            <div className="py-3.5 px-4 sm:px-6 md:px-8 flex justify-between items-center">
              
              {/* LEFT: Mobile Title & Supabase Status Badge */}
              <div className="flex items-center space-x-3">
                <span className="md:hidden font-black text-slate-900 text-lg tracking-tight bg-gradient-to-r from-slate-900 to-emerald-700 bg-clip-text text-transparent">GALLOTRACK</span>
                
                <div className="antigravity-badge bg-emerald-50/80 border border-emerald-200/60 text-emerald-800 px-3 py-1.5 rounded-full flex items-center space-x-2 text-[10px] sm:text-xs font-mono font-bold shadow-2xs">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="hidden sm:inline">SUPABASE POSTGRESQL LINK: ONLINE</span>
                  <span className="sm:hidden font-extrabold uppercase tracking-wide">DB ONLINE</span>
                </div>
              </div>

              {/* RIGHT: Campus Metadata Tag & Mobile Session Exit */}
              <div className="flex items-center space-x-2.5">
                <div className="antigravity-badge bg-slate-100/90 border border-slate-200/80 text-slate-600 px-3.5 py-1.5 rounded-full text-[10px] sm:text-xs font-mono font-bold flex items-center space-x-1.5 shadow-2xs" style={{ animationDelay: '1.2s' }}>
                  <span className="text-slate-400">📍</span>
                  <span>Dingle Campus Cluster</span>
                </div>

                <button 
                  type="button"
                  onClick={handleLogout}
                  className="md:hidden bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/80 p-1.5 px-3 rounded-full text-[10px] font-black cursor-pointer transition-all flex items-center space-x-1 shadow-2xs"
                  title="Terminate Core Session"
                >
                  <span>🚪 Exit</span>
                </button>
              </div>

            </div>
          </header>

          {/* MAIN SCROLLABLE BODY */}
          <main ref={mainScrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6">
            
            {/* DASHBOARD ANALYTICS MODULE */}
            {currentPage === 'dashboard' && (
              <div className="space-y-6 animate-fadeIn">
                
                {/* HEADER CARDS */}
                <div className="antigravity-hover bg-white/90 backdrop-blur-md p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Enterprise Analytics Dashboard</h1>
                    <p className="text-xs sm:text-sm text-slate-400 font-semibold mt-1">Cross-strain performance vectors, empirical win probabilities, and active inventory metrics</p>
                  </div>
                  {/* DATE RANGE SELECTOR */}
                  <div className="relative self-start md:self-auto">
                    {dateRangeOpen && (
                      <div className="fixed inset-0 z-40" onClick={() => setDateRangeOpen(false)} />
                    )}
                    <button
                      type="button"
                      onClick={() => setDateRangeOpen(o => !o)}
                      className="antigravity-badge bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center space-x-2 shadow-2xs"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M8 2v4M16 2v4M3 10h18" /></svg>
                      <span>{dateRangeLabel}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${dateRangeOpen ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6" /></svg>
                    </button>
                    {dateRangeOpen && (
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-slate-200/80 shadow-xl z-50 p-1.5">
                        {DATE_RANGES.map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => { setDateRangePreset(r.id); setDateRangeOpen(false); }}
                            className={`w-full text-left px-3 py-2 rounded-xl text-[11px] font-bold transition-colors cursor-pointer ${dateRangePreset === r.id ? 'bg-emerald-50 text-emerald-800' : 'text-slate-600 hover:bg-slate-50'}`}
                          >
                            {r.label}
                          </button>
                        ))}
                        <div className="h-px bg-slate-100 my-1.5"></div>
                        <button
                          type="button"
                          onClick={() => { setDateRangeOpen(false); fetchDatabaseResources(); }}
                          className="w-full text-left px-3 py-2 rounded-xl text-[11px] font-bold text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          {loading ? '↻ Syncing...' : '↻ Refresh Data'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* TOP METRICS ROW — 6 CARDS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">

                  {/* ACTIVE GAMEFOWL */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 flex flex-col gap-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-sm shrink-0">🐓</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide leading-tight">Active Gamefowl</span>
                    </div>
                    <div className="text-3xl font-black text-slate-900 tracking-tight">{activeFowls.length}</div>
                    <div className="flex items-center justify-between gap-2">
                      <TrendChip up={activeNewThisWeek > 0} label={activeNewThisWeek > 0 ? `${activeNewThisWeek} this week` : 'No change'} />
                      <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full shrink-0">Encoded</span>
                    </div>
                  </div>

                  {/* ARCHIVED RECORDS */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 flex flex-col gap-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-sm shrink-0">🗂️</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide leading-tight">Archived Records</span>
                    </div>
                    <div className="text-3xl font-black text-slate-900 tracking-tight">{archivedFowls.length}</div>
                    <div className="flex items-center justify-between gap-2">
                      <TrendChip up={false} label="No change" />
                      <span className="text-[8px] font-bold uppercase tracking-widest text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full shrink-0">Log</span>
                    </div>
                  </div>

                  {/* DECEASED RECORDS */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 flex flex-col gap-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-sm shrink-0">💀</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide leading-tight">Deceased Records</span>
                    </div>
                    <div className="text-3xl font-black text-slate-900 tracking-tight">{deceasedFowls.length}</div>
                    <div className="flex items-center justify-between gap-2">
                      <TrendChipRose up={deceasedNewThisWeek > 0} label={deceasedNewThisWeek > 0 ? `${deceasedNewThisWeek} this week` : 'No change'} />
                      <span className="text-[8px] font-bold uppercase tracking-widest text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-full shrink-0">Mortality</span>
                    </div>
                  </div>

                  {/* TOTAL MATCHES */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 flex flex-col gap-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-sm shrink-0">🏆</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide leading-tight">Total Matches</span>
                    </div>
                    <div className="text-3xl font-black text-slate-900 tracking-tight">{matchHistory.length}</div>
                    <div className="flex items-center justify-between gap-2">
                      <TrendChip up={matchesThisWeek > 0} label={matchesThisWeek > 0 ? `${matchesThisWeek} this week` : 'No change'} />
                      <span className="text-[8px] font-bold uppercase tracking-widest text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full shrink-0">Logged</span>
                    </div>
                  </div>

                  {/* OVERALL WIN RATE */}
                  <div
                    onClick={() => setShowPerFowlBreakdownModal(true)}
                    className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 flex flex-col gap-2.5 cursor-pointer hover:border-emerald-400/70 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-sm shrink-0">💗</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide leading-tight">Overall Win Rate</span>
                      </div>
                      <span className="text-[9px] font-black text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">{winsCount}W • {lossesCount}L</span>
                    </div>
                    <div className="text-3xl font-black text-emerald-600 tracking-tight">
                      {matchHistory.length > 0 ? `${winRatePct}%` : '—'}
                    </div>
                    <div className="h-9">
                      {matchHistory.length > 0 ? (
                        <Line
                          data={{
                            labels: winRateSpark.map((_, i) => i + 1),
                            datasets: [{ data: winRateSpark, borderColor: '#059669', backgroundColor: 'rgba(5,150,105,0.08)', fill: true, borderWidth: 2, pointRadius: 0, tension: 0.4 }],
                          }}
                          options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false, min: 0, max: 100 } } }}
                        />
                      ) : (
                        <div className="text-[10px] font-bold text-slate-300 pt-1">No matches logged yet</div>
                      )}
                    </div>
                    <div className="text-[10px] font-extrabold text-emerald-700 pt-0.5 flex items-center justify-between border-t border-slate-100">
                      <span>Win trend</span>
                      <span>🔍 Breakdown</span>
                    </div>
                  </div>

                  {/* MORTALITY RATE */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 flex flex-col gap-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-sm shrink-0">📊</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide leading-tight">Mortality Rate</span>
                    </div>
                    <div className="text-3xl font-black text-rose-600 tracking-tight">
                      {fowls.length > 0 ? `${mortalityRatePct}%` : '—'}
                    </div>
                    <div className="h-9">
                      {fowls.length > 0 ? (
                        <Line
                          data={{
                            labels: mortalitySpark.map((_, i) => i + 1),
                            datasets: [{ data: mortalitySpark, borderColor: '#e11d48', backgroundColor: 'rgba(225,29,72,0.08)', fill: true, borderWidth: 2, pointRadius: 0, tension: 0.4 }],
                          }}
                          options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false, min: 0, max: 100 } } }}
                        />
                      ) : (
                        <div className="text-[10px] font-bold text-slate-300 pt-1">No records yet</div>
                      )}
                    </div>
                    <div className="text-[10px] font-extrabold text-rose-500 pt-0.5 flex items-center justify-between border-t border-slate-100">
                      <span>Mortality audit</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                    </div>
                  </div>
                </div>

                {/* MIDDLE CHARTS ROW — 3 CLEAN CARDS */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                  {/* CROSS-BREED WIN RATIOS */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-6 flex flex-col">
                    <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest text-center w-full border-b border-slate-100 pb-3">Cross-Breed Win Ratios</h3>
                    {crossbreedChartData.hasData ? (
                      <>
                        <div className="w-44 h-44 sm:w-48 sm:h-48 mx-auto my-3 flex items-center justify-center">
                          <Doughnut
                            data={{
                              labels: crossbreedChartData.labels.map((l, i) => `${l} ${crossbreedChartData.data[i]}%`),
                              datasets: [{
                                data: crossbreedChartData.data,
                                backgroundColor: ['#059669', '#f43f5e', '#d97706', '#2563eb', '#7c3aed'],
                                borderWidth: 2,
                                borderColor: '#ffffff',
                                hoverOffset: 6,
                              }],
                            }}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              cutout: '68%',
                              plugins: {
                                legend: { position: 'bottom', labels: { boxWidth: 10, padding: 10, font: { size: 10, weight: 'bold' }, color: '#334155' } },
                                tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}` } },
                              },
                            }}
                          />
                        </div>
                        <p className="text-center text-[10px] text-slate-400 font-semibold pb-1">Based on {matchHistory.length} total {matchHistory.length === 1 ? 'match' : 'matches'}</p>
                      </>
                    ) : (
                      <div className="my-auto flex flex-col items-center justify-center text-center p-6 space-y-2">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 text-xl font-bold">📊</div>
                        <p className="text-xs font-extrabold text-slate-500">No data available</p>
                        <p className="text-[10px] text-slate-400 max-w-[200px]">Encode match records for your gamefowl to generate cross-breed win ratios.</p>
                      </div>
                    )}
                  </div>

                  {/* LINEAGE COHORT SUCCESS RATE */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-6 flex flex-col">
                    <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest text-center w-full border-b border-slate-100 pb-3">Lineage Cohort Success Rate (%)</h3>
                    {cohortChartData.hasData ? (
                      <>
                        <div className="w-full h-44 sm:h-48 my-3">
                          <Bar
                            data={{
                              labels: cohortChartData.labels.map((l, i) => `${l} ${cohortChartData.data[i]}%`),
                              datasets: [{
                                label: 'Success Rate %',
                                data: cohortChartData.data,
                                backgroundColor: '#059669',
                                borderRadius: 8,
                                maxBarThickness: 30,
                              }],
                            }}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              plugins: { legend: { display: false } },
                              scales: {
                                y: { min: 0, max: 100, grid: { color: 'rgba(148,163,184,0.15)' }, ticks: { font: { size: 10, weight: 'bold' }, color: '#64748b' } },
                                x: { grid: { display: false }, ticks: { font: { size: 9, weight: 'bold' }, color: '#334155' } },
                              },
                            }}
                          />
                        </div>
                        <p className="text-center text-[10px] text-slate-400 font-semibold pb-1">Success rate per primary lineage cohort</p>
                      </>
                    ) : (
                      <div className="my-auto flex flex-col items-center justify-center text-center p-6 space-y-2">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 text-xl font-bold">🧬</div>
                        <p className="text-xs font-extrabold text-slate-500">No data available</p>
                        <p className="text-[10px] text-slate-400 max-w-[200px]">Add active fowl and record matches to evaluate lineage cohort success rates.</p>
                      </div>
                    )}
                  </div>

                  {/* DECEASED MORTALITY BREAKDOWN */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-6 flex flex-col">
                    <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest text-center w-full border-b border-slate-100 pb-3 flex items-center justify-center space-x-1">
                      <span>💀</span> <span>Deceased Mortality Breakdown</span>
                    </h3>
                    {mortalityChartData.hasData ? (
                      <>
                        <div className="w-44 h-44 sm:w-48 sm:h-48 mx-auto my-3 flex items-center justify-center">
                          <Doughnut
                            data={{
                              labels: mortalityChartData.labels,
                              datasets: [{
                                data: mortalityChartData.data,
                                backgroundColor: ['#e11d48', '#f59e0b', '#8b5cf6', '#64748b', '#0d9488'],
                                borderWidth: 2,
                                borderColor: '#ffffff',
                                hoverOffset: 6,
                              }],
                            }}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              cutout: '68%',
                              plugins: {
                                legend: { position: 'bottom', labels: { boxWidth: 10, padding: 10, font: { size: 10, weight: 'bold' }, color: '#334155' } },
                                tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.parsed} record(s)` } },
                              },
                            }}
                          />
                        </div>
                        <p className="text-center text-[10px] text-slate-400 font-semibold pb-1">Based on {deceasedFowls.length} deceased {deceasedFowls.length === 1 ? 'record' : 'records'}</p>
                      </>
                    ) : (
                      <div className="my-auto flex flex-col items-center justify-center text-center p-6 space-y-2">
                        <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-400 text-xl font-bold">💀</div>
                        <p className="text-xs font-extrabold text-slate-500">No data available</p>
                        <p className="text-[10px] text-slate-400 max-w-[200px]">No deceased gamefowl recorded. Mortality breakdown will render when records exist.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* HISTORICAL ANALYTICS MATCH LOGS TABLE */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-wrap justify-between items-center gap-3">
                    <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Historical Analytics Match Logs</h3>
                    <div className="flex items-center gap-3">
                      <span className="text-[9px] font-mono bg-slate-200/80 text-slate-700 font-black px-3 py-1 rounded-full hidden sm:inline">D4 ANALYTICS DB</span>
                      <button
                        type="button"
                        onClick={() => { setCurrentPage('profiling'); setProfilingSubTab('registry'); }}
                        className="bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-[10px] font-black px-3.5 py-2 rounded-lg shadow-sm shadow-emerald-700/20 transition-all cursor-pointer"
                      >
                        View All Records →
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px] border-collapse min-w-[760px]">
                      <thead>
                        <tr className="bg-slate-50/80 text-slate-500 font-extrabold uppercase border-b border-slate-200/80">
                          <th className="p-4 pl-6">Match Date</th>
                          <th className="p-4">Entry Identifier</th>
                          <th className="p-4">Bloodline</th>
                          <th className="p-4">Match Type</th>
                          <th className="p-4">Arena Location</th>
                          <th className="p-4 text-center">Outcome Status</th>
                          <th className="p-4 text-center">Video</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-600 font-semibold">
                        {matchHistory.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-slate-400 text-xs font-semibold">
                              No data available
                            </td>
                          </tr>
                        ) : (
                          matchHistory.map((log) => (
                            <tr key={log.id} className="hover:bg-slate-50/80 transition-colors duration-150">
                              <td className="p-4 pl-6 font-mono text-slate-400 whitespace-nowrap">{log.date}</td>
                              <td className="p-4">
                                <div className="flex items-center space-x-2.5">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-100 to-emerald-100 border border-teal-200/70 flex items-center justify-center text-sm shrink-0">🐓</div>
                                  <span className="font-bold text-slate-900">{log.entry_name}</span>
                                </div>
                              </td>
                              <td className="p-4">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 font-bold text-[10px] uppercase tracking-wide whitespace-nowrap">{log.breed || '—'}</span>
                              </td>
                              <td className="p-4 text-slate-600">{log.type}</td>
                              <td className="p-4 text-slate-500 font-normal">{log.location}</td>
                              <td className="p-4 text-center">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full font-black text-[9px] uppercase tracking-wider border ${log.outcome && log.outcome.toLowerCase() === 'win' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : log.outcome && log.outcome.toLowerCase() === 'loss' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>{log.outcome || '—'}</span>
                              </td>
                              <td className="p-4 text-center">
                                {log.video_url ? (
                                  <a href={log.video_url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-black text-emerald-600 hover:text-emerald-800 underline underline-offset-2">▶ PLAY</a>
                                ) : (
                                  <span className="text-[9px] text-slate-300 font-bold">—</span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* PROFILING & LINEAGE MODULE */}
            {currentPage === 'profiling' && (
              <div className="space-y-5 animate-fadeIn">
                <div className="antigravity-hover bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col gap-4">
                  <div>
                    <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Profiling & Lineage Core Matrix</h1>
                    <p className="text-xs text-slate-400 font-semibold mt-0.5">Encode specific traits to track ancestry weights and biological specifications</p>
                  </div>
                  
                  {/* SUBTAB SWITCHER BAR */}
                  <div className="bg-slate-100/90 p-1 rounded-2xl flex flex-wrap sm:flex-nowrap w-full border border-slate-200/60 mt-1 shrink-0 gap-1">
                    <button type="button" onClick={() => setProfilingSubTab('form')} className={`flex-1 min-w-[80px] py-2.5 text-[10px] sm:text-xs font-black rounded-xl transition-all duration-200 text-center cursor-pointer ${profilingSubTab === 'form' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>📝 Encode</button>
                    <button type="button" onClick={() => setProfilingSubTab('registry')} className={`flex-1 min-w-[80px] py-2.5 text-[10px] sm:text-xs font-black rounded-xl transition-all duration-200 text-center cursor-pointer ${profilingSubTab === 'registry' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>🌳 Active ({activeFowls.length})</button>
                    <button type="button" onClick={() => setProfilingSubTab('archived')} className={`flex-1 min-w-[80px] py-2.5 text-[10px] sm:text-xs font-black rounded-xl transition-all duration-200 text-center cursor-pointer ${profilingSubTab === 'archived' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>📦 Archived ({archivedFowls.length})</button>
                    <button type="button" onClick={() => setProfilingSubTab('deceased')} className={`flex-1 min-w-[80px] py-2.5 text-[10px] sm:text-xs font-black rounded-xl transition-all duration-200 text-center cursor-pointer ${profilingSubTab === 'deceased' ? 'bg-white text-rose-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>💀 Deceased ({deceasedFowls.length})</button>
                    <button type="button" onClick={() => setProfilingSubTab('matchForm')} className={`flex-1 min-w-[80px] py-2.5 text-[10px] sm:text-xs font-black rounded-xl transition-all duration-200 text-center cursor-pointer ${profilingSubTab === 'matchForm' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>⚔️ Match Logs</button>
                  </div>
                </div>

                {/* ENCODE NODE FORM */}
                {profilingSubTab === 'form' && (
                  <form onSubmit={handleAddFowl} className="space-y-5 animate-fadeIn">
                    <div className="antigravity-hover bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
                      <h3 className="font-black text-xs text-emerald-700 uppercase tracking-wider flex items-center space-x-2 border-b pb-2.5 border-slate-100">
                        <span>🏷️</span> <span>Step 1: Core Identifiers</span>
                      </h3>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Identifier Name</label>
                        <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full p-3 border border-slate-200/90 rounded-xl text-xs bg-slate-50/50 outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all font-semibold" placeholder="e.g., Roundhead Storm" required />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Genetic Strain</label>
                          <input 
                            list="genetic-strains" 
                            value={newBreed} 
                            onChange={(e) => setNewBreed(e.target.value)} 
                            className="w-full p-3 border border-slate-200/90 rounded-xl text-xs bg-slate-50/50 outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all font-semibold" 
                            placeholder="Select or type strain..."
                            required 
                          />
                          <datalist id="genetic-strains">
                            <option value="Sweater" />
                            <option value="Hatch" />
                            <option value="Roundhead" />
                            <option value="Kelso" />
                            <option value="Lemon 84" />
                            <option value="Albany" />
                            <option value="Claret" />
                            <option value="Whitehackle" />
                            <option value="Black" />
                            <option value="Melsin" />
                            <option value="Bennie" />
                            <option value="Joe Madigin" />
                          </datalist>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Gender Class</label>
                          <select value={newGender} onChange={(e) => { const g = e.target.value; setNewGender(g); if (age.trim() !== '' && !isNaN(Number(age))) { setNewGrowthStage(autoComputeGrowthStage(Number(age), g)); } else { setNewGrowthStage(''); } }} className={`w-full p-3 border border-slate-200/90 rounded-xl text-xs bg-slate-50 font-extrabold outline-none focus:border-emerald-500 transition-all cursor-pointer ${newGender ? 'text-slate-700' : 'text-slate-400 font-normal'}`} required>
                            <option value="" disabled>Select Gender Class</option>
                            <option value="Rooster">Rooster (Cock)</option>
                            <option value="Hen">Hen (Pullet)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="antigravity-hover bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
                      <h3 className="font-black text-xs text-emerald-700 uppercase tracking-wider flex items-center space-x-2 border-b pb-2.5 border-slate-100">
                        <span>🧬</span> <span>Step 2: Physical Parameters</span>
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Age (Mos)</label>
                          <input type="number" value={age} onChange={(e) => handleAgeChange(e.target.value)} className="w-full p-3 border border-slate-200/90 rounded-xl text-xs text-center font-extrabold outline-none" placeholder="0" required />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Growth</label>
                          <input 
                            type="text" 
                            value={newGrowthStage} 
                            readOnly 
                            placeholder="Awaiting age..." 
                            className={`w-full p-3 border rounded-xl text-xs text-center font-extrabold shadow-2xs transition-all ${
                              newGrowthStage 
                                ? 'border-emerald-200/60 bg-emerald-50 text-emerald-800' 
                                : 'border-slate-200/90 bg-slate-50/50 text-slate-400 font-medium'
                            }`} 
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Height (cm)</label>
                          <input type="number" step="0.1" value={height} onChange={(e) => setHeight(e.target.value)} className="w-full p-3 border border-slate-200/90 rounded-xl text-xs text-center font-extrabold outline-none focus:border-emerald-500" placeholder="e.g. 45" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Weight (kg)</label>
                          <input type="number" step="0.01" value={weight} onChange={(e) => setWeight(e.target.value)} className="w-full p-3 border border-slate-200/90 rounded-xl text-xs text-center font-extrabold outline-none focus:border-emerald-500" placeholder="e.g. 2.2" />
                        </div>
                      </div>
                    </div>

                    <div className="antigravity-hover bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
                      <h3 className="font-black text-xs text-emerald-700 uppercase tracking-wider flex items-center space-x-2 border-b pb-2.5 border-slate-100">
                        <span>🌳</span> <span>Step 3: Ancestry Roots & Photo</span>
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                            Sire (Father) <span className="text-slate-400 font-normal lowercase">(optional / foundation stock)</span>
                          </label>
                          <input type="text" value={sireName} onChange={(e) => setSireName(e.target.value)} className="w-full p-3 border border-slate-200/90 rounded-xl text-xs bg-slate-50/50 outline-none focus:border-emerald-500 font-semibold" placeholder="e.g. Foundation Stock or Sire Name" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                            Dam (Mother) <span className="text-slate-400 font-normal lowercase">(optional / foundation stock)</span>
                          </label>
                          <input type="text" value={damName} onChange={(e) => setDamName(e.target.value)} className="w-full p-3 border border-slate-200/90 rounded-xl text-xs bg-slate-50/50 outline-none focus:border-emerald-500 font-semibold" placeholder="e.g. Foundation Stock or Dam Name" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                            Sire Pct (%) <span className="text-slate-400 font-normal lowercase">(optional)</span>
                          </label>
                          <input type="number" value={sirePct} onChange={(e) => setSirePct(e.target.value === '' ? '' : Number(e.target.value))} className="w-full p-3 border border-slate-200/90 rounded-xl text-xs bg-slate-50/50 outline-none font-bold placeholder:font-normal" placeholder="100" min="0" max="100" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                            Dam Pct (%) <span className="text-slate-400 font-normal lowercase">(optional)</span>
                          </label>
                          <input type="number" value={damPct} onChange={(e) => setDamPct(e.target.value === '' ? '' : Number(e.target.value))} className="w-full p-3 border border-slate-200/90 rounded-xl text-xs bg-slate-50/50 outline-none font-bold placeholder:font-normal" placeholder="100" min="0" max="100" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Fowl Attachment Photo</label>
                        <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-slate-200 border-dashed rounded-2xl cursor-pointer bg-slate-50/80 hover:bg-slate-100/70 transition-all">
                          <span className="text-xs text-slate-600 font-bold">📷 {selectedImage ? selectedImage.name : 'Choose fowl image file'}</span>
                          <input type="file" accept="image/*" onChange={(e) => e.target.files && setSelectedImage(e.target.files[0])} className="hidden" />
                        </label>
                      </div>
                    </div>

                    <button type="submit" disabled={loading || uploadingImage} className="w-full bg-slate-900 hover:bg-emerald-700 active:scale-[0.99] text-white font-extrabold py-4 rounded-2xl text-xs shadow-md uppercase tracking-wider cursor-pointer transition-all duration-200 flex items-center justify-center space-x-2">
                      {(loading || uploadingImage) && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
                      <span>{uploadingImage ? 'Uploading Attachment...' : loading ? 'Committing Node...' : 'Commit Node Objects'}</span>
                    </button>
                  </form>
                )}

                {/* ACTIVE REGISTRY LIST */}
                {profilingSubTab === 'registry' && (
                  <div className="space-y-4 animate-fadeIn">
                    {activeFowls.length === 0 ? (
                      <div className="bg-white p-12 text-center rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
                        <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center text-3xl mx-auto">🧬</div>
                        <h3 className="text-base font-extrabold text-slate-800">No Active Gamefowl Encoded</h3>
                        <p className="text-xs text-slate-400 font-medium max-w-sm mx-auto">Your active farm cluster is currently empty. Encode a new fowl node to begin tracking lineage weights.</p>
                        <button type="button" onClick={() => setProfilingSubTab('form')} className="mt-2 inline-block bg-slate-900 text-white font-bold px-5 py-2.5 rounded-xl text-xs cursor-pointer hover:bg-emerald-700 transition-all">
                          ➕ Encode First Fowl Node
                        </button>
                      </div>
                    ) : activeFowls.map((fowl, index) => {
                      const siblings = getSiblingsForFowl(fowl.sire, fowl.dam, fowl.id);
                      return (
                        <div key={fowl.id} className="antigravity-card bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm relative overflow-hidden flex flex-col sm:flex-row gap-5 items-center" style={{ animationDelay: `${(index % 5) * 0.8}s` }}>
                          <div className="antigravity-avatar w-24 h-24 bg-slate-50 border border-slate-200/80 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center text-slate-400 text-[9px] font-mono shadow-inner relative">
                            {fowl.image_url ? <img src={fowl.image_url} alt={fowl.name} className="w-full h-full object-cover" /> : 'NO PHOTO'}
                          </div>
                          <div className="flex-1 w-full space-y-3">
                            <span className="antigravity-badge absolute top-0 right-0 text-[8px] font-black uppercase px-3.5 py-1 bg-slate-900 text-white rounded-bl-xl tracking-widest shadow-2xs">{fowl.growth_stage || 'Stag'}</span>
                            <div className="flex items-center space-x-2">
                              <h4 className="text-base font-black text-slate-900">{fowl.name}</h4>
                              <span className="antigravity-badge text-[9px] font-black border px-2.5 py-0.5 rounded-full uppercase text-emerald-700 bg-emerald-50 border-emerald-200">{fowl.breed}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] text-slate-500 bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
                              <div>Sire: <strong className="text-slate-800">{fowl.sire || 'N/A'}</strong></div>
                              <div>Dam: <strong className="text-slate-800">{fowl.dam || 'N/A'}</strong></div>
                              <div>Color: <strong className="text-slate-800">{fowl.color_category} ({fowl.color})</strong></div>
                              <div>Trait: <strong className="text-emerald-700">{fowl.behavior_trait}</strong></div>
                              <div className="col-span-2 pt-1 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                                <span>Per-Fowl Win Rate:</span>
                                {(() => {
                                  const fMatches = matchHistory.filter(m => m.entry_name?.trim().toLowerCase() === fowl.name?.trim().toLowerCase());
                                  const fWins = fMatches.filter(m => m.outcome && m.outcome.toLowerCase() === 'win').length;
                                  const fLosses = fMatches.filter(m => m.outcome && m.outcome.toLowerCase() === 'loss').length;
                                  const fDecided = fWins + fLosses;
                                  const fRate = fDecided > 0 ? Math.round((fWins / fDecided) * 100) : fMatches.length > 0 ? Math.round((fWins / fMatches.length) * 100) : 0;
                                  return (
                                    <strong className={fMatches.length > 0 ? "text-emerald-700 font-black" : "text-slate-400 font-semibold"}>
                                      {fMatches.length > 0 ? `${fRate}% (${fWins}W - ${fLosses}L)` : 'No matches'}
                                    </strong>
                                  );
                                })()}
                              </div>
                            </div>
                            
                            <div className="text-[10px] text-slate-500 flex justify-between items-center bg-slate-50 p-2.5 px-3.5 rounded-xl border border-slate-100">
                              <div className="font-semibold">Siblings: <span className="text-emerald-700 font-extrabold">{siblings.length > 0 ? siblings.join(', ') : 'None'}</span></div>
                            </div>
                            
                            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                              <button type="button" onClick={() => setSelectedFowlForDetails(fowl)} className="flex-1 min-w-[70px] bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-700 text-[11px] font-extrabold py-2 rounded-xl border border-slate-200/60 text-center cursor-pointer transition-all duration-150">🔍 Details</button>
                              <button type="button" onClick={() => handleOpenEditModal(fowl)} className="flex-1 min-w-[70px] bg-emerald-50 hover:bg-emerald-100 active:scale-[0.98] text-emerald-800 text-[11px] font-extrabold py-2 rounded-xl border border-emerald-200/60 text-center cursor-pointer transition-all duration-150">✏️ Edit</button>
                              
                              <button 
                                type="button"
                                onClick={() => setSelectedFowlForArchive(fowl)} 
                                disabled={loading}
                                className="flex-1 min-w-[70px] text-[11px] font-extrabold py-2 rounded-xl border text-center cursor-pointer transition-all duration-150 bg-amber-50 hover:bg-amber-100 active:scale-[0.98] text-amber-800 border-amber-200/60"
                              >
                                <span className="flex items-center justify-center gap-1">🗎 Archive</span>
                              </button>

                              <button 
                                type="button"
                                onClick={() => setSelectedFowlForDeceased(fowl)} 
                                disabled={loading}
                                className="flex-1 min-w-[70px] text-[11px] font-extrabold py-2 rounded-xl border text-center cursor-pointer transition-all duration-150 bg-rose-50 hover:bg-rose-100 active:scale-[0.98] text-rose-700 border-rose-200/60"
                              >
                                <span className="flex items-center justify-center gap-1">💀 Deceased</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ARCHIVED REGISTRY LIST */}
                {profilingSubTab === 'archived' && (
                  <div className="space-y-4 animate-fadeIn">
                    {archivedFowls.length === 0 ? (
                      <div className="bg-white p-12 text-center rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
                        <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center text-3xl mx-auto">📦</div>
                        <h3 className="text-base font-extrabold text-slate-800">Archived Registry Empty</h3>
                        <p className="text-xs text-slate-400 font-medium max-w-sm mx-auto">No gamefowl records have been shifted to the relational archive log.</p>
                      </div>
                    ) : archivedFowls.map((fowl, index) => {
                      const siblings = getSiblingsForFowl(fowl.sire, fowl.dam, fowl.id);
                      return (
                        <div key={fowl.id} className="antigravity-card bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm relative overflow-hidden flex flex-col sm:flex-row gap-5 items-center bg-slate-50/50" style={{ animationDelay: `${(index % 5) * 0.8}s` }}>
                          <div className="antigravity-avatar w-24 h-24 bg-slate-100 border border-slate-200/80 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center text-slate-400 text-[9px] font-mono shadow-inner relative">
                            {fowl.image_url ? <img src={fowl.image_url} alt={fowl.name} className="w-full h-full object-cover grayscale opacity-80" /> : 'NO PHOTO'}
                          </div>
                          <div className="flex-1 w-full space-y-3">
                            {(() => {
                              const badge = getArchiveBadgeStyle(fowl.archive_reason);
                              return (
                                <span className={`antigravity-badge absolute top-0 right-0 text-[8px] font-black uppercase px-3.5 py-1 ${badge.bg} rounded-bl-xl tracking-widest shadow-2xs`}>
                                  {badge.label}
                                </span>
                              );
                            })()}
                            <div className="flex items-center space-x-2">
                              <h4 className="text-base font-black text-slate-700">{fowl.name}</h4>
                              <span className="antigravity-badge text-[9px] font-black border px-2.5 py-0.5 rounded-full uppercase text-amber-700 bg-amber-50 border-amber-200">{fowl.breed}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] text-slate-500 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                              <div>Sire: <strong className="text-slate-800">{fowl.sire || 'N/A'}</strong></div>
                              <div>Dam: <strong className="text-slate-800">{fowl.dam || 'N/A'}</strong></div>
                              <div>Color: <strong className="text-slate-800">{fowl.color_category} ({fowl.color})</strong></div>
                              <div>Trait: <strong className="text-emerald-700">{fowl.behavior_trait}</strong></div>
                            </div>
                            
                            <div className="text-[10px] text-slate-500 flex justify-between items-center bg-slate-50 p-2.5 px-3.5 rounded-xl border border-slate-100">
                              <div className="font-semibold">Siblings: <span className="text-emerald-700 font-extrabold">{siblings.length > 0 ? siblings.join(', ') : 'None'}</span></div>
                            </div>
                            
                            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                              <button type="button" onClick={() => setSelectedFowlForDetails(fowl)} className="flex-1 min-w-[75px] bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-extrabold py-2 rounded-xl border border-slate-200/60 text-center cursor-pointer transition-all duration-150">🔍 Details</button>
                              <button 
                                type="button" 
                                onClick={() => handleRestoreFowlOnly(fowl.id)} 
                                disabled={loading}
                                className="flex-1 min-w-[95px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 text-[11px] font-black py-2 rounded-xl text-center cursor-pointer transition-all duration-150 flex items-center justify-center gap-1.5 shadow-2xs"
                              >
                                <span>↺</span> <span>Restore Node</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* DECEASED ROSTER LIST */}
                {profilingSubTab === 'deceased' && (
                  <div className="space-y-4 animate-fadeIn">
                    {deceasedFowls.length === 0 ? (
                      <div className="bg-white p-12 text-center rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
                        <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center text-3xl mx-auto">💀</div>
                        <h3 className="text-base font-extrabold text-slate-800">No Mortality Records</h3>
                        <p className="text-xs text-slate-400 font-medium max-w-sm mx-auto">No gamefowl nodes recorded under mortality logs.</p>
                      </div>
                    ) : (
                      deceasedFowls.map((fowl, index) => {
                        return (
                          <div key={fowl.id} className="antigravity-card bg-white p-5 rounded-3xl border border-rose-200/80 shadow-sm relative overflow-hidden flex flex-col sm:flex-row gap-5 items-center" style={{ animationDelay: `${(index % 5) * 0.8}s` }}>
                            <div className="antigravity-avatar w-24 h-24 bg-slate-50 border border-slate-200/80 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center text-slate-400 text-[9px] font-mono shadow-inner relative grayscale">
                              {fowl.image_url ? <img src={fowl.image_url} alt={fowl.name} className="w-full h-full object-cover" /> : 'NO PHOTO'}
                            </div>
                            <div className="flex-1 w-full space-y-3">
                              <span className="antigravity-badge absolute top-0 right-0 text-[8px] font-black uppercase px-3.5 py-1 bg-rose-900 text-white rounded-bl-xl tracking-widest shadow-2xs">● DECEASED</span>
                              <div className="flex items-center space-x-2">
                                <h4 className="text-base font-black text-slate-900 line-through opacity-75">{fowl.name}</h4>
                                <span className="antigravity-badge text-[9px] font-black border px-2.5 py-0.5 rounded-full uppercase text-rose-700 bg-rose-50 border-rose-200">{fowl.breed}</span>
                                <span className="antigravity-badge text-[9px] font-black border px-2.5 py-0.5 rounded-full uppercase text-slate-600 bg-slate-100 border-slate-200">Reason: {fowl.death_reason || 'Illness'}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] text-slate-500 bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
                                <div>Sire: <strong className="text-slate-800">{fowl.sire || 'N/A'}</strong></div>
                                <div>Dam: <strong className="text-slate-800">{fowl.dam || 'N/A'}</strong></div>
                                <div>Growth Stage: <strong className="text-slate-800">{fowl.growth_stage || 'Chick'}</strong></div>
                                <div>Color: <strong className="text-slate-800">{fowl.color_category} ({fowl.color})</strong></div>
                              </div>
                              
                              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                                <button type="button" onClick={() => setSelectedFowlForDetails(fowl)} className="flex-1 min-w-[95px] bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/60 text-[11px] font-extrabold py-2 rounded-xl text-center cursor-pointer transition-all duration-150">🔍 View Analytics & Match Logs</button>
                                <button 
                                  type="button" 
                                  onClick={() => handleRestoreFowlOnly(fowl.id)} 
                                  disabled={loading}
                                  className="flex-1 min-w-[95px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 text-[11px] font-black py-2 rounded-xl text-center cursor-pointer transition-all duration-150 flex items-center justify-center gap-1.5 shadow-2xs"
                                >
                                  <span>↺</span> <span>Reactivate Node</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* MATCH LOG FORM */}
                {profilingSubTab === 'matchForm' && (
                  <form onSubmit={handleAddMatchRecord} className="antigravity-hover bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-5 animate-fadeIn">
                    <h3 className="font-black text-xs text-emerald-700 uppercase tracking-wider flex items-center space-x-2 border-b pb-2.5 border-slate-100">
                      <span>⚔️</span> <span>Record Fight Performance Log</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Select Local Fowl Entry</label>
                        <select value={selectedFowlForMatch} onChange={(e) => setSelectedFowlForMatch(e.target.value)} className="w-full p-3 border border-slate-200/90 rounded-xl text-xs bg-slate-50 font-extrabold text-slate-700 outline-none focus:border-emerald-500 cursor-pointer" required>
                          <option value="">-- Select Fowl Node --</option>
                          {fowls.filter(f => f.status === 'Active').map(f => (
                            <option key={f.id} value={f.name}>{f.name} ({f.breed})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Match Date</label>
                        <input type="date" value={matchDate} onChange={(e) => setMatchDate(e.target.value)} className="w-full p-3 border border-slate-200/90 rounded-xl text-xs bg-slate-50 font-semibold outline-none focus:border-emerald-500" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Opponent Entry Identity</label>
                        <input type="text" value={opponentName} onChange={(e) => setOpponentName(e.target.value)} className="w-full p-3 border border-slate-200/90 rounded-xl text-xs bg-slate-50/50 outline-none focus:border-emerald-500 font-semibold" placeholder="e.g., Kelso Express" required />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Arena Location Hub</label>
                        <input 
                          list="arena-locations" 
                          value={matchLocation} 
                          onChange={(e) => setMatchLocation(e.target.value)} 
                          className="w-full p-3 border border-slate-200/90 rounded-xl text-xs bg-slate-50/50 outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all font-semibold" 
                          placeholder="Select or type arena..." 
                          required 
                        />
                        <datalist id="arena-locations">
                          <option value="Dingle Breeding Arena" />
                          <option value="Iloilo Coliseum" />
                          <option value="Passi Sports Complex" />
                          <option value="Janiuay Cockpit Arena" />
                          <option value="Pototan Coliseum" />
                          <option value="Santa Barbara Sports Complex" />
                          <option value="Dumangas Cockpit Arena" />
                          <option value="San Enrique Arena" />
                          <option value="Local Farm Pit" />
                        </datalist>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Match Type</label>
                        <select value={matchType} onChange={(e) => setMatchType(e.target.value)} className="w-full p-3 border border-slate-200/90 rounded-xl text-xs bg-slate-50 font-bold text-slate-700 outline-none cursor-pointer focus:border-emerald-500 transition-all">
                          <option value="Derby Match">Derby Match</option>
                          <option value="Hack Match">Hack Match</option>
                          <option value="2-Cock Derby">2-Cock Derby</option>
                          <option value="3-Cock Derby">3-Cock Derby</option>
                          <option value="4-Cock Derby">4-Cock Derby</option>
                          <option value="5-Cock Derby">5-Cock Derby</option>
                          <option value="Special Championship">Special Championship</option>
                          <option value="Regional Circuit">Regional Circuit</option>
                          <option value="Main Event / Solo">Main Event / Solo</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Fight Outcome</label>
                        <select value={matchOutcome} onChange={(e) => setMatchOutcome(e.target.value)} className="w-full p-3 border border-amber-200/80 rounded-xl text-xs bg-amber-50 font-black text-amber-900 outline-none cursor-pointer">
                          <option value="Win">🏆 WIN</option>
                          <option value="Loss">💀 LOSS</option>
                          <option value="Draw">🤝 DRAW</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Video Evidence Upload</label>
                      <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-slate-200 border-dashed rounded-2xl cursor-pointer bg-slate-50/80 hover:bg-slate-100/70 transition-all">
                        <span className="text-xs text-slate-600 font-bold">🎥 {matchVideoFile ? matchVideoFile.name : 'Upload fight match recording (MP4, MOV, AVI)'}</span>
                        <input type="file" accept="video/mp4,video/quicktime,video/x-msvideo" onChange={(e) => e.target.files && setMatchVideoFile(e.target.files[0])} className="hidden" />
                      </label>
                    </div>
                    <button type="submit" disabled={loading || uploadingVideo} className="w-full bg-slate-900 text-white font-extrabold py-3.5 rounded-2xl text-xs shadow-md uppercase tracking-wider cursor-pointer transition-all duration-200 hover:bg-emerald-700 flex items-center justify-center space-x-2">
                      {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
                      <span>{loading ? 'Committing Log...' : 'Commit Performance Outcome Entry'}</span>
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* BREEDING CATALOG MODULE */}
            {currentPage === 'marketplace' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Verified Breeding Cohort Catalog</h1>
                    <p className="text-xs text-slate-400 font-semibold mt-0.5">Transparent cohort matrix filterable by active pedigree clusters</p>
                  </div>
                  <div className="relative w-full sm:w-72">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                    </span>
                    <input type="text" placeholder="Search lineage strains..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-3.5 py-3 border border-slate-200/90 rounded-2xl bg-slate-50/50 text-xs outline-none focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-100 transition-all font-semibold" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {fowls.filter(item => item.status === 'Active' && item.breed.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
                    <div className="col-span-full bg-white p-14 text-center rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
                      <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center text-3xl mx-auto">
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                      </div>
                      <h3 className="text-base font-extrabold text-slate-800">No Pedigree Cohorts Found</h3>
                      <p className="text-xs text-slate-400 font-medium max-w-sm mx-auto">No active gamefowl strains match your search query.</p>
                    </div>
                  ) : (
                    fowls.filter(item => item.status === 'Active' && item.breed.toLowerCase().includes(search.toLowerCase())).map((item, index) => (
                      <div key={item.id} className="antigravity-card bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm relative overflow-hidden flex flex-col sm:flex-row gap-4 items-start" style={{ animationDelay: `${(index % 4) * 0.9}s` }}>
                        <span className="antigravity-badge absolute top-0 right-0 bg-emerald-50 border-l border-b border-emerald-200 text-emerald-700 text-[8px] font-black px-3 py-1 rounded-bl-2xl uppercase tracking-wider flex items-center gap-1 shadow-2xs">
                          <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                          Verified Pedigree
                        </span>
                        <div className="antigravity-avatar w-20 h-20 bg-slate-50 border border-slate-200/80 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center font-mono text-slate-300 text-[8px] relative shadow-inner">
                          {item.image_url ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" /> : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                          )}
                        </div>
                        <div className="flex-1 w-full min-w-0 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap pr-20">
                            <h4 className="font-black text-slate-900 text-base leading-none">{item.name}</h4>
                            <span className="text-[8px] font-mono font-black bg-slate-900 text-white px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">{item.growth_stage || 'Stag'}</span>
                          </div>
                          <p className="text-[11px] text-slate-400 font-bold">Strain: <span className="text-slate-800 font-black">{item.breed}</span></p>
                          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 bg-slate-50/80 p-3 rounded-2xl border border-slate-100 text-[11px] text-slate-500">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full border border-slate-200" style={{ backgroundColor: item.color?.toLowerCase() === 'bright red' ? '#dc2626' : item.color?.toLowerCase() === 'dark red' ? '#991b1b' : item.color?.toLowerCase() === 'grey' ? '#6b7280' : item.color?.toLowerCase() === 'black' ? '#1f2937' : item.color?.toLowerCase() === 'white' ? '#f9fafb' : '#e5e7eb' }}></span>
                              Tone: <strong className="text-slate-800 font-black">{item.color}</strong>
                            </div>
                            <div>Trait: <strong className="text-emerald-700 font-black">{item.behavior_trait}</strong></div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {currentPage === 'profile' && <div className="p-1 animate-fadeIn"><ProfilePage /></div>}
            {currentPage === 'settings' && <div className="p-1 animate-fadeIn"><SettingsPage /></div>}
          </main>

          {/* MOBILE BOTTOM NAVIGATION BAR */}
          <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-2xl md:hidden pb-[env(safe-area-inset-bottom,0px)]">
            <div className="flex justify-around items-center h-16 px-1">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: '📊' },
                { id: 'profiling', label: 'Profiling', icon: '🧬' },
                { id: 'marketplace', label: 'Catalog', icon: '🛒' },
                { id: 'profile', label: 'Profile', icon: '👤' },
                { id: 'settings', label: 'Settings', icon: '⚙️' },
              ].map((menu) => (
                <button 
                  key={menu.id}
                  type="button"
                  onClick={() => setCurrentPage(menu.id as any)}
                  className={`flex flex-col items-center justify-center flex-1 h-full py-1 cursor-pointer transition-all duration-200 active:scale-95 ${
                    currentPage === menu.id ? 'text-emerald-600 font-black scale-105' : 'text-slate-400 hover:text-slate-600 font-medium'
                  }`}
                >
                  <span className="text-xl leading-none">{menu.icon}</span>
                  <span className="text-[10px] mt-1 tracking-tight">{menu.label}</span>
                </button>
              ))}
            </div>
          </nav>

        </div>
      )}

      {/* INDIVIDUAL GAMEFOWL ANALYTICS & MATCH HISTORY MODAL */}
      {selectedFowlForDetails && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto relative">
            <button 
              onClick={() => setSelectedFowlForDetails(null)} 
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all cursor-pointer"
            >
              ✕
            </button>

            <h3 className="text-base font-black text-slate-900 tracking-tight border-b pb-3 border-slate-100 flex items-center space-x-2">
              <span>🧬</span> <span>Individual Gamefowl Analytics & Match Logs</span>
            </h3>

            <div className="flex flex-col sm:flex-row gap-4 items-center bg-slate-50 p-4 rounded-2xl border border-slate-200/70">
              <div className="w-24 h-24 bg-white border border-slate-200 rounded-xl overflow-hidden shrink-0 flex items-center justify-center relative shadow-inner">
                {selectedFowlForDetails.image_url ? (
                  <img src={selectedFowlForDetails.image_url} alt={selectedFowlForDetails.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-mono text-[8px] text-slate-400 font-bold">NO PHOTO</div>
                )}
              </div>
              <div className="space-y-1.5 text-center sm:text-left flex-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h4 className="text-lg font-black text-slate-900">{selectedFowlForDetails.name}</h4>
                  <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full uppercase">{selectedFowlForDetails.breed}</span>
                  {(() => {
                    if (selectedFowlForDetails.archive_reason) {
                      const badge = getArchiveBadgeStyle(selectedFowlForDetails.archive_reason);
                      return (
                        <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase ${badge.bg} border border-white/20 shadow-2xs`}>
                          {badge.label}
                        </span>
                      );
                    }
                    if (selectedFowlForDetails.status === 'Deceased') {
                      return (
                        <span className="text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase bg-rose-900 text-white border border-rose-950 shadow-2xs">
                          ● DECEASED ({selectedFowlForDetails.death_reason || 'Illness'})
                        </span>
                      );
                    }
                    return (
                      <span className="text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                        ● ACTIVE
                      </span>
                    );
                  })()}
                </div>
                <p className="text-[11px] text-slate-500 font-medium">
                  Growth Stage: <strong className="text-slate-800 font-bold">{selectedFowlForDetails.growth_stage || 'Chick'}</strong> | Dynamic Age: <strong className="text-emerald-700 font-bold">{selectedFowlForDetails.age || 'N/A'}</strong>
                </p>
              </div>
            </div>

            {/* COMBAT PERFORMANCE STATS VECTOR */}
            {(() => {
              const fowlMatches = matchHistory.filter(m => m.entry_name?.trim().toLowerCase() === selectedFowlForDetails.name?.trim().toLowerCase());
              const totalFights = fowlMatches.length;
              const wins = fowlMatches.filter(m => m.outcome && m.outcome.toLowerCase() === 'win').length;
              const losses = fowlMatches.filter(m => m.outcome && m.outcome.toLowerCase() === 'loss').length;
              const draws = fowlMatches.filter(m => m.outcome && m.outcome.toLowerCase() === 'draw').length;
              const decidedFights = wins + losses;
              const winRate = decidedFights > 0 
                ? Math.round((wins / decidedFights) * 100) 
                : totalFights > 0 
                ? Math.round((wins / totalFights) * 100) 
                : 0;

              return (
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4 rounded-2xl space-y-3 shadow-sm border border-slate-700/60">
                    <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center justify-between border-b pb-2 border-slate-700/80">
                      <span>⚔️ Combat Analytics & Performance Vectors</span>
                      <span className="font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">FOWL ID: #{selectedFowlForDetails.id}</span>
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                      <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Total Fights</span>
                        <strong className="text-base text-white font-black">{totalFights}</strong>
                      </div>
                      <div className="bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-700/40">
                        <span className="text-[9px] text-emerald-400 font-bold uppercase block">Wins</span>
                        <strong className="text-base text-emerald-400 font-black">{wins} 🏆</strong>
                      </div>
                      <div className="bg-rose-950/40 p-2.5 rounded-xl border border-rose-700/40">
                        <span className="text-[9px] text-rose-400 font-bold uppercase block">Losses</span>
                        <strong className="text-base text-rose-400 font-black">{losses} 💀</strong>
                      </div>
                      <div className="bg-amber-950/40 p-2.5 rounded-xl border border-amber-700/40">
                        <span className="text-[9px] text-amber-400 font-bold uppercase block">Draws</span>
                        <strong className="text-base text-amber-400 font-black">{draws} 🤝</strong>
                      </div>
                      <div className="bg-teal-950/40 p-2.5 rounded-xl border border-teal-700/40 col-span-2 sm:col-span-1">
                        <span className="text-[9px] text-teal-300 font-bold uppercase block">Per-Fowl Win Rate</span>
                        <strong className="text-base text-teal-300 font-black">{winRate}%</strong>
                        <span className="text-[8px] text-slate-300 block font-mono font-semibold">{wins}W - {losses}L</span>
                      </div>
                    </div>
                  </div>

                  {/* DEDICATED INDIVIDUAL MATCH LOG TABLE */}
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                    <div className="p-3 bg-slate-50 border-b border-slate-200/80 flex justify-between items-center">
                      <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-wider">Individual Fight History Logs ({totalFights})</h4>
                      <span className="text-[9px] font-mono font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded">MATCH LOG PARITY</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[11px] border-collapse">
                        <thead>
                          <tr className="bg-slate-100/70 text-slate-500 font-extrabold uppercase border-b border-slate-200">
                            <th className="p-2.5 pl-4">Match Date</th>
                            <th className="p-2.5">Opponent Entry</th>
                            <th className="p-2.5">Arena Location</th>
                            <th className="p-2.5">Match Type</th>
                            <th className="p-2.5 text-center">Outcome</th>
                            <th className="p-2.5 text-center">Video</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-600 font-semibold">
                          {fowlMatches.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="p-6 text-center text-slate-400 text-xs">
                                No derby performance logs recorded for this specific gamefowl node.
                              </td>
                            </tr>
                          ) : (
                            fowlMatches.map(match => (
                              <tr key={match.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="p-2.5 pl-4 font-mono text-[10px] text-slate-500">{match.date}</td>
                                <td className="p-2.5 font-bold text-slate-800">{match.opponent}</td>
                                <td className="p-2.5 text-slate-600">{match.location}</td>
                                <td className="p-2.5"><span className="bg-slate-100 border border-slate-200 text-slate-700 text-[9px] font-bold px-2 py-0.5 rounded-full">{match.type}</span></td>
                                <td className="p-2.5 text-center">
                                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                                    match.outcome.toLowerCase() === 'win' 
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                      : match.outcome.toLowerCase() === 'loss' 
                                      ? 'bg-rose-50 text-rose-700 border-rose-200' 
                                      : 'bg-amber-50 text-amber-700 border-amber-200'
                                  }`}>
                                    {match.outcome}
                                  </span>
                                </td>
                                <td className="p-2.5 text-center">
                                  {match.video_url ? (
                                    <a href={match.video_url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-black text-emerald-600 hover:text-emerald-800 underline underline-offset-2">▶ PLAY</a>
                                  ) : (
                                    <span className="text-[9px] text-slate-300 font-bold">—</span>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
              <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Lineage Integration Balance</h4>
              
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold text-slate-500">
                  <span>♂ Sire Heritage Weight ({selectedFowlForDetails.sire})</span>
                  <span className="text-slate-800">{selectedFowlForDetails.sire_pct ?? 100}%</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-sky-500 h-full rounded-full" style={{ width: `${selectedFowlForDetails.sire_pct ?? 100}%` }}></div>
                </div>
              </div>

              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[10px] font-bold text-slate-500">
                  <span>♀ Dam Heritage Weight ({selectedFowlForDetails.dam})</span>
                  <span className="text-slate-800">{selectedFowlForDetails.dam_pct ?? 100}%</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-pink-500 h-full rounded-full" style={{ width: `${selectedFowlForDetails.dam_pct ?? 100}%` }}></div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/50 flex justify-between items-center text-[11px]">
                <span className="font-extrabold text-slate-700">Combined Bloodline Index</span>
                <span className="font-mono font-black text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 rounded-full">
                  {selectedFowlForDetails.bloodline_pct ?? 100}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 sm:col-span-2">
                <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Behavioral Spec</span>
                <strong className="text-emerald-700 text-xs mt-0.5 block font-bold">{selectedFowlForDetails.behavior_trait}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MARK DECEASED MODAL DIALOG */}
      {selectedFowlForDeceased && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-rose-200 max-w-md w-full p-6 space-y-5 relative">
            <button 
              onClick={() => setSelectedFowlForDeceased(null)} 
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all cursor-pointer"
            >
              ✕
            </button>

            <div className="flex items-center space-x-3 text-rose-700 border-b pb-3 border-rose-100">
              <div className="w-10 h-10 bg-rose-100 rounded-2xl flex items-center justify-center text-xl">💀</div>
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight">Record Mortality Audit</h3>
                <p className="text-[11px] text-slate-500 font-semibold">Transition node to Deceased status</p>
              </div>
            </div>

            <div className="bg-rose-50/60 p-4 rounded-2xl border border-rose-200/60 space-y-1">
              <p className="text-xs font-bold text-slate-800">Target Fowl: <strong className="text-rose-700 font-black">{selectedFowlForDeceased.name}</strong> ({selectedFowlForDeceased.breed})</p>
              <p className="text-[10px] text-slate-500">This action records the mortality of this gamefowl node in system analytics.</p>
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">Cause / Reason of Death</label>
              <select 
                value={deathReasonInput} 
                onChange={(e) => setDeathReasonInput(e.target.value)} 
                className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 font-extrabold text-slate-800 outline-none focus:border-rose-500 cursor-pointer"
              >
                <option value="Illness">Illness / Disease</option>
                <option value="Injury">Injury / Fight Trauma</option>
                <option value="Natural">Natural Causes / Old Age</option>
                <option value="Culling">Selective Culling</option>
                <option value="Other">Other Unspecified Cause</option>
              </select>
            </div>

            <div className="flex space-x-3 pt-2">
              <button 
                type="button" 
                onClick={() => setSelectedFowlForDeceased(null)} 
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black py-3 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleMarkFowlDeceased} 
                disabled={loading}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-black py-3 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center space-x-2 shadow-md"
              >
                {loading && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
                <span>Record Deceased</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ARCHIVE REASON MODAL DIALOG */}
      {selectedFowlForArchive && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-amber-200 max-w-md w-full p-6 space-y-5 relative">
            <button 
              onClick={() => setSelectedFowlForArchive(null)} 
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all cursor-pointer"
            >
              ✕
            </button>

            <div className="flex items-center space-x-3 text-amber-800 border-b pb-3 border-amber-100">
              <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center text-xl">📦</div>
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight">Archive Gamefowl Node</h3>
                <p className="text-[11px] text-slate-500 font-semibold">Select reason for inventory removal</p>
              </div>
            </div>

            <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200/60 space-y-1">
              <p className="text-xs font-bold text-slate-800">Target Fowl: <strong className="text-amber-800 font-black">{selectedFowlForArchive.name}</strong> ({selectedFowlForArchive.breed})</p>
              <p className="text-[10px] text-slate-500">This node will be shifted to the relational archive log with the specified reason badge.</p>
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">Select Archive Reason</label>
              <select 
                value={archiveReasonInput} 
                onChange={(e) => setArchiveReasonInput(e.target.value)} 
                className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 font-extrabold text-slate-800 outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="SOLD">🏷️ SOLD (Transferred or Sold to Buyer)</option>
                <option value="RETIRED">🌾 RETIRED (Retired from Circuit / Breeding)</option>
                <option value="CULLED">✂️ CULLED (Selective Culling)</option>
                <option value="DIED">💀 DIED (Passed Away / Fight Trauma)</option>
                <option value="OTHER">📦 OTHER (Unspecified Reason)</option>
              </select>
            </div>

            <div className="flex space-x-3 pt-2">
              <button 
                type="button" 
                onClick={() => setSelectedFowlForArchive(null)} 
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black py-3 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleArchiveFowlWithReason} 
                disabled={loading}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-black py-3 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center space-x-2 shadow-md"
              >
                {loading && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
                <span>Confirm Archive</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT NODE POPUP OVERLAY */}
      {editingFowl && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[99] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center space-x-2">
                <span className="text-lg">✏️</span>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Edit Node Registry</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Update parameters for {editingFowl.name}</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setEditingFowl(null)}
                className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                ✕ Cancel
              </button>
            </div>

            <form onSubmit={handleUpdateFowl} className="overflow-y-auto p-6 space-y-4 text-xs">
              
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
                    <input 
                      list="edit-genetic-strains" 
                      value={editBreed} 
                      onChange={(e) => setEditBreed(e.target.value)} 
                      className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-white outline-none focus:border-emerald-500 font-medium" 
                      placeholder="Select or type strain"
                      required 
                    />
                    <datalist id="edit-genetic-strains">
                      <option value="Sweater" />
                      <option value="Hatch" />
                      <option value="Roundhead" />
                      <option value="Kelso" />
                      <option value="Lemon 84" />
                      <option value="Albany" />
                      <option value="Claret" />
                      <option value="Whitehackle" />
                      <option value="Black" />
                      <option value="Melsin" />
                      <option value="Bennie" />
                      <option value="Joe Madigin" />
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Gender Class</label>
                    <select value={editGender} onChange={(e) => { const g = e.target.value; setEditGender(g); if (editAge.trim() !== '' && !isNaN(Number(editAge))) { setEditGrowthStage(autoComputeGrowthStage(Number(editAge), g)); } else { setEditGrowthStage(''); } }} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-white font-bold text-slate-700 outline-none">
                      <option value="Rooster">Rooster (Cock)</option>
                      <option value="Hen">Hen (Pullet)</option>
                    </select>
                  </div>
                </div>
              </div>

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
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Age (Mos)</label>
                    <input type="number" value={editAge} onChange={(e) => handleEditAgeChange(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs text-center font-bold" required />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Growth</label>
                    <input 
                      type="text" 
                      value={editGrowthStage} 
                      readOnly 
                      placeholder="Awaiting age..." 
                      className={`w-full p-2.5 border rounded-xl text-xs text-center font-bold transition-all ${
                        editGrowthStage 
                          ? 'border-emerald-100 bg-emerald-50 text-emerald-800' 
                          : 'border-slate-200 bg-slate-50 text-slate-400 font-normal'
                      }`} 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Height (cm)</label>
                    <input type="number" step="0.1" value={editHeight} onChange={(e) => setEditHeight(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs text-center font-bold outline-none focus:border-emerald-500" placeholder="e.g. 45" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Weight (kg)</label>
                    <input type="number" step="0.01" value={editWeight} onChange={(e) => setEditWeight(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs text-center font-bold outline-none focus:border-emerald-500" placeholder="e.g. 2.2" />
                  </div>
                </div>
              </div>

              <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-200/40">
                <h4 className="font-black text-emerald-700 text-[10px] uppercase tracking-wider flex items-center space-x-1 border-b pb-1">
                  <span>🌳</span> <span>Ancestry Heritage Roots</span>
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Sire (Father) <span className="text-slate-400 font-normal lowercase">(optional)</span>
                    </label>
                    <input type="text" value={editSire} onChange={(e) => setEditSire(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-white outline-none font-medium" placeholder="Foundation Stock" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Dam (Mother) <span className="text-slate-400 font-normal lowercase">(optional)</span>
                    </label>
                    <input type="text" value={editDam} onChange={(e) => setEditDam(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-white outline-none font-medium" placeholder="Foundation Stock" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Sire Heritage Pct (%) <span className="text-slate-400 font-normal lowercase">(optional)</span>
                    </label>
                    <input type="number" value={editSirePct} onChange={(e) => setEditSirePct(e.target.value === '' ? '' : Number(e.target.value))} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-white font-bold placeholder:font-normal" placeholder="100" min="0" max="100" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Dam Heritage Pct (%) <span className="text-slate-400 font-normal lowercase">(optional)</span>
                    </label>
                    <input type="number" value={editDamPct} onChange={(e) => setEditDamPct(e.target.value === '' ? '' : Number(e.target.value))} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-white font-bold placeholder:font-normal" placeholder="100" min="0" max="100" />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-slate-900 hover:bg-emerald-700 text-white font-extrabold py-3.5 rounded-xl text-xs shadow-md uppercase tracking-wider cursor-pointer transition-all flex items-center justify-center space-x-2"
                >
                  {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
                  <span>{loading ? 'Updating Fowl Node...' : 'Commit Node Updates'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PER-FOWL & STRAIN BREAKDOWN MODAL */}
      {showPerFowlBreakdownModal && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex justify-between items-center border-b border-slate-700">
              <div>
                <h3 className="text-base font-black flex items-center gap-2 text-emerald-400">
                  <span>📊</span> <span>Global Analytics: Per-Fowl & Strain Breakdown</span>
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Individual gamefowl contributions and cross-breed combat metrics
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setShowPerFowlBreakdownModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="bg-slate-50 p-3 border-b border-slate-200 flex justify-between items-center gap-3 flex-wrap">
              <div className="flex bg-slate-200/80 p-1 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => setBreakdownTab('individual')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${breakdownTab === 'individual' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  🐔 Individual Fowl Breakdown ({fowls.length})
                </button>
                <button
                  type="button"
                  onClick={() => setBreakdownTab('strain')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${breakdownTab === 'strain' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  🧬 Strain / Breed Aggregates
                </button>
              </div>

              <span className="text-[10px] font-mono text-slate-500 font-bold hidden sm:inline-block">
                MATCH LOG PARITY: {matchHistory.length} ENTRIES
              </span>
            </div>

            {/* Modal Content Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {breakdownTab === 'individual' && (
                <div>
                  {fowls.length === 0 ? (
                    <div className="text-center py-12 space-y-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                      <div className="w-14 h-14 bg-slate-200 text-slate-500 rounded-full flex items-center justify-center text-2xl mx-auto">🐔</div>
                      <h4 className="text-sm font-extrabold text-slate-700">No Gamefowl Registered</h4>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">Add gamefowl entries to your registry to view individual combat win rates.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
                      <table className="w-full text-left text-xs border-collapse min-w-[650px]">
                        <thead>
                          <tr className="bg-slate-900 text-white font-extrabold text-[10px] uppercase tracking-wider">
                            <th className="p-3 pl-4">Gamefowl Name</th>
                            <th className="p-3">Strain / Breed</th>
                            <th className="p-3 text-center">Total Fights</th>
                            <th className="p-3 text-center">Wins 🏆</th>
                            <th className="p-3 text-center">Losses 💀</th>
                            <th className="p-3 text-center">Win Rate %</th>
                            <th className="p-3 text-center">Status</th>
                            <th className="p-3 text-center pr-4">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                          {fowls.map((fowl) => {
                            const fowlMatches = matchHistory.filter(m => m.entry_name?.trim().toLowerCase() === fowl.name?.trim().toLowerCase());
                            const totalFights = fowlMatches.length;
                            const wins = fowlMatches.filter(m => m.outcome && m.outcome.toLowerCase() === 'win').length;
                            const losses = fowlMatches.filter(m => m.outcome && m.outcome.toLowerCase() === 'loss').length;
                            const decided = wins + losses;
                            const winRate = decided > 0 ? Math.round((wins / decided) * 100) : (totalFights > 0 ? Math.round((wins / totalFights) * 100) : 0);

                            return (
                              <tr key={fowl.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="p-3 pl-4 font-black text-slate-900 flex items-center gap-2">
                                  {fowl.image_url ? (
                                    <img src={fowl.image_url} alt={fowl.name} className="w-7 h-7 rounded-lg object-cover border border-slate-200" />
                                  ) : (
                                    <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center text-[10px] text-slate-400 font-mono">🐓</div>
                                  )}
                                  <span>{fowl.name}</span>
                                </td>
                                <td className="p-3">
                                  <span className="bg-emerald-50 text-emerald-700 font-extrabold px-2 py-0.5 rounded border border-emerald-200 text-[10px] uppercase">
                                    {fowl.breed}
                                  </span>
                                </td>
                                <td className="p-3 text-center font-mono font-bold">{totalFights}</td>
                                <td className="p-3 text-center font-mono font-extrabold text-emerald-600">{wins}</td>
                                <td className="p-3 text-center font-mono font-extrabold text-rose-600">{losses}</td>
                                <td className="p-3 text-center font-mono">
                                  {totalFights > 0 ? (
                                    <span className={`px-2 py-0.5 rounded-full font-black text-[10px] ${winRate >= 50 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                      {winRate}%
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 font-normal">0%</span>
                                  )}
                                </td>
                                <td className="p-3 text-center">
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${fowl.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : fowl.status === 'Archived' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                                    {fowl.status || 'Active'}
                                  </span>
                                </td>
                                <td className="p-3 text-center pr-4">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setShowPerFowlBreakdownModal(false);
                                      setSelectedFowlForDetails(fowl);
                                    }}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] font-black px-2.5 py-1 rounded-lg border border-slate-300 transition-colors cursor-pointer"
                                  >
                                    🔍 Details
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {breakdownTab === 'strain' && (
                <div>
                  {(() => {
                    const strainMap: Record<string, { fowlsCount: number; totalFights: number; wins: number; losses: number }> = {};

                    fowls.forEach(fowl => {
                      const breed = fowl.breed || 'Unspecified';
                      if (!strainMap[breed]) {
                        strainMap[breed] = { fowlsCount: 0, totalFights: 0, wins: 0, losses: 0 };
                      }
                      strainMap[breed].fowlsCount += 1;

                      const fowlMatches = matchHistory.filter(m => m.entry_name?.trim().toLowerCase() === fowl.name?.trim().toLowerCase());
                      strainMap[breed].totalFights += fowlMatches.length;
                      strainMap[breed].wins += fowlMatches.filter(m => m.outcome && m.outcome.toLowerCase() === 'win').length;
                      strainMap[breed].losses += fowlMatches.filter(m => m.outcome && m.outcome.toLowerCase() === 'loss').length;
                    });

                    const strainKeys = Object.keys(strainMap);

                    if (strainKeys.length === 0) {
                      return (
                        <div className="text-center py-12 space-y-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                          <div className="w-14 h-14 bg-slate-200 text-slate-500 rounded-full flex items-center justify-center text-2xl mx-auto">🧬</div>
                          <h4 className="text-sm font-extrabold text-slate-700">No Strains Identified</h4>
                          <p className="text-xs text-slate-400 max-w-sm mx-auto">No gamefowl breeds exist in your registry yet.</p>
                        </div>
                      );
                    }

                    return (
                      <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
                        <table className="w-full text-left text-xs border-collapse min-w-[550px]">
                          <thead>
                            <tr className="bg-slate-900 text-white font-extrabold text-[10px] uppercase tracking-wider">
                              <th className="p-3 pl-4">Strain / Breed Name</th>
                              <th className="p-3 text-center">Enrolled Fowls</th>
                              <th className="p-3 text-center">Total Strain Fights</th>
                              <th className="p-3 text-center">Strain Wins 🏆</th>
                              <th className="p-3 text-center">Strain Losses 💀</th>
                              <th className="p-3 text-center pr-4">Aggregate Win Rate %</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                            {strainKeys.map(breed => {
                              const stats = strainMap[breed];
                              const decided = stats.wins + stats.losses;
                              const winRate = decided > 0 ? Math.round((stats.wins / decided) * 100) : (stats.totalFights > 0 ? Math.round((stats.wins / stats.totalFights) * 100) : 0);

                              return (
                                <tr key={breed} className="hover:bg-slate-50/80 transition-colors">
                                  <td className="p-3 pl-4 font-black text-slate-900">
                                    <span className="bg-emerald-50 text-emerald-800 font-extrabold px-2.5 py-1 rounded-lg border border-emerald-200 text-xs">
                                      {breed}
                                    </span>
                                  </td>
                                  <td className="p-3 text-center font-mono font-bold">{stats.fowlsCount}</td>
                                  <td className="p-3 text-center font-mono font-bold">{stats.totalFights}</td>
                                  <td className="p-3 text-center font-mono font-extrabold text-emerald-600">{stats.wins}</td>
                                  <td className="p-3 text-center font-mono font-extrabold text-rose-600">{stats.losses}</td>
                                  <td className="p-3 text-center pr-4 font-mono">
                                    {stats.totalFights > 0 ? (
                                      <span className={`px-2.5 py-1 rounded-full font-black text-xs ${winRate >= 50 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                        {winRate}%
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 font-normal">0%</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs">
              <span className="text-slate-400 font-mono font-semibold">GalloTrack Analytics Engine</span>
              <button
                type="button"
                onClick={() => setShowPerFowlBreakdownModal(false)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold px-5 py-2 rounded-xl transition-all cursor-pointer"
              >
                Close Matrix
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}