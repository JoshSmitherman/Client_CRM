import { UserCheck, UserX } from 'lucide-react';
import { useState, useTransition } from 'react';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { setUserActiveAction } from '@/lib/actions/team';
import { revalidate } from '@/lib/data/revalidate';
import { formatRelative } from '@/lib/format';
import { ROLE_LABELS, type AppRole } from '@/lib/permissions';
import { cn } from '@/lib/utils';

export interface PendingStaff {
  id: string;
  full_name: string;
  email: string;
  role: AppRole;
  created_at: string;
}

/**
 * Staff who registered themselves on an approved domain while the mode is
 * "approval required". They can see nothing until activated — every RLS
 * predicate requires an active profile.
 */
export function ApprovalQueue({ pending }: { pending: PendingStaff[] }) {
  if (pending.length === 0) return null;

  return (
    <Card className="mb-4 ring-2 ring-[var(--warning)]/40">
      <CardHeader
        title={`${pending.length} account${pending.length === 1 ? '' : 's'} waiting for approval`}
        description="They registered with an approved email domain. Until you approve them they can see nothing at all."
      />
      <ul className="divide-y divide-[var(--border-subtle)]">
        {pending.map((person) => (
          <PendingRow key={person.id} person={person} />
        ))}
      </ul>
    </Card>
  );
}

function PendingRow({ person }: { person: PendingStaff }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function decide(activate: boolean) {
    setError(null);
    startTransition(async () => {
      try {
        await setUserActiveAction(person.id, activate);
        revalidate();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not update the account.');
      }
    });
  }

  return (
    <li className={cn('flex flex-wrap items-center gap-3 px-5 py-3.5', isPending && 'opacity-60')}>
      <Avatar name={person.full_name || person.email} size="sm" />

      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-medium">{person.full_name || person.email}</p>
        <p className="truncate text-[12px] text-[var(--text-muted)]">
          {person.email} · would be {ROLE_LABELS[person.role]} · registered{' '}
          {formatRelative(person.created_at)}
        </p>
        {error ? (
          <p role="alert" className="mt-1 text-[12px] text-[var(--danger-text)]">
            {error}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 gap-2">
        <Button size="sm" disabled={isPending} onClick={() => decide(true)}>
          <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Approve
        </Button>
        <Button size="sm" variant="ghost" disabled={isPending} onClick={() => decide(false)}>
          <UserX className="h-3.5 w-3.5" aria-hidden="true" />
          Leave pending
        </Button>
      </div>
    </li>
  );
}
