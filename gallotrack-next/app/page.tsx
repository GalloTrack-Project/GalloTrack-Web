'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Filler } from 'chart.js';
import { createClient } from '@supabase/supabase-js';
import ProfilePage from '@/app/profile/page';
import SettingsPage from '@/app/settings/page';
import SplashScreen from '@/components/SplashScreen';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import Link from 'next/link';
import { ensureOwnerRecords } from '@/lib/registry';
import { isAdminProfile } from '@/lib/admin';

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
  leg_color: string;
  sire: string;
  dam: string;
  sire_pct: number;
  dam_pct: number;
  bloodline_pct: number;
  status: string;
  death_reason?: string;
  death_date?: string;
  archive_reason?: string;
  archive_date?: string;
  image_url?: string;
  created_at?: string;
}

type SiblingRelation = {
  id: number;
  name: string;
  relation: 'Full Sibling' | 'Half-Sibling (Shared Sire)' | 'Half-Sibling (Shared Dam)';
  sharedSire: string;
  sharedDam: string;
};

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

interface AgeParts {
  years: number;
  months: number;
  days: number;
  totalDays: number;
  totalWeeks: number;
  totalMonths: number;
}

interface DevelopmentStage {
  id: string;
  stage: string;
  fromMonths: number;
  toMonths: number;
  icon: string;
  note: string;
}

interface RolledMilestoneStage extends DevelopmentStage {
  date: Date;
  daysUntil: number;
}

