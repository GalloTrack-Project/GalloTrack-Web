'use client';
import React, { useCallback } from 'react';
import { Bird, Archive, Skull } from 'lucide-react';
import { useFowl } from '@/lib/contexts/fowl-context';
import { useUI } from '@/lib/contexts/ui-context';
import { useRouter } from 'next/navigation';
import EncodeForm from '@/components/profiling/EncodeForm';
import FowlLists from '@/components/profiling/FowlLists';
import MatchForm from '@/components/profiling/MatchForm';
import { findMatchingPartners, type PartnerSuggestion } from '@/lib/services/match-options-service';

export default function ProfilingPage() {
  const fowl = useFowl();
  const ui = useUI();
  const router = useRouter();

  const {
    fowls, activeFowls, maleActiveFowls, femaleActiveFowls, archivedFowls, deceasedFowls,
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
    sirePct, setSirePct, damPct, setDamPct,
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
    matchLocation, setMatchLocation, matchType, setMatchType,
    matchOutcome, setMatchOutcome, matchPostFight, setMatchPostFight,
    matchVideoFile, setMatchVideoFile,
    matchOption, setMatchOption, betType, setBetType,
    targetNumber, setTargetNumber, partnerEntry, setPartnerEntry,
    suggestedPartners, setSuggestedPartners,
    handleAddFowl, handleAddMatchRecord,
    handleOpenEditModal, handleRestoreFowlOnly,
    generationPurity,
  } = fowl;

  const profilingSubTab = ui.profilingSubTab;
  const setProfilingSubTab = ui.setProfilingSubTab;

  const handleFindPartners = useCallback(async (target: number, type: string) => {
    const { data: { user } } = await (await import('@/lib/registry')).supabase.auth.getUser();
    if (!user) return;
    const partners = await findMatchingPartners(target, type, user.id);
    setSuggestedPartners(partners);
  }, [setSuggestedPartners]);

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="rounded-3xl border border-border bg-card/70 backdrop-blur-md p-6 sm:p-7 flex flex-col gap-5">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-black text-card-foreground tracking-tight">Fowl Registry</h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-semibold mt-0.5">Register and manage your gamefowl lineage, traits, and match records</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-muted/60 p-1.5 rounded-2xl border border-border overflow-x-auto shrink-0">
          <button type="button" onClick={() => setProfilingSubTab('form')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all duration-200 whitespace-nowrap cursor-pointer ${profilingSubTab === 'form' ? 'bg-emerald-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            <span>Register</span>
          </button>
          <button type="button" onClick={() => setProfilingSubTab('males')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all duration-200 whitespace-nowrap cursor-pointer ${profilingSubTab === 'males' ? 'bg-sky-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'}`}>
            <Bird className="w-4 h-4" />
            <span>Roosters</span>
            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${profilingSubTab === 'males' ? 'bg-white/20' : 'bg-border text-muted-foreground'}`}>{maleActiveFowls.length}</span>
          </button>
          <button type="button" onClick={() => setProfilingSubTab('females')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all duration-200 whitespace-nowrap cursor-pointer ${profilingSubTab === 'females' ? 'bg-pink-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'}`}>
            <Bird className="w-4 h-4" />
            <span>Hens</span>
            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${profilingSubTab === 'females' ? 'bg-white/20' : 'bg-border text-muted-foreground'}`}>{femaleActiveFowls.length}</span>
          </button>
          <button type="button" onClick={() => setProfilingSubTab('archived')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all duration-200 whitespace-nowrap cursor-pointer ${profilingSubTab === 'archived' ? 'bg-amber-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'}`}>
            <Archive className="w-4 h-4" />
            <span>Archived</span>
            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${profilingSubTab === 'archived' ? 'bg-white/20' : 'bg-border text-muted-foreground'}`}>{archivedFowls.length}</span>
          </button>
          <button type="button" onClick={() => setProfilingSubTab('deceased')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all duration-200 whitespace-nowrap cursor-pointer ${profilingSubTab === 'deceased' ? 'bg-rose-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'}`}>
            <Skull className="w-4 h-4" />
            <span>Deceased</span>
            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${profilingSubTab === 'deceased' ? 'bg-white/20' : 'bg-border text-muted-foreground'}`}>{deceasedFowls.length}</span>
          </button>
          <div className="w-px h-6 bg-border shrink-0 mx-0.5"></div>
          <button type="button" onClick={() => setProfilingSubTab('matchForm')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all duration-200 whitespace-nowrap cursor-pointer ${profilingSubTab === 'matchForm' ? 'bg-emerald-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>
            <span>Match Logs</span>
          </button>
        </div>
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
          sirePct={sirePct} setSirePct={setSirePct}
          damPct={damPct} setDamPct={setDamPct}
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
        />
      )}

      {(profilingSubTab === 'males' || profilingSubTab === 'females' || profilingSubTab === 'archived' || profilingSubTab === 'deceased') && (
        <FowlLists
          tab={profilingSubTab}
          fowls={fowls}
          maleActiveFowls={maleActiveFowls}
          femaleActiveFowls={femaleActiveFowls}
          archivedFowls={archivedFowls}
          deceasedFowls={deceasedFowls}
          matchHistory={matchHistory}
          loading={loading}
          setProfilingSubTab={setProfilingSubTab}
          handleOpenEditModal={handleOpenEditModal}
          handleRestoreFowlOnly={handleRestoreFowlOnly}
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
          matchType={matchType} setMatchType={setMatchType}
          matchOutcome={matchOutcome} setMatchOutcome={setMatchOutcome}
          matchPostFight={matchPostFight} setMatchPostFight={setMatchPostFight}
          matchVideoFile={matchVideoFile} setMatchVideoFile={setMatchVideoFile}
          handleAddMatchRecord={handleAddMatchRecord}
          matchOption={matchOption} setMatchOption={setMatchOption}
          betType={betType} setBetType={setBetType}
          targetNumber={targetNumber} setTargetNumber={setTargetNumber}
          partnerEntry={partnerEntry} setPartnerEntry={setPartnerEntry}
          suggestedPartners={suggestedPartners} setSuggestedPartners={setSuggestedPartners}
          onFindPartners={handleFindPartners}
        />
      )}
    </div>
  );
}
