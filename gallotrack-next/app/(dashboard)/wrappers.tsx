'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { useGaloTrack } from '@/lib/context';
import DashboardPage from '@/components/DashboardPage';
import ProfilingPage from '@/components/ProfilingPage';
import MarketplacePage from '@/components/MarketplacePage';
import LineageDirectory from '@/components/LineageDirectory';
import Modals from '@/components/Modals';

function NavWrapper({ children }: { children: (navigate: (page: string, subTab?: string) => void) => React.ReactNode }) {
  const store = useGaloTrack();
  const router = useRouter();

  const navigate = (page: string, subTab?: string) => {
    if (subTab) store.setProfilingSubTab(subTab as never);
    router.push(`/${page}`);
  };

  return <>{children(navigate)}</>;
}

export function DashboardPageWrapper() {
  const store = useGaloTrack();
  return (
    <NavWrapper>
      {(navigate) => (
        <DashboardPage
          fowls={store.fowls}
          matchHistory={store.matchHistory}
          pairingAnalytics={store.pairingAnalytics}
          activeFowls={store.activeFowls}
          maleActiveFowls={store.maleActiveFowls}
          femaleActiveFowls={store.femaleActiveFowls}
          monthLabels={store.monthLabels}
          matchesByMonth={store.matchesByMonth}
          activeSpark={store.activeSpark}
          trendWinRate={store.trendWinRate}
          upcomingMilestones={store.upcomingMilestones}
          crossbreedChartData={store.crossbreedChartData}
          winRatePct={store.winRatePct}
          winsCount={store.winsCount}
          lossesCount={store.lossesCount}
          setShowPerFowlBreakdownModal={store.setShowPerFowlBreakdownModal}
          setCurrentPage={(v: string) => navigate(v)}
          setProfilingSubTab={(v: string) => store.setProfilingSubTab(v as never)}
          breakdownTab={store.breakdownTab}
          dateRangeLabel={store.dateRangeLabel}
          dateRangeOpen={store.dateRangeOpen}
          setDateRangeOpen={store.setDateRangeOpen}
          dateRangePreset={store.dateRangePreset}
          setDateRangePreset={store.setDateRangePreset}
          fetchDatabaseResources={store.fetchDatabaseResources}
          loading={store.loading}
        />
      )}
    </NavWrapper>
  );
}

export function ProfilingPageWrapper() {
  const store = useGaloTrack();
  return (
    <NavWrapper>
      {() => (
        <ProfilingPage
          fowls={store.fowls}
          activeFowls={store.activeFowls}
          maleActiveFowls={store.maleActiveFowls}
          femaleActiveFowls={store.femaleActiveFowls}
          archivedFowls={store.archivedFowls}
          deceasedFowls={store.deceasedFowls}
          matchHistory={store.matchHistory}
          profilingSubTab={store.profilingSubTab}
          setProfilingSubTab={store.setProfilingSubTab}
          newName={store.newName}
          setNewName={store.setNewName}
          newBreed={store.newBreed}
          setNewBreed={store.setNewBreed}
          newGender={store.newGender}
          setNewGender={store.setNewGender}
          newBirthdate={store.newBirthdate}
          handleNewBirthdateChange={store.handleNewBirthdateChange}
          age={store.age}
          handleAgeChange={store.handleAgeChange}
          newGrowthStage={store.newGrowthStage}
          setNewGrowthStage={store.setNewGrowthStage}
          height={store.height}
          setHeight={store.setHeight}
          weight={store.weight}
          setWeight={store.setWeight}
          newLegColor={store.newLegColor}
          setNewLegColor={store.setNewLegColor}
          availableLegColors={store.availableLegColors}
          customLegColorNames={store.customLegColorNames}
          deleteCustomLegColor={store.deleteCustomLegColor}
          legColorQuery={store.legColorQuery}
          setLegColorQuery={store.setLegColorQuery}
          legColorOpen={store.legColorOpen}
          setLegColorOpen={store.setLegColorOpen}
          sireName={store.sireName}
          setSireName={store.setSireName}
          damName={store.damName}
          setDamName={store.setDamName}
          sirePct={store.sirePct}
          setSirePct={store.setSirePct}
          damPct={store.damPct}
          setDamPct={store.setDamPct}
          selectedImage={store.selectedImage}
          setSelectedImage={store.setSelectedImage}
          imagePreview={store.imagePreview}
          setImagePreview={store.setImagePreview}
          strainQuery={store.strainQuery}
          setStrainQuery={store.setStrainQuery}
          strainOpen={store.strainOpen}
          setStrainOpen={store.setStrainOpen}
          availableStrains={store.availableStrains}
          customStrainNames={store.customStrainNames}
          deleteCustomStrain={store.deleteCustomStrain}
          loading={store.loading}
          uploadingImage={store.uploadingImage}
          uploadingVideo={store.uploadingVideo}
          nextNodeId={store.nextNodeId}
          dataCompleteness={store.dataCompleteness}
          validationPassed={store.validationPassed}
          bloodlineVerified={store.bloodlineVerified}
          computedBloodlinePct={store.computedBloodlinePct}
          offspringGenInfo={store.offspringGenInfo}
          sireGenInfo={store.sireGenInfo}
          damGenInfo={store.damGenInfo}
          sireGen={store.sireGen}
          damGen={store.damGen}
          selectedFowlForMatch={store.selectedFowlForMatch}
          setSelectedFowlForMatch={store.setSelectedFowlForMatch}
          matchDate={store.matchDate}
          setMatchDate={store.setMatchDate}
          opponentName={store.opponentName}
          setOpponentName={store.setOpponentName}
          matchLocation={store.matchLocation}
          setMatchLocation={store.setMatchLocation}
          matchType={store.matchType}
          setMatchType={store.setMatchType}
          matchOutcome={store.matchOutcome}
          setMatchOutcome={store.setMatchOutcome}
          matchPostFight={store.matchPostFight}
          setMatchPostFight={store.setMatchPostFight}
          matchVideoFile={store.matchVideoFile}
          setMatchVideoFile={store.setMatchVideoFile}
          handleAddFowl={store.handleAddFowl}
          handleAddMatchRecord={store.handleAddMatchRecord}
          handleOpenEditModal={store.handleOpenEditModal}
          handleRestoreFowlOnly={store.handleRestoreFowlOnly}
          setSelectedFowlForDetails={store.setSelectedFowlForDetails}
          setSelectedFowlForArchive={store.setSelectedFowlForArchive}
          setSelectedFowlForDeceased={store.setSelectedFowlForDeceased}
          setPendingPermanentDelete={store.setPendingPermanentDelete}
        />
      )}
    </NavWrapper>
  );
}

