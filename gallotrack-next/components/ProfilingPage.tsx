'use client';
import React, { useEffect, useRef } from 'react';
import RegistryPageHeader from '@/components/registry/RegistryPageHeader';
import RegistryFooterWave from '@/components/registry/RegistryFooterWave';
import ChickenIcon from '@/components/ChickenIcon';
import { useFowl } from '@/lib/contexts/fowl-context';
import { useUI } from '@/lib/contexts/ui-context';
import { useAuthOptional } from '@/lib/contexts/auth-context';
import type { ProfilingSubTab } from '@/lib/types';
import { useRouter } from 'next/navigation';
import EncodeForm from '@/components/profiling/EncodeForm';
import FowlLists from '@/components/profiling/FowlLists';
import MatchLogsView from '@/components/match/MatchLogsView';
import RegistryNav from '@/components/profiling/RegistryNav';

import BreedsPage from '@/app/(dashboard)/breeds/page';
import { useUrlTab } from '@/lib/hooks/use-url-tab';
import { useBreedsView } from '@/lib/hooks/use-breeds-view';
import { REGISTRY_TABS } from '@/lib/nav-manifest';
import { toastMessage } from '@/lib/toast-bus';
import { SIRE_MATERIAL_MOVED_MESSAGE } from '@/lib/registry-labels';
import { useT } from '@/lib/i18n';

