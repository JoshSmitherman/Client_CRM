import { useState } from 'react';
import { Plus, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/card';
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/field';
import { FormMessage, SubmitButton } from '@/components/ui/form-status';
import { savePlanAction } from '@/lib/actions/maintenance';
import { BILLING_FREQUENCY_LABELS, toOptions } from '@/lib/constants';
import { useFormAction } from '@/lib/data/use-form-action';
import type { Tables } from '@/lib/supabase/database.types';

/**
 * Plans are entirely agency-defined — nothing in the application depends on a
 * particular name, price or allowance, so tiers can be added, renamed or
 * retired freely.
 */
export function PlanForm({ plan, onDone }: { plan?: Tables<'maintenance_plans'>; onDone?: () => void }) {
  const action = savePlanAction.bind(null, plan?.id ?? null);
  const [state, formAction] = useFormAction(action);
  const e = state.errors ?? {};

  if (state.status === 'success' && onDone) onDone();

  return (
    <form action={formAction} noValidate>
      <Card>
        <CardHeader
          title={plan ? `Edit ${plan.name}` : 'New maintenance plan'}
          description="Times are entered in minutes so allowances stay exact."
        />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <FormMessage state={state} />

          <Field label="Plan name" error={e.name} required>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="name"
                required
                defaultValue={plan?.name ?? ''}
                aria-describedby={describedBy}
                aria-invalid={invalid}
              />
            )}
          </Field>

          <Field label="Billing frequency" error={e.billingFrequency}>
            {({ id }) => (
              <Select
                id={id}
                name="billingFrequency"
                defaultValue={plan?.billing_frequency ?? 'monthly'}
                options={toOptions(BILLING_FREQUENCY_LABELS)}
              />
            )}
          </Field>

          <Field label="Description" error={e.description} className="sm:col-span-2">
            {({ id }) => (
              <Textarea id={id} name="description" rows={2} defaultValue={plan?.description ?? ''} />
            )}
          </Field>

          <Field label="Monthly price" error={e.monthlyPrice}>
            {({ id }) => (
              <Input
                id={id}
                name="monthlyPrice"
                type="number"
                step="0.01"
                min="0"
                defaultValue={plan?.monthly_price ?? ''}
              />
            )}
          </Field>

          <Field label="Annual price" error={e.annualPrice}>
            {({ id }) => (
              <Input
                id={id}
                name="annualPrice"
                type="number"
                step="0.01"
                min="0"
                defaultValue={plan?.annual_price ?? ''}
              />
            )}
          </Field>

          <Field
            label="Included change time (minutes)"
            error={e.includedChangeMinutes}
            hint="120 minutes = 2 hours a month."
          >
            {({ id, describedBy }) => (
              <Input
                id={id}
                name="includedChangeMinutes"
                type="number"
                min="0"
                step="1"
                defaultValue={plan?.included_change_minutes ?? 0}
                aria-describedby={describedBy}
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
                defaultValue={plan?.included_support_minutes ?? 0}
              />
            )}
          </Field>

          <Field label="Response time (hours)" error={e.responseTimeHours}>
            {({ id }) => (
              <Input
                id={id}
                name="responseTimeHours"
                type="number"
                min="1"
                step="1"
                defaultValue={plan?.response_time_hours ?? ''}
              />
            )}
          </Field>

          <Field
            label="Priority level"
            error={e.priorityLevel}
            hint="1 is highest. Used to order the support queue."
          >
            {({ id, describedBy }) => (
              <Input
                id={id}
                name="priorityLevel"
                type="number"
                min="1"
                max="5"
                step="1"
                defaultValue={plan?.priority_level ?? 3}
                aria-describedby={describedBy}
              />
            )}
          </Field>

          <Field label="Renewal period (months)" error={e.renewalPeriodMonths}>
            {({ id }) => (
              <Input
                id={id}
                name="renewalPeriodMonths"
                type="number"
                min="1"
                step="1"
                defaultValue={plan?.renewal_period_months ?? 12}
              />
            )}
          </Field>

          <div />

          <Field
            label="Included services"
            error={e.includedServices}
            hint="One per line. These are the ticks the client sees."
            className="sm:col-span-2"
          >
            {({ id, describedBy }) => (
              <Textarea
                id={id}
                name="includedServices"
                rows={6}
                defaultValue={(plan?.included_services ?? []).join('\n')}
                aria-describedby={describedBy}
                placeholder={'Website uptime monitoring\nSecurity updates\nRoutine backups'}
              />
            )}
          </Field>

          <div className="space-y-3 sm:col-span-2">
            <Checkbox
              name="isActive"
              defaultChecked={plan?.is_active ?? true}
              label="Active"
              description="Inactive plans cannot be attached to new subscriptions. Existing ones keep working."
            />
            <Checkbox
              name="isPublic"
              defaultChecked={plan?.is_public ?? true}
              label="Show to clients"
              description="Visible in the portal so clients can ask to move onto it."
            />
          </div>
        </CardBody>
        <CardFooter>
          {onDone ? (
            <Button variant="ghost" type="button" onClick={onDone}>
              Cancel
            </Button>
          ) : null}
          <SubmitButton pendingLabel="Saving…">{plan ? 'Save plan' : 'Create plan'}</SubmitButton>
        </CardFooter>
      </Card>
    </form>
  );
}

export function PlanFormToggle({ plan, label }: { plan?: Tables<'maintenance_plans'>; label: string }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button size="sm" variant={plan ? 'ghost' : 'primary'} onClick={() => setOpen(true)}>
        {plan ? null : <Plus className="h-4 w-4" aria-hidden="true" />}
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
      <PlanForm plan={plan} onDone={() => setOpen(false)} />
    </div>
  );
}
