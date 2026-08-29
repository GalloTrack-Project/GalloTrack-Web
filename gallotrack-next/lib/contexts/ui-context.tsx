'use client';
import React, { createContext, useContext, useState, useCallback } from 'react';
import type { PageId, ProfilingSubTab, ToastState, FowlRecord } from '@/lib/types';

interface UIContextValue {
  theme: string;
  setTheme: (v: string) => void;
  showSplash: boolean;
  setShowSplash: (v: boolean) => void;
  currentPage: PageId;
  setCurrentPage: (v: PageId) => void;
  profilingSubTab: ProfilingSubTab;
  setProfilingSubTab: (v: ProfilingSubTab) => void;
  toast: ToastState;
  setToast: React.Dispatch<React.SetStateAction<ToastState>>;
  showToastMessage: (message: string, type?: 'success' | 'error' | 'warning') => void;

  selectedFowlForDetails: FowlRecord | null;
  setSelectedFowlForDetails: (f: FowlRecord | null) => void;
  selectedFowlForDeceased: FowlRecord | null;
  setSelectedFowlForDeceased: (f: FowlRecord | null) => void;
  selectedFowlForArchive: FowlRecord | null;
  setSelectedFowlForArchive: (f: FowlRecord | null) => void;
  pendingPermanentDelete: FowlRecord | null;
  setPendingPermanentDelete: (f: FowlRecord | null) => void;
  permanentDeleting: boolean;
  setPermanentDeleting: (v: boolean) => void;
  editingFowl: FowlRecord | null;
  setEditingFowl: (f: FowlRecord | null) => void;

  showLogoutModal: boolean;
  setShowLogoutModal: (v: boolean) => void;
  showForgotPasswordModal: boolean;
  setShowForgotPasswordModal: (v: boolean) => void;
  showPerFowlBreakdownModal: boolean;
  setShowPerFowlBreakdownModal: (v: boolean) => void;
}

const UIContext = createContext<UIContextValue | null>(null);

export function useUI(): UIContextValue {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used within UIProvider');
  return ctx;
}

export function UIProvider({
  children,
  theme,
  setTheme,
}: {
  children: React.ReactNode;
  theme: string;
  setTheme: (v: string) => void;
}) {
  const [showSplash, setShowSplash] = useState(true);
  const [currentPage, setCurrentPage] = useState<PageId>('login');
  const [profilingSubTab, setProfilingSubTab] = useState<ProfilingSubTab>('form');
  const [toast, setToast] = useState<ToastState>({ show: false, message: '', type: 'success' });

  const [selectedFowlForDetails, setSelectedFowlForDetails] = useState<FowlRecord | null>(null);
  const [selectedFowlForDeceased, setSelectedFowlForDeceased] = useState<FowlRecord | null>(null);
  const [selectedFowlForArchive, setSelectedFowlForArchive] = useState<FowlRecord | null>(null);
  const [pendingPermanentDelete, setPendingPermanentDelete] = useState<FowlRecord | null>(null);
  const [permanentDeleting, setPermanentDeleting] = useState(false);
  const [editingFowl, setEditingFowl] = useState<FowlRecord | null>(null);

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [showPerFowlBreakdownModal, setShowPerFowlBreakdownModal] = useState(false);

  const showToastMessage = useCallback((message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 4000);
  }, []);

  const value: UIContextValue = {
    theme, setTheme,
    showSplash, setShowSplash,
    currentPage, setCurrentPage,
    profilingSubTab, setProfilingSubTab,
    toast, setToast, showToastMessage,
    selectedFowlForDetails, setSelectedFowlForDetails,
    selectedFowlForDeceased, setSelectedFowlForDeceased,
    selectedFowlForArchive, setSelectedFowlForArchive,
    pendingPermanentDelete, setPendingPermanentDelete,
    permanentDeleting, setPermanentDeleting,
    editingFowl, setEditingFowl,
    showLogoutModal, setShowLogoutModal,
    showForgotPasswordModal, setShowForgotPasswordModal,
    showPerFowlBreakdownModal, setShowPerFowlBreakdownModal,
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}
