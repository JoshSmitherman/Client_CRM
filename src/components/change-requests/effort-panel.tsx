'use client';

import { useActionState } from 'react';

import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/card';
import { Field, Input } from '@/components/ui/field';
import { FormMessage, SubmitButton } from '@/components/ui/form-status';
import { logChangeEffortAction } from '@/lib/actions/change-requests';
import { idleState } from '@/lib/actions/types';
import { formatDuration } from '@/lib/format';

/**
 * Time is entered and stored in whole minutes, so an allowance reads exactly
 * "1 hour 20 minutes" rather than a rounded decimal.
 */
export function EffortPanel({
  requestId,
  loggedMinutes,
  drawsDownAllowance,
}: {
  requestId: string;
  loggedMinutes: number;
  drawsDownAllowance: boolean;
}) {
  const action = logChangeEffortAction.bind(null, requestId);
  const [state, formAction] = useActionState(action, idleState);
  const e = state.errors ?? {};

  return (
    <form action={formAction} noValidate>
      <Card>
        <CardHeader
          title="Time spent"
          description={
            drawsDownAllowance
              ? 'This request is covered by the plan, so logged time draws down the allowance.'
              : 'Logged for reference. This request is not covered by a maintenance allowance.'
          }
        />
        <CardBody className="space-y-4">
          <FormMessage state={state} />

          <p className="text-[13px]">
            Logged so far:{' '}
            <span className="font-semibold">{formatDuration(loggedMinutes)}</span>
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Minutes to add" error={e.minutes} required>
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  name="minutes"
                  type="number"
                  min="1"
                  step="1"
                  required
                  placeholder="e.g. 45"
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                />
              )}
            </Field>

            <Field label="What was done" error={e.description} required>
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  name="description"
                  required
                  placeholder="e.g. Replaced hero image and copy"
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                />
              )}
            </Field>
          </div>
        </CardBody>
        <CardFooter>
          <SubmitButton pendingLabel="Logging…">Log time</SubmitButton>
        </CardFooter>
      </Card>
    </form>
  );
}
