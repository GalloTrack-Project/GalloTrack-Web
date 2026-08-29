'use client';
import React from 'react';
import type { FowlRecord, MatchRecord, ProfilingSubTab } from '@/lib/types';
import EncodeForm from '@/components/profiling/EncodeForm';
import FowlLists from '@/components/profiling/FowlLists';
import MatchForm from '@/components/profiling/MatchForm';

type Props = {
  fowls: FowlRecord[];
  activeFowls: FowlRecord[];
  maleActiveFowls: FowlRecord[];
  femaleActiveFowls: FowlRecord[];
  archivedFowls: FowlRecord[];
  deceasedFowls: FowlRecord[];
  matchHistory: MatchRecord[];
  profilingSubTab: ProfilingSubTab;
  setProfilingSubTab: (tab: ProfilingSubTab) => void;
  newName: string;
  setNewName: (v: string) => void;
  newBreed: string;
  setNewBreed: (v: string) => void;
  newGender: string;
  setNewGender: (v: string) => void;
  newBirthdate: string;
  handleNewBirthdateChange: (val: string) => void;
  age: string;
  handleAgeChange: (val: string) => void;
  newGrowthStage: string;
  setNewGrowthStage: (v: string) => void;
  height: string;
  setHeight: (v: string) => void;
  weight: string;
  setWeight: (v: string) => void;
  newLegColor: string;
  setNewLegColor: (v: string) => void;
  availableLegColors: string[];
  customLegColorNames: Set<string>;
  deleteCustomLegColor: (name: string) => Promise<void>;
  legColorQuery: string;
  setLegColorQuery: (v: string) => void;
  legColorOpen: boolean;
  setLegColorOpen: (v: boolean | ((o: boolean) => boolean)) => void;
  sireName: string;
  setSireName: (v: string) => void;
  damName: string;
  setDamName: (v: string) => void;
  sirePct: number | string;
  setSirePct: (v: number | string) => void;
  damPct: number | string;
  setDamPct: (v: number | string) => void;
  selectedImage: File | null;
  setSelectedImage: (f: File | null) => void;
  imagePreview: string;
  setImagePreview: (v: string) => void;
  strainQuery: string;
  setStrainQuery: (v: string) => void;
  strainOpen: boolean;
  setStrainOpen: (v: boolean | ((o: boolean) => boolean)) => void;
  availableStrains: string[];
  customStrainNames: Set<string>;
  deleteCustomStrain: (name: string) => Promise<void>;
  loading: boolean;
  uploadingImage: boolean;
  uploadingVideo: boolean;
  nextNodeId: string;
  dataCompleteness: number;
  validationPassed: boolean;
  bloodlineVerified: boolean;
  computedBloodlinePct: number;
  offspringGenInfo: { short: string; label: string };
  sireGenInfo: { short: string; label: string };
  damGenInfo: { short: string; label: string };
  sireGen: number;
  damGen: number;
  selectedFowlForMatch: string;
  setSelectedFowlForMatch: (v: string) => void;
  matchDate: string;
  setMatchDate: (v: string) => void;
  opponentName: string;
  setOpponentName: (v: string) => void;
  matchLocation: string;
  setMatchLocation: (v: string) => void;
  matchType: string;
  setMatchType: (v: string) => void;
  matchOutcome: string;
  setMatchOutcome: (v: string) => void;
  matchPostFight: string;
  setMatchPostFight: (v: string) => void;
  matchVideoFile: File | null;
  setMatchVideoFile: (f: File | null) => void;
  handleAddFowl: (e: React.FormEvent) => void;
  handleAddMatchRecord: (e: React.FormEvent) => void;
  handleOpenEditModal: (fowl: FowlRecord) => void;
  handleRestoreFowlOnly: (id: number) => void;
  setSelectedFowlForDetails: (fowl: FowlRecord) => void;
  setSelectedFowlForArchive: (fowl: FowlRecord) => void;
  setSelectedFowlForDeceased: (fowl: FowlRecord) => void;
  setPendingPermanentDelete: (fowl: FowlRecord) => void;
};

import { generationPurity } from '@/lib/helpers';

