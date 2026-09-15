'use client';

import { useActionState } from 'react';

import { Field, Input } from '@/components/ui/field';
import { FormMessage, SubmitButton } from '@/components/ui/form-status';
import { updatePasswordAction } from '@/lib/actions/auth';
import { idleState } from '@/lib/actions/types';

export function UpdatePasswordForm() {
  const [state, action] = useActionState(updatePasswordAction, idleState);

  return (
    <form action={action} className="mt-5 space-y-4" noValidate>
      <FormMessage state={state} />

      <Field label="New password" error={state.errors?.password} required>
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

      <Field label="Confirm new password" error={state.errors?.confirmPassword} required>
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

      <SubmitButton className="w-full" size="lg" pendingLabel="Saving…">
        Save password
      </SubmitButton>
    </form>
  );
}
