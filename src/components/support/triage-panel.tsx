'use client';

import { useActionState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/card';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { FormMessage, SubmitButton } from '@/components/ui/form-status';
import { triageSupportRequestAction } from '@/lib/actions/support';
import { idleState } from '@/lib/actions/types';
import { SUPPORT_STATUS_LABELS, URGENCY_LABELS, toOptions } from '@/lib/constants';
import { formatDuration } from '@/lib/format';
import type { Tables } from '@/lib/supabase/database.types';

export function SupportTriagePanel({
  ticket,
  staff,
  hasSubscription,
}: {
  ticket: Tables<'support_requests'>;
  staff: { id: string; full_name: string }[];
  hasSubscription: boolean;
}) {
  const action = triageSupportRequestAction.bind(null, ticket.id);
  const [state, formAction] = useActionState(action, idleState);
  const e = state.errors ?? {};

  return (
    <form action={formAction} noValidate>
      <Card>
        <CardHeader
          title="Triage"
          description="Cover, assignment and time. The client sees the status and resolution, never the internal notes."
        />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <FormMessage state={state} />

          {!hasSubscription ? (
            <Alert variant="info" className="sm:col-span-2">
              This client has no active maintenance subscription, so logged time will not draw
              down an allowance.
            </Alert>
          ) : null}

          <Field label="Status" error={e.status} required>
            {({ id }) => (
              <Select
                id={id}
                name="status"
                defaultValue={ticket.status}
                options={toOptions(SUPPORT_STATUS_LABELS)}
              />
            )}
          </Field>

          <Field label="Urgency" error={e.urgency} required>
            {({ id }) => (
              <Select
                id={id}
                name="urgency"
                defaultValue={ticket.urgency}
                options={toOptions(URGENCY_LABELS)}
              />
            )}
          </Field>

          <Field label="Assigned to" error={e.assignedTo}>
            {({ id }) => (
              <Select
                id={id}
                name="assignedTo"
                defaultValue={ticket.assigned_to ?? ''}
                placeholder="Unassigned"
                options={staff.map((s) => ({ value: s.id, label: s.full_name || 'Unnamed' }))}
              />
            )}
          </Field>

          <Field
            label="Covered by their plan?"
            error={e.coveredByPlan}
            hint="Shown to the client on their ticket."
          >
            {({ id, describedBy }) => (
              <Select
                id={id}
                name="coveredByPlan"
                defaultValue={
                  ticket.covered_by_plan === null ? '' : ticket.covered_by_plan ? 'yes' : 'no'
                }
                aria-describedby={describedBy}
                options={[
                  { value: '', label: 'Not assessed' },
                  { value: 'yes', label: 'Yes — covered' },
                  { value: 'no', label: 'No — chargeable' },
                ]}
              />
            )}
          </Field>

          <Field
            label="Time spent (minutes)"
            error={e.timeSpentMinutes}
            hint={`Total for this ticket. Currently ${formatDuration(ticket.time_spent_minutes)}.`}
          >
            {({ id, describedBy }) => (
              <Input
                id={id}
                name="timeSpentMinutes"
                type="number"
                min="0"
                step="1"
                defaultValue={ticket.time_spent_minutes}
                aria-describedby={describedBy}
              />
            )}
          </Field>

          <Field label="Note about cover" error={e.coverageNote} className="sm:col-span-2">
            {({ id }) => (
              <Input
                id={id}
                name="coverageNote"
                defaultValue={ticket.coverage_note ?? ''}
                placeholder="e.g. Covered by your Professional plan."
              />
            )}
          </Field>

          <Field
            label="Resolution"
            error={e.resolutionSummary}
            hint="Shown to the client when you mark the ticket resolved."
            className="sm:col-span-2"
          >
            {({ id, describedBy }) => (
              <Textarea
                id={id}
                name="resolutionSummary"
                rows={3}
                defaultValue={ticket.resolution_summary ?? ''}
                aria-describedby={describedBy}
              />
            )}
          </Field>

          <Field
            label="Internal notes"
            error={e.internalNotes}
            hint="Agency only — never visible to the client."
            className="sm:col-span-2"
          >
            {({ id, describedBy }) => (
              <Textarea
                id={id}
                name="internalNotes"
                rows={3}
                defaultValue={ticket.internal_notes ?? ''}
                aria-describedby={describedBy}
              />
            )}
          </Field>
        </CardBody>
        <CardFooter>
          <SubmitButton pendingLabel="Saving…">Save ticket</SubmitButton>
        </CardFooter>
      </Card>
    </form>
  );
}
