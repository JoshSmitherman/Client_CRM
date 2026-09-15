'use client';

import { useActionState, useState } from 'react';
import { Plus, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/card';
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/field';
import { FormMessage, SubmitButton } from '@/components/ui/form-status';
import { saveSubscriptionAction } from '@/lib/actions/maintenance';
import { idleState } from '@/lib/actions/types';
import {
  BILLING_FREQUENCY_LABELS,
  SUBSCRIPTION_STATUS_LABELS,
  toOptions,
} from '@/lib/constants';
import type { Tables } from '@/lib/supabase/database.types';

export function SubscriptionForm({
  subscription,
  clients,
  projects,
  plans,
  defaultClientId,
  defaultProjectId,
  onDone,
}: {
  subscription?: Tables<'maintenance_subscriptions'> | null;
  clients: { id: string; company_name: string }[];
  projects: { id: string; name: string }[];
  plans: Tables<'maintenance_plans'>[];
  defaultClientId?: string;
  defaultProjectId?: string;
  onDone?: () => void;
}) {
  const action = saveSubscriptionAction.bind(null, subscription?.id ?? null);
  const [state, formAction] = useActionState(action, idleState);
  const e = state.errors ?? {};

  // Choosing a plan pre-fills price and allowances, but they stay editable —
  // the subscription keeps its own snapshot so editing the plan later never
  // rewrites past periods.
  const [planId, setPlanId] = useState(subscription?.plan_id ?? plans[0]?.id ?? '');
  const selected = plans.find((p) => p.id === planId);

  if (state.status === 'success' && onDone) onDone();

  return (
    <form action={formAction} noValidate>
      <Card>
        <CardHeader
          title={subscription ? 'Edit subscription' : 'New subscription'}
          description="Allowances are copied from the plan and stored here, so changing the plan later does not rewrite history."
        />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <FormMessage state={state} />

          <Field label="Client" error={e.clientId} required>
            {({ id }) => (
              <Select
                id={id}
                name="clientId"
                required
                defaultValue={subscription?.client_id ?? defaultClientId ?? ''}
                placeholder="Choose a client"
                options={clients.map((c) => ({ value: c.id, label: c.company_name }))}
              />
            )}
          </Field>

          <Field label="Website" error={e.projectId} hint="Optional — links the plan to a project.">
            {({ id, describedBy }) => (
              <Select
                id={id}
                name="projectId"
                defaultValue={subscription?.project_id ?? defaultProjectId ?? ''}
                placeholder="Not linked"
                aria-describedby={describedBy}
                options={projects.map((p) => ({ value: p.id, label: p.name }))}
              />
            )}
          </Field>

          <Field label="Plan" error={e.planId} required>
            {({ id }) => (
              <Select
                id={id}
                name="planId"
                required
                value={planId}
                onChange={(ev) => setPlanId(ev.target.value)}
                options={plans.map((p) => ({
                  value: p.id,
                  label: p.is_active ? p.name : `${p.name} (inactive)`,
                }))}
              />
            )}
          </Field>

          <Field label="Status" error={e.status} required>
            {({ id }) => (
              <Select
                id={id}
                name="status"
                defaultValue={subscription?.status ?? 'active'}
                options={toOptions(SUBSCRIPTION_STATUS_LABELS)}
              />
            )}
          </Field>

          <Field label="Website address" error={e.websiteUrl} className="sm:col-span-2">
            {({ id }) => (
              <Input id={id} name="websiteUrl" defaultValue={subscription?.website_url ?? ''} />
            )}
          </Field>

          <Field label="Start date" error={e.startDate} required>
            {({ id }) => (
              <Input
                id={id}
                name="startDate"
                type="date"
                required
                defaultValue={subscription?.start_date ?? new Date().toISOString().slice(0, 10)}
              />
            )}
          </Field>

          <Field label="Renewal date" error={e.renewalDate} required>
            {({ id }) => (
              <Input
                id={id}
                name="renewalDate"
                type="date"
                required
                defaultValue={subscription?.renewal_date ?? ''}
              />
            )}
          </Field>

          <Field label="Billing cycle" error={e.billingCycle}>
            {({ id }) => (
              <Select
                id={id}
                name="billingCycle"
                defaultValue={subscription?.billing_cycle ?? selected?.billing_frequency ?? 'monthly'}
                options={toOptions(BILLING_FREQUENCY_LABELS)}
              />
            )}
          </Field>

          <Field label="Price" error={e.price}>
            {({ id }) => (
              <Input
                id={id}
                name="price"
                type="number"
                step="0.01"
                min="0"
                key={`price-${planId}`}
                defaultValue={subscription?.price ?? selected?.monthly_price ?? ''}
              />
            )}
          </Field>

          <Field label="Included change time (minutes)" error={e.includedChangeMinutes}>
            {({ id }) => (
              <Input
                id={id}
                name="includedChangeMinutes"
                type="number"
                min="0"
                step="1"
                key={`change-${planId}`}
                defaultValue={
                  subscription?.included_change_minutes ?? selected?.included_change_minutes ?? 0
                }
              />
            )}
          </Field>

          <Field label="Included support time (minutes)" error={e.includedSupportMinutes}>
            {({ id }) => (
              <Input
                id={id}
                name="includedSupportMinutes"
                type="number"
                min="0"
                step="1"
                key={`support-${planId}`}
                defaultValue={
                  subscription?.included_support_minutes ?? selected?.included_support_minutes ?? 0
                }
              />
            )}
          </Field>

          <div className="sm:col-span-2">
            <Checkbox
              name="autoRenew"
              defaultChecked={subscription?.auto_renew ?? true}
              label="Renews automatically"
              description="Subscriptions without this expire once the renewal date passes."
            />
          </div>

          <Field label="Internal notes" error={e.internalNotes} className="sm:col-span-2">
            {({ id }) => (
              <Textarea
                id={id}
                name="internalNotes"
                rows={2}
                defaultValue={subscription?.internal_notes ?? ''}
              />
            )}
          </Field>
        </CardBody>
        <CardFooter>
          {onDone ? (
            <Button variant="ghost" type="button" onClick={onDone}>
              Cancel
            </Button>
          ) : null}
          <SubmitButton pendingLabel="Saving…">
            {subscription ? 'Save subscription' : 'Create subscription'}
          </SubmitButton>
        </CardFooter>
      </Card>
    </form>
  );
}

export function SubscriptionFormToggle(
  props: Omit<React.ComponentProps<typeof SubscriptionForm>, 'onDone'> & { label: string },
) {
  const { label, ...rest } = props;
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button size="sm" variant={rest.subscription ? 'secondary' : 'primary'} onClick={() => setOpen(true)}>
        {rest.subscription ? null : <Plus className="h-4 w-4" aria-hidden="true" />}
        {label}
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          Close
        </Button>
      </div>
      <SubscriptionForm {...rest} onDone={() => setOpen(false)} />
    </div>
  );
}