export default function ProfilingPage({
  fowls,
  activeFowls: _activeFowls,
  maleActiveFowls,
  femaleActiveFowls,
  archivedFowls,
  deceasedFowls,
  matchHistory,
  profilingSubTab,
  setProfilingSubTab,
  newName, setNewName,
  newBreed, setNewBreed,
  newGender, setNewGender,
  newBirthdate, handleNewBirthdateChange,
  age, handleAgeChange,
  newGrowthStage, setNewGrowthStage,
  height, setHeight,
  weight, setWeight,
  newLegColor, setNewLegColor,
  availableLegColors,
  customLegColorNames,
  deleteCustomLegColor,
  legColorQuery, setLegColorQuery,
  legColorOpen, setLegColorOpen,
  sireName, setSireName,
  damName, setDamName,
  sirePct, setSirePct,
  damPct, setDamPct,
  selectedImage, setSelectedImage,
  imagePreview, setImagePreview,
  strainQuery, setStrainQuery,
  strainOpen, setStrainOpen,
  availableStrains,
  customStrainNames,
  deleteCustomStrain,
  loading,
  uploadingImage,
  uploadingVideo,
  nextNodeId, dataCompleteness,
  validationPassed, bloodlineVerified,
  computedBloodlinePct, offspringGenInfo,
  sireGenInfo, damGenInfo,
  sireGen, damGen,
  selectedFowlForMatch, setSelectedFowlForMatch,
  matchDate, setMatchDate,
  opponentName, setOpponentName,
  matchLocation, setMatchLocation,
  matchType, setMatchType,
  matchOutcome, setMatchOutcome,
  matchPostFight, setMatchPostFight,
  matchVideoFile, setMatchVideoFile,
  handleAddFowl,
  handleAddMatchRecord,
  handleOpenEditModal,
  handleRestoreFowlOnly,
  setSelectedFowlForDetails,
  setSelectedFowlForArchive,
  setSelectedFowlForDeceased,
  setPendingPermanentDelete,
}: Props) {
  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="rounded-3xl border border-border bg-card/70 backdrop-blur-md p-6 flex flex-col gap-4">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-xl shrink-0 shadow-inner">🧬</div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-card-foreground tracking-tight">Profiling &amp; Lineage Core Matrix</h1>
            <p className="text-xs text-muted-foreground font-semibold mt-0.5">Encode specific traits to track ancestry weights and biological specifications</p>
          </div>
        </div>
        
        <div className="bg-muted/80 p-1 rounded-2xl flex flex-wrap sm:flex-nowrap w-full border border-border mt-1 shrink-0 gap-1">
          <button type="button" onClick={() => setProfilingSubTab('form')} className={`flex-1 min-w-[80px] py-2.5 text-[10px] sm:text-xs font-black rounded-xl transition-all duration-200 text-center cursor-pointer ${profilingSubTab === 'form' ? 'bg-emerald-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>📝 Encode</button>
          <button type="button" onClick={() => setProfilingSubTab('males')} className={`flex-1 min-w-[80px] py-2.5 text-[10px] sm:text-xs font-black rounded-xl transition-all duration-200 text-center cursor-pointer ${profilingSubTab === 'males' ? 'bg-gradient-to-r from-sky-600 to-sky-700 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>🐓 Rooster (Cock) ({maleActiveFowls.length})</button>
          <button type="button" onClick={() => setProfilingSubTab('females')} className={`flex-1 min-w-[80px] py-2.5 text-[10px] sm:text-xs font-black rounded-xl transition-all duration-200 text-center cursor-pointer ${profilingSubTab === 'females' ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>🐔 Hen (Pullet) ({femaleActiveFowls.length})</button>
          <button type="button" onClick={() => setProfilingSubTab('archived')} className={`flex-1 min-w-[80px] py-2.5 text-[10px] sm:text-xs font-black rounded-xl transition-all duration-200 text-center cursor-pointer ${profilingSubTab === 'archived' ? 'bg-emerald-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>📦 Archived ({archivedFowls.length})</button>
          <button type="button" onClick={() => setProfilingSubTab('deceased')} className={`flex-1 min-w-[80px] py-2.5 text-[10px] sm:text-xs font-black rounded-xl transition-all duration-200 text-center cursor-pointer ${profilingSubTab === 'deceased' ? 'bg-emerald-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>💀 Deceased ({deceasedFowls.length})</button>
          <button type="button" onClick={() => setProfilingSubTab('matchForm')} className={`flex-1 min-w-[80px] py-2.5 text-[10px] sm:text-xs font-black rounded-xl transition-all duration-200 text-center cursor-pointer ${profilingSubTab === 'matchForm' ? 'bg-emerald-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>⚔️ Match Logs</button>
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
          customStrainNames={customStrainNames}
          deleteCustomStrain={deleteCustomStrain}
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
          setSelectedFowlForDetails={setSelectedFowlForDetails}
          setSelectedFowlForArchive={setSelectedFowlForArchive}
          setSelectedFowlForDeceased={setSelectedFowlForDeceased}
          setPendingPermanentDelete={setPendingPermanentDelete}
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
          matchLocation={matchLocation} setMatchLocation={setMatchLocation}
          matchType={matchType} setMatchType={setMatchType}
          matchOutcome={matchOutcome} setMatchOutcome={setMatchOutcome}
          matchPostFight={matchPostFight} setMatchPostFight={setMatchPostFight}
          matchVideoFile={matchVideoFile} setMatchVideoFile={setMatchVideoFile}
          handleAddMatchRecord={handleAddMatchRecord}
        />
      )}
    </div>
  );
}