interface MilestoneInfo {
  parts: AgeParts;
  current: DevelopmentStage | null;
  stages: DevelopmentStage[];
  next: RolledMilestoneStage | null;
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

const STRAIN_LIST = ['Sweater', 'Hatch', 'Roundhead', 'Kelso', 'Lemon 84', 'Albany', 'Claret', 'Whitehackle', 'Black', 'Melsin', 'Bennie', 'Joe Madigin'];

function StatusItem({ icon, label, value, tone }: { icon?: string; label: string; value: string; tone: 'green' | 'amber' | 'rose' }) {
  const toneCls = tone === 'green'
    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
    : tone === 'amber'
      ? 'bg-amber-50 text-amber-800 border-amber-200'
      : 'bg-rose-50 text-rose-800 border-rose-200';
  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200/70 p-3 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 leading-tight">{icon && <span className="mr-1">{icon}</span>}{label}</span>
        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border whitespace-nowrap shrink-0 ${toneCls}`}>{value}</span>
      </div>
    </div>
  );
}

export default function GalloTrackSystem() {
  const { theme, setTheme } = useTheme();
  const [showSplash, setShowSplash] = useState(true);
  const [currentPage, setCurrentPage] = useState<'login' | 'dashboard' | 'profiling' | 'marketplace' | 'profile' | 'settings'>('login');
  const [isAdmin, setIsAdmin] = useState(false);
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
  const [userRole, setUserRole] = useState<'admin' | 'owner'>('owner');
  const [userHub, setUserHub] = useState('ISUFST DINGLE HUB');
  const [userActive, setUserActive] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');

  const [availableStrains, setAvailableStrains] = useState<string[]>(STRAIN_LIST);
  const [strainQuery, setStrainQuery] = useState('');
  const [strainOpen, setStrainOpen] = useState(false);

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
  const [sirePct, setSirePct] = useState<number | string>('');
  const [damPct, setDamPct] = useState<number | string>('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [newLegColor, setNewLegColor] = useState('');
  const [age, setAge] = useState(''); 
  const [search, setSearch] = useState('');
  
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState('');

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
  const [editBirthdate, setEditBirthdate] = useState('');
  const [editGrowthStage, setEditGrowthStage] = useState('');
  const [editWeight, setEditWeight] = useState('');
  const [editHeight, setEditHeight] = useState('');
  const [editLegColor, setEditLegColor] = useState('');
  const [editSire, setEditSire] = useState('');
  const [editDam, setEditDam] = useState('');
  const [editSirePct, setEditSirePct] = useState<number | string>(100);
  const [editDamPct, setEditDamPct] = useState<number | string>(100);

  const [showPerFowlBreakdownModal, setShowPerFowlBreakdownModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [breakdownTab, setBreakdownTab] = useState<'individual' | 'strain'>('individual');
  const [dateRangePreset, setDateRangePreset] = useState<'7d' | '30d' | 'month' | '3m' | 'all'>('7d');
  const [dateRangeOpen, setDateRangeOpen] = useState(false);

  const showToastMessage = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 4000);
  };

  const handleSendResetLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setForgotError('Please enter your registered email address.');
      return;
    }
    setForgotLoading(true);
    setForgotError('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: window.location.origin + '/auth/update-password',
      });
      if (error) {
        setForgotError(error.message);
      } else {
        setForgotSent(true);
        showToastMessage('Password reset link sent. Check your inbox.', 'success');
      }
    } catch (err: any) {
      setForgotError(err?.message || 'Failed to send reset link. Please try again.');
    } finally {
      setForgotLoading(false);
    }
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
          try {
            const { data: profile } = await supabase.from('profiles').select('id, is_admin, role, farm_name, is_active').eq('id', session.user.id).maybeSingle();
            setIsAdmin(isAdminProfile(profile));
            setUserRole(profile && (profile.is_admin || profile.role === 'admin') ? 'admin' : 'owner');
            setUserHub((profile && (profile.farm_name || '').trim()) || 'ISUFST DINGLE HUB');
            setUserActive(profile ? profile.is_active !== false : true);
          } catch {
            setIsAdmin(false);
          }
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
            setIsAdmin(isAdminProfile(profile));
            setAdminName(profile.full_name || 'Hazel Dela Cruz');
            setAvatarUrl(profile.avatar_url || '');
            setUserRole(profile.is_admin || profile.role === 'admin' ? 'admin' : 'owner');
            setUserHub((profile.farm_name || '').trim() || 'ISUFST DINGLE HUB');
            setUserActive(profile.is_active !== false);
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
      fetchStrains();
    } catch (err) {
      console.error(err);
      setFowls([]);
      setMatchHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStrains = async (): Promise<string[]> => {
    let names: string[] = [];
    try {
      const { data, error } = await supabase
        .from('strains')
        .select('name')
        .order('name', { ascending: true });
      if (!error && data) {
        names = data.map((row: { name: string }) => row.name);
      }
    } catch (err) {
      console.error(err);
    }
    const merged = Array.from(new Set([...names, ...STRAIN_LIST]))
      .sort((a, b) => a.localeCompare(b));
    setAvailableStrains(merged);
    return merged;
  };

  const saveCustomStrain = async (name?: string): Promise<void> => {
    const cleaned = (name || '').trim();
    if (!cleaned) return;
    if (availableStrains.some((s) => s.toLowerCase() === cleaned.toLowerCase())) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('strains')
        .insert({ name: cleaned, is_custom: true, created_by: user?.id || null });
      if (error) {
        if ((error.message || '').toLowerCase().includes('duplicate') || (error.code) === '23505') {
          fetchStrains();
        } else {
          console.error(error);
        }
        return;
      }
      setAvailableStrains((prev) =>
        Array.from(new Set([...prev, cleaned])).sort((a, b) => a.localeCompare(b))
      );
    } catch (err) {
      console.error(err);
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

  const handleNewBirthdateChange = (val: string) => {
    setNewBirthdate(val);
    const parts = getAgeParts(val);
    if (parts) {
      setAge(String(parts.totalMonths));
      setNewGrowthStage(autoComputeGrowthStage(parts.totalMonths, newGender || 'Rooster'));
    } else {
      setAge('');
      setNewGrowthStage('');
    }
  };

  const handleEditBirthdateChange = (val: string) => {
    setEditBirthdate(val);
    const parts = getAgeParts(val);
    if (parts) {
      setEditAge(String(parts.totalMonths));
      setEditGrowthStage(autoComputeGrowthStage(parts.totalMonths, editGender || 'Rooster'));
    }
  };

  const getSiblingRelations = (fowl: FowlRecord): SiblingRelation[] => {
    const sire = (fowl.sire || '').trim().toLowerCase();
    const dam = (fowl.dam || '').trim().toLowerCase();
    if (!sire || !dam || sire === 'foundation stock' || dam === 'foundation stock') return [];
    return fowls
      .filter((f) => f.id !== fowl.id)
      .map((f) => {
        const fs = (f.sire || '').trim().toLowerCase();
        const fd = (f.dam || '').trim().toLowerCase();
        if (!fs || !fd || fs === 'foundation stock' || fd === 'foundation stock') return null;
        const sharedSire = (f.sire || '').trim();
        const sharedDam = (f.dam || '').trim();
        if (fs === sire && fd === dam) return { id: f.id, name: f.name, relation: 'Full Sibling' as const, sharedSire, sharedDam };
        if (fs === sire) return { id: f.id, name: f.name, relation: 'Half-Sibling (Shared Sire)' as const, sharedSire, sharedDam: '' };
        if (fd === dam) return { id: f.id, name: f.name, relation: 'Half-Sibling (Shared Dam)' as const, sharedSire: '', sharedDam };
        return null;
      })
      .filter((r): r is SiblingRelation => r !== null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    const loginEmail = username.trim();

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
          if (profile.is_active === false) {
            await supabase.auth.signOut();
            setError('This account has been deactivated by the administrator. Contact system support to restore access.');
            typeof window !== 'undefined' && localStorage.removeItem('gallotrack_user_id');
            return;
          }
          setCurrentUserId(data.user.id);
          setIsAdmin(isAdminProfile(profile));
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
          setIsAdmin(false);
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
        await ensureOwnerRecords(supabase, data.user);
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

      const sPct = sirePct === '' || sirePct === null || isNaN(Number(sirePct)) ? 0 : Number(sirePct);
      const dPct = damPct === '' || damPct === null || isNaN(Number(damPct)) ? 0 : Number(damPct);
      const calculatedBloodline = (sPct + dPct) / 2;
      
      const activeUserId = (await supabase.auth.getUser()).data.user?.id;

      if (!activeUserId) {
        showToastMessage('Authentication Error: Active session user ID not detected.', 'error');
        return;
      }

      const autoParts = getAgeParts(newBirthdate);

      const payload = {
        user_id: (await supabase.auth.getUser()).data.user?.id || activeUserId,
        name: newName,
        breed: newBreed || 'Unspecified Strain',
        gender: newGender || 'Rooster',
        color: newColor,
        color_category: newColorCategory,
        growth_stage: autoParts ? autoComputeGrowthStage(autoParts.totalMonths, newGender || 'Rooster') : newGrowthStage,
        behavior_trait: newBehaviorTrait,
        eye_variant: newEyeVariant,
        birthdate: newBirthdate || '',
        age: autoParts
          ? `${autoParts.totalMonths} Months`
          : age && !isNaN(Number(age))
          ? `${Number(age)} Months`
          : 'N/A',
        weight: weight ? `${weight.toString().replace(/[^0-9.]/g, '')} kg` : 'N/A',
        height: height ? `${height.toString().replace(/[^0-9.]/g, '')} cm` : 'N/A',
        leg_color: newLegColor.trim() ? newLegColor.trim() : 'N/A',
        sire: sireName.trim() ? sireName.trim() : 'Foundation Stock',
        dam: damName.trim() ? damName.trim() : 'Foundation Stock',
        sire_pct: sPct,
        dam_pct: dPct,
        bloodline_pct: calculatedBloodline,
        status: 'Active',
        image_url: publicImageUrl,
      };

      const { error: insertErr } = await supabase.from('fowl').insert([payload]);

      if (insertErr) {
        showToastMessage(`Database Error: ${insertErr.message}`, 'error');
      } else {
        showToastMessage('GalloTrack Registry Object saved successfully.', 'success');
        saveCustomStrain(newBreed);
        setNewName(''); setNewBreed(''); setNewGender(''); setSireName(''); setDamName(''); setWeight(''); setHeight(''); setNewLegColor(''); setAge(''); setNewBirthdate(''); setNewGrowthStage(''); setSelectedImage(null); setStrainQuery(''); setStrainOpen(false); setImagePreview('');
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
    setEditBirthdate(fowl.birthdate || '');
    setEditGrowthStage(fowl.growth_stage || autoComputeGrowthStage(isNaN(parsedAge) ? 0 : parsedAge, fowl.gender));
    setEditWeight(fowl.weight ? fowl.weight.replace(' kg', '') : '');
    setEditHeight(fowl.height ? fowl.height.replace(' cm', '') : '');
    setEditLegColor(fowl.leg_color || 'N/A');
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
      const sPct = editSirePct === '' || editSirePct === null || isNaN(Number(editSirePct)) ? 0 : Number(editSirePct);
      const dPct = editDamPct === '' || editDamPct === null || isNaN(Number(editDamPct)) ? 0 : Number(editDamPct);
      const calculatedBloodline = (sPct + dPct) / 2;
      const editAutoParts = getAgeParts(editBirthdate);
      const payload = {
        name: editName,
        breed: editBreed,
        gender: editGender,
        color: editColor,
        color_category: editColorCategory,
        growth_stage: editAutoParts ? autoComputeGrowthStage(editAutoParts.totalMonths, editGender || 'Rooster') : editGrowthStage,
        behavior_trait: editBehaviorTrait,
        eye_variant: editEyeVariant,
        birthdate: editBirthdate || '',
        age: editAutoParts
          ? `${editAutoParts.totalMonths} Months`
          : editAge && !isNaN(Number(editAge))
          ? `${Number(editAge)} Months`
          : 'N/A',
        weight: editWeight ? `${editWeight.toString().replace(/[^0-9.]/g, '')} kg` : 'N/A',
        height: editHeight ? `${editHeight.toString().replace(/[^0-9.]/g, '')} cm` : 'N/A',
        leg_color: editLegColor.trim() ? editLegColor.trim() : 'N/A',
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
      saveCustomStrain(editBreed);
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

  const getArchiveBadgeStyle = (reason?: string) => {
    const r = (reason || 'RETIRED').toUpperCase();
    switch (r) {
      case 'SOLD':
        return { label: 'ARCHIVED · SOLD', bg: 'bg-emerald-700 text-white' };
      case 'TRANSFERRED':
        return { label: 'ARCHIVED · TRANSFERRED', bg: 'bg-sky-700 text-white' };
      case 'RETIRED':
        return { label: 'ARCHIVED · RETIRED', bg: 'bg-amber-600 text-white' };
      case 'INACTIVE':
        return { label: 'ARCHIVED · INACTIVE', bg: 'bg-slate-600 text-white' };
      case 'OTHER':
        return { label: 'ARCHIVED · OTHER', bg: 'bg-slate-700 text-white' };
      default:
        return { label: 'ARCHIVED', bg: 'bg-amber-600 text-white' };
    }
  };

  // ============================================================
  // BIRTH DATE → AUTO AGE & GROWTH MILESTONE CALCULATIONS
  // ============================================================
  const parseFowlDate = (value?: string | null): Date | null => {
    if (!value) return null;
    const numeric = String(value).replace(/[^0-9]/g, '').slice(0, 8);
    if (numeric.length !== 8) return null;
    const d = new Date(`${numeric.slice(0, 4)}-${numeric.slice(4, 6)}-${numeric.slice(6, 8)}T00:00:00`);
    return isNaN(d.getTime()) ? null : d;
  };

  const zeroedToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const getAgeParts = (birthdate?: string | null, from?: Date): AgeParts | null => {
    const birth = parseFowlDate(birthdate);
    if (!birth) return null;
    const now = from ? new Date(from) : zeroedToday();
    now.setHours(0, 0, 0, 0);
    let totalDays = Math.floor((now.getTime() - birth.getTime()) / 86400000);
    if (totalDays < 0) totalDays = 0;
    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();
    let days = now.getDate() - birth.getDate();
    if (days < 0) {
      months -= 1;
      days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }
    const totalWeeks = Math.floor(totalDays / 7);
    const totalMonths = Math.max(0, years * 12 + months);
    return { years, months, days, totalDays, totalWeeks, totalMonths };
  };

  const getAgeLabel = (p: AgeParts): string => {
    if (p.totalDays === 0) return '0 days';
    if (p.years > 0) return `${p.years} yr ${p.months} mo`;
    if (p.months > 0) return `${p.months} mo ${p.days} d`;
    return `${p.days} d`;
  };

  const getAgeExact = (p: AgeParts): string => {
    const y = p.years > 0 ? `${p.years} year${p.years === 1 ? '' : 's'}${p.months > 0 || p.days > 0 ? ', ' : ''}` : '';
    const m = p.months > 0 ? `${p.months} month${p.months === 1 ? '' : 's'}${p.days > 0 ? ', ' : ''}` : '';
    return `${y}${m}${p.days} day${p.days === 1 ? '' : 's'}`;
  };

  const getAgeMetrics = (p: AgeParts): string =>
    `${p.totalMonths} months · ${p.totalWeeks} weeks · ${p.totalDays} days`;

  const addMonthsToDate = (base: Date, months: number): Date => {
    const d = new Date(base);
    const day = d.getDate();
    d.setMonth(d.getMonth() + months);
    if (d.getDate() < day) d.setDate(0);
    return d;
  };

  const getDevelopmentStages = (gender?: string): DevelopmentStage[] => {
    const female = gender === 'Hen' || gender === 'Pullet';
    return female
      ? [
          { id: 'Chick', stage: 'Chick', fromMonths: 0, toMonths: 6, icon: '🐣', note: 'Brooding & starter feed phase' },
          { id: 'Pullet', stage: 'Pullet', fromMonths: 6, toMonths: 12, icon: '🐤', note: 'Grower phase — feathering out' },
          { id: 'Hen', stage: 'Hen', fromMonths: 12, toMonths: 24, icon: '🐔', note: 'Mature laying hen' },
          { id: 'Senior Hen', stage: 'Hen', fromMonths: 24, toMonths: Infinity, icon: '🦅', note: 'Senior breeder / retired rotation' },
        ]
      : [
          { id: 'Chick', stage: 'Chick', fromMonths: 0, toMonths: 6, icon: '🐣', note: 'Brooding & starter feed phase' },
          { id: 'Stag', stage: 'Stag', fromMonths: 6, toMonths: 12, icon: '🐤', note: 'Grower phase — conditioning' },
          { id: 'Bull Stag', stage: 'Bull Stag', fromMonths: 12, toMonths: 24, icon: '🐓', note: 'Training & fight preparation' },
          { id: 'Cock', stage: 'Cock', fromMonths: 24, toMonths: Infinity, icon: '⚔️', note: 'Prime fighting cock / proven breeder' },
        ];
  };

  const getMilestoneInfo = (birthdate?: string | null, gender?: string, from?: Date): MilestoneInfo | null => {
    const birth = parseFowlDate(birthdate);
    if (!birth) return null;
    const parts = getAgeParts(birthdate, from);
    if (!parts) return null;
    const now = from ? new Date(from) : zeroedToday();
    const stages = getDevelopmentStages(gender);
    const current = stages.filter((s) => parts.totalMonths >= s.fromMonths && parts.totalMonths < s.toMonths).pop() || null;
    const nextStage = stages.find((s) => parts.totalMonths < s.fromMonths) || null;
    const next: RolledMilestoneStage | null = nextStage
      ? { ...nextStage, date: addMonthsToDate(birth, nextStage.fromMonths), daysUntil: Math.ceil((addMonthsToDate(birth, nextStage.fromMonths).getTime() - now.getTime()) / 86400000) }
      : null;
    return { parts, current, stages, next };
  };

  const upcomingMilestones = activeFowls
    .map((f) => ({ fowl: f, info: getMilestoneInfo(f.birthdate, f.gender) }))
    .filter((x): x is { fowl: FowlRecord; info: MilestoneInfo } => !!x.info)
    .sort((a, b) => (a.info.next?.daysUntil ?? 999999) - (b.info.next?.daysUntil ?? 999999));

  const crossbreedChartData = calculateCrossbreedWinRatios();

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

  const nextNodeId = `GT-${String(fowls.length + 1).padStart(4, '0')}`;
  const completenessFields = [newName, newBreed, newGender, age, height, weight, sireName, damName];
  const dataCompleteness = Math.round((completenessFields.filter(v => v && String(v).trim() !== '').length / completenessFields.length) * 100);
  const validationPassed = newName.trim() !== '' && newBreed.trim() !== '' && newGender !== '' && age.trim() !== '';
  const bloodlineVerified = sirePct !== '' && damPct !== '' && !isNaN(Number(sirePct)) && !isNaN(Number(damPct));

  const winRatePct = matchHistory.length > 0
    ? Math.round((matchHistory.filter(m => m.outcome && m.outcome.toLowerCase() === 'win').length / matchHistory.length) * 100)
    : 0;
  const winsCount = matchHistory.filter(m => m.outcome && m.outcome.toLowerCase() === 'win').length;
  const lossesCount = matchHistory.filter(m => m.outcome && m.outcome.toLowerCase() === 'loss').length;

  const monthLabels = (() => {
    const now = new Date();
    const out: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      out.push(d.toLocaleString('en-US', { month: 'short' }));
    }
    return out;
  })();

  const monthIndex = (s?: string) => {
    if (!s) return -1;
    const d = new Date(s);
    if (isNaN(d.getTime())) return -1;
    const now = new Date();
    const diff = (now.getFullYear() * 12 + now.getMonth()) - (d.getFullYear() * 12 + d.getMonth());
    const idx = 5 - diff;
    return (idx >= 0 && idx < 6) ? idx : -1;
  };

  const matchesByMonth = (() => {
    const arr = new Array(6).fill(0);
    matchHistory.forEach(m => { const i = monthIndex(m.date); if (i >= 0) arr[i]++; });
    return arr;
  })();

  const winsByMonth = (() => {
    const arr = new Array(6).fill(0);
    matchHistory.forEach(m => { const i = monthIndex(m.date); if (i >= 0 && m.outcome && m.outcome.toLowerCase() === 'win') arr[i]++; });
    return arr;
  })();

  const activeSpark = (() => {
    const arr = new Array(6).fill(0);
    fowls.forEach(f => {
      if (f.status === 'Active' || !f.status || f.status === 'active') {
        const i = monthIndex(f.created_at);
        if (i >= 0) arr[i]++;
      }
    });
    for (let i = 1; i < 6; i++) arr[i] += arr[i - 1];
    return arr;
  })();

  const trendWinRate = monthLabels.map((_, i) => matchesByMonth[i] > 0 ? Math.round((winsByMonth[i] / matchesByMonth[i]) * 100) : 0);
  const systemUptime = 99.9;

  if (showSplash) {
    return <SplashScreen onFinished={() => setShowSplash(false)} />;
  }

  return (
    <div className="bg-background min-h-screen font-sans antialiased text-foreground flex flex-col md:flex-row overflow-hidden h-[100dvh] w-full relative selection:bg-emerald-500 selection:text-white">
      
      {/* TOAST NOTIFICATION STACK */}
      {toast.show && (
        <div className="fixed top-5 right-5 z-[9999] flex items-center p-4 px-5 max-w-sm rounded-2xl shadow-2xl border backdrop-blur-xl animate-fadeIn bg-card/95 border-border space-x-3">
          <div className={`flex items-center justify-center w-8 h-8 rounded-xl shrink-0 font-black text-xs shadow-sm ${
            toast.type === 'success' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : toast.type === 'error' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
          }`}>
            {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : '‼'}
          </div>
          <div className="text-xs font-bold text-card-foreground leading-snug">{toast.message}</div>
        </div>
      )}

      {/* LOGIN VIEW */}
      {currentPage === 'login' && (
        <div className="flex items-center justify-center min-h-screen w-full p-6 bg-background overflow-hidden relative">
          {/* Geometric wireframe pattern overlay */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.05]" xmlns="http://www.w3.org/2000/svg">
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
          <div className="absolute top-1/4 -left-20 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-teal-400/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="bg-card rounded-3xl shadow-[0_0_60px_-15px_rgba(16,185,129,0.3)] shadow-black/40 max-w-md w-full relative z-10 overflow-hidden border border-emerald-500/20">
            <div className="p-8 sm:p-10 space-y-7">
              {/* Header & Branding */}
              <div className="text-center space-y-3">
                <div className="relative w-16 h-16 mx-auto">
                  <svg viewBox="0 0 24 24" className="w-16 h-16 drop-shadow-[0_0_14px_rgba(16,185,129,0.45)]">
                    <defs>
                      <linearGradient id="shieldGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#34d399"/>
                        <stop offset="100%" stopColor="#059669"/>
                      </linearGradient>
                    </defs>
                    <path d="M12 1.8 20.5 5v6c0 5.2-3.5 8.5-8.5 11.2C7 19.5 3.5 16.2 3.5 11V5L12 1.8z" fill="url(#shieldGrad)" stroke="rgba(52,211,153,0.55)" strokeWidth="0.8"/>
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-2xl">🐓</span>
                </div>
                <span className="block text-[9px] font-black tracking-[0.25em] text-emerald-400/90 uppercase">ISUFST CICT CAPSTONE PROJECT</span>
                <h1 className="text-3xl sm:text-4xl font-black text-card-foreground tracking-tight leading-none">GALLOTRACK</h1>
                <p className="text-[10px] text-muted-foreground font-semibold">Advanced Gamefowl Lineage Analytics &amp; Structural Trace Registry</p>
                <div className="w-12 h-0.5 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full mx-auto"></div>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                  {/* EMAIL ADDRESS */}
                  <div>
                    <label className="block text-[10px] font-black text-muted-foreground mb-2 uppercase tracking-widest">EMAIL ADDRESS</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                      </span>
                      <input type="email" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full pl-10 pr-3.5 py-3 border border-input rounded-xl text-xs bg-muted/60 focus:bg-muted focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-semibold outline-none text-foreground placeholder:text-muted-foreground" placeholder="Enter your email address" autoComplete="email" required />
                    </div>
                  </div>

                  {/* PASSWORD */}
                  <div>
                    <label className="block text-[10px] font-black text-muted-foreground mb-2 uppercase tracking-widest">PASSWORD</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      </span>
                      <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-10 pr-11 py-3 border border-input rounded-xl text-xs bg-muted/60 focus:bg-muted focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-semibold outline-none text-foreground placeholder:text-muted-foreground" placeholder="Enter system password" required />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-emerald-400 p-1 rounded-lg transition-colors cursor-pointer" title={showPassword ? 'Hide password' : 'Show password'}>
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
                        <div className="w-4 h-4 rounded-md border border-input bg-muted peer-checked:bg-emerald-500 peer-checked:border-emerald-500 transition-colors flex items-center justify-center">
                          <svg className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest group-hover:text-emerald-400 transition-colors">Remember Me</span>
                    </label>
                  </div>

                  {error && <div className="text-xs text-rose-300 font-bold text-center bg-rose-500/10 border border-rose-500/30 p-3.5 rounded-xl">{error}</div>}
                  {successMessage && <div className="text-xs text-emerald-300 font-bold text-center bg-emerald-500/10 border border-emerald-500/30 p-3.5 rounded-xl leading-relaxed">{successMessage}</div>}

                  {/* SUBMIT BUTTON */}
                  <button type="submit" disabled={loading} className="group relative w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 active:scale-[0.99] text-white font-black py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/30 cursor-pointer overflow-hidden">
                    <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative flex items-center justify-center gap-3">
                      <span className="text-sm tracking-widest">LOG IN</span>
                      <span className="w-6 h-6 rounded-lg bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      </span>
                    </div>
                  </button>

                  {/* FOOTER LINKS */}
                  <div className="space-y-4 pt-1">
                    <div className="flex items-center justify-center gap-4">
                      <button type="button" onClick={() => { setShowForgotPasswordModal(true); setForgotEmail(''); setForgotSent(false); setForgotError(''); }} className="text-[10px] font-bold text-muted-foreground hover:text-emerald-400 transition-colors tracking-wide cursor-pointer underline underline-offset-2 decoration-muted-foreground/50 hover:decoration-emerald-400">Forgot Password?</button>
                      <span className="text-muted-foreground text-[8px]">|</span>
                      <Link href="/register" className="text-[10px] font-bold text-muted-foreground hover:text-emerald-400 transition-colors tracking-wide cursor-pointer underline underline-offset-2 decoration-muted-foreground/50 hover:decoration-emerald-400">Create Account</Link>
                    </div>
                    <p className="text-[9px] text-muted-foreground font-semibold text-center tracking-wide flex items-center justify-center gap-1.5">
                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1Z"/></svg>
                      Powered by Advanced Gamefowl Analytics
                    </p>
                  </div>
                </form>
            </div>
          </div>
        </div>
      )}

      {/* ENTERPRISE DESKTOP SIDEBAR NAVIGATION */}
      {currentPage !== 'login' && (
        <aside className="hidden md:flex w-64 bg-card text-card-foreground flex-col md:fixed md:inset-y-0 md:left-0 z-50 border-r border-border shadow-2xl h-full justify-between">
          <div>
            <div className="p-6 border-b border-border bg-muted/40 flex items-center space-x-3">
              <div className="w-9 h-9 bg-emerald-500/20 border border-emerald-500/40 rounded-xl flex items-center justify-center text-lg shadow-inner">🐓</div>
              <div>
                <h2 className="text-xl font-black tracking-tight text-card-foreground">GALLO<span className="text-emerald-400">TRACK</span></h2>
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
                      : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                  }`}
                >
                  <span className="text-base">{menu.icon}</span>
                  <span>{menu.label}</span>
                </button>
              ))}
              {isAdmin && (
                <Link
                  href="/admin"
                  className={`w-full text-left flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all duration-200 cursor-pointer ${
                    'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                  }`}
                >
                  <span className="text-base">🛡️</span>
                  <span>Admin Panel</span>
                </Link>
              )}
            </nav>
          </div>
          
          <div className="p-4 border-t border-border bg-muted/40 space-y-3">
            <div className="flex items-center space-x-3 px-2 py-1 select-none">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Admin Avatar" className="w-8 h-8 rounded-lg object-cover border border-slate-700/60" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-sm shadow-inner">👤</div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-extrabold text-card-foreground truncate">{adminName}</p>
                <span className={`inline-block text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                  userRole === 'admin'
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                    : 'bg-sky-500/15 border-sky-500/30 text-sky-400'
                }`}>
                  {userRole === 'admin' ? 'System Lead Admin' : 'Farm Owner'}
                </span>
              </div>
            </div>
            <div className="px-2 -mt-1 flex items-center justify-between gap-2">
              <span className={`inline-flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest ${userActive ? 'text-emerald-400' : 'text-rose-400'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${userActive ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`}></span>
                {userActive ? 'Access Active' : 'Access Restricted'}
              </span>
              <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-wider truncate">📍 {userHub}</span>
            </div>
            <button type="button" onClick={() => setShowLogoutModal(true)} className="w-full bg-muted hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400 border border-border hover:border-rose-500/30 text-left flex items-center space-x-3 px-4 py-2.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer">
              <span>🚪 Log Out</span>
            </button>
            <div className="text-center text-[9px] text-muted-foreground font-mono tracking-widest uppercase">{userHub}</div>
          </div>
        </aside>
      )}

      {/* MAIN CONTAINER CONTENT */}
      {currentPage !== 'login' && (
        <div className="flex-1 md:pl-64 flex flex-col h-full w-full min-h-0 overflow-hidden relative pb-16 md:pb-0">
          
          {/* HEADER STRIP */}
          <header className="bg-card/85 backdrop-blur-md border-b border-border sticky top-0 z-40 shadow-xs shrink-0">
            <div className="py-3.5 px-4 sm:px-6 md:px-8 flex justify-between items-center">
              
              {/* LEFT: Mobile Title & Supabase Status Badge */}
              <div className="flex items-center space-x-3">
                <span className="md:hidden font-black text-card-foreground text-lg tracking-tight bg-gradient-to-r from-foreground to-emerald-400 bg-clip-text text-transparent">GALLOTRACK</span>
                
                <div className="antigravity-badge bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-3 py-1.5 rounded-full flex items-center space-x-2 text-[10px] sm:text-xs font-mono font-bold shadow-2xs">
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
                <div className="antigravity-badge bg-muted border border-border text-muted-foreground px-3.5 py-1.5 rounded-full text-[10px] sm:text-xs font-mono font-bold flex items-center space-x-1.5 shadow-2xs" style={{ animationDelay: '1.2s' }}>
                  <span className="text-muted-foreground">📍</span>
                  <span>Dingle Campus Cluster</span>
                </div>

                <button
                  type="button"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="w-9 h-9 shrink-0 rounded-full bg-muted border border-border text-muted-foreground hover:text-emerald-500 hover:border-emerald-500/50 hover:bg-muted/60 flex items-center justify-center shadow-2xs transition-all cursor-pointer"
                  title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                  aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>

                <button 
                  type="button"
                  onClick={() => setShowLogoutModal(true)}
                  className="md:hidden bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border border-rose-500/30 p-1.5 px-3 rounded-full text-[10px] font-black cursor-pointer transition-all flex items-center space-x-1 shadow-2xs"
                  title="Log Out"
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
                <div className="rounded-3xl border border-border bg-card/70 backdrop-blur-md p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-xl shrink-0 shadow-inner">📊</div>
                    <div>
                      <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-card-foreground tracking-tight">Enterprise Analytics Dashboard</h1>
                      <p className="text-xs sm:text-sm text-muted-foreground font-semibold mt-1">Cross-strain performance vectors, empirical win probabilities, and active inventory metrics</p>
                    </div>
                  </div>
                  {/* DATE RANGE SELECTOR */}
                  <div className="relative self-start md:self-auto">
                    {dateRangeOpen && (
                      <div className="fixed inset-0 z-40" onClick={() => setDateRangeOpen(false)} />
                    )}
                    <button
                      type="button"
                      onClick={() => setDateRangeOpen(o => !o)}
                      className="bg-muted hover:bg-muted/60 text-foreground border border-border px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center space-x-2 shadow-2xs"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M8 2v4M16 2v4M3 10h18" /></svg>
                      <span>{dateRangeLabel}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${dateRangeOpen ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6" /></svg>
                    </button>
                    {dateRangeOpen && (
                      <div className="absolute right-0 mt-2 w-56 bg-popover rounded-2xl border border-border shadow-xl z-50 p-1.5">
                        {DATE_RANGES.map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => { setDateRangePreset(r.id); setDateRangeOpen(false); }}
                            className={`w-full text-left px-3 py-2 rounded-xl text-[11px] font-bold transition-colors cursor-pointer ${dateRangePreset === r.id ? 'bg-emerald-500/15 text-emerald-300' : 'text-muted-foreground hover:bg-muted'}`}
                          >
                            {r.label}
                          </button>
                        ))}
                        <div className="h-px bg-border my-1.5"></div>
                        <button
                          type="button"
                          onClick={() => { setDateRangeOpen(false); fetchDatabaseResources(); }}
                          className="w-full text-left px-3 py-2 rounded-xl text-[11px] font-bold text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
                        >
                          {loading ? '↻ Syncing...' : '↻ Refresh Data'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* TOP METRICS ROW — 4 CARDS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

                  {/* ACTIVE FOWL REGISTRY */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide leading-tight">Active Fowl Registry</span>
                      <span className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-base shrink-0">🐓</span>
                    </div>
                    <div className="text-3xl font-black text-slate-900 tracking-tight">{activeFowls.length}</div>
                    <div className="h-12 -mx-1">
                      {activeFowls.length > 0 ? (
                        <Line
                          data={{
                            labels: monthLabels,
                            datasets: [{ data: activeSpark, borderColor: '#059669', backgroundColor: 'rgba(5,150,105,0.14)', fill: true, borderWidth: 2, pointRadius: 0, tension: 0.4 }],
                          }}
                          options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false, min: 0 } } }}
                        />
                      ) : (
                        <div className="text-[10px] font-bold text-slate-300 pt-2">No active fowl yet</div>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
                      <TrendChip up={activeNewThisWeek > 0} label={activeNewThisWeek > 0 ? `${activeNewThisWeek} this week` : 'No change'} />
                      <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full shrink-0">Registered</span>
                    </div>
                  </div>

                  {/* TOTAL MATCHES LOGGED */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide leading-tight">Total Matches Logged</span>
                      <span className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-base shrink-0">🏆</span>
                    </div>
                    <div className="text-3xl font-black text-slate-900 tracking-tight">{matchHistory.length}</div>
                    <div className="h-12 -mx-1">
                      {matchHistory.length > 0 ? (
                        <Bar
                          data={{
                            labels: monthLabels,
                            datasets: [{ data: matchesByMonth, backgroundColor: '#059669', borderRadius: 4, maxBarThickness: 14 }],
                          }}
                          options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false, min: 0 } } }}
                        />
                      ) : (
                        <div className="text-[10px] font-bold text-slate-300 pt-2">No matches logged yet</div>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
                      <TrendChip up={matchesThisWeek > 0} label={matchesThisWeek > 0 ? `${matchesThisWeek} this week` : 'No change'} />
                      <span className="text-[8px] font-bold uppercase tracking-widest text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-full shrink-0">Logged</span>
                    </div>
                  </div>

                  {/* OVERALL WIN RATE */}
                  <div
                    onClick={() => setShowPerFowlBreakdownModal(true)}
                    className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex flex-col gap-3 cursor-pointer hover:border-emerald-400/70 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide leading-tight">Overall Win Rate</span>
                      <span className="text-[9px] font-black text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">{winsCount}W • {lossesCount}L</span>
                    </div>
                    <div className="text-3xl font-black text-emerald-600 tracking-tight">
                      {matchHistory.length > 0 ? `${winRatePct}%` : '—'}
                    </div>
                    <div className="h-12 -mx-1">
                      {matchHistory.length > 0 ? (
                        <Line
                          data={{
                            labels: monthLabels,
                            datasets: [{ data: trendWinRate, borderColor: '#059669', backgroundColor: 'rgba(5,150,105,0.16)', fill: true, borderWidth: 2, pointRadius: 0, tension: 0.4 }],
                          }}
                          options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false, min: 0, max: 100 } } }}
                        />
                      ) : (
                        <div className="text-[10px] font-bold text-slate-300 pt-2">No matches logged yet</div>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
                      <span className="text-[10px] font-extrabold text-emerald-700">Win trend</span>
                      <span className="text-[9px] font-black text-slate-400">🔍 Breakdown</span>
                    </div>
                  </div>

                  {/* SYSTEM INTEGRITY */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide leading-tight">System Integrity</span>
                      <span className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-base shrink-0">🛡️</span>
                    </div>
                    <div className="text-3xl font-black text-slate-900 tracking-tight">{systemUptime}%</div>
                    <div className="h-12 flex items-center gap-3 px-1">
                      <span className="relative flex h-3 w-3 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                      </span>
                      <div className="min-w-0">
                        <p className="text-[11px] font-extrabold text-slate-800 leading-tight">All systems operational</p>
                        <p className="text-[9px] text-slate-400 font-bold tracking-wide">Uptime verified · API healthy</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
                      <span className="text-[10px] font-extrabold text-emerald-700">Stable</span>
                      <span className="text-[8px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full shrink-0">Online</span>
                    </div>
                  </div>
                </div>

                {/* DEVELOPMENT CALENDAR & UPCOMING MILESTONES */}
                {upcomingMilestones.length > 0 && (
                  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4 mb-4">
                      <div className="flex items-center gap-2.5">
                        <span className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-lg shrink-0">📅</span>
                        <div>
                          <h3 className="text-sm font-black text-slate-900 tracking-tight">Development Calendar &amp; Upcoming Milestones</h3>
                          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Stage transitions predicted from each fowl&apos;s birth date — around the corner: {upcomingMilestones.filter(x => x.info.next && x.info.next.daysUntil >= 0 && x.info.next.daysUntil <= 30).length} in the next 30 days</p>
                        </div>
                      </div>
                      <span className="text-[9px] font-mono font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">AUTO-CALCULATED</span>
                    </div>
                    <div className="space-y-2">
                      {upcomingMilestones.slice(0, 8).map(({ fowl, info }) => {
                        const soon = info.next !== null && info.next.daysUntil >= 0 && info.next.daysUntil <= 30;
                        const overdue = info.next !== null && info.next.daysUntil < 0;
                        return (
                          <div key={fowl.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${soon ? 'bg-emerald-50/80 border-emerald-200' : overdue ? 'bg-rose-50/70 border-rose-200' : 'bg-slate-50/60 border-slate-100'}`}>
                            <span className="w-9 h-9 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-base shrink-0">{info.current?.icon || '🐤'}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-black text-slate-800 truncate">{fowl.name} <span className="text-[9px] font-bold text-slate-400 font-mono">#{fowl.id}</span></p>
                              <p className="text-[10px] text-slate-400 font-semibold truncate">
                                {info.current?.stage || 'Chick'} · Age {getAgeLabel(info.parts)}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              {info.next ? (
                                <>
                                  <p className={`text-[10px] font-black uppercase tracking-wide ${soon ? 'text-emerald-700' : overdue ? 'text-rose-600' : 'text-amber-700'}`}>
                                    {info.next.stage} {soon ? '· SOON' : overdue ? '· OVERDUE' : ''}
                                  </p>
                                  <p className="text-[9px] font-mono text-slate-400 font-bold">
                                    {info.next.date.toLocaleDateString()} · {info.next.daysUntil >= 0 ? `in ${info.next.daysUntil}d` : `${Math.abs(info.next.daysUntil)}d ago`}
                                  </p>
                                </>
                              ) : (
                                <p className="text-[10px] font-black text-emerald-700 uppercase">Fully mature</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <p className="mt-3 text-[9px] text-slate-400 font-semibold text-right">Mirrors the 📅 Development Timeline on each fowl&apos;s analytics profile.</p>
                  </div>
                )}

                {/* MIDDLE CHARTS ROW — 2 CARDS */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                  {/* GAMEFOWL POPULATION & PERFORMANCE TRENDS */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-6 flex flex-col lg:col-span-2">
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                      <div>
                        <h3 className="text-sm font-black text-slate-900 tracking-tight">Gamefowl Population & Performance Trends (Q3 2026)</h3>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Population growth versus empirical win-rate trajectory across the last six months</p>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500">
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-700"></span>Population</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded bg-emerald-400 border-t-2 border-dashed border-emerald-400 bg-transparent"></span>Win Rate %</span>
                      </div>
                    </div>
                    {fowls.length > 0 || matchHistory.length > 0 ? (
                      <div className="w-full h-72 my-4">
                        <Line
                          data={{
                            labels: monthLabels,
                            datasets: [
                              {
                                label: 'Population',
                                data: activeSpark,
                                borderColor: '#047857',
                                backgroundColor: 'rgba(4,120,87,0.16)',
                                fill: true,
                                borderWidth: 2.5,
                                pointRadius: 3,
                                pointBackgroundColor: '#047857',
                                tension: 0.4,
                                yAxisID: 'y',
                              },
                              {
                                label: 'Win Rate %',
                                data: trendWinRate,
                                borderColor: '#34d399',
                                backgroundColor: 'rgba(52,211,153,0.04)',
                                fill: false,
                                borderWidth: 2,
                                borderDash: [6, 5],
                                pointRadius: 3,
                                pointBackgroundColor: '#34d399',
                                tension: 0.4,
                                yAxisID: 'y1',
                              },
                            ],
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            interaction: { mode: 'index', intersect: false },
                            plugins: {
                              legend: { display: false },
                              tooltip: {
                                backgroundColor: '#0f172a',
                                titleFont: { size: 11, weight: 'bold' },
                                bodyFont: { size: 11 },
                                padding: 10,
                                cornerRadius: 8,
                              },
                            },
                            scales: {
                              x: { grid: { display: false }, ticks: { font: { size: 10, weight: 'bold' }, color: '#64748b' } },
                              y: { min: 0, grid: { color: 'rgba(148,163,184,0.15)' }, ticks: { font: { size: 10, weight: 'bold' }, color: '#64748b' }, title: { display: true, text: 'Population', font: { size: 9, weight: 'bold' }, color: '#94a3b8' } },
                              y1: { min: 0, max: 100, position: 'right', grid: { drawOnChartArea: false }, ticks: { font: { size: 10, weight: 'bold' }, color: '#34d399', callback: (v) => `${v}%` }, title: { display: true, text: 'Win Rate', font: { size: 9, weight: 'bold' }, color: '#94a3b8' } },
                            },
                          }}
                        />
                      </div>
                    ) : (
                      <div className="my-auto flex flex-col items-center justify-center text-center p-10 space-y-2">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 text-xl font-bold">📈</div>
                        <p className="text-xs font-extrabold text-slate-500">No data available</p>
                        <p className="text-[10px] text-slate-400 max-w-[220px]">Encode fowl and log matches to visualize population and performance trends.</p>
                      </div>
                    )}
                  </div>

                  {/* BLOODLINE WIN RATIOS */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-6 flex flex-col">
                    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                      <div>
                        <h3 className="text-sm font-black text-slate-900 tracking-tight">Bloodline Win Ratios</h3>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Win share by primary genetic strain</p>
                      </div>
                      <span className="text-[9px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-black shrink-0">GENETIC</span>
                    </div>
                    {crossbreedChartData.hasData ? (
                      <>
                        <div className="relative w-52 h-52 sm:w-56 sm:h-56 mx-auto my-4 flex items-center justify-center">
                          <Doughnut
                            data={{
                              labels: crossbreedChartData.labels.map((l, i) => `${l} ${crossbreedChartData.data[i]}%`),
                              datasets: [{
                                data: crossbreedChartData.data,
                                backgroundColor: ['#059669', '#10b981', '#34d399', '#047857', '#065f46', '#6ee7b7'],
                                borderWidth: 3,
                                borderColor: '#ffffff',
                                hoverOffset: 6,
                              }],
                            }}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              cutout: '68%',
                              plugins: {
                                legend: { position: 'bottom', labels: { boxWidth: 10, padding: 12, font: { size: 10, weight: 'bold' }, color: '#334155' } },
                                tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}` }, backgroundColor: '#0f172a', padding: 10, cornerRadius: 8 },
                              },
                            }}
                          />
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-2xl font-black text-emerald-700">{winRatePct}%</span>
                            <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Win Rate</span>
                          </div>
                        </div>
                        <p className="text-center text-[10px] text-slate-400 font-semibold pb-1">Based on {matchHistory.length} total {matchHistory.length === 1 ? 'match' : 'matches'}</p>
                      </>
                    ) : (
                      <div className="my-auto flex flex-col items-center justify-center text-center p-6 space-y-2">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 text-xl font-bold">🍩</div>
                        <p className="text-xs font-extrabold text-slate-500">No data available</p>
                        <p className="text-[10px] text-slate-400 max-w-[200px]">Log match records to generate bloodline win ratio breakdowns.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* HISTORICAL ANALYTICS MATCH LOGS TABLE */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-wrap justify-between items-center gap-3">
                    <div>
                      <h3 className="text-sm font-black text-slate-900 tracking-tight">Historical Analytics Match Logs</h3>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Complete record of logged derby and arena encounters</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[9px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 font-black px-3 py-1 rounded-full hidden sm:inline">D4 ANALYTICS DB</span>
                      <button
                        type="button"
                        onClick={() => { setCurrentPage('profiling'); setProfilingSubTab('matchForm'); }}
                        className="bg-slate-900 hover:bg-emerald-700 active:scale-[0.98] text-white text-[10px] font-black px-4 py-2 rounded-lg shadow-sm transition-all cursor-pointer"
                      >
                        View All →
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px] border-collapse min-w-[760px]">
                      <thead>
                        <tr className="bg-slate-50/80 text-slate-500 font-extrabold uppercase border-b border-slate-200/80">
                          <th className="p-4 pl-6">Match Date</th>
                          <th className="p-4">Fowl Identifier</th>
                          <th className="p-4">Bloodline</th>
                          <th className="p-4">Arena Location</th>
                          <th className="p-4 text-center">Outcome</th>
                          <th className="p-4 text-center">Video</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-600 font-semibold">
                        {matchHistory.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-400 text-xs font-semibold">
                              No data available
                            </td>
                          </tr>
                        ) : (
                          matchHistory.map((log) => (
                            <tr key={log.id} className="hover:bg-slate-50/80 transition-colors duration-150">
                              <td className="p-4 pl-6 font-mono text-slate-400 whitespace-nowrap">{log.date}</td>
                              <td className="p-4">
                                <div className="flex items-center space-x-2.5">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 border border-emerald-200/70 flex items-center justify-center text-sm shrink-0">🐓</div>
                                  <span className="font-bold text-slate-900">{log.entry_name}</span>
                                </div>
                              </td>
                              <td className="p-4">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px] uppercase tracking-wide whitespace-nowrap">{log.breed || '—'}</span>
                              </td>
                              <td className="p-4 text-slate-500 font-normal">{log.location || '—'}</td>
                              <td className="p-4 text-center">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full font-black text-[9px] uppercase tracking-wider border ${log.outcome && log.outcome.toLowerCase() === 'win' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : log.outcome && log.outcome.toLowerCase() === 'loss' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>{log.outcome || '—'}</span>
                              </td>
                              <td className="p-4 text-center">
                                {log.video_url ? (
                                  <a href={log.video_url} target="_blank" rel="noopener noreferrer" title="Watch match video" className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all cursor-pointer">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3" /></svg>
                                  </a>
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
                <div className="rounded-3xl border border-border bg-card/70 backdrop-blur-md p-6 flex flex-col gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-xl shrink-0 shadow-inner">🧬</div>
                    <div>
                      <h1 className="text-xl md:text-2xl font-black text-card-foreground tracking-tight">Profiling & Lineage Core Matrix</h1>
                      <p className="text-xs text-muted-foreground font-semibold mt-0.5">Encode specific traits to track ancestry weights and biological specifications</p>
                    </div>
                  </div>
                  
                  {/* SUBTAB SWITCHER BAR */}
                  <div className="bg-muted/80 p-1 rounded-2xl flex flex-wrap sm:flex-nowrap w-full border border-border mt-1 shrink-0 gap-1">
                    <button type="button" onClick={() => setProfilingSubTab('form')} className={`flex-1 min-w-[80px] py-2.5 text-[10px] sm:text-xs font-black rounded-xl transition-all duration-200 text-center cursor-pointer ${profilingSubTab === 'form' ? 'bg-emerald-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>📝 Encode</button>
                    <button type="button" onClick={() => setProfilingSubTab('registry')} className={`flex-1 min-w-[80px] py-2.5 text-[10px] sm:text-xs font-black rounded-xl transition-all duration-200 text-center cursor-pointer ${profilingSubTab === 'registry' ? 'bg-emerald-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>🌳 Active ({activeFowls.length})</button>
                    <button type="button" onClick={() => setProfilingSubTab('archived')} className={`flex-1 min-w-[80px] py-2.5 text-[10px] sm:text-xs font-black rounded-xl transition-all duration-200 text-center cursor-pointer ${profilingSubTab === 'archived' ? 'bg-emerald-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>📦 Archived ({archivedFowls.length})</button>
                    <button type="button" onClick={() => setProfilingSubTab('deceased')} className={`flex-1 min-w-[80px] py-2.5 text-[10px] sm:text-xs font-black rounded-xl transition-all duration-200 text-center cursor-pointer ${profilingSubTab === 'deceased' ? 'bg-emerald-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>💀 Deceased ({deceasedFowls.length})</button>
                    <button type="button" onClick={() => setProfilingSubTab('matchForm')} className={`flex-1 min-w-[80px] py-2.5 text-[10px] sm:text-xs font-black rounded-xl transition-all duration-200 text-center cursor-pointer ${profilingSubTab === 'matchForm' ? 'bg-emerald-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>⚔️ Match Logs</button>
                  </div>
                </div>

                {/* ENCODE NODE FORM */}
                {profilingSubTab === 'form' && (
                  <form onSubmit={handleAddFowl} className="space-y-5 animate-fadeIn">
                    <div className="antigravity-hover bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4 relative z-30">
                      <div className="flex items-center justify-between gap-2 border-b pb-2.5 border-slate-100">
                        <h3 className="font-black text-xs text-emerald-700 uppercase tracking-wider flex items-center space-x-2">
                          <span className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[11px] font-black shrink-0">1</span>
                          <span>Step 1: Core Identifiers</span>
                        </h3>
                        <span className="text-[9px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full font-black shrink-0">ID: {nextNodeId}</span>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Identifier Name</label>
                        <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full p-3 border border-slate-300 rounded-xl text-xs bg-white text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all font-semibold" placeholder="e.g., Roundhead Storm" required />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Genetic Strain</label>
                          <div className="relative">
                            <div className="relative">
                              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs">🧬</span>
                              <input
                                type="text"
                                value={strainQuery}
                                onChange={(e) => { setStrainQuery(e.target.value); setNewBreed(e.target.value); setStrainOpen(true); }}
                                onFocus={() => setStrainOpen(true)}
                                onBlur={() => setTimeout(() => setStrainOpen(false), 150)}
                                placeholder="Select or type a strain (e.g. Kelso, Hatch, or custom)..."
                                className={`w-full pl-9 pr-9 p-3 border border-input rounded-xl text-xs bg-muted outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-semibold ${strainQuery ? 'text-foreground' : 'text-muted-foreground font-normal'}`}
                                required
                              />
                              <button
                                type="button"
                                onClick={() => setStrainOpen((o) => !o)}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg border border-slate-200 bg-white text-slate-400 text-[10px] focus:border-emerald-500 cursor-pointer hover:text-emerald-500 transition-colors"
                                aria-label="Toggle strain list"
                              >
                                ▾
                              </button>
                            </div>
                            {strainOpen && (
                              <div className="absolute z-20 mt-1.5 w-full bg-popover border border-border rounded-xl shadow-2xl overflow-hidden max-h-56 flex flex-col">
                                <div className="overflow-y-auto">
                                  {(() => {
                                    const q = strainQuery.trim().toLowerCase();
                                    const matching = q
                                      ? availableStrains.filter((s) => s.toLowerCase().includes(q)).slice(0, 8)
                                      : availableStrains.slice(0, 8);
                                    if (q && !availableStrains.some((s) => s.toLowerCase() === q)) {
                                      return (
                                        <>
                                          <button
                                            type="button"
                                            onMouseDown={(e) => { e.preventDefault(); setStrainQuery(strainQuery.trim()); setNewBreed(strainQuery.trim()); setStrainOpen(false); }}
                                            className="w-full text-left px-4 py-3 bg-emerald-500/10 border-b border-border flex items-center justify-between gap-2 cursor-pointer hover:bg-emerald-500/20 transition-colors"
                                          >
                                            <span className="text-xs font-black text-emerald-600">➕ Save &quot;{strainQuery.trim()}&quot; as new genetic strain</span>
                                            <span className="text-[9px] font-mono text-emerald-500 uppercase shrink-0">Auto-saved</span>
                                          </button>
                                          {matching.length > 0 && <div className="px-4 pt-2.5 pb-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">Matching strains</div>}
                                          {matching.map((s) => (
                                            <button key={s} type="button" onMouseDown={(e) => { e.preventDefault(); setStrainQuery(s); setNewBreed(s); setStrainOpen(false); }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-muted-foreground hover:bg-muted transition-colors cursor-pointer">
                                              {s}
                                            </button>
                                          ))}
                                        </>
                                      );
                                    }
                                    return matching.map((s) => (
                                      <button key={s} type="button" onMouseDown={(e) => { e.preventDefault(); setStrainQuery(s); setNewBreed(s); setStrainOpen(false); }} className={`w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-muted transition-colors cursor-pointer ${s.toLowerCase() === strainQuery.trim().toLowerCase() ? 'bg-emerald-500/10 text-emerald-600' : 'text-muted-foreground'}`}>
                                        {s}
                                      </button>
                                    ));
                                  })()}
                                  {strainQuery.trim() === '' && availableStrains.length === 0 && (
                                    <div className="px-4 py-3 text-[10px] text-muted-foreground font-semibold">No strains saved yet — type a name to create one.</div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                          <p className="mt-1.5 text-[9px] text-slate-400 font-semibold">Choose an existing strain or type a new one — new strains are saved automatically and available for future entries.</p>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Gender Class</label>
                          <select value={newGender} onChange={(e) => { const g = e.target.value; setNewGender(g); if (age.trim() !== '' && !isNaN(Number(age))) { setNewGrowthStage(autoComputeGrowthStage(Number(age), g)); } else { setNewGrowthStage(''); } }} className={`w-full p-3 border border-input rounded-xl text-xs bg-muted font-extrabold outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all cursor-pointer ${newGender ? 'text-foreground' : 'text-muted-foreground font-normal'}`} required>
                            <option value="" disabled className="bg-popover text-muted-foreground">Select Gender Class</option>
                            <option value="Rooster" className="bg-popover text-popover-foreground">Rooster (Cock)</option>
                            <option value="Hen" className="bg-popover text-popover-foreground">Hen (Pullet)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="antigravity-hover bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-5">
                      <h3 className="font-black text-xs text-emerald-700 uppercase tracking-wider flex items-center space-x-2 border-b pb-2.5 border-slate-100">
                        <span className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[11px] font-black shrink-0">2</span>
                        <span>Step 2: Physical Parameters</span>
                      </h3>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                          Birth Date <span className="text-emerald-600 font-black">· required — age is auto-calculated</span>
                        </label>
                        <input
                          type="date"
                          value={newBirthdate}
                          onChange={(e) => handleNewBirthdateChange(e.target.value)}
                          max={new Date().toISOString().split('T')[0]}
                          className="w-full p-3 border border-slate-300 rounded-xl text-xs bg-white text-neutral-900 font-semibold outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all"
                          required
                        />
                        {(() => {
                          const parts = getAgeParts(newBirthdate);
                          return parts ? (
                            <p className="mt-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1.5">
                              📅 Auto Age: {getAgeLabel(parts)} &nbsp;·&nbsp; <span className="font-mono font-semibold">Exact {getAgeExact(parts)}</span>
                            </p>
                          ) : (
                            <p className="mt-1.5 text-[10px] text-slate-400 font-semibold">Age, growth stage, and calendar milestones are derived automatically from this date.</p>
                          );
                        })()}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Age (Mos) {newBirthdate && <span className="text-emerald-600 font-black">· auto</span>}</label>
                          <input type="number" value={newBirthdate ? String((getAgeParts(newBirthdate)?.totalMonths ?? 0)) : age} onChange={(e) => handleAgeChange(e.target.value)} readOnly={!!newBirthdate} className="w-full p-3 border border-slate-300 rounded-xl text-xs text-center font-extrabold bg-white text-neutral-900 placeholder:text-neutral-400 outline-none" placeholder="0" required />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Growth Stage</label>
                          <select
                            value={newGrowthStage}
                            onChange={(e) => setNewGrowthStage(e.target.value)}
                            className={`w-full p-3 border border-input rounded-xl text-xs bg-muted font-extrabold outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all cursor-pointer text-center ${newGrowthStage ? 'text-emerald-600' : 'text-muted-foreground font-normal'}`}
                          >
                            <option value="" disabled className="bg-popover text-muted-foreground">Select stage...</option>
                            <option value="Chick" className="bg-popover text-popover-foreground">Chick</option>
                            <option value="Stag" className="bg-popover text-popover-foreground">Stag</option>
                            <option value="Pullet" className="bg-popover text-popover-foreground">Pullet</option>
                            <option value="Bull Stag" className="bg-popover text-popover-foreground">Bull Stag</option>
                            <option value="Cock" className="bg-popover text-popover-foreground">Cock</option>
                            <option value="Hen" className="bg-popover text-popover-foreground">Hen</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Height (cm)</label>
                          <input type="number" step="0.1" value={height} onChange={(e) => setHeight(e.target.value)} className="no-spinner w-full p-3 border border-slate-300 rounded-xl text-xs text-center font-extrabold bg-white text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-emerald-500" placeholder="e.g. 45" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Weight (kg)</label>
                          <input type="number" step="0.01" value={weight} onChange={(e) => setWeight(e.target.value)} className="no-spinner w-full p-3 border border-slate-300 rounded-xl text-xs text-center font-extrabold bg-white text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-emerald-500" placeholder="e.g. 2.2" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Leg Color</label>
                        <input
                          type="text"
                          list="leg-color-options"
                          value={newLegColor}
                          onChange={(e) => setNewLegColor(e.target.value)}
                          className="w-full p-3 border border-slate-300 rounded-xl text-xs bg-white text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-emerald-500 font-semibold"
                          placeholder="Select or type a leg color..."
                        />
                        <datalist id="leg-color-options">
                          <option value="Yellow" />
                          <option value="White" />
                          <option value="Green / Slate" />
                          <option value="Willow" />
                          <option value="Black" />
                        </datalist>
                        <p className="mt-1.5 text-[9px] text-slate-400 font-semibold">Common choices: Yellow, White, Green / Slate, Willow, Black — or type a custom leg color.</p>
                      </div>
                    </div>

                    <div className="antigravity-hover bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
                      <h3 className="font-black text-xs text-emerald-700 uppercase tracking-wider flex items-center space-x-2 border-b pb-2.5 border-slate-100">
                        <span className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[11px] font-black shrink-0">3</span>
                        <span>Step 3: Ancestry Roots & Photo</span>
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                            Sire (Father) <span className="text-slate-400 font-normal lowercase">(optional / foundation stock)</span>
                          </label>
                          <input type="text" value={sireName} onChange={(e) => setSireName(e.target.value)} className="w-full p-3 border border-slate-300 rounded-xl text-xs bg-white text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-emerald-500 font-semibold" placeholder="e.g. Foundation Stock or Sire Name" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                            Dam (Mother) <span className="text-slate-400 font-normal lowercase">(optional / foundation stock)</span>
                          </label>
                          <input type="text" value={damName} onChange={(e) => setDamName(e.target.value)} className="w-full p-3 border border-slate-300 rounded-xl text-xs bg-white text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-emerald-500 font-semibold" placeholder="e.g. Foundation Stock or Dam Name" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                            Sire Pct (%) <span className="text-slate-400 font-normal lowercase">(optional)</span>
                          </label>
                          <input type="text" inputMode="numeric" pattern="[0-9]*" value={sirePct === '' ? '' : String(sirePct)} onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ''); setSirePct(v === '' ? '' : Math.min(Number(v), 100)); }} className="w-full p-3 border border-slate-300 rounded-xl text-xs bg-white text-neutral-900 placeholder:text-neutral-400 outline-none font-bold placeholder:font-normal" placeholder="e.g. 50" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                            Dam Pct (%) <span className="text-slate-400 font-normal lowercase">(optional)</span>
                          </label>
                          <input type="text" inputMode="numeric" pattern="[0-9]*" value={damPct === '' ? '' : String(damPct)} onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ''); setDamPct(v === '' ? '' : Math.min(Number(v), 100)); }} className="w-full p-3 border border-slate-300 rounded-xl text-xs bg-white text-neutral-900 placeholder:text-neutral-400 outline-none font-bold placeholder:font-normal" placeholder="e.g. 50" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Fowl Attachment Photo</label>
                        <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-slate-200 border-dashed rounded-2xl cursor-pointer bg-slate-50/80 hover:bg-slate-100/70 transition-all overflow-hidden relative">
                          {imagePreview ? (
                            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs text-slate-600 font-bold">📷 {selectedImage ? selectedImage.name : 'Choose fowl image file'}</span>
                          )}
                          <input type="file" accept="image/*" onChange={(e) => { if (e.target.files && e.target.files[0]) { const f = e.target.files[0]; setSelectedImage(f); setImagePreview(URL.createObjectURL(f)); } }} className="hidden" />
                        </label>
                      </div>
                    </div>

                    {/* BOTTOM VALIDATION & COMMIT BAR */}
                    <div className="bg-white rounded-3xl border-2 border-slate-900 shadow-sm p-5">
                      <div className="flex items-center justify-between gap-3 mb-4">
                        <div className="flex items-center space-x-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Validation & Summary Panel</span>
                        </div>
                        <span className="text-[9px] font-mono font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">Node: {nextNodeId}</span>
                      </div>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                        <StatusItem icon="🛡️" label="Data Integrity & Lineage Accuracy" value={`${dataCompleteness}%`} tone={dataCompleteness === 100 ? 'green' : 'amber'} />
                        <StatusItem icon="✅" label="Validation" value={validationPassed ? 'Passed' : 'Pending'} tone={validationPassed ? 'green' : 'amber'} />
                        <StatusItem icon="🔗" label="Bloodline Consistency" value={bloodlineVerified ? 'Verified' : 'Awaiting'} tone={bloodlineVerified ? 'green' : 'amber'} />
                        <StatusItem icon="📊" label="Data Completeness" value={`${dataCompleteness}%`} tone={dataCompleteness === 100 ? 'green' : 'amber'} />
                      </div>
                      <button type="submit" disabled={loading || uploadingImage} className="w-full bg-slate-900 hover:bg-emerald-700 active:scale-[0.99] text-white font-black py-4 rounded-2xl text-xs shadow-md uppercase tracking-widest cursor-pointer transition-all duration-200 flex items-center justify-center space-x-2">
                        {(loading || uploadingImage) && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
                        <span>{uploadingImage ? 'Uploading Attachment...' : loading ? 'Committing Node...' : 'Commit Node Objects'}</span>
                      </button>
                      <p className="text-center text-[9px] text-slate-400 font-semibold mt-2.5 tracking-wide">🔒 Verify lineage accuracy before committing node objects to the cluster registry.</p>
                    </div>
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
                      const siblings = getSiblingRelations(fowl).map(s => s.name);
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
                              <div>Legs: <strong className="text-slate-800">{fowl.leg_color || 'N/A'}</strong></div>
                              <div className="col-span-2 pt-1 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                                <span>📅 Age:</span>
                                {(() => {
                                  const p = getAgeParts(fowl.birthdate);
                                  return p ? (
                                    <strong className="text-emerald-700 font-black">{getAgeLabel(p)} <span className="font-mono font-semibold text-slate-400">· born {fowl.birthdate}</span></strong>
                                  ) : (
                                    <strong className="text-amber-700 font-bold">{fowl.age || 'No birth date'}</strong>
                                  );
                                })()}
                              </div>
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
                        <p className="text-xs text-slate-400 font-medium max-w-sm mx-auto">No gamefowl records have been archived. Archived fowl are non-mortality removals (sold, transferred, retired, inactive); deaths belong under 💀 Deceased.</p>
                      </div>
                    ) : archivedFowls.map((fowl, index) => {
                      const siblings = getSiblingRelations(fowl).map(s => s.name);
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
                              <span className="antigravity-badge text-[9px] font-black border px-2.5 py-0.5 rounded-full uppercase text-amber-800 bg-amber-50 border-amber-200">📦 Archived</span>
                              <span className="antigravity-badge text-[9px] font-black border px-2.5 py-0.5 rounded-full uppercase text-amber-700 bg-amber-50 border-amber-200">{fowl.breed}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] text-slate-500 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                              <div>Sire: <strong className="text-slate-800">{fowl.sire || 'N/A'}</strong></div>
                              <div>Dam: <strong className="text-slate-800">{fowl.dam || 'N/A'}</strong></div>
                              <div>Color: <strong className="text-slate-800">{fowl.color_category} ({fowl.color})</strong></div>
                              <div>Trait: <strong className="text-emerald-700">{fowl.behavior_trait}</strong></div>
                              <div>Legs: <strong className="text-slate-800">{fowl.leg_color || 'N/A'}</strong></div>
                              <div className="col-span-2">Archive Reason: <strong className="text-amber-800">{fowl.archive_reason || 'Unspecified'}</strong></div>
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
                                <span className="antigravity-badge text-[9px] font-black border px-2.5 py-0.5 rounded-full uppercase text-rose-700 bg-rose-50 border-rose-200">💀 Cause of Death: {fowl.death_reason || 'Unspecified'}{fowl.death_date ? ` · ${fowl.death_date}` : ''}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] text-slate-500 bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
                                <div>Sire: <strong className="text-slate-800">{fowl.sire || 'N/A'}</strong></div>
                                <div>Dam: <strong className="text-slate-800">{fowl.dam || 'N/A'}</strong></div>
                                <div>Growth Stage: <strong className="text-slate-800">{fowl.growth_stage || 'Chick'}</strong></div>
                                <div>Color: <strong className="text-slate-800">{fowl.color_category} ({fowl.color})</strong></div>
                                <div>Legs: <strong className="text-slate-800">{fowl.leg_color || 'N/A'}</strong></div>
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
                        <input type="date" value={matchDate} onChange={(e) => setMatchDate(e.target.value)} className="w-full p-3 border border-slate-300 rounded-xl text-xs bg-white text-neutral-900 font-semibold outline-none focus:border-emerald-500" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Opponent Entry Identity</label>
                        <input type="text" value={opponentName} onChange={(e) => setOpponentName(e.target.value)} className="w-full p-3 border border-slate-300 rounded-xl text-xs bg-white text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-emerald-500 font-semibold" placeholder="e.g., Kelso Express" required />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Arena Location Hub</label>
                        <input 
                          list="arena-locations" 
                          value={matchLocation} 
                          onChange={(e) => setMatchLocation(e.target.value)} 
className="w-full p-3 border border-slate-300 rounded-xl text-xs bg-white text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all font-semibold"
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
                    <input type="text" placeholder="Search lineage strains..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-3.5 py-3 border border-slate-300 rounded-2xl bg-white text-neutral-900 placeholder:text-neutral-400 text-xs outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all font-semibold" />
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
                    if (selectedFowlForDetails.status === 'Deceased') {
                      return (
                        <span className="text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase bg-rose-900 text-white border border-rose-950 shadow-2xs">
                          💀 DECEASED
                        </span>
                      );
                    }
                    if (selectedFowlForDetails.archive_reason) {
                      const badge = getArchiveBadgeStyle(selectedFowlForDetails.archive_reason);
                      return (
                        <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase ${badge.bg} border border-white/20 shadow-2xs`}>
                          {badge.label}
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
                  Growth Stage: <strong className="text-slate-800 font-bold">{selectedFowlForDetails.growth_stage || 'Chick'}</strong> | Auto Age: <strong className="text-emerald-700 font-bold">{(() => { const p = getAgeParts(selectedFowlForDetails.birthdate); return p ? getAgeLabel(p) : selectedFowlForDetails.age || 'N/A'; })()}</strong> | Legs: <strong className="text-slate-800 font-bold">{selectedFowlForDetails.leg_color || 'N/A'}</strong>
                </p>
                {(() => {
                  const p = getAgeParts(selectedFowlForDetails.birthdate);
                  return p ? (
                    <p className="text-[10px] font-mono text-slate-400 font-semibold">
                      Born {selectedFowlForDetails.birthdate} · Exact {getAgeExact(p)} · {getAgeMetrics(p)}
                    </p>
                  ) : (
                    <p className="text-[10px] text-amber-600 font-bold">⚠️ No birth date recorded — use ✏️ Edit to set one for automatic age &amp; milestone tracking.</p>
                  );
                })()}
                {selectedFowlForDetails.status === 'Deceased' && (
                  <p className="text-[11px] font-bold text-rose-600">
                    💀 Cause of Death: <strong className="text-rose-800">{selectedFowlForDetails.death_reason || 'Unspecified'}</strong>
                    {selectedFowlForDetails.death_date ? ` · Recorded ${selectedFowlForDetails.death_date}` : ''}
                  </p>
                )}
                {selectedFowlForDetails.status !== 'Deceased' && selectedFowlForDetails.archive_reason && (
                  <p className="text-[11px] font-bold text-amber-700">
                    📦 Archive Reason: <strong className="text-amber-800">{selectedFowlForDetails.archive_reason}</strong> (Non-Mortality)
                  </p>
                )}
              </div>
            </div>

            {/* SIBLING MATCH / LINEAGE RELATIONS */}
            {(() => {
              const relations = getSiblingRelations(selectedFowlForDetails);
              const full = relations.filter(r => r.relation === 'Full Sibling');
              const halfSire = relations.filter(r => r.relation === 'Half-Sibling (Shared Sire)');
              const halfDam = relations.filter(r => r.relation === 'Half-Sibling (Shared Dam)');
              const relationCard = (r: SiblingRelation) => {
                const isFull = r.relation === 'Full Sibling';
                const isSire = r.relation === 'Half-Sibling (Shared Sire)';
                const tone = isFull
                  ? 'text-emerald-700 border-emerald-200 bg-emerald-50'
                  : isSire
                  ? 'text-amber-700 border-amber-200 bg-amber-50'
                  : 'text-sky-700 border-sky-200 bg-sky-50';
                const icon = isFull ? '👥' : isSire ? '🐓' : '🐔';
                const badge = isFull ? 'Full Sibling' : 'Half-Sibling';
                const context = isFull
                  ? `Shared Sire: ${r.sharedSire} & Dam: ${r.sharedDam}`
                  : isSire
                  ? `Shared Sire: ${r.sharedSire}`
                  : `Shared Dam: ${r.sharedDam}`;
                return (
                  <div
                    key={r.id}
                    title={`${r.name} — ${badge}. ${context}.`}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/60 hover:border-slate-200 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 border ${tone}`}>{icon}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-800 truncate">{r.name}</p>
                        <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider truncate">{context}</p>
                      </div>
                    </div>
                    <span className={`text-[8px] font-black uppercase px-2.5 py-1 rounded-full border shrink-0 ${tone}`}>{badge}</span>
                  </div>
                );
              };
              return (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-5">
                  <h4 className="text-[10px] font-black text-emerald-800 uppercase tracking-widest flex items-center justify-between border-b pb-2 border-slate-100 mb-3">
                    <span>🧬 Sibling Match &amp; Lineage Relations</span>
                    <span className={`font-mono px-2 py-0.5 rounded border ${relations.length > 0 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-slate-500 bg-slate-100 border-slate-200'}`}>
                      {relations.length > 0 ? `${relations.length} DETECTED` : 'NO MATCHES'}
                    </span>
                  </h4>
                  {relations.length === 0 ? (
                    <p className="text-[10px] text-slate-400 font-semibold">
                      No sibling records detected. Add another gamefowl sharing the same Sire and/or Dam to build the lineage tree.
                    </p>
                  ) : (
                    <>
                      <p className="text-[10px] text-slate-500 font-medium bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 mb-3 flex items-start gap-2">
                        <span className="text-sm shrink-0">🧬</span>
                        <span>
                          <strong className="text-slate-700">How lineage is matched:</strong> birds sharing both the same{' '}
                          <strong className="text-slate-700">Sire</strong> and <strong className="text-slate-700">Dam</strong> are <strong className="text-emerald-700">Full Siblings</strong>;
                          sharing only one parent marks them as <strong className="text-amber-700">Half-Siblings</strong>. New encodes appear here instantly.
                        </span>
                      </p>
                      <div className="space-y-2 mb-3">
                        {relations.map(relationCard)}
                      </div>
                      {(full.length > 0 || halfSire.length > 0 || halfDam.length > 0) && (
                        <div className="flex flex-wrap gap-x-4 gap-y-1 pt-2.5 border-t border-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                          <span className="text-emerald-700">👥 {full.length} Full</span>
                          <span className="text-amber-700">🐓 {halfSire.length} Sire-side Half</span>
                          <span className="text-sky-700">🐔 {halfDam.length} Dam-side Half</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })()}

            {/* DEVELOPMENT TIMELINE & MILESTONES */}
            {(() => {
              const info = getMilestoneInfo(selectedFowlForDetails.birthdate, selectedFowlForDetails.gender);
              if (!info) return null;
              return (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-5">
                  <h4 className="text-[10px] font-black text-emerald-800 uppercase tracking-widest flex items-center justify-between border-b pb-2 border-slate-100 mb-3">
                    <span>📅 Development Timeline &amp; Calendar Milestones</span>
                    <span className="font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">CURRENT: {info.current?.stage || '—'}</span>
                  </h4>
                  <div className="space-y-2">
                    {info.stages.map((s) => {
                      const isCurrent = info.current?.id === s.id;
                      const isPast = info.parts.totalMonths >= s.toMonths;
                      const isNext = info.next !== null && info.next.id === s.id;
                      return (
                        <div key={s.id} className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${isCurrent ? 'bg-emerald-50 border-emerald-300 shadow-sm' : isPast ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-100'}`}>
                          <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0 ${isCurrent ? 'bg-emerald-600' : isPast ? 'bg-slate-200' : 'bg-white border border-slate-200'}`}>{s.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-black ${isCurrent ? 'text-emerald-800' : isPast ? 'text-slate-500' : 'text-slate-700'}`}>
                              {s.stage} <span className="font-mono text-[9px] text-slate-400">({s.fromMonths}–{isFinite(s.toMonths) ? s.toMonths : '∞'} mo)</span>
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium truncate">{s.note}</p>
                          </div>
                          {isCurrent ? (
                            <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full shrink-0">● Current</span>
                          ) : isPast ? (
                            <span className="text-[9px] font-bold text-slate-400 shrink-0">✓ Reached</span>
                          ) : isNext && info.next ? (
                            <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full shrink-0 border ${info.next.daysUntil >= 0 ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-slate-500 bg-slate-100 border-slate-200'}`}>
                              {info.next.daysUntil >= 0 ? `Next · in ${info.next.daysUntil}d` : `Due · ${Math.abs(info.next.daysUntil)}d overdue`}
                            </span>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                  {info.next && (
                    <p className="mt-3 text-[10px] text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 font-semibold">
                      🗓️ Next milestone: reach <span className="text-amber-700 font-black">{info.next.stage}</span> around <span className="text-slate-800 font-black">{info.next.date.toLocaleDateString()}</span>
                      {info.next.daysUntil >= 0 ? ` — in ${info.next.daysUntil} day${info.next.daysUntil === 1 ? '' : 's'}.` : ` (already ${Math.abs(info.next.daysUntil)} days past due).`}
                    </p>
                  )}
                </div>
              );
            })()}

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
                <h3 className="text-base font-black text-slate-900 tracking-tight">Record Mortality</h3>
                <p className="text-[11px] text-slate-500 font-semibold">Transition node to Deceased status — cause of death required</p>
              </div>
            </div>

            <div className="bg-rose-50/60 p-4 rounded-2xl border border-rose-200/60 space-y-2">
              <p className="text-xs font-bold text-slate-800">Target Fowl: <strong className="text-rose-700 font-black">{selectedFowlForDeceased.name}</strong> ({selectedFowlForDeceased.breed})</p>
              <p className="text-[10px] text-slate-500 leading-relaxed">Use this ONLY when the fowl has died. Mortality removes the fowl from the active registry. Non-mortality removals (sold, transferred, retired, inactive) belong under <strong className="text-amber-700">📦 Archive</strong> instead.</p>
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">Cause of Death</label>
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
                <p className="text-[11px] text-slate-500 font-semibold">Select a NON-MORTALITY reason for inventory removal</p>
              </div>
            </div>

            <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200/60 space-y-2">
              <p className="text-xs font-bold text-slate-800">Target Fowl: <strong className="text-amber-800 font-black">{selectedFowlForArchive.name}</strong> ({selectedFowlForArchive.breed})</p>
              <p className="text-[10px] text-slate-500 leading-relaxed">Archiving records a non-death disposition (sold, transferred, retired, inactive). It does NOT imply mortality. If the fowl has died, use <strong className="text-rose-700">💀 Deceased</strong> instead.</p>
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">Select Archive Reason (Non-Mortality)</label>
              <select 
                value={archiveReasonInput} 
                onChange={(e) => setArchiveReasonInput(e.target.value)} 
                className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 font-extrabold text-slate-800 outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="SOLD">🏷️ SOLD — Sold / Transferred to a Buyer</option>
                <option value="TRANSFERRED">🤝 TRANSFERRED — Moved to Another Farm / Owner</option>
                <option value="RETIRED">🌾 RETIRED — Retired from Circuit / Breeding</option>
                <option value="INACTIVE">⏸️ INACTIVE — Discontinued / On Hold (Non-Mortality)</option>
                <option value="OTHER">📦 OTHER — Other Non-Mortality Reason</option>
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
                  <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-white text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-emerald-500 font-medium" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Genetic Strain</label>
                    <input 
                      list="edit-genetic-strains" 
                      value={editBreed} 
                      onChange={(e) => setEditBreed(e.target.value)} 
                      className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-white text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-emerald-500 font-medium" 
                      placeholder="Select or type strain"
                      required 
                    />
                    <datalist id="edit-genetic-strains">
                      {availableStrains.map((s) => (
                        <option key={s} value={s} />
                      ))}
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
                <div className="mb-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Birth Date <span className="text-emerald-600 font-black">· auto age</span></label>
                  <input type="date" value={editBirthdate} onChange={(e) => handleEditBirthdateChange(e.target.value)} max={new Date().toISOString().split('T')[0]} className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-white text-neutral-900 font-semibold outline-none focus:border-emerald-500" />
                  {(() => {
                    const parts = getAgeParts(editBirthdate);
                    return parts ? (
                      <p className="mt-1 text-[10px] font-bold text-emerald-700">📅 Auto Age: {getAgeLabel(parts)} · <span className="font-mono">{getAgeMetrics(parts)}</span></p>
                    ) : (
                      <p className="mt-1 text-[10px] text-slate-400 font-medium">Set a birth date for automatic age &amp; milestone tracking.</p>
                    );
                  })()}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Age (Mos) {editBirthdate && <span className="text-emerald-600 font-black">· auto</span>}</label>
                    <input type="number" value={editBirthdate ? String((getAgeParts(editBirthdate)?.totalMonths ?? 0)) : editAge} onChange={(e) => handleEditAgeChange(e.target.value)} readOnly={!!editBirthdate} className="w-full p-2.5 border border-slate-300 rounded-xl text-xs text-center font-bold bg-white text-neutral-900 placeholder:text-neutral-400" required />
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
                    <input type="number" step="0.1" value={editHeight} onChange={(e) => setEditHeight(e.target.value)} className="no-spinner w-full p-2.5 border border-slate-300 rounded-xl text-xs text-center font-bold bg-white text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-emerald-500" placeholder="e.g. 45" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Weight (kg)</label>
                    <input type="number" step="0.01" value={editWeight} onChange={(e) => setEditWeight(e.target.value)} className="no-spinner w-full p-2.5 border border-slate-300 rounded-xl text-xs text-center font-bold bg-white text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-emerald-500" placeholder="e.g. 2.2" />
                  </div>
                </div>
                <div className="mt-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Leg Color</label>
                  <input
                    type="text"
                    list="edit-leg-color-options"
                    value={editLegColor}
                    onChange={(e) => setEditLegColor(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-white text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-emerald-500 font-medium"
                    placeholder="Select or type a leg color..."
                  />
                  <datalist id="edit-leg-color-options">
                    <option value="Yellow" />
                    <option value="White" />
                    <option value="Green / Slate" />
                    <option value="Willow" />
                    <option value="Black" />
                  </datalist>
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
                    <input type="text" value={editSire} onChange={(e) => setEditSire(e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-white text-neutral-900 placeholder:text-neutral-400 outline-none font-medium" placeholder="Foundation Stock" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Dam (Mother) <span className="text-slate-400 font-normal lowercase">(optional)</span>
                    </label>
                    <input type="text" value={editDam} onChange={(e) => setEditDam(e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-white text-neutral-900 placeholder:text-neutral-400 outline-none font-medium" placeholder="Foundation Stock" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Sire Heritage Pct (%) <span className="text-slate-400 font-normal lowercase">(optional)</span>
                    </label>
                    <input type="number" value={editSirePct} onChange={(e) => setEditSirePct(e.target.value === '' ? '' : Number(e.target.value))} className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-white text-neutral-900 font-bold placeholder:text-neutral-400 placeholder:font-normal" placeholder="e.g. 50" min="0" max="100" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Dam Heritage Pct (%) <span className="text-slate-400 font-normal lowercase">(optional)</span>
                    </label>
                    <input type="number" value={editDamPct} onChange={(e) => setEditDamPct(e.target.value === '' ? '' : Number(e.target.value))} className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-white text-neutral-900 font-bold placeholder:text-neutral-400 placeholder:font-normal" placeholder="e.g. 50" min="0" max="100" />
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

      {/* LOGOUT CONFIRMATION MODAL */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-[22px] max-w-sm w-full overflow-hidden shadow-2xl shadow-slate-900/20 ring-1 ring-slate-200/80">
            <div className="p-5 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white border-b border-white/10">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-base shrink-0 shadow-inner">🚪</div>
                  <div>
                    <h3 className="text-sm font-black tracking-tight text-white">Log Out Confirmation</h3>
                    <p className="text-[10px] text-emerald-200/70 font-bold tracking-wider uppercase mt-0.5">Secure Session Termination</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLogoutModal(false)}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center font-bold text-sm transition-all cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-start space-x-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-lg shrink-0">🚪</div>
                <div>
                  <p className="text-sm text-slate-800 font-extrabold leading-relaxed tracking-tight">
                    Are you sure you want to log out?
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium leading-relaxed mt-1">
                    Your active session and local tokens will be securely terminated. You will need to sign in again to access the cluster.
                  </p>
                </div>
              </div>
              <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold px-5 py-3 rounded-xl text-xs transition-all cursor-pointer active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => { setShowLogoutModal(false); handleLogout(); }}
                  className="flex-1 bg-slate-900 hover:bg-emerald-700 text-white font-extrabold px-5 py-3 rounded-xl text-xs transition-all cursor-pointer active:scale-[0.98] shadow-lg shadow-slate-900/20"
                >
                  Yes, Log Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FORGOT PASSWORD MODAL */}
      {showForgotPasswordModal && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-[22px] max-w-sm w-full overflow-hidden shadow-2xl shadow-slate-900/20 ring-1 ring-slate-200/80">
            <div className="p-5 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white border-b border-white/10">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-base shrink-0 shadow-inner">🔑</div>
                  <div>
                    <h3 className="text-sm font-black tracking-tight text-white">Reset Your Password</h3>
                    <p className="text-[10px] text-emerald-200/70 font-bold tracking-wider uppercase mt-0.5">Secure Recovery Link</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotPasswordModal(false)}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center font-bold text-sm transition-all cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6">
              {forgotSent ? (
                <div className="flex flex-col items-center text-center space-y-3 py-2">
                  <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4Z" /></svg>
                  </div>
                  <p className="text-sm font-extrabold text-slate-800 tracking-tight">Check your inbox</p>
                  <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                    A secure password reset link has been sent to <strong className="text-slate-600">{forgotEmail.trim()}</strong>. Follow the instructions in the email to set a new password.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowForgotPasswordModal(false)}
                    className="w-full mt-2 bg-slate-900 hover:bg-emerald-700 text-white font-extrabold px-5 py-3 rounded-xl text-xs transition-all cursor-pointer active:scale-[0.98] shadow-lg shadow-slate-900/20"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSendResetLink} className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-lg shrink-0">✉️</div>
                    <div>
                      <p className="text-sm text-slate-800 font-extrabold leading-relaxed tracking-tight">Enter your registered email</p>
                      <p className="text-[11px] text-slate-400 font-medium leading-relaxed mt-1">
                        We will send you a secure link to reset your GalloTrack password.
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Email Address</label>
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full p-3 border border-slate-200/90 rounded-xl text-xs bg-slate-50/50 outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all font-semibold"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                  {forgotError && (
                    <div className="text-[11px] text-rose-600 font-bold text-center bg-rose-50 border border-rose-200/60 p-3 rounded-xl">{forgotError}</div>
                  )}
                  <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowForgotPasswordModal(false)}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold px-5 py-3 rounded-xl text-xs transition-all cursor-pointer active:scale-[0.98]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="flex-1 bg-slate-900 hover:bg-emerald-700 text-white font-extrabold px-5 py-3 rounded-xl text-xs transition-all cursor-pointer active:scale-[0.98] shadow-lg shadow-slate-900/20 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {forgotLoading ? 'Sending Link...' : 'Send Reset Link'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}