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

  /** Config for the shared match/fowl media viewer (videos + photos with tabs). */
  matchMediaViewer: MatchMediaViewerConfig | null;
  openMatchMediaViewer: (cfg: MatchMediaViewerConfig) => void;
  closeMatchMediaViewer: () => void;
  /** Compat: open the viewer focused on a match's videos. */
  openMatchVideoPlayer: (match: MatchRecord, urls: string[], posters?: (string | null)[]) => void;
  /** Compat: open the viewer focused on a photo gallery. */
  setImageViewerUrl: (v: string | null) => void;
  editingMatch: MatchRecord | null;
  setEditingMatch: (m: MatchRecord | null) => void;
  shareTarget: { type: 'match' | 'fowl'; id: number; label: string } | null;
  setShareTarget: (t: { type: 'match' | 'fowl'; id: number; label: string } | null) => void;
}

export type MatchMediaViewerConfig = {
  /** Match context for the viewer header (omitted for galleries like fowl photos). */
  match?: MatchRecord;
  /** Fallback header title when there is no match (e.g. chicken name). */
  title?: string;
  videos: string[];
  photos: string[];
  /** Poster frames index-aligned with `videos`. */
  videoPosters?: (string | null)[];
  tab: 'videos' | 'photos';
  /** Set when the viewer opens — used to give the viewer fresh state per open. */
  openedAt?: number;
};

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

  const [matchMediaViewer, setMatchMediaViewer] = useState<MatchMediaViewerConfig | null>(null);
  const [editingMatch, setEditingMatch] = useState<MatchRecord | null>(null);
  const [shareTarget, setShareTarget] = useState<{ type: 'match' | 'fowl'; id: number; label: string } | null>(null);

  const openMatchMediaViewer = React.useCallback((cfg: MatchMediaViewerConfig) => {
    setMatchMediaViewer({ ...cfg, openedAt: Date.now() });
  }, []);

  const closeMatchMediaViewer = React.useCallback(() => {
    setMatchMediaViewer(null);
  }, []);

  const openMatchVideoPlayer = React.useCallback(
    (match: MatchRecord, urls: string[], posters?: (string | null)[]) => {
      setMatchMediaViewer({ match, videos: urls, photos: [], videoPosters: posters, tab: 'videos', openedAt: Date.now() });
    },
    []
  );

  const setImageViewerUrl = React.useCallback((v: string | null) => {
    setMatchMediaViewer(v ? { videos: [], photos: [v], tab: 'photos', openedAt: Date.now() } : null);
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
    matchMediaViewer, openMatchMediaViewer, closeMatchMediaViewer,
    openMatchVideoPlayer,
    setImageViewerUrl,
    editingMatch, setEditingMatch,
    shareTarget, setShareTarget,
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}
