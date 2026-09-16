
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/card';
import { Field, Input } from '@/components/ui/field';
import { FormMessage, SubmitButton } from '@/components/ui/form-status';
import { PasswordRules } from '@/components/ui/password-rules';
import { changePasswordAction, updateProfileAction } from '@/lib/actions/account';
import { useFormAction } from '@/lib/data/use-form-action';
import type { Profile } from '@/lib/session';

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action] = useFormAction(updateProfileAction);
  const e = state.errors ?? {};

  return (
    <form action={action} noValidate>
      <Card>
        <CardHeader title="Your details" />
        <CardBody className="space-y-4">
          <FormMessage state={state} />

          <Field label="Your name" error={e.fullName} required>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="fullName"
                required
                autoComplete="name"
                defaultValue={profile.full_name}
                aria-describedby={describedBy}
                aria-invalid={invalid}
              />
            )}
          </Field>

          <Field label="Job title" error={e.jobTitle}>
            {({ id }) => <Input id={id} name="jobTitle" defaultValue={profile.job_title ?? ''} />}
          </Field>

          <Field label="Telephone" error={e.phone}>
            {({ id }) => (
              <Input
                id={id}
                name="phone"
                type="tel"
                autoComplete="tel"
                defaultValue={profile.phone ?? ''}
              />
            )}
          </Field>

          <Field label="Email address" hint="Contact us if you need this changed.">
            {({ id, describedBy }) => (
              <Input id={id} value={profile.email} disabled aria-describedby={describedBy} />
            )}
          </Field>
        </CardBody>
        <CardFooter>
          <SubmitButton pendingLabel="Saving…">Save details</SubmitButton>
        </CardFooter>
      </Card>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useFormAction(changePasswordAction);
  const e = state.errors ?? {};

  return (
    <form action={action} noValidate>
      <Card>
        <CardHeader title="Change your password" />
        <CardBody className="space-y-4">
          <FormMessage state={state} />
          <PasswordRules />

          <Field label="New password" error={e.password} required>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={12}
                aria-describedby={describedBy}
                aria-invalid={invalid}
              />
            )}
          </Field>

          <Field label="Confirm new password" error={e.confirmPassword} required>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                aria-describedby={describedBy}
                aria-invalid={invalid}
              />
            )}
          </Field>
        </CardBody>
        <CardFooter>
          <SubmitButton pendingLabel="Saving…">Change password</SubmitButton>
        </CardFooter>
      </Card>
    </form>
  );
}
