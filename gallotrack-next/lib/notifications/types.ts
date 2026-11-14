export type NotificationEventType = 'upcoming' | 'today' | 'reached';

export type NotificationStageKey = 'stag' | 'bull-stag' | 'cock';

export type NotificationAudience = 'both' | 'cocks' | 'hens';

export type MilestoneNotificationPreferences = {
  enabled: boolean;
  stages: Record<NotificationStageKey, boolean>;
  leadDays: number[];
  audience: NotificationAudience;
};

export type NotificationStateValue = {
  read_at: string | null;
  dismissed_at: string | null;
};

export type NotificationStateMap = Record<string, NotificationStateValue>;

export type MilestoneFowl = {
  id: number;
  name: string;
  bird_code?: string | null;
  chicken_code?: string | null;
  gender?: string | null;
  birthdate?: string | null;
  status?: string | null;
  activity_status?: string | null;
  archive_kind?: string | null;
  archive_reason?: string | null;
};

export type NotificationMember = {
  key: string;
  fowlId: number;
  fowlName: string;
  fowlCode: string;
  fowlInitials: string;
  gender: string;
  currentStage: string;
  stageKey: NotificationStageKey;
  stageLabel: string;
  targetDate: string;
  type: NotificationEventType;
  daysUntil: number;
  leadType: string;
  fullyMature: boolean;
  message: string;
};

export type DerivedMilestoneNotification = {
  key: string;
  type: NotificationEventType;
  stageKey: NotificationStageKey;
  stageLabel: string;
  fullyMature: boolean;
  targetDate: string;
  daysUntil: number;
  fowlId: number | null;
  fowlName: string;
  fowlCode: string;
  fowlInitials: string;
  message: string;
  isGroup: boolean;
  groupCount: number;
  groupLabel: string;
  members: NotificationMember[];
  memberKeys: string[];
};

export type NotificationView = DerivedMilestoneNotification & {
  read_at: string | null;
  dismissed_at: string | null;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: MilestoneNotificationPreferences = {
  enabled: true,
  stages: {
    stag: true,
    'bull-stag': true,
    cock: true,
  },
  leadDays: [7, 0],
  audience: 'both',
};

export const NOTIFICATION_LEAD_DAY_OPTIONS = [30, 14, 7, 3, 1, 0] as const;
