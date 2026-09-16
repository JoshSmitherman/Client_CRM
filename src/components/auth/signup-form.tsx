
import { Field, Input } from '@/components/ui/field';
import { FormMessage, SubmitButton } from '@/components/ui/form-status';
import { signUpAction } from '@/lib/actions/auth';
import { useFormAction } from '@/lib/data/use-form-action';

export function SignUpForm() {
  const [state, action] = useFormAction(signUpAction);

  return (
    <form action={action} className="mt-5 space-y-4" noValidate>
      <FormMessage state={state} />

      <Field label="Your full name" error={state.errors?.fullName} required>
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            name="fullName"
            autoComplete="name"
            required
            aria-describedby={describedBy}
            aria-invalid={invalid}
          />
        )}
      </Field>

      <Field label="Work email address" error={state.errors?.email} required>
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            name="email"
            type="email"
            autoComplete="email"
            required
            aria-describedby={describedBy}
            aria-invalid={invalid}
          />
        )}
      </Field>

      <Field label="Choose a password" error={state.errors?.password} required>
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

      <Field label="Confirm password" error={state.errors?.confirmPassword} required>
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

      <SubmitButton className="w-full" size="lg" pendingLabel="Creating your account…">
        Create account
      </SubmitButton>
    </form>
  );
}