export default function ProfilingPage() {
  const { t } = useT();
  const fowl = useFowl();
  const ui = useUI();
  const router = useRouter();

  const {
    fowls,
    registrationType,
    setRegistrationType,
    registryLists,
    registryCounts,
    matchHistory,
    newName,
    setNewName,
    newBreed,
    setNewBreed,
    newGender,
    setNewGender,
    newColor,
    setNewColor,
    newBehaviorTrait,
    setNewBehaviorTrait,
    newBirthdate,
    handleNewBirthdateChange,
    age,
    handleAgeChange,
    newGrowthStage,
    setNewGrowthStage,
    height,
    setHeight,
    weight,
    setWeight,
    newLegColor,
    setNewLegColor,
    availableLegColors,
    customLegColorNames,
    deleteCustomLegColor,
    legColorQuery,
    setLegColorQuery,
    legColorOpen,
    setLegColorOpen,
    sireName,
    setSireName,
    damName,
    setDamName,
    birdCode,
    setBirdCode,
    suggestedBirdCode,
    previewBloodlineStats,
    wingBand,
    setWingBand,
    newDeclaredComposition,
    setNewDeclaredComposition,
    selectedImage,
    setSelectedImage,
    imagePreview,
    setImagePreview,
    strainQuery,
    setStrainQuery,
    strainOpen,
    setStrainOpen,
    availableStrains,
    customStrainNames,
    deleteCustomStrain,
    selectedStrains,
    addStrain,
    removeStrain,
    refreshStrains,
    loading,
    uploadingImage,
    nextNodeId,
    dataCompleteness,
    validationPassed,
    bloodlineVerified,
    computedBloodlinePct,
    offspringGenInfo,
    sireGenInfo,
    damGenInfo,
    sireGen,
    damGen,
    handleAddFowl,
    handleOpenEditModal,
    handleSetActiveStatus,

    generationPurity,
    autoCalcAge,
    getAutoCalcAge,
    saveCreateDraft,
    restoreCreateDraft,
    clearCreateDraft,
    resetCreateForm,
    saveEditDraft,
    selectCreatedBreed,
  } = fowl;

  const profilingSubTab = ui.profilingSubTab;
  const setProfilingSubTab = ui.setProfilingSubTab;
  const { breedsViewOpen, openBreeds, closeBreeds } = useBreedsView();
  const auth = useAuthOptional();
  const canCreateBreeds = !auth
    || !auth.authChecked
    || (Boolean(auth.currentUserId) && auth.userActive);

  // Handle redirect from legacy ?tab=sire-material or ?tab=sireMaterial
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const rawTab = params.get('tab');
    if (rawTab === 'sire-material' || rawTab === 'sireMaterial') {
      params.set('tab', 'offspring');
      params.set('class', 'breeding-stock');
      const newSearch = params.toString();
      window.history.replaceState(null, '', `${window.location.pathname}?${newSearch}`);
      toastMessage(SIRE_MATERIAL_MOVED_MESSAGE, 'info');
    }
  }, []);

  // URL-driven sub-tab: ?tab=<REGISTRY_TABS>. Opening a shareable link with a
  // valid tab applies it (clean navigations keep whatever navigate(page,
  // subTab) already set); any later change is written back to the URL.
  const [urlTab, setUrlTab, urlTabMeta] = useUrlTab<ProfilingSubTab>({
    param: 'tab',
    values: REGISTRY_TABS,
    defaultValue: 'form',
    aliases: {
      'sire-material': 'offspring',
      sireMaterial: 'offspring',
    },
  });
  const prevUrlSyncTabRef = useRef(profilingSubTab);
  const mountUrlAppliedRef = useRef(false);
  useEffect(() => {
    // Apply URL -> state only for shareable links at mount and for back/forward.
    // User-driven changes (change === 'user') write the URL via the effect below;
    // re-applying them here ping-pongs the two setters into an infinite
    // update loop ("Maximum update depth exceeded") that unmounts the page.
    if (urlTabMeta.change === 'popstate') {
      if (urlTab !== profilingSubTab) setProfilingSubTab(urlTab);
      return;
    }
    if (
      urlTabMeta.change === 'mount'
      && urlTabMeta.paramPresent
      && !mountUrlAppliedRef.current
    ) {
      // The mount read stays 'mount' until the user changes the tab, so guard
      // it: otherwise a programmatic switch (save, cancel, return from Breeds)
      // snaps back to whatever ?tab= the user landed on.
      mountUrlAppliedRef.current = true;
      if (urlTab !== profilingSubTab) setProfilingSubTab(urlTab);
    }
  }, [urlTab, urlTabMeta, profilingSubTab, setProfilingSubTab]);
  useEffect(() => {
    if (prevUrlSyncTabRef.current === profilingSubTab) return;
    prevUrlSyncTabRef.current = profilingSubTab;
    if (profilingSubTab === urlTab) return;
    setUrlTab(profilingSubTab);
  }, [profilingSubTab, urlTab, setUrlTab]);

  const listTab =
    profilingSubTab === 'males' ||
    profilingSubTab === 'females' ||
    profilingSubTab === 'archived' ||
    profilingSubTab === 'deceased' ||
    profilingSubTab === 'offspring'
      ? profilingSubTab
      : null;

  const formViewActive = profilingSubTab === 'form' && !breedsViewOpen;
  const breedsFromForm = Boolean(ui.breedFlow)
    || Boolean(ui.editingFowl)
    || profilingSubTab === 'form';
  const breedsBackLabel = breedsFromForm
    ? t('registry.backToRegistration')
    : t('registry.backToRegistry');

  useEffect(() => {
    if (!breedsViewOpen && ui.breedFlow) ui.setBreedFlow(null);
  }, [breedsViewOpen, ui.breedFlow, ui.setBreedFlow]);

  const handleBackFromBreeds = () => {
    ui.setBreedFlow(null);
    closeBreeds();
  };

  const handleAddBreedsFromForm = () => {
    saveCreateDraft();
    ui.setBreedFlow({ target: { kind: 'create' }, autoOpenAddForm: true });
    openBreeds();
  };

  const handleOpenBreedsHeader = () => {
    if (breedsViewOpen) {
      handleBackFromBreeds();
      return;
    }
    if (ui.editingFowl) saveEditDraft(ui.editingFowl.id);
    else if (profilingSubTab === 'form') saveCreateDraft();
    ui.setBreedFlow(null);
    openBreeds();
  };

  const handleBreedCreated = (name: string) => {
    const flow = ui.breedFlow;
    if (!flow) return;

    let selected = false;
    if (flow.target.kind === 'create') {
      selectCreatedBreed(flow.target, name);
      selected = true;
    } else if (
      ui.editingFowl
      && String(ui.editingFowl.id) === String(flow.target.fowlId)
    ) {
      selectCreatedBreed(flow.target, name);
      selected = true;
    }

    toastMessage(
      selected
        ? t('registry.breedAddedSelected')
        : t('registry.breedCreated', { name }),
      'success',
    );
    ui.setBreedFlow(null);
    closeBreeds();
  };

  const handleCancelRegistration = () => {
    clearCreateDraft();
    resetCreateForm();
    ui.setBreedFlow(null);
    setProfilingSubTab('males');
  };

  const selectProfilingTab = (tab: ProfilingSubTab) => {
    if (breedsViewOpen) handleBackFromBreeds();
    setProfilingSubTab(tab);
  };

  return (
    <div className="animate-fadeIn space-y-5 pb-24 md:pb-6">
      <RegistryPageHeader
        onOpenBreeds={handleOpenBreedsHeader}
        onRegister={() => selectProfilingTab(formViewActive ? 'males' : 'form')}
        registerActive={formViewActive}
      />

      <div className="relative z-10 -mt-2 px-1 sm:px-2">
        <RegistryNav
          currentTab={profilingSubTab}
          onSelectTab={selectProfilingTab}
          counts={{
            males: registryCounts.breedingMales,
            females: registryCounts.breedingFemales,
            offspring: registryCounts.nonBreeding,
            sireMaterial: registryCounts.sireMaterial,
          }}
        />
      </div>

      {!breedsViewOpen && profilingSubTab === 'form' && (
        <EncodeForm
          fowls={fowls}
          registrationType={registrationType}
          setRegistrationType={setRegistrationType}
          onAddBreeds={handleAddBreedsFromForm}
          canCreateBreed={canCreateBreeds}
          restoreDraft={restoreCreateDraft}
          onCancel={handleCancelRegistration}
          newName={newName}
          setNewName={setNewName}
          newBreed={newBreed}
          setNewBreed={setNewBreed}
          newGender={newGender}
          setNewGender={setNewGender}
          newColor={newColor}
          setNewColor={setNewColor}
          newBehaviorTrait={newBehaviorTrait}
          setNewBehaviorTrait={setNewBehaviorTrait}
          newBirthdate={newBirthdate}
          handleNewBirthdateChange={handleNewBirthdateChange}
          age={age}
          handleAgeChange={handleAgeChange}
          newGrowthStage={newGrowthStage}
          setNewGrowthStage={setNewGrowthStage}
          height={height}
          setHeight={setHeight}
          weight={weight}
          setWeight={setWeight}
          newLegColor={newLegColor}
          setNewLegColor={setNewLegColor}
          availableLegColors={availableLegColors}
          customLegColorNames={customLegColorNames}
          deleteCustomLegColor={deleteCustomLegColor}
          legColorQuery={legColorQuery}
          setLegColorQuery={setLegColorQuery}
          legColorOpen={legColorOpen}
          setLegColorOpen={setLegColorOpen}
          sireName={sireName}
          setSireName={setSireName}
          damName={damName}
          setDamName={setDamName}
          birdCode={birdCode}
          setBirdCode={setBirdCode}
          wingBand={wingBand}
          setWingBand={setWingBand}
          newDeclaredComposition={newDeclaredComposition}
          setNewDeclaredComposition={setNewDeclaredComposition}
          suggestedBirdCode={suggestedBirdCode}
          previewBloodlineStats={previewBloodlineStats}
          selectedImage={selectedImage}
          setSelectedImage={setSelectedImage}
          imagePreview={imagePreview}
          setImagePreview={setImagePreview}
          strainQuery={strainQuery}
          setStrainQuery={setStrainQuery}
          strainOpen={strainOpen}
          setStrainOpen={setStrainOpen}
          availableStrains={availableStrains}
          selectedStrains={selectedStrains}
          addStrain={addStrain}
          removeStrain={removeStrain}
          refreshStrains={refreshStrains}
          loading={loading}
          uploadingImage={uploadingImage}
          nextNodeId={nextNodeId}
          dataCompleteness={dataCompleteness}
          validationPassed={validationPassed}
          bloodlineVerified={bloodlineVerified}
          computedBloodlinePct={computedBloodlinePct}
          offspringGenInfo={offspringGenInfo}
          sireGenInfo={sireGenInfo}
          damGenInfo={damGenInfo}
          sireGen={sireGen}
          damGen={damGen}
          generationPurity={generationPurity}
          handleAddFowl={handleAddFowl}
          autoCalcAge={autoCalcAge}
          getAutoCalcAge={getAutoCalcAge}
        />
      )}

      {!breedsViewOpen && listTab && (
        <FowlLists
          tab={listTab}
          fowls={fowls}
          matchHistory={matchHistory}
          loading={loading}
          query={ui.registrySearch}
          setQuery={ui.setRegistrySearch}
          sortKey={ui.registrySortBy[listTab] ?? 'identifier'}
          onSortChange={(k) => ui.setRegistrySort(listTab, k)}
          setProfilingSubTab={setProfilingSubTab}
          onGoToInventory={() => router.push('/catalog')}
          handleOpenEditModal={handleOpenEditModal}
          handleSetActiveStatus={handleSetActiveStatus}
          setSelectedFowlForDetails={ui.setSelectedFowlForDetails}
          setSelectedFowlForArchive={ui.setSelectedFowlForArchive}
          setSelectedFowlForDeceased={ui.setSelectedFowlForDeceased}
        />
      )}

      {!breedsViewOpen && profilingSubTab === 'matchForm' && <MatchLogsView />}

      {breedsViewOpen && (
        <BreedsPage
          onBack={handleBackFromBreeds}
          backLabel={breedsBackLabel}
          autoOpenAddForm={Boolean(ui.breedFlow?.autoOpenAddForm)}
          canCreate={canCreateBreeds}
          onBreedCreated={ui.breedFlow ? handleBreedCreated : undefined}
        />
      )}

      <RegistryFooterWave />
    </div>
  );
}
