'use client';

import React, { useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { useT } from '@/lib/i18n';
import {
  formatNotificationMessage,
  relativeDateLabel,
} from '@/lib/notifications/format';
import type {
  NotificationMember,
  NotificationView,
} from '@/lib/notifications/types';
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
  const unread = !notification.read_at;
  const dateLabel = relativeDateLabel(notification.targetDate, new Date(), t);
  const message = formatNotificationMessage(notification, t, t.language);
  const code = codeText(notification.fowlCode);
  const avatarSize = compact ? 'h-9 w-9 text-xs' : 'h-10 w-10 text-sm';

  return (
    <li className="border-border border-b last:border-b-0">
      <div className="hover:bg-muted/40 flex items-start gap-2 px-3 py-3 transition-colors sm:px-4">
        <button
          type="button"
          onClick={() => onOpen(notification)}
          disabled={notification.isGroup}
          aria-label={
            notification.isGroup
              ? message
              : `${notification.fowlName}${code ? `, ${code}` : ''}, ${message}`
          }
          title={notification.fowlId ? t('notifications.idTooltip', { id: notification.fowlId }) : undefined}
          className="focus-visible:ring-emerald-500 flex min-w-0 flex-1 cursor-pointer items-start gap-3 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 disabled:cursor-default"
        >
          <span
            aria-hidden="true"
            className={`bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex ${avatarSize} shrink-0 items-center justify-center rounded-full border font-black`}
          >
            {notification.fowlInitials}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
              <span className="text-card-foreground flex min-w-0 items-center gap-1.5 text-sm font-black">
                <span className="truncate">{notification.fowlName}</span>
                {code && (
                  <span className="text-muted-foreground shrink-0 font-mono text-xs font-bold">
                    {code}
                  </span>
                )}
              </span>
              <span className="text-muted-foreground shrink-0 text-xs font-semibold">
                {dateLabel}
              </span>
            </span>
            <span className="text-muted-foreground mt-0.5 block text-xs leading-relaxed font-semibold">
              {message}
            </span>
          </span>
          <span
            aria-hidden="true"
            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${unread ? 'bg-emerald-500' : 'bg-transparent'}`}
          />
        </button>

        <div className="flex shrink-0 items-center gap-0.5">
          {unread && (
            <button
              type="button"
              onClick={() => onMarkRead(notification.key)}
              aria-label={t('notifications.markRead')}
              title={t('notifications.markRead')}
              className="text-muted-foreground hover:text-foreground hover:bg-muted flex h-9 w-9 cursor-pointer items-center justify-center rounded-full transition-colors"
            >
              <Check className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onDismiss(notification.key)}
            aria-label={t('notifications.dismiss')}
            title={t('notifications.dismiss')}
            className="text-muted-foreground hover:text-danger flex h-9 w-9 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-rose-500/10"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {unread && (
        <span className="sr-only">{t('notifications.unread')}</span>
      )}

      {notification.isGroup && (
        <div className="border-border mx-3 mb-3 rounded-md border sm:mx-4">
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
                      className="hover:bg-muted/40 focus-visible:ring-emerald-500 flex w-full items-start gap-2 px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2"
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
