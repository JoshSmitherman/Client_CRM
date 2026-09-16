import { Bell, Check, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  deleteNotificationAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from '@/lib/actions/notifications';
import { revalidate } from '@/lib/data/revalidate';
import { formatRelative } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string | null;
  url: string | null;
  is_read: boolean;
  created_at: string;
}

export function NotificationList({ notifications }: { notifications: NotificationRow[] }) {
  const [isPending, startTransition] = useTransition();
  const unread = notifications.filter((n) => !n.is_read).length;

  if (notifications.length === 0) {
    return (
      <EmptyState
        icon={Bell}
        title="Nothing here yet"
        description="You will be told about submissions, approvals, comments, overdue work and renewals."
      />
    );
  }

  return (
    <>
      {unread > 0 ? (
        <div className="flex justify-end border-b border-[var(--border-subtle)] px-5 py-2.5">
          <Button
            size="sm"
            variant="ghost"
            disabled={isPending}
            onClick={() => startTransition(async () => { await markAllNotificationsReadAction(); revalidate(); })}
          >
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            Mark all {unread} as read
          </Button>
        </div>
      ) : null}

      <ul className="divide-y divide-[var(--border-subtle)]">
        {notifications.map((notification) => (
          <li
            key={notification.id}
            className={cn(
              'flex items-start gap-3 px-5 py-3.5',
              !notification.is_read && 'bg-[var(--accent-soft)]/30',
            )}
          >
            {!notification.is_read ? (
              <span
                className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--accent)]"
                aria-label="Unread"
              />
            ) : (
              <span className="mt-2 h-2 w-2 shrink-0" aria-hidden="true" />
            )}

            <div className="min-w-0 flex-1">
              {notification.url ? (
                <Link
                  to={notification.url}
                  onClick={() =>
                    startTransition(async () => {
                      await markNotificationReadAction(notification.id);
                      revalidate();
                    })
                  }
                  className="text-[14px] font-medium hover:text-[var(--accent-text)] hover:underline"
                >
                  {notification.title}
                </Link>
              ) : (
                <p className="text-[14px] font-medium">{notification.title}</p>
              )}

              {notification.body ? (
                <p className="mt-0.5 text-[13px] text-[var(--text-secondary)]">{notification.body}</p>
              ) : null}

              <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">
                {formatRelative(notification.created_at)}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              {!notification.is_read ? (
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      await markNotificationReadAction(notification.id);
                      revalidate();
                    })
                  }
                  aria-label="Mark as read"
                >
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              ) : null}

              <Button
                variant="ghost"
                size="icon"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    await deleteNotificationAction(notification.id);
                    revalidate();
                  })
                }
                aria-label="Remove notification"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
