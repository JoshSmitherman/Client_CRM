
import { Field, Input } from '@/components/ui/field';
import { FormMessage, SubmitButton } from '@/components/ui/form-status';
import { requestPasswordResetAction } from '@/lib/actions/auth';
import { useFormAction } from '@/lib/data/use-form-action';

export function ResetForm() {
  const [state, action] = useFormAction(requestPasswordResetAction);

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
          />
        )}
      </Field>

      <SubmitButton className="w-full" size="lg" pendingLabel="Sending…">
        Send reset link
      </SubmitButton>
    </form>
  );
}
