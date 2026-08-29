'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ensureOwnerRecords, supabase } from '@/lib/registry';
import { isAdminProfile } from '@/lib/admin';
import { useUI } from './ui-context';

interface AuthContextValue {
  currentUserId: string | null;
  isAdmin: boolean;
  adminName: string;
  setAdminName: (v: string) => void;
  avatarUrl: string;
  setAvatarUrl: (v: string) => void;
  userHub: string;
  userActive: boolean;
  username: string;
  setUsername: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  error: string;
  setError: (v: string) => void;
  rememberMe: boolean;
  setRememberMe: (v: boolean) => void;
  successMessage: string;
  setSuccessMessage: (v: string) => void;
  forgotEmail: string;
  setForgotEmail: (v: string) => void;
  forgotLoading: boolean;
  forgotSent: boolean;
  setForgotSent: (v: boolean) => void;
  forgotError: string;
  setForgotError: (v: string) => void;
  loading: boolean;
  setLoading: (v: boolean) => void;
  handleLogin: (e: React.FormEvent) => Promise<void>;
  handleLogout: () => Promise<void>;
  handleSendResetLink: (e: React.FormEvent) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const ui = useUI();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminName, setAdminName] = useState('Farm Owner');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [userHub, setUserHub] = useState('ISUFST DINGLE HUB');
  const [userActive, setUserActive] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [loading, setLoading] = useState(false);

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
          ui.setCurrentPage('dashboard');
          try {
            const { data: profile } = await supabase.from('profiles').select('id, is_admin, role, farm_name, is_active').eq('id', session.user.id).maybeSingle();
            setIsAdmin(isAdminProfile(profile));
            setUserHub((profile && (profile.farm_name || '').trim()) || 'ISUFST DINGLE HUB');
            setUserActive(profile ? profile.is_active !== false : true);
          } catch {
            setIsAdmin(false);
          }
        }
      }
    }
    checkSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
            setAdminName(profile.full_name || 'Farm Owner');
            setAvatarUrl(profile.avatar_url || '');
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

  const handleLogin = useCallback(async (e: React.FormEvent) => {
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

      ui.setCurrentPage('dashboard');
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
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
        if (profile) {
          if (profile.is_active === false) {
            await supabase.auth.signOut();
            setError('This account has been deactivated by the administrator. Contact system support to restore access.');
            if (typeof window !== 'undefined') localStorage.removeItem('gallotrack_user_id');
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
        setTimeout(() => ui.showToastMessage(`Access Authenticated. Welcome back, ${welcomeName}!`, 'success'), 400);
        window.dispatchEvent(new Event('admin-profile-update'));
      }
    } catch (err) {
      console.error(err);
      setError('System Error: Unable to authenticate.');
    } finally {
      setLoading(false);
    }
  }, [username, password, rememberMe, ui]);

  const handleLogout = useCallback(async () => {
    setCurrentUserId(null);
    setUsername('');
    setPassword('');
    ui.setCurrentPage('login');
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
    ui.showToastMessage('System session terminated.', 'warning');
  }, [ui]);

  const handleSendResetLink = useCallback(async (e: React.FormEvent) => {
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
        ui.showToastMessage('Password reset link sent. Check your inbox.', 'success');
      }
    } catch (err: unknown) {
      setForgotError(err instanceof Error ? err.message : 'Failed to send reset link. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  }, [forgotEmail, ui]);

  const value: AuthContextValue = {
    currentUserId, isAdmin,
    adminName, setAdminName,
    avatarUrl, setAvatarUrl,
    userHub, userActive,
    username, setUsername,
    password, setPassword,
    showPassword, setShowPassword,
    error, setError,
    rememberMe, setRememberMe,
    successMessage, setSuccessMessage,
    forgotEmail, setForgotEmail,
    forgotLoading, forgotSent, setForgotSent,
    forgotError, setForgotError,
    loading, setLoading,
    handleLogin, handleLogout, handleSendResetLink,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
