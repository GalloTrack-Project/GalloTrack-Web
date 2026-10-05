export interface FowlRecord {
  id: number;
  user_id?: string | number;
  name: string;
  breed: string;
  gender: string;
  color: string;
  color_category: string;
  growth_stage: string;
  behavior_trait: string;
  eye_variant: string;
  birthdate: string;
  age: string;
  weight: string;
  height: string;
  leg_color: string;
  sire: string;
  dam: string;
  /** Registry links to the sire/dam rows. Text columns above stay as display snapshots. */
  sire_id?: number | null;
  dam_id?: number | null;
  /** The `breeding_pairings` row this bird was produced by (auto-filled in the DB). */
  pairing_id?: number | null;
  sire_pct: number;
  dam_pct: number;
  bloodline_pct: number;
  /** Standardized tag, e.g. 1 (sire) / A (dam) / 1A1 (offspring, shown 1A₁). Nullable in the DB. */
  bird_code?: string | null;
  /** Physical wing band number — unique on-farm identifier stamped on the band. */
  wing_band?: string | null;
  /** Per-strain blood percentage breakdown, e.g. { Kelso: 50, Hatch: 25, Roundhead: 25 }. */
  bloodline_composition?: Record<string, number> | null;
  status: string;
  death_reason?: string;
  death_date?: string;
  archive_reason?: string;
  archive_date?: string;
  image_url?: string;
  created_at?: string;
  /** Free-text notes for the registry record. */
  notes?: string | null;
  /** Injury/health after a match (Fit / Recovered, Injured, ..., Deceased). Never drives breeding_role. */
  condition_status?: string;
  /** Breeding/material role - manual only: none | breeder | material. */
  breeding_role?: 'none' | 'breeder' | 'material';
  /** Active/inactive flag - archived or deceased birds are inactive. */
  activity_status?: 'active' | 'inactive';
  /** Structured archive reason: sold | transfer | inactive | retired | other. */
  archive_kind?: string | null;
  /** Which career ended for retired birds: fighting | breeding | both. */
  retired_scope?: string | null;
  /** Expected/actual return date for Transfer / Borrowed birds. */
  return_date?: string | null;
}

/** One append-only row in `fowl_status_history`. */
export interface StatusHistoryEntry {
  id: number;
  fowl_id: number;
  /** status | condition_status | breeding_role | activity_status | archive_kind | retired_scope */
  field: string;
  old_value?: string | null;
  new_value: string;
  reason?: string | null;
  note?: string | null;
  changed_at: string;
  changed_by?: string | null;
}

/** One editable list entry in `registry_options`. */
export interface RegistryOption {
  id?: number;
  user_id?: string | null;
  list_key: string;
  value: string;
  label: string;
  local_label?: string | null;
  sort_order?: number;
  is_default?: boolean;
  is_active?: boolean;
}

/** One row of pairing history (`breeding_pairings` table). */
export interface BreedingPairRecord {
  id: number;
  user_id?: string;
  /** Optional registry links — names/codes stay authoritative so history survives renames. */
  sire_id?: number | null;
  dam_id?: number | null;
  sire_name: string;
  dam_name: string;
  sire_code?: string | null;
  dam_code?: string | null;
  /** Auto: sire bird_code + dam bird_code (e.g. 1A). Unique per farm. */
  pairing_code?: string | null;
  /** Number of offspring recorded for this pair (maintained by a DB trigger). */
  offspring_seq?: number;
  pairing_date?: string | null;
  ended_date?: string | null;
  notes?: string | null;
  outcome: 'Active' | 'Completed' | 'Discontinued';
  created_at?: string;
  updated_at?: string;
}

/** One row of the health/safety log (`safety_incidents` table). */
export interface SafetyIncidentRecord {
  id: number;
  user_id?: string;
  fowl_id?: number | null;
  fowl_name: string;
  fowl_code?: string | null;
  incident_date: string;
  type: 'Injury' | 'Illness' | 'Accident' | 'Fight Wound' | 'Environmental';
  severity: 'Minor' | 'Moderate' | 'Severe' | 'Critical';
  status: 'Treated' | 'Monitoring' | 'Recovered' | 'Deceased';
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SiblingRelation {
  id: number;
  name: string;
  relation: 'Full Sibling' | 'Half-Sibling (Shared Sire)' | 'Half-Sibling (Shared Dam)';
  sharedSire: string;
  sharedDam: string;
}

export interface PairingStats {
  key: string;
  sire: string;
  dam: string;
  members: FowlRecord[];
  totalFights: number;
  wins: number;
  losses: number;
  draws: number;
  decided: number;
  winRate: number;
  resilienceScore: number;
  resilienceSample: number;
  casualties: number;
  critical: number;
  verdictConfidence: 'Low' | 'Medium' | 'High';
}

export interface MatchRecord {
  id: number;
  user_id?: string | number;
  date: string;
  entry_name: string;
  breed: string;
  opponent: string;
  opponent_breed?: string;
  location: string;
  type: string;
  derby_match_number?: number;
  outcome: string;
  status: string;
  video_url?: string;
  post_fight_condition?: string;
  side?: string | null;
  notes?: string | null;
  cock_count?: number;
  age_category?: string;
  event_type?: string;
}

export interface AgeParts {
  years: number;
  months: number;
  days: number;
  totalDays: number;
  totalWeeks: number;
  totalMonths: number;
}

export interface DevelopmentStage {
  id: string;
  stage: string;
  fromMonths: number;
  toMonths: number;
  icon: string;
  note: string;
}

export interface MilestoneInfo {
  parts: AgeParts;
  stages: DevelopmentStage[];
  current: DevelopmentStage | null;
  next: { stage: string; date: Date; daysUntil: number; id: string } | null;
}

export type ArchiveBadge = {
  label: string;
  bg: string;
};

export interface PairingAnalytics {
  all: Map<string, PairingStats>;
  ranked: PairingStats[];
}

export type PageId = 'login' | 'dashboard' | 'profiling' | 'marketplace' | 'lineage' | 'profile' | 'settings';

export type ProfilingSubTab = 'form' | 'males' | 'females' | 'archived' | 'deceased' | 'sireMaterial' | 'offspring' | 'match' | 'matchForm' | 'breeds';

export type RolledMilestoneStage = DevelopmentStage & {
  date: Date;
  daysUntil: number;
};
