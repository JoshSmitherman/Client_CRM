'use client';

import { Send } from 'lucide-react';
import { useState, useTransition } from 'react';

import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { setHandoverStatusAction } from '@/lib/actions/handover';
import { HANDOVER_STATUS_LABELS, HANDOVER_STATUS_TONES } from '@/lib/constants';
import { formatDateTime } from '@/lib/format';
import type { Enums } from '@/lib/supabase/database.types';

export function HandoverStatusPanel({
  handoverId,
  status,
  deliveredAt,
  outstandingItems,
}: {
  handoverId: string;
  status: Enums<'handover_status'>;
  deliveredAt: string | null;
  outstandingItems: number;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function move(next: Enums<'handover_status'>) {
    setError(null);
    startTransition(async () => {
      try {
        await setHandoverStatusAction(handoverId, next);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not change the status.');
      }
    });
  }

  return (
    <Card>
      <CardHeader
        title="Status"
        action={
          <Badge tone={HANDOVER_STATUS_TONES[status]} dot>
            {HANDOVER_STATUS_LABELS[status]}
          </Badge>
        }
      />
      <CardBody className="space-y-3">
        {status === 'accepted' ? (
          <Alert variant="success" title="Accepted by the client">
            The client has formally signed off. The record is permanent.
          </Alert>
        ) : status === 'delivered' ? (
          <Alert variant="info" title="With the client">
            Delivered {deliveredAt ? formatDateTime(deliveredAt) : ''}. Waiting for them to confirm
            acceptance.
          </Alert>
        ) : outstandingItems > 0 ? (
          <p className="text-[13px] text-[var(--text-secondary)]">
            {outstandingItems} checklist item{outstandingItems === 1 ? '' : 's'} still outstanding.
            Complete them, or mark them not applicable, before delivering.
          </p>
        ) : (
          <p className="text-[13px] text-[var(--text-secondary)]">
            Everything applicable is complete. Ready to send to the client.
          </p>
        )}

        {status !== 'accepted' && status !== 'delivered' ? (
          <Button
            disabled={isPending || outstandingItems > 0}
            onClick={() => move('delivered')}
            className="w-full"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            Deliver to the client
          </Button>
        ) : null}

        {error ? (
          <p role="alert" className="text-[12px] text-[var(--danger-text)]">
            {error}
          </p>
        ) : null}
      </CardBody>
    </Card>
  );
}
