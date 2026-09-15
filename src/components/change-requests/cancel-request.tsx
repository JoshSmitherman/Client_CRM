'use client';

import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { cancelChangeRequestAction } from '@/lib/actions/change-requests';

/** Only offered while a request is still untriaged, which is when it is allowed. */
export function CancelRequestButton({ requestId }: { requestId: string }) {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!confirming) {
    return (
      <Button variant="ghost" onClick={() => setConfirming(true)}>
        Withdraw this request
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[13px] text-[var(--text-secondary)]">Withdraw this request?</span>
      <Button
        variant="danger"
        size="sm"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            try {
              await cancelChangeRequestAction(requestId);
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Could not withdraw the request.');
            }
          })
        }
      >
        Yes, withdraw
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
        Keep it
      </Button>
      {error ? (
        <span role="alert" className="text-[12px] text-[var(--danger-text)]">
          {error}
        </span>
      ) : null}
    </div>
  );
}
