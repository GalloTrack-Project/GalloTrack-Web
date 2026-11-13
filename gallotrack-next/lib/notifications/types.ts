export type MilestoneNotificationType = 'stage_changed' | 'fully_mature' | 'stage_upcoming';

export type MilestoneNotification = {
  id: number;
  user_id: string;
  type: MilestoneNotificationType;
  fowl_id: number;
  stage: string;
  title: string;
  body: string;
  due_date: string;
  read_at: string | null;
  created_at: string;
};

export type NotificationFowl = {
  id: number;
  name: string;
  bird_code?: string | null;
};

export type NotificationWithFowl = MilestoneNotification & {
  fowl: NotificationFowl | null;
};

export type NotificationPreferenceInput = {
  stageChanged: boolean;
  fullyMature: boolean;
  upcoming: boolean;
  leadDays: number;
};

export type NotificationInsert = {
  type: MilestoneNotificationType;
  stage: string;
  title: string;
  body: string;
  due_date: string;
};

export type MilestoneFowl = {
  id: number;
  name: string;
  bird_code?: string | null;
  gender?: string | null;
  birthdate?: string | null;
  status?: string | null;
};
