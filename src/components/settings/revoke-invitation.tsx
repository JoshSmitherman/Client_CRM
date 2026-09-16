import { X } from 'lucide-react';
import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { revokeInvitationAction } from '@/lib/actions/team';
import { revalidate } from '@/lib/data/revalidate';

/**
 * Cancels an invitation that has not been accepted.
 *
 * Confirms first, because the person may already have the email in front of
 * them — revoking makes the link they are holding stop working.
 */
export function RevokeInvitation({
  invitationId,
  email,
}: {
  invitationId: string;
  email: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (confirming) {
    return (
      <span className="flex shrink-0 items-center gap-1">
        <Button
          size="sm"
          variant="danger"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              try {
                await revokeInvitationAction(invitationId);
                revalidate();
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Could not cancel that invitation.');
                setConfirming(false);
              }
            })
          }
        >
          {isPending ? 'Cancelling…' : 'Confirm'}
        </Button>
        <Button size="sm" variant="ghost" disabled={isPending} onClick={() => setConfirming(false)}>
          Keep
        </Button>
      </span>
    );
  }

  return (
    <span className="flex shrink-0 flex-col items-end">
      <Button
        variant="ghost"
        size="icon"
        type="button"
        aria-label={`Cancel the invitation to ${email}`}
        onClick={() => setConfirming(true)}
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </Button>
      {error ? (
        <span role="alert" className="text-[11px] text-[var(--danger-text)]">
          {error}
        </span>
      ) : null}
    </span>
  );
}
