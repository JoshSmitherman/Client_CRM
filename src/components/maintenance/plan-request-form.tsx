'use client';

import { useActionState, useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/card';
import { Field, Select, Textarea } from '@/components/ui/field';
import { FormMessage, SubmitButton } from '@/components/ui/form-status';
import { requestPlanChangeAction } from '@/lib/actions/maintenance';
import { idleState } from '@/lib/actions/types';
import { PLAN_REQUEST_TYPE_LABELS, toOptions } from '@/lib/constants';

/**
 * A request, not a change. Nothing about the subscription moves until the
 * agency reviews it — which is what the copy here says, so the client is not
 * surprised either way.
 */
export function PlanRequestForm({
  subscriptionId,
  plans,
  currentPlanId,
}: {
  subscriptionId: string | null;
  plans: { id: string; name: string }[];
  currentPlanId: string | null;
}) {
  const [state, action] = useActionState(requestPlanChangeAction, idleState);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('upgrade');
  const e = state.errors ?? {};

  if (!open) {
    return (
      <Card>
        <CardHeader
          title="Change your plan"
          description="Upgrade, downgrade, talk about renewal, or cancel."
        />
        <CardBody>
          <Button variant="secondary" onClick={() => setOpen(true)}>
            Request a change
          </Button>
        </CardBody>
      </Card>
    );
  }

  return (
    <form action={action} noValidate>
      <Card>
        <CardHeader title="Request a plan change" />
        <CardBody className="space-y-4">
          <FormMessage state={state} />

          {state.status !== 'success' ? (
            <Alert variant="info">
              This sends a request to your account manager. Nothing changes on your plan until we
              have spoken and confirmed it with you.
            </Alert>
          ) : null}

          {subscriptionId ? (
            <input type="hidden" name="subscriptionId" value={subscriptionId} />
          ) : null}

          <Field label="What would you like to do?" error={e.requestedType} required>
            {({ id }) => (
              <Select
                id={id}
                name="requestedType"
                value={type}
                onChange={(ev) => setType(ev.target.value)}
                options={toOptions(PLAN_REQUEST_TYPE_LABELS)}
              />
            )}
          </Field>

          {(type === 'upgrade' || type === 'downgrade') && plans.length > 0 ? (
            <Field label="Which plan are you interested in?" error={e.requestedPlanId}>
              {({ id }) => (
                <Select
                  id={id}
                  name="requestedPlanId"
                  placeholder="Not sure — please advise"
                  options={plans
                    .filter((p) => p.id !== currentPlanId)
                    .map((p) => ({ value: p.id, label: p.name }))}
                />
              )}
            </Field>
          ) : null}

          <Field
            label="Anything you would like to tell us?"
            error={e.message}
            hint="Optional, but it helps us come back with something useful."
          >
            {({ id, describedBy }) => (
              <Textarea id={id} name="message" rows={4} aria-describedby={describedBy} />
            )}
          </Field>
        </CardBody>
        <CardFooter>
          <Button variant="ghost" type="button" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <SubmitButton pendingLabel="Sending…">Send request</SubmitButton>
        </CardFooter>
      </Card>
    </form>
  );
}
