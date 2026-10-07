'use client';
import React, { createContext, useContext, useState } from 'react';
import type { PageId, ProfilingSubTab, FowlRecord, MatchRecord } from '@/lib/types';
import type { RegistrySortKey } from '@/lib/registry-roles';

interface UIContextValue {
  theme: string;
  setTheme: (v: string) => void;
  showSplash: boolean;
  setShowSplash: (v: boolean) => void;
  currentPage: PageId;
  setCurrentPage: (v: PageId) => void;
  profilingSubTab: ProfilingSubTab;
  setProfilingSubTab: (v: ProfilingSubTab) => void;
  /** Per-tab sort choice in the Registry (Task B). Identifier = natural order. */
  registrySortBy: Partial<Record<ProfilingSubTab, RegistrySortKey>>;
  setRegistrySort: (tab: ProfilingSubTab, key: RegistrySortKey) => void;

  selectedFowlForDetails: FowlRecord | null;
  setSelectedFowlForDetails: (f: FowlRecord | null) => void;
  selectedFowlForDeceased: FowlRecord | null;
  setSelectedFowlForDeceased: (f: FowlRecord | null) => void;
  selectedFowlForArchive: FowlRecord | null;
  setSelectedFowlForArchive: (f: FowlRecord | null) => void;
  fightHistoryFowl: FowlRecord | null;
  setFightHistoryFowl: (f: FowlRecord | null) => void;
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

  videoViewerUrl: string | null;
  setVideoViewerUrl: (v: string | null) => void;
  /** Rich match video player: match metadata for the modal header. */
  videoViewerMatch: MatchRecord | null;
  setVideoViewerMatch: (m: MatchRecord | null) => void;
  /** All video URLs for the match currently shown in the player. */
  videoViewerUrls: string[];
  setVideoViewerUrls: (urls: string[]) => void;
  /** Convenience: open the rich video player for a match with its videos. */
  openMatchVideoPlayer: (match: MatchRecord, urls: string[]) => void;
  imageViewerUrl: string | null;
  setImageViewerUrl: (v: string | null) => void;
  editingMatch: MatchRecord | null;
  setEditingMatch: (m: MatchRecord | null) => void;
  shareTarget: { type: 'match' | 'fowl'; id: number; label: string } | null;
  setShareTarget: (t: { type: 'match' | 'fowl'; id: number; label: string } | null) => void;
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
  const [registrySortBy, setRegistrySortBy] = useState<Partial<Record<ProfilingSubTab, RegistrySortKey>>>({});
  const setRegistrySort = React.useCallback((tab: ProfilingSubTab, key: RegistrySortKey) => {
    setRegistrySortBy((prev) => ({ ...prev, [tab]: key }));
  }, []);

  const [selectedFowlForDetails, setSelectedFowlForDetails] = useState<FowlRecord | null>(null);
  const [selectedFowlForDeceased, setSelectedFowlForDeceased] = useState<FowlRecord | null>(null);
  const [selectedFowlForArchive, setSelectedFowlForArchive] = useState<FowlRecord | null>(null);
  const [fightHistoryFowl, setFightHistoryFowl] = useState<FowlRecord | null>(null);
  const [pendingPermanentDelete, setPendingPermanentDelete] = useState<FowlRecord | null>(null);
  const [permanentDeleting, setPermanentDeleting] = useState(false);
  const [editingFowl, setEditingFowl] = useState<FowlRecord | null>(null);

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [showPerFowlBreakdownModal, setShowPerFowlBreakdownModal] = useState(false);

  const [videoViewerUrl, setVideoViewerUrl] = useState<string | null>(null);
  const [videoViewerMatch, setVideoViewerMatch] = useState<MatchRecord | null>(null);
  const [videoViewerUrls, setVideoViewerUrls] = useState<string[]>([]);
  const [imageViewerUrl, setImageViewerUrl] = useState<string | null>(null);
  const [editingMatch, setEditingMatch] = useState<MatchRecord | null>(null);
  const [shareTarget, setShareTarget] = useState<{ type: 'match' | 'fowl'; id: number; label: string } | null>(null);

  const openMatchVideoPlayer = React.useCallback((match: MatchRecord, urls: string[]) => {
    setVideoViewerMatch(match);
    setVideoViewerUrls(urls);
    // Also set the legacy scalar so old callers (MediaViewerModal) still work
    setVideoViewerUrl(urls[0] ?? null);
  }, []);

  const value: UIContextValue = {
    theme, setTheme,
    showSplash, setShowSplash,
    currentPage, setCurrentPage,
    profilingSubTab, setProfilingSubTab,
    registrySortBy, setRegistrySort,
    selectedFowlForDetails, setSelectedFowlForDetails,
    selectedFowlForDeceased, setSelectedFowlForDeceased,
    selectedFowlForArchive, setSelectedFowlForArchive,
    fightHistoryFowl, setFightHistoryFowl,
    pendingPermanentDelete, setPendingPermanentDelete,
    permanentDeleting, setPermanentDeleting,
    editingFowl, setEditingFowl,
    showLogoutModal, setShowLogoutModal,
    showForgotPasswordModal, setShowForgotPasswordModal,
    showPerFowlBreakdownModal, setShowPerFowlBreakdownModal,
    videoViewerUrl, setVideoViewerUrl,
    videoViewerMatch, setVideoViewerMatch,
    videoViewerUrls, setVideoViewerUrls,
    openMatchVideoPlayer,
    imageViewerUrl, setImageViewerUrl,
    editingMatch, setEditingMatch,
    shareTarget, setShareTarget,
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}
