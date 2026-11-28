'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, MoreHorizontal, X } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { formatNotificationMessage, relativeDateLabel } from '@/lib/notifications/format';
import type { NotificationMember, NotificationView } from '@/lib/notifications/types';
import { formatBirdCodeForDisplay } from '@/lib/bird-code';

type NotificationItemProps = {
  notification: NotificationView;
  onOpen: (notification: NotificationView) => void;
  onOpenMember: (member: NotificationMember) => void;
  onMarkRead: (key: string) => void;
  onDismiss: (key: string) => void;
  compact?: boolean;
};

function codeText(code: string): string {
  return formatBirdCodeForDisplay(code);
}

function memberNotification(
  notification: NotificationView,
  member: NotificationMember,
): NotificationView {
  return {
    ...notification,
    key: member.key,
    type: member.type,
    stageKey: member.stageKey,
    stageLabel: member.stageLabel,
    fullyMature: member.fullyMature,
    targetDate: member.targetDate,
    daysUntil: member.daysUntil,
    fowlId: member.fowlId,
    fowlName: member.fowlName,
    fowlCode: member.fowlCode,
    fowlInitials: member.fowlInitials,
    message: member.message,
    isGroup: false,
    groupCount: 1,
    groupLabel: member.stageLabel,
    members: [member],
    memberKeys: [member.key],
    read_at: notification.read_at,
    dismissed_at: notification.dismissed_at,
  };
}

export default function NotificationItem({
  notification,
  onOpen,
  onOpenMember,
  onMarkRead,
  onDismiss,
  compact = false,
}: NotificationItemProps) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const unread = !notification.read_at;
  const dateLabel = relativeDateLabel(notification.targetDate, new Date(), t);
  const message = formatNotificationMessage(notification, t, t.language);
  const code = codeText(notification.fowlCode);
  const avatarSize = compact ? 'h-9 w-9 text-xs' : 'h-10 w-10 text-sm';

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  return (
    <li
      className={`border-border border-b transition-colors last:border-b-0 ${
        unread ? 'bg-emerald-50/60 dark:bg-emerald-950/20' : ''
      }`}
    >
      <div className="group hover:bg-muted/40 flex items-start gap-2 px-4 py-3.5 transition-colors">
        <button
          type="button"
          onClick={() => onOpen(notification)}
          disabled={notification.isGroup}
          aria-label={
            notification.isGroup
              ? message
              : `${notification.fowlName}${code ? `, ${code}` : ''}, ${message}`
          }
          title={
            notification.fowlId
              ? t('notifications.idTooltip', { id: notification.fowlId })
              : undefined
          }
          className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 rounded-sm text-left focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none disabled:cursor-default"
        >
          <span
            aria-hidden="true"
            className={`flex ${avatarSize} dark:ring-card shrink-0 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10 font-black text-emerald-700 shadow-sm ring-2 ring-white dark:text-emerald-300`}
          >
            {notification.fowlInitials}
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-card-foreground flex min-w-0 items-center gap-1.5 text-sm font-black">
              <span className="truncate">{notification.fowlName}</span>
              {code && (
                <span className="text-muted-foreground shrink-0 font-mono text-[11px] font-bold">
                  {code}
                </span>
              )}
            </span>
            <span
              className={`mt-0.5 block text-[13px] leading-relaxed ${
                unread
                  ? 'text-card-foreground/90 font-medium'
                  : 'text-muted-foreground font-semibold'
              }`}
            >
              {message}
            </span>
            <span className="text-muted-foreground mt-1 block text-[11px] font-semibold">
              {dateLabel}
            </span>
          </span>
          <span
            aria-hidden="true"
            className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full transition-colors ${unread ? 'bg-emerald-500' : 'bg-transparent'}`}
          />
        </button>

        <div ref={menuRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            aria-label={`${t('notifications.moreActions')}: ${notification.fowlName}`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="text-muted-foreground hover:text-foreground hover:bg-muted flex h-9 w-9 cursor-pointer items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
          </button>
          {menuOpen && (
            <div
              role="menu"
              data-notification-menu
              className="border-border bg-popover text-popover-foreground absolute top-full right-0 z-30 mt-1 w-44 rounded-lg border p-1 shadow-xl"
            >
              {unread && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onMarkRead(notification.key);
                  }}
                  className="hover:bg-muted flex min-h-10 w-full cursor-pointer items-center gap-2 rounded-md px-2.5 text-left text-xs font-bold transition-colors"
                >
                  <Check className="h-4 w-4" aria-hidden="true" />
                  {t('notifications.markRead')}
                </button>
              )}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onDismiss(notification.key);
                }}
                className="text-danger flex min-h-10 w-full cursor-pointer items-center gap-2 rounded-md px-2.5 text-left text-xs font-bold transition-colors hover:bg-rose-500/10"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                {t('notifications.dismiss')}
              </button>
            </div>
          )}
        </div>
      </div>

      {unread && <span className="sr-only">{t('notifications.unread')}</span>}

      {notification.isGroup && (
        <div className="border-border bg-card mr-4 mb-3 ml-[3.75rem] overflow-hidden rounded-lg border">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            className="text-muted-foreground hover:text-foreground hover:bg-muted/50 flex min-h-10 w-full cursor-pointer items-center justify-between gap-2 px-3 text-xs font-black"
          >
            <span>
              {expanded
                ? t('notifications.groupCollapse', { count: notification.groupCount })
                : t('notifications.groupExpand', { count: notification.groupCount })}
            </span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>
          {expanded && (
            <ul className="border-border divide-border divide-y border-t">
              {notification.members.map((member) => {
                const memberItem = memberNotification(notification, member);
                const memberMessage = formatNotificationMessage(memberItem, t, t.language);
                return (
                  <li key={member.key}>
                    <button
                      type="button"
                      onClick={() => onOpenMember(member)}
                      aria-label={`${member.fowlName}${member.fowlCode ? `, ${member.fowlCode}` : ''}, ${memberMessage}`}
                      title={t('notifications.idTooltip', { id: member.fowlId })}
                      className="hover:bg-muted/40 flex w-full items-start gap-2 px-3 py-2 text-left focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                    >
                      <span
                        aria-hidden="true"
                        className="bg-muted text-muted-foreground mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-black"
                      >
                        {member.fowlInitials}
                      </span>
                      <span className="min-w-0">
                        <span className="text-card-foreground block text-xs font-black">
                          {member.fowlName}{' '}
                          {member.fowlCode && (
                            <span className="text-muted-foreground font-mono font-bold">
                              {codeText(member.fowlCode)}
                            </span>
                          )}
                        </span>
                        <span className="text-muted-foreground block text-xs font-semibold">
                          {memberMessage}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}
