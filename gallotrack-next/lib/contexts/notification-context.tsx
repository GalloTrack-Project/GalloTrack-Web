'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAuthOptional } from '@/lib/contexts/auth-context';
import {
  fetchNotifications,
  fetchUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/notifications/service';
import type { NotificationWithFowl } from '@/lib/notifications/types';

type NotificationContextValue = {
  notifications: NotificationWithFowl[];
  unreadCount: number;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  markRead: (id: number) => Promise<void>;
  markAllRead: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function useNotifications(): NotificationContextValue {
  const value = useContext(NotificationContext);
  if (!value) throw new Error('useNotifications must be used within NotificationProvider');
  return value;
}

export function useNotificationUnreadCount(): number {
  return useContext(NotificationContext)?.unreadCount ?? 0;
}

export function NotificationProvider({
  children,
  userId,
}: {
  children: React.ReactNode;
  /** Test/demo override; production reads the authenticated user. */
  userId?: string;
}) {
  const auth = useAuthOptional();
  const currentUserId = userId ?? auth?.currentUserId ?? null;
  const [notifications, setNotifications] = useState<NotificationWithFowl[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const requestRef = useRef(0);

  const refresh = useCallback(async () => {
    if (!currentUserId) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }
    const request = ++requestRef.current;
    setLoading(true);
    setError('');
    const [list, count] = await Promise.all([
      fetchNotifications(),
      fetchUnreadNotificationCount(),
    ]);
    if (request !== requestRef.current) return;
    setNotifications(list.data);
    setUnreadCount(count.count);
    setError(list.error || count.error || '');
    setLoading(false);
  }, [currentUserId]);

  const refreshCount = useCallback(async () => {
    if (!currentUserId) return;
    const result = await fetchUnreadNotificationCount();
    if (result.error) {
      setError(result.error);
      return;
    }
    setUnreadCount(result.count);
  }, [currentUserId]);

  useEffect(() => {
    void refresh();
    if (!currentUserId) return;
    const interval = window.setInterval(() => void refreshCount(), 60_000);
    const onFocus = () => void refresh();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [currentUserId, refresh, refreshCount]);

  const markRead = useCallback(
    async (id: number) => {
      const item = notifications.find((notification) => notification.id === id);
      if (!item || item.read_at) return;
      const readAt = new Date().toISOString();
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === id ? { ...notification, read_at: readAt } : notification,
        ),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      const result = await markNotificationRead(id);
      if (result.error) {
        setError(result.error);
        await refresh();
      }
    },
    [notifications, refresh],
  );

  const markAllRead = useCallback(async () => {
    const readAt = new Date().toISOString();
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.read_at ? notification : { ...notification, read_at: readAt },
      ),
    );
    setUnreadCount(0);
    const result = await markAllNotificationsRead();
    if (result.error) {
      setError(result.error);
      await refresh();
    }
  }, [refresh]);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      error,
      refresh,
      markRead,
      markAllRead,
    }),
    [notifications, unreadCount, loading, error, refresh, markRead, markAllRead],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}
