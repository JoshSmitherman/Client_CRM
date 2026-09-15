'use client';

import { useActionState } from 'react';

import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/card';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { FormMessage, SubmitButton } from '@/components/ui/form-status';
import { triageChangeRequestAction } from '@/lib/actions/change-requests';
import { idleState } from '@/lib/actions/types';
import {
  BILLING_TREATMENT_LABELS,
  CHANGE_STATUS_LABELS,
  PRIORITY_LABELS,
  toOptions,
} from '@/lib/constants';
import type { Tables } from '@/lib/supabase/database.types';

export function TriagePanel({
  request,
  staff,
}: {
  request: Tables<'change_requests'>;
  staff: { id: string; full_name: string }[];
}) {
  const action = triageChangeRequestAction.bind(null, request.id);
  const [state, formAction] = useActionState(action, idleState);
  const e = state.errors ?? {};

  return (
    <form action={formAction} noValidate>
      <Card>
        <CardHeader
          title="Triage"
          description="Status, cover and assignment. Internal notes are never shown to the client."
        />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <FormMessage state={state} />

          <Field label="Status" error={e.status} required>
            {({ id }) => (
              <Select
                id={id}
                name="status"
                defaultValue={request.status}
                options={toOptions(CHANGE_STATUS_LABELS)}
              />
            )}
          </Field>

          <Field
            label="Cover"
            error={e.billingTreatment}
            hint="Whether this is included in the maintenance plan."
          >
            {({ id, describedBy }) => (
              <Select
                id={id}
                name="billingTreatment"
                defaultValue={request.billing_treatment ?? ''}
                placeholder="Not assessed"
                aria-describedby={describedBy}
                options={toOptions(BILLING_TREATMENT_LABELS)}
              />
            )}
          </Field>

          <Field label="Assigned to" error={e.assignedTo}>
            {({ id }) => (
              <Select
                id={id}
                name="assignedTo"
                defaultValue={request.assigned_to ?? ''}
                placeholder="Unassigned"
                options={staff.map((s) => ({ value: s.id, label: s.full_name || 'Unnamed' }))}
              />
            )}
          </Field>

          <Field label="Priority" error={e.priority}>
            {({ id }) => (
              <Select
                id={id}
                name="priority"
                defaultValue={request.priority}
                options={toOptions(PRIORITY_LABELS)}
              />
            )}
          </Field>

          <Field label="Target completion" error={e.estimatedCompletionDate}>
            {({ id }) => (
              <Input
                id={id}
                name="estimatedCompletionDate"
                type="date"
                defaultValue={request.estimated_completion_date ?? ''}
              />
            )}
          </Field>

          <div />

          <Field
            label="Notes for the client"
            error={e.clientNotes}
            hint="Shown in their portal."
            className="sm:col-span-2"
          >
            {({ id, describedBy }) => (
              <Textarea
                id={id}
                name="clientNotes"
                rows={3}
                defaultValue={request.client_notes ?? ''}
                aria-describedby={describedBy}
              />
            )}
          </Field>

          <Field
            label="Internal notes"
            error={e.internalNotes}
            hint="Agency only — the client can never see this."
            className="sm:col-span-2"
          >
            {({ id, describedBy }) => (
              <Textarea
                id={id}
                name="internalNotes"
                rows={3}
                defaultValue={request.internal_notes ?? ''}
                aria-describedby={describedBy}
              />
            )}
          </Field>

          <Field
            label="Reason for rejection"
            error={e.rejectedReason}
            hint="Required if you set the status to Rejected."
            className="sm:col-span-2"
          >
            {({ id, describedBy }) => (
              <Textarea
                id={id}
                name="rejectedReason"
                rows={2}
                defaultValue={request.rejected_reason ?? ''}
                aria-describedby={describedBy}
              />
            )}
          </Field>
        </CardBody>
        <CardFooter>
          <SubmitButton pendingLabel="Saving…">Save triage</SubmitButton>
        </CardFooter>
      </Card>
    </form>
  );
}
