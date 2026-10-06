'use client';
import React from 'react';
import { Archive, Skull, Dna, Shield, Egg, Plus } from 'lucide-react';
import ChickenIcon from '@/components/ChickenIcon';
import { useFowl } from '@/lib/contexts/fowl-context';
import { useUI } from '@/lib/contexts/ui-context';
import { useRouter } from 'next/navigation';
import EncodeForm from '@/components/profiling/EncodeForm';
import FowlLists from '@/components/profiling/FowlLists';
import MatchForm from '@/components/profiling/MatchForm';
import RegistryNav from '@/components/profiling/RegistryNav';
import BreedsPage from '@/app/(dashboard)/breeds/page';

export default function ProfilingPage() {
  const fowl = useFowl();
  const ui = useUI();
  const router = useRouter();

  const {
    fowls, activeFowls, sireMaterialFowls, maleActiveFowls, femaleActiveFowls, archivedFowls, deceasedFowls,
    matchHistory,
    newName, setNewName, newBreed, setNewBreed, newGender, setNewGender,
    newBirthdate, handleNewBirthdateChange,
    age, handleAgeChange,
    newGrowthStage, setNewGrowthStage,
    height, setHeight, weight, setWeight,
    newLegColor, setNewLegColor,
    availableLegColors, customLegColorNames, deleteCustomLegColor,
    legColorQuery, setLegColorQuery, legColorOpen, setLegColorOpen,
    sireName, setSireName, damName, setDamName,
    birdCode, setBirdCode, suggestedBirdCode, previewBloodlineStats,
    wingBand, setWingBand,
    selectedImage, setSelectedImage, imagePreview, setImagePreview,
    strainQuery, setStrainQuery, strainOpen, setStrainOpen,
    availableStrains, customStrainNames, deleteCustomStrain,
    selectedStrains, addStrain, removeStrain,
    loading, uploadingImage, uploadingVideo,
    nextNodeId, dataCompleteness, validationPassed, bloodlineVerified,
    computedBloodlinePct, offspringGenInfo, sireGenInfo, damGenInfo, sireGen, damGen,
    selectedFowlForMatch, setSelectedFowlForMatch,
    matchDate, setMatchDate,
    opponentName, setOpponentName, opponentBreed, setOpponentBreed,
    opponentBloodline, setOpponentBloodline, opponentHatch, setOpponentHatch,
    opponentPhoto, setOpponentPhoto,
    matchLocation, setMatchLocation,
    matchOutcome, setMatchOutcome, matchPostFight, setMatchPostFight,
    matchVideoFiles, setMatchVideoFiles, matchPhotoFiles, setMatchPhotoFiles,
    cockCount, setCockCount, ageCategory, setAgeCategory, eventType, setEventType,
    matchType, setMatchType, matchSide, setMatchSide, matchNotes, setMatchNotes,
    handleAddFowl, handleAddMatchRecord,
    handleOpenEditModal, handleRestoreFowlOnly,
    handleSetActiveStatus,
    generationPurity,
    autoCalcAge,
    getAutoCalcAge,
  } = fowl;

  const profilingSubTab = ui.profilingSubTab;
  const setProfilingSubTab = ui.setProfilingSubTab;

  const parentNames = new Set([...maleActiveFowls, ...femaleActiveFowls, ...sireMaterialFowls].map((p) => p.name));
  const offspringList = fowls
    .filter((f) => (f.sire && parentNames.has(f.sire)) || (f.dam && parentNames.has(f.dam)))
    .sort((a, b) => a.id - b.id);

  const listTab =
    profilingSubTab === 'males' || profilingSubTab === 'females' || profilingSubTab === 'archived' || profilingSubTab === 'deceased' || profilingSubTab === 'sireMaterial' || profilingSubTab === 'offspring'
      ? profilingSubTab
      : null;

  return (
    <div className="space-y-5 animate-fadeIn pb-24 md:pb-6">
      <div className="rounded-lg border border-border bg-card/70 p-6 sm:p-7 flex flex-col gap-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <div className="w-11 h-11 rounded-md bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-inner">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-success"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-black text-card-foreground tracking-tight">Chicken Registry</h1>
              <p className="text-sm text-muted-foreground font-semibold mt-0.5">Register and manage your chicken lineage, traits, and match records</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0 self-stretch sm:self-start">
            <button
              type="button"
              onClick={() => setProfilingSubTab(profilingSubTab === 'breeds' ? 'males' : 'breeds')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-md text-xs sm:text-sm font-bold transition-colors duration-200 whitespace-nowrap cursor-pointer ${
                profilingSubTab === 'breeds'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-muted border border-border text-muted-foreground hover:text-success hover:border-emerald-500/50'
              }`}
            >
              <Dna className="w-4 h-4" />
              <span>Breeds</span>
            </button>
            <button
              type="button"
              onClick={() => setProfilingSubTab(profilingSubTab === 'form' ? 'males' : 'form')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer shadow-sm whitespace-nowrap ${
                profilingSubTab === 'form'
                  ? 'bg-slate-700 hover:bg-slate-800 text-white ring-1 ring-slate-600'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>{profilingSubTab === 'form' ? 'View Registry' : '+ Register Chicken'}</span>
            </button>
          </div>
        </div>

        <RegistryNav
          currentTab={profilingSubTab}
          onSelectTab={setProfilingSubTab}
          counts={{
            males: maleActiveFowls.length,
            females: femaleActiveFowls.length,
            offspring: offspringList.length,
            sireMaterial: sireMaterialFowls.length,
          }}
        />
      </div>

      {profilingSubTab === 'form' && (
        <EncodeForm
          fowls={fowls}
          newName={newName} setNewName={setNewName}
          newBreed={newBreed} setNewBreed={setNewBreed}
          newGender={newGender} setNewGender={setNewGender}
          newBirthdate={newBirthdate} handleNewBirthdateChange={handleNewBirthdateChange}
          age={age} handleAgeChange={handleAgeChange}
          newGrowthStage={newGrowthStage} setNewGrowthStage={setNewGrowthStage}
          height={height} setHeight={setHeight}
          weight={weight} setWeight={setWeight}
          newLegColor={newLegColor} setNewLegColor={setNewLegColor}
          availableLegColors={availableLegColors}
          customLegColorNames={customLegColorNames}
          deleteCustomLegColor={deleteCustomLegColor}
          legColorQuery={legColorQuery} setLegColorQuery={setLegColorQuery}
          legColorOpen={legColorOpen} setLegColorOpen={setLegColorOpen}
          sireName={sireName} setSireName={setSireName}
          damName={damName} setDamName={setDamName}
          birdCode={birdCode} setBirdCode={setBirdCode}
          wingBand={wingBand} setWingBand={setWingBand}
          suggestedBirdCode={suggestedBirdCode}
          previewBloodlineStats={previewBloodlineStats}
          selectedImage={selectedImage} setSelectedImage={setSelectedImage}
          imagePreview={imagePreview} setImagePreview={setImagePreview}
          strainQuery={strainQuery} setStrainQuery={setStrainQuery}
          strainOpen={strainOpen} setStrainOpen={setStrainOpen}
          availableStrains={availableStrains}
          selectedStrains={selectedStrains}
          addStrain={addStrain}
          removeStrain={removeStrain}
          loading={loading} uploadingImage={uploadingImage}
          nextNodeId={nextNodeId} dataCompleteness={dataCompleteness}
          validationPassed={validationPassed} bloodlineVerified={bloodlineVerified}
          computedBloodlinePct={computedBloodlinePct} offspringGenInfo={offspringGenInfo}
          sireGenInfo={sireGenInfo} damGenInfo={damGenInfo}
          sireGen={sireGen} damGen={damGen}
          generationPurity={generationPurity}
          handleAddFowl={handleAddFowl}
          autoCalcAge={autoCalcAge}
          getAutoCalcAge={getAutoCalcAge}
        />
      )}

      {listTab && (
        <FowlLists
          tab={listTab}
          offspringFowls={offspringList}
          fowls={fowls}
          maleActiveFowls={maleActiveFowls}
          femaleActiveFowls={femaleActiveFowls}
          archivedFowls={archivedFowls}
          deceasedFowls={deceasedFowls}
          sireMaterialFowls={sireMaterialFowls}
          matchHistory={matchHistory}
          loading={loading}
          setProfilingSubTab={setProfilingSubTab}
          handleOpenEditModal={handleOpenEditModal}
          handleRestoreFowlOnly={handleRestoreFowlOnly}
          handleSetActiveStatus={handleSetActiveStatus}
          setSelectedFowlForDetails={ui.setSelectedFowlForDetails}
          setSelectedFowlForArchive={ui.setSelectedFowlForArchive}
          setSelectedFowlForDeceased={ui.setSelectedFowlForDeceased}
          setPendingPermanentDelete={ui.setPendingPermanentDelete}
        />
      )}

      {profilingSubTab === 'matchForm' && (
        <MatchForm
          fowls={fowls}
          loading={loading}
          uploadingVideo={uploadingVideo}
          selectedFowlForMatch={selectedFowlForMatch} setSelectedFowlForMatch={setSelectedFowlForMatch}
          matchDate={matchDate} setMatchDate={setMatchDate}
          opponentName={opponentName} setOpponentName={setOpponentName}
          opponentBreed={opponentBreed} setOpponentBreed={setOpponentBreed}
          matchLocation={matchLocation} setMatchLocation={setMatchLocation}
          matchOutcome={matchOutcome} setMatchOutcome={setMatchOutcome}
          matchPostFight={matchPostFight} setMatchPostFight={setMatchPostFight}
          matchVideoFiles={matchVideoFiles} setMatchVideoFiles={setMatchVideoFiles}
          matchPhotoFiles={matchPhotoFiles} setMatchPhotoFiles={setMatchPhotoFiles}
          handleAddMatchRecord={handleAddMatchRecord}
          cockCount={cockCount} setCockCount={setCockCount}
          ageCategory={ageCategory} setAgeCategory={setAgeCategory}
          eventType={eventType} setEventType={setEventType}
          matchNotes={matchNotes} setMatchNotes={setMatchNotes}
        />
      )}

      {profilingSubTab === 'breeds' && (
        <BreedsPage />
      )}
    </div>
  );
}
