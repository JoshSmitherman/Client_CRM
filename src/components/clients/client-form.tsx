'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/card';
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/field';
import { FormMessage, SubmitButton } from '@/components/ui/form-status';
import { idleState, type ActionState } from '@/lib/actions/types';
import type { Tables } from '@/lib/supabase/database.types';

export interface ClientFormProps {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  client?: Tables<'clients'> | null;
  /**
   * Agency-only note, loaded separately because clients cannot read it.
   * Required, not optional: a defaulted value would silently blank the
   * existing note on the next save.
   */
  internalNote: string;
  accountManagers: { id: string; full_name: string }[];
  submitLabel: string;
  cancelHref: string;
}

export function ClientForm({
  action,
  client,
  internalNote,
  accountManagers,
  submitLabel,
  cancelHref,
}: ClientFormProps) {
  const [state, formAction] = useActionState(action, idleState);
  const e = state.errors ?? {};

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormMessage state={state} />

      <Card>
        <CardHeader title="Company" description="Who the client is." />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Company name" error={e.companyName} required className="sm:col-span-2">
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="companyName"
                defaultValue={client?.company_name ?? ''}
                required
                aria-describedby={describedBy}
                aria-invalid={invalid}
              />
            )}
          </Field>

          <Field label="Trading name" hint="If different from the registered name." error={e.tradingName}>
            {({ id, describedBy }) => (
              <Input id={id} name="tradingName" defaultValue={client?.trading_name ?? ''} aria-describedby={describedBy} />
            )}
          </Field>

          <Field label="Company registration number" error={e.registrationNumber}>
            {({ id }) => (
              <Input id={id} name="registrationNumber" defaultValue={client?.registration_number ?? ''} />
            )}
          </Field>

          <Field label="Industry" error={e.industry}>
            {({ id }) => <Input id={id} name="industry" defaultValue={client?.industry ?? ''} />}
          </Field>

          <Field label="Website" error={e.website} hint="A domain like example.co.uk is fine.">
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="website"
                type="url"
                inputMode="url"
                defaultValue={client?.website ?? ''}
                aria-describedby={describedBy}
                aria-invalid={invalid}
              />
            )}
          </Field>

          <Field label="Company description" error={e.description} className="sm:col-span-2">
            {({ id }) => (
              <Textarea id={id} name="description" rows={3} defaultValue={client?.description ?? ''} />
            )}
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Primary contact" description="Who we deal with day to day." />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Contact name" error={e.primaryContactName}>
            {({ id }) => (
              <Input id={id} name="primaryContactName" autoComplete="name" defaultValue={client?.primary_contact_name ?? ''} />
            )}
          </Field>

          <Field label="Email address" error={e.email}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="email"
                type="email"
                defaultValue={client?.email ?? ''}
                aria-describedby={describedBy}
                aria-invalid={invalid}
              />
            )}
          </Field>

          <Field label="Telephone number" error={e.phone}>
            {({ id }) => (
              <Input id={id} name="phone" type="tel" inputMode="tel" defaultValue={client?.phone ?? ''} />
            )}
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Address" />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Address line 1" error={e.addressLine1} className="sm:col-span-2">
            {({ id }) => (
              <Input id={id} name="addressLine1" autoComplete="address-line1" defaultValue={client?.address_line1 ?? ''} />
            )}
          </Field>
          <Field label="Address line 2" error={e.addressLine2} className="sm:col-span-2">
            {({ id }) => (
              <Input id={id} name="addressLine2" autoComplete="address-line2" defaultValue={client?.address_line2 ?? ''} />
            )}
          </Field>
          <Field label="Town or city" error={e.city}>
            {({ id }) => <Input id={id} name="city" autoComplete="address-level2" defaultValue={client?.city ?? ''} />}
          </Field>
          <Field label="County or region" error={e.region}>
            {({ id }) => <Input id={id} name="region" autoComplete="address-level1" defaultValue={client?.region ?? ''} />}
          </Field>
          <Field label="Postcode" error={e.postcode}>
            {({ id }) => <Input id={id} name="postcode" autoComplete="postal-code" defaultValue={client?.postcode ?? ''} />}
          </Field>
          <Field label="Country" error={e.country}>
            {({ id }) => (
              <Input id={id} name="country" autoComplete="country-name" defaultValue={client?.country ?? 'United Kingdom'} />
            )}
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Internal"
          description="Only agency users can see anything in this section."
        />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Account manager" error={e.accountManagerId}>
            {({ id }) => (
              <Select
                id={id}
                name="accountManagerId"
                defaultValue={client?.account_manager_id ?? ''}
                placeholder="Not assigned"
                options={accountManagers.map((m) => ({
                  value: m.id,
                  label: m.full_name || 'Unnamed',
                }))}
              />
            )}
          </Field>

          <div className="flex items-end pb-2">
            <Checkbox
              name="isExistingClient"
              defaultChecked={client?.is_existing_client ?? false}
              label="Existing client"
              description="Tick if we have worked with them before."
            />
          </div>

          <Field label="Internal notes" error={e.internalNotes} className="sm:col-span-2">
            {({ id }) => (
              <Textarea
                id={id}
                name="internalNotes"
                rows={4}
                defaultValue={internalNote}
                placeholder="Context for the team. Never visible to the client."
              />
            )}
          </Field>
        </CardBody>
        <CardFooter>
          <Button variant="ghost" asChild>
            <Link href={cancelHref}>Cancel</Link>
          </Button>
          <SubmitButton pendingLabel="Saving…">{submitLabel}</SubmitButton>
        </CardFooter>
      </Card>
    </form>
  );
}
