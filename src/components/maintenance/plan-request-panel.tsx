'use client';

import { Inbox } from 'lucide-react';
import { useState, useTransition } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { reviewPlanRequestAction } from '@/lib/actions/maintenance';
import { PLAN_REQUEST_STATUS_LABELS, PLAN_REQUEST_TYPE_LABELS } from '@/lib/constants';
import { formatDateTime, formatRelative } from '@/lib/format';
import type { Enums } from '@/lib/supabase/database.types';
import { cn } from '@/lib/utils';

export interface PlanRequestRow {
  id: string;
  requested_type: Enums<'plan_request_type'>;
  status: Enums<'plan_request_status'>;
  message: string | null;
  response_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
  clients?: { id: string; company_name: string } | null;
  requested_plan?: { id: string; name: string } | null;
  requester?: { full_name: string } | null;
  reviewer?: { full_name: string } | null;
}

/**
 * The agency decides; nothing here changes a subscription. Approving records
 * the decision and notifies the client — the subscription itself is then
 * edited explicitly, so a plan never changes by accident.
 */
export function PlanRequestPanel({ requests }: { requests: PlanRequestRow[] }) {
  if (requests.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No plan requests"
        description="Upgrade, downgrade and cancellation requests from clients appear here."
      />
    );
  }

  return (
    <ul className="divide-y divide-[var(--border-subtle)]">
      {requests.map((request) => (
        <RequestItem key={request.id} request={request} />
      ))}
    </ul>
  );
}

function RequestItem({ request }: { request: PlanRequestRow }) {
  const [isPending, startTransition] = useTransition();
  const [declining, setDeclining] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  function decide(decision: 'approved' | 'declined', reason?: string) {
    setError(null);
    startTransition(async () => {
      try {
        await reviewPlanRequestAction(request.id, decision, reason);
        setDeclining(false);
        setNotes('');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not record the decision.');
      }
    });
  }

  const pending = request.status === 'pending';

  return (
    <li className={cn('px-5 py-3.5', isPending && 'opacity-60')}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[14px] font-medium">
            {PLAN_REQUEST_TYPE_LABELS[request.requested_type]}
            {request.requested_plan ? ` to ${request.requested_plan.name}` : ''}
          </p>
          <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">
            {request.clients?.company_name ?? 'Unknown client'}
            {request.requester ? ` · ${request.requester.full_name}` : ''} ·{' '}
            {formatRelative(request.created_at)}
          </p>
        </div>

        <Badge
          tone={
            request.status === 'approved'
              ? 'success'
              : request.status === 'declined'
                ? 'danger'
                : request.status === 'withdrawn'
                  ? 'neutral'
                  : 'warning'
          }
          dot
        >
          {PLAN_REQUEST_STATUS_LABELS[request.status]}
        </Badge>
      </div>

      {request.message ? (
        <p className="mt-2 rounded-lg bg-[var(--surface-sunken)] px-3 py-2 text-[13px]">
          {request.message}
        </p>
      ) : null}

      {request.response_notes ? (
        <p className="mt-2 text-[12px] text-[var(--text-secondary)]">
          <span className="font-medium">
            {request.reviewer?.full_name ?? 'Agency'}
            {request.reviewed_at ? ` · ${formatDateTime(request.reviewed_at)}` : ''}:
          </span>{' '}
          {request.response_notes}
        </p>
      ) : null}

      {pending ? (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={isPending} onClick={() => decide('approved')}>
              Approve
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={isPending}
              onClick={() => setDeclining((v) => !v)}
              aria-expanded={declining}
            >
              Decline
            </Button>
            <span className="self-center text-[12px] text-[var(--text-muted)]">
              Approving records the decision — update the subscription itself to apply it.
            </span>
          </div>

          {declining ? (
            <div className="space-y-2">
              <label htmlFor={`decline-${request.id}`} className="block text-[12px] font-medium">
                Why? <span className="text-[var(--danger)]">*</span>
              </label>
              <textarea
                id={`decline-${request.id}`}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                required
                className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface-card)] px-3 py-2 text-sm"
                placeholder="This is sent to the client."
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={isPending || !notes.trim()}
                  onClick={() => decide('declined', notes)}
                >
                  Send decision
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDeclining(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}

          {error ? (
            <p role="alert" className="text-[12px] text-[var(--danger-text)]">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
