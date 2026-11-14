'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bell, Search } from 'lucide-react';
import { useFowl } from '@/lib/contexts/fowl-context';
import { useNotifications } from '@/lib/contexts/notification-context';
import { useUI } from '@/lib/contexts/ui-context';
import { useT } from '@/lib/i18n';
import { Pagination } from '@/components/ui';
import NotificationItem from '@/components/notifications/NotificationItem';
import type {
  NotificationMember,
  NotificationView,
} from '@/lib/notifications/types';

type Filter = 'all' | 'unread' | 'upcoming' | 'reached';

const PAGE_SIZE = 10;

function matchesSearch(notification: NotificationView, query: string): boolean {
  if (!query) return true;
  const haystack = [
    notification.fowlName,
    notification.fowlCode,
    notification.message,
    notification.stageLabel,
    notification.groupLabel,
    ...notification.members.flatMap((member) => [
      member.fowlName,
      member.fowlCode,
      member.message,
      member.stageLabel,
    ]),
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
}

export default function NotificationsPage() {
  const t = useT();
  const router = useRouter();
  const fowl = useFowl();
  const ui = useUI();
  const {
    notifications,
    unreadCount,
    loading,
    error,
    usingLocalStorage,
    markRead,
    markAllRead,
    dismiss,
  } = useNotifications();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const counts = useMemo(
    () => ({
      all: notifications.length,
      unread: notifications.filter((notification) => !notification.read_at).length,
      upcoming: notifications.filter((notification) => notification.type !== 'reached').length,
      reached: notifications.filter((notification) => notification.type === 'reached').length,
    }),
    [notifications],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return notifications.filter((notification) => {
      if (filter === 'unread' && notification.read_at) return false;
      if (filter === 'upcoming' && notification.type === 'reached') return false;
      if (filter === 'reached' && notification.type !== 'reached') return false;
      return matchesSearch(notification, query);
    });
  }, [filter, notifications, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function openFowl(fowlId: number | null, code: string) {
    if (fowlId !== null) {
      const target = fowl.fowls.find((item) => item.id === fowlId);
      if (target) {
        ui.setSelectedFowlForDetails(target);
        return;
      }
    }
    if (code) {
      router.push(`/lineage?tab=pedigree&chicken=${encodeURIComponent(code)}`);
    }
  }

  async function openNotification(notification: NotificationView) {
    await markRead(notification.key);
    openFowl(notification.fowlId, notification.fowlCode);
  }

  async function openMember(member: NotificationMember) {
    await markRead(member.key);
    openFowl(member.fowlId, member.fowlCode);
  }

  function changeFilter(next: Filter) {
    setFilter(next);
    setPage(1);
  }

  function changeSearch(next: string) {
    setSearch(next);
    setPage(1);
  }

  const filters: Array<{ id: Filter; label: string; count: number }> = [
    { id: 'all', label: t('notifications.filterAll'), count: counts.all },
    { id: 'unread', label: t('notifications.filterUnread'), count: counts.unread },
    { id: 'upcoming', label: t('notifications.filterUpcoming'), count: counts.upcoming },
    { id: 'reached', label: t('notifications.filterReached'), count: counts.reached },
  ];

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            aria-label={t('notifications.backToDashboard')}
            className="border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-md border transition-colors"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <div className="min-w-0">
            <h1 className="text-card-foreground flex items-center gap-2 text-lg font-black tracking-tight sm:text-xl">
              <Bell className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              {t('notifications.title')}
            </h1>
            <p className="text-muted-foreground mt-1 text-xs font-semibold sm:text-sm">
              {t('notifications.subtitle')}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void markAllRead()}
          disabled={unreadCount === 0}
          className="border-border bg-card text-foreground hover:bg-muted min-h-11 cursor-pointer rounded-md border px-3 text-xs font-black transition-colors disabled:cursor-default disabled:opacity-50"
        >
          {t('notifications.markAllRead')}
        </button>
      </div>

      {usingLocalStorage && (
        <p className="border-border rounded-md border bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-800 dark:text-amber-300">
          {t('notifications.localStorageNotice')}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('notifications.filtersLabel')}>
          {filters.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => changeFilter(item.id)}
              aria-pressed={filter === item.id}
              className={`min-h-10 cursor-pointer rounded-full border px-3 text-xs font-black transition-colors ${
                filter === item.id
                  ? 'border-emerald-600 bg-emerald-600 text-white'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground'
              }`}
            >
              {item.label} ({item.count})
            </button>
          ))}
        </div>
        <label className="border-input-border bg-card flex min-h-11 w-full items-center gap-2 rounded-md border px-3 sm:w-72">
          <Search className="text-muted-foreground h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="sr-only">{t('notifications.searchPlaceholder')}</span>
          <input
            type="search"
            value={search}
            onChange={(event) => changeSearch(event.target.value)}
            placeholder={t('notifications.searchPlaceholder')}
            className="text-card-foreground placeholder:text-muted-foreground w-full bg-transparent text-sm font-semibold focus:outline-none"
          />
        </label>
      </div>

      <div className="border-border bg-card overflow-hidden rounded-lg border shadow-sm">
        {loading && notifications.length === 0 ? (
          <div className="space-y-2 p-4" role="status" aria-label={t('notifications.loading')}>
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="bg-muted/60 h-16 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : error && notifications.length === 0 ? (
          <div className="space-y-2 p-8 text-center">
            <p className="text-card-foreground text-sm font-black">{t('notifications.loadError')}</p>
            <p className="text-muted-foreground text-xs font-semibold">{error}</p>
          </div>
        ) : pageItems.length === 0 ? (
          <div className="space-y-2 p-10 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300">
              <Bell className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="text-card-foreground text-sm font-black">{t('notifications.emptyTitle')}</p>
            <p className="text-muted-foreground text-xs font-semibold">
              {search || filter !== 'all' ? t('notifications.noResults') : t('notifications.emptyDescription')}
            </p>
          </div>
        ) : (
          <ul>
            {pageItems.map((notification) => (
              <NotificationItem
                key={notification.key}
                notification={notification}
                onOpen={(item) => void openNotification(item)}
                onOpenMember={(member) => void openMember(member)}
                onMarkRead={(key) => void markRead(key)}
                onDismiss={(key) => void dismiss(key)}
              />
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-xs font-semibold">
          {t('notifications.resultSummary', {
            shown: pageItems.length,
            total: filtered.length,
          })}
        </p>
        <Pagination page={safePage} pageCount={pageCount} onPageChange={setPage} />
      </div>
    </div>
  );
}
