
import { Field, Input } from '@/components/ui/field';
import { FormMessage, SubmitButton } from '@/components/ui/form-status';
import { signInAction } from '@/lib/actions/auth';
import { useFormAction } from '@/lib/data/use-form-action';

export function LoginForm() {
  const [state, action] = useFormAction(signInAction);

  return (
    <form action={action} className="mt-6 space-y-4" noValidate>
      <FormMessage state={state} />

      <Field label="Email address" error={state.errors?.email} required>
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            name="email"
            type="email"
            autoComplete="email"
            required
            aria-describedby={describedBy}
            aria-invalid={invalid}
            placeholder="you@company.co.uk"
          />
        )}
      </Field>

      <Field label="Password" error={state.errors?.password} required>
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            name="password"
            type="password"
            autoComplete="current-password"
            required
            aria-describedby={describedBy}
            aria-invalid={invalid}
          />
        )}
      </Field>

      <SubmitButton className="w-full" size="lg" pendingLabel="Signing in…">
        Sign in
      </SubmitButton>
    </form>
  );
}
