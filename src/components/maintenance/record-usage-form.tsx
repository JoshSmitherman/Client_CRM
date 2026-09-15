'use client';

import { useActionState } from 'react';

import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/card';
import { Field, Input, Select } from '@/components/ui/field';
import { FormMessage, SubmitButton } from '@/components/ui/form-status';
import { recordUsageAction } from '@/lib/actions/maintenance';
import { idleState } from '@/lib/actions/types';

/**
 * Manual adjustment. Negative minutes correct an over-recording, which is why
 * the field is not constrained to positive numbers — and every entry is
 * attributed and flagged as manual in the history.
 */
export function RecordUsageForm({ subscriptionId }: { subscriptionId: string }) {
  const action = recordUsageAction.bind(null, subscriptionId);
  const [state, formAction] = useActionState(action, idleState);
  const e = state.errors ?? {};

  return (
    <form action={formAction} noValidate>
      <Card>
        <CardHeader
          title="Record time"
          description="For work not already logged against a change request or ticket. Enter a negative number to correct an over-recording."
        />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <FormMessage state={state} />

          <Field label="Type" error={e.usageType}>
            {({ id }) => (
              <Select
                id={id}
                name="usageType"
                defaultValue="change"
                options={[
                  { value: 'change', label: 'Website change' },
                  { value: 'support', label: 'Support' },
                ]}
              />
            )}
          </Field>

          <Field label="Minutes" error={e.minutes} required>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="minutes"
                type="number"
                step="1"
                required
                placeholder="e.g. 45 or -15"
                aria-describedby={describedBy}
                aria-invalid={invalid}
              />
            )}
          </Field>

          <Field label="Date" error={e.occurredOn} required>
            {({ id }) => (
              <Input
                id={id}
                name="occurredOn"
                type="date"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
            )}
          </Field>

          <Field label="What was done" error={e.description} required>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="description"
                required
                aria-describedby={describedBy}
                aria-invalid={invalid}
              />
            )}
          </Field>
        </CardBody>
        <CardFooter>
          <SubmitButton pendingLabel="Recording…">Record time</SubmitButton>
        </CardFooter>
      </Card>
    </form>
  );
}
