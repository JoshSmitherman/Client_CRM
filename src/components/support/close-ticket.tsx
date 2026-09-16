import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { closeSupportRequestAction } from '@/lib/actions/support';
import { revalidate } from '@/lib/data/revalidate';

/** Offered once the agency marks a ticket resolved, so the client confirms. */
export function CloseTicketButton({ requestId }: { requestId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            try {
              await closeSupportRequestAction(requestId);
              revalidate();
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Could not close the ticket.');
            }
          })
        }
      >
        {isPending ? 'Closing…' : 'This is sorted — close it'}
      </Button>
      {error ? (
        <span role="alert" className="text-[12px] text-[var(--danger-text)]">
          {error}
        </span>
      ) : null}
    </div>
  );
}
