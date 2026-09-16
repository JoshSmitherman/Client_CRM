import { UserPlus, X } from 'lucide-react';
import { useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/card';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { FormMessage, SubmitButton } from '@/components/ui/form-status';
import { sendInvitationAction } from '@/lib/actions/team';
import { useFormAction } from '@/lib/data/use-form-action';
import { ACCOUNT_TYPES, CLIENT_ROLES } from '@/lib/permissions';

export function InviteForm({
  clients,
  canInviteAgency,
  /** Pre-selected when invited from a client's own record. */
  defaultClientId,
  label = 'Invite someone',
  variant = 'primary',
}: {
  clients: { id: string; company_name: string }[];
  canInviteAgency: boolean;
  defaultClientId?: string;
  label?: string;
  variant?: 'primary' | 'secondary';
}) {
  const [state, action] = useFormAction(sendInvitationAction);
  const [open, setOpen] = useState(false);

  // Invited from a client record, the useful default is someone who can manage
  // that client's portal — not an agency developer.
  const [role, setRole] = useState<string>(
    defaultClientId || !canInviteAgency ? 'client' : 'agency',
  );

  const isClientRole = CLIENT_ROLES.includes(role as (typeof CLIENT_ROLES)[number]);

  // Someone who can only invite colleagues gets the client option alone.
  const typeOptions = (canInviteAgency
    ? ACCOUNT_TYPES
    : ACCOUNT_TYPES.filter((t) => t.value === 'client')
  ).map((t) => ({ value: t.value, label: t.label }));

  const chosen = ACCOUNT_TYPES.find((t) => t.value === role);

  if (!open) {
    return (
      <Button variant={variant} onClick={() => setOpen(true)}>
        <UserPlus className="h-4 w-4" aria-hidden="true" />
        {label}
      </Button>
    );
  }

  return (
    <form action={action} noValidate>
      <Card>
        <CardHeader
          title="Invite someone"
          description="They receive an email with a link to set their own password."
          action={
            <Button variant="ghost" size="icon" type="button" onClick={() => setOpen(false)} aria-label="Close">
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          }
        />
        <CardBody className="space-y-4">
          <FormMessage state={state} />

          <Alert variant="info">
            {isClientRole
              ? 'They receive an email with a link to set their own password, and can only ever see this one client — their projects, files, requests and messages. Internal notes and other clients stay invisible to them.'
              : 'Agency staff can also register themselves with an approved work email address. Invite them here to skip that, or to give someone a role their domain would not grant.'}
          </Alert>

          <Field label="Email address" error={state.errors?.email} required>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="email"
                type="email"
                required
                aria-describedby={describedBy}
                aria-invalid={invalid}
              />
            )}
          </Field>

          <Field label="Their name" error={state.errors?.fullName}>
            {({ id }) => <Input id={id} name="fullName" autoComplete="name" />}
          </Field>

          <Field
            label="Account type"
            error={state.errors?.role}
            required
            hint={chosen?.description}
          >
            {({ id }) => (
              <Select
                id={id}
                name="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                options={typeOptions}
              />
            )}
          </Field>

          {isClientRole && canInviteAgency ? (
            <Field
              label="Which client?"
              error={state.errors?.clientId}
              required
              hint="They will only ever see this client's projects and files."
            >
              {({ id, describedBy, invalid }) => (
                <Select
                  id={id}
                  name="clientId"
                  required
                  placeholder="Choose a client"
                  defaultValue={defaultClientId}
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                  options={clients.map((c) => ({ value: c.id, label: c.company_name }))}
                />
              )}
            </Field>
          ) : null}

          <Field label="Message" error={state.errors?.message} hint="Optional — for your own records.">
            {({ id, describedBy }) => (
              <Textarea id={id} name="message" rows={2} aria-describedby={describedBy} />
            )}
          </Field>
        </CardBody>
        <CardFooter>
          <Button variant="ghost" type="button" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <SubmitButton pendingLabel="Sending…">Send invitation</SubmitButton>
        </CardFooter>
      </Card>
    </form>
  );
}
