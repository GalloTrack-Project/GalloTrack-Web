'use client';

import React, { useEffect } from 'react';
import EncodeForm from '@/components/profiling/EncodeForm';
import { useFowl } from '@/lib/contexts/fowl-context';

type Props = {
  initialName: string;
  initialBreed: string;
  initialSex: string;
  historicalEntryName?: string;
  onCreated: (fowlId: number) => void;
};

/**
 * Reuses the one registration form. Prefills only the historical snapshot
 * fields and hands the new fowl id back so the match can be linked.
 */
export default function CreateChickenForMatch({
  initialName,
  initialBreed,
  initialSex,
  historicalEntryName,
  onCreated,
}: Props) {
  const {
    fowls,
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
    wingBand,
    setWingBand,
    newDeclaredComposition,
    setNewDeclaredComposition,
    selectedStrains,
    setSelectedStrains,
    suggestedBirdCode,
    previewBloodlineStats,
    selectedImage,
    setSelectedImage,
    imagePreview,
    setImagePreview,
    strainQuery,
    setStrainQuery,
    strainOpen,
    setStrainOpen,
    availableStrains,
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
    generationPurity,
    handleAddFowl,
    autoCalcAge,
    getAutoCalcAge,
  } = useFowl();

  useEffect(() => {
    setNewName(initialName);
    setNewGender(initialSex || 'Rooster');
    setNewBreed(initialBreed);
    setSelectedStrains(initialBreed ? [initialBreed] : []);
    setSireName('');
    setDamName('');
    setNewDeclaredComposition(null);
    // Prefill once per opened historical entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialName, initialBreed, initialSex]);

  return (
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
      handleAddFowl={(event) => handleAddFowl(event, { onCreated, historicalEntryName })}
      autoCalcAge={autoCalcAge}
      getAutoCalcAge={getAutoCalcAge}
    />
  );
}
