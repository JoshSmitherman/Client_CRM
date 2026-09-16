import { UserPlus, X } from 'lucide-react';
import { useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/card';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { FormMessage, SubmitButton } from '@/components/ui/form-status';
import { sendInvitationAction } from '@/lib/actions/team';
import { useFormAction } from '@/lib/data/use-form-action';
import { AGENCY_ROLES, CLIENT_ROLES, ROLE_LABELS } from '@/lib/permissions';

export function InviteForm({
  clients,
  canInviteAgency,
}: {
  clients: { id: string; company_name: string }[];
  canInviteAgency: boolean;
}) {
  const [state, action] = useFormAction(sendInvitationAction);
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<string>(canInviteAgency ? 'developer' : 'client_member');

  const isClientRole = role === 'client_owner' || role === 'client_member';
  const roleOptions = (canInviteAgency ? [...AGENCY_ROLES, ...CLIENT_ROLES] : CLIENT_ROLES).map(
    (r) => ({ value: r, label: ROLE_LABELS[r] }),
  );

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <UserPlus className="h-4 w-4" aria-hidden="true" />
        Invite someone
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
            Accounts can only be created by invitation. Anyone who signs up without one gets an
            account with no access at all.
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

          <Field label="Role" error={state.errors?.role} required>
            {({ id }) => (
              <Select
                id={id}
                name="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                options={roleOptions}
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
