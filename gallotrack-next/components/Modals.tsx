'use client';
import React from 'react';
import type {
  FowlRecord,
  MatchRecord,
  SiblingRelation,
  AgeParts,
  MilestoneInfo,
  PairingAnalytics,
  ArchiveBadge,
} from '@/lib/types';
import FowlDetailsModal from './modals/FowlDetailsModal';
import DeceasedModal from './modals/DeceasedModal';
import ArchiveModal from './modals/ArchiveModal';
import PermanentDeleteModal from './modals/PermanentDeleteModal';
import EditFowlModal from './modals/EditFowlModal';
import LogoutModal from './modals/LogoutModal';
import ForgotPasswordModal from './modals/ForgotPasswordModal';
import PerFowlBreakdownModal from './modals/PerFowlBreakdownModal';

type ModalsProps = {
  selectedFowlForDetails: FowlRecord | null;
  setSelectedFowlForDetails: (f: FowlRecord | null) => void;

  selectedFowlForDeceased: FowlRecord | null;
  setSelectedFowlForDeceased: (f: FowlRecord | null) => void;
  handleMarkFowlDeceased: () => void;
  deathReasonInput: string;
  setDeathReasonInput: (v: string) => void;

  selectedFowlForArchive: FowlRecord | null;
  setSelectedFowlForArchive: (f: FowlRecord | null) => void;
  handleArchiveFowlWithReason: () => void;
  archiveReasonInput: string;
  setArchiveReasonInput: (v: string) => void;

  pendingPermanentDelete: FowlRecord | null;
  setPendingPermanentDelete: (f: FowlRecord | null) => void;
  handlePermanentDelete: () => void;
  permanentDeleting: boolean;

  editingFowl: FowlRecord | null;
  setEditingFowl: (f: FowlRecord | null) => void;
  handleUpdateFowl: (e: React.FormEvent) => void;

  showLogoutModal: boolean;
  setShowLogoutModal: (v: boolean) => void;
  handleLogout: () => void;

  showForgotPasswordModal: boolean;
  setShowForgotPasswordModal: (v: boolean) => void;
  handleSendResetLink: (e: React.FormEvent) => void;
  forgotEmail: string;
  setForgotEmail: (v: string) => void;
  forgotLoading: boolean;
  forgotSent: boolean;
  forgotError: string;

  matchHistory: MatchRecord[];
  loading: boolean;

  getAgeParts: (birthdate: string) => AgeParts | null;
  getAgeLabel: (parts: AgeParts) => string;
  getAgeExact: (parts: AgeParts) => string;
  getAgeMetrics: (parts: AgeParts) => string;
  generationOf: (f: FowlRecord) => number;
  generationPurity: (gen: number) => number;
  generationInfo: (gen: number) => { short: string; label: string; desc: string; tone: string };
  bloodlineOf: (f: FowlRecord) => number;
  cleanPct: (v: unknown) => number;
  getSiblingRelations: (f: FowlRecord) => SiblingRelation[];
  getMilestoneInfo: (birthdate: string, gender: string) => MilestoneInfo | null;
  getArchiveBadgeStyle: (reason: string) => ArchiveBadge;
  autoComputeGrowthStage: (ageMonths: number, gender: string) => string;

  fowls: FowlRecord[];
  pairingAnalytics: PairingAnalytics;
  availableStrains: string[];
  customStrainNames: Set<string>;
  deleteCustomStrain: (name: string) => Promise<void>;

  editName: string;
  setEditName: (v: string) => void;
  editBreed: string;
  setEditBreed: (v: string) => void;
  editGender: string;
  setEditGender: (v: string) => void;
  editColorCategory: string;
  setEditColorCategory: (v: string) => void;
  editColor: string;
  setEditColor: (v: string) => void;
  editBehaviorTrait: string;
  setEditBehaviorTrait: (v: string) => void;
  editEyeVariant: string;
  setEditEyeVariant: (v: string) => void;
  editAge: string;
  setEditAge: (v: string) => void;
  editBirthdate: string;
  setEditBirthdate: (v: string) => void;
  editGrowthStage: string;
  setEditGrowthStage: (v: string) => void;
  editWeight: string;
  setEditWeight: (v: string) => void;
  editHeight: string;
  setEditHeight: (v: string) => void;
  editLegColor: string;
  setEditLegColor: (v: string) => void;
  availableLegColors: string[];
  customLegColorNames: Set<string>;
  deleteCustomLegColor: (name: string) => Promise<void>;
  editSire: string;
  setEditSire: (v: string) => void;
  editDam: string;
  setEditDam: (v: string) => void;
  editSirePct: number | string;
  setEditSirePct: (v: number | string) => void;
  editDamPct: number | string;
  setEditDamPct: (v: number | string) => void;

  handleEditBirthdateChange: (val: string) => void;
  handleEditAgeChange: (val: string) => void;

  showPerFowlBreakdownModal: boolean;
  setShowPerFowlBreakdownModal: (v: boolean) => void;
};

