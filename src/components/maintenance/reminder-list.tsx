import { BellRing, Check, X } from 'lucide-react';
import { useState, useTransition } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { setReminderStatusAction } from '@/lib/actions/maintenance';
import { REMINDER_STATUS_LABELS, REMINDER_TYPE_LABELS, type Tone } from '@/lib/constants';
import { revalidate } from '@/lib/data/revalidate';
import { daysUntil, formatDate } from '@/lib/format';
import type { Enums } from '@/lib/supabase/database.types';
import { cn } from '@/lib/utils';

export interface ReminderRow {
  id: string;
  title: string;
  reminder_type: Enums<'reminder_type'>;
  due_date: string;
  status: Enums<'reminder_status'>;
  notes: string | null;
  clients?: { id: string; company_name: string } | null;
  assignee?: { full_name: string } | null;
}

/** Colour by proximity, so "due today" cannot be mistaken for "due in 60 days". */
function dueTone(dueDate: string): Tone {
  const days = daysUntil(dueDate);
  if (days === null) return 'neutral';
  if (days < 0) return 'danger';
  if (days <= 7) return 'danger';
  if (days <= 30) return 'warning';
  return 'neutral';
}

function dueLabel(dueDate: string): string {
  const days = daysUntil(dueDate);
  if (days === null) return formatDate(dueDate);
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`;
  if (days === 0) return 'Due today';
  return `In ${days} day${days === 1 ? '' : 's'}`;
}

export function ReminderList({ reminders }: { reminders: ReminderRow[] }) {
  if (reminders.length === 0) {
    return (
      <EmptyState
        icon={BellRing}
        title="Nothing due"
        description="No renewals, expiries or reviews are coming up in the next 90 days."
      />
    );
  }

  return (
    <ul className="divide-y divide-[var(--border-subtle)]">
      {reminders.map((reminder) => (
        <ReminderItem key={reminder.id} reminder={reminder} />
      ))}
    </ul>
  );
}

function ReminderItem({ reminder }: { reminder: ReminderRow }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function set(status: 'acknowledged' | 'completed' | 'dismissed') {
    setError(null);
    startTransition(async () => {
      try {
        await setReminderStatusAction(reminder.id, status);
        revalidate();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not update the reminder.');
      }
    });
  }

  return (
    <li className={cn('flex flex-wrap items-start gap-3 px-5 py-3.5', isPending && 'opacity-60')}>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-medium">{reminder.title}</p>
        <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">
          {reminder.clients?.company_name ? `${reminder.clients.company_name} · ` : ''}
          {REMINDER_TYPE_LABELS[reminder.reminder_type]} · {formatDate(reminder.due_date)}
          {reminder.assignee ? ` · ${reminder.assignee.full_name}` : ''}
        </p>
        {reminder.notes ? (
          <p className="mt-1 text-[12px] text-[var(--text-secondary)]">{reminder.notes}</p>
        ) : null}
        {error ? (
          <p role="alert" className="mt-1 text-[12px] text-[var(--danger-text)]">
            {error}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Badge tone={dueTone(reminder.due_date)} dot>
          {dueLabel(reminder.due_date)}
        </Badge>

        {reminder.status === 'acknowledged' ? (
          <Badge tone="info">{REMINDER_STATUS_LABELS.acknowledged}</Badge>
        ) : (
          <Button size="sm" variant="ghost" disabled={isPending} onClick={() => set('acknowledged')}>
            Acknowledge
          </Button>
        )}

        <Button size="sm" variant="secondary" disabled={isPending} onClick={() => set('completed')}>
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
          Done
        </Button>

        <Button
          size="sm"
          variant="ghost"
          disabled={isPending}
          onClick={() => set('dismissed')}
          aria-label={`Dismiss ${reminder.title}`}
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </div>
    </li>
  );
}
