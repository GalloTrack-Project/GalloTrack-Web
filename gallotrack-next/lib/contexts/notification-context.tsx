'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuthOptional } from '@/lib/contexts/auth-context';
import { useFowl } from '@/lib/contexts/fowl-context';
import {
  buildMilestoneNotifications,
  normalizeNotificationPreferences,
} from '@/lib/notifications/milestones';
import {
  loadNotificationStore,
  saveNotificationPreferences,
  saveNotificationState,
  type NotificationStoreMode,
} from '@/lib/notifications/storage';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type DerivedMilestoneNotification,
  type MilestoneNotificationPreferences,
  type NotificationStateMap,
  type NotificationStateValue,
  type NotificationView,
} from '@/lib/notifications/types';

type NotificationContextValue = {
  notifications: NotificationView[];
  unreadCount: number;
  loading: boolean;
  error: string;
  usingLocalStorage: boolean;
  preferences: MilestoneNotificationPreferences;
  refresh: () => void;
  markRead: (key: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  dismiss: (key: string) => Promise<void>;
  updatePreferences: (preferences: MilestoneNotificationPreferences) => Promise<void>;
  resetPreferences: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function useNotifications(): NotificationContextValue {
  const value = useContext(NotificationContext);
  if (!value) throw new Error('useNotifications must be used within NotificationProvider');
  return value;
}

export function useNotificationsOptional(): NotificationContextValue | null {
  return useContext(NotificationContext);
}

export function useNotificationUnreadCount(): number {
  return useContext(NotificationContext)?.unreadCount ?? 0;
}

function stateForNotification(
  notification: DerivedMilestoneNotification,
  state: NotificationStateMap,
): NotificationStateValue {
  const direct = state[notification.key];
  if (direct) return direct;
  const memberStates = notification.memberKeys
    .map((key) => state[key])
    .filter((value): value is NotificationStateValue => Boolean(value));
  if (memberStates.length !== notification.memberKeys.length) {
    return { read_at: null, dismissed_at: null };
  }
  const readAt = memberStates.every((value) => value.read_at)
    ? memberStates
        .map((value) => value.read_at)
        .filter((value): value is string => Boolean(value))
        .sort()
        .pop() ?? null
    : null;
  const dismissedAt = memberStates.every((value) => value.dismissed_at)
    ? memberStates
        .map((value) => value.dismissed_at)
        .filter((value): value is string => Boolean(value))
        .sort()
        .pop() ?? null
    : null;
  return { read_at: readAt, dismissed_at: dismissedAt };
}

function uniqueKeys(keys: string[]): string[] {
  return [...new Set(keys)];
}

export function NotificationProvider({
  children,
  userId,
  today,
}: {
  children: React.ReactNode;
  /** Test/demo override; production reads the authenticated user. */
  userId?: string;
  /** Fixed clock for deterministic tests. */
  today?: Date;
}) {
  const auth = useAuthOptional();
  const fowl = useFowl();
  const currentUserId = userId ?? auth?.currentUserId ?? null;
  const [notificationsState, setNotificationsState] = useState<NotificationStateMap>({});
  const [preferences, setPreferences] = useState<MilestoneNotificationPreferences>(
    DEFAULT_NOTIFICATION_PREFERENCES,
  );
  const [mode, setMode] = useState<NotificationStoreMode>('database');
  const loading = false;
  const [error, setError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);
  const [clock, setClock] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setClock(new Date()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!currentUserId) return;
    let alive = true;
    loadNotificationStore(currentUserId)
      .then((snapshot) => {
        if (!alive) return;
        setPreferences(snapshot.preferences);
        setNotificationsState(snapshot.state);
        setMode(snapshot.mode);
        setError('');
      })
      .catch((loadError) => {
        if (!alive) return;
        console.error(
          '[notifications] Could not load notification data.',
          loadError instanceof Error ? loadError.message : String(loadError),
        );
        setError('Notification data could not be loaded.');
        setMode('local');
      });
    return () => {
      alive = false;
    };
  }, [currentUserId, reloadToken]);

  const activeToday = today ?? clock;
  const derived = useMemo(
    () =>
      currentUserId ? buildMilestoneNotifications(fowl.fowls, preferences, activeToday) : [],
    [currentUserId, fowl.fowls, preferences, activeToday],
  );

  const notifications = useMemo(
    () =>
      derived
        .map((notification) => {
          const state = stateForNotification(notification, notificationsState);
          return {
            ...notification,
            read_at: state.read_at,
            dismissed_at: state.dismissed_at,
          };
        })
        .filter((notification) => !notification.dismissed_at),
    [derived, notificationsState],
  );

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read_at).length,
    [notifications],
  );

  const persistState = useCallback(
    async (entries: Array<NotificationStateValue & { key: string }>) => {
      if (!currentUserId) return;
      const nextMode = await saveNotificationState(currentUserId, entries, mode);
      setMode(nextMode);
    },
    [currentUserId, mode],
  );

  const markRead = useCallback(
    async (key: string) => {
      const notification = notifications.find((item) => item.key === key);
      if (!notification || notification.read_at) return;
      const readAt = new Date().toISOString();
      const keys = uniqueKeys([notification.key, ...notification.memberKeys]);
      const entries = keys.map((itemKey) => ({
        key: itemKey,
        read_at: readAt,
        dismissed_at: notificationsState[itemKey]?.dismissed_at ?? null,
      }));
      setNotificationsState((previous) => {
        const next = { ...previous };
        for (const entry of entries) {
          next[entry.key] = {
            read_at: entry.read_at,
            dismissed_at: entry.dismissed_at,
          };
        }
        return next;
      });
      await persistState(entries);
    },
    [notifications, notificationsState, persistState],
  );

  const markAllRead = useCallback(async () => {
    if (notifications.length === 0) return;
    const readAt = new Date().toISOString();
    const keys = uniqueKeys(
      notifications.flatMap((notification) => [notification.key, ...notification.memberKeys]),
    );
    const entries = keys.map((key) => ({
      key,
      read_at: readAt,
      dismissed_at: notificationsState[key]?.dismissed_at ?? null,
    }));
    setNotificationsState((previous) => {
      const next = { ...previous };
      for (const entry of entries) {
        next[entry.key] = {
          read_at: entry.read_at,
          dismissed_at: entry.dismissed_at,
        };
      }
      return next;
    });
    await persistState(entries);
  }, [notifications, notificationsState, persistState]);

  const dismiss = useCallback(
    async (key: string) => {
      const notification = notifications.find((item) => item.key === key);
      if (!notification) return;
      const dismissedAt = new Date().toISOString();
      const keys = uniqueKeys([notification.key, ...notification.memberKeys]);
      const entries = keys.map((itemKey) => ({
        key: itemKey,
        read_at: notificationsState[itemKey]?.read_at ?? notification.read_at,
        dismissed_at: dismissedAt,
      }));
      setNotificationsState((previous) => {
        const next = { ...previous };
        for (const entry of entries) {
          next[entry.key] = {
            read_at: entry.read_at,
            dismissed_at: entry.dismissed_at,
          };
        }
        return next;
      });
      await persistState(entries);
    },
    [notifications, notificationsState, persistState],
  );

  const updatePreferences = useCallback(
    async (nextPreferences: MilestoneNotificationPreferences) => {
      const normalized = normalizeNotificationPreferences(nextPreferences);
      setPreferences(normalized);
      if (!currentUserId) return;
      const nextMode = await saveNotificationPreferences(currentUserId, normalized, mode);
      setMode(nextMode);
    },
    [currentUserId, mode],
  );

  const resetPreferences = useCallback(async () => {
    await updatePreferences(DEFAULT_NOTIFICATION_PREFERENCES);
  }, [updatePreferences]);

  const refresh = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      error,
      usingLocalStorage: mode === 'local',
      preferences,
      refresh,
      markRead,
      markAllRead,
      dismiss,
      updatePreferences,
      resetPreferences,
    }),
    [
      notifications,
      unreadCount,
      loading,
      error,
      mode,
      preferences,
      refresh,
      markRead,
      markAllRead,
      dismiss,
      updatePreferences,
      resetPreferences,
    ],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}