export default function Modals(props: ModalsProps) {
  return (
    <>
      <FowlDetailsModal
        selectedFowlForDetails={props.selectedFowlForDetails}
        setSelectedFowlForDetails={props.setSelectedFowlForDetails}
        matchHistory={props.matchHistory}
        fowls={props.fowls}
        getAgeParts={props.getAgeParts}
        getAgeLabel={props.getAgeLabel}
        getAgeExact={props.getAgeExact}
        getAgeMetrics={props.getAgeMetrics}
        generationOf={props.generationOf}
        generationPurity={props.generationPurity}
        generationInfo={props.generationInfo}
        bloodlineOf={props.bloodlineOf}
        cleanPct={props.cleanPct}
        getSiblingRelations={props.getSiblingRelations}
        getMilestoneInfo={props.getMilestoneInfo}
        getArchiveBadgeStyle={props.getArchiveBadgeStyle}
        pairingAnalytics={props.pairingAnalytics}
      />

      <DeceasedModal
        selectedFowlForDeceased={props.selectedFowlForDeceased}
        setSelectedFowlForDeceased={props.setSelectedFowlForDeceased}
        handleMarkFowlDeceased={props.handleMarkFowlDeceased}
        deathReasonInput={props.deathReasonInput}
        setDeathReasonInput={props.setDeathReasonInput}
        loading={props.loading}
      />

      <ArchiveModal
        selectedFowlForArchive={props.selectedFowlForArchive}
        setSelectedFowlForArchive={props.setSelectedFowlForArchive}
        handleArchiveFowlWithReason={props.handleArchiveFowlWithReason}
        archiveReasonInput={props.archiveReasonInput}
        setArchiveReasonInput={props.setArchiveReasonInput}
        loading={props.loading}
      />

      <PermanentDeleteModal
        pendingPermanentDelete={props.pendingPermanentDelete}
        setPendingPermanentDelete={props.setPendingPermanentDelete}
        handlePermanentDelete={props.handlePermanentDelete}
        permanentDeleting={props.permanentDeleting}
      />

      <EditFowlModal
        editingFowl={props.editingFowl}
        setEditingFowl={props.setEditingFowl}
        handleUpdateFowl={props.handleUpdateFowl}
        loading={props.loading}
        fowls={props.fowls}
        availableStrains={props.availableStrains}
        customStrainNames={props.customStrainNames}
        deleteCustomStrain={props.deleteCustomStrain}
        editName={props.editName}
        setEditName={props.setEditName}
        editBreed={props.editBreed}
        setEditBreed={props.setEditBreed}
        editGender={props.editGender}
        setEditGender={props.setEditGender}
        editColorCategory={props.editColorCategory}
        setEditColorCategory={props.setEditColorCategory}
        editColor={props.editColor}
        setEditColor={props.setEditColor}
        editBehaviorTrait={props.editBehaviorTrait}
        setEditBehaviorTrait={props.setEditBehaviorTrait}
        editEyeVariant={props.editEyeVariant}
        setEditEyeVariant={props.setEditEyeVariant}
        editAge={props.editAge}
        setEditAge={props.setEditAge}
        editBirthdate={props.editBirthdate}
        setEditBirthdate={props.setEditBirthdate}
        editGrowthStage={props.editGrowthStage}
        setEditGrowthStage={props.setEditGrowthStage}
        editWeight={props.editWeight}
        setEditWeight={props.setEditWeight}
        editHeight={props.editHeight}
        setEditHeight={props.setEditHeight}
        editLegColor={props.editLegColor}
        setEditLegColor={props.setEditLegColor}
        availableLegColors={props.availableLegColors}
        customLegColorNames={props.customLegColorNames}
        deleteCustomLegColor={props.deleteCustomLegColor}
        editSire={props.editSire}
        setEditSire={props.setEditSire}
        editDam={props.editDam}
        setEditDam={props.setEditDam}
        editSirePct={props.editSirePct}
        setEditSirePct={props.setEditSirePct}
        editDamPct={props.editDamPct}
        setEditDamPct={props.setEditDamPct}
        handleEditBirthdateChange={props.handleEditBirthdateChange}
        handleEditAgeChange={props.handleEditAgeChange}
        autoComputeGrowthStage={props.autoComputeGrowthStage}
        getAgeParts={props.getAgeParts}
        getAgeLabel={props.getAgeLabel}
        getAgeMetrics={props.getAgeMetrics}
        generationOf={props.generationOf}
        generationPurity={props.generationPurity}
      />

      <LogoutModal
        showLogoutModal={props.showLogoutModal}
        setShowLogoutModal={props.setShowLogoutModal}
        handleLogout={props.handleLogout}
      />

      <ForgotPasswordModal
        showForgotPasswordModal={props.showForgotPasswordModal}
        setShowForgotPasswordModal={props.setShowForgotPasswordModal}
        handleSendResetLink={props.handleSendResetLink}
        forgotEmail={props.forgotEmail}
        setForgotEmail={props.setForgotEmail}
        forgotLoading={props.forgotLoading}
        forgotSent={props.forgotSent}
        forgotError={props.forgotError}
      />

      <PerFowlBreakdownModal
        show={props.showPerFowlBreakdownModal}
        onClose={() => props.setShowPerFowlBreakdownModal(false)}
        fowls={props.fowls}
        matchHistory={props.matchHistory}
      />
    </>
  );
}
