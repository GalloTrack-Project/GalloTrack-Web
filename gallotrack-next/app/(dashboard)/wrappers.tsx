'use client';
import React from 'react';
import DashboardPage from '@/components/DashboardPage';
import ProfilingPage from '@/components/ProfilingPage';
import MarketplacePage from '@/components/MarketplacePage';
import LineageDirectory from '@/components/LineageDirectory';
import Modals from '@/components/Modals';
import { useFowl } from '@/lib/contexts/fowl-context';
import { useUI } from '@/lib/contexts/ui-context';
import { useRouter } from 'next/navigation';

export function DashboardPageWrapper() {
  return <DashboardPage />;
}

export function ProfilingPageWrapper() {
  return <ProfilingPage />;
}

export function MarketplacePageWrapper() {
  const fowl = useFowl();
  const ui = useUI();
  const router = useRouter();

  const navigate = (page: string, subTab?: string) => {
    if (subTab) ui.setProfilingSubTab(subTab as never);
    router.push(`/${page}`);
  };

  return (
    <MarketplacePage
      fowls={fowl.fowls}
      search={fowl.search}
      setSearch={fowl.setSearch}
      debouncedSearch={fowl.debouncedSearch}
      setCurrentPage={(v: string) => navigate(v)}
      setProfilingSubTab={(v: string) => ui.setProfilingSubTab(v as never)}
    />
  );
}

export function LineageDirectoryWrapper() {
  const fowl = useFowl();
  return (
    <LineageDirectory
      fowls={fowl.fowls}
      matchHistory={fowl.matchHistory}
      pairingAnalytics={fowl.pairingAnalytics}
      search={fowl.search}
      setSearch={fowl.setSearch}
      debouncedSearch={fowl.debouncedSearch}
      setSelectedFowlForDetails={(f) => {}}
    />
  );
}

export function ModalsWrapper() {
  const store = useFowl();
  const ui = useUI();
  return (
    <Modals
      selectedFowlForDetails={ui.selectedFowlForDetails}
      setSelectedFowlForDetails={ui.setSelectedFowlForDetails}
      selectedFowlForDeceased={ui.selectedFowlForDeceased}
      setSelectedFowlForDeceased={ui.setSelectedFowlForDeceased}
      handleMarkFowlDeceased={store.handleMarkFowlDeceased}
      deathReasonInput={store.deathReasonInput}
      setDeathReasonInput={store.setDeathReasonInput}
      selectedFowlForArchive={ui.selectedFowlForArchive}
      setSelectedFowlForArchive={ui.setSelectedFowlForArchive}
      handleArchiveFowlWithReason={store.handleArchiveFowlWithReason}
      archiveReasonInput={store.archiveReasonInput}
      setArchiveReasonInput={store.setArchiveReasonInput}
      pendingPermanentDelete={ui.pendingPermanentDelete}
      setPendingPermanentDelete={ui.setPendingPermanentDelete}
      handlePermanentDelete={store.handlePermanentDelete}
      permanentDeleting={ui.permanentDeleting}
      editingFowl={ui.editingFowl}
      setEditingFowl={ui.setEditingFowl}
      handleUpdateFowl={store.handleUpdateFowl}
      showLogoutModal={ui.showLogoutModal}
      setShowLogoutModal={ui.setShowLogoutModal}
      handleLogout={() => {}}
      showForgotPasswordModal={ui.showForgotPasswordModal}
      setShowForgotPasswordModal={ui.setShowForgotPasswordModal}
      handleSendResetLink={() => {}}
      forgotEmail=""
      setForgotEmail={() => {}}
      forgotLoading={false}
      forgotSent={false}
      forgotError=""
      matchHistory={store.matchHistory}
      loading={store.loading}
      getAgeParts={store.getAgeParts}
      getAgeLabel={store.getAgeLabel}
      getAgeExact={store.getAgeExact}
      getAgeMetrics={store.getAgeMetrics}
      generationOf={store.generationOf}
      generationPurity={store.generationPurity}
      generationInfo={store.generationInfo}
      bloodlineOf={store.bloodlineOf}
      cleanPct={store.cleanPct}
      getSiblingRelations={store.getSiblingRelations}
      getMilestoneInfo={store.getMilestoneInfo}
      getArchiveBadgeStyle={store.getArchiveBadgeStyle}
      autoComputeGrowthStage={store.autoComputeGrowthStage}
      fowls={store.fowls}
      pairingAnalytics={store.pairingAnalytics}
      availableStrains={store.availableStrains}
      customStrainNames={store.customStrainNames}
      deleteCustomStrain={store.deleteCustomStrain}
      editName={store.editName}
      setEditName={store.setEditName}
      editBreed={store.editBreed}
      setEditBreed={store.setEditBreed}
      editGender={store.editGender}
      setEditGender={store.setEditGender}
      editColorCategory={store.editColorCategory}
      setEditColorCategory={store.setEditColorCategory}
      editColor={store.editColor}
      setEditColor={store.setEditColor}
      editBehaviorTrait={store.editBehaviorTrait}
      setEditBehaviorTrait={store.setEditBehaviorTrait}
      editEyeVariant={store.editEyeVariant}
      setEditEyeVariant={store.setEditEyeVariant}
      editAge={store.editAge}
      setEditAge={store.setEditAge}
      editBirthdate={store.editBirthdate}
      setEditBirthdate={store.setEditBirthdate}
      editGrowthStage={store.editGrowthStage}
      setEditGrowthStage={store.setEditGrowthStage}
      editWeight={store.editWeight}
      setEditWeight={store.setEditWeight}
      editHeight={store.editHeight}
      setEditHeight={store.setEditHeight}
      editLegColor={store.editLegColor}
      setEditLegColor={store.setEditLegColor}
      availableLegColors={store.availableLegColors}
      customLegColorNames={store.customLegColorNames}
      deleteCustomLegColor={store.deleteCustomLegColor}
      editSire={store.editSire}
      setEditSire={store.setEditSire}
      editDam={store.editDam}
      setEditDam={store.setEditDam}
      editSirePct={store.editSirePct}
      setEditSirePct={store.setEditSirePct}
      editDamPct={store.editDamPct}
      setEditDamPct={store.setEditDamPct}
      handleEditBirthdateChange={store.handleEditBirthdateChange}
      handleEditAgeChange={store.handleEditAgeChange}
      showPerFowlBreakdownModal={ui.showPerFowlBreakdownModal}
      setShowPerFowlBreakdownModal={ui.setShowPerFowlBreakdownModal}
    />
  );
}
