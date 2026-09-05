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
  sire_pct: number;
  dam_pct: number;
  bloodline_pct: number;
  status: string;
  death_reason?: string;
  death_date?: string;
  archive_reason?: string;
  archive_date?: string;
  image_url?: string;
  created_at?: string;
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
  outcome: string;
  status: string;
  video_url?: string;
  post_fight_condition?: string;
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

export type ProfilingSubTab = 'form' | 'males' | 'females' | 'archived' | 'deceased' | 'deleted' | 'match' | 'matchForm';

export type ToastState = {
  show: boolean;
  message: string;
  type: 'success' | 'error' | 'warning';
};

export type RolledMilestoneStage = DevelopmentStage & {
  date: Date;
  daysUntil: number;
};