export function MarketplacePageWrapper() {
  const store = useGaloTrack();
  return (
    <NavWrapper>
      {(navigate) => (
        <MarketplacePage
          fowls={store.fowls}
          search={store.search}
          setSearch={store.setSearch}
          debouncedSearch={store.debouncedSearch}
          setCurrentPage={(v: string) => navigate(v)}
          setProfilingSubTab={(v: string) => store.setProfilingSubTab(v as never)}
        />
      )}
    </NavWrapper>
  );
}

export function LineageDirectoryWrapper() {
  const store = useGaloTrack();
  return (
    <LineageDirectory
      fowls={store.fowls}
      matchHistory={store.matchHistory}
      pairingAnalytics={store.pairingAnalytics}
      search={store.search}
      setSearch={store.setSearch}
      debouncedSearch={store.debouncedSearch}
      setSelectedFowlForDetails={store.setSelectedFowlForDetails}
    />
  );
}

export function ModalsWrapper() {
  const store = useGaloTrack();
  return (
    <Modals
      selectedFowlForDetails={store.selectedFowlForDetails}
      setSelectedFowlForDetails={store.setSelectedFowlForDetails}
      selectedFowlForDeceased={store.selectedFowlForDeceased}
      setSelectedFowlForDeceased={store.setSelectedFowlForDeceased}
      handleMarkFowlDeceased={store.handleMarkFowlDeceased}
      deathReasonInput={store.deathReasonInput}
      setDeathReasonInput={store.setDeathReasonInput}
      selectedFowlForArchive={store.selectedFowlForArchive}
      setSelectedFowlForArchive={store.setSelectedFowlForArchive}
      handleArchiveFowlWithReason={store.handleArchiveFowlWithReason}
      archiveReasonInput={store.archiveReasonInput}
      setArchiveReasonInput={store.setArchiveReasonInput}
      pendingPermanentDelete={store.pendingPermanentDelete}
      setPendingPermanentDelete={store.setPendingPermanentDelete}
      handlePermanentDelete={store.handlePermanentDelete}
      permanentDeleting={store.permanentDeleting}
      editingFowl={store.editingFowl}
      setEditingFowl={store.setEditingFowl}
      handleUpdateFowl={store.handleUpdateFowl}
      showLogoutModal={store.showLogoutModal}
      setShowLogoutModal={store.setShowLogoutModal}
      handleLogout={store.handleLogout}
      showForgotPasswordModal={store.showForgotPasswordModal}
      setShowForgotPasswordModal={store.setShowForgotPasswordModal}
      handleSendResetLink={store.handleSendResetLink}
      forgotEmail={store.forgotEmail}
      setForgotEmail={store.setForgotEmail}
      forgotLoading={store.forgotLoading}
      forgotSent={store.forgotSent}
      forgotError={store.forgotError}
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
    />
  );
}
