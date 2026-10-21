'use client';
import React, { useEffect, useRef } from 'react';
import { Archive, Skull, Dna, Shield, Egg, Plus } from 'lucide-react';
import ChickenIcon from '@/components/ChickenIcon';
import { useFowl } from '@/lib/contexts/fowl-context';
import { useUI } from '@/lib/contexts/ui-context';
import type { ProfilingSubTab } from '@/lib/types';
import { useRouter } from 'next/navigation';
import EncodeForm from '@/components/profiling/EncodeForm';
import FowlLists from '@/components/profiling/FowlLists';
import MatchLogsView from '@/components/match/MatchLogsView';
import RegistryNav from '@/components/profiling/RegistryNav';

import BreedsPage from '@/app/(dashboard)/breeds/page';
import { useUrlTab } from '@/lib/hooks/use-url-tab';
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
  } = fowl;

  const profilingSubTab = ui.profilingSubTab;
  const setProfilingSubTab = ui.setProfilingSubTab;

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
  useEffect(() => {
    // Apply URL → state only for shareable links at mount and for back/forward.
    // User-driven changes (change === 'user') write the URL via the effect below;
    // re-applying them here ping-pongs the two setters into an infinite
    // update loop ("Maximum update depth exceeded") that unmounts the page.
    if (
      urlTabMeta.change === 'popstate' ||
      (urlTabMeta.change === 'mount' && urlTabMeta.paramPresent)
    ) {
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

  return (
    <div className="animate-fadeIn space-y-5 pb-24 md:pb-6">
      <div className="border-border bg-card/70 flex flex-col gap-5 rounded-lg border p-6 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-emerald-500/30 bg-emerald-500/15 shadow-inner">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-success"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-card-foreground text-xl font-black tracking-tight sm:text-2xl">
                {t('registry.title')}
              </h1>
              <p className="text-muted-foreground mt-0.5 text-sm font-semibold">
                {t('registry.subtitle')}
              </p>
            </div>
          </div>
          <div className="flex w-full min-w-0 items-stretch gap-2.5 sm:w-auto sm:shrink-0 sm:items-center sm:self-start">
            <button
              type="button"
              onClick={() => setProfilingSubTab(profilingSubTab === 'breeds' ? 'males' : 'breeds')}
              className={`flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-md px-3.5 py-2.5 text-center text-xs leading-tight font-bold transition-colors duration-200 sm:flex-initial sm:text-sm ${
                profilingSubTab === 'breeds'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-muted border-border text-muted-foreground hover:text-success border hover:border-emerald-500/50'
              }`}
            >
              <Dna className="h-4 w-4" />
              <span>{t('registry.breedsBtn')}</span>
            </button>
            <button
              type="button"
              onClick={() => setProfilingSubTab(profilingSubTab === 'form' ? 'males' : 'form')}
              className={`flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-md px-4 py-2.5 text-center text-xs leading-tight font-bold shadow-sm transition-all duration-200 sm:flex-initial sm:text-sm ${
                profilingSubTab === 'form'
                  ? 'bg-slate-700 text-white ring-1 ring-slate-600 hover:bg-slate-800'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              <Plus className="h-4 w-4" />
              <span>
                {profilingSubTab === 'form'
                  ? t('registry.viewRegistryBtn')
                  : t('registry.registerChickenBtn')}
              </span>
            </button>
          </div>
        </div>

        <RegistryNav
          currentTab={profilingSubTab}
          onSelectTab={setProfilingSubTab}
          counts={{
            males: registryCounts.breedingMales,
            females: registryCounts.breedingFemales,
            offspring: registryCounts.nonBreeding,
            sireMaterial: registryCounts.sireMaterial,
          }}
        />
      </div>

      {profilingSubTab === 'form' && (
        <EncodeForm
          fowls={fowls}
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

      {listTab && (
        <FowlLists
          tab={listTab}
          fowls={fowls}
          matchHistory={matchHistory}
          loading={loading}
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

      {profilingSubTab === 'matchForm' && <MatchLogsView />}

      {profilingSubTab === 'breeds' && <BreedsPage />}
    </div>
  );
}
